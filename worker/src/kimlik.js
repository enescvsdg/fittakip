/* ══════════════════════════════════════════
   Kimlik doğrulama yardımcıları

   İki ayrı anahtar var ve ikisi de Worker secret'ında durur:
     DEVICE_KEY — uygulamanın Worker'a bağlanması (X-Device-Key başlığı)
     ADMIN_KEY  — yönetim paneli (tarayıcının kendi giriş penceresi)
   ══════════════════════════════════════════ */

/* Uzunluktan bağımsız, sabit süreli karşılaştırma.
   Karakter karakter kıyaslayıp ilk farkta çıkan bir kontrol, cevap süresinden
   anahtarın kaç karakteri tuttuğunu sızdırır. Bu sürüm her zaman aynı sürede
   biter. */
export function secretsMatch(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}

/* HTTP Basic: tarayıcı kendi giriş penceresini açar, sayfa anahtar girilmeden
   hiç yüklenmez. Adres bir yere sızsa bile karşıdaki boş bir 401 görür —
   panelin varlığını bile anlamaz. */
export function basicAuthCoz(request) {
  const bas = request.headers.get('Authorization') || '';
  if (!bas.startsWith('Basic ')) return null;
  let cozulmus;
  try {
    /* atob() base64'ü Latin-1 olarak çözüyor: "şifre123" karşımıza
       "Åifre123" diye geliyor ve secretsMatch UTF-8 ile kıyasladığı için
       Türkçe karakterli bir anahtar HİÇBİR ZAMAN eşleşmiyordu. Baytları
       UTF-8 olarak yeniden çözüyoruz. */
    const ikili = atob(bas.slice(6));
    const baytlar = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) baytlar[i] = ikili.charCodeAt(i);
    cozulmus = new TextDecoder('utf-8').decode(baytlar);
  } catch {
    return null;
  }
  const ayrac = cozulmus.indexOf(':');
  if (ayrac < 0) return { kullanici: cozulmus, parola: '' };
  return { kullanici: cozulmus.slice(0, ayrac), parola: cozulmus.slice(ayrac + 1) };
}

/* Paneldeki her yol bundan geçer. Geçerliyse null, değilse 401 döner. */
export function adminKapisi(request, env) {
  if (!env.ADMIN_KEY) {
    return new Response('Panel yapılandırılmamış: ADMIN_KEY secret eksik.', {
      status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  const kimlik = basicAuthCoz(request);
  if (!kimlik || !secretsMatch(kimlik.parola, env.ADMIN_KEY)) {
    return new Response('Yetkisiz.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="FitTakip", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        // Panel arama motorlarına ve önbelleklere hiç girmesin
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }
  return null;
}
