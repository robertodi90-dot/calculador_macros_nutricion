const STORAGE_KEY = 'macroPlannerDay_v1';

const fields = {
  dailyCalorieGoal: document.getElementById('dailyCalorieGoal'),
  mealsCount: document.getElementById('mealsCount'),
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

function calculateCaloriesPer100(protein, carbs, fat) {
  if (protein === null || carbs === null || fat === null) {
    return 0;
  }

  return protein * 4 + carbs * 4 + fat * 9;
}

function createInitialMeals(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Comida ${index + 1}`,
    foods: [],
  }));
}

function loadState() {
  const baseState = {
    dailyCalorieGoal: 0,
    mealsCount: 3,
    meals: createInitialMeals(3),
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseState;

    const parsed = JSON.parse(raw);
    const mealsCount = Math.min(12, Math.max(1, Math.round(toNumber(parsed.mealsCount) || 3)));
    const parsedMeals = Array.isArray(parsed.meals) ? parsed.meals : [];

    const meals = createInitialMeals(mealsCount).map((defaultMeal, index) => {
      const existing = parsedMeals[index] || {};
      const foods = Array.isArray(existing.foods) ? existing.foods : [];
      return {
        name: typeof existing.name === 'string' && existing.name.trim() ? existing.name.trim() : defaultMeal.name,
        foods,
      };
    });

    return {
      dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0),
      mealsCount,
      meals,
    };
  } catch {
    return baseState;
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      const foodTotals = getFoodTotals(food);
      return {
        protein: acc.protein + foodTotals.protein,
        carbs: acc.carbs + foodTotals.carbs,
        fat: acc.fat + foodTotals.fat,
        calories: acc.calories + foodTotals.calories,
      };
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 },
  );
}

function getDayTotals() {
  return state.meals.reduce(
    (acc, meal) => {
      const mealTotals = getMealTotals(meal);
      return {
        protein: acc.protein + mealTotals.protein,
        carbs: acc.carbs + mealTotals.carbs,
        fat: acc.fat + mealTotals.fat,
        calories: acc.calories + mealTotals.calories,
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

function createFoodItemHtml(food) {
  const totals = getFoodTotals(food);

  return `
    <li class="food-item">
      <div>
        <p class="food-name">${food.name}</p>
        <p class="food-meta">
          ${food.consumedGrams} g · P ${totals.protein.toFixed(1)} g · C ${totals.carbs.toFixed(1)} g · G ${totals.fat.toFixed(1)} g · ${Math.round(totals.calories)} kcal
        </p>
      </div>
    </li>
  `;
}

function renderMeals() {
  mealsContainer.innerHTML = state.meals
    .map((meal, mealIndex) => {
      const mealTotals = getMealTotals(meal);
      const foodsHtml = meal.foods.length
        ? `<ul class="food-list">${meal.foods.map((food) => createFoodItemHtml(food)).join('')}</ul>`
        : '<p class="empty">Aún no hay alimentos en esta comida.</p>';

      return `
        <section class="card meal-card" data-meal-index="${mealIndex}">
          <div class="meal-header">
            <h2>${meal.name}</h2>
            <button type="button" class="primary add-food-toggle">Agregar alimento</button>
          </div>

          <form class="add-food-form hidden" novalidate>
            <label>Nombre del alimento
              <input name="foodName" type="text" autocomplete="off" placeholder="Ej: Pollo" required />
            </label>
            <label>Proteínas por 100 g
              <input name="protein" type="number" min="0" step="0.1" inputmode="decimal" required />
            </label>
            <label>Carbohidratos por 100 g
              <input name="carbs" type="number" min="0" step="0.1" inputmode="decimal" required />
            </label>
            <label>Grasas por 100 g
              <input name="fat" type="number" min="0" step="0.1" inputmode="decimal" required />
            </label>
            <label>Gramos consumidos
              <input name="consumedGrams" type="number" min="0.1" step="0.1" inputmode="decimal" required />
            </label>
            <p class="readonly-label">Calorías por 100 g: <span class="calories-preview">0</span> kcal</p>
            <p class="form-error" aria-live="polite"></p>
            <button type="submit" class="primary">Guardar alimento</button>
          </form>

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
  renderSummary();
  renderMeals();
}

function updateMealCount(nextCount) {
  const normalized = Math.min(12, Math.max(1, Math.round(nextCount)));
  const currentMeals = state.meals;

  const nextMeals = createInitialMeals(normalized).map((meal, index) => {
    if (currentMeals[index]) {
      return {
        name: currentMeals[index].name,
        foods: currentMeals[index].foods,
      };
    }

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
  const mealCards = mealsContainer.querySelectorAll('.meal-card');

  mealCards.forEach((card) => {
    const mealIndex = Number(card.dataset.mealIndex);
    const toggleButton = card.querySelector('.add-food-toggle');
    const form = card.querySelector('.add-food-form');
    const errorEl = card.querySelector('.form-error');
    const caloriesPreview = card.querySelector('.calories-preview');

    toggleButton.addEventListener('click', () => {
      form.classList.toggle('hidden');
      if (!form.classList.contains('hidden')) {
        form.elements.foodName.focus();
      }
    });

    ['protein', 'carbs', 'fat'].forEach((key) => {
      form.elements[key].addEventListener('input', () => {
        const protein = toNumber(form.elements.protein.value);
        const carbs = toNumber(form.elements.carbs.value);
        const fat = toNumber(form.elements.fat.value);
        const caloriesPer100 = calculateCaloriesPer100(protein, carbs, fat);
        caloriesPreview.textContent = String(Math.round(caloriesPer100));
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const foodName = form.elements.foodName.value.trim();
      const protein = toNumber(form.elements.protein.value);
      const carbs = toNumber(form.elements.carbs.value);
      const fat = toNumber(form.elements.fat.value);
      const consumedGrams = toNumber(form.elements.consumedGrams.value);

      if (!foodName) {
        errorEl.textContent = 'Ingresa el nombre del alimento.';
        return;
      }

      if ([protein, carbs, fat, consumedGrams].some((value) => value === null)) {
        errorEl.textContent = 'Completa todos los campos numéricos.';
        return;
      }

      if (protein < 0 || carbs < 0 || fat < 0) {
        errorEl.textContent = 'Proteínas, carbohidratos y grasas deben ser valores ≥ 0.';
        return;
      }

      if (consumedGrams <= 0) {
        errorEl.textContent = 'Los gramos consumidos deben ser mayores a 0.';
        return;
      }

      const caloriesPer100 = calculateCaloriesPer100(protein, carbs, fat);

      state.meals[mealIndex].foods.push({
        name: foodName,
        protein,
        carbs,
        fat,
        consumedGrams,
        caloriesPer100,
      });

      saveState();
      render();
    });
  });
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

render();
