/* Dış kaynaklı metin HTML'e kaçışsız girerse kod çalışır. Gerçekçi yol:
   diyetisyenden gelen bir PDF'in içindeki ad, yapay zekâ tarafından çıkarılıp
   DOM'a basılır. Çalışan kod localStorage'daki anahtarları okuyabilir. */
import { sayfaAc, TR_GUNLER } from '../harness.mjs';

const ETIKET  = '<img src=x onerror="window.__xss=1">';
const NITELIK = '" onmouseover="window.__xss=1" x="';
const TEK     = "' onmouseover='window.__xss=1' x='";

const BUGUN_ADI = TR_GUNLER[new Date().getDay()];

const ZARARLI = {
  ft_height: '178', ft_weight: '75.4', ft_goal_weight: '70',
  ft_workout_days_v2: JSON.stringify({
    [BUGUN_ADI]: {
      title: ETIKET,
      exercises: [{
        id: 'e1', name: ETIKET, sets: 3, reps: NITELIK, weight: '', checked: [false, false, false],
        note: ETIKET, muscle: NITELIK, equipment: ETIKET, level: TEK
      }],
      postWorkout: []
    }
  }),
  ft_meal_plan: JSON.stringify({
    'Öğün 1': [{ id: 'f1', name: ETIKET, grams: 100, kcal: 200, protein: 10, carbs: 20, fat: 5 }],
    [NITELIK]: [{ id: 'f2', name: TEK, grams: 50, kcal: 100, protein: 5, carbs: 10, fat: 2 }]
  }),
  ft_supplement_plan: JSON.stringify({
    'Sabah': [{ id: 's1', name: ETIKET, dose: NITELIK, note: TEK, reminder: '08:00' }],
    [ETIKET]: [{ id: 's2', name: TEK, dose: '1', note: '' }]
  })
};

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: ZARARLI });

  rapor.baslik('sayfalar gezilirken kod çalışıyor mu');
  for (const sayfa of ['home', 'profile', 'workout', 'nutrition', 'supplement', 'settings']) {
    await page.evaluate(x => showPage(x), sayfa);
    await page.waitForTimeout(280);
    // Fareyi gezdir: onmouseover yükü tetiklenecekse burada tetiklenir
    await page.mouse.move(195, 300); await page.mouse.move(195, 520); await page.mouse.move(90, 400);
    await page.waitForTimeout(120);
    const calisti = await page.evaluate(() => window.__xss);
    rapor.kontrol(sayfa.padEnd(11) + ' sayfasında kod çalışmadı', calisti === undefined, calisti ? 'XSS ÇALIŞTI' : '');
  }

  rapor.baslik('DOM enjeksiyonu');
  const sizinti = await page.evaluate(() => ({
    img: document.querySelectorAll('img[src="x"]').length,
    onerror: document.querySelectorAll('[onerror]').length,
    onmouseover: document.querySelectorAll('[onmouseover]').length
  }));
  rapor.kontrol('onerror taşıyan img yok', sizinti.img === 0, 'bulunan: ' + sizinti.img);
  rapor.kontrol('onerror niteliği yok', sizinti.onerror === 0, 'bulunan: ' + sizinti.onerror);
  rapor.kontrol('onmouseover niteliği yok', sizinti.onmouseover === 0, 'bulunan: ' + sizinti.onmouseover);

  rapor.baslik('metin ve işlevsellik korunuyor');
  await page.evaluate(() => showPage('supplement'));
  await page.waitForTimeout(280);
  const metin = await page.evaluate(() => document.getElementById('suppPlanList').textContent);
  rapor.kontrol('Saldırı metni düz yazı olarak görünüyor', metin.includes('<img src=x onerror='));

  const nitelik = await page.evaluate(() => {
    const r = document.querySelector('.supp-row');
    return r ? r.dataset.suppId : null;
  });
  rapor.kontrol('data-supp-id doğru geri okunuyor', nitelik === 's1', String(nitelik));

  await page.click('.supp-row[data-supp-id="s1"] .supp-take-btn');
  await page.waitForTimeout(280);
  const isaret = await page.evaluate(() => JSON.parse(localStorage.getItem('ft_supp_taken') || '{}').s1);
  const bugun = new Date();
  const beklenen = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0');
  rapor.kontrol('Zararlı veri varken işaretleme çalışıyor', isaret === beklenen, String(isaret));

  const hrefler = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')));
  rapor.kontrol('javascript: şemalı bağlantı yok', !hrefler.some(h => /^javascript:/i.test(h)));

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
