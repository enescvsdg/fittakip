/* ══════════════════════════════════════════
   AJAN 2 — GIDA

   İki kaynak, iki farklı iş:

   USDA FoodData Central (kamu malı)
     Yönü tersine çevirdik: USDA'yı tarayıp Türkçeye çevirmek yerine, Türkçe
     istek listesini biz veriyoruz ve ajan her kalem için USDA'da karşılığını
     buluyor. Böylece isim çevirisi diye bir sorun kalmıyor ("Beef, round, top
     round roast, boneless, separable lean only..." çevrilecek bir şey değil)
     ve Türk mutfağında olmayan hiçbir şey listeye girmiyor.

   Open Food Facts (ODbL)
     Türkiye'de satılan paketli ürünler. Adları zaten Türkçe — paketin üstünde
     ne yazıyorsa o. ODbL künye şartı koşuyor; uygulamada kaynak gösterilecek.

   Doğrulama kuralı repodaki tools/gida-dogrula.mjs'den geliyor. Kopyalamak
   yerine aynı dosyayı kullanıyoruz ki kural tek yerde kalsın ve ikisi
   ayrışmasın.
   ══════════════════════════════════════════ */

import { gidaDogrula, makroTutarli } from '../../../tools/gida-dogrula.mjs';
import { turuYaz } from '../onay.js';

export const MEVCUT_ANAHTAR = 'mevcut:gida';
export const ISTEK_ANAHTARI = 'istek:usda';
export const OFF_SAYFA_ANAHTARI = 'off:sayfa';

export const USDA_UC = 'https://api.nal.usda.gov/fdc/v1/foods/search';
export const OFF_UC = 'https://world.openfoodfacts.org/api/v2/search';

/* Tur başına sınırlar. USDA'da her kalem ayrı bir istek; 94 kalemi bir gecede
   çekmek hem Worker süresini hem kotayı zorluyor. Nerede kalındığı KV'de
   tutuluyor, ertesi gece devam ediyor. */
export const TUR_BASINA_USDA = 25;
export const TUR_BASINA_OFF_SAYFA = 2;
export const OFF_SAYFA_BOYU = 100;

/* USDA besin kimlikleri. Numara kullanmak şart: aynı besinin adı veri setine
   göre değişiyor ("Energy" bazen kcal bazen kJ satırı oluyor). */
const BESIN_ID = {
  kcal: 1008, protein: 1003, fat: 1004, carbs: 1005,
  lif: 1079, demir: 1089, kalsiyum: 1087, b12: 1178, sodyum: 1093, potasyum: 1092
};

const MIKRO = ['lif', 'demir', 'kalsiyum', 'b12', 'sodyum', 'potasyum'];
const MIKRO_BIRIM = { lif: 'g', demir: 'mg', kalsiyum: 'mg', b12: 'µg', sodyum: 'mg', potasyum: 'mg' };

const yuvarla = (n, basamak = 1) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const k = Math.pow(10, basamak);
  return Math.round(n * k) / k;
};

/* ── USDA ───────────────────────────────────────── */

/* Arama sonucundan en iyi kaydı seçer. Foundation Foods laboratuvar ölçümü,
   SR Legacy daha geniş ama bir kısmı hesaplanmış — ilkini tercih ediyoruz. */
export function enIyiUsdaKaydi(sonuclar) {
  const liste = Array.isArray(sonuclar) ? sonuclar : [];
  if (!liste.length) return null;
  const oncelik = { 'Foundation': 0, 'SR Legacy': 1, 'Survey (FNDDS)': 2 };
  return liste.slice().sort((a, b) => {
    const pa = oncelik[a.dataType] ?? 9, pb = oncelik[b.dataType] ?? 9;
    return pa - pb;
  })[0];
}

export function besinleriCoz(kayit) {
  const besinler = Array.isArray(kayit && kayit.foodNutrients) ? kayit.foodNutrients : [];
  const harita = new Map();
  for (const b of besinler) {
    const id = b.nutrientId ?? (b.nutrient && b.nutrient.id);
    const deger = b.value ?? b.amount;
    if (typeof id === 'number' && typeof deger === 'number') {
      if (!harita.has(id)) harita.set(id, deger);
    }
  }
  const cikti = {};
  for (const [alan, id] of Object.entries(BESIN_ID)) {
    const d = harita.get(id);
    if (typeof d === 'number') cikti[alan] = yuvarla(d, alan === 'b12' ? 2 : 1);
  }
  return cikti;
}

function usdaKaydiUret(istek, secilen, besin, mevcutGida) {
  const temel = {
    name: istek.ad,
    kcal: besin.kcal, protein: besin.protein, carbs: besin.carbs, fat: besin.fat
  };
  const hatalar = gidaDogrula(temel);
  const tutarlilik = hatalar.length ? null : makroTutarli(temel);

  const mikro = {};
  for (const m of MIKRO) if (typeof besin[m] === 'number') mikro[m] = besin[m];

  const guncellemeMi = !!mevcutGida;
  const fark = [];
  if (guncellemeMi) {
    for (const [alan, etiket] of [['kcal', 'kcal'], ['protein', 'protein'],
                                 ['carbs', 'karbonhidrat'], ['fat', 'yağ']]) {
      const eski = mevcutGida[alan], yeni = temel[alan];
      if (typeof yeni !== 'number') continue;
      if (eski === yeni) continue;
      fark.push([etiket, String(eski), String(yeni), '']);
    }
    for (const m of MIKRO) {
      if (typeof mikro[m] !== 'number') continue;
      fark.push([m, '—', mikro[m] + ' ' + MIKRO_BIRIM[m], 'arti']);
    }
  }

  const ozet = ['kcal', 'protein', 'carbs', 'fat']
    .filter(a => typeof temel[a] === 'number')
    .map(a => temel[a] + (a === 'kcal' ? ' kcal' : ' g ' +
      ({ protein: 'protein', carbs: 'karbonhidrat', fat: 'yağ' })[a]))
    .join(' · ');

  return {
    id: 'gida:usda:' + istek.ad,
    tur: guncellemeMi ? 'guncelleme' : 'yeni',
    grup: 'USDA · temel malzeme',
    ad: istek.ad,
    deger: ozet + ' (100 g başına)',
    aciklama: 'USDA ' + (secilen.dataType || 'FoodData Central') + ' kaydı "' +
      (secilen.description || '') + '" ile eşleşti. Ad bizim istek listemizden, ' +
      'değerler USDA\'dan. Kamu malı, künye gerekmiyor.',
    supheli: hatalar.length > 0,
    uyari: hatalar.length
      ? 'Doğrulama kapısı takıldı: ' + hatalar.join(' ')
      : (tutarlilik && tutarlilik.yon === 'hesap-yuksek' && tutarlilik.oran > 0.12
          ? 'Makrolardan hesaplanan kalori (' + tutarlilik.hesap + ') yazandan (' +
            temel.kcal + ') yüksek. Lif payı bu farkı açıklıyor olabilir.'
          : null),
    fark: fark.length ? fark : null,
    kaynakBag: 'fdc.nal.usda.gov · fdcId ' + (secilen.fdcId || '?'),
    veri: {
      name: istek.ad, ...temel, mikro,
      /* Kategori istek listesinden geliyor. Yeni gıdanın foods.js'te nereye
         gideceğini bilmek için şart; USDA bunu söylemiyor. */
      kategori: istek.kategori || null,
      kaynak: 'usda', fdcId: secilen.fdcId || null,
      usdaAd: secilen.description || null
    }
  };
}

export async function usdaTuru(env, { getir, istekler, mevcut, baslangic = 0, enFazla }) {
  if (!env.USDA_API_KEY) {
    return { kayitlar: [], atlandi: true, sebep: 'USDA_API_KEY secret\'ı eksik', sonrakiSira: baslangic };
  }
  const sinir = typeof enFazla === 'number' ? enFazla : TUR_BASINA_USDA;
  const dilim = istekler.slice(baslangic, baslangic + sinir);
  const kayitlar = [];
  let bulunamayan = 0, hata = 0;

  for (const istek of dilim) {
    const adres = USDA_UC + '?api_key=' + encodeURIComponent(env.USDA_API_KEY) +
      '&query=' + encodeURIComponent(istek.ara) +
      '&dataType=' + encodeURIComponent('Foundation,SR Legacy') +
      '&pageSize=5';
    try {
      const cevap = await getir(adres, { headers: { Accept: 'application/json' } });
      if (!cevap.ok) throw new Error('HTTP ' + cevap.status);
      const veri = await cevap.json();
      const secilen = enIyiUsdaKaydi(veri && veri.foods);
      if (!secilen) { bulunamayan++; continue; }
      const besin = besinleriCoz(secilen);
      if (typeof besin.kcal !== 'number' || typeof besin.protein !== 'number') {
        bulunamayan++; continue;
      }
      kayitlar.push(usdaKaydiUret(istek, secilen, besin, mevcut.get(istek.ad) || null));
    } catch (err) {
      hata++;
      console.error('[ajan] USDA "' + istek.ara + '" alınamadı: ' + err.message);
    }
  }

  const sonrakiSira = baslangic + dilim.length >= istekler.length ? 0 : baslangic + dilim.length;
  return { kayitlar, atlandi: false, bulunamayan, hata, islenen: dilim.length, sonrakiSira };
}

/* ── OPEN FOOD FACTS ─────────────────────────────── */

const offSayi = d => (typeof d === 'number' && Number.isFinite(d)) ? yuvarla(d, 1) : null;

export function offKaydiCoz(urun) {
  const ad = String(urun.product_name_tr || urun.product_name || '').trim();
  if (!ad) return null;
  /* Barkodsuz kayıt id üretemiyor: hepsi "gida:off:" oluyor ve turuYaz
     bunları tek kayda indirip gerisini kopya sayıyordu. */
  if (!String(urun.code || '').trim()) return null;
  const n = urun.nutriments || {};
  const kcal = offSayi(n['energy-kcal_100g']);
  const protein = offSayi(n.proteins_100g);
  const carbs = offSayi(n.carbohydrates_100g);
  const fat = offSayi(n.fat_100g);
  if (kcal === null || protein === null || carbs === null || fat === null) return null;
  return {
    ad: ad.slice(0, 120),
    marka: String(urun.brands || '').split(',')[0].trim() || null,
    barkod: String(urun.code || ''),
    porsiyon: String(urun.serving_size || '').trim() || null,
    besin: { kcal, protein, carbs, fat },
    lif: offSayi(n.fiber_100g),
    seker: offSayi(n.sugars_100g)
  };
}

function offKaydiUret(cozulen) {
  const temel = { name: cozulen.ad, ...cozulen.besin };
  const hatalar = gidaDogrula(temel);
  const ozet = cozulen.besin.kcal + ' kcal · ' + cozulen.besin.protein + ' g protein · ' +
    cozulen.besin.carbs + ' g karbonhidrat · ' + cozulen.besin.fat + ' g yağ';

  return {
    id: 'gida:off:' + cozulen.barkod,
    tur: 'yeni',
    grup: 'Open Food Facts · markalı ürün',
    ad: cozulen.marka ? cozulen.marka + ' ' + cozulen.ad : cozulen.ad,
    deger: ozet + ' (100 g başına)' + (cozulen.porsiyon ? ' · porsiyon ' + cozulen.porsiyon : ''),
    aciklama: 'Türkiye\'de satılan paketli ürün. Ad ve değerler Open Food Facts ' +
      'katkıcılarından geliyor; veri gönüllü katkıya dayandığı için kalitesi ' +
      'ürüne göre değişiyor. Lisans ODbL — uygulamada künye gerekiyor.',
    /* OFF verisi gönüllü katkı: bir kişi yanlış girdiğinde kimse düzeltmemiş
       olabilir. Hepsi gözle bakılsın. */
    supheli: true,
    uyari: hatalar.length ? 'Doğrulama kapısı takıldı: ' + hatalar.join(' ') : null,
    fark: null,
    kaynakBag: 'openfoodfacts.org/product/' + cozulen.barkod + ' · ODbL',
    veri: {
      name: temel.name, kcal: temel.kcal, protein: temel.protein,
      carbs: temel.carbs, fat: temel.fat,
      marka: cozulen.marka, barkod: cozulen.barkod, porsiyon: cozulen.porsiyon,
      /* Paketli ürünler kendi kategorisinde: genel gıdaların arasına
         karışırsa arama kutusu kullanılamaz hale geliyor. */
      kategori: 'Paketli Ürünler',
      mikro: { ...(cozulen.lif !== null ? { lif: cozulen.lif } : {}),
               ...(cozulen.seker !== null ? { seker: cozulen.seker } : {}) },
      kaynak: 'openfoodfacts'
    }
  };
}

export async function offTuru(env, { getir, mevcutAdlar, baslangicSayfa = 1, enFazlaSayfa }) {
  const sinir = typeof enFazlaSayfa === 'number' ? enFazlaSayfa : TUR_BASINA_OFF_SAYFA;
  const alanlar = ['code', 'product_name', 'product_name_tr', 'brands',
                   'serving_size', 'nutriments'].join(',');
  const kayitlar = [];
  let sayfa = baslangicSayfa, bitti = false, hata = 0, elenen = 0;

  for (let i = 0; i < sinir; i++) {
    const adres = OFF_UC + '?countries_tags=turkey&fields=' + alanlar +
      '&page_size=' + OFF_SAYFA_BOYU + '&page=' + sayfa;
    let veri;
    try {
      const cevap = await getir(adres, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'FitTakip/1.0 (kişisel fitness uygulaması)'
        }
      });
      if (!cevap.ok) throw new Error('HTTP ' + cevap.status);
      veri = await cevap.json();
    } catch (err) {
      hata++;
      console.error('[ajan] OFF sayfa ' + sayfa + ' alınamadı: ' + err.message);
      break;
    }

    const urunler = Array.isArray(veri && veri.products) ? veri.products : [];
    if (!urunler.length) { bitti = true; break; }

    for (const urun of urunler) {
      const cozulen = offKaydiCoz(urun);
      if (!cozulen) { elenen++; continue; }
      if (mevcutAdlar.has(cozulen.ad)) { elenen++; continue; }
      kayitlar.push(offKaydiUret(cozulen));
    }
    sayfa++;
    if (urunler.length < OFF_SAYFA_BOYU) { bitti = true; break; }
  }

  return { kayitlar, sonrakiSayfa: bitti ? 1 : sayfa, hata, elenen };
}

/* ── ANA AKIŞ ────────────────────────────────────── */

export async function calistir(env, { getir = fetch, enFazlaUsda, enFazlaOffSayfa } = {}) {
  const mevcutListe = (await env.REMINDERS.get(MEVCUT_ANAHTAR, 'json')) || [];
  if (!Array.isArray(mevcutListe) || !mevcutListe.length) {
    throw new Error('Uygulamanın mevcut gıda listesi KV\'de yok. ' +
      'Önce "npm run veri-gonder" ile gönder — yoksa 112 gıdanın hepsi "yeni" sanılır.');
  }
  const istekPaket = await env.REMINDERS.get(ISTEK_ANAHTARI, 'json');
  const istekler = istekPaket && Array.isArray(istekPaket.gidalar) ? istekPaket.gidalar : [];
  if (!istekler.length) {
    throw new Error('USDA istek listesi KV\'de yok. "npm run veri-gonder" çalıştır.');
  }

  const mevcut = new Map(mevcutListe.map(g => [g.name, g]));
  const mevcutAdlar = new Set(mevcutListe.map(g => g.name));

  const durum = (await env.REMINDERS.get('gida:durum', 'json')) || { usdaSira: 0, offSayfa: 1 };

  const usda = await usdaTuru(env, {
    getir, istekler, mevcut,
    baslangic: durum.usdaSira || 0, enFazla: enFazlaUsda
  });
  const off = await offTuru(env, {
    getir, mevcutAdlar,
    baslangicSayfa: durum.offSayfa || 1, enFazlaSayfa: enFazlaOffSayfa
  });

  await env.REMINDERS.put('gida:durum', JSON.stringify({
    usdaSira: usda.sonrakiSira, offSayfa: off.sonrakiSayfa
  }));

  const kayitlar = [...usda.kayitlar, ...off.kayitlar];
  const sonuc = kayitlar.length ? await turuYaz(env, 'gida', kayitlar)
    : { yeni: 0, guncel: 0, atlanan: 0, kopya: 0, toplam: 0 };

  return {
    ...sonuc,
    usda: { islenen: usda.islenen || 0, bulunamayan: usda.bulunamayan || 0,
            hata: usda.hata || 0, atlandi: usda.atlandi || false, sebep: usda.sebep || null,
            kalan: usda.sonrakiSira ? istekler.length - usda.sonrakiSira : 0 },
    off: { yeni: off.kayitlar.length, elenen: off.elenen, hata: off.hata,
           sonrakiSayfa: off.sonrakiSayfa }
  };
}
