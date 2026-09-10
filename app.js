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
  workoutPlans:'ft_workout_plans'
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

function getWorkoutPlans() {
  return getJSON(KEYS.workoutPlans, {});
}
function saveWorkoutPlans(obj) {
  setJSON(KEYS.workoutPlans, obj);
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

  // Modül 1: Hedef bilgileri
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
   MODÜL 1: HEDEF & GRAFİK SİSTEMİ
   ══════════════════════════════════════════ */

// ── HEDEF KAYDET ──────────────────────────────
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

// ── HAFTALIK TARTIM EKLE ──────────────────────
document.getElementById('add-weighin').addEventListener('click', function() {
  var dateInput   = document.getElementById('weighin-date');
  var weightInput = document.getElementById('weighin-weight');
  var date   = dateInput.value;
  var weight = parseFloat(weightInput.value);

  if (!date || !weight || isNaN(weight)) {
    showFeedback('weighin-feedback');
    document.getElementById('weighin-feedback').textContent = '⚠️ Lütfen tarih ve kilo gir.';
    return;
  }

  var list = getWeighIns();
  list.push({ date: date, weight: weight });
  saveWeighIns(list);

  document.getElementById('weighin-feedback').textContent = '✅ Tartım eklendi!';
  dateInput.value = '';
  weightInput.value = '';

  showFeedback('weighin-feedback');
  renderWeighinList();
  updateDashboard();
});

// ── TARTIM LİSTESİNİ GÖSTER ────────────────────
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

// ── GRAFİK (Chart.js) ──────────────────────────
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
        legend: {
          labels: { color: '#f0f0f0', font: { size: 11 }, boxWidth: 12 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#888', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          ticks: { color: '#888', font: { size: 10 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// ── HEDEF DURUM MESAJI ─────────────────────────
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
    // Sabit Kalmak
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

// ── BMI ──────────────────────────────────────
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

// ── UPDATE DASHBOARD (BMI + Grafik + Hedef) ───
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

  // Grafik ve hedef durumu sadece Ana Sayfa görünürken güvenli şekilde çizilir
  var homePage = document.getElementById('page-home');
  if (homePage && !homePage.classList.contains('hidden')) {
    updateChart();
    updateGoalStatus();
  }
}

/* ══════════════════════════════════════════
   MODÜL 2: İNTERAKTİF ANTRENMAN OLUŞTURUCU
   ══════════════════════════════════════════ */

var DAYS_ORDER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

// Sahte egzersiz verileri — mekana göre gruplanmış
var EXERCISES = {
  'Evde': [
    { name: 'Şınav',                 muscle: 'Göğüs' },
    { name: 'Barfiks',               muscle: 'Sırt' },
    { name: 'Vücut Ağırlığı Squat',  muscle: 'Bacak' },
    { name: 'Plank',                 muscle: 'Karın' },
    { name: 'Mekik',                 muscle: 'Karın' },
    { name: 'Sandalye Dips',         muscle: 'Triceps' },
    { name: 'Lunge',                 muscle: 'Bacak' },
    { name: 'Pike Push-up',          muscle: 'Omuz' }
  ],
  'Spor Salonunda': [
    { name: 'Bench Press',       muscle: 'Göğüs' },
    { name: 'Barbell Squat',     muscle: 'Bacak' },
    { name: 'Deadlift',          muscle: 'Sırt' },
    { name: 'Lat Pulldown',      muscle: 'Sırt' },
    { name: 'Shoulder Press',    muscle: 'Omuz' },
    { name: 'Bicep Curl',        muscle: 'Biceps' },
    { name: 'Triceps Pushdown',  muscle: 'Triceps' },
    { name: 'Leg Press',         muscle: 'Bacak' },
    { name: 'Cable Fly',         muscle: 'Göğüs' }
  ]
};

// ── MODAL DOM REFERANSLARI ────────────────────
var workoutModalOverlay = document.getElementById('workoutModalOverlay');
var openWorkoutModalBtn = document.getElementById('openWorkoutModal');
var closeWorkoutModalBtn = document.getElementById('closeWorkoutModal');
var modalDaySelect      = document.getElementById('modal-day');
var modalLocationSelect = document.getElementById('modal-location');
var modalExerciseSelect = document.getElementById('modal-exercise');
var modalSetsSelect     = document.getElementById('modal-sets');
var modalRepsSelect     = document.getElementById('modal-reps');
var completeWorkoutBtn  = document.getElementById('completeWorkoutBtn');

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

// ── MODAL ÖNİZLEME ─────────────────────────────
function updateModalPreview() {
  var day      = modalDaySelect.value;
  var location = modalLocationSelect.value;
  var exercise = modalExerciseSelect.value;
  var sets     = modalSetsSelect.value;
  var reps     = modalRepsSelect.value;

  document.getElementById('modal-preview').innerHTML =
    '<p class="preview-day">' + day + ' · ' + location + '</p>' +
    '<p class="preview-exercise">' + exercise + '</p>' +
    '<p class="preview-sets">' + sets + ' Set × ' + reps + ' Tekrar</p>';
}

// ── MODAL AÇ / KAPAT ───────────────────────────
function openWorkoutModal() {
  workoutModalOverlay.classList.remove('hidden');
  updateModalPreview();
}

function closeWorkoutModal() {
  workoutModalOverlay.classList.add('hidden');
}

openWorkoutModalBtn.addEventListener('click', openWorkoutModal);
closeWorkoutModalBtn.addEventListener('click', closeWorkoutModal);

// overlay'in kendisine (dışına) tıklanınca kapansın
workoutModalOverlay.addEventListener('click', function(e) {
  if (e.target === workoutModalOverlay) {
    closeWorkoutModal();
  }
});

modalLocationSelect.addEventListener('change', function() {
  fillExerciseSelect(modalLocationSelect.value);
  updateModalPreview();
});

modalDaySelect.addEventListener('change', updateModalPreview);
modalExerciseSelect.addEventListener('change', updateModalPreview);
modalSetsSelect.addEventListener('change', updateModalPreview);
modalRepsSelect.addEventListener('change', updateModalPreview);

// ── ANTRENMANI TAMAMLA (Kaydet) ────────────────
completeWorkoutBtn.addEventListener('click', function() {
  var day      = modalDaySelect.value;
  var location = modalLocationSelect.value;
  var exerciseName = modalExerciseSelect.value;
  var sets     = parseInt(modalSetsSelect.value, 10);
  var reps     = parseInt(modalRepsSelect.value, 10);

  var muscleGroup = 'Genel';
  var list = EXERCISES[location] || [];
  var found = list.find(function(ex) { return ex.name === exerciseName; });
  if (found) muscleGroup = found.muscle;

  var data = getWorkoutPlans();
  if (!data[day]) data[day] = [];

  data[day].push({
    id: 'ex_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    exercise: exerciseName,
    location: location,
    muscleGroup: muscleGroup,
    sets: sets,
    reps: reps,
    checked: new Array(sets).fill(false)
  });

  saveWorkoutPlans(data);
  closeWorkoutModal();
  renderWorkoutAccordion();
});

// ── EGZERSİZ SATIRI HTML OLUŞTUR ───────────────
function buildExerciseRowHTML(day, ex) {
  var checkboxesHTML = '';
  for (var i = 0; i < ex.sets; i++) {
    var isChecked = ex.checked && ex.checked[i] ? 'checked' : '';
    checkboxesHTML +=
      '<label class="set-check-label">' +
        '<input type="checkbox" class="set-checkbox" data-day="' + day + '" data-id="' + ex.id + '" data-set-index="' + i + '" ' + isChecked + '>' +
        '<span>' + (i + 1) + '</span>' +
      '</label>';
  }

  var youtubeQuery = encodeURIComponent(ex.exercise + ' nasıl yapılır');
  var youtubeUrl = 'https://www.youtube.com/results?search_query=' + youtubeQuery;
  var anatomyText = encodeURIComponent('Anatomi: ' + ex.muscleGroup);
  var anatomyImg = 'https://placehold.co/400x200/2c2c2c/ff3b30?text=' + anatomyText;

  return (
    '<div class="exercise-row">' +
      '<div class="exercise-row-main">' +
        '<button class="play-btn" data-youtube="' + youtubeUrl + '" title="Video izle">▶️</button>' +
        '<button class="exercise-name-btn">' + ex.exercise + '</button>' +
        '<span class="exercise-reps">(' + ex.reps + ' Tekrar)</span>' +
      '</div>' +
      '<div class="sets-checkboxes">' + checkboxesHTML + '</div>' +
      '<div class="anatomy-preview hidden">' +
        '<img src="' + anatomyImg + '" alt="' + ex.muscleGroup + ' kas grubu" loading="lazy" />' +
      '</div>' +
    '</div>'
  );
}

// ── ACCORDION RENDER ───────────────────────────
function renderWorkoutAccordion() {
  var container = document.getElementById('workoutAccordion');
  if (!container) return;

  var data = getWorkoutPlans();
  var html = '';

  DAYS_ORDER.forEach(function(day) {
    var exercises = data[day] || [];
    var badge = exercises.length ? '<span class="day-badge">' + exercises.length + '</span>' : '';

    var content = '';
    if (exercises.length === 0) {
      content = '<p class="day-empty">Bu güne henüz antrenman eklenmedi.</p>';
    } else {
      exercises.forEach(function(ex) {
        content += buildExerciseRowHTML(day, ex);
      });
    }

    html +=
      '<div class="accordion-day">' +
        '<button class="day-header" data-day="' + day + '">' +
          '<span class="day-name">' + day + '</span>' +
          badge +
          '<span class="chevron">⌄</span>' +
        '</button>' +
        '<div class="day-content">' + content + '</div>' +
      '</div>';
  });

  container.innerHTML = html;
}

// ── ACCORDION ETKİLEŞİMLERİ (event delegation) ─
var workoutAccordionEl = document.getElementById('workoutAccordion');

workoutAccordionEl.addEventListener('click', function(e) {
  // Gün başlığına tıklama → aç/kapat
  var dayHeader = e.target.closest('.day-header');
  if (dayHeader) {
    var content = dayHeader.nextElementSibling;
    var isOpen = dayHeader.classList.contains('open');

    // diğer günleri kapat (tek seferde bir gün açık)
    workoutAccordionEl.querySelectorAll('.day-header').forEach(function(h) {
      h.classList.remove('open');
      h.nextElementSibling.classList.remove('open');
    });

    if (!isOpen) {
      dayHeader.classList.add('open');
      content.classList.add('open');
    }
    return;
  }

  // Play ikonuna tıklama → YouTube'da yeni sekmede aç
  var playBtn = e.target.closest('.play-btn');
  if (playBtn) {
    window.open(playBtn.dataset.youtube, '_blank', 'noopener');
    return;
  }

  // Hareket adına tıklama → anatomi görselini aç/kapat
  var nameBtn = e.target.closest('.exercise-name-btn');
  if (nameBtn) {
    var row = nameBtn.closest('.exercise-row');
    var anatomy = row.querySelector('.anatomy-preview');
    anatomy.classList.toggle('hidden');
    return;
  }
});

workoutAccordionEl.addEventListener('change', function(e) {
  if (e.target.classList.contains('set-checkbox')) {
    var day = e.target.dataset.day;
    var id  = e.target.dataset.id;
    var idx = parseInt(e.target.dataset.setIndex, 10);

    var data = getWorkoutPlans();
    var list = data[day] || [];
    var ex = list.find(function(item) { return item.id === id; });

    if (ex) {
      if (!ex.checked) ex.checked = [];
      ex.checked[idx] = e.target.checked;
      saveWorkoutPlans(data);
    }
  }
});

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

// Modül 2: sabit select'leri bir kez doldur, accordion'u çiz
fillNumberRange(modalSetsSelect, 1, 10);
fillNumberRange(modalRepsSelect, 1, 20);
fillExerciseSelect(modalLocationSelect.value);
renderWorkoutAccordion();
