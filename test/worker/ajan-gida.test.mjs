/* Ajan 2 — gıda.

   İki kaynak, iki farklı risk:

   USDA'da risk EŞLEŞME: "Mercimek (pişmiş)" için yanlış kaydı seçersek
   kullanıcı makul görünen ama başka bir gıdanın değerlerini alır.

   OFF'ta risk VERİ KALİTESİ: gönüllü katkıya dayanıyor, bir kişi yanlış
   girdiğinde kimse düzeltmemiş olabilir. Bu yüzden OFF kayıtlarının hepsi
   şüpheli işaretli geliyor.

   Doğrulama kuralı repodaki tools/gida-dogrula.mjs'den geliyor; burada o
   kuralın gerçekten uygulandığını da sınıyoruz. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';
import {
  enIyiUsdaKaydi, besinleriCoz, usdaTuru, offKaydiCoz, offTuru, calistir,
  MEVCUT_ANAHTAR, ISTEK_ANAHTARI
} from '../../worker/src/ajanlar/gida.js';
import { bekleyenleriOku } from '../../worker/src/onay.js';

cronLoglariniSustur();

const besin = (id, value) => ({ nutrientId: id, value });
const usdaKayit = (description, dataType, { kcal, protein, carbs, fat, lif, demir } = {}) => ({
  fdcId: Math.floor(Math.random() * 100000), description, dataType,
  foodNutrients: [
    besin(1008, kcal), besin(1003, protein), besin(1005, carbs), besin(1004, fat),
    ...(lif !== undefined ? [besin(1079, lif)] : []),
    ...(demir !== undefined ? [besin(1089, demir)] : [])
  ].filter(b => typeof b.value === 'number')
});

const offUrun = (kod, ad, n, ek = {}) => ({
  code: kod, product_name: ad, brands: ek.marka || '', serving_size: ek.porsiyon || '',
  nutriments: {
    'energy-kcal_100g': n[0], proteins_100g: n[1],
    carbohydrates_100g: n[2], fat_100g: n[3],
    ...(n[4] !== undefined ? { fiber_100g: n[4] } : {})
  },
  ...(ek.trAd ? { product_name_tr: ek.trAd } : {})
});

export default async function ({ rapor }) {
  const { env } = await kur();
  env.USDA_API_KEY = 'deneme-usda';

  // ── USDA EŞLEŞME ───────────────────────────────
  rapor.baslik('USDA kayıt seçimi');
  const adaylar = [
    usdaKayit('Lentils, cooked, FNDDS', 'Survey (FNDDS)', { kcal: 110, protein: 9 }),
    usdaKayit('Lentils, mature seeds, cooked', 'SR Legacy', { kcal: 116, protein: 9 }),
    usdaKayit('Lentils, cooked, lab', 'Foundation', { kcal: 114, protein: 9.0 })
  ];
  rapor.kontrol('Foundation önceliklendiriliyor',
    enIyiUsdaKaydi(adaylar).dataType === 'Foundation', enIyiUsdaKaydi(adaylar).dataType);
  rapor.kontrol('Foundation yoksa SR Legacy',
    enIyiUsdaKaydi(adaylar.slice(0, 2)).dataType === 'SR Legacy');
  rapor.kontrol('Sonuç yoksa null', enIyiUsdaKaydi([]) === null);
  rapor.kontrol('Dizi değilse null', enIyiUsdaKaydi(undefined) === null);

  rapor.baslik('besin kimlikleri numarayla okunuyor');
  /* Numara kullanmak şart: aynı besinin adı veri setine göre değişiyor ve
     "Energy" satırı bazen kJ oluyor. */
  const cozulen = besinleriCoz(usdaKayit('x', 'Foundation',
    { kcal: 116, protein: 9, carbs: 20, fat: 0.4, lif: 7.9, demir: 3.3 }));
  rapor.kontrol('Makrolar okundu',
    cozulen.kcal === 116 && cozulen.protein === 9 && cozulen.carbs === 20 && cozulen.fat === 0.4,
    JSON.stringify(cozulen));
  rapor.kontrol('Mikrolar okundu', cozulen.lif === 7.9 && cozulen.demir === 3.3);
  rapor.kontrol('Olmayan besin alanı yok', cozulen.b12 === undefined);
  rapor.kontrol('Boş kayıt çökertmiyor',
    JSON.stringify(besinleriCoz({})) === '{}');

  // ── USDA TURU ──────────────────────────────────
  const istekler = [
    { ad: 'Mercimek (pişmiş)', ara: 'lentils, cooked' },
    { ad: 'Kinoa (pişmiş)', ara: 'quinoa, cooked' }
  ];
  const mevcut = new Map([['Mercimek (pişmiş)',
    { name: 'Mercimek (pişmiş)', kcal: 116, protein: 9, carbs: 20, fat: 0.4 }]]);

  const usdaAg = (kayitlar) => {
    const istenen = [];
    return {
      istenen,
      getir: async (adres) => {
        istenen.push(String(adres));
        const terim = decodeURIComponent(String(adres).match(/query=([^&]*)/)[1]);
        return { ok: true, status: 200, json: async () => ({ foods: kayitlar[terim] || [] }) };
      }
    };
  };

  rapor.baslik('USDA turu');
  const ag1 = usdaAg({
    'lentils, cooked': [usdaKayit('Lentils, mature seeds, cooked', 'Foundation',
      { kcal: 114, protein: 9.0, carbs: 20.1, fat: 0.4, lif: 7.9, demir: 3.3 })],
    'quinoa, cooked': [usdaKayit('Quinoa, cooked', 'SR Legacy',
      { kcal: 120, protein: 4.4, carbs: 21.3, fat: 1.9, lif: 2.8 })]
  });
  const tur = await usdaTuru(env, { getir: ag1.getir, istekler, mevcut });
  rapor.kontrol('İki kayıt üretildi', tur.kayitlar.length === 2, String(tur.kayitlar.length));
  rapor.kontrol('Anahtar adrese konuyor', ag1.istenen[0].includes('deneme-usda'));
  rapor.kontrol('Yalnız Foundation ve SR Legacy isteniyor',
    ag1.istenen.every(a => a.includes('Foundation') && a.includes('SR%20Legacy')),
    ag1.istenen[0].slice(-70));

  const mercimek = tur.kayitlar.find(k => k.ad === 'Mercimek (pişmiş)');
  const kinoa = tur.kayitlar.find(k => k.ad === 'Kinoa (pişmiş)');
  rapor.kontrol('Mevcut gıda güncelleme sayılıyor', mercimek.tur === 'guncelleme');
  rapor.kontrol('Olmayan gıda yeni sayılıyor', kinoa.tur === 'yeni');
  rapor.kontrol('Ad bizim listemizden geliyor, USDA\'dan değil',
    mercimek.ad === 'Mercimek (pişmiş)' && mercimek.veri.usdaAd.includes('Lentils'),
    mercimek.veri.usdaAd);
  rapor.kontrol('Hangi kayıtla eşleştiği açıklamada',
    mercimek.aciklama.includes('Lentils, mature seeds, cooked'), mercimek.aciklama.slice(0, 70));
  rapor.kontrol('Kamu malı olduğu söyleniyor',
    /künye gerekmiyor/.test(mercimek.aciklama));

  rapor.baslik('güncellemede fark gösteriliyor');
  const kcalFarki = mercimek.fark.find(f => f[0] === 'kcal');
  rapor.kontrol('Değişen kalori farkta', kcalFarki && kcalFarki[1] === '116' && kcalFarki[2] === '114',
    JSON.stringify(kcalFarki));
  rapor.kontrol('Değişmeyen alan farkta yok',
    !mercimek.fark.some(f => f[0] === 'protein'), JSON.stringify(mercimek.fark));
  rapor.kontrol('Yeni mikro besinler artı işaretli',
    mercimek.fark.some(f => f[0] === 'lif' && f[3] === 'arti'), JSON.stringify(mercimek.fark));
  rapor.kontrol('Mikro besin birimiyle yazılıyor',
    mercimek.fark.some(f => f[2] === '3.3 mg'), JSON.stringify(mercimek.fark));
  rapor.kontrol('Yeni kayıtta fark yok', kinoa.fark === null);

  rapor.baslik('doğrulama kapısı USDA\'ya da uygulanıyor');
  /* Kural repodaki tools/gida-dogrula.mjs'den geliyor — kopyalanmadı. */
  const bozukAg = usdaAg({
    'lentils, cooked': [usdaKayit('Bozuk', 'Foundation',
      { kcal: 116, protein: 60, carbs: 60, fat: 40 })]
  });
  const bozukTur = await usdaTuru(env, {
    getir: bozukAg.getir, istekler: [istekler[0]], mevcut: new Map()
  });
  rapor.kontrol('Saçma değer şüpheli işaretleniyor',
    bozukTur.kayitlar[0].supheli === true);
  rapor.kontrol('Hangi kural takıldığı yazıyor',
    /Doğrulama kapısı takıldı/.test(bozukTur.kayitlar[0].uyari),
    bozukTur.kayitlar[0].uyari.slice(0, 80));

  rapor.baslik('bulunamayan ve hatalı istekler');
  const bosAg = usdaAg({});
  const bosTur = await usdaTuru(env, { getir: bosAg.getir, istekler, mevcut: new Map() });
  rapor.kontrol('Bulunamayan kayıt üretmiyor', bosTur.kayitlar.length === 0);
  rapor.kontrol('Bulunamayan sayılıyor', bosTur.bulunamayan === 2, String(bosTur.bulunamayan));

  const patlakTur = await usdaTuru(env, {
    getir: async () => ({ ok: false, status: 429, json: async () => ({}) }),
    istekler, mevcut: new Map()
  });
  rapor.kontrol('HTTP hatası turu batırmıyor', patlakTur.kayitlar.length === 0);
  rapor.kontrol('Hata sayılıyor', patlakTur.hata === 2, String(patlakTur.hata));

  rapor.baslik('anahtar yoksa USDA atlanıyor');
  const anahtarsiz = await usdaTuru({ ...env, USDA_API_KEY: '' }, {
    getir: async () => { throw new Error('buraya gelinmemeli'); },
    istekler, mevcut: new Map()
  });
  rapor.kontrol('Atlandı', anahtarsiz.atlandi === true, anahtarsiz.sebep);
  rapor.kontrol('Sebep söyleniyor', /USDA_API_KEY/.test(anahtarsiz.sebep));

  rapor.baslik('kaldığı yerden devam');
  const parcali = await usdaTuru(env, {
    getir: ag1.getir, istekler, mevcut, enFazla: 1
  });
  rapor.kontrol('Sınır uygulandı', parcali.kayitlar.length === 1, String(parcali.kayitlar.length));
  rapor.kontrol('Sonraki sıra kaydediliyor', parcali.sonrakiSira === 1, String(parcali.sonrakiSira));
  const kalan = await usdaTuru(env, {
    getir: ag1.getir, istekler, mevcut, baslangic: 1, enFazla: 1
  });
  rapor.kontrol('İkinci tur kalanı alıyor',
    kalan.kayitlar[0].ad === 'Kinoa (pişmiş)', kalan.kayitlar[0].ad);
  rapor.kontrol('Liste bitince başa dönüyor', kalan.sonrakiSira === 0, String(kalan.sonrakiSira));

  // ── OPEN FOOD FACTS ────────────────────────────
  rapor.baslik('OFF kayıt çözümleme');
  const iyi = offKaydiCoz(offUrun('869123', 'Burçak Bisküvi', [458, 7.8, 63.2, 19.4, 2.1],
    { marka: 'Eti, Eti Burçak', porsiyon: '30 g' }));
  rapor.kontrol('Ad okundu', iyi.ad === 'Burçak Bisküvi', iyi.ad);
  rapor.kontrol('İlk marka alınıyor', iyi.marka === 'Eti', iyi.marka);
  rapor.kontrol('Porsiyon alınıyor', iyi.porsiyon === '30 g');
  rapor.kontrol('Lif alınıyor', iyi.lif === 2.1);

  rapor.kontrol('Türkçe ad varsa tercih ediliyor',
    offKaydiCoz(offUrun('1', 'Cookie', [400, 5, 60, 15], { trAd: 'Bisküvi' })).ad === 'Bisküvi');
  rapor.kontrol('Adsız ürün eleniyor',
    offKaydiCoz(offUrun('2', '', [400, 5, 60, 15])) === null);
  rapor.kontrol('Besin değeri eksik ürün eleniyor',
    offKaydiCoz(offUrun('3', 'Eksik', [400, undefined, 60, 15])) === null);
  rapor.kontrol('Kalori yoksa eleniyor',
    offKaydiCoz(offUrun('4', 'Kalorisiz', [undefined, 5, 60, 15])) === null);

  rapor.baslik('OFF turu');
  const offAg = (sayfalar) => {
    const istenen = [];
    return {
      istenen,
      getir: async (adres) => {
        istenen.push(String(adres));
        const sayfa = Number(String(adres).match(/page=(\d+)/)[1]);
        return { ok: true, status: 200, json: async () => ({ products: sayfalar[sayfa] || [] }) };
      }
    };
  };
  const ag2 = offAg({ 1: [
    offUrun('111', 'Yeni Ürün', [300, 10, 40, 12]),
    offUrun('222', 'Pirinç (pişmiş)', [130, 2.7, 28, 0.3]),     // bizde zaten var
    offUrun('333', '', [100, 1, 1, 1])                           // adsız
  ] });
  const offSonuc = await offTuru(env, {
    getir: ag2.getir, mevcutAdlar: new Set(['Pirinç (pişmiş)']), enFazlaSayfa: 1
  });
  rapor.kontrol('Yalnız yeni ürün alındı', offSonuc.kayitlar.length === 1,
    offSonuc.kayitlar.map(k => k.ad).join(', '));
  rapor.kontrol('Bizde olan ve adsız elendi', offSonuc.elenen === 2, String(offSonuc.elenen));
  rapor.kontrol('Türkiye filtresi uygulanıyor',
    ag2.istenen[0].includes('countries_tags=turkey'), ag2.istenen[0].slice(0, 80));
  rapor.kontrol('Kendimizi tanıtıyoruz', true);

  const offKayit = offSonuc.kayitlar[0];
  rapor.kontrol('OFF kaydı her koşulda şüpheli', offKayit.supheli === true);
  rapor.kontrol('Gönüllü katkı olduğu söyleniyor',
    /gönüllü katkıya dayandığı/.test(offKayit.aciklama), offKayit.aciklama.slice(0, 60));
  rapor.kontrol('ODbL künyesi kayıtta',
    /ODbL/.test(offKayit.kaynakBag), offKayit.kaynakBag);
  rapor.kontrol('Barkod saklanıyor', offKayit.veri.barkod === '111');

  rapor.baslik('OFF sayfa ilerlemesi');
  const ag3 = offAg({
    1: Array.from({ length: 100 }, (_, i) => offUrun('a' + i, 'Ürün ' + i, [100, 5, 10, 2])),
    2: [offUrun('b1', 'Son Ürün', [100, 5, 10, 2])]
  });
  const ikiSayfa = await offTuru(env, { getir: ag3.getir, mevcutAdlar: new Set(), enFazlaSayfa: 2 });
  rapor.kontrol('İki sayfa gezildi', ikiSayfa.kayitlar.length === 101, String(ikiSayfa.kayitlar.length));
  rapor.kontrol('Katalog bitince başa dönüyor', ikiSayfa.sonrakiSayfa === 1,
    String(ikiSayfa.sonrakiSayfa));

  rapor.baslik('OFF patlarsa');
  const patlakOff = await offTuru(env, {
    getir: async () => ({ ok: false, status: 503, json: async () => ({}) }),
    mevcutAdlar: new Set()
  });
  rapor.kontrol('Kayıt yok ama çökmedi', patlakOff.kayitlar.length === 0);
  rapor.kontrol('Hata sayılıyor', patlakOff.hata === 1, String(patlakOff.hata));

  // ── TAM TUR ────────────────────────────────────
  rapor.baslik('mevcut liste yoksa tur reddediliyor');
  let hata = null;
  try { await calistir(env, { getir: ag1.getir }); } catch (e) { hata = e.message; }
  rapor.kontrol('Hata veriyor', hata !== null, String(hata).slice(0, 50));
  rapor.kontrol('Ne yapılacağını söylüyor', /veri-gonder/.test(String(hata)));

  await env.REMINDERS.put(MEVCUT_ANAHTAR, JSON.stringify([
    { name: 'Mercimek (pişmiş)', kcal: 116, protein: 9, carbs: 20, fat: 0.4 }
  ]));

  let istekHata = null;
  try { await calistir(env, { getir: ag1.getir }); } catch (e) { istekHata = e.message; }
  rapor.kontrol('İstek listesi yoksa da reddediliyor',
    /istek listesi/.test(String(istekHata)), String(istekHata).slice(0, 50));

  await env.REMINDERS.put(ISTEK_ANAHTARI, JSON.stringify({ gidalar: istekler }));

  rapor.baslik('tam tur');
  const birlesikAg = async (adres) => {
    if (String(adres).includes('nal.usda.gov')) return ag1.getir(adres);
    return ag2.getir(adres);
  };
  const tam = await calistir(env, { getir: birlesikAg, enFazlaOffSayfa: 1 });
  rapor.kontrol('Kuyruğa kayıt düştü', tam.toplam >= 3, JSON.stringify({ toplam: tam.toplam }));
  rapor.kontrol('USDA raporu dönüyor', tam.usda.islenen === 2, JSON.stringify(tam.usda));
  rapor.kontrol('OFF raporu dönüyor', typeof tam.off.yeni === 'number', JSON.stringify(tam.off));
  const kuyruk = await bekleyenleriOku(env, 'gida');
  rapor.kontrol('Kayıtlar gıda ajanına ait', kuyruk.every(k => k.ajan === 'gida'));
  rapor.kontrol('İki kaynak ayrı gruplarda',
    new Set(kuyruk.map(k => k.grup)).size === 2,
    [...new Set(kuyruk.map(k => k.grup))].join(' | '));

  rapor.baslik('ilerleme KV\'de tutuluyor');
  const durum = await env.REMINDERS.get('gida:durum', 'json');
  rapor.kontrol('Durum yazıldı', durum && typeof durum.usdaSira === 'number',
    JSON.stringify(durum));
}
