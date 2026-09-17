/* İşaretlenmeyen hatırlatma 15 dakikada bir tekrarlanır; kullanıcı "aldım"
   deyince susar. Tolerans penceresi dolunca tekrarlar kendiliğinden biter. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';

export default async function ({ rapor }) {
  cronLoglariniSustur();
  const o = await kur();
  const kv = () => o.env.REMINDERS.store;
  const kayitOku = async () => o.env.REMINDERS.get([...kv().keys()][0], 'json');
  const kayitYaz = async r => o.env.REMINDERS.put([...kv().keys()][0], JSON.stringify(r));
  const hatirlatma = (id, dakika) => ({ id, name: 'Test ' + id, dose: '1 kapsül', timing: 'Sabah', time: o.saat(dakika) });
  const kurVe = async (liste, alinan) => {
    kv().clear(); o.gonderimler.length = 0;
    await o.cagir('/sync', 'POST', { subscription: o.subscription, reminders: liste, taken: alinan || {}, timezone: 'Europe/Istanbul' });
  };
  // 15 dakika geçmiş gibi yapar
  const zamaniGeriAl = async (id, dakika = 15) => {
    const r = await kayitOku(); r.fired[id].minute -= dakika; await kayitYaz(r);
  };

  rapor.baslik('ilk gönderim ve damga biçimi');
  await kurVe([hatirlatma('x', 0)]);
  await o.cron();
  rapor.kontrol('İlk bildirim gönderildi', o.gonderimler.length === 1);
  let rec = await kayitOku();
  rapor.kontrol('Damga nesne: stamp / minute / count / at',
    typeof rec.fired.x === 'object' && typeof rec.fired.x.minute === 'number' &&
    rec.fired.x.count === 1 && !!rec.fired.x.at, JSON.stringify(rec.fired.x));

  rapor.baslik('tekrar aralığı');
  await o.cron();
  rapor.kontrol('15 dakika dolmadan tekrar yok', o.gonderimler.length === 1);
  await zamaniGeriAl('x');
  await o.cron();
  rapor.kontrol('15 dakika sonra tekrar gönderiliyor', o.gonderimler.length === 2);
  rec = await kayitOku();
  rapor.kontrol('Tekrar sayacı artıyor', rec.fired.x.count === 2, 'count=' + rec.fired.x.count);

  rapor.baslik('"aldım" işareti');
  await zamaniGeriAl('x');
  await o.cagir('/sync', 'POST', { subscription: o.subscription, reminders: [hatirlatma('x', 0)], taken: { x: o.bugun }, timezone: 'Europe/Istanbul' });
  const oncesi = o.gonderimler.length;
  await o.cron();
  rapor.kontrol('İşaretlenince tekrar gönderilmiyor', o.gonderimler.length === oncesi);

  await o.cagir('/sync', 'POST', { subscription: o.subscription, reminders: [hatirlatma('x', 0)], taken: { x: '2020-01-01' }, timezone: 'Europe/Istanbul' });
  await zamaniGeriAl('x');
  await o.cron();
  rapor.kontrol('Dünkü işaret bugünü susturmuyor', o.gonderimler.length === oncesi + 1);

  rapor.baslik('pencere ve eski kayıtlar');
  await kurVe([hatirlatma('y', -61)]);
  await o.cron();
  rapor.kontrol('60 dakikayı aşan hatırlatma hiç gönderilmiyor', o.gonderimler.length === 0, o.gonderimler.length + ' bildirim');

  await kurVe([hatirlatma('z', 0)]);
  rec = await kayitOku(); rec.fired = { z: o.bugun + ' ' + o.saat(0) }; await kayitYaz(rec);
  const once = o.gonderimler.length;
  await o.cron();
  rapor.kontrol('Eski düz metin damgası çökertmiyor ve tekrarlanmıyor', o.gonderimler.length === once);

  rapor.baslik('/debug teşhis çıktısı');
  await kurVe([hatirlatma('w', 0)]);
  await o.cron();
  const dbg = await o.cagir('/debug', 'GET');
  const satir = dbg.body.abonelikler[0].hatirlatmalar[0];
  rapor.kontrol('Gönderim saatini saniyesiyle yazıyor', /^\d{2}:\d{2}:\d{2}$/.test(satir.gonderimSaatiYerel || ''), satir.gonderimSaatiYerel);
  rapor.kontrol('Gönderim sayısını yazıyor', satir.gonderimSayisi === 1);
  rapor.kontrol('Tekrara kalan süreyi yazıyor', /tekrara \d+ dk var/.test(satir.durum), satir.durum);

  await o.cagir('/sync', 'POST', { subscription: o.subscription, reminders: [hatirlatma('w', 0)], taken: { w: o.bugun }, timezone: 'Europe/Istanbul' });
  const dbg2 = await o.cagir('/debug', 'GET');
  rapor.kontrol('"aldım" durumunu yazıyor', dbg2.body.abonelikler[0].hatirlatmalar[0].durum === 'kullanıcı aldım dedi, susuldu');

  o.zamaniCoz();   // gerçek saati geri bırak, sonraki takımlar etkilenmesin
}
