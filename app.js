const LEGACY_STORAGE_KEY = 'macroPlannerDay_v1';
const FOOD_LIBRARY_STORAGE_KEY = 'macroPlannerFoodLibrary_v1';
const DAY_STATE_STORAGE_KEY = 'macroPlannerDayState_v1';

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
  exportButton: document.getElementById('libraryExportButton'),
  importButton: document.getElementById('libraryImportButton'),
  importInput: document.getElementById('libraryImportInput'),
  statusMessage: document.getElementById('libraryStatusMessage'),
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

  const meals = createInitialMeals(mealsCount).map((defaultMeal, index) => {
    const existing = parsedMealsInput[index] || {};
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

  const parsedUi = parsed.ui || {};

  return {
    dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0),
    mealsCount,
    meals,
    ui: {
      libraryOpen: Boolean(parsedUi.libraryOpen),
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

function showLibraryStatus(message, tone = 'info') {
  if (!libraryFields.statusMessage) return;
  libraryFields.statusMessage.textContent = message;
  libraryFields.statusMessage.dataset.tone = tone;
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

function renderMeals() {
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
  fields.dailyCalorieGoal.value = state.dailyCalorieGoal || '';
  fields.mealsCount.value = state.mealsCount;
  applyTheme();
  updateLibraryVisibility();
  renderFoodLibrary();
  renderSummary();
  renderMeals();
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

function updateLibraryCaloriesPreview() {
  const protein = toNumber(libraryFields.protein.value);
  const carbs = toNumber(libraryFields.carbs.value);
  const fat = toNumber(libraryFields.fat.value);

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

function bindLibraryEvents() {
  if (!libraryFields.form) return;

  ['input', 'change'].forEach((eventName) => {
    libraryFields.protein.addEventListener(eventName, updateLibraryCaloriesPreview);
    libraryFields.carbs.addEventListener(eventName, updateLibraryCaloriesPreview);
    libraryFields.fat.addEventListener(eventName, updateLibraryCaloriesPreview);
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

function bindUiEvents() {
  if (uiFields.themeToggle) {
    uiFields.themeToggle.addEventListener('click', () => {
      state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
      saveDayState();
      applyTheme();
    });
  }

  if (uiFields.libraryToggle) {
    uiFields.libraryToggle.addEventListener('click', () => {
      state.ui.libraryOpen = !state.ui.libraryOpen;
      saveDayState();
      updateLibraryVisibility();
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
}

migrateLegacyStorageIfNeeded();

const dayState = loadDayState();
let state = {
  ...dayState,
  foodLibrary: loadFoodLibrary(),
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
updateLibraryCaloriesPreview();
render();