/* ══════════════════════════════════════════
   ONAY DEPOSU

   Ajanlar veriyi doğrudan uygulamaya yazmaz. Topladıklarını buraya koyar,
   sen panelde inceleyip onaylarsın, onaylananlar "npm run veri-al" ile
   repodaki dosyalara işlenir.

   KV bütçesi: ajan başına TEK anahtar tutuluyor. Kayıt başına anahtar
   açsaydık 700 egzersiz = 700 yazma olurdu; günlük yazma sınırı 1000.
   Tek blob ile bir ajanın tüm turu 1 yazma eder.
   ══════════════════════════════════════════ */

export const AJANLAR = ['egzersiz', 'gida', 'analiz', 'takviye'];

export const AJAN_BILGI = {
  egzersiz: { ad: 'Egzersiz',   kaynak: 'free-exercise-db (Unlicense)' },
  gida:     { ad: 'Gıda',       kaynak: 'USDA FoodData Central · Open Food Facts (ODbL)' },
  analiz:   { ad: 'Analiz',     kaynak: 'Gemini' },
  takviye:  { ad: 'Supplement', kaynak: 'Marka ürün sayfaları' }
};

const BEKLEYEN = ajan => 'onay:' + ajan;
const ONAYLI   = ajan => 'onayli:' + ajan;
const CALISMA  = ajan => 'calisma:' + ajan;

/* KV'de bir değer en fazla 25 MB. Sınıra dayanınca put() hata fırlatıyor ve
   ajanın tüm turu çöpe gidiyor; payı erken bırakıp anlaşılır hata veriyoruz. */
const EN_BUYUK_BLOB = 20 * 1024 * 1024;

function ajanDogrula(ajan) {
  if (!AJANLAR.includes(ajan)) throw new Error('Bilinmeyen ajan: ' + ajan);
}

async function listeOku(env, anahtar) {
  const v = await env.REMINDERS.get(anahtar, 'json');
  return Array.isArray(v) ? v : [];
}

async function listeYaz(env, anahtar, liste) {
  const metin = JSON.stringify(liste);
  if (metin.length > EN_BUYUK_BLOB) {
    throw new Error(anahtar + ' çok büyük (' + Math.round(metin.length / 1048576) +
      ' MB). Ajan turu daha küçük parçalara bölünmeli.');
  }
  await env.REMINDERS.put(anahtar, metin);
}

export async function bekleyenleriOku(env, ajan) {
  ajanDogrula(ajan);
  return listeOku(env, BEKLEYEN(ajan));
}

export async function onaylananlariOku(env, ajan) {
  ajanDogrula(ajan);
  return listeOku(env, ONAYLI(ajan));
}

/* Bir ajanın tur çıktısı. Aynı id'yi taşıyan eski kayıt yenisiyle değişir —
   ajan her gece çalıştığında liste şişmesin. Zaten onayladığın bir kayıt
   tekrar bekleyene düşmez. */
export async function turuYaz(env, ajan, kayitlar) {
  ajanDogrula(ajan);
  const onayli = await onaylananlariOku(env, ajan);
  const onayliIdler = new Set(onayli.map(k => k.id));

  const eski = await bekleyenleriOku(env, ajan);
  const haritaOnce = new Set(eski.map(k => k.id));
  const harita = new Map(eski.map(k => [k.id, k]));
  const buTurda = new Set();
  let yeni = 0, guncel = 0, atlanan = 0, kopya = 0;

  for (const kayit of kayitlar) {
    if (!kayit || !kayit.id) throw new Error('Kayıt id taşımıyor: ' + JSON.stringify(kayit).slice(0, 120));
    if (onayliIdler.has(kayit.id)) { atlanan++; continue; }

    /* Aynı turda aynı id iki kez gelebiliyor ve bu bir hata değil: uygulamada
       11 hareket hem "Evde" hem "Spor Salonunda" listesinde duruyor (evde de
       salonda da yapılabilen kettlebell hareketleri), alanları birebir aynı.
       Tek kayda indiriyoruz — ama bunu "güncelleme" diye saymak paneli
       yanıltıyordu: güncellenen bir şey yok. */
    if (buTurda.has(kayit.id)) kopya++;
    else if (haritaOnce.has(kayit.id)) guncel++;
    else yeni++;

    buTurda.add(kayit.id);
    harita.set(kayit.id, { ...kayit, ajan });
  }

  const liste = [...harita.values()];
  await listeYaz(env, BEKLEYEN(ajan), liste);
  await env.REMINDERS.put(CALISMA(ajan), JSON.stringify({
    an: new Date().toISOString(), yeni, guncel, atlanan, kopya, toplam: liste.length
  }));
  return { yeni, guncel, atlanan, kopya, toplam: liste.length };
}

export async function calismaBilgisi(env, ajan) {
  ajanDogrula(ajan);
  const v = await env.REMINDERS.get(CALISMA(ajan), 'json');
  return v && typeof v === 'object' ? v : null;
}

/* Panel için: dört ajanın bekleyenleri + son çalışma bilgisi, tek seferde. */
export async function panelVerisi(env) {
  const ajanlar = [];
  for (const ajan of AJANLAR) {
    const [bekleyen, calisma, onayli] = await Promise.all([
      bekleyenleriOku(env, ajan),
      calismaBilgisi(env, ajan),
      onaylananlariOku(env, ajan)
    ]);
    ajanlar.push({
      id: ajan,
      ad: AJAN_BILGI[ajan].ad,
      kaynak: AJAN_BILGI[ajan].kaynak,
      calisma,
      bekleyen,
      onayliSayi: onayli.length
    });
  }
  return { ajanlar };
}

/* Panelden gelen kararlar. [{ ajan, id, karar: 'onay' | 'ret' }]
   Onaylananlar "onayli:<ajan>" listesine taşınır ve orada "npm run veri-al"
   gelene kadar bekler. Reddedilenler silinir — ajan aynı kaydı yarın tekrar
   getirebilir, o yüzden ret kalıcı bir karar değil, "şimdilik alma" demek. */
export async function kararlariIsle(env, kararlar) {
  if (!Array.isArray(kararlar) || !kararlar.length) {
    return { onaylanan: 0, reddedilen: 0 };
  }
  const ajanaGore = new Map();
  for (const k of kararlar) {
    if (!k || !AJANLAR.includes(k.ajan) || !k.id) continue;
    if (k.karar !== 'onay' && k.karar !== 'ret') continue;
    if (!ajanaGore.has(k.ajan)) ajanaGore.set(k.ajan, new Map());
    ajanaGore.get(k.ajan).set(k.id, k.karar);
  }

  let onaylanan = 0, reddedilen = 0;
  for (const [ajan, kararHarita] of ajanaGore) {
    const bekleyen = await bekleyenleriOku(env, ajan);
    const onayli = await onaylananlariOku(env, ajan);
    const onayliIdler = new Set(onayli.map(k => k.id));
    const kalan = [];

    for (const kayit of bekleyen) {
      const karar = kararHarita.get(kayit.id);
      if (!karar) { kalan.push(kayit); continue; }
      if (karar === 'onay') {
        // Aynı kaydı iki kez onaylamak listede kopya bırakmasın
        if (!onayliIdler.has(kayit.id)) {
          onayli.push({ ...kayit, onayAni: new Date().toISOString() });
          onayliIdler.add(kayit.id);
        }
        onaylanan++;
      } else {
        reddedilen++;
      }
    }

    await listeYaz(env, BEKLEYEN(ajan), kalan);
    if (onaylanan) await listeYaz(env, ONAYLI(ajan), onayli);
  }
  return { onaylanan, reddedilen };
}

/* Onaylanan bir kaydı bekleyene geri koyar (paneldeki "Geri al"). */
export async function geriAl(env, ajan, id) {
  ajanDogrula(ajan);
  const onayli = await onaylananlariOku(env, ajan);
  const kayit = onayli.find(k => k.id === id);
  if (!kayit) return false;

  await listeYaz(env, ONAYLI(ajan), onayli.filter(k => k.id !== id));
  const bekleyen = await bekleyenleriOku(env, ajan);
  if (!bekleyen.some(k => k.id === id)) {
    const { onayAni, ...temiz } = kayit;
    bekleyen.push(temiz);
    await listeYaz(env, BEKLEYEN(ajan), bekleyen);
  }
  return true;
}

/* "npm run veri-al" kayıtları alıp dosyalara işledikten sonra çağırır.
   Silmeden önce betik dosyaları yazmış olmalı — bu yüzden ayrı bir adım. */
export async function onaylananlariTemizle(env, ajan, idler) {
  ajanDogrula(ajan);
  const onayli = await onaylananlariOku(env, ajan);
  const silinecek = new Set(idler || onayli.map(k => k.id));
  const kalan = onayli.filter(k => !silinecek.has(k.id));
  await listeYaz(env, ONAYLI(ajan), kalan);
  return { silinen: onayli.length - kalan.length, kalan: kalan.length };
}
