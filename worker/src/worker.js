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
// İşaretlenmeyen hatırlatma bu aralıkla tekrarlanır. GRACE_MINUTES penceresi
// dolunca kendiliğinden susar — 08:00'lik bir hatırlatma en fazla 08:00, 08:15,
// 08:30, 08:45 ve 09:00'da çalar.
const REPEAT_MINUTES = 15;

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

/* ── ABONELİK DİZİNİ ──
   Cron her dakika çalışıyor. Eskiden her turda KV list() yapıyordu: günde 1440
   list işlemi, ücretsiz sınır 1000 — hesap günün sonunda bloke oluyor ve
   bildirimler kesiliyordu. Artık anahtar adları tek bir dizin değerinde
   tutuluyor ve cron onu get() ile okuyor; okuma sınırı 100.000/gün.

   list() yalnız kullanıcı tetikli uçlarda (sync, debug), o da dizin hiç yoksa
   bir kereye mahsus kuruluyor. Cron hiçbir koşulda list() çağırmıyor. */
const INDEX_KEY = 'index:subs';

/* Cron için: yalnız okur. Dizin yoksa boş döner — list()'e düşmez. */
async function readIndex(env) {
  const idx = await env.REMINDERS.get(INDEX_KEY, 'json');
  return Array.isArray(idx) ? idx : null;
}

/* Kullanıcı tetikli uçlar için: dizin yoksa list() ile bir kez kurar. */
async function ensureIndex(env) {
  const idx = await readIndex(env);
  if (idx) return idx;
  let adlar = [];
  try {
    const list = await env.REMINDERS.list({ prefix: 'sub:' });
    adlar = list.keys.map(k => k.name);
  } catch (e) {
    adlar = [];               // list engelliyse boş kur; sync dizini doldurur
  }
  await env.REMINDERS.put(INDEX_KEY, JSON.stringify(adlar));
  return adlar;
}

async function indexAdd(env, key) {
  const idx = await ensureIndex(env);
  if (idx.indexOf(key) !== -1) return;
  await env.REMINDERS.put(INDEX_KEY, JSON.stringify(idx.concat([key])));
}

async function indexRemove(env, key) {
  const idx = await readIndex(env);
  if (!idx || idx.indexOf(key) === -1) return;
  await env.REMINDERS.put(INDEX_KEY, JSON.stringify(idx.filter(function(n) { return n !== key; })));
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
// "Gönderildi" kaydı eskiden düz metin damgaydı; tekrar mantığı için gönderim
// dakikasını da tutmamız gerekiyor. Eski kayıtlar sorunsuz okunsun diye normalize
// ediyoruz — dakikası bilinmeyen eski kayıt tekrarlanmaz, ertesi gün düzelir.
function normalizeFired(value) {
  if (!value) return null;
  if (typeof value === 'string') return { stamp: value, minute: null, count: 1, at: null };
  return {
    stamp: value.stamp,
    minute: typeof value.minute === 'number' ? value.minute : null,
    count: value.count || 1,
    at: value.at || null
  };
}

function notificationFor(item, tekrar) {
  const bits = [];
  if (item.dose && item.dose !== '—') bits.push(item.dose);
  if (item.timing) bits.push(item.timing);
  if (item.note) bits.push(item.note);
  bits.push(tekrar ? 'Aldıysan uygulamadan işaretle' : 'Unutma 💪');

  return JSON.stringify({
    title: (tekrar ? '🔔 Hâlâ bekliyor: ' : '⏰ ') + (item.name || 'Supplement') +
           (tekrar ? '' : ' zamanı!'),
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
      // Hangi takviyenin hangi gün alındığı — { id: 'YYYY-MM-DD' }.
      // İşaretlenen takviye için o gün tekrar bildirim gönderilmez.
      taken: (body.taken && typeof body.taken === 'object') ? body.taken : {},
      fired: (existing && existing.fired) || {},
      updatedAt: new Date().toISOString()
    }));
    await indexAdd(env, key);

    return json({ ok: true, count: (body.reminders || []).length }, env);
  }

  if (url.pathname === '/unsubscribe' && request.method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body || !body.endpoint) return json({ error: 'endpoint gerekli.' }, env, 400);
    const silinen = await subKey(body.endpoint);
    await env.REMINDERS.delete(silinen);
    await indexRemove(env, silinen);
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
    const adlar = await ensureIndex(env);
    const subs = [];

    for (const entry of adlar.map(function(n) { return { name: n }; })) {
      const record = await env.REMINDERS.get(entry.name, 'json');
      if (!record) continue;

      const now = localNow(record.timezone);
      const fired = record.fired || {};
      const taken = record.taken || {};

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
          const prev = normalizeFired(fired[item.id]);
          const bugunGonderildi = prev && prev.stamp === now.date + ' ' + item.time;
          const alindi = taken[item.id] === now.date;

          let durum;
          if (alindi) durum = 'kullanıcı aldım dedi, susuldu';
          else if (diff < -LEAD_MINUTES) durum = 'saati henüz gelmedi (' + (-diff) + ' dk var)';
          else if (diff > GRACE_MINUTES) durum = 'saati geçti, bugün atlandı (' + diff + ' dk önce)';
          else if (!bugunGonderildi) durum = '>>> ŞİMDİ GÖNDERİLMELİ <<<';
          else if (prev.minute === null) durum = 'bugün gönderildi (eski kayıt, saati bilinmiyor)';
          else {
            const gecen = now.minutes - prev.minute;
            durum = gecen >= REPEAT_MINUTES
              ? '>>> TEKRAR GÖNDERİLMELİ <<< (' + gecen + ' dk önce gönderilmişti)'
              : 'gönderildi, tekrara ' + (REPEAT_MINUTES - gecen) + ' dk var';
          }

          const satir = { ad: item.name, saat: item.time, farkDakika: diff, durum: durum };
          if (bugunGonderildi) {
            satir.gonderimSayisi = prev.count;
            // Asıl merak edilen: saniyesiyle birlikte ne zaman gönderildi
            if (prev.at) {
              satir.gonderimZamaniUTC = prev.at;
              satir.gonderimSaatiYerel = new Intl.DateTimeFormat('tr-TR', {
                timeZone: record.timezone || 'UTC',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
              }).format(new Date(prev.at));
            }
          }
          if (alindi) satir.alindiTarih = taken[item.id];
          return satir;
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
  // Bilerek list() değil: dakikalık cron günlük list sınırını aşıyordu.
  // Dizin yoksa bu tur boş geçiyor; telefon bir kez senkronize edince doluyor.
  const adlar = (await readIndex(env)) || [];
  let sent = 0;

  for (const entry of adlar.map(function(n) { return { name: n }; })) {
    const record = await env.REMINDERS.get(entry.name, 'json');
    if (!record || !Array.isArray(record.reminders)) continue;

    const now = localNow(record.timezone);
    const fired = record.fired || {};
    const taken = record.taken || {};
    const liveIds = {};
    let changed = false;
    let gone = false;

    for (const item of record.reminders) {
      if (!item || !item.id || !item.time) continue;
      liveIds[item.id] = true;

      // Kullanıcı bugün "aldım" demişse susuyoruz
      if (taken[item.id] === now.date) continue;

      const due = reminderMinutes(item.time);
      if (due === null) continue;

      const diff = now.minutes - due;
      if (diff < -LEAD_MINUTES || diff > GRACE_MINUTES) continue;

      const stamp = now.date + ' ' + item.time;
      const prev = normalizeFired(fired[item.id]);
      let tekrar = 0;

      if (prev && prev.stamp === stamp) {
        // Dakikası bilinmeyen eski kayıt: bugünlük gönderilmiş say, tekrarlama
        if (prev.minute === null) continue;
        if (now.minutes - prev.minute < REPEAT_MINUTES) continue;
        tekrar = prev.count;
      }

      const result = await sendPush(record, notificationFor(item, tekrar), vapid);
      if (result.gone) { gone = true; break; }
      if (result.ok) {
        fired[item.id] = {
          stamp: stamp,
          minute: now.minutes,
          count: tekrar + 1,
          at: new Date().toISOString()
        };
        changed = true;
        sent++;
      }
    }

    // Abonelik iptal edilmişse kaydı sil
    if (gone) {
      await env.REMINDERS.delete(entry.name);
      await indexRemove(env, entry.name);
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
