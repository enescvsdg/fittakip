/* Söz dizimi ve yapılandırma denetimi — tarayıcı veya bağımlılık gerektirmez,
   CI'ın ilk adımı olarak saniyeler içinde çalışır. */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const JS = ['storage.js', 'utils.js', 'app.js', 'sw.js', 'worker/src/worker.js', 'worker/src/push.js', 'worker/generate-vapid-keys.mjs'];
const JSON_DOSYA = ['manifest.json', 'package.json'];

let hata = 0;
for (const d of JS) {
  try { execFileSync(process.execPath, ['--check', KOK + d], { stdio: 'pipe' }); console.log('✅ ' + d); }
  catch (e) { console.log('❌ ' + d + '\n' + (e.stderr || '').toString()); hata++; }
}
for (const d of JSON_DOSYA) {
  try { JSON.parse(await readFile(KOK + d, 'utf8')); console.log('✅ ' + d); }
  catch (e) { console.log('❌ ' + d + ' — ' + e.message); hata++; }
}

// index.html'deki kimlikler benzersiz mi
const html = await readFile(KOK + 'index.html', 'utf8');
const idler = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const tekrar = idler.filter((x, i) => idler.indexOf(x) !== i);
if (tekrar.length) { console.log('❌ index.html — tekrarlayan id: ' + [...new Set(tekrar)].join(', ')); hata++; }
else console.log('✅ index.html — ' + idler.length + ' kimlik, hepsi benzersiz');

/* Dinamik import'a işletim sistemi yolu verilmiş mi?

   fileURLToPath(...) Linux'ta "/home/.../x.js" üretiyor ve import() bunu
   kabul ediyor; Windows'ta "C:\\...\\x.js" üretiyor ve Node "C:" kısmını
   protokol sanıp ERR_UNSUPPORTED_ESM_URL_SCHEME atıyor. Yani hata yalnız
   Windows'ta çıkıyor, burada hiç görünmüyor — bir kez on test takımını
   birden çökertti. Doğrusu URL'yi olduğu gibi vermek: new URL(...).href */
const { readdir } = await import('node:fs/promises');
async function* jsDosyalari(klasor) {
  let girdiler = [];
  try { girdiler = await readdir(klasor, { withFileTypes: true }); } catch { return; }
  for (const g of girdiler) {
    if (g.name === 'node_modules' || g.name.startsWith('.')) continue;
    const yol = klasor + g.name + (g.isDirectory() ? '/' : '');
    if (g.isDirectory()) yield* jsDosyalari(yol);
    else if (/\.(mjs|js)$/.test(g.name)) yield yol;
  }
}
let yolluImport = 0;
for (const klasor of ['test/', 'tools/', 'worker/']) {
  for await (const yol of jsDosyalari(KOK + klasor)) {
    const kaynak = await readFile(yol, 'utf8');
    if (/\bimport\(\s*(fileURLToPath|path\.(join|resolve))\s*\(/.test(kaynak)) {
      console.log('❌ ' + yol.slice(KOK.length) + ' — import()\'a dosya yolu veriliyor, ' +
        'Windows\'ta kırılır; new URL(...).href kullan');
      yolluImport++; hata++;
    }
  }
}
if (!yolluImport) console.log('✅ dinamik import — hepsi URL alıyor');

process.exit(hata ? 1 : 0);
