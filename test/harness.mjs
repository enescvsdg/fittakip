/* Takımların ortak ihtiyaçları: sonuç raporu, tarayıcı açma, veri tohumlama.
   Her testin bunları yeniden yazması hem gürültü hem de sapma kaynağı. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const KOK = fileURLToPath(new URL('..', import.meta.url));

/* Zamana bağlı testler için sabit an.

   Worker testlerinde bu dersi CI'da öğrendik: saatler "şu ana göre"
   kurulunca gece yarısını geçen bir koşuda testler kırılıyor. Arayüz
   testlerinde de aynı tuzak var, sadece farklı bir saatte patlıyor.
   Gün ortasına sabitliyoruz ki ±birkaç saatlik kaydırmalar gün sınırını
   geçmesin. */
export const SABIT_AN = '2026-09-17T09:00:00Z';   // UTC'de 12:00 değil 09:00 — gün ortası
export const SABIT_TARIH = '2026-09-17';

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
                                         servisCalisani = false, yol = '/index.html',
                                         zamanSabit = false, dokunmatik = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: tema,
    timezoneId: 'UTC',
    hasTouch: dokunmatik,
    serviceWorkers: servisCalisani ? 'allow' : 'block'
  });

  // Tarihe bağlı testler koşu saatinden etkilenmesin. Yalnızca Date sabitlenir;
  // zamanlayıcılar gerçek kalır, yoksa açılış perdesi hiç kapanmaz.
  if (zamanSabit) await ctx.clock.setFixedTime(new Date(SABIT_AN));
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
   Saf yardımcıları (escapeHtml gibi) tarayıcı açmadan denemek için.
   Kaynak dosyalar bölündükçe burası da taransın diye liste hâlinde. */
const KAYNAKLAR = ['storage.js', 'utils.js', 'app.js'];

export async function appFonksiyonlari(...adlar) {
  const kaynak = (await Promise.all(KAYNAKLAR.map(d => readFile(KOK + d, 'utf8')))).join('\n');
  const govde = adlar.map(ad => {
    const m = kaynak.match(new RegExp('^function ' + ad + '[\\s\\S]*?\\n}', 'm'));
    if (!m) throw new Error('Kaynaklarda bulunamadı: ' + ad + ' (' + KAYNAKLAR.join(', ') + ')');
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
