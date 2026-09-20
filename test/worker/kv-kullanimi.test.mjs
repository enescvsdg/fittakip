/* KV kullanım bütçesi.
   Cron dakikada bir çalışıyor. Eskiden her turda list() yapıyordu: günde 1440
   list işlemi, Cloudflare'in ücretsiz katmanında sınır 1000 — hesap bloke oldu
   ve bildirimler kesildi. Bu takım aynı hatanın geri gelmesini engelliyor. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';

cronLoglariniSustur();

const GUNLUK_TUR = 1440;          // dakikalık cron
const LIST_SINIRI = 1000;         // Cloudflare ücretsiz katman, günlük
const OKUMA_SINIRI = 100000;

export default async function ({ rapor }) {
  const { env, subscription, cagir, cron, saat } = await kur();

  await cagir('/sync', 'POST', {
    subscription, timezone: 'Europe/Istanbul',
    reminders: [{ id: 's1', name: 'Kreatin', dose: '5g', time: saat(30) }]
  });

  rapor.baslik('dizin kuruluyor');
  const dizin = await env.REMINDERS.get('index:subs', 'json');
  rapor.kontrol('Senkronizasyon dizini yazıyor', Array.isArray(dizin) && dizin.length === 1,
    JSON.stringify(dizin));
  rapor.kontrol('Dizin abonelik anahtarını tutuyor',
    dizin[0].indexOf('sub:') === 0, dizin[0]);

  rapor.baslik('cron hiç list yapmıyor');
  env.REMINDERS.sayaciSifirla();
  await cron();
  const bir = Object.assign({}, env.REMINDERS.sayac);
  rapor.kontrol('Tek turda list yok', bir.list === 0, 'list: ' + bir.list);
  rapor.kontrol('Günlük list bütçesi aşılmıyor',
    bir.list * GUNLUK_TUR <= LIST_SINIRI,
    bir.list * GUNLUK_TUR + ' / ' + LIST_SINIRI);

  rapor.baslik('okuma bütçesi');
  rapor.kontrol('Bildirim yokken tur başına en fazla 2 okuma', bir.get <= 2, 'get: ' + bir.get);
  rapor.kontrol('Günlük okuma bütçesi rahat',
    bir.get * GUNLUK_TUR <= OKUMA_SINIRI,
    bir.get * GUNLUK_TUR + ' / ' + OKUMA_SINIRI);
  rapor.kontrol('Gönderim yokken yazma da yok', bir.put === 0, 'put: ' + bir.put);

  rapor.baslik('on tur üst üste');
  env.REMINDERS.sayaciSifirla();
  for (let i = 0; i < 10; i++) await cron();
  rapor.kontrol('On turda da hiç list yok', env.REMINDERS.sayac.list === 0,
    'list: ' + env.REMINDERS.sayac.list);

  rapor.baslik('dizin yokken cron sessiz kalıyor');
  // Dizini sil: cron list() ile onarmaya kalkmamalı, o yol sınırı aşan yoldu
  env.REMINDERS.store.delete('index:subs');
  env.REMINDERS.sayaciSifirla();
  await cron();
  rapor.kontrol('Dizin yokken de list yapmıyor', env.REMINDERS.sayac.list === 0,
    'list: ' + env.REMINDERS.sayac.list);
  rapor.kontrol('Dizin yokken çökmüyor', true);

  rapor.baslik('senkronizasyon dizini onarıyor');
  await cagir('/sync', 'POST', {
    subscription, timezone: 'Europe/Istanbul',
    reminders: [{ id: 's1', name: 'Kreatin', dose: '5g', time: saat(30) }]
  });
  const onarilan = await env.REMINDERS.get('index:subs', 'json');
  rapor.kontrol('Dizin yeniden kuruldu', Array.isArray(onarilan) && onarilan.length === 1,
    JSON.stringify(onarilan));

  rapor.baslik('abonelik silinince dizinden de çıkıyor');
  await cagir('/unsubscribe', 'POST', { endpoint: subscription.endpoint });
  const bos = await env.REMINDERS.get('index:subs', 'json');
  rapor.kontrol('Dizin boşaldı', Array.isArray(bos) && bos.length === 0, JSON.stringify(bos));
  env.REMINDERS.sayaciSifirla();
  await cron();
  rapor.kontrol('Boş dizinde okuma da yapmıyor', env.REMINDERS.sayac.get <= 1,
    'get: ' + env.REMINDERS.sayac.get);
}
