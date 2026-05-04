import { jsPDF } from 'jspdf';

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
  installAppButton: document.getElementById('installAppButton'),
  libraryToggle: document.getElementById('libraryToggle'),
  libraryModal: document.getElementById('libraryModal'),
  libraryModalClose: document.getElementById('libraryModalClose'),
  progressToggle: document.getElementById('progressToggle'),
  progressModal: document.getElementById('progressModal'),
  progressModalClose: document.getElementById('progressModalClose'),
  replacementModal: document.getElementById('replacementModal'),
  replacementModalClose: document.getElementById('replacementModalClose'),
  printMenuButton: document.getElementById('printMenuButton'),
  exportDailyMenuButton: document.getElementById('exportDailyMenuButton'),
  importDailyMenuButton: document.getElementById('importDailyMenuButton'),
  importDailyMenuInput: document.getElementById('importDailyMenuInput'),
  resetDayButton: document.getElementById('resetDayButton'),
  waistGuideTrigger: document.getElementById('waistGuideTrigger'),
  waistGuideModal: document.getElementById('waistGuideModal'),
  waistGuideClose: document.getElementById('waistGuideClose'),
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
  weightPoundsPreview: document.getElementById('weightPoundsPreview'),
  bodyFat: document.getElementById('progressBodyFat'),
  waist: document.getElementById('progressWaist'),
  movementImage: document.getElementById('progressMovementImage'),
  movementPreview: document.getElementById('progressMovementPreview'),
  extractMovementButton: document.getElementById('extractMovementDataButton'),
  movementOcrStatus: document.getElementById('movementOcrStatus'),
  movementCaloriesBurned: document.getElementById('movementCaloriesBurned'),
  sleepImage: document.getElementById('progressSleepImage'),
  sleepPreview: document.getElementById('progressSleepPreview'),
  extractSleepButton: document.getElementById('extractSleepDataButton'),
  sleepOcrStatus: document.getElementById('sleepOcrStatus'),
  sleepScore: document.getElementById('sleepScore'),
  sleepTotal: document.getElementById('sleepTotal'),
  sleepDeepPercent: document.getElementById('sleepDeepPercent'),
  sleepLightPercent: document.getElementById('sleepLightPercent'),
  sleepRemPercent: document.getElementById('sleepRemPercent'),
  sleepAwakenings: document.getElementById('sleepAwakenings'),
  sleepDeepContinuity: document.getElementById('sleepDeepContinuity'),
  sleepBreathingQuality: document.getElementById('sleepBreathingQuality'),
  error: document.getElementById('progressFormError'),
  status: document.getElementById('progressStatusMessage'),
  list: document.getElementById('progressLogList'),
  exportTxt: document.getElementById('exportProgressTxtButton'),
  exportAllTxt: document.getElementById('exportAllProgressTxtButton'),
  exportTxtDate: document.getElementById('exportProgressTxtDate'),
  exportJson: document.getElementById('exportProgressJsonButton'),
  importButton: document.getElementById('importProgressButton'),
  importInput: document.getElementById('progressImportInput'),
  charts: {
    weight: document.getElementById('weightChart'),
    bodyFat: document.getElementById('bodyFatChart'),
    leanMassGain: document.getElementById('leanMassGainChart'),
  },
  chartEmpty: {
    weight: document.getElementById('weightChartEmpty'),
    bodyFat: document.getElementById('bodyFatChartEmpty'),
    leanMassGain: document.getElementById('leanMassGainChartEmpty'),
  },
};

const summary = {
  protein: document.getElementById('dailyProtein'),
  carbs: document.getElementById('dailyCarbs'),
  fat: document.getElementById('dailyFat'),
  calories: document.getElementById('dailyCalories'),
  goal: document.getElementById('dailyGoal'),
  remaining: document.getElementById('dailyRemaining'),
  proteinPerKg: document.getElementById('dailyProteinPerKg'),
  carbsPerKg: document.getElementById('dailyCarbsPerKg'),
  fatPerKg: document.getElementById('dailyFatPerKg'),
  weightUsed: document.getElementById('dailyKgWeight'),
};

const mealsContainer = document.getElementById('mealsContainer');
const printMenuSection = document.getElementById('printMenuSection');
const replacementFields = {
  form: document.getElementById('replacementForm'),
  foodSelect: document.getElementById('replacementFoodSelect'),
  prioritySelect: document.getElementById('replacementPrioritySelect'),
  error: document.getElementById('replacementFormError'),
  results: document.getElementById('replacementResults'),
  comment: document.getElementById('replacementComment'),
};
let replacementContext = null;

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
      progressOpen: false,
      replacementOpen: false,
      theme: 'light',
      collapsedMeals: {},
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

  if (!name || protein === null || carbs === null || fat === null || consumedGrams === null) {
    return null;
  }
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
  const activityDateRaw = typeof rawEntry.activityDate === 'string' ? rawEntry.activityDate.trim() : '';
  const activityDate = /^\d{4}-\d{2}-\d{2}$/.test(activityDateRaw) ? activityDateRaw : null;
  const weight = toNumber(rawEntry.weight);
  const bodyFat = toNumber(rawEntry.bodyFat);
  const calories = toNumber(rawEntry.calories);
  const waist = toNumber(rawEntry.waist);
  const movement = rawEntry.movement && typeof rawEntry.movement === 'object' ? rawEntry.movement : {};
  const sleep = rawEntry.sleep && typeof rawEntry.sleep === 'object' ? rawEntry.sleep : {};
  const nutritionSummary = normalizeNutritionSummary(rawEntry.nutritionSummary);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (weight === null || weight <= 0) return null;
  if (bodyFat !== null && bodyFat < 0) return null;
  if (calories !== null && calories < 0) return null;
  if (waist !== null && waist < 0) return null;

  return {
    id:
      typeof rawEntry.id === 'string' && rawEntry.id
        ? rawEntry.id
        : createLogId(),
    date,
    activityDate,
    weight,
    bodyFat,
    calories,
    waist,
    movementImage: typeof rawEntry.movementImage === 'string' ? rawEntry.movementImage : null,
    sleepImage: typeof rawEntry.sleepImage === 'string' ? rawEntry.sleepImage : null,
    movement: {
      caloriesBurned: toNumber(movement.caloriesBurned),
      goalCalories: toNumber(movement.goalCalories),
      runPercent: toNumber(movement.runPercent),
      walkPercent: toNumber(movement.walkPercent),
      bikePercent: toNumber(movement.bikePercent),
      climbPercent: toNumber(movement.climbPercent),
      otherPercent: toNumber(movement.otherPercent),
    },
    sleep: {
      score: toNumber(sleep.score),
      total: typeof sleep.total === 'string' ? sleep.total.trim() : '',
      deep: typeof sleep.deep === 'string' ? sleep.deep.trim() : '',
      deepPercent: toNumber(sleep.deepPercent),
      light: typeof sleep.light === 'string' ? sleep.light.trim() : '',
      lightPercent: toNumber(sleep.lightPercent),
      rem: typeof sleep.rem === 'string' ? sleep.rem.trim() : '',
      remPercent: toNumber(sleep.remPercent),
      awakenings: toNumber(sleep.awakenings),
      deepContinuity: toNumber(sleep.deepContinuity),
      breathingQuality: toNumber(sleep.breathingQuality),
    },
    nutritionSummary,
  };
}

function normalizeNutritionSummary(rawSummary) {
  if (!rawSummary || typeof rawSummary !== 'object') return null;
  return {
    proteinGrams: toNumber(rawSummary.proteinGrams),
    carbsGrams: toNumber(rawSummary.carbsGrams),
    fatGrams: toNumber(rawSummary.fatGrams),
    consumedCalories: toNumber(rawSummary.consumedCalories),
    calorieGoal: toNumber(rawSummary.calorieGoal),
    remainingCalories: toNumber(rawSummary.remainingCalories),
    weightUsedKg: toNumber(rawSummary.weightUsedKg),
    proteinPerKg: toNumber(rawSummary.proteinPerKg),
    carbsPerKg: toNumber(rawSummary.carbsPerKg),
    fatPerKg: toNumber(rawSummary.fatPerKg),
  };
}

function updateImagePreview(imgEl, value) {
  if (!imgEl) return;
  if (!value) {
    imgEl.classList.add('hidden');
    imgEl.removeAttribute('src');
    return;
  }
  imgEl.src = value;
  imgEl.classList.remove('hidden');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

async function runOcrFromImage(fileOrImageElement) {
  if (!window.Tesseract) {
    throw new Error('OCR_UNAVAILABLE');
  }
  const input =
    fileOrImageElement instanceof HTMLImageElement ? fileOrImageElement.src : fileOrImageElement;
  if (!input) throw new Error('OCR_MISSING_IMAGE');
  const result = await window.Tesseract.recognize(input, 'spa+eng');
  return String(result?.data?.text || '');
}

function extractMovementDataFromText(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ');
  const movement = {};
  const kcalPair = normalized.match(/(\d{2,4})\s*\/\s*(\d{2,4})\s*kcal/i);
  if (kcalPair) movement.caloriesBurned = Number(kcalPair[1]);
  if (movement.caloriesBurned === undefined) {
    const kcalBurned = normalized.match(/(?:movimiento|gastad[ao]s?)?\s*(\d{2,4})\s*kcal/i);
    if (kcalBurned) movement.caloriesBurned = Number(kcalBurned[1]);
  }
  return movement;
}

function normalizeDurationText(value) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const durationMatch = raw.match(/(\d{1,2})\s*h(?:oras?)?\s*(?:(\d{1,2})\s*min(?:utos?)?)?/i);
  if (durationMatch) return `${Number(durationMatch[1])} h ${Number(durationMatch[2] || 0)} min`;
  const minsMatch = raw.match(/(\d{1,3})\s*min(?:utos?)?/i);
  if (minsMatch) return `0 h ${Number(minsMatch[1])} min`;
  return '';
}

function parseSleepDurationToMinutes(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const normalized = normalizeDurationText(raw);
  if (normalized) {
    const match = normalized.match(/(\d{1,2})\s*h\s*(\d{1,2})\s*min/i);
    if (match) return Number(match[1]) * 60 + Number(match[2]);
  }

  const compact = raw.replace(/\s+/g, '').toLowerCase();
  const hoursAndMinutes = compact.match(/^(\d{1,2})h(\d{1,2})$/);
  if (hoursAndMinutes) return Number(hoursAndMinutes[1]) * 60 + Number(hoursAndMinutes[2]);

  const colonOrDot = compact.match(/^(\d{1,2})[:\.](\d{1,2})$/);
  if (colonOrDot) return Number(colonOrDot[1]) * 60 + Number(colonOrDot[2]);

  const onlyHours = compact.match(/^(\d{1,2})$/);
  if (onlyHours) return Number(onlyHours[1]) * 60;

  return null;
}

function minutesToSleepDuration(minutes) {
  const totalMinutes = Number(minutes);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '';
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return `${hours} h ${remaining} min`;
}

function calculateSleepStageDuration(totalSleepValue, percentageValue) {
  const totalMinutes = parseSleepDurationToMinutes(totalSleepValue);
  const stagePercent = toNumber(percentageValue);
  if (totalMinutes === null || stagePercent === null) return '';
  return minutesToSleepDuration((totalMinutes * stagePercent) / 100);
}


function extractSleepDataFromText(text) {
  const rawText = String(text || '');
  const normalized = rawText.replace(/\s+/g, ' ');
  const sleep = {};
  const durationPattern = /(\d{1,2})\s*h(?:oras?)?\s*(\d{1,2})?\s*min?/i;
  const toDuration = (match) => (match ? normalizeDurationText(`${match[1]} h ${match[2] || 0} min`) : null);

  const score = normalized.match(/(?:puntaje|puntuaci[oó]n)\s*(?:de)?\s*sue[nñ]o\s*[:\-]?\s*(\d{1,3})/i) || normalized.match(/\b(\d{1,3})\s*puntos\b/i);
  if (score) sleep.score = Number(score[1]);
  const total = normalized.match(/horas?\s*de\s*sue[nñ]o\s*[:\-]?\s*(\d{1,2}\s*h(?:oras?)?\s*\d{0,2}\s*min?)/i) || normalized.match(durationPattern);
  if (total) sleep.total = toDuration(total);
  const deepPct = normalized.match(/sue[nñ]o\s*profundo\s*[:\-]?\s*(\d{1,3})\s*%/i);
  if (deepPct) sleep.deepPercent = Number(deepPct[1]);
  const deepTime = rawText.match(/sue[nñ]o\s*profundo[\s\S]{0,30}?(\d{1,2}\s*h(?:oras?)?\s*\d{1,2}\s*min?)/i);
  if (deepTime) sleep.deep = toDuration(deepTime);
  const lightPct = normalized.match(/sue[nñ]o\s*liviano\s*[:\-]?\s*(\d{1,3})\s*%/i);
  if (lightPct) sleep.lightPercent = Number(lightPct[1]);
  const lightTime = rawText.match(/sue[nñ]o\s*liviano[\s\S]{0,30}?(\d{1,2}\s*h(?:oras?)?\s*\d{1,2}\s*min?)/i);
  if (lightTime) sleep.light = toDuration(lightTime);
  const remPct = normalized.match(/sue[nñ]o\s*rem\s*[:\-]?\s*(\d{1,3})\s*%/i);
  if (remPct) sleep.remPercent = Number(remPct[1]);
  const remTime = rawText.match(/sue[nñ]o\s*rem[\s\S]{0,30}?(\d{1,2}\s*h(?:oras?)?\s*\d{1,2}\s*min?)/i);
  if (remTime) sleep.rem = toDuration(remTime);
  const awakenings = normalized.match(/despertaste\s*[:\-]?\s*(\d{1,2})\s*veces/i);
  if (awakenings) sleep.awakenings = Number(awakenings[1]);
  const deepContinuity = normalized.match(/continuidad\s*de\s*sue[nñ]o\s*profundo\s*[:\-]?\s*(\d{1,3})/i);
  if (deepContinuity) sleep.deepContinuity = Number(deepContinuity[1]);
  const breathingQuality = normalized.match(/calidad\s*de\s*(?:la\s*)?respiraci[oó]n\s*[:\-]?\s*(\d{1,3})/i);
  if (breathingQuality) sleep.breathingQuality = Number(breathingQuality[1]);

  if (!sleep.deep) sleep.deep = calculateSleepStageDuration(sleep.total, sleep.deepPercent);
  if (!sleep.light) sleep.light = calculateSleepStageDuration(sleep.total, sleep.lightPercent);
  if (!sleep.rem) sleep.rem = calculateSleepStageDuration(sleep.total, sleep.remPercent);
  return sleep;
}

function fillMovementFields(data) {
  if (data.caloriesBurned !== undefined) progressFields.movementCaloriesBurned.value = data.caloriesBurned;
}

function fillSleepFields(data) {
  if (data.score !== undefined) progressFields.sleepScore.value = data.score;
  if (data.total !== undefined) progressFields.sleepTotal.value = data.total;
  if (data.deepPercent !== undefined) progressFields.sleepDeepPercent.value = data.deepPercent;
  if (data.lightPercent !== undefined) progressFields.sleepLightPercent.value = data.lightPercent;
  if (data.remPercent !== undefined) progressFields.sleepRemPercent.value = data.remPercent;
  if (data.awakenings !== undefined) progressFields.sleepAwakenings.value = data.awakenings;
  if (data.deepContinuity !== undefined) progressFields.sleepDeepContinuity.value = data.deepContinuity;
  if (data.breathingQuality !== undefined) progressFields.sleepBreathingQuality.value = data.breathingQuality;
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
  const parsedCollapsedMeals =
    parsedUi.collapsedMeals && typeof parsedUi.collapsedMeals === 'object' ? parsedUi.collapsedMeals : {};

  return {
    dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0),
    mealsCount,
    meals: normalizeMeals(parsed.meals, mealsCount),
    ui: {
      libraryOpen: false,
      progressOpen: false,
      theme: parsedUi.theme === 'dark' ? 'dark' : 'light',
      collapsedMeals: Object.entries(parsedCollapsedMeals).reduce((acc, [key, value]) => {
        if (value === true || value === false) acc[key] = value;
        return acc;
      }, {}),
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

function updateModalVisibility() {
  const isLibraryOpen = Boolean(state.ui.libraryOpen);
  const isProgressOpen = Boolean(state.ui.progressOpen);
  const isReplacementOpen = Boolean(state.ui.replacementOpen);

  uiFields.libraryModal?.classList.toggle('hidden', !isLibraryOpen);
  uiFields.libraryModal?.setAttribute('aria-hidden', String(!isLibraryOpen));
  uiFields.progressModal?.classList.toggle('hidden', !isProgressOpen);
  uiFields.progressModal?.setAttribute('aria-hidden', String(!isProgressOpen));
  uiFields.replacementModal?.classList.toggle('hidden', !isReplacementOpen);
  uiFields.replacementModal?.setAttribute('aria-hidden', String(!isReplacementOpen));

  if (uiFields.libraryToggle) {
    uiFields.libraryToggle.textContent = isLibraryOpen
      ? 'Cerrar biblioteca de alimentos'
      : 'Abrir biblioteca de alimentos';
    uiFields.libraryToggle.setAttribute('aria-expanded', String(isLibraryOpen));
  }

  if (uiFields.progressToggle) {
    uiFields.progressToggle.textContent = isProgressOpen
      ? 'Cerrar registro diario'
      : 'Abrir registro diario';
    uiFields.progressToggle.setAttribute('aria-expanded', String(isProgressOpen));
  }

  document.body.classList.toggle('modal-open', isLibraryOpen || isProgressOpen || isReplacementOpen);
}

function isElementVisible(element) {
  if (!element || !element.isConnected) return false;
  if (element.hidden) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
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

function getReplacementDifferences(originalMacros, replacementMacros) {
  return {
    proteinDiff: replacementMacros.protein - originalMacros.protein,
    carbsDiff: replacementMacros.carbs - originalMacros.carbs,
    fatDiff: replacementMacros.fat - originalMacros.fat,
    caloriesDiff: replacementMacros.calories - originalMacros.calories,
  };
}

function buildReplacementComment(differences, priority) {
  const thresholds = { proteinDiff: 3, carbsDiff: 5, fatDiff: 3, caloriesDiff: 40 };
  const labels = { proteinDiff: 'proteínas', carbsDiff: 'carbohidratos', fatDiff: 'grasas', caloriesDiff: 'calorías' };
  const priorityLabel = { protein: 'proteínas', carbs: 'carbohidratos', fat: 'grasas', calories: 'calorías' }[priority] || 'objetivo';
  const low = [];
  const high = [];
  Object.entries(differences).forEach(([key, value]) => {
    if (Math.abs(value) < thresholds[key]) return;
    if (value < 0) low.push(labels[key]);
    if (value > 0) high.push(labels[key]);
  });
  if (!low.length && !high.length) return `Prioridad cumplida: ${priorityLabel}. El reemplazo queda bastante similar al alimento original.`;
  const pieces = [`Prioridad cumplida: ${priorityLabel}.`];
  if (low.length) pieces.push(`El reemplazo queda más bajo en ${low.join(' y ')}.`);
  if (high.length) pieces.push(`El reemplazo queda más alto en ${high.join(' y ')}.`);
  if (low.includes('grasas')) pieces.push('Podrías complementar con una fuente de grasa si quieres acercarte al original.');
  if (low.includes('carbohidratos')) pieces.push('Podrías complementar con una fuente de carbohidratos si quieres acercarte al original.');
  if (low.includes('proteínas')) pieces.push('Podrías complementar con una fuente de proteína si quieres acercarte al original.');
  if (low.includes('calorías')) pieces.push('El reemplazo aporta menos calorías que el original.');
  if (high.length) pieces.push('El reemplazo supera al original en algunos valores; revisa si eso encaja con tu plan.');
  return pieces.join(' ');
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function buildExportableMenuBlock(title, meals, { includeDaySummary = false } = {}) {
  const mealsWithFoods = meals.filter((meal) => Array.isArray(meal.foods) && meal.foods.length > 0);
  if (!mealsWithFoods.length) return null;

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

  const dayTotals = getDayTotals();
  const summaryHtml = includeDaySummary
    ? `
      <section class="print-daily-summary">
        Resumen diario: P ${dayTotals.protein.toFixed(1)} g · C ${dayTotals.carbs.toFixed(1)} g · G ${dayTotals.fat.toFixed(1)} g · ${Math.round(dayTotals.calories)} kcal
      </section>
    `
    : '';

  return `
    <div class="print-menu-page">
      <h1>${escapeHtml(title)}</h1>
      <p class="print-date">Fecha: ${escapeHtml(getPrintableDate())}</p>
      ${mealsHtml}
      ${summaryHtml}
    </div>
  `;
}

function openExportWindow(contentHtml) {
  if (!contentHtml) return;

  const exportWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=800');
  if (!exportWindow) {
    alert('No se pudo abrir la ventana de exportación. Revisa si el navegador bloqueó pop-ups.');
    return;
  }

  exportWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Exportación de menú</title>
        <link rel="stylesheet" href="styles.css" />
      </head>
      <body class="export-window">
        ${contentHtml}
      </body>
    </html>
  `);
  exportWindow.document.close();
  exportWindow.focus();
  setTimeout(() => exportWindow.print(), 80);
}

function exportDailyMenu() {
  const payload = serializeDailyMenu(state);
  if (!payload.meals.length) {
    alert('No hay comidas con ingredientes para exportar el menú diario.');
    return;
  }
  downloadJsonFile(payload, `menu-diario-${getTodayIsoDate()}.json`);
}

function exportSingleMeal(mealIndex) {
  if (!Number.isInteger(mealIndex) || !state.meals[mealIndex]) return;
  const payload = serializeMeal(state.meals[mealIndex]);
  if (!payload.foods.length) {
    alert('Esta comida no tiene ingredientes para exportar.');
    return;
  }
  downloadJsonFile(payload, `comida-${mealIndex + 1}.json`);
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function serializeMealFood(food) {
  return {
    sourceFoodId: typeof food.sourceFoodId === 'string' ? food.sourceFoodId : null,
    name: food.name,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    caloriesPer100: food.caloriesPer100 ?? calculateCaloriesPer100(food.protein, food.carbs, food.fat),
    consumedGrams: food.consumedGrams,
  };
}

function serializeMeal(meal) {
  return { version: 1, exportedAt: new Date().toISOString(), name: meal.name, foods: meal.foods.map(serializeMealFood) };
}

function serializeDailyMenu(dayState) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    dailyCalorieGoal: dayState.dailyCalorieGoal,
    mealsCount: dayState.mealsCount,
    meals: dayState.meals.map((meal) => ({ name: meal.name, foods: meal.foods.map(serializeMealFood) })),
  };
}

function downloadJsonFile(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validateMealImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  if (toNumber(parsed.version) === null) return { valid: false, error: 'Falta el campo "version".' };
  if (typeof parsed.exportedAt !== 'string' || !parsed.exportedAt.trim()) return { valid: false, error: 'Falta el campo "exportedAt".' };
  if (typeof parsed.name !== 'string' || !parsed.name.trim()) return { valid: false, error: 'Falta el nombre de la comida.' };
  if (!Array.isArray(parsed.foods)) return { valid: false, error: 'Falta el campo "foods" o no es una lista.' };
  const foods = parsed.foods.map(normalizeMealFood).filter(Boolean);
  if (foods.length !== parsed.foods.length) return { valid: false, error: 'Uno o más ingredientes no tienen el formato esperado.' };
  return { valid: true, data: { name: parsed.name.trim(), foods } };
}

function validateDailyMenuImportPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
  if (toNumber(parsed.version) === null) return { valid: false, error: 'Falta el campo "version".' };
  if (typeof parsed.exportedAt !== 'string' || !parsed.exportedAt.trim()) return { valid: false, error: 'Falta el campo "exportedAt".' };
  if (toNumber(parsed.dailyCalorieGoal) === null) return { valid: false, error: 'Falta "dailyCalorieGoal".' };
  if (toNumber(parsed.mealsCount) === null) return { valid: false, error: 'Falta "mealsCount".' };
  if (!Array.isArray(parsed.meals)) return { valid: false, error: 'Falta el campo "meals" o no es una lista.' };

  const meals = parsed.meals.map((meal) => {
    if (!meal || typeof meal !== 'object') return null;
    if (typeof meal.name !== 'string' || !meal.name.trim()) return null;
    if (!Array.isArray(meal.foods)) return null;
    const foods = meal.foods.map(normalizeMealFood).filter(Boolean);
    if (foods.length !== meal.foods.length) return null;
    return { name: meal.name.trim(), foods };
  });
  if (meals.includes(null)) return { valid: false, error: 'Una o más comidas no tienen el formato esperado.' };
  return { valid: true, data: { dailyCalorieGoal: Math.max(0, toNumber(parsed.dailyCalorieGoal) || 0), meals } };
}

function importDailyMenuFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeParseJson(String(reader.result || ''));
    const validation = validateDailyMenuImportPayload(parsed);
    if (!validation.valid) return alert(validation.error);
    const { meals, dailyCalorieGoal } = validation.data;
    const shouldReplace = window.confirm('¿Quieres reemplazar el menú actual? (Cancelar = combinar)');
    if (shouldReplace) {
      state.mealsCount = Math.min(12, Math.max(1, meals.length || 1));
      state.meals = normalizeMeals(meals, state.mealsCount);
      state.dailyCalorieGoal = dailyCalorieGoal;
    } else {
      const nextMealsCount = Math.min(12, Math.max(state.meals.length, meals.length));
      state.meals = createInitialMeals(nextMealsCount).map((defaultMeal, index) => {
        const current = state.meals[index] || defaultMeal;
        const importedMeal = meals[index];
        if (!importedMeal) return current;
        return { name: importedMeal.name || current.name, foods: [...current.foods, ...importedMeal.foods] };
      });
      state.mealsCount = nextMealsCount;
    }
    saveDayState();
    render();
    alert('Menú diario importado correctamente.');
  };
  reader.onerror = () => alert('No se pudo leer el archivo JSON seleccionado.');
  reader.readAsText(file);
}

function importSingleMealFile(mealIndex, file) {
  if (!Number.isInteger(mealIndex) || !state.meals[mealIndex] || !file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = safeParseJson(String(reader.result || ''));
    const validation = validateMealImportPayload(parsed);
    if (!validation.valid) return alert(validation.error);
    const { foods, name } = validation.data;
    const shouldReplace = window.confirm('¿Quieres reemplazar esta comida? (Cancelar = combinar ingredientes)');
    state.meals[mealIndex] = shouldReplace ? { name, foods } : { ...state.meals[mealIndex], foods: [...state.meals[mealIndex].foods, ...foods] };
    saveDayState();
    render();
    alert('Comida importada correctamente.');
  };
  reader.onerror = () => alert('No se pudo leer el archivo JSON seleccionado.');
  reader.readAsText(file);
}

function downloadDailyMenuPdf() {
  const mealsWithFoods = state.meals.filter((meal) => meal.foods.length > 0);
  if (!mealsWithFoods.length) {
    alert('Aún no hay comidas con ingredientes para exportar a PDF.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 10;
  const marginTop = 10;
  const marginBottom = 10;
  const contentWidth = pageWidth - marginX * 2;
  const columnGap = 6;
  const columnWidth = (pageWidth - marginX * 2 - columnGap) / 2;
  const leftX = marginX;
  const rightX = marginX + columnWidth + columnGap;
  const blockInnerPaddingX = 2;
  const mealTitleSize = 9.5;
  const tableTextSize = 7.8;
  const rowLineHeight = 3.2;
  const rowSpacing = 2.2;
  const afterRowsSpacing = 2.6;
  const blockBottomPadding = 1.4;
  const mealRowSpacing = 3.2;

  const ensureSpace = (requiredHeight) => {
    if (cursorY + requiredHeight <= pageHeight - marginBottom) return;
    pdf.addPage();
    cursorY = marginTop;
  };

  const addHeader = () => {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Menú diario de comidas', marginX, cursorY);
    cursorY += 4.8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(`Fecha: ${getPrintableDate()}`, marginX, cursorY);
    cursorY += 4.2;
  };

  const getFoodColumnWidth = (blockWidth) => blockWidth - blockInnerPaddingX * 2 - 16;
  const getFoodX = (x) => x + blockInnerPaddingX;
  const getGramsX = (x, blockWidth) => x + blockWidth - blockInnerPaddingX;

  const estimateMealBlockHeight = (meal, blockWidth) => {
    const titleHeight = 4.2;
    const tableHeaderHeight = 4.2;
    const foodColumnWidth = getFoodColumnWidth(blockWidth);
    const foodRowsHeight = meal.foods.reduce((height, food) => {
      const wrappedLines = pdf.splitTextToSize(food.name, foodColumnWidth);
      return height + Math.max(1, wrappedLines.length) * rowLineHeight;
    }, 0);
    const subtotalHeight = 3.2;
    return titleHeight + tableHeaderHeight + rowSpacing + foodRowsHeight + afterRowsSpacing + subtotalHeight + blockBottomPadding;
  };

  const drawMealBlock = (meal, totals, x, y, blockWidth) => {
    const foodX = getFoodX(x);
    const gramsX = getGramsX(x, blockWidth);
    const foodColumnWidth = getFoodColumnWidth(blockWidth);
    let lineY = y;

    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(mealTitleSize);
    pdf.text(meal.name, x, lineY);

    lineY += 4.2;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(tableTextSize);
    pdf.text('Alimento', foodX, lineY);
    pdf.text('Gramos', gramsX, lineY, { align: 'right' });

    lineY += rowSpacing;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(tableTextSize);

    meal.foods.forEach((food) => {
      const wrappedName = pdf.splitTextToSize(food.name, foodColumnWidth);
      const rowHeight = Math.max(1, wrappedName.length) * rowLineHeight;
      const gramsText = `${food.consumedGrams.toFixed(1)} g`;

      wrappedName.forEach((nameLine, lineIndex) => {
        pdf.text(nameLine, foodX, lineY + lineIndex * rowLineHeight);
      });

      const gramsY = lineY + ((Math.max(1, wrappedName.length) - 1) * rowLineHeight) / 2;
      pdf.text(gramsText, gramsX, gramsY, { align: 'right' });

      const lastNameLine = wrappedName[wrappedName.length - 1] || '';
      const lineStartX = foodX + pdf.getTextWidth(lastNameLine) + 2.8;
      const lineEndX = gramsX - pdf.getTextWidth(gramsText) - 2.8;
      const guideLineWidth = lineEndX - lineStartX;
      if (guideLineWidth > 2.4) {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.1);
        if (typeof pdf.setLineDashPattern === 'function') {
          pdf.setLineDashPattern([0.7, 0.7], 0);
        }
        pdf.line(lineStartX, gramsY, lineEndX, gramsY);
        if (typeof pdf.setLineDashPattern === 'function') {
          pdf.setLineDashPattern([], 0);
        }
      }

      lineY += rowHeight;
    });

    lineY += 1.1;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(tableTextSize);
    pdf.text(
      `Subtotal: P ${totals.protein.toFixed(1)} g · C ${totals.carbs.toFixed(1)} g · G ${totals.fat.toFixed(1)} g · ${Math.round(totals.calories)} kcal`,
      foodX,
      lineY
    );

  };

  let cursorY = marginTop;
  addHeader();

  for (let i = 0; i < mealsWithFoods.length; i += 2) {
    const leftMeal = mealsWithFoods[i];
    const rightMeal = mealsWithFoods[i + 1] || null;
    const leftTotals = getMealTotals(leftMeal);
    const rightTotals = rightMeal ? getMealTotals(rightMeal) : null;
    const leftHeight = estimateMealBlockHeight(leftMeal, columnWidth);
    const rightHeight = rightMeal ? estimateMealBlockHeight(rightMeal, columnWidth) : 0;
    const rowHeight = Math.max(leftHeight, rightHeight);

    ensureSpace(rowHeight + mealRowSpacing);
    drawMealBlock(leftMeal, leftTotals, leftX, cursorY, columnWidth);
    if (rightMeal && rightTotals) {
      drawMealBlock(rightMeal, rightTotals, rightX, cursorY, columnWidth);
    }
    cursorY += rowHeight + mealRowSpacing;
  }

  const dayTotals = getDayTotals();
  ensureSpace(10);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Resumen diario final', marginX, cursorY);
  cursorY += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    `Proteínas: ${dayTotals.protein.toFixed(1)} g · Carbohidratos: ${dayTotals.carbs.toFixed(1)} g · Grasas: ${dayTotals.fat.toFixed(1)} g · Calorías: ${Math.round(dayTotals.calories)} kcal`,
    marginX,
    cursorY,
    { maxWidth: contentWidth }
  );

  pdf.save(`menu-diario-${getTodayIsoDate()}.pdf`);
}

function renderSummary() {
  const totals = getDayTotals();
  const remaining = state.dailyCalorieGoal - totals.calories;
  const latestWeight = getLatestProgressWeight();
  const hasValidWeight = latestWeight !== null && latestWeight > 0;

  summary.protein.textContent = totals.protein.toFixed(1);
  summary.carbs.textContent = totals.carbs.toFixed(1);
  summary.fat.textContent = totals.fat.toFixed(1);
  summary.calories.textContent = String(Math.round(totals.calories));
  summary.goal.textContent = String(Math.round(state.dailyCalorieGoal));
  summary.remaining.textContent = String(Math.round(remaining));

  summary.weightUsed.textContent = hasValidWeight ? `${latestWeight.toFixed(1)} kg` : 'Sin peso registrado';
  summary.proteinPerKg.textContent = hasValidWeight ? (totals.protein / latestWeight).toFixed(2) : '--';
  summary.carbsPerKg.textContent = hasValidWeight ? (totals.carbs / latestWeight).toFixed(2) : '--';
  summary.fatPerKg.textContent = hasValidWeight ? (totals.fat / latestWeight).toFixed(2) : '--';
}

function getLatestProgressWeight() {
  if (!Array.isArray(state.progressLog) || !state.progressLog.length) return null;
  const sorted = sortProgressLogDesc(state.progressLog);
  const latestEntry = sorted.find((entry) => typeof entry.weight === 'number' && entry.weight > 0);
  return latestEntry ? latestEntry.weight : null;
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
          class="secondary replace-ingredient-button"
          data-meal-index="${mealIndex}"
          data-food-index="${foodIndex}"
        >
          Reemplazar
        </button>
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
        Peso: ${entry.weight.toFixed(1)} kg · Grasa: ${entry.bodyFat === null ? 'no ingresado' : `${entry.bodyFat.toFixed(1)}%`} · Cintura/estómago: ${entry.waist === null ? 'no ingresado' : `${entry.waist.toFixed(1)} cm`}
      </p>
    </li>
  `;
}

function resizeCanvasToDisplaySize(canvas) {
  if (!canvas) return;

  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
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
  if (!state.ui.progressOpen) return;

  const progressModal = uiFields.progressModal;
  if (!isElementVisible(progressModal) || !isElementVisible(progressFields.charts.weight)) return;

  const chartData = [...state.progressLog]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      activityDate: entry.activityDate ?? null,
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
    chartData
      .filter((point) => point.bodyFat !== null)
      .map((point) => ({ date: point.date, value: point.bodyFat })),
    'Grasa corporal'
  );

  const leanMassData = chartData.filter((point) => point.bodyFat !== null);
  const baseLeanMass = leanMassData[0]?.weight * (1 - leanMassData[0]?.bodyFat / 100);

  drawLineChart(
    progressFields.charts.leanMassGain,
    progressFields.chartEmpty.leanMassGain,
    leanMassData.map((point) => ({
      date: point.date,
      value: point.weight * (1 - point.bodyFat / 100) - baseLeanMass,
    })),
    'Aumento de masa magra'
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

      const mealPanelId = `meal-content-${mealIndex}`;
      const isCollapsed = Boolean(state.ui.collapsedMeals?.[mealIndex]);
      const mealHeaderSubtotal = `P ${mealTotals.protein.toFixed(1)} g · C ${mealTotals.carbs.toFixed(1)} g · G ${mealTotals.fat.toFixed(1)} g · ${Math.round(mealTotals.calories)} kcal`;

      return `
        <section class="card meal-card" data-meal-index="${mealIndex}">
          <div class="meal-header">
            <h2>
              ${meal.name}
              <span class="meal-header-subtotal${isCollapsed ? '' : ' hidden'}">· ${mealHeaderSubtotal}</span>
            </h2>
            <div class="meal-actions">
              <button
                type="button"
                class="secondary toggle-meal-visibility-button collapsible-toggle-button"
                data-meal-index="${mealIndex}"
                aria-expanded="${String(!isCollapsed)}"
                aria-controls="${mealPanelId}"
              >
                ${getToggleButtonContent(!isCollapsed, 'Mostrar comida', 'Ocultar comida')}
              </button>
              ${
                isCollapsed
                  ? ''
                  : `
                    <button type="button" class="secondary export-meal-button" data-meal-index="${mealIndex}">
                      Descargar comida
                    </button>
                    <button type="button" class="secondary import-meal-button" data-meal-index="${mealIndex}">
                      Cargar en esta comida
                    </button>
                    <button type="button" class="primary add-food-toggle" ${state.foodLibrary.length ? '' : 'disabled'}>
                      Agregar ingrediente
                    </button>
                  `
              }
            </div>
          </div>

          <div id="${mealPanelId}" class="meal-content${isCollapsed ? ' hidden' : ''}">
            ${ingredientFormHtml}

            ${foodsHtml}

            <div class="subtotal" role="status" aria-live="polite">
              Subtotal: ${mealHeaderSubtotal}
            </div>
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
  updateModalVisibility();
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

  const toggleVisibilityButtons = mealsContainer.querySelectorAll('.toggle-meal-visibility-button');

  toggleVisibilityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mealIndex = Number(button.dataset.mealIndex);
      if (!Number.isInteger(mealIndex) || !state.meals[mealIndex]) return;

      state.ui.collapsedMeals = state.ui.collapsedMeals || {};
      state.ui.collapsedMeals[mealIndex] = !Boolean(state.ui.collapsedMeals[mealIndex]);

      saveDayState();
      render();
    });
  });

  const deleteButtons = mealsContainer.querySelectorAll('.delete-ingredient-button');
  const replaceButtons = mealsContainer.querySelectorAll('.replace-ingredient-button');

  replaceButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mealIndex = Number(button.dataset.mealIndex);
      const foodIndex = Number(button.dataset.foodIndex);
      if (!Number.isInteger(mealIndex) || !Number.isInteger(foodIndex)) return;
      const food = state.meals[mealIndex]?.foods?.[foodIndex];
      if (!food) return;
      replacementContext = { mealIndex, foodIndex };
      renderReplacementModal();
      openModal('replacement');
    });
  });

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

  const exportMealButtons = mealsContainer.querySelectorAll('.export-meal-button');
  exportMealButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mealIndex = Number(button.dataset.mealIndex);
      exportSingleMeal(mealIndex);
    });
  });

  const importMealButtons = mealsContainer.querySelectorAll('.import-meal-button');
  importMealButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mealIndex = Number(button.dataset.mealIndex);
      if (!Number.isInteger(mealIndex) || !state.meals[mealIndex]) return;
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'application/json,.json';
      fileInput.addEventListener('change', () => {
        const [file] = fileInput.files || [];
        importSingleMealFile(mealIndex, file);
      });
      fileInput.click();
    });
  });
}

function renderReplacementModal() {
  if (!replacementFields.foodSelect || !replacementContext) return;
  const currentFood = state.meals[replacementContext.mealIndex]?.foods?.[replacementContext.foodIndex];
  if (!currentFood) return;
  const options = state.foodLibrary
    .map((food) => `<option value="${food.id}">${food.name}</option>`)
    .join('');
  replacementFields.foodSelect.innerHTML = options;
  replacementFields.error.textContent = '';
  updateReplacementPreview();
}

function updateReplacementPreview() {
  if (!replacementContext || !replacementFields.foodSelect || !replacementFields.prioritySelect) return;
  const currentFood = state.meals[replacementContext.mealIndex]?.foods?.[replacementContext.foodIndex];
  const replacementFood = state.foodLibrary.find((item) => item.id === replacementFields.foodSelect.value);
  if (!currentFood || !replacementFood) return;
  const priority = replacementFields.prioritySelect.value;
  const originalTotals = getFoodTotals(currentFood);
  const priorityMap = { protein: 'protein', carbs: 'carbs', fat: 'fat', calories: 'caloriesPer100' };
  const per100Value = replacementFood[priorityMap[priority]];
  if (!per100Value || per100Value <= 0) return;
  const targetValue = originalTotals[priority === 'calories' ? 'calories' : priority];
  const grams = (targetValue / per100Value) * 100;
  const replacementTotals = {
    protein: (replacementFood.protein * grams) / 100,
    carbs: (replacementFood.carbs * grams) / 100,
    fat: (replacementFood.fat * grams) / 100,
    calories: (replacementFood.caloriesPer100 * grams) / 100,
  };
  const differences = getReplacementDifferences(originalTotals, replacementTotals);
  replacementContext.preview = { replacementFood, grams, replacementTotals, differences, priority };
  replacementFields.results.innerHTML = `Original: P: ${originalTotals.protein.toFixed(1)} g · C: ${originalTotals.carbs.toFixed(1)} g · G: ${originalTotals.fat.toFixed(1)} g · kcal: ${Math.round(originalTotals.calories)}<br>Reemplazo: P: ${replacementTotals.protein.toFixed(1)} g · C: ${replacementTotals.carbs.toFixed(1)} g · G: ${replacementTotals.fat.toFixed(1)} g · kcal: ${Math.round(replacementTotals.calories)}<br>Diferencia: P: ${differences.proteinDiff.toFixed(1)} g · C: ${differences.carbsDiff.toFixed(1)} g · G: ${differences.fatDiff.toFixed(1)} g · kcal: ${Math.round(differences.caloriesDiff)}`;
  replacementFields.comment.textContent = buildReplacementComment(differences, priority);
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
      const nextBodyFat = prompt('Editar grasa corporal % (opcional)', entry.bodyFat === null ? '' : String(entry.bodyFat));
      const nextCalories = prompt('Editar calorías teóricas (opcional)', entry.calories === null ? '' : String(entry.calories));
      const nextWaist = prompt('Editar medida cintura/estómago cm (opcional)', entry.waist === null ? '' : String(entry.waist));

      if (
        nextDate === null ||
        nextWeight === null ||
        nextBodyFat === null ||
        nextCalories === null ||
        nextWaist === null
      ) {
        return;
      }

      const updated = normalizeProgressLogEntry({
        id: entry.id,
        date: nextDate,
        weight: nextWeight,
        bodyFat: nextBodyFat,
        calories: nextCalories,
        waist: nextWaist,
        movementImage: entry.movementImage,
        sleepImage: entry.sleepImage,
        movement: entry.movement,
        sleep: entry.sleep,
        nutritionSummary: entry.nutritionSummary ?? null,
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

function formatDateMinusOne(dateValue) {
  const raw = String(dateValue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const [year, month, day] = raw.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  return utcDate.toISOString().slice(0, 10);
}

function toMissingTextValue(value) {
  return value === null || value === undefined || value === '' ? 'no ingresado' : value;
}

function getCurrentNutritionSummarySnapshot() {
  const totals = getDayTotals();
  const remaining = state.dailyCalorieGoal - totals.calories;
  const weightUsedKg = getLatestProgressWeight();
  const hasWeight = typeof weightUsedKg === 'number' && weightUsedKg > 0;

  return {
    proteinGrams: Number(totals.protein.toFixed(1)),
    carbsGrams: Number(totals.carbs.toFixed(1)),
    fatGrams: Number(totals.fat.toFixed(1)),
    consumedCalories: Math.round(totals.calories),
    calorieGoal: Math.round(state.dailyCalorieGoal),
    remainingCalories: Math.round(remaining),
    weightUsedKg: hasWeight ? Number(weightUsedKg.toFixed(1)) : null,
    proteinPerKg: hasWeight ? Number((totals.protein / weightUsedKg).toFixed(2)) : null,
    carbsPerKg: hasWeight ? Number((totals.carbs / weightUsedKg).toFixed(2)) : null,
    fatPerKg: hasWeight ? Number((totals.fat / weightUsedKg).toFixed(2)) : null,
  };
}

function buildProgressTxtLines(entries, options = {}) {
  const { includeChatGptNote = true } = options;
  return sortProgressLogDesc(entries).map((entry, index) => [
    '=== REGISTRO DIARIO ===',
    `Registro: ${index + 1}`,
    `Fecha del registro: ${entry.date}`,
    '',
    '--- BIOMÉTRICOS ---',
    `Peso: ${entry.weight} kg`,
    `Grasa corporal: ${entry.bodyFat === null ? 'no ingresado' : `${entry.bodyFat}%`}`,
    `Medida cintura/estómago: ${entry.waist === null ? 'no ingresado' : `${entry.waist} cm`}`,
    '',
    '--- ALIMENTACIÓN / RESUMEN DIARIO ---',
    `Proteínas: ${entry.nutritionSummary?.proteinGrams === null || entry.nutritionSummary?.proteinGrams === undefined ? 'no registrado' : `${entry.nutritionSummary.proteinGrams.toFixed(1)} g`}`,
    `Carbohidratos: ${entry.nutritionSummary?.carbsGrams === null || entry.nutritionSummary?.carbsGrams === undefined ? 'no registrado' : `${entry.nutritionSummary.carbsGrams.toFixed(1)} g`}`,
    `Grasas: ${entry.nutritionSummary?.fatGrams === null || entry.nutritionSummary?.fatGrams === undefined ? 'no registrado' : `${entry.nutritionSummary.fatGrams.toFixed(1)} g`}`,
    `Calorías consumidas: ${entry.nutritionSummary?.consumedCalories === null || entry.nutritionSummary?.consumedCalories === undefined ? 'no registrado' : `${entry.nutritionSummary.consumedCalories} kcal`}`,
    '',
    '--- MOVIMIENTO ---',
    `Calorías gastadas: ${toMissingTextValue(entry.movement?.caloriesBurned)}${entry.movement?.caloriesBurned === null ? '' : ' kcal'}`,
    '',
    '--- SUEÑO ---',
    `Puntaje sueño: ${toMissingTextValue(entry.sleep?.score)}${entry.sleep?.score === null ? '' : ' puntos'}`,
    `Horas de sueño: ${toMissingTextValue(entry.sleep?.total)}`,
    `Sueño profundo: ${toMissingTextValue(calculateSleepStageDuration(entry.sleep?.total, entry.sleep?.deepPercent))} / ${toMissingTextValue(entry.sleep?.deepPercent)}${entry.sleep?.deepPercent === null ? '' : '%'}`,
    `Sueño liviano: ${toMissingTextValue(calculateSleepStageDuration(entry.sleep?.total, entry.sleep?.lightPercent))} / ${toMissingTextValue(entry.sleep?.lightPercent)}${entry.sleep?.lightPercent === null ? '' : '%'}`,
    `Sueño REM: ${toMissingTextValue(calculateSleepStageDuration(entry.sleep?.total, entry.sleep?.remPercent))} / ${toMissingTextValue(entry.sleep?.remPercent)}${entry.sleep?.remPercent === null ? '' : '%'}`,
    `Despertares: ${toMissingTextValue(entry.sleep?.awakenings)}${entry.sleep?.awakenings === null ? '' : ' veces'}`,
    `Continuidad sueño profundo: ${toMissingTextValue(entry.sleep?.deepContinuity)}${entry.sleep?.deepContinuity === null ? '' : ' puntos'}`,
    `Calidad de respiración: ${toMissingTextValue(entry.sleep?.breathingQuality)}`,
    ...(includeChatGptNote ? [
      '',
      '--- NOTA PARA CHATGPT ---',
      'ChatGPT debe actuar como Analista NEUROBASE de biométricos, sueño, nutrición, movimiento y recuperación.',
      '',
      'Su función es recibir mis registros diarios en formato estructurado, verificar los datos, calcular masa grasa y masa magra cuando entregue peso y porcentaje de grasa, cruzar alimentación, sueño, movimiento, pasos y entrenamiento, y analizar si los cambios son reales o solo variaciones por bioimpedancia, agua, glucógeno, estrés, digestión o error de medición.',
      '',
      'Debe hacerme preguntas puntuales cuando detecte dudas o inconsistencias, por ejemplo despertares nocturnos, respiración baja, cambios bruscos de peso o grasa, calorías fuera de patrón, pasos altos/bajos o entrenamientos que puedan alterar el sueño.',
      '',
      'No debe concluir aumento o pérdida real de grasa por un solo día. Debe analizar tendencias, contexto y comportamiento acumulado dentro del histórico NEUROBASE.',
      '',
      'También debe registrar todos los datos en memoria, exceptuando por si en alguna ocasión yo pida expresamente no hacerlo o eliminarlo.',
    ] : []),
  ].join('\n'));
}

function exportProgressTxt() {
  const selectedDate = String(progressFields.exportTxtDate?.value || '').trim();

  if (!selectedDate) {
    showProgressStatus('Selecciona una fecha para exportar el TXT.', 'warning');
    return;
  }

  const selectedEntries = state.progressLog.filter((entry) => entry.date === selectedDate);

  if (!selectedEntries.length) {
    showProgressStatus('No hay registros para la fecha seleccionada.', 'warning');
    return;
  }

  const lines = buildProgressTxtLines(selectedEntries);

  const blob = new Blob([`\ufeff${lines.join('\n\n')}`], {
    type: 'text/plain;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `registro-diario-${selectedDate}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showProgressStatus(`Se exportó ${lines.length} registro en TXT para ${selectedDate}.`, 'success');
}

function downloadAllRecordsTxt() {
  if (!state.progressLog.length) {
    showProgressStatus('No hay registros para exportar.', 'warning');
    return;
  }

  const lines = buildProgressTxtLines(state.progressLog, { includeChatGptNote: false });
  const blob = new Blob([`\ufeff${lines.join('\n\n')}`], {
    type: 'text/plain;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'historial-registros.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showProgressStatus(`Se exportaron ${lines.length} registros en TXT (historial).`, 'success');
}

function exportProgressJson() {
  if (!state.progressLog.length) {
    showProgressStatus('No hay registros para exportar.', 'warning');
    return;
  }

  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    progressLog: sortProgressLogDesc(state.progressLog).map((entry) => ({
      id: entry.id,
      date: entry.date,
      activityDate: entry.activityDate ?? null,
      weight: entry.weight,
      bodyFat: entry.bodyFat,
      calories: entry.calories,
      waist: entry.waist ?? null,
      sleepImage: entry.sleepImage ?? null,
      movementImage: entry.movementImage ?? null,
      movement: entry.movement,
      sleep: entry.sleep,
      nutritionSummary: entry.nutritionSummary ?? null,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'registro-diario.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showProgressStatus(`Se exportaron ${payload.progressLog.length} registros en JSON.`, 'success');
}

function normalizeCsvHeader(value) {
  return String(value || '')
    .trim()
    .replace(/^\ufeff/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseCsvLine(line, separator) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function importProgressRecords(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    const rawText = String(reader.result || '').replace(/^\ufeff/, '');
    const lines = rawText.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      showProgressStatus('El archivo debe incluir encabezados y al menos un registro.', 'error');
      return;
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = parseCsvLine(lines[0], separator).map(normalizeCsvHeader);

    const expectedHeaders = ['fecha', 'peso', 'grasa corporal %', 'calorias teoricas'];
    const hasExpectedHeaders = expectedHeaders.every((header, index) => headers[index] === header) || headers[0] === 'fecha';

    if (!hasExpectedHeaders) {
      showProgressStatus(
        'Encabezados inválidos. Usa: Fecha;Peso;Grasa corporal %;Calorías teóricas.',
        'error'
      );
      return;
    }

    const imported = [];

    for (let index = 1; index < lines.length; index += 1) {
      const cells = parseCsvLine(lines[index], separator);
      if (cells.length < 2) continue;

      const entry = normalizeProgressLogEntry({
        id: createLogId(),
        date: cells[0],
        weight: cells[1],
        bodyFat: cells[2],
        calories: cells[3],
        waist: cells[4],
      });

      if (!entry) {
        showProgressStatus(
          `Fila ${index + 1} inválida. Revisa fecha y peso (los demás campos son opcionales).`,
          'error'
        );
        return;
      }

      imported.push(entry);
    }

    if (!imported.length) {
      showProgressStatus('No se encontraron registros válidos para importar.', 'warning');
      return;
    }

    const replace = confirm(
      '¿Deseas reemplazar los registros actuales?\nAceptar = Reemplazar\nCancelar = Combinar sin duplicados'
    );

    if (replace) {
      state.progressLog = sortProgressLogDesc(imported);
      saveProgressLog();
      renderProgressLog();
      showProgressStatus(
        `Se importaron ${state.progressLog.length} registros (reemplazo completo).`,
        'success'
      );
      return;
    }

    const existingFingerprints = new Set(
      state.progressLog.map((entry) =>
        [entry.date, entry.weight, entry.bodyFat, entry.calories].join('__')
      )
    );

    let addedCount = 0;

    imported.forEach((entry) => {
      const fingerprint = [entry.date, entry.weight, entry.bodyFat, entry.calories].join('__');
      if (existingFingerprints.has(fingerprint)) return;
      existingFingerprints.add(fingerprint);
      state.progressLog.push(entry);
      addedCount += 1;
    });

    state.progressLog = sortProgressLogDesc(state.progressLog);
    saveProgressLog();
    renderProgressLog();
    showProgressStatus(
      `Importación completada. ${addedCount} nuevos, total ${state.progressLog.length}.`,
      'success'
    );
  };

  reader.onerror = () => {
    showProgressStatus('No se pudo leer el archivo de registros.', 'error');
  };

  reader.readAsText(file);
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


function updateWeightPoundsPreview() {
  if (!progressFields.weightPoundsPreview) return;

  const kg = toNumber(progressFields.weight?.value);
  if (kg === null || kg <= 0) {
    progressFields.weightPoundsPreview.textContent = '-- lb';
    return;
  }

  const pounds = kg * 2.20462;
  progressFields.weightPoundsPreview.textContent = `${pounds.toFixed(1)} lb`;
}

function bindProgressEvents() {
  if (!progressFields.form) return;

  updateWeightPoundsPreview();
  progressFields.weight?.addEventListener('input', updateWeightPoundsPreview);
  progressFields.weight?.addEventListener('change', updateWeightPoundsPreview);

  progressFields.form.addEventListener('submit', (event) => {
    event.preventDefault();

    const entry = normalizeProgressLogEntry({
      id: createLogId(),
      date: progressFields.date.value,
        weight: progressFields.weight.value,
        bodyFat: progressFields.bodyFat.value,
        waist: progressFields.waist.value,
        movementImage: progressFields.movementPreview?.src || null,
        sleepImage: progressFields.sleepPreview?.src || null,
        movement: {
          caloriesBurned: progressFields.movementCaloriesBurned.value,
        },
        sleep: {
          score: progressFields.sleepScore.value,
          total: progressFields.sleepTotal.value,
          deepPercent: progressFields.sleepDeepPercent.value,
          lightPercent: progressFields.sleepLightPercent.value,
          remPercent: progressFields.sleepRemPercent.value,
          awakenings: progressFields.sleepAwakenings.value,
          deepContinuity: progressFields.sleepDeepContinuity.value,
          breathingQuality: progressFields.sleepBreathingQuality.value,
        },
        nutritionSummary: getCurrentNutritionSummarySnapshot(),
    });

    if (!progressFields.date.value) {
      progressFields.error.textContent = 'La fecha es obligatoria.';
      return;
    }

    if (!entry) {
      progressFields.error.textContent = 'Completa correctamente fecha y peso. Los demás campos son opcionales.';
      return;
    }

    state.progressLog = sortProgressLogDesc([...state.progressLog, entry]);
    saveProgressLog();

    progressFields.form.reset();
    updateWeightPoundsPreview();
    updateImagePreview(progressFields.movementPreview, null);
    updateImagePreview(progressFields.sleepPreview, null);
    progressFields.error.textContent = '';
    renderProgressLog();
    showProgressStatus('Registro guardado correctamente.', 'success');
  });

  const imageHandlers = [
    { input: progressFields.movementImage, preview: progressFields.movementPreview },
    { input: progressFields.sleepImage, preview: progressFields.sleepPreview },
  ];

  imageHandlers.forEach(({ input, preview }) => {
    if (!input || !preview) return;
    input.addEventListener('change', async () => {
      const [file] = input.files || [];
      if (!file) {
        updateImagePreview(preview, null);
        return;
      }
      try {
        const dataUrl = await fileToDataUrl(file);
        updateImagePreview(preview, dataUrl);
      } catch {
        updateImagePreview(preview, null);
      }
    });
  });

  progressFields.extractMovementButton?.addEventListener('click', async () => {
    const [file] = progressFields.movementImage?.files || [];
    if (!file) {
      showStatus(progressFields.movementOcrStatus, 'Primero sube una imagen', 'warning');
      return;
    }
    progressFields.extractMovementButton.disabled = true;
    showStatus(progressFields.movementOcrStatus, 'Leyendo imagen...', 'warning');
    try {
      const text = await runOcrFromImage(file);
      const data = extractMovementDataFromText(text);
      fillMovementFields(data);
      const detected = Object.keys(data).length;
      showStatus(progressFields.movementOcrStatus, detected ? 'Calorías extraídas' : 'No se detectaron calorías', detected ? 'success' : 'warning');
    } catch {
      showStatus(progressFields.movementOcrStatus, 'No se pudo leer la imagen. Puedes completar los datos manualmente.', 'error');
    } finally {
      progressFields.extractMovementButton.disabled = false;
    }
  });

  progressFields.extractSleepButton?.addEventListener('click', async () => {
    const [file] = progressFields.sleepImage?.files || [];
    if (!file) {
      showStatus(progressFields.sleepOcrStatus, 'Primero sube una imagen', 'warning');
      return;
    }
    progressFields.extractSleepButton.disabled = true;
    showStatus(progressFields.sleepOcrStatus, 'Leyendo imagen...', 'warning');
    try {
      const text = await runOcrFromImage(file);
      const data = extractSleepDataFromText(text);
      fillSleepFields(data);
      const detected = Object.keys(data).length;
      showStatus(progressFields.sleepOcrStatus, detected ? (detected >= 11 ? 'Datos extraídos' : 'No se pudieron detectar algunos datos') : 'No se detectaron datos', detected ? 'success' : 'warning');
    } catch {
      showStatus(progressFields.sleepOcrStatus, 'No se pudo leer la imagen. Puedes completar los datos manualmente.', 'error');
    } finally {
      progressFields.extractSleepButton.disabled = false;
    }
  });


  if (progressFields.exportTxt) {
    progressFields.exportTxt.addEventListener('click', exportProgressTxt);
  }

  if (progressFields.exportAllTxt) {
    progressFields.exportAllTxt.addEventListener('click', downloadAllRecordsTxt);
  }

  if (progressFields.exportJson) {
    progressFields.exportJson.addEventListener('click', exportProgressJson);
  }

  if (progressFields.importButton && progressFields.importInput) {
    progressFields.importButton.addEventListener('click', () => {
      progressFields.importInput.value = '';
      progressFields.importInput.click();
    });

    progressFields.importInput.addEventListener('change', () => {
      const [file] = progressFields.importInput.files || [];
      importProgressRecords(file);
    });
  }
}


const showIcon = "/assets/icons/mostrar.png";
const hideIcon = "/assets/icons/ocultar.png";

function getToggleButtonContent(isExpanded, showText, hideText) {
  const iconSrc = isExpanded ? hideIcon : showIcon;
  const text = isExpanded ? hideText : showText;
  return `
    <img src="${iconSrc}" alt="" class="toggle-button-icon" aria-hidden="true">
    <span>${text}</span>
  `;
}

function setToggleButtonContent(button, isExpanded, showText, hideText) {
  button.classList.add('collapsible-toggle-button');
  button.innerHTML = getToggleButtonContent(isExpanded, showText, hideText);
}

function initCollapsibleSection(buttonId, panelId, showText, hideText, onToggle) {
  const button = document.getElementById(buttonId);
  const panel = document.getElementById(panelId);
  if (!button || !panel) return;

  const syncView = (isOpen) => {
    panel.classList.toggle('hidden', !isOpen);
    button.setAttribute('aria-expanded', String(isOpen));
    setToggleButtonContent(button, isOpen, showText, hideText);
    onToggle?.(isOpen);
  };

  syncView(false);

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    syncView(!isOpen);
  });
}

const MODAL_KEYS = ['library', 'progress', 'replacement'];

function isSupportedModal(modalName) {
  return MODAL_KEYS.includes(modalName);
}

function setModalState(modalName, isOpen) {
  if (!isSupportedModal(modalName)) return;

  state.ui.libraryOpen = false;
  state.ui.progressOpen = false;
  state.ui.replacementOpen = false;

  if (isOpen) {
    if (modalName === 'library') state.ui.libraryOpen = true;
    if (modalName === 'progress') state.ui.progressOpen = true;
    if (modalName === 'replacement') state.ui.replacementOpen = true;
  }

  saveDayState();
  updateModalVisibility();
}

function openModal(modalName) {
  setModalState(modalName, true);

  if (modalName === 'progress') {
    requestAnimationFrame(() => {
      renderProgressCharts();
    });
  }
}

function closeModal(modalName) {
  setModalState(modalName, false);
}

function closeAllModals() {
  setModalState('library', false);
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
      setModalState('library', !state.ui.libraryOpen);
    });
  }

  if (uiFields.progressToggle) {
    uiFields.progressToggle.addEventListener('click', () => {
      setModalState('progress', !state.ui.progressOpen);
    });
  }

  uiFields.libraryModalClose?.addEventListener('click', () => closeModal('library'));
  uiFields.progressModalClose?.addEventListener('click', () => closeModal('progress'));
  uiFields.replacementModalClose?.addEventListener('click', () => closeModal('replacement'));

  replacementFields.foodSelect?.addEventListener('change', updateReplacementPreview);
  replacementFields.prioritySelect?.addEventListener('change', updateReplacementPreview);
  replacementFields.form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!replacementContext?.preview) return;
    const { mealIndex, foodIndex } = replacementContext;
    const currentFood = state.meals[mealIndex]?.foods?.[foodIndex];
    if (!currentFood) return;
    currentFood.sourceFoodId = replacementContext.preview.replacementFood.id;
    currentFood.name = replacementContext.preview.replacementFood.name;
    currentFood.protein = replacementContext.preview.replacementFood.protein;
    currentFood.carbs = replacementContext.preview.replacementFood.carbs;
    currentFood.fat = replacementContext.preview.replacementFood.fat;
    currentFood.caloriesPer100 = replacementContext.preview.replacementFood.caloriesPer100;
    currentFood.consumedGrams = Number(replacementContext.preview.grams.toFixed(1));
    saveDayState();
    closeModal('replacement');
    render();
  });

  uiFields.libraryModal?.addEventListener('click', (event) => {
    if (event.target !== uiFields.libraryModal) return;
    closeAllModals();
  });

  uiFields.progressModal?.addEventListener('click', (event) => {
    if (event.target !== uiFields.progressModal) return;
    closeAllModals();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!state.ui.libraryOpen && !state.ui.progressOpen) return;
    closeAllModals();
  });

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
    uiFields.printMenuButton.addEventListener('click', downloadDailyMenuPdf);
  }

  if (uiFields.exportDailyMenuButton) {
    uiFields.exportDailyMenuButton.addEventListener('click', exportDailyMenu);
  }

  if (uiFields.importDailyMenuButton && uiFields.importDailyMenuInput) {
    uiFields.importDailyMenuButton.addEventListener('click', () => {
      uiFields.importDailyMenuInput.value = '';
      uiFields.importDailyMenuInput.click();
    });
    uiFields.importDailyMenuInput.addEventListener('change', () => {
      const [file] = uiFields.importDailyMenuInput.files || [];
      importDailyMenuFile(file);
    });
  }

  window.addEventListener('resize', () => {
    renderProgressCharts();
  });

}



function bindWaistGuideModal() {
  const trigger = uiFields.waistGuideTrigger;
  const modal = uiFields.waistGuideModal;
  const closeButton = uiFields.waistGuideClose;

  if (!trigger || !modal || !closeButton) return;

  const openModal = () => {
    modal.classList.remove('hidden');
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
  };

  const closeModal = () => {
    modal.classList.remove('visible');
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  };

  trigger.addEventListener('click', openModal);
  closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || modal.classList.contains('hidden')) return;
    closeModal();
  });
}

let deferredInstallPrompt = null;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // no-op: la app sigue funcionando sin service worker
    });
  });
}

function bindInstallPrompt() {
  const installButton = uiFields.installAppButton;
  if (!installButton) return;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.classList.remove('hidden');
    installButton.setAttribute('aria-hidden', 'false');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installButton.classList.add('hidden');
    installButton.setAttribute('aria-hidden', 'true');
  });

  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.classList.add('hidden');
    installButton.setAttribute('aria-hidden', 'true');
  });
}
migrateLegacyStorageIfNeeded();

const dayState = loadDayState();
let state = {
  ...dayState,
  foodLibrary: loadFoodLibrary(),
  progressLog: loadProgressLog(),
};

if (printMenuSection) {
  printMenuSection.classList.add('hidden');
  printMenuSection.setAttribute('aria-hidden', 'true');
  printMenuSection.innerHTML = '';
}

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
bindWaistGuideModal();
bindInstallPrompt();
registerServiceWorker();
bindLibraryEvents();
bindProgressEvents();
initCollapsibleSection(
  'toggleSavedFoodsButton',
  'savedFoodsPanel',
  'Mostrar alimentos guardados',
  'Ocultar alimentos guardados'
);
initCollapsibleSection(
  'toggleHistoryButton',
  'historyPanel',
  'Mostrar historial',
  'Ocultar historial'
);
initCollapsibleSection(
  'toggleChartsButton',
  'chartsPanel',
  'Mostrar gráficos',
  'Ocultar gráficos'
);
initCollapsibleSection(
  'toggleMovementCaptureButton',
  'movementCapturePanel',
  'Mostrar captura de movimiento',
  'Ocultar captura de movimiento'
);
initCollapsibleSection(
  'toggleSleepCaptureButton',
  'sleepCapturePanel',
  'Mostrar captura de sueño',
  'Ocultar captura de sueño'
);
initCollapsibleSection(
  'toggleDailySummaryButton',
  'dailySummaryPanel',
  'Mostrar resumen diario',
  'Ocultar resumen diario',
  (isOpen) => {
    const dailyMenuActions = document.getElementById('dailyMenuActions');
    if (!dailyMenuActions) return;
    dailyMenuActions.classList.toggle('hidden', !isOpen);
  }
);
updateLibraryCaloriesPreview();
render();
