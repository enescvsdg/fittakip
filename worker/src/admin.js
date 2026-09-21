/* ══════════════════════════════════════════
   YÖNETİM PANELİ ROTALARI

   Uygulamanın kullandığı uçlardan tamamen ayrı: onlar X-Device-Key başlığıyla
   çalışır, bunlar tarayıcının kendi giriş penceresiyle (HTTP Basic + ADMIN_KEY).
   ══════════════════════════════════════════ */

import { adminKapisi } from './kimlik.js';
import { PANEL_HTML } from './panel.js';
import { panelVerisi, kararlariIsle, onaylananlariOku, onaylananlariTemizle, geriAl, AJANLAR } from './onay.js';
import { hepsiniCalistir, AJAN_KODU } from './ajanlar/index.js';
import { MEVCUT_ANAHTAR } from './ajanlar/egzersiz.js';

const GIZLI_BASLIK = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow'
};

function panelJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...GIZLI_BASLIK }
  });
}

/* Panelin sorumluluğundaki yol mu? worker.js bunu cihaz anahtarı kontrolünden
   ÖNCE soruyor — panel farklı bir anahtarla korunuyor. */
export function adminYolu(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export async function adminIstegi(request, env, url) {
  const engel = adminKapisi(request, env);
  if (engel) return engel;

  const yol = url.pathname.replace(/\/+$/, '') || '/admin';

  if (yol === '/admin' && request.method === 'GET') {
    return new Response(PANEL_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...GIZLI_BASLIK }
    });
  }

  if (yol === '/admin/veri' && request.method === 'GET') {
    return panelJson(await panelVerisi(env));
  }

  if (yol === '/admin/karar' && request.method === 'POST') {
    const govde = await request.json().catch(() => null);
    if (!govde || !Array.isArray(govde.kararlar)) {
      return panelJson({ error: 'kararlar listesi bekleniyordu.' }, 400);
    }
    return panelJson(await kararlariIsle(env, govde.kararlar));
  }

  if (yol === '/admin/geri-al' && request.method === 'POST') {
    const govde = await request.json().catch(() => null);
    if (!govde || !govde.ajan || !govde.id) {
      return panelJson({ error: 'ajan ve id bekleniyordu.' }, 400);
    }
    const oldu = await geriAl(env, govde.ajan, govde.id);
    return panelJson({ ok: oldu }, oldu ? 200 : 404);
  }

  /* Uygulamanın şu anki egzersiz listesi. Ajan buna bakarak "bu kayıt bizde
     var mı" sorusunu yanıtlıyor; olmadan 281 hareketin hepsini yeni sanar.
     "npm run veri-gonder" burayı besliyor. */
  if (yol === '/admin/mevcut' && request.method === 'POST') {
    const govde = await request.json().catch(() => null);
    const liste = govde && govde.egzersiz;
    if (!Array.isArray(liste) || !liste.length) {
      return panelJson({ error: 'egzersiz listesi bekleniyordu.' }, 400);
    }
    const bozuk = liste.find(k => !k || typeof k.name !== 'string' || !k.name);
    if (bozuk) {
      return panelJson({ error: 'Adı olmayan kayıt var.', ornek: bozuk }, 400);
    }
    await env.REMINDERS.put(MEVCUT_ANAHTAR, JSON.stringify(liste));
    return panelJson({ ok: true, kayit: liste.length });
  }

  if (yol === '/admin/mevcut' && request.method === 'GET') {
    const liste = await env.REMINDERS.get(MEVCUT_ANAHTAR, 'json');
    return panelJson({ egzersiz: Array.isArray(liste) ? liste : [] });
  }

  /* Ajanı elle çalıştır. Cron gece 03:00'te kendiliğinden dönüyor; bu uç
     "şimdi bak" demek için — ve Analiz ajanı zaten yalnızca böyle çalışacak. */
  if (yol === '/admin/calistir' && request.method === 'POST') {
    const govde = await request.json().catch(() => null);
    const secilen = govde && Array.isArray(govde.ajanlar) ? govde.ajanlar : null;
    if (secilen && secilen.some(a => !AJAN_KODU[a])) {
      return panelJson({ error: 'Tanımsız ajan.', taninan: Object.keys(AJAN_KODU) }, 400);
    }
    return panelJson(await hepsiniCalistir(env, secilen));
  }

  /* "npm run veri-al" bu iki ucu kullanır — aynı ADMIN_KEY ile. */
  if (yol === '/admin/onaylananlar' && request.method === 'GET') {
    const ajan = url.searchParams.get('ajan');
    if (ajan) {
      if (!AJANLAR.includes(ajan)) return panelJson({ error: 'Bilinmeyen ajan.' }, 400);
      return panelJson({ [ajan]: await onaylananlariOku(env, ajan) });
    }
    const hepsi = {};
    for (const a of AJANLAR) hepsi[a] = await onaylananlariOku(env, a);
    return panelJson(hepsi);
  }

  if (yol === '/admin/isaretle' && request.method === 'POST') {
    const govde = await request.json().catch(() => null);
    if (!govde || !AJANLAR.includes(govde.ajan)) {
      return panelJson({ error: 'Geçerli bir ajan bekleniyordu.' }, 400);
    }
    return panelJson(await onaylananlariTemizle(env, govde.ajan, govde.idler));
  }

  return panelJson({ error: 'Bulunamadı.' }, 404);
}
