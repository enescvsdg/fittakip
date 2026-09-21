/* Ajan 3 — antrenman analizi.

   İş bölümü bu ajanın tasarım kararı: sayıları kod hesaplıyor, model yalnız
   yorumluyor. Modele "haftalık hacmimi hesapla" dersen makul görünen ama
   yanlış sayılar üretir ve gözle ayırt edemezsin. Bu takım hesabın doğru
   olduğunu ve modelin çıktısının denetlendiğini tutuyor. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';
import { ozetle, promptUret, yanitiDogrula, calistir } from '../../worker/src/ajanlar/analiz.js';
import { jsonCoz } from '../../worker/src/gemini.js';
import { bekleyenleriOku } from '../../worker/src/onay.js';

cronLoglariniSustur();

const GUN = 86400000;
const AN = Date.parse('2026-09-21T09:00:00Z');
const gun = n => new Date(AN - n * GUN).toISOString().slice(0, 10);

const seans = (gunOnce, hareketler) => ({
  date: gun(gunOnce), weekday: 'Pazartesi', title: 'Deneme', exercises: hareketler
});
const hareket = (name, muscle, setler) => ({
  name, muscle, sets: setler.map(([weight, reps]) => ({ weight, reps }))
});

/* Gemini'yi taklit eden fetch: ne sorulduğunu da yakalıyor ki prompt'un
   içeriğini sınayabilelim. */
function sahteGemini(yanitMetni, { ok = true, status = 200 } = {}) {
  const cagrilar = [];
  const getir = async (url, secenek) => {
    cagrilar.push({ url: String(url), govde: JSON.parse(secenek.body) });
    if (!ok) return { ok: false, status, json: async () => ({ error: { message: 'yoğunluk' } }) };
    return {
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: yanitMetni }] } }] })
    };
  };
  return { getir, cagrilar };
}

const IYI_YANIT = JSON.stringify({
  baslik: 'Son 6 haftanın değerlendirmesi',
  bulgular: [
    { konu: 'Hacim', metin: 'Haftalık set sayın 12\'den 18\'e çıkmış.' },
    { konu: 'Durgunluk', metin: 'Bench press 4 seanstır 60 kg\'da sabit.' }
  ],
  oneriler: ['Bench press\'te 5x5\'e geç.', 'Haftaya bir bacak günü ekle.']
});

export default async function ({ rapor }) {
  const { env, cagir } = await kur();
  env.GEMINI_API_KEY = 'deneme-anahtari';

  // ── ÖZETLEME ───────────────────────────────────
  rapor.baslik('boş ve yetersiz geçmiş');
  rapor.kontrol('Boş geçmiş null dönüyor', ozetle([], AN) === null);
  rapor.kontrol('Geçersiz kayıtlar eleniyor',
    ozetle([{ date: 'olmayan-tarih', exercises: [] }, null, { exercises: [] }], AN) === null);

  rapor.baslik('temel sayılar');
  const gecmis = [
    seans(40, [hareket('Barbell Bench Press', 'chest', [[50, 8], [50, 8], [55, 6]])]),
    seans(33, [hareket('Barbell Bench Press', 'chest', [[55, 8], [60, 6]]),
               hareket('Barbell Squat', 'quadriceps', [[80, 5], [80, 5]])]),
    seans(26, [hareket('Barbell Bench Press', 'chest', [[60, 8], [60, 8]]),
               hareket('Barbell Squat', 'quadriceps', [[85, 5], [85, 5]])]),
    seans(12, [hareket('Barbell Bench Press', 'chest', [[60, 8], [60, 7]]),
               hareket('Barbell Squat', 'quadriceps', [[90, 5], [90, 5], [90, 4]])]),
    seans(5,  [hareket('Barbell Bench Press', 'chest', [[60, 8], [60, 8]]),
               hareket('Barbell Squat', 'quadriceps', [[95, 5], [95, 5]])])
  ];
  const o = ozetle(gecmis, AN);
  rapor.kontrol('Seans sayısı doğru', o.seansSayisi === 5, String(o.seansSayisi));
  rapor.kontrol('Toplam set doğru', o.toplamSet === 20, String(o.toplamSet));
  rapor.kontrol('İlk ve son tarih doğru',
    o.ilkTarih === gun(40) && o.sonTarih === gun(5), o.ilkTarih + ' → ' + o.sonTarih);
  rapor.kontrol('Haftalık döküm üretiliyor', o.haftalik.length >= 4, String(o.haftalik.length));
  rapor.kontrol('Tonaj hesaplanıyor — set sayısı değil, yük',
    o.haftalik.every(h => h.tonaj > 0), JSON.stringify(o.haftalik[0]));

  rapor.baslik('kas dağılımı Türkçeleşiyor');
  const kasAdlari = o.kaslar.map(k => k.kas);
  rapor.kontrol('İngilizce kas adı kalmıyor',
    kasAdlari.includes('Göğüs') && kasAdlari.includes('Bacak (Ön)'), kasAdlari.join(', '));
  rapor.kontrol('Son 4 hafta ile önceki ayrı sayılıyor',
    o.kaslar.every(k => typeof k.son4Hafta === 'number' && typeof k.onceki4Hafta === 'number'));

  rapor.baslik('durgunluk tespiti');
  const bench = o.ilerleme.find(i => i.hareket === 'Barbell Bench Press');
  const squat = o.ilerleme.find(i => i.hareket === 'Barbell Squat');
  rapor.kontrol('Bench en iyi ağırlığı 60', bench.enIyi === 60, String(bench.enIyi));
  rapor.kontrol('Bench durgun sayılıyor', bench.durgun === true,
    bench.durgunSeans + ' seans aşılmadı');
  rapor.kontrol('Squat ilerliyor, durgun değil', squat.durgun === false,
    squat.ilk + ' → ' + squat.son);
  rapor.kontrol('Durgunlar ayrıca listeleniyor',
    o.durgunlar.includes('Barbell Bench Press') && !o.durgunlar.includes('Barbell Squat'),
    o.durgunlar.join(', '));

  rapor.baslik('üç seanstan az hareket eğilime girmiyor');
  const az = ozetle([...gecmis, seans(2, [hareket('Yeni Hareket', 'biceps', [[20, 10]])])], AN);
  rapor.kontrol('Tek seanslık hareket ilerlemede yok',
    !az.ilerleme.some(i => i.hareket === 'Yeni Hareket'),
    az.ilerleme.map(i => i.hareket).join(', '));

  rapor.baslik('ağırlıksız hareket ilerlemeye girmiyor');
  const agirliksiz = ozetle([
    seans(20, [hareket('Plank', 'abdominals', [[0, 60]])]),
    seans(14, [hareket('Plank', 'abdominals', [[0, 70]])]),
    seans(7,  [hareket('Plank', 'abdominals', [[0, 80]])])
  ], AN);
  rapor.kontrol('Sıfır ağırlıklı hareket eğilime alınmıyor',
    !agirliksiz.ilerleme.some(i => i.hareket === 'Plank'),
    JSON.stringify(agirliksiz.ilerleme));

  rapor.baslik('ihmal edilen kas');
  const ihmal = ozetle([
    seans(50, [hareket('Leg Curl', 'hamstrings', [[30, 10]])]),
    seans(44, [hareket('Leg Curl', 'hamstrings', [[30, 10]])]),
    seans(10, [hareket('Barbell Bench Press', 'chest', [[60, 8]])]),
    seans(3,  [hareket('Barbell Bench Press', 'chest', [[60, 8]])])
  ], AN);
  rapor.kontrol('Eskiden çalışılıp bırakılan kas yakalanıyor',
    ihmal.ihmalEdilenler.includes('Arka Bacak'), ihmal.ihmalEdilenler.join(', '));
  rapor.kontrol('Hâlâ çalışılan kas ihmal sayılmıyor',
    !ihmal.ihmalEdilenler.includes('Göğüs'));

  // ── PROMPT ─────────────────────────────────────
  rapor.baslik('prompt sayıları taşıyor');
  const metin = promptUret(o, { cinsiyet: 'erkek', yas: 30, kilo: 78, hedef: 'Kilo Almak' });
  rapor.kontrol('Modele "hesaplama" deniyor',
    metin.includes('yeniden hesaplama'), 'uyarı var');
  rapor.kontrol('Haftalık hacim prompt\'ta', metin.includes('HAFTALIK HACİM'));
  rapor.kontrol('Kas dağılımı prompt\'ta', metin.includes('Göğüs:'));
  rapor.kontrol('Durgunluk bilgisi prompt\'ta', metin.includes('seanstır aşılmadı'));
  rapor.kontrol('Profil taşınıyor', metin.includes('78 kg') && metin.includes('Kilo Almak'));
  rapor.kontrol('Türkçe isteniyor', metin.includes('Türkçe yaz'));
  rapor.kontrol('Sağlık tavsiyesi yasaklanıyor',
    metin.includes('Sağlık tavsiyesi'), 'sınır var');
  rapor.kontrol('Uydurma yasaklanıyor', metin.includes('uydurma'));

  // ── YANIT DOĞRULAMA ────────────────────────────
  rapor.baslik('model yanıtı denetleniyor');
  let h1 = null;
  try { yanitiDogrula({ baslik: 'x' }); } catch (e) { h1 = e.message; }
  rapor.kontrol('Bulgusuz yanıt reddediliyor', h1 !== null, String(h1));

  let h2 = null;
  try { yanitiDogrula({ bulgular: [{ konu: 'Hacim' }] }); } catch (e) { h2 = e.message; }
  rapor.kontrol('Metinsiz bulgu reddediliyor', h2 !== null, String(h2));

  let h3 = null;
  try { yanitiDogrula('düz metin'); } catch (e) { h3 = e.message; }
  rapor.kontrol('Nesne olmayan yanıt reddediliyor', h3 !== null, String(h3));

  const temiz = yanitiDogrula({
    baslik: 'a'.repeat(300),
    bulgular: Array.from({ length: 20 }, (_, i) => ({ konu: 'K', metin: 'bulgu ' + i })),
    oneriler: ['iyi', '', null, 42, '  boşluklu  ']
  });
  rapor.kontrol('Başlık kırpılıyor', temiz.baslik.length <= 120, String(temiz.baslik.length));
  rapor.kontrol('Bulgu sayısı sınırlanıyor', temiz.bulgular.length <= 8, String(temiz.bulgular.length));
  rapor.kontrol('Bozuk öneriler eleniyor',
    temiz.oneriler.length === 2 && temiz.oneriler[1] === 'boşluklu',
    JSON.stringify(temiz.oneriler));

  // ── JSON ÇÖZÜMLEME ─────────────────────────────
  rapor.baslik('modelin sohbeti temizleniyor');
  rapor.kontrol('```json çiti soyuluyor',
    jsonCoz('```json\n{"a":1}\n```').a === 1);
  rapor.kontrol('Çitsiz kod bloğu soyuluyor', jsonCoz('```\n{"a":2}\n```').a === 2);
  rapor.kontrol('Öndeki açıklama atlanıyor',
    jsonCoz('İşte istediğin JSON: {"a":3}').a === 3);
  rapor.kontrol('Arkadaki açıklama atlanıyor',
    jsonCoz('{"a":4}\nUmarım yardımcı olur.').a === 4);
  rapor.kontrol('Dizi de çözülüyor', jsonCoz('[1,2,3]').length === 3);
  let cozHata = null;
  try { jsonCoz('hiç JSON yok'); } catch (e) { cozHata = e.message; }
  rapor.kontrol('JSON yoksa hata veriyor', cozHata !== null, String(cozHata).slice(0, 50));

  // ── TUR ────────────────────────────────────────
  rapor.baslik('analiz turu');
  let azHata = null;
  try { await calistir(env, { gecmis: gecmis.slice(0, 2), simdi: AN, getir: sahteGemini(IYI_YANIT).getir }); }
  catch (e) { azHata = e.message; }
  rapor.kontrol('Üç seanstan az geçmiş reddediliyor', azHata !== null, String(azHata).slice(0, 60));
  rapor.kontrol('Hata ne yapılacağını söylüyor',
    String(azHata).includes('Daha fazla antrenman'), String(azHata).slice(-40));

  const sahte = sahteGemini(IYI_YANIT);
  const sonuc = await calistir(env, { gecmis, simdi: AN, getir: sahte.getir });
  rapor.kontrol('Tur kayıt üretiyor', sonuc.toplam === 1, JSON.stringify(sonuc));
  rapor.kontrol('Gemini bir kez çağrıldı', sahte.cagrilar.length === 1, String(sahte.cagrilar.length));
  rapor.kontrol('Anahtar adrese konuyor',
    sahte.cagrilar[0].url.includes('deneme-anahtari'));
  rapor.kontrol('Uygulamayla aynı model',
    sahte.cagrilar[0].url.includes('gemini-3.6-flash'), sahte.cagrilar[0].url.split('/').pop());

  const kuyruk = await bekleyenleriOku(env, 'analiz');
  rapor.kontrol('Kayıt onay kuyruğuna düştü', kuyruk.length === 1);
  rapor.kontrol('Başlık modelden geliyor',
    kuyruk[0].ad === 'Son 6 haftanın değerlendirmesi', kuyruk[0].ad);
  rapor.kontrol('Bulgular metne dönüşmüş',
    kuyruk[0].metin.some(m => m.startsWith('Hacim:')), kuyruk[0].metin[0]);
  rapor.kontrol('Öneriler de metinde',
    kuyruk[0].metin.some(m => m.startsWith('Öneriler:')));
  rapor.kontrol('Durgun hareket uyarıya yazılmış',
    kuyruk[0].uyari.includes('Barbell Bench Press'), kuyruk[0].uyari);
  rapor.kontrol('Hesaplanan özet kayıtta saklanıyor',
    kuyruk[0].veri.ozet.seansSayisi === 5);

  rapor.baslik('aynı dönem ikinci kez analiz edilince kuyruk şişmiyor');
  await calistir(env, { gecmis, simdi: AN, getir: sahteGemini(IYI_YANIT).getir });
  rapor.kontrol('Kuyrukta hâlâ tek kayıt',
    (await bekleyenleriOku(env, 'analiz')).length === 1);

  rapor.baslik('anahtar yoksa');
  const anahtarsiz = { ...env, GEMINI_API_KEY: '' };
  let anahtarHata = null;
  try { await calistir(anahtarsiz, { gecmis, simdi: AN, getir: sahteGemini(IYI_YANIT).getir }); }
  catch (e) { anahtarHata = e.message; }
  rapor.kontrol('Anahtarsız çalışmıyor', anahtarHata !== null, String(anahtarHata).slice(0, 50));
  rapor.kontrol('Nasıl ekleneceğini söylüyor',
    String(anahtarHata).includes('wrangler secret put'), 'komut var');

  rapor.baslik('bozuk model yanıtı');
  let bozukHata = null;
  try { await calistir(env, { gecmis, simdi: AN, getir: sahteGemini('bu JSON değil').getir }); }
  catch (e) { bozukHata = e.message; }
  rapor.kontrol('JSON olmayan yanıt kuyruğa yazılmıyor', bozukHata !== null,
    String(bozukHata).slice(0, 55));
  rapor.kontrol('Kuyruk bozulmadı', (await bekleyenleriOku(env, 'analiz')).length === 1);

  // ── UÇ ─────────────────────────────────────────
  rapor.baslik('/analiz ucu');
  const eksik = await cagir('/analiz', 'POST', { yanlis: true });
  rapor.kontrol('Gövdesiz istek 400 dönüyor', eksik.status === 400, String(eksik.status));

  const cihazsiz = await cagir('/analiz', 'POST', { gecmis }, 'yanlis-anahtar');
  rapor.kontrol('Cihaz anahtarı olmadan girilemiyor', cihazsiz.status === 401,
    String(cihazsiz.status));

  globalThis.fetch = sahteGemini(IYI_YANIT).getir;
  const iyi = await cagir('/analiz', 'POST', { gecmis, profil: { kilo: 78 } });
  rapor.kontrol('Geçerli istek çalışıyor', iyi.status === 200 && iyi.body.ok === true,
    JSON.stringify(iyi.body).slice(0, 70));

  const yetersiz = await cagir('/analiz', 'POST', { gecmis: gecmis.slice(0, 1) });
  rapor.kontrol('Yetersiz geçmiş 422 ve açıklama dönüyor',
    yetersiz.status === 422 && typeof yetersiz.body.error === 'string',
    yetersiz.status + ' — ' + String(yetersiz.body.error).slice(0, 45));
}
