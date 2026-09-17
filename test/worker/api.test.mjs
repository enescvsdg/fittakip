/* Worker'ın uçları ve cron davranışı: yetkilendirme, senkronizasyon,
   zamanı gelen hatırlatmaların gönderimi, saat dilimi, abonelik temizliği. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';

export default async function ({ rapor }) {
  cronLoglariniSustur();
  const o = await kur();
  const { env, vapidPublic, subscription, gonderimler, durum, cagir, cron, saat } = o;

  // Zaman sabitlendi: testler koşu saatinden bağımsız olmalı
  rapor.kontrol('Test saati sabit (12:00 İstanbul)',
    new Date().toISOString() === '2026-09-17T09:00:00.000Z', new Date().toISOString());

  rapor.baslik('yetkilendirme');
  rapor.kontrol('Yanlış cihaz anahtarı reddediliyor', (await cagir('/health', 'GET', null, 'yanlis')).status === 401);
  const health = await cagir('/health', 'GET');
  rapor.kontrol('Doğru anahtarla /health çalışıyor', health.status === 200 && health.body.vapidPublicKey === vapidPublic);

  rapor.baslik('senkronizasyon');
  const hatirlatmalar = [
    { id: 'a', name: 'Omega 3',   dose: '1000 mg', note: 'Yemekle', timing: 'Sabah', time: saat(0) },
    { id: 'b', name: 'D3',        dose: '2000 IU', note: '',        timing: 'Sabah', time: saat(-10) },
    { id: 'c', name: 'Magnezyum', dose: '400 mg',  note: '',        timing: 'Akşam', time: saat(180) },
    { id: 'd', name: 'Çinko',     dose: '15 mg',   note: '',        timing: 'Akşam', time: saat(-180) }
  ];
  const sync = await cagir('/sync', 'POST', { subscription, reminders: hatirlatmalar, timezone: 'Europe/Istanbul' });
  rapor.kontrol('Senkronizasyon kaydediliyor', sync.status === 200 && sync.body.count === 4, sync.body.count + ' hatırlatma');
  rapor.kontrol('KV kaydı oluştu', env.REMINDERS.store.size === 1);

  rapor.baslik('cron yalnızca zamanı geleni gönderiyor');
  await cron();
  rapor.kontrol('Şimdi + 10 dk gecikmiş olan gönderildi', gonderimler.length === 2, gonderimler.length + ' bildirim');
  rapor.kontrol('Doğru adrese gidiyor', gonderimler.every(c => c.url === subscription.endpoint));
  rapor.kontrol('aes128gcm başlığı var', gonderimler.every(c => c.encoding === 'aes128gcm'));
  rapor.kontrol('VAPID imzası var', gonderimler.every(c => /^vapid t=.+, k=.+$/.test(c.auth)));
  rapor.kontrol('TTL 1 saat — geç bildirim ertesi güne sarkmasın', gonderimler.every(c => c.ttl === '3600'));
  rapor.kontrol('Urgency high — push servisi bekletmesin', gonderimler.every(c => c.urgency === 'high'));

  rapor.baslik('aynı gün tekrar göndermiyor');
  const once = gonderimler.length;
  await cron();
  rapor.kontrol('İkinci cron yeni bildirim üretmiyor', gonderimler.length === once);
  const kayit = await env.REMINDERS.get([...env.REMINDERS.store.keys()][0], 'json');
  rapor.kontrol('Gönderim kaydı tutuluyor', Object.keys(kayit.fired).length === 2, Object.keys(kayit.fired).join(','));

  rapor.baslik('plan değişince kayıt tutarlı kalıyor');
  await cagir('/sync', 'POST', {
    subscription, timezone: 'Europe/Istanbul',
    reminders: [{ id: 'a', name: 'Omega 3', dose: '1000 mg', timing: 'Sabah', time: saat(0) }]
  });
  const kayit2 = await env.REMINDERS.get([...env.REMINDERS.store.keys()][0], 'json');
  rapor.kontrol('Senkronizasyon gönderim kaydını koruyor', Object.keys(kayit2.fired).length === 2);
  await cron();
  const kayit3 = await env.REMINDERS.get([...env.REMINDERS.store.keys()][0], 'json');
  rapor.kontrol('Silinen supplementlerin izi temizleniyor', Object.keys(kayit3.fired).length === 1, JSON.stringify(kayit3.fired));

  rapor.baslik('diğer uçlar');
  const t = await cagir('/test', 'POST', { endpoint: subscription.endpoint });
  rapor.kontrol('/test bildirim gönderiyor', t.status === 200 && t.body.ok);

  await cagir('/sync', 'POST', {
    subscription, timezone: 'America/New_York',
    reminders: [{ id: 'tz', name: 'TZ Testi', timing: 'Sabah', time: saat(0) }]
  });
  const n = gonderimler.length;
  await cron();
  rapor.kontrol('Farklı saat diliminde İstanbul saati tetiklemiyor', gonderimler.length === n);

  durum.kod = 410;
  await cagir('/sync', 'POST', {
    subscription, timezone: 'Europe/Istanbul',
    reminders: [{ id: 'g', name: 'Gone', timing: 'Sabah', time: saat(0) }]
  });
  await cron();
  rapor.kontrol('410 gelince abonelik kaydı siliniyor', env.REMINDERS.store.size === 0);

  durum.kod = 201;
  await cagir('/sync', 'POST', { subscription, reminders: [], timezone: 'Europe/Istanbul' });
  await cagir('/unsubscribe', 'POST', { endpoint: subscription.endpoint });
  rapor.kontrol('/unsubscribe kaydı siliyor', env.REMINDERS.store.size === 0);

  rapor.kontrol('Eksik abonelik reddediliyor', (await cagir('/sync', 'POST', { reminders: [] })).status === 400);
  rapor.kontrol('Bilinmeyen adres 404', (await cagir('/bilinmeyen', 'GET')).status === 404);

  o.zamaniCoz();   // gerçek saati geri bırak, sonraki takımlar etkilenmesin
}
