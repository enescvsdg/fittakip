/* Testler ve yerel geliştirme için küçük bir statik sunucu.
   Bağımlılık eklememek için elle yazıldı — uygulamanın kendisi de
   bağımlılıksız, test altyapısı onu bozmasın. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('..', import.meta.url));
const TUR = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

export function sunucuBaslat(port = 0) {
  const server = createServer(async (req, res) => {
    // Sorgu dizesini at, ".." ile kök dışına çıkmayı engelle
    const yol = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const dosya = join(KOK, yol === '/' ? 'index.html' : yol);
    if (!dosya.startsWith(KOK)) { res.writeHead(403).end('Yasak'); return; }
    try {
      const veri = await readFile(dosya);
      res.writeHead(200, { 'Content-Type': TUR[extname(dosya)] || 'application/octet-stream' });
      res.end(veri);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bulunamadı: ' + yol);
    }
  });

  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      const adres = 'http://127.0.0.1:' + server.address().port;
      resolve({ adres, kapat: () => new Promise(r => server.close(r)) });
    });
  });
}

// Doğrudan çalıştırılırsa: node test/server.mjs 8080
if (process.argv[1] && process.argv[1].endsWith('server.mjs')) {
  const { adres } = await sunucuBaslat(Number(process.argv[2]) || 8080);
  console.log('Sunucu hazır: ' + adres);
}
