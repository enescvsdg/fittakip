/* Dokunma jestleri: sayfalar arası kaydırma ve yakınlaştırma.
   Sentetik TouchEvent kullanılıyor — kodumuz olayın "güvenilir" olmasına
   bakmıyor, davranışı aynı. */
import { sayfaAc } from '../harness.mjs';

const SIRA = ['home', 'profile', 'workout', 'nutrition', 'supplement'];

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, dokunmatik: true });

  // Sürükleme sırasında iki sayfa birden görünür; gelen sayfa sabit konumda.
  // "Aktif" olan akışta kalandır.
  const aktif = () => page.evaluate(() => {
    const g = [...document.querySelectorAll('.page')].filter(p => !p.classList.contains('hidden'));
    return (g.find(p => p.style.position !== 'fixed') || g[0]).id.replace(/^page-/, '');
  });

  /* Tek parmakla dokunma olayı yollar. Sürükleme parmağı anlık takip ettiği
     için adımlar ayrı ayrı gönderiliyor. */
  const dokun = (tip, x, y, sec = '.app-main') => page.evaluate(([tip, x, y, sec]) => {
    const el = document.querySelector(sec);
    const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    const l = tip === 'touchend' ? [] : [t];
    el.dispatchEvent(new TouchEvent(tip,
      { bubbles: true, cancelable: true, touches: l, targetTouches: l, changedTouches: [t] }));
  }, [tip, x, y, sec]);

  /* Baştan sona bir sürükleme: basar, adım adım çeker, bırakır.
     duraklat: bırakmadan önce beklenen süre — hızı düşürüp "fiske" sayılmasını
     engellemek için (eşiği geçmeyen yavaş sürükleme geri dönmeli). */
  const surukle = async (dx, dy = 0, { sec = '.app-main', duraklat = 0 } = {}) => {
    await dokun('touchstart', 200, 400, sec);
    for (const k of [0.25, 0.6, 1]) {
      await dokun('touchmove', 200 + dx * k, 400 + dy * k, sec);
    }
    if (duraklat) await page.waitForTimeout(duraklat);
    await dokun('touchend', 200 + dx, 400 + dy, sec);
    await page.waitForTimeout(340);          // bırakma animasyonu 260 ms
  };

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
  // transform artık kaydırmayı da taşıyor; yalnız ölçeği okumak için
  const kat = async () => Number(((await olcek()).match(/scale\(([\d.]+)\)/) || [])[1]);

  rapor.baslik('sayfalar arası kaydırma');
  rapor.kontrol('Ana sayfada başlıyor', (await aktif()) === 'home', await aktif());

  await surukle(-120);
  rapor.kontrol('Sola çekince sonraki sayfa', (await aktif()) === 'profile', await aktif());
  await surukle(-120);
  rapor.kontrol('Bir daha sola', (await aktif()) === 'workout', await aktif());
  await surukle(120);
  rapor.kontrol('Sağa çekince önceki sayfa', (await aktif()) === 'profile', await aktif());

  rapor.baslik('sayfa parmağı anlık takip ediyor');
  // Asıl mesele bu: parmak EKRANDAYKEN sayfa kımıldamalı. Önceki hâlde hareket
  // ancak parmak kalktıktan sonra başlıyordu.
  await page.evaluate(() => showPage('home'));
  await page.waitForTimeout(300);

  const anlik = () => page.evaluate(() => {
    const g = [...document.querySelectorAll('.page')].filter(p => !p.classList.contains('hidden'));
    const oku = p => Number((p.style.transform.match(/(-?[\d.]+)px/) || [])[1]);
    return {
      suruyor: document.querySelector('.app-main').classList.contains('gecis-suruyor'),
      sayi: g.length,
      cikan: g.find(p => p.style.position !== 'fixed'),
      gelen: g.find(p => p.style.position === 'fixed'),
      cikanId: (g.find(p => p.style.position !== 'fixed') || {}).id,
      gelenId: (g.find(p => p.style.position === 'fixed') || {}).id,
      cikanX: oku(g.find(p => p.style.position !== 'fixed') || { style: { transform: '' } }),
      gelenX: oku(g.find(p => p.style.position === 'fixed') || { style: { transform: '' } }),
      tasma: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });

  await dokun('touchstart', 300, 400);
  await dokun('touchmove', 292, 400);          // 8 px — kilit eşiğinin altında
  let d1 = await anlik();
  rapor.kontrol('Eşik altında hiçbir şey kımıldamıyor', !d1.suruyor && d1.sayi === 1, JSON.stringify(d1.sayi));

  await dokun('touchmove', 280, 400);          // 20 px — yön kilitleniyor
  d1 = await anlik();
  rapor.kontrol('Kilitlenince sürükleme başlıyor', d1.suruyor);
  rapor.kontrol('İki sayfa birden ekranda', d1.sayi === 2, String(d1.sayi));
  rapor.kontrol('Çıkan sayfa parmakla kaydı', d1.cikanX === -20, String(d1.cikanX));
  rapor.kontrol('Gelen sayfa hemen ekran dışında', d1.gelenId === 'page-profile', d1.gelenId);

  await dokun('touchmove', 200, 400);          // 100 px
  const d2 = await anlik();
  rapor.kontrol('Parmak ilerledikçe sayfa da ilerliyor', d2.cikanX === -100, String(d2.cikanX));
  rapor.kontrol('Gelen sayfa aynı miktarda yaklaştı',
    d2.gelenX === d1.gelenX - 80, d1.gelenX + ' → ' + d2.gelenX);
  rapor.kontrol('Sürüklerken yatay taşma yok', d2.tasma === 0, String(d2.tasma));

  await dokun('touchend', 200, 400);
  await page.waitForTimeout(340);
  rapor.kontrol('Bırakınca tamamlanıyor', (await aktif()) === 'profile', await aktif());
  const bitis = await page.evaluate(() => {
    const p = document.getElementById('page-profile');
    return {
      suruyor: document.querySelector('.app-main').classList.contains('gecis-suruyor'),
      gorunen: [...document.querySelectorAll('.page')].filter(x => !x.classList.contains('hidden')).length,
      artik: p.style.transform + p.style.position + p.style.width,
      kaydirma: window.scrollY
    };
  });
  rapor.kontrol('Tek sayfa kalıyor', bitis.gorunen === 1, String(bitis.gorunen));
  rapor.kontrol('Geçiş sınıfı temizleniyor', !bitis.suruyor);
  rapor.kontrol('Satır içi stiller temizleniyor', bitis.artik === '', bitis.artik || '(boş)');
  rapor.kontrol('Yeni sayfa tepeden başlıyor', bitis.kaydirma === 0, String(bitis.kaydirma));

  rapor.baslik('yeterince çekilmezse geri dönüyor');
  // Genişliğin %30'u eşik; 40 px hem eşiğin hem de fiske hızının altında
  const oncekiSayfa = await aktif();
  await surukle(-40, 0, { duraklat: 260 });
  rapor.kontrol('Az çekince sayfa değişmiyor', (await aktif()) === oncekiSayfa, await aktif());
  rapor.kontrol('Geri dönünce artık kalmıyor', await page.evaluate(() =>
    [...document.querySelectorAll('.page')].filter(p => !p.classList.contains('hidden')).length === 1 &&
    !document.querySelector('.app-main').classList.contains('gecis-suruyor')));

  rapor.baslik('kısa ama hızlı fiske tamamlıyor');
  await surukle(-60);                          // duraklatmasız: hız eşiği geçer
  rapor.kontrol('Hızlı fiske kısa yolda da geçiriyor', (await aktif()) === 'workout', await aktif());

  rapor.baslik('yanlışlıkla tetiklenmiyor (devam)');
  await page.evaluate(() => showPage('profile'));
  await page.waitForTimeout(300);

  rapor.baslik('yanlışlıkla tetiklenmiyor');
  await surukle(-20);
  rapor.kontrol('Kısa hareket sayfayı değiştirmiyor', (await aktif()) === 'profile', await aktif());
  await surukle(-60, 220);
  rapor.kontrol('Dikey baskın hareket sayfayı değiştirmiyor', (await aktif()) === 'profile', await aktif());

  // Gün şeridi kendi yatay kaydırmasını yapıyor; orada jest yutulmamalı
  await page.evaluate(() => showPage('workout'));
  await page.waitForTimeout(200);
  const seritVar = await page.evaluate(() => !!document.querySelector('.day-tabs-scroll'));
  if (seritVar) {
    await surukle(-120, 0, { sec: '.day-tabs-scroll' });
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
  rapor.kontrol('İki parmak açılınca büyüyor', (await kat()) === 2, await olcek());
  await pinch(100, 1000, false);
  rapor.kontrol('Üst sınırda duruyor', (await kat()) === 3, await olcek());
  await pinch(200, 100, false);
  rapor.kontrol('Birin altına inmiyor', (await kat()) === 1, await olcek());

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

  rapor.baslik('yakınken gezinme');
  // İki parmağın ortası kaydıkça içerik de kaymalı — yoksa pinch yapılan noktaya
  // mahkûm kalınıyor, yakınlaştırmanın bir işe yaramıyor.
  const cift = (aralik, cx, cy, tip) => page.evaluate(([aralik, cx, cy, tip]) => {
    const el = document.querySelector('.app-main');
    const t = (id, x, y) => new Touch({ identifier: id, target: el, clientX: x, clientY: y });
    const c = [t(1, cx - aralik / 2, cy), t(2, cx + aralik / 2, cy)];
    const at = (tp, l, ch) => el.dispatchEvent(new TouchEvent(tp,
      { bubbles: true, cancelable: true, touches: l, targetTouches: l, changedTouches: ch || l }));
    if (tip === 'end') at('touchend', [], c); else at(tip, c);
  }, [aralik, cx, cy, tip]).then(() => page.waitForTimeout(60));

  await cift(100, 195, 400, 'touchstart');
  await cift(200, 195, 400, 'touchmove');
  rapor.kontrol('Büyütme kaydırmasız başlıyor',
    (await olcek()) === 'translate(0px, 0px) scale(2)', await olcek());

  await cift(200, 115, 300, 'touchmove');
  rapor.kontrol('Parmaklar kayınca içerik de kayıyor',
    (await olcek()) === 'translate(-80px, -100px) scale(2)', await olcek());

  await cift(200, 600, 400, 'touchmove');
  const uzak = await olcek();
  const kx = Number((uzak.match(/translate\((-?\d+)px/) || [])[1]);
  // Sınır: (ölçek - 1) × genişlik / 2 = 1 × 390 / 2
  rapor.kontrol('Kaydırma taşan miktarla sınırlı', kx === 195, uzak);

  await cift(200, 600, 400, 'end');
  await page.waitForTimeout(400);
  rapor.kontrol('Gezindikten sonra da eski haline dönüyor', (await olcek()) === '', await olcek() || '(boş)');

  await pinch(100, 300, false);

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
