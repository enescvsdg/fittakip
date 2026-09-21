/* ══════════════════════════════════════════
   YÖNETİM PANELİ ROTALARI

   Uygulamanın kullandığı uçlardan tamamen ayrı: onlar X-Device-Key başlığıyla
   çalışır, bunlar tarayıcının kendi giriş penceresiyle (HTTP Basic + ADMIN_KEY).
   ══════════════════════════════════════════ */

import { adminKapisi } from './kimlik.js';
import { PANEL_HTML } from './panel.js';
import { panelVerisi, kararlariIsle, onaylananlariOku, onaylananlariTemizle, geriAl, AJANLAR } from './onay.js';

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
