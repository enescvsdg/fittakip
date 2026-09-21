/* Ürün sayfasından besin değeri çıkarma.

   DÜRÜST SINIR: bu mantık gerçek sitelere karşı ayarlanmadı — yazıldığı
   ortamdan o sitelere çıkış yoktu. Buradaki HTML'ler yaygın kalıpları temsil
   ediyor. Gerçek turda her site ayrı doğrulanmalı.

   En çok önemsediğimiz şey sessiz yanlış: 1.240 kcal'i 1,240 sanmak ya da
   "doymuş yağ" satırını toplam yağ sanmak gözle fark edilmez ve kullanıcının
   kalori hesabını bozar. */
import {
  sayiCoz, alanTani, kcalCoz, jsonLdUrun, tablodanOku,
  porsiyonOku, degerleriDenetle, sayfadanCikar,
  jsonLdBesin, listedenOku, taniCikar
} from '../../worker/src/besin-ayikla.js';

export default async function ({ rapor }) {
  rapor.baslik('Türkçe sayı okuma');
  rapor.kontrol('Ondalık virgül', sayiCoz('12,5') === 12.5, String(sayiCoz('12,5')));
  rapor.kontrol('Düz sayı', sayiCoz('450') === 450);
  rapor.kontrol('Binlik nokta', sayiCoz('1.240') === 1240, String(sayiCoz('1.240')));
  rapor.kontrol('Binlik + ondalık', sayiCoz('1.240,5') === 1240.5, String(sayiCoz('1.240,5')));
  rapor.kontrol('İngiliz ondalığı', sayiCoz('12.5') === 12.5, String(sayiCoz('12.5')));
  rapor.kontrol('Birim ekli metin', sayiCoz('24 g protein') === 24);
  rapor.kontrol('Sayı yoksa null', sayiCoz('eser miktarda') === null);
  rapor.kontrol('Boş metin null', sayiCoz('') === null);
  rapor.kontrol('Hazır sayı geçiyor', sayiCoz(7.5) === 7.5);

  rapor.baslik('enerji birimi');
  rapor.kontrol('kcal okunuyor', kcalCoz('450 kcal') === 450);
  rapor.kontrol('cal de kcal sayılıyor', kcalCoz('380 Cal') === 380);
  rapor.kontrol('kJ kcal\'e çevriliyor', kcalCoz('1880 kJ') === 449, String(kcalCoz('1880 kJ')));
  rapor.kontrol('İkisi birlikteyse kcal kazanıyor',
    kcalCoz('1880 kJ / 450 kcal') === 450, String(kcalCoz('1880 kJ / 450 kcal')));

  rapor.baslik('etiket tanıma');
  rapor.kontrol('Enerji', alanTani('Enerji') === 'kcal');
  rapor.kontrol('Kalori', alanTani('Kalori (kcal)') === 'kcal');
  rapor.kontrol('Protein', alanTani('Protein') === 'protein');
  rapor.kontrol('Karbonhidrat', alanTani('Karbonhidrat') === 'carbs');
  rapor.kontrol('Yağ', alanTani('Yağ') === 'fat');
  rapor.kontrol('Lif', alanTani('Lif') === 'lif');
  rapor.kontrol('Tanınmayan satır atlanıyor', alanTani('L-Karnitin') === null);

  rapor.baslik('alt kalemler toplamı bozmuyor');
  /* "Yağ 9 g / — doymuş yağ 1,2 g" iki ayrı satır. İkincisi toplam yağ
     sanılırsa değer üçte bire düşer ve bu gözle fark edilmez. */
  rapor.kontrol('Doymuş yağ ayrı sayılmıyor', alanTani('- doymuş yağ') === null);
  rapor.kontrol('Saturated de atlanıyor', alanTani('Saturated Fat') === null);
  rapor.kontrol('Trans yağ atlanıyor', alanTani('Trans yağ') === null);

  rapor.baslik('besin tablosu');
  const tablo = `
    <table class="besin">
      <tr><th>Besin Değerleri</th><th>100 g</th><th>Porsiyon</th></tr>
      <tr><td>Enerji</td><td>1.880 kJ / 450 kcal</td><td>135 kcal</td></tr>
      <tr><td>Protein</td><td>24,5 g</td><td>7,4 g</td></tr>
      <tr><td>Karbonhidrat</td><td>60,1 g</td><td>18 g</td></tr>
      <tr><td>&nbsp;- şeker</td><td>3,2 g</td><td>1 g</td></tr>
      <tr><td>Yağ</td><td>9,0 g</td><td>2,7 g</td></tr>
      <tr><td>- doymuş yağ</td><td>1,2 g</td><td>0,4 g</td></tr>
      <tr><td>L-Karnitin</td><td>500 mg</td><td>150 mg</td></tr>
    </table>`;
  const tabloSonuc = tablodanOku(tablo);
  const okunan = tabloSonuc.degerler;
  rapor.kontrol('Enerji kcal olarak alındı', okunan.kcal === 450, String(okunan.kcal));
  rapor.kontrol('Protein ondalıklı okundu', okunan.protein === 24.5, String(okunan.protein));
  rapor.kontrol('Karbonhidrat okundu', okunan.carbs === 60.1, String(okunan.carbs));
  rapor.kontrol('Toplam yağ alındı, doymuş değil', okunan.fat === 9, String(okunan.fat));
  rapor.kontrol('Şeker ayrı alan olarak var', okunan.seker === 3.2, String(okunan.seker));
  rapor.kontrol('İlk sütun alınıyor, porsiyon değil', okunan.kcal !== 135);
  rapor.kontrol('Tanınmayan satır dışarıda',
    Object.keys(okunan).join(',') === 'kcal,protein,carbs,seker,fat',
    Object.keys(okunan).join(','));

  rapor.baslik('değerlerin tabanı okunuyor');
  /* 100 g'lık değerleri 30 g'lık porsiyonla kıyaslarsak her ürün "makro
     toplamı fazla" diye hatalı işaretlenir. Taban sütun başlığından geliyor. */
  rapor.kontrol('Sütun başlığından 100 g okundu',
    tabloSonuc.temel.gram === 100, JSON.stringify(tabloSonuc.temel));
  const porsiyonTablo = tablodanOku(`
    <table><tr><th>Besin</th><th>1 ölçek (30 g)</th></tr>
    <tr><td>Enerji</td><td>120 kcal</td></tr>
    <tr><td>Protein</td><td>24 g</td></tr></table>`);
  rapor.kontrol('Porsiyon tabanı gramıyla okunuyor',
    porsiyonTablo.temel.gram === 30 && porsiyonTablo.temel.tur === 'porsiyon',
    JSON.stringify(porsiyonTablo.temel));
  const basliksiz = tablodanOku(`
    <table><tr><td>Enerji</td><td>450 kcal</td></tr>
    <tr><td>Protein</td><td>24 g</td></tr></table>`);
  rapor.kontrol('Başlık yoksa 100 g varsayılıyor',
    basliksiz.temel.gram === 100, JSON.stringify(basliksiz.temel));

  rapor.baslik('ilgisiz tablo atlanıyor');
  rapor.kontrol('Kargo tablosu okunmuyor',
    tablodanOku('<table><tr><td>Kargo</td><td>Ücretsiz</td></tr></table>') === null);
  rapor.kontrol('Tablo yoksa null', tablodanOku('<div>Protein tozu</div>') === null);
  rapor.kontrol('Tek alanlı tablo yetersiz sayılıyor',
    tablodanOku('<table><tr><td>Protein</td><td>24 g</td></tr></table>') === null);

  rapor.baslik('JSON-LD ürün');
  const ld = `<script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Product","name":"Kingsize Whey Protein 1 kg",
     "brand":{"@type":"Brand","name":"Kingsize"},"sku":"KS-WP-1000"}
  </script>`;
  const urun = jsonLdUrun(ld);
  rapor.kontrol('Ürün bulundu', urun && urun.name === 'Kingsize Whey Protein 1 kg', urun && urun.name);
  rapor.kontrol('Marka nesnesi okunuyor', urun.brand.name === 'Kingsize');

  const grafta = `<script type="application/ld+json">
    {"@graph":[{"@type":"WebPage"},{"@type":["Product"],"name":"Grafikteki Ürün"}]}
  </script>`;
  rapor.kontrol('@graph içindeki ürün bulunuyor',
    jsonLdUrun(grafta).name === 'Grafikteki Ürün');
  rapor.kontrol('Bozuk JSON çökertmiyor',
    jsonLdUrun('<script type="application/ld+json">{bozuk</script>') === null);
  rapor.kontrol('Ürün olmayan blok atlanıyor',
    jsonLdUrun('<script type="application/ld+json">{"@type":"Article"}</script>') === null);

  rapor.baslik('porsiyon okuma');
  rapor.kontrol('Ölçek + gram',
    porsiyonOku('<p>1 ölçek (30 g) tüketiniz</p>').gram === 30);
  rapor.kontrol('Porsiyon: X gram',
    porsiyonOku('<p>Porsiyon: 25 gram</p>').gram === 25);
  rapor.kontrol('Ondalıklı porsiyon',
    porsiyonOku('<p>Servis 32,5 g</p>').gram === 32.5);
  rapor.kontrol('Porsiyon yoksa null', porsiyonOku('<p>Lezzetli protein</p>') === null);

  rapor.baslik('değer denetimi');
  rapor.kontrol('Makul değerlerde sorun yok',
    degerleriDenetle({ kcal: 120, protein: 24, carbs: 3, fat: 1.5 }, 30).length === 0);
  const yuksek = degerleriDenetle({ kcal: 1240 }, 150);
  rapor.kontrol('Aşırı kalori yakalanıyor', yuksek.length === 1, yuksek[0]);
  rapor.kontrol('Olası sebep söyleniyor',
    /birden fazla ölçek/.test(yuksek[0]), yuksek[0]);
  const makro = degerleriDenetle({ protein: 60, carbs: 40, fat: 20 }, 100);
  rapor.kontrol('Makro toplamı tabanı aşarsa yakalanıyor',
    makro.some(s => /Makro toplamı/.test(s)), makro.join(' | '));
  rapor.kontrol('100 g tabanlı normal ürün temiz geçiyor',
    degerleriDenetle({ protein: 24.5, carbs: 60.1, fat: 9 }, 100).length === 0);
  rapor.kontrol('Negatif değer yakalanıyor',
    degerleriDenetle({ protein: -5 }, 30).length === 1);

  rapor.baslik('tam sayfa');
  const sayfa = `<html><head>${ld}</head><body>
    <h1>Kingsize Whey Protein</h1>
    <p>Bir servis 30 gram, günde 1-2 ölçek.</p>
    ${tablo}
  </body></html>`;
  const cikan = sayfadanCikar(sayfa, 'https://ornek.dev/urun/kingsize');
  rapor.kontrol('Ad JSON-LD\'den geliyor',
    cikan.ad === 'Kingsize Whey Protein 1 kg', cikan.ad);
  rapor.kontrol('Marka alındı', cikan.marka === 'Kingsize');
  rapor.kontrol('Adres taşınıyor', cikan.adres === 'https://ornek.dev/urun/kingsize');
  rapor.kontrol('Besin değerleri var', cikan.besin.protein === 24.5);
  rapor.kontrol('Porsiyon bulundu', cikan.porsiyon.gram === 30, JSON.stringify(cikan.porsiyon));
  rapor.kontrol('Taban porsiyonla karıştırılmıyor',
    cikan.temel.gram === 100, JSON.stringify(cikan.temel));
  rapor.kontrol('Sorun listesi boş', cikan.sorunlar.length === 0, cikan.sorunlar.join(' | '));

  rapor.baslik('JSON-LD yoksa h1\'e düşüyor');
  const ldsiz = sayfadanCikar('<h1>  Hardline Kreatin  </h1>' + tablo, 'https://x.dev/k');
  rapor.kontrol('Başlık h1\'den alındı', ldsiz.ad === 'Hardline Kreatin', ldsiz.ad);
  rapor.kontrol('Marka null kalıyor', ldsiz.marka === null);

  rapor.baslik('ad bulunamazsa kayıt üretilmiyor');
  rapor.kontrol('Başlıksız sayfa null dönüyor',
    sayfadanCikar('<div>' + tablo + '</div>', 'https://x.dev/y') === null);

  rapor.baslik('besin tablosu olmayan ürün');
  const tablosuz = sayfadanCikar('<h1>Shaker</h1><p>700 ml</p>', 'https://x.dev/shaker');
  rapor.kontrol('Kayıt yine üretiliyor', tablosuz.ad === 'Shaker');
  rapor.kontrol('Besin null', tablosuz.besin === null);
  rapor.kontrol('Sorun listesi boş', tablosuz.sorunlar.length === 0);

  // ── ÜÇ ÇIKARIM YOLU ────────────────────────────
  /* Tek bir yapıya bel bağlamak riskli: Türk e-ticaret temaları besin
     değerlerini tabloya, tanım listesine ya da yan yana iki kutuya koyuyor.
     Bir de schema.org/NutritionInformation var — varsa en temizi. */
  rapor.baslik('JSON-LD besin bilgisi');
  const ldBesin = jsonLdBesin({
    '@type': 'Product', name: 'X',
    nutrition: {
      '@type': 'NutritionInformation',
      calories: '380 kcal', proteinContent: '78 g',
      carbohydrateContent: '8 g', fatContent: '5 g', servingSize: '100 g'
    }
  });
  rapor.kontrol('Değerler okunuyor',
    ldBesin.degerler.kcal === 380 && ldBesin.degerler.protein === 78,
    JSON.stringify(ldBesin.degerler));
  rapor.kontrol('Taban servingSize\'dan geliyor', ldBesin.temel.gram === 100,
    JSON.stringify(ldBesin.temel));
  rapor.kontrol('nutrition yoksa null', jsonLdBesin({ name: 'X' }) === null);
  rapor.kontrol('Tek alanlı nutrition yetersiz',
    jsonLdBesin({ nutrition: { calories: '100 kcal' } }) === null);

  rapor.baslik('tanım listesi');
  const dl = listedenOku(`<dl>
    <dt>Enerji</dt><dd>450 kcal</dd>
    <dt>Protein</dt><dd>24,5 g</dd>
    <dt>Karbonhidrat</dt><dd>60 g</dd>
    <dt>Menşei</dt><dd>Türkiye</dd>
  </dl>`);
  rapor.kontrol('Değerler okunuyor',
    dl.degerler.kcal === 450 && dl.degerler.protein === 24.5, JSON.stringify(dl.degerler));
  rapor.kontrol('İlgisiz satır atlanıyor', dl.degerler.mensei === undefined);

  rapor.baslik('yan yana kutular');
  const kutu = listedenOku(`
    <li><span>Protein</span><span>24 g</span></li>
    <li><span>Enerji</span><span>380 kcal</span></li>
    <li><span>Kargo</span><span>Ücretsiz</span></li>`);
  rapor.kontrol('İki kutulu satır okunuyor',
    kutu.degerler.protein === 24 && kutu.degerler.kcal === 380,
    JSON.stringify(kutu.degerler));
  rapor.kontrol('Sayısız satır atlanıyor', kutu.degerler.kargo === undefined);
  rapor.kontrol('Hiçbiri yoksa null', listedenOku('<div>Lezzetli</div>') === null);

  rapor.baslik('yöntem sırası');
  /* JSON-LD varsa o kazanmalı: en az tahmin içeren yol. */
  const ucuBirden = `<html><head>
    <script type="application/ld+json">
     {"@type":"Product","name":"Çoklu","nutrition":{"calories":"111 kcal","proteinContent":"11 g"}}
    </script></head><body>
    <table><tr><td>Enerji</td><td>222 kcal</td></tr><tr><td>Protein</td><td>22 g</td></tr></table>
    </body></html>`;
  const secilen = sayfadanCikar(ucuBirden, 'https://x.dev/u');
  rapor.kontrol('JSON-LD tabloyu yeniyor', secilen.besin.kcal === 111,
    String(secilen.besin.kcal));
  rapor.kontrol('Hangi yöntemin kullanıldığı raporlanıyor',
    secilen.yontem === 'json-ld', String(secilen.yontem));

  // ── TEŞHİS ─────────────────────────────────────
  /* Gerçek sayfalara erişimimiz yok. Çıkarım tutmazsa NEDEN tutmadığını
     bilmek, ilk turdan sonra neyi düzelteceğimizi söyleyen tek şey. */
  rapor.baslik('teşhis raporu');
  const tani = taniCikar('<html><table></table><dl></dl>' +
    '<script type="application/ld+json">{}</script>' +
    '<p>Besin Değerleri: Enerji, Protein</p></html>', ['tablo:yok']);
  rapor.kontrol('Tablo sayılıyor', tani.tabloSayisi === 1, String(tani.tabloSayisi));
  rapor.kontrol('Tanım listesi sayılıyor', tani.tanimListesi === 1);
  rapor.kontrol('JSON-LD bloğu sayılıyor', tani.jsonLdBlogu === 1);
  rapor.kontrol('Besin sözcüğü aranıyor', tani.besinKelimesi === true);
  rapor.kontrol('Protein sözcüğü aranıyor', tani.proteinKelimesi === true);
  rapor.kontrol('Denenen yollar taşınıyor', tani.denenen.join(',') === 'tablo:yok');
  rapor.kontrol('Sayfa önizlemesi var', tani.onizleme.includes('Besin Değerleri'),
    tani.onizleme.slice(0, 40));

  rapor.baslik('değer bulunamayınca teşhis üretiliyor');
  const bulunamadi = sayfadanCikar('<h1>Shaker</h1><p>' + 'x'.repeat(3000) + '</p>',
    'https://x.dev/shaker');
  rapor.kontrol('Kayıt yine üretiliyor', bulunamadi.ad === 'Shaker');
  rapor.kontrol('Teşhis dolduruluyor', bulunamadi.tani !== null && bulunamadi.tani.uzunluk > 3000);
  rapor.kontrol('Üç yolun da denendiği yazıyor',
    bulunamadi.tani.denenen.length === 3, bulunamadi.tani.denenen.join(', '));
}
