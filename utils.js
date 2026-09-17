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