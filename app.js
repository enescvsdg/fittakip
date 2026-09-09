/* ══════════════════════════════════════════
   FitTakip — app.js
   ══════════════════════════════════════════ */

// ── DOM REFERENCES ─────────────────────────
const menuToggle   = document.getElementById('menuToggle');
const dropdownMenu = document.getElementById('dropdownMenu');
const overlay      = document.getElementById('overlay');
const navItems     = document.querySelectorAll('.nav-item');
const bottomItems  = document.querySelectorAll('.bottom-nav-item');
const pages        = document.querySelectorAll('.page');

// ── SPA: SHOW PAGE ──────────────────────────
function showPage(pageId) {
  pages.forEach(p => p.classList.add('hidden'));

  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
    target.style.animation = 'none';
    void target.offsetHeight;
    target.style.animation = '';
  }

  navItems.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
  bottomItems.forEach(btn => {
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
  height:     'ft_height',
  weight:     'ft_weight',
  age:        'ft_age',
  goal:       'ft_goal',
  workout:    'ft_workout',
  nutrition:  'ft_nutrition',
  supplement: 'ft_supplement'
};

// ── LOAD SAVED DATA ──────────────────────────
function loadFormData() {
  document.getElementById('input-height').value     = localStorage.getItem(KEYS.height)     || '';
  document.getElementById('input-weight').value     = localStorage.getItem(KEYS.weight)     || '';
  document.getElementById('input-age').value        = localStorage.getItem(KEYS.age)        || '';
  document.getElementById('input-goal').value       = localStorage.getItem(KEYS.goal)       || '';
  document.getElementById('input-workout').value    = localStorage.getItem(KEYS.workout)    || '';
  document.getElementById('input-nutrition').value  = localStorage.getItem(KEYS.nutrition)  || '';
  document.getElementById('input-supplement').value = localStorage.getItem(KEYS.supplement) || '';
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

// ── SAVE HANDLERS ────────────────────────────
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

// ── UPDATE DASHBOARD ─────────────────────────
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
    return;
  }

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
updateDashboard();
