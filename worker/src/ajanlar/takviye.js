/* ══════════════════════════════════════════
   AJAN 4 — SUPPLEMENT

   Keşif sitemap.xml üzerinden yapılıyor. Kategori sayfalarını gezmek yerine
   bunu seçmemizin sebebi: sitemap tam bu iş için var, tek istekle tüm ürün
   adreslerini veriyor ve siteyi yormuyor.

   DÜRÜST SINIR: bu ajan gerçek sitelere karşı çalıştırılmadı — yazıldığı
   ortamdan o sitelere çıkış yoktu. Ürün adresi desenleri ve besin tablosu
   okuma mantığı yaygın kalıplara dayanıyor. İlk turda her site tek tek
   doğrulanmalı; bu yüzden çıkan her kayıt "şüpheli" işaretiyle geliyor.
   ══════════════════════════════════════════ */

import { kurallariGetir, yolaIzinVar, AJAN_ADI } from '../robots.js';
import { sayfadanCikar } from '../besin-ayikla.js';
import { turuYaz } from '../onay.js';

/* Kullanıcının onayladığı liste. Buraya yazılmayan hiçbir adrese istek
   atılmıyor — kod seviyesinde sınır. */
export const SITELER = [
  { id: 'hardline',       ad: 'Hardline',         kok: 'https://www.hardline.com.tr' },
  { id: 'proteinocean',   ad: 'ProteinOcean',     kok: 'https://www.proteinocean.com' },
  { id: 'bigjoy',         ad: 'BigJoy',           kok: 'https://www.bigjoy.com.tr' },
  { id: 'takehiq',        ad: 'HIQ Nutrition',    kok: 'https://www.takehiq.com' },
  { id: 'liventis',       ad: 'Liventis',         kok: 'https://www.liventis.com.tr' },
  { id: 'supplementler',  ad: 'Supplementler.com', kok: 'https://www.supplementler.com' }
];

export const ZIYARET_ANAHTARI = 'takviye:goruldu';

/* Tur başına site başına en fazla kaç ürün sayfası. Kataloglar binlerce ürün
   olabiliyor; hepsini bir gecede çekmek hem Worker'ın süresini aşar hem siteyi
   yorar. Görülen adresler KV'de tutuluyor, her gece yenilerden devam ediyor. */
export const TUR_BASINA_URUN = 40;

/* İstekler arası bekleme. robots.txt'de Crawl-delay varsa o kazanıyor. */
export const BEKLEME_MS = 1200;

const bekle = ms => new Promise(r => setTimeout(r, ms));

const BASLIKLAR = {
  'User-Agent': AJAN_ADI + ' (kişisel fitness uygulaması; besin değeri toplama)',
  'Accept': 'text/html,application/xhtml+xml,application/xml'
};

/* Ürün sayfası mı? Kesin bilinmiyor, bu yüzden geniş tutulup kataloğun
   dışındakiler (blog, kategori, sepet) eleniyor. */
export const URUN_DISI = /\/(blog|haber|makale|sepet|hesap|uye|iletisim|kurumsal|kategori|category|search|ara|sayfa|page)(\/|$|\?)/i;

export function urunAdresiMi(adres) {
  let yol;
  try { yol = new URL(adres).pathname; } catch { return false; }
  if (URUN_DISI.test(yol)) return false;
  if (yol === '/' || yol === '') return false;
  /* En az bir yol parçası ve dosya uzantısı yok — ürün sayfaları böyle. */
  if (/\.(xml|jpg|jpeg|png|gif|webp|pdf|css|js|svg)$/i.test(yol)) return false;
  return yol.split('/').filter(Boolean).length >= 1;
}

/* sitemap.xml ve sitemap indeksi. İndeks ise alt haritalar da geziliyor. */
export function haritadanAdresler(xml) {
  const adresler = (String(xml || '').match(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi) || [])
    .map(m => m.replace(/<\/?loc>/gi, '').trim())
    .filter(Boolean);
  const indeksMi = /<sitemapindex/i.test(String(xml || ''));
  return { adresler, indeksMi };
}

/* robots.txt içinde Sitemap: satırı olabiliyor; varsa onu kullanıyoruz. */
export function robotstanHarita(metin) {
  return (String(metin || '').match(/^\s*sitemap:\s*(\S+)\s*$/gim) || [])
    .map(s => s.replace(/^\s*sitemap:\s*/i, '').trim());
}

async function metinAl(adres, getir) {
  const cevap = await getir(adres, { headers: BASLIKLAR });
  if (!cevap.ok) {
    const hata = new Error('HTTP ' + cevap.status);
    hata.status = cevap.status;
    throw hata;
  }
  return cevap.text();
}

/* Bir sitenin ürün adreslerini bulur. */
export async function adresleriKesfet(site, { getir, kurallar, enFazlaHarita = 4 }) {
  const denenecek = [];
  try {
    const robots = await metinAl(site.kok.replace(/\/+$/, '') + '/robots.txt', getir);
    denenecek.push(...robotstanHarita(robots));
  } catch { /* robots okunamadıysa varsayılan adrese düşüyoruz */ }
  if (!denenecek.length) denenecek.push(site.kok.replace(/\/+$/, '') + '/sitemap.xml');

  const bulunan = new Set();
  const gezilen = new Set();
  const kuyruk = denenecek.slice(0, enFazlaHarita);

  while (kuyruk.length && gezilen.size < enFazlaHarita) {
    const harita = kuyruk.shift();
    if (gezilen.has(harita)) continue;
    gezilen.add(harita);
    let xml;
    try { xml = await metinAl(harita, getir); } catch { continue; }
    const { adresler, indeksMi } = haritadanAdresler(xml);
    for (const a of adresler) {
      if (indeksMi) { kuyruk.push(a); continue; }
      if (!a.startsWith(site.kok.replace(/\/+$/, ''))) continue;   // izin listesi dışına çıkma
      if (!urunAdresiMi(a)) continue;
      let yol;
      try { yol = new URL(a).pathname; } catch { continue; }
      if (!yolaIzinVar(kurallar, yol)) continue;
      bulunan.add(a);
    }
  }
  return [...bulunan];
}

function kayitUret(site, cikan) {
  const besin = cikan.besin || {};
  const parcalar = [];
  if (typeof besin.kcal === 'number') parcalar.push(besin.kcal + ' kcal');
  if (typeof besin.protein === 'number') parcalar.push(besin.protein + ' g protein');
  if (typeof besin.carbs === 'number') parcalar.push(besin.carbs + ' g karbonhidrat');
  if (typeof besin.fat === 'number') parcalar.push(besin.fat + ' g yağ');

  const taban = cikan.temel && cikan.temel.gram
    ? cikan.temel.gram + ' g başına' : 'taban belirsiz';
  const porsiyon = cikan.porsiyon ? ' · porsiyon ' + cikan.porsiyon.metin : '';

  const veriYok = !parcalar.length;
  return {
    id: 'takviye:' + site.id + ':' + cikan.adres.replace(/^https?:\/\//, '').slice(0, 120),
    tur: 'yeni',
    grup: site.ad,
    ad: cikan.ad,
    deger: veriYok ? 'Besin tablosu bulunamadı' : (parcalar.join(' · ') + ' (' + taban + ')' + porsiyon),
    aciklama: (cikan.marka ? cikan.marka + ' · ' : '') + 'Ürün sayfasından okundu. ' +
      'Çıkarım mantığı gerçek sayfalara karşı henüz ayarlanmadı — değerleri ' +
      'sayfayla karşılaştırmadan onaylama.',
    /* Bu ajanın çıktısı her koşulda şüpheli: okuma mantığı doğrulanmadı. */
    supheli: true,
    uyari: cikan.sorunlar.length ? cikan.sorunlar.join(' ')
      : (veriYok ? 'Sayfada besin tablosu bulunamadı; yalnız ürün adı alındı.' : null),
    fark: null,
    kaynakBag: cikan.adres,
    veri: {
      name: cikan.ad, marka: cikan.marka, site: site.id, adres: cikan.adres,
      besin: cikan.besin, temel: cikan.temel, porsiyon: cikan.porsiyon
    }
  };
}

export async function siteyiTara(env, site, { getir, gorulen, enFazlaUrun = TUR_BASINA_URUN }) {
  const izin = await kurallariGetir(site.kok, { getir });
  if (!izin.taranabilir) {
    return { site: site.id, atlandi: true, sebep: izin.sebep, kayitlar: [] };
  }

  const adresler = await adresleriKesfet(site, { getir, kurallar: izin.kurallar });
  const yeniler = adresler.filter(a => !gorulen.has(a)).slice(0, enFazlaUrun);

  const gecikme = izin.kurallar && izin.kurallar.gecikme
    ? Math.max(BEKLEME_MS, izin.kurallar.gecikme * 1000)
    : BEKLEME_MS;

  const kayitlar = [];
  let hata = 0;
  for (const adres of yeniler) {
    try {
      const html = await metinAl(adres, getir);
      const cikan = sayfadanCikar(html, adres);
      gorulen.add(adres);
      if (cikan) kayitlar.push(kayitUret(site, cikan));
    } catch (err) {
      hata++;
      /* Tek sayfa patlaması turu durdurmasın; adres "görüldü" sayılmıyor ki
         bir sonraki tur tekrar denesin. */
      console.error('[ajan] ' + site.id + ' sayfa okunamadı: ' + adres + ' — ' + err.message);
    }
    await bekle(gecikme);
  }

  return {
    site: site.id, atlandi: false, sebep: null,
    bulunan: adresler.length, okunan: yeniler.length, hata, kayitlar
  };
}

export async function calistir(env, { getir = fetch, siteler = SITELER, enFazlaUrun } = {}) {
  const gorulenListe = (await env.REMINDERS.get(ZIYARET_ANAHTARI, 'json')) || [];
  const gorulen = new Set(Array.isArray(gorulenListe) ? gorulenListe : []);

  const kayitlar = [];
  const raporlar = [];
  for (const site of siteler) {
    try {
      const r = await siteyiTara(env, site, { getir, gorulen, enFazlaUrun });
      raporlar.push(r);
      kayitlar.push(...r.kayitlar);
    } catch (err) {
      raporlar.push({ site: site.id, atlandi: true, sebep: err.message, kayitlar: [] });
      console.error('[ajan] ' + site.id + ' taranamadı:', err.message);
    }
  }

  await env.REMINDERS.put(ZIYARET_ANAHTARI, JSON.stringify([...gorulen]));
  const sonuc = kayitlar.length ? await turuYaz(env, 'takviye', kayitlar)
    : { yeni: 0, guncel: 0, atlanan: 0, kopya: 0, toplam: 0 };

  return { ...sonuc, siteler: raporlar };
}
