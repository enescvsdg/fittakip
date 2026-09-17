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
/* sessiz: sayfa parmakla sürüklenerek zaten yerine geldiyse giriş animasyonu
   oynatılmaz — yoksa hareket iki kez yapılmış gibi görünür. */
function showPage(pageId, sessiz) {
  pages.forEach(function(p) { p.classList.add('hidden'); });

  var target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.remove('hidden');
    if (sessiz) {
      // Sürüklenerek gelen sayfa yatay olarak zaten yerine oturdu. Giriş
      // animasyonu da oynarsa üstüne bir de yukarıdan aşağı hareket biniyor.
      target.style.animation = 'none';
    } else {
      target.style.animation = 'none';
      void target.offsetHeight;
      target.style.animation = '';
    }
  }

  navItems.forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
  bottomItems.forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });

  altMenuyuAc();   // yeni sayfada kapsül toplanmış başlamasın

  if (pageId === 'home') {
    updateDashboard();
    renderConsistency();
    renderStrengthSection();
    renderCalendar();
  }
}

/* ── ALT MENÜNÜN KAYDIRMAYLA TOPLANMASI ──
   Aşağı kaydırılırken kapsül daralır, yukarı kaydırılınca açılır.

   Üç ayrıntı bunu kullanılabilir yapıyor:
   - Eşik: parmağın birkaç piksel oynaması açıp kapatmasın
   - requestAnimationFrame: kaydırma olayı saniyede onlarca kez tetikleniyor,
     her seferinde sınıf değiştirmek cam bulanıklığıyla birlikte kare atlatır
   - Kıstırma: iOS'ta sayfanın tepesinde aşağı çekince scrollY negatife düşüyor */
var ALT_MENU_ESIK = 10;
var altMenuSonY = 0;
var altMenuBekleyen = false;

function altMenuyuAc() {
  var nav = document.querySelector('.bottom-nav');
  if (nav) nav.classList.remove('toplandi');
  altMenuSonY = Math.max(0, window.scrollY);
}

function altMenuDegerlendir() {
  altMenuBekleyen = false;
  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;

  var y = Math.max(0, window.scrollY);
  // Sayfa kaymıyorsa veya tepedeysek kapsül hep açık kalsın
  var kaydirilabilir = document.documentElement.scrollHeight - window.innerHeight > 80;
  if (!kaydirilabilir || y < 40) { nav.classList.remove('toplandi'); altMenuSonY = y; return; }

  var fark = y - altMenuSonY;
  if (Math.abs(fark) < ALT_MENU_ESIK) return;
  nav.classList.toggle('toplandi', fark > 0);
  altMenuSonY = y;
}

window.addEventListener('scroll', function() {
  if (altMenuBekleyen) return;
  altMenuBekleyen = true;
  requestAnimationFrame(altMenuDegerlendir);
}, { passive: true });

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


// ── LOAD SAVED DATA ──────────────────────────
function loadFormData() {
  document.getElementById('input-height').value     = localStorage.getItem(KEYS.height)     || '';
  document.getElementById('input-weight').value     = localStorage.getItem(KEYS.weight)     || '';
  document.getElementById('input-age').value        = localStorage.getItem(KEYS.age)        || '';
  document.getElementById('input-goal').value       = localStorage.getItem(KEYS.goal)       || '';
  document.getElementById('input-workout').value    = localStorage.getItem(KEYS.workout)    || '';
  document.getElementById('input-cardio').value      = localStorage.getItem(KEYS.cardio)     || '';
  document.getElementById('input-nutrition').value  = localStorage.getItem(KEYS.nutrition)  || '';
  document.getElementById('input-supplement').value = localStorage.getItem(KEYS.supplement) || '';

  var savedGoalType = localStorage.getItem(KEYS.goalType);
  if (savedGoalType) document.getElementById('goal-type').value = savedGoalType;
  document.getElementById('goal-date').value   = localStorage.getItem(KEYS.goalDate)   || '';
  document.getElementById('goal-weight').value = localStorage.getItem(KEYS.goalWeight) || '';

  document.getElementById('gemini-api-key').value = localStorage.getItem('ft_gemini_api_key') || '';
}

// ── SAVE FEEDBACK ────────────────────────────




// ── SAVE HANDLERS (temel bilgiler) ──────────
document.getElementById('save-profile').addEventListener('click', function() {
  var alanlar = [
    { tur: 'height', anahtar: KEYS.height, el: 'input-height' },
    { tur: 'weight', anahtar: KEYS.weight, el: 'input-weight' },
    { tur: 'age',    anahtar: KEYS.age,    el: 'input-age' }
  ];

  // Önce hepsini doğrula: bir alan hatalıysa hiçbiri kaydedilmesin
  var kaydedilecek = [];
  for (var i = 0; i < alanlar.length; i++) {
    var sonuc = sayiDogrula(alanlar[i].tur, document.getElementById(alanlar[i].el).value);
    if (sonuc.hata) { dogrulamaHatasi('profile-feedback', sonuc.hata); return; }
    if (!sonuc.bos) kaydedilecek.push({ anahtar: alanlar[i].anahtar, deger: String(sonuc.deger) });
  }
  kaydedilecek.forEach(function(x) { localStorage.setItem(x.anahtar, x.deger); });

  var g = document.getElementById('input-goal').value.trim();
  if (g) localStorage.setItem(KEYS.goal, g);

  document.getElementById('profile-feedback').textContent = '✅ Kaydedildi!';
  showFeedback('profile-feedback');
  updateDashboard();
});

document.getElementById('save-workout').addEventListener('click', function() {
  localStorage.setItem(KEYS.workout, document.getElementById('input-workout').value);
  showFeedback('workout-feedback');
});
document.getElementById('save-cardio').addEventListener('click', function() {
  localStorage.setItem(KEYS.cardio, document.getElementById('input-cardio').value);
  showFeedback('cardio-feedback');
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
  var hedef = sayiDogrula('goalWeight', document.getElementById('goal-weight').value);
  if (hedef.hata) { dogrulamaHatasi('goal-feedback', hedef.hata); return; }

  localStorage.setItem(KEYS.goalType, type);
  if (date) localStorage.setItem(KEYS.goalDate, date);
  if (!hedef.bos) localStorage.setItem(KEYS.goalWeight, String(hedef.deger));

  document.getElementById('goal-feedback').textContent = '✅ Hedef kaydedildi!';
  showFeedback('goal-feedback');
  updateDashboard();
});

document.getElementById('add-weighin').addEventListener('click', function() {
  var dateInput   = document.getElementById('weighin-date');
  var weightInput = document.getElementById('weighin-weight');
  var date = dateInput.value;
  var feedbackEl = document.getElementById('weighin-feedback');
  var tartim = sayiDogrula('weight', weightInput.value);

  if (!date || tartim.bos) {
    feedbackEl.textContent = '⚠️ Lütfen tarih ve kilo gir.';
    showFeedback('weighin-feedback');
    return;
  }
  if (tartim.hata) { dogrulamaHatasi('weighin-feedback', tartim.hata); return; }

  var list = getWeighIns();
  list.push({ date: date, weight: tartim.deger });
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
    html += '<div class="weighin-item"><span>' + formatDateTR(item.date) + '</span><span class="weighin-item-weight">' + escapeHtml(item.weight) + ' kg</span></div>';
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
    label: 'Kilo (kg)', data: weights, borderColor: temaRengi('accent'),
    backgroundColor: temaRengi('chart-fill'), borderWidth: 2.5,
    pointBackgroundColor: temaRengi('accent'), pointBorderColor: temaRengi('surface'),
    pointRadius: 4, pointHoverRadius: 6, tension: 0.3, fill: true
  }];

  if (goalWeight && !isNaN(goalWeight)) {
    datasets.push({
      label: 'Hedef Kilo (kg)', data: labels.map(function() { return goalWeight; }),
      borderColor: temaRengi('success'), borderDash: [6, 6], borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: false
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
      plugins: { legend: { labels: { color: temaRengi('text'), font: { size: 11 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: temaRengi('text-muted'), font: { size: 10 } }, grid: { color: temaRengi('grid') } },
        y: { ticks: { color: temaRengi('text-muted'), font: { size: 10 } }, grid: { color: temaRengi('grid') } }
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
  if (bmi < 18.5) return { key: 'underweight', label: 'Zayıf', color: temaRengi('info') };
  if (bmi < 25)   return { key: 'normal', label: 'Normal', color: temaRengi('success') };
  if (bmi < 30)   return { key: 'overweight', label: 'Fazla Kilolu', color: temaRengi('caution') };
  return             { key: 'obese', label: 'Obez', color: temaRengi('danger') };
}

function updateDashboard() {
  var h = parseFloat(localStorage.getItem(KEYS.height));
  var w = parseFloat(localStorage.getItem(KEYS.weight));

  var emptyState = document.getElementById('home-empty');
  var infoBox    = document.getElementById('bmi-info-box');
  var bmiLine    = document.getElementById('dash-bmi-line');
  var bodyLine   = document.getElementById('dash-body-line');
  var marker     = document.getElementById('bmi-marker');

  if (!h || !w || h <= 0 || w <= 0) {
    infoBox.style.display = 'none';
    emptyState.classList.add('visible');
  } else {
    infoBox.style.display = 'block';
    emptyState.classList.remove('visible');

    var bmi = calcBMI(h, w);
    var cat = bmiCategory(bmi);

    bmiLine.textContent = bmi.toFixed(1) + ' · ' + cat.label;
    bmiLine.style.color = cat.color;
    bodyLine.textContent = h.toFixed(0) + ' cm · ' + fmtKg(w) + ' kg';

    // Ölçek 15–35 BMI aralığını kaplıyor; işaretçi o aralıktaki yerine oturuyor
    var pct = Math.max(0, Math.min(100, ((bmi - 15) / 20) * 100));
    marker.style.left = pct + '%';
    marker.classList.remove('hidden');

    ['underweight', 'normal', 'overweight', 'obese'].forEach(function(key) {
      var seg = document.getElementById('bmi-seg-' + key);
      seg.classList.toggle('active', key === cat.key);
      if (key === cat.key) seg.style.setProperty('--bmi-color', cat.color);
    });
  }

  var homePage = document.getElementById('page-home');
  if (homePage && !homePage.classList.contains('hidden')) {
    updateChart();
    updateGoalStatus();
  }
  renderTodayCards();
}


/* ══════════════════════════════════════════
   "BUGÜN" KARTLARI — ana sayfanın üst yarısı
   Her alan kendi rengini taşır: antrenman, kilo,
   beslenme, supplement. Veriler olduğu gibi okunur,
   olmayan bir şey uydurulmaz.
   ══════════════════════════════════════════ */

var TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
var TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

var TODAY_ICONS = {
  antrenman:  '<path d="M6.5 8.5v7M17.5 8.5v7M3.5 10.5v3M20.5 10.5v3M6.5 12h11"/>',
  dinlenme:   '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z"/>',
  analiz:     '<path d="M3.5 20.5h17"/><path d="M7 20.5v-6.5M12 20.5V7.5M17 20.5v-10"/>',
  beslenme:   '<path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M9 8.2c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5"/>',
  supplement: '<rect x="3.5" y="8.5" width="17" height="7" rx="3.5"/><path d="M12 8.5v7"/>'
};




function todayCardHtml(o) {
  return '' +
    '<button class="today-card cat-' + o.cat + '" type="button" data-page="' + o.page + '"' +
      (o.weekday ? ' data-weekday="' + escapeHtml(o.weekday) + '"' : '') + '>' +
      '<span class="today-row">' +
        '<span class="today-chip">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            TODAY_ICONS[o.icon] +
          '</svg>' +
        '</span>' +
        '<span class="today-body">' +
          '<span class="today-kind">' + o.kind + '</span>' +
          '<span class="today-value">' + o.value + '</span>' +
          (o.meta ? '<span class="today-meta">' + escapeHtml(o.meta) + '</span>' : '') +
        '</span>' +
        (o.aside ? '<span class="today-aside' + (o.asideAccent ? ' accent' : '') + '">' + escapeHtml(o.aside) + '</span>' : '') +
        '<svg class="today-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>' +
      '</span>' +
      (typeof o.progress === 'number'
        ? '<span class="today-track"><span class="today-fill" style="width: ' + Math.max(0, Math.min(100, o.progress)) + '%;"></span></span>'
        : '') +
    '</button>';
}

// ── ANTRENMAN: "sıradaki adım" mesajının yeni evi ──
function buildWorkoutCard() {
  var todayName = TR_DAYS[new Date().getDay()];
  var daysMap = getWorkoutDaysMap();
  var todayPlan = daysMap[todayName];
  var hasWorkoutToday = todayPlan && ((todayPlan.exercises && todayPlan.exercises.length > 0) || (todayPlan.postWorkout && todayPlan.postWorkout.length > 0));
  var doneToday = getWorkoutHistory().some(function(s) { return s.date === getTodayKey(); });

  if (hasWorkoutToday && !doneToday) {
    var count = (todayPlan.exercises || []).length + (todayPlan.postWorkout || []).length;
    return todayCardHtml({
      cat: 'antrenman', icon: 'antrenman', page: 'workout', weekday: todayName,
      kind: 'ANTRENMAN',
      value: escapeHtml(todayPlan.title || (todayName + ' Antrenmanı')),
      meta: 'Seni bekliyor',
      aside: count + ' hareket'
    });
  }
  if (hasWorkoutToday && doneToday) {
    return todayCardHtml({
      cat: 'antrenman', icon: 'antrenman', page: 'workout',
      kind: 'ANTRENMAN', value: 'Tamamlandı', meta: 'Bugünkü antrenmanı bitirdin, harika!',
      progress: 100
    });
  }

  var anyPlan = Object.keys(daysMap).some(function(k) {
    var d = daysMap[k];
    return d && ((d.exercises && d.exercises.length) || (d.postWorkout && d.postWorkout.length));
  });
  if (!anyPlan) {
    return todayCardHtml({
      cat: 'antrenman', icon: 'antrenman', page: 'workout',
      kind: 'ANTRENMAN', value: 'Planın yok', meta: 'Hadi bir tane oluştur'
    });
  }
  return todayCardHtml({
    cat: 'antrenman', icon: 'dinlenme', page: 'workout',
    kind: 'ANTRENMAN', value: 'Dinlenme günü', meta: 'Planında bugün antrenman yok'
  });
}

// ── KİLO: güncel ağırlık + hedefe ilerleme ──
function buildWeightCard() {
  var w = parseFloat(localStorage.getItem(KEYS.weight));
  if (!w || w <= 0) {
    return todayCardHtml({
      cat: 'analiz', icon: 'analiz', page: 'profile',
      kind: 'KİLO', value: 'Kilonu gir', meta: 'Kişisel Bilgiler sayfasından ekle'
    });
  }

  var goal = parseFloat(localStorage.getItem(KEYS.goalWeight));
  var card = {
    cat: 'analiz', icon: 'analiz', page: 'profile',
    kind: 'KİLO', value: fmtKg(w) + ' <small>kg</small>'
  };

  if (goal && goal > 0) {
    var diff = Math.abs(w - goal);
    card.aside = diff < 0.05 ? 'hedefte' : 'hedefe ' + fmtKg(diff) + ' kg';

    // İlerleme, ilk tartımdan hedefe kadar olan yolun ne kadarı
    var weighins = getWeighIns();
    if (weighins.length) {
      var start = parseFloat(weighins[0].weight);
      var total = Math.abs(start - goal);
      if (total > 0.05) card.progress = Math.round((Math.abs(start - w) / total) * 100);
    }
  }
  return todayCardHtml(card);
}

// ── BESLENME: plandaki toplam (günlük alım takibi henüz yok) ──
function buildNutritionCard() {
  var plan = getMealPlan();
  var totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  var items = 0;

  MEAL_ORDER.forEach(function(meal) {
    (plan[meal] || []).forEach(function(item) {
      totals.kcal += item.kcal; totals.protein += item.protein;
      totals.carbs += item.carbs; totals.fat += item.fat;
      items++;
    });
  });

  if (!items) {
    return todayCardHtml({
      cat: 'beslenme', icon: 'beslenme', page: 'nutrition',
      kind: 'BESLENME', value: 'Planın yok', meta: 'Öğünlerini eklemeye başla'
    });
  }

  return todayCardHtml({
    cat: 'beslenme', icon: 'beslenme', page: 'nutrition',
    kind: 'BESLENME',
    value: Math.round(totals.kcal) + ' <small>kcal</small>',
    meta: 'Planında P ' + Math.round(totals.protein) + ' · K ' + Math.round(totals.carbs) + ' · Y ' + Math.round(totals.fat),
    aside: items + ' gıda'
  });
}

// ── SUPPLEMENT: planlı ürün sayısı + gün içindeki sıradaki hatırlatma ──
function buildSupplementCard() {
  var plan = getSupplementPlan();
  var all = [];
  Object.keys(plan).forEach(function(timing) {
    (plan[timing] || []).forEach(function(item) { all.push(item); });
  });

  if (!all.length) {
    return todayCardHtml({
      cat: 'supplement', icon: 'supplement', page: 'supplement',
      kind: 'SUPPLEMENT', value: 'Planın yok', meta: 'Kullandığın takviyeleri ekle'
    });
  }

  var alinan = all.filter(function(item) { return isSuppTaken(item.id); }).length;
  var kalan = all.length - alinan;

  // Sıradaki hatırlatma — işaretlenmiş takviyeler sayılmaz, onların işi bitti
  var now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes();
  var next = null;
  all.forEach(function(item) {
    if (!item.reminder || isSuppTaken(item.id)) return;
    var parts = item.reminder.split(':');
    var mins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    if (mins >= nowMin && (!next || mins < next.mins)) next = { mins: mins, item: item };
  });

  var withTime = all.filter(function(i) { return i.reminder; }).length;
  var meta;
  if (!kalan)        meta = 'Bugünkü takviyelerin tamam 💪';
  else if (next)     meta = 'Sıradaki: ' + next.item.name;
  else if (withTime) meta = kalan + ' takviye kaldı';
  else               meta = 'Henüz hatırlatma saati kurmadın';

  return todayCardHtml({
    cat: 'supplement', icon: 'supplement', page: 'supplement',
    kind: 'SUPPLEMENT',
    value: alinan + ' / ' + all.length + ' <small>alındı</small>',
    meta: meta,
    aside: next ? next.item.reminder : '',
    asideAccent: true,
    progress: Math.round((alinan / all.length) * 100)
  });
}

function renderTodayCards() {
  var wrap = document.getElementById('todayCards');
  if (!wrap) return;

  var now = new Date();
  document.getElementById('today-date').textContent =
    TR_DAYS[now.getDay()] + ', ' + now.getDate() + ' ' + TR_MONTHS[now.getMonth()];

  wrap.innerHTML = buildWorkoutCard() + buildWeightCard() + buildNutritionCard() + buildSupplementCard();
}

// Kartlar ilgili sayfaya götürür
document.getElementById('todayCards').addEventListener('click', function(e) {
  var card = e.target.closest('.today-card');
  if (!card) return;

  if (card.dataset.weekday) {
    activeWeekday = card.dataset.weekday;
    localStorage.setItem(KEYS.activeDay, activeWeekday);
  }
  showPage(card.dataset.page);
  if (card.dataset.page === 'workout') renderWorkoutTracking();
});

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
    { name: "Neck Flexion (Manual Resistance)", equipment: "none", level: "beginner", muscle: "neck" },
    { name: "Weighted Crunch", equipment: "dumbbell", level: "beginner", muscle: "abdominals" },
    { name: "Reverse Crunch", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "Standing Knee Raise", equipment: "none", level: "beginner", muscle: "abdominals" },
    { name: "McGill Curl Up", equipment: "none", level: "intermediate", muscle: "abdominals" },
    { name: "Band External Rotation", equipment: "bands", level: "beginner", muscle: "shoulders" },
    { name: "Band Internal Rotation", equipment: "bands", level: "beginner", muscle: "shoulders" },
    { name: "Scapula Pull Up", equipment: "pull-up bar", level: "intermediate", muscle: "lats" },
    { name: "Doorway Chest Stretch", equipment: "none", level: "beginner", muscle: "chest" },
    { name: "Child's Pose Lat Stretch", equipment: "none", level: "beginner", muscle: "lats" },
    { name: "Wall Lat Stretch", equipment: "none", level: "beginner", muscle: "lats" },
    { name: "Standing Quadriceps Stretch", equipment: "none", level: "beginner", muscle: "quadriceps" },
    { name: "Standing Hamstring Stretch", equipment: "none", level: "beginner", muscle: "hamstrings" },
    { name: "Overhead Triceps Stretch", equipment: "none", level: "beginner", muscle: "triceps" }
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
    { name: "Dumbbell Fly", equipment: "dumbbell", level: "beginner", muscle: "chest" },
    { name: "Cable Fly", equipment: "cable", level: "beginner", muscle: "chest" },
    { name: "Chest Press Machine", equipment: "machine", level: "beginner", muscle: "chest" },
    { name: "Decline Bench Press", equipment: "barbell", level: "intermediate", muscle: "chest" },
    { name: "Dumbbell Bench Press", equipment: "dumbbell", level: "beginner", muscle: "chest" },
    { name: "Dumbbell Incline Press", equipment: "dumbbell", level: "intermediate", muscle: "chest" },
    { name: "Chest Dip", equipment: "other", level: "intermediate", muscle: "chest" },
    { name: "Svend Press", equipment: "other", level: "intermediate", muscle: "chest" },
    { name: "Pec Deck Fly", equipment: "machine", level: "beginner", muscle: "chest" },
    { name: "Landmine Press", equipment: "barbell", level: "intermediate", muscle: "chest" },
    { name: "Incline Cable Fly", equipment: "cable", level: "intermediate", muscle: "chest" },
    { name: "Machine Fly", equipment: "machine", level: "beginner", muscle: "chest" },
    { name: "Incline Smith Press", equipment: "machine", level: "intermediate", muscle: "chest" },
    { name: "Bent-Arm Barbell Pullover", equipment: "barbell", level: "intermediate", muscle: "lats" },
    { name: "Cable Incline Pushdown", equipment: "cable", level: "intermediate", muscle: "lats" },
    { name: "Lat Pulldown", equipment: "cable", level: "beginner", muscle: "lats" },
    { name: "One-Arm Dumbbell Row", equipment: "dumbbell", level: "beginner", muscle: "lats" },
    { name: "Straight Arm Pulldown", equipment: "cable", level: "beginner", muscle: "lats" },
    { name: "Single Arm Lat Pulldown", equipment: "cable", level: "intermediate", muscle: "lats" },
    { name: "Rope Pullover", equipment: "cable", level: "intermediate", muscle: "lats" },
    { name: "Reverse Pulldown", equipment: "cable", level: "intermediate", muscle: "lats" },
    { name: "Kroc Row", equipment: "dumbbell", level: "expert", muscle: "lats" },
    { name: "Wide Grip Lat Pulldown", equipment: "cable", level: "beginner", muscle: "lats" },
    { name: "Close Grip Lat Pulldown", equipment: "cable", level: "beginner", muscle: "lats" },
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
    { name: "Wide Grip Seated Cable Row", equipment: "cable", level: "beginner", muscle: "middle back" },
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
    { name: "Machine Shoulder Press", equipment: "machine", level: "beginner", muscle: "shoulders" },
    { name: "Bent Over Lateral Raise", equipment: "dumbbell", level: "beginner", muscle: "shoulders" },
    { name: "Rear Cable Fly", equipment: "cable", level: "beginner", muscle: "shoulders" },
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
    { name: "Dumbbell Curl", equipment: "dumbbell", level: "beginner", muscle: "biceps" },
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
    { name: "Triceps Pushdown", equipment: "cable", level: "beginner", muscle: "triceps" },
    { name: "Lying Triceps Extension", equipment: "ez curl bar", level: "intermediate", muscle: "triceps" },
    { name: "Rope Pushdown", equipment: "cable", level: "beginner", muscle: "triceps" },
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
    '<div class="anatomy-panel" data-current-view="' + defaultView + '" data-muscle="' + escapeHtml(muscle) + '">' +
      '<div class="anatomy-view-toggle">' +
        '<button type="button" class="anatomy-view-btn' + (defaultView === 'front' ? ' active' : '') + '" data-view-btn="front">Ön</button>' +
        '<button type="button" class="anatomy-view-btn' + (defaultView === 'back' ? ' active' : '') + '" data-view-btn="back">Arka</button>' +
      '</div>' +
      '<p class="muscle-region-label">' + escapeHtml(muscleLabel) + '</p>' +
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
  var day = map[weekday] || { title: '', exercises: [] };
  if (!day.postWorkout) day.postWorkout = [];
  return day;
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
var builderNoteInput      = document.getElementById('builder-note');
var builderIsPostCheckbox = document.getElementById('builder-is-post');
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
    html += '<option value="' + escapeHtml(ex.muscle) + '">' + escapeHtml(label) + '</option>';
  });

  builderRegionSelect.innerHTML = html;
}

// Hareket dropdown'ını, seçili mekan + seçili bölgeye (kas grubu) göre doldurur
function fillExerciseSelect(location, region) {
  var list = EXERCISES[location] || [];
  var html = '';

  list.forEach(function(ex) {
    if (ex.muscle !== region) return;
    html += '<option value="' + escapeHtml(ex.name) + '">' + escapeHtml(ex.name) + '</option>';
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
  var postBadge = item.isPost ? '<span class="cart-item-post-badge">Antrenman Sonrası</span>' : '';
  var noteHtml = item.note ? '<p class="cart-item-note">📝 ' + escapeHtml(item.note) + '</p>' : '';

  return (
    '<div class="cart-item" data-cart-id="' + escapeHtml(item.cartId) + '">' +
      '<div class="cart-item-header">' +
        '<span class="cart-item-number">' + (index + 1) + '</span>' +
        '<div class="cart-item-info">' +
          '<p class="cart-item-name">' + escapeHtml(item.name) + postBadge + '</p>' +
          '<p class="cart-item-meta">' + escapeHtml(meta) + '</p>' +
        '</div>' +
        '<span class="cart-item-chevron">⌄</span>' +
        '<button type="button" class="cart-item-remove" data-cart-id="' + escapeHtml(item.cartId) + '" title="Sil">✕</button>' +
      '</div>' +
      noteHtml +
      '<div class="cart-item-anatomy-wrap hidden">' + buildAnatomyPanelHTML(escapeHtml(item.muscle)) + '</div>' +
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
  var note         = builderNoteInput.value.trim();
  var isPost       = builderIsPostCheckbox.checked;

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
    reps: reps,
    note: note,
    isPost: isPost
  });

  builderNoteInput.value = '';
  builderIsPostCheckbox.checked = false;

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
    if (!daysMap[item.weekday]) daysMap[item.weekday] = { title: '', exercises: [], postWorkout: [] };
    if (!daysMap[item.weekday].postWorkout) daysMap[item.weekday].postWorkout = [];

    var exerciseObj = {
      id: 'ex_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: item.name,
      muscle: item.muscle,
      equipment: item.equipment,
      level: item.level,
      sets: item.sets,
      reps: item.reps,
      note: item.note || '',
      checked: new Array(item.sets).fill(false)
    };

    if (item.isPost) {
      daysMap[item.weekday].postWorkout.push(exerciseObj);
    } else {
      daysMap[item.weekday].exercises.push(exerciseObj);
    }

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

  collapseWorkoutBuilder();
  renderWorkoutTracking();
});

/* ══════════════════════════════════════════
   ANTRENMAN PLANI OLUŞTUR — açılır/kapanır bar
   ══════════════════════════════════════════ */

var toggleBuilderBtn      = document.getElementById('toggleBuilderBtn');
var workoutBuilderSection = document.getElementById('workoutBuilderSection');

function collapseWorkoutBuilder() {
  workoutBuilderSection.classList.add('hidden');
  toggleBuilderBtn.classList.remove('open');
}

toggleBuilderBtn.addEventListener('click', function() {
  workoutBuilderSection.classList.toggle('hidden');
  toggleBuilderBtn.classList.toggle('open', !workoutBuilderSection.classList.contains('hidden'));
});

/* ══════════════════════════════════════════
   TAKİP GÖRÜNÜMÜ (Haftalık sekmeler, ilerleme, kartlar)
   ══════════════════════════════════════════ */

function renderDayTabs() {
  var daysMap = getWorkoutDaysMap();
  var filledWeekdays = DAYS_ORDER.filter(function(weekday) {
    var day = daysMap[weekday];
    return day && ((day.exercises && day.exercises.length > 0) || (day.postWorkout && day.postWorkout.length > 0));
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
    var totalCount = day.exercises.length + (day.postWorkout ? day.postWorkout.length : 0);
    var badge = '<span class="day-tab-badge">' + totalCount + '</span>';

    html +=
      '<button class="day-tab' + activeClass + '" data-weekday="' + escapeHtml(weekday) + '">' +
        '<span class="day-tab-number">' + escapeHtml(weekday) + '</span>' +
        '<span class="day-tab-title' + titleClass + '">' + escapeHtml(titleHtml) + '</span>' +
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
    (day.postWorkout || []).forEach(function(ex) {
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
  (day.postWorkout || []).forEach(function(ex) {
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
  var hasAny = day && ((day.exercises && day.exercises.length > 0) || (day.postWorkout && day.postWorkout.length > 0));
  if (!hasAny) return;

  var confirmed = window.confirm('"' + activeWeekday + '" günündeki tüm antrenmanları silmek istediğine emin misin?');
  if (!confirmed) return;

  daysMap[activeWeekday] = { title: day.title || '', exercises: [], postWorkout: [] };
  saveWorkoutDaysMap(daysMap);
  renderWorkoutTracking();
});

function buildExerciseCardHTML(weekday, ex, isPost) {
  var allChecked = ex.checked.length > 0 && ex.checked.every(Boolean);
  if (!ex.weights) ex.weights = new Array(ex.sets).fill('');
  var setsHTML = '';

  // Son performans (geçmişten) — varsa göster
  var lastPerf = getLastPerformance(ex.name);
  var lastPerfHTML = '';
  if (lastPerf) {
    lastPerfHTML = '<p class="exercise-card-last">Son: ' + escapeHtml(lastPerf.summary) + '</p>';
  }

  for (var i = 0; i < ex.sets; i++) {
    var isChecked = !!ex.checked[i];
    var w = ex.weights[i] || '';
    setsHTML +=
      '<div class="set-row' + (isChecked ? ' done' : '') + '" data-index="' + i + '">' +
        '<span class="set-row-num">' + (i + 1) + '. set</span>' +
        '<input type="number" class="set-weight-input" inputmode="decimal" placeholder="kg" value="' + escapeHtml(w) + '" ' +
          'data-weekday="' + escapeHtml(weekday) + '" data-id="' + ex.id + '" data-index="' + i + '" data-post="' + (isPost ? '1' : '0') + '">' +
        '<span class="set-row-x">×</span>' +
        '<span class="set-row-reps">' + escapeHtml(ex.reps) + '</span>' +
        '<label class="set-check-label">' +
          '<input type="checkbox" class="set-checkbox-input" data-weekday="' + escapeHtml(weekday) + '" data-id="' + escapeHtml(ex.id) + '" data-index="' + i + '" data-post="' + (isPost ? '1' : '0') + '" ' + (isChecked ? 'checked' : '') + '>' +
          '<span class="set-check-visual">' + (isChecked ? '✓' : '') + '</span>' +
        '</label>' +
      '</div>';
  }

  var youtubeUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' nasıl yapılır');
  var levelLabel = ex.level ? (LEVEL_TR[ex.level] || ex.level) : '';
  var equipmentLabel = ex.equipment ? (EQUIPMENT_TR[ex.equipment] !== undefined ? EQUIPMENT_TR[ex.equipment] : ex.equipment) : '';
  // Etiketler sözlükte yoksa ham ex.equipment / ex.level değerine düşüyor
  var extraMetaParts = [equipmentLabel, levelLabel].filter(Boolean).map(escapeHtml);
  var extraMeta = extraMetaParts.length ? ' · ' + extraMetaParts.join(' · ') : '';
  var noteHtml = ex.note ? '<p class="exercise-card-note">📝 ' + escapeHtml(ex.note) + '</p>' : '';

  return (
    '<div class="exercise-card' + (allChecked ? ' completed' : '') + (isPost ? ' post-workout' : '') + '" data-weekday="' + escapeHtml(weekday) + '" data-id="' + escapeHtml(ex.id) + '" data-post="' + (isPost ? '1' : '0') + '">' +
      '<button class="exercise-card-remove" data-weekday="' + escapeHtml(weekday) + '" data-id="' + escapeHtml(ex.id) + '" data-post="' + (isPost ? '1' : '0') + '" title="Kaldır">✕</button>' +
      '<div class="exercise-card-title-row">' +
        '<button class="exercise-card-name">' + escapeHtml(ex.name) + '</button>' +
        '<a class="exercise-card-play" href="' + safeUrl(youtubeUrl) + '" target="_blank" rel="noopener noreferrer" title="Video izle"><span>▶</span></a>' +
      '</div>' +
      '<p class="exercise-card-sets-reps">Hedef: ' + escapeHtml(ex.sets) + '×' + escapeHtml(ex.reps) + extraMeta + '</p>' +
      lastPerfHTML +
      '<div class="exercise-card-sets">' + setsHTML + '</div>' +
      noteHtml +
      '<div class="exercise-anatomy-wrap hidden">' + buildAnatomyPanelHTML(escapeHtml(ex.muscle)) + '</div>' +
    '</div>'
  );
}

function renderExerciseCards() {
  var day = getDay(activeWeekday);
  var hasMain = day.exercises && day.exercises.length > 0;
  var hasPost = day.postWorkout && day.postWorkout.length > 0;
  var finishBtn = document.getElementById('finishWorkoutBtn');

  if (!hasMain && !hasPost) {
    exerciseCardsListEl.innerHTML = '<p class="day-empty">Bu güne henüz egzersiz eklenmedi. Yukarıdaki formla ekleyebilirsin.</p>';
    finishBtn.classList.add('hidden');
    return;
  }

  var html = '';

  if (hasMain) {
    day.exercises.forEach(function(ex) { html += buildExerciseCardHTML(activeWeekday, ex, false); });
  } else {
    html += '<p class="day-empty">Bu güne henüz egzersiz eklenmedi.</p>';
  }

  if (hasPost) {
    html += '<div class="post-workout-divider"><span>🧘 Antrenman Sonrası</span><span class="divider-line"></span></div>';
    day.postWorkout.forEach(function(ex) { html += buildExerciseCardHTML(activeWeekday, ex, true); });
  }

  exerciseCardsListEl.innerHTML = html;
  initAnatomyPanels(exerciseCardsListEl);
  finishBtn.classList.remove('hidden');
}

document.getElementById('finishWorkoutBtn').addEventListener('click', function() {
  var day = getDay(activeWeekday);
  var allEx = (day.exercises || []).concat(day.postWorkout || []);
  var anyChecked = allEx.some(function(ex) { return ex.checked && ex.checked.some(Boolean); });

  var msg;
  if (anyChecked) {
    msg = '"' + activeWeekday + '" antrenmanını bitiriyorsun. İşaretlediğin setler (ağırlık/tekrar) geçmişe kaydedilecek ve ilerleme takibinde kullanılacak. Onaylıyor musun?';
  } else {
    msg = 'Henüz hiç set işaretlemedin. Yine de tüm hareketleri tamamlanmış say ve geçmişe kaydet? (Ağırlık girmediğin setler ağırlıksız kaydedilir.)';
  }
  var confirmed = window.confirm(msg);
  if (!confirmed) return;

  var daysMap = getWorkoutDaysMap();
  var dayRef = daysMap[activeWeekday];
  if (!dayRef) return;

  // Hiç set işaretlenmemişse hepsini tamamlanmış say
  if (!anyChecked) {
    (dayRef.exercises || []).forEach(function(ex) { ex.checked = new Array(ex.sets).fill(true); });
    (dayRef.postWorkout || []).forEach(function(ex) { ex.checked = new Array(ex.sets).fill(true); });
    saveWorkoutDaysMap(daysMap);
  }

  // Geçmişe kaydet
  saveSessionToHistory(activeWeekday);

  // Bir sonraki antrenman için setleri sıfırla (plan kalır, işaretler/ağırlıklar temizlenir)
  var finalMap = getWorkoutDaysMap();
  var dayReset = finalMap[activeWeekday];
  (dayReset.exercises || []).forEach(function(ex) {
    ex.checked = new Array(ex.sets).fill(false);
    ex.weights = new Array(ex.sets).fill('');
  });
  (dayReset.postWorkout || []).forEach(function(ex) {
    ex.checked = new Array(ex.sets).fill(false);
    ex.weights = new Array(ex.sets).fill('');
  });
  saveWorkoutDaysMap(finalMap);

  alert('✅ Antrenman kaydedildi! İlerlemeni "Analiz" sayfasından takip edebilirsin.');
  renderWorkoutTracking();
});


exerciseCardsListEl.addEventListener('click', function(e) {
  if (handleAnatomyViewToggle(e.target)) return;

  var removeBtn = e.target.closest('.exercise-card-remove');
  if (removeBtn) {
    var weekday = removeBtn.dataset.weekday;
    var exId = removeBtn.dataset.id;
    var isPost = removeBtn.dataset.post === '1';
    var daysMap = getWorkoutDaysMap();
    var day = daysMap[weekday];
    if (day) {
      if (isPost) {
        day.postWorkout = (day.postWorkout || []).filter(function(x) { return x.id !== exId; });
      } else {
        day.exercises = day.exercises.filter(function(x) { return x.id !== exId; });
      }
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
  var isPost = e.target.dataset.post === '1';

  var daysMap = getWorkoutDaysMap();
  var day = daysMap[weekday];
  if (!day) return;
  var list = isPost ? (day.postWorkout || []) : day.exercises;
  var ex = list.find(function(x) { return x.id === exId; });
  if (!ex) return;

  ex.checked[idx] = e.target.checked;
  saveWorkoutDaysMap(daysMap);

  var visual = e.target.nextElementSibling;
  visual.textContent = e.target.checked ? '✓' : '';

  var row = e.target.closest('.set-row');
  if (row) row.classList.toggle('done', e.target.checked);

  var card = e.target.closest('.exercise-card');
  card.classList.toggle('completed', ex.checked.every(Boolean));

  renderDayProgress();
  renderOverallProgress();
});

// Ağırlık girişi (kg) — yazıldıkça kaydet
exerciseCardsListEl.addEventListener('input', function(e) {
  if (!e.target.classList.contains('set-weight-input')) return;

  var weekday = e.target.dataset.weekday;
  var exId = e.target.dataset.id;
  var idx = parseInt(e.target.dataset.index, 10);
  var isPost = e.target.dataset.post === '1';

  var daysMap = getWorkoutDaysMap();
  var day = daysMap[weekday];
  if (!day) return;
  var list = isPost ? (day.postWorkout || []) : day.exercises;
  var ex = list.find(function(x) { return x.id === exId; });
  if (!ex) return;

  if (!ex.weights) ex.weights = new Array(ex.sets).fill('');
  ex.weights[idx] = e.target.value;
  saveWorkoutDaysMap(daysMap);
});

/* ══════════════════════════════════════════
   ANTRENMAN GEÇMİŞİ (History) + SON PERFORMANS
   Bir gün "Antrenmanı Tamamla" ile bitince o günün her
   hareketinin ağırlık/tekrar verisi tarih damgasıyla saklanır.
   ══════════════════════════════════════════ */

var HISTORY_KEY = 'ft_workout_history';

function getWorkoutHistory() { return getJSON(HISTORY_KEY, []); }
function saveWorkoutHistory(h) { setJSON(HISTORY_KEY, h); }

// Bir hareketin en son kaydedilen performansını (özet metin + veri) döndürür
function getLastPerformance(exerciseName) {
  var history = getWorkoutHistory();
  for (var i = history.length - 1; i >= 0; i--) {
    var session = history[i];
    var found = (session.exercises || []).find(function(e) { return e.name === exerciseName; });
    if (found && found.sets && found.sets.length) {
      var parts = found.sets.map(function(s) {
        return (s.weight ? s.weight + 'kg' : '—') + '×' + s.reps;
      });
      return { summary: parts.join(', '), date: session.date, sets: found.sets };
    }
  }
  return null;
}

// Bugünün aktif gününü geçmişe kaydeder (tamamlanmış hareketleri)
function saveSessionToHistory(weekday) {
  var day = getDay(weekday);
  var allEx = (day.exercises || []).concat(day.postWorkout || []);

  var recorded = [];
  allEx.forEach(function(ex) {
    var sets = [];
    for (var i = 0; i < ex.sets; i++) {
      if (ex.checked && ex.checked[i]) {
        sets.push({
          weight: (ex.weights && ex.weights[i]) ? parseFloat(ex.weights[i]) || 0 : 0,
          reps: ex.reps
        });
      }
    }
    if (sets.length > 0) {
      recorded.push({ name: ex.name, muscle: ex.muscle, sets: sets });
    }
  });

  if (recorded.length === 0) return;

  var history = getWorkoutHistory();
  history.push({
    date: getTodayKey(),
    weekday: weekday,
    title: day.title || '',
    exercises: recorded
  });
  saveWorkoutHistory(history);
}

/* ══════════════════════════════════════════
   ANALİZ: SÜREKLİLİK + GÜÇ İLERLEMESİ GRAFİĞİ
   ══════════════════════════════════════════ */


function renderConsistency() {
  var history = getWorkoutHistory();
  var emptyEl = document.getElementById('consistency-empty');

  if (history.length === 0) {
    document.getElementById('stat-week-workouts').textContent = '0';
    document.getElementById('stat-month-workouts').textContent = '0';
    document.getElementById('stat-streak').textContent = '0';
    setStreakPill(0);
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');

  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Bu haftanın başlangıcı (Pazartesi)
  var dayOfWeek = (today.getDay() + 6) % 7; // Pzt=0
  var weekStart = new Date(today); weekStart.setDate(today.getDate() - dayOfWeek);
  var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  var weekCount = 0, monthCount = 0;
  var workoutDates = {};

  history.forEach(function(session) {
    var d = parseDateKey(session.date);
    if (!d) return;
    workoutDates[session.date] = true;
    if (d >= weekStart) weekCount++;
    if (d >= monthStart) monthCount++;
  });

  // Seri (streak): bugünden veya dünden geriye doğru kesintisiz antrenman günleri
  var streak = 0;
  var cursor = new Date(today);
  function keyOf(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Bugün antrenman yoksa dünden başla
  if (!workoutDates[keyOf(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (workoutDates[keyOf(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  document.getElementById('stat-week-workouts').textContent = weekCount;
  document.getElementById('stat-month-workouts').textContent = monthCount;
  document.getElementById('stat-streak').textContent = streak;
  setStreakPill(streak);
}

// Başlıktaki seri rozeti — seri yoksa hiç görünmez
function setStreakPill(streak) {
  var pill = document.getElementById('streakPill');
  if (!pill) return;
  pill.classList.toggle('hidden', !streak);
  if (streak) document.getElementById('streakPillText').textContent = streak + ' günlük seri';
}

var strengthChartInstance = null;

function renderStrengthSection() {
  var history = getWorkoutHistory();
  var emptyEl = document.getElementById('strength-empty');
  var selectGroup = document.getElementById('strength-select-group');
  var summaryEl = document.getElementById('strength-summary');
  var select = document.getElementById('strength-exercise-select');

  // Geçmişte en az bir kez ağırlık girilmiş hareketleri topla
  var exerciseNames = {};
  history.forEach(function(session) {
    (session.exercises || []).forEach(function(ex) {
      var maxW = Math.max.apply(null, ex.sets.map(function(s) { return s.weight || 0; }));
      if (maxW > 0) exerciseNames[ex.name] = true;
    });
  });
  var names = Object.keys(exerciseNames);

  if (names.length === 0) {
    emptyEl.classList.remove('hidden');
    selectGroup.classList.add('hidden');
    summaryEl.innerHTML = '';
    if (strengthChartInstance) { strengthChartInstance.destroy(); strengthChartInstance = null; }
    return;
  }
  emptyEl.classList.add('hidden');
  selectGroup.classList.remove('hidden');

  // Seçim listesini doldur (önceki seçimi koru)
  var prev = select.value;
  select.innerHTML = names.map(function(n) { return '<option value="' + escapeHtml(n) + '">' + escapeHtml(n) + '</option>'; }).join('');
  if (names.indexOf(prev) !== -1) select.value = prev;

  drawStrengthChart(select.value);
}

function drawStrengthChart(exerciseName) {
  var history = getWorkoutHistory();
  var points = [];

  history.forEach(function(session) {
    var ex = (session.exercises || []).find(function(e) { return e.name === exerciseName; });
    if (!ex) return;
    var maxW = Math.max.apply(null, ex.sets.map(function(s) { return s.weight || 0; }));
    if (maxW > 0) {
      points.push({ date: session.date, weight: maxW });
    }
  });

  if (points.length === 0) return;

  var labels = points.map(function(p) {
    var d = parseDateKey(p.date);
    return d ? (d.getDate() + '/' + (d.getMonth() + 1)) : p.date;
  });
  var data = points.map(function(p) { return p.weight; });

  var ctx = document.getElementById('strengthChart').getContext('2d');
  if (strengthChartInstance) strengthChartInstance.destroy();
  // updateChart aynı korumayı taşıyor: Chart.js gelmediyse sayfa çökmesin
  if (typeof Chart === 'undefined') { console.warn('[Chart.js] yüklenemedi.'); return; }

  strengthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: exerciseName + ' (en yüksek kg)',
        data: data,
        borderColor: temaRengi('accent'),
        backgroundColor: temaRengi('chart-fill'),
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: temaRengi('accent'),
        tension: 0.25,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: temaRengi('text-muted') } } },
      scales: {
        x: { ticks: { color: temaRengi('text-muted') }, grid: { color: temaRengi('grid') } },
        y: { ticks: { color: temaRengi('text-muted') }, grid: { color: temaRengi('grid') } }
      }
    }
  });

  // Özet: ilk → son değişim
  var first = data[0], last = data[data.length - 1];
  var diff = last - first;
  var summaryEl = document.getElementById('strength-summary');
  if (data.length >= 2 && diff !== 0) {
    var arrow = diff > 0 ? '📈' : '📉';
    var sign = diff > 0 ? '+' : '';
    summaryEl.innerHTML = arrow + ' İlk kayıt: <strong>' + first + 'kg</strong> → Son: <strong>' + last + 'kg</strong> (' + sign + diff + 'kg)';
  } else {
    summaryEl.innerHTML = 'Toplam ' + data.length + ' kayıt. En yüksek: <strong>' + Math.max.apply(null, data) + 'kg</strong>';
  }
}

document.getElementById('strength-exercise-select').addEventListener('change', function() {
  drawStrengthChart(this.value);
});

/* ══════════════════════════════════════════
   AKTİVİTE TAKVİMİ
   Antrenman geçmişi + tartım kayıtlarını aylık gösterir.
   ══════════════════════════════════════════ */

var MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

var calViewDate = new Date();

function buildActivityMap() {
  var map = {}; // 'YYYY-MM-DD' -> { workout: [...], weight: number }

  getWorkoutHistory().forEach(function(session) {
    if (!map[session.date]) map[session.date] = {};
    if (!map[session.date].workouts) map[session.date].workouts = [];
    map[session.date].workouts.push(session);
  });

  getWeighIns().forEach(function(w) {
    if (!w.date) return;
    if (!map[w.date]) map[w.date] = {};
    map[w.date].weight = w.weight;
  });

  return map;
}

function renderCalendar() {
  var grid = document.getElementById('calendarGrid');
  var title = document.getElementById('calendar-title');
  if (!grid) return;

  var year = calViewDate.getFullYear();
  var month = calViewDate.getMonth();
  title.textContent = MONTHS_TR[month] + ' ' + year;

  var activityMap = buildActivityMap();
  var firstDay = new Date(year, month, 1);
  var startOffset = (firstDay.getDay() + 6) % 7; // Pzt=0
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var todayKey = getTodayKey();

  var html = '';
  for (var i = 0; i < startOffset; i++) {
    html += '<div class="cal-cell empty"></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var key = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var act = activityMap[key];
    var classes = 'cal-cell';
    if (key === todayKey) classes += ' today';
    if (act) classes += ' has-activity';

    var dots = '';
    if (act) {
      if (act.workouts && act.workouts.length) dots += '<span class="cal-dot cal-workout"></span>';
      if (act.weight != null) dots += '<span class="cal-dot cal-weight"></span>';
    }

    html += '<div class="' + classes + '" data-date="' + key + '"><span>' + d + '</span><span class="cal-dots">' + dots + '</span></div>';
  }

  grid.innerHTML = html;
  document.getElementById('calendarDayDetail').classList.add('hidden');
}

document.getElementById('calPrevBtn').addEventListener('click', function() {
  calViewDate.setMonth(calViewDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('calNextBtn').addEventListener('click', function() {
  calViewDate.setMonth(calViewDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById('calendarGrid').addEventListener('click', function(e) {
  var cell = e.target.closest('.cal-cell.has-activity');
  if (!cell) return;
  var key = cell.dataset.date;
  var activityMap = buildActivityMap();
  var act = activityMap[key];
  if (!act) return;

  var detail = document.getElementById('calendarDayDetail');
  var html = '<p class="calendar-day-detail-title">' + formatDateTR(key) + '</p>';

  if (act.workouts && act.workouts.length) {
    act.workouts.forEach(function(session) {
      html += '🏋️ <strong>' + escapeHtml(session.title || session.weekday || 'Antrenman') + '</strong><br>';
      (session.exercises || []).forEach(function(ex) {
        var best = Math.max.apply(null, ex.sets.map(function(s) { return s.weight || 0; }));
        var setInfo = ex.sets.length + ' set' + (best > 0 ? ' · en yüksek ' + best + 'kg' : '');
        html += '&nbsp;&nbsp;• ' + escapeHtml(ex.name) + ' (' + setInfo + ')<br>';
      });
    });
  }
  if (act.weight != null) {
    html += '⚖️ Tartım: <strong>' + escapeHtml(act.weight) + ' kg</strong><br>';
  }

  detail.innerHTML = html;
  detail.classList.remove('hidden');
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
   BESLENME PLANI — YEREL TÜRK MUTFAĞI VERİTABANI + AI TAHMİN
   Open Food Facts yerine: internetsiz çalışan yerel veritabanı +
   listede olmayan gıdalar için Gemini API ile tahmini değer.
   Tüm değerler 100 gram baz alınır, girilen grama göre ölçeklenir.
   ══════════════════════════════════════════ */


function getMealPlan() { return getJSON(MEAL_KEYS.plan, {}); }
function saveMealPlan(plan) { setJSON(MEAL_KEYS.plan, plan); }

// (name, kcal100, protein100, carbs100, fat100) — genel beslenme kaynaklarından, 100g için
var TURKISH_FOODS = {
  'Tahıllar / Karbonhidrat': [
    { name: 'Pirinç (pişmiş)', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    { name: 'Bulgur (pişmiş)', kcal: 83, protein: 3.1, carbs: 18.6, fat: 0.2 },
    { name: 'Yulaf Ezmesi (çiğ)', kcal: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
    { name: 'Makarna (pişmiş)', kcal: 131, protein: 5, carbs: 25, fat: 1.1 },
    { name: 'Ekmek (beyaz)', kcal: 265, protein: 9, carbs: 49, fat: 3.2 },
    { name: 'Tam Buğday Ekmeği', kcal: 247, protein: 13, carbs: 41, fat: 3.4 },
    { name: 'Karabuğday (pişmiş)', kcal: 92, protein: 3.4, carbs: 19.9, fat: 0.6 },
    { name: 'Tatlı Patates (haşlanmış)', kcal: 76, protein: 1.4, carbs: 17.7, fat: 0.1 },
    { name: 'Patates (haşlanmış)', kcal: 87, protein: 1.9, carbs: 20.1, fat: 0.1 },
    { name: 'Basmati Pirinç (pişmiş)', kcal: 121, protein: 2.5, carbs: 25.2, fat: 0.4 },
    { name: 'Pirinç Pilavı (tereyağlı)', kcal: 165, protein: 2.5, carbs: 28, fat: 4 },
    { name: 'Bulgur Pilavı (yağlı)', kcal: 128, protein: 3.2, carbs: 19, fat: 3.8 }
  ],
  'Et, Tavuk, Balık, Yumurta': [
    { name: 'Tavuk Göğsü (ızgara/haşlama)', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
    { name: 'Hindi Göğsü', kcal: 135, protein: 30, carbs: 0, fat: 1 },
    { name: 'Yağsız Kıyma (%5)', kcal: 137, protein: 21, carbs: 0, fat: 5 },
    { name: 'Dana Bonfile', kcal: 143, protein: 26, carbs: 0, fat: 4 },
    { name: 'Somon (pişmiş)', kcal: 208, protein: 20, carbs: 0, fat: 13 },
    { name: 'Levrek', kcal: 97, protein: 18.4, carbs: 0, fat: 2.5 },
    { name: 'Ton Balığı (suda, süzülmüş)', kcal: 116, protein: 26, carbs: 0, fat: 1 },
    // Yumurta boyla ölçülüyor: listeyi altı satırla şişirmemek için tek satır
    // duruyor, seçilince boy ayrı pencereden soruluyor.
    // TS/AB boy sınıfları (S<53g, M 53-63g, L 63-73g — kabuk dahil); buradaki
    // gramaj kabuğu çıkarılmış ortalama yenilebilir ağırlık (kabuk ~%12).
    // Ak, yenilebilir kısmın ~%65'i; kalanı sarı.
    { name: 'Yumurta (tam)', kcal: 155, protein: 13, carbs: 1.1, fat: 11,
      boylar: { S: 44, M: 51, L: 60 } },
    { name: 'Yumurta Akı', kcal: 52, protein: 11, carbs: 0.7, fat: 0.2,
      boylar: { S: 29, M: 33, L: 39 } }
  ],
  'Süt Ürünleri': [
    { name: 'Lor Peyniri', kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 },
    { name: 'Yoğurt (sade, tam yağlı)', kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 },
    { name: 'Süzme Yoğurt (Quark)', kcal: 65, protein: 10, carbs: 3.6, fat: 0.2 },
    { name: 'Süt (tam yağlı)', kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
    { name: 'Beyaz Peynir', kcal: 264, protein: 17, carbs: 1.5, fat: 21 },
    { name: 'Kaşar Peyniri', kcal: 371, protein: 25, carbs: 1.5, fat: 29 },
    { name: 'Whey Protein Tozu', kcal: 380, protein: 80, carbs: 8, fat: 4 }
  ],
  'Sebze': [
    { name: 'Brokoli (haşlanmış)', kcal: 35, protein: 2.4, carbs: 7.2, fat: 0.4 },
    { name: 'Karnabahar (haşlanmış)', kcal: 23, protein: 1.8, carbs: 4.1, fat: 0.5 },
    { name: 'Domates', kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
    { name: 'Salatalık', kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
    { name: 'Marul', kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
    { name: 'Ispanak (haşlanmış)', kcal: 23, protein: 3, carbs: 3.6, fat: 0.3 },
    { name: 'Kabak (haşlanmış)', kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
    { name: 'Roka', kcal: 25, protein: 2.6, carbs: 3.7, fat: 0.7 },
    { name: 'Kuşkonmaz', kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1 }
  ],
  'Meyve': [
    { name: 'Elma', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    { name: 'Muz', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    { name: 'Yaban Mersini', kcal: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
    { name: 'Portakal', kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 },
    { name: 'Orman Meyvesi Karışımı', kcal: 50, protein: 0.8, carbs: 12, fat: 0.3 }
  ],
  'Kuruyemiş / Yağlar': [
    { name: 'Çiğ Badem', kcal: 579, protein: 21, carbs: 22, fat: 50 },
    { name: 'Ceviz', kcal: 654, protein: 15, carbs: 14, fat: 65 },
    { name: 'Zeytinyağı', kcal: 884, protein: 0, carbs: 0, fat: 100 },
    { name: 'Fıstık Ezmesi', kcal: 588, protein: 25, carbs: 20, fat: 50 }
  ],
  'Bakliyat': [
    { name: 'Mercimek (pişmiş)', kcal: 116, protein: 9, carbs: 20, fat: 0.4 },
    { name: 'Nohut (pişmiş)', kcal: 164, protein: 8.9, carbs: 27.4, fat: 2.6 }
  ]
};

// ── DOM REFERANSLARI ────────────────────────────
var mealSelect          = document.getElementById('meal-select');
var foodSelect           = document.getElementById('food-select');
var customFoodGroup      = document.getElementById('custom-food-group');
var customFoodNameInput  = document.getElementById('custom-food-name');
var aiEstimateBtn        = document.getElementById('aiEstimateBtn');
var aiEstimateStatus     = document.getElementById('aiEstimateStatus');
var foodAmountInput      = document.getElementById('food-amount');
var mealFoodPreview      = document.getElementById('mealFoodPreview');
var addFoodToCartBtn     = document.getElementById('addFoodToCartBtn');
var mealCartListEl       = document.getElementById('mealCartList');
var completeMealBtn      = document.getElementById('completeMealBtn');
var mealPlanListEl       = document.getElementById('mealPlanList');

var mealCartItems = [];
var currentFoodMeta = null; // { kcal100, protein100, carbs100, fat100, isEstimated, birim }
var currentFoodAdi = '';    // sepete yazılacak ad — boylu gıdalarda "Yumurta Akı (L)"
var sonGidaSecimi = '';     // boy penceresi iptal edilirse geri dönülecek seçim
var gidaBirimAktif = false; // miktar alanı şu an adet mi (true) gram mı (false) sayıyor

// ── GIDA SEÇİM LİSTESİNİ DOLDUR ──────────────────
function fillFoodSelect() {
  var html = '';
  Object.keys(TURKISH_FOODS).forEach(function(category) {
    html += '<optgroup label="' + escapeHtml(category) + '">';
    TURKISH_FOODS[category].forEach(function(f) {
      html += '<option value="' + escapeHtml(f.name) + '">' + escapeHtml(f.name) + '</option>';
    });
    html += '</optgroup>';
  });
  html += '<option value="__custom__">🔍 Listede Yok — Veritabanında Ara</option>';
  foodSelect.innerHTML = html;
}

function findLocalFood(name) {
  var all = [];
  Object.keys(TURKISH_FOODS).forEach(function(cat) { all = all.concat(TURKISH_FOODS[cat]); });
  return all.find(function(f) { return f.name === name; });
}

/* Miktar alanına girilen sayıyı grama çevirir.
   Birimsiz gıdalarda sayı zaten gramdır; adet bazlılarda adet × birim ağırlığı. */
function porsiyonGrami(meta, miktar) {
  return (meta && meta.birim) ? miktar * meta.birim.gram : miktar;
}

/* Sepette ve planda porsiyonu okunur biçimde yazar: "2 adet (120 g)" ya da "150 g". */
function porsiyonMetni(item) {
  if (item.birimAd && item.birimAdet) {
    return item.birimAdet + ' ' + item.birimAd + ' (' + Math.round(item.grams) + ' g)';
  }
  return item.grams + ' g';
}

/* Seçilen gıda adet bazlıysa miktar alanını adede, değilse grama ayarlar.
   Birim tipi değiştiğinde varsayılan değeri de tazeler (1 adet / 100 gram). */
function gidaMiktarAlaniniAyarla() {
  var birim = currentFoodMeta && currentFoodMeta.birim;
  var etiket = document.querySelector('label[for="food-amount"]');
  var aralik = birim ? SAYI_ARALIK.foodAdet : SAYI_ARALIK.foodAmount;

  if (etiket) etiket.textContent = 'Miktar (' + (birim ? birim.ad : 'gram') + ')';
  foodAmountInput.min = aralik.min;
  foodAmountInput.max = aralik.max;

  if (gidaBirimAktif !== !!birim) {
    foodAmountInput.value = birim ? 1 : 100;
    gidaBirimAktif = !!birim;
  }
}

/* Seçici hangi aralığı göstersin — gıda değiştikçe değişir, o yüzden fonksiyon. */
function gidaMiktarTuru() {
  return (currentFoodMeta && currentFoodMeta.birim) ? 'foodAdet' : 'foodAmount';
}

/* ── YUMURTA BOYU PENCERESİ ──
   Yumurta listede tek satır duruyor; boy burada seçiliyor. Son seçilen boy
   hatırlanıyor, bir dahakine o işaretli geliyor. */
var boySeciciEl    = document.getElementById('boySecici');
var boySeceneklerEl = document.getElementById('boySecenekler');
var BOY_ADI = { S: 'Küçük', M: 'Orta', L: 'Büyük' };

function sonBoy() {
  var b = localStorage.getItem(YUMURTA_BOY_KEY);
  return (b === 'S' || b === 'M' || b === 'L') ? b : 'M';
}

function boySecicisiKapat() {
  boySeciciEl.classList.add('hidden');
}

/* gida: boylar tablosu olan kayıt. onayla(boy) seçim yapılınca, iptal() kapanınca. */
function boySecicisiAc(gida, onayla, iptal) {
  document.getElementById('boyBaslik').textContent = gida.name + ' — boy';
  document.getElementById('boyAciklama').textContent =
    'Standart boy sınıflarına göre ortalama ağırlık (kabuk hariç).';

  var secili = sonBoy();
  var html = '';
  Object.keys(gida.boylar).forEach(function(boy) {
    html +=
      '<button type="button" class="boy-dugme' + (boy === secili ? ' secili' : '') + '" data-boy="' + boy + '">' +
        '<span class="boy-dugme-ad">' + boy + ' — ' + BOY_ADI[boy] + '</span>' +
        '<span class="boy-dugme-gram">' + gida.boylar[boy] + ' g</span>' +
        (boy === secili ? '<span class="boy-dugme-son">son</span>' : '') +
      '</button>';
  });
  boySeceneklerEl.innerHTML = html;

  boySeceneklerEl.onclick = function(e) {
    var d = e.target.closest('.boy-dugme');
    if (!d) return;
    var boy = d.dataset.boy;
    try { localStorage.setItem(YUMURTA_BOY_KEY, boy); } catch (err) {}
    boySecicisiKapat();
    onayla(boy);
  };

  var kapat = function() { boySecicisiKapat(); if (iptal) iptal(); };
  document.getElementById('boyKapat').onclick = kapat;
  boySeciciEl.onclick = function(e) { if (e.target === boySeciciEl) kapat(); };

  boySeciciEl.classList.remove('hidden');
}

function updateMealPreview() {
  var miktar = parseFloat(foodAmountInput.value) || 0;
  var grams = porsiyonGrami(currentFoodMeta, miktar);

  if (!currentFoodMeta || miktar <= 0 || grams <= 0) {
    mealFoodPreview.innerHTML = 'Önce bir gıda seç';
    addFoodToCartBtn.disabled = true;
    return;
  }

  var factor = grams / 100;
  var kcal = Math.round(currentFoodMeta.kcal100 * factor);
  var protein = (currentFoodMeta.protein100 * factor).toFixed(1);
  var carbs = (currentFoodMeta.carbs100 * factor).toFixed(1);
  var fat = (currentFoodMeta.fat100 * factor).toFixed(1);
  var badge = currentFoodMeta.isEstimated ? '<span class="estimated-badge">~ Tahmini</span>' : '';

  var porsiyon = currentFoodMeta.birim
    ? miktar + ' ' + currentFoodMeta.birim.ad + ' ≈ ' + Math.round(grams) + ' g · '
    : '';

  mealFoodPreview.innerHTML =
    '<strong>' + kcal + ' kcal</strong>' + badge + '<br>' +
    'Protein: ' + protein + 'g · Karbonhidrat: ' + carbs + 'g · Yağ: ' + fat + 'g<br>' +
    escapeHtml(porsiyon) + '100g için: ' + currentFoodMeta.kcal100 + ' kcal';
  addFoodToCartBtn.disabled = false;
}

/* Seçilen gıdayı (varsa boyuyla birlikte) etkin hale getirir. */
function gidayiKur(found, boy) {
  if (!found) { currentFoodMeta = null; currentFoodAdi = ''; }
  else {
    currentFoodMeta = {
      kcal100: found.kcal, protein100: found.protein, carbs100: found.carbs, fat100: found.fat,
      isEstimated: false,
      birim: boy ? { ad: 'adet', gram: found.boylar[boy] } : (found.birim || null)
    };
    currentFoodAdi = boy ? found.name + ' (' + boy + ')' : found.name;
  }
  gidaMiktarAlaniniAyarla();
  updateMealPreview();
}

foodSelect.addEventListener('change', function() {
  if (foodSelect.value === '__custom__') {
    customFoodGroup.classList.remove('hidden');
    customFoodNameInput.value = '';
    usdaSearchStatus.classList.add('hidden');
    aiEstimateStatus.classList.add('hidden');
    aiEstimateBtn.classList.add('hidden');
    usdaResultsListEl.innerHTML = '';
    currentFoodMeta = null;
    currentFoodAdi = '';
    sonGidaSecimi = foodSelect.value;
    gidaMiktarAlaniniAyarla();
    updateMealPreview();
    return;
  }
  customFoodGroup.classList.add('hidden');
  var found = findLocalFood(foodSelect.value);

  if (found && found.boylar) {
    // Boy seçilene kadar gıdayı belirlemiyoruz; iptal edilirse önceki seçime dönülür
    boySecicisiAc(found, function(boy) {
      sonGidaSecimi = foodSelect.value;
      gidayiKur(found, boy);
    }, function() {
      foodSelect.value = sonGidaSecimi;
    });
    return;
  }

  sonGidaSecimi = foodSelect.value;
  gidayiKur(found, null);
});

foodAmountInput.addEventListener('input', updateMealPreview);

// ── USDA FOODDATA CENTRAL ARAMA (gerçek, resmi veritabanı) ──
// DEMO_KEY: kayıt gerektirmeyen, paylaşılan, saatte 30 istekle sınırlı anahtar.
// Türkçe gıda adı önce Gemini ile İngilizceye çevrilir, sonra USDA'da aranır.
var usdaSearchBtn      = document.getElementById('usdaSearchBtn');
var usdaSearchStatus   = document.getElementById('usdaSearchStatus');
var usdaResultsListEl  = document.getElementById('usdaResultsList');

function buildFoodTranslatePrompt(turkishName) {
  return (
    'Şu Türkçe gıda/yemek adını, bir besin veritabanında aranabilecek en basit ve yaygın İngilizce terime çevir. ' +
    'SADECE İngilizce terimi yaz — tırnak işareti, açıklama veya başka hiçbir şey ekleme.\n' +
    'Örnekler: "tavuk göğsü" -> chicken breast, "pilav" -> rice, "yulaf ezmesi" -> oats.\n' +
    'Gıda: "' + turkishName + '"'
  );
}

function searchUSDAFood(englishTerm) {
  var url = 'https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=' +
    encodeURIComponent(englishTerm) + '&pageSize=8&dataType=' + encodeURIComponent('Foundation,SR Legacy,Branded');

  return fetch(url).then(function(res) {
    if (!res.ok) throw new Error('USDA veritabanı isteği başarısız (HTTP ' + res.status + ')');
    return res.json();
  }).then(function(data) { return data.foods || []; });
}

function extractUSDAMacros(food) {
  var nutrients = food.foodNutrients || [];
  function find(ids) {
    for (var i = 0; i < ids.length; i++) {
      var n = nutrients.find(function(x) { return x.nutrientId === ids[i]; });
      if (n && typeof n.value === 'number') return n.value;
    }
    return 0;
  }
  return {
    kcal100: find([1008, 2047, 2048]),
    protein100: find([1003]),
    carbs100: find([1005]),
    fat100: find([1004])
  };
}

function renderUSDAResults(foods) {
  var html = '';
  foods.forEach(function(food, idx) {
    var macros = extractUSDAMacros(food);
    html +=
      '<div class="usda-result-item" data-idx="' + idx + '">' +
        '<p class="usda-result-name">' + escapeHtml(food.description) + '</p>' +
        '<p class="usda-result-meta">' + Math.round(macros.kcal100) + ' kcal / 100g · ' + escapeHtml(food.dataType) + '</p>' +
      '</div>';
  });
  usdaResultsListEl.innerHTML = html;
  usdaResultsListEl._foods = foods;
}

usdaResultsListEl.addEventListener('click', function(e) {
  var item = e.target.closest('.usda-result-item');
  if (!item) return;
  var idx = parseInt(item.dataset.idx, 10);
  var food = usdaResultsListEl._foods[idx];
  var macros = extractUSDAMacros(food);

  currentFoodMeta = {
    kcal100: macros.kcal100,
    protein100: macros.protein100,
    carbs100: macros.carbs100,
    fat100: macros.fat100,
    isEstimated: false
  };

  usdaResultsListEl.querySelectorAll('.usda-result-item').forEach(function(el) { el.classList.remove('selected'); });
  item.classList.add('selected');
  updateMealPreview();
});

usdaSearchBtn.addEventListener('click', function() {
  var turkishName = customFoodNameInput.value.trim();
  if (!turkishName) {
    usdaSearchStatus.textContent = '⚠️ Önce gıda adı yaz.';
    usdaSearchStatus.classList.remove('hidden');
    return;
  }
  if (!getGeminiKey()) {
    alert('Önce "Kişisel Bilgiler" sayfasından Gemini API anahtarını kaydetmelisin.');
    showPage('profile');
    closeMenu();
    return;
  }

  usdaSearchStatus.textContent = '🔍 Çevriliyor ve veritabanında aranıyor…';
  usdaSearchStatus.classList.remove('hidden');
  usdaResultsListEl.innerHTML = '';
  aiEstimateBtn.classList.add('hidden');
  aiEstimateStatus.classList.add('hidden');
  usdaSearchBtn.disabled = true;

  callGeminiAPI(buildFoodTranslatePrompt(turkishName), getGeminiKey())
    .then(function(englishTerm) {
      var cleanTerm = englishTerm.trim().replace(/^["']|["']$/g, '');
      return searchUSDAFood(cleanTerm);
    })
    .then(function(foods) {
      if (foods.length === 0) {
        usdaSearchStatus.textContent = '⚠️ Veritabanında bulunamadı.';
        aiEstimateBtn.classList.remove('hidden');
        return;
      }
      usdaSearchStatus.classList.add('hidden');
      renderUSDAResults(foods);
    })
    .catch(function(err) {
      console.warn('[USDA Arama] Hata:', err);
      usdaSearchStatus.textContent = '⚠️ Arama başarısız: ' + (err && err.message ? err.message : 'bilinmeyen hata');
      aiEstimateBtn.classList.remove('hidden');
    })
    .finally(function() {
      usdaSearchBtn.disabled = false;
    });
});

// ── AI İLE TAHMİNİ DEĞER ALMA (son çare — USDA'da da bulunamazsa) ──
function buildNutritionEstimatePrompt(foodName) {
  return (
    'Şu gıdanın 100 gramındaki YAKLAŞIK besin değerlerini tahmin et: "' + foodName + '". ' +
    'SADECE geçerli JSON formatında yanıt ver, başka hiçbir açıklama ekleme.\n' +
    'Format: {"kcal": 150, "protein": 10, "carbs": 20, "fat": 5}\n' +
    'Değerler 100 gram için sayısal olmalı.'
  );
}

aiEstimateBtn.addEventListener('click', function() {
  var foodName = customFoodNameInput.value.trim();
  if (!foodName) {
    aiEstimateStatus.textContent = '⚠️ Önce gıda adı yaz.';
    aiEstimateStatus.classList.remove('hidden');
    return;
  }
  if (!getGeminiKey()) {
    alert('Önce "Kişisel Bilgiler" sayfasından Gemini API anahtarını kaydetmelisin.');
    showPage('profile');
    closeMenu();
    return;
  }

  aiEstimateStatus.textContent = '🤖 AI\'dan tahmini değer alınıyor…';
  aiEstimateStatus.classList.remove('hidden');
  aiEstimateBtn.disabled = true;

  callGeminiAPI(buildNutritionEstimatePrompt(foodName), getGeminiKey())
    .then(function(rawResponse) {
      var parsed = parseAIJson(rawResponse);
      currentFoodMeta = {
        kcal100: parseFloat(parsed.kcal) || 0,
        protein100: parseFloat(parsed.protein) || 0,
        carbs100: parseFloat(parsed.carbs) || 0,
        fat100: parseFloat(parsed.fat) || 0,
        isEstimated: true
      };
      aiEstimateStatus.textContent = '✅ Tahmini değer alındı (100g için ' + currentFoodMeta.kcal100 + ' kcal)';
      updateMealPreview();
    })
    .catch(function(err) {
      console.warn('[Beslenme AI Tahmin] Hata:', err);
      aiEstimateStatus.textContent = '⚠️ ' + (err && err.message ? err.message : 'Tahmin alınamadı.');
      currentFoodMeta = null;
      updateMealPreview();
    })
    .finally(function() {
      aiEstimateBtn.disabled = false;
    });
});

// ── SEPET (ÖĞÜN) MANTIĞI ──────────────────────────
function buildMealCartItemHTML(item, index) {
  var badge = item.isEstimated ? '<span class="estimated-badge">~ Tahmini</span>' : '';
  return (
    '<div class="cart-item" data-cart-id="' + escapeHtml(item.cartId) + '">' +
      '<div class="cart-item-header">' +
        '<span class="cart-item-number">' + (index + 1) + '</span>' +
        '<div class="cart-item-info">' +
          '<p class="cart-item-name">' + escapeHtml(item.name) + badge + '</p>' +
          '<p class="cart-item-meta">' + escapeHtml(item.meal) + ' · ' + escapeHtml(porsiyonMetni(item)) + ' · ' + escapeHtml(item.kcal) + ' kcal</p>' +
        '</div>' +
        '<button type="button" class="cart-item-remove" data-cart-id="' + escapeHtml(item.cartId) + '" title="Sil">✕</button>' +
      '</div>' +
    '</div>'
  );
}

function renderMealCartList() {
  if (mealCartItems.length === 0) {
    mealCartListEl.innerHTML = '<p class="empty-hint">Henüz gıda eklenmedi.</p>';
    return;
  }
  var html = '';
  mealCartItems.forEach(function(item, idx) { html += buildMealCartItemHTML(item, idx); });
  mealCartListEl.innerHTML = html;
}

mealCartListEl.addEventListener('click', function(e) {
  var btn = e.target.closest('.cart-item-remove');
  if (!btn) return;
  mealCartItems = mealCartItems.filter(function(it) { return it.cartId !== btn.dataset.cartId; });
  renderMealCartList();
});

addFoodToCartBtn.addEventListener('click', function() {
  if (!currentFoodMeta) return;
  var birim = currentFoodMeta.birim;
  var miktar = parseFloat(foodAmountInput.value) || (birim ? 1 : 100);
  var grams = porsiyonGrami(currentFoodMeta, miktar);
  var factor = grams / 100;
  var name = foodSelect.value === '__custom__'
    ? customFoodNameInput.value.trim()
    : (currentFoodAdi || foodSelect.value);
  if (!name) return;

  mealCartItems.push({
    cartId: 'meal_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    meal: mealSelect.value,
    name: name,
    grams: grams,
    birimAd: birim ? birim.ad : null,
    birimAdet: birim ? miktar : null,
    kcal100: currentFoodMeta.kcal100,
    protein100: currentFoodMeta.protein100,
    carbs100: currentFoodMeta.carbs100,
    fat100: currentFoodMeta.fat100,
    kcal: Math.round(currentFoodMeta.kcal100 * factor),
    protein: Math.round(currentFoodMeta.protein100 * factor * 10) / 10,
    carbs: Math.round(currentFoodMeta.carbs100 * factor * 10) / 10,
    fat: Math.round(currentFoodMeta.fat100 * factor * 10) / 10,
    isEstimated: !!currentFoodMeta.isEstimated
  });

  renderMealCartList();
});

completeMealBtn.addEventListener('click', function() {
  var feedbackEl = document.getElementById('meal-program-feedback');

  if (mealCartItems.length === 0) {
    feedbackEl.textContent = '⚠️ Sepet boş — önce gıda ekle.';
    showFeedback('meal-program-feedback');
    return;
  }

  var plan = getMealPlan();
  mealCartItems.forEach(function(item) {
    if (!plan[item.meal]) plan[item.meal] = [];
    plan[item.meal].push({
      id: 'food_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: item.name,
      grams: item.grams,
      birimAd: item.birimAd || null,
      birimAdet: item.birimAdet || null,
      kcal100: item.kcal100,
      protein100: item.protein100,
      carbs100: item.carbs100,
      fat100: item.fat100,
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      isEstimated: item.isEstimated
    });
  });
  saveMealPlan(plan);

  mealCartItems = [];
  renderMealCartList();
  mealBuilderSection.classList.add('hidden');
  toggleMealBuilderBtn.classList.remove('open');

  feedbackEl.textContent = '✅ Plana eklendi!';
  showFeedback('meal-program-feedback');

  renderMealPlanView();
});

// ── PLAN GÖRÜNÜMÜ + TOPLAM MAKRO ─────────────────
function renderMealPlanView() {
  var plan = getMealPlan();
  var mealsWithFood = MEAL_ORDER.filter(function(m) { return plan[m] && plan[m].length > 0; });

  if (mealsWithFood.length === 0) {
    mealPlanListEl.innerHTML = '<p class="empty-hint">Henüz bir gıda eklemedin.</p>';
  } else {
    var html = '';
    mealsWithFood.forEach(function(meal) {
      html += '<p class="meal-plan-day-title">' + escapeHtml(meal) + '</p>';
      plan[meal].forEach(function(item) {
        var badge = item.isEstimated ? '<span class="estimated-badge">~ Tahmini</span>' : '';
        html +=
          '<div class="food-log-item">' +
            '<div>' +
              '<p class="food-log-item-name">' + escapeHtml(item.name) + badge + '</p>' +
              '<p class="food-log-item-meta">' + escapeHtml(porsiyonMetni(item)) + ' · P:' + escapeHtml(item.protein) + ' K:' + escapeHtml(item.carbs) + ' Y:' + escapeHtml(item.fat) + '</p>' +
            '</div>' +
            '<span class="food-log-item-kcal">' + escapeHtml(item.kcal) + ' kcal</span>' +
            '<button class="food-log-item-remove" data-meal="' + escapeHtml(meal) + '" data-id="' + escapeHtml(item.id) + '" title="Kaldır">✕</button>' +
          '</div>';
      });
    });
    mealPlanListEl.innerHTML = html;
  }

  var totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  MEAL_ORDER.forEach(function(meal) {
    (plan[meal] || []).forEach(function(item) {
      totals.kcal += item.kcal;
      totals.protein += item.protein;
      totals.carbs += item.carbs;
      totals.fat += item.fat;
    });
  });
  document.getElementById('macro-kcal').textContent = Math.round(totals.kcal);
  document.getElementById('macro-protein').textContent = Math.round(totals.protein);
  document.getElementById('macro-carbs').textContent = Math.round(totals.carbs);
  document.getElementById('macro-fat').textContent = Math.round(totals.fat);
}

mealPlanListEl.addEventListener('click', function(e) {
  var btn = e.target.closest('.food-log-item-remove');
  if (!btn) return;
  var plan = getMealPlan();
  var meal = btn.dataset.meal;
  if (!plan[meal]) return;
  plan[meal] = plan[meal].filter(function(item) { return item.id !== btn.dataset.id; });
  saveMealPlan(plan);
  renderMealPlanView();
});

// ── ÖĞÜN EKLE BARI (açılır/kapanır) ───────────────
var toggleMealBuilderBtn = document.getElementById('toggleMealBuilderBtn');
var mealBuilderSection   = document.getElementById('mealBuilderSection');

toggleMealBuilderBtn.addEventListener('click', function() {
  mealBuilderSection.classList.toggle('hidden');
  toggleMealBuilderBtn.classList.toggle('open', !mealBuilderSection.classList.contains('hidden'));
});

// ── INIT (Beslenme) ─────────────────────────────
fillFoodSelect();
sonGidaSecimi = foodSelect.value;
renderMealCartList();
renderMealPlanView();

/* ══════════════════════════════════════════
   PDF + AI: PROGRAM OTOMATİK AKTARIMI

   pdf.js (metin çıkarma) + Gemini API (AI ayrıştırma)
   Anahtar sadece localStorage'da tutulur, koda hiç yazılmaz.
   ══════════════════════════════════════════ */

var GEMINI_KEY_STORAGE = 'ft_gemini_api_key';
var GEMINI_MODEL = 'gemini-3.6-flash';

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

// ── AI AYARLARI BARI (açılır/kapanır) ─────────────
var toggleAiSettingsBtn = document.getElementById('toggleAiSettingsBtn');
var aiSettingsSection   = document.getElementById('aiSettingsSection');

toggleAiSettingsBtn.addEventListener('click', function() {
  aiSettingsSection.classList.toggle('hidden');
  toggleAiSettingsBtn.classList.toggle('open', !aiSettingsSection.classList.contains('hidden'));
});

/* ══════════════════════════════════════════
   YEDEKLEME / GERİ YÜKLEME (JSON Export/Import)
   Tüm ft_* localStorage anahtarlarını tek dosyaya alır/geri yükler.
   Veri modeli ileride değişse bile bu liste dinamik taranır.
   ══════════════════════════════════════════ */

/* Yedeğe girmeyen cihaz ayarları.

   Gemini anahtarı ve Worker cihaz anahtarı birer kimlik bilgisi. Yedek dosyası
   e-postaya, buluta veya paylaşımlı bir klasöre gidebiliyor; kimlik bilgisi
   taşımamalı.

   Worker adresi tek başına gizli değil ama içe aktarımda engelleniyor: kötü
   niyetli bir yedek adresi kendi sunucusuna çevirebilir, uygulama da bir
   sonraki senkronizasyonda cihaz anahtarını oraya gönderir. */
var CIHAZ_AYARLARI = ['ft_gemini_api_key', 'ft_push_device_key', 'ft_push_server_url'];

function cihazAyariMi(key) { return CIHAZ_AYARLARI.indexOf(key) !== -1; }

// Yedeğe dahil edilecek anahtarlar: ft_ ile başlayan, cihaza özel olmayan her şey
function collectAllFitKeys() {
  var keys = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.indexOf('ft_') === 0 && !cihazAyariMi(k)) keys.push(k);
  }
  return keys;
}

var toggleBackupBtn = document.getElementById('toggleBackupBtn');
var backupSection   = document.getElementById('backupSection');

toggleBackupBtn.addEventListener('click', function() {
  backupSection.classList.toggle('hidden');
  toggleBackupBtn.classList.toggle('open', !backupSection.classList.contains('hidden'));
});

document.getElementById('exportDataBtn').addEventListener('click', function() {
  var data = {};
  collectAllFitKeys().forEach(function(k) {
    data[k] = localStorage.getItem(k);
  });

  var backup = {
    app: 'FitTakip',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: data
  };

  var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  var d = new Date();
  var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  a.href = url;
  a.download = 'fittakip-yedek-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  var fb = document.getElementById('backup-feedback');
  fb.textContent = '✅ Yedek indirildi!';
  showFeedback('backup-feedback');
});

var importDataInput = document.getElementById('importDataInput');
document.getElementById('importDataBtn').addEventListener('click', function() {
  importDataInput.click();
});

importDataInput.addEventListener('change', function() {
  var file = importDataInput.files[0];
  importDataInput.value = '';
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(e) {
    var parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch (err) {
      alert('⚠️ Dosya okunamadı — geçerli bir FitTakip yedek dosyası değil.');
      return;
    }

    if (!parsed || parsed.app !== 'FitTakip' || !parsed.data || typeof parsed.data !== 'object') {
      alert('⚠️ Bu bir FitTakip yedek dosyası gibi görünmüyor. Geri yükleme iptal edildi.');
      return;
    }

    var keyCount = Object.keys(parsed.data).length;
    var dateStr = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('tr-TR') : 'bilinmeyen tarih';
    var confirmed = window.confirm(
      'Bu yedek ' + dateStr + ' tarihli ve ' + keyCount + ' veri kaydı içeriyor.\n\n' +
      'Geri yüklersen MEVCUT tüm verilerinin üzerine yazılacak. Devam edilsin mi?'
    );
    if (!confirmed) return;

    // Önce mevcut ft_ anahtarlarını temizle, sonra yedekten yükle
    collectAllFitKeys().forEach(function(k) { localStorage.removeItem(k); });
    Object.keys(parsed.data).forEach(function(k) {
      // Eski yedekler anahtarları içerebilir; cihaz ayarları hiçbir koşulda
      // dosyadan geri yüklenmez
      if (k.indexOf('ft_') === 0 && !cihazAyariMi(k) && typeof parsed.data[k] === 'string') {
        localStorage.setItem(k, parsed.data[k]);
      }
    });

    alert('✅ Veriler geri yüklendi! Uygulama yeniden yükleniyor.');
    window.location.reload();
  };
  reader.onerror = function() {
    alert('⚠️ Dosya okunurken bir hata oluştu.');
  };
  reader.readAsText(file);
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
    '{"Pazartesi": {"hareketler": [{"hareket": "Bench Press", "set": 3, "tekrar": 10, "not": "Dirsek sabit tut"}], ' +
    '"antrenmanSonrasi": [{"hareket": "Doorway Chest Stretch", "set": 3, "tekrar": 1, "not": "30-40 saniye tut. Göğsü hafif ileri ver."}]}, ' +
    '"Salı": {...}, "kardiyoPlanlamasi": "...", "antrenmanKurallari": "..."}\n\n' +
    'Gün kuralları:\n' +
    '- Gün isimleri SADECE şunlardan biri olmalı: Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar\n' +
    '- Metinde "Gün 1", "Upper Day", "Antreman 2" gibi isimler varsa sırayla Pazartesi\'den başlayarak eşleştir\n\n' +
    'Hareket ve not kuralları ("hareketler" listesi için):\n' +
    '- Parantez içindeki koçluk/teknik açıklamaları ("Dirsek sabit, yavaş indir" gibi) hareket isminden ÇIKAR ama ' +
    'AYRI bir "not" alanına metnini olduğu gibi (kısaltmadan) yaz. Not yoksa "not" alanını hiç ekleme.\n' +
    '- Isınma amaçlı esneme/mobilite hareketlerini BU LİSTEYE EKLEME, onlar "antrenmanSonrasi" listesine gider\n\n' +
    'Antrenman sonrası (esneme/soğuma) kuralları ("antrenmanSonrasi" listesi için):\n' +
    '- Metinde "Antrenman Sonrası", "Soğuma", "Cool-down", "Esneme" gibi başlık altında listelenen hareketler buraya gider\n' +
    '- Metinde böyle bir bölüm YOKSA, o gün için "antrenmanSonrasi" alanını HİÇ EKLEME (boş dizi bile ekleme)\n' +
    '- Süre bazlı hareketlerde ("3x 30-40sn" gibi) set sayısını al, tekrar alanına 1 yaz, süre bilgisini ve varsa ' +
    'teknik açıklamayı birleştirip "not" alanına yaz (örn: "30-40 saniye tut. Göğsü hafif ileri ver.")\n\n' +
    'Set ve tekrar sayısı okuma kuralları (her iki liste için de geçerli):\n' +
    '- "4x8-10" veya "3x12-15" gibi bir ARALIK varsa, aralığın üst sınırını kullan (8-10 → 10, 12-15 → 15)\n' +
    '- "3.12" veya "4.10" gibi NOKTA ile ayrılmış sayılar da set.tekrar anlamına gelir (3.12 → 3 set, 12 tekrar)\n' +
    '- Bir satırda hem "ısınma seti" hem "çalışma seti" ayrı ayrı belirtilmişse (örn. "1x15 Isınma Seti 2x12-15 Çalışma Seti"), ' +
    'SADECE çalışma (work) setini say, ısınma setini dahil etme\n' +
    '- "Maksimum Tekrar" veya sayı belirtilmemişse tekrar için 12 varsay, set sayısını metinden olduğu gibi al\n' +
    '- Hiçbir sayı bulunamazsa 3 set 10 tekrar varsay\n\n' +
    'Genel metin alanları (üst düzeyde, günlerin dışında):\n' +
    '- "kardiyoPlanlamasi": Metinde kardiyo/koşu/yürüyüş/bisiklet planlamasıyla ilgili bir bölüm varsa (örn. "Antrenman Günleri 20dk 110-130bpm"), ' +
    'bunu olduğu gibi bu alana yaz. Yoksa bu alanı hiç ekleme.\n' +
    '- "antrenmanKurallari": Metinde genel uygulama kuralları varsa (dinlenme süreleri, ısınma/çalışma seti mantığı, negatif kontrolü, ' +
    'gün planlaması esnekliği vb.), bunları madde madde (her biri yeni satırda "- " ile başlayarak) bu alana yaz. Yoksa bu alanı hiç ekleme.\n\n' +
    'Genel kural: Bir gün için hiç geçerli hareket (ne ana hareket ne esneme) bulamazsan o günü hiç ekleme. ' +
    'Eğer metnin tamamı bir beslenme/diyet/supplement planıysa (antrenman hareketi hiç yoksa), boş obje {} döndür.\n\n' +
    'Metin:\n' + pdfText.substring(0, 15000)
  );
}

// ── GEMINI API ÇAĞRISI ──
function callGeminiAPIOnce(prompt, apiKey) {
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
        var err = new Error(msg);
        err.status = res.status;
        throw err;
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

// "Yoğun talep" / geçici sunucu hatalarında 1 kez daha dener (3 saniye arayla)
function callGeminiAPI(prompt, apiKey) {
  return callGeminiAPIOnce(prompt, apiKey).catch(function(err) {
    var isOverloaded = err.status === 503 || err.status === 429 ||
                        /high demand|overloaded|unavailable/i.test(err.message || '');
    if (!isOverloaded) throw err;

    // Hangi PDF modalı açıksa onun metnini güncelle
    ['pdfProcessingText', 'dietPdfProcessingText'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el && el.closest('.modal-overlay-2') && !el.closest('.modal-overlay-2').classList.contains('hidden')) {
        el.textContent = 'Model yoğun, 3 saniye sonra tekrar deneniyor…';
      }
    });
    return new Promise(function(resolve) {
      setTimeout(resolve, 3000);
    }).then(function() {
      return callGeminiAPIOnce(prompt, apiKey);
    });
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

    // Toplam gecerli hareket sayisini say (hareketler + antrenmanSonrasi, hem bos {} hem bos gunler icin)
    var totalExercises = 0;
    Object.keys(parsed || {}).forEach(function(day) {
      if (DAYS_ORDER.indexOf(day) === -1) return;
      var dayData = parsed[day];
      if (!dayData) return;
      if (Array.isArray(dayData.hareketler)) totalExercises += dayData.hareketler.length;
      if (Array.isArray(dayData.antrenmanSonrasi)) totalExercises += dayData.antrenmanSonrasi.length;
    });

    if (totalExercises === 0) {
      throw new Error(
        'Bu PDF\'de bir antrenman programı bulunamadı. Beslenme, supplement veya başka bir tür ' +
        'PDF yüklemiş olabilirsin — bu özellik sadece antrenman programları için çalışıyor.'
      );
    }

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
  var days = Object.keys(pdfParsedProgram || {}).filter(function(k) { return DAYS_ORDER.indexOf(k) !== -1; });

  if (days.length === 0) {
    pdfPreviewListEl.innerHTML = '<p class="empty-hint">Program bulunamadı.</p>';
    pdfConfirmBtn.classList.add('hidden');
    return;
  }

  var html = '';
  days.forEach(function(day) {
    var dayData = pdfParsedProgram[day] || {};
    var mainList = dayData.hareketler || [];
    var postList = dayData.antrenmanSonrasi || [];

    html += '<div class="pdf-preview-day"><p class="pdf-preview-day-title">' + escapeHtml(day) + '</p>';

    mainList.forEach(function(item, idx) {
      var noteHtml = item.not ? '<p class="pdf-preview-exercise-note">📝 ' + escapeHtml(item.not) + '</p>' : '';
      html +=
        '<div class="pdf-preview-exercise-wrap">' +
          '<div class="pdf-preview-exercise">' +
            '<span class="pdf-preview-exercise-name">' + escapeHtml(item.hareket) + '</span>' +
            '<span class="pdf-preview-exercise-meta">' + escapeHtml(item.set || 3) + '×' + escapeHtml(item.tekrar || 10) + '</span>' +
            '<button class="pdf-preview-remove" data-day="' + escapeHtml(day) + '" data-list="hareketler" data-idx="' + idx + '">✕</button>' +
          '</div>' +
          noteHtml +
        '</div>';
    });

    if (postList.length > 0) {
      html += '<p class="pdf-preview-post-label">🧘 Antrenman Sonrası</p>';
      postList.forEach(function(item, idx) {
        var noteHtml = item.not ? '<p class="pdf-preview-exercise-note">📝 ' + escapeHtml(item.not) + '</p>' : '';
        html +=
          '<div class="pdf-preview-exercise-wrap">' +
            '<div class="pdf-preview-exercise">' +
              '<span class="pdf-preview-exercise-name">' + escapeHtml(item.hareket) + '</span>' +
              '<span class="pdf-preview-exercise-meta">' + escapeHtml(item.set || 3) + ' set</span>' +
              '<button class="pdf-preview-remove" data-day="' + escapeHtml(day) + '" data-list="antrenmanSonrasi" data-idx="' + idx + '">✕</button>' +
            '</div>' +
            noteHtml +
          '</div>';
      });
    }

    html += '</div>';
  });

  if (pdfParsedProgram.kardiyoPlanlamasi) {
    html += '<div class="pdf-preview-day"><p class="pdf-preview-day-title">🏃 Kardiyo Planlaması</p>' +
            '<p class="pdf-preview-freetext">' + escapeHtmlLines(pdfParsedProgram.kardiyoPlanlamasi) + '</p></div>';
  }

  if (pdfParsedProgram.antrenmanKurallari) {
    html += '<div class="pdf-preview-day"><p class="pdf-preview-day-title">📋 Antrenman Uygulama Kuralları</p>' +
            '<p class="pdf-preview-freetext">' + escapeHtmlLines(pdfParsedProgram.antrenmanKurallari) + '</p></div>';
  }

  pdfPreviewListEl.innerHTML = html;
  pdfConfirmBtn.classList.remove('hidden');
}

pdfPreviewListEl.addEventListener('click', function(e) {
  var btn = e.target.closest('.pdf-preview-remove');
  if (!btn) return;
  var day = btn.dataset.day;
  var listKey = btn.dataset.list;
  var idx = parseInt(btn.dataset.idx, 10);

  pdfParsedProgram[day][listKey].splice(idx, 1);
  var dayData = pdfParsedProgram[day];
  var stillHasContent = (dayData.hareketler && dayData.hareketler.length > 0) ||
                         (dayData.antrenmanSonrasi && dayData.antrenmanSonrasi.length > 0);
  if (!stillHasContent) delete pdfParsedProgram[day];

  renderPdfPreview();
});

function mergePdfProgramIntoStorage(program) {
  var daysMap = getWorkoutDaysMap();

  function buildExerciseObj(item) {
    var meta = findExerciseMeta(item.hareket);
    var sets = parseInt(item.set, 10) || 3;
    return {
      id: 'ex_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: item.hareket,
      muscle: meta.muscle,
      equipment: meta.equipment,
      level: meta.level,
      sets: sets,
      reps: parseInt(item.tekrar, 10) || 10,
      note: item.not || '',
      checked: new Array(sets).fill(false)
    };
  }

  Object.keys(program).forEach(function(weekday) {
    if (DAYS_ORDER.indexOf(weekday) === -1) return; // güvenlik: sadece geçerli hafta günleri
    if (!daysMap[weekday]) daysMap[weekday] = { title: '', exercises: [], postWorkout: [] };
    if (!daysMap[weekday].postWorkout) daysMap[weekday].postWorkout = [];

    var dayData = program[weekday] || {};

    (dayData.hareketler || []).forEach(function(item) {
      daysMap[weekday].exercises.push(buildExerciseObj(item));
    });

    (dayData.antrenmanSonrasi || []).forEach(function(item) {
      daysMap[weekday].postWorkout.push(buildExerciseObj(item));
    });
  });

  saveWorkoutDaysMap(daysMap);
}

// Var olan not alanına, mevcut içeriği silmeden yeni metni ekler
function appendToNotesField(storageKey, textareaId, newText) {
  if (!newText) return;
  var existing = localStorage.getItem(storageKey) || '';
  var combined = existing ? (existing + '\n\n---\n\n' + newText) : newText;
  localStorage.setItem(storageKey, combined);
  var el = document.getElementById(textareaId);
  if (el) el.value = combined;
}

pdfConfirmBtn.addEventListener('click', function() {
  if (!pdfParsedProgram) return;
  mergePdfProgramIntoStorage(pdfParsedProgram);
  appendToNotesField(KEYS.cardio, 'input-cardio', pdfParsedProgram.kardiyoPlanlamasi);
  appendToNotesField(KEYS.workout, 'input-workout', pdfParsedProgram.antrenmanKurallari);
  pdfModal.classList.add('hidden');
  pdfParsedProgram = null;
  collapseWorkoutBuilder();
  renderWorkoutTracking();
});

/* ══════════════════════════════════════════
   SUPPLEMENT PLANI — YAPILANDIRILMIŞ EKLEME SİSTEMİ
   Meal builder ile aynı mantık: seç/yaz + doz + zaman + not,
   sepete ekle, planı tamamla. Liventis'ten doğrulanan gerçek
   ürün bilgileri + yaygın supplementlerin genel doz aralıkları.
   ══════════════════════════════════════════ */


function getSupplementPlan() { return getJSON(SUPP_KEYS.plan, {}); }
function saveSupplementPlan(plan) {
  setJSON(SUPP_KEYS.plan, plan);
  pruneSuppTaken(plan);
  schedulePushSync();
}

/* ── "ALDIM" İŞARETİ ──
   { supplementId: 'YYYY-MM-DD' } — takviyenin son alındığı gün. Bugünün
   tarihiyse alınmış sayılır, ertesi gün kendiliğinden sıfırlanır.
   Sunucu bu haritaya bakarak işaretlenmiş takviye için tekrar bildirim
   göndermeyi kesiyor. */
function getSuppTaken() { return getJSON(SUPP_TAKEN_KEY, {}); }
function isSuppTaken(id) { return getSuppTaken()[id] === getTodayKey(); }

function setSuppTaken(id, alindi) {
  var taken = getSuppTaken();
  if (alindi) taken[id] = getTodayKey();
  else delete taken[id];
  setJSON(SUPP_TAKEN_KEY, taken);
  schedulePushSync();
}

// Plandan çıkarılan takviyelerin izini bırakma
function pruneSuppTaken(plan) {
  var taken = getSuppTaken();
  var live = {};
  Object.keys(plan).forEach(function(timing) {
    (plan[timing] || []).forEach(function(item) { live[item.id] = true; });
  });
  var changed = false;
  Object.keys(taken).forEach(function(id) {
    if (!live[id]) { delete taken[id]; changed = true; }
  });
  if (changed) setJSON(SUPP_TAKEN_KEY, taken);
}

// Liventis ürün sayfalarından doğrulanmış + yaygın supplementlerin genel bilgileri
var SUPPLEMENT_DB = [
  // ── KREATİN ──
  { name: 'Liventis Pure Creatine (Kreatin)', defaultDose: '5g', info: 'Liventis ürün sayfası: serviste 5g kreatin monohidrat, ilave şeker yok, mikronize yapı.' },
  { name: 'HIQ Creatine Monohydrate (TakeHiQ)', defaultDose: '5g', info: 'HIQ Nutrition ürün sayfası: serviste 5g, 200 mesh mikronize kreatin monohidrat, aromasız.' },
  { name: 'Hardline Kreatin', defaultDose: '5g', info: 'Hardline ürün verisi: 1 tatlı kaşığı (5g) ~20 kcal.' },
  { name: 'Kreatin Monohidrat (genel)', defaultDose: '5g', info: 'Standart doz günde 3-5g, performans ve kas gücünü destekler.' },

  // ── WHEY PROTEIN (marka bazlı, gerçek servis/protein verisiyle) ──
  { name: 'ProteinOcean Whey Protein', defaultDose: '1 ölçek (25g)', info: 'ProteinOcean ürün verisi: 25g serviste ~19g protein, ~111 kcal.' },
  { name: 'ProteinOcean Whey İzole', defaultDose: '1 ölçek (25g)', info: 'ProteinOcean ürün verisi: serviste 1g altı şeker, sadece %1 yağ — yüksek saflıkta izole whey.' },
  { name: 'BigJoy BigWhey Protein', defaultDose: '1 ölçek (33g)', info: 'BigJoy ürün verisi: 33g serviste 24g protein, ~120-135 kcal (aromaya göre değişir).' },
  { name: 'Hardline Whey 3 Matrix', defaultDose: '1 ölçek (30g)', info: 'Hardline ürün verisi: 30g serviste ~24g protein + serviste ~2-3g kreatin monohidrat dahil (3 farklı whey karışımı).' },
  { name: 'HIQ High Pro+ Whey (TakeHiQ)', defaultDose: '1 ölçek (~30g)', info: 'HIQ Nutrition ürün verisi: serviste 24g protein (WPC80+WPI90 karışımı), düşük yağ/karbonhidrat.' },
  { name: 'Supplementler.com Whey Protein', defaultDose: '1 ölçek (~30g)', info: 'Supplementler.com ürün verisi: serviste 5,3g BCAA + 10,9g EAA + 3,8g glutamin öncüsü sağlayan whey karışımı.' },
  { name: 'Liventis Whey Protein', defaultDose: '1 ölçek (30g)', info: 'Liventis ürün sayfası: peynir altı suyu proteini + kreatin/glutamin/BCAA (4:1:1) + DigeZyme enzim kompleksi içerir.' },
  { name: 'Whey Protein (diğer/genel)', defaultDose: '1 ölçek (~30g)', info: 'Ortalama 1 ölçek ~20-25g protein, ~100-130 kcal içerir (markaya göre değişir).' },

  // ── AMİNO ASİT (EAA / BCAA / GLUTAMİN) ──
  { name: 'Supplementler.com EAA Powder', defaultDose: '1 ölçek', info: 'Supplementler.com ürün verisi: serviste 7,5g EAA + 3,4g BCAA, 9 esansiyel amino asit profili tam.' },
  { name: 'Supplementler.com BCAA 2:1:1', defaultDose: '1 ölçek', info: 'Supplementler.com ürün verisi: 2:1:1 oranında lösin/izolösin/valin, fermente vegan hammadde.' },
  { name: 'Liventis Pure Glutamin', defaultDose: '10g', info: 'Liventis ürün sayfası: saf glutamin amino asidi, GMP sertifikalı üretim.' },
  { name: 'EAA (Esansiyel Amino Asit, genel)', defaultDose: '10g', info: '9 esansiyel amino asidi sağlar, genelde kalorisi düşüktür.' },
  { name: 'BCAA (genel)', defaultDose: '5g', info: 'Lösin/İzolösin/Valin karışımı, genelde 2:1:1 oranında.' },
  { name: 'Glutamin (genel)', defaultDose: '5-10g', info: 'Toparlanma ve bağırsak sağlığını destekler.' },

  // ── DİĞER PERFORMANS DESTEKLERİ ──
  { name: 'Liventis Pure Beta Alanin', defaultDose: '3-5g', info: 'Liventis saf beta alanin formülü, kas yorgunluğunu geciktirmeye yardımcı olabilir.' },
  { name: 'L-Carnitine', defaultDose: '1 servis (~500-1000mg)', info: 'Yağ metabolizmasını desteklediği öne sürülür, antrenman öncesi alınır.' },
  { name: 'Beta Alanin (genel)', defaultDose: '3-5g', info: 'Kas yorgunluğunu geciktirmeye yardımcı olabilir, ciltte karıncalanma normaldir.' },
  { name: 'Pre-Workout', defaultDose: '1 ölçek', info: 'Genelde kafein + beta alanin + sitrülin içerir.' },

  // ── VİTAMİN / MİNERAL ──
  { name: 'D3 Vitamini', defaultDose: '2000 IU', info: 'Kemik sağlığı ve bağışıklık için.' },
  { name: 'D3K2 Vitamini', defaultDose: '1000-4000 IU', info: 'D3 + K2 kombinasyonu, kalsiyum metabolizmasını destekler.' },
  { name: 'Multivitamin', defaultDose: '1 tablet/servis', info: 'Genel vitamin/mineral desteği.' },
  { name: 'Omega 3', defaultDose: '1000mg', info: 'Balık yağı, EPA/DHA içerir.' },
  { name: 'C Vitamini', defaultDose: '500-1000mg', info: 'Antioksidan, bağışıklık desteği.' },
  { name: 'Magnezyum', defaultDose: '300-400mg', info: 'Kas fonksiyonu ve uyku kalitesini destekleyebilir.' },
  { name: 'Çinko', defaultDose: '15-30mg', info: 'Bağışıklık ve hormon dengesi için.' },
  { name: 'ZMA', defaultDose: '1 servis', info: 'Çinko + Magnezyum + B6 kombinasyonu, genelde gece alınır.' },
  { name: 'Berberin', defaultDose: '500mg', info: 'Kan şekeri dengesi için kullanılır, öğün öncesi alınır.' },
  { name: 'Psyllium Husk', defaultDose: '5g', info: 'Çözünür lif, sindirimi destekler, bol suyla alınmalı.' },
  { name: 'Probiyotik', defaultDose: '1 kapsül', info: 'Bağırsak florasını destekler.' }
];

var suppSelect         = document.getElementById('supp-select');
var suppCustomGroup    = document.getElementById('supp-custom-group');
var suppCustomNameInput= document.getElementById('supp-custom-name');
var suppDoseInput      = document.getElementById('supp-dose');
var suppTimingSelect   = document.getElementById('supp-timing');
var suppNoteInput      = document.getElementById('supp-note');
var suppInfoPreview    = document.getElementById('suppInfoPreview');
var addSuppToCartBtn   = document.getElementById('addSuppToCartBtn');
var suppCartListEl     = document.getElementById('suppCartList');
var completeSuppBtn    = document.getElementById('completeSuppBtn');
var suppPlanListEl     = document.getElementById('suppPlanList');

var suppCartItems = [];

function fillSuppSelect() {
  var html = '';
  SUPPLEMENT_DB.forEach(function(s) {
    html += '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + '</option>';
  });
  html += '<option value="__custom__">✏️ Listede Yok — Kendim Yazayım</option>';
  suppSelect.innerHTML = html;
}

function findSupplementInfo(name) {
  return SUPPLEMENT_DB.find(function(s) { return s.name === name; });
}

suppSelect.addEventListener('change', function() {
  if (suppSelect.value === '__custom__') {
    suppCustomGroup.classList.remove('hidden');
    suppCustomNameInput.value = '';
    suppDoseInput.value = '';
    suppInfoPreview.textContent = 'Bu ürün için içerik bilgimiz varsa burada görünür';
    return;
  }
  suppCustomGroup.classList.add('hidden');
  var found = findSupplementInfo(suppSelect.value);
  if (found) {
    suppDoseInput.value = found.defaultDose;
    suppInfoPreview.textContent = 'ℹ️ ' + found.info;
  } else {
    suppInfoPreview.textContent = 'Bu ürün için içerik bilgimiz varsa burada görünür';
  }
});

function buildSuppCartItemHTML(item, index) {
  return (
    '<div class="cart-item" data-cart-id="' + escapeHtml(item.cartId) + '">' +
      '<div class="cart-item-header">' +
        '<span class="cart-item-number">' + (index + 1) + '</span>' +
        '<div class="cart-item-info">' +
          '<p class="cart-item-name">' + escapeHtml(item.name) + '</p>' +
          '<p class="cart-item-meta">' + escapeHtml(item.dose) + ' · ' + escapeHtml(item.timing) + '</p>' +
        '</div>' +
        '<button type="button" class="cart-item-remove" data-cart-id="' + escapeHtml(item.cartId) + '" title="Sil">✕</button>' +
      '</div>' +
      (item.note ? '<p class="cart-item-note">📝 ' + escapeHtml(item.note) + '</p>' : '') +
    '</div>'
  );
}

function renderSuppCartList() {
  if (suppCartItems.length === 0) {
    suppCartListEl.innerHTML = '<p class="empty-hint">Henüz supplement eklenmedi.</p>';
    return;
  }
  var html = '';
  suppCartItems.forEach(function(item, idx) { html += buildSuppCartItemHTML(item, idx); });
  suppCartListEl.innerHTML = html;
}

suppCartListEl.addEventListener('click', function(e) {
  var btn = e.target.closest('.cart-item-remove');
  if (!btn) return;
  suppCartItems = suppCartItems.filter(function(it) { return it.cartId !== btn.dataset.cartId; });
  renderSuppCartList();
});

addSuppToCartBtn.addEventListener('click', function() {
  var name = suppSelect.value === '__custom__' ? suppCustomNameInput.value.trim() : suppSelect.value;
  if (!name) return;
  var dose = suppDoseInput.value.trim() || '—';

  suppCartItems.push({
    cartId: 'supp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: name,
    dose: dose,
    timing: suppTimingSelect.value,
    note: suppNoteInput.value.trim()
  });

  suppNoteInput.value = '';
  renderSuppCartList();
});

completeSuppBtn.addEventListener('click', function() {
  var feedbackEl = document.getElementById('supp-program-feedback');

  if (suppCartItems.length === 0) {
    feedbackEl.textContent = '⚠️ Sepet boş — önce supplement ekle.';
    showFeedback('supp-program-feedback');
    return;
  }

  var plan = getSupplementPlan();
  suppCartItems.forEach(function(item) {
    if (!plan[item.timing]) plan[item.timing] = [];
    plan[item.timing].push({
      id: 'supp_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: item.name,
      dose: item.dose,
      note: item.note
    });
  });
  saveSupplementPlan(plan);

  suppCartItems = [];
  renderSuppCartList();
  suppBuilderSection.classList.add('hidden');
  toggleSuppBuilderBtn.classList.remove('open');

  feedbackEl.textContent = '✅ Plana eklendi!';
  showFeedback('supp-program-feedback');

  renderSupplementPlanView();
});

function renderSupplementPlanView() {
  var plan = getSupplementPlan();
  var timingsWithItems = SUPP_TIMING_ORDER.filter(function(t) { return plan[t] && plan[t].length > 0; });

  if (timingsWithItems.length === 0) {
    suppPlanListEl.innerHTML = '<p class="empty-hint">Henüz bir supplement eklemedin.</p>';
    return;
  }

  var html = '';
  timingsWithItems.forEach(function(timing) {
    html += '<p class="meal-plan-day-title">' + escapeHtml(timing) + '</p>';
    plan[timing].forEach(function(item) {
      var hasTime = !!item.reminder;
      var alindi = isSuppTaken(item.id);
      html +=
        '<div class="food-log-item supp-row' + (alindi ? ' taken' : '') + '" data-supp-id="' + escapeHtml(item.id) + '">' +
          '<button class="supp-take-btn" type="button" data-id="' + escapeHtml(item.id) + '" ' +
            'aria-pressed="' + (alindi ? 'true' : 'false') + '" ' +
            'title="' + (alindi ? 'Alındı olarak işaretlendi — geri almak için dokun' : 'Aldıysan işaretle') + '">' +
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
              'stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
              '<path d="m5 12.5 4.5 4.5L19 7.5"/>' +
            '</svg>' +
          '</button>' +
          '<div class="supp-row-text">' +
            '<p class="food-log-item-name">' + escapeHtml(item.name) + '</p>' +
            '<p class="food-log-item-meta">' + escapeHtml(item.dose) + (item.note ? ' · ' + escapeHtml(item.note) : '') + '</p>' +
          '</div>' +
          '<div class="supp-item-actions">' +
            '<button class="supp-time-btn' + (hasTime ? ' has-time' : '') + '" ' +
              'data-timing="' + escapeHtml(timing) + '" data-id="' + item.id + '" ' +
              'title="' + (hasTime ? 'Hatırlatma saatini değiştir' : 'Hatırlatma saati ekle') + '">' +
              '⏰' + (hasTime ? ' ' + item.reminder : '') +
            '</button>' +
            '<button class="food-log-item-remove" data-timing="' + escapeHtml(timing) + '" data-id="' + escapeHtml(item.id) + '" title="Kaldır">✕</button>' +
          '</div>' +
        '</div>';
    });
  });
  suppPlanListEl.innerHTML = html;
  renderNotifStatus();
}

suppPlanListEl.addEventListener('click', function(e) {
  var takeBtn = e.target.closest('.supp-take-btn');
  if (takeBtn) {
    var id = takeBtn.dataset.id;
    setSuppTaken(id, !isSuppTaken(id));
    renderSupplementPlanView();
    renderTodayCards();
    return;
  }

  var timeBtn = e.target.closest('.supp-time-btn');
  if (timeBtn) {
    openSuppTimeModal(timeBtn.dataset.timing, timeBtn.dataset.id);
    return;
  }

  var btn = e.target.closest('.food-log-item-remove');
  if (!btn) return;
  var plan = getSupplementPlan();
  var timing = btn.dataset.timing;
  if (!plan[timing]) return;
  plan[timing] = plan[timing].filter(function(item) { return item.id !== btn.dataset.id; });
  saveSupplementPlan(plan);
  renderSupplementPlanView();
});

var toggleSuppBuilderBtn = document.getElementById('toggleSuppBuilderBtn');
var suppBuilderSection   = document.getElementById('suppBuilderSection');

toggleSuppBuilderBtn.addEventListener('click', function() {
  suppBuilderSection.classList.toggle('hidden');
  toggleSuppBuilderBtn.classList.toggle('open', !suppBuilderSection.classList.contains('hidden'));
});

/* ══════════════════════════════════════════
   SUPPLEMENT HATIRLATMA (saat + bildirim)
   ══════════════════════════════════════════ */

var suppTimeModal        = document.getElementById('suppTimeModal');
var suppTimeInput        = document.getElementById('supp-time-input');
var suppTimeModalNameEl  = document.getElementById('suppTimeModalName');
var suppTimeQuickRow     = document.getElementById('suppTimeQuickRow');
var saveSuppTimeBtn      = document.getElementById('saveSuppTimeBtn');
var clearSuppTimeBtn     = document.getElementById('clearSuppTimeBtn');
var closeSuppTimeModalBtn= document.getElementById('closeSuppTimeModal');
var suppTimeNoteEl       = document.getElementById('suppTimeNote');
var notifStatusBox       = document.getElementById('notifStatusBox');
var notifStatusText      = document.getElementById('notifStatusText');
var notifEnableBtn       = document.getElementById('notifEnableBtn');

var REMINDER_FIRED_KEY = 'ft_supp_reminder_fired';
var REMINDER_GRACE_MIN = 60;   // saati kaçırdıysak 60 dk içinde yine de hatırlat
var activeReminderTarget = null;

// Zaman etiketine göre mantıklı varsayılan saat
var TIMING_DEFAULT_TIME = {
  'Sabah': '08:00',
  'Aç Karnına': '07:30',
  'Öğün İle Birlikte': '13:00',
  'Antrenman Öncesi': '17:00',
  'Antrenman Esnasında': '18:00',
  'Antrenman Sonrası': '19:00',
  'Akşam / Yatmadan Önce': '22:30'
};

function notifSupported() { return typeof Notification !== 'undefined'; }
function notifPermission() { return notifSupported() ? Notification.permission : 'unsupported'; }

function requestNotifPermission() {
  if (!notifSupported()) { renderNotifStatus(); return; }
  if (Notification.permission !== 'default') { renderNotifStatus(); return; }
  try {
    var result = Notification.requestPermission(function() { renderNotifStatus(); });
    if (result && typeof result.then === 'function') {
      result.then(function() { renderNotifStatus(); });
    }
  } catch (e) {
    console.warn('[Bildirim] İzin istenemedi:', e);
  }
}

function countReminders() {
  var plan = getSupplementPlan();
  var count = 0;
  Object.keys(plan).forEach(function(timing) {
    (plan[timing] || []).forEach(function(item) { if (item.reminder) count++; });
  });
  return count;
}

function renderNotifStatus() {
  if (!notifStatusBox) return;

  var total = countReminders();
  if (total === 0) { notifStatusBox.classList.add('hidden'); return; }

  notifStatusBox.classList.remove('hidden');
  notifStatusBox.classList.remove('ok');
  notifEnableBtn.classList.add('hidden');

  var perm = notifPermission();
  if (perm === 'granted' && isPushActive()) {
    notifStatusBox.classList.add('ok');
    notifStatusText.textContent = '🔔 ' + total + ' hatırlatma sunucu üzerinden gönderiliyor — uygulama kapalıyken de gelir.';
  } else if (perm === 'granted') {
    notifStatusBox.classList.add('ok');
    notifStatusText.textContent = '🔔 ' + total + ' hatırlatma kurulu. Bildirimin gelmesi için uygulamanın açık veya arka planda olması gerekir — sürekli gelsin istersen Ayarlar → Bildirim Sunucusu bölümünden bağlan.';
  } else if (perm === 'denied') {
    notifStatusText.textContent = '🔕 Bildirim izni reddedilmiş. Saatler kayıtlı ama bildirim gelmez — tarayıcı/site ayarlarından izni açman gerekiyor.';
  } else if (perm === 'unsupported') {
    notifStatusText.textContent = '🔕 Bu cihaz/tarayıcı bildirimi desteklemiyor. Saatler yine de planında görünür.';
  } else {
    notifStatusText.textContent = '🔔 Hatırlatmaların çalışması için bildirim izni gerekiyor.';
    notifEnableBtn.classList.remove('hidden');
  }
}

if (notifEnableBtn) {
  notifEnableBtn.addEventListener('click', requestNotifPermission);
}

// ── MODAL ────────────────────────────────────────
function findSuppItem(timing, id) {
  var list = getSupplementPlan()[timing] || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) return list[i];
  }
  return null;
}

function markQuickTimeBtn(value) {
  suppTimeQuickRow.querySelectorAll('.time-quick-btn').forEach(function(btn) {
    btn.classList.toggle('selected', btn.dataset.time === value);
  });
}

function openSuppTimeModal(timing, id) {
  var item = findSuppItem(timing, id);
  if (!item) return;

  activeReminderTarget = { timing: timing, id: id };
  suppTimeModalNameEl.textContent = item.name +
    (item.dose && item.dose !== '—' ? ' · ' + item.dose : '') + ' — ' + timing;
  suppTimeInput.value = item.reminder || TIMING_DEFAULT_TIME[timing] || '08:00';
  markQuickTimeBtn(suppTimeInput.value);
  clearSuppTimeBtn.classList.toggle('hidden', !item.reminder);

  suppTimeNoteEl.textContent = notifPermission() === 'denied'
    ? '⚠️ Bildirim izni kapalı — saat kaydedilir ama bildirim gelmez.'
    : 'Her gün bu saatte telefonuna bildirim gönderilecek.';

  suppTimeModal.classList.remove('hidden');
}

function closeSuppTimeModal() {
  suppTimeModal.classList.add('hidden');
  activeReminderTarget = null;
}

closeSuppTimeModalBtn.addEventListener('click', closeSuppTimeModal);
suppTimeModal.addEventListener('click', function(e) {
  if (e.target === suppTimeModal) closeSuppTimeModal();
});

suppTimeQuickRow.addEventListener('click', function(e) {
  var btn = e.target.closest('.time-quick-btn');
  if (!btn) return;
  suppTimeInput.value = btn.dataset.time;
  markQuickTimeBtn(btn.dataset.time);
});

suppTimeInput.addEventListener('change', function() { markQuickTimeBtn(suppTimeInput.value); });

function updateSuppReminder(timing, id, value) {
  var plan = getSupplementPlan();
  (plan[timing] || []).forEach(function(item) {
    if (item.id !== id) return;
    if (value) item.reminder = value;
    else delete item.reminder;
  });
  saveSupplementPlan(plan);

  var fired = getJSON(REMINDER_FIRED_KEY, {});
  delete fired[id];
  setJSON(REMINDER_FIRED_KEY, fired);

  renderSupplementPlanView();
}

saveSuppTimeBtn.addEventListener('click', function() {
  if (!activeReminderTarget) return;
  var value = suppTimeInput.value;
  if (!/^\d{2}:\d{2}$/.test(value)) {
    suppTimeNoteEl.textContent = '⚠️ Geçerli bir saat seç (örn. 08:00).';
    return;
  }
  var target = activeReminderTarget;
  updateSuppReminder(target.timing, target.id, value);
  closeSuppTimeModal();
  requestNotifPermission();   // kullanıcı hareketi içinde — izin penceresi burada açılır
});

clearSuppTimeBtn.addEventListener('click', function() {
  if (!activeReminderTarget) return;
  updateSuppReminder(activeReminderTarget.timing, activeReminderTarget.id, null);
  closeSuppTimeModal();
});

// ── ZAMANLAYICI ──────────────────────────────────

// Başlığa uygulama adı YAZILMAZ — iOS zaten altına "from FitTakip" ekliyor
function showSuppNotification(item, timing) {
  var title = '⏰ ' + item.name + ' zamanı!';
  var bits = [];
  if (item.dose && item.dose !== '—') bits.push(item.dose);
  if (timing) bits.push(timing);
  if (item.note) bits.push(item.note);
  bits.push('Unutma 💪');

  var options = {
    body: bits.join(' · '),
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'supp-' + item.id,
    renotify: true,
    vibrate: [120, 60, 120],
    data: { page: 'supplement' }
  };

  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then(function(reg) {
      return reg.showNotification(title, options);
    }).catch(function(err) {
      console.warn('[Bildirim] SW üzerinden gönderilemedi:', err);
    });
  } else {
    try { new Notification(title, options); }
    catch (e) { console.warn('[Bildirim] Gösterilemedi:', e); }
  }
}

function checkSupplementReminders() {
  if (notifPermission() !== 'granted') return;
  if (isPushActive()) return;   // sunucu gönderiyor, çift bildirim olmasın

  var plan = getSupplementPlan();
  var fired = getJSON(REMINDER_FIRED_KEY, {});
  var today = getTodayKey();
  var now = new Date();
  var nowMin = now.getHours() * 60 + now.getMinutes();
  var changed = false;
  var liveIds = {};

  Object.keys(plan).forEach(function(timing) {
    (plan[timing] || []).forEach(function(item) {
      if (!item.reminder) return;
      liveIds[item.id] = true;
      if (isSuppTaken(item.id)) return;   // "aldım" denmiş, hatırlatma gereksiz

      var stamp = today + ' ' + item.reminder;
      if (fired[item.id] === stamp) return;

      var diff = nowMin - minutesOfDay(item.reminder);
      if (diff < 0 || diff > REMINDER_GRACE_MIN) return;

      showSuppNotification(item, timing);
      fired[item.id] = stamp;
      changed = true;
    });
  });

  // Silinmiş supplementlerin izlerini temizle
  Object.keys(fired).forEach(function(id) {
    if (!liveIds[id]) { delete fired[id]; changed = true; }
  });

  if (changed) setJSON(REMINDER_FIRED_KEY, fired);
}

setInterval(checkSupplementReminders, 30000);
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) checkSupplementReminders();
});

/* ══════════════════════════════════════════
   PUSH BİLDİRİM SUNUCUSU (Cloudflare Worker)
   Bağlıyken hatırlatmaları sunucu gönderir —
   uygulama tamamen kapalı olsa bile çalışır.
   ══════════════════════════════════════════ */

var PUSH_KEYS = {
  url: 'ft_push_server_url',
  device: 'ft_push_device_key',
  active: 'ft_push_active'
};

var pushServerUrlInput = document.getElementById('push-server-url');
var pushDeviceKeyInput = document.getElementById('push-device-key');
var pushConnectBtn     = document.getElementById('pushConnectBtn');
var pushTestBtn        = document.getElementById('pushTestBtn');
var pushDisconnectBtn  = document.getElementById('pushDisconnectBtn');
var pushStateEl        = document.getElementById('pushState');
var pushStateTextEl    = document.getElementById('pushStateText');
var togglePushBtn      = document.getElementById('togglePushBtn');
var pushSection        = document.getElementById('pushSection');

var pushSyncTimer = null;

// Plan her değiştiğinde sunucudaki listeyi tazeler (arka arkaya değişikliklerde tek istek)
function schedulePushSync() {
  clearTimeout(pushSyncTimer);
  pushSyncTimer = setTimeout(function() {
    pushSyncTimer = null;
    syncRemindersToServer();
  }, 250);
}

// Bekleyen gönderimi hemen yola çıkar. Kullanıcı saati kaydedip uygulamayı
// saniyesinde kapatabiliyor; gecikmeli istek o anda yarıda kalırdı.
function flushPushSync() {
  if (!pushSyncTimer) return;
  clearTimeout(pushSyncTimer);
  pushSyncTimer = null;
  syncRemindersToServer();
}

document.addEventListener('visibilitychange', function() {
  if (document.hidden) flushPushSync();
});
window.addEventListener('pagehide', flushPushSync);

function getPushServerUrl() { return (localStorage.getItem(PUSH_KEYS.url) || '').replace(/\/+$/, ''); }
function getPushDeviceKey() { return localStorage.getItem(PUSH_KEYS.device) || ''; }
function isPushActive()     { return localStorage.getItem(PUSH_KEYS.active) === '1'; }

function setPushState(text, kind) {
  if (!pushStateEl) return;
  pushStateEl.classList.remove('ok', 'warn', 'busy');
  if (kind) pushStateEl.classList.add(kind);
  pushStateTextEl.textContent = text;
}

function renderPushState() {
  if (!pushStateEl) return;

  if (!('PushManager' in window) || !navigator.serviceWorker) {
    setPushState('⚠️ Bu tarayıcı push bildirimini desteklemiyor.', 'warn');
    pushConnectBtn.disabled = true;
    return;
  }
  if (isPushActive()) {
    setPushState('✅ Bağlı — hatırlatmalar uygulama kapalıyken de gelir.', 'ok');
    pushTestBtn.classList.remove('hidden');
    pushDisconnectBtn.classList.remove('hidden');
    pushConnectBtn.textContent = 'Yeniden Bağlan';
  } else {
    setPushState('Bağlı değil — hatırlatmalar yalnızca uygulama açıkken çalışır.');
    pushTestBtn.classList.add('hidden');
    pushDisconnectBtn.classList.add('hidden');
    pushConnectBtn.textContent = 'Bağlan ve Bildirimleri Aç';
  }
}

function pushFetch(path, options) {
  var url = getPushServerUrl();
  if (!url) return Promise.reject(new Error('Worker adresi girilmemiş.'));

  var opts = options || {};
  opts.headers = Object.assign({ 'Content-Type': 'application/json', 'X-Device-Key': getPushDeviceKey() }, opts.headers || {});

  return fetch(url + path, opts).then(function(res) {
    return res.json().catch(function() { return {}; }).then(function(data) {
      if (!res.ok) throw new Error(data.error || ('Sunucu hatası (HTTP ' + res.status + ')'));
      return data;
    });
  });
}

// Plandaki tüm hatırlatmaları düz bir listeye çevirir
function collectReminders() {
  var plan = getSupplementPlan();
  var list = [];
  Object.keys(plan).forEach(function(timing) {
    (plan[timing] || []).forEach(function(item) {
      if (!item.reminder) return;
      list.push({
        id: item.id, name: item.name, dose: item.dose,
        note: item.note || '', timing: timing, time: item.reminder
      });
    });
  });
  return list;
}

function currentTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch (e) { return 'UTC'; }
}

function getPushSubscription() {
  if (!navigator.serviceWorker || !('PushManager' in window)) return Promise.resolve(null);
  return navigator.serviceWorker.ready.then(function(reg) { return reg.pushManager.getSubscription(); });
}

// Hatırlatma listesini sunucuya gönderir (bağlı değilse sessizce çıkar)
function syncRemindersToServer() {
  if (!isPushActive() || !getPushServerUrl()) return Promise.resolve();

  return getPushSubscription().then(function(sub) {
    if (!sub) { localStorage.setItem(PUSH_KEYS.active, '0'); renderPushState(); return; }
    return pushFetch('/sync', {
      method: 'POST',
      body: JSON.stringify({
        subscription: sub.toJSON(),
        reminders: collectReminders(),
        taken: getSuppTaken(),
        timezone: currentTimezone()
      })
    }).then(function(data) {
      var now = new Date();
      setPushState('✅ Bağlı — ' + (data.count || 0) + ' hatırlatma sunucuda. Son gönderim: ' +
        String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'), 'ok');
    });
  }).catch(function(err) {
    console.warn('[Push] Senkronizasyon başarısız:', err.message);
    setPushState('⚠️ Sunucuya ulaşılamadı: ' + err.message, 'warn');
  });
}

function connectPush() {
  var url = (pushServerUrlInput.value || '').trim().replace(/\/+$/, '');
  var deviceKey = (pushDeviceKeyInput.value || '').trim();

  if (!/^https:\/\/.+/.test(url)) {
    setPushState('⚠️ Worker adresi https:// ile başlamalı.', 'warn');
    return;
  }
  if (!deviceKey) {
    setPushState('⚠️ Cihaz anahtarını gir.', 'warn');
    return;
  }

  localStorage.setItem(PUSH_KEYS.url, url);
  localStorage.setItem(PUSH_KEYS.device, deviceKey);

  setPushState('Sunucuya bağlanılıyor…', 'busy');
  pushConnectBtn.disabled = true;

  pushFetch('/health', { method: 'GET' })
    .then(function(data) {
      if (!data.vapidPublicKey) throw new Error("Worker'da VAPID_PUBLIC_KEY tanımlı değil.");

      setPushState('Bildirim izni isteniyor…', 'busy');
      return Notification.requestPermission().then(function(perm) {
        if (perm !== 'granted') throw new Error('Bildirim izni verilmedi.');
        return navigator.serviceWorker.ready;
      }).then(function(reg) {
        return reg.pushManager.getSubscription().then(function(existing) {
          if (existing) return existing;
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: b64urlToUint8Array(data.vapidPublicKey)
          });
        });
      });
    })
    .then(function(sub) {
      return pushFetch('/sync', {
        method: 'POST',
        body: JSON.stringify({
          subscription: sub.toJSON(),
          reminders: collectReminders(),
          taken: getSuppTaken(),
          timezone: currentTimezone()
        })
      });
    })
    .then(function(data) {
      localStorage.setItem(PUSH_KEYS.active, '1');
      renderPushState();
      setPushState('✅ Bağlandı — ' + (data.count || 0) + ' hatırlatma sunucuya aktarıldı.', 'ok');
    })
    .catch(function(err) {
      localStorage.setItem(PUSH_KEYS.active, '0');
      renderPushState();
      setPushState('⚠️ ' + err.message, 'warn');
    })
    .then(function() { pushConnectBtn.disabled = false; });
}

function b64urlToUint8Array(base64url) {
  var padded = (base64url + '==='.slice((base64url.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  var raw = atob(padded);
  var out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

if (pushConnectBtn) {
  pushConnectBtn.addEventListener('click', connectPush);

  pushTestBtn.addEventListener('click', function() {
    setPushState('Test bildirimi gönderiliyor…', 'busy');
    getPushSubscription().then(function(sub) {
      if (!sub) throw new Error('Abonelik bulunamadı, yeniden bağlan.');
      return pushFetch('/test', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) });
    }).then(function() {
      setPushState('✅ Test bildirimi gönderildi — birkaç saniye içinde gelmeli.', 'ok');
    }).catch(function(err) {
      setPushState('⚠️ ' + err.message, 'warn');
    });
  });

  pushDisconnectBtn.addEventListener('click', function() {
    setPushState('Bağlantı kesiliyor…', 'busy');
    getPushSubscription().then(function(sub) {
      if (!sub) return;
      return pushFetch('/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: sub.endpoint }) })
        .catch(function() { /* sunucuya ulaşılamasa da yerel aboneliği kapat */ })
        .then(function() { return sub.unsubscribe(); });
    }).then(function() {
      localStorage.setItem(PUSH_KEYS.active, '0');
      renderPushState();
    });
  });

  togglePushBtn.addEventListener('click', function() {
    pushSection.classList.toggle('hidden');
    togglePushBtn.classList.toggle('open', !pushSection.classList.contains('hidden'));
  });

  pushServerUrlInput.value = getPushServerUrl();
  pushDeviceKeyInput.value = getPushDeviceKey();
  renderPushState();

  // Kaçan bir gönderim olduysa telafi et
  if (isPushActive()) syncRemindersToServer();
}

/* Bildirime dokunulunca supplement sayfasını açar ve bildirimi gönderen
   satırı bulup kısa süre vurgular — kullanıcı hangi takviyeyi işaretleyeceğini
   aramak zorunda kalmasın. */
function openSupplementFromNotification(suppId) {
  showPage('supplement');
  renderSupplementPlanView();
  if (!suppId) return;

  requestAnimationFrame(function() {
    var rows = suppPlanListEl.querySelectorAll('.supp-row');
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].dataset.suppId !== suppId) continue;
      rows[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
      rows[i].classList.add('flash');
      setTimeout(function(row) {
        return function() { row.classList.remove('flash'); };
      }(rows[i]), 2400);
      return;
    }
  });
}

/* Uygulama kapalıyken bildirime dokunulduysa adresle geliyor: ./?supp=<id>

   Adresi hemen temizlemiyoruz: service worker güncellendiğinde uygulama
   controllerchange'de kendini yeniden yüklüyor. Parametre o yeniden yüklemeden
   önce silinirse bildirim hedefi kayboluyor ve kullanıcı ana sayfada kalıyor.
   Bu yüzden önce yönlendirmeyi yapıyor, adresi sonra temizliyoruz. */
(function() {
  var eslesme = /[?&]supp=([^&]+)/.exec(location.search);
  if (!eslesme) return;
  var suppId = decodeURIComponent(eslesme[1]);

  setTimeout(function() { openSupplementFromNotification(suppId); }, 80);

  setTimeout(function() {
    if (/[?&]supp=/.test(location.search)) history.replaceState(null, '', location.pathname);
  }, 5000);
})();

/* Sistem teması gece/gündüz değiştiğinde: CSS kendiliğinden döner ama
   Chart.js renkleri çizim anında okunduğu için grafikleri yeniden çizmek
   gerekiyor. VKİ göstergesi de renklerini JS'ten alıyor. */
if (window.matchMedia) {
  var temaSorgu = window.matchMedia('(prefers-color-scheme: light)');
  var temaDegisti = function() {
    updateDashboard();
    var guc = document.getElementById('strength-exercise-select');
    if (guc && guc.value) drawStrengthChart(guc.value);
  };
  // Safari 14 öncesi addEventListener'ı desteklemiyor
  if (temaSorgu.addEventListener) temaSorgu.addEventListener('change', temaDegisti);
  else if (temaSorgu.addListener) temaSorgu.addListener(temaDegisti);
}

// Tarayıcı aboneliği yenilediğinde sunucuya tekrar kaydol
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'supplement-notification') {
      openSupplementFromNotification(e.data.suppId);
      return;
    }
    if (e.data && e.data.type === 'push-subscription-changed') connectPush();
  });
}

// ── INIT (Supplement) ────────────────────────────
fillSuppSelect();
renderSuppCartList();
renderSupplementPlanView();
checkSupplementReminders();

/* ══════════════════════════════════════════
   PDF + AI: BESLENME / SUPPLEMENT PLANI AKTARIMI
   Aynı pdf.js + Gemini API altyapısını kullanır,
   antrenman PDF akışından bağımsız, daha basit bir akış.
   ══════════════════════════════════════════ */

function buildDietPrompt(pdfText) {
  return (
    'Aşağıdaki metin bir beslenme/diyet planı ve/veya supplement (takviye)/vitamin planı içeriyor. ' +
    'Bu metni analiz et ve SADECE geçerli JSON formatında yanıt ver — başka hiçbir açıklama, yorum veya markdown code-block ekleme.\n\n' +
    'Format tam olarak şu şekilde olmalı:\n' +
    '{"beslenmePlani": {"Öğün 1": [{"gida": "Yumurta", "gram": 200, "kcal100": 155, "protein100": 13, "carbs100": 1.1, "fat100": 11}], ' +
    '"Öğün 2": [...], "Öğün 3": [...], "Öğün 4": [...], "Ara Öğün": [...]}, ' +
    '"supplementPlani": [{"isim": "Kreatin", "doz": "5g", "zaman": "Antrenman Öncesi"}]}\n\n' +
    'Beslenme kuralları:\n' +
    '- Öğün başlıklarını (Kahvaltı/Öğün1 -> "Öğün 1", Öğle/Öğün2 -> "Öğün 2", Akşam/Öğün3 -> "Öğün 3", Öğün4 -> "Öğün 4", ara öğün/atıştırmalık -> "Ara Öğün") bu 5 isimden birine eşleştir.\n' +
    '- Her gıda için "gida" (sade Türkçe isim, "veya" ile verilen alternatiflerden sadece ilkini al, parantezleri çıkar), ' +
    '"gram" (sayı, belirtilmemişse 100) alanlarını doldur.\n' +
    '- Her gıda için 100 GRAM başına YAKLAŞIK "kcal100", "protein100", "carbs100", "fat100" değerlerini de SEN tahmin ederek doldur ' +
    '(bunlar sistem tarafından gerçek bir veritabanıyla eşleşirse geçersiz sayılıp gerçek değerle değiştirilecek, ' +
    'eşleşmezse senin verdiğin kullanılacak — bu yüzden makul ve gerçekçi değerler ver).\n' +
    '- O öğünde hiç gıda yoksa o öğünü hiç ekleme.\n\n' +
    'Supplement kuralları:\n' +
    '- Supplement VE vitamin planındaki HER maddeyi ayrı bir obje olarak "supplementPlani" dizisine ekle.\n' +
    '- "isim" (ürün/madde adı, marka varsa dahil et), "doz" (miktar, örn. "5g", "1 tablet", "2000 IU", "1 servis"), ' +
    '"zaman" (SADECE şunlardan biri: "Sabah", "Aç Karnına", "Öğün İle Birlikte", "Antrenman Öncesi", "Antrenman Esnasında", ' +
    '"Antrenman Sonrası", "Akşam / Yatmadan Önce" — metinde net değilse en yakınını seç) alanlarını doldur.\n\n' +
    'Genel kural: Metinde bu bilgilerden biri hiç yoksa ilgili alanı boş obje {} veya boş dizi [] yap. ' +
    'Metin tamamen bir antrenman programıysa (beslenme/supplement bilgisi hiç yoksa) ikisini de boş yap.\n\n' +
    'Metin:\n' + pdfText.substring(0, 15000)
  );
}

var dietPdfModal          = document.getElementById('dietPdfModal');
var openDietPdfBtn        = document.getElementById('openDietPdfBtn');
var openDietPdfBtnSupp    = document.getElementById('openDietPdfBtnSupp');
var closeDietPdfModalBtn  = document.getElementById('closeDietPdfModal');
var dietPdfFileInput      = document.getElementById('dietPdfFileInput');
var dietPdfSelectFileBtn  = document.getElementById('dietPdfSelectFileBtn');
var dietPdfRetryBtn       = document.getElementById('dietPdfRetryBtn');
var dietPdfConfirmBtn     = document.getElementById('dietPdfConfirmBtn');

var dietPdfParsed = null;

function showDietPdfStep(step) {
  ['dietPdfStepIntro', 'dietPdfStepProcessing', 'dietPdfStepError', 'dietPdfStepPreview'].forEach(function(id) {
    document.getElementById(id).classList.toggle('hidden', id !== step);
  });
  dietPdfConfirmBtn.classList.toggle('hidden', step !== 'dietPdfStepPreview');
}

function openDietPdfModal(title) {
  if (!getGeminiKey()) {
    alert('Önce "Kişisel Bilgiler" sayfasından Gemini API anahtarını kaydetmelisin.');
    showPage('profile');
    closeMenu();
    return;
  }
  document.getElementById('dietPdfModalTitle').textContent = title;
  showDietPdfStep('dietPdfStepIntro');
  dietPdfModal.classList.remove('hidden');
}

openDietPdfBtn.addEventListener('click', function() { openDietPdfModal("PDF'den Beslenme Planı Yükle"); });
openDietPdfBtnSupp.addEventListener('click', function() { openDietPdfModal("PDF'den Supplement Planı Yükle"); });

closeDietPdfModalBtn.addEventListener('click', function() {
  dietPdfModal.classList.add('hidden');
});
dietPdfModal.addEventListener('click', function(e) {
  if (e.target === dietPdfModal) dietPdfModal.classList.add('hidden');
});

dietPdfSelectFileBtn.addEventListener('click', function() { dietPdfFileInput.click(); });
dietPdfRetryBtn.addEventListener('click', function() { dietPdfFileInput.click(); });

dietPdfFileInput.addEventListener('change', function() {
  var file = dietPdfFileInput.files[0];
  dietPdfFileInput.value = '';
  if (!file) return;
  processDietPdfFile(file);
});

function processDietPdfFile(file) {
  showDietPdfStep('dietPdfStepProcessing');
  document.getElementById('dietPdfProcessingText').textContent = 'PDF okunuyor…';

  extractPdfText(file).then(function(text) {
    if (!text || text.trim().length < 20) {
      throw new Error('PDF içinden metin okunamadı. Taranmış (fotoğraf) bir PDF olabilir.');
    }
    document.getElementById('dietPdfProcessingText').textContent = 'AI planı analiz ediyor…';
    var prompt = buildDietPrompt(text);
    return callGeminiAPI(prompt, getGeminiKey());
  }).then(function(rawResponse) {
    var parsed = parseAIJson(rawResponse);

    var foodCount = 0;
    MEAL_ORDER.forEach(function(meal) {
      if (parsed.beslenmePlani && Array.isArray(parsed.beslenmePlani[meal])) {
        foodCount += parsed.beslenmePlani[meal].length;
      }
    });
    var suppCount = Array.isArray(parsed.supplementPlani) ? parsed.supplementPlani.length : 0;

    if (foodCount === 0 && suppCount === 0) {
      throw new Error(
        'Bu PDF\'de beslenme veya supplement bilgisi bulunamadı. Bir antrenman programı yüklemiş olabilirsin — ' +
        'onun için "Antrenman Planı" sayfasındaki PDF yükleme özelliğini kullan.'
      );
    }

    dietPdfParsed = parsed;
    renderDietPdfPreview();
    showDietPdfStep('dietPdfStepPreview');
  }).catch(function(err) {
    console.warn('[Diet PDF+AI] Hata:', err);
    var rawMsg = (err && err.message) ? err.message : 'Bilinmeyen bir hata oluştu.';
    var friendlyMsg = rawMsg;

    if (/invalid authentication credentials|OAuth 2 access token/i.test(rawMsg)) {
      friendlyMsg = 'Google\'ın "AQ." formatlı yeni API anahtarlarında şu an bilinen bir sunucu sorunu var. ' +
                    'Farklı bir Google hesabıyla yeni bir anahtar oluşturup güncellemeyi dene.';
    }

    document.getElementById('dietPdfErrorText').textContent = '⚠️ ' + friendlyMsg;
    showDietPdfStep('dietPdfStepError');
  });
}

// Yerel Türk mutfağı veritabanında (parçalı/esnek) eşleşme arar
function findLocalFoodFuzzy(name) {
  var all = [];
  Object.keys(TURKISH_FOODS).forEach(function(cat) { all = all.concat(TURKISH_FOODS[cat]); });
  var lower = (name || '').trim().toLowerCase();
  if (!lower) return null;

  var exact = all.find(function(f) { return f.name.toLowerCase() === lower; });
  if (exact) return exact;

  return all.find(function(f) {
    var base = f.name.toLowerCase().split(' (')[0];
    return f.name.toLowerCase().indexOf(lower) !== -1 || lower.indexOf(base) !== -1;
  }) || null;
}

function renderDietPdfPreview() {
  var nutritionBlock = document.getElementById('dietPdfPreviewNutrition');
  var supplementBlock = document.getElementById('dietPdfPreviewSupplement');
  var beslenme = dietPdfParsed.beslenmePlani || {};
  var supplement = dietPdfParsed.supplementPlani || [];

  var mealsWithFood = MEAL_ORDER.filter(function(m) { return Array.isArray(beslenme[m]) && beslenme[m].length > 0; });

  if (mealsWithFood.length > 0) {
    var html = '<p class="pdf-preview-day-title">🍽️ Beslenme Planı</p>';
    mealsWithFood.forEach(function(meal) {
      html += '<p class="pdf-preview-post-label">' + escapeHtml(meal) + '</p>';
      beslenme[meal].forEach(function(item) {
        var matched = findLocalFoodFuzzy(item.gida);
        var badge = matched ? '' : ' <span class="estimated-badge">~ Tahmini</span>';
        html +=
          '<div class="pdf-preview-exercise-wrap"><div class="pdf-preview-exercise">' +
            '<span class="pdf-preview-exercise-name">' + escapeHtml(item.gida) + badge + '</span>' +
            '<span class="pdf-preview-exercise-meta">' + escapeHtml(item.gram || 100) + 'g</span>' +
          '</div></div>';
      });
    });
    nutritionBlock.innerHTML = html;
    nutritionBlock.classList.remove('hidden');
  } else {
    nutritionBlock.classList.add('hidden');
  }

  if (supplement.length > 0) {
    var html2 = '<p class="pdf-preview-day-title">💊 Supplement Planı</p>';
    supplement.forEach(function(item) {
      html2 +=
        '<div class="pdf-preview-exercise-wrap"><div class="pdf-preview-exercise">' +
          '<span class="pdf-preview-exercise-name">' + escapeHtml(item.isim) + '</span>' +
          '<span class="pdf-preview-exercise-meta">' + escapeHtml(item.doz || '') + ' · ' + escapeHtml(item.zaman || '') + '</span>' +
        '</div></div>';
    });
    supplementBlock.innerHTML = html2;
    supplementBlock.classList.remove('hidden');
  } else {
    supplementBlock.classList.add('hidden');
  }
}

function mergeDietPlanIntoStorage(beslenmePlani) {
  var plan = getMealPlan();

  MEAL_ORDER.forEach(function(meal) {
    var items = beslenmePlani[meal];
    if (!Array.isArray(items) || items.length === 0) return;
    if (!plan[meal]) plan[meal] = [];

    items.forEach(function(item) {
      var grams = parseFloat(item.gram) || 100;
      var matched = findLocalFoodFuzzy(item.gida);
      var kcal100 = matched ? matched.kcal : (parseFloat(item.kcal100) || 0);
      var protein100 = matched ? matched.protein : (parseFloat(item.protein100) || 0);
      var carbs100 = matched ? matched.carbs : (parseFloat(item.carbs100) || 0);
      var fat100 = matched ? matched.fat : (parseFloat(item.fat100) || 0);
      var factor = grams / 100;

      plan[meal].push({
        id: 'food_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        name: item.gida,
        grams: grams,
        kcal100: kcal100, protein100: protein100, carbs100: carbs100, fat100: fat100,
        kcal: Math.round(kcal100 * factor),
        protein: Math.round(protein100 * factor * 10) / 10,
        carbs: Math.round(carbs100 * factor * 10) / 10,
        fat: Math.round(fat100 * factor * 10) / 10,
        isEstimated: !matched
      });
    });
  });

  saveMealPlan(plan);
}

function mergeSupplementPlanIntoStorage(supplementPlani) {
  var plan = getSupplementPlan();

  supplementPlani.forEach(function(item) {
    var timing = SUPP_TIMING_ORDER.indexOf(item.zaman) !== -1 ? item.zaman : 'Sabah';
    if (!plan[timing]) plan[timing] = [];
    plan[timing].push({
      id: 'supp_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      name: item.isim,
      dose: item.doz || '',
      note: ''
    });
  });

  saveSupplementPlan(plan);
}

dietPdfConfirmBtn.addEventListener('click', function() {
  if (!dietPdfParsed) return;

  if (dietPdfParsed.beslenmePlani) {
    mergeDietPlanIntoStorage(dietPdfParsed.beslenmePlani);
    renderMealPlanView();
  }
  if (Array.isArray(dietPdfParsed.supplementPlani) && dietPdfParsed.supplementPlani.length > 0) {
    mergeSupplementPlanIntoStorage(dietPdfParsed.supplementPlani);
    renderSupplementPlanView();
  }

  dietPdfModal.classList.add('hidden');
  dietPdfParsed = null;
});

/* ══════════════════════════════════════════
   SAYI SEÇİCİ — kaydırarak değer girme

   Elle yazmak yerine iOS tarzı tekerlek. Alanın kendisi <input> olarak
   kalıyor; yalnızca salt okunur olup dokununca seçiciyi açıyor. Böylece
   kaydetme, doğrulama ve testler hiç değişmeden çalışmaya devam ediyor.

   Aralıklar SAYI_ARALIK'tan okunuyor — sınırların tek kaynağı orası.
   ══════════════════════════════════════════ */

var SECICI_OGE_Y = 40;      // .secici-oge yüksekliğiyle aynı olmalı
var seciciDurum = null;

var sayiSeciciEl   = document.getElementById('sayiSecici');
var seciciTekerlek = document.getElementById('seciciTekerlek');
var seciciBaslikEl = document.getElementById('seciciBaslik');

/* Bir sütun kurar ve seçili değere kaydırır.
   degerler: gösterilecek diziler, secili: başlangıç değeri */
function seciciSutunKur(degerler, secili, etiket) {
  var sutun = document.createElement('div');
  sutun.className = 'secici-sutun';
  sutun.tabIndex = 0;
  sutun.setAttribute('role', 'listbox');
  if (etiket) sutun.setAttribute('aria-label', etiket);

  var html = '';
  for (var i = 0; i < degerler.length; i++) {
    html += '<div class="secici-oge" data-deger="' + escapeHtml(degerler[i]) + '">' +
            escapeHtml(degerler[i]) + '</div>';
  }
  sutun.innerHTML = html;

  var indeks = degerler.indexOf(secili);
  if (indeks < 0) indeks = 0;
  sutun._degerler = degerler;

  // Kaydırma bittiğinde ortadaki öğeyi seçili say
  var zaman = null;
  sutun.addEventListener('scroll', function() {
    clearTimeout(zaman);
    zaman = setTimeout(function() { seciciSutunIsaretle(sutun); }, 90);
  }, { passive: true });

  // Öğeye dokununca oraya kaydır
  sutun.addEventListener('click', function(e) {
    var oge = e.target.closest('.secici-oge');
    if (!oge) return;
    var i = [].indexOf.call(sutun.children, oge);
    sutun.scrollTo({ top: i * SECICI_OGE_Y, behavior: 'smooth' });
  });

  // Yerleşim oturduktan sonra konumlandır
  requestAnimationFrame(function() {
    sutun.scrollTop = indeks * SECICI_OGE_Y;
    seciciSutunIsaretle(sutun);
  });
  return sutun;
}

function seciciSutunIndeksi(sutun) {
  var i = Math.round(sutun.scrollTop / SECICI_OGE_Y);
  return Math.max(0, Math.min(sutun._degerler.length - 1, i));
}

function seciciSutunIsaretle(sutun) {
  var i = seciciSutunIndeksi(sutun);
  for (var k = 0; k < sutun.children.length; k++) {
    sutun.children[k].classList.toggle('secili', k === i);
  }
}

function seciciSutunDegeri(sutun) {
  return sutun._degerler[seciciSutunIndeksi(sutun)];
}

/* Seçiciyi açar.
   tur: SAYI_ARALIK anahtarı, ondalik: 0.1 adımlı ikinci sütun olsun mu */
function sayiSecicisiAc(tur, mevcutDeger, ondalik, onayla) {
  var k = SAYI_ARALIK[tur];
  if (!k) return;

  var sayi = parseFloat(String(mevcutDeger).replace(',', '.'));
  if (isNaN(sayi)) sayi = Math.round((k.min + k.max) / 2);
  sayi = Math.max(k.min, Math.min(k.max, sayi));

  var tamlar = [];
  for (var v = Math.ceil(k.min); v <= Math.floor(k.max); v++) tamlar.push(String(v));

  seciciBaslikEl.textContent = k.ad + (k.birim ? ' (' + k.birim + ')' : '');
  // Bandı koru, sütunları tazele
  [].slice.call(seciciTekerlek.querySelectorAll('.secici-sutun, .secici-birim'))
    .forEach(function(el) { el.remove(); });

  var tamSutun = seciciSutunKur(tamlar, String(Math.floor(sayi)), k.ad);
  seciciTekerlek.appendChild(tamSutun);

  var ondalikSutun = null;
  if (ondalik) {
    var basamaklar = [];
    for (var d = 0; d < 10; d++) basamaklar.push('.' + d);
    var mevcutOndalik = '.' + Math.round((sayi - Math.floor(sayi)) * 10);
    ondalikSutun = seciciSutunKur(basamaklar, mevcutOndalik, 'ondalık');
    seciciTekerlek.appendChild(ondalikSutun);
  }

  if (k.birim) {
    var birim = document.createElement('span');
    birim.className = 'secici-birim';
    birim.textContent = k.birim;
    seciciTekerlek.appendChild(birim);
  }

  seciciDurum = {
    tamSutun: tamSutun, ondalikSutun: ondalikSutun, onayla: onayla
  };
  sayiSeciciEl.classList.remove('hidden');
}

function sayiSecicisiKapat() {
  sayiSeciciEl.classList.add('hidden');
  seciciDurum = null;
}

document.getElementById('seciciKapat').addEventListener('click', sayiSecicisiKapat);
sayiSeciciEl.addEventListener('click', function(e) {
  if (e.target === sayiSeciciEl) sayiSecicisiKapat();
});

document.getElementById('seciciOnayla').addEventListener('click', function() {
  if (!seciciDurum) return;
  var deger = seciciSutunDegeri(seciciDurum.tamSutun);
  if (seciciDurum.ondalikSutun) {
    var kesir = seciciSutunDegeri(seciciDurum.ondalikSutun);   // ".4"
    if (kesir !== '.0') deger = deger + kesir;
  }
  var onayla = seciciDurum.onayla;
  sayiSecicisiKapat();
  if (onayla) onayla(deger);
});

/* Bir <input>'u seçiciye bağlar. Alan salt okunur olur, dokununca seçici açılır.
   Klavye kullanıcısı için Enter ve Boşluk da açıyor. */
function girdiyiSeciciyeBagla(inputId, tur, ondalik) {
  var el = document.getElementById(inputId);
  if (!el) return;
  el.readOnly = true;
  el.classList.add('secici-alan');
  el.setAttribute('inputmode', 'none');

  var ac = function() {
    // tur bir fonksiyon olabilir: aralık, alanın o anki bağlamına göre değişsin diye
    sayiSecicisiAc(typeof tur === 'function' ? tur() : tur, el.value, ondalik, function(deger) {
      el.value = deger;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };
  el.addEventListener('click', ac);
  el.addEventListener('focus', function() { el.blur(); });   // klavye açılmasın
  el.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ac(); }
  });
}

girdiyiSeciciyeBagla('input-height',    'height',     false);
girdiyiSeciciyeBagla('input-weight',    'weight',     true);
girdiyiSeciciyeBagla('input-age',       'age',        false);
girdiyiSeciciyeBagla('goal-weight',     'goalWeight', true);
girdiyiSeciciyeBagla('weighin-weight',  'weight',     true);
girdiyiSeciciyeBagla('food-amount',     gidaMiktarTuru, false);

/* ══════════════════════════════════════════
   DOKUNMA JESTLERİ — sayfa kaydırma ve yakınlaştırma
   Tek parmak yatay: sayfalar arası geçiş.
   İki parmak: yakınlaştırma; parmak kalkınca eski haline döner.
   İkisi aynı dokunma akışını paylaştığı için tek yerde toplandı — ayrı
   dinleyiciler birbirinin jestini yarıda keserdi.
   ══════════════════════════════════════════ */

// Alt menüdeki sıra; kaydırma bu sırayı izliyor. Ayarlar alt menüde yok.
var SAYFA_SIRASI = [].map.call(bottomItems, function(b) { return b.dataset.page; });

function aktifSayfa() {
  for (var i = 0; i < pages.length; i++) {
    if (!pages[i].classList.contains('hidden')) return pages[i].id.replace(/^page-/, '');
  }
  return SAYFA_SIRASI[0];
}

/* Jestin başladığı yer sayfa geçişine uygun mu?
   Modal açıkken, yatay kaydırılan bir şeridin ya da form öğesinin üstünde
   jesti yutmuyoruz — oradaki hareket kendi işine ait. */
function jestUygunMu(hedef) {
  if (document.querySelector('.modal-overlay-2:not(.hidden)')) return false;
  if (dropdownMenu.classList.contains('open')) return false;
  if (!hedef || !hedef.closest) return false;
  if (hedef.closest('.day-tabs-scroll, input, select, textarea, .secici-tekerlek')) return false;
  return true;
}

/* ── Sayfayı parmakla sürükleme ──
   Sayfa parmağı anlık takip ediyor: sürüklerken iki sayfa da birlikte kayıyor,
   parmak kalkınca ya tamamlanıyor ya geri dönüyor. Önceki hâlde hareket ancak
   parmak kalktıktan sonra başlıyordu, o yüzden jest "tutmuyor" hissi veriyordu. */
var SURUKLEME_KILIT = 12;     // bu kadar yol gidince yön kilitlenir
var SURUKLEME_ORAN = 1.2;     // yatay hareket dikeyden bu kadar baskın olmalı
var TAMAMLAMA_ORANI = 0.3;    // genişliğin bu kadarı geçilirse sayfa değişir
var TAMAMLAMA_HIZI = 0.4;     // px/ms — hızlı fiske kısa yolda da tamamlar
var FISKE_EN_AZ = 45;         // ama fiske de bu kadar yol gitmeli; yoksa
                              // 20 piksellik seğirme sayfayı değiştiriyor
var SURUKLEME_SURE = 260;     // bırakınca tamamlama/geri dönüş süresi
var UC_DIRENCI = 3;           // uçlarda sayfa bu kadar az kayar

// Sürükleme sırasında sayfalara konan satır içi stiller
var SURUKLEME_STILLERI = ['position', 'left', 'width', 'top', 'bottom',
                          'overflow', 'transition', 'transform', 'animation'];

var surukleme = null;
var surukleTemizle = null;

function stilleriSil(p) {
  if (p) SURUKLEME_STILLERI.forEach(function(k) { p.style[k] = ''; });
}

function gorunenSayfa() {
  for (var i = 0; i < pages.length; i++) {
    if (!pages[i].classList.contains('hidden')) return pages[i];
  }
  return null;
}

function komsuSayfa(ileri) {
  var su = SAYFA_SIRASI.indexOf(aktifSayfa());
  if (su === -1) return null;
  var h = su + (ileri ? 1 : -1);
  if (h < 0 || h >= SAYFA_SIRASI.length) return null;   // uçlarda dönmüyor
  return document.getElementById('page-' + SAYFA_SIRASI[h]);
}

/* Komşu sayfayı ekranın hemen dışına yerleştirir.
   Sabit (fixed) konum kullanılıyor: sayfa aşağı kaydırılmışken akıştaki bir
   kardeş ekranda hiç görünmezdi, sürüklemeye başlar başlamaz tepeye zıplamak
   gerekirdi. Sabit konum sürüklemeyi kaydırma konumundan bağımsız kılıyor. */
function komsuyuKur(ileri) {
  if (surukleme.ileri === ileri) return;
  komsuyuKaldir();
  surukleme.ileri = ileri;
  var yeni = komsuSayfa(ileri);
  surukleme.yeni = yeni;
  if (!yeni) return;

  var k = surukleme.eski.getBoundingClientRect();
  yeni.classList.remove('hidden');
  yeni.classList.add('suruklenen');
  yeni.style.animation = 'none';
  yeni.style.position = 'fixed';
  yeni.style.left = k.left + 'px';
  yeni.style.width = k.width + 'px';
  // Sayfa akışa döndüğünde .app-main'in üst boşluğundan başlıyor. Sürüklerken
  // başlığın hemen altına konsaydı, geçiş bitince içerik o farkı kadar aşağı
  // sıçrardı — ölçülen 15 px'lik zıplama buradan geliyordu.
  yeni.style.top = (parseFloat(getComputedStyle(surukleme.ana).paddingTop) || 0) + 'px';
  yeni.style.bottom = '0';
  yeni.style.overflow = 'hidden';
  yeni.style.transition = 'none';
  yeni.style.transform = 'translateX(' + (ileri ? surukleme.hucre : -surukleme.hucre) + 'px)';
}

function komsuyuKaldir() {
  if (!surukleme || !surukleme.yeni) return;
  stilleriSil(surukleme.yeni);
  surukleme.yeni.classList.remove('suruklenen');
  surukleme.yeni.classList.add('hidden');
  surukleme.yeni = null;
}

function suruklemeyeBasla() {
  if (surukleTemizle) surukleTemizle();     // yarım kalan geçiş varsa kapat
  var ana = document.querySelector('.app-main');
  var eski = gorunenSayfa();
  if (!ana || !eski) return false;
  ana.classList.add('gecis-suruyor');
  surukleme.ana = ana;
  surukleme.eski = eski;
  // "Hücre" genişliği: sayfa + iki yanındaki boşluk. Sayfa yalnız kendi
  // genişliği kadar kaysaydı kenarında ince bir şerit ekranda kalırdı.
  surukleme.hucre = ana.getBoundingClientRect().width || 1;
  surukleme.ileri = null;
  surukleme.yeni = null;

  // Sayfanın giriş animasyonu 'both' dolgusuyla tanımlı, yani bittikten sonra
  // da transform'u tutuyor. Animasyon satır içi stilden güçlü olduğu için
  // kapatılmazsa buradaki kaydırmayı eziyor ve çıkan sayfa hiç kımıldamıyor.
  eski.style.animation = 'none';
  return true;
}

function suruklemeyiGuncelle(dx) {
  komsuyuKur(dx < 0);
  var yol = surukleme.yeni ? dx : dx / UC_DIRENCI;   // uçta lastik gibi direniyor
  surukleme.eski.style.transition = 'none';
  surukleme.eski.style.transform = 'translateX(' + yol + 'px)';
  if (surukleme.yeni) {
    var disarisi = surukleme.ileri ? surukleme.hucre : -surukleme.hucre;
    surukleme.yeni.style.transform = 'translateX(' + (disarisi + dx) + 'px)';
  }
}

function suruklemeyiBitir(dx, sure) {
  var s = surukleme;
  surukleme = null;
  if (!s || !s.eski) return;

  var g = s.hucre;
  var hiz = sure > 0 ? Math.abs(dx) / sure : 0;
  var tamamla = !!s.yeni && ((dx < 0) === s.ileri) &&
    (Math.abs(dx) > g * TAMAMLAMA_ORANI ||
     (hiz > TAMAMLAMA_HIZI && Math.abs(dx) >= FISKE_EN_AZ));

  var gecis = 'transform ' + SURUKLEME_SURE + 'ms cubic-bezier(0.32, 0.72, 0, 1)';
  s.eski.style.transition = gecis;
  if (s.yeni) s.yeni.style.transition = gecis;

  if (tamamla) {
    s.eski.style.transform = 'translateX(' + (s.ileri ? -g : g) + 'px)';
    s.yeni.style.transform = 'translateX(0px)';
  } else {
    s.eski.style.transform = 'translateX(0px)';
    if (s.yeni) s.yeni.style.transform = 'translateX(' + (s.ileri ? g : -g) + 'px)';
  }

  var hedef = tamamla ? s.yeni.id.replace(/^page-/, '') : null;
  var zaman = setTimeout(function() { if (surukleTemizle) surukleTemizle(); }, SURUKLEME_SURE + 20);
  surukleTemizle = function() {
    clearTimeout(zaman);
    surukleTemizle = null;
    // Kaydırma sıfırlanması yeni sayfa ekranı kaplarken yapılıyor ki görünmesin
    if (hedef) window.scrollTo(0, 0);
    stilleriSil(s.eski);
    stilleriSil(s.yeni);
    if (s.yeni) s.yeni.classList.remove('suruklenen');
    s.ana.classList.remove('gecis-suruyor');
    if (hedef) showPage(hedef, true);
    else if (s.yeni) s.yeni.classList.add('hidden');
  };
}

/* ── Yakınlaştırma ──
   Tarayıcının kendi pinch-zoom'u geri alınamıyor (seviyeyi okuyabiliyoruz ama
   ayarlayamıyoruz), o yüzden onu kapatıp kendi ölçeğimizi uyguluyoruz. */
var ZUM_EN_COK = 3;
var zumKatmani = document.querySelector('.app-main');
var zum = null;

function ikiParmakArasi(t) {
  var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function ikiParmakOrtasi(t) {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

function zumBaslat(t) {
  if (!zumKatmani) return;
  var kutu = zumKatmani.getBoundingClientRect();
  var orta = ikiParmakOrtasi(t);
  zum = {
    mesafe: ikiParmakArasi(t),
    baslangicOrtasi: orta,
    // Büyütme iki parmağın ortasından açılsın, köşeden değil
    ox: orta.x - kutu.left,
    oy: orta.y - kutu.top
  };
  zumKatmani.style.transition = 'none';
  zumKatmani.style.transformOrigin = zum.ox + 'px ' + zum.oy + 'px';
}

function zumGuncelle(t) {
  if (!zum || !zum.mesafe) return;
  var olcek = ikiParmakArasi(t) / zum.mesafe;
  olcek = Math.max(1, Math.min(ZUM_EN_COK, olcek));

  // İki parmağın ortası kaydıkça içerik de kayıyor: yakınlaşınca ekranda
  // kalan yere mahkûm olmamak, gezinebilmek için.
  var orta = ikiParmakOrtasi(t);
  var kutu = zumKatmani.getBoundingClientRect();
  // Kaydırma, taşan miktarla sınırlı — içerik ekrandan tamamen çekilmesin
  var enCokX = (olcek - 1) * zumKatmani.offsetWidth / 2;
  var enCokY = (olcek - 1) * Math.min(zumKatmani.offsetHeight, window.innerHeight) / 2;
  var kx = Math.max(-enCokX, Math.min(enCokX, orta.x - zum.baslangicOrtasi.x));
  var ky = Math.max(-enCokY, Math.min(enCokY, orta.y - zum.baslangicOrtasi.y));

  zumKatmani.style.transform =
    'translate(' + Math.round(kx) + 'px, ' + Math.round(ky) + 'px) scale(' + olcek + ')';
}

function zumBitir() {
  if (!zum) return;
  zum = null;
  // Parmak kalkınca eski haline dönüş — istenen davranış bu
  zumKatmani.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
  zumKatmani.style.transform = '';
}

function suruklemeyiIptalEt() {
  if (surukleme && surukleme.kilit === 'yatay') suruklemeyiBitir(0, 1);
  surukleme = null;
}

document.addEventListener('touchstart', function(e) {
  if (e.touches.length === 2 && jestUygunMu(e.target)) {
    suruklemeyiIptalEt();      // iki parmak başladıysa sayfa sürükleme iptal
    zumBaslat(e.touches);
    return;
  }
  if (e.touches.length !== 1) return;
  zumBitir();
  if (!jestUygunMu(e.target)) { surukleme = null; return; }
  surukleme = { x: e.touches[0].clientX, y: e.touches[0].clientY, an: Date.now(), kilit: null };
}, { passive: true });

document.addEventListener('touchmove', function(e) {
  if (zum && e.touches.length === 2) {
    e.preventDefault();        // tarayıcının kendi zoom'u devreye girmesin
    zumGuncelle(e.touches);
    return;
  }
  if (!surukleme || e.touches.length !== 1) return;

  var dx = e.touches[0].clientX - surukleme.x;
  var dy = e.touches[0].clientY - surukleme.y;

  // Yön bir kez kilitleniyor: kilitlenmeden önce tarayıcı kendi dikey
  // kaydırmasını yapabilsin, kilitlendikten sonra jest bize ait olsun.
  if (!surukleme.kilit) {
    if (Math.abs(dx) >= SURUKLEME_KILIT && Math.abs(dx) > Math.abs(dy) * SURUKLEME_ORAN) {
      if (!suruklemeyeBasla()) { surukleme = null; return; }
      surukleme.kilit = 'yatay';
    } else if (Math.abs(dy) >= SURUKLEME_KILIT) {
      surukleme.kilit = 'dikey';
    } else {
      return;
    }
  }
  if (surukleme.kilit !== 'yatay') return;

  e.preventDefault();          // yatay sürüklerken sayfa dikey kaymasın
  suruklemeyiGuncelle(dx);
}, { passive: false });

document.addEventListener('touchend', function(e) {
  if (zum && e.touches.length < 2) { zumBitir(); surukleme = null; return; }
  if (!surukleme || e.touches.length) return;

  if (surukleme.kilit !== 'yatay') { surukleme = null; return; }
  var dx = e.changedTouches[0].clientX - surukleme.x;
  suruklemeyiBitir(dx, Date.now() - surukleme.an);
}, { passive: true });

document.addEventListener('touchcancel', function() {
  zumBitir(); suruklemeyiIptalEt();
}, { passive: true });

// iOS Safari kendi jest olaylarını ayrıca yolluyor; engellenmezse yine zoom yapar
['gesturestart', 'gesturechange', 'gestureend'].forEach(function(ad) {
  document.addEventListener(ad, function(e) { e.preventDefault(); }, { passive: false });
});
