/* Veri künyesi.

   Open Food Facts verisi ODbL lisanslı ve künye göstermek LİSANS ŞARTI —
   unutulursa lisansı ihlal ediyoruz. Künye yalnızca o kaynaktan gerçekten
   veri varsa görünmeli; ajanlar çalışmadan önce boş yere satır koymanın
   anlamı yok. */
import { sayfaAc } from '../harness.mjs';

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres });

  rapor.baslik('kaynak yokken künye yok');
  /* Depodaki hâlde yalnız "elle" ve "tarif" kaynaklı gıdalar var. */
  const kaynaklar = await page.evaluate(() => {
    const s = new Set();
    Object.values(TURKISH_FOODS).forEach(v => v.forEach(g => s.add(g.kaynak)));
    return [...s];
  });
  rapor.kontrol('Depoda usda/off kaydı yok',
    !kaynaklar.includes('usda') && !kaynaklar.includes('off'), kaynaklar.join(', '));
  rapor.kontrol('Künye satırı boş',
    (await page.locator('#gidaKunye').textContent()).trim() === '');

  rapor.baslik('USDA verisi gelince künye çıkıyor');
  await page.evaluate(() => {
    TURKISH_FOODS['Bakliyat'].push({
      name: 'Deneme USDA', kcal: 100, protein: 5, carbs: 10, fat: 1, kaynak: 'usda'
    });
    gidaKunyesiCiz();
  });
  const usdaMetin = await page.locator('#gidaKunye').textContent();
  rapor.kontrol('USDA yazıyor', /USDA FoodData Central/.test(usdaMetin), usdaMetin);
  rapor.kontrol('Kamu malı olduğu belirtiliyor', /kamu malı/.test(usdaMetin), usdaMetin);
  rapor.kontrol('Open Food Facts henüz yok', !/Open Food Facts/.test(usdaMetin), usdaMetin);

  rapor.baslik('OFF verisi gelince ODbL künyesi çıkıyor');
  await page.evaluate(() => {
    TURKISH_FOODS['Bakliyat'].push({
      name: 'Deneme OFF', kcal: 100, protein: 5, carbs: 10, fat: 1, kaynak: 'off'
    });
    gidaKunyesiCiz();
  });
  const offMetin = await page.locator('#gidaKunye').textContent();
  rapor.kontrol('Open Food Facts yazıyor', /Open Food Facts/.test(offMetin), offMetin);
  rapor.kontrol('ODbL lisansı belirtiliyor', /ODbL/.test(offMetin), offMetin);
  rapor.kontrol('İki kaynak birlikte görünüyor',
    /USDA/.test(offMetin) && /Open Food Facts/.test(offMetin), offMetin);

  rapor.baslik('künye bağlantısı güvenli');
  const bag = page.locator('#gidaKunye a');
  rapor.kontrol('Kaynağa bağlantı var', (await bag.count()) === 1);
  rapor.kontrol('openfoodfacts.org\'a gidiyor',
    (await bag.getAttribute('href')) === 'https://openfoodfacts.org',
    await bag.getAttribute('href'));
  rapor.kontrol('Yeni sekmede açılıyor', (await bag.getAttribute('target')) === '_blank');
  rapor.kontrol('noopener konmuş',
    /noopener/.test(await bag.getAttribute('rel')), await bag.getAttribute('rel'));

  rapor.baslik('konsol temiz');
  rapor.kontrol('Sayfa hatası yok', hatalar.length === 0, hatalar.join(' | '));
  await ctx.close();
}
