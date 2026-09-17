/* Beslenme planı — adet bazlı porsiyonlar.
   Yumurta gram yerine adetle giriliyor. Liste kalabalıklaşmasın diye gıda tek
   satır duruyor; boy (S/M/L) seçilince ortalama ağırlığı adetle çarpılıp
   100 g'lık değerlere ölçekleniyor. Bu takım hem saf hesabı hem boy penceresini
   hem de arayüzün birim değiştirmesini sınıyor. */
import { sayfaAc, appFonksiyonlari } from '../harness.mjs';

// Kaynaktaki tanımla testin beklentisi ayrı ayrı yazılı olsun ki
// gramaj sessizce değişirse test bunu yakalasın.
const GRAM = {
  'Yumurta (tam)': { S: 44, M: 51, L: 60 },
  'Yumurta Akı':   { S: 29, M: 33, L: 39 }
};

export default async function ({ rapor, adres, browser }) {
  /* ── saf hesap ── */
  rapor.baslik('porsiyon hesabı');
  const { porsiyonGrami, porsiyonMetni } = await appFonksiyonlari('porsiyonGrami', 'porsiyonMetni');

  rapor.kontrol('Birimsiz gıdada sayı gramın kendisi',
    porsiyonGrami({ kcal100: 100 }, 150) === 150);
  rapor.kontrol('Adet bazlıda adet × birim ağırlığı',
    porsiyonGrami({ birim: { ad: 'adet', gram: 39 } }, 3) === 117);
  rapor.kontrol('Meta yokken çökmüyor', porsiyonGrami(null, 100) === 100);

  rapor.kontrol('Gram porsiyonu "150 g" yazılıyor',
    porsiyonMetni({ grams: 150 }) === '150 g', porsiyonMetni({ grams: 150 }));
  rapor.kontrol('Adet porsiyonu adet ve gramı birlikte yazıyor',
    porsiyonMetni({ grams: 117, birimAd: 'adet', birimAdet: 3 }) === '3 adet (117 g)',
    porsiyonMetni({ grams: 117, birimAd: 'adet', birimAdet: 3 }));
  rapor.kontrol('Eski kayıtlar (birimsiz) gram olarak okunuyor',
    porsiyonMetni({ grams: 200, birimAd: null, birimAdet: null }) === '200 g');

  /* ── arayüz ── */
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres });
  const builderAc = async () => {
    await page.click('#toggleMealBuilderBtn');
    await page.waitForTimeout(150);
  };
  const alanDurumu = () => page.evaluate(() => ({
    etiket: document.querySelector('label[for="food-amount"]').textContent,
    deger: document.getElementById('food-amount').value,
    min: document.getElementById('food-amount').min,
    max: document.getElementById('food-amount').max,
    onizleme: document.getElementById('mealFoodPreview').textContent.replace(/\s+/g, ' ')
  }));
  const gidaSec = async ad => { await page.selectOption('#food-select', ad); await page.waitForTimeout(180); };
  const boySec = async boy => { await page.click(`.boy-dugme[data-boy="${boy}"]`); await page.waitForTimeout(180); };
  const miktarGir = async v => {
    await page.evaluate(x => {
      const e = document.getElementById('food-amount');
      e.value = x; e.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(v));
    await page.waitForTimeout(150);
  };

  await page.evaluate(() => showPage('nutrition'));
  await builderAc();

  rapor.baslik('liste kalabalıklaşmıyor');
  const secenekler = await page.$$eval('#food-select option', o => o.map(x => x.value));
  const yumurtalar = secenekler.filter(v => /Yumurta/.test(v));
  rapor.kontrol('Yumurta listede iki satır', yumurtalar.length === 2, yumurtalar.join(' | '));
  // "Yumurta (tam)" adında da parantez var; aranan şey boy son eki: (S) (M) (L)
  rapor.kontrol('Boylar listeye yazılmamış', !secenekler.some(v => /\((S|M|L)\)\s*$/.test(v)),
    secenekler.filter(v => /\((S|M|L)\)\s*$/.test(v)).join(' | '));
  rapor.kontrol('Gram bazlı gıdalar duruyor',
    secenekler.indexOf('Tavuk Göğsü (ızgara/haşlama)') !== -1);

  rapor.baslik('boy penceresi');
  await gidaSec('Yumurta Akı');
  rapor.kontrol('Yumurta seçilince pencere açılıyor', await page.isVisible('#boySecici'));
  const dugmeler = await page.$$eval('.boy-dugme', d => d.map(x => ({
    boy: x.dataset.boy, yazi: x.textContent.replace(/\s+/g, ' ')
  })));
  rapor.kontrol('Üç boy da var', dugmeler.length === 3, dugmeler.map(d => d.boy).join(','));
  Object.keys(GRAM['Yumurta Akı']).forEach(boy => {
    const d = dugmeler.find(x => x.boy === boy) || { yazi: '(yok)' };
    rapor.kontrol(boy + ' düğmesinde gramaj yazıyor',
      d.yazi.indexOf(GRAM['Yumurta Akı'][boy] + ' g') !== -1, d.yazi);
  });
  rapor.kontrol('Boy seçilmeden gıda etkin değil',
    (await page.evaluate(() => document.getElementById('addFoodToCartBtn').disabled)) === true);

  await boySec('L');
  rapor.kontrol('Seçince pencere kapanıyor', !(await page.isVisible('#boySecici')));

  let d = await alanDurumu();
  rapor.kontrol('Etiket adede dönüyor', d.etiket === 'Miktar (adet)', d.etiket);
  rapor.kontrol('Varsayılan 1 adet', d.deger === '1', d.deger);
  rapor.kontrol('Aralık 1–30', d.min === '1' && d.max === '30', d.min + '-' + d.max);
  rapor.kontrol('Önizlemede adet ve gram birlikte',
    d.onizleme.indexOf('1 adet ≈ 39 g') !== -1, d.onizleme);
  // 39 g × 0.52 kcal/g = 20,3 → 20
  rapor.kontrol('1 adet L yumurta akı 20 kcal', d.onizleme.indexOf('20 kcal') === 0, d.onizleme.slice(0, 20));

  rapor.baslik('gram bazlı gıdaya dönüş');
  await gidaSec('Tavuk Göğsü (ızgara/haşlama)');
  rapor.kontrol('Boylu olmayan gıdada pencere açılmıyor', !(await page.isVisible('#boySecici')));
  d = await alanDurumu();
  rapor.kontrol('Etiket grama dönüyor', d.etiket === 'Miktar (gram)', d.etiket);
  rapor.kontrol('Varsayılan 100', d.deger === '100', d.deger);
  rapor.kontrol('Gram aralığı geri geliyor', d.max === '2000', d.max);

  rapor.baslik('son boy hatırlanıyor');
  await gidaSec('Yumurta (tam)');
  rapor.kontrol('Önceki boy işaretli geliyor',
    (await page.evaluate(() => document.querySelector('.boy-dugme.secili').dataset.boy)) === 'L');
  rapor.kontrol('Depoya yazıldı',
    (await page.evaluate(() => localStorage.getItem('ft_yumurta_boy'))) === 'L');

  rapor.baslik('iptal');
  await page.click('#boyKapat');
  await page.waitForTimeout(180);
  rapor.kontrol('Pencere kapanıyor', !(await page.isVisible('#boySecici')));
  rapor.kontrol('Seçim önceki gıdaya dönüyor',
    (await page.evaluate(() => document.getElementById('food-select').value)) === 'Tavuk Göğsü (ızgara/haşlama)');
  rapor.kontrol('Önceki gıdanın birimi bozulmadı',
    (await alanDurumu()).etiket === 'Miktar (gram)');

  rapor.baslik('makro ölçeği ve kayıt');
  await gidaSec('Yumurta (tam)');
  await boySec('L');
  await miktarGir(3);
  d = await alanDurumu();
  // 3 × 60 g = 180 g → 155 × 1.8 = 279 kcal, 13 × 1.8 = 23.4 g protein
  rapor.kontrol('3 adet L tam yumurta 279 kcal', d.onizleme.indexOf('279 kcal') === 0, d.onizleme.slice(0, 20));
  rapor.kontrol('Protein 23.4 g', d.onizleme.indexOf('Protein: 23.4g') !== -1, d.onizleme);
  rapor.kontrol('Gram karşılığı 180 g', d.onizleme.indexOf('3 adet ≈ 180 g') !== -1, d.onizleme);

  await page.click('#addFoodToCartBtn');
  await page.waitForTimeout(150);
  const sepet = await page.evaluate(() => ({
    ad: document.querySelector('.cart-item-name').textContent,
    meta: document.querySelector('.cart-item-meta').textContent
  }));
  rapor.kontrol('Sepette ad boyuyla yazıyor', sepet.ad === 'Yumurta (tam) (L)', sepet.ad);
  rapor.kontrol('Sepette adet yazıyor', sepet.meta.indexOf('3 adet (180 g)') !== -1, sepet.meta);

  await page.click('#completeMealBtn');
  await page.waitForTimeout(200);
  const plan = await page.evaluate(() => ({
    yazi: document.querySelector('#mealPlanList .food-log-item-meta').textContent,
    kayit: JSON.parse(localStorage.getItem('ft_meal_plan') || '{}'),
    kcal: document.getElementById('macro-kcal').textContent
  }));
  rapor.kontrol('Planda adet yazıyor', plan.yazi.indexOf('3 adet (180 g)') !== -1, plan.yazi);
  rapor.kontrol('Toplam kcal 279', plan.kcal === '279', plan.kcal);
  const kayitli = (plan.kayit['Öğün 1'] || [])[0] || {};
  rapor.kontrol('Depoda gram da saklanıyor', kayitli.grams === 180, String(kayitli.grams));
  rapor.kontrol('Depoda adet saklanıyor', kayitli.birimAdet === 3 && kayitli.birimAd === 'adet',
    kayitli.birimAdet + ' ' + kayitli.birimAd);

  rapor.baslik('kaydırmalı seçici');
  // Öğün tamamlanınca ekleme bölümü kapanıyor; seçiciyi denemek için yeniden aç
  await builderAc();
  await gidaSec('Yumurta (tam)');
  await boySec('M');
  await page.click('#food-amount');
  await page.waitForTimeout(250);
  const secici = await page.evaluate(() => {
    const ogeler = [...document.querySelectorAll('#seciciTekerlek .secici-sutun .secici-oge')];
    return {
      baslik: document.getElementById('seciciBaslik').textContent,
      ilk: ogeler[0].textContent, son: ogeler[ogeler.length - 1].textContent
    };
  });
  rapor.kontrol('Seçici başlığı adet', secici.baslik === 'Miktar (adet)', secici.baslik);
  rapor.kontrol('Seçici 1–30 arası', secici.ilk === '1' && secici.son === '30',
    secici.ilk + '..' + secici.son);

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
