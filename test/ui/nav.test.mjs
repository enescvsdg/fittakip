/* Havada duran cam kapsül: kaydırmayla toplanma, dokunma hedefi ve
   cam üstündeki kontrast. */
import { sayfaAc } from '../harness.mjs';
import { DOLU } from './_veri.mjs';

const toplandiMi = page => page.evaluate(() =>
  document.querySelector('.bottom-nav').classList.contains('toplandi'));
const olcu = page => page.evaluate(() => {
  const n = document.querySelector('.bottom-nav');
  const r = n.getBoundingClientRect();
  const oge = document.querySelector('.bottom-nav-item').getBoundingClientRect();
  return { genislik: Math.round(r.width), yukseklik: Math.round(r.height),
           altBosluk: Math.round(window.innerHeight - r.bottom),
           ogeGenislik: Math.round(oge.width), ogeYukseklik: Math.round(oge.height) };
});
const kaydir = async (page, y) => {
  await page.evaluate(v => window.scrollTo(0, v), y);
  await page.waitForTimeout(450);
};

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: DOLU });

  rapor.baslik('kapsül biçimi');
  let o = await olcu(page);
  rapor.kontrol('Ekrandan kopuk duruyor', o.altBosluk > 0, o.altBosluk + 'px alt boşluk');
  rapor.kontrol('Kenarlardan boşluklu', o.genislik < 390, o.genislik + 'px / 390px');
  rapor.kontrol('İçerik kapsülün altına girmiyor', await page.evaluate(() => {
    const m = getComputedStyle(document.querySelector('.app-main')).paddingBottom;
    return parseFloat(m) > 74;
  }));

  rapor.baslik('kaydırmayla toplanma');
  rapor.kontrol('Tepede açık', !(await toplandiMi(page)));
  await kaydir(page, 400);
  rapor.kontrol('Aşağı kaydırınca toplanıyor', await toplandiMi(page));
  const dar = await olcu(page);
  rapor.kontrol('Toplanınca daralıyor', dar.genislik < o.genislik, o.genislik + ' → ' + dar.genislik + 'px');
  rapor.kontrol('Etiketler gizleniyor',
    await page.evaluate(() => getComputedStyle(document.querySelector('.bnav-label')).opacity === '0'));

  await kaydir(page, 250);
  rapor.kontrol('Yukarı kaydırınca açılıyor', !(await toplandiMi(page)));

  await kaydir(page, 600);
  rapor.kontrol('Tekrar aşağıda toplanıyor', await toplandiMi(page));
  await kaydir(page, 0);
  rapor.kontrol('Tepeye dönünce açılıyor', !(await toplandiMi(page)));

  rapor.baslik('titreme eşiği');
  await kaydir(page, 400);
  const oncekiSinif = await toplandiMi(page);
  await page.evaluate(() => window.scrollTo(0, 396));   // 4px — eşiğin altında
  await page.waitForTimeout(350);
  rapor.kontrol('Küçük oynamalar durumu değiştirmiyor', (await toplandiMi(page)) === oncekiSinif);

  rapor.baslik('dokunma hedefi her iki hâlde de yeterli');
  await kaydir(page, 500);
  const t = await olcu(page);
  rapor.kontrol('Toplanmışken öğe ≥ 44px', t.ogeGenislik >= 44 && t.ogeYukseklik >= 44,
    t.ogeGenislik + '×' + t.ogeYukseklik);
  await kaydir(page, 0);
  const a = await olcu(page);
  rapor.kontrol('Açıkken öğe ≥ 44px', a.ogeGenislik >= 44 && a.ogeYukseklik >= 44,
    a.ogeGenislik + '×' + a.ogeYukseklik);

  rapor.baslik('sayfa değişimi');
  await kaydir(page, 500);
  await page.evaluate(() => showPage('supplement'));
  await page.waitForTimeout(300);
  rapor.kontrol('Yeni sayfada kapsül açık başlıyor', !(await toplandiMi(page)));

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();

  /* Kaymayan sayfa: kapsül toplanmamalı. Uzun bir ekranda içerik sığıyor,
     yani kaydırma yok — kontrol edilmezse ilk sahte kaydırma olayında
     kapanıp bir daha açılmaz. */
  rapor.baslik('kaymayan sayfa');
  const uzun = await browser.newContext({ viewport: { width: 390, height: 1600 }, serviceWorkers: 'block' });
  await uzun.addInitScript(() => { try { sessionStorage.setItem('ft_splash', '1'); } catch (e) {} });
  const p2 = await uzun.newPage();
  await p2.goto(adres + '/index.html', { waitUntil: 'load' });
  await p2.waitForTimeout(1100);
  await p2.evaluate(() => showPage('profile'));
  await p2.waitForTimeout(300);

  const kayiyor = await p2.evaluate(() => document.documentElement.scrollHeight - window.innerHeight > 80);
  rapor.kontrol('Sayfa gerçekten kaymıyor', !kayiyor, kayiyor ? 'kayıyor — test anlamsız' : 'sığıyor');
  await p2.evaluate(() => { window.dispatchEvent(new Event('scroll')); });
  await p2.waitForTimeout(300);
  rapor.kontrol('Kaymayan sayfada kapsül toplanmıyor',
    !(await p2.evaluate(() => document.querySelector('.bottom-nav').classList.contains('toplandi'))));
  await uzun.close();
}
