/* Takımların ortak ihtiyaçları: sonuç raporu, tarayıcı açma, veri tohumlama.
   Her testin bunları yeniden yazması hem gürültü hem de sapma kaynağı. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const KOK = fileURLToPath(new URL('..', import.meta.url));

/* ── Sonuç toplayıcı ── */
export class Rapor {
  constructor(ad) { this.ad = ad; this.gecti = 0; this.kaldi = 0; }
  baslik(m) { console.log('  ── ' + m + ' ──'); }
  kontrol(etiket, kosul, ek = '') {
    const ok = !!kosul;
    console.log('  ' + (ok ? '✅' : '❌') + ' ' + etiket + (ek ? ' → ' + ek : ''));
    ok ? this.gecti++ : this.kaldi++;
    return ok;
  }
  ozet() { return { gecti: this.gecti, kaldi: this.kaldi }; }
}

/* ── Tarayıcı ──
   Playwright yalnızca arayüz testleri için gerekli; birim ve worker testleri
   onsuz çalışsın diye tembel yükleniyor. */
export async function chromiumAc() {
  const { chromium } = await import('playwright');
  return chromium.launch();
}

/* Tohumlanmış, hazır bir sayfa açar.
   - tema: 'dark' | 'light'
   - veri: localStorage'a yazılacak anahtarlar
   - perde: false ise açılış perdesi atlanır (testlerin çoğu onu beklemesin)
   - servisCalisani: false ise kaydolmaz, böylece controllerchange yeniden
     yüklemesi testin ölçümünü bozmaz */
export async function sayfaAc(browser, { adres, tema = 'dark', veri = {}, perde = false,
                                         servisCalisani = false, yol = '/index.html' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: tema,
    serviceWorkers: servisCalisani ? 'allow' : 'block'
  });
  await ctx.addInitScript(([v, p]) => {
    Object.entries(v).forEach(([k, val]) => localStorage.setItem(k, val));
    if (!p) { try { sessionStorage.setItem('ft_splash', '1'); } catch (e) {} }
  }, [veri, perde]);

  const page = await ctx.newPage();
  const hatalar = [];
  page.on('pageerror', e => {
    // Chart.js/PDF.js CDN'i test ortamında engelli; onun hatası uygulamanın değil
    if (!e.message.includes("Unexpected token '<'")) hatalar.push(e.message);
  });
  await page.goto(adres + yol, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  return { ctx, page, hatalar };
}

/* Uygulamanın kaynağından bir fonksiyonu söküp Node içinde çalıştırır.
   Saf yardımcıları (escapeHtml gibi) tarayıcı açmadan denemek için. */
export async function appFonksiyonlari(...adlar) {
  const src = await readFile(KOK + 'app.js', 'utf8');
  const govde = adlar.map(ad => {
    const m = src.match(new RegExp('^function ' + ad + '[\\s\\S]*?\\n}', 'm'));
    if (!m) throw new Error('app.js içinde bulunamadı: ' + ad);
    return m[0];
  }).join('\n');
  return new Function(govde + '\nreturn { ' + adlar.join(', ') + ' };')();
}

/* Bugünün yerel tarihi — app.js'teki getTodayKey ile aynı biçim */
export function bugunAnahtari(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}

export const TR_GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
