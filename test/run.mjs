/* Bütün takımları çalıştırır.
     node test/run.mjs              → hepsi
     node test/run.mjs unit worker  → tarayıcı gerektirmeyenler
     node test/run.mjs ui           → yalnızca arayüz
   Sunucu ve tarayıcı bir kez açılır, bütün takımlar onu paylaşır. */
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sunucuBaslat } from './server.mjs';
import { Rapor, chromiumAc } from './harness.mjs';

const KLASORLER = ['unit', 'worker', 'ui'];
const istenen = process.argv.slice(2).filter(a => KLASORLER.includes(a));
const calisacak = istenen.length ? istenen : KLASORLER;

const kok = fileURLToPath(new URL('.', import.meta.url));
const takimlar = [];
for (const klasor of calisacak) {
  let dosyalar = [];
  try { dosyalar = await readdir(kok + klasor); } catch { continue; }
  for (const d of dosyalar.filter(x => x.endsWith('.test.mjs')).sort()) {
    takimlar.push({ klasor, dosya: d, yol: './' + klasor + '/' + d });
  }
}

if (!takimlar.length) { console.error('Çalıştırılacak takım bulunamadı.'); process.exit(1); }

const { adres, kapat } = await sunucuBaslat(0);
const tarayiciGerekli = takimlar.some(t => t.klasor === 'ui');
let browser = null;
if (tarayiciGerekli) {
  try {
    browser = await chromiumAc();
  } catch (err) {
    console.error('\n⚠️  Playwright açılamadı: ' + err.message);
    console.error('   Arayüz testleri için: npm install && npx playwright install chromium\n');
    await kapat();
    process.exit(1);
  }
}

let toplamGecti = 0, toplamKaldi = 0;
const satirlar = [];

for (const t of takimlar) {
  const mod = await import(t.yol);
  const rapor = new Rapor(t.dosya.replace('.test.mjs', ''));
  console.log('\n══ ' + rapor.ad + ' ══');
  try {
    await mod.default({ rapor, adres, browser });
  } catch (err) {
    rapor.kontrol('takım çöktü', false, err.message);
  }
  const o = rapor.ozet();
  toplamGecti += o.gecti; toplamKaldi += o.kaldi;
  satirlar.push({ ad: rapor.ad, ...o });
}

if (browser) await browser.close();
await kapat();

console.log('\n' + '─'.repeat(46));
for (const s of satirlar) {
  console.log('  ' + (s.kaldi ? '❌' : '✅') + ' ' + s.ad.padEnd(24) +
              String(s.gecti).padStart(3) + ' geçti' + (s.kaldi ? ', ' + s.kaldi + ' kaldı' : ''));
}
console.log('─'.repeat(46));
console.log('  TOPLAM: ' + toplamGecti + ' geçti, ' + toplamKaldi + ' kaldı\n');
process.exit(toplamKaldi ? 1 : 0);
