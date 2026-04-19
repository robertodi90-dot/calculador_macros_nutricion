const fields = {
  foodName: document.getElementById('foodName'),
  protein: document.getElementById('protein'),
  carbs: document.getElementById('carbs'),
  fat: document.getElementById('fat'),
  consumedGrams: document.getElementById('consumedGrams'),
};

const errors = {
  foodName: document.getElementById('foodNameError'),
  protein: document.getElementById('proteinError'),
  carbs: document.getElementById('carbsError'),
  fat: document.getElementById('fatError'),
  consumedGrams: document.getElementById('consumedGramsError'),
};

const results = {
  calories: document.getElementById('resultCalories'),
  protein: document.getElementById('resultProtein'),
  carbs: document.getElementById('resultCarbs'),
  fat: document.getElementById('resultFat'),
};

const caloriesPer100El = document.getElementById('caloriesPer100');

function toNumber(value) {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateCaloriesPer100(protein, carbs, fat) {
  if (protein === null || carbs === null || fat === null) {
    return 0;
  }

  return protein * 4 + carbs * 4 + fat * 9;
}

function validate() {
  const values = {
    foodName: fields.foodName.value.trim(),
    protein: toNumber(fields.protein.value),
    carbs: toNumber(fields.carbs.value),
    fat: toNumber(fields.fat.value),
    consumedGrams: toNumber(fields.consumedGrams.value),
  };

  const nextErrors = {
    foodName: values.foodName ? '' : 'El nombre del alimento es obligatorio.',
    protein:
      values.protein === null
        ? 'Las proteínas son obligatorias.'
        : values.protein < 0
          ? 'Debe ser un valor mayor o igual a 0.'
          : '',
    carbs:
      values.carbs === null
        ? 'Los carbohidratos son obligatorios.'
        : values.carbs < 0
          ? 'Debe ser un valor mayor o igual a 0.'
          : '',
    fat:
      values.fat === null
        ? 'Las grasas son obligatorias.'
        : values.fat < 0
          ? 'Debe ser un valor mayor o igual a 0.'
          : '',
    consumedGrams:
      values.consumedGrams === null
        ? 'Los gramos a consumir son obligatorios.'
        : values.consumedGrams <= 0
          ? 'Debe ser un valor mayor a 0.'
          : '',
  };

  Object.entries(nextErrors).forEach(([key, message]) => {
    errors[key].textContent = message;
  });

  const isValid = Object.values(nextErrors).every((message) => message === '');

  return { isValid, values };
}

function resetResults() {
  caloriesPer100El.textContent = '0';
  results.calories.textContent = '0';
  results.protein.textContent = '0.0';
  results.carbs.textContent = '0.0';
  results.fat.textContent = '0.0';
}

function calculate() {
  const protein = toNumber(fields.protein.value);
  const carbs = toNumber(fields.carbs.value);
  const fat = toNumber(fields.fat.value);
  const caloriesPer100 = calculateCaloriesPer100(protein, carbs, fat);

  caloriesPer100El.textContent = String(Math.round(caloriesPer100));

  const { isValid, values } = validate();
  if (!isValid) {
    results.calories.textContent = '0';
    results.protein.textContent = '0.0';
    results.carbs.textContent = '0.0';
    results.fat.textContent = '0.0';
    return;
  }

  const factor = values.consumedGrams / 100;

  results.calories.textContent = String(Math.round(caloriesPer100 * factor));
  results.protein.textContent = (values.protein * factor).toFixed(1);
  results.carbs.textContent = (values.carbs * factor).toFixed(1);
  results.fat.textContent = (values.fat * factor).toFixed(1);
}

Object.values(fields).forEach((input) => {
  input.addEventListener('input', calculate);
});

document.getElementById('clearButton').addEventListener('click', () => {
  Object.values(fields).forEach((input) => {
    input.value = '';
  });

  Object.values(errors).forEach((error) => {
    error.textContent = '';
  });

  resetResults();
  fields.foodName.focus();
});

resetResults();
