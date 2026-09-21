/* AI değerlendirmesi kartı.
   Worker çağrısı taklit ediliyor: sınanan şey modelin ne söylediği değil,
   düğmeden sonuca giden yolun doğruluğu ve gelen metnin ekrana GÜVENLİ
   basılması. Metin dış bir servisten geliyor — kaçırılmazsa sayfaya kod
   sokulabilir. */
import { sayfaAc } from '../harness.mjs';

const BAGLI = {
  ft_push_server_url: 'https://worker.deneme.dev',
  ft_push_device_key: 'cihaz-anahtari',
  ft_weight: '78', ft_age: '30', ft_gender: 'erkek'
};

const seans = (tarih, agirlik) => ({
  date: tarih, weekday: 'Pazartesi', title: 'Deneme',
  exercises: [{ name: 'Barbell Bench Press', muscle: 'chest',
                sets: [{ weight: agirlik, reps: 8 }, { weight: agirlik, reps: 8 }] }]
});

const GECMIS = [seans('2026-08-10', 55), seans('2026-08-17', 60), seans('2026-08-24', 60)];

const YANIT = {
  ok: true,
  analiz: {
    baslik: 'Son üç haftanın değerlendirmesi',
    bulgular: [
      { konu: 'Hacim', metin: 'Haftalık set sayın sabit kalmış.' },
      { konu: 'Durgunluk', metin: 'Bench press iki seanstır 60 kg.' }
    ],
    oneriler: ['Ağırlığı 62,5 kg\'a çıkar.']
  },
  ozet: { ilkTarih: '2026-08-10', sonTarih: '2026-08-24', seansSayisi: 3, toplamSet: 6 }
};

/* Worker'a giden çağrıyı yakalayıp taklit eden ağ kesici */
async function workeriTaklitEt(page, yanit, durum = 200) {
  await page.route('**/analiz', async route => {
    await route.fulfill({
      status: durum,
      contentType: 'application/json',
      body: JSON.stringify(yanit)
    });
  });
}

export default async function ({ rapor, adres, browser }) {
  // ── BAĞLANTI YOKKEN ────────────────────────────
  const bos = await sayfaAc(browser, { adres, veri: { ft_workout_history: JSON.stringify(GECMIS) } });
  rapor.baslik('Worker bağlı değilken');
  rapor.kontrol('Kart ana sayfada duruyor',
    await bos.page.locator('#ai-analysis-card').isVisible());
  await bos.page.click('#aiAnalysisBtn');
  await bos.page.waitForTimeout(200);
  const uyari = await bos.page.locator('#aiAnalysisHint').textContent();
  rapor.kontrol('Worker adresi yokken uyarıyor', /Worker adresi girilmemiş/.test(uyari), uyari);
  rapor.kontrol('Uyarı hata olarak işaretli',
    await bos.page.locator('#aiAnalysisHint').evaluate(el => el.classList.contains('hata')));
  rapor.kontrol('Sonuç alanı kapalı kalıyor',
    await bos.page.locator('#aiAnalysisResult').isHidden());
  await bos.ctx.close();

  // ── YETERSİZ GEÇMİŞ ────────────────────────────
  const az = await sayfaAc(browser, { adres, veri: {
    ...BAGLI, ft_workout_history: JSON.stringify([seans('2026-08-10', 55)])
  } });
  rapor.baslik('geçmiş yetersizken');
  await az.page.click('#aiAnalysisBtn');
  await az.page.waitForTimeout(200);
  const azMetin = await az.page.locator('#aiAnalysisHint').textContent();
  rapor.kontrol('En az üç antrenman isteniyor', /en az 3/i.test(azMetin), azMetin);
  rapor.kontrol('Kaç tane olduğu söyleniyor', /1 var/.test(azMetin), azMetin);
  await az.ctx.close();

  // ── BAŞARILI ÇALIŞMA ───────────────────────────
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: {
    ...BAGLI, ft_workout_history: JSON.stringify(GECMIS)
  } });
  await workeriTaklitEt(page, YANIT);

  rapor.baslik('hazır durumu');
  const hazir = await page.locator('#aiAnalysisHint').textContent();
  rapor.kontrol('Kaç antrenman değerlendirileceğini söylüyor', /3 antrenman/.test(hazir), hazir);

  rapor.baslik('değerlendirme alınıyor');
  await page.click('#aiAnalysisBtn');
  await page.waitForSelector('#aiAnalysisResult:not(.hidden)', { timeout: 5000 });

  rapor.kontrol('Başlık ekranda',
    (await page.locator('.ai-baslik').textContent()) === 'Son üç haftanın değerlendirmesi');
  rapor.kontrol('Dönem satırı ekranda',
    /2026-08-10 → 2026-08-24 · 3 seans · 6 set/.test(await page.locator('.ai-donem').textContent()),
    await page.locator('.ai-donem').textContent());
  rapor.kontrol('İki bulgu basıldı', (await page.locator('.ai-bulgu').count()) === 2,
    String(await page.locator('.ai-bulgu').count()));
  rapor.kontrol('Bulgu konusu görünüyor',
    (await page.locator('.ai-bulgu .konu').first().textContent()) === 'Hacim');
  rapor.kontrol('Öneri listelendi',
    /62,5 kg/.test(await page.locator('.ai-oneriler li').first().textContent()));
  rapor.kontrol('Düğme tekrar kullanılabilir',
    await page.locator('#aiAnalysisBtn').isEnabled());

  rapor.baslik('sonuç kalıcı');
  const saklanan = await page.evaluate(() => localStorage.getItem('ft_ai_analiz'));
  rapor.kontrol('localStorage\'a yazıldı', !!saklanan && saklanan.includes('Son üç haftanın'));
  await page.reload();
  await page.waitForSelector('#ai-analysis-card');
  rapor.kontrol('Yenilemeden sonra da duruyor',
    await page.locator('#aiAnalysisResult').isVisible());
  rapor.kontrol('Son değerlendirme tarihi gösteriliyor',
    /Son değerlendirme/.test(await page.locator('#aiAnalysisHint').textContent()),
    await page.locator('#aiAnalysisHint').textContent());
  await ctx.close();

  // ── HATA DURUMU ────────────────────────────────
  const hata = await sayfaAc(browser, { adres, veri: {
    ...BAGLI, ft_workout_history: JSON.stringify(GECMIS)
  } });
  await workeriTaklitEt(hata.page, { error: 'Analiz için en az 3 seans gerekiyor.' }, 422);
  rapor.baslik('sunucu hatası');
  await hata.page.click('#aiAnalysisBtn');
  await hata.page.waitForTimeout(600);
  const hataMetni = await hata.page.locator('#aiAnalysisHint').textContent();
  rapor.kontrol('Sunucunun açıklaması ekrana yazılıyor',
    /en az 3 seans/.test(hataMetni), hataMetni);
  rapor.kontrol('Hata olarak işaretli',
    await hata.page.locator('#aiAnalysisHint').evaluate(el => el.classList.contains('hata')));
  rapor.kontrol('Düğme kilitli kalmıyor',
    await hata.page.locator('#aiAnalysisBtn').isEnabled());
  await hata.ctx.close();

  // ── ZARARLI METİN ──────────────────────────────
  /* Metin Worker'dan, oraya da modelden geliyor. Model bir ürün sayfasından ya
     da kullanıcının kendi not alanından zararlı metin taşıyabilir. */
  const kotu = await sayfaAc(browser, { adres, veri: {
    ...BAGLI, ft_workout_history: JSON.stringify(GECMIS)
  } });
  await workeriTaklitEt(kotu.page, {
    ok: true,
    analiz: {
      baslik: '<img src=x onerror="window.__sizdi=1">',
      bulgular: [{ konu: '<b>K</b>', metin: '<script>window.__sizdi2=1<\/script>Normal metin' }],
      oneriler: ['<iframe src="javascript:window.__sizdi3=1"></iframe>']
    },
    ozet: { ilkTarih: '2026-08-10', sonTarih: '2026-08-24', seansSayisi: 3, toplamSet: 6 }
  });
  rapor.baslik('gelen metin kaçırılıyor');
  await kotu.page.click('#aiAnalysisBtn');
  await kotu.page.waitForSelector('#aiAnalysisResult:not(.hidden)', { timeout: 5000 });
  await kotu.page.waitForTimeout(300);

  rapor.kontrol('Başlıktaki etiket çalışmadı',
    await kotu.page.evaluate(() => window.__sizdi === undefined));
  rapor.kontrol('Bulgudaki betik çalışmadı',
    await kotu.page.evaluate(() => window.__sizdi2 === undefined));
  rapor.kontrol('Öneri içindeki çerçeve çalışmadı',
    await kotu.page.evaluate(() => window.__sizdi3 === undefined));
  rapor.kontrol('Sonuç alanına img/script/iframe düğümü girmedi',
    await kotu.page.evaluate(() =>
      document.querySelectorAll('#aiAnalysisResult img, #aiAnalysisResult script, #aiAnalysisResult iframe').length === 0));
  rapor.kontrol('Metin düz yazı olarak görünüyor',
    /Normal metin/.test(await kotu.page.locator('.ai-bulgu .metin').first().textContent()),
    await kotu.page.locator('.ai-bulgu .metin').first().textContent());
  await kotu.ctx.close();

  rapor.baslik('konsol temiz');
  rapor.kontrol('Sayfa hatası yok', hatalar.length === 0, hatalar.join(' | '));
}
