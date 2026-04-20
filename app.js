function getPrintableDate() {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

function buildPrintableMenuHtml() {
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
              <span>${escapeHtml(food.name)}</span>
              <strong>${food.consumedGrams.toFixed(1)} g</strong>
            </li>
          `
        )
        .join('');

      return `
        <section class="print-meal">
          <h2>${escapeHtml(meal.name)}</h2>
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
      <p class="print-date">Fecha: ${escapeHtml(getPrintableDate())}</p>
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