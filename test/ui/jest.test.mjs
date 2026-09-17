/* Dokunma jestleri: sayfalar arası kaydırma ve yakınlaştırma.
   Sentetik TouchEvent kullanılıyor — kodumuz olayın "güvenilir" olmasına
   bakmıyor, davranışı aynı. */
import { sayfaAc } from '../harness.mjs';

const SIRA = ['home', 'profile', 'workout', 'nutrition', 'supplement'];

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, dokunmatik: true });

  const aktif = () => page.evaluate(() =>
    [...document.querySelectorAll('.page')].find(p => !p.classList.contains('hidden')).id.replace(/^page-/, ''));

  /* Tek parmak sürükleme. sec: jestin başladığı öğe. */
  const surukle = (dx, dy = 0, sec = '.app-main') => page.evaluate(([dx, dy, sec]) => {
    const el = document.querySelector(sec);
    const d = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    const at = (tip, t, ch) => el.dispatchEvent(new TouchEvent(tip,
      { bubbles: true, cancelable: true, touches: t, targetTouches: t, changedTouches: ch || t }));
    at('touchstart', [d(200, 400)]);
    at('touchmove', [d(200 + dx / 2, 400 + dy / 2)]);
    at('touchend', [], [d(200 + dx, 400 + dy)]);
  }, [dx, dy, sec]).then(() => page.waitForTimeout(160));

  /* İki parmak. birak=false ise parmaklar ekranda kalır. */
  const pinch = (bas, son, birak = true) => page.evaluate(([bas, son, birak]) => {
    const el = document.querySelector('.app-main');
    const t = (id, x) => new Touch({ identifier: id, target: el, clientX: x, clientY: 400 });
    const at = (tip, list, ch) => el.dispatchEvent(new TouchEvent(tip,
      { bubbles: true, cancelable: true, touches: list, targetTouches: list, changedTouches: ch || list }));
    const cift = g => [t(1, 195 - g / 2), t(2, 195 + g / 2)];
    at('touchstart', cift(bas));
    at('touchmove', cift(son));
    if (birak) at('touchend', [], cift(son));
  }, [bas, son, birak]).then(() => page.waitForTimeout(120));

  const olcek = () => page.evaluate(() => document.querySelector('.app-main').style.transform || '');

  rapor.baslik('sayfalar arası kaydırma');
  rapor.kontrol('Ana sayfada başlıyor', (await aktif()) === 'home', await aktif());

  await surukle(-120);
  rapor.kontrol('Sola çekince sonraki sayfa', (await aktif()) === 'profile', await aktif());
  await surukle(-120);
  rapor.kontrol('Bir daha sola', (await aktif()) === 'workout', await aktif());
  await surukle(120);
  rapor.kontrol('Sağa çekince önceki sayfa', (await aktif()) === 'profile', await aktif());

  rapor.kontrol('Geçiş animasyonu yön alıyor',
    await page.evaluate(() => document.getElementById('page-profile').classList.contains('gecis-sag')));

  rapor.baslik('yanlışlıkla tetiklenmiyor');
  await surukle(-30);
  rapor.kontrol('Kısa hareket sayfayı değiştirmiyor', (await aktif()) === 'profile', await aktif());
  await surukle(-120, 220);
  rapor.kontrol('Dikey baskın hareket sayfayı değiştirmiyor', (await aktif()) === 'profile', await aktif());

  // Gün şeridi kendi yatay kaydırmasını yapıyor; orada jest yutulmamalı
  await page.evaluate(() => showPage('workout'));
  await page.waitForTimeout(200);
  const seritVar = await page.evaluate(() => !!document.querySelector('.day-tabs-scroll'));
  if (seritVar) {
    await surukle(-120, 0, '.day-tabs-scroll');
    rapor.kontrol('Gün şeridinde kaydırma sayfayı değiştirmiyor', (await aktif()) === 'workout', await aktif());
  }

  // Modal açıkken de sayfa değişmemeli
  await page.evaluate(() => showPage('nutrition'));
  await page.click('#toggleMealBuilderBtn');
  await page.waitForTimeout(150);
  await page.selectOption('#food-select', 'Yumurta Akı');
  await page.waitForTimeout(200);
  await surukle(-140);
  rapor.kontrol('Modal açıkken sayfa değişmiyor', (await aktif()) === 'nutrition', await aktif());
  await page.click('#boyKapat');
  await page.waitForTimeout(150);

  // Açılır menü de modal gibi davranmalı
  await page.click('#menuToggle');
  await page.waitForTimeout(200);
  await surukle(-140);
  rapor.kontrol('Açılır menü açıkken sayfa değişmiyor', (await aktif()) === 'nutrition', await aktif());
  await page.click('#menuToggle');
  await page.waitForTimeout(200);

  rapor.baslik('uçlarda duruyor');
  await page.evaluate(() => showPage('home'));
  await page.waitForTimeout(200);
  await surukle(120);
  rapor.kontrol('İlk sayfadan geriye gitmiyor', (await aktif()) === 'home', await aktif());
  await page.evaluate(s => showPage(s), SIRA[SIRA.length - 1]);
  await page.waitForTimeout(200);
  await surukle(-120);
  rapor.kontrol('Son sayfadan ileriye gitmiyor',
    (await aktif()) === SIRA[SIRA.length - 1], await aktif());

  rapor.baslik('yakınlaştırma');
  await pinch(100, 200, false);
  rapor.kontrol('İki parmak açılınca büyüyor', (await olcek()) === 'scale(2)', await olcek());
  await pinch(100, 1000, false);
  rapor.kontrol('Üst sınırda duruyor', (await olcek()) === 'scale(3)', await olcek());
  await pinch(200, 100, false);
  rapor.kontrol('Birin altına inmiyor', (await olcek()) === 'scale(1)', await olcek());

  rapor.kontrol('Tarayıcının kendi zoom\'u engelleniyor', await page.evaluate(() => {
    const el = document.querySelector('.app-main');
    const t = (id, x) => new Touch({ identifier: id, target: el, clientX: x, clientY: 400 });
    const c = [t(1, 150), t(2, 250)];
    el.dispatchEvent(new TouchEvent('touchstart',
      { bubbles: true, cancelable: true, touches: c, targetTouches: c, changedTouches: c }));
    const ev = new TouchEvent('touchmove',
      { bubbles: true, cancelable: true, touches: c, targetTouches: c, changedTouches: c });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  }));
  rapor.kontrol('touch-action pinch\'i tarayıcıdan alıyor',
    (await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)) === 'pan-x pan-y');

  // Asıl istenen davranış: parmak kalkınca eski haline dönmesi
  await page.evaluate(() => {
    const el = document.querySelector('.app-main');
    el.dispatchEvent(new TouchEvent('touchend',
      { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [] }));
  });
  await page.waitForTimeout(450);
  rapor.kontrol('Parmak kalkınca eski haline dönüyor', (await olcek()) === '', await olcek() || '(boş)');

  rapor.baslik('yakınlaştırma sayfayı taşırmıyor');
  const tasma = async () => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rapor.kontrol('Normalde yatay taşma yok', (await tasma()) === 0, String(await tasma()));
  await pinch(100, 300, false);
  rapor.kontrol('Yakınken de yatay taşma yok', (await tasma()) === 0, String(await tasma()));
  await page.evaluate(() => {
    const el = document.querySelector('.app-main');
    el.dispatchEvent(new TouchEvent('touchend',
      { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [] }));
  });
  await page.waitForTimeout(400);

  rapor.baslik('iki jest çakışmıyor');
  await page.evaluate(() => showPage('home'));
  await page.waitForTimeout(200);
  // İki parmakla yatay hareket sayfa değiştirmemeli — bu yakınlaştırma jesti
  await pinch(100, 260, true);
  await page.waitForTimeout(350);
  rapor.kontrol('İki parmak hareketi sayfa değiştirmiyor', (await aktif()) === 'home', await aktif());

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
