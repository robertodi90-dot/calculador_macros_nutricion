export type LabelMode = 'per100g' | 'perServing'

export type NutritionBase = {
  calories: string
  protein: string
  carbs: string
  fat: string
}

export type FormState = {
  foodName: string
  labelMode: LabelMode
  nutritionBase: NutritionBase
  servingGrams: string
  consumedGrams: string
}

export type ValidationErrors = Partial<Record<string, string>>

export type MacroResults = {
  calories: number
  protein: number
  carbs: number
  fat: number
}
