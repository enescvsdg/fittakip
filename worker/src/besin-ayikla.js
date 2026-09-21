/* ══════════════════════════════════════════
   ÜRÜN SAYFASINDAN BESİN DEĞERİ ÇIKARMA

   Dürüst uyarı: bu modül GERÇEK sayfalara karşı ayarlanmadı, çünkü yazıldığı
   ortamdan o sitelere çıkış yoktu. Buradaki mantık yaygın kalıplara dayanıyor
   ve temsili HTML'lerle sınandı. İlk gerçek turda her site için ayrı ayrı
   doğrulanması, gerekirse siteye özel adaptör yazılması gerekiyor.

   Bu yüzden çıkan her kayıt "şüpheli" işaretiyle geliyor: panelde gözle
   doğrulanmadan uygulamaya girmemeli.

   İki yol deneniyor:
     1. JSON-LD (schema.org/Product) — e-ticaret sitelerinin çoğunda var,
        ad ve marka için en güvenilir kaynak
     2. Besin tablosu — HTML tablosunda satır satır aranıyor
   ══════════════════════════════════════════ */

/* Türkçe sayı: "12,5" ondalık virgüllü. "1.240" binlik noktalı.
   İkisini ayırmak gerekiyor: son ayraç ondalıksa virgül, değilse nokta. */
export function sayiCoz(ham) {
  if (typeof ham === 'number') return Number.isFinite(ham) ? ham : null;
  const t = String(ham || '').trim();
  if (!t) return null;
  const eslesme = t.match(/-?[\d.,]+/);
  if (!eslesme) return null;
  let s = eslesme[0];

  const sonVirgul = s.lastIndexOf(','), sonNokta = s.lastIndexOf('.');
  if (sonVirgul > sonNokta) {
    s = s.replace(/\./g, '').replace(',', '.');        // 1.240,5 → 1240.5
  } else if (sonNokta > sonVirgul) {
    /* "1.240" binlik mi "1.24" ondalık mı? Noktadan sonra tam üç hane ve
       başka nokta yoksa binlik sayıyoruz — besin değerlerinde üç ondalık
       basamak görülmüyor. */
    const kuyruk = s.slice(sonNokta + 1);
    if (kuyruk.length === 3 && s.indexOf('.') === sonNokta && sonVirgul < 0) {
      s = s.replace(/\./g, '');
    } else {
      s = s.replace(/,/g, '');
    }
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/* Besin tablolarında aynı şey çok türlü yazılıyor. Etiketi tanınan alana
   eşliyoruz; tanınmayan satır atlanıyor (ürüne özel maddeler oluyor). */
const ALAN_DESENLERI = [
  ['kcal',    /(enerji|kalori|energy|calorie)/i],
  ['protein', /protein/i],
  ['carbs',   /(karbonhidrat|carbohydrate)/i],
  ['fat',     /(yağ|yag|fat)/i],
  ['lif',     /(lif|fibre|fiber)/i],
  ['seker',   /(şeker|seker|sugar)/i],
  ['tuz',     /(tuz|sodyum|salt|sodium)/i]
];

export function alanTani(etiket) {
  const t = String(etiket || '');
  /* "Doymuş yağ" ve "doymuş olmayan" ayrı satırlar; toplam yağı bozmasınlar. */
  if (/doymuş|doymus|trans|saturated/i.test(t)) return null;
  for (const [alan, desen] of ALAN_DESENLERI) if (desen.test(t)) return alan;
  return null;
}

/* Etiketten sonra hangi birim geliyor? "Enerji 450 kcal" ile "Enerji 1880 kJ"
   aynı satırda birlikte yazılabiliyor; kJ'yi kcal sanmamak gerekiyor. */
export function kcalCoz(metin) {
  const t = String(metin || '');
  const kcal = t.match(/(-?[\d.,]+)\s*k?cal/i);
  if (kcal) return sayiCoz(kcal[1]);
  const kj = t.match(/(-?[\d.,]+)\s*kj/i);
  if (kj) {
    const n = sayiCoz(kj[1]);
    return n === null ? null : Math.round(n / 4.184);
  }
  return sayiCoz(t);
}

const etiketleriSil = h => String(h || '')
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\s+/g, ' ').trim();

/* Sayfadaki JSON-LD bloklarından Product olanı bulur. */
export function jsonLdUrun(html) {
  const bloklar = String(html || '')
    .match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const blok of bloklar) {
    const govde = blok.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    let veri;
    try { veri = JSON.parse(govde); } catch { continue; }
    const adaylar = Array.isArray(veri) ? veri
      : (Array.isArray(veri['@graph']) ? veri['@graph'] : [veri]);
    for (const a of adaylar) {
      if (!a || typeof a !== 'object') continue;
      const tur = a['@type'];
      const turler = Array.isArray(tur) ? tur : [tur];
      if (turler.some(t => String(t).toLowerCase() === 'product')) return a;
    }
  }
  return null;
}

/* Değerlerin hangi tabana ait olduğu sütun başlığında yazıyor: "100 g",
   "Porsiyon", "1 ölçek (30 g)". Bunu bilmek şart — 100 g'lık değerleri 30 g'lık
   porsiyonla karşılaştırırsak her ürün "makro toplamı porsiyondan büyük" diye
   hatalı işaretlenir. */
export function temelCoz(baslik) {
  const t = String(baslik || '');
  if (/100\s*(g|gr|gram|ml)/i.test(t)) return { tur: '100g', gram: 100 };
  const olcekli = t.match(/\(\s*([\d.,]+)\s*(?:g|gr|gram)\s*\)/i);
  if (olcekli) {
    const n = sayiCoz(olcekli[1]);
    if (n !== null) return { tur: 'porsiyon', gram: n };
  }
  if (/porsiyon|servis|ölçek|olcek|scoop|kapsül|kapsul|tablet/i.test(t)) {
    return { tur: 'porsiyon', gram: null };
  }
  return null;
}

/* schema.org/NutritionInformation — ürün sayfalarının en temiz kaynağı,
   varsa HTML ayrıştırmaya hiç gerek kalmıyor. Değerler "24 g" gibi birimli
   metin olarak geliyor. */
const LD_ALAN = {
  calories: 'kcal', proteinContent: 'protein', carbohydrateContent: 'carbs',
  fatContent: 'fat', fiberContent: 'lif', sugarContent: 'seker', sodiumContent: 'tuz'
};

export function jsonLdBesin(urun) {
  const n = urun && (urun.nutrition || urun.nutritionInformation);
  if (!n || typeof n !== 'object') return null;
  const cikti = {};
  for (const [ldAd, alan] of Object.entries(LD_ALAN)) {
    if (n[ldAd] === undefined || n[ldAd] === null) continue;
    const deger = alan === 'kcal' ? kcalCoz(n[ldAd]) : sayiCoz(n[ldAd]);
    if (deger !== null) cikti[alan] = deger;
  }
  if (Object.keys(cikti).length < 2) return null;
  const temel = temelCoz(String(n.servingSize || ''));
  return { degerler: cikti, temel: temel || { tur: 'porsiyon', gram: null } };
}

/* Tanım listesi (<dl><dt>Protein</dt><dd>24 g</dd>) ve etiketli kutular.
   Türk e-ticaret temaları besin değerlerini sık sık tabloya değil bu
   yapılara koyuyor. */
export function listedenOku(html) {
  const metin = String(html || '');
  const ciftler = [];

  const dl = metin.match(/<dl[\s\S]*?<\/dl>/gi) || [];
  for (const blok of dl) {
    const dt = blok.match(/<dt[\s\S]*?<\/dt>/gi) || [];
    const dd = blok.match(/<dd[\s\S]*?<\/dd>/gi) || [];
    for (let i = 0; i < Math.min(dt.length, dd.length); i++) {
      ciftler.push([etiketleriSil(dt[i]), etiketleriSil(dd[i])]);
    }
  }

  /* "<span>Protein</span><span>24 g</span>" gibi yan yana iki kutu */
  const satirlar = metin.match(/<(li|div|p)[^>]*>(?:\s*<(?:span|strong|b)[^>]*>[\s\S]*?<\/(?:span|strong|b)>\s*){2}\s*<\/\1>/gi) || [];
  for (const satir of satirlar) {
    const kutular = (satir.match(/<(?:span|strong|b)[^>]*>[\s\S]*?<\/(?:span|strong|b)>/gi) || [])
      .map(etiketleriSil);
    if (kutular.length >= 2) ciftler.push([kutular[0], kutular[1]]);
  }

  const cikti = {};
  for (const [etiket, deger] of ciftler) {
    const alan = alanTani(etiket);
    if (!alan || cikti[alan] !== undefined) continue;
    if (!/\d/.test(deger)) continue;
    const d = alan === 'kcal' ? kcalCoz(deger) : sayiCoz(deger);
    if (d !== null) cikti[alan] = d;
  }
  if (Object.keys(cikti).length < 2) return null;
  return { degerler: cikti, temel: { tur: '100g', gram: 100 } };
}

/* Besin tablosunu satır satır okur. Tablo bulunamazsa null. */
export function tablodanOku(html) {
  const tablolar = String(html || '').match(/<table[\s\S]*?<\/table>/gi) || [];
  for (const tablo of tablolar) {
    const duzMetin = etiketleriSil(tablo);
    if (!/enerji|kalori|protein|besin/i.test(duzMetin)) continue;

    const satirlar = tablo.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const hucreleriAl = satir =>
      (satir.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || []).map(etiketleriSil);

    const cikti = {};
    let degerSutunu = null;
    for (const satir of satirlar) {
      const hucreler = hucreleriAl(satir);
      if (hucreler.length < 2) continue;
      const alan = alanTani(hucreler[0]);
      if (!alan) continue;
      /* Değer ilk dolu hücrede olmayabilir: bazı tablolarda "100 g" ve
         "porsiyon" diye iki sütun var, ilkini alıyoruz. */
      /* Sütun BİR KEZ seçiliyor. Satır başına yeniden bulsaydık, değeri boş
         bir satır sayısını sonraki sütundan (porsiyon) alır ve biz onu
         100 g değeri sanardık — gözle fark edilmeyen bir hata. */
      if (degerSutunu === null) {
        const ilk = hucreler.findIndex((h, i) => i > 0 && /\d/.test(h));
        if (ilk < 0) continue;
        degerSutunu = ilk;
      }
      const hucre = hucreler[degerSutunu];
      if (hucre === undefined || !/\d/.test(hucre)) continue;
      const deger = alan === 'kcal' ? kcalCoz(hucre) : sayiCoz(hucre);
      if (deger === null) continue;
      if (cikti[alan] === undefined) cikti[alan] = deger;
    }
    if (Object.keys(cikti).length < 2) continue;

    /* Kullandığımız sütunun başlığı tabanı söylüyor. Başlık satırı yoksa
       100 g varsayıyoruz — besin tablolarının yaygın tabanı bu. */
    let temel = null;
    for (const satir of satirlar) {
      const hucreler = hucreleriAl(satir);
      if (hucreler.length <= degerSutunu) continue;
      if (alanTani(hucreler[0])) continue;              // veri satırı, başlık değil
      const aday = temelCoz(hucreler[degerSutunu]);
      if (aday) { temel = aday; break; }
    }
    return { degerler: cikti, temel: temel || { tur: '100g', gram: 100 } };
  }
  return null;
}

/* "1 ölçek (30 g)", "Porsiyon: 25 gram", "servis 2 kapsül" gibi ifadeler. */
export function porsiyonOku(html) {
  const metin = etiketleriSil(html);
  const desenler = [
    /(\d+[\d.,]*)\s*(?:adet\s*)?(ölçek|olcek|scoop|kapsül|kapsul|tablet)\s*\(?\s*([\d.,]+)\s*(g|gr|gram|mg)\)?/i,
    /(?:porsiyon|servis|bir\s+servis|tek\s+servis)[^.\n]{0,24}?([\d.,]+)\s*(g|gr|gram|ml)/i,
    /([\d.,]+)\s*(g|gr|gram)\s*(?:lık|lik|luk|lük)?\s*(?:porsiyon|servis)/i
  ];
  for (const d of desenler) {
    const m = metin.match(d);
    if (!m) continue;
    const gram = sayiCoz(m[3] !== undefined ? m[3] : m[1]);
    if (gram === null) continue;
    return { metin: m[0].trim(), gram };
  }
  return null;
}

/* Değer aralıkları. Amaç kesin doğruluk değil, saçmalığı yakalamak: bir
   porsiyonda 1.240 kcal yazan kayıt büyük ihtimalle "3 ölçek" değerini tek
   servis sanmış. */
export const ARALIK = {
  kcal:    [0, 900],
  protein: [0, 100],
  carbs:   [0, 100],
  fat:     [0, 100],
  lif:     [0, 60],
  seker:   [0, 100],
  tuz:     [0, 30]
};

export function degerleriDenetle(besin, temelGram) {
  const sorunlar = [];
  for (const [alan, deger] of Object.entries(besin || {})) {
    const sinir = ARALIK[alan];
    if (!sinir) continue;
    if (deger < sinir[0] || deger > sinir[1]) {
      sorunlar.push(alan + ' değeri ' + deger + ' — beklenen aralık ' +
        sinir[0] + '-' + sinir[1] +
        (alan === 'kcal' ? '. Porsiyon birden fazla ölçek olabilir.' : '.'));
    }
  }
  /* Makroların toplamı, değerlerin AİT OLDUĞU ağırlığı aşamaz. Karşılaştırma
     tabanı porsiyon değil, tablonun tabanı: 100 g'lık değerleri 30 g'lık
     porsiyonla kıyaslarsak her ürün hatalı işaretlenir. */
  const makro = ['protein', 'carbs', 'fat']
    .map(a => besin && besin[a]).filter(v => typeof v === 'number');
  if (makro.length === 3 && temelGram) {
    const toplam = makro.reduce((a, b) => a + b, 0);
    if (toplam > temelGram * 1.05) {
      sorunlar.push('Makro toplamı (' + toplam.toFixed(1) + ' g) değerlerin tabanından (' +
        temelGram + ' g) büyük — değerler farklı bir tabana ait olabilir.');
    }
  }
  return sorunlar;
}

/* Çıkarım başarısız olduğunda ne bulduğumuzu raporlar. Gerçek sayfalara
   erişimimiz olmadığı için ilk turun teşhis değeri yüksek olmalı. */
export function taniCikar(html, denenen) {
  const metin = String(html || '');
  const duz = etiketleriSil(metin);
  return {
    denenen,
    uzunluk: metin.length,
    tabloSayisi: (metin.match(/<table/gi) || []).length,
    tanimListesi: (metin.match(/<dl/gi) || []).length,
    jsonLdBlogu: (metin.match(/application\/ld\+json/gi) || []).length,
    besinKelimesi: /besin de[ğg]er|nutrition facts|nutrition information/i.test(duz),
    enerjiKelimesi: /enerji|kalori|kcal/i.test(duz),
    proteinKelimesi: /protein/i.test(duz),
    /* Sayfanın ilk 300 karakteri: bot engeli ya da çerez duvarı yakaladıysak
       burada görünür. */
    onizleme: duz.slice(0, 300)
  };
}

/* Bir ürün sayfasından çıkarılabilen her şey. */
export function sayfadanCikar(html, adres) {
  const urun = jsonLdUrun(html);
  const porsiyon = porsiyonOku(html);

  /* Üç yol sırayla: JSON-LD en temiz, tablo en yaygın, liste son çare. */
  const denemeler = [
    ['json-ld', () => jsonLdBesin(urun)],
    ['tablo', () => tablodanOku(html)],
    ['liste', () => listedenOku(html)]
  ];
  let tablo = null, yontem = null;
  const denenen = [];
  for (const [ad, dene] of denemeler) {
    let sonuc = null;
    try { sonuc = dene(); } catch { sonuc = null; }
    denenen.push(ad + (sonuc ? ':buldu' : ':yok'));
    if (sonuc && !tablo) { tablo = sonuc; yontem = ad; }
  }
  const besin = tablo ? tablo.degerler : null;
  /* Tablo "porsiyon başına" diyorsa ama kaç gram olduğunu yazmıyorsa, sayfa
     metninden okunan porsiyona düşüyoruz. */
  const temelGram = tablo
    ? (tablo.temel.gram !== null ? tablo.temel.gram : (porsiyon && porsiyon.gram) || null)
    : null;

  const baslik = (urun && (urun.name || urun.title)) ||
    (String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];

  const ad = etiketleriSil(baslik || '').slice(0, 120);
  if (!ad) return null;

  const marka = urun && urun.brand
    ? etiketleriSil(typeof urun.brand === 'string' ? urun.brand : (urun.brand.name || ''))
    : null;

  return {
    ad,
    marka: marka || null,
    adres,
    besin: besin || null,
    yontem,
    temel: tablo ? { ...tablo.temel, gram: temelGram } : null,
    porsiyon: porsiyon || null,
    sorunlar: degerleriDenetle(besin, temelGram),
    /* Çıkarım tutmazsa NEDEN tutmadığını da söylüyoruz. Bu ortamdan gerçek
       sayfalara bakamadığımız için ilk turun bize ne anlattığı kritik:
       "tablo yok" ile "tablo var ama satırları tanımadım" çok farklı iki
       sorun ve farklı düzeltme gerektiriyor. */
    tani: taniCikar(html, denenen)
  };
}
