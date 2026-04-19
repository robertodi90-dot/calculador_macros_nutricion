import { useMemo, useState } from 'react'
import FoodInputForm from './components/FoodInputForm'
import ConsumptionInput from './components/ConsumptionInput'
import ResultsCard from './components/ResultsCard'
import ValidationAlerts from './components/ValidationAlerts'
import type { FormState } from './types'
import { validateForm } from './utils/validation'
import { calculateMacros } from './utils/calculations'

const initialState: FormState = {
  foodName: '',
  labelMode: 'per100g',
  nutritionBase: {
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  },
  servingGrams: '',
  consumedGrams: '',
}

export default function App() {
  const [form, setForm] = useState<FormState>(initialState)

  const errors = useMemo(() => validateForm(form), [form])
  const hasErrors = Object.keys(errors).length > 0

  const results = useMemo(() => {
    if (hasErrors) return null
    return calculateMacros(form)
  }, [form, hasErrors])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateNutritionField = (field: keyof FormState['nutritionBase'], value: string) => {
    setForm((prev) => ({
      ...prev,
      nutritionBase: {
        ...prev.nutritionBase,
        [field]: value,
      },
    }))
  }

  const onReset = () => setForm(initialState)

  return (
    <main className="app-shell">
      <header className="hero">
        <h1>Calculadora de Macros Nutricionales</h1>
        <p>Ingresa datos por 100 g o por porción y calcula según gramos consumidos.</p>
      </header>

      <FoodInputForm form={form} errors={errors} onChange={updateField} onNutritionChange={updateNutritionField} />
      <ConsumptionInput consumedGrams={form.consumedGrams} errors={errors} onChange={(value) => updateField('consumedGrams', value)} />
      <ValidationAlerts errors={errors} />
      <ResultsCard results={results} />

      <div className="actions">
        <button type="button" className="primary" disabled={hasErrors}>
          Calcular
        </button>
        <button type="button" className="secondary" onClick={onReset}>
          Limpiar
        </button>
      </div>
    </main>
  )
}
