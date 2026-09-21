/* Worker'ı gerçek ağa çıkmadan denemek için sahte ortam:
   bellek içi KV, gerçek VAPID anahtarları ve gönderimi yakalayan sahte fetch.
   Şifreleme ve imzalama gerçekten çalışır; yalnızca push servisi taklittir. */
import { fileURLToPath } from 'node:url';

/* Testler saatten bağımsız olmalı.

   Hatırlatma saatleri "şu ana göre" kurulduğu için gece yarısını geçen bir
   koşuda saat(-10) bir önceki güne düşüyor; worker onu "gecikmiş" değil
   "henüz vakti gelmemiş" sayıyor ve testler kırılıyor. Bu CI'ın ilk gerçek
   koşusunda, 00:02'de yakalandı.

   Zamanı gün ortasına sabitliyoruz: ±3 saatlik kaydırmalar gün sınırını
   geçmiyor ve sonuç koşu saatinden bağımsız hale geliyor. */
const SABIT_AN = '2026-09-17T09:00:00Z';   // İstanbul'da 12:00

function zamaniDondur(iso) {
  const an = new Date(iso).getTime();
  const Gercek = Date;
  class SabitDate extends Gercek {
    constructor(...a) { super(...(a.length ? a : [an])); }
    static now() { return an; }
  }
  globalThis.Date = SabitDate;
  return () => { globalThis.Date = Gercek; };
}

const b64u = b => Buffer.from(b).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/* İşlemleri sayan sahte KV. Sayaç şart: KV'nin ücretsiz katmanında günlük
   list sınırı 1000 ve dakikalık cron bunu aşıp hesabı bloke etmişti. Artık
   cron'un hiç list yapmadığı testle tutuluyor. */
function sahteKV() {
  const store = new Map();
  const sayac = { get: 0, put: 0, delete: 0, list: 0 };
  const kv = {
    store,
    sayac,
    // Günlük list sınırı dolduğunda Cloudflare 429 dönüyor ve Worker içindeki
    // list çağrısı hata fırlatıyor. Testler o durumu da deneyebilsin diye.
    listEngelli: false,
    sayaciSifirla() { sayac.get = sayac.put = sayac.delete = sayac.list = 0; },
    async get(key, tur) {
      sayac.get++;
      const v = store.get(key);
      return v === undefined ? null : (tur === 'json' ? JSON.parse(v) : v);
    },
    async put(key, deger) { sayac.put++; store.set(key, deger); },
    async delete(key) { sayac.delete++; store.delete(key); },
    async list({ prefix }) {
      sayac.list++;
      if (kv.listEngelli) {
        const e = new Error('KV list failed: 429 Too Many Requests');
        e.status = 429;
        throw e;
      }
      return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) };
    }
  };
  return kv;
}

export async function kur({ an = SABIT_AN } = {}) {
  const zamaniCoz = zamaniDondur(an);
  const worker = (await import(fileURLToPath(new URL('../../worker/src/worker.js', import.meta.url)))).default;

  const vk = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const vapidPublic = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', vk.publicKey)));
  const vapidPrivateJwk = await crypto.subtle.exportKey('jwk', vk.privateKey);
  delete vapidPrivateJwk.key_ops; delete vapidPrivateJwk.ext;

  const uaKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/TEST-ENDPOINT-123',
    keys: {
      p256dh: b64u(new Uint8Array(await crypto.subtle.exportKey('raw', uaKeys.publicKey))),
      auth: b64u(crypto.getRandomValues(new Uint8Array(16)))
    }
  };

  const gonderimler = [];
  const durum = { kod: 201 };
  globalThis.fetch = async (url, opts) => {
    gonderimler.push({
      url: String(url), auth: opts.headers['Authorization'],
      encoding: opts.headers['Content-Encoding'], ttl: opts.headers['TTL'],
      urgency: opts.headers['Urgency'], bytes: opts.body.length
    });
    return { ok: durum.kod < 400, status: durum.kod };
  };

  const env = {
    REMINDERS: sahteKV(),
    DEVICE_KEY: 'gizli-cihaz-anahtari',
    ADMIN_KEY: 'gizli-panel-anahtari',
    VAPID_PUBLIC_KEY: vapidPublic,
    VAPID_PRIVATE_JWK: JSON.stringify(vapidPrivateJwk),
    VAPID_SUBJECT: 'mailto:test@example.com',
    ALLOWED_ORIGIN: '*'
  };

  const istek = (yol, method, govde, anahtar = env.DEVICE_KEY) =>
    new Request('https://w.dev' + yol, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': anahtar },
      body: govde ? JSON.stringify(govde) : undefined
    });

  const cagir = async (...a) => {
    const res = await worker.fetch(istek(...a), env);
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  /* Panel HTTP Basic ile korunuyor: tarayıcının kendi giriş penceresi.
     Kullanıcı adı önemsiz, parola ADMIN_KEY ile karşılaştırılıyor. */
  const adminCagir = async (yol, method = 'GET', govde, anahtar = env.ADMIN_KEY) => {
    const baslik = { 'Content-Type': 'application/json' };
    if (anahtar !== null) {
      baslik.Authorization = 'Basic ' + Buffer.from('admin:' + anahtar).toString('base64');
    }
    const res = await worker.fetch(new Request('https://w.dev' + yol, {
      method, headers: baslik, body: govde ? JSON.stringify(govde) : undefined
    }), env);
    const tur = res.headers.get('Content-Type') || '';
    return {
      status: res.status,
      basliklar: res.headers,
      body: tur.includes('json') ? await res.json().catch(() => null) : await res.text()
    };
  };

  const cron = async () => {
    await worker.scheduled({}, env, { waitUntil: p => p });
    await new Promise(r => setTimeout(r, 250));
  };

  // Veri ajanlarının günlük zamanlayıcısı — hatırlatma turundan ayrı
  const gunlukCron = async () => {
    await worker.scheduled({ cron: '0 0 * * *' }, env, { waitUntil: p => p });
    await new Promise(r => setTimeout(r, 250));
  };

  // Şu ana göre kaydırılmış "SS:DD" üretir — testler saatten bağımsız olsun
  const saat = (dakikaFarki) => {
    const d = new Date(Date.now() + dakikaFarki * 60000);
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(d);
    const o = {}; for (const x of p) o[x.type] = x.value;
    return o.hour + ':' + o.minute;
  };

  const bugun = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

  return { worker, env, vapidPublic, subscription, gonderimler, durum, cagir, adminCagir, cron, gunlukCron, saat, bugun, zamaniCoz };
}

/* Cron ve ajan kayıtlarını test çıktısından uzak tut.
   Ajan hataları kasıtlı olarak console.error'a yazılıyor ("wrangler tail" ile
   görülebilsin diye) ve testler o hatayı bilerek tetikliyor — yığın izi
   sonuçların arasına karışmasın. */
const eskiLog = console.log, eskiErr = console.error;
const SUSTURULAN = ['[cron]', '[ajan]'];
const susturulsun = a => SUSTURULAN.some(on => String(a ?? '').startsWith(on));
export function cronLoglariniSustur() {
  console.log = (...a) => { if (!susturulsun(a[0])) eskiLog(...a); };
  console.error = (...a) => { if (!susturulsun(a[0])) eskiErr(...a); };
}
