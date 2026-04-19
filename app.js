const STORAGE_KEY = 'macroPlannerDay_v1';

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
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateCaloriesPer100(protein, carbs, fat) {
  if (protein === null || carbs === null || fat === null) return 0;
  return protein * 4 + carbs * 4 + fat * 9;
}

function createInitialMeals(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Comida ${index + 1}`,
    foods: [],
  }));
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
        : `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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

function loadState() {
  const baseState = {
    dailyCalorieGoal: 0,
    mealsCount: 3,
    meals: createInitialMeals(3),
    foodLibrary: [],
    ui: {
      libraryOpen: false,
      theme: 'light',
    },
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState;

    const parsed = JSON.parse(raw);

    const mealsCount = Math.min(12, Math.max(1, Math.round(toNumber(parsed.mealsCount) || 3)));
    const parsedMeals = Array.isArray(parsed.meals) ? parsed.meals : [];

    const meals = createInitialMeals(mealsCount).map((defaultMeal, index) => {
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

    const foodLibrary = Array.isArray(parsed.foodLibrary)
      ? parsed.foodLibrary.map(normalizeFood).filter(Boolean)
      : [];

    const parsedUi = parsed.ui || {};
    const ui = {
      libraryOpen: Boolean(parsedUi.libraryOpen),
      theme: parsedUi.theme === 'dark' ? 'dark' : 'light',
    };

    return {
      dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0),
      mealsCount,
      meals,
      foodLibrary,
      ui,
    };
  } catch {
    return baseState;
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  state = {
    ...state,
    mealsCount: normalized,
    meals: nextMeals,
  };

  saveState();
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

      saveState();
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
      saveState();
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

function bindLibraryEvents() {
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

    state.foodLibrary.push({
      id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: foodName,
      protein,
      carbs,
      fat,
      caloriesPer100: calculateCaloriesPer100(protein, carbs, fat),
    });

    libraryFields.form.reset();
    libraryFields.error.textContent = '';
    updateLibraryCaloriesPreview();

    saveState();
    render();
  });
}

function bindUiEvents() {
  if (uiFields.themeToggle) {
    uiFields.themeToggle.addEventListener('click', () => {
      state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
      saveState();
      applyTheme();
    });
  }

  if (uiFields.libraryToggle) {
    uiFields.libraryToggle.addEventListener('click', () => {
      state.ui.libraryOpen = !state.ui.libraryOpen;
      saveState();
      updateLibraryVisibility();
    });
  }

  if (uiFields.resetDayButton) {
    uiFields.resetDayButton.addEventListener('click', () => {
      state.meals = state.meals.map((meal) => ({
        ...meal,
        foods: [],
      }));
      saveState();
      render();
    });
  }
}

fields.dailyCalorieGoal.addEventListener('input', () => {
  state.dailyCalorieGoal = Math.max(0, toNumber(fields.dailyCalorieGoal.value) || 0);
  saveState();
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