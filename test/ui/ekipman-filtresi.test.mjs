/* Ekipman filtresi.

   Hareket listesi ajanla birlikte 281'den binlere çıkabiliyor. "Göğüs"
   seçtiğinde 18 çeşit bench press arasından seçmek zorlaşıyor; elindeki
   ekipmana göre daraltmak listeyi tekrar kullanılabilir yapıyor.

   Kritik nokta: filtre hiçbir hareketi KAYBETMEMELİ. "Hepsi" seçiliyken
   liste filtresiz hâliyle aynı olmalı. */
import { sayfaAc } from '../harness.mjs';

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres });
  /* Seçiciler antrenman sayfasındaki açılır bölümde; görünür olmadan
     selectOption çalışmıyor. */
  await page.click('.bottom-nav-item[data-page="workout"]');
  await page.click('#toggleBuilderBtn');
  await page.waitForSelector('#builder-equipment', { timeout: 5000 });
  await page.waitForFunction(
    () => document.querySelectorAll('#builder-equipment option').length > 0,
    null, { timeout: 5000 });

  const secenekler = s => page.locator(s + ' option').allTextContents();
  const degerler = s => page.locator(s + ' option').evaluateAll(o => o.map(x => x.value));

  rapor.baslik('ekipman seçici doluyor');
  const ekipmanlar = await secenekler('#builder-equipment');
  rapor.kontrol('En az iki seçenek var', ekipmanlar.length >= 2, ekipmanlar.join(', '));
  rapor.kontrol('İlk seçenek Hepsi', /^Hepsi/.test(ekipmanlar[0]), ekipmanlar[0]);
  rapor.kontrol('Hepsi varsayılan seçili',
    (await page.locator('#builder-equipment').inputValue()) === '*');
  rapor.kontrol('Sayılar gösteriliyor', /\(\d+\)/.test(ekipmanlar[0]), ekipmanlar[0]);
  rapor.kontrol('Türkçe etiketler',
    !ekipmanlar.some(e => /^(barbell|dumbbell|machine) \(/.test(e)) ,
    ekipmanlar.join(', '));

  rapor.baslik('ekipmansız hareketler doğru adlandırılıyor');
  /* EQUIPMENT_TR'de "none" boş metne eşleniyor; olduğu gibi kullanılsaydı
     seçenek adı "(49)" diye görünürdü. */
  const evde = await page.evaluate(() => {
    document.getElementById('builder-location').value = 'Evde';
    document.getElementById('builder-location').dispatchEvent(new Event('change'));
    return true;
  });
  await page.waitForTimeout(250);
  const evdeEkipman = await secenekler('#builder-equipment');
  rapor.kontrol('Boş etiket yok',
    !evdeEkipman.some(e => /^\s*\(/.test(e)), evdeEkipman.join(', '));

  rapor.baslik('"Hepsi" hiçbir hareketi kaybetmiyor');
  await page.evaluate(() => {
    document.getElementById('builder-location').value = 'Spor Salonunda';
    document.getElementById('builder-location').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(250);
  const bolge = await page.locator('#builder-region').inputValue();
  const hepsi = await degerler('#builder-exercise');
  const beklenen = await page.evaluate((b) =>
    EXERCISES['Spor Salonunda'].filter(e => e.muscle === b).map(e => e.name), bolge);
  rapor.kontrol('Filtresiz liste tam',
    JSON.stringify(hepsi) === JSON.stringify(beklenen),
    hepsi.length + ' / ' + beklenen.length);

  rapor.baslik('ekipman seçilince daralıyor');
  const ilkEkipman = (await degerler('#builder-equipment')).find(v => v !== '*');
  await page.selectOption('#builder-equipment', ilkEkipman);
  await page.waitForTimeout(200);
  const daraltilmis = await degerler('#builder-exercise');
  rapor.kontrol('Liste daraldı', daraltilmis.length < hepsi.length,
    hepsi.length + ' → ' + daraltilmis.length);
  rapor.kontrol('Kalanların hepsi o ekipmanla',
    await page.evaluate(({ b, e }) =>
      EXERCISES['Spor Salonunda']
        .filter(x => x.muscle === b && (x.equipment || 'none') === e).length,
      { b: bolge, e: ilkEkipman }) === daraltilmis.length,
    String(daraltilmis.length));
  rapor.kontrol('Daralan liste tamamen büyük listenin içinde',
    daraltilmis.every(d => hepsi.includes(d)));

  rapor.baslik('sayaç doğru');
  const sayac = await page.locator('#builderExerciseCount').textContent();
  rapor.kontrol('Kaç hareket kaldığı yazıyor',
    sayac.startsWith(String(daraltilmis.length)), sayac);

  rapor.baslik('bölge değişince seçim korunuyor');
  /* Dumbbell'la çalışan biri her bölge değişiminde baştan seçmesin. */
  const bolgeler = await degerler('#builder-region');
  const baskaBolge = bolgeler.find(b => b !== bolge);
  const ortakEkipman = await page.evaluate((b) => {
    const list = EXERCISES['Spor Salonunda'].filter(e => e.muscle === b);
    return list.length ? (list[0].equipment || 'none') : null;
  }, baskaBolge);

  await page.selectOption('#builder-equipment', ortakEkipman);
  await page.waitForTimeout(150);
  await page.selectOption('#builder-region', baskaBolge);
  await page.waitForTimeout(250);
  rapor.kontrol('Uygun seçim korundu',
    (await page.locator('#builder-equipment').inputValue()) === ortakEkipman,
    await page.locator('#builder-equipment').inputValue());

  rapor.baslik('geçersiz seçim Hepsi\'ye dönüyor');
  const nadir = await page.evaluate(() => {
    const say = {};
    EXERCISES['Spor Salonunda'].forEach(e => {
      const k = e.muscle + '|' + (e.equipment || 'none');
      say[k] = (say[k] || 0) + 1;
    });
    // Bir bölgede olup başka bir bölgede olmayan ekipman bul
    const bolgeler = [...new Set(EXERCISES['Spor Salonunda'].map(e => e.muscle))];
    for (const b of bolgeler) {
      const ekip = [...new Set(EXERCISES['Spor Salonunda']
        .filter(e => e.muscle === b).map(e => e.equipment || 'none'))];
      for (const e of ekip) {
        const yok = bolgeler.find(b2 => b2 !== b &&
          !EXERCISES['Spor Salonunda'].some(x => x.muscle === b2 && (x.equipment || 'none') === e));
        if (yok) return { bolge: b, ekipman: e, digerBolge: yok };
      }
    }
    return null;
  });

  if (nadir) {
    await page.selectOption('#builder-region', nadir.bolge);
    await page.waitForTimeout(200);
    await page.selectOption('#builder-equipment', nadir.ekipman);
    await page.waitForTimeout(150);
    await page.selectOption('#builder-region', nadir.digerBolge);
    await page.waitForTimeout(250);
    rapor.kontrol('O ekipman olmayan bölgede Hepsi\'ye döndü',
      (await page.locator('#builder-equipment').inputValue()) === '*',
      await page.locator('#builder-equipment').inputValue());
    rapor.kontrol('Hareket listesi boş kalmadı',
      (await degerler('#builder-exercise')).length > 0,
      String((await degerler('#builder-exercise')).length));
  } else {
    rapor.kontrol('Bölgeye özel ekipman bulunamadı — durum sınanamadı', true, 'atlandı');
    rapor.kontrol('Yine de liste dolu', (await degerler('#builder-exercise')).length > 0);
  }

  rapor.baslik('konsol temiz');
  rapor.kontrol('Sayfa hatası yok', hatalar.length === 0, hatalar.join(' | '));
  await ctx.close();
}
