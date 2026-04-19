import type { ValidationErrors } from '../types'

type Props = {
  errors: ValidationErrors
}

export default function ValidationAlerts({ errors }: Props) {
  const messages = Object.values(errors)

  if (messages.length === 0) {
    return (
      <section className="card success-card">
        <h2>Validaciones</h2>
        <p>Todos los campos están correctos para calcular.</p>
      </section>
    )
  }

  return (
    <section className="card error-card">
      <h2>Validaciones</h2>
      <ul>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  )
}
