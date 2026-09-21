/* ══════════════════════════════════════════
   AJAN 1 — EGZERSİZ

   Kaynak: yuhonas/free-exercise-db (Unlicense — kamu malı)
   876 hareket, 871'inde adım adım talimat, birincil + ikincil kas.

   Uygulamadaki 281 hareket zaten bu veri setinden derlenmiş ama sadeleştirilmiş
   adlarla: kaynakta "Barbell Bench Press - Medium Grip" yazan kayıt bizde
   "Barbell Bench Press". Bu yüzden ajanın asıl işi indirmek değil EŞLEŞTİRMEK —
   mevcut kaydımıza kaynaktaki hangi kaydın talimatı ve ikincil kası ait,
   onu bulmak.
   ══════════════════════════════════════════ */

import { turuYaz } from '../onay.js';
import { cevir, onbellegiYaz } from '../ceviri.js';

export const KAYNAK_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

export const MEVCUT_ANAHTAR = 'mevcut:egzersiz';

/* Kaynakta ekipman alanı iki türlü boş bırakılmış: "body only" ve null.
   Aynı şeyi anlatıyorlar — "Bodyweight Walking Lunge" null, "3/4 Sit-Up"
   ise "body only". Tek başlıkta birleştiriyoruz. */
const EKIPMAN_ESLESME = {
  // Kaynakta alan iki türlü boş bırakılmış — "Bodyweight Walking Lunge" null,
  // "3/4 Sit-Up" ise "body only". Aynı şeyi anlatıyorlar.
  '': 'none', 'body only': 'none',
  // Bizim sözlüğümüzde olup kaynakta hiç olmayan değerler. Kaynak barfiks
  // hareketlerini "body only" sayıyor; biz barı ekipman yazmışız. Eşitlemezsek
  // yedi barfiks hareketi hiç eşleşmiyor.
  'pull-up bar': 'none', 'bench': 'none', 'gym mat': 'none',
  // Tekil/çoğul ve tire farkı
  'kettlebell': 'kettlebells', 'e-z curl bar': 'ez curl bar'
};

export function ekipmaniNormallestir(deger) {
  if (deger === null || deger === undefined) return 'none';
  const d = String(deger).toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(EKIPMAN_ESLESME, d) ? EKIPMAN_ESLESME[d] : d;
}

/* Eşleştirme için ad anahtarı: küçük harf, yalnız harf ve rakam, sondaki
   çoğul eki atılmış. "Mountain Climber" ile "Mountain Climbers" aynı anahtara
   düşsün diye. */
export function adAnahtari(ad) {
  return String(ad || '').toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '');
}

/* Kaynakta kanonik kayıt yok: düz bench press yalnızca
   "Barbell Bench Press - Medium Grip" olarak var, sade adıyla hiç yok.
   Bu yüzden ada birebir bakmak yetmiyor; adayları puanlayıp en iyisini
   seçiyoruz.

   Puanlama kasıtlı olarak muhafazakâr: ekipman ya da kas grubu tutmuyorsa
   aday elenir. Yanlış eşleşme, eşleşmemekten kötü — kullanıcıya "bu hareketin
   talimatı budur" diye başka bir hareketin anlatımını göstermiş oluruz. */
export function adayPuani(bizim, kaynak) {
  const bizimEkipman = ekipmaniNormallestir(bizim.equipment);
  const kaynakEkipman = ekipmaniNormallestir(kaynak.equipment);
  if (bizimEkipman !== kaynakEkipman) return 0;

  const birincil = (kaynak.primaryMuscles || [])[0];
  if (birincil !== bizim.muscle) return 0;

  const a = adAnahtari(bizim.name);
  const b = adAnahtari(kaynak.name);
  if (a === b) return 100;

  /* Yalnızca SONA eklenen niteleme kabul ediliyor:
       "Barbell Bench Press"  ⊂  "Barbell Bench Press - Medium Grip"   ✓
     Başa eklenen kelime hareketi değiştiriyor, o yüzden reddediliyor:
       "Lat Pulldown"         ⊂  "One Arm Lat Pulldown"                ✗
       "Preacher Curl"        ⊂  "Reverse Barbell Preacher Curls"      ✗
     İkisi de gerçek veride çıktı; ortadaki eşleşmeyi serbest bıraktığımızda
     kullanıcıya başka bir hareketin talimatını göstermiş oluyorduk. */
  if (b.startsWith(a)) return 80 - Math.min(29, b.length - a.length);
  return 0;
}

export function enIyiAday(bizim, kaynakListe) {
  let enIyi = null, enIyiPuan = 0;
  for (const k of kaynakListe) {
    const p = adayPuani(bizim, k);
    if (p > enIyiPuan) { enIyiPuan = p; enIyi = k; }
  }
  return enIyiPuan > 0 ? { kayit: enIyi, puan: enIyiPuan } : null;
}

const KAS_TR = {
  abdominals: 'Karın', biceps: 'Biceps', calves: 'Baldır', chest: 'Göğüs',
  forearms: 'Ön Kol', glutes: 'Kalça', hamstrings: 'Arka Bacak', lats: 'Sırt (Lat)',
  'lower back': 'Bel', 'middle back': 'Sırt (Orta)', neck: 'Boyun',
  quadriceps: 'Bacak (Ön)', shoulders: 'Omuz', traps: 'Trapez', triceps: 'Triceps',
  adductors: 'Bacak İç', abductors: 'Bacak Dış'
};
const SEVIYE_TR = { beginner: 'Başlangıç', intermediate: 'Orta', expert: 'İleri' };
const EKIPMAN_TR = {
  none: 'Ekipmansız', barbell: 'Barbell', dumbbell: 'Dumbbell', cable: 'Kablo',
  machine: 'Makine', kettlebells: 'Kettlebell', bands: 'Direnç Bandı',
  'medicine ball': 'Sağlık Topu', 'exercise ball': 'Denge Topu',
  'foam roll': 'Foam Roller', 'ez curl bar': 'EZ Bar', other: 'Diğer'
};

const kasTr = k => KAS_TR[k] || k;
const kaslarTr = liste => (liste || []).map(kasTr).join(', ');

function ozet(kaynak) {
  return [
    EKIPMAN_TR[ekipmaniNormallestir(kaynak.equipment)] || 'Diğer',
    SEVIYE_TR[kaynak.level] || kaynak.level,
    kaslarTr(kaynak.primaryMuscles)
  ].filter(Boolean).join(' · ');
}

/* ── KAYIT ÜRETİMİ ──────────────────────────────── */

function guncellemeKaydi(bizim, aday) {
  const k = aday.kayit;
  const fark = [];
  if ((k.secondaryMuscles || []).length) {
    fark.push(['ikincil kas', '—', kaslarTr(k.secondaryMuscles), 'arti']);
  }
  if ((k.instructions || []).length) {
    fark.push(['talimat', 'yok', k.instructions.length + ' adım', 'arti']);
  }
  if (!fark.length) return null;   // eklenecek bir şey yoksa kayıt üretme

  const birebir = aday.puan === 100;
  return {
    id: 'egzersiz:guncelleme:' + adAnahtari(bizim.name),
    tur: 'guncelleme',
    grup: 'Mevcut hareketlere talimat + ikincil kas',
    ad: bizim.name,
    deger: ozet(k),
    aciklama: birebir
      ? 'Kaynakta aynı adla bulundu, eşleme gerekmedi.'
      : 'Kaynaktaki "' + k.name + '" kaydıyla eşleştirildi (eşleşme puanı ' +
        aday.puan + '/100). Ekipman ve birincil kas tutuyor.',
    supheli: aday.puan < 70,
    uyari: aday.puan < 70
      ? 'Ad benzerliği zayıf. Talimatın gerçekten bu harekete ait olduğunu doğrula.'
      : null,
    fark,
    talimat: k.instructions || null,
    veri: {
      name: bizim.name,
      secondary: k.secondaryMuscles || [],
      instructions: k.instructions || [],
      kaynakAd: k.name
    }
  };
}

function eslesmeyenKaydi(bizim) {
  return {
    id: 'egzersiz:eksik:' + adAnahtari(bizim.name),
    tur: 'guncelleme',
    grup: 'Kaynakta karşılığı bulunamayanlar',
    ad: bizim.name,
    deger: [EKIPMAN_TR[ekipmaniNormallestir(bizim.equipment)] || 'Diğer',
            SEVIYE_TR[bizim.level] || bizim.level, kasTr(bizim.muscle)]
           .filter(Boolean).join(' · '),
    aciklama: 'free-exercise-db\'de bu harekete ait bir kayıt bulunamadı. ' +
      'Talimatı ve ikincil kasları elle ya da model yardımıyla eklenmeli.',
    supheli: true,
    uyari: 'Bu kayıt için kaynakta veri yok — onaylasan bile talimat gelmez. ' +
      'Metin üretimi ayrı bir adım.',
    fark: null,
    talimat: null,
    veri: { name: bizim.name, eslesmedi: true }
  };
}

function yeniKayit(k) {
  const ikincil = (k.secondaryMuscles || []).length
    ? ' · ikincil: ' + kaslarTr(k.secondaryMuscles) : '';
  return {
    id: 'egzersiz:yeni:' + adAnahtari(k.name),
    tur: 'yeni',
    grup: 'Yeni hareketler · ' + kasTr((k.primaryMuscles || [])[0]),
    ad: k.name,
    deger: ozet(k) + ikincil,
    aciklama: 'Kaynakta var, bizde yok. Kategori: ' + (k.category || 'bilinmiyor') + '.',
    supheli: false,
    uyari: null,
    fark: null,
    talimat: k.instructions || null,
    veri: {
      name: k.name,
      equipment: ekipmaniNormallestir(k.equipment),
      level: k.level,
      muscle: (k.primaryMuscles || [])[0] || 'unknown',
      secondary: k.secondaryMuscles || [],
      instructions: k.instructions || [],
      category: k.category || null
    }
  };
}

/* ── ANA AKIŞ ───────────────────────────────────── */

export function kayitlariUret(mevcut, kaynak) {
  const kayitlar = [];
  const kullanilan = new Set();

  for (const bizim of mevcut) {
    const aday = enIyiAday(bizim, kaynak);
    if (!aday) { kayitlar.push(eslesmeyenKaydi(bizim)); continue; }
    kullanilan.add(aday.kayit.name);
    const k = guncellemeKaydi(bizim, aday);
    if (k) kayitlar.push(k);
  }

  for (const k of kaynak) {
    if (kullanilan.has(k.name)) continue;
    kayitlar.push(yeniKayit(k));
  }
  return kayitlar;
}

export async function calistir(env, { getir = fetch } = {}) {
  const mevcut = (await env.REMINDERS.get(MEVCUT_ANAHTAR, 'json')) || [];
  if (!Array.isArray(mevcut) || !mevcut.length) {
    throw new Error('Uygulamanın mevcut egzersiz listesi KV\'de yok. ' +
      'Önce "npm run veri-gonder" ile gönder — yoksa 281 hareketin hepsi ' +
      '"yeni" sanılır ve onay ekranı kullanılamaz hale gelir.');
  }

  const cevap = await getir(KAYNAK_URL);
  if (!cevap.ok) throw new Error('free-exercise-db indirilemedi: HTTP ' + cevap.status);
  const kaynak = await cevap.json();
  if (!Array.isArray(kaynak) || kaynak.length < 100) {
    throw new Error('Kaynak beklenenden küçük geldi (' +
      (Array.isArray(kaynak) ? kaynak.length : typeof kaynak) + ') — indirme yarım olabilir.');
  }

  const kayitlar = kayitlariUret(mevcut, kaynak);

  /* Talimatlar kaynakta İngilizce; uygulama Türkçe. Çeviri KV'de önbellekli,
     yalnız daha önce görülmemiş metinler modele gidiyor. Anahtar yoksa ya da
     çeviri başarısız olursa kayıt İngilizce talimatla gidiyor — turu tamamen
     kaybetmektense çevrilmemiş ama doğru veri iyidir. */
  let ceviriRaporu = { cagri: 0, cevrilen: 0, atlanan: 0, ertelenen: 0 };
  if (env.GEMINI_API_KEY) {
    const istekler = kayitlar
      .map((k, sira) => ({ sira, ad: k.ad, metinler: k.talimat || [] }))
      .filter(i => i.metinler.length);
    if (istekler.length) {
      try {
        const c = await cevir(env, istekler, { getir });
        c.sonuc.forEach((r, i) => {
          if (!r.ceviri) return;
          const kayit = kayitlar[istekler[i].sira];
          kayit.talimat = r.ceviri;
          kayit.veri.instructions = r.ceviri;
          kayit.veri.talimatDili = 'tr';
        });
        await onbellegiYaz(env, c.kayit);
        ceviriRaporu = {
          cagri: c.cagri, cevrilen: c.cevrilen, atlanan: c.atlanan, ertelenen: c.ertelenen
        };
      } catch (err) {
        console.error('[ajan] çeviri tamamen başarısız:', err.message);
      }
    }
  }

  /* Çevrilmemiş kalanları kullanıcıya söylüyoruz — panelde İngilizce talimat
     görünce "bozuk mu" diye düşünmesin. */
  for (const k of kayitlar) {
    if (k.talimat && k.talimat.length && k.veri.talimatDili !== 'tr') {
      k.aciklama += ' Talimat henüz çevrilmedi, İngilizce görünüyor.';
    }
  }

  const sonuc = await turuYaz(env, 'egzersiz', kayitlar);
  return {
    ...sonuc, kaynakBoyut: kaynak.length, mevcutBoyut: mevcut.length,
    ceviri: ceviriRaporu
  };
}
