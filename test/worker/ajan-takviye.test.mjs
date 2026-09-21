/* Ajan 4 — supplement.

   DÜRÜST SINIR: bu ajan gerçek sitelere karşı çalıştırılmadı. Testler
   davranışı tutuyor (izin listesi, robots uyumu, hız sınırı, şüpheli
   işaretleme), çıkarımın gerçek HTML'de doğru çalıştığını değil.

   En çok önemsediğimiz şey izin listesi: ajan yalnızca kullanıcının
   onayladığı alan adlarına istek atmalı, başka hiçbir yere. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';
import {
  SITELER, urunAdresiMi, haritadanAdresler, robotstanHarita,
  adresleriKesfet, siteyiTara, calistir, ayniSite, ZIYARET_ANAHTARI
} from '../../worker/src/ajanlar/takviye.js';
import { bekleyenleriOku } from '../../worker/src/onay.js';

cronLoglariniSustur();

const KOK = 'https://www.ornek.dev';
const SITE = { id: 'ornek', ad: 'Örnek', kok: KOK };

const HARITA = `<?xml version="1.0"?><urlset>
  <url><loc>${KOK}/urun/whey-protein</loc></url>
  <url><loc>${KOK}/urun/kreatin</loc></url>
  <url><loc>${KOK}/blog/protein-nedir</loc></url>
  <url><loc>${KOK}/kategori/proteinler</loc></url>
  <url><loc>https://baska-site.dev/urun/kacak</loc></url>
</urlset>`;

const SAYFA = `<html><head>
  <script type="application/ld+json">
   {"@type":"Product","name":"Örnek Whey Protein","brand":{"name":"Örnek"}}
  </script></head><body>
  <p>1 ölçek (30 g)</p>
  <table><tr><th>Besin</th><th>100 g</th></tr>
    <tr><td>Enerji</td><td>380 kcal</td></tr>
    <tr><td>Protein</td><td>78 g</td></tr>
    <tr><td>Karbonhidrat</td><td>8 g</td></tr>
    <tr><td>Yağ</td><td>5 g</td></tr></table></body></html>`;

/* İstenen her adresi kaydeden sahte ağ. İzin listesi dışına çıkılıp
   çıkılmadığını buradan görüyoruz. */
function sahteAg({ robots = 'User-agent: *\nDisallow: /sepet\n', harita = HARITA,
                   sayfa = SAYFA, sayfaDurum = 200 } = {}) {
  const istekler = [];
  const getir = async (adres) => {
    istekler.push(String(adres));
    const yaz = (metin, durum = 200) => ({
      ok: durum >= 200 && durum < 300, status: durum,
      text: async () => metin, json: async () => JSON.parse(metin)
    });
    if (/robots\.txt$/.test(adres)) return yaz(robots);
    if (/sitemap/.test(adres)) return yaz(harita);
    return yaz(sayfa, sayfaDurum);
  };
  return { getir, istekler };
}

export default async function ({ rapor }) {
  const { env } = await kur();

  rapor.baslik('izin listesi');
  rapor.kontrol('Altı site tanımlı', SITELER.length === 6, String(SITELER.length));
  rapor.kontrol('Hepsi https', SITELER.every(s => s.kok.startsWith('https://')));
  rapor.kontrol('Hepsinin kimliği ve adı var',
    SITELER.every(s => s.id && s.ad && s.kok));
  rapor.kontrol('Supplementler.com listede',
    SITELER.some(s => s.id === 'supplementler'));

  rapor.baslik('ürün adresi ayıklama');
  rapor.kontrol('Ürün sayfası kabul', urunAdresiMi(KOK + '/urun/whey') === true);
  rapor.kontrol('Blog eleniyor', urunAdresiMi(KOK + '/blog/yazi') === false);
  rapor.kontrol('Kategori eleniyor', urunAdresiMi(KOK + '/kategori/protein') === false);
  rapor.kontrol('Sepet eleniyor', urunAdresiMi(KOK + '/sepet') === false);
  rapor.kontrol('Görsel eleniyor', urunAdresiMi(KOK + '/img/a.jpg') === false);
  rapor.kontrol('Ana sayfa eleniyor', urunAdresiMi(KOK + '/') === false);
  rapor.kontrol('Bozuk adres eleniyor', urunAdresiMi('bu adres değil') === false);

  rapor.baslik('sitemap okuma');
  const h = haritadanAdresler(HARITA);
  rapor.kontrol('Beş adres okundu', h.adresler.length === 5, String(h.adresler.length));
  rapor.kontrol('İndeks olmadığı anlaşıldı', h.indeksMi === false);
  const indeks = haritadanAdresler('<sitemapindex><sitemap><loc>' + KOK + '/s1.xml</loc></sitemap></sitemapindex>');
  rapor.kontrol('İndeks tanınıyor', indeks.indeksMi === true);
  rapor.kontrol('robots\'tan sitemap satırı okunuyor',
    robotstanHarita('User-agent: *\nSitemap: ' + KOK + '/harita.xml\n')[0] === KOK + '/harita.xml');

  rapor.baslik('keşif izin listesinde kalıyor');
  const ag1 = sahteAg();
  const bulunan = await adresleriKesfet(SITE, {
    getir: ag1.getir, kurallar: { blokVar: true, izinYok: ['/sepet'], izinVar: [] }
  });
  rapor.kontrol('İki ürün bulundu', bulunan.length === 2, bulunan.join(', '));
  rapor.kontrol('Başka siteye ait adres alınmadı',
    !bulunan.some(a => a.includes('baska-site')), bulunan.join(', '));
  rapor.kontrol('Blog ve kategori elendi',
    !bulunan.some(a => /blog|kategori/.test(a)));

  rapor.baslik('robots yasağı uygulanıyor');
  const yasakli = await adresleriKesfet(SITE, {
    getir: sahteAg().getir,
    kurallar: { blokVar: true, izinYok: ['/urun'], izinVar: [] }
  });
  rapor.kontrol('Yasaklı yoldaki ürünler alınmıyor', yasakli.length === 0,
    yasakli.join(', '));

  // ── TARAMA ─────────────────────────────────────
  rapor.baslik('site taraması');
  const ag2 = sahteAg();
  const gorulen = new Set();
  const tur = await siteyiTara(env, SITE, { getir: ag2.getir, gorulen });
  rapor.kontrol('İki kayıt üretildi', tur.kayitlar.length === 2, String(tur.kayitlar.length));
  rapor.kontrol('Atlanmadı', tur.atlandi === false, String(tur.sebep));
  rapor.kontrol('Görülen adresler işaretlendi', gorulen.size === 2, String(gorulen.size));
  rapor.kontrol('İzin listesi dışına hiç istek gitmedi',
    ag2.istekler.every(a => a.startsWith(KOK)), ag2.istekler.filter(a => !a.startsWith(KOK)).join(','));
  rapor.kontrol('robots.txt önce istendi',
    /robots\.txt$/.test(ag2.istekler[0]), ag2.istekler[0]);

  const kayit = tur.kayitlar[0];
  rapor.kontrol('Ad JSON-LD\'den geldi', kayit.ad === 'Örnek Whey Protein', kayit.ad);
  rapor.kontrol('Değerler özetlendi', /78 g protein/.test(kayit.deger), kayit.deger);
  rapor.kontrol('Taban yazılıyor', /100 g başına/.test(kayit.deger), kayit.deger);
  rapor.kontrol('Kaynak adres taşınıyor', kayit.kaynakBag.startsWith(KOK));
  rapor.kontrol('Site adı grup oluyor', kayit.grup === 'Örnek');

  rapor.baslik('çıktı her koşulda şüpheli');
  /* Okuma mantığı gerçek sayfalara karşı doğrulanmadı — kullanıcı gözle
     bakmadan onaylamasın. */
  rapor.kontrol('Şüpheli işareti var', tur.kayitlar.every(k => k.supheli === true));
  rapor.kontrol('Açıklama bunu söylüyor',
    /ayarlanmadı/.test(kayit.aciklama), kayit.aciklama.slice(-60));

  rapor.baslik('görülen adres tekrar okunmuyor');
  const ag3 = sahteAg();
  const tur2 = await siteyiTara(env, SITE, { getir: ag3.getir, gorulen });
  rapor.kontrol('Yeni kayıt yok', tur2.kayitlar.length === 0, String(tur2.kayitlar.length));
  rapor.kontrol('Ürün sayfası hiç istenmedi',
    !ag3.istekler.some(a => a.includes('/urun/')), ag3.istekler.join(', '));

  rapor.baslik('tur başına üst sınır');
  const ag4 = sahteAg();
  const sinirli = await siteyiTara(env, SITE, {
    getir: ag4.getir, gorulen: new Set(), enFazlaUrun: 1
  });
  rapor.kontrol('Sınır uygulanıyor', sinirli.kayitlar.length === 1, String(sinirli.kayitlar.length));
  rapor.kontrol('Kaç adres bulunduğu raporlanıyor', sinirli.bulunan === 2, String(sinirli.bulunan));

  rapor.baslik('robots taramayı yasaklarsa');
  const ag5 = sahteAg();
  ag5.getir = async (adres) => {
    if (/robots\.txt$/.test(adres)) return { ok: false, status: 503, text: async () => '' };
    throw new Error('buraya hiç gelinmemeli');
  };
  const yasak = await siteyiTara(env, SITE, { getir: ag5.getir, gorulen: new Set() });
  rapor.kontrol('Site atlandı', yasak.atlandi === true, yasak.sebep);
  rapor.kontrol('Sebep raporlandı', /503/.test(yasak.sebep), yasak.sebep);
  rapor.kontrol('Hiç kayıt üretilmedi', yasak.kayitlar.length === 0);

  rapor.baslik('sayfa patlarsa tur sürüyor');
  const ag6 = sahteAg({ sayfaDurum: 500 });
  const patlak = await siteyiTara(env, SITE, { getir: ag6.getir, gorulen: new Set() });
  rapor.kontrol('Kayıt üretilmedi ama çökmedi', patlak.kayitlar.length === 0);
  rapor.kontrol('Hata sayılıyor', patlak.hata === 2, String(patlak.hata));

  rapor.baslik('şüpheli değer uyarıya dönüyor');
  const ag7 = sahteAg({ sayfa: SAYFA.replace('380 kcal', '1.240 kcal') });
  const supheli = await siteyiTara(env, SITE, { getir: ag7.getir, gorulen: new Set() });
  rapor.kontrol('Aşırı kalori uyarı üretti',
    /kcal değeri 1240/.test(supheli.kayitlar[0].uyari), supheli.kayitlar[0].uyari);

  rapor.baslik('besin tablosu yoksa');
  const ag8 = sahteAg({ sayfa: '<h1>Shaker 700 ml</h1>' });
  const tablosuz = await siteyiTara(env, SITE, { getir: ag8.getir, gorulen: new Set() });
  rapor.kontrol('Kayıt yine geliyor', tablosuz.kayitlar.length === 2);
  rapor.kontrol('Tablo bulunamadığı söyleniyor',
    /Besin tablosu bulunamadı/.test(tablosuz.kayitlar[0].deger),
    tablosuz.kayitlar[0].deger);

  // ── TAM TUR ────────────────────────────────────
  rapor.baslik('tam tur onay kuyruğuna yazıyor');
  const ag9 = sahteAg();
  const tam = await calistir(env, { getir: ag9.getir, siteler: [SITE] });
  rapor.kontrol('Kuyruğa düştü', tam.toplam === 2, JSON.stringify({ toplam: tam.toplam }));
  rapor.kontrol('Site raporu dönüyor', tam.siteler.length === 1 && tam.siteler[0].site === 'ornek');
  const kuyruk = await bekleyenleriOku(env, 'takviye');
  rapor.kontrol('Kayıtlar takviye ajanına ait', kuyruk.every(k => k.ajan === 'takviye'));
  rapor.kontrol('Hepsi şüpheli', kuyruk.every(k => k.supheli === true));

  rapor.baslik('ziyaret geçmişi KV\'de');
  const goruldu = await env.REMINDERS.get(ZIYARET_ANAHTARI, 'json');
  rapor.kontrol('Adresler saklandı', Array.isArray(goruldu) && goruldu.length === 2,
    String(goruldu && goruldu.length));
  const ag10 = sahteAg();
  const ikinci = await calistir(env, { getir: ag10.getir, siteler: [SITE] });
  rapor.kontrol('İkinci tur yeni kayıt üretmiyor', ikinci.yeni === 0, JSON.stringify(ikinci.yeni));

  // ── İNDEKS ÇOCUKLARI DA İZİN LİSTESİNE TABİ ────
  /* Sitemap indeksi başka bir host'a işaret edebilir. Eskiden yalnız ürün
     adresleri denetleniyor, indeks çocukları denetimsiz kuyruğa giriyordu —
     ajan izin listesi dışına istek atabilirdi. */
  rapor.baslik('sitemap indeksi izin listesini aşamıyor');
  const kacakIndeks = `<?xml version="1.0"?><sitemapindex>
    <sitemap><loc>${KOK}/harita-1.xml</loc></sitemap>
    <sitemap><loc>https://kotu-site.dev/harita.xml</loc></sitemap>
  </sitemapindex>`;
  const indeksIstekleri = [];
  const indeksAg = async (adres) => {
    indeksIstekleri.push(String(adres));
    const yaz = (m, d = 200) => ({ ok: d < 300, status: d, text: async () => m });
    if (/robots\.txt$/.test(adres)) return yaz('User-agent: *\n');
    if (/harita-1\.xml$/.test(adres)) return yaz(HARITA);
    if (/sitemap\.xml$/.test(adres)) return yaz(kacakIndeks);
    if (/kotu-site/.test(adres)) return yaz('<urlset><url><loc>https://kotu-site.dev/u/1</loc></url></urlset>');
    return yaz(SAYFA);
  };
  const indeksSonuc = await adresleriKesfet(SITE, { getir: indeksAg, kurallar: null });
  rapor.kontrol('Yabancı host\'a hiç istek gitmedi',
    !indeksIstekleri.some(a => a.includes('kotu-site')),
    indeksIstekleri.filter(a => a.includes('kotu-site')).join(', ') || 'gitmedi');
  rapor.kontrol('Kendi indeks çocuğu gezildi',
    indeksIstekleri.some(a => a.includes('harita-1.xml')));
  rapor.kontrol('Ürünler yine bulundu', indeksSonuc.length === 2, String(indeksSonuc.length));

  rapor.baslik('robots.txt site başına bir kez indiriliyor');
  const sayacAg = sahteAg();
  await siteyiTara(env, SITE, { getir: sayacAg.getir, gorulen: new Set(), enFazlaUrun: 1 });
  const robotsSayisi = sayacAg.istekler.filter(a => /robots\.txt$/.test(a)).length;
  rapor.kontrol('Tek istek', robotsSayisi === 1, String(robotsSayisi));

  // ── HOST EŞLEŞMESİ ─────────────────────────────
  /* Metin öneki kullanmak izin listesini deliyordu:
       "https://www.ornek.dev" öneki
         "https://www.ornek.dev.saldirgan.dev/x"  adresine de uyuyor
         "https://www.ornek.dev@evil.dev/x"       adresine de.
     İkisi de ajanı izin listesi dışına çıkarırdı. */
  rapor.baslik('izin listesi host\'a bakıyor, metin önekine değil');
  rapor.kontrol('Kendi adresi geçiyor', ayniSite(SITE, KOK + '/urun/whey') === true);
  rapor.kontrol('Alan adı uzantısı engelleniyor',
    ayniSite(SITE, 'https://www.ornek.dev.saldirgan.dev/urun/x') === false);
  rapor.kontrol('Kullanıcı adı hilesi engelleniyor',
    ayniSite(SITE, 'https://www.ornek.dev@evil.dev/urun/x') === false);
  rapor.kontrol('Alt alan adı engelleniyor',
    ayniSite(SITE, 'https://kotu.www.ornek.dev/urun/x') === false);
  rapor.kontrol('http engelleniyor', ayniSite(SITE, 'http://www.ornek.dev/urun/x') === false);
  rapor.kontrol('Bozuk adres engelleniyor', ayniSite(SITE, 'bu adres değil') === false);

  rapor.baslik('kaçak sitemap indeksi durduruluyor');
  const kacakXml = `<?xml version="1.0"?><sitemapindex>
    <sitemap><loc>https://www.ornek.dev.saldirgan.dev/harita.xml</loc></sitemap>
    <sitemap><loc>https://www.ornek.dev@evil.dev/harita.xml</loc></sitemap>
  </sitemapindex>`;
  const kacakIstekler = [];
  const kacakSonuc = await adresleriKesfet(SITE, {
    getir: async (adres) => {
      kacakIstekler.push(String(adres));
      const yaz = m => ({ ok: true, status: 200, text: async () => m });
      if (/sitemap\.xml$/.test(adres)) return yaz(kacakXml);
      return yaz('<urlset></urlset>');
    },
    kurallar: null
  });
  rapor.kontrol('Saldırgan host\'a istek gitmedi',
    !kacakIstekler.some(a => /saldirgan|evil/.test(a)),
    kacakIstekler.join(', '));
  rapor.kontrol('Hiç adres bulunmadı', kacakSonuc.length === 0, String(kacakSonuc.length));
}
