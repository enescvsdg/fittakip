/* Cam kapsülün okunabilirliği — GERÇEK piksel ölçümü.
   backdrop-filter'ın sonucu CSS'ten hesaplanamaz: arkadan kayan içerik kapsülü
   aydınlatır ve etiket kontrastı düşer. Bu yüzden ekran görüntüsü alınıp
   etiketin tam altındaki piksel örnekleniyor.

   Sayfa listesi DOM'dan okunuyor. Elle yazılsaydı yeni bir sayfa eklendiğinde
   ya da bir kimlik değiştiğinde ölçüm sessizce o sayfayı atlardı — bu takım
   tam olarak o hatayı önlemek için var. */
import { sayfaAc } from '../harness.mjs';
import { DOLU } from './_veri.mjs';

const ESIK = 4.5;                        // WCAG AA, küçük yazı
const fi = x => x >= 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
const isik = ([r, g, b]) => 0.2126 * fi(r / 255) + 0.7152 * fi(g / 255) + 0.0722 * fi(b / 255);
const oran = (a, b) => { const [x, y] = [isik(a), isik(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = s => (s.match(/\d+/g) || []).slice(0, 3).map(Number);

export default async function ({ rapor, adres, browser }) {
  for (const tema of ['dark', 'light']) {
    rapor.baslik(tema === 'dark' ? 'gece — cam okunabilirliği' : 'gündüz — cam okunabilirliği');
    const { ctx, page } = await sayfaAc(browser, { adres, tema, veri: DOLU });

    const sayfalar = await page.$$eval('section.page', ler => ler.map(e => e.id.replace(/^page-/, '')));
    let enKotu = { deger: 99 };

    for (const sayfa of sayfalar) {
      await page.evaluate(s => showPage(s), sayfa);
      await page.waitForTimeout(220);
      const yuk = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      const duraklar = yuk > 60 ? [0, Math.round(yuk * 0.7)] : [0];

      for (const y of duraklar) {
        await page.evaluate(v => window.scrollTo(0, v), y);
        await page.waitForTimeout(200);
        // Kapsül kaydırınca toplanıyor; etiketler görünsün diye açık tutuluyor
        await page.evaluate(() => document.querySelector('.bottom-nav').classList.remove('toplandi'));
        await page.waitForTimeout(220);

        const bilgi = await page.evaluate(() => {
          const ler = [...document.querySelectorAll('.bottom-nav-item')];
          const aktif = document.querySelector('.bottom-nav-item.active') || ler[0];
          const pasif = ler.find(o => o !== aktif);
          const nokta = o => {
            const e = o.querySelector('.bnav-label').getBoundingClientRect();
            return { x: e.left + e.width / 2, y: e.top + e.height / 2 };
          };
          return {
            renk: { pasif: getComputedStyle(pasif.querySelector('.bnav-label')).color,
                    aktif: getComputedStyle(aktif.querySelector('.bnav-label')).color },
            nokta: { pasif: nokta(pasif), aktif: nokta(aktif) },
            etiket: { pasif: pasif.dataset.page, aktif: aktif.dataset.page }
          };
        });

        // Zemini saf ölçmek için yazı ve ikon geçici olarak saydamlaştırılıyor
        await page.evaluate(() => {
          const st = document.createElement('style'); st.id = 'olcumGizle';
          st.textContent = '.bnav-label{color:transparent!important}.bnav-icon{stroke:transparent!important}';
          document.head.appendChild(st);
        });
        await page.waitForTimeout(120);
        const kutu = await page.locator('.bottom-nav').boundingBox();
        const png = (await page.screenshot({ clip: kutu })).toString('base64');
        await page.evaluate(() => document.getElementById('olcumGizle').remove());

        const zemin = await page.evaluate(async ([veri, noktalar, kx, ky]) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + veri; await img.decode();
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const g = c.getContext('2d'); g.drawImage(img, 0, 0);
          const olc = n => {
            // ekran koordinatı → görüntü koordinatı (deviceScaleFactor 2)
            const d = g.getImageData(Math.round((n.x - kx) * 2) - 3, Math.round((n.y - ky) * 2) - 3, 7, 7).data;
            let t = [0, 0, 0];
            for (let i = 0; i < d.length; i += 4) { t[0] += d[i]; t[1] += d[i + 1]; t[2] += d[i + 2]; }
            const s = d.length / 4;
            return [Math.round(t[0] / s), Math.round(t[1] / s), Math.round(t[2] / s)];
          };
          return { pasif: olc(noktalar.pasif), aktif: olc(noktalar.aktif) };
        }, [png, bilgi.nokta, kutu.x, kutu.y]);

        for (const tip of ['pasif', 'aktif']) {
          const o = oran(rgb(bilgi.renk[tip]), zemin[tip]);
          if (o < enKotu.deger) enKotu = { deger: o, sayfa, y, tip, etiket: bilgi.etiket[tip] };
        }
      }
    }

    rapor.kontrol('Bütün sayfalar ölçüldü', sayfalar.length >= 5, sayfalar.join(','));
    rapor.kontrol('En kötü etiket kontrastı ' + ESIK + ':1 üstünde',
      enKotu.deger >= ESIK,
      enKotu.deger.toFixed(2) + ':1 — ' + enKotu.sayfa + ' / ' + enKotu.etiket +
      ' / ' + enKotu.tip + ' / kaydırma ' + enKotu.y);
    await ctx.close();
  }
}
