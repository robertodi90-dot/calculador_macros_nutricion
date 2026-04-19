import type { MacroResults } from '../types'

type Props = {
  results: MacroResults | null
}

export default function ResultsCard({ results }: Props) {
  return (
    <section className="card">
      <h2>Resultado</h2>
      {!results ? (
        <p>Completa todos los campos para ver calorías y macronutrientes.</p>
      ) : (
        <div className="results-grid">
          <article className="result-item">
            <span>Kcal</span>
            <strong>{results.calories} kcal</strong>
          </article>
          <article className="result-item">
            <span>Proteínas</span>
            <strong>{results.protein} g</strong>
          </article>
          <article className="result-item">
            <span>Carbohidratos</span>
            <strong>{results.carbs} g</strong>
          </article>
          <article className="result-item">
            <span>Grasas</span>
            <strong>{results.fat} g</strong>
          </article>
        </div>
      )}
    </section>
  )
}
