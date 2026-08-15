# Fase 5 - Recurrentes y reportes

## Objetivo

Gestión de reglas recurrentes y la pantalla de reportes, ambas de solo lectura sobre cálculos que ya hace el servidor.

## Precondiciones

Fase 4 cerrada: hay operaciones e historial suficiente para que los reportes muestren algo real.

## Endpoints

`docs/APP_MOVIL.md` §4.7 y §4.8. `GET/POST/PUT/DELETE /recurring-rules`; `GET /operations/stats`.

---

## Pasos

### 1. `src/api/recurringRules.ts` y pantalla en Ajustes

Formulario con `name`, `kind` (`income`/`expense`/`transfer`), `amount`, `frequency` (`weekly`/`biweekly`/`monthly`/`yearly`), `dayOfMonth` **o** `dayOfWeek` según la frecuencia (mutuamente excluyentes en la UI, no solo en la validación), `startDate`, `endDate` opcional (fechas `YYYY-MM-DD`, sin hora), `mode` (`auto`/`reminder`) y las cuentas según el tipo, igual que en el formulario de operación de la Fase 3 (reutilizar los mismos selectores de cuenta).

`nextRunAt` lo calcula el servidor y la app **solo lo muestra**; no se deriva localmente de `frequency`/`dayOfMonth`.

### 2. Reportes

`app/(tabs)/reports.tsx`. `GET /operations/stats?from=&to=` con selector de rango. Mostrar `income`, `expense`, `adjustments`, `net`, `byCategory` y `byMonth` tal cual llegan.

Dos líneas que no se pueden fusionar con otras (`docs/APP_MOVIL.md` §4.8):

- `byCategory` con `categoryId: null` → **"Sin categoría"**.
- `adjustments` → **"Sin identificado"**, en su propia línea, no mezclado con gastos.

### 3. Prohibición explícita

La app no recalcula nada de esto sumando `GET /operations`: el servidor ya excluye duplicados por asiento, excluye transferencias y separa ajustes. Revisar al cerrar la fase que ningún archivo de `reports` importa el módulo de `operations` para sumar montos.

---

## Aceptación

1. Crear una regla `monthly` con `dayOfMonth` y una `weekly` con `dayOfWeek`; el formulario no deja mezclar ambos campos.
2. Editar una regla no reescribe operaciones ya generadas antes del cambio (verificar que su fecha/monto no cambian tras editar la regla).
3. `nextRunAt` mostrado coincide exactamente con el que devuelve el backend, sin recalcularlo.
4. `grep -rn "operations" src/app/reports` (o la carpeta que corresponda) no encuentra ninguna suma manual sobre la lista de operaciones.
5. "Sin categoría" y "Sin identificado" aparecen como líneas separadas y con esos textos.

---

## Fuera de alcance

- Notificaciones push cuando una regla `auto` se ejecuta. Fase 6.
- Confirmar las operaciones `pending` que genera una regla `reminder`: eso ya se cubrió en Movimientos (Fase 4); aquí solo se gestiona la regla en sí.

---

## Desviaciones

**"Sin identificar", no "Sin identificado".** El paso 2 de este plan escribía "Sin identificado", pero `docs/APP_MOVIL.md` §4.8 dice **"Sin identificar"** y ese documento manda. La app usa el texto del documento de origen.

**"Sin categoría" lo nombra el servidor, no la app.** `operationStats` ya devuelve `name: "Sin categoría"` cuando `categoryId` es nulo (`server/src/services/operations.service.js`), así que la fila se pinta con el `name` que llega. La app no rotula ese caso por su cuenta.

**`GET /operations/stats` vive en `src/api/stats.ts`, aparte de `src/api/operations.ts`.** El paso 3 prohíbe que Reportes recalcule sumando la lista de operaciones. Separar los módulos convierte esa prohibición en algo comprobable con un grep sobre los imports de la pantalla, en vez de depender de una revisión a ojo.

**Sin `GET /recurring-rules/:id` en el contrato.** El detalle pide la lista y busca por id. La alternativa era pasar los datos por parámetros de navegación, como hace Categorías, pero una regla tiene catorce campos frente a los cuatro de una categoría.

**`dayOfWeek` sigue la convención ISO**: 1 es lunes y 7 es domingo, porque el servidor compara contra `fecha.weekday` de Luxon (`server/src/services/recurring.service.js`). Los chips de la UI están en ese orden.

**Fechas sin hora recortando el ISO, no con `new Date()`.** `src/lib/plainDate.ts` corta la cadena (`iso.slice(0, 10)`). El servidor guarda `startDate`, `endDate` y `nextRunAt` en columnas `DATE` y las devuelve como medianoche UTC; construir un `Date` con eso y leerlo en `America/Bogota` (UTC-5) devuelve el día anterior. Con `nextRunAt: 2026-08-17` la app habría mostrado 16/8.

**Sin selector de fecha nativo**, igual que en las Fases 2 a 4: las fechas de la regla se escriben como `AAAA-MM-DD` y debajo se muestra la fecha ya legible para confirmar lo escrito.

---

## Observaciones

**Un texto corto no se pinta completo en la fila de mes de Reportes.** `byMonth` para julio muestra "jul" (o "julio") sin el año, mientras la fila de agosto muestra "ago 2026" bien. No es la lógica de la app: `uiautomator` reporta el texto completo ("jul 2026") y el `TextView` mide el ancho correcto (162px, coherente con "jul" más " 2026"), pero solo se pintan los primeros ~44px.

Descartado por prueba directa en el dispositivo: competencia de ancho en el layout (`flexShrink`/`flex` no cambian los bounds), la fuente y su peso (falla igual con `body` y con `bodyStrong`), la posición (invirtiendo el orden, la fila de julio sigue fallando en segunda posición y la de agosto se ve bien en primera), la longitud del nombre ("julio" falla igual que "jul"), el número de líneas de la columna de cifras (falla con dos y con tres) y un caché de repintado (persiste tras arranque en frío). Lo único que lo corrige es cambiar el principio de la cadena: con un prefijo cualquiera ("XXjul 2026") se pinta entera.

Apunta a un fallo de renderizado de texto de la plataforma, no del código de la pantalla. **Recomendación: no tocarlo por ahora.** Es cosmético (falta el año en una fila cuyo mes ya se lee), no afecta ninguna cifra, y las soluciones disponibles son todas peores que el síntoma: forzar un ancho fijo o meter un carácter invisible al inicio para engañar al motor de texto. Conviene volver a mirarlo cuando se pase a la development build de la Fase 7, que no usa el runtime de Expo Go y puede no reproducirlo.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real, con el usuario `prueba.fase4@lumo.test` de la Fase 4. Como la Fase 4 dejó la base sin operaciones, se sembraron por API un ingreso con categoría, un gasto con categoría, un gasto **sin** categoría y una conciliación (que genera el ajuste), para que las dos líneas especiales de Reportes tuvieran cifras reales que mostrar.

- **Reportes** muestra Ingresos $3.000.000, Gastos $570.000, "Sin identificar" −$30.000 y Neto $2.400.000, cuadrando con la respuesta cruda de `GET /operations/stats`. Los tres rangos ("Este mes", "Mes pasado", "Este año") cambian la consulta.
- **Aceptación 5**: "Sin categoría" ($120.000, del gasto sin clasificar) y "Sin identificar" (−$30.000, del ajuste) aparecen como líneas separadas y con esos textos exactos, la primera en el desglose por categoría y la segunda en la tarjeta de totales.
- **Aceptación 4**: `app/(tabs)/reports.tsx` importa `@/api/stats` y no `@/api/operations`; la única coincidencia del grep es el comentario que explica la regla.
- **Aceptación 1**: creadas una regla `weekly` ("Mercado", $95.000, lunes) y una `monthly` ("Arriendo", $1.200.000, día 5). Al cambiar la frecuencia, el campo que no corresponde desaparece de la UI, y el backend recibió `dayOfWeek: 1` con `dayOfMonth: null` en la semanal y lo inverso en la mensual.
- **Aceptación 3**: el backend devuelve `nextRunAt: "2026-08-17T00:00:00.000Z"` y la app muestra "17/8/2026", tanto en la lista como en el detalle.
- **Aceptación 2**: con una ocurrencia ya generada (operación 1678, $80.000 del 17/8, `origin: "recurring"`, confirmada por ser modo `auto`), se editó el monto de la regla a $95.000 desde la app. La regla quedó en $95.000 y la operación 1678 conservó su monto y su fecha. Para generarla sin esperar al cron ni tocar la base a mano se llamó a `runDueRules({ reference })` con una fecha futura, que es un parámetro que el propio servicio expone.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

**Corregidos durante la fase**, ambos encontrados en el dispositivo y ninguno detectable por `tsc` ni por el linter:

- Arrays de estilos pasados al `Pressable` hijo de un `Link asChild`. `Link` con `asChild` renderiza un `Slot`, que los rechaza: la pantalla de Recurrentes abría con un Render Error en vez de la lista. Se aplanan con `StyleSheet.flatten`, como ya hacía Ajustes.
- El `ScrollView` del formulario de regla no tenía `flex: 1`, así que en el detalle el botón "Borrar regla" quedaba encima del formulario en vez de debajo.

**No verificado en vivo**: borrar una regla (el diálogo de confirmación es el mismo patrón ya probado al borrar una operación en la Fase 4, y no se quiso perder la regla de prueba); una regla de tipo `transfer` o en modo `reminder`; y que una regla `reminder` deje la operación en `pending` para confirmarla desde Movimientos, que es lo que cerraría el hueco que la Fase 4 dejó abierto por no existir pendientes todavía. El job sí se ejecutó de verdad contra la base, pero con una fecha de referencia forzada, no por el cron de las 6:00.
