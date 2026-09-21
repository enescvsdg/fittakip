#!/usr/bin/env node
/* ══════════════════════════════════════════
   Yönetim panelini tek bir JS modülüne gömer.

     node worker/panel-uret.mjs   →  worker/src/panel.js

   Neden gömülü: depo açık ve GitHub Pages depodaki TÜM dosyaları yayınlıyor.
   worker/panel/ altındaki parçalar tek başına çalışan bir sayfa değil —
   yalnız kaynak metni. Panel yalnızca Cloudflare'den, ADMIN_KEY ile açılıyor.
   ══════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('.', import.meta.url));

const oku = ad => readFileSync(KOK + 'panel/' + ad, 'utf8');

const stil = oku('stil.css');
const govde = oku('govde.html');
const uygulama = oku('uygulama.js');
const { baslik, font } = JSON.parse(oku('basliklar.json'));

const sayfa =
  '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="robots" content="noindex, nofollow">\n' +
  '<title>' + baslik + '</title>\n' +
  font + '\n<style>\n' + stil + '\n</style>\n\n' +
  govde + '\n<script>\n' + uygulama + '\n</' + 'script>\n</body>\n</html>\n';

const modul =
`/* ══════════════════════════════════════════
   YÖNETİM PANELİ — ÜRETİLEN DOSYA

   Bunu elle düzenleme. Kaynak worker/panel/ altında:
     stil.css        görünüm
     govde.html      iskelet
     uygulama.js     davranış

   Değişiklikten sonra:  npm run panel-uret
   ══════════════════════════════════════════ */

export const PANEL_HTML = ${JSON.stringify(sayfa)};
`;

writeFileSync(KOK + 'src/panel.js', modul);
console.log('worker/src/panel.js yazıldı: ' + (modul.length / 1024).toFixed(1) + ' KB');
