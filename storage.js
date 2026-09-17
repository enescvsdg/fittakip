/* ══════════════════════════════════════════
   FitTakip — storage.js

   localStorage anahtarları ve okuma/yazma yardımcıları.
   Hiçbir şeye bağımlı değil; app.js'ten ÖNCE yüklenir.

   Bu dosyanın ayrı ve önce durmasının bir sebebi var: anahtar sabitleri
   app.js'in içinde aşağıda tanımlıyken, açılışta yukarıdan okunuyorlardı ve
   değer "undefined" kalıyordu. Bu iki kez hataya yol açtı — biri uygulamayı
   komple çökertti, diğeri kartta sessizce yanlış sayı gösterdi. Anahtarlar
   burada olduğu sürece o sınıf hata yapısal olarak imkânsız.
   ══════════════════════════════════════════ */

// ── LOCAL STORAGE KEYS ──────────────────────
// Plan anahtarları — ana sayfa kartları bunları açılışta okuduğu için
// tanımları en üstte durmalı
var MEAL_KEYS = { plan: 'ft_meal_plan' };
var MEAL_ORDER = ['Öğün 1', 'Öğün 2', 'Öğün 3', 'Öğün 4', 'Ara Öğün'];
var SUPP_KEYS = { plan: 'ft_supplement_plan' };
// Ana sayfa kartları açılışta okuduğu için bu da en üstte durmalı —
// aşağıda tanımlanırsa ilk çizimde undefined olup "0 alındı" gösteriyor
var SUPP_TAKEN_KEY = 'ft_supp_taken';
var YUMURTA_BOY_KEY = 'ft_yumurta_boy';   // son seçilen yumurta boyu (S/M/L)
var SUPP_TIMING_ORDER = ['Sabah', 'Aç Karnına', 'Öğün İle Birlikte', 'Antrenman Öncesi', 'Antrenman Esnasında', 'Antrenman Sonrası', 'Akşam / Yatmadan Önce'];

var KEYS = {
  height:      'ft_height',
  weight:      'ft_weight',
  age:         'ft_age',
  gender:      'ft_gender',
  goal:        'ft_goal',
  workout:     'ft_workout',
  nutrition:   'ft_nutrition',
  supplement:  'ft_supplement',
  goalType:    'ft_goal_type',
  goalDate:    'ft_goal_date',
  goalWeight:  'ft_goal_weight',
  weighins:    'ft_weighins',
  workoutDays: 'ft_workout_days_v2',
  activeDay:   'ft_active_weekday',
  cardio:      'ft_cardio_plan'
};

// ── JSON STORAGE HELPERS ─────────────────────
function getJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    var parsed = JSON.parse(raw);
    return (parsed === null || parsed === undefined) ? fallback : parsed;
  } catch (e) {
    console.warn('[Storage] JSON okunamadı:', key, e);
    return fallback;
  }
}
function setJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.warn('[Storage] JSON yazılamadı:', key, e); }
}

function getWeighIns() { return getJSON(KEYS.weighins, []); }
function saveWeighIns(list) { setJSON(KEYS.weighins, list); }

// Bugünün tarihini YYYY-MM-DD formatında döndürür (yerel saat)
function getTodayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}