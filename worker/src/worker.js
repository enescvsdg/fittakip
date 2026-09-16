/* ══════════════════════════════════════════
   FitTakip — Push Bildirim Worker'ı

   Cron her dakika uyanır, saati gelen supplement
   hatırlatmalarını bulur ve telefona push gönderir.
   Uygulama kapalı olsa bile çalışır.
   ══════════════════════════════════════════ */

import { sendPush } from './push.js';

const GRACE_MINUTES = 60;   // kaçırılan hatırlatma bu süre içinde hâlâ gönderilir
// Cron dakikada bir uyandığı için saatinde gönderilen bildirim hedef dakikayı
// kaçırıyordu. Bir dakika önceden göndermeye başlayınca bildirim ekrana tam
// saatinde düşüyor — hatırlatma için erken gelmek geç gelmekten iyidir.
const LEAD_MINUTES = 1;

// ── YARDIMCILAR ──────────────────────────────────

function cors(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Device-Key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) }
  });
}

// Uzunluktan bağımsız, sabit süreli karşılaştırma
function secretsMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}

async function subKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return 'sub:' + Array.from(new Uint8Array(digest).slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verilen saat diliminde "bugün" ve "gün içi dakika" değerini döndürür
function localNow(timezone) {
  let tz = timezone || 'UTC';
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
  } catch (e) {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
  }
  const p = {};
  for (const part of parts) p[part.type] = part.value;
  return {
    date: p.year + '-' + p.month + '-' + p.day,
    minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10)
  };
}

function reminderMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// Başlığa uygulama adı YAZILMAZ — iOS zaten altına "from FitTakip" ekliyor
function notificationFor(item) {
  const bits = [];
  if (item.dose && item.dose !== '—') bits.push(item.dose);
  if (item.timing) bits.push(item.timing);
  if (item.note) bits.push(item.note);
  bits.push('Unutma 💪');

  return JSON.stringify({
    title: '⏰ ' + (item.name || 'Supplement') + ' zamanı!',
    body: bits.join(' · '),
    tag: 'supp-' + item.id,
    itemId: item.id
  });
}

function vapidConfig(env) {
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK),
    subject: env.VAPID_SUBJECT || 'mailto:fittakip@example.com'
  };
}

// ── HTTP ─────────────────────────────────────────

async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(env) });
  }

  if (!env.DEVICE_KEY) {
    return json({ error: 'Worker yapılandırılmamış: DEVICE_KEY secret eksik.' }, env, 500);
  }
  if (!secretsMatch(request.headers.get('X-Device-Key') || '', env.DEVICE_KEY)) {
    return json({ error: 'Cihaz anahtarı geçersiz.' }, env, 401);
  }

  // Bağlantı testi + abonelik için gereken VAPID açık anahtarı
  if (url.pathname === '/health' && request.method === 'GET') {
    return json({ ok: true, vapidPublicKey: env.VAPID_PUBLIC_KEY || null }, env);
  }

  if (url.pathname === '/sync' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    const sub = body && body.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return json({ error: 'Geçersiz abonelik bilgisi.' }, env, 400);
    }

    const key = await subKey(sub.endpoint);
    const existing = await env.REMINDERS.get(key, 'json');

    await env.REMINDERS.put(key, JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      timezone: body.timezone || 'UTC',
      reminders: Array.isArray(body.reminders) ? body.reminders : [],
      fired: (existing && existing.fired) || {},
      updatedAt: new Date().toISOString()
    }));

    return json({ ok: true, count: (body.reminders || []).length }, env);
  }

  if (url.pathname === '/unsubscribe' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.endpoint) return json({ error: 'endpoint gerekli.' }, env, 400);
    await env.REMINDERS.delete(await subKey(body.endpoint));
    return json({ ok: true }, env);
  }

  // Kurulumu doğrulamak için anında bildirim gönderir
  if (url.pathname === '/test' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.endpoint) return json({ error: 'endpoint gerekli.' }, env, 400);

    const record = await env.REMINDERS.get(await subKey(body.endpoint), 'json');
    if (!record) return json({ error: 'Bu cihaz kayıtlı değil, önce senkronize et.' }, env, 404);

    const result = await sendPush(record, JSON.stringify({
      title: '⏰ Test bildirimi',
      body: 'Hatırlatmaların çalışıyor — hazırsın 💪',
      tag: 'supp-test'
    }), vapidConfig(env));

    return json({ ok: result.ok, status: result.status }, env, result.ok ? 200 : 502);
  }

  // Sunucunun kayıtlı hatırlatmalar hakkında ne gördüğünü gösterir (teşhis)
  if (url.pathname === '/debug' && request.method === 'GET') {
    const list = await env.REMINDERS.list({ prefix: 'sub:' });
    const subs = [];

    for (const entry of list.keys) {
      const record = await env.REMINDERS.get(entry.name, 'json');
      if (!record) continue;

      const now = localNow(record.timezone);
      const fired = record.fired || {};

      subs.push({
        anahtar: entry.name,
        saatDilimi: record.timezone || '(yok)',
        yerelTarih: now.date,
        yerelSaat: String(Math.floor(now.minutes / 60)).padStart(2, '0') + ':' +
                   String(now.minutes % 60).padStart(2, '0'),
        sonGuncelleme: record.updatedAt,
        hatirlatmaSayisi: (record.reminders || []).length,
        hatirlatmalar: (record.reminders || []).map(item => {
          const due = reminderMinutes(item.time);
          if (due === null) return { ad: item.name, saat: item.time, durum: 'GEÇERSİZ SAAT' };
          const diff = now.minutes - due;
          let durum;
          if (fired[item.id] === now.date + ' ' + item.time) durum = 'bugün zaten gönderildi';
          else if (diff < -LEAD_MINUTES) durum = 'saati henüz gelmedi (' + (-diff) + ' dk var)';
          else if (diff > GRACE_MINUTES) durum = 'saati geçti, bugün atlandı (' + diff + ' dk önce)';
          else durum = '>>> ŞİMDİ GÖNDERİLMELİ <<<';
          return { ad: item.name, saat: item.time, farkDakika: diff, durum: durum };
        })
      });
    }

    return json({
      sunucuSaatiUTC: new Date().toISOString(),
      abonelikSayisi: subs.length,
      abonelikler: subs
    }, env);
  }

  return json({ error: 'Bilinmeyen adres.' }, env, 404);
}

// ── CRON ─────────────────────────────────────────

async function runReminders(env) {
  const vapid = vapidConfig(env);
  const list = await env.REMINDERS.list({ prefix: 'sub:' });
  let sent = 0;

  for (const entry of list.keys) {
    const record = await env.REMINDERS.get(entry.name, 'json');
    if (!record || !Array.isArray(record.reminders)) continue;

    const now = localNow(record.timezone);
    const fired = record.fired || {};
    const liveIds = {};
    let changed = false;
    let gone = false;

    for (const item of record.reminders) {
      if (!item || !item.id || !item.time) continue;
      liveIds[item.id] = true;

      const stamp = now.date + ' ' + item.time;
      if (fired[item.id] === stamp) continue;

      const due = reminderMinutes(item.time);
      if (due === null) continue;

      const diff = now.minutes - due;
      if (diff < -LEAD_MINUTES || diff > GRACE_MINUTES) continue;

      const result = await sendPush(record, notificationFor(item), vapid);
      if (result.gone) { gone = true; break; }
      if (result.ok) {
        fired[item.id] = stamp;
        changed = true;
        sent++;
      }
    }

    // Abonelik iptal edilmişse kaydı sil
    if (gone) {
      await env.REMINDERS.delete(entry.name);
      continue;
    }

    // Silinmiş supplementlerin izlerini temizle
    for (const id of Object.keys(fired)) {
      if (!liveIds[id]) { delete fired[id]; changed = true; }
    }

    if (changed) {
      record.fired = fired;
      await env.REMINDERS.put(entry.name, JSON.stringify(record));
    }
  }

  return sent;
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      return json({ error: 'Sunucu hatası: ' + err.message }, env, 500);
    }
  },

  async scheduled(event, env, ctx) {
    // Hataları yutma — "wrangler tail" ile görülebilsin
    ctx.waitUntil(
      runReminders(env).then(
        function(sent) { console.log('[cron] tarama bitti, gönderilen bildirim:', sent); },
        function(err) { console.error('[cron] HATA:', (err && err.stack) || err); }
      )
    );
  }
};
