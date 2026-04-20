const LEGACY_STORAGE_KEY = 'macroPlannerDay_v1';
const FOOD_LIBRARY_STORAGE_KEY = 'macroPlannerFoodLibrary_v1';
const DAY_STATE_STORAGE_KEY = 'macroPlannerDayState_v1';
const PROGRESS_LOG_STORAGE_KEY = 'macroPlannerProgressLog_v1';

const fields = {
  dailyCalorieGoal: document.getElementById('dailyCalorieGoal'),
  mealsCount: document.getElementById('mealsCount'),
};

const uiFields = {
  themeToggle: document.getElementById('themeToggle'),
  libraryToggle: document.getElementById('libraryToggle'),
  librarySection: document.getElementById('librarySection'),
  progressToggle: document.getElementById('progressToggle'),
  progressSection: document.getElementById('progressSection'),
  printMenuButton: document.getElementById('printMenuButton'),
  resetDayButton: document.getElementById('resetDayButton'),
};

const libraryFields = {
  form: document.getElementById('foodLibraryForm'),
  foodName: document.getElementById('libraryFoodName'),
  protein: document.getElementById('libraryProtein'),
  carbs: document.getElementById('libraryCarbs'),
  fat: document.getElementById('libraryFat'),
  caloriesPreview: document.getElementById('libraryCaloriesPreview'),
  error: document.getElementById('libraryFoodError'),
  list: document.getElementById('foodLibraryList'),
  exportButton: document.getElementById('libraryExportButton'),
  importButton: document.getElementById('libraryImportButton'),
  importInput: document.getElementById('libraryImportInput'),
  statusMessage: document.getElementById('libraryStatusMessage'),
};

const progressFields = {
  form: document.getElementById('progressLogForm'),
  date: document.getElementById('progressDate'),
  weight: document.getElementById('progressWeight'),
  bodyFat: document.getElementById('progressBodyFat'),
  calories: document.getElementById('progressCalories'),
  error: document.getElementById('progressFormError'),
  status: document.getElementById('progressStatusMessage'),
  list: document.getElementById('progressLogList'),
  exportCsv: document.getElementById('exportProgressCsvButton'),
  charts: {
    weight: document.getElementById('weightChart'),
    bodyFat: document.getElementById('bodyFatChart'),
    calories: document.getElementById('caloriesChart'),
  },
  chartEmpty: {
    weight: document.getElementById('weightChartEmpty'),
    bodyFat: document.getElementById('bodyFatChartEmpty'),
    calories: document.getElementById('caloriesChartEmpty'),
  },
};

const summary = {
  protein: document.getElementById('dailyProtein'),
  carbs: document.getElementById('dailyCarbs'),
  fat: document.getElementById('dailyFat'),
  calories: document.getElementById('dailyCalories'),
  goal: document.getElementById('dailyGoal'),
  remaining: document.getElementById('dailyRemaining'),
};

const mealsContainer = document.getElementById('mealsContainer');
const printMenuSection = document.getElementById('printMenuSection');
let isPrintModeActive = false;
cleanupPrintMode();

function safeParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateCaloriesPer100(protein, carbs, fat) {
  if (protein === null || carbs === null || fat === null) return 0;
  return protein * 4 + carbs * 4 + fat * 9;
}

function createFoodId() {
  return `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialMeals(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Comida ${index + 1}`,
    foods: [],
  }));
}

function createDefaultDayState() {
  return {
    dailyCalorieGoal: 0,
    mealsCount: 3,
    meals: createInitialMeals(3),
    ui: {
      libraryOpen: false,
      progressOpen: true,
      theme: 'light',
    },
  };
}

function normalizeFood(rawFood) {
  if (!rawFood || typeof rawFood !== 'object') return null;

  const name = typeof rawFood.name === 'string' ? rawFood.name.trim() : '';
  const protein = toNumber(rawFood.protein);
  const carbs = toNumber(rawFood.carbs);
  const fat = toNumber(rawFood.fat);

  if (!name || protein === null || carbs === null || fat === null) return null;
  if (protein < 0 || carbs < 0 || fat < 0) return null;

  return {
    id:
      typeof rawFood.id === 'string' && rawFood.id
        ? rawFood.id
        : createFoodId(),
    name,
    protein,
    carbs,
    fat,
    caloriesPer100: calculateCaloriesPer100(protein, carbs, fat),
  };
}

function normalizeMealFood(rawFood) {
  if (!rawFood || typeof rawFood !== 'object') return null;

  const name = typeof rawFood.name === 'string' ? rawFood.name.trim() : '';
  const protein = toNumber(rawFood.protein);
  const carbs = toNumber(rawFood.carbs);
  const fat = toNumber(rawFood.fat);
  const consumedGrams = toNumber(rawFood.consumedGrams);

  if (!name || protein === null || carbs === null || fat === null || consumedGrams === null) return null;
  if (protein < 0 || carbs < 0 || fat < 0 || consumedGrams <= 0) return null;

  return {
    sourceFoodId: typeof rawFood.sourceFoodId === 'string' ? rawFood.sourceFoodId : null,
    name,
    protein,
    carbs,
    fat,
    consumedGrams,
    caloriesPer100: calculateCaloriesPer100(protein, carbs, fat),
  };
}

function normalizeProgressLogEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== 'object') return null;

  const date = typeof rawEntry.date === 'string' ? rawEntry.date.trim() : '';
  const weight = toNumber(rawEntry.weight);
  const bodyFat = toNumber(rawEntry.bodyFat);
  const calories = toNumber(rawEntry.calories);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (weight === null || weight <= 0) return null;
  if (bodyFat === null || bodyFat < 0) return null;
  if (calories === null || calories < 0) return null;

  return {
    id:
      typeof rawEntry.id === 'string' && rawEntry.id
        ? rawEntry.id
        : createLogId(),
    date,
    weight,
    bodyFat,
    calories,
  };
}

function sortProgressLogDesc(entries) {
  return [...entries].sort((a, b) => {
    if (a.date === b.date) return b.id.localeCompare(a.id);
    return b.date.localeCompare(a.date);
  });
}

function getFoodFingerprint(rawFood) {
  const food = normalizeFood(rawFood);
  if (!food) return null;

  return [
    food.name.trim().toLowerCase(),
    food.protein.toFixed(4),
    food.carbs.toFixed(4),
    food.fat.toFixed(4),
  ].join('__');
}

function dedupeFoodLibrary(rawLibrary) {
  const map = new Map();

  rawLibrary.forEach((rawFood) => {
    const food = normalizeFood(rawFood);
    if (!food) return;

    const fingerprint = getFoodFingerprint(food);
    if (!fingerprint || map.has(fingerprint)) return;

    map.set(fingerprint, food);
  });

  return [...map.values()];
}

function normalizeMeals(rawMeals, mealsCount) {
  const parsedMeals = Array.isArray(rawMeals) ? rawMeals : [];

  return createInitialMeals(mealsCount).map((defaultMeal, index) => {
    const existing = parsedMeals[index] || {};
    const foods = Array.isArray(existing.foods)
      ? existing.foods.map(normalizeMealFood).filter(Boolean)
      : [];

    return {
      name:
        typeof existing.name === 'string' && existing.name.trim()
          ? existing.name.trim()
          : defaultMeal.name,
      foods,
    };
  });
}

function extractFoodLibraryFromParsed(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  const library = Array.isArray(parsed.foodLibrary) ? parsed.foodLibrary : [];
  return dedupeFoodLibrary(library);
}

function extractDayStateFromParsed(parsed) {
  const baseState = createDefaultDayState();

  if (!parsed || typeof parsed !== 'object') return baseState;

  const parsedMealsInput = Array.isArray(parsed.meals) ? parsed.meals : [];
  const parsedMealsCount = Math.round(
    toNumber(parsed.mealsCount) || parsedMealsInput.length || baseState.mealsCount
  );
  const mealsCount = Math.min(12, Math.max(1, parsedMealsCount));
  const parsedUi = parsed.ui || {};

  return {
    dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0),
    mealsCount,
    meals: normalizeMeals(parsed.meals, mealsCount),
    ui: {
      libraryOpen: Boolean(parsedUi.libraryOpen),
      progressOpen:
        typeof parsedUi.progressOpen === 'boolean' ? parsedUi.progressOpen : true,
      theme: parsedUi.theme === 'dark' ? 'dark' : 'light',
    },
  };
}

function migrateLegacyStorageIfNeeded() {
  const hasNewLibrary = localStorage.getItem(FOOD_LIBRARY_STORAGE_KEY) !== null;
  const hasNewDay = localStorage.getItem(DAY_STATE_STORAGE_KEY) !== null;

  if (hasNewLibrary && hasNewDay) return;

  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyRaw) return;

  const legacyParsed = safeParseJson(legacyRaw);
  if (!legacyParsed || typeof legacyParsed !== 'object') return;

  if (!hasNewLibrary) {
    const legacyLibrary = extractFoodLibraryFromParsed(legacyParsed);
    localStorage.setItem(FOOD_LIBRARY_STORAGE_KEY, JSON.stringify(legacyLibrary));
  }

  if (!hasNewDay) {
    const legacyDayState = extractDayStateFromParsed(legacyParsed);
    localStorage.setItem(DAY_STATE_STORAGE_KEY, JSON.stringify(legacyDayState));
  }
}

function loadFoodLibrary() {
  const raw = localStorage.getItem(FOOD_LIBRARY_STORAGE_KEY);
  if (!raw) return [];

  const parsed = safeParseJson(raw);
  if (!parsed || !Array.isArray(parsed)) return [];

  return dedupeFoodLibrary(parsed);
}

function loadDayState() {
  const raw = localStorage.getItem(DAY_STATE_STORAGE_KEY);
  if (!raw) return createDefaultDayState();

  const parsed = safeParseJson(raw);
  return extractDayStateFromParsed(parsed);
}

function loadProgressLog() {
  const raw = localStorage.getItem(PROGRESS_LOG_STORAGE_KEY);
  if (!raw) return [];

  const parsed = safeParseJson(raw);
  if (!parsed || !Array.isArray(parsed)) return [];

  return sortProgressLogDesc(parsed.map(normalizeProgressLogEntry).filter(Boolean));
}

function saveFoodLibrary() {
  const uniqueLibrary = dedupeFoodLibrary(state.foodLibrary);
  state.foodLibrary = uniqueLibrary;
  localStorage.setItem(FOOD_LIBRARY_STORAGE_KEY, JSON.stringify(uniqueLibrary));
}

function saveDayState() {
  const dayState = {
    dailyCalorieGoal: state.dailyCalorieGoal,
    mealsCount: state.mealsCount,
    meals: state.meals,
    ui: state.ui,
  };

  localStorage.setItem(DAY_STATE_STORAGE_KEY, JSON.stringify(dayState));
}

function saveProgressLog() {
  state.progressLog = sortProgressLogDesc(state.progressLog);
  localStorage.setItem(PROGRESS_LOG_STORAGE_KEY, JSON.stringify(state.progressLog));
}

function showStatus(element, message, tone = 'info') {
  if (!element) return;
  element.textContent = message;
  element.dataset.tone = tone;
}

function showLibraryStatus(message, tone = 'info') {
  showStatus(libraryFields.statusMessage, message, tone);
}

function showProgressStatus(message, tone = 'info') {
  showStatus(progressFields.status, message, tone);
}

function readLibraryFromImportPayload(parsed) {
  if (Array.isArray(parsed)) return parsed;

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.foodLibrary)) return parsed.foodLibrary;
    if (Array.isArray(parsed.library)) return parsed.library;
    if (Array.isArray(parsed.foods)) return parsed.foods;
  }

  return null;
}

function applyTheme() {
  if (!uiFields.themeToggle) return;
  document.documentElement.setAttribute('data-theme', state.ui.theme);
  uiFields.themeToggle.textContent = state.ui.theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function updateLibraryVisibility() {
  if (!uiFields.librarySection || !uiFields.libraryToggle) return;

  uiFields.librarySection.classList.toggle('hidden', !state.ui.libraryOpen);
  uiFields.libraryToggle.textContent = state.ui.libraryOpen
    ? 'Ocultar biblioteca de alimentos'
    : 'Mostrar biblioteca de alimentos';
}

function updateProgressVisibility() {
  if (!uiFields.progressSection || !uiFields.progressToggle) return;

  uiFields.progressSection.classList.toggle('hidden', !state.ui.progressOpen);
  uiFields.progressToggle.textContent = state.ui.progressOpen
    ? 'Ocultar registro diario'
    : 'Mostrar registro diario';
}

function getFoodTotals(food) {
  const factor = food.consumedGrams / 100;

  return {
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
    calories: food.caloriesPer100 * factor,
  };
}

function getMealTotals(meal) {
  return meal.foods.reduce(
    (acc, food) => {
      const item = getFoodTotals(food);

      return {
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        calories: acc.calories + item.calories,
      };
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );
}

function getDayTotals() {
  return state.meals.reduce(
    (acc, meal) => {
      const subtotal = getMealTotals(meal);

      return {
        protein: acc.protein + subtotal.protein,
        carbs: acc.carbs + subtotal.carbs,
        fat: acc.fat + subtotal.fat,
        calories: acc.calories + subtotal.calories,
      };
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );
}

function getPrintableDate() {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function buildPrintableMenuHtml() {
  const escape = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const mealsWithFoods = state.meals.filter((meal) => meal.foods.length > 0);

  if (!mealsWithFoods.length) {
    alert('Aún no hay comidas con ingredientes para imprimir.');
    return null;
  }

  const dayTotals = getDayTotals();

  const mealsHtml = mealsWithFoods
    .map((meal) => {
      const mealTotals = getMealTotals(meal);
      const ingredientsHtml = meal.foods
        .map(
          (food) => `
            <li>
              <span>${escape(food.name)}</span>
              <strong>${food.consumedGrams.toFixed(1)} g</strong>
            </li>
          `
        )
        .join('');

      return `
        <section class="print-meal">
          <h2>${escape(meal.name)}</h2>
          <ul class="print-ingredients">${ingredientsHtml}</ul>
          <p class="print-meal-subtotal">
            Subtotal: P ${mealTotals.protein.toFixed(1)} g · C ${mealTotals.carbs.toFixed(1)} g · G ${mealTotals.fat.toFixed(1)} g · ${Math.round(mealTotals.calories)} kcal
          </p>
        </section>
      `;
    })
    .join('');

  return `
    <div class="print-menu-page">
      <h1>Menú diario de comidas</h1>
      <p class="print-date">Fecha: ${escape(getPrintableDate())}</p>
      ${mealsHtml}
      <section class="print-daily-summary">
        Resumen diario: P ${dayTotals.protein.toFixed(1)} g · C ${dayTotals.carbs.toFixed(1)} g · G ${dayTotals.fat.toFixed(1)} g · ${Math.round(dayTotals.calories)} kcal
      </section>
    </div>
  `;
}

function cleanupPrintMode() {
  if (!isPrintModeActive) return;
  isPrintModeActive = false;
  document.body.classList.remove('printing-menu');
  if (printMenuSection) {
    printMenuSection.classList.add('hidden');
    printMenuSection.setAttribute('aria-hidden', 'true');
    printMenuSection.innerHTML = '';
  }
}

function openPrintableMenu() {
  if (!printMenuSection) return;

  const printableHtml = buildPrintableMenuHtml();
  if (!printableHtml) return;

  printMenuSection.innerHTML = printableHtml;
  printMenuSection.classList.remove('hidden');
  printMenuSection.setAttribute('aria-hidden', 'false');

  isPrintModeActive = true;
  document.body.classList.add('printing-menu');

  setTimeout(() => {
    window.print();
  }, 0);
}

function renderSummary() {
  const totals = getDayTotals();
  const remaining = state.dailyCalorieGoal - totals.calories;

  summary.protein.textContent = totals.protein.toFixed(1);
  summary.carbs.textContent = totals.carbs.toFixed(1);
  summary.fat.textContent = totals.fat.toFixed(1);
  summary.calories.textContent = String(Math.round(totals.calories));
  summary.goal.textContent = String(Math.round(state.dailyCalorieGoal));
  summary.remaining.textContent = String(Math.round(remaining));
}

function renderFoodLibrary() {
  if (!libraryFields.list) return;

  if (!state.foodLibrary.length) {
    libraryFields.list.innerHTML = '<li class="empty">Aún no tienes alimentos guardados.</li>';
    return;
  }

  libraryFields.list.innerHTML = state.foodLibrary
    .map(
      (food) => `
      <li class="food-item">
        <p class="food-name">${food.name}</p>
        <p class="food-meta">
          P ${food.protein.toFixed(1)} g · C ${food.carbs.toFixed(1)} g · G ${food.fat.toFixed(1)} g · ${Math.round(food.caloriesPer100)} kcal / 100 g
        </p>
      </li>
    `
    )
    .join('');
}

function mealFoodItemHtml(food, mealIndex, foodIndex) {
  const totals = getFoodTotals(food);

  return `
    <li class="food-item">
      <div class="food-item-header">
        <p class="food-name">${food.name}</p>
        <button
          type="button"
          class="secondary delete-ingredient-button"
          data-meal-index="${mealIndex}"
          data-food-index="${foodIndex}"
        >
          Eliminar
        </button>
      </div>
      <p class="food-meta">
        ${food.consumedGrams} g · P ${totals.protein.toFixed(1)} g · C ${totals.carbs.toFixed(1)} g · G ${totals.fat.toFixed(1)} g · ${Math.round(totals.calories)} kcal
      </p>
    </li>
  `;
}

function progressItemHtml(entry) {
  return `
    <li class="food-item">
      <div class="food-item-header">
        <p class="food-name">${entry.date}</p>
        <div class="inline-actions">
          <button type="button" class="secondary tiny edit-progress-button" data-id="${entry.id}">
            Editar
          </button>
          <button type="button" class="secondary tiny delete-progress-button" data-id="${entry.id}">
            Eliminar
          </button>
        </div>
      </div>
      <p class="food-meta">
        Peso: ${entry.weight.toFixed(1)} kg · Grasa: ${entry.bodyFat.toFixed(1)}% · Calorías teóricas: ${Math.round(entry.calories)} kcal
      </p>
    </li>
  `;
}

function resizeCanvasToDisplaySize(canvas) {
  if (!canvas) return;

  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawLineChart(canvas, emptyEl, points, label) {
  if (!canvas || !emptyEl) return;

  resizeCanvasToDisplaySize(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!points.length) {
    emptyEl.textContent = `No hay datos para ${label.toLowerCase()}.`;
    return;
  }

  emptyEl.textContent = '';

  const padding = {
    top: 24,
    right: 24,
    bottom: 42,
    left: 44,
  };

  const width = canvas.width - padding.left - padding.right;
  const height = canvas.height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const xStep = points.length > 1 ? width / (points.length - 1) : 0;

  const styles = getComputedStyle(document.documentElement);
  const borderColor = styles.getPropertyValue('--border').trim() || '#2b3a4f';
  const textColor = styles.getPropertyValue('--muted').trim() || '#93a2b8';
  const lineColor = styles.getPropertyValue('--primary').trim() || '#7aa2ff';

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + height);
  ctx.lineTo(padding.left + width, padding.top + height);
  ctx.stroke();

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = padding.left + index * xStep;
    const normalized = (point.value - minValue) / range;
    const y = padding.top + height - normalized * height;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  ctx.fillStyle = lineColor;

  points.forEach((point, index) => {
    const x = padding.left + index * xStep;
    const normalized = (point.value - minValue) / range;
    const y = padding.top + height - normalized * height;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = textColor;
  ctx.font = `${Math.max(12, canvas.width / 30)}px sans-serif`;
  ctx.fillText(maxValue.toFixed(1), 6, padding.top + 6);
  ctx.fillText(minValue.toFixed(1), 6, padding.top + height);

  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  ctx.fillText(firstDate, padding.left, canvas.height - 10);
  const lastWidth = ctx.measureText(lastDate).width;
  ctx.fillText(lastDate, padding.left + width - lastWidth, canvas.height - 10);
}

function renderProgressCharts() {
  if (!progressFields.charts.weight) return;

  const chartData = [...state.progressLog]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      weight: entry.weight,
      bodyFat: entry.bodyFat,
      calories: entry.calories,
    }));

  drawLineChart(
    progressFields.charts.weight,
    progressFields.chartEmpty.weight,
    chartData.map((point) => ({ date: point.date, value: point.weight })),
    'Peso'
  );

  drawLineChart(
    progressFields.charts.bodyFat,
    progressFields.chartEmpty.bodyFat,
    chartData.map((point) => ({ date: point.date, value: point.bodyFat })),
    'Grasa corporal'
  );

  drawLineChart(
    progressFields.charts.calories,
    progressFields.chartEmpty.calories,
    chartData.map((point) => ({ date: point.date, value: point.calories })),
    'Calorías teóricas'
  );
}

function renderProgressLog() {
  if (!progressFields.list) return;

  if (!state.progressLog.length) {
    progressFields.list.innerHTML = '<li class="empty">Aún no hay registros diarios.</li>';
  } else {
    progressFields.list.innerHTML = sortProgressLogDesc(state.progressLog)
      .map(progressItemHtml)
      .join('');
  }

  renderProgressCharts();
  bindProgressListEvents();
}

function renderMeals() {
  if (!mealsContainer) return;

  mealsContainer.innerHTML = state.meals
    .map((meal, mealIndex) => {
      const mealTotals = getMealTotals(meal);

      const foodsHtml = meal.foods.length
        ? `<ul class="food-list">${meal.foods
            .map((food, foodIndex) => mealFoodItemHtml(food, mealIndex, foodIndex))
            .join('')}</ul>`
        : '<p class="empty">Aún no hay ingredientes en esta comida.</p>';

      const optionsHtml = state.foodLibrary
        .map(
          (food) =>
            `<option value="${food.id}">${food.name} (${Math.round(food.caloriesPer100)} kcal / 100 g)</option>`
        )
        .join('');

      const ingredientFormHtml = state.foodLibrary.length
        ? `
          <form class="add-food-form hidden add-ingredient-form" novalidate>
            <label>Seleccionar alimento
              <select name="foodId" required>
                ${optionsHtml}
              </select>
            </label>
            <label>Gramos del ingrediente
              <input name="consumedGrams" type="number" min="0.1" step="0.1" inputmode="decimal" required />
            </label>
            <p class="form-error" aria-live="polite"></p>
            <button type="submit" class="primary">Agregar ingrediente</button>
          </form>
        `
        : '<p class="empty">Primero guarda alimentos en la biblioteca para poder agregarlos a las comidas.</p>';

      return `
        <section class="card meal-card" data-meal-index="${mealIndex}">
          <div class="meal-header">
            <h2>${meal.name}</h2>
            <button type="button" class="primary add-food-toggle" ${state.foodLibrary.length ? '' : 'disabled'}>
              Agregar ingrediente
            </button>
          </div>

          ${ingredientFormHtml}

          ${foodsHtml}

          <div class="subtotal" role="status" aria-live="polite">
            Subtotal: P ${mealTotals.protein.toFixed(1)} g · C ${mealTotals.carbs.toFixed(1)} g · G ${mealTotals.fat.toFixed(1)} g · ${Math.round(mealTotals.calories)} kcal
          </div>
        </section>
      `;
    })
    .join('');

  bindMealEvents();
}

function render() {
  if (fields.dailyCalorieGoal) {
    fields.dailyCalorieGoal.value = state.dailyCalorieGoal || '';
  }

  if (fields.mealsCount) {
    fields.mealsCount.value = state.mealsCount;
  }

  applyTheme();
  updateLibraryVisibility();
  updateProgressVisibility();
  renderFoodLibrary();
  renderSummary();
  renderMeals();
  renderProgressLog();
}

function updateMealCount(nextCount) {
  const normalized = Math.min(12, Math.max(1, Math.round(nextCount)));

  const nextMeals = createInitialMeals(normalized).map((meal, index) => {
    if (state.meals[index]) return state.meals[index];
    return meal;
  });

  state.mealsCount = normalized;
  state.meals = nextMeals;

  saveDayState();
  render();
}

function bindMealEvents() {
  if (!mealsContainer) return;

  const cards = mealsContainer.querySelectorAll('.meal-card');

  cards.forEach((card) => {
    const mealIndex = Number(card.dataset.mealIndex);
    const toggleButton = card.querySelector('.add-food-toggle');
    const form = card.querySelector('.add-ingredient-form');

    if (!toggleButton || !form) return;

    const errorEl = form.querySelector('.form-error');

    toggleButton.addEventListener('click', () => {
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        form.elements.consumedGrams.focus();
      }
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const foodId = String(form.elements.foodId.value || '');
      const consumedGrams = toNumber(form.elements.consumedGrams.value);
      const sourceFood = state.foodLibrary.find((item) => item.id === foodId);

      if (!sourceFood) {
        errorEl.textContent = 'Selecciona un alimento válido.';
        return;
      }

      if (consumedGrams === null || consumedGrams <= 0) {
        errorEl.textContent = 'Ingresa gramos mayores a 0.';
        return;
      }

      state.meals[mealIndex].foods.push({
        sourceFoodId: sourceFood.id,
        name: sourceFood.name,
        protein: sourceFood.protein,
        carbs: sourceFood.carbs,
        fat: sourceFood.fat,
        caloriesPer100: sourceFood.caloriesPer100,
        consumedGrams,
      });

      saveDayState();
      render();
    });
  });

  const deleteButtons = mealsContainer.querySelectorAll('.delete-ingredient-button');

  deleteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mealIndex = Number(button.dataset.mealIndex);
      const foodIndex = Number(button.dataset.foodIndex);

      if (!Number.isInteger(mealIndex) || !Number.isInteger(foodIndex)) return;
      if (!state.meals[mealIndex]) return;
      if (!state.meals[mealIndex].foods[foodIndex]) return;

      state.meals[mealIndex].foods.splice(foodIndex, 1);
      saveDayState();
      render();
    });
  });
}

function bindProgressListEvents() {
  if (!progressFields.list) return;

  progressFields.list.querySelectorAll('.delete-progress-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      state.progressLog = state.progressLog.filter((entry) => entry.id !== id);
      saveProgressLog();
      renderProgressLog();
      showProgressStatus('Registro eliminado.', 'success');
    });
  });

  progressFields.list.querySelectorAll('.edit-progress-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const entry = state.progressLog.find((item) => item.id === id);
      if (!entry) return;

      const nextDate = prompt('Editar fecha (YYYY-MM-DD)', entry.date);
      const nextWeight = prompt('Editar peso', String(entry.weight));
      const nextBodyFat = prompt('Editar grasa corporal %', String(entry.bodyFat));
      const nextCalories = prompt('Editar calorías teóricas', String(entry.calories));

      if (
        nextDate === null ||
        nextWeight === null ||
        nextBodyFat === null ||
        nextCalories === null
      ) {
        return;
      }

      const updated = normalizeProgressLogEntry({
        id: entry.id,
        date: nextDate,
        weight: nextWeight,
        bodyFat: nextBodyFat,
        calories: nextCalories,
      });

      if (!updated) {
        showProgressStatus('Valores inválidos al editar el registro.', 'error');
        return;
      }

      state.progressLog = state.progressLog.map((item) =>
        item.id === entry.id ? updated : item
      );

      saveProgressLog();
      renderProgressLog();
      showProgressStatus('Registro editado correctamente.', 'success');
    });
  });
}

function updateLibraryCaloriesPreview() {
  if (!libraryFields.caloriesPreview) return;

  const protein = toNumber(libraryFields.protein?.value);
  const carbs = toNumber(libraryFields.carbs?.value);
  const fat = toNumber(libraryFields.fat?.value);

  libraryFields.caloriesPreview.textContent = String(
    Math.round(calculateCaloriesPer100(protein, carbs, fat))
  );
}

function exportFoodLibrary() {
  if (!state.foodLibrary.length) {
    showLibraryStatus('No hay alimentos para exportar.', 'warning');
    return;
  }

  const exportData = state.foodLibrary.map(({ id, name, protein, carbs, fat, caloriesPer100 }) => ({
    id,
    name,
    protein,
    carbs,
    fat,
    caloriesPer100,
  }));

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'macroPlanner-food-library.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showLibraryStatus(`Se exportaron ${exportData.length} alimentos.`, 'success');
}

function handleImportFile(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    const parsed = safeParseJson(String(reader.result || ''));

    if (!parsed) {
      showLibraryStatus('El archivo no contiene un JSON válido.', 'error');
      return;
    }

    const importedRaw = readLibraryFromImportPayload(parsed);

    if (!Array.isArray(importedRaw)) {
      showLibraryStatus(
        'El JSON debe ser un array o contener foodLibrary, library o foods.',
        'error'
      );
      return;
    }

    const importedNormalized = dedupeFoodLibrary(importedRaw);

    if (!importedNormalized.length) {
      showLibraryStatus('No se encontraron alimentos válidos para importar.', 'warning');
      return;
    }

    const replace = confirm(
      '¿Deseas reemplazar la biblioteca actual?\nAceptar = Reemplazar\nCancelar = Combinar sin duplicados'
    );

    if (replace) {
      const confirmReplace = confirm(
        `Se reemplazará tu biblioteca actual con ${importedNormalized.length} alimentos. ¿Continuar?`
      );

      if (!confirmReplace) {
        showLibraryStatus('Importación cancelada por el usuario.', 'warning');
        return;
      }

      state.foodLibrary = importedNormalized;
      saveFoodLibrary();
      render();
      showLibraryStatus(
        `Biblioteca reemplazada con ${state.foodLibrary.length} alimentos.`,
        'success'
      );
      return;
    }

    const previousCount = state.foodLibrary.length;
    state.foodLibrary = dedupeFoodLibrary([...state.foodLibrary, ...importedNormalized]);
    const addedCount = state.foodLibrary.length - previousCount;

    saveFoodLibrary();
    render();
    showLibraryStatus(
      `Biblioteca combinada. Se agregaron ${Math.max(0, addedCount)} alimentos nuevos. Total: ${state.foodLibrary.length}.`,
      'success'
    );
  };

  reader.onerror = () => {
    showLibraryStatus('No se pudo leer el archivo seleccionado.', 'error');
  };

  reader.readAsText(file);
}

function exportProgressCsv() {
  if (!state.progressLog.length) {
    showProgressStatus('No hay registros para exportar.', 'warning');
    return;
  }

  const headers = ['Fecha', 'Peso', 'Grasa corporal %', 'Calorías teóricas'];
  const rows = sortProgressLogDesc(state.progressLog).map((entry) => [
    entry.date,
    entry.weight,
    entry.bodyFat,
    entry.calories,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([`\ufeff${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'registro-diario.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showProgressStatus(`Se exportaron ${rows.length} registros en CSV.`, 'success');
}

function bindLibraryEvents() {
  if (!libraryFields.form) return;

  ['input', 'change'].forEach((eventName) => {
    libraryFields.protein?.addEventListener(eventName, updateLibraryCaloriesPreview);
    libraryFields.carbs?.addEventListener(eventName, updateLibraryCaloriesPreview);
    libraryFields.fat?.addEventListener(eventName, updateLibraryCaloriesPreview);
  });

  libraryFields.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const foodName = libraryFields.foodName.value.trim();
    const protein = toNumber(libraryFields.protein.value);
    const carbs = toNumber(libraryFields.carbs.value);
    const fat = toNumber(libraryFields.fat.value);

    if (!foodName) {
      libraryFields.error.textContent = 'Ingresa el nombre del alimento.';
      return;
    }

    if ([protein, carbs, fat].some((value) => value === null)) {
      libraryFields.error.textContent = 'Completa proteínas, carbohidratos y grasas.';
      return;
    }

    if (protein < 0 || carbs < 0 || fat < 0) {
      libraryFields.error.textContent = 'Proteínas, carbohidratos y grasas deben ser ≥ 0.';
      return;
    }

    const candidate = normalizeFood({
      id: createFoodId(),
      name: foodName,
      protein,
      carbs,
      fat,
    });

    if (!candidate) {
      libraryFields.error.textContent = 'No se pudo guardar el alimento.';
      return;
    }

    const previousCount = state.foodLibrary.length;
    state.foodLibrary = dedupeFoodLibrary([...state.foodLibrary, candidate]);

    libraryFields.form.reset();
    libraryFields.error.textContent = '';
    updateLibraryCaloriesPreview();

    saveFoodLibrary();
    render();

    if (state.foodLibrary.length === previousCount) {
      showLibraryStatus('Ese alimento ya existía en la biblioteca.', 'warning');
      return;
    }

    showLibraryStatus('Alimento guardado en la biblioteca.', 'success');
  });

  if (libraryFields.exportButton) {
    libraryFields.exportButton.addEventListener('click', exportFoodLibrary);
  }

  if (libraryFields.importButton && libraryFields.importInput) {
    libraryFields.importButton.addEventListener('click', () => {
      libraryFields.importInput.value = '';
      libraryFields.importInput.click();
    });

    libraryFields.importInput.addEventListener('change', () => {
      const [file] = libraryFields.importInput.files || [];
      handleImportFile(file);
    });
  }
}

function bindProgressEvents() {
  if (!progressFields.form) return;

  progressFields.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const entry = normalizeProgressLogEntry({
      id: createLogId(),
      date: progressFields.date.value,
      weight: progressFields.weight.value,
      bodyFat: progressFields.bodyFat.value,
      calories: progressFields.calories.value,
    });

    if (!progressFields.date.value) {
      progressFields.error.textContent = 'La fecha es obligatoria.';
      return;
    }

    if (!entry) {
      progressFields.error.textContent =
        'Completa correctamente fecha, peso, grasa corporal y calorías teóricas.';
      return;
    }

    state.progressLog = sortProgressLogDesc([...state.progressLog, entry]);
    saveProgressLog();

    progressFields.form.reset();
    progressFields.error.textContent = '';
    renderProgressLog();
    showProgressStatus('Registro guardado correctamente.', 'success');
  });

  if (progressFields.exportCsv) {
    progressFields.exportCsv.addEventListener('click', exportProgressCsv);
  }
}

function bindUiEvents() {
  if (uiFields.themeToggle) {
    uiFields.themeToggle.addEventListener('click', () => {
      state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
      saveDayState();
      applyTheme();
      renderProgressCharts();
    });
  }

  if (uiFields.libraryToggle) {
    uiFields.libraryToggle.addEventListener('click', () => {
      state.ui.libraryOpen = !state.ui.libraryOpen;
      saveDayState();
      updateLibraryVisibility();
    });
  }

  if (uiFields.progressToggle) {
    uiFields.progressToggle.addEventListener('click', () => {
      state.ui.progressOpen = !state.ui.progressOpen;
      saveDayState();
      updateProgressVisibility();
    });
  }

  if (uiFields.resetDayButton) {
    uiFields.resetDayButton.addEventListener('click', () => {
      state.meals = state.meals.map((meal) => ({
        ...meal,
        foods: [],
      }));
      saveDayState();
      render();
    });
  }

  if (uiFields.printMenuButton) {
    uiFields.printMenuButton.addEventListener('click', openPrintableMenu);
  }

  window.addEventListener('resize', () => {
    renderProgressCharts();
  });

  window.addEventListener('afterprint', cleanupPrintMode);
}

migrateLegacyStorageIfNeeded();

const dayState = loadDayState();
let state = {
  ...dayState,
  foodLibrary: loadFoodLibrary(),
  progressLog: loadProgressLog(),
};

fields.dailyCalorieGoal?.addEventListener('input', () => {
  state.dailyCalorieGoal = Math.max(0, toNumber(fields.dailyCalorieGoal.value) || 0);
  saveDayState();
  renderSummary();
});

fields.mealsCount?.addEventListener('input', () => {
  const nextCount = toNumber(fields.mealsCount.value);
  if (nextCount === null) return;
  updateMealCount(nextCount);
});

bindUiEvents();
bindLibraryEvents();
bindProgressEvents();
updateLibraryCaloriesPreview();
render();
