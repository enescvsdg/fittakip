/* ══════════════════════════════════════════
   AJAN KAYIT DEFTERİ

   Her ajan bir calistir(env) veriyor ve topladığını onay kuyruğuna yazıyor.
   Hiçbiri doğrudan uygulamaya yazmıyor.
   ══════════════════════════════════════════ */

import * as egzersiz from './egzersiz.js';

export const AJAN_KODU = {
  egzersiz: egzersiz.calistir
};

/* Günlük cron bunu çağırır. Bir ajanın patlaması diğerlerini durdurmasın —
   her biri ayrı yakalanıyor ve sonuç raporlanıyor. */
export async function hepsiniCalistir(env, secilenler) {
  const adlar = secilenler && secilenler.length
    ? secilenler.filter(a => AJAN_KODU[a])
    : Object.keys(AJAN_KODU);

  const rapor = {};
  for (const ad of adlar) {
    try {
      rapor[ad] = { ok: true, ...(await AJAN_KODU[ad](env)) };
      console.log('[ajan] ' + ad + ' bitti:', JSON.stringify(rapor[ad]));
    } catch (err) {
      rapor[ad] = { ok: false, hata: err.message };
      console.error('[ajan] ' + ad + ' HATA:', (err && err.stack) || err);
    }
  }
  return rapor;
}
