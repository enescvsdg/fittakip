/* ══════════════════════════════════════════
   AJAN 3 — ANTRENMAN ANALİZİ

   İş bölümü kasıtlı: SAYILARI KOD HESAPLIYOR, modeli yalnızca yorumluyor.
   Modele "haftalık hacmimi hesapla" dersen makul görünen ama yanlış sayılar
   üretir ve gözle ayırt edemezsin. Hesap burada, denetlenebilir; modelin işi
   "şu kas 3 haftadır ihmal edilmiş, sebebi şu olabilir" demek.

   Geçmiş verisi telefonda duruyor (localStorage). Uygulama "Analiz Et"e
   basınca geçmişi buraya yolluyor; Worker saklamıyor, yalnız özetleyip
   modele veriyor ve çıkan yorumu onay kuyruğuna yazıyor.
   ══════════════════════════════════════════ */

import { sor, jsonCoz } from '../gemini.js';
import { turuYaz } from '../onay.js';

const GUN_MS = 86400000;
const HAFTA_MS = 7 * GUN_MS;

const KAS_TR = {
  abdominals: 'Karın', biceps: 'Biceps', calves: 'Baldır', chest: 'Göğüs',
  forearms: 'Ön Kol', glutes: 'Kalça', hamstrings: 'Arka Bacak', lats: 'Sırt (Lat)',
  'lower back': 'Bel', 'middle back': 'Sırt (Orta)', neck: 'Boyun',
  quadriceps: 'Bacak (Ön)', shoulders: 'Omuz', traps: 'Trapez', triceps: 'Triceps',
  adductors: 'Bacak İç', abductors: 'Bacak Dış', unknown: 'Belirsiz'
};
const kasTr = k => KAS_TR[k] || k || 'Belirsiz';

/* Bir setin "iş"i. Hacmi set sayısıyla değil tonajla ölçmek gerekiyor:
   5 kg × 20 tekrar ile 100 kg × 5 tekrar aynı set sayısında ama aynı yük değil. */
const setTonaji = s => (Number(s.weight) || 0) * (Number(s.reps) || 0);

function haftaBasi(zaman) {
  const d = new Date(zaman);
  const gun = (d.getUTCDay() + 6) % 7;            // pazartesi = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - gun);
}

export function ozetle(gecmis, simdi = Date.now()) {
  const seanslar = (Array.isArray(gecmis) ? gecmis : [])
    .filter(s => s && s.date && Array.isArray(s.exercises))
    .map(s => ({ ...s, zaman: Date.parse(s.date) }))
    .filter(s => Number.isFinite(s.zaman))
    .sort((a, b) => a.zaman - b.zaman);

  if (!seanslar.length) return null;

  const ilk = seanslar[0].zaman;
  const son = seanslar[seanslar.length - 1].zaman;

  // ── haftalık set sayısı ──
  const haftalar = new Map();
  for (const s of seanslar) {
    const h = haftaBasi(s.zaman);
    if (!haftalar.has(h)) haftalar.set(h, { set: 0, tonaj: 0, seans: 0 });
    const kayit = haftalar.get(h);
    kayit.seans++;
    for (const e of s.exercises) {
      for (const st of (e.sets || [])) { kayit.set++; kayit.tonaj += setTonaji(st); }
    }
  }
  const haftalik = [...haftalar.entries()].sort((a, b) => a[0] - b[0]).slice(-8)
    .map(([h, v]) => ({
      hafta: new Date(h).toISOString().slice(0, 10),
      seans: v.seans, set: v.set, tonaj: Math.round(v.tonaj)
    }));

  // ── kas grubu dağılımı: son 4 hafta / önceki 4 hafta ──
  const sinir = simdi - 4 * HAFTA_MS;
  const oncekiSinir = simdi - 8 * HAFTA_MS;
  const kasSon = {}, kasOnce = {};
  for (const s of seanslar) {
    const hedef = s.zaman >= sinir ? kasSon : (s.zaman >= oncekiSinir ? kasOnce : null);
    if (!hedef) continue;
    for (const e of s.exercises) {
      const k = kasTr(e.muscle);
      hedef[k] = (hedef[k] || 0) + (e.sets || []).length;
    }
  }
  const kaslar = [...new Set([...Object.keys(kasSon), ...Object.keys(kasOnce)])]
    .map(k => ({ kas: k, son4Hafta: kasSon[k] || 0, onceki4Hafta: kasOnce[k] || 0 }))
    .sort((a, b) => b.son4Hafta - a.son4Hafta);

  // ── hareket bazlı ilerleme ──
  const hareketler = new Map();
  for (const s of seanslar) {
    for (const e of s.exercises) {
      const setler = e.sets || [];
      if (!setler.length) continue;
      const enAgir = Math.max(...setler.map(x => Number(x.weight) || 0));
      if (!hareketler.has(e.name)) hareketler.set(e.name, []);
      hareketler.get(e.name).push({
        tarih: s.date, zaman: s.zaman, agirlik: enAgir,
        tekrar: setler.find(x => (Number(x.weight) || 0) === enAgir)?.reps || 0,
        set: setler.length
      });
    }
  }

  const ilerleme = [];
  for (const [ad, kayitlar] of hareketler) {
    if (kayitlar.length < 3) continue;                 // eğilim için en az üç seans
    const agirliklar = kayitlar.map(k => k.agirlik);
    if (agirliklar.every(a => a === 0)) continue;      // ağırlıksız hareket
    const enIyi = Math.max(...agirliklar);
    /* En iyiye İLK ulaşılan seansa bakıyoruz, sonuncusuna değil. Durgunluk
       "o ağırlığı bir daha aşamadım" demek; lastIndexOf ile bakınca 60-60-60
       dizisi "hiç durmamış" görünüyordu. */
    const enIyiIndeks = agirliklar.indexOf(enIyi);
    const sonrakiSeans = kayitlar.length - 1 - enIyiIndeks;
    ilerleme.push({
      hareket: ad,
      seans: kayitlar.length,
      ilk: agirliklar[0],
      son: agirliklar[agirliklar.length - 1],
      enIyi,
      /* "Durgun" = en iyi ağırlığa ulaşıldıktan sonra üç veya daha fazla seans
         geçmiş ve hâlâ aşılmamış. İki seans geçici bir düşüş olabilir. */
      durgunSeans: sonrakiSeans,
      durgun: sonrakiSeans >= 3
    });
  }
  ilerleme.sort((a, b) => b.seans - a.seans);

  return {
    ilkTarih: new Date(ilk).toISOString().slice(0, 10),
    sonTarih: new Date(son).toISOString().slice(0, 10),
    seansSayisi: seanslar.length,
    gunAraligi: Math.round((son - ilk) / GUN_MS) + 1,
    toplamSet: seanslar.reduce((n, s) =>
      n + s.exercises.reduce((m, e) => m + (e.sets || []).length, 0), 0),
    haftalik,
    kaslar,
    ilerleme: ilerleme.slice(0, 20),
    durgunlar: ilerleme.filter(x => x.durgun).map(x => x.hareket),
    ihmalEdilenler: kaslar
      .filter(k => k.son4Hafta === 0 && k.onceki4Hafta > 0)
      .map(k => k.kas)
  };
}

export function promptUret(ozet, profil = {}) {
  const satir = [];
  satir.push('Sen bir antrenman koçusun. Aşağıdaki veriler bir kişinin gerçek');
  satir.push('antrenman kaydından HESAPLANDI — sayılar doğru, yeniden hesaplama.');
  satir.push('Senden istenen bu sayıları YORUMLAMAK.');
  satir.push('');

  if (profil.cinsiyet || profil.yas || profil.kilo || profil.hedef) {
    satir.push('KİŞİ: ' + [
      profil.cinsiyet, profil.yas && profil.yas + ' yaş',
      profil.kilo && profil.kilo + ' kg', profil.hedef
    ].filter(Boolean).join(', '));
    satir.push('');
  }

  satir.push('DÖNEM: ' + ozet.ilkTarih + ' → ' + ozet.sonTarih +
    ' (' + ozet.gunAraligi + ' gün, ' + ozet.seansSayisi + ' seans, ' +
    ozet.toplamSet + ' set)');
  satir.push('');

  satir.push('HAFTALIK HACİM:');
  for (const h of ozet.haftalik) {
    satir.push('  ' + h.hafta + '  ' + h.seans + ' seans, ' + h.set +
      ' set, ' + h.tonaj + ' kg tonaj');
  }
  satir.push('');

  satir.push('KAS GRUBU SET DAĞILIMI (son 4 hafta / önceki 4 hafta):');
  for (const k of ozet.kaslar) {
    satir.push('  ' + k.kas + ': ' + k.son4Hafta + ' / ' + k.onceki4Hafta);
  }
  satir.push('');

  if (ozet.ilerleme.length) {
    satir.push('HAREKET İLERLEMESİ (en ağır set, kg):');
    for (const i of ozet.ilerleme) {
      satir.push('  ' + i.hareket + ': ' + i.ilk + ' → ' + i.son +
        ' (en iyi ' + i.enIyi + ', ' + i.seans + ' seans' +
        (i.durgun ? ', ' + i.durgunSeans + ' seanstır aşılmadı' : '') + ')');
    }
    satir.push('');
  }

  satir.push('Şu JSON şemasıyla yanıt ver, başka hiçbir şey yazma:');
  satir.push('{');
  satir.push('  "baslik": "kısa başlık",');
  satir.push('  "bulgular": [');
  satir.push('    {"konu": "Hacim|Durgunluk|Denge|Süreklilik", "metin": "tek cümlelik tespit"}');
  satir.push('  ],');
  satir.push('  "oneriler": ["somut, uygulanabilir öneri"]');
  satir.push('}');
  satir.push('');
  satir.push('Kurallar:');
  satir.push('- Türkçe yaz.');
  satir.push('- 3-5 bulgu, 2-4 öneri.');
  satir.push('- Her bulguda yukarıdaki sayılardan en az birine atıf yap.');
  satir.push('- Veride olmayan bir şeyi uydurma. Emin değilsen o konuyu atla.');
  satir.push('- Sağlık tavsiyesi, teşhis ya da beslenme/ilaç önerisi verme; yalnız antrenman.');
  return satir.join('\n');
}

export function yanitiDogrula(yanit) {
  if (!yanit || typeof yanit !== 'object') throw new Error('Yanıt nesne değil.');
  const bulgular = Array.isArray(yanit.bulgular) ? yanit.bulgular : [];
  const oneriler = Array.isArray(yanit.oneriler) ? yanit.oneriler : [];
  if (!bulgular.length) throw new Error('Yanıtta bulgu yok.');
  const temizBulgular = bulgular
    .filter(b => b && typeof b.metin === 'string' && b.metin.trim())
    .map(b => ({ konu: String(b.konu || 'Genel').slice(0, 40), metin: b.metin.trim().slice(0, 400) }));
  if (!temizBulgular.length) throw new Error('Bulguların hiçbiri metin taşımıyor.');
  return {
    baslik: String(yanit.baslik || 'Antrenman değerlendirmesi').slice(0, 120),
    bulgular: temizBulgular.slice(0, 8),
    oneriler: oneriler.filter(o => typeof o === 'string' && o.trim())
      .map(o => o.trim().slice(0, 400)).slice(0, 6)
  };
}

export async function calistir(env, { gecmis, profil, getir, simdi } = {}) {
  const ozet = ozetle(gecmis, simdi);
  if (!ozet) {
    throw new Error('Analiz edilecek antrenman kaydı yok. En az bir seans kaydet.');
  }
  if (ozet.seansSayisi < 3) {
    throw new Error('Analiz için en az 3 seans gerekiyor; şu an ' + ozet.seansSayisi +
      ' var. Daha fazla antrenman kaydedince tekrar dene.');
  }

  const ham = await sor(promptUret(ozet, profil), env, { getir, sicaklik: 0.3 });
  const yanit = yanitiDogrula(jsonCoz(ham));

  const metin = [
    ...yanit.bulgular.map(b => b.konu + ': ' + b.metin),
    ...(yanit.oneriler.length ? ['Öneriler: ' + yanit.oneriler.join(' · ')] : [])
  ];

  const kayit = {
    /* Kimlik dönemi taşıyor: aynı dönem için ikinci kez analiz istersen eski
       kayıt yenisiyle değişsin, kuyrukta üst üste birikmesin. */
    id: 'analiz:' + ozet.ilkTarih + '_' + ozet.sonTarih,
    tur: 'yeni',
    grup: 'Antrenman analizi',
    ad: yanit.baslik,
    deger: ozet.seansSayisi + ' seans · ' + ozet.toplamSet + ' set · ' +
      ozet.gunAraligi + ' gün',
    aciklama: 'Sayılar antrenman kaydından hesaplandı; yorum Gemini\'den. ' +
      'Sonuç uygulamada zaten gösterildi — bu kayıt geçmişe bakabilmek için duruyor.',
    supheli: false,
    uyari: ozet.durgunlar.length
      ? 'Durgun görünen hareketler: ' + ozet.durgunlar.slice(0, 5).join(', ')
      : null,
    fark: null,
    metin,
    veri: { ozet, yanit }
  };

  const sonuc = await turuYaz(env, 'analiz', [kayit]);
  /* Yorumu da geri veriyoruz: analiz bir VERİ değil RAPOR. Kullanıcının kendi
     antrenmanı hakkında, kendisi için üretildi — okumadan önce onay beklemesi
     ters olurdu. Kuyruktaki kayıt onay kapısı değil, geçmiş kaydı: panelden
     eski değerlendirmelere bakılabilsin diye duruyor. */
  return {
    ...sonuc, seans: ozet.seansSayisi, bulgu: yanit.bulgular.length,
    analiz: yanit, ozet
  };
}
