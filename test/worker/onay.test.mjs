/* Onay kapısı ve yönetim paneli.

   Kuralın tamamı şu: ajanların topladığı hiçbir kayıt, kullanıcı onaylamadan
   uygulamaya girmez. Bu takım o kuralı ve paneli koruyan kimlik doğrulamayı
   tutuyor. Ayrıca KV yazma bütçesini de ölçüyor — günlük sınır 1000 ve bir
   zamanlar bu sınırı aşıp bildirimleri kesmiştik. */
import { kur, cronLoglariniSustur } from './_ortam.mjs';
import {
  turuYaz, bekleyenleriOku, onaylananlariOku, kararlariIsle,
  geriAl, onaylananlariTemizle, panelVerisi, AJANLAR
} from '../../worker/src/onay.js';

cronLoglariniSustur();

const GUNLUK_YAZMA_SINIRI = 1000;

const kayit = (id, ek = {}) => ({
  id, tur: 'yeni', ad: id, grup: 'Deneme',
  aciklama: 'test kaydı', veri: { x: 1 }, ...ek
});

export default async function ({ rapor }) {
  const { env, adminCagir, cagir } = await kur();

  // ── PANEL KİMLİK DOĞRULAMA ─────────────────────
  rapor.baslik('panel kimlik doğrulaması');

  const anahtarsiz = await adminCagir('/admin', 'GET', null, null);
  rapor.kontrol('Anahtarsız istek 401 dönüyor', anahtarsiz.status === 401, String(anahtarsiz.status));
  rapor.kontrol('Tarayıcının giriş penceresini açıyor',
    (anahtarsiz.basliklar.get('WWW-Authenticate') || '').startsWith('Basic'),
    anahtarsiz.basliklar.get('WWW-Authenticate'));
  rapor.kontrol('401 gövdesi panel içeriği sızdırmıyor',
    !String(anahtarsiz.body).includes('FitTakip · Veri Onayı'),
    String(anahtarsiz.body).slice(0, 40));

  const yanlis = await adminCagir('/admin', 'GET', null, 'yanlis-anahtar');
  rapor.kontrol('Yanlış anahtar 401 dönüyor', yanlis.status === 401, String(yanlis.status));

  const dogru = await adminCagir('/admin');
  rapor.kontrol('Doğru anahtar paneli açıyor', dogru.status === 200, String(dogru.status));
  rapor.kontrol('Panel HTML\'i geliyor',
    String(dogru.body).includes('FitTakip · Veri Onayı'), 'başlık bulundu');
  rapor.kontrol('Panel arama motorlarına kapalı',
    (dogru.basliklar.get('X-Robots-Tag') || '').includes('noindex'),
    dogru.basliklar.get('X-Robots-Tag'));
  rapor.kontrol('Panel önbelleğe alınmıyor',
    (dogru.basliklar.get('Cache-Control') || '').includes('no-store'),
    dogru.basliklar.get('Cache-Control'));

  rapor.baslik('iki anahtar birbirinin yerine geçmiyor');
  const cihazAnahtariylaPanel = await adminCagir('/admin', 'GET', null, env.DEVICE_KEY);
  rapor.kontrol('Cihaz anahtarı paneli açmıyor', cihazAnahtariylaPanel.status === 401,
    String(cihazAnahtariylaPanel.status));
  const panelAnahtariylaSync = await cagir('/health', 'GET', null, env.ADMIN_KEY);
  rapor.kontrol('Panel anahtarı uygulama uçlarını açmıyor', panelAnahtariylaSync.status === 401,
    String(panelAnahtariylaSync.status));

  rapor.baslik('ADMIN_KEY yoksa panel kapalı');
  const gercekAdmin = env.ADMIN_KEY;
  delete env.ADMIN_KEY;
  const yapilandirmasiz = await adminCagir('/admin', 'GET', null, 'herhangi');
  rapor.kontrol('Secret eksikken açılmıyor', yapilandirmasiz.status === 500,
    String(yapilandirmasiz.status));
  rapor.kontrol('Secret eksikken panel içeriği vermiyor',
    !String(yapilandirmasiz.body).includes('FitTakip · Veri Onayı'));
  env.ADMIN_KEY = gercekAdmin;

  // ── AJAN TURU ──────────────────────────────────
  rapor.baslik('ajan turu bekleyene yazıyor');
  const ilk = await turuYaz(env, 'egzersiz', [kayit('e1'), kayit('e2'), kayit('e3')]);
  rapor.kontrol('Üç kayıt yeni sayıldı', ilk.yeni === 3 && ilk.guncel === 0, JSON.stringify(ilk));
  rapor.kontrol('Bekleyende üç kayıt var',
    (await bekleyenleriOku(env, 'egzersiz')).length === 3);
  rapor.kontrol('Ajan alanı kayda yazılıyor',
    (await bekleyenleriOku(env, 'egzersiz')).every(k => k.ajan === 'egzersiz'));

  rapor.baslik('ikinci tur listeyi şişirmiyor');
  const ikinci = await turuYaz(env, 'egzersiz', [kayit('e1'), kayit('e2'), kayit('e4')]);
  rapor.kontrol('Aynı id güncelleme sayıldı', ikinci.guncel === 2, JSON.stringify(ikinci));
  rapor.kontrol('Yeni id eklendi', ikinci.yeni === 1);
  rapor.kontrol('Toplam dört kayıt', ikinci.toplam === 4, String(ikinci.toplam));

  rapor.baslik('kayıt id\'siz gelirse tur reddediliyor');
  let idHatasi = null;
  try { await turuYaz(env, 'egzersiz', [{ ad: 'kimliksiz' }]); }
  catch (e) { idHatasi = e.message; }
  rapor.kontrol('id taşımayan kayıt hata veriyor', idHatasi !== null, String(idHatasi).slice(0, 60));

  rapor.baslik('bilinmeyen ajan reddediliyor');
  let ajanHatasi = null;
  try { await turuYaz(env, 'kimbilir', [kayit('x')]); }
  catch (e) { ajanHatasi = e.message; }
  rapor.kontrol('Tanımsız ajan hata veriyor', ajanHatasi !== null, String(ajanHatasi).slice(0, 50));

  // ── ONAY ───────────────────────────────────────
  rapor.baslik('onay ve ret');
  const karar = await kararlariIsle(env, [
    { ajan: 'egzersiz', id: 'e1', karar: 'onay' },
    { ajan: 'egzersiz', id: 'e2', karar: 'onay' },
    { ajan: 'egzersiz', id: 'e3', karar: 'ret' }
  ]);
  rapor.kontrol('İki onay, bir ret', karar.onaylanan === 2 && karar.reddedilen === 1,
    JSON.stringify(karar));
  const kalanBekleyen = await bekleyenleriOku(env, 'egzersiz');
  rapor.kontrol('Karar verilenler bekleyenden çıktı',
    kalanBekleyen.length === 1 && kalanBekleyen[0].id === 'e4',
    kalanBekleyen.map(k => k.id).join(','));
  const onaylilar = await onaylananlariOku(env, 'egzersiz');
  rapor.kontrol('Onaylananlar ayrı listede', onaylilar.length === 2,
    onaylilar.map(k => k.id).join(','));
  rapor.kontrol('Reddedilen hiçbir listede yok',
    !onaylilar.some(k => k.id === 'e3') && !kalanBekleyen.some(k => k.id === 'e3'));
  rapor.kontrol('Onay anı damgalanıyor', onaylilar.every(k => typeof k.onayAni === 'string'));

  rapor.baslik('onaylanmış kayıt ajan turunda geri gelmiyor');
  const ucuncu = await turuYaz(env, 'egzersiz', [kayit('e1'), kayit('e5')]);
  rapor.kontrol('Onaylı id atlandı', ucuncu.atlanan === 1, JSON.stringify(ucuncu));
  rapor.kontrol('Bekleyende onaylı kayıt yok',
    !(await bekleyenleriOku(env, 'egzersiz')).some(k => k.id === 'e1'));

  rapor.baslik('geçersiz karar sessizce yutulmuyor');
  const bosKarar = await kararlariIsle(env, [
    { ajan: 'egzersiz', id: 'e4', karar: 'belki' },
    { ajan: 'yokboyle', id: 'e4', karar: 'onay' },
    { ajan: 'egzersiz', karar: 'onay' }
  ]);
  rapor.kontrol('Hiçbiri işlenmedi', bosKarar.onaylanan === 0 && bosKarar.reddedilen === 0,
    JSON.stringify(bosKarar));
  rapor.kontrol('Bekleyen bozulmadı',
    (await bekleyenleriOku(env, 'egzersiz')).some(k => k.id === 'e4'));

  rapor.baslik('aynı kaydı iki kez onaylamak kopya bırakmıyor');
  await kararlariIsle(env, [{ ajan: 'egzersiz', id: 'e4', karar: 'onay' }]);
  await kararlariIsle(env, [{ ajan: 'egzersiz', id: 'e4', karar: 'onay' }]);
  const idler = (await onaylananlariOku(env, 'egzersiz')).map(k => k.id);
  rapor.kontrol('e4 listede bir kez var',
    idler.filter(x => x === 'e4').length === 1, idler.join(','));

  // ── GERİ AL ────────────────────────────────────
  rapor.baslik('geri al');
  rapor.kontrol('Onaylı kayıt geri alınıyor', await geriAl(env, 'egzersiz', 'e1') === true);
  rapor.kontrol('Geri alınan bekleyene döndü',
    (await bekleyenleriOku(env, 'egzersiz')).some(k => k.id === 'e1'));
  rapor.kontrol('Geri alınan onaylıdan çıktı',
    !(await onaylananlariOku(env, 'egzersiz')).some(k => k.id === 'e1'));
  rapor.kontrol('Olmayan kayıt geri alınamıyor',
    await geriAl(env, 'egzersiz', 'yok-boyle-bir-sey') === false);

  // ── İŞLENDİ İŞARETLEME ─────────────────────────
  rapor.baslik('veri-al sonrası temizlik');
  const oncesi = (await onaylananlariOku(env, 'egzersiz')).length;
  const temiz = await onaylananlariTemizle(env, 'egzersiz', ['e2']);
  rapor.kontrol('Bir kayıt silindi', temiz.silinen === 1, JSON.stringify(temiz));
  rapor.kontrol('Diğerleri duruyor',
    (await onaylananlariOku(env, 'egzersiz')).length === oncesi - 1);

  // ── PANEL VERİSİ ───────────────────────────────
  rapor.baslik('panel verisi');
  const panel = await panelVerisi(env);
  rapor.kontrol('Dört ajan da listeleniyor', panel.ajanlar.length === AJANLAR.length,
    panel.ajanlar.map(a => a.id).join(','));
  rapor.kontrol('Her ajanın adı ve kaynağı var',
    panel.ajanlar.every(a => a.ad && a.kaynak));
  rapor.kontrol('Son çalışma bilgisi taşınıyor',
    panel.ajanlar.find(a => a.id === 'egzersiz').calisma !== null);
  rapor.kontrol('Hiç çalışmamış ajan null çalışma veriyor',
    panel.ajanlar.find(a => a.id === 'analiz').calisma === null);

  const panelUc = await adminCagir('/admin/veri');
  rapor.kontrol('/admin/veri JSON dönüyor', panelUc.status === 200 &&
    Array.isArray(panelUc.body.ajanlar), String(panelUc.status));

  rapor.baslik('panel ucu üzerinden karar');
  await turuYaz(env, 'takviye', [kayit('t1'), kayit('t2')]);
  const ucKarar = await adminCagir('/admin/karar', 'POST', {
    kararlar: [{ ajan: 'takviye', id: 't1', karar: 'onay' }]
  });
  rapor.kontrol('Karar ucu çalışıyor', ucKarar.status === 200 && ucKarar.body.onaylanan === 1,
    JSON.stringify(ucKarar.body));
  rapor.kontrol('Onaylanan takviye kaydı ayrıldı',
    (await onaylananlariOku(env, 'takviye')).length === 1);

  const bozukKarar = await adminCagir('/admin/karar', 'POST', { yanlis: true });
  rapor.kontrol('Gövdesi bozuk istek 400 dönüyor', bozukKarar.status === 400,
    String(bozukKarar.status));

  const bilinmeyenYol = await adminCagir('/admin/olmayan-yol');
  rapor.kontrol('Tanımsız panel yolu 404 dönüyor', bilinmeyenYol.status === 404,
    String(bilinmeyenYol.status));

  rapor.baslik('veri-al ucu');
  const alinan = await adminCagir('/admin/onaylananlar?ajan=takviye');
  rapor.kontrol('Onaylananlar ajan filtresiyle geliyor',
    alinan.status === 200 && Array.isArray(alinan.body.takviye) &&
    alinan.body.takviye.length === 1, JSON.stringify(alinan.body).slice(0, 80));
  const hepsi = await adminCagir('/admin/onaylananlar');
  rapor.kontrol('Filtresiz istek dört ajanı da veriyor',
    AJANLAR.every(a => Array.isArray(hepsi.body[a])),
    Object.keys(hepsi.body).join(','));

  // ── KV BÜTÇESİ ─────────────────────────────────
  rapor.baslik('KV yazma bütçesi');
  env.REMINDERS.sayaciSifirla();
  const cokKayit = Array.from({ length: 700 }, (_, i) => kayit('toplu' + i));
  await turuYaz(env, 'gida', cokKayit);
  const yazma = env.REMINDERS.sayac.put;
  rapor.kontrol('700 kayıtlık tur tek blob olarak yazılıyor', yazma <= 2,
    'put: ' + yazma);
  rapor.kontrol('Dört ajan günde bir çalışsa bütçe rahat',
    yazma * 4 <= GUNLUK_YAZMA_SINIRI, (yazma * 4) + ' / ' + GUNLUK_YAZMA_SINIRI);
  rapor.kontrol('Tur hiç list yapmıyor', env.REMINDERS.sayac.list === 0,
    'list: ' + env.REMINDERS.sayac.list);

  env.REMINDERS.sayaciSifirla();
  await adminCagir('/admin/veri');
  rapor.kontrol('Panel açılışı da list yapmıyor', env.REMINDERS.sayac.list === 0,
    'list: ' + env.REMINDERS.sayac.list);

  rapor.baslik('panel dış metni kaçırıyor');
  rapor.kontrol('Kaçırma fonksiyonu sayfada var',
    String(dogru.body).includes('function kacir('), 'kacir bulundu');
  rapor.kontrol('Kayıt adı kaçırılarak basılıyor',
    String(dogru.body).includes('kacir(k.ad)'), 'kacir(k.ad) bulundu');
}
