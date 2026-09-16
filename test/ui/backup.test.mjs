/* Yedek dosyası e-postaya veya buluta gidebiliyor; kimlik bilgisi taşımamalı.
   İçe aktarımda da cihaz ayarları yazılmamalı: kötü niyetli bir yedek Worker
   adresini kendi sunucusuna çevirip cihaz anahtarını oraya çektirebilir. */
import { readFile } from 'node:fs/promises';
import { sayfaAc } from '../harness.mjs';

const MEVCUT = {
  ft_height: '178', ft_weight: '75.4',
  ft_gemini_api_key: 'GERCEK-GEMINI-ANAHTARI',
  ft_push_device_key: 'GERCEK-CIHAZ-ANAHTARI',
  ft_push_server_url: 'https://fittakip-push.gercek.workers.dev'
};

const KOTU_YEDEK = JSON.stringify({
  app: 'FitTakip', version: 1, exportedAt: new Date().toISOString(),
  data: {
    ft_height: '180', ft_age: '33',
    ft_gemini_api_key: 'SALDIRGAN-ANAHTARI',
    ft_push_device_key: 'SALDIRGAN-CIHAZ-ANAHTARI',
    ft_push_server_url: 'https://saldirgan.example.com'
  }
});

export default async function ({ rapor, adres, browser }) {
  const { ctx, page, hatalar } = await sayfaAc(browser, { adres, veri: MEVCUT });
  page.on('dialog', d => d.accept());

  rapor.baslik('dışa aktarım kapsamı');
  const anahtarlar = await page.evaluate(() => collectAllFitKeys());
  rapor.kontrol('Gemini anahtarı yedeğe girmiyor', !anahtarlar.includes('ft_gemini_api_key'), anahtarlar.join(','));
  rapor.kontrol('Cihaz anahtarı yedeğe girmiyor',  !anahtarlar.includes('ft_push_device_key'));
  rapor.kontrol('Worker adresi yedeğe girmiyor',   !anahtarlar.includes('ft_push_server_url'));
  rapor.kontrol('Normal veriler yedeğe giriyor',   anahtarlar.includes('ft_height') && anahtarlar.includes('ft_weight'));

  rapor.baslik('indirilen dosyanın içeriği');
  const [indirme] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => { showPage('settings'); document.getElementById('exportDataBtn').click(); })
  ]);
  const icerik = await readFile(await indirme.path(), 'utf8');
  rapor.kontrol('Dosyada Gemini anahtarı geçmiyor', !icerik.includes('GERCEK-GEMINI-ANAHTARI'));
  rapor.kontrol('Dosyada cihaz anahtarı geçmiyor',  !icerik.includes('GERCEK-CIHAZ-ANAHTARI'));
  rapor.kontrol('Dosyada worker adresi geçmiyor',   !icerik.includes('fittakip-push.gercek'));
  rapor.kontrol('Dosyada kilo verisi var',          icerik.includes('75.4'));

  rapor.baslik('kötü niyetli yedeği içe aktarma');
  await page.setInputFiles('#importDataInput',
    { name: 'kotu.json', mimeType: 'application/json', buffer: Buffer.from(KOTU_YEDEK) });
  await page.waitForTimeout(900);
  const sonra = await page.evaluate(() => ({
    gemini: localStorage.getItem('ft_gemini_api_key'),
    cihaz:  localStorage.getItem('ft_push_device_key'),
    url:    localStorage.getItem('ft_push_server_url'),
    // ft_height tohum betiği tarafından yenilemede geri yazıldığı için
    // tohumda olmayan bir alanla ölçüyoruz
    yas:    localStorage.getItem('ft_age')
  }));
  rapor.kontrol('Gemini anahtarı değiştirilemedi', sonra.gemini === 'GERCEK-GEMINI-ANAHTARI', String(sonra.gemini));
  rapor.kontrol('Cihaz anahtarı değiştirilemedi',  sonra.cihaz === 'GERCEK-CIHAZ-ANAHTARI', String(sonra.cihaz));
  rapor.kontrol('Worker adresi çalınamadı',        sonra.url === 'https://fittakip-push.gercek.workers.dev', String(sonra.url));
  rapor.kontrol('Normal veri geri yüklendi',       sonra.yas === '33', String(sonra.yas));

  rapor.kontrol('Konsol hatası yok', hatalar.length === 0, hatalar[0] || '');
  await ctx.close();
}
