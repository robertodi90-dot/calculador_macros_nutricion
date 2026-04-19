# Calculadora de Macros Nutricionales (MVP)

## Objetivo de la primera versión
Crear una app web **muy simple**, optimizada para móvil, que permita:
1. ingresar manualmente un alimento,
2. cargar la información nutricional del envase,
3. indicar los gramos que se van a consumir,
4. calcular automáticamente **calorías, proteínas, carbohidratos y grasas** para esa cantidad.

> Alcance MVP: solo macronutrientes. Sin historial, sin base de datos, sin funciones avanzadas.

---

## 1) Estructura de la app (simple y escalable)

### Arquitectura inicial (front-end React)
- `App`
  - `FoodInputForm`
    - datos del alimento y etiqueta nutricional
  - `ConsumptionInput`
    - gramos consumidos
  - `ResultsCard`
    - calorías y macros calculados
  - `ValidationAlerts`
    - errores y ayudas de entrada

### Estado sugerido (único y claro)
- `foodName: string`
- `labelMode: 'per100g' | 'perServing'`
- `nutritionBase`:
  - `calories`
  - `protein`
  - `carbs`
  - `fat`
- `servingGrams` (solo si es por porción)
- `consumedGrams`

### Módulos recomendados
- `utils/conversions.ts`: normalización de datos de etiqueta a base por gramo.
- `utils/calculations.ts`: fórmulas de cálculo final.
- `utils/validation.ts`: validaciones de formulario.

Esto mantiene el MVP simple pero permite crecer sin reescribir todo.

---

## 2) Flujo de uso (UX)
1. Usuario ingresa nombre del alimento (ej: “Arroz crudo”).
2. Usuario elige cómo viene la etiqueta:
   - “Valores por 100 g”, o
   - “Valores por porción”.
3. Usuario carga calorías, proteínas, carbohidratos y grasas según etiqueta.
4. Si eligió por porción, también ingresa “gramos por porción”.
5. Usuario ingresa “gramos que va a consumir”.
6. App muestra resultados calculados en tiempo real.
7. Opción simple: “Limpiar” para volver a empezar.

---

## 3) Campos necesarios

### Campos generales
- **Nombre del alimento** (texto).
- **Tipo de etiqueta nutricional** (selector):
  - `Por 100 g`
  - `Por porción`

### Campos nutricionales (numéricos)
- **Calorías**
- **Proteínas (g)**
- **Carbohidratos (g)**
- **Grasas (g)**

### Campo condicional
- **Gramos por porción** (solo si la etiqueta es por porción)

### Campo de cálculo
- **Gramos a consumir**

---

## 4) Reglas de cálculo

### Caso A: etiqueta por 100 g
Si la etiqueta está expresada por 100 g:

- factor = `gramosConsumidos / 100`
- caloríasFinales = `caloríasEtiqueta * factor`
- proteínasFinales = `proteínasEtiqueta * factor`
- carbohidratosFinales = `carbohidratosEtiqueta * factor`
- grasasFinales = `grasasEtiqueta * factor`

### Caso B: etiqueta por porción
Si la etiqueta está expresada por porción y la porción tiene `gramosPorPorcion`:

- factor = `gramosConsumidos / gramosPorPorcion`
- caloríasFinales = `caloríasPorPorción * factor`
- proteínasFinales = `proteínasPorPorción * factor`
- carbohidratosFinales = `carbohidratosPorPorción * factor`
- grasasFinales = `grasasPorPorción * factor`

### Redondeo recomendado
- Calorías: entero (`Math.round`).
- Macronutrientes: 1 decimal (`toFixed(1)`).

---

## 5) Validaciones mínimas (importantes)

### Validaciones de entrada
- Todos los campos obligatorios deben estar completos.
- Valores numéricos deben ser `>= 0`.
- `gramosConsumidos > 0`.
- Si es por porción: `gramosPorPorcion > 0`.
- Bloquear letras en campos numéricos (usar `input type="number"`, `step="0.1"`).

### Validaciones UX
- Botón de calcular deshabilitado si faltan datos.
- Mensajes cortos y claros debajo del campo con error.
- Mostrar unidades siempre (`kcal`, `g`) para evitar confusión.

---

## 6) Propuesta de interfaz simple (mobile first)

### Layout sugerido
- Una sola columna.
- Tarjetas apiladas verticalmente.
- Inputs grandes (mínimo 44px alto).
- Espaciado amplio para pulgares.

### Secciones visuales
1. **Alimento**
   - Nombre
   - Tipo de etiqueta
2. **Datos nutricionales del envase**
   - Calorías, proteínas, carbohidratos, grasas
   - (si aplica) gramos por porción
3. **Consumo**
   - gramos consumidos
4. **Resultado**
   - 4 tarjetas pequeñas: kcal, proteínas, carbohidratos, grasas

### Acciones
- Botón principal: `Calcular` (opcional si no se calcula en vivo).
- Botón secundario: `Limpiar`.

### Principios de diseño
- Menos es más.
- Etiquetas claras.
- Sin navegación compleja en V1.
- Contraste alto y tipografía legible.

---

## 7) Escalabilidad (siguiente paso, sin complicar V1)

Cuando el MVP esté validado, escalar en dos fases:

### Fase 2: Guardar alimentos frecuentes
- Agregar almacenamiento local (`localStorage`) al inicio.
- Modelo sugerido:
  - `id`
  - `name`
  - `labelMode`
  - `nutritionBase`
  - `servingGrams?`
- Funciones:
  - Guardar alimento
  - Editar / eliminar
  - Seleccionar alimento guardado y reutilizar datos

### Fase 3: Registrar comidas completas
- Entidad `Meal` con lista de ítems:
  - alimento + gramos consumidos + macros calculados
- Sumar totales por comida (desayuno, almuerzo, cena, snack).
- Vista “Hoy”: total diario de kcal/proteínas/carbs/grasas.

### Decisiones técnicas para escalar bien
- Mantener funciones de cálculo puras y testeables.
- Separar UI de lógica desde el inicio.
- Tipar datos (TypeScript recomendado).
- Introducir backend solo cuando realmente haga falta (autenticación/sincronización nube).

---

## 8) Criterios de éxito del MVP
- Un usuario puede calcular macros reales en menos de 30 segundos.
- No hay ambigüedad entre “por 100 g” y “por porción”.
- Errores de entrada se detectan y explican al instante.
- Experiencia cómoda en pantalla móvil.

---

## 9) Próximo entregable sugerido
Implementar una primera pantalla React con:
- formulario único,
- cálculo en tiempo real,
- validaciones mínimas,
- componente de resultados.

Sin persistencia todavía; solo cálculo confiable y UX clara.
