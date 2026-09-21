/* Onaylanan gıda kayıtlarının kaynak dosyaya işlenmesi.

   foods.js elle düzenlenmiyor — temel-gidalar.json'dan üretiliyor. Birleştirme
   de oraya yapılıyor, sonra gida-topla.mjs hem dosyayı yeniden üretiyor hem
   doğrulama kapısını çalıştırıyor.

   Buradaki asıl risk veri kaybı: mevcut bir kaydın üzerine yazarken onun
   USDA'dan gelmeyen alanlarını (yumurta boyları, tarif metni) silmemek. */
import { birlestir } from '../../tools/gida-birlestir.mjs';
import { gidaDogrula } from '../../tools/gida-dogrula.mjs';

const kayit = (veri, ek = {}) => ({ id: 'gida:x:' + veri.name, ad: veri.name, veri, ...ek });

const TEMEL = () => ([
  { ad: 'Tahıllar / Karbonhidrat', gidalar: [
    { name: 'Pirinç (pişmiş)', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, kaynak: 'elle' }
  ] },
  { ad: 'Et, Tavuk, Balık, Yumurta', gidalar: [
    { name: 'Yumurta (tam)', kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5, kaynak: 'elle',
      boylar: { S: 45, M: 55, L: 65 } },
    { name: 'Yayla Çorbası', kcal: 47, protein: 1.7, carbs: 5.1, fat: 2.2,
      kaynak: 'tarif', tarif: 'Yoğurt 400g, Pirinç 60g' }
  ] }
]);

const say = k => k.reduce((n, x) => n + x.gidalar.length, 0);
const bul = (k, ad) => k.flatMap(x => x.gidalar).find(g => g.name === ad);

export default async function ({ rapor }) {
  rapor.baslik('mevcut kaydı güncelleme');
  const g = birlestir(TEMEL(), [kayit({
    name: 'Pirinç (pişmiş)', kcal: 128, protein: 2.7, carbs: 28.2, fat: 0.3,
    mikro: { lif: 0.4, demir: 0.2 }, kaynak: 'usda', kategori: 'Tahıllar / Karbonhidrat'
  })]);
  rapor.kontrol('Liste büyümüyor', say(g.kategoriler) === 3, String(say(g.kategoriler)));
  rapor.kontrol('Değer güncellendi', bul(g.kategoriler, 'Pirinç (pişmiş)').kcal === 128);
  rapor.kontrol('Kaynak usda oldu', bul(g.kategoriler, 'Pirinç (pişmiş)').kaynak === 'usda');
  rapor.kontrol('Mikro besinler eklendi',
    bul(g.kategoriler, 'Pirinç (pişmiş)').mikro.demir === 0.2);
  rapor.kontrol('Sayaç doğru', g.rapor.guncellenen === 1 && g.rapor.eklenen === 0,
    JSON.stringify(g.rapor));

  rapor.baslik('USDA\'dan gelmeyen alanlar korunuyor');
  /* Yumurta boyları ve tarif metni bizim verimiz; USDA bunları bilmiyor.
     Üzerine yazarken silinirse yumurta adet seçimi ve tarif bilgisi kaybolur. */
  const y = birlestir(TEMEL(), [
    kayit({ name: 'Yumurta (tam)', kcal: 148, protein: 12.4, carbs: 0.7, fat: 9.9,
            kaynak: 'usda', kategori: 'Et, Tavuk, Balık, Yumurta' }),
    kayit({ name: 'Yayla Çorbası', kcal: 50, protein: 1.8, carbs: 5.2, fat: 2.3,
            kaynak: 'usda', kategori: 'Et, Tavuk, Balık, Yumurta' })
  ]);
  const yumurta = bul(y.kategoriler, 'Yumurta (tam)');
  rapor.kontrol('Yumurta boyları korundu',
    yumurta.boylar && yumurta.boylar.L === 65, JSON.stringify(yumurta.boylar));
  rapor.kontrol('Yeni kalori uygulandı', yumurta.kcal === 148);
  const corba = bul(y.kategoriler, 'Yayla Çorbası');
  rapor.kontrol('Tarif metni korundu',
    corba.tarif === 'Yoğurt 400g, Pirinç 60g', String(corba.tarif));

  rapor.baslik('yeni gıda ekleme');
  const yeni = birlestir(TEMEL(), [kayit({
    name: 'Kinoa (pişmiş)', kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.9,
    mikro: { lif: 2.8 }, kaynak: 'usda', kategori: 'Tahıllar / Karbonhidrat'
  })]);
  rapor.kontrol('Liste bir büyüdü', say(yeni.kategoriler) === 4, String(say(yeni.kategoriler)));
  rapor.kontrol('Doğru kategoriye gitti',
    yeni.kategoriler[0].gidalar.some(x => x.name === 'Kinoa (pişmiş)'),
    yeni.kategoriler[0].gidalar.map(x => x.name).join(', '));
  rapor.kontrol('Sayaç doğru', yeni.rapor.eklenen === 1);

  rapor.baslik('paketli ürün ayrı kategoriye gidiyor');
  /* Markalı ürünler genel gıdaların arasına karışırsa arama kutusu
     kullanılamaz hale geliyor. */
  const off = birlestir(TEMEL(), [kayit({
    name: 'Eti Burçak', kcal: 458, protein: 7.8, carbs: 63.2, fat: 19.4,
    kaynak: 'openfoodfacts', barkod: '869', kategori: 'Paketli Ürünler'
  })]);
  const paketli = off.kategoriler.find(k => k.ad === 'Paketli Ürünler');
  rapor.kontrol('Yeni kategori açıldı', !!paketli);
  rapor.kontrol('Ürün orada', paketli.gidalar[0].name === 'Eti Burçak');
  rapor.kontrol('Kaynak off olarak yazıldı', paketli.gidalar[0].kaynak === 'off',
    paketli.gidalar[0].kaynak);
  rapor.kontrol('Mevcut kategoriler bozulmadı',
    off.kategoriler.filter(k => k.ad === 'Tahıllar / Karbonhidrat').length === 1);

  rapor.baslik('eksik veri atlanıyor');
  const eksik = birlestir(TEMEL(), [
    kayit({ name: 'Yarım Kayıt', kcal: 100, protein: 5 }),
    kayit({ kcal: 100, protein: 5, carbs: 10, fat: 1 }),
    kayit({ name: 'Metin Değer', kcal: 'yüz', protein: 5, carbs: 10, fat: 1 })
  ]);
  rapor.kontrol('Üçü de atlandı', eksik.rapor.atlanan === 3, String(eksik.rapor.atlanan));
  rapor.kontrol('Dosyaya sızmadı', say(eksik.kategoriler) === 3);
  rapor.kontrol('Sebep yazılıyor',
    eksik.rapor.atlananlar.every(a => /besin değerleri eksik/.test(a)),
    eksik.rapor.atlananlar[0]);

  rapor.baslik('girdi değiştirilmiyor');
  const girdi = TEMEL();
  birlestir(girdi, [kayit({ name: 'Yeni', kcal: 100, protein: 5, carbs: 10, fat: 1,
                            kategori: 'Sebze' })]);
  rapor.kontrol('Özgün liste büyümedi', say(girdi) === 3, String(say(girdi)));

  rapor.baslik('çıkan kayıtlar doğrulama kapısından geçiyor');
  /* gida-topla.mjs birleştirmeden sonra bunu zaten çalıştırıyor; burada
     ürettiğimiz kayıt biçiminin o kapıya uyduğunu sınıyoruz. */
  const uretilen = birlestir(TEMEL(), [kayit({
    name: 'Mercimek (pişmiş)', kcal: 114, protein: 9, carbs: 20.1, fat: 0.4,
    mikro: { lif: 7.9 }, kaynak: 'usda', kategori: 'Bakliyat'
  })]);
  const mercimek = bul(uretilen.kategoriler, 'Mercimek (pişmiş)');
  rapor.kontrol('Doğrulama kapısı kabul ediyor',
    gidaDogrula(mercimek).length === 0, gidaDogrula(mercimek).join(' | '));
  rapor.kontrol('Kapı saçma değeri yine de eler',
    gidaDogrula({ name: 'Saçma', kcal: 116, protein: 60, carbs: 60, fat: 40 }).length > 0);
}
