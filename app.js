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
  exportButton: document.getElementById('exportLibraryButton'),
  importButton: document.getElementById('importLibraryButton'),
  importInput: document.getElementById('importLibraryInput'),
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

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function calculateCaloriesPer100(protein, carbs, fat) {
  if (protein === null || carbs === null || fat === null) return 0;
  return protein * 4 + carbs * 4 + fat * 9;
}

function normalizeMacroValue(value) {
  const number = toNumber(value);
  if (number === null || number < 0) return null;
  return number;
}

function createInitialMeals(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Comida ${index + 1}`,
    foods: [],
  }));
}

function foodSignature(food) {
  const name = (food.name || '').trim().toLowerCase();
  return `${name}|${food.protein.toFixed(4)}|${food.carbs.toFixed(4)}|${food.fat.toFixed(4)}`;
}

function dedupeFoodLibrary(foods) {
  const unique = [];
  const seen = new Set();

  foods.forEach((food) => {
    const signature = foodSignature(food);
    if (seen.has(signature)) return;
    seen.add(signature);
    unique.push(food);
  });

  return unique;
}

function normalizeFood(rawFood) {
  if (!rawFood || typeof rawFood !== 'object') return null;

  const name = typeof rawFood.name === 'string' ? rawFood.name.trim() : '';
  const protein = normalizeMacroValue(rawFood.protein);
  const carbs = normalizeMacroValue(rawFood.carbs);
  const fat = normalizeMacroValue(rawFood.fat);

  if (!name || protein === null || carbs === null || fat === null) return null;

  return {
    id: typeof rawFood.id === 'string' && rawFood.id ? rawFood.id : `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
  const protein = normalizeMacroValue(rawFood.protein);
  const carbs = normalizeMacroValue(rawFood.carbs);
  const fat = normalizeMacroValue(rawFood.fat);
  const consumedGrams = toNumber(rawFood.consumedGrams);

  if (!name || protein === null || carbs === null || fat === null || consumedGrams === null || consumedGrams <= 0) return null;

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

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!validDate) return null;
  if (weight === null || weight <= 0) return null;
  if (bodyFat === null || bodyFat < 0) return null;
  if (calories === null || calories < 0) return null;

  return {
    id: typeof rawEntry.id === 'string' && rawEntry.id ? rawEntry.id : `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

function normalizeMeals(rawMeals, mealsCount) {
  const parsedMeals = Array.isArray(rawMeals) ? rawMeals : [];
  return createInitialMeals(mealsCount).map((defaultMeal, index) => {
    const existing = parsedMeals[index] || {};
    const foods = Array.isArray(existing.foods) ? existing.foods.map(normalizeMealFood).filter(Boolean) : [];

    return {
      name: typeof existing.name === 'string' && existing.name.trim() ? existing.name.trim() : defaultMeal.name,
      foods,
    };
  });
}

function createDefaultDayState() {
  return {
    dailyCalorieGoal: 0,
    mealsCount: 3,
    meals: createInitialMeals(3),
    ui: {
      libraryOpen: false,
      theme: 'light',
    },
  };
}

function extractFoodLibraryFromParsed(parsed) {
  if (!parsed || typeof parsed !== 'object') return [];
  if (!Array.isArray(parsed.foodLibrary)) return [];
  return dedupeFoodLibrary(parsed.foodLibrary.map(normalizeFood).filter(Boolean));
}

function extractDayStateFromParsed(parsed) {
  const base = createDefaultDayState();
  if (!parsed || typeof parsed !== 'object') return base;

  const mealsCount = Math.min(12, Math.max(1, Math.round(toNumber(parsed.mealsCount) || base.mealsCount)));
  const ui = parsed.ui || {};

  return {
    dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0),
    mealsCount,
    meals: normalizeMeals(parsed.meals, mealsCount),
    ui: {
      libraryOpen: Boolean(ui.libraryOpen),
      theme: ui.theme === 'dark' ? 'dark' : 'light',
    },
  };
}

function migrateLegacyStorageIfNeeded() {
  const hasNewLibrary = Boolean(localStorage.getItem(FOOD_LIBRARY_STORAGE_KEY));
  const hasNewDay = Boolean(localStorage.getItem(DAY_STATE_STORAGE_KEY));
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
  if (!Array.isArray(parsed)) return [];
  return dedupeFoodLibrary(parsed.map(normalizeFood).filter(Boolean));
}

function loadDayState() {
  const raw = localStorage.getItem(DAY_STATE_STORAGE_KEY);
  if (!raw) return createDefaultDayState();
  return extractDayStateFromParsed(safeParseJson(raw));
}

function loadProgressLog() {
  const raw = localStorage.getItem(PROGRESS_LOG_STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJson(raw);
  if (!Array.isArray(parsed)) return [];
  return sortProgressLogDesc(parsed.map(normalizeProgressLogEntry).filter(Boolean));
}

function saveFoodLibrary() {
  state.foodLibrary = dedupeFoodLibrary(state.foodLibrary);
  localStorage.setItem(FOOD_LIBRARY_STORAGE_KEY, JSON.stringify(state.foodLibrary));
}

function saveDayState() {
  localStorage.setItem(
    DAY_STATE_STORAGE_KEY,
    JSON.stringify({
      dailyCalorieGoal: state.dailyCalorieGoal,
      mealsCount: state.mealsCount,
      meals: state.meals,
      ui: state.ui,
    }),
  );
}

function saveProgressLog() {
  state.progressLog = sortProgressLogDesc(state.progressLog);
  localStorage.setItem(PROGRESS_LOG_STORAGE_KEY, JSON.stringify(state.progressLog));
}

function showStatus(el, message, tone = 'info') {
  el.textContent = message;
  el.dataset.tone = tone;
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
  document.documentElement.setAttribute('data-theme', state.ui.theme);
  uiFields.themeToggle.textContent = state.ui.theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
}

function updateLibraryVisibility() {
  uiFields.librarySection.classList.toggle('hidden', !state.ui.libraryOpen);
  uiFields.libraryToggle.textContent = state.ui.libraryOpen ? 'Ocultar biblioteca de alimentos' : 'Mostrar biblioteca de alimentos';
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
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
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
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  );
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
  if (!state.foodLibrary.length) {
    libraryFields.list.innerHTML = '<li class="empty">Aún no tienes alimentos guardados.</li>';
    return;
  }

  libraryFields.list.innerHTML = state.foodLibrary
    .map(
      (food) => `
      <li class="food-item">
        <p class="food-name">${food.name}</p>
        <p class="food-meta">P ${food.protein.toFixed(1)} g · C ${food.carbs.toFixed(1)} g · G ${food.fat.toFixed(1)} g · ${Math.round(food.caloriesPer100)} kcal / 100 g</p>
      </li>
    `,
    )
    .join('');
}

function mealFoodItemHtml(food) {
  const totals = getFoodTotals(food);

  return `
    <li class="food-item">
      <div class="food-item-header">
        <p class="food-name">${food.name}</p>
        <button type="button" class="danger delete-ingredient-button" data-meal-index="${food.mealIndex}" data-food-index="${food.foodIndex}">Eliminar</button>
      </div>
      <p class="food-meta">${food.consumedGrams} g · P ${totals.protein.toFixed(1)} g · C ${totals.carbs.toFixed(1)} g · G ${totals.fat.toFixed(1)} g · ${Math.round(totals.calories)} kcal</p>
    </li>
  `;
}

function progressItemHtml(entry) {
  return `
    <li class="food-item">
      <div class="food-item-header">
        <p class="food-name">${entry.date}</p>
        <div class="inline-actions">
          <button type="button" class="secondary tiny edit-progress-button" data-id="${entry.id}">Editar</button>
          <button type="button" class="danger tiny delete-progress-button" data-id="${entry.id}">Eliminar</button>
        </div>
      </div>
      <p class="food-meta">Peso: ${entry.weight.toFixed(1)} · Grasa: ${entry.bodyFat.toFixed(1)}% · Calorías teóricas: ${Math.round(entry.calories)}</p>
    </li>
  `;
}

function drawLineChart(canvas, emptyEl, points, { color, label }) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!points.length) {
    emptyEl.textContent = `No hay datos para ${label.toLowerCase()}.`;
    return;
  }

  emptyEl.textContent = '';

  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const width = canvas.width - padding.left - padding.right;
  const height = canvas.height - padding.top - padding.bottom;

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  const xStep = points.length > 1 ? width / (points.length - 1) : 0;

  ctx.strokeStyle = '#77869b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + height);
  ctx.lineTo(padding.left + width, padding.top + height);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = padding.left + index * xStep;
    const normalized = (point.value - minValue) / range;
    const y = padding.top + height - normalized * height;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = color;
  points.forEach((point, index) => {
    const x = padding.left + index * xStep;
    const normalized = (point.value - minValue) / range;
    const y = padding.top + height - normalized * height;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#93a2b8';
  ctx.font = '11px sans-serif';
  ctx.fillText(minValue.toFixed(1), 6, padding.top + height);
  ctx.fillText(maxValue.toFixed(1), 6, padding.top + 10);

  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  ctx.fillText(firstDate, padding.left, canvas.height - 8);
  ctx.fillText(lastDate, padding.left + width - 64, canvas.height - 8);
}

function renderProgressCharts() {
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
    { color: '#2f80ed', label: 'Peso' },
  );

  drawLineChart(
    progressFields.charts.bodyFat,
    progressFields.chartEmpty.bodyFat,
    chartData.map((point) => ({ date: point.date, value: point.bodyFat })),
    { color: '#9b51e0', label: 'Grasa corporal' },
  );

  drawLineChart(
    progressFields.charts.calories,
    progressFields.chartEmpty.calories,
    chartData.map((point) => ({ date: point.date, value: point.calories })),
    { color: '#f2994a', label: 'Calorías teóricas' },
  );
}

function renderProgressLog() {
  if (!state.progressLog.length) {
    progressFields.list.innerHTML = '<li class="empty">Aún no hay registros diarios.</li>';
  } else {
    progressFields.list.innerHTML = sortProgressLogDesc(state.progressLog).map(progressItemHtml).join('');
  }

  renderProgressCharts();
  bindProgressListEvents();
}

function renderMeals() {
  mealsContainer.innerHTML = state.meals
    .map((meal, mealIndex) => {
      const mealTotals = getMealTotals(meal);
      const foodsHtml = meal.foods.length
        ? `<ul class="food-list">${meal.foods.map((food, foodIndex) => mealFoodItemHtml({ ...food, mealIndex, foodIndex })).join('')}</ul>`
        : '<p class="empty">Aún no hay ingredientes en esta comida.</p>';

      const optionsHtml = state.foodLibrary
        .map((food) => `<option value="${food.id}">${food.name} (${Math.round(food.caloriesPer100)} kcal / 100 g)</option>`)
        .join('');

      const ingredientFormHtml = state.foodLibrary.length
        ? `
          <form class="add-food-form hidden add-ingredient-form" novalidate>
            <label>Seleccionar alimento
              <select name="foodId" required>${optionsHtml}</select>
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
            <button type="button" class="primary add-food-toggle" ${state.foodLibrary.length ? '' : 'disabled'}>Agregar ingrediente</button>
          </div>
          ${ingredientFormHtml}
          ${foodsHtml}
          <div class="subtotal" role="status" aria-live="polite">Subtotal: P ${mealTotals.protein.toFixed(1)} g · C ${mealTotals.carbs.toFixed(1)} g · G ${mealTotals.fat.toFixed(1)} g · ${Math.round(mealTotals.calories)} kcal</div>
        </section>
      `;
    })
    .join('');

  bindMealEvents();
}

function render() {
  fields.dailyCalorieGoal.value = state.dailyCalorieGoal || '';
  fields.mealsCount.value = state.mealsCount;
  applyTheme();
  updateLibraryVisibility();
  renderFoodLibrary();
  renderSummary();
  renderMeals();
  renderProgressLog();
}

function updateMealCount(nextCount) {
  const normalized = Math.min(12, Math.max(1, Math.round(nextCount)));
  state.mealsCount = normalized;
  state.meals = createInitialMeals(normalized).map((meal, index) => state.meals[index] || meal);
  saveDayState();
  render();
}

function bindMealEvents() {
  const cards = mealsContainer.querySelectorAll('.meal-card');

  cards.forEach((card) => {
    const mealIndex = Number(card.dataset.mealIndex);
    const toggleButton = card.querySelector('.add-food-toggle');
    const form = card.querySelector('.add-ingredient-form');
    if (!toggleButton || !form) return;

    const errorEl = form.querySelector('.form-error');

    toggleButton.addEventListener('click', () => {
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) form.elements.consumedGrams.focus();
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

  mealsContainer.querySelectorAll('.delete-ingredient-button').forEach((button) => {
    button.addEventListener('click', () => {
      const mealIndex = Number(button.dataset.mealIndex);
      const foodIndex = Number(button.dataset.foodIndex);
      if (!state.meals[mealIndex]) return;
      state.meals[mealIndex].foods.splice(foodIndex, 1);
      saveDayState();
      render();
    });
  });
}

function bindProgressListEvents() {
  progressFields.list.querySelectorAll('.delete-progress-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      state.progressLog = state.progressLog.filter((entry) => entry.id !== id);
      saveProgressLog();
      renderProgressLog();
      showStatus(progressFields.status, 'Registro eliminado.', 'success');
    });
  });

  progressFields.list.querySelectorAll('.edit-progress-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const entry = state.progressLog.find((item) => item.id === id);
      if (!entry) return;

      const nextWeight = prompt('Editar peso', String(entry.weight));
      const nextBodyFat = prompt('Editar grasa corporal %', String(entry.bodyFat));
      const nextCalories = prompt('Editar calorías teóricas', String(entry.calories));

      if (nextWeight === null || nextBodyFat === null || nextCalories === null) return;

      const weight = toNumber(nextWeight);
      const bodyFat = toNumber(nextBodyFat);
      const calories = toNumber(nextCalories);

      if (weight === null || weight <= 0 || bodyFat === null || bodyFat < 0 || calories === null || calories < 0) {
        showStatus(progressFields.status, 'Valores inválidos al editar el registro.', 'error');
        return;
      }

      entry.weight = weight;
      entry.bodyFat = bodyFat;
      entry.calories = calories;

      saveProgressLog();
      renderProgressLog();
      showStatus(progressFields.status, 'Registro editado correctamente.', 'success');
    });
  });
}

function updateLibraryCaloriesPreview() {
  const protein = toNumber(libraryFields.protein.value);
  const carbs = toNumber(libraryFields.carbs.value);
  const fat = toNumber(libraryFields.fat.value);
  libraryFields.caloriesPreview.textContent = String(Math.round(calculateCaloriesPer100(protein, carbs, fat)));
}

function exportFoodLibrary() {
  if (!state.foodLibrary.length) {
    showStatus(libraryFields.statusMessage, 'No hay alimentos para exportar.', 'warning');
    return;
  }

  const blob = new Blob([JSON.stringify(state.foodLibrary, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'macroPlanner-food-library.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showStatus(libraryFields.statusMessage, `Se exportaron ${state.foodLibrary.length} alimentos.`, 'success');
}

function handleImportFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeParseJson(String(reader.result || ''));
    if (!parsed) {
      showStatus(libraryFields.statusMessage, 'El archivo no contiene un JSON válido.', 'error');
      return;
    }

    const importedRaw = readLibraryFromImportPayload(parsed);
    if (!Array.isArray(importedRaw)) {
      showStatus(libraryFields.statusMessage, 'El JSON debe ser un array o contener foodLibrary/library/foods.', 'error');
      return;
    }

    const importedNormalized = dedupeFoodLibrary(importedRaw.map(normalizeFood).filter(Boolean));
    if (!importedNormalized.length) {
      showStatus(libraryFields.statusMessage, 'No se encontraron alimentos válidos para importar.', 'warning');
      return;
    }

    const replace = confirm('¿Deseas reemplazar la biblioteca actual?\nAceptar = Reemplazar\nCancelar = Combinar sin duplicados');

    if (replace) {
      const confirmReplace = confirm(`Se reemplazará tu biblioteca actual con ${importedNormalized.length} alimentos. ¿Continuar?`);
      if (!confirmReplace) {
        showStatus(libraryFields.statusMessage, 'Importación cancelada por el usuario.', 'warning');
        return;
      }
      state.foodLibrary = importedNormalized;
      saveFoodLibrary();
      render();
      showStatus(libraryFields.statusMessage, `Biblioteca reemplazada con ${state.foodLibrary.length} alimentos.`, 'success');
      return;
    }

    const merged = dedupeFoodLibrary([...state.foodLibrary, ...importedNormalized]);
    const addedCount = merged.length - state.foodLibrary.length;
    state.foodLibrary = merged;
    saveFoodLibrary();
    render();
    showStatus(libraryFields.statusMessage, `Biblioteca combinada. Se agregaron ${Math.max(0, addedCount)} alimentos nuevos. Total: ${state.foodLibrary.length}.`, 'success');
  };

  reader.onerror = () => {
    showStatus(libraryFields.statusMessage, 'No se pudo leer el archivo seleccionado.', 'error');
  };

  reader.readAsText(file);
}

function exportProgressCsv() {
  if (!state.progressLog.length) {
    showStatus(progressFields.status, 'No hay registros para exportar.', 'warning');
    return;
  }

  const headers = ['Fecha', 'Peso', 'Grasa corporal %', 'Calorías teóricas'];
  const rows = sortProgressLogDesc(state.progressLog).map((entry) => [entry.date, entry.weight, entry.bodyFat, entry.calories]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'registro-diario.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showStatus(progressFields.status, `Se exportaron ${rows.length} registros en CSV.`, 'success');
}

function bindLibraryEvents() {
  ['input', 'change'].forEach((eventName) => {
    libraryFields.protein.addEventListener(eventName, updateLibraryCaloriesPreview);
    libraryFields.carbs.addEventListener(eventName, updateLibraryCaloriesPreview);
    libraryFields.fat.addEventListener(eventName, updateLibraryCaloriesPreview);
  });

  libraryFields.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const foodName = libraryFields.foodName.value.trim();
    const protein = normalizeMacroValue(libraryFields.protein.value);
    const carbs = normalizeMacroValue(libraryFields.carbs.value);
    const fat = normalizeMacroValue(libraryFields.fat.value);

    if (!foodName || [protein, carbs, fat].some((value) => value === null)) {
      libraryFields.error.textContent = 'Completa correctamente nombre y macros del alimento.';
      return;
    }

    const candidate = normalizeFood({
      id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: foodName,
      protein,
      carbs,
      fat,
    });

    state.foodLibrary = dedupeFoodLibrary([...state.foodLibrary, candidate]);
    saveFoodLibrary();

    libraryFields.form.reset();
    libraryFields.error.textContent = '';
    updateLibraryCaloriesPreview();
    render();
    showStatus(libraryFields.statusMessage, 'Alimento guardado en la biblioteca.', 'success');
  });

  libraryFields.exportButton.addEventListener('click', exportFoodLibrary);

  libraryFields.importButton.addEventListener('click', () => {
    libraryFields.importInput.value = '';
    libraryFields.importInput.click();
  });

  libraryFields.importInput.addEventListener('change', () => {
    const [file] = libraryFields.importInput.files || [];
    handleImportFile(file);
  });
}

function bindProgressEvents() {
  progressFields.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const date = progressFields.date.value;
    const weight = toNumber(progressFields.weight.value);
    const bodyFat = toNumber(progressFields.bodyFat.value);
    const calories = toNumber(progressFields.calories.value);

    if (!date) {
      progressFields.error.textContent = 'La fecha es obligatoria.';
      return;
    }

    if (weight === null || weight <= 0) {
      progressFields.error.textContent = 'El peso debe ser mayor a 0.';
      return;
    }

    if (bodyFat === null || bodyFat < 0) {
      progressFields.error.textContent = 'La grasa corporal debe ser mayor o igual a 0.';
      return;
    }

    if (calories === null || calories < 0) {
      progressFields.error.textContent = 'Las calorías teóricas deben ser mayor o igual a 0.';
      return;
    }

    const entry = normalizeProgressLogEntry({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      weight,
      bodyFat,
      calories,
    });

    state.progressLog = sortProgressLogDesc([...state.progressLog, entry]);
    saveProgressLog();

    progressFields.form.reset();
    progressFields.error.textContent = '';
    renderProgressLog();
    showStatus(progressFields.status, 'Registro guardado correctamente.', 'success');
  });

  progressFields.exportCsv.addEventListener('click', exportProgressCsv);
}

function bindUiEvents() {
  uiFields.themeToggle.addEventListener('click', () => {
    state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
    saveDayState();
    applyTheme();
  });

  uiFields.libraryToggle.addEventListener('click', () => {
    state.ui.libraryOpen = !state.ui.libraryOpen;
    saveDayState();
    updateLibraryVisibility();
  });

  uiFields.resetDayButton.addEventListener('click', () => {
    state.meals = state.meals.map((meal) => ({ ...meal, foods: [] }));
    saveDayState();
    render();
  });
}

migrateLegacyStorageIfNeeded();

const dayState = loadDayState();
let state = {
  ...dayState,
  foodLibrary: loadFoodLibrary(),
  progressLog: loadProgressLog(),
};

fields.dailyCalorieGoal.addEventListener('input', () => {
  state.dailyCalorieGoal = Math.max(0, toNumber(fields.dailyCalorieGoal.value) || 0);
  saveDayState();
  renderSummary();
});

fields.mealsCount.addEventListener('input', () => {
  const nextCount = toNumber(fields.mealsCount.value);
  if (nextCount === null) return;
  updateMealCount(nextCount);
});

bindUiEvents();
bindLibraryEvents();
bindProgressEvents();
updateLibraryCaloriesPreview();
render();
