import type { FormState, ValidationErrors } from '../types'

const isInvalidNonNegative = (value: string): boolean => {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) || parsed < 0
}

export const validateForm = (form: FormState): ValidationErrors => {
  const errors: ValidationErrors = {}

  if (!form.foodName.trim()) errors.foodName = 'El nombre del alimento es obligatorio.'

  if (isInvalidNonNegative(form.nutritionBase.calories)) {
    errors.calories = 'Ingresa calorías válidas (>= 0).'
  }

  if (isInvalidNonNegative(form.nutritionBase.protein)) {
    errors.protein = 'Ingresa proteínas válidas (>= 0).'
  }

  if (isInvalidNonNegative(form.nutritionBase.carbs)) {
    errors.carbs = 'Ingresa carbohidratos válidos (>= 0).'
  }

  if (isInvalidNonNegative(form.nutritionBase.fat)) {
    errors.fat = 'Ingresa grasas válidas (>= 0).'
  }

  const consumed = Number.parseFloat(form.consumedGrams)
  if (Number.isNaN(consumed) || consumed <= 0) {
    errors.consumedGrams = 'Los gramos a consumir deben ser mayores a 0.'
  }

  if (form.labelMode === 'perServing') {
    const serving = Number.parseFloat(form.servingGrams)
    if (Number.isNaN(serving) || serving <= 0) {
      errors.servingGrams = 'Los gramos por porción deben ser mayores a 0.'
    }
  }

  return errors
}
