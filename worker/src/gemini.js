/* ══════════════════════════════════════════
   GEMINI ÇAĞRISI — Worker tarafı

   Uygulamanın kendi Gemini çağrısı tarayıcıda, anahtarı localStorage'da.
   Worker'daki ajanlar oraya erişemiyor, o yüzden burada ayrı bir yol var ve
   anahtar GEMINI_API_KEY secret'ında duruyor.

   Bu modülü iki ajan kullanıyor:
     Ajan 1 — İngilizce talimatları Türkçeye çevirmek
     Ajan 3 — Antrenman geçmişini yorumlamak
   ══════════════════════════════════════════ */

export const VARSAYILAN_MODEL = 'gemini-3.6-flash';   // uygulamanın kullandığıyla aynı

const UC = 'https://generativelanguage.googleapis.com/v1beta/models/';

/* Model yoğunluğu (429/503) geçici. Ajanlar gece çalıştığı için bekleyip
   tekrar denemenin maliyeti yok — turu tamamen kaybetmekten iyi. */
const TEKRAR_SAYISI = 3;
const TEKRAR_BEKLEME_MS = 4000;

const bekle = ms => new Promise(r => setTimeout(r, ms));

function gecici(hata) {
  return hata.status === 429 || hata.status === 503 || hata.status === 500 ||
    /overloaded|unavailable|high demand|rate limit/i.test(hata.message || '');
}

async function birKez(metin, env, { model, getir, sicaklik }) {
  const url = UC + model + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);
  const cevap = await getir(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: metin }] }],
      generationConfig: { temperature: sicaklik }
    })
  });

  if (!cevap.ok) {
    let mesaj = 'HTTP ' + cevap.status;
    try {
      const govde = await cevap.json();
      if (govde && govde.error && govde.error.message) mesaj = govde.error.message;
    } catch { /* gövde JSON değilse durum kodu yeter */ }
    const hata = new Error('Gemini: ' + mesaj);
    hata.status = cevap.status;
    throw hata;
  }

  const veri = await cevap.json();
  const parca = veri && veri.candidates && veri.candidates[0] &&
    veri.candidates[0].content && veri.candidates[0].content.parts &&
    veri.candidates[0].content.parts[0];
  const yazi = parca && parca.text;
  if (!yazi) {
    /* Boş yanıtın en sık sebebi güvenlik süzgeci. Sebebi yutmayıp söylüyoruz;
       yoksa "AI yanıtı boş geldi" deyip neden olduğunu hiç öğrenemiyoruz. */
    const sebep = veri && veri.candidates && veri.candidates[0] &&
      veri.candidates[0].finishReason;
    throw new Error('Gemini boş yanıt döndü' + (sebep ? ' (' + sebep + ')' : '') + '.');
  }
  return yazi;
}

export async function sor(metin, env, secenek = {}) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY secret\'ı eksik. "wrangler secret put GEMINI_API_KEY" ile ekle.');
  }
  const ayar = {
    model: secenek.model || env.GEMINI_MODEL || VARSAYILAN_MODEL,
    getir: secenek.getir || fetch,
    sicaklik: typeof secenek.sicaklik === 'number' ? secenek.sicaklik : 0.2,
    bekleme: typeof secenek.bekleme === 'number' ? secenek.bekleme : TEKRAR_BEKLEME_MS
  };

  let sonHata = null;
  for (let deneme = 0; deneme < TEKRAR_SAYISI; deneme++) {
    try {
      return await birKez(metin, env, ayar);
    } catch (hata) {
      sonHata = hata;
      if (!gecici(hata) || deneme === TEKRAR_SAYISI - 1) throw hata;
      await bekle(ayar.bekleme * (deneme + 1));
    }
  }
  throw sonHata;
}

/* Model JSON isterken de sohbet ediyor: başına "İşte istediğin JSON:" koyuyor,
   ```json çitiyle sarıyor, sonuna açıklama ekliyor. Hepsini temizliyoruz. */
export function jsonCoz(hamMetin) {
  let t = String(hamMetin || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  /* Model JSON'u düz metnin arasına koyabiliyor — hem önüne hem ARKASINA.
     "{\"a\":1}\nUmarım yardımcı olur." gibi bir yanıt baştan { ile başladığı
     için eskiden hiç ayıklanmıyor ve çözülemiyordu. Artık her durumda ilk
     açıcıdan son kapatıcıya kadarki bölge alınıyor; temiz JSON'da bu zaten
     metnin tamamı, yani zararsız. */
  const ilkSus = t.indexOf('{'), ilkKose = t.indexOf('[');
  const bas = ilkSus < 0 ? ilkKose : (ilkKose < 0 ? ilkSus : Math.min(ilkSus, ilkKose));
  if (bas < 0) throw new Error('Yanıtta JSON bulunamadı: ' + t.slice(0, 120));
  const kapanis = t[bas] === '{' ? '}' : ']';
  const son = t.lastIndexOf(kapanis);
  if (son < bas) throw new Error('Yanıttaki JSON kapanmamış: ' + t.slice(0, 120));
  t = t.slice(bas, son + 1);

  try {
    return JSON.parse(t);
  } catch (hata) {
    throw new Error('Yanıt JSON olarak çözülemedi: ' + hata.message + ' — ' + t.slice(0, 160));
  }
}
