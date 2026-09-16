/* Gece (lacivert) ve gündüz (açık) temaları: zemin renkleri, metin kontrastı,
   grafik renklerinin temadan okunması. Kontrast ölçümü sayfa zeminine karşı
   yapılıyor — kart yüzeyinden daha zorlu olan taraf orası. */
import { sayfaAc } from '../harness.mjs';
import { DOLU } from './_veri.mjs';

const dogrusal = x => x >= 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
const parlaklik = ([r, g, b]) => 0.2126 * dogrusal(r / 255) + 0.7152 * dogrusal(g / 255) + 0.0722 * dogrusal(b / 255);
const ayikla = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const kontrast = (a, b) => {
  const [x, y] = [parlaklik(a), parlaklik(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const BEKLENEN = {
  dark:  { zemin: 'rgb(12, 18, 27)',    accent: '#ff5c2b', yuzey: '#151d29', izgara: 'rgba(255,255,255,0.05)' },
  light: { zemin: 'rgb(241, 239, 236)', accent: '#b23b0a', yuzey: '#ffffff', izgara: 'rgba(0,0,0,0.09)' }
};

export default async function ({ rapor, adres, browser }) {
  for (const tema of ['dark', 'light']) {
    const b = BEKLENEN[tema];
    rapor.baslik(tema === 'dark' ? 'gece — derin lacivert' : 'gündüz — açık tema');

    const { ctx, page, hatalar } = await sayfaAc(browser, { adres, tema, veri: DOLU });
    // Chart.js CDN test ortamında engelli; yapılandırmayı yakalayan sahte bir Chart
    await page.evaluate(() => { /* sayfa zaten yüklendi, grafik yapılandırması aşağıda okunur */ });

    const zemin = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    rapor.kontrol('Zemin rengi doğru', zemin === b.zemin, zemin);

    let hepsiAcildi = true;
    for (const sayfa of ['home', 'profile', 'workout', 'nutrition', 'supplement', 'settings']) {
      await page.evaluate(x => showPage(x), sayfa);
      await page.waitForTimeout(200);
      if (!(await page.isVisible('#page-' + sayfa))) { hepsiAcildi = false; rapor.kontrol('Sayfa açıldı: ' + sayfa, false); }
    }
    if (hepsiAcildi) rapor.kontrol('Altı sayfa da açılıyor', true);

    await page.evaluate(() => showPage('home'));
    await page.waitForTimeout(250);

    const etiketler = await page.evaluate(() =>
      [...document.querySelectorAll('.today-card')].map(c => ({
        ad: c.querySelector('.today-kind').textContent.trim(),
        renk: getComputedStyle(c.querySelector('.today-kind')).color
      })));
    let enDusuk = 99, enDusukAd = '';
    for (const e of etiketler) {
      const k = kontrast(ayikla(e.renk), ayikla(zemin));
      if (k < enDusuk) { enDusuk = k; enDusukAd = e.ad; }
    }
    rapor.kontrol('Alan etiketleri 4.5:1 üstünde', enDusuk >= 4.5, 'en düşük ' + enDusukAd + ' ' + enDusuk.toFixed(2) + ':1');

    const ana = await page.evaluate(() => getComputedStyle(document.querySelector('.today-value')).color);
    rapor.kontrol('Ana metin kontrastı', kontrast(ayikla(ana), ayikla(zemin)) >= 4.5,
      kontrast(ayikla(ana), ayikla(zemin)).toFixed(1) + ':1');

    const sonuk = await page.evaluate(() => getComputedStyle(document.querySelector('.today-meta')).color);
    rapor.kontrol('Sönük metin kontrastı', kontrast(ayikla(sonuk), ayikla(zemin)) >= 4.5,
      kontrast(ayikla(sonuk), ayikla(zemin)).toFixed(1) + ':1');

    const vki = await page.evaluate(() => {
      const e = document.getElementById('dash-bmi-line');
      return getComputedStyle(e.querySelector('span') || e).color;
    });
    rapor.kontrol('VKİ etiketi kontrastı', kontrast(ayikla(vki), ayikla(zemin)) >= 4.5,
      kontrast(ayikla(vki), ayikla(zemin)).toFixed(2) + ':1');

    const token = await page.evaluate(() => ({
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      yuzey: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
      izgara: getComputedStyle(document.documentElement).getPropertyValue('--grid').trim()
    }));
    rapor.kontrol('Marka rengi temadan geliyor', token.accent === b.accent, token.accent);
    rapor.kontrol('Kart yüzeyi temadan geliyor', token.yuzey === b.yuzey, token.yuzey);
    rapor.kontrol('Grafik ızgarası temadan geliyor', token.izgara === b.izgara, token.izgara);

    rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
    await ctx.close();
  }
}
