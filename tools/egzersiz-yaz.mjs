/* ══════════════════════════════════════════
   egzersizler.js'in üretilen bölümünü yazar.

   Dosya ikiye ayrılıyor: işaret satırının üstü elle bakımlı (Türkçe kas ve
   ekipman sözlükleri), altı bu modülün ürettiği veri. Betik yalnızca alt
   yarıyı değiştiriyor, üst yarıya dokunmuyor.
   ══════════════════════════════════════════ */

export const ISARET = '▼▼▼ BURADAN AŞAĞISI ÜRETİLİYOR ▼▼▼';

/* Yeni hareketin hangi mekâna gideceği. Kural tahmin değil — mevcut 281
   kaydın gerçek dağılımından çıkarıldı:
     bands 12/0, foam roll 2/0, medicine ball 1/0, exercise ball 1/0,
     none 48/1        → evde
     barbell 0/54, cable 0/47, machine 0/24, ez curl bar 0/6, dumbbell 1/33,
     other 1/22       → salon
     kettlebell 10/10 → ikisinde birden */
export const EVDE_EKIPMAN = new Set(['none', 'bands', 'medicine ball', 'exercise ball', 'foam roll']);
export const IKISINDE_EKIPMAN = new Set(['kettlebells']);

export function mekanlariSec(ekipman) {
  if (IKISINDE_EKIPMAN.has(ekipman)) return ['Evde', 'Spor Salonunda'];
  if (EVDE_EKIPMAN.has(ekipman)) return ['Evde'];
  return ['Spor Salonunda'];
}

/* Satır sonu da kaçırılıyor: kaynaktaki tek bir çok satırlı talimat,
   kapanmamış bir metin sabiti üretip "veri-al"ın tamamını durduruyordu. */
const tirnak = t => "'" + String(t)
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/\r/g, '\\r')
  .replace(/\n/g, '\\n')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029') + "'";

function hareketSatiri(h) {
  return '  { name: ' + tirnak(h.name) +
    ', equipment: ' + tirnak(h.equipment) +
    ', level: ' + tirnak(h.level) +
    ', muscle: ' + tirnak(h.muscle) + ' }';
}

export function exercisesMetni(EXERCISES) {
  const mekanlar = Object.keys(EXERCISES);
  const govde = mekanlar.map(mekan => {
    const satirlar = EXERCISES[mekan].map(hareketSatiri).join(',\n');
    return '  ' + tirnak(mekan) + ': [\n' + satirlar.replace(/^/gm, '  ') + '\n  ]';
  }).join(',\n\n');
  return 'var EXERCISES = {\n' + govde + '\n};\n';
}

export function infoMetni(EXERCISE_INFO) {
  const adlar = Object.keys(EXERCISE_INFO).sort((a, b) => a.localeCompare(b, 'tr'));
  if (!adlar.length) return 'var EXERCISE_INFO = {};\n';
  const govde = adlar.map(ad => {
    const v = EXERCISE_INFO[ad];
    const ikincil = (v.secondary || []).map(tirnak).join(', ');
    const talimat = (v.instructions || [])
      .map(t => '      ' + tirnak(t)).join(',\n');
    return '  ' + tirnak(ad) + ': {\n' +
      '    secondary: [' + ikincil + '],\n' +
      '    instructions: [\n' + talimat + '\n    ]\n' +
      '  }';
  }).join(',\n');
  return 'var EXERCISE_INFO = {\n' + govde + '\n};\n';
}

/* Dosyanın üst yarısını koruyup alt yarısını yeniden yazar. */
export function dosyayiUret(eskiIcerik, EXERCISES, EXERCISE_INFO) {
  const i = eskiIcerik.indexOf(ISARET);
  if (i < 0) throw new Error('egzersizler.js içinde üretim işareti bulunamadı.');
  const blokSonu = eskiIcerik.indexOf('*/', i);
  if (blokSonu < 0) throw new Error('Üretim işaretinin yorum bloğu kapanmamış.');
  const ust = eskiIcerik.slice(0, blokSonu + 2);
  return ust + '\n\n' + exercisesMetni(EXERCISES) + '\n' + infoMetni(EXERCISE_INFO) + '\n';
}

/* Dosyadan mevcut EXERCISES ve EXERCISE_INFO'yu okur. */
export function dosyayiOku(icerik) {
  const i = icerik.indexOf('var EXERCISES');
  if (i < 0) throw new Error('egzersizler.js içinde EXERCISES bulunamadı.');
  const f = new Function(icerik.slice(i) +
    '; return { EXERCISES: EXERCISES, EXERCISE_INFO: typeof EXERCISE_INFO === "object" ? EXERCISE_INFO : {} };');
  return f();
}

/* ── BİRLEŞTİRME ───────────────────────────────── */

/* Onaylanmış kayıtları mevcut veriye işler. Değiştirmez, yeni nesne döndürür —
   birleştirme yarıda kalırsa dosya yarım yazılmış olmasın. */
export function birlestir(EXERCISES, EXERCISE_INFO, kayitlar) {
  const yeniEx = {};
  for (const mekan of Object.keys(EXERCISES)) yeniEx[mekan] = EXERCISES[mekan].slice();
  const yeniInfo = { ...EXERCISE_INFO };

  const rapor = { bilgiEklendi: 0, hareketEklendi: 0, atlanan: 0, atlananlar: [] };
  const varOlan = new Set();
  for (const mekan of Object.keys(yeniEx)) for (const h of yeniEx[mekan]) varOlan.add(h.name);

  for (const k of kayitlar) {
    const v = k.veri || {};

    if (v.eslesmedi) {
      rapor.atlanan++;
      rapor.atlananlar.push(v.name + ' (kaynakta karşılığı yok, işlenecek veri taşımıyor)');
      continue;
    }

    if (k.tur === 'guncelleme') {
      if (!varOlan.has(v.name)) {
        rapor.atlanan++;
        rapor.atlananlar.push(v.name + ' (güncellenecek hareket listede yok)');
        continue;
      }
      yeniInfo[v.name] = {
        secondary: v.secondary || [],
        instructions: v.instructions || []
      };
      rapor.bilgiEklendi++;
      continue;
    }

    if (k.tur === 'yeni') {
      if (varOlan.has(v.name)) {
        // Aynı ada sahip hareket zaten var — bilgisini tazele, listeye ikinci
        // kez ekleme
        yeniInfo[v.name] = { secondary: v.secondary || [], instructions: v.instructions || [] };
        rapor.bilgiEklendi++;
        continue;
      }
      const hareket = {
        name: v.name, equipment: v.equipment, level: v.level, muscle: v.muscle
      };
      for (const mekan of mekanlariSec(v.equipment)) {
        if (!yeniEx[mekan]) yeniEx[mekan] = [];
        yeniEx[mekan].push(hareket);
      }
      varOlan.add(v.name);
      if ((v.secondary || []).length || (v.instructions || []).length) {
        yeniInfo[v.name] = { secondary: v.secondary || [], instructions: v.instructions || [] };
      }
      rapor.hareketEklendi++;
      continue;
    }

    rapor.atlanan++;
    rapor.atlananlar.push((v.name || k.ad) + ' (bilinmeyen kayıt türü: ' + k.tur + ')');
  }

  return { EXERCISES: yeniEx, EXERCISE_INFO: yeniInfo, rapor };
}
