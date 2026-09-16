/* Ana sayfadaki supplement kartı: günlük "alındı" sayacı ve ilerleme çubuğu. */
import { sayfaAc, bugunAnahtari } from '../harness.mjs';
import { takviye } from './_veri.mjs';

const BUGUN = bugunAnahtari();
const now = new Date();
const kaydir = n => {
  const d = new Date(now.getTime() + n * 60000);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
};
// Biri çoktan geçmiş, biri yaklaşan — "sıradaki" hesabı denenebilsin
const PLAN = {
  'Sabah': [takviye('a', 'Omega 3', '1', kaydir(-120)), takviye('b', 'D Vitamini', '1', kaydir(-60))],
  'Akşam / Yatmadan Önce': [takviye('c', 'Magnezyum', '1', kaydir(90))]
};

export default async function ({ rapor, adres, browser }) {
  const kartOku = async (alinan, plan = PLAN) => {
    const { ctx, page } = await sayfaAc(browser, {
      adres,
      veri: { ft_height: '178', ft_weight: '75.4', ft_supplement_plan: JSON.stringify(plan),
              ft_supp_taken: JSON.stringify(alinan || {}) }
    });
    const o = await page.evaluate(() => {
      const c = document.querySelector('.today-card.cat-supplement');
      if (!c) return null;
      const f = c.querySelector('.today-fill');
      return {
        deger: c.querySelector('.today-value').textContent.trim().replace(/\s+/g, ' '),
        meta: (c.querySelector('.today-meta') || {}).textContent || '',
        yan: (c.querySelector('.today-aside') || {}).textContent || '',
        cubuk: f ? f.style.width : '(yok)'
      };
    });
    return { o, ctx, page };
  };

  rapor.baslik('hiçbiri alınmadı');
  let r = await kartOku({});
  rapor.kontrol('Sayaç 0 / 3', r.o.deger === '0 / 3 alındı', r.o.deger);
  rapor.kontrol('Çubuk boş', r.o.cubuk === '0%', r.o.cubuk);
  rapor.kontrol('Sıradaki Magnezyum', r.o.meta === 'Sıradaki: Magnezyum', r.o.meta);
  rapor.kontrol('Saat yanda gösteriliyor', r.o.yan === kaydir(90), r.o.yan);
  await r.ctx.close();

  rapor.baslik('biri alındı');
  r = await kartOku({ a: BUGUN });
  rapor.kontrol('Sayaç 1 / 3', r.o.deger === '1 / 3 alındı', r.o.deger);
  rapor.kontrol('Çubuk %33', r.o.cubuk === '33%', r.o.cubuk);
  await r.ctx.close();

  rapor.baslik('sıradaki olan alınınca sırada görünmüyor');
  r = await kartOku({ c: BUGUN });
  rapor.kontrol('İşi biten sıraya konmuyor', r.o.meta === '2 takviye kaldı', r.o.meta);
  rapor.kontrol('Yan saat boş', r.o.yan === '', r.o.yan);
  await r.ctx.close();

  rapor.baslik('hepsi alındı');
  r = await kartOku({ a: BUGUN, b: BUGUN, c: BUGUN });
  rapor.kontrol('Sayaç 3 / 3', r.o.deger === '3 / 3 alındı', r.o.deger);
  rapor.kontrol('Çubuk dolu', r.o.cubuk === '100%', r.o.cubuk);
  rapor.kontrol('Tamamlandı mesajı', r.o.meta === 'Bugünkü takviyelerin tamam 💪', r.o.meta);
  await r.ctx.close();

  rapor.baslik('kenar durumlar');
  r = await kartOku({ a: '2020-01-01', b: '2020-01-01', c: '2020-01-01' });
  rapor.kontrol('Dünkü işaret bugünü etkilemiyor', r.o.deger === '0 / 3 alındı', r.o.deger);
  await r.ctx.close();

  r = await kartOku({}, { 'Sabah': [{ id: 'x', name: 'Çinko', dose: '1', note: '' }] });
  rapor.kontrol('Saat kurulmamışsa yönlendiriyor', r.o.meta === 'Henüz hatırlatma saati kurmadın', r.o.meta);
  await r.ctx.close();

  r = await kartOku({}, {});
  rapor.kontrol('Plan yokken mesaj korunuyor', r.o.deger === 'Planın yok', r.o.deger);
  rapor.kontrol('Çubuk çizilmiyor', r.o.cubuk === '(yok)', r.o.cubuk);
  await r.ctx.close();

  rapor.baslik('işaretleyince kart anında güncelleniyor');
  r = await kartOku({});
  await r.page.evaluate(() => { showPage('supplement'); renderSupplementPlanView(); });
  await r.page.waitForTimeout(250);
  await r.page.click('.supp-row[data-supp-id="a"] .supp-take-btn');
  await r.page.waitForTimeout(280);
  await r.page.evaluate(() => showPage('home'));
  await r.page.waitForTimeout(220);
  const sonra = await r.page.evaluate(() =>
    document.querySelector('.today-card.cat-supplement .today-value').textContent.trim().replace(/\s+/g, ' '));
  rapor.kontrol('Ana sayfaya dönünce 1 / 3', sonra === '1 / 3 alındı', sonra);
  await r.ctx.close();
}
