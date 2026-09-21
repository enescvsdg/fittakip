/* Onaylanan egzersiz kayıtlarının dosyaya işlenmesi.

   Bu adım tehlikeli olan adım: betik egzersizler.js'i baştan yazıyor. Bir
   kaçırma hatası ya da eksik alan, çalışan 281 hareketi sessizce bozabilir.
   Buradaki ilk test tam olarak onu tutuyor — dosyayı okuyup hiçbir şey
   değiştirmeden yeniden yazınca veri birebir aynı kalmalı. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  dosyayiOku, dosyayiUret, birlestir, mekanlariSec, exercisesMetni, infoMetni
} from '../../tools/egzersiz-yaz.mjs';

const KOK = fileURLToPath(new URL('../../', import.meta.url));

const say = o => Object.values(o).reduce((n, v) => n + v.length, 0);

const onayKaydi = (tur, veri, ek = {}) => ({
  id: 'egzersiz:' + tur + ':' + veri.name, tur, ad: veri.name, veri, ...ek
});

export default async function ({ rapor }) {
  const dosya = await readFile(KOK + 'egzersizler.js', 'utf8');

  // ── TUR ────────────────────────────────────────
  rapor.baslik('dosya turu veri kaybetmiyor');
  const { EXERCISES, EXERCISE_INFO } = dosyayiOku(dosya);
  rapor.kontrol('Mevcut dosya okunabiliyor', say(EXERCISES) > 250, String(say(EXERCISES)));

  const yeniden = dosyayiUret(dosya, EXERCISES, EXERCISE_INFO);
  const geri = dosyayiOku(yeniden);
  rapor.kontrol('Yeniden yazınca hareket sayısı korunuyor',
    say(geri.EXERCISES) === say(EXERCISES), say(EXERCISES) + ' → ' + say(geri.EXERCISES));
  rapor.kontrol('Yeniden yazınca veri birebir aynı',
    JSON.stringify(geri.EXERCISES) === JSON.stringify(EXERCISES));
  rapor.kontrol('Elle bakımlı üst yarı korunuyor',
    yeniden.includes('var MUSCLE_TR') && yeniden.includes('var EQUIPMENT_TR'));
  rapor.kontrol('Üretim işareti duruyor',
    yeniden.includes('BURADAN AŞAĞISI ÜRETİLİYOR'));

  rapor.baslik('kesme işaretli adlar kaçırılıyor');
  /* Gerçek veride "Farmer's Walk" var. Kaçırma yapılmazsa üretilen dosya
     sözdizimi hatası veriyor ve uygulama hiç açılmıyor. */
  const tirnakli = exercisesMetni({
    'Evde': [{ name: "Farmer's Walk", equipment: 'kettlebells', level: 'beginner', muscle: 'forearms' }]
  });
  let calisti = true, okunan = null;
  try { okunan = new Function(tirnakli + '; return EXERCISES;')(); }
  catch { calisti = false; }
  rapor.kontrol('Kesme işaretli ad çalıştırılabilir çıktı veriyor', calisti);
  rapor.kontrol('Ad bozulmadan geri geliyor',
    calisti && okunan['Evde'][0].name === "Farmer's Walk",
    calisti ? okunan['Evde'][0].name : '(çalışmadı)');

  const tirnakliInfo = infoMetni({
    "Farmer's Walk": { secondary: ['traps'], instructions: ["Don't round your back."] }
  });
  let infoOk = true, infoOkunan = null;
  try { infoOkunan = new Function(tirnakliInfo + '; return EXERCISE_INFO;')(); }
  catch { infoOk = false; }
  rapor.kontrol('Talimat metnindeki kesme işareti de kaçırılıyor',
    infoOk && infoOkunan["Farmer's Walk"].instructions[0] === "Don't round your back.",
    infoOk ? 'tamam' : '(çalışmadı)');

  // ── MEKÂN KURALI ───────────────────────────────
  rapor.baslik('yeni hareket hangi mekâna gidiyor');
  /* Kural mevcut 281 kaydın gerçek dağılımından çıkarıldı, tahminle değil. */
  rapor.kontrol('kettlebell ikisinde birden',
    JSON.stringify(mekanlariSec('kettlebells')) === JSON.stringify(['Evde', 'Spor Salonunda']));
  rapor.kontrol('ekipmansız evde',
    JSON.stringify(mekanlariSec('none')) === JSON.stringify(['Evde']));
  rapor.kontrol('direnç bandı evde',
    JSON.stringify(mekanlariSec('bands')) === JSON.stringify(['Evde']));
  rapor.kontrol('barbell salonda',
    JSON.stringify(mekanlariSec('barbell')) === JSON.stringify(['Spor Salonunda']));
  rapor.kontrol('makine salonda',
    JSON.stringify(mekanlariSec('machine')) === JSON.stringify(['Spor Salonunda']));
  rapor.kontrol('Bilinmeyen ekipman salona düşüyor',
    JSON.stringify(mekanlariSec('atlas stone')) === JSON.stringify(['Spor Salonunda']));

  // ── BİRLEŞTİRME ────────────────────────────────
  const temelEx = {
    'Evde': [{ name: 'Push-Up', equipment: 'none', level: 'beginner', muscle: 'chest' }],
    'Spor Salonunda': [{ name: 'Barbell Bench Press', equipment: 'barbell', level: 'beginner', muscle: 'chest' }]
  };

  rapor.baslik('güncelleme kaydı');
  const g = birlestir(temelEx, {}, [
    onayKaydi('guncelleme', {
      name: 'Barbell Bench Press', secondary: ['shoulders', 'triceps'],
      instructions: ['Uzan.', 'İt.'], kaynakAd: 'Barbell Bench Press - Medium Grip'
    })
  ]);
  rapor.kontrol('Hareket listesi büyümüyor', say(g.EXERCISES) === say(temelEx),
    say(g.EXERCISES) + ' / ' + say(temelEx));
  rapor.kontrol('İkincil kas ve talimat bilgiye yazılıyor',
    g.EXERCISE_INFO['Barbell Bench Press'].secondary.length === 2 &&
    g.EXERCISE_INFO['Barbell Bench Press'].instructions.length === 2);
  rapor.kontrol('Sayaç doğru', g.rapor.bilgiEklendi === 1 && g.rapor.hareketEklendi === 0,
    JSON.stringify(g.rapor));

  rapor.baslik('girdi değiştirilmiyor');
  rapor.kontrol('Özgün EXERCISES bozulmadı', say(temelEx) === 2, String(say(temelEx)));
  rapor.kontrol('Yeni nesne döndürülüyor', g.EXERCISES !== temelEx);

  rapor.baslik('yeni hareket kaydı');
  const y = birlestir(temelEx, {}, [
    onayKaydi('yeni', {
      name: 'Kettlebell Swing', equipment: 'kettlebells', level: 'intermediate',
      muscle: 'glutes', secondary: ['hamstrings'], instructions: ['Salla.']
    })
  ]);
  rapor.kontrol('Hem eve hem salona eklendi', say(y.EXERCISES) === 4, String(say(y.EXERCISES)));
  rapor.kontrol('İki mekânda da aynı ad var',
    y.EXERCISES['Evde'].some(h => h.name === 'Kettlebell Swing') &&
    y.EXERCISES['Spor Salonunda'].some(h => h.name === 'Kettlebell Swing'));
  rapor.kontrol('Bilgisi de yazıldı', !!y.EXERCISE_INFO['Kettlebell Swing']);
  rapor.kontrol('Yalnızca dört alan saklanıyor',
    Object.keys(y.EXERCISES['Evde'].find(h => h.name === 'Kettlebell Swing')).join(',') ===
    'name,equipment,level,muscle');

  rapor.baslik('aynı ad iki kez eklenmiyor');
  const c = birlestir(temelEx, {}, [
    onayKaydi('yeni', {
      name: 'Push-Up', equipment: 'none', level: 'beginner', muscle: 'chest',
      secondary: ['triceps'], instructions: ['Yere yat.']
    })
  ]);
  rapor.kontrol('Liste büyümüyor', say(c.EXERCISES) === say(temelEx), String(say(c.EXERCISES)));
  rapor.kontrol('Ama bilgisi tazeleniyor',
    c.EXERCISE_INFO['Push-Up'].instructions.length === 1);

  rapor.baslik('işlenemeyen kayıtlar atlanıyor');
  const a = birlestir(temelEx, {}, [
    onayKaydi('guncelleme', { name: 'Burpee', eslesmedi: true }),
    onayKaydi('guncelleme', { name: 'Olmayan Hareket', secondary: [], instructions: ['x'] }),
    onayKaydi('kimbilir', { name: 'Tuhaf' })
  ]);
  rapor.kontrol('Üçü de atlandı', a.rapor.atlanan === 3, JSON.stringify(a.rapor.atlanan));
  rapor.kontrol('Hiçbiri dosyaya sızmadı',
    say(a.EXERCISES) === say(temelEx) && Object.keys(a.EXERCISE_INFO).length === 0);
  rapor.kontrol('Eşleşmeyenin sebebi yazılıyor',
    a.rapor.atlananlar.some(x => x.includes('kaynakta karşılığı yok')),
    a.rapor.atlananlar[0]);
  rapor.kontrol('Listede olmayanın sebebi yazılıyor',
    a.rapor.atlananlar.some(x => x.includes('listede yok')), a.rapor.atlananlar[1]);
  rapor.kontrol('Bilinmeyen türün sebebi yazılıyor',
    a.rapor.atlananlar.some(x => x.includes('bilinmeyen kayıt türü')), a.rapor.atlananlar[2]);

  // ── UÇTAN UCA ──────────────────────────────────
  rapor.baslik('gerçek dosyaya işleme');
  const gercek = birlestir(EXERCISES, EXERCISE_INFO, [
    onayKaydi('guncelleme', {
      name: 'Push-Up', secondary: ['shoulders', 'triceps'],
      instructions: ['Yere kapan.', 'İt.'], kaynakAd: 'Pushups'
    }),
    // Mevcut 281'de gerçekten olmayan bir ad — "Atlas Stones" listede var
    onayKaydi('yeni', {
      name: 'Zercher Squat', equipment: 'barbell', level: 'expert', muscle: 'quadriceps',
      secondary: ['glutes'], instructions: ['Barı dirsek kıvrımına al.']
    })
  ]);
  const uretilen = dosyayiUret(dosya, gercek.EXERCISES, gercek.EXERCISE_INFO);
  let sonOk = true, sonVeri = null;
  try { sonVeri = dosyayiOku(uretilen); } catch { sonOk = false; }
  rapor.kontrol('Üretilen dosya okunabiliyor', sonOk);
  rapor.kontrol('Bir hareket eklendi',
    sonOk && say(sonVeri.EXERCISES) === say(EXERCISES) + 1,
    sonOk ? say(EXERCISES) + ' → ' + say(sonVeri.EXERCISES) : '(okunamadı)');
  rapor.kontrol('Yeni hareket salona gitti',
    sonOk && sonVeri.EXERCISES['Spor Salonunda'].some(h => h.name === 'Zercher Squat'));
  const bilgiOnce = Object.keys(EXERCISE_INFO).length;
  rapor.kontrol('Bilgi kaydı tam iki arttı',
    sonOk && Object.keys(sonVeri.EXERCISE_INFO).length === bilgiOnce + 2,
    sonOk ? bilgiOnce + ' → ' + Object.keys(sonVeri.EXERCISE_INFO).length : '(okunamadı)');
  rapor.kontrol('İki kaydın ikisi de yerinde',
    sonOk && !!sonVeri.EXERCISE_INFO['Push-Up'] && !!sonVeri.EXERCISE_INFO['Zercher Squat']);
  rapor.kontrol('Mevcut hareketlerin hiçbiri kaybolmadı',
    sonOk && Object.keys(EXERCISES).every(m =>
      EXERCISES[m].every(h => sonVeri.EXERCISES[m].some(x => x.name === h.name))));
}
