/* ══════════════════════════════════════════
   VAPID anahtar çifti üretir.

   Kullanım:  node generate-vapid-keys.mjs

   Çıktıdaki ÖZEL anahtarı asla git'e ekleme —
   sadece "wrangler secret put" ile Worker'a ver.
   ══════════════════════════════════════════ */

const keys = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const publicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keys.publicKey));
const privateJwk = await crypto.subtle.exportKey('jwk', keys.privateKey);

const publicKey = Buffer.from(publicRaw)
  .toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Web Crypto'nun eklediği, imzalamada gereksiz alanları at
delete privateJwk.key_ops;
delete privateJwk.ext;

console.log('\n── VAPID_PUBLIC_KEY ──────────────────────────');
console.log(publicKey);
console.log('\n── VAPID_PRIVATE_JWK ─────────────────────────');
console.log(JSON.stringify(privateJwk));
console.log('\nSıradaki adımlar:');
console.log('  wrangler secret put VAPID_PUBLIC_KEY');
console.log('  wrangler secret put VAPID_PRIVATE_JWK');
console.log('  wrangler secret put DEVICE_KEY        (kendi belirlediğin uzun bir parola)\n');
