import type { FormState, MacroResults } from '../types'

const toNumber = (value: string): number => Number.parseFloat(value || '0')

export const calculateMacros = (form: FormState): MacroResults => {
  const calories = toNumber(form.nutritionBase.calories)
  const protein = toNumber(form.nutritionBase.protein)
  const carbs = toNumber(form.nutritionBase.carbs)
  const fat = toNumber(form.nutritionBase.fat)
  const consumedGrams = toNumber(form.consumedGrams)

  const factor =
    form.labelMode === 'per100g'
      ? consumedGrams / 100
      : consumedGrams / toNumber(form.servingGrams)

  return {
    calories: Math.round(calories * factor),
    protein: Number((protein * factor).toFixed(1)),
    carbs: Number((carbs * factor).toFixed(1)),
    fat: Number((fat * factor).toFixed(1)),
  }
}
