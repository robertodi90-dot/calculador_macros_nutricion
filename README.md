# Calculadora de Calorías y Macronutrientes (MVP)

## Objetivo
Construir una app web **simple, mobile-first y sin extras** para calcular calorías y macronutrientes a partir de valores ingresados manualmente por el usuario.

### Alcance de esta V1
- Solo cálculo por gramos.
- Sin login.
- Sin base de datos.
- Sin historial.
- Sin porciones.
- Sin funciones adicionales.

---

## 1) Arquitectura simple de frontend (React)

### Estructura de componentes
```txt
App
 ├─ MacroCalculatorScreen
 │   ├─ FoodNameField
 │   ├─ NutritionPer100gForm
 │   ├─ ConsumedGramsField
 │   ├─ ValidationMessage
 │   └─ ResultsCard
```

### Responsabilidad de cada componente
- `App`: contenedor principal.
- `MacroCalculatorScreen`: orquesta estado, validaciones y cálculo en tiempo real.
- `FoodNameField`: input de texto para nombre del alimento.
- `NutritionPer100gForm`: inputs numéricos de calorías, proteínas, carbohidratos y grasas por 100 g.
- `ConsumedGramsField`: input numérico para gramos consumidos.
- `ValidationMessage`: muestra errores cortos y claros por campo.
- `ResultsCard`: muestra kcal, proteínas, carbohidratos y grasas finales.

---

## 2) Estado principal (mínimo y claro)

```ts
interface FormState {
  foodName: string;
  per100g: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
  consumedGrams: string;
}
```

### Estado derivado
- `parsedValues`: números convertidos desde string.
- `errors`: objeto por campo con mensajes de validación.
- `results`: valores calculados para consumo real.

> Recomendación: mantener `inputs` como string para evitar problemas de UX al escribir decimales y convertir a número solo al validar/calcular.

---

## 3) Lógica de cálculo en tiempo real

### Fórmula única
`resultado = (gramosConsumidos / 100) * valorPor100g`

Aplicado a:
- calorías
- proteínas
- carbohidratos
- grasas

### Comportamiento
- Recalcular en cada cambio de input (`onChange`).
- Mostrar resultados apenas los datos sean válidos.
- Si hay error o faltan campos, ocultar resultados o mostrarlos en `0` con aviso.

---

## 4) Validaciones básicas

### Reglas
- `foodName`: obligatorio (no vacío tras trim).
- Campos numéricos (`calories`, `protein`, `carbs`, `fat`, `consumedGrams`):
  - obligatorios,
  - deben ser número válido,
  - deben ser `>= 0`,
  - `consumedGrams` debe ser `> 0`.

### UX de validación
- Mostrar error debajo del campo.
- Marcar visualmente input inválido.
- Usar `inputMode="decimal"`, `type="number"`, `step="0.1"`.
- Etiquetas con unidad visible:
  - kcal para calorías
  - g para macros y gramos consumidos

---

## 5) Interfaz visual (mobile-first)

### Layout
- Una sola columna.
- Contenedor centrado con ancho máximo (ej. `max-width: 420px`).
- Espaciado cómodo (`12-16px`) entre bloques.
- Inputs y botones con altura mínima de 44px.

### Secciones en pantalla
1. **Alimento**
   - Nombre del alimento
2. **Valores por 100 g**
   - Calorías
   - Proteínas
   - Carbohidratos
   - Grasas
3. **Consumo**
   - Gramos consumidos
4. **Resultado**
   - Calorías totales
   - Proteínas totales
   - Carbohidratos totales
   - Grasas totales

### Estilo recomendado
- Fondo neutro claro.
- Tarjetas blancas con borde suave.
- Tipografía simple (system font).
- Contraste alto para legibilidad.
- Sin navegación compleja ni elementos decorativos innecesarios.

---

## 6) Organización de archivos sugerida

```txt
src/
 ├─ App.tsx
 ├─ components/
 │   ├─ MacroCalculatorScreen.tsx
 │   ├─ FoodNameField.tsx
 │   ├─ NutritionPer100gForm.tsx
 │   ├─ ConsumedGramsField.tsx
 │   ├─ ValidationMessage.tsx
 │   └─ ResultsCard.tsx
 ├─ utils/
 │   ├─ calculations.ts
 │   └─ validation.ts
 ├─ types/
 │   └─ nutrition.ts
 └─ styles/
     └─ app.css
```

---

## 7) Criterios de aceptación de esta V1

- El usuario completa todos los campos en móvil sin fricción.
- El cálculo se actualiza en tiempo real al cambiar datos.
- Los resultados usan solo la lógica por 100 g.
- Se muestran exactamente estos resultados:
  - calorías totales
  - proteínas totales
  - carbohidratos totales
  - grasas totales
- No hay funcionalidades fuera del alcance definido.
