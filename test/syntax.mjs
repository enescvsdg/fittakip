/* Söz dizimi ve yapılandırma denetimi — tarayıcı veya bağımlılık gerektirmez,
   CI'ın ilk adımı olarak saniyeler içinde çalışır. */
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const JS = ['app.js', 'sw.js', 'worker/src/worker.js', 'worker/src/push.js', 'worker/generate-vapid-keys.mjs'];
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

process.exit(hata ? 1 : 0);
