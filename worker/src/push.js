/* ══════════════════════════════════════════
   Web Push şifreleme + VAPID imzalama
   RFC 8291 (aes128gcm) ve RFC 8292 (VAPID)
   Sadece Web Crypto API kullanır, bağımlılık yok.
   ══════════════════════════════════════════ */

const enc = new TextEncoder();

export function b64urlToBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '==='.slice((padded.length + 3) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToB64url(bytes) {
  let binary = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
}

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

// HKDF: tek turluk expand yeterli (çıktılar hep 32 bayttan kısa)
async function hkdf(salt, ikm, info, length) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

/**
 * RFC 8291'e göre yükü şifreler.
 * Dönen gövde: salt(16) | rs(4) | idlen(1) | as_public(65) | ciphertext
 */
export async function encryptPayload(p256dhB64, authB64, payloadText) {
  const uaPublicRaw = b64urlToBytes(p256dhB64);
  const authSecret  = b64urlToBytes(authB64);

  // Gönderici tarafı için tek kullanımlık ECDH anahtar çifti
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));

  const uaPublicKey = await crypto.subtle.importKey(
    'raw', uaPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaPublicKey }, asKeys.privateKey, 256)
  );

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" | ua_public | as_public)
  const keyInfo = concat(enc.encode('WebPush: info'), new Uint8Array([0]), uaPublicRaw, asPublicRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  const salt  = crypto.getRandomValues(new Uint8Array(16));
  const cek   = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  // Yükün sonuna padding ayracı (0x02 = son kayıt)
  const plaintext = concat(enc.encode(payloadText), new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext)
  );

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);

  return concat(salt, recordSize, new Uint8Array([asPublicRaw.length]), asPublicRaw, ciphertext);
}

/** VAPID JWT'si üretir (ES256 ile imzalı). */
export async function buildVapidAuth(endpoint, subject, privateJwk, publicKeyB64) {
  const audience = new URL(endpoint).origin;

  const header  = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject
  };

  const signingInput =
    bytesToB64url(enc.encode(JSON.stringify(header))) + '.' +
    bytesToB64url(enc.encode(JSON.stringify(payload)));

  const key = await crypto.subtle.importKey(
    'jwk', privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  // Web Crypto ECDSA imzayı ham r|s olarak döndürür — JWS ES256 tam da bunu bekler
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput))
  );

  const jwt = signingInput + '.' + bytesToB64url(signature);
  return 'vapid t=' + jwt + ', k=' + publicKeyB64;
}

/**
 * Tek bir aboneye bildirim gönderir.
 * Dönen: { ok, status } — 404/410 aboneliğin silinmesi gerektiğini gösterir.
 */
export async function sendPush(subscription, payloadText, vapid) {
  const body = await encryptPayload(subscription.p256dh, subscription.auth, payloadText);
  const authHeader = await buildVapidAuth(
    subscription.endpoint, vapid.subject, vapid.privateJwk, vapid.publicKey
  );

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      // high: push servisi pil tasarrufu için bekletmeden hemen iletsin.
      // normal'da telefon kilitliyken teslimat dakikalarca gecikebiliyor.
      'Urgency': 'high',
      // Saatine bağlı bir hatırlatma bir saat sonra işe yaramaz; geç kalan
      // bildirim ertesi güne sarkacağına düşsün.
      'TTL': '3600'
    },
    body
  });

  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}
