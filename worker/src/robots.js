/* ══════════════════════════════════════════
   robots.txt

   Ajan bir siteye girmeden önce o sitenin kurallarına bakıyor. Bunu bir kez
   elle kontrol edip geçmek yetmez: site şartını yarın değiştirebilir, ajan her
   tarama öncesi kendisi bakıyor.

   Dosya okunamazsa (404, zaman aşımı) TARAMAYA İZİN VERİLİYOR — standart
   davranış bu, robots.txt'si olmayan site herkese açık sayılıyor. Ama dosya
   VAR ve okunamıyorsa (5xx) taranmıyor: sunucu zorlanıyor olabilir.
   ══════════════════════════════════════════ */

export const AJAN_ADI = 'FitTakipBot';

/* robots.txt satırlarını bizim için geçerli kurallara çevirir.

   Önce bize özel bloğa (User-agent: FitTakipBot) bakıyor; yoksa yıldıza
   düşüyor. Standart böyle: kendi adımıza yazılmış bir blok varsa "*" bloğu
   bizi bağlamıyor. */
export function kurallariCoz(metin, ajan = AJAN_ADI) {
  const satirlar = String(metin || '').split(/\r?\n/);
  const bloklar = [];
  let aktif = null;
  let ustUsteAjan = false;

  for (const ham of satirlar) {
    const satir = ham.replace(/#.*$/, '').trim();
    if (!satir) continue;
    const ayrac = satir.indexOf(':');
    if (ayrac < 0) continue;
    const alan = satir.slice(0, ayrac).trim().toLowerCase();
    const deger = satir.slice(ayrac + 1).trim();

    if (alan === 'user-agent') {
      if (!aktif || !ustUsteAjan) {
        aktif = { ajanlar: [], izinYok: [], izinVar: [], gecikme: null };
        bloklar.push(aktif);
      }
      aktif.ajanlar.push(deger.toLowerCase());
      ustUsteAjan = true;
      continue;
    }
    if (!aktif) continue;
    ustUsteAjan = false;

    if (alan === 'disallow') aktif.izinYok.push(deger);
    else if (alan === 'allow') aktif.izinVar.push(deger);
    else if (alan === 'crawl-delay') {
      const n = parseFloat(deger);
      if (Number.isFinite(n) && n >= 0) aktif.gecikme = n;
    }
  }

  const ad = ajan.toLowerCase();
  const bize = bloklar.find(b => b.ajanlar.includes(ad));
  const yildiz = bloklar.find(b => b.ajanlar.includes('*'));
  const secilen = bize || yildiz;
  if (!secilen) return { izinYok: [], izinVar: [], gecikme: null, blokVar: false };
  return {
    izinYok: secilen.izinYok, izinVar: secilen.izinVar,
    gecikme: secilen.gecikme, blokVar: true
  };
}

/* robots.txt deseni: * herhangi bir dizi, $ satır sonu. Diğer her şey düz metin. */
function desenUyar(yol, desen) {
  if (desen === '') return false;                 // "Disallow:" boş = kısıt yok
  const sonKilit = desen.endsWith('$');
  const govde = sonKilit ? desen.slice(0, -1) : desen;
  const parcalar = govde.split('*');

  let konum = 0;
  for (let i = 0; i < parcalar.length; i++) {
    const p = parcalar[i];
    if (p === '') continue;
    const bulundu = i === 0 ? (yol.startsWith(p) ? 0 : -1) : yol.indexOf(p, konum);
    if (bulundu < 0) return false;
    if (i === 0 && bulundu !== 0) return false;
    konum = bulundu + p.length;
  }
  if (sonKilit) {
    const sonParca = parcalar[parcalar.length - 1];
    return sonParca === '' ? true : yol.endsWith(sonParca);
  }
  return true;
}

/* En uzun eşleşen kural kazanır; eşitlikte Allow kazanır. Standart böyle. */
export function yolaIzinVar(kurallar, yol) {
  if (!kurallar || !kurallar.blokVar) return true;
  let enUzunYasak = -1, enUzunIzin = -1;
  for (const d of kurallar.izinYok) if (desenUyar(yol, d)) enUzunYasak = Math.max(enUzunYasak, d.length);
  for (const d of kurallar.izinVar) if (desenUyar(yol, d)) enUzunIzin = Math.max(enUzunIzin, d.length);
  if (enUzunYasak < 0) return true;
  return enUzunIzin >= enUzunYasak;
}

export async function kurallariGetir(kokAdres, { getir = fetch, ajan = AJAN_ADI } = {}) {
  const adres = kokAdres.replace(/\/+$/, '') + '/robots.txt';
  let cevap;
  try {
    cevap = await getir(adres, { headers: { 'User-Agent': AJAN_ADI } });
  } catch (err) {
    /* Ağ hatası: siteye hiç ulaşamıyoruz. Taramaya kalkışmanın anlamı yok. */
    return { taranabilir: false, sebep: 'robots.txt alınamadı: ' + err.message, kurallar: null };
  }

  if (cevap.status === 404 || cevap.status === 410) {
    return { taranabilir: true, sebep: 'robots.txt yok — kısıt yok sayılıyor', kurallar: null };
  }
  if (!cevap.ok) {
    return {
      taranabilir: false,
      sebep: 'robots.txt HTTP ' + cevap.status + ' döndü; sunucu zorlanıyor olabilir',
      kurallar: null
    };
  }

  const metin = await cevap.text();
  return { taranabilir: true, sebep: null, kurallar: kurallariCoz(metin, ajan) };
}
