/* Açılış perdesi: sistemin açılış ekranıyla aynı lacivertten başlayıp geçerli
   temanın zeminine geçer. Bildirimden gelindiğinde çıkmaz, dokununca kapanır,
   ve service worker yeniden yüklemesini örtecek şekilde davranır. */
import { sayfaAc } from '../harness.mjs';

const LACIVERT = 'rgb(12, 18, 27)';
const KREM = [241, 239, 236];

export default async function ({ rapor, adres, browser }) {
  const durum = page => page.evaluate(() => {
    const e = document.getElementById('appSplash');
    if (!e) return { yok: true };
    const cs = getComputedStyle(e);
    return { sinif: e.className, zemin: cs.backgroundColor, goster: cs.display };
  });

  for (const tema of ['dark', 'light']) {
    rapor.baslik(tema === 'dark' ? 'gece' : 'gündüz');
    const { ctx, page, hatalar } = await sayfaAc(browser, { adres, tema, perde: true });
    // sayfaAc 1100 ms bekliyor; perde 700 ms'de temaya geçip 1250 ms'de kapanmaya başlar

    let d = await durum(page);
    rapor.kontrol('Tema geçişi uygulandı', d.sinif.includes('tema'), d.sinif);
    if (tema === 'light') {
      const olculen = (d.zemin.match(/\d+/g) || []).map(Number);
      const sapma = Math.max(...KREM.map((v, i) => Math.abs(v - olculen[i])));
      rapor.kontrol('Gündüzde zemin kreme geçiyor', sapma <= 8, d.zemin + ' (sapma ' + sapma + ')');
    } else {
      rapor.kontrol('Gecede zemin lacivert kalıyor', d.zemin === LACIVERT, d.zemin);
    }

    await page.waitForTimeout(900);
    d = await durum(page);
    rapor.kontrol('Perde tamamen kapandı', d.goster === 'none', d.sinif);

    await page.evaluate(() => showPage('supplement'));
    await page.waitForTimeout(200);
    rapor.kontrol('Perde tıklamayı engellemiyor', await page.isVisible('#page-supplement'));
    rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
    await ctx.close();
  }

  rapor.baslik('atlama ve kapanma koşulları');
  {
    const { ctx, page } = await sayfaAc(browser, { adres, perde: true, yol: '/index.html?supp=s2' });
    rapor.kontrol('Bildirimden gelince perde hiç çıkmıyor', (await durum(page)).goster === 'none');
    await ctx.close();
  }
  {
    // Perde tamamlandıktan sonraki yeniden yüklemede tekrar çıkmamalı
    const { ctx, page } = await sayfaAc(browser, { adres, perde: true });
    await page.waitForTimeout(900);
    await page.reload({ waitUntil: 'commit' });
    await page.waitForTimeout(200);
    rapor.kontrol('Tamamlanmış perde yeniden yüklemede çıkmıyor', (await durum(page)).goster === 'none');
    await ctx.close();
  }
  {
    /* Perde OYNARKEN yeniden yüklenirse baştan oynamalı: bayrak açılışta değil
       kapanışta konuyor, böylece service worker güncellemesinin yol açtığı
       yeniden yükleme de perdenin altında kalıyor. */
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(adres + '/index.html', { waitUntil: 'commit' });
    await page.waitForTimeout(300);
    await page.reload({ waitUntil: 'commit' });
    await page.waitForTimeout(200);
    const d = await durum(page);
    rapor.kontrol('Yarıda kesilen perde baştan oynuyor', d.goster !== 'none' && d.zemin === LACIVERT, d.sinif + ' ' + d.zemin);
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(adres + '/index.html', { waitUntil: 'commit' });
    await page.waitForTimeout(250);
    await page.click('#appSplash');
    await page.waitForTimeout(450);
    rapor.kontrol('Dokununca erken kapanıyor', (await durum(page)).goster === 'none');
    await ctx.close();
  }
}
