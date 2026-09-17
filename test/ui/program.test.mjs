/* Yapay zekâ ile program üretme.
   Gemini çağrısı testte taklit ediliyor: amaç modelin ne ürettiğini değil,
   ANKETTEN PROMPTA ve GELEN JSON'DAN PLANA giden yolun doğruluğunu sınamak. */
import { sayfaAc } from '../harness.mjs';

const PROFIL = {
  ft_height: '180', ft_weight: '80', ft_age: '30',
  ft_gender: 'erkek', ft_goal_type: 'Kilo Vermek', ft_gemini_api_key: 'test-anahtar'
};

// Modelden dönecekmiş gibi davranılan cevaplar
const ANTRENMAN = {
  Pazartesi: { hareketler: [{ hareket: 'Bench Press', set: 3, tekrar: 10, not: 'Dirsek sabit' }],
               antrenmanSonrasi: [{ hareket: 'Göğüs esnetme', set: 2, tekrar: 1, not: '30 sn' }] },
  Çarşamba: { hareketler: [{ hareket: 'Squat', set: 4, tekrar: 8 }] },
  kardiyoPlanlamasi: 'Haftada 2 gün 20 dk tempolu yürüyüş',
  antrenmanKurallari: '- Setler arası 90 sn dinlen'
};
const BESLENME = {
  beslenmePlani: {
    'Öğün 1': [{ gida: 'Yulaf Ezmesi (çiğ)', gram: 80, kcal100: 389, protein100: 16.9, carbs100: 66.3, fat100: 6.9 }],
    'Öğün 2': [{ gida: 'Tavuk Göğsü (ızgara/haşlama)', gram: 200, kcal100: 165, protein100: 31, carbs100: 0, fat100: 3.6 }]
  },
  supplementPlani: [{ isim: 'Kreatin', doz: '5g', zaman: 'Antrenman Öncesi' }]
};

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: PROFIL });

  /* Anketin tamamını doldurur; metin soruları opsiyonel olduğu için atlanıyor. */
  const anketiDoldur = async () => {
    for (let adim = 0; adim < 5; adim++) {
      const sorular = await page.$$eval('.anket-soru', ns => ns.map(n => ({
        id: n.dataset.soru, metin: !!n.querySelector('input')
      })));
      for (const s of sorular) {
        if (s.metin) continue;
        await page.click(`.anket-soru[data-soru="${s.id}"] .anket-secenek:first-child`);
      }
      const son = (await page.textContent('#programIleri')) === 'Özete Geç';
      await page.click('#programIleri');
      await page.waitForTimeout(150);
      if (son) break;
    }
  };

  rapor.baslik('sihirbaz');
  await page.evaluate(() => showPage('workout'));
  await page.click('#openProgramBtnWork');
  await page.waitForTimeout(200);
  rapor.kontrol('Sihirbaz açılıyor', await page.isVisible('#programModal'));
  rapor.kontrol('İlk adımda geri düğmesi yok', !(await page.isVisible('#programGeri')));
  rapor.kontrol('İlerleme yazıyor',
    (await page.textContent('#programIlerleme')) === 'Adım 1 / 5',
    await page.textContent('#programIlerleme'));

  // Cevapsız ilerlenince özet üretimi engellemeli
  for (let i = 0; i < 5; i++) { await page.click('#programIleri'); await page.waitForTimeout(120); }
  rapor.kontrol('Cevapsız ankette üretim kapalı',
    await page.evaluate(() => document.getElementById('programUret').disabled));
  rapor.kontrol('Eksik sorular listeleniyor',
    (await page.textContent('#programOzet')).indexOf('Cevaplanmamış') !== -1);

  await page.click('#programGeri');
  await page.waitForTimeout(150);
  rapor.kontrol('Geri özete değil ankete dönüyor', await page.isVisible('#programAdim'));

  // Geri, özetten SON adıma döner. Baştan doldurmak için sihirbazı yeniden aç.
  await page.click('#programKapat');
  await page.waitForTimeout(150);
  await page.click('#openProgramBtnWork');
  await page.waitForTimeout(200);
  rapor.kontrol('Yeniden açılınca ilk adımdan başlıyor',
    (await page.textContent('#programIlerleme')) === 'Adım 1 / 5',
    await page.textContent('#programIlerleme'));

  await anketiDoldur();
  rapor.kontrol('Dolu ankette üretim açık',
    !(await page.evaluate(() => document.getElementById('programUret').disabled)));

  rapor.baslik('kalori hedefi özette');
  const ozet = (await page.textContent('#programOzet')).replace(/\s+/g, ' ');
  // 80kg/180cm/30y erkek, masa başı + 2 gün → BMR 1780, TDEE 2350, %20 açık → 1880
  rapor.kontrol('Hesaplanan kalori gösteriliyor', ozet.indexOf('1880 kcal') !== -1, ozet.slice(0, 80));
  rapor.kontrol('Bazal ve harcama da yazıyor',
    ozet.indexOf('1780') !== -1 && ozet.indexOf('2350') !== -1);
  rapor.kontrol('Sayının yapay zekâdan gelmediği yazıyor',
    ozet.indexOf('yapay zekâdan gelmiyor') !== -1);
  rapor.kontrol('Öneri olduğu belirtiliyor', ozet.indexOf('yapay zekâ önerisidir') !== -1);

  rapor.baslik('anket hatırlanıyor');
  const kayit = await page.evaluate(() => JSON.parse(localStorage.getItem('ft_program_anketi') || '{}'));
  rapor.kontrol('Cevaplar depoya yazıldı', Object.keys(kayit).length >= 16, String(Object.keys(kayit).length));
  rapor.kontrol('Yeniden açınca cevaplar duruyor', await page.evaluate(() => {
    programSihirbaziniKapat();
    programSihirbaziniAc();
    return document.querySelectorAll('.anket-soru .anket-secenek.secili').length > 0;
  }));
  // Özete geri dön: üretim testi oradan devam ediyor
  for (let i = 0; i < 5; i++) { await page.click('#programIleri'); await page.waitForTimeout(120); }

  rapor.baslik('promptlar ankete uyuyor');
  const promptlar = await page.evaluate(() => {
    const anket = {
      ogunSayisi: '3', beslenmeTarzi: 'Vegan', alerji: 'laktoz intoleransı',
      ekipman: ['Evde dambıl'], gunSayisi: '4', sakatlik: 'sol diz ağrısı',
      gunlukHareket: 'Masa başı, az hareket', takviyeButce: 'Sadece temel olanlar'
    };
    const hedef = anketHedefi(anket);
    return {
      antrenman: buildAntrenmanUretimPrompt(anket, hedef),
      beslenme: buildBeslenmeUretimPrompt(anket, hedef),
      hedefKalori: hedef.kalori
    };
  });
  rapor.kontrol('Antrenman promptu ekipmanı taşıyor',
    promptlar.antrenman.indexOf('Evde dambıl') !== -1);
  rapor.kontrol('Antrenman promptu sakatlığı taşıyor',
    promptlar.antrenman.indexOf('sol diz ağrısı') !== -1);
  rapor.kontrol('Beslenme promptu alerjiyi taşıyor',
    promptlar.beslenme.indexOf('laktoz intoleransı') !== -1);
  rapor.kontrol('Beslenme promptu tarzı taşıyor', promptlar.beslenme.indexOf('Vegan') !== -1);
  rapor.kontrol('Beslenme promptu öğün sayısına uyuyor',
    promptlar.beslenme.indexOf('SADECE şu öğünleri kullan: Öğün 1, Öğün 2, Öğün 3') !== -1);
  rapor.kontrol('Kalori hedefi prompta giriyor',
    promptlar.beslenme.indexOf(String(promptlar.hedefKalori) + ' kcal') !== -1);
  rapor.kontrol('Modele kaloriyi yeniden hesaplamaması söyleniyor',
    promptlar.beslenme.indexOf('sen yeniden hesaplama') !== -1);
  rapor.kontrol('Reçeteli/tartışmalı madde yasağı var',
    promptlar.beslenme.indexOf('Reçeteli ilaç') !== -1);

  rapor.baslik('üretimden plana');
  // Gemini çağrısı taklit ediliyor: hangi promptun geldiğine göre cevap veriyor
  await page.evaluate(([ant, bes]) => {
    window.callGeminiAPI = function(prompt) {
      return Promise.resolve(JSON.stringify(
        prompt.indexOf('antrenman programı hazırla') !== -1 ? ant : bes));
    };
  }, [ANTRENMAN, BESLENME]);

  await page.click('#programUret');
  await page.waitForTimeout(400);
  rapor.kontrol('Önizleme açılıyor', await page.isVisible('#programOnizleme'));
  const oniz = (await page.textContent('#programOnizleme')).replace(/\s+/g, ' ');
  rapor.kontrol('Antrenman günleri görünüyor',
    oniz.indexOf('Pazartesi') !== -1 && oniz.indexOf('Çarşamba') !== -1, oniz.slice(0, 90));
  rapor.kontrol('Hareket sayısı yazıyor', oniz.indexOf('1 hareket · 1 esneme') !== -1);
  rapor.kontrol('Öğünler görünüyor', oniz.indexOf('Yulaf Ezmesi') !== -1);
  rapor.kontrol('Takviye görünüyor', oniz.indexOf('Kreatin') !== -1);
  rapor.kontrol('Önizlemede de öneri uyarısı var', oniz.indexOf('yapay zekâ önerisidir') !== -1);

  await page.click('#programOnayla');
  await page.waitForTimeout(400);
  rapor.kontrol('Pencere kapanıyor', !(await page.isVisible('#programModal')));

  const depo = await page.evaluate(() => ({
    antrenman: JSON.parse(localStorage.getItem('ft_workout_days_v2') || '{}'),
    beslenme: JSON.parse(localStorage.getItem('ft_meal_plan') || '{}'),
    takviye: JSON.parse(localStorage.getItem('ft_supplement_plan') || '{}'),
    kardiyo: localStorage.getItem('ft_cardio_plan') || '',
    kurallar: localStorage.getItem('ft_workout') || ''
  }));
  // Depo biçimi: { gün: { title, exercises: [...], postWorkout: [...] } }
  rapor.kontrol('Antrenman plana işlendi',
    ((depo.antrenman['Pazartesi'] || {}).exercises || []).length > 0,
    JSON.stringify(Object.keys(depo.antrenman['Pazartesi'] || {})));
  rapor.kontrol('Esneme hareketi ayrı listeye gitti',
    ((depo.antrenman['Pazartesi'] || {}).postWorkout || []).length === 1,
    String(((depo.antrenman['Pazartesi'] || {}).postWorkout || []).length));
  rapor.kontrol('Set ve tekrar aktarıldı', (function() {
    var h = ((depo.antrenman['Çarşamba'] || {}).exercises || [])[0] || {};
    return h.sets === 4 && h.reps === 8;
  })());
  rapor.kontrol('Hareket adı doğru geldi',
    JSON.stringify(depo.antrenman['Pazartesi']).indexOf('Bench Press') !== -1);
  rapor.kontrol('Beslenme plana işlendi',
    (depo.beslenme['Öğün 1'] || []).length > 0, JSON.stringify(Object.keys(depo.beslenme)));
  rapor.kontrol('Takviye plana işlendi',
    JSON.stringify(depo.takviye).indexOf('Kreatin') !== -1);
  rapor.kontrol('Kardiyo notu aktarıldı', depo.kardiyo.indexOf('tempolu yürüyüş') !== -1);
  rapor.kontrol('Antrenman kuralları aktarıldı', depo.kurallar.indexOf('Setler arası') !== -1);

  // Gıda veritabanı eşleşmesi: modelin verdiği makro değil, gerçek değer kullanılmalı
  const tavuk = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('ft_meal_plan') || '{}')['Öğün 2'] || [])[0] || {});
  rapor.kontrol('Bilinen gıdada veritabanı değeri kullanılıyor',
    tavuk.kcal100 === 165 && tavuk.protein100 === 31,
    tavuk.kcal100 + ' kcal / ' + tavuk.protein100 + ' protein');
  rapor.kontrol('Gram üzerinden hesap doğru', tavuk.kcal === 330, String(tavuk.kcal));

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
