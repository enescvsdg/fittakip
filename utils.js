/* ══════════════════════════════════════════
   FitTakip — utils.js

   Alana özgü olmayan yardımcılar: tarih ve sayı biçimleme, HTML kaçışı,
   form doğrulama, geri bildirim gösterimi, CSS'ten renk okuma.

   storage.js gibi tek yönlü: burası kimseyi çağırmaz, herkes burayı çağırır.
   app.js'ten önce yüklenir.
   ══════════════════════════════════════════ */

// ── TARİH FORMATLAMA ─────────────────────────
function formatDateTR(dateStr) {
  var parts = (dateStr || '').split('-');
  if (parts.length !== 3) return dateStr || '';
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function parseDateKey(key) {
  var parts = (key || '').split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function fmtKg(v) { return (v % 1 === 0) ? v.toFixed(0) : v.toFixed(1); }

function minutesOfDay(hhmm) {
  var parts = hhmm.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/* HTML'e basılan her dış kaynaklı metin buradan geçmeli: kullanıcı girdisi,
   yedekten gelen veri, USDA yanıtı ve yapay zekânın PDF'ten çıkardığı metinler.
   Tek tırnak da kaçırılıyor çünkü bazı nitelikler tek tırnakla yazılabiliyor. */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* Serbest metni HTML'e basarken satır sonlarını korur — önce kaçış, sonra <br>.
   Sıra önemli: tersi olursa eklediğimiz <br> de kaçırılır. */
function escapeHtmlLines(str) {
  return escapeHtml(str).replace(/\n/g, '<br>');
}

/* href'e konacak bağlantı. javascript: gibi şemalar engellenmeli, yoksa
   bağlantıya dokunmak kod çalıştırır. */
function safeUrl(url) {
  var s = String(url || '').trim();
  return /^https?:\/\//i.test(s) ? escapeHtml(s) : '';
}

/* Grafikler ve VKİ göstergesi renklerini CSS'ten okur. Sabit yazılsalardı
   tema değiştiğinde yanlış renkte kalırlardı. */
function temaRengi(ad) {
  return getComputedStyle(document.documentElement).getPropertyValue('--' + ad).trim();
}

/* Sayısal alanların HTML'deki min/max değerleri yalnızca tarayıcının kendi
   uyarısını tetikliyordu; kaydetme kodu hiçbirini uygulamıyordu. Yapıştırarak
   ya da tarayıcı uyarısını geçerek saçma değer kaydedilebiliyordu.
   Aralıklar HTML'deki niteliklerle birebir aynı tutulmalı. */
var SAYI_ARALIK = {
  height:     { min: 100, max: 250, ad: 'Boy',         birim: 'cm' },
  weight:     { min: 30,  max: 300, ad: 'Kilo',        birim: 'kg' },
  age:        { min: 10,  max: 120, ad: 'Yaş',         birim: '' },
  goalWeight: { min: 30,  max: 300, ad: 'Hedef kilo',  birim: 'kg' },
  foodAmount: { min: 1,   max: 2000, ad: 'Miktar',      birim: 'g'  },
  foodAdet:   { min: 1,   max: 30,  ad: 'Miktar',       birim: 'adet' }
};

/* { bos: true } | { hata: '...' } | { deger: 75.4 } döndürür. */
function sayiDogrula(tur, ham) {
  var k = SAYI_ARALIK[tur];
  var metin = String(ham === null || ham === undefined ? '' : ham).trim().replace(',', '.');
  if (!metin) return { bos: true };
  var n = parseFloat(metin);
  if (isNaN(n)) return { hata: k.ad + ' sayı olmalı.' };
  if (n < k.min || n > k.max) {
    return { hata: k.ad + ' ' + k.min + '-' + k.max + (k.birim ? ' ' + k.birim : '') + ' arasında olmalı.' };
  }
  return { deger: n };
}

// Doğrulama hatasını ilgili geri bildirim satırında gösterir
function dogrulamaHatasi(feedbackId, mesaj) {
  var el = document.getElementById(feedbackId);
  if (el) el.textContent = '⚠️ ' + mesaj;
  showFeedback(feedbackId);
}

function showFeedback(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.classList.add('hidden'); }, 2200);
}
/* ══════════════════════════════════════════
   GÜNLÜK KALORİ VE MAKRO HEDEFİ
   Hesap kodda yapılıyor, yapay zekâya bırakılmıyor: üretilen sayı her
   çalıştırmada değişmesin, nereden geldiği gösterilebilsin ve teste bağlanabilsin
   diye. Yapay zekâya kalan iş bu hedefi tutturacak öğünleri kurmak.
   ══════════════════════════════════════════ */

/* Mifflin-St Jeor — bazal metabolizma (kcal/gün).
   Cinsiyet bilinmiyorsa iki formülün ortalaması alınıyor; hata payı ±%5 olur
   ama hesabı hiç yapmamaktan iyi. */
function bazalMetabolizma(cinsiyet, kilo, boy, yas) {
  var ortak = 10 * kilo + 6.25 * boy - 5 * yas;
  if (cinsiyet === 'erkek') return ortak + 5;
  if (cinsiyet === 'kadin') return ortak - 161;
  return ortak + (5 - 161) / 2;
}

/* Gün içi hareketlilik + haftalık antrenman yükü tek katsayıya iniyor.
   Klasik "aktivite çarpanı" tablosu masa başı/ayakta/fiziksel iş ayrımını
   yapmıyor; burada ikisi ayrı ayrı toplanıyor. */
var HAREKET_KATSAYISI = { masa: 1.25, ayakta: 1.45, fiziksel: 1.65 };

function aktiviteKatsayisi(gunlukHareket, haftalikAntrenman) {
  var taban = HAREKET_KATSAYISI[gunlukHareket] || HAREKET_KATSAYISI.masa;
  var gun = Math.max(0, Math.min(7, Number(haftalikAntrenman) || 0));
  return taban + gun * 0.035;          // 4 gün antrenman ≈ +0.14
}

/* Hedefe göre günlük açık/fazla. Yüzde kullanılıyor: 120 kiloluk birinin
   500 kcal açığı ile 55 kiloluk birininki aynı şey değil. */
var HEDEF_ORANI = { 'Kilo Vermek': -0.20, 'Sabit Kalmak': 0, 'Kilo Almak': 0.12 };

/* { bmr, tdee, kalori, protein, yag, karbonhidrat, uyari } döndürür.
   Eksik veri varsa null döner — çağıran taraf kullanıcıdan istesin. */
function gunlukHedef(veri) {
  var kilo = parseFloat(veri.kilo), boy = parseFloat(veri.boy), yas = parseFloat(veri.yas);
  if (!kilo || !boy || !yas) return null;

  var bmr = bazalMetabolizma(veri.cinsiyet, kilo, boy, yas);
  var tdee = bmr * aktiviteKatsayisi(veri.gunlukHareket, veri.haftalikAntrenman);
  var oran = HEDEF_ORANI[veri.hedefTipi];
  if (oran === undefined) oran = 0;
  var kalori = tdee * (1 + oran);

  // Çok düşük kaloriye inmesin: bazalın altına düşen plan sürdürülebilir değil
  var uyari = '';
  if (kalori < bmr) { kalori = bmr; uyari = 'Hedef, bazal metabolizmanın altına inmesin diye yükseltildi.'; }

  // Protein kiloya göre (kas koruma), yağ kalorinin %25'i, kalanı karbonhidrat
  var protein = Math.round(kilo * (oran < 0 ? 2.0 : 1.8));
  var yag = Math.round((kalori * 0.25) / 9);
  var kalan = kalori - (protein * 4 + yag * 9);
  var karbonhidrat = Math.max(0, Math.round(kalan / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kalori: Math.round(kalori),
    protein: protein,
    yag: yag,
    karbonhidrat: karbonhidrat,
    uyari: uyari
  };
}
