/* Sayısal alanların HTML'deki min/max değerleri yalnızca tarayıcı uyarısı;
   kaydetme kodu da aynı aralığı uygulamalı. */
import { sayfaAc } from '../harness.mjs';

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres });
  const dogrula = (tur, deger) => page.evaluate(([t, d]) => sayiDogrula(t, d), [tur, deger]);

  rapor.baslik('doğrulayıcı');
  rapor.kontrol('boş değer "bos" döndürüyor',   (await dogrula('weight', '')).bos === true);
  rapor.kontrol('75.4 geçerli',                 (await dogrula('weight', '75.4')).deger === 75.4);
  rapor.kontrol('virgüllü 75,4 kabul ediliyor', (await dogrula('weight', '75,4')).deger === 75.4);
  rapor.kontrol('29 kg reddediliyor',          !!(await dogrula('weight', '29')).hata);
  rapor.kontrol('301 kg reddediliyor',         !!(await dogrula('weight', '301')).hata);
  rapor.kontrol('metin reddediliyor',          !!(await dogrula('weight', 'abc')).hata);
  rapor.kontrol('boy 251 reddediliyor',        !!(await dogrula('height', '251')).hata);
  rapor.kontrol('yaş 9 reddediliyor',          !!(await dogrula('age', '9')).hata);

  rapor.baslik('hedef kilo artık 100 kg üstünü kabul ediyor');
  rapor.kontrol('120 kg hedef geçerli', (await dogrula('goalWeight', '120')).deger === 120);
  const hedefMax = await page.evaluate(() => document.getElementById('goal-weight').max);
  rapor.kontrol('HTML sınırı da 300', hedefMax === '300', hedefMax);

  rapor.baslik('kaydetme yolları');
  await page.evaluate(() => showPage('profile'));
  await page.waitForTimeout(220);

  /* Alanlar artık salt okunur ve yalnızca seçiciden doluyor, yani arayüzden
     geçersiz değer girilemiyor. Doğrulama yine de gerekli: yedek geri
     yüklendiğinde değer dosyadan geliyor. Testler o yolu taklit ediyor. */
  const yaz = (id, deger) => page.evaluate(([i, d]) => {
    document.getElementById(i).value = d;
  }, [id, deger]);

  await yaz('input-height', '400'); await yaz('input-weight', '80');
  await page.click('#save-profile'); await page.waitForTimeout(220);
  let depo = await page.evaluate(() => ({ h: localStorage.getItem('ft_height'), w: localStorage.getItem('ft_weight') }));
  rapor.kontrol('Bir alan hatalıysa hiçbiri kaydedilmiyor', depo.h === null && depo.w === null, JSON.stringify(depo));
  const uyari = (await page.textContent('#profile-feedback')).trim();
  rapor.kontrol('Hangi alanın hatalı olduğu söyleniyor', uyari.includes('Boy'), uyari);

  await yaz('input-height', '178'); await yaz('input-weight', '75.4'); await yaz('input-age', '29');
  await page.click('#save-profile'); await page.waitForTimeout(220);
  depo = await page.evaluate(() => ({
    h: localStorage.getItem('ft_height'), w: localStorage.getItem('ft_weight'), a: localStorage.getItem('ft_age')
  }));
  rapor.kontrol('Geçerli değerler kaydediliyor', depo.h === '178' && depo.w === '75.4' && depo.a === '29', JSON.stringify(depo));

  await yaz('goal-weight', '120'); await page.click('#save-goal'); await page.waitForTimeout(220);
  rapor.kontrol('120 kg hedef kaydedildi', await page.evaluate(() => localStorage.getItem('ft_goal_weight')) === '120');

  await page.fill('#weighin-date', '2026-09-16'); await yaz('weighin-weight', '500');
  await page.click('#add-weighin'); await page.waitForTimeout(220);
  const bos = await page.evaluate(() => JSON.parse(localStorage.getItem('ft_weighins') || '[]'));
  rapor.kontrol('500 kg tartım eklenmiyor', bos.length === 0, JSON.stringify(bos));

  await yaz('weighin-weight', '75.4'); await page.click('#add-weighin'); await page.waitForTimeout(220);
  const dolu = await page.evaluate(() => JSON.parse(localStorage.getItem('ft_weighins') || '[]'));
  rapor.kontrol('Geçerli tartım ekleniyor', dolu.length === 1 && dolu[0].weight === 75.4, JSON.stringify(dolu));

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
