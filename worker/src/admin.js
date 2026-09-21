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
import { MEVCUT_ANAHTAR as GIDA_ANAHTARI, ISTEK_ANAHTARI } from './ajanlar/gida.js';
import { SITELER, ayniSite, taniOzeti } from './ajanlar/takviye.js';
import { sayfadanCikar } from './besin-ayikla.js';

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

    const yazilan = { egzersiz: liste.length };

    /* Gıda listesi ve USDA istek listesi de aynı uçtan geliyor — ikisi de
       "uygulamada şu an ne var" sorusunun parçası. */
    if (Array.isArray(govde.gida)) {
      const bozukGida = govde.gida.find(g => !g || typeof g.name !== 'string' || !g.name);
      if (bozukGida) return panelJson({ error: 'Adı olmayan gıda kaydı var.', ornek: bozukGida }, 400);
      await env.REMINDERS.put(GIDA_ANAHTARI, JSON.stringify(govde.gida));
      yazilan.gida = govde.gida.length;
    }
    if (govde.usdaIstek && Array.isArray(govde.usdaIstek.gidalar)) {
      await env.REMINDERS.put(ISTEK_ANAHTARI, JSON.stringify(govde.usdaIstek));
      yazilan.usdaIstek = govde.usdaIstek.gidalar.length;
    }

    return panelJson({ ok: true, kayit: liste.length, yazilan });
  }

  if (yol === '/admin/mevcut' && request.method === 'GET') {
    const liste = await env.REMINDERS.get(MEVCUT_ANAHTAR, 'json');
    return panelJson({ egzersiz: Array.isArray(liste) ? liste : [] });
  }

  /* Tek bir ürün sayfasını dene.

     Supplement ajanının çıkarım mantığı gerçek sayfalara karşı ayarlanamadı
     (yazıldığı ortamdan o sitelere ağ çıkışı yoktu). Bu uç, bir sayfayı tek
     komutla sınayıp ne çıkardığımızı ve tutmadıysa NEDEN tutmadığını
     gösteriyor. Adres yine izin listesiyle sınırlı. */
  if (yol === '/admin/dene' && request.method === 'GET') {
    const adres = url.searchParams.get('adres');
    if (!adres) return panelJson({ error: 'adres parametresi gerekiyor.' }, 400);

    const site = SITELER.find(s => ayniSite(s, adres));
    if (!site) {
      return panelJson({
        error: 'Bu adres izin listesinde değil.',
        izinli: SITELER.map(s => s.kok)
      }, 400);
    }

    let html;
    try {
      const cevap = await fetch(adres, {
        headers: { 'User-Agent': 'FitTakipBot (deneme)', Accept: 'text/html' }
      });
      if (!cevap.ok) return panelJson({ error: 'Sayfa HTTP ' + cevap.status + ' döndü.' }, 502);
      html = await cevap.text();
    } catch (err) {
      return panelJson({ error: 'Sayfa alınamadı: ' + err.message }, 502);
    }

    const cikan = sayfadanCikar(html, adres);
    if (!cikan) {
      return panelJson({ ok: false, sebep: 'Sayfada ürün adı bulunamadı.', adres });
    }
    return panelJson({
      ok: true, site: site.id, ...cikan,
      ozet: cikan.besin ? null : taniOzeti(cikan.tani)
    });
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
