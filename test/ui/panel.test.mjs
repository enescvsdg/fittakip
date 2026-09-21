/* Yönetim paneli — toplu onay, süzgeç, arama, çizim sınırı.

   Ajanlar bin kayda kadar getirebiliyor. Panel tek tek onaylamaya göre
   kurulmuştu; o hâliyle telefonda kullanılamaz. Bu takım listenin
   yönetilebilir kaldığını tutuyor.

   En kritik kural: ŞÜPHELİ kayıtlar sessizce toplu onaylanmamalı. Onlar
   "gözle bak" demek için işaretlendi. */
import { PANEL_HTML } from '../../worker/src/panel.js';

const ADRES = 'https://panel.deneme/admin';

function kayit(i, ek = {}) {
  return {
    id: 'k' + i, ajan: 'egzersiz', tur: 'yeni',
    grup: ek.grup || 'Yeni hareketler',
    ad: ek.ad || ('Hareket ' + i),
    deger: 'Barbell · Orta · Göğüs',
    aciklama: 'Kaynakta var, bizde yok.',
    supheli: false, uyari: null, fark: null, talimat: null,
    ...ek
  };
}

/* Worker'ın yerine geçen sahte ağ. Gönderilen kararları da yakalıyor. */
async function paneliAc(browser, bekleyen) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const hatalar = [];
  const kararlar = [];
  page.on('pageerror', e => hatalar.push(String(e)));

  await page.route('**/*', async route => {
    const url = route.request().url();
    if (url.endsWith('/admin')) {
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: PANEL_HTML });
    }
    if (url.endsWith('/admin/veri')) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ajanlar: [
          { id: 'egzersiz', ad: 'Egzersiz', kaynak: 'free-exercise-db',
            calisma: { an: '2026-09-21T00:00:00Z', yeni: bekleyen.length, guncel: 0 },
            bekleyen, onayliSayi: 0 },
          { id: 'gida', ad: 'Gıda', kaynak: 'USDA', calisma: null, bekleyen: [], onayliSayi: 0 },
          { id: 'analiz', ad: 'Analiz', kaynak: 'Gemini', calisma: null, bekleyen: [], onayliSayi: 0 },
          { id: 'takviye', ad: 'Supplement', kaynak: 'siteler', calisma: null, bekleyen: [], onayliSayi: 0 }
        ] })
      });
    }
    if (url.endsWith('/admin/karar')) {
      kararlar.push(JSON.parse(route.request().postData()));
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ onaylanan: 0, reddedilen: 0 }) });
    }
    if (url.includes('fonts.googleapis.com')) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    }
    return route.fulfill({ status: 404, body: '' });
  });

  await page.goto(ADRES);
  await page.waitForSelector('.kayit', { timeout: 5000 });
  return { ctx, page, hatalar, kararlar };
}

export default async function ({ rapor, browser }) {
  // 200 kayıt: 150 temiz yeni, 30 şüpheli, 20 güncelleme
  const cokKayit = [
    ...Array.from({ length: 150 }, (_, i) => kayit(i)),
    ...Array.from({ length: 30 }, (_, i) => kayit(200 + i,
      { supheli: true, grup: 'Kaynakta bulunamayanlar', uyari: 'Model çıktısı.' })),
    ...Array.from({ length: 20 }, (_, i) => kayit(300 + i,
      { tur: 'guncelleme', grup: 'Mevcut hareketlere talimat', ad: 'Güncelleme ' + i }))
  ];

  const { ctx, page, hatalar, kararlar } = await paneliAc(browser, cokKayit);

  rapor.baslik('çizim sınırı');
  /* Bin kaydı birden basmak telefonu kilitliyor. */
  const ilkSayi = await page.locator('.kayit').count();
  rapor.kontrol('Hepsi birden çizilmiyor', ilkSayi < cokKayit.length,
    ilkSayi + ' / ' + cokKayit.length);
  rapor.kontrol('Yine de dolu bir sayfa var', ilkSayi >= 40, String(ilkSayi));
  rapor.kontrol('Kaç kayıt kaldığı yazıyor',
    /kayıt kaldı/.test(await page.locator('.daha').textContent()),
    await page.locator('.daha').textContent());

  await page.click('.daha');
  await page.waitForTimeout(200);
  rapor.kontrol('Daha fazla göster çalışıyor',
    (await page.locator('.kayit').count()) > ilkSayi,
    ilkSayi + ' → ' + (await page.locator('.kayit').count()));

  rapor.baslik('grup başlığı gerçek sayıyı söylüyor');
  const kacMetni = await page.locator('.grup-bas .kac').first().textContent();
  rapor.kontrol('Grubun tamamı yazılı', /150 kayıt/.test(kacMetni), kacMetni);
  rapor.kontrol('Kaçının gösterildiği de yazılı', /gösteriliyor/.test(kacMetni), kacMetni);

  rapor.baslik('süzgeçler');
  const cipler = await page.locator('.scip').allTextContents();
  rapor.kontrol('Beş süzgeç var', cipler.length === 5, cipler.join(' | '));
  rapor.kontrol('Sayılar gösteriliyor', /Şüpheli30/.test(cipler.join('')), cipler.join(' | '));
  rapor.kontrol('Tümü varsayılan seçili',
    (await page.locator('.scip[aria-pressed="true"]').textContent()).startsWith('Tümü'));

  await page.locator('.scip', { hasText: 'Şüpheli' }).click();
  await page.waitForTimeout(250);
  rapor.kontrol('Şüpheli süzgeci yalnız onları gösteriyor',
    (await page.locator('.kayit').count()) === 30,
    String(await page.locator('.kayit').count()));
  rapor.kontrol('Hepsi şüpheli işaretli',
    (await page.locator('.kayit.supheli').count()) === 30);

  await page.locator('.scip', { hasText: 'Güncelleme' }).click();
  await page.waitForTimeout(250);
  rapor.kontrol('Güncelleme süzgeci çalışıyor',
    (await page.locator('.kayit').count()) === 20,
    String(await page.locator('.kayit').count()));
  rapor.kontrol('Çizim sınırı süzgeç değişince sıfırlanıyor',
    (await page.locator('.daha').count()) === 0);

  rapor.baslik('arama');
  await page.locator('.scip', { hasText: 'Tümü' }).click();
  await page.waitForTimeout(200);
  await page.fill('#ara', 'Güncelleme 7');
  await page.waitForTimeout(400);
  rapor.kontrol('Ada göre süzüyor', (await page.locator('.kayit').count()) === 1,
    String(await page.locator('.kayit').count()));
  rapor.kontrol('Doğru kaydı buldu',
    (await page.locator('.kayit .ad').textContent()) === 'Güncelleme 7');

  await page.fill('#ara', 'bulunamayan');
  await page.waitForTimeout(400);
  rapor.kontrol('Grup adında da arıyor', (await page.locator('.kayit').count()) === 30,
    String(await page.locator('.kayit').count()));

  await page.fill('#ara', 'böyle bir şey yok');
  await page.waitForTimeout(400);
  rapor.kontrol('Sonuç yoksa açıklıyor',
    (await page.locator('.sonuc-yok').count()) === 1);
  rapor.kontrol('Boş süzgeç düğmeleri kilitleniyor',
    (await page.locator('.scip[disabled]').count()) > 0,
    String(await page.locator('.scip[disabled]').count()));

  await page.fill('#ara', '');
  await page.waitForTimeout(400);

  rapor.baslik('toplu onay');
  page.on('dialog', d => d.accept());
  const temizGrup = page.locator('.grup').filter({ hasText: 'Yeni hareketler' }).first();
  await temizGrup.locator('.grubu-onayla').click();
  await page.waitForTimeout(500);

  rapor.kontrol('Karar gönderildi', kararlar.length === 1, String(kararlar.length));
  rapor.kontrol('Grubun TAMAMI gönderildi — yalnız çizilenler değil',
    kararlar[0] && kararlar[0].kararlar.length === 150,
    kararlar[0] ? String(kararlar[0].kararlar.length) : 'yok');
  rapor.kontrol('Hepsi onay kararı',
    kararlar[0].kararlar.every(k => k.karar === 'onay'));

  rapor.baslik('şüpheli grupta uyarı çıkıyor');
  /* Şüpheli kayıtlar "gözle bak" demek; toplu onay sessizce geçmemeli. */
  await ctx.close();
  const ikinci = await paneliAc(browser, cokKayit);
  const uyarilar = [];
  ikinci.page.on('dialog', d => { uyarilar.push(d.message()); d.dismiss(); });

  /* Çizim sınırı ilk grubu doldurmadan şüpheli gruba gelmiyor; süzgeç zaten
     bunun için var — amaçlanan akış da bu. */
  await ikinci.page.locator('.scip', { hasText: 'Şüpheli' }).click();
  await ikinci.page.waitForTimeout(300);
  const supheliGrup = ikinci.page.locator('.grup').filter({ hasText: 'bulunamayan' }).first();
  await supheliGrup.locator('.grubu-onayla').click();
  await ikinci.page.waitForTimeout(500);

  rapor.kontrol('Onay penceresi çıktı', uyarilar.length === 1, String(uyarilar.length));
  rapor.kontrol('Şüpheli sayısı söyleniyor',
    /30 tanesi ŞÜPHELİ/.test(uyarilar[0] || ''), uyarilar[0] || '');
  rapor.kontrol('Gözle doğrulama uyarısı var',
    /gözle doğrulanmadan/.test(uyarilar[0] || ''));
  rapor.kontrol('Vazgeçilince hiçbir şey gönderilmiyor',
    ikinci.kararlar.length === 0, String(ikinci.kararlar.length));

  rapor.baslik('konsol temiz');
  rapor.kontrol('Sayfa hatası yok', hatalar.length === 0 && ikinci.hatalar.length === 0,
    hatalar.concat(ikinci.hatalar).join(' | '));
  await ikinci.ctx.close();
}
