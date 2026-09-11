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
  'abductors':  'Bacak Dış'
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
  'abductors':  'back'
};

var LEVEL_TR = { 'beginner': 'Başlangıç', 'intermediate': 'Orta', 'expert': 'İleri' };

// free-exercise-db'den derlenen gerçek hareketler (isim / ekipman / seviye / birincil kas)
var EXERCISES = {
  'Evde': [
    { name: '3/4 Sit-Up',                   equipment: 'body only', level: 'beginner',     muscle: 'abdominals' },
    { name: 'Air Bike',                     equipment: 'body only', level: 'beginner',     muscle: 'abdominals' },
    { name: 'Alternate Heel Touchers',      equipment: 'body only', level: 'beginner',     muscle: 'abdominals' },
    { name: 'Bent-Knee Hip Raise',          equipment: 'body only', level: 'intermediate', muscle: 'abdominals' },
    { name: 'Bottoms Up',                   equipment: 'body only', level: 'intermediate', muscle: 'abdominals' },
    { name: 'Bench Dips',                   equipment: 'body only', level: 'intermediate', muscle: 'triceps' },
    { name: 'Body-Up',                      equipment: 'body only', level: 'intermediate', muscle: 'triceps' },
    { name: 'Body Tricep Press',            equipment: 'body only', level: 'intermediate', muscle: 'triceps' },
    { name: 'Band Skull Crusher',           equipment: 'bands',     level: 'beginner',     muscle: 'triceps' },
    { name: 'Bodyweight Squat',             equipment: 'body only', level: 'beginner',     muscle: 'quadriceps' },
    { name: 'Bodyweight Walking Lunge',     equipment: 'body only', level: 'beginner',     muscle: 'quadriceps' },
    { name: 'Bench Jump',                   equipment: 'body only', level: 'intermediate', muscle: 'quadriceps' },
    { name: 'Band Assisted Pull-Up',        equipment: 'bands',     level: 'intermediate', muscle: 'lats' },
    { name: 'Back Flyes - With Bands',      equipment: 'bands',     level: 'beginner',     muscle: 'shoulders' },
    { name: 'Band Pull Apart',              equipment: 'bands',     level: 'beginner',     muscle: 'shoulders' },
    { name: 'Backward Medicine Ball Throw', equipment: 'medicine ball', level: 'intermediate', muscle: 'shoulders' },
    { name: 'Bench Press - With Bands',     equipment: 'bands',     level: 'intermediate', muscle: 'chest' },
    { name: 'Band Good Morning',            equipment: 'bands',     level: 'beginner',     muscle: 'hamstrings' },
    { name: 'Ball Leg Curl',                equipment: 'exercise ball', level: 'intermediate', muscle: 'hamstrings' },
    { name: 'Band Hip Adductions',          equipment: 'bands',     level: 'beginner',     muscle: 'adductors' }
  ],
  'Spor Salonunda': [
    { name: 'Barbell Bench Press - Medium Grip',         equipment: 'barbell',     level: 'intermediate', muscle: 'chest' },
    { name: 'Barbell Incline Bench Press - Medium Grip', equipment: 'barbell',     level: 'intermediate', muscle: 'chest' },
    { name: 'Around The Worlds',                         equipment: 'dumbbell',    level: 'intermediate', muscle: 'chest' },
    { name: 'Bent-Arm Dumbbell Pullover',                equipment: 'dumbbell',    level: 'intermediate', muscle: 'chest' },
    { name: 'Barbell Curl',                              equipment: 'barbell',     level: 'beginner',     muscle: 'biceps' },
    { name: 'Alternate Hammer Curl',                     equipment: 'dumbbell',    level: 'beginner',     muscle: 'biceps' },
    { name: 'Alternate Incline Dumbbell Curl',           equipment: 'dumbbell',    level: 'intermediate', muscle: 'biceps' },
    { name: 'Barbell Deadlift',                          equipment: 'barbell',     level: 'intermediate', muscle: 'lower back' },
    { name: 'Barbell Full Squat',                        equipment: 'barbell',     level: 'intermediate', muscle: 'quadriceps' },
    { name: 'Barbell Squat',                             equipment: 'barbell',     level: 'intermediate', muscle: 'quadriceps' },
    { name: 'Barbell Lunge',                             equipment: 'barbell',     level: 'intermediate', muscle: 'quadriceps' },
    { name: 'Barbell Step Ups',                          equipment: 'barbell',     level: 'intermediate', muscle: 'quadriceps' },
    { name: 'Barbell Walking Lunge',                     equipment: 'barbell',     level: 'intermediate', muscle: 'quadriceps' },
    { name: 'Barbell Glute Bridge',                      equipment: 'barbell',     level: 'intermediate', muscle: 'glutes' },
    { name: 'Barbell Hip Thrust',                        equipment: 'barbell',     level: 'intermediate', muscle: 'glutes' },
    { name: 'Barbell Rear Delt Row',                     equipment: 'barbell',     level: 'intermediate', muscle: 'shoulders' },
    { name: 'Barbell Shoulder Press',                    equipment: 'barbell',     level: 'intermediate', muscle: 'shoulders' },
    { name: 'Alternating Deltoid Raise',                 equipment: 'dumbbell',    level: 'beginner',     muscle: 'shoulders' },
    { name: 'Arnold Dumbbell Press',                     equipment: 'dumbbell',    level: 'intermediate', muscle: 'shoulders' },
    { name: 'Bent Over Dumbbell Rear Delt Raise With Head On Bench', equipment: 'dumbbell', level: 'intermediate', muscle: 'shoulders' },
    { name: 'Alternating Cable Shoulder Press',          equipment: 'cable',       level: 'intermediate', muscle: 'shoulders' },
    { name: 'Bent Over Low-Pulley Side Lateral',         equipment: 'cable',       level: 'intermediate', muscle: 'shoulders' },
    { name: 'Alternating Kettlebell Press',              equipment: 'kettlebells', level: 'intermediate', muscle: 'shoulders' },
    { name: 'Barbell Shrug',                             equipment: 'barbell',     level: 'beginner',     muscle: 'traps' },
    { name: 'Bent Over Barbell Row',                     equipment: 'barbell',     level: 'intermediate', muscle: 'middle back' },
    { name: 'Bent Over Two-Dumbbell Row',                equipment: 'dumbbell',    level: 'intermediate', muscle: 'middle back' },
    { name: 'Alternating Kettlebell Row',                equipment: 'kettlebells', level: 'intermediate', muscle: 'middle back' },
    { name: 'Bent-Arm Barbell Pullover',                 equipment: 'barbell',     level: 'intermediate', muscle: 'lats' },
    { name: 'Barbell Seated Calf Raise',                 equipment: 'barbell',     level: 'beginner',     muscle: 'calves' },
    { name: 'Ab Crunch Machine',                         equipment: 'machine',     level: 'beginner',     muscle: 'abdominals' },
    { name: 'Bosu Ball Cable Crunch With Side Bends',    equipment: 'cable',       level: 'intermediate', muscle: 'abdominals' },
    { name: 'Advanced Kettlebell Windmill',              equipment: 'kettlebells', level: 'expert',       muscle: 'abdominals' },
    { name: 'Bottoms-Up Clean From The Hang Position',   equipment: 'kettlebells', level: 'expert',       muscle: 'forearms' }
  ]
};

var DAYS_ORDER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

/* ══════════════════════════════════════════
   DİNAMİK ANATOMİ SVG HARİTASI (Ön + Arka)
   Kas grupları data-muscle özniteliğiyle etiketlenir,
   JS tarafından ilgili gruba göre renklendirilir.
   ══════════════════════════════════════════ */

var FRONT_ANATOMY_SVG =
  '<svg viewBox="0 0 240 500" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse cx="120" cy="34" rx="24" ry="28" class="body-outline"></ellipse>' +
    '<rect x="108" y="58" width="24" height="16" rx="4" class="muscle-region" data-muscle="neck"></rect>' +
    '<path d="M70,74 Q120,64 170,74 L178,232 Q120,248 62,232 Z" class="body-outline"></path>' +
    '<ellipse cx="60" cy="92" rx="19" ry="23" class="muscle-region" data-muscle="shoulders"></ellipse>' +
    '<ellipse cx="180" cy="92" rx="19" ry="23" class="muscle-region" data-muscle="shoulders"></ellipse>' +
    '<path d="M76,80 Q100,72 119,83 L119,140 Q98,150 77,138 Z" class="muscle-region" data-muscle="chest"></path>' +
    '<path d="M164,80 Q140,72 121,83 L121,140 Q142,150 163,138 Z" class="muscle-region" data-muscle="chest"></path>' +
    '<path d="M94,143 L146,143 L151,224 Q120,238 89,224 Z" class="muscle-region" data-muscle="abdominals"></path>' +
    '<path d="M46,96 L64,96 L59,176 L39,176 Z" class="body-outline"></path>' +
    '<ellipse cx="51" cy="130" rx="13" ry="28" class="muscle-region" data-muscle="biceps"></ellipse>' +
    '<path d="M194,96 L176,96 L181,176 L201,176 Z" class="body-outline"></path>' +
    '<ellipse cx="189" cy="130" rx="13" ry="28" class="muscle-region" data-muscle="biceps"></ellipse>' +
    '<path d="M39,176 L59,176 L54,242 L35,242 Z" class="body-outline"></path>' +
    '<ellipse cx="47" cy="207" rx="10" ry="27" class="muscle-region" data-muscle="forearms"></ellipse>' +
    '<path d="M201,176 L181,176 L186,242 L205,242 Z" class="body-outline"></path>' +
    '<ellipse cx="193" cy="207" rx="10" ry="27" class="muscle-region" data-muscle="forearms"></ellipse>' +
    '<ellipse cx="46" cy="250" rx="9" ry="11" class="body-outline"></ellipse>' +
    '<ellipse cx="194" cy="250" rx="9" ry="11" class="body-outline"></ellipse>' +
    '<path d="M89,224 L151,224 L161,260 L79,260 Z" class="body-outline"></path>' +
    '<path d="M108,260 L132,260 L127,302 L113,302 Z" class="muscle-region" data-muscle="adductors"></path>' +
    '<path d="M79,260 L118,260 L112,442 L68,442 Z" class="body-outline"></path>' +
    '<path d="M161,260 L122,260 L128,442 L172,442 Z" class="body-outline"></path>' +
    '<ellipse cx="94" cy="322" rx="19" ry="54" class="muscle-region" data-muscle="quadriceps"></ellipse>' +
    '<ellipse cx="146" cy="322" rx="19" ry="54" class="muscle-region" data-muscle="quadriceps"></ellipse>' +
    '<path d="M68,442 L112,442 L108,482 L72,482 Z" class="body-outline"></path>' +
    '<path d="M172,442 L128,442 L132,482 L168,482 Z" class="body-outline"></path>' +
    '<ellipse cx="90" cy="490" rx="20" ry="8" class="body-outline"></ellipse>' +
    '<ellipse cx="150" cy="490" rx="20" ry="8" class="body-outline"></ellipse>' +
  '</svg>';

var BACK_ANATOMY_SVG =
  '<svg viewBox="0 0 240 500" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse cx="120" cy="34" rx="24" ry="28" class="body-outline"></ellipse>' +
    '<rect x="108" y="58" width="24" height="14" rx="4" class="body-outline"></rect>' +
    '<path d="M70,74 Q120,64 170,74 L178,232 Q120,248 62,232 Z" class="body-outline"></path>' +
    '<path d="M85,64 L155,64 L178,112 L120,150 L62,112 Z" class="muscle-region" data-muscle="traps"></path>' +
    '<path d="M62,112 L96,122 L91,192 L54,176 Z" class="muscle-region" data-muscle="lats"></path>' +
    '<path d="M178,112 L144,122 L149,192 L186,176 Z" class="muscle-region" data-muscle="lats"></path>' +
    '<path d="M96,122 L144,122 L139,180 L101,180 Z" class="muscle-region" data-muscle="middle back"></path>' +
    '<path d="M104,180 L136,180 L139,228 L101,228 Z" class="muscle-region" data-muscle="lower back"></path>' +
    '<path d="M46,96 L64,96 L59,176 L39,176 Z" class="body-outline"></path>' +
    '<ellipse cx="52" cy="130" rx="13" ry="28" class="muscle-region" data-muscle="triceps"></ellipse>' +
    '<path d="M194,96 L176,96 L181,176 L201,176 Z" class="body-outline"></path>' +
    '<ellipse cx="188" cy="130" rx="13" ry="28" class="muscle-region" data-muscle="triceps"></ellipse>' +
    '<path d="M39,176 L59,176 L54,242 L35,242 Z" class="body-outline"></path>' +
    '<path d="M201,176 L181,176 L186,242 L205,242 Z" class="body-outline"></path>' +
    '<ellipse cx="46" cy="250" rx="9" ry="11" class="body-outline"></ellipse>' +
    '<ellipse cx="194" cy="250" rx="9" ry="11" class="body-outline"></ellipse>' +
    '<path d="M89,224 L151,224 L161,260 L79,260 Z" class="body-outline"></path>' +
    '<ellipse cx="95" cy="256" rx="23" ry="27" class="muscle-region" data-muscle="glutes"></ellipse>' +
    '<ellipse cx="145" cy="256" rx="23" ry="27" class="muscle-region" data-muscle="glutes"></ellipse>' +
    '<ellipse cx="70" cy="272" rx="9" ry="19" class="muscle-region" data-muscle="abductors"></ellipse>' +
    '<ellipse cx="170" cy="272" rx="9" ry="19" class="muscle-region" data-muscle="abductors"></ellipse>' +
    '<path d="M79,260 L118,260 L112,442 L68,442 Z" class="body-outline"></path>' +
    '<path d="M161,260 L122,260 L128,442 L172,442 Z" class="body-outline"></path>' +
    '<ellipse cx="94" cy="330" rx="18" ry="48" class="muscle-region" data-muscle="hamstrings"></ellipse>' +
    '<ellipse cx="146" cy="330" rx="18" ry="48" class="muscle-region" data-muscle="hamstrings"></ellipse>' +
    '<path d="M68,442 L112,442 L108,482 L72,482 Z" class="body-outline"></path>' +
    '<path d="M172,442 L128,442 L132,482 L168,482 Z" class="body-outline"></path>' +
    '<ellipse cx="92" cy="415" rx="13" ry="33" class="muscle-region" data-muscle="calves"></ellipse>' +
    '<ellipse cx="148" cy="415" rx="13" ry="33" class="muscle-region" data-muscle="calves"></ellipse>' +
    '<ellipse cx="90" cy="490" rx="20" ry="8" class="body-outline"></ellipse>' +
    '<ellipse cx="150" cy="490" rx="20" ry="8" class="body-outline"></ellipse>' +
  '</svg>';

function getAnatomySVG(view) {
  return view === 'back' ? BACK_ANATOMY_SVG : FRONT_ANATOMY_SVG;
}

// Belirtilen kas grubunu SVG üzerinde highlight eder, diğerlerini nötrler
function highlightMuscleInSvg(svgWrapEl, muscle) {
  if (!svgWrapEl) return;
  var regions = svgWrapEl.querySelectorAll('.muscle-region');
  regions.forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-muscle') === muscle);
  });
}

// Ön/Arka anatomi panelinin HTML'ini üretir (sepette ve takip kartlarında ortak kullanılır)
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
      '<div class="anatomy-svg-wrap">' + getAnatomySVG(defaultView) + '</div>' +
    '</div>'
  );
}

// Bir konteynerin içindeki tüm .anatomy-panel'leri ilk render'da highlight eder
function initAnatomyPanels(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('.anatomy-panel').forEach(function(panel) {
    var muscle = panel.getAttribute('data-muscle');
    var svgWrap = panel.querySelector('.anatomy-svg-wrap');
    highlightMuscleInSvg(svgWrap, muscle);
  });
}

// Anatomi panelindeki Ön/Arka geçiş butonlarını dinler (event delegation ile dışarıdan çağrılır)
function handleAnatomyViewToggle(target) {
  var btn = target.closest('.anatomy-view-btn');
  if (!btn) return false;

  var panel = btn.closest('.anatomy-panel');
  if (!panel) return false;

  var newView = btn.getAttribute('data-view-btn');
  var muscle = panel.getAttribute('data-muscle');
  panel.setAttribute('data-current-view', newView);

  panel.querySelectorAll('.anatomy-view-btn').forEach(function(b) {
    b.classList.toggle('active', b === btn);
  });

  var svgWrap = panel.querySelector('.anatomy-svg-wrap');
  svgWrap.innerHTML = getAnatomySVG(newView);
  highlightMuscleInSvg(svgWrap, muscle);

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

function fillExerciseSelect(location) {
  var list = EXERCISES[location] || [];
  builderExerciseSelect.innerHTML = list.map(function(ex) {
    return '<option value="' + ex.name + '">' + ex.name + '</option>';
  }).join('');
}

builderLocationSelect.addEventListener('change', function() {
  fillExerciseSelect(builderLocationSelect.value);
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
  var html = '';

  DAYS_ORDER.forEach(function(weekday) {
    var day = daysMap[weekday];
    var hasExercises = day && day.exercises && day.exercises.length > 0;
    var activeClass = weekday === activeWeekday ? ' active' : '';
    var hasTitle = day && day.title;
    var titleHtml = hasTitle ? day.title : '—';
    var titleClass = hasTitle ? '' : ' muted';
    var badge = hasExercises ? '<span class="day-tab-badge">' + day.exercises.length + '</span>' : '';

    html +=
      '<button class="day-tab' + activeClass + '" data-weekday="' + weekday + '">' +
        '<span class="day-tab-number">' + weekday + '</span>' +
        '<span class="day-tab-title' + titleClass + '">' + titleHtml + '</span>' +
        badge +
      '</button>';
  });

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
  var extraMetaParts = [ex.equipment, levelLabel].filter(Boolean);
  var extraMeta = extraMetaParts.length ? ' · ' + extraMetaParts.join(' · ') : '';

  return (
    '<div class="exercise-card' + (allChecked ? ' completed' : '') + '" data-weekday="' + weekday + '" data-id="' + ex.id + '">' +
      '<button class="exercise-card-remove" data-weekday="' + weekday + '" data-id="' + ex.id + '" title="Kaldır">✕</button>' +
      '<div class="exercise-card-title-row">' +
        '<button class="exercise-card-name">' + ex.name + '</button>' +
        '<button class="exercise-card-play" data-youtube="' + youtubeUrl + '" title="Video izle"><span>▶</span></button>' +
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

  var playBtn = e.target.closest('.exercise-card-play');
  if (playBtn) {
    window.open(playBtn.dataset.youtube, '_blank', 'noopener');
    return;
  }

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
fillExerciseSelect(builderLocationSelect.value);
builderDaySelect.value = activeWeekday;

overallProgressCard.classList.remove('hidden');
dayTabsContainer.classList.remove('hidden');
dayProgressRow.classList.remove('hidden');
clearDayBtn.classList.remove('hidden');
exerciseSectionDivider.classList.remove('hidden');
exerciseCardsListEl.classList.remove('hidden');

renderCartList();
renderWorkoutTracking();
