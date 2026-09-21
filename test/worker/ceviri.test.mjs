/* Talimat çevirisi.

   İki şeyi tutuyor:
     1. Önbellek gerçekten çalışıyor mu — her gece 876 hareketi yeniden
        çevirmek hem yavaş hem gereksiz.
     2. Yarım çeviri kabul edilmiyor mu — model beş adımlık bir talimata üç
        adım dönerse kullanıcı eksik anlatım görür ve bunu fark etmesi zor. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';
import {
  cevir, onbellegiOku, onbellegiYaz, metinAnahtari, promptUret,
  yanitiEsle, YIGIN_BOYU, ONBELLEK_ANAHTARI
} from '../../worker/src/ceviri.js';

cronLoglariniSustur();

/* Gelen yığını olduğu gibi "çeviren" sahte model: her adımın başına TR: koyar.
   Böylece hem eşleşmeyi hem önbelleği sınayabiliyoruz. */
function sahteCevirici({ bozuk = false, patlat = false } = {}) {
  const cagrilar = [];
  const getir = async (url, secenek) => {
    const govde = JSON.parse(secenek.body);
    const metin = govde.contents[0].parts[0].text;
    cagrilar.push(metin);
    if (patlat) return { ok: false, status: 400, json: async () => ({ error: { message: 'olmadı' } }) };

    const girdi = JSON.parse(metin.slice(metin.indexOf('[', metin.indexOf('Girdi JSON:')),
      metin.lastIndexOf(']', metin.indexOf('Çıktı olarak')) + 1));
    const yanit = girdi.map(g => ({
      i: g.i,
      // Bozuk kipte son adımı düşür: yarım çeviri taklidi
      adimlar: (bozuk ? g.adimlar.slice(0, -1) : g.adimlar).map(a => 'TR: ' + a)
    }));
    return {
      ok: true, status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(yanit) }] } }] })
    };
  };
  return { getir, cagrilar };
}

const istek = (ad, n) => ({
  ad, metinler: Array.from({ length: n }, (_, i) => ad + ' adım ' + (i + 1))
});

export default async function ({ rapor }) {
  const { env } = await kur();
  env.GEMINI_API_KEY = 'deneme';

  rapor.baslik('metin anahtarı');
  rapor.kontrol('Aynı metin aynı anahtarı veriyor',
    metinAnahtari('Lie back on a bench') === metinAnahtari('Lie back on a bench'));
  rapor.kontrol('Farklı metin farklı anahtar',
    metinAnahtari('Lie back on a bench') !== metinAnahtari('Lie back on a chair'));
  rapor.kontrol('Tek harf farkı yakalanıyor',
    metinAnahtari('push up') !== metinAnahtari('push ups'));
  rapor.kontrol('Boş metin de anahtarlanabiliyor', typeof metinAnahtari('') === 'string');

  rapor.baslik('prompt kuralları');
  const p = promptUret([istek('Bench Press', 2)]);
  rapor.kontrol('Hareket adlarının çevrilmemesi isteniyor',
    p.includes('Hareket adlarını ÇEVİRME'));
  rapor.kontrol('Adım sayısının korunması isteniyor',
    p.includes('Adım sayısını DEĞİŞTİRME'));
  rapor.kontrol('Ekipman adları korunuyor', p.includes('barbell, dumbbell, kettlebell'));
  rapor.kontrol('Girdi JSON olarak veriliyor', p.includes('Girdi JSON:'));

  rapor.baslik('yarım çeviri reddediliyor');
  const yigin = [istek('A', 3), istek('B', 2)];
  const eksik = yanitiEsle(yigin, [
    { i: 0, adimlar: ['bir', 'iki'] },          // üç adım bekleniyordu
    { i: 1, adimlar: ['bir', 'iki'] }
  ]);
  rapor.kontrol('Adım sayısı tutmayan atılıyor', !eksik.cikti.has(0), 'A atıldı');
  rapor.kontrol('Tutan kabul ediliyor', eksik.cikti.has(1), 'B kabul');
  rapor.kontrol('Atılan sayılıyor', eksik.atlanan === 1, String(eksik.atlanan));

  const bosluklu = yanitiEsle([istek('A', 2)], [{ i: 0, adimlar: ['dolu', '   '] }]);
  rapor.kontrol('Boş adım içeren çeviri atılıyor', bosluklu.cikti.size === 0);

  const tanimsiz = yanitiEsle([istek('A', 2)], [{ i: 9, adimlar: ['a', 'b'] }, null, 'metin']);
  rapor.kontrol('Sırası olmayan öğeler atılıyor', tanimsiz.cikti.size === 0,
    String(tanimsiz.atlanan));

  // ── ÇEVİRİ TURU ────────────────────────────────
  rapor.baslik('ilk tur');
  const m1 = sahteCevirici();
  const c1 = await cevir(env, [istek('Bench Press', 3), istek('Squat', 2)], { getir: m1.getir });
  rapor.kontrol('İkisi de çevrildi',
    c1.sonuc.every(s => Array.isArray(s.ceviri)), JSON.stringify(c1.sonuc[0].ceviri));
  rapor.kontrol('Adım sayısı korunuyor',
    c1.sonuc[0].ceviri.length === 3 && c1.sonuc[1].ceviri.length === 2);
  rapor.kontrol('Çeviri gerçekten uygulanmış',
    c1.sonuc[0].ceviri[0].startsWith('TR: '), c1.sonuc[0].ceviri[0]);
  rapor.kontrol('Tek çağrıda hallediliyor', c1.cagri === 1, String(c1.cagri));

  await onbellegiYaz(env, c1.kayit);

  rapor.baslik('önbellek ikinci turda çalışıyor');
  const m2 = sahteCevirici();
  const c2 = await cevir(env, [istek('Bench Press', 3), istek('Squat', 2)], { getir: m2.getir });
  rapor.kontrol('Modele hiç gidilmedi', c2.cagri === 0, String(c2.cagri));
  rapor.kontrol('Çeviriler yine de geldi',
    c2.sonuc.every(s => Array.isArray(s.ceviri) && s.ceviri[0].startsWith('TR: ')));

  rapor.baslik('yalnız yeni metin çevriliyor');
  const m3 = sahteCevirici();
  const c3 = await cevir(env, [
    istek('Bench Press', 3),      // önbellekte
    istek('Deadlift', 4)          // yeni
  ], { getir: m3.getir });
  rapor.kontrol('Tek çağrı yapıldı', c3.cagri === 1, String(c3.cagri));
  rapor.kontrol('Yalnız yeni hareket modele gitti',
    m3.cagrilar[0].includes('Deadlift') && !m3.cagrilar[0].includes('Bench Press'),
    'istek içinde Deadlift var, Bench Press yok');

  rapor.baslik('kaynak metin değişirse çeviri yenileniyor');
  const m4 = sahteCevirici();
  const degisen = { ad: 'Bench Press', metinler: ['Yeni İngilizce metin', 'İkinci', 'Üçüncü'] };
  const c4 = await cevir(env, [degisen], { getir: m4.getir, onbellek: c3.kayit });
  rapor.kontrol('Değişen metin yeniden çevriliyor', c4.cagri === 1, String(c4.cagri));

  rapor.baslik('yığınlama');
  const cok = Array.from({ length: YIGIN_BOYU * 2 + 3 }, (_, i) => istek('H' + i, 2));
  const m5 = sahteCevirici();
  const c5 = await cevir(env, cok, { getir: m5.getir, onbellek: {} });
  rapor.kontrol('Üç yığına bölündü', c5.cagri === 3, String(c5.cagri));
  rapor.kontrol('Hepsi çevrildi', c5.sonuc.every(s => s.ceviri), String(c5.sonuc.length));

  rapor.baslik('tur başına üst sınır');
  const m6 = sahteCevirici();
  const c6 = await cevir(env, cok, { getir: m6.getir, onbellek: {}, enFazlaYigin: 1 });
  rapor.kontrol('Sınır aşılmıyor', c6.cagri === 1, String(c6.cagri));
  rapor.kontrol('Kalanlar ertelendi', c6.ertelenen > 0, String(c6.ertelenen));
  rapor.kontrol('Ertelenen kayıtlar çevrilmemiş dönüyor',
    c6.sonuc.filter(s => !s.ceviri).length === c6.ertelenen,
    c6.sonuc.filter(s => !s.ceviri).length + ' / ' + c6.ertelenen);

  rapor.baslik('yarım yanıt turu batırmıyor');
  const m7 = sahteCevirici({ bozuk: true });
  const c7 = await cevir(env, [istek('Row', 3)], { getir: m7.getir, onbellek: {} });
  rapor.kontrol('Yarım çeviri kabul edilmiyor', c7.sonuc[0].ceviri === null);
  rapor.kontrol('Atlanan raporlanıyor', c7.atlanan === 1, String(c7.atlanan));
  rapor.kontrol('Önbelleğe yanlış veri yazılmıyor',
    Object.keys(c7.kayit).length === 0, JSON.stringify(Object.keys(c7.kayit)));

  rapor.baslik('model patlarsa');
  const m8 = sahteCevirici({ patlat: true });
  const c8 = await cevir(env, [istek('Fly', 2)], { getir: m8.getir, onbellek: {}, });
  rapor.kontrol('Hata dışarı sızmıyor', c8.sonuc[0].ceviri === null);
  rapor.kontrol('Atlanan olarak sayılıyor', c8.atlanan === 1, String(c8.atlanan));

  rapor.baslik('talimatsız kayıt modele gitmiyor');
  const m9 = sahteCevirici();
  const c9 = await cevir(env, [{ ad: 'Boş', metinler: [] }], { getir: m9.getir, onbellek: {} });
  rapor.kontrol('Çağrı yapılmadı', c9.cagri === 0, String(c9.cagri));
  rapor.kontrol('Çeviri null kaldı', c9.sonuc[0].ceviri === null);

  rapor.baslik('önbellek KV\'de tek blob');
  await onbellegiYaz(env, c5.kayit);
  const okunan = await onbellegiOku(env);
  rapor.kontrol('Yazılan geri okunuyor',
    Object.keys(okunan).length === Object.keys(c5.kayit).length,
    String(Object.keys(okunan).length));
  rapor.kontrol('Tek anahtar kullanılıyor',
    [...env.REMINDERS.store.keys()].filter(k => k.startsWith('ceviri:')).length === 1,
    [...env.REMINDERS.store.keys()].filter(k => k.startsWith('ceviri:')).join(','));
  rapor.kontrol('Anahtar adı beklenen',
    env.REMINDERS.store.has(ONBELLEK_ANAHTARI));
}
