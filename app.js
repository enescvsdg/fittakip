/* ══════════════════════════════════════════
   FitTakip — app.js
   ══════════════════════════════════════════ */

// ── DOM REFERENCES (Genel) ──────────────────
var menuToggle   = document.getElementById('menuToggle');
var dropdownMenu = document.getElementById('dropdownMenu');
var overlay      = document.getElementById('overlay');
var navItems     = document.querySelectorAll('.nav-item');
var bottomItems  = document.querySelectorAll('.bottom-nav-item');
var pages        = document.querySelectorAll('.page');

// ── SPA: SHOW PAGE ──────────────────────────
function showPage(pageId) {
  pages.forEach(function(p) { p.classList.add('hidden'); });

  var target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
    target.style.animation = 'none';
    void target.offsetHeight;
    target.style.animation = '';
  }

  navItems.forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
  bottomItems.forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  if (pageId === 'home') updateDashboard();
}

// ── MENU TOGGLE ─────────────────────────────
function openMenu() {
  menuToggle.classList.add('open');
  dropdownMenu.classList.add('open');
  menuToggle.setAttribute('aria-expanded', 'true');
  dropdownMenu.setAttribute('aria-hidden', 'false');
  overlay.classList.add('active');
}
function closeMenu() {
  menuToggle.classList.remove('open');
  dropdownMenu.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  dropdownMenu.setAttribute('aria-hidden', 'true');
  overlay.classList.remove('active');
}
menuToggle.addEventListener('click', function(e) {
  e.stopPropagation();
  if (dropdownMenu.classList.contains('open')) { closeMenu(); } else { openMenu(); }
});
overlay.addEventListener('click', closeMenu);
document.addEventListener('click', function(e) {
  if (!dropdownMenu.contains(e.target) && e.target !== menuToggle) closeMenu();
});
navItems.forEach(function(btn) {
  btn.addEventListener('click', function() { showPage(btn.dataset.page); closeMenu(); });
});
bottomItems.forEach(function(btn) {
  btn.addEventListener('click', function() { showPage(btn.dataset.page); });
});

// ── LOCAL STORAGE KEYS ──────────────────────
var KEYS = {
  height:      'ft_height',
  weight:      'ft_weight',
  age:         'ft_age',
  goal:        'ft_goal',
  workout:     'ft_workout',
  nutrition:   'ft_nutrition',
  supplement:  'ft_supplement',
  goalType:    'ft_goal_type',
  goalDate:    'ft_goal_date',
  goalWeight:  'ft_goal_weight',
  weighins:    'ft_weighins',
  workoutDays: 'ft_workout_days_v2',
  activeDay:   'ft_active_weekday'
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

// ── TARİH FORMATLAMA ─────────────────────────
function formatDateTR(dateStr) {
  var parts = (dateStr || '').split('-');
  if (parts.length !== 3) return dateStr || '';
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

// ── LOAD SAVED DATA ──────────────────────────
function loadFormData() {
  document.getElementById('input-height').value     = localStorage.getItem(KEYS.height)     || '';
  document.getElementById('input-weight').value     = localStorage.getItem(KEYS.weight)     || '';
  document.getElementById('input-age').value        = localStorage.getItem(KEYS.age)        || '';
  document.getElementById('input-goal').value       = localStorage.getItem(KEYS.goal)       || '';
  document.getElementById('input-workout').value    = localStorage.getItem(KEYS.workout)    || '';
  document.getElementById('input-nutrition').value  = localStorage.getItem(KEYS.nutrition)  || '';
  document.getElementById('input-supplement').value = localStorage.getItem(KEYS.supplement) || '';

  var savedGoalType = localStorage.getItem(KEYS.goalType);
  if (savedGoalType) document.getElementById('goal-type').value = savedGoalType;
  document.getElementById('goal-date').value   = localStorage.getItem(KEYS.goalDate)   || '';
  document.getElementById('goal-weight').value = localStorage.getItem(KEYS.goalWeight) || '';

  document.getElementById('gemini-api-key').value = localStorage.getItem('ft_gemini_api_key') || '';
}

// ── SAVE FEEDBACK ────────────────────────────
function showFeedback(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.classList.add('hidden'); }, 2200);
}

// ── SAVE HANDLERS (temel bilgiler) ──────────
document.getElementById('save-profile').addEventListener('click', function() {
  var h = document.getElementById('input-height').value.trim();
  var w = document.getElementById('input-weight').value.trim();
  var a = document.getElementById('input-age').value.trim();
  var g = document.getElementById('input-goal').value.trim();
  if (h) localStorage.setItem(KEYS.height, h);
  if (w) localStorage.setItem(KEYS.weight, w);
  if (a) localStorage.setItem(KEYS.age, a);
  if (g) localStorage.setItem(KEYS.goal, g);
  showFeedback('profile-feedback');
  updateDashboard();
});

document.getElementById('save-workout').addEventListener('click', function() {
  localStorage.setItem(KEYS.workout, document.getElementById('input-workout').value);
  showFeedback('workout-feedback');
});
document.getElementById('save-nutrition').addEventListener('click', function() {
  localStorage.setItem(KEYS.nutrition, document.getElementById('input-nutrition').value);
  showFeedback('nutrition-feedback');
});
document.getElementById('save-supplement').addEventListener('click', function() {
  localStorage.setItem(KEYS.supplement, document.getElementById('input-supplement').value);
  showFeedback('supplement-feedback');
});

/* ══════════════════════════════════════════
   HEDEF & GRAFİK SİSTEMİ
   ══════════════════════════════════════════ */

document.getElementById('save-goal').addEventListener('click', function() {
  var type   = document.getElementById('goal-type').value;
  var date   = document.getElementById('goal-date').value;
  var weight = document.getElementById('goal-weight').value;
  localStorage.setItem(KEYS.goalType, type);
  if (date)   localStorage.setItem(KEYS.goalDate, date);
  if (weight) localStorage.setItem(KEYS.goalWeight, weight);
  showFeedback('goal-feedback');
  updateDashboard();
});

document.getElementById('add-weighin').addEventListener('click', function() {
  var dateInput   = document.getElementById('weighin-date');
  var weightInput = document.getElementById('weighin-weight');
  var date   = dateInput.value;
  var weight = parseFloat(weightInput.value);
  var feedbackEl = document.getElementById('weighin-feedback');

  if (!date || !weight || isNaN(weight)) {
    feedbackEl.textContent = '⚠️ Lütfen tarih ve kilo gir.';
    showFeedback('weighin-feedback');
    return;
  }

  var list = getWeighIns();
  list.push({ date: date, weight: weight });
  saveWeighIns(list);

  feedbackEl.textContent = '✅ Tartım eklendi!';
  dateInput.value = '';
  weightInput.value = '';

  showFeedback('weighin-feedback');
  renderWeighinList();
  updateDashboard();
});

function renderWeighinList() {
  var container = document.getElementById('weighinList');
  if (!container) return;
  var list = getWeighIns().slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-hint">Henüz tartım eklenmedi.</p>';
    return;
  }
  var html = '<p class="list-heading">Son Tartımlar</p>';
  list.slice(0, 6).forEach(function(item) {
    html += '<div class="weighin-item"><span>' + formatDateTR(item.date) + '</span><span class="weighin-item-weight">' + item.weight + ' kg</span></div>';
  });
  container.innerHTML = html;
}

var weightChartInstance = null;

function updateChart() {
  var canvas   = document.getElementById('weightChart');
  var emptyMsg = document.getElementById('chart-empty');
  if (!canvas || !emptyMsg) return;

  var weighins = getWeighIns().slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

  if (weighins.length === 0) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
    if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }
    return;
  }

  canvas.classList.remove('hidden');
  emptyMsg.classList.add('hidden');

  var labels  = weighins.map(function(w) { return formatDateTR(w.date); });
  var weights = weighins.map(function(w) { return w.weight; });
  var goalWeight = parseFloat(localStorage.getItem(KEYS.goalWeight));

  var datasets = [{
    label: 'Kilo (kg)', data: weights, borderColor: '#ff5c2b',
    backgroundColor: 'rgba(255, 92, 43, 0.15)', borderWidth: 2.5,
    pointBackgroundColor: '#ff5c2b', pointBorderColor: '#1e1e1e',
    pointRadius: 4, pointHoverRadius: 6, tension: 0.3, fill: true
  }];

  if (goalWeight && !isNaN(goalWeight)) {
    datasets.push({
      label: 'Hedef Kilo (kg)', data: labels.map(function() { return goalWeight; }),
      borderColor: '#4caf50', borderDash: [6, 6], borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: false
    });
  }

  if (weightChartInstance) weightChartInstance.destroy();
  if (typeof Chart === 'undefined') { console.warn('[Chart.js] yüklenemedi.'); return; }

  weightChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { labels: { color: '#f0f0f0', font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#888', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function updateGoalStatus() {
  var statusEl = document.getElementById('goal-status-message');
  if (!statusEl) return;
  var goalType   = localStorage.getItem(KEYS.goalType);
  var goalWeight = parseFloat(localStorage.getItem(KEYS.goalWeight));
  var weighins   = getWeighIns().slice().sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

  if (!goalType || !goalWeight || isNaN(goalWeight) || weighins.length === 0) {
    statusEl.className = 'status-message status-neutral';
    statusEl.textContent = 'Hedef ve tartım verisi ekleyerek analizi başlat.';
    return;
  }

  var latestWeight = weighins[weighins.length - 1].weight;
  var reached = false;
  if (goalType === 'Kilo Vermek') reached = latestWeight <= goalWeight;
  else if (goalType === 'Kilo Almak') reached = latestWeight >= goalWeight;
  else reached = Math.abs(latestWeight - goalWeight) <= 0.5;

  if (reached) {
    statusEl.className = 'status-message status-success';
    statusEl.textContent = '🎉 Tebrikler! Hedefine Ulaştın, böyle devam et.';
  } else {
    statusEl.className = 'status-message status-warning';
    statusEl.textContent = '💪 Hedefine ulaşmak için daha sıkı çalışmalısın.';
  }
}

function calcBMI(heightCm, weightKg) { var hM = heightCm / 100; return weightKg / (hM * hM); }
function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Zayıf', color: '#5bc0eb' };
  if (bmi < 25)   return { label: 'Normal', color: '#4caf50' };
  if (bmi < 30)   return { label: 'Fazla Kilolu', color: '#ffc107' };
  return             { label: 'Obez', color: '#f44336' };
}

function updateDashboard() {
  var h = parseFloat(localStorage.getItem(KEYS.height));
  var w = parseFloat(localStorage.getItem(KEYS.weight));

  var dashWeight = document.getElementById('dash-weight');
  var dashHeight = document.getElementById('dash-height');
  var dashBMI    = document.getElementById('dash-bmi');
  var dashStatus = document.getElementById('dash-bmi-status');
  var emptyState = document.getElementById('home-empty');
  var cardsGrid  = document.querySelector('.cards-grid');
  var infoBox    = document.getElementById('bmi-info-box');

  if (!h || !w || h <= 0 || w <= 0) {
    cardsGrid.style.display = 'none';
    infoBox.style.display   = 'none';
    emptyState.classList.add('visible');
  } else {
    cardsGrid.style.display = 'grid';
    infoBox.style.display   = 'block';
    emptyState.classList.remove('visible');

    var bmi = calcBMI(h, w);
    var cat = bmiCategory(bmi);
    dashWeight.textContent = (w % 1 === 0) ? w.toFixed(0) : w.toFixed(1);
    dashHeight.textContent = h.toFixed(0);
    dashBMI.textContent    = bmi.toFixed(1);
    dashStatus.textContent = cat.label;
    dashStatus.style.color = cat.color;
  }

  var homePage = document.getElementById('page-home');
  if (homePage && !homePage.classList.contains('hidden')) {
    updateChart();
    updateGoalStatus();
  }
}

/* ══════════════════════════════════════════
   ANTRENMAN VERİTABANI
   free-exercise-db (yuhonas/free-exercise-db, Unlicense)
   veri setinden derlenmiş gerçek hareketler
   ══════════════════════════════════════════ */

// Kas grubu İngilizce -> Türkçe çeviri
var MUSCLE_TR = {
  'abdominals': 'Karın',
  'biceps':     'Biceps',
  'calves':     'Baldır',
  'chest':      'Göğüs',
  'forearms':   'Ön Kol',
  'glutes':     'Kalça',
  'hamstrings': 'Arka Bacak',
  'lats':       'Sırt (Lat)',
  'lower back': 'Bel',
  'middle back':'Sırt (Orta)',
  'neck':       'Boyun',
  'quadriceps': 'Bacak (Ön)',
  'shoulders':  'Omuz',
  'traps':      'Trapez',
  'triceps':    'Triceps',
  'adductors':  'Bacak İç',
  'abductors':  'Bacak Dış',
  'unknown':    'Genel'
};

// Her kas grubunun anatomik olarak hangi görünümde (ön/arka) göründüğü
var MUSCLE_VIEW = {
  'chest':      'front',
  'abdominals': 'front',
  'biceps':     'front',
  'shoulders':  'front',
  'quadriceps': 'front',
  'forearms':   'front',
  'adductors':  'front',
  'neck':       'front',
  'lats':       'back',
  'middle back':'back',
  'lower back': 'back',
  'traps':      'back',
  'glutes':     'back',
  'hamstrings': 'back',
  'calves':     'back',
  'triceps':    'back',
  'abductors':  'back',
  'unknown':    'front'
};

var LEVEL_TR = { 'beginner': 'Başlangıç', 'intermediate': 'Orta', 'expert': 'İleri' };

var EQUIPMENT_TR = {
  'none': '', 'other': '', 'body only': '',
  'barbell': 'Barbell', 'ez curl bar': 'EZ Bar', 'dumbbell': 'Dumbbell',
  'gym mat': 'Mat', 'exercise ball': 'Denge Topu', 'medicine ball': 'Sağlık Topu',
  'pull-up bar': 'Barfiks Barı', 'bench': 'Bench', 'incline bench': 'Eğimli Bench',
  'kettlebell': 'Kettlebell', 'kettlebells': 'Kettlebell', 'machine': 'Makine',
  'cable': 'Kablo', 'bands': 'Direnç Bandı', 'foam roll': 'Foam Roller'
};

// exercemus/exercises (wger.de + exercises.json, CC-BY-SA) + yaygın bilinen hareketler
// Kas grubu sırasına göre kategorize edilmiş (fillExerciseSelect optgroup oluşturur)
var EXERCISES = {
  'Evde': [
    { name: "Push-Up", equipment: "none", level: "beginner", muscle: "chest" },
    { name: "Incline Push-Up", equipment: "none", level: "beginner", muscle: "chest" },
    { name: "Band Assisted Pull-Up", equipment: "bands", level: "intermediate", muscle: "lats" },
    { name: "Pull-Up", equipment: "pull-up bar", level: "intermediate", muscle: "lats" },
    { name: "Chin-Up", equipment: "pull-up bar", level: "intermediate", muscle: "lats" },
    { name: "Inverted Row", equipment: "pull-up bar", level: "beginner", muscle: "lats" },
    { name: "Wide-Grip Pull-Up", equipment: "pull-up bar", level: "expert", muscle: "lats" },
    { name: "Alternating Kettlebell Row", equipment: "kettlebell", level: "intermediate", muscle: "middle back" },
    { name: "Alternating Renegade Row", equipment: "kettlebell", level: "expert", muscle: "middle back" },
    { name: "Alternating Kettlebell Press", equipment: "kettlebell", level: "intermediate", muscle: "shoulders" },
    { name: "Arm Circles", equipment: "none", level: "beginner", muscle: "shoulders" },
    { name: "Back Flyes - With Bands", equipment: "bands", level: "beginner", muscle: "shoulders" },
    { name: "Backward Medicine Ball Throw", equipment: "medicine ball", level: "intermediate", muscle: "shoulders" },
    { name: "Band Pull Apart", equipment: "bands", level: "beginner", muscle: "shoulders" },
    { name: "Brachialis-SMR", equipment: "foam roll", level: "beginner", muscle: "biceps" },
    { name: "Bench Dips", equipment: "none", level: "intermediate", muscle: "triceps" },
    { name: "Body-Up", equipment: "none", level: "intermediate", muscle: "triceps" },
    { name: "Body Tricep Press", equipment: "none", level: "intermediate", muscle: "triceps" },
    { name: "Band Skullcrusher", equipment: "bands", level: "beginner", muscle: "triceps" },
    { name: "Diamond Push-Up", equipment: "none", level: "intermediate", muscle: "triceps" },
    { name: "Bottoms-Up Clean From The Hang Position", equipment: "kettlebell", level: "expert", muscle: "forearms" },
    { name: "Farmer's Walk", equipment: "kettlebell", level: "beginner", muscle: "forearms" },
    { name: "Dead Hang", equipment: "pull-up bar", level: "beginner", muscle: "forearms" },
    { name: "3/4 Sit-Up", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Air Bike", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Alternate Heel Touchers", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Advanced Kettlebell Windmill", equipment: "kettlebell", level: "expert", muscle: "abdominals" },
    { name: "Bent-Knee Hip Raise", equipment: "none", level: "intermediate", muscle: "abdominals" },
    { name: "Bottoms Up", equipment: "none", level: "intermediate", muscle: "abdominals" },
    { name: "Butt-Ups", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Bent Press", equipment: "kettlebell", level: "expert", muscle: "abdominals" },
    { name: "Plank", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Side Plank", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Hanging Leg Raise", equipment: "pull-up bar", level: "intermediate", muscle: "abdominals" },
    { name: "Russian Twist", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Mountain Climber", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Bicycle Crunch", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Dead Bug", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "V-Up", equipment: "none", level: "intermediate", muscle: "abdominals" },
    { name: "Toe Touch", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Bodyweight Squat", equipment: "none", level: "beginner", muscle: "quadriceps" },
    { name: "Bodyweight Walking Lunge", equipment: "none", level: "beginner", muscle: "quadriceps" },
    { name: "Bench Jump", equipment: "none", level: "intermediate", muscle: "quadriceps" },
    { name: "Burpee", equipment: "none", level: "intermediate", muscle: "quadriceps" },
    { name: "Ball Leg Curl", equipment: "exercise ball", level: "intermediate", muscle: "hamstrings" },
    { name: "Band Good Morning", equipment: "bands", level: "beginner", muscle: "hamstrings" },
    { name: "Alternating Hang Clean", equipment: "kettlebell", level: "expert", muscle: "hamstrings" },
    { name: "Nordic Hamstring Curl", equipment: "none", level: "expert", muscle: "hamstrings" },
    { name: "Butt Lift (Bridge)", equipment: "none", level: "beginner", muscle: "glutes" },
    { name: "Kettlebell Swing", equipment: "kettlebell", level: "intermediate", muscle: "glutes" },
    { name: "Frog Pump", equipment: "none", level: "beginner", muscle: "glutes" },
    { name: "Single Leg Glute Bridge", equipment: "none", level: "beginner", muscle: "glutes" },
    { name: "Banded Glute Bridge", equipment: "bands", level: "beginner", muscle: "glutes" },
    { name: "Band Hip Adductions", equipment: "bands", level: "beginner", muscle: "adductors" },
    { name: "Adductor", equipment: "foam roll", level: "beginner", muscle: "adductors" },
    { name: "Adductor/Groin", equipment: "none", level: "beginner", muscle: "adductors" },
    { name: "Side-Lying Inner Thigh Raise", equipment: "none", level: "beginner", muscle: "adductors" },
    { name: "Cossack Squat", equipment: "none", level: "intermediate", muscle: "adductors" },
    { name: "Sumo Deadlift High Pull", equipment: "kettlebell", level: "intermediate", muscle: "adductors" },
    { name: "Clamshell", equipment: "bands", level: "beginner", muscle: "abductors" },
    { name: "Side-Lying Leg Raise", equipment: "none", level: "beginner", muscle: "abductors" },
    { name: "Monster Walk", equipment: "bands", level: "beginner", muscle: "abductors" },
    { name: "Fire Hydrant", equipment: "none", level: "beginner", muscle: "abductors" },
    { name: "Calf Raises - With Bands", equipment: "bands", level: "beginner", muscle: "calves" },
    { name: "Single Leg Calf Raise", equipment: "none", level: "intermediate", muscle: "calves" },
    { name: "Trap Bar Shrug", equipment: "other", level: "beginner", muscle: "traps" },
    { name: "Superman", equipment: "none", level: "beginner", muscle: "lower back" },
    { name: "Bird Dog", equipment: "none", level: "beginner", muscle: "lower back" },
    { name: "Neck Lateral Flexion", equipment: "none", level: "beginner", muscle: "neck" },
    { name: "Neck Flexion (Manual Resistance)", equipment: "none", level: "beginner", muscle: "neck" }
  ],
  'Spor Salonunda': [
    { name: "Barbell Bench Press", equipment: "barbell", level: "intermediate", muscle: "chest" },
    { name: "Barbell Incline Bench Press", equipment: "barbell", level: "intermediate", muscle: "chest" },
    { name: "Barbell Guillotine Bench Press", equipment: "barbell", level: "expert", muscle: "chest" },
    { name: "Around The Worlds", equipment: "dumbbell", level: "intermediate", muscle: "chest" },
    { name: "Bent-Arm Dumbbell Pullover", equipment: "dumbbell", level: "intermediate", muscle: "chest" },
    { name: "Bodyweight Flyes", equipment: "ez curl bar", level: "intermediate", muscle: "chest" },
    { name: "Cable Chest Press", equipment: "cable", level: "beginner", muscle: "chest" },
    { name: "Cable Crossover", equipment: "cable", level: "intermediate", muscle: "chest" },
    { name: "Cable Iron Cross", equipment: "cable", level: "intermediate", muscle: "chest" },
    { name: "Machine Chest Fly", equipment: "machine", level: "beginner", muscle: "chest" },
    { name: "Decline Bench Press", equipment: "barbell", level: "intermediate", muscle: "chest" },
    { name: "Dumbbell Bench Press", equipment: "dumbbell", level: "beginner", muscle: "chest" },
    { name: "Dumbbell Incline Press", equipment: "dumbbell", level: "intermediate", muscle: "chest" },
    { name: "Chest Dip", equipment: "other", level: "intermediate", muscle: "chest" },
    { name: "Svend Press", equipment: "other", level: "intermediate", muscle: "chest" },
    { name: "Pec Deck Fly", equipment: "machine", level: "beginner", muscle: "chest" },
    { name: "Landmine Press", equipment: "barbell", level: "intermediate", muscle: "chest" },
    { name: "Incline Cable Fly", equipment: "cable", level: "intermediate", muscle: "chest" },
    { name: "Bent-Arm Barbell Pullover", equipment: "barbell", level: "intermediate", muscle: "lats" },
    { name: "Cable Incline Pushdown", equipment: "cable", level: "intermediate", muscle: "lats" },
    { name: "Lat Pulldown", equipment: "cable", level: "beginner", muscle: "lats" },
    { name: "One-Arm Dumbbell Row", equipment: "dumbbell", level: "beginner", muscle: "lats" },
    { name: "Straight Arm Pulldown", equipment: "cable", level: "beginner", muscle: "lats" },
    { name: "Single Arm Lat Pulldown", equipment: "cable", level: "intermediate", muscle: "lats" },
    { name: "Kroc Row", equipment: "dumbbell", level: "expert", muscle: "lats" },
    { name: "Alternating Kettlebell Row", equipment: "kettlebell", level: "intermediate", muscle: "middle back" },
    { name: "Alternating Renegade Row", equipment: "kettlebell", level: "expert", muscle: "middle back" },
    { name: "Bent Over Barbell Row", equipment: "barbell", level: "intermediate", muscle: "middle back" },
    { name: "Bent Over One-Arm Long Bar Row", equipment: "barbell", level: "intermediate", muscle: "middle back" },
    { name: "Bent Over Two-Arm Long Bar Row", equipment: "barbell", level: "intermediate", muscle: "middle back" },
    { name: "Bent Over Two-Dumbbell Row", equipment: "dumbbell", level: "intermediate", muscle: "middle back" },
    { name: "Bodyweight Mid Row", equipment: "other", level: "beginner", muscle: "middle back" },
    { name: "Seated Cable Row", equipment: "cable", level: "beginner", muscle: "middle back" },
    { name: "T-Bar Row", equipment: "barbell", level: "intermediate", muscle: "middle back" },
    { name: "Chest Supported Row", equipment: "dumbbell", level: "intermediate", muscle: "middle back" },
    { name: "Meadows Row", equipment: "barbell", level: "intermediate", muscle: "middle back" },
    { name: "Machine Row", equipment: "machine", level: "beginner", muscle: "middle back" },
    { name: "Alternating Cable Shoulder Press", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Alternating Deltoid Raise", equipment: "dumbbell", level: "beginner", muscle: "shoulders" },
    { name: "Alternating Kettlebell Press", equipment: "kettlebell", level: "intermediate", muscle: "shoulders" },
    { name: "Anti-Gravity Press", equipment: "barbell", level: "expert", muscle: "shoulders" },
    { name: "Arnold Dumbbell Press", equipment: "dumbbell", level: "intermediate", muscle: "shoulders" },
    { name: "Barbell Incline Shoulder Raise", equipment: "barbell", level: "intermediate", muscle: "shoulders" },
    { name: "Barbell Rear Delt Row", equipment: "barbell", level: "intermediate", muscle: "shoulders" },
    { name: "Barbell Shoulder Press", equipment: "barbell", level: "intermediate", muscle: "shoulders" },
    { name: "Battling Ropes", equipment: "other", level: "intermediate", muscle: "shoulders" },
    { name: "Bent Over Dumbbell Rear Delt Raise With Head On Bench", equipment: "dumbbell", level: "intermediate", muscle: "shoulders" },
    { name: "Bent Over Low-Pulley Side Lateral", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Bradford/Rocky Presses", equipment: "barbell", level: "expert", muscle: "shoulders" },
    { name: "Cable Internal Rotation", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Cable Rear Delt Fly", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Cable Rope Rear-Delt Rows", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Cable Seated Lateral Raise", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Cable Shoulder Press", equipment: "cable", level: "intermediate", muscle: "shoulders" },
    { name: "Dumbbell Shoulder Press", equipment: "dumbbell", level: "beginner", muscle: "shoulders" },
    { name: "Lateral Raise", equipment: "dumbbell", level: "beginner", muscle: "shoulders" },
    { name: "Front Raise", equipment: "dumbbell", level: "beginner", muscle: "shoulders" },
    { name: "Face Pull", equipment: "cable", level: "beginner", muscle: "shoulders" },
    { name: "Cuban Press", equipment: "dumbbell", level: "expert", muscle: "shoulders" },
    { name: "Single Arm Landmine Press", equipment: "barbell", level: "intermediate", muscle: "shoulders" },
    { name: "Alternate Hammer Curl", equipment: "dumbbell", level: "beginner", muscle: "biceps" },
    { name: "Alternate Incline Dumbbell Curl", equipment: "dumbbell", level: "intermediate", muscle: "biceps" },
    { name: "Barbell Curl", equipment: "barbell", level: "beginner", muscle: "biceps" },
    { name: "Barbell Curls Lying Against An Incline", equipment: "barbell", level: "intermediate", muscle: "biceps" },
    { name: "Cable Hammer Curls (Rope Attachment)", equipment: "cable", level: "beginner", muscle: "biceps" },
    { name: "Cable Preacher Curl", equipment: "cable", level: "intermediate", muscle: "biceps" },
    { name: "Concentration Curl", equipment: "dumbbell", level: "beginner", muscle: "biceps" },
    { name: "Preacher Curl", equipment: "ez curl bar", level: "intermediate", muscle: "biceps" },
    { name: "Zottman Curl", equipment: "dumbbell", level: "intermediate", muscle: "biceps" },
    { name: "Standing EZ Bar Curl", equipment: "ez curl bar", level: "beginner", muscle: "biceps" },
    { name: "Spider Curl", equipment: "ez curl bar", level: "intermediate", muscle: "biceps" },
    { name: "Drag Curl", equipment: "barbell", level: "intermediate", muscle: "biceps" },
    { name: "Cross Body Hammer Curl", equipment: "dumbbell", level: "beginner", muscle: "biceps" },
    { name: "21s Bicep Curl", equipment: "barbell", level: "intermediate", muscle: "biceps" },
    { name: "Cable Curl", equipment: "cable", level: "beginner", muscle: "biceps" },
    { name: "Incline Dumbbell Curl", equipment: "dumbbell", level: "intermediate", muscle: "biceps" },
    { name: "Board Press", equipment: "barbell", level: "intermediate", muscle: "triceps" },
    { name: "Cable Incline Triceps Extension", equipment: "cable", level: "intermediate", muscle: "triceps" },
    { name: "Cable Lying Triceps Extension", equipment: "cable", level: "intermediate", muscle: "triceps" },
    { name: "Cable One Arm Tricep Extension", equipment: "cable", level: "intermediate", muscle: "triceps" },
    { name: "Cable Rope Overhead Triceps Extension", equipment: "cable", level: "intermediate", muscle: "triceps" },
    { name: "Close-Grip Bench Press", equipment: "barbell", level: "intermediate", muscle: "triceps" },
    { name: "Barbell Skull Crusher", equipment: "barbell", level: "intermediate", muscle: "triceps" },
    { name: "Overhead Dumbbell Triceps Extension", equipment: "dumbbell", level: "intermediate", muscle: "triceps" },
    { name: "Dumbbell Kickback", equipment: "dumbbell", level: "beginner", muscle: "triceps" },
    { name: "JM Press", equipment: "barbell", level: "expert", muscle: "triceps" },
    { name: "Triceps Dip Machine", equipment: "machine", level: "beginner", muscle: "triceps" },
    { name: "Bottoms-Up Clean From The Hang Position", equipment: "kettlebell", level: "expert", muscle: "forearms" },
    { name: "Cable Wrist Curl", equipment: "cable", level: "beginner", muscle: "forearms" },
    { name: "Reverse Curl", equipment: "ez curl bar", level: "beginner", muscle: "forearms" },
    { name: "Wrist Curl", equipment: "barbell", level: "beginner", muscle: "forearms" },
    { name: "Farmer's Walk", equipment: "kettlebell", level: "beginner", muscle: "forearms" },
    { name: "Reverse Wrist Curl", equipment: "barbell", level: "beginner", muscle: "forearms" },
    { name: "Plate Pinch", equipment: "other", level: "intermediate", muscle: "forearms" },
    { name: "Behind The Back Wrist Curl", equipment: "barbell", level: "beginner", muscle: "forearms" },
    { name: "Ab Roller", equipment: "other", level: "intermediate", muscle: "abdominals" },
    { name: "Advanced Kettlebell Windmill", equipment: "kettlebell", level: "expert", muscle: "abdominals" },
    { name: "Barbell Ab Rollout", equipment: "barbell", level: "intermediate", muscle: "abdominals" },
    { name: "Bosu Ball Cable Crunch With Side Bends", equipment: "cable", level: "intermediate", muscle: "abdominals" },
    { name: "Cable Crunch", equipment: "cable", level: "beginner", muscle: "abdominals" },
    { name: "Cable Judo Flip", equipment: "cable", level: "intermediate", muscle: "abdominals" },
    { name: "Cable Reverse Crunch", equipment: "cable", level: "intermediate", muscle: "abdominals" },
    { name: "Cable Russian Twists", equipment: "cable", level: "intermediate", muscle: "abdominals" },
    { name: "Cable Seated Crunch", equipment: "cable", level: "beginner", muscle: "abdominals" },
    { name: "Barbell Side Bend", equipment: "barbell", level: "beginner", muscle: "abdominals" },
    { name: "Bent Press", equipment: "kettlebell", level: "expert", muscle: "abdominals" },
    { name: "Barbell Rollout from Bench", equipment: "barbell", level: "intermediate", muscle: "abdominals" },
    { name: "Pallof Press", equipment: "cable", level: "intermediate", muscle: "abdominals" },
    { name: "Barbell Full Squat", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Hack Squat", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Lunge", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Side Split Squat", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Squat", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Squat To A Bench", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Step Ups", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Barbell Walking Lunge", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Bear Crawl Sled Drags", equipment: "other", level: "intermediate", muscle: "quadriceps" },
    { name: "Bench Sprint", equipment: "other", level: "intermediate", muscle: "quadriceps" },
    { name: "Box Squat", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Cable Deadlifts", equipment: "cable", level: "intermediate", muscle: "quadriceps" },
    { name: "Cable Hip Adduction", equipment: "cable", level: "beginner", muscle: "quadriceps" },
    { name: "Backward Drag", equipment: "other", level: "intermediate", muscle: "quadriceps" },
    { name: "Front Squat", equipment: "barbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Goblet Squat", equipment: "dumbbell", level: "beginner", muscle: "quadriceps" },
    { name: "Bulgarian Split Squat", equipment: "dumbbell", level: "intermediate", muscle: "quadriceps" },
    { name: "Leg Press", equipment: "machine", level: "beginner", muscle: "quadriceps" },
    { name: "Leg Extension", equipment: "machine", level: "beginner", muscle: "quadriceps" },
    { name: "Alternating Hang Clean", equipment: "kettlebell", level: "expert", muscle: "hamstrings" },
    { name: "Box Jump (Multiple Response)", equipment: "other", level: "intermediate", muscle: "hamstrings" },
    { name: "Box Skip", equipment: "other", level: "intermediate", muscle: "hamstrings" },
    { name: "Romanian Deadlift", equipment: "barbell", level: "intermediate", muscle: "hamstrings" },
    { name: "Leg Curl", equipment: "machine", level: "beginner", muscle: "hamstrings" },
    { name: "Seated Leg Curl", equipment: "machine", level: "beginner", muscle: "hamstrings" },
    { name: "Lying Leg Curl", equipment: "machine", level: "beginner", muscle: "hamstrings" },
    { name: "Stiff-Leg Deadlift", equipment: "barbell", level: "intermediate", muscle: "hamstrings" },
    { name: "Single Leg Romanian Deadlift", equipment: "dumbbell", level: "intermediate", muscle: "hamstrings" },
    { name: "Glute Ham Raise", equipment: "other", level: "expert", muscle: "hamstrings" },
    { name: "Barbell Glute Bridge", equipment: "barbell", level: "intermediate", muscle: "glutes" },
    { name: "Barbell Hip Thrust", equipment: "barbell", level: "intermediate", muscle: "glutes" },
    { name: "Hip Thrust", equipment: "none", level: "beginner", muscle: "glutes" },
    { name: "Glute Kickback", equipment: "cable", level: "beginner", muscle: "glutes" },
    { name: "Kettlebell Swing", equipment: "kettlebell", level: "intermediate", muscle: "glutes" },
    { name: "Cable Pull Through", equipment: "cable", level: "intermediate", muscle: "glutes" },
    { name: "Curtsy Lunge", equipment: "dumbbell", level: "intermediate", muscle: "glutes" },
    { name: "Hip Adductor Machine", equipment: "machine", level: "beginner", muscle: "adductors" },
    { name: "Sumo Squat", equipment: "dumbbell", level: "beginner", muscle: "adductors" },
    { name: "Copenhagen Plank", equipment: "bench", level: "expert", muscle: "adductors" },
    { name: "Sumo Deadlift High Pull", equipment: "kettlebell", level: "intermediate", muscle: "adductors" },
    { name: "Standing Hip Abduction", equipment: "cable", level: "beginner", muscle: "abductors" },
    { name: "Hip Abduction Machine", equipment: "machine", level: "beginner", muscle: "abductors" },
    { name: "Balance Board", equipment: "other", level: "beginner", muscle: "calves" },
    { name: "Barbell Seated Calf Raise", equipment: "barbell", level: "beginner", muscle: "calves" },
    { name: "Calf Press", equipment: "machine", level: "beginner", muscle: "calves" },
    { name: "Calf Press On The Leg Press Machine", equipment: "machine", level: "beginner", muscle: "calves" },
    { name: "Calf Raise On A Dumbbell", equipment: "dumbbell", level: "intermediate", muscle: "calves" },
    { name: "Standing Calf Raise", equipment: "machine", level: "beginner", muscle: "calves" },
    { name: "Donkey Calf Raise", equipment: "machine", level: "intermediate", muscle: "calves" },
    { name: "Jump Rope", equipment: "other", level: "beginner", muscle: "calves" },
    { name: "Seated Calf Raise", equipment: "machine", level: "beginner", muscle: "calves" },
    { name: "Leg Press Calf Raise", equipment: "machine", level: "beginner", muscle: "calves" },
    { name: "Barbell Shrug", equipment: "barbell", level: "beginner", muscle: "traps" },
    { name: "Barbell Shrug Behind The Back", equipment: "barbell", level: "intermediate", muscle: "traps" },
    { name: "Cable Shrugs", equipment: "cable", level: "beginner", muscle: "traps" },
    { name: "Calf-Machine Shoulder Shrug", equipment: "machine", level: "beginner", muscle: "traps" },
    { name: "Upright Row", equipment: "barbell", level: "intermediate", muscle: "traps" },
    { name: "Dumbbell Shrug", equipment: "dumbbell", level: "beginner", muscle: "traps" },
    { name: "Snatch Grip Shrug", equipment: "barbell", level: "intermediate", muscle: "traps" },
    { name: "Rack Pull", equipment: "barbell", level: "intermediate", muscle: "traps" },
    { name: "Trap Bar Shrug", equipment: "other", level: "beginner", muscle: "traps" },
    { name: "Barbell Deadlift", equipment: "barbell", level: "intermediate", muscle: "lower back" },
    { name: "Atlas Stone Trainer", equipment: "other", level: "expert", muscle: "lower back" },
    { name: "Atlas Stones", equipment: "other", level: "expert", muscle: "lower back" },
    { name: "Axle Deadlift", equipment: "other", level: "expert", muscle: "lower back" },
    { name: "Sumo Deadlift", equipment: "barbell", level: "intermediate", muscle: "lower back" },
    { name: "Good Morning", equipment: "barbell", level: "intermediate", muscle: "lower back" },
    { name: "Back Extension", equipment: "machine", level: "beginner", muscle: "lower back" },
    { name: "Reverse Hyperextension", equipment: "machine", level: "intermediate", muscle: "lower back" },
    { name: "45-Degree Hyperextension", equipment: "other", level: "intermediate", muscle: "lower back" },
    { name: "Neck Curl", equipment: "other", level: "beginner", muscle: "neck" },
    { name: "Neck Extension", equipment: "other", level: "beginner", muscle: "neck" },
    { name: "Plate Neck Harness", equipment: "other", level: "intermediate", muscle: "neck" }
  ]
};

var DAYS_ORDER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/* ══════════════════════════════════════════
   DİNAMİK ANATOMİ HARİTASI (Ön + Arka)
   Gerçek wger.de kas illüstrasyonu (CC BY-SA) — ./anatomy/front.svg
   ve ./anatomy/back.svg dosyalarından tembel (lazy) yüklenir ve
   önbelleğe alınır. Kas grupları data-muscle özniteliğiyle
   etiketlenir, JS tarafından ilgili gruba göre highlight edilir.
   ══════════════════════════════════════════ */

var anatomySVGCache = { front: null, back: null };

// İlgili görünümün SVG metnini getirir (önbellekteyse tekrar indirmez)
function loadAnatomySVG(view, callback) {
  var key = view === 'back' ? 'back' : 'front';
  if (anatomySVGCache[key]) {
    callback(anatomySVGCache[key]);
    return;
  }
  fetch('./anatomy/' + key + '.svg')
    .then(function(res) { return res.ok ? res.text() : Promise.reject(); })
    .then(function(text) {
      anatomySVGCache[key] = text;
      callback(text);
    })
    .catch(function() {
      console.warn('[Anatomi] ' + key + '.svg yüklenemedi (çevrimdışı olabilir).');
      callback(null);
    });
}

// Belirtilen kas grubunu SVG üzerinde highlight eder, diğerlerini nötrler
function highlightMuscleInSvg(svgWrapEl, muscle) {
  if (!svgWrapEl) return;
  var regions = svgWrapEl.querySelectorAll('.muscle-overlay');
  regions.forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-muscle') === muscle);
  });
}

// SVG'yi panele yerleştirir ve ilgili kası highlight eder
function populateAnatomyPanel(panelEl) {
  var muscle = panelEl.getAttribute('data-muscle');
  var view = panelEl.getAttribute('data-current-view');
  var svgWrap = panelEl.querySelector('.anatomy-svg-wrap');

  loadAnatomySVG(view, function(svgText) {
    if (!svgText) {
      svgWrap.innerHTML = '<p class="anatomy-error">Görsel yüklenemedi.</p>';
      return;
    }
    svgWrap.innerHTML = svgText;
    highlightMuscleInSvg(svgWrap, muscle);
  });
}

// Ön/Arka anatomi panelinin HTML iskeletini üretir (sepette ve takip
// kartlarında ortak kullanılır). SVG içeriği ayrıca populateAnatomyPanel
// ile (tembel) doldurulur.
function buildAnatomyPanelHTML(muscle) {
  var defaultView = MUSCLE_VIEW[muscle] || 'front';
  var muscleLabel = MUSCLE_TR[muscle] || muscle;
  return (
    '<div class="anatomy-panel" data-current-view="' + defaultView + '" data-muscle="' + muscle + '">' +
      '<div class="anatomy-view-toggle">' +
        '<button type="button" class="anatomy-view-btn' + (defaultView === 'front' ? ' active' : '') + '" data-view-btn="front">Ön</button>' +
        '<button type="button" class="anatomy-view-btn' + (defaultView === 'back' ? ' active' : '') + '" data-view-btn="back">Arka</button>' +
      '</div>' +
      '<p class="muscle-region-label">' + muscleLabel + '</p>' +
      '<div class="anatomy-svg-wrap"><p class="anatomy-loading">Yükleniyor…</p></div>' +
      '<p class="anatomy-credit">Kas illüstrasyonu: wger.de (CC BY-SA 4.0)</p>' +
    '</div>'
  );
}

// Bir konteynerin içindeki tüm .anatomy-panel'leri ilk render'da doldurur
function initAnatomyPanels(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.anatomy-panel').forEach(function(panel) {
    populateAnatomyPanel(panel);
  });
}

// Anatomi panelindeki Ön/Arka geçiş butonlarını dinler (event delegation ile dışarıdan çağrılır)
function handleAnatomyViewToggle(target) {
  var btn = target.closest('.anatomy-view-btn');
  if (!btn) return false;

  var panel = btn.closest('.anatomy-panel');
  if (!panel) return false;

  var newView = btn.getAttribute('data-view-btn');
  panel.setAttribute('data-current-view', newView);

  panel.querySelectorAll('.anatomy-view-btn').forEach(function(b) {
    b.classList.toggle('active', b === btn);
  });

  populateAnatomyPanel(panel);
  return true;
}

/* ══════════════════════════════════════════
   GÜN VERİSİ (Pazartesi–Pazar, opsiyonel başlık)
   ══════════════════════════════════════════ */

function getWorkoutDaysMap() { return getJSON(KEYS.workoutDays, {}); }
function saveWorkoutDaysMap(map) { setJSON(KEYS.workoutDays, map); }
function getDay(weekday) {
  var map = getWorkoutDaysMap();
  return map[weekday] || { title: '', exercises: [] };
}

var activeWeekday = localStorage.getItem(KEYS.activeDay) || 'Pazartesi';
if (DAYS_ORDER.indexOf(activeWeekday) === -1) activeWeekday = 'Pazartesi';

var cartItems = []; // Sepet — henüz kaydedilmemiş hareketler (bellekte tutulur)

// ── DOM REFERANSLARI ───────────────────────────
var builderDaySelect      = document.getElementById('builder-day');
var builderDayTitleInput  = document.getElementById('builder-day-title');
var builderLocationSelect = document.getElementById('builder-location');
var builderRegionSelect   = document.getElementById('builder-region');
var builderExerciseSelect = document.getElementById('builder-exercise');
var builderSetsSelect     = document.getElementById('builder-sets');
var builderRepsSelect     = document.getElementById('builder-reps');
var addToCartBtn          = document.getElementById('addToCartBtn');
var cartListEl            = document.getElementById('cartList');
var completeProgramBtn    = document.getElementById('completeProgramBtn');

var overallProgressCard   = document.getElementById('overallProgressCard');
var dayTabsContainer      = document.getElementById('dayTabsContainer');
var dayProgressRow        = document.getElementById('dayProgressRow');
var clearDayBtn           = document.getElementById('clearDayBtn');
var exerciseSectionDivider= document.getElementById('exerciseSectionDivider');
var exerciseCardsListEl   = document.getElementById('exerciseCardsList');

// ── SELECT DOLDURMA YARDIMCILARI ──────────────
function fillNumberRange(selectEl, min, max) {
  var html = '';
  for (var i = min; i <= max; i++) html += '<option value="' + i + '">' + i + '</option>';
  selectEl.innerHTML = html;
}

// "Çalışılacak Bölge" dropdown'ını, seçili mekandaki hareketlerin kas gruplarıyla doldurur
function fillRegionSelect(location) {
  var list = EXERCISES[location] || [];
  var seen = {};
  var html = '';

  list.forEach(function(ex) {
    if (seen[ex.muscle]) return;
    seen[ex.muscle] = true;
    var label = MUSCLE_TR[ex.muscle] || ex.muscle;
    html += '<option value="' + ex.muscle + '">' + label + '</option>';
  });

  builderRegionSelect.innerHTML = html;
}

// Hareket dropdown'ını, seçili mekan + seçili bölgeye (kas grubu) göre doldurur
function fillExerciseSelect(location, region) {
  var list = EXERCISES[location] || [];
  var html = '';

  list.forEach(function(ex) {
    if (ex.muscle !== region) return;
    html += '<option value="' + ex.name + '">' + ex.name + '</option>';
  });

  builderExerciseSelect.innerHTML = html;
}

builderLocationSelect.addEventListener('change', function() {
  fillRegionSelect(builderLocationSelect.value);
  fillExerciseSelect(builderLocationSelect.value, builderRegionSelect.value);
});

builderRegionSelect.addEventListener('change', function() {
  fillExerciseSelect(builderLocationSelect.value, builderRegionSelect.value);
});

/* ══════════════════════════════════════════
   SEPET (CART) MANTIĞI
   ══════════════════════════════════════════ */

function buildCartItemHTML(item, index) {
  var muscleLabel = MUSCLE_TR[item.muscle] || item.muscle;
  var metaParts = [item.weekday];
  if (item.dayTitle) metaParts.push(item.dayTitle);
  metaParts.push(item.location);
  metaParts.push(item.sets + '×' + item.reps);
  metaParts.push(muscleLabel);
  var meta = metaParts.join(' · ');

  return (
    '<div class="cart-item" data-cart-id="' + item.cartId + '">' +
      '<div class="cart-item-header">' +
        '<span class="cart-item-number">' + (index + 1) + '</span>' +
        '<div class="cart-item-info">' +
          '<p class="cart-item-name">' + item.name + '</p>' +
          '<p class="cart-item-meta">' + meta + '</p>' +
        '</div>' +
        '<span class="cart-item-chevron">⌄</span>' +
        '<button type="button" class="cart-item-remove" data-cart-id="' + item.cartId + '" title="Sil">✕</button>' +
      '</div>' +
      '<div class="cart-item-anatomy-wrap hidden">' + buildAnatomyPanelHTML(item.muscle) + '</div>' +
    '</div>'
  );
}

function renderCartList() {
  if (cartItems.length === 0) {
    cartListEl.innerHTML = '<p class="empty-hint">Henüz hareket eklenmedi.</p>';
    return;
  }
  var html = '';
  cartItems.forEach(function(item, idx) { html += buildCartItemHTML(item, idx); });
  cartListEl.innerHTML = html;
  initAnatomyPanels(cartListEl);
}

cartListEl.addEventListener('click', function(e) {
  if (handleAnatomyViewToggle(e.target)) return;

  var removeBtn = e.target.closest('.cart-item-remove');
  if (removeBtn) {
    var cid = removeBtn.dataset.cartId;
    cartItems = cartItems.filter(function(it) { return it.cartId !== cid; });
    renderCartList();
    return;
  }

  var header = e.target.closest('.cart-item-header');
  if (header) {
    var item = header.closest('.cart-item');
    item.classList.toggle('expanded');
    item.querySelector('.cart-item-anatomy-wrap').classList.toggle('hidden');
    return;
  }
});

addToCartBtn.addEventListener('click', function() {
  var weekday      = builderDaySelect.value;
  var dayTitle     = builderDayTitleInput.value.trim();
  var location     = builderLocationSelect.value;
  var exerciseName = builderExerciseSelect.value;
  var sets         = parseInt(builderSetsSelect.value, 10);
  var reps         = parseInt(builderRepsSelect.value, 10);

  var list = EXERCISES[location] || [];
  var found = list.find(function(ex) { return ex.name === exerciseName; });

  cartItems.push({
    cartId: 'cart_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    weekday: weekday,
    dayTitle: dayTitle,
    location: location,
    name: exerciseName,
    muscle: found ? found.muscle : 'abdominals',
    equipment: found ? found.equipment : '',
    level: found ? found.level : '',
    sets: sets,
    reps: reps
  });

  renderCartList();
});

completeProgramBtn.addEventListener('click', function() {
  var feedbackEl = document.getElementById('program-feedback');

  if (cartItems.length === 0) {
    feedbackEl.textContent = '⚠️ Sepet boş — önce hareket ekle.';
    showFeedback('program-feedback');
    return;
  }

  var daysMap = getWorkoutDaysMap();
  var titlesToApply = {};
  var lastWeekday = cartItems[cartItems.length - 1].weekday;

  cartItems.forEach(function(item) {
    if (!daysMap[item.weekday]) daysMap[item.weekday] = { title: '', exercises: [] };

    daysMap[item.weekday].exercises.push({
      id: 'ex_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: item.name,
      muscle: item.muscle,
      equipment: item.equipment,
      level: item.level,
      sets: item.sets,
      reps: item.reps,
      checked: new Array(item.sets).fill(false)
    });

    if (item.dayTitle) titlesToApply[item.weekday] = item.dayTitle;
  });

  Object.keys(titlesToApply).forEach(function(wd) {
    daysMap[wd].title = titlesToApply[wd];
  });

  saveWorkoutDaysMap(daysMap);

  cartItems = [];
  renderCartList();
  builderDayTitleInput.value = '';

  activeWeekday = lastWeekday;
  localStorage.setItem(KEYS.activeDay, activeWeekday);

  feedbackEl.textContent = '✅ Program kaydedildi!';
  showFeedback('program-feedback');

  renderWorkoutTracking();
});

/* ══════════════════════════════════════════
   TAKİP GÖRÜNÜMÜ (Haftalık sekmeler, ilerleme, kartlar)
   ══════════════════════════════════════════ */

function renderDayTabs() {
  var daysMap = getWorkoutDaysMap();
  var filledWeekdays = DAYS_ORDER.filter(function(weekday) {
    var day = daysMap[weekday];
    return day && day.exercises && day.exercises.length > 0;
  });

  if (filledWeekdays.indexOf(activeWeekday) === -1) {
    activeWeekday = filledWeekdays[0] || 'Pazartesi';
    localStorage.setItem(KEYS.activeDay, activeWeekday);
  }

  var html = '';

  filledWeekdays.forEach(function(weekday) {
    var day = daysMap[weekday];
    var activeClass = weekday === activeWeekday ? ' active' : '';
    var hasTitle = day.title;
    var titleHtml = hasTitle ? day.title : '—';
    var titleClass = hasTitle ? '' : ' muted';
    var badge = '<span class="day-tab-badge">' + day.exercises.length + '</span>';

    html +=
      '<button class="day-tab' + activeClass + '" data-weekday="' + weekday + '">' +
        '<span class="day-tab-number">' + weekday + '</span>' +
        '<span class="day-tab-title' + titleClass + '">' + titleHtml + '</span>' +
        badge +
      '</button>';
  });

  if (!html) {
    html = '<p class="empty-hint">Henüz program eklenmedi.</p>';
  }

  dayTabsContainer.innerHTML = html;
}

dayTabsContainer.addEventListener('click', function(e) {
  var tab = e.target.closest('.day-tab');
  if (!tab) return;
  activeWeekday = tab.dataset.weekday;
  localStorage.setItem(KEYS.activeDay, activeWeekday);
  renderDayTabs();
  renderDayProgress();
  renderExerciseCards();
});

function renderOverallProgress() {
  var daysMap = getWorkoutDaysMap();
  var totalSets = 0, doneSets = 0;

  DAYS_ORDER.forEach(function(weekday) {
    var day = daysMap[weekday];
    if (!day) return;
    day.exercises.forEach(function(ex) {
      totalSets += ex.sets;
      doneSets += ex.checked.filter(Boolean).length;
    });
  });

  document.getElementById('overallProgressLabel').textContent = doneSets + ' / ' + totalSets + ' set — toplam program';
  var pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  document.getElementById('overallProgressFill').style.width = pct + '%';
}

function renderDayProgress() {
  var day = getDay(activeWeekday);
  var totalSets = 0, doneSets = 0;

  day.exercises.forEach(function(ex) {
    totalSets += ex.sets;
    doneSets += ex.checked.filter(Boolean).length;
  });

  document.getElementById('dayProgressLabel').textContent = doneSets + ' / ' + totalSets + ' set';
  var pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  document.getElementById('dayProgressFill').style.width = pct + '%';

  clearDayBtn.textContent = '🗑️ ' + activeWeekday + ' Programını Temizle';
}

clearDayBtn.addEventListener('click', function() {
  var daysMap = getWorkoutDaysMap();
  var day = daysMap[activeWeekday];
  if (!day || !day.exercises || day.exercises.length === 0) return;

  var confirmed = window.confirm('"' + activeWeekday + '" günündeki tüm antrenmanları silmek istediğine emin misin?');
  if (!confirmed) return;

  daysMap[activeWeekday] = { title: day.title || '', exercises: [] };
  saveWorkoutDaysMap(daysMap);
  renderWorkoutTracking();
});

function buildExerciseCardHTML(weekday, ex) {
  var allChecked = ex.checked.length > 0 && ex.checked.every(Boolean);
  var circlesHTML = '';

  for (var i = 0; i < ex.sets; i++) {
    var isChecked = !!ex.checked[i];
    var content = isChecked ? '✓' : (i + 1);
    circlesHTML +=
      '<label class="set-circle-label">' +
        '<input type="checkbox" class="set-checkbox-input" data-weekday="' + weekday + '" data-id="' + ex.id + '" data-index="' + i + '" ' + (isChecked ? 'checked' : '') + '>' +
        '<span class="set-circle-visual">' + content + '</span>' +
      '</label>';
  }

  var youtubeUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' nasıl yapılır');
  var levelLabel = ex.level ? (LEVEL_TR[ex.level] || ex.level) : '';
  var equipmentLabel = ex.equipment ? (EQUIPMENT_TR[ex.equipment] !== undefined ? EQUIPMENT_TR[ex.equipment] : ex.equipment) : '';
  var extraMetaParts = [equipmentLabel, levelLabel].filter(Boolean);
  var extraMeta = extraMetaParts.length ? ' · ' + extraMetaParts.join(' · ') : '';

  return (
    '<div class="exercise-card' + (allChecked ? ' completed' : '') + '" data-weekday="' + weekday + '" data-id="' + ex.id + '">' +
      '<button class="exercise-card-remove" data-weekday="' + weekday + '" data-id="' + ex.id + '" title="Kaldır">✕</button>' +
      '<div class="exercise-card-title-row">' +
        '<button class="exercise-card-name">' + ex.name + '</button>' +
        '<a class="exercise-card-play" href="' + youtubeUrl + '" target="_blank" rel="noopener noreferrer" title="Video izle"><span>▶</span></a>' +
      '</div>' +
      '<p class="exercise-card-sets-reps">' + ex.sets + '×' + ex.reps + extraMeta + '</p>' +
      '<div class="exercise-card-circles">' + circlesHTML + '</div>' +
      '<div class="exercise-anatomy-wrap hidden">' + buildAnatomyPanelHTML(ex.muscle) + '</div>' +
    '</div>'
  );
}

function renderExerciseCards() {
  var day = getDay(activeWeekday);

  if (!day.exercises || day.exercises.length === 0) {
    exerciseCardsListEl.innerHTML = '<p class="day-empty">Bu güne henüz egzersiz eklenmedi. Yukarıdaki formla ekleyebilirsin.</p>';
    return;
  }

  var html = '';
  day.exercises.forEach(function(ex) { html += buildExerciseCardHTML(activeWeekday, ex); });
  exerciseCardsListEl.innerHTML = html;
  initAnatomyPanels(exerciseCardsListEl);
}

exerciseCardsListEl.addEventListener('click', function(e) {
  if (handleAnatomyViewToggle(e.target)) return;

  var removeBtn = e.target.closest('.exercise-card-remove');
  if (removeBtn) {
    var weekday = removeBtn.dataset.weekday;
    var exId = removeBtn.dataset.id;
    var daysMap = getWorkoutDaysMap();
    var day = daysMap[weekday];
    if (day) {
      day.exercises = day.exercises.filter(function(x) { return x.id !== exId; });
      saveWorkoutDaysMap(daysMap);
      renderWorkoutTracking();
    }
    return;
  }

  var nameBtn = e.target.closest('.exercise-card-name');
  if (nameBtn) {
    var card = nameBtn.closest('.exercise-card');
    card.querySelector('.exercise-anatomy-wrap').classList.toggle('hidden');
    return;
  }
});

exerciseCardsListEl.addEventListener('change', function(e) {
  if (!e.target.classList.contains('set-checkbox-input')) return;

  var weekday = e.target.dataset.weekday;
  var exId = e.target.dataset.id;
  var idx = parseInt(e.target.dataset.index, 10);

  var daysMap = getWorkoutDaysMap();
  var day = daysMap[weekday];
  if (!day) return;
  var ex = day.exercises.find(function(x) { return x.id === exId; });
  if (!ex) return;

  ex.checked[idx] = e.target.checked;
  saveWorkoutDaysMap(daysMap);

  var visual = e.target.nextElementSibling;
  visual.textContent = e.target.checked ? '✓' : (idx + 1);

  var card = e.target.closest('.exercise-card');
  card.classList.toggle('completed', ex.checked.every(Boolean));

  renderDayProgress();
  renderOverallProgress();
});

function renderWorkoutTracking() {
  renderDayTabs();
  renderDayProgress();
  renderOverallProgress();
  renderExerciseCards();
}

// ── SERVICE WORKER ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(function(reg) { console.log('[SW] Kayıt başarılı:', reg.scope); })
      .catch(function(err) { console.warn('[SW] Kayıt başarısız:', err); });

    navigator.serviceWorker.addEventListener('controllerchange', function() {
      window.location.reload();
    });
  });
}

// ── INIT ─────────────────────────────────────
loadFormData();
renderWeighinList();
updateDashboard();

fillNumberRange(builderSetsSelect, 1, 10);
fillNumberRange(builderRepsSelect, 1, 20);
fillRegionSelect(builderLocationSelect.value);
fillExerciseSelect(builderLocationSelect.value, builderRegionSelect.value);
builderDaySelect.value = activeWeekday;

overallProgressCard.classList.remove('hidden');
dayTabsContainer.classList.remove('hidden');
dayProgressRow.classList.remove('hidden');
clearDayBtn.classList.remove('hidden');
exerciseSectionDivider.classList.remove('hidden');
exerciseCardsListEl.classList.remove('hidden');

renderCartList();
renderWorkoutTracking();

/* ══════════════════════════════════════════
   BESLENME PLANI — OPEN FOOD FACTS ENTEGRASYONU
   Gerçek gıda veritabanı ile arama + günlük takip.
   API: world.openfoodfacts.org (herkese açık, kimlik doğrulama gerekmez)
   ══════════════════════════════════════════ */

var NUTRITION_KEYS = {
  log: 'ft_nutrition_log'
};

function getTodayKey() {
  var d = new Date();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function getNutritionLog() { return getJSON(NUTRITION_KEYS.log, {}); }
function saveNutritionLog(log) { setJSON(NUTRITION_KEYS.log, log); }

function getTodayEntries() {
  var log = getNutritionLog();
  return log[getTodayKey()] || [];
}

// ── DOM REFERANSLARI ───────────────────────────
var foodSearchInput   = document.getElementById('food-search-input');
var foodSearchBtn     = document.getElementById('food-search-btn');
var foodSearchResults = document.getElementById('foodSearchResults');
var foodLogList       = document.getElementById('foodLogList');
var foodAmountModal   = document.getElementById('foodAmountModal');
var foodAmountInput   = document.getElementById('food-amount-input');
var foodAmountPreview = document.getElementById('foodAmountPreview');
var closeFoodAmountModalBtn = document.getElementById('closeFoodAmountModal');
var confirmAddFoodBtn = document.getElementById('confirmAddFoodBtn');

var pendingFoodItem = null; // miktar modalinda bekleyen secili gida

// ── OPEN FOOD FACTS ARAMA ──────────────────────
function searchFood(query) {
  foodSearchResults.innerHTML = '<p class="loading-hint">Aranıyor…</p>';

  var url = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=' +
    encodeURIComponent(query) +
    '&search_simple=1&action=process&json=1&page_size=15' +
    '&fields=product_name,brands,nutriments,image_small_url,code';

  fetch(url)
    .then(function(res) { return res.ok ? res.json() : Promise.reject(); })
    .then(function(data) {
      var products = (data && data.products) ? data.products : [];
      renderFoodSearchResults(products);
    })
    .catch(function() {
      foodSearchResults.innerHTML = '<p class="loading-hint">⚠️ Gıda araması şu an yapılamıyor. İnternet bağlantını kontrol et.</p>';
    });
}

function renderFoodSearchResults(products) {
  var valid = products.filter(function(p) {
    return p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] );
  });

  if (valid.length === 0) {
    foodSearchResults.innerHTML = '<p class="loading-hint">Sonuç bulunamadı. Farklı bir isimle dene (İngilizce de olabilir).</p>';
    return;
  }

  var html = '';
  valid.forEach(function(p, idx) {
    var kcal = Math.round(p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0);
    var brand = p.brands ? p.brands.split(',')[0].trim() : '';
    var img = p.image_small_url || '';
    var imgHtml = img
      ? '<img class="food-result-img" src="' + img + '" alt="" loading="lazy">'
      : '<div class="food-result-img"></div>';

    html +=
      '<div class="food-result-item" data-idx="' + idx + '">' +
        imgHtml +
        '<div class="food-result-info">' +
          '<p class="food-result-name">' + p.product_name + '</p>' +
          '<p class="food-result-meta">' + (brand ? brand + ' · ' : '') + kcal + ' kcal / 100g</p>' +
        '</div>' +
        '<button class="food-result-add" type="button">+</button>' +
      '</div>';
  });

  foodSearchResults.innerHTML = html;
  foodSearchResults._products = valid; // secim icin bellekte tut
}

foodSearchBtn.addEventListener('click', function() {
  var q = foodSearchInput.value.trim();
  if (!q) return;
  searchFood(q);
});

foodSearchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    foodSearchBtn.click();
  }
});

foodSearchResults.addEventListener('click', function(e) {
  var item = e.target.closest('.food-result-item');
  if (!item) return;
  var idx = parseInt(item.dataset.idx, 10);
  var product = foodSearchResults._products[idx];
  if (!product) return;
  openFoodAmountModal(product);
});

// ── MİKTAR MODALI ───────────────────────────────
function getNutrimentPer100(product, key) {
  var n = product.nutriments || {};
  return parseFloat(n[key + '_100g']) || 0;
}

function openFoodAmountModal(product) {
  pendingFoodItem = {
    name: product.product_name,
    brand: product.brands ? product.brands.split(',')[0].trim() : '',
    kcal100: getNutrimentPer100(product, 'energy-kcal'),
    protein100: getNutrimentPer100(product, 'proteins'),
    carbs100: getNutrimentPer100(product, 'carbohydrates'),
    fat100: getNutrimentPer100(product, 'fat')
  };
  document.getElementById('foodAmountTitle').textContent = pendingFoodItem.name;
  foodAmountInput.value = 100;
  updateFoodAmountPreview();
  foodAmountModal.classList.remove('hidden');
}

function closeFoodAmountModal() {
  foodAmountModal.classList.add('hidden');
  pendingFoodItem = null;
}

function updateFoodAmountPreview() {
  if (!pendingFoodItem) return;
  var grams = parseFloat(foodAmountInput.value) || 0;
  var factor = grams / 100;
  var kcal = Math.round(pendingFoodItem.kcal100 * factor);
  var protein = (pendingFoodItem.protein100 * factor).toFixed(1);
  var carbs = (pendingFoodItem.carbs100 * factor).toFixed(1);
  var fat = (pendingFoodItem.fat100 * factor).toFixed(1);

  foodAmountPreview.innerHTML =
    '<strong>' + kcal + ' kcal</strong><br>' +
    'Protein: ' + protein + 'g · Karbonhidrat: ' + carbs + 'g · Yağ: ' + fat + 'g';
}

foodAmountInput.addEventListener('input', updateFoodAmountPreview);
closeFoodAmountModalBtn.addEventListener('click', closeFoodAmountModal);
foodAmountModal.addEventListener('click', function(e) {
  if (e.target === foodAmountModal) closeFoodAmountModal();
});

confirmAddFoodBtn.addEventListener('click', function() {
  if (!pendingFoodItem) return;
  var grams = parseFloat(foodAmountInput.value) || 100;
  var factor = grams / 100;

  var entry = {
    id: 'food_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: pendingFoodItem.name,
    brand: pendingFoodItem.brand,
    grams: grams,
    kcal: Math.round(pendingFoodItem.kcal100 * factor),
    protein: Math.round(pendingFoodItem.protein100 * factor * 10) / 10,
    carbs: Math.round(pendingFoodItem.carbs100 * factor * 10) / 10,
    fat: Math.round(pendingFoodItem.fat100 * factor * 10) / 10
  };

  var log = getNutritionLog();
  var todayKey = getTodayKey();
  if (!log[todayKey]) log[todayKey] = [];
  log[todayKey].push(entry);
  saveNutritionLog(log);

  closeFoodAmountModal();
  renderFoodLog();
  foodSearchInput.value = '';
  foodSearchResults.innerHTML = '';
});

// ── GÜNLÜK GÖRÜNÜMÜ ─────────────────────────────
function renderFoodLog() {
  var entries = getTodayEntries();

  if (entries.length === 0) {
    foodLogList.innerHTML = '<p class="empty-hint">Bugün henüz bir şey eklemedin.</p>';
  } else {
    var html = '';
    entries.forEach(function(e) {
      html +=
        '<div class="food-log-item">' +
          '<div>' +
            '<p class="food-log-item-name">' + e.name + '</p>' +
            '<p class="food-log-item-meta">' + e.grams + 'g · P:' + e.protein + ' K:' + e.carbs + ' Y:' + e.fat + '</p>' +
          '</div>' +
          '<span class="food-log-item-kcal">' + e.kcal + ' kcal</span>' +
          '<button class="food-log-item-remove" data-id="' + e.id + '" title="Kaldır">✕</button>' +
        '</div>';
    });
    foodLogList.innerHTML = html;
  }

  updateMacroTotals(entries);
}

function updateMacroTotals(entries) {
  var totals = entries.reduce(function(acc, e) {
    acc.kcal += e.kcal;
    acc.protein += e.protein;
    acc.carbs += e.carbs;
    acc.fat += e.fat;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  document.getElementById('macro-kcal').textContent = Math.round(totals.kcal);
  document.getElementById('macro-protein').textContent = Math.round(totals.protein);
  document.getElementById('macro-carbs').textContent = Math.round(totals.carbs);
  document.getElementById('macro-fat').textContent = Math.round(totals.fat);
}

foodLogList.addEventListener('click', function(e) {
  var btn = e.target.closest('.food-log-item-remove');
  if (!btn) return;
  var id = btn.dataset.id;
  var log = getNutritionLog();
  var todayKey = getTodayKey();
  if (!log[todayKey]) return;
  log[todayKey] = log[todayKey].filter(function(item) { return item.id !== id; });
  saveNutritionLog(log);
  renderFoodLog();
});

// ── INIT (Beslenme) ─────────────────────────────
renderFoodLog();

/* ══════════════════════════════════════════
   PDF + AI: PROGRAM OTOMATİK AKTARIMI
   pdf.js (metin çıkarma) + Gemini API (AI ayrıştırma)
   Anahtar sadece localStorage'da tutulur, koda hiç yazılmaz.
   ══════════════════════════════════════════ */

var GEMINI_KEY_STORAGE = 'ft_gemini_api_key';
var GEMINI_MODEL = 'gemini-flash-latest';

function getGeminiKey() { return localStorage.getItem(GEMINI_KEY_STORAGE) || ''; }
function saveGeminiKey(key) { localStorage.setItem(GEMINI_KEY_STORAGE, key); }

// pdf.js worker'ını ayarla (kütüphane yüklenmişse)
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.getElementById('save-api-key').addEventListener('click', function() {
  var key = document.getElementById('gemini-api-key').value.trim();
  saveGeminiKey(key);
  showFeedback('api-key-feedback');
});

// ── PDF METİN ÇIKARMA (tamamen tarayıcıda, hiçbir yere gönderilmeden) ──
function extractPdfText(file) {
  return file.arrayBuffer().then(function(buffer) {
    return pdfjsLib.getDocument({ data: buffer }).promise;
  }).then(function(pdf) {
    var pagePromises = [];
    for (var i = 1; i <= pdf.numPages; i++) {
      pagePromises.push(
        pdf.getPage(i).then(function(page) {
          return page.getTextContent();
        }).then(function(content) {
          return content.items.map(function(item) { return item.str; }).join(' ');
        })
      );
    }
    return Promise.all(pagePromises).then(function(pagesText) {
      return pagesText.join('\n\n');
    });
  });
}

// ── AI PROMPT OLUŞTURMA ──
function buildGeminiPrompt(pdfText) {
  return (
    'Aşağıdaki metin bir antrenman programı içeriyor. Bu programı analiz et ve ' +
    'SADECE geçerli JSON formatında yanıt ver — başka hiçbir açıklama, yorum veya markdown code-block ekleme.\n\n' +
    'Format tam olarak şu şekilde olmalı:\n' +
    '{"Pazartesi": [{"hareket": "Bench Press", "set": 3, "tekrar": 10}], "Salı": [...]}\n\n' +
    'Kurallar:\n' +
    '- Gün isimleri SADECE şunlardan biri olmalı: Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar\n' +
    '- Metinde "Gün 1", "Day A" gibi isimler varsa sırayla Pazartesi\'den başlayarak eşleştir\n' +
    '- set ve tekrar sayısal (tam sayı) olmalı; metinde belirtilmemişse 3 set 10 tekrar varsay\n' +
    '- Hareket isimlerini olduğu gibi koru (İngilizce olabilir)\n' +
    '- Bir gün için hiç hareket bulamazsan o günü hiç ekleme\n\n' +
    'Metin:\n' + pdfText.substring(0, 15000)
  );
}

// ── GEMINI API ÇAĞRISI ──
function callGeminiAPI(prompt, apiKey) {
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(apiKey);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }).then(function(res) {
    if (!res.ok) {
      return res.json().catch(function() { return null; }).then(function(errData) {
        var msg = (errData && errData.error && errData.error.message) || ('HTTP ' + res.status);
        throw new Error(msg);
      });
    }
    return res.json();
  }).then(function(data) {
    var text = data && data.candidates && data.candidates[0] &&
               data.candidates[0].content && data.candidates[0].content.parts &&
               data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!text) throw new Error('AI yanıtı boş geldi.');
    return text;
  });
}

// ── AI YANITINI JSON'A ÇEVİRME (markdown code-block temizliği dahil) ──
function parseAIJson(rawText) {
  var cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned);
}

// ── HAREKET ADINA GÖRE VERİTABANIMIZDAN EŞLEŞME BUL ──
function findExerciseMeta(name) {
  var all = EXERCISES['Evde'].concat(EXERCISES['Spor Salonunda']);
  var lower = (name || '').trim().toLowerCase();
  var found = all.find(function(e) { return e.name.toLowerCase() === lower; });
  if (found) return { muscle: found.muscle, equipment: found.equipment, level: found.level };
  return { muscle: 'unknown', equipment: '', level: '' };
}

// ── MODAL ADIM YÖNETİMİ ──
var pdfModal            = document.getElementById('pdfModal');
var openPdfUploadBtn     = document.getElementById('openPdfUploadBtn');
var closePdfModalBtn     = document.getElementById('closePdfModal');
var pdfFileInput         = document.getElementById('pdfFileInput');
var pdfSelectFileBtn     = document.getElementById('pdfSelectFileBtn');
var pdfRetryBtn          = document.getElementById('pdfRetryBtn');
var pdfConfirmBtn        = document.getElementById('pdfConfirmBtn');
var pdfPreviewListEl     = document.getElementById('pdfPreviewList');

var pdfParsedProgram = null;

function showPdfStep(step) {
  ['pdfStepIntro', 'pdfStepProcessing', 'pdfStepError', 'pdfStepPreview'].forEach(function(id) {
    document.getElementById(id).classList.toggle('hidden', id !== step);
  });
  pdfConfirmBtn.classList.toggle('hidden', step !== 'pdfStepPreview');
}

openPdfUploadBtn.addEventListener('click', function() {
  if (!getGeminiKey()) {
    alert('Önce "Kişisel Bilgiler" sayfasından Gemini API anahtarını kaydetmelisin.');
    showPage('profile');
    closeMenu();
    return;
  }
  showPdfStep('pdfStepIntro');
  pdfModal.classList.remove('hidden');
});

closePdfModalBtn.addEventListener('click', function() {
  pdfModal.classList.add('hidden');
});

pdfModal.addEventListener('click', function(e) {
  if (e.target === pdfModal) pdfModal.classList.add('hidden');
});

pdfSelectFileBtn.addEventListener('click', function() { pdfFileInput.click(); });
pdfRetryBtn.addEventListener('click', function() { pdfFileInput.click(); });

pdfFileInput.addEventListener('change', function() {
  var file = pdfFileInput.files[0];
  pdfFileInput.value = ''; // aynı dosyayı tekrar seçebilmek için sıfırla
  if (!file) return;
  processPdfFile(file);
});

function processPdfFile(file) {
  showPdfStep('pdfStepProcessing');
  document.getElementById('pdfProcessingText').textContent = 'PDF okunuyor…';

  extractPdfText(file).then(function(text) {
    if (!text || text.trim().length < 20) {
      throw new Error('PDF içinden metin okunamadı. Taranmış (fotoğraf) bir PDF olabilir.');
    }
    document.getElementById('pdfProcessingText').textContent = 'AI programı analiz ediyor…';
    var prompt = buildGeminiPrompt(text);
    return callGeminiAPI(prompt, getGeminiKey());
  }).then(function(rawResponse) {
    var parsed = parseAIJson(rawResponse);
    pdfParsedProgram = parsed;
    renderPdfPreview();
    showPdfStep('pdfStepPreview');
  }).catch(function(err) {
    console.warn('[PDF+AI] Hata:', err);
    var rawMsg = (err && err.message) ? err.message : 'Bilinmeyen bir hata oluştu.';
    var friendlyMsg = rawMsg;

    if (/invalid authentication credentials|OAuth 2 access token/i.test(rawMsg)) {
      friendlyMsg = 'Google\'ın "AQ." formatlı yeni API anahtarlarında şu an bilinen bir sunucu sorunu var ' +
                    '(Google tarafında, bizim uygulamamızdan kaynaklanmıyor). Farklı bir Google hesabıyla ' +
                    'yeni bir anahtar oluşturup Kişisel Bilgiler sayfasından güncellemeyi dene.';
    }

    document.getElementById('pdfErrorText').textContent = '⚠️ ' + friendlyMsg;
    showPdfStep('pdfStepError');
  });
}

function renderPdfPreview() {
  var days = Object.keys(pdfParsedProgram || {});

  if (days.length === 0) {
    pdfPreviewListEl.innerHTML = '<p class="empty-hint">Program bulunamadı.</p>';
    pdfConfirmBtn.classList.add('hidden');
    return;
  }

  var html = '';
  days.forEach(function(day) {
    html += '<div class="pdf-preview-day"><p class="pdf-preview-day-title">' + day + '</p>';
    pdfParsedProgram[day].forEach(function(item, idx) {
      html +=
        '<div class="pdf-preview-exercise">' +
          '<span class="pdf-preview-exercise-name">' + item.hareket + '</span>' +
          '<span class="pdf-preview-exercise-meta">' + (item.set || 3) + '×' + (item.tekrar || 10) + '</span>' +
          '<button class="pdf-preview-remove" data-day="' + day + '" data-idx="' + idx + '">✕</button>' +
        '</div>';
    });
    html += '</div>';
  });

  pdfPreviewListEl.innerHTML = html;
  pdfConfirmBtn.classList.remove('hidden');
}

pdfPreviewListEl.addEventListener('click', function(e) {
  var btn = e.target.closest('.pdf-preview-remove');
  if (!btn) return;
  var day = btn.dataset.day;
  var idx = parseInt(btn.dataset.idx, 10);
  pdfParsedProgram[day].splice(idx, 1);
  if (pdfParsedProgram[day].length === 0) delete pdfParsedProgram[day];
  renderPdfPreview();
});

function mergePdfProgramIntoStorage(program) {
  var daysMap = getWorkoutDaysMap();

  Object.keys(program).forEach(function(weekday) {
    if (DAYS_ORDER.indexOf(weekday) === -1) return; // güvenlik: sadece geçerli hafta günleri
    if (!daysMap[weekday]) daysMap[weekday] = { title: '', exercises: [] };

    program[weekday].forEach(function(item) {
      var meta = findExerciseMeta(item.hareket);
      var sets = parseInt(item.set, 10) || 3;

      daysMap[weekday].exercises.push({
        id: 'ex_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        name: item.hareket,
        muscle: meta.muscle,
        equipment: meta.equipment,
        level: meta.level,
        sets: sets,
        reps: parseInt(item.tekrar, 10) || 10,
        checked: new Array(sets).fill(false)
      });
    });
  });

  saveWorkoutDaysMap(daysMap);
}

pdfConfirmBtn.addEventListener('click', function() {
  if (!pdfParsedProgram) return;
  mergePdfProgramIntoStorage(pdfParsedProgram);
  pdfModal.classList.add('hidden');
  pdfParsedProgram = null;
  renderWorkoutTracking();
});
