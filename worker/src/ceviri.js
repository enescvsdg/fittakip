/* ══════════════════════════════════════════
   TALİMAT ÇEVİRİSİ

   free-exercise-db'nin talimatları İngilizce. Uygulama Türkçe, o yüzden
   çeviriyorlar — ama her gece 876 hareketi yeniden çevirmek israf. Çeviriler
   KV'de tek bir blob'da tutuluyor; tur yalnızca DAHA ÖNCE GÖRÜLMEMİŞ metinleri
   modele gönderiyor. İlk turdan sonra çağrı sayısı sıfıra yakın oluyor.

   Kayıt anahtarı hareket adı değil, İngilizce metnin kendisi: kaynak metni
   değişirse çeviri de kendiliğinden yenileniyor.
   ══════════════════════════════════════════ */

import { sor, jsonCoz } from './gemini.js';

export const ONBELLEK_ANAHTARI = 'ceviri:egzersiz';

/* Tek istekte kaç hareket. Yüksek tutmak çağrı sayısını düşürüyor ama yanıtı
   uzatıyor; uzun yanıtta model sondaki maddeleri kısaltmaya başlıyor. 12
   hareket ≈ 60 cümle, deneyebildiğimiz en dengeli nokta. */
export const YIGIN_BOYU = 12;

/* Tur başına en fazla kaç yığın. İlk turda 876 hareketin tamamı çevrilmemiş
   olacak — 73 yığın demek, her biri saniyeler süren çağrılar. Worker'ın süre
   sınırını zorlamamak için tura bölüyoruz: önbellek birkaç gecede doluyor,
   o arada çevrilmemiş kayıtlar İngilizce talimatla gidiyor. */
export const TUR_BASINA_YIGIN = 20;

/* Metni önbellekte arayacağımız anahtar. Uzun talimatları tam metinle
   anahtarlamak blob'u iki katına çıkarıyordu; kısa ve çakışmaya dayanıklı bir
   özet yetiyor. */
export function metinAnahtari(metin) {
  const t = String(metin);
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < t.length; i++) {
    const k = t.charCodeAt(i);
    h1 = Math.imul(h1 ^ k, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + k, 0x85ebca6b) >>> 0;
  }
  return t.length.toString(36) + '-' + h1.toString(36) + h2.toString(36);
}

export function promptUret(yigin) {
  const satir = [];
  satir.push('Aşağıdaki egzersiz talimatlarını Türkçeye çevir.');
  satir.push('');
  satir.push('Kurallar:');
  satir.push('- Spor salonunda kullanılan doğal Türkçeyi kullan.');
  satir.push('- Hareket adlarını ÇEVİRME: bench press, squat, deadlift, lat pulldown');
  satir.push('  gibi adlar Türkçede de böyle kullanılıyor.');
  satir.push('- Ekipman adlarını da olduğu gibi bırak: barbell, dumbbell, kettlebell.');
  satir.push('- Adım sayısını DEĞİŞTİRME; her adım için tam bir çeviri ver.');
  satir.push('- Adımları kısaltma, özetleme, birleştirme.');
  satir.push('- Ölçü birimlerini koru (inch, lb gibi birimleri çevirme, olduğu gibi yaz).');
  satir.push('');
  satir.push('Girdi JSON:');
  satir.push(JSON.stringify(yigin.map((y, i) => ({ i, adimlar: y.metinler })), null, 1));
  satir.push('');
  satir.push('Çıktı olarak SADECE şu şemada JSON ver, başka hiçbir şey yazma:');
  satir.push('[{"i": 0, "adimlar": ["çeviri 1", "çeviri 2"]}]');
  return satir.join('\n');
}

/* Modelin yanıtını girdiyle karşılaştırır. Adım sayısı tutmayan öğe ATILIR —
   yarım çeviriyi kabul edersek kullanıcı eksik talimat görür ve bunu fark
   etmesi zor. Atılan öğe bir sonraki turda yeniden denenir. */
export function yanitiEsle(yigin, yanit) {
  const liste = Array.isArray(yanit) ? yanit : [];
  const cikti = new Map();
  let atlanan = 0;

  for (const oge of liste) {
    if (!oge || typeof oge.i !== 'number') { atlanan++; continue; }
    const kaynak = yigin[oge.i];
    if (!kaynak) { atlanan++; continue; }
    const adimlar = Array.isArray(oge.adimlar) ? oge.adimlar : null;
    if (!adimlar || adimlar.length !== kaynak.metinler.length) { atlanan++; continue; }
    if (!adimlar.every(a => typeof a === 'string' && a.trim())) { atlanan++; continue; }
    cikti.set(oge.i, adimlar.map(a => a.trim()));
  }
  return { cikti, atlanan };
}

export async function onbellegiOku(env) {
  const v = await env.REMINDERS.get(ONBELLEK_ANAHTARI, 'json');
  return v && typeof v === 'object' ? v : {};
}

/* Talimat listelerini çevirir. Girdi: [{ ad, metinler: [...] }]
   Çıktı: aynı sırada [{ ad, ceviri: [...] | null }] */
export async function cevir(env, istekler, { getir, onbellek, enFazlaYigin } = {}) {
  const yiginSiniri = typeof enFazlaYigin === 'number' ? enFazlaYigin : TUR_BASINA_YIGIN;
  const kayit = onbellek || await onbellegiOku(env);
  const sonuc = istekler.map(i => ({ ad: i.ad, ceviri: null }));
  const eksikler = [];

  istekler.forEach((istek, sira) => {
    const metinler = (istek.metinler || []).filter(m => typeof m === 'string' && m.trim());
    if (!metinler.length) return;
    const anahtar = metinAnahtari(metinler.join('\u0001'));
    if (kayit[anahtar]) { sonuc[sira].ceviri = kayit[anahtar]; return; }
    eksikler.push({ sira, anahtar, metinler });
  });

  /* Sınır DENENEN yığını sayıyor, başarılı olanı değil. Eskiden cagri
     yalnız başarıda artıyordu; Gemini'nin kötü bir gecesinde ajan 20 yerine
     ~73 istek atıyordu. */
  let denenen = 0, cagri = 0, atlananToplam = 0, ertelenen = 0;
  for (let i = 0; i < eksikler.length; i += YIGIN_BOYU) {
    if (denenen >= yiginSiniri) { ertelenen = eksikler.length - i; break; }
    denenen++;
    const yigin = eksikler.slice(i, i + YIGIN_BOYU);
    let ham;
    try {
      ham = await sor(promptUret(yigin), env, { getir, sicaklik: 0.1 });
      cagri++;
    } catch (err) {
      /* Bir yığın patlarsa turun tamamını kaybetmiyoruz: o yığın çevrilmemiş
         kalır, kayıt İngilizce talimatla gider, bir sonraki tur tekrar dener. */
      console.error('[ajan] çeviri yığını başarısız:', err.message);
      atlananToplam += yigin.length;
      continue;
    }

    let eslesme;
    try {
      eslesme = yanitiEsle(yigin, jsonCoz(ham));
    } catch (err) {
      console.error('[ajan] çeviri yanıtı çözülemedi:', err.message);
      atlananToplam += yigin.length;
      continue;
    }

    atlananToplam += eslesme.atlanan;
    for (const [yiginSirasi, adimlar] of eslesme.cikti) {
      const hedef = yigin[yiginSirasi];
      if (!hedef) continue;
      kayit[hedef.anahtar] = adimlar;
      sonuc[hedef.sira].ceviri = adimlar;
    }
  }

  return {
    sonuc, kayit, cagri, ertelenen,
    cevrilen: eksikler.length - atlananToplam - ertelenen,
    atlanan: atlananToplam
  };
}

export async function onbellegiYaz(env, kayit) {
  await env.REMINDERS.put(ONBELLEK_ANAHTARI, JSON.stringify(kayit));
}
