import type { FormState, ValidationErrors } from '../types'

type Props = {
  form: FormState
  errors: ValidationErrors
  onChange: (field: keyof FormState, value: string) => void
  onNutritionChange: (field: keyof FormState['nutritionBase'], value: string) => void
}

export default function FoodInputForm({ form, errors, onChange, onNutritionChange }: Props) {
  return (
    <section className="card">
      <h2>Alimento</h2>
      <label>
        Nombre del alimento
        <input
          type="text"
          value={form.foodName}
          onChange={(event) => onChange('foodName', event.target.value)}
          placeholder="Ej: Arroz crudo"
        />
      </label>
      {errors.foodName && <p className="field-error">{errors.foodName}</p>}

      <label>
        Tipo de etiqueta nutricional
        <select
          value={form.labelMode}
          onChange={(event) => onChange('labelMode', event.target.value)}
        >
          <option value="per100g">Por 100 g</option>
          <option value="perServing">Por porción</option>
        </select>
      </label>

      <h3>Datos nutricionales del envase</h3>

      <div className="grid-inputs">
        <label>
          Calorías (kcal)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.nutritionBase.calories}
            onChange={(event) => onNutritionChange('calories', event.target.value)}
          />
        </label>

        <label>
          Proteínas (g)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.nutritionBase.protein}
            onChange={(event) => onNutritionChange('protein', event.target.value)}
          />
        </label>

        <label>
          Carbohidratos (g)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.nutritionBase.carbs}
            onChange={(event) => onNutritionChange('carbs', event.target.value)}
          />
        </label>

        <label>
          Grasas (g)
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.nutritionBase.fat}
            onChange={(event) => onNutritionChange('fat', event.target.value)}
          />
        </label>
      </div>

      {errors.calories && <p className="field-error">{errors.calories}</p>}
      {errors.protein && <p className="field-error">{errors.protein}</p>}
      {errors.carbs && <p className="field-error">{errors.carbs}</p>}
      {errors.fat && <p className="field-error">{errors.fat}</p>}

      {form.labelMode === 'perServing' && (
        <>
          <label>
            Gramos por porción (g)
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.servingGrams}
              onChange={(event) => onChange('servingGrams', event.target.value)}
            />
          </label>
          {errors.servingGrams && <p className="field-error">{errors.servingGrams}</p>}
        </>
      )}
    </section>
  )
}
