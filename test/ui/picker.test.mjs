/* Kaydırarak değer girme. Alanın kendisi <input> olarak kalıyor; yalnızca
   salt okunur olup seçiciyi açıyor, böylece kaydetme ve doğrulama değişmiyor. */
import { sayfaAc } from '../harness.mjs';

const seciciAcik = page => page.evaluate(() =>
  !document.getElementById('sayiSecici').classList.contains('hidden'));

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres });
  await page.evaluate(() => showPage('profile'));
  await page.waitForTimeout(250);

  rapor.baslik('alanlar seçiciye bağlı');
  const alanlar = ['input-height', 'input-weight', 'input-age', 'goal-weight', 'weighin-weight'];
  for (const id of alanlar) {
    const d = await page.evaluate(x => {
      const e = document.getElementById(x);
      return { readOnly: e.readOnly, sinif: e.classList.contains('secici-alan'), mod: e.getAttribute('inputmode') };
    }, id);
    rapor.kontrol(id.padEnd(15) + ' salt okunur ve bağlı', d.readOnly && d.sinif && d.mod === 'none');
  }

  rapor.baslik('açılış ve sütunlar');
  await page.click('#input-weight');
  await page.waitForTimeout(350);
  rapor.kontrol('Kiloya dokununca seçici açılıyor', await seciciAcik(page));

  const yapi = await page.evaluate(() => {
    const t = document.getElementById('seciciTekerlek');
    const s = [...t.querySelectorAll('.secici-sutun')];
    return {
      baslik: document.getElementById('seciciBaslik').textContent,
      sutunSayisi: s.length,
      tamAdet: s[0].children.length,
      ilk: s[0].children[0].textContent,
      son: s[0].children[s[0].children.length - 1].textContent,
      ondalikAdet: s[1] ? s[1].children.length : 0,
      birim: (t.querySelector('.secici-birim') || {}).textContent
    };
  });
  rapor.kontrol('Başlık alanı ve birimi söylüyor', yapi.baslik === 'Kilo (kg)', yapi.baslik);
  rapor.kontrol('İki sütun (tam + ondalık)', yapi.sutunSayisi === 2, yapi.sutunSayisi + ' sütun');
  rapor.kontrol('Aralık SAYI_ARALIK ile aynı', yapi.ilk === '30' && yapi.son === '300', yapi.ilk + '–' + yapi.son);
  rapor.kontrol('271 tam değer', yapi.tamAdet === 271, String(yapi.tamAdet));
  rapor.kontrol('10 ondalık basamak', yapi.ondalikAdet === 10, String(yapi.ondalikAdet));
  rapor.kontrol('Birim gösteriliyor', yapi.birim === 'kg', String(yapi.birim));

  rapor.baslik('mevcut değere konumlanma');
  await page.evaluate(() => { document.getElementById('seciciKapat').click(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const e = document.getElementById('input-weight'); e.value = '82.5'; });
  await page.click('#input-weight');
  await page.waitForTimeout(400);
  const konum = await page.evaluate(() => {
    const s = [...document.querySelectorAll('.secici-sutun')];
    const sec = s.map(x => x.querySelector('.secici-oge.secili'));
    return { tam: sec[0] && sec[0].textContent, ondalik: sec[1] && sec[1].textContent };
  });
  rapor.kontrol('Tam kısım mevcut değerde', konum.tam === '82', String(konum.tam));
  rapor.kontrol('Ondalık mevcut değerde', konum.ondalik === '.5', String(konum.ondalik));

  rapor.baslik('seçim alana yazılıyor');
  await page.evaluate(() => {
    const s = document.querySelectorAll('.secici-sutun');
    s[0].scrollTop = (78 - 30) * 40;      // 78 kg
    s[1].scrollTop = 3 * 40;              // .3
  });
  await page.waitForTimeout(300);
  await page.click('#seciciOnayla');
  await page.waitForTimeout(300);
  rapor.kontrol('Seçici kapandı', !(await seciciAcik(page)));
  const yazilan = await page.inputValue('#input-weight');
  rapor.kontrol('Alana 78.3 yazıldı', yazilan === '78.3', yazilan);

  rapor.baslik('ondalıksız alanlar');
  await page.click('#input-height');
  await page.waitForTimeout(350);
  const boy = await page.evaluate(() => {
    const s = [...document.querySelectorAll('.secici-sutun')];
    return { sutun: s.length, ilk: s[0].children[0].textContent, son: s[0].children[s[0].children.length-1].textContent };
  });
  rapor.kontrol('Boyda tek sütun', boy.sutun === 1, boy.sutun + ' sütun');
  rapor.kontrol('Boy aralığı 100–250', boy.ilk === '100' && boy.son === '250', boy.ilk + '–' + boy.son);
  await page.evaluate(() => { document.querySelector('.secici-sutun').scrollTop = (182 - 100) * 40; });
  await page.waitForTimeout(280);
  await page.click('#seciciOnayla');
  await page.waitForTimeout(250);
  rapor.kontrol('Boy 182 yazıldı', (await page.inputValue('#input-height')) === '182');

  rapor.baslik('doğrulamayla birlikte çalışıyor');
  await page.evaluate(() => { document.getElementById('input-age').value = '31'; });
  await page.click('#save-profile');
  await page.waitForTimeout(300);
  const depo = await page.evaluate(() => ({
    boy: localStorage.getItem('ft_height'), kilo: localStorage.getItem('ft_weight')
  }));
  rapor.kontrol('Seçiciyle girilen değerler kaydediliyor',
    depo.boy === '182' && depo.kilo === '78.3', JSON.stringify(depo));

  /* Seçili değerin GERÇEKTEN görünür olması.
     Bant konumlandırılmış bir öğe; sütun konumlandırılmazsa bant sayıların
     üstüne boyanıyor ve seçili değer kayboluyor. DOM kontrolleri bunu
     yakalamaz — boyama sırası ancak piksellerden anlaşılır. */
  rapor.baslik('seçili değer gerçekten görünüyor');
  await page.click('#input-weight');
  await page.waitForTimeout(500);

  // Kırpma yalnızca SAYI sütununun bantla kesiştiği yer olmalı: bandın
  // tamamı alınırsa ayrı katmandaki birim yazısı testi kandırıyor
  const bant = await page.locator('.secici-band').boundingBox();
  const sutun = await page.locator('.secici-sutun').first().boundingBox();
  const png = await page.screenshot({
    clip: { x: sutun.x + 4, y: bant.y + 4, width: sutun.width - 8, height: bant.height - 8 }
  });

  const okuyucuCtx = await browser.newContext();
  const okuyucu = await okuyucuCtx.newPage();
  await okuyucu.setContent('<canvas id="c"></canvas>');
  const fark = await okuyucu.evaluate(async (veri) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + veri; await img.decode();
    const c = document.getElementById('c'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let enAz = 255, enCok = 0;
    for (let i = 0; i < d.length; i += 4) {
      const L = 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
      if (L < enAz) enAz = L; if (L > enCok) enCok = L;
    }
    return Math.round(enCok - enAz);
  }, png.toString('base64'));
  await okuyucuCtx.close();

  // Sayı görünüyorsa bantta belirgin bir parlaklık farkı olur; örtülüyse bant düz kalır
  rapor.kontrol('Bantta sayı görünüyor (düz zemin değil)', fark > 60, 'parlaklık farkı ' + fark);
  rapor.kontrol('Sütun konumlandırılmış (bant üstte kalmasın)',
    await page.evaluate(() => getComputedStyle(document.querySelector('.secici-sutun')).position !== 'static'));
  await page.evaluate(() => document.getElementById('seciciKapat').click());
  await page.waitForTimeout(200);

  rapor.baslik('kapatma yolları');
  await page.click('#input-age');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('sayiSecici').click());   // dışına dokun
  await page.waitForTimeout(250);
  rapor.kontrol('Dışına dokununca kapanıyor', !(await seciciAcik(page)));

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
