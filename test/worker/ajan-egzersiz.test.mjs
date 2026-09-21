/* Ajan 1 — egzersiz eşleştirmesi.

   Bu ajanın asıl işi indirmek değil eşleştirmek: uygulamadaki 281 hareket
   kaynaktan sadeleştirilmiş adlarla derlenmiş, kaynakta "Barbell Bench Press"
   diye bir kayıt yok — "Barbell Bench Press - Medium Grip" var.

   Buradaki vakaların hepsi gerçek veride çıktı. Özellikle iki tanesi:
     · "Lat Pulldown" → "One Arm Lat Pulldown" diye yanlış eşleşiyordu
     · "Pull-Up" hiç eşleşmiyordu, çünkü ekipmanı "pull-up bar" yazıyor ve
       kaynak barfiksi "body only" sayıyor
   Yanlış eşleşme, eşleşmemekten kötü: kullanıcıya başka bir hareketin
   talimatını gösteriyor. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';
import {
  ekipmaniNormallestir, adAnahtari, adayPuani, enIyiAday,
  kayitlariUret, calistir, MEVCUT_ANAHTAR
} from '../../worker/src/ajanlar/egzersiz.js';
import { bekleyenleriOku, turuYaz } from '../../worker/src/onay.js';

cronLoglariniSustur();

const kaynakKayit = (name, equipment, primary, ek = {}) => ({
  name, equipment, level: 'intermediate',
  primaryMuscles: [primary], secondaryMuscles: [],
  instructions: ['Adım bir.', 'Adım iki.'], category: 'strength', ...ek
});

const turuYazDeneme = (env, kayitlar) => turuYaz(env, 'egzersiz', kayitlar);

export default async function ({ rapor }) {
  const { env, adminCagir, gunlukCron, cron, gonderimler, saat, cagir, subscription } = await kur();

  rapor.baslik('ekipman sözlüğü eşitleniyor');
  rapor.kontrol('null vücut ağırlığı sayılıyor', ekipmaniNormallestir(null) === 'none');
  rapor.kontrol('"body only" ile null aynı yere düşüyor',
    ekipmaniNormallestir('body only') === ekipmaniNormallestir(null));
  rapor.kontrol('kettlebell ↔ kettlebells eşitlendi',
    ekipmaniNormallestir('kettlebell') === ekipmaniNormallestir('kettlebells'),
    ekipmaniNormallestir('kettlebell'));
  rapor.kontrol('pull-up bar vücut ağırlığına düşüyor',
    ekipmaniNormallestir('pull-up bar') === 'none');
  rapor.kontrol('e-z curl bar ↔ ez curl bar eşitlendi',
    ekipmaniNormallestir('e-z curl bar') === ekipmaniNormallestir('ez curl bar'));
  rapor.kontrol('Bilinmeyen değer olduğu gibi kalıyor',
    ekipmaniNormallestir('trap bar') === 'trap bar');

  rapor.baslik('ad anahtarı');
  rapor.kontrol('Çoğul eki atılıyor', adAnahtari('Pullups') === adAnahtari('Pull-Up'),
    adAnahtari('Pullups') + ' / ' + adAnahtari('Pull-Up'));
  rapor.kontrol('Tire ve boşluk önemsiz',
    adAnahtari('Mountain Climbers') === adAnahtari('mountain-climber'));

  rapor.baslik('sona eklenen niteleme kabul ediliyor');
  const bench = { name: 'Barbell Bench Press', equipment: 'barbell', muscle: 'chest' };
  const benchKaynak = kaynakKayit('Barbell Bench Press - Medium Grip', 'barbell', 'chest');
  rapor.kontrol('"- Medium Grip" eki eşleşiyor', adayPuani(bench, benchKaynak) > 0,
    String(adayPuani(bench, benchKaynak)));
  rapor.kontrol('Ek uzadıkça puan düşüyor',
    adayPuani(bench, benchKaynak) <
    adayPuani(bench, kaynakKayit('Barbell Bench Press', 'barbell', 'chest')));

  rapor.baslik('başa eklenen kelime reddediliyor');
  const pulldown = { name: 'Lat Pulldown', equipment: 'cable', muscle: 'lats' };
  rapor.kontrol('"One Arm Lat Pulldown" eşleşmiyor',
    adayPuani(pulldown, kaynakKayit('One Arm Lat Pulldown', 'cable', 'lats')) === 0);
  const preacher = { name: 'Preacher Curl', equipment: 'barbell', muscle: 'biceps' };
  rapor.kontrol('"Reverse Barbell Preacher Curls" eşleşmiyor',
    adayPuani(preacher, kaynakKayit('Reverse Barbell Preacher Curls', 'barbell', 'biceps')) === 0);

  rapor.baslik('ekipman ve kas kapısı');
  rapor.kontrol('Ekipman tutmuyorsa eşleşme yok',
    adayPuani({ name: 'Hip Thrust', equipment: 'none', muscle: 'glutes' },
              kaynakKayit('Barbell Hip Thrust', 'barbell', 'glutes')) === 0);
  rapor.kontrol('Birincil kas tutmuyorsa eşleşme yok',
    adayPuani({ name: 'Row', equipment: 'barbell', muscle: 'lats' },
              kaynakKayit('Row', 'barbell', 'biceps')) === 0);
  rapor.kontrol('pull-up bar ile body only eşleşebiliyor',
    adayPuani({ name: 'Pull-Up', equipment: 'pull-up bar', muscle: 'lats' },
              kaynakKayit('Pullups', 'body only', 'lats')) === 100);

  rapor.baslik('en iyi aday seçiliyor');
  const adaylar = [
    kaynakKayit('Barbell Bench Press - Medium Grip', 'barbell', 'chest'),
    kaynakKayit('Barbell Bench Press with Chains and Bands', 'barbell', 'chest'),
    kaynakKayit('Decline Barbell Bench Press', 'barbell', 'chest')
  ];
  const secilen = enIyiAday(bench, adaylar);
  rapor.kontrol('Kısa ekli aday kazanıyor',
    secilen.kayit.name === 'Barbell Bench Press - Medium Grip', secilen.kayit.name);
  rapor.kontrol('Hiç aday yoksa null dönüyor',
    enIyiAday(bench, [kaynakKayit('Squat', 'barbell', 'quadriceps')]) === null);

  rapor.baslik('kayıt üretimi');
  const mevcut = [
    { name: 'Barbell Bench Press', equipment: 'barbell', level: 'beginner', muscle: 'chest' },
    { name: 'Pull-Up', equipment: 'pull-up bar', level: 'intermediate', muscle: 'lats' },
    { name: 'Burpee', equipment: 'none', level: 'intermediate', muscle: 'chest' }
  ];
  const kaynak = [
    kaynakKayit('Barbell Bench Press - Medium Grip', 'barbell', 'chest',
      { secondaryMuscles: ['shoulders', 'triceps'] }),
    kaynakKayit('Pullups', 'body only', 'lats', { secondaryMuscles: ['biceps'] }),
    kaynakKayit('Atlas Stones', 'other', 'glutes')
  ];
  const kayitlar = kayitlariUret(mevcut, kaynak);

  const guncelleme = kayitlar.filter(k => k.tur === 'guncelleme' && !k.veri.eslesmedi);
  const eslesmeyen = kayitlar.filter(k => k.veri && k.veri.eslesmedi);
  const yeni = kayitlar.filter(k => k.tur === 'yeni');
  rapor.kontrol('İki güncelleme üretildi', guncelleme.length === 2,
    guncelleme.map(k => k.ad).join(','));
  rapor.kontrol('Eşleşmeyen ayrı gruba düştü',
    eslesmeyen.length === 1 && eslesmeyen[0].ad === 'Burpee', eslesmeyen.map(k => k.ad).join(','));
  rapor.kontrol('Eşleşmeyen şüpheli işaretli', eslesmeyen[0].supheli === true);
  rapor.kontrol('Eşleşmeyen için talimat uydurulmuyor', eslesmeyen[0].talimat === null);
  rapor.kontrol('Kullanılmayan kaynak kaydı yeni olarak geliyor',
    yeni.length === 1 && yeni[0].ad === 'Atlas Stones', yeni.map(k => k.ad).join(','));

  const benchKayit = guncelleme.find(k => k.ad === 'Barbell Bench Press');
  rapor.kontrol('İkincil kas Türkçeye çevriliyor',
    benchKayit.fark.some(f => f[2] === 'Omuz, Triceps'), JSON.stringify(benchKayit.fark));
  rapor.kontrol('Talimat kayda taşınıyor', benchKayit.talimat.length === 2);
  rapor.kontrol('Hangi kayıtla eşleştiği açıklamada yazıyor',
    benchKayit.aciklama.includes('Barbell Bench Press - Medium Grip'), benchKayit.aciklama);
  rapor.kontrol('Ham veri işlenmek üzere saklanıyor',
    benchKayit.veri.secondary.length === 2 && benchKayit.veri.instructions.length === 2);

  rapor.baslik('kimlikler kararlı');
  const ikinciUretim = kayitlariUret(mevcut, kaynak);
  rapor.kontrol('Aynı girdi aynı id\'leri üretiyor',
    JSON.stringify(kayitlar.map(k => k.id)) === JSON.stringify(ikinciUretim.map(k => k.id)));
  rapor.kontrol('id\'ler benzersiz',
    new Set(kayitlar.map(k => k.id)).size === kayitlar.length);

  rapor.baslik('eklenecek bir şey yoksa kayıt üretilmiyor');
  const yalin = kayitlariUret(
    [{ name: 'Squat', equipment: 'barbell', level: 'beginner', muscle: 'quadriceps' }],
    [kaynakKayit('Squat', 'barbell', 'quadriceps', { instructions: [], secondaryMuscles: [] })]
  );
  rapor.kontrol('Boş kaynak kaydı için güncelleme yok', yalin.length === 0,
    JSON.stringify(yalin.map(k => k.ad)));

  // ── TUR ────────────────────────────────────────
  rapor.baslik('tur çalışması');
  const sahteGetir = (govde, ok = true, status = 200) =>
    async () => ({ ok, status, json: async () => govde });

  let hata = null;
  try { await calistir(env, { getir: sahteGetir(kaynak) }); }
  catch (e) { hata = e.message; }
  rapor.kontrol('Mevcut liste KV\'de yoksa tur reddediliyor', hata !== null,
    String(hata).slice(0, 55));
  rapor.kontrol('Hata neden durduğunu söylüyor',
    String(hata).includes('veri-gonder'), String(hata).slice(0, 70));

  await env.REMINDERS.put(MEVCUT_ANAHTAR, JSON.stringify(mevcut));

  let kisaHata = null;
  try { await calistir(env, { getir: sahteGetir([kaynakKayit('Tek', 'barbell', 'chest')]) }); }
  catch (e) { kisaHata = e.message; }
  rapor.kontrol('Yarım inen kaynak reddediliyor', kisaHata !== null, String(kisaHata).slice(0, 55));

  let httpHata = null;
  try { await calistir(env, { getir: sahteGetir(null, false, 503) }); }
  catch (e) { httpHata = e.message; }
  rapor.kontrol('HTTP hatası yutulmuyor', String(httpHata).includes('503'), String(httpHata));

  const buyukKaynak = [...kaynak, ...Array.from({ length: 120 }, (_, i) =>
    kaynakKayit('Dolgu Hareketi ' + i, 'barbell', 'chest'))];
  const sonuc = await calistir(env, { getir: sahteGetir(buyukKaynak) });
  rapor.kontrol('Tur bekleyene yazıyor', sonuc.toplam > 0, JSON.stringify({
    yeni: sonuc.yeni, guncel: sonuc.guncel, toplam: sonuc.toplam
  }));
  rapor.kontrol('Kaynak boyutu raporlanıyor', sonuc.kaynakBoyut === buyukKaynak.length,
    String(sonuc.kaynakBoyut));
  const bekleyen = await bekleyenleriOku(env, 'egzersiz');
  rapor.kontrol('Kayıtlar onay kuyruğunda', bekleyen.length === sonuc.toplam,
    bekleyen.length + ' / ' + sonuc.toplam);
  rapor.kontrol('Hepsi egzersiz ajanına ait', bekleyen.every(k => k.ajan === 'egzersiz'));

  rapor.baslik('ikinci tur kuyruğu şişirmiyor');
  const tekrar = await calistir(env, { getir: sahteGetir(buyukKaynak) });
  rapor.kontrol('Aynı tur yeni kayıt eklemiyor', tekrar.yeni === 0, JSON.stringify(tekrar));
  rapor.kontrol('Kuyruk boyutu sabit kaldı',
    (await bekleyenleriOku(env, 'egzersiz')).length === bekleyen.length);

  // ── ZAMANLAYICI AYRIMI ─────────────────────────
  /* İki cron var ve karışmamaları gerekiyor. Ajanları dakikalık tura koysaydık
     günde 1440 tur ederdi; KV yazma sınırı 1000 ve bu sınır bir kez aşılıp
     bildirimleri kesmişti. */
  rapor.baslik('iki zamanlayıcı birbirine karışmıyor');

  await cagir('/sync', 'POST', {
    subscription, timezone: 'Europe/Istanbul',
    reminders: [{ id: 's1', name: 'Kreatin', dose: '5g', time: saat(0) }]
  });

  const oncekiGonderim = gonderimler.length;
  await gunlukCron();
  rapor.kontrol('Günlük tur hatırlatma göndermiyor',
    gonderimler.length === oncekiGonderim,
    gonderimler.length + ' / ' + oncekiGonderim);

  /* Ajanın son çalışma damgası dakikalık turda değişmemeli — değişiyorsa
     ajan o turda da dönüyor demektir. */
  const damgaOnce = await env.REMINDERS.get('calisma:egzersiz', 'json');
  await cron();
  const damgaSonra = await env.REMINDERS.get('calisma:egzersiz', 'json');
  rapor.kontrol('Dakikalık tur ajanı çalıştırmıyor',
    JSON.stringify(damgaOnce) === JSON.stringify(damgaSonra),
    JSON.stringify(damgaSonra));
  rapor.kontrol('Dakikalık tur onay kuyruğuna dokunmuyor',
    (await bekleyenleriOku(env, 'egzersiz')).length === bekleyen.length,
    String((await bekleyenleriOku(env, 'egzersiz')).length));

  rapor.baslik('elle tetikleme ucu');
  const bilinmeyen = await adminCagir('/admin/calistir', 'POST', { ajanlar: ['kimbilir'] });
  rapor.kontrol('Tanımsız ajan 400 dönüyor', bilinmeyen.status === 400, String(bilinmeyen.status));
  rapor.kontrol('Hangi ajanların tanındığını söylüyor',
    Array.isArray(bilinmeyen.body.taninan), JSON.stringify(bilinmeyen.body.taninan));

  const patlayan = await adminCagir('/admin/calistir', 'POST', { ajanlar: ['egzersiz'] });
  rapor.kontrol('Ağa çıkamayan ajan turu 200 ile raporlanıyor',
    patlayan.status === 200, String(patlayan.status));
  rapor.kontrol('Ajan hatası yutulmuyor, rapora yazılıyor',
    patlayan.body.egzersiz && patlayan.body.egzersiz.ok === false,
    JSON.stringify(patlayan.body).slice(0, 90));

  // ── ÇİFT MEKÂN ─────────────────────────────────
  rapor.baslik('iki mekânda birden geçen hareket');
  /* Gerçek veride 11 hareket hem "Evde" hem "Spor Salonunda" listesinde;
     alanları aynı. Tek kayıt üretilmeli, ve sayaç bunu "güncelleme" diye
     göstermemeli — güncellenen bir şey yok. */
  const ciftMekan = [
    { name: 'Kettlebell Swing', equipment: 'kettlebell', level: 'intermediate', muscle: 'glutes', mekan: 'Evde' },
    { name: 'Kettlebell Swing', equipment: 'kettlebell', level: 'intermediate', muscle: 'glutes', mekan: 'Spor Salonunda' }
  ];
  const ciftKayit = kayitlariUret(ciftMekan,
    [kaynakKayit('Kettlebell Swing', 'kettlebells', 'glutes', { secondaryMuscles: ['hamstrings'] })]);
  rapor.kontrol('İki mekân için iki kayıt üretiliyor', ciftKayit.length === 2,
    String(ciftKayit.length));
  rapor.kontrol('İkisi de aynı id\'yi taşıyor', ciftKayit[0].id === ciftKayit[1].id,
    ciftKayit[0].id);

  const kuyrukOnce = (await bekleyenleriOku(env, 'egzersiz')).length;
  const ciftTur = await turuYazDeneme(env, ciftKayit);
  const kuyrukSonra = (await bekleyenleriOku(env, 'egzersiz')).length;
  rapor.kontrol('Kuyruk yalnızca bir kayıt büyüyor', kuyrukSonra - kuyrukOnce === 1,
    kuyrukOnce + ' → ' + kuyrukSonra);
  rapor.kontrol('Tek kayıt yeni sayıldı', ciftTur.yeni === 1, JSON.stringify(ciftTur));
  rapor.kontrol('Kopya "güncelleme" sayılmıyor', ciftTur.guncel === 0, String(ciftTur.guncel));
  rapor.kontrol('Kopya ayrı sayaçta raporlanıyor', ciftTur.kopya === 1, String(ciftTur.kopya));

  // ── ÇEVİRİ ─────────────────────────────────────
  /* Talimatlar kaynakta İngilizce, uygulama Türkçe. Çeviri başarısız olursa
     kayıt İngilizce talimatla gitmeli — turu tamamen kaybetmek yerine. */
  rapor.baslik('talimatlar Türkçeye çevriliyor');

  const cevirmen = (yanitUret) => async (url, secenek) => {
    const metin = JSON.parse(secenek.body).contents[0].parts[0].text;
    if (metin.includes('Türkçeye çevir')) {
      const girdi = JSON.parse(metin.slice(metin.indexOf('[', metin.indexOf('Girdi JSON:')),
        metin.lastIndexOf(']', metin.indexOf('Çıktı olarak')) + 1));
      return {
        ok: true, status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: yanitUret(girdi) }] } }] })
      };
    }
    return { ok: false, status: 400, json: async () => ({ error: { message: 'beklenmeyen istek' } }) };
  };

  const ceviriKaynak = [
    kaynakKayit('Barbell Bench Press', 'barbell', 'chest',
      { instructions: ['Lie on the bench.', 'Press the bar up.'] }),
    ...Array.from({ length: 120 }, (_, i) =>
      kaynakKayit('Dolgu ' + i, 'barbell', 'chest', { instructions: ['Step one.'] }))
  ];
  const ceviriMevcut = [
    { name: 'Barbell Bench Press', equipment: 'barbell', level: 'beginner', muscle: 'chest' }
  ];

  const ceviriEnv = (await kur()).env;
  ceviriEnv.GEMINI_API_KEY = 'deneme';
  await ceviriEnv.REMINDERS.put(MEVCUT_ANAHTAR, JSON.stringify(ceviriMevcut));

  const basarili = await calistir(ceviriEnv, {
    getir: async (url, secenek) => {
      if (String(url).includes('free-exercise-db')) {
        return { ok: true, status: 200, json: async () => ceviriKaynak };
      }
      return cevirmen(g => JSON.stringify(
        g.map(x => ({ i: x.i, adimlar: x.adimlar.map(a => 'TR: ' + a) }))
      ))(url, secenek);
    }
  });
  rapor.kontrol('Çeviri raporu dönüyor', basarili.ceviri.cagri > 0,
    JSON.stringify(basarili.ceviri));

  const cevriliKuyruk = await bekleyenleriOku(ceviriEnv, 'egzersiz');
  const cevriliBench = cevriliKuyruk.find(k => k.ad === 'Barbell Bench Press');
  rapor.kontrol('Talimat Türkçeleşti',
    cevriliBench.talimat[0].startsWith('TR: '), cevriliBench.talimat[0]);
  rapor.kontrol('Adım sayısı korundu', cevriliBench.talimat.length === 2);
  rapor.kontrol('İşlenecek veriye de yazıldı',
    cevriliBench.veri.instructions[0].startsWith('TR: ') &&
    cevriliBench.veri.talimatDili === 'tr');
  rapor.kontrol('Çevrildiği için uyarı notu yok',
    !cevriliBench.aciklama.includes('çevrilmedi'), cevriliBench.aciklama.slice(-40));

  rapor.baslik('çeviri patlarsa tur devam ediyor');
  const kirikEnv = (await kur()).env;
  kirikEnv.GEMINI_API_KEY = 'deneme';
  await kirikEnv.REMINDERS.put(MEVCUT_ANAHTAR, JSON.stringify(ceviriMevcut));
  const kirik = await calistir(kirikEnv, {
    getir: async (url) => {
      if (String(url).includes('free-exercise-db')) {
        return { ok: true, status: 200, json: async () => ceviriKaynak };
      }
      return { ok: false, status: 500, json: async () => ({ error: { message: 'çöktü' } }) };
    }
  });
  rapor.kontrol('Tur yine de kayıt üretiyor', kirik.toplam > 0, String(kirik.toplam));
  const kirikBench = (await bekleyenleriOku(kirikEnv, 'egzersiz'))
    .find(k => k.ad === 'Barbell Bench Press');
  rapor.kontrol('Talimat İngilizce kalıyor, kaybolmuyor',
    kirikBench.talimat[0] === 'Lie on the bench.', kirikBench.talimat[0]);
  rapor.kontrol('Kullanıcıya çevrilmediği söyleniyor',
    kirikBench.aciklama.includes('çevrilmedi'), kirikBench.aciklama.slice(-45));

  rapor.baslik('anahtar yoksa çeviri denenmiyor');
  const anahtarsizEnv = (await kur()).env;
  delete anahtarsizEnv.GEMINI_API_KEY;
  await anahtarsizEnv.REMINDERS.put(MEVCUT_ANAHTAR, JSON.stringify(ceviriMevcut));
  let agaCikti = false;
  await calistir(anahtarsizEnv, {
    getir: async (url) => {
      if (String(url).includes('free-exercise-db')) {
        return { ok: true, status: 200, json: async () => ceviriKaynak };
      }
      agaCikti = true;
      return { ok: false, status: 500, json: async () => ({}) };
    }
  });
  rapor.kontrol('Gemini\'ye hiç gidilmedi', agaCikti === false);
}
