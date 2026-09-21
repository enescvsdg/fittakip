/* Kas haritası: iki renk + kalıcı liste + konuşma balonu.

   Bench press yapınca sadece göğüs çalışmıyor; omuz ve triceps de çalışıyor.
   Tek renkli harita bunu gizliyordu.

   İkincil kas verisi EXERCISE_INFO'da ve ajan onayıyla doluyor. Veri
   gelmeden önce panel eskisi gibi tek kas göstermeli — özellik veri
   beklemeden de çalışmalı. */
import { sayfaAc } from '../harness.mjs';

/* Bench press günü kurulmuş bir program */
const PROGRAM = {
  Pazartesi: {
    title: 'Göğüs',
    exercises: [
      { name: 'Barbell Bench Press', muscle: 'chest', equipment: 'barbell',
        sets: 3, reps: 10, checked: [], weights: [] }
    ],
    postWorkout: []
  }
};

const VERI = {
  ft_workout_days_v2: JSON.stringify(PROGRAM),
  ft_active_weekday: 'Pazartesi'
};

async function paneliAc(page) {
  await page.click('.bottom-nav-item[data-page="workout"]');
  await page.waitForSelector('.exercise-card', { timeout: 5000 });
  const dugme = page.locator('.exercise-card .anatomy-toggle, .exercise-card [data-anatomy-toggle]').first();
  if (await dugme.count()) await dugme.click();
  else await page.evaluate(() => {
    document.querySelector('.exercise-anatomy-wrap').classList.remove('hidden');
  });
  await page.waitForSelector('.anatomy-panel .muscle-overlay', { timeout: 5000 });
}

export default async function ({ rapor, adres, browser }) {
  // ── VERİ YOKKEN ────────────────────────────────
  const bos = await sayfaAc(browser, { adres, veri: VERI });
  await paneliAc(bos.page);

  rapor.baslik('ikincil kas verisi yokken');
  rapor.kontrol('Birincil kas boyanıyor',
    (await bos.page.locator('.muscle-overlay.birincil').count()) > 0,
    String(await bos.page.locator('.muscle-overlay.birincil').count()));
  rapor.kontrol('İkincil kas yok', (await bos.page.locator('.muscle-overlay.ikincil').count()) === 0);
  rapor.kontrol('Liste yine de birincili gösteriyor',
    (await bos.page.locator('.kas-satiri').count()) === 1,
    String(await bos.page.locator('.kas-satiri').count()));
  rapor.kontrol('Listede Göğüs yazıyor',
    /Göğüs/.test(await bos.page.locator('.kas-satiri .kas-ad').first().textContent()));
  await bos.ctx.close();

  // ── VERİ GELİNCE ───────────────────────────────
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: VERI });
  /* EXERCISE_INFO normalde egzersizler.js'ten geliyor ve kartlar açılışta
     çiziliyor. Testte sonradan doldurduğumuz için kartları yeniden çizdirmek
     gerekiyor — gerçekte veri dosyada hazır olacak. */
  await page.evaluate(() => {
    EXERCISE_INFO['Barbell Bench Press'] = {
      secondary: ['shoulders', 'triceps'],
      instructions: ['Sehpaya uzan.', 'Barı it.']
    };
    renderWorkoutTracking();
  });
  await paneliAc(page);

  rapor.baslik('iki renk');
  rapor.kontrol('Birincil kas boyalı',
    (await page.locator('.muscle-overlay.birincil').count()) > 0);
  rapor.kontrol('İkincil kas da boyalı — ön görünümde omuz',
    (await page.locator('.muscle-overlay.ikincil').count()) > 0,
    String(await page.locator('.muscle-overlay.ikincil').count()));

  const renkler = await page.evaluate(() => {
    const b = document.querySelector('.muscle-overlay.birincil');
    const i = document.querySelector('.muscle-overlay.ikincil');
    if (!b || !i) return { birincil: 'yok', ikincil: 'yok', birincilOpaklik: '0' };
    return {
      birincil: getComputedStyle(b).fill,
      ikincil: getComputedStyle(i).fill,
      birincilOpaklik: getComputedStyle(b).opacity
    };
  });
  rapor.kontrol('İki kas farklı renkte', renkler.birincil !== renkler.ikincil,
    renkler.birincil + ' ≠ ' + renkler.ikincil);
  rapor.kontrol('Birincil görünür durumda', Number(renkler.birincilOpaklik) > 0.5,
    renkler.birincilOpaklik);

  rapor.baslik('kalıcı liste');
  rapor.kontrol('Ön görünümde iki kas listeleniyor',
    (await page.locator('.kas-satiri').count()) === 2,
    (await page.locator('.kas-satiri .kas-ad').allTextContents()).join(', '));
  rapor.kontrol('Birincil önce sıralanıyor',
    (await page.locator('.kas-satiri .kas-rol').first().textContent()) === 'Birincil');
  rapor.kontrol('Rol etiketleri doğru',
    (await page.locator('.kas-satiri .kas-rol').allTextContents()).join(',') === 'Birincil,İkincil',
    (await page.locator('.kas-satiri .kas-rol').allTextContents()).join(','));

  rapor.baslik('arka görünüm');
  await page.click('.anatomy-view-btn[data-view-btn="back"]');
  await page.waitForTimeout(400);
  rapor.kontrol('Arkada triceps görünüyor',
    /Triceps/.test((await page.locator('.kas-satiri .kas-ad').allTextContents()).join(',')),
    (await page.locator('.kas-satiri .kas-ad').allTextContents()).join(', '));
  rapor.kontrol('Arkada göğüs listelenmiyor',
    !/Göğüs/.test((await page.locator('.kas-satiri .kas-ad').allTextContents()).join(',')));
  await page.click('.anatomy-view-btn[data-view-btn="front"]');
  await page.waitForTimeout(400);

  rapor.baslik('konuşma balonu');
  await page.locator('.muscle-overlay.birincil').first().click();
  await page.waitForSelector('.kas-balon', { timeout: 3000 });
  rapor.kontrol('Balon açıldı', (await page.locator('.kas-balon').count()) === 1);
  rapor.kontrol('Kas adı yazıyor',
    (await page.locator('.kas-balon b').textContent()) === 'Göğüs',
    await page.locator('.kas-balon b').textContent());
  rapor.kontrol('Rolü yazıyor',
    /Birincil kas/.test(await page.locator('.kas-balon i').textContent()),
    await page.locator('.kas-balon i').textContent());

  const konum = await page.evaluate(() => {
    const b = document.querySelector('.kas-balon').getBoundingClientRect();
    const s = document.querySelector('.anatomy-svg-wrap').getBoundingClientRect();
    return { solTasma: b.left < s.left - 1, sagTasma: b.right > s.right + 1 };
  });
  rapor.kontrol('Balon figürün dışına taşmıyor',
    !konum.solTasma && !konum.sagTasma, JSON.stringify(konum));

  rapor.kontrol('Dokunulan kas vurgulandı',
    (await page.locator('.muscle-overlay.secili').count()) > 0);
  rapor.kontrol('Listede karşılığı vurgulandı',
    (await page.locator('.kas-satiri.secili').count()) === 1);

  rapor.baslik('ikincil kasta da çalışıyor');
  await page.locator('.muscle-overlay.ikincil').first().click();
  await page.waitForTimeout(250);
  rapor.kontrol('Balon ikincil kası gösteriyor',
    /İkincil kas/.test(await page.locator('.kas-balon i').textContent()),
    await page.locator('.kas-balon i').textContent());
  rapor.kontrol('Aynı anda tek balon var', (await page.locator('.kas-balon').count()) === 1);

  rapor.baslik('liste satırına tıklayınca da açılıyor');
  await page.evaluate(() => document.querySelector('.anatomy-svg-wrap').click());
  await page.waitForTimeout(200);
  await page.locator('.kas-satiri').first().click();
  await page.waitForTimeout(250);
  rapor.kontrol('Balon açıldı', (await page.locator('.kas-balon').count()) === 1);
  rapor.kontrol('Doğru kası gösteriyor',
    (await page.locator('.kas-balon b').textContent()) === 'Göğüs');

  rapor.baslik('boyanmamış kas tepki vermiyor');
  const kapali = await page.evaluate(() => {
    const el = document.querySelector('.muscle-overlay:not(.birincil):not(.ikincil)');
    if (!el) return 'yok';
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return getComputedStyle(el).cursor;
  });
  rapor.kontrol('İmleç işaretçiye dönmüyor', kapali !== 'pointer', String(kapali));

  rapor.baslik('konsol temiz');
  rapor.kontrol('Sayfa hatası yok', hatalar.length === 0, hatalar.join(' | '));
  await ctx.close();
  // ── DİNLEYİCİ BİRİKMESİ ────────────────────────
  /* svgWrap her Ön/Arka geçişinde yeniden doldurulyor ama ELEMAN aynı kalıyor.
     Dinleyiciyi her seferinde eklemek onları biriktiriyordu: on geçişten sonra
     tek tıklama on kez işleniyor. */
  const d = await sayfaAc(browser, { adres, veri: VERI });
  await d.page.evaluate(() => {
    EXERCISE_INFO['Barbell Bench Press'] = { secondary: ['shoulders', 'triceps'], instructions: ['x'] };
    renderWorkoutTracking();
  });
  await paneliAc(d.page);

  rapor.baslik('görünüm değişimi dinleyici biriktirmiyor');
  await d.page.evaluate(() => {
    window.__kapatmaSayaci = 0;
    const asil = window.kasBalonuKapat;
    window.kasBalonuKapat = function (p) { window.__kapatmaSayaci++; return asil(p); };
  });
  for (let i = 0; i < 4; i++) {
    await d.page.click('.anatomy-view-btn[data-view-btn="back"]');
    await d.page.waitForTimeout(250);
    await d.page.click('.anatomy-view-btn[data-view-btn="front"]');
    await d.page.waitForTimeout(250);
  }
  await d.page.evaluate(() => { window.__kapatmaSayaci = 0; });
  await d.page.evaluate(() => document.querySelector('.anatomy-svg-wrap').click());
  await d.page.waitForTimeout(200);
  const kacKez = await d.page.evaluate(() => window.__kapatmaSayaci);
  rapor.kontrol('Sekiz geçişten sonra tek tıklama bir kez işleniyor',
    kacKez === 1, String(kacKez) + ' kez');
  rapor.kontrol('Panel hâlâ çalışıyor',
    (await d.page.locator('.muscle-overlay.birincil').count()) > 0);
  await d.ctx.close();
}
