import type { ValidationErrors } from '../types'

type Props = {
  consumedGrams: string
  errors: ValidationErrors
  onChange: (value: string) => void
}

export default function ConsumptionInput({ consumedGrams, errors, onChange }: Props) {
  return (
    <section className="card">
      <h2>Consumo</h2>
      <label>
        Gramos a consumir (g)
        <input
          type="number"
          min="0"
          step="0.1"
          value={consumedGrams}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {errors.consumedGrams && <p className="field-error">{errors.consumedGrams}</p>}
    </section>
  )
}
