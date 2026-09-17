/* Cron dakikada bir uyandığı için saatinde gönderilen bildirim hedef dakikayı
   kaçırıyordu. Tarama hatırlatmayı bir dakika önceden yakalıyor (LEAD_MINUTES). */
import { kur, cronLoglariniSustur } from './_ortam.mjs';

export default async function ({ rapor }) {
  cronLoglariniSustur();
  const o = await kur();

  const hatirlatma = (id, dakika) => ({ id, name: 'Test ' + id, dose: '1', timing: 'Sabah', time: o.saat(dakika) });
  const calistir = async (liste) => {
    o.env.REMINDERS.store.clear();
    o.gonderimler.length = 0;
    await o.cagir('/sync', 'POST', { subscription: o.subscription, reminders: liste, timezone: 'Europe/Istanbul' });
    await o.cron();
    return o.gonderimler.length;
  };

  rapor.baslik('gönderim penceresi');
  rapor.kontrol('Tam şu anki dakika gönderiliyor',      await calistir([hatirlatma('t0', 0)])  === 1);
  rapor.kontrol('1 dakika sonrası da gönderiliyor',      await calistir([hatirlatma('t1', +1)]) === 1);
  rapor.kontrol('2 dakika sonrası henüz gönderilmiyor',  await calistir([hatirlatma('t2', +2)]) === 0);
  rapor.kontrol('10 dakika gecikmiş hâlâ gönderiliyor',  await calistir([hatirlatma('t3', -10)]) === 1);
  rapor.kontrol('60 dakikayı aşan atlanıyor',            await calistir([hatirlatma('t4', -61)]) === 0);

  rapor.baslik('çift gönderim garantisi');
  /* Damga gönderim anıyla değil hatırlatmanın KENDİ saatiyle atılmalı.
     Öyleyse bir dakika erken gönderilen bildirim, hedef dakika geldiğinde
     tekrarlanmaz — cron'un hangi saniyede çalıştığından bağımsız olarak. */
  await calistir([hatirlatma('t5', +1)]);
  const kayit = await o.env.REMINDERS.get([...o.env.REMINDERS.store.keys()][0], 'json');
  const damga = kayit.fired['t5'].stamp;
  const hedef = o.saat(+1);
  rapor.kontrol('Damga hatırlatmanın kendi saatiyle atılıyor', damga.endsWith(' ' + hedef), damga + ' — hedef ' + hedef);

  const oncesi = o.gonderimler.length;
  await o.cron();
  rapor.kontrol('Erken gönderilen bildirim hedef dakikada tekrarlanmıyor', o.gonderimler.length === oncesi);

  o.zamaniCoz();   // gerçek saati geri bırak, sonraki takımlar etkilenmesin
}
