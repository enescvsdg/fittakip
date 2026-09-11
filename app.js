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
  if (dropdownMenu.classList.contains('open')) {
    closeMenu();
  } else {
    openMenu();
  }
});

overlay.addEventListener('click', closeMenu);

document.addEventListener('click', function(e) {
  if (!dropdownMenu.contains(e.target) && e.target !== menuToggle) {
    closeMenu();
  }
});

navItems.forEach(function(btn) {
  btn.addEventListener('click', function() {
    showPage(btn.dataset.page);
    closeMenu();
  });
});

bottomItems.forEach(function(btn) {
  btn.addEventListener('click', function() {
    showPage(btn.dataset.page);
  });
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
  workoutDays: 'ft_workout_days'
};

// ── JSON STORAGE HELPERS (veri kaybını önlemek için) ──
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] JSON yazılamadı:', key, e);
  }
}

function getWeighIns() {
  return getJSON(KEYS.weighins, []);
}
function saveWeighIns(list) {
  setJSON(KEYS.weighins, list);
}

function getWorkoutDays() {
  return getJSON(KEYS.workoutDays, []);
}
function saveWorkoutDays(days) {
  setJSON(KEYS.workoutDays, days);
}

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
  el._timer = setTimeout(function() {
    el.classList.add('hidden');
  }, 2200);
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

  var list = getWeighIns().slice().sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });

  if (list.length === 0) {
    container.innerHTML = '<p class="empty-hint">Henüz tartım eklenmedi.</p>';
    return;
  }

  var html = '<p class="list-heading">Son Tartımlar</p>';
  list.slice(0, 6).forEach(function(item) {
    html += '<div class="weighin-item">' +
              '<span>' + formatDateTR(item.date) + '</span>' +
              '<span class="weighin-item-weight">' + item.weight + ' kg</span>' +
            '</div>';
  });
  container.innerHTML = html;
}

var weightChartInstance = null;

function updateChart() {
  var canvas   = document.getElementById('weightChart');
  var emptyMsg = document.getElementById('chart-empty');
  if (!canvas || !emptyMsg) return;

  var weighins = getWeighIns().slice().sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });

  if (weighins.length === 0) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
    if (weightChartInstance) {
      weightChartInstance.destroy();
      weightChartInstance = null;
    }
    return;
  }

  canvas.classList.remove('hidden');
  emptyMsg.classList.add('hidden');

  var labels  = weighins.map(function(w) { return formatDateTR(w.date); });
  var weights = weighins.map(function(w) { return w.weight; });
  var goalWeight = parseFloat(localStorage.getItem(KEYS.goalWeight));

  var datasets = [
    {
      label: 'Kilo (kg)',
      data: weights,
      borderColor: '#ff5c2b',
      backgroundColor: 'rgba(255, 92, 43, 0.15)',
      borderWidth: 2.5,
      pointBackgroundColor: '#ff5c2b',
      pointBorderColor: '#1e1e1e',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: true
    }
  ];

  if (goalWeight && !isNaN(goalWeight)) {
    datasets.push({
      label: 'Hedef Kilo (kg)',
      data: labels.map(function() { return goalWeight; }),
      borderColor: '#4caf50',
      borderDash: [6, 6],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false
    });
  }

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  if (typeof Chart === 'undefined') {
    console.warn('[Chart.js] Kütüphane yüklenemedi (çevrimdışı olabilir).');
    return;
  }

  weightChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { labels: { color: '#f0f0f0', font: { size: 11 }, boxWidth: 12 } }
      },
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
  var weighins   = getWeighIns().slice().sort(function(a, b) {
    return new Date(a.date) - new Date(b.date);
  });

  if (!goalType || !goalWeight || isNaN(goalWeight) || weighins.length === 0) {
    statusEl.className = 'status-message status-neutral';
    statusEl.textContent = 'Hedef ve tartım verisi ekleyerek analizi başlat.';
    return;
  }

  var latestWeight = weighins[weighins.length - 1].weight;
  var reached = false;

  if (goalType === 'Kilo Vermek') {
    reached = latestWeight <= goalWeight;
  } else if (goalType === 'Kilo Almak') {
    reached = latestWeight >= goalWeight;
  } else {
    reached = Math.abs(latestWeight - goalWeight) <= 0.5;
  }

  if (reached) {
    statusEl.className = 'status-message status-success';
    statusEl.textContent = '🎉 Tebrikler! Hedefine Ulaştın, böyle devam et.';
  } else {
    statusEl.className = 'status-message status-warning';
    statusEl.textContent = '💪 Hedefine ulaşmak için daha sıkı çalışmalısın.';
  }
}

function calcBMI(heightCm, weightKg) {
  var hM = heightCm / 100;
  return weightKg / (hM * hM);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Zayıf',        color: '#5bc0eb' };
  if (bmi < 25)   return { label: 'Normal',        color: '#4caf50' };
  if (bmi < 30)   return { label: 'Fazla Kilolu',  color: '#ffc107' };
  return             { label: 'Obez',             color: '#f44336' };
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
   ANTRENMAN PLANIM
   free-exercise-db (yuhonas/free-exercise-db, Unlicense)
   veri setinden derlenmiş gerçek hareketler
   ══════════════════════════════════════════ */

// Kas grubu İngilizce → Türkçe çeviri tablosu
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

// free-exercise-db'den (isim / ekipman / birincil kas) derlenen gerçek hareketler
var EXERCISES = {
  'Evde': [
    { name: '3/4 Sit-Up',                    muscle: 'abdominals' },
    { name: 'Air Bike',                      muscle: 'abdominals' },
    { name: 'Alternate Heel Touchers',       muscle: 'abdominals' },
    { name: 'Bent-Knee Hip Raise',           muscle: 'abdominals' },
    { name: 'Bottoms Up',                    muscle: 'abdominals' },
    { name: 'Bench Dips',                    muscle: 'triceps' },
    { name: 'Body-Up',                       muscle: 'triceps' },
    { name: 'Body Tricep Press',             muscle: 'triceps' },
    { name: 'Band Skull Crusher',            muscle: 'triceps' },
    { name: 'Bodyweight Squat',              muscle: 'quadriceps' },
    { name: 'Bodyweight Walking Lunge',      muscle: 'quadriceps' },
    { name: 'Bench Jump',                    muscle: 'quadriceps' },
    { name: 'Band Assisted Pull-Up',         muscle: 'lats' },
    { name: 'Back Flyes - With Bands',       muscle: 'shoulders' },
    { name: 'Band Pull Apart',               muscle: 'shoulders' },
    { name: 'Backward Medicine Ball Throw',  muscle: 'shoulders' },
    { name: 'Bench Press - With Bands',      muscle: 'chest' },
    { name: 'Band Good Morning',             muscle: 'hamstrings' },
    { name: 'Ball Leg Curl',                 muscle: 'hamstrings' },
    { name: 'Band Hip Adductions',           muscle: 'adductors' }
  ],
  'Spor Salonunda': [
    { name: 'Barbell Bench Press - Medium Grip',                muscle: 'chest' },
    { name: 'Barbell Incline Bench Press - Medium Grip',        muscle: 'chest' },
    { name: 'Around The Worlds',                                muscle: 'chest' },
    { name: 'Bent-Arm Dumbbell Pullover',                       muscle: 'chest' },
    { name: 'Barbell Curl',                                     muscle: 'biceps' },
    { name: 'Alternate Hammer Curl',                            muscle: 'biceps' },
    { name: 'Alternate Incline Dumbbell Curl',                  muscle: 'biceps' },
    { name: 'Barbell Deadlift',                                 muscle: 'lower back' },
    { name: 'Barbell Full Squat',                                muscle: 'quadriceps' },
    { name: 'Barbell Squat',                                    muscle: 'quadriceps' },
    { name: 'Barbell Lunge',                                    muscle: 'quadriceps' },
    { name: 'Barbell Step Ups',                                 muscle: 'quadriceps' },
    { name: 'Barbell Walking Lunge',                            muscle: 'quadriceps' },
    { name: 'Barbell Glute Bridge',                             muscle: 'glutes' },
    { name: 'Barbell Hip Thrust',                                muscle: 'glutes' },
    { name: 'Barbell Rear Delt Row',                            muscle: 'shoulders' },
    { name: 'Barbell Shoulder Press',                           muscle: 'shoulders' },
    { name: 'Alternating Deltoid Raise',                        muscle: 'shoulders' },
    { name: 'Arnold Dumbbell Press',                            muscle: 'shoulders' },
    { name: 'Bent Over Dumbbell Rear Delt Raise With Head On Bench', muscle: 'shoulders' },
    { name: 'Alternating Cable Shoulder Press',                 muscle: 'shoulders' },
    { name: 'Bent Over Low-Pulley Side Lateral',                muscle: 'shoulders' },
    { name: 'Alternating Kettlebell Press',                     muscle: 'shoulders' },
    { name: 'Barbell Shrug',                                    muscle: 'traps' },
    { name: 'Bent Over Barbell Row',                            muscle: 'middle back' },
    { name: 'Bent Over Two-Dumbbell Row',                       muscle: 'middle back' },
    { name: 'Alternating Kettlebell Row',                       muscle: 'middle back' },
    { name: 'Bent-Arm Barbell Pullover',                        muscle: 'lats' },
    { name: 'Barbell Seated Calf Raise',                        muscle: 'calves' },
    { name: 'Ab Crunch Machine',                                muscle: 'abdominals' },
    { name: 'Bosu Ball Cable Crunch With Side Bends',           muscle: 'abdominals' },
    { name: 'Advanced Kettlebell Windmill',                     muscle: 'abdominals' },
    { name: 'Bottoms-Up Clean From The Hang Position',          muscle: 'forearms' }
  ]
};

// ── DOM REFERANSLARI ──────────────────────────
var workoutModalOverlay  = document.getElementById('workoutModalOverlay');
var openWorkoutModalBtn  = document.getElementById('openWorkoutModal');
var closeWorkoutModalBtn = document.getElementById('closeWorkoutModal');
var modalDaySelect       = document.getElementById('modal-day');
var modalNewDayGroup     = document.getElementById('modal-newday-group');
var modalNewDayTitle     = document.getElementById('modal-newday-title');
var modalLocationSelect  = document.getElementById('modal-location');
var modalExerciseSelect  = document.getElementById('modal-exercise');
var modalSetsSelect      = document.getElementById('modal-sets');
var modalRepsSelect      = document.getElementById('modal-reps');
var completeWorkoutBtn   = document.getElementById('completeWorkoutBtn');
var deleteDayBtn         = document.getElementById('deleteDayBtn');
var dayTabsContainer     = document.getElementById('dayTabsContainer');
var exerciseCardsListEl  = document.getElementById('exerciseCardsList');

var activeDayIndex = 0;

// ── SELECT DOLDURMA YARDIMCILARI ──────────────
function fillNumberRange(selectEl, min, max) {
  var html = '';
  for (var i = min; i <= max; i++) {
    html += '<option value="' + i + '">' + i + '</option>';
  }
  selectEl.innerHTML = html;
}

function fillExerciseSelect(location) {
  var list = EXERCISES[location] || [];
  modalExerciseSelect.innerHTML = list.map(function(ex) {
    return '<option value="' + ex.name + '">' + ex.name + '</option>';
  }).join('');
}

function populateModalDaySelect() {
  var days = getWorkoutDays();
  var html = '';
  days.forEach(function(day, idx) {
    html += '<option value="' + day.id + '">Gün ' + (idx + 1) + ' - ' + day.title + '</option>';
  });
  html += '<option value="__new__">+ Yeni Gün Oluştur</option>';
  modalDaySelect.innerHTML = html;

  if (days.length === 0) {
    modalDaySelect.value = '__new__';
  }
  toggleNewDayInput();
}

function toggleNewDayInput() {
  var isNew = modalDaySelect.value === '__new__';
  modalNewDayGroup.classList.toggle('hidden', !isNew);
}

// ── MODAL ÖNİZLEME ─────────────────────────────
function updateModalPreview() {
  var dayLabel;
  if (modalDaySelect.value === '__new__') {
    dayLabel = modalNewDayTitle.value.trim() || 'Yeni Gün';
  } else {
    var selectedOption = modalDaySelect.options[modalDaySelect.selectedIndex];
    dayLabel = selectedOption ? selectedOption.textContent : '';
  }

  var location = modalLocationSelect.value;
  var exercise = modalExerciseSelect.value;
  var sets     = modalSetsSelect.value;
  var reps     = modalRepsSelect.value;

  document.getElementById('modal-preview').innerHTML =
    '<p class="preview-day">' + dayLabel + ' · ' + location + '</p>' +
    '<p class="preview-exercise">' + exercise + '</p>' +
    '<p class="preview-sets">' + sets + ' Set × ' + reps + ' Tekrar</p>';
}

// ── MODAL AÇ / KAPAT ───────────────────────────
function openWorkoutModal() {
  populateModalDaySelect();
  workoutModalOverlay.classList.remove('hidden');
  updateModalPreview();
}

function closeWorkoutModal() {
  workoutModalOverlay.classList.add('hidden');
  modalNewDayTitle.value = '';
}

openWorkoutModalBtn.addEventListener('click', openWorkoutModal);
closeWorkoutModalBtn.addEventListener('click', closeWorkoutModal);

workoutModalOverlay.addEventListener('click', function(e) {
  if (e.target === workoutModalOverlay) {
    closeWorkoutModal();
  }
});

modalDaySelect.addEventListener('change', function() {
  toggleNewDayInput();
  updateModalPreview();
});

modalNewDayTitle.addEventListener('input', updateModalPreview);

modalLocationSelect.addEventListener('change', function() {
  fillExerciseSelect(modalLocationSelect.value);
  updateModalPreview();
});

modalExerciseSelect.addEventListener('change', updateModalPreview);
modalSetsSelect.addEventListener('change', updateModalPreview);
modalRepsSelect.addEventListener('change', updateModalPreview);

// ── ANTRENMANI TAMAMLA (Kaydet) ────────────────
completeWorkoutBtn.addEventListener('click', function() {
  var location      = modalLocationSelect.value;
  var exerciseName  = modalExerciseSelect.value;
  var sets          = parseInt(modalSetsSelect.value, 10);
  var reps          = parseInt(modalRepsSelect.value, 10);

  var muscle = 'abdominals';
  var list = EXERCISES[location] || [];
  var found = list.find(function(ex) { return ex.name === exerciseName; });
  if (found) muscle = found.muscle;

  var days = getWorkoutDays();
  var targetIndex;

  if (modalDaySelect.value === '__new__') {
    var newTitle = modalNewDayTitle.value.trim() || ('Antrenman Günü ' + (days.length + 1));
    days.push({ id: 'day_' + Date.now(), title: newTitle, exercises: [] });
    targetIndex = days.length - 1;
  } else {
    targetIndex = days.findIndex(function(d) { return d.id === modalDaySelect.value; });
    if (targetIndex === -1) targetIndex = 0;
  }

  days[targetIndex].exercises.push({
    id: 'ex_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: exerciseName,
    muscle: muscle,
    sets: sets,
    reps: reps,
    checked: new Array(sets).fill(false)
  });

  saveWorkoutDays(days);
  activeDayIndex = targetIndex;
  closeWorkoutModal();
  renderWorkoutPage();
});

// ── GÜN SİLME ──────────────────────────────────
deleteDayBtn.addEventListener('click', function() {
  var days = getWorkoutDays();
  var day = days[activeDayIndex];
  if (!day) return;

  var confirmed = window.confirm('"' + day.title + '" gününü ve içindeki tüm egzersizleri silmek istediğine emin misin?');
  if (!confirmed) return;

  days.splice(activeDayIndex, 1);
  saveWorkoutDays(days);
  activeDayIndex = 0;
  renderWorkoutPage();
});

// ── EGZERSİZ KARTI HTML OLUŞTUR ────────────────
function buildExerciseCardHTML(dayId, ex) {
  var muscleTR = MUSCLE_TR[ex.muscle] || ex.muscle;
  var allChecked = ex.checked.length > 0 && ex.checked.every(Boolean);

  var circlesHTML = '';
  for (var i = 0; i < ex.sets; i++) {
    var isChecked = !!ex.checked[i];
    var content = isChecked ? '✓' : (i + 1);
    circlesHTML +=
      '<label class="set-circle-label">' +
        '<input type="checkbox" class="set-checkbox-input" data-day="' + dayId + '" data-id="' + ex.id + '" data-index="' + i + '" ' + (isChecked ? 'checked' : '') + '>' +
        '<span class="set-circle-visual">' + content + '</span>' +
      '</label>';
  }

  var youtubeUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' nasıl yapılır');
  var anatomyImg = 'https://placehold.co/400x200/2c2c2c/ff3b30?text=' + encodeURIComponent('Anatomi: ' + muscleTR);

  return (
    '<div class="exercise-card' + (allChecked ? ' completed' : '') + '" data-day="' + dayId + '" data-id="' + ex.id + '">' +
      '<button class="exercise-card-remove" data-day="' + dayId + '" data-id="' + ex.id + '" title="Kaldır">✕</button>' +
      '<div class="exercise-card-title-row">' +
        '<button class="exercise-card-name">' + ex.name + '</button>' +
        '<button class="exercise-card-play" data-youtube="' + youtubeUrl + '" title="Video izle"><span>▶</span></button>' +
      '</div>' +
      '<p class="exercise-card-sets-reps">' + ex.sets + '×' + ex.reps + '</p>' +
      '<div class="exercise-card-circles">' + circlesHTML + '</div>' +
      '<div class="exercise-anatomy hidden">' +
        '<img src="' + anatomyImg + '" alt="' + muscleTR + ' kas grubu" loading="lazy" />' +
      '</div>' +
    '</div>'
  );
}

// ── RENDER: GÜN SEKMELERİ ──────────────────────
function renderDayTabs() {
  var days = getWorkoutDays();
  if (days.length === 0) {
    dayTabsContainer.innerHTML = '';
    return;
  }
  if (activeDayIndex >= days.length) activeDayIndex = days.length - 1;
  if (activeDayIndex < 0) activeDayIndex = 0;

  var html = '';
  days.forEach(function(day, idx) {
    var activeClass = idx === activeDayIndex ? ' active' : '';
    html +=
      '<button class="day-tab' + activeClass + '" data-index="' + idx + '">' +
        '<span class="day-tab-number">Gün ' + (idx + 1) + '</span>' +
        '<span class="day-tab-title">' + day.title + '</span>' +
      '</button>';
  });
  dayTabsContainer.innerHTML = html;
}

dayTabsContainer.addEventListener('click', function(e) {
  var tab = e.target.closest('.day-tab');
  if (!tab) return;
  activeDayIndex = parseInt(tab.dataset.index, 10);
  renderDayTabs();
  renderDayProgress();
  renderExerciseCards();
});

// ── RENDER: İLERLEME ÇUBUKLARI ─────────────────
function renderOverallProgress() {
  var days = getWorkoutDays();
  var totalSets = 0, doneSets = 0;

  days.forEach(function(day) {
    day.exercises.forEach(function(ex) {
      totalSets += ex.sets;
      doneSets += ex.checked.filter(Boolean).length;
    });
  });

  document.getElementById('overallProgressLabel').textContent =
    doneSets + ' / ' + totalSets + ' set — toplam program';

  var pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  document.getElementById('overallProgressFill').style.width = pct + '%';
}

function renderDayProgress() {
  var days = getWorkoutDays();
  var day = days[activeDayIndex];
  var totalSets = 0, doneSets = 0;

  if (day) {
    day.exercises.forEach(function(ex) {
      totalSets += ex.sets;
      doneSets += ex.checked.filter(Boolean).length;
    });
  }

  document.getElementById('dayProgressLabel').textContent = doneSets + ' / ' + totalSets + ' set';
  var pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  document.getElementById('dayProgressFill').style.width = pct + '%';
}

// ── RENDER: EGZERSİZ KARTLARI ──────────────────
function renderExerciseCards() {
  var days = getWorkoutDays();
  var day = days[activeDayIndex];

  if (!day || day.exercises.length === 0) {
    exerciseCardsListEl.innerHTML = '<p class="day-empty">Bu güne henüz egzersiz eklenmedi.</p>';
    return;
  }

  var html = '';
  day.exercises.forEach(function(ex) {
    html += buildExerciseCardHTML(day.id, ex);
  });
  exerciseCardsListEl.innerHTML = html;
}

// ── EGZERSİZ KARTI ETKİLEŞİMLERİ ───────────────
exerciseCardsListEl.addEventListener('click', function(e) {
  var playBtn = e.target.closest('.exercise-card-play');
  if (playBtn) {
    window.open(playBtn.dataset.youtube, '_blank', 'noopener');
    return;
  }

  var removeBtn = e.target.closest('.exercise-card-remove');
  if (removeBtn) {
    var dayId = removeBtn.dataset.day;
    var exId  = removeBtn.dataset.id;
    var days  = getWorkoutDays();
    var day   = days.find(function(d) { return d.id === dayId; });
    if (day) {
      day.exercises = day.exercises.filter(function(x) { return x.id !== exId; });
      saveWorkoutDays(days);
      renderWorkoutPage();
    }
    return;
  }

  var nameBtn = e.target.closest('.exercise-card-name');
  if (nameBtn) {
    var card = nameBtn.closest('.exercise-card');
    var anatomy = card.querySelector('.exercise-anatomy');
    anatomy.classList.toggle('hidden');
    return;
  }
});

exerciseCardsListEl.addEventListener('change', function(e) {
  if (!e.target.classList.contains('set-checkbox-input')) return;

  var dayId = e.target.dataset.day;
  var exId  = e.target.dataset.id;
  var idx   = parseInt(e.target.dataset.index, 10);

  var days = getWorkoutDays();
  var day = days.find(function(d) { return d.id === dayId; });
  if (!day) return;
  var ex = day.exercises.find(function(x) { return x.id === exId; });
  if (!ex) return;

  ex.checked[idx] = e.target.checked;
  saveWorkoutDays(days);

  // görseli anlık güncelle
  var visual = e.target.nextElementSibling;
  visual.textContent = e.target.checked ? '✓' : (idx + 1);

  var card = e.target.closest('.exercise-card');
  var allChecked = ex.checked.every(Boolean);
  card.classList.toggle('completed', allChecked);

  renderDayProgress();
  renderOverallProgress();
});

// ── ANA RENDER FONKSİYONU ──────────────────────
function renderWorkoutPage() {
  var days = getWorkoutDays();
  var hasData = days.length > 0;

  document.getElementById('overallProgressCard').classList.toggle('hidden', !hasData);
  dayTabsContainer.classList.toggle('hidden', !hasData);
  document.getElementById('dayProgressRow').classList.toggle('hidden', !hasData);
  deleteDayBtn.classList.toggle('hidden', !hasData);
  document.getElementById('exerciseSectionDivider').classList.toggle('hidden', !hasData);
  exerciseCardsListEl.classList.toggle('hidden', !hasData);
  document.getElementById('workout-empty').classList.toggle('visible', !hasData);

  if (!hasData) return;

  renderDayTabs();
  renderDayProgress();
  renderOverallProgress();
  renderExerciseCards();
}

// ── SERVICE WORKER ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(function(reg) {
        console.log('[SW] Kayıt başarılı:', reg.scope);
      })
      .catch(function(err) {
        console.warn('[SW] Kayıt başarısız:', err);
      });

    navigator.serviceWorker.addEventListener('controllerchange', function() {
      window.location.reload();
    });
  });
}

// ── INIT ─────────────────────────────────────
loadFormData();
renderWeighinList();
updateDashboard();

fillNumberRange(modalSetsSelect, 1, 10);
fillNumberRange(modalRepsSelect, 1, 20);
fillExerciseSelect(modalLocationSelect.value);
renderWorkoutPage();
