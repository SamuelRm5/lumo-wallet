# Fase 4 - Movimientos

## Objetivo

Listado paginado por cursor con filtros, detalle, edición, borrado suave y confirmación de operaciones pendientes.

## Precondiciones

Fase 3 cerrada: existen operaciones reales que listar y el formulario de registro es reutilizable para editar.

## Endpoints

`docs/APP_MOVIL.md` §4.5. `GET /operations` (cursor, filtros), `GET/PUT/DELETE /operations/:id`, `POST /operations/:id/confirm`.

---

## Pasos

### 1. Lista infinita por cursor

`app/(tabs)/movements.tsx`. `GET /operations` con `{ data, meta: { nextCursor, hasMore } }`. Paginación por cursor, no por offset: se pasa `?cursor=` tal cual llegó, sin reconstruirlo. Al hacer scroll se pide la siguiente página cuando `hasMore` es verdadero.

### 2. Filtros

`accountId`, `kind`, `categoryId`, `status`, `from`, `to`, `search`, `limit` (1-100, default 20). UI de filtros como sheet o pantalla secundaria; los rangos de fecha aceptan `YYYY-MM-DD` y se resuelven en `America/Bogota` en el servidor, no en el cliente.

### 3. Operaciones legacy

`origin: "legacy"` trae **un solo asiento** en `entries`. La pantalla de detalle y la fila de lista no pueden asumir `entries.length === 2`; deben renderizar correctamente con uno solo.

### 4. Edición

`PUT /operations/:id` reabre el formulario de la Fase 3 precargado con los datos actuales. Cambiar cuenta, monto, tipo o fecha es válido; el backend reemplaza los dos asientos en una transacción.

### 5. Borrado suave

`DELETE /operations/:id`. La operación desaparece de listados y saldos pero el registro se conserva; no requiere confirmación especial como el borrado de cuentas (no hay 409 documentado aquí).

### 6. Confirmación de pendientes

`status: "pending"` son operaciones generadas por una regla recurrente en modo `reminder`. No afectan saldos hasta confirmarlas. `POST /operations/:id/confirm` con `{ "amount": ... }` si el usuario ajusta el monto, o sin cuerpo si el precargado es correcto.

---

## Aceptación

1. Insertar una operación nueva (desde otra sesión o directamente por API) mientras se hace scroll en la lista no duplica ni salta filas: el cursor sigue siendo válido.
2. Una operación con `origin: "legacy"` y un solo `entry` se muestra en detalle sin crashear.
3. Editar una operación cambia sus dos asientos y el nuevo balance se refleja en Inicio.
4. Borrar una operación la retira de la lista y de `GET /summary`, pero sigue existiendo en el backend (soft delete, verificable si hay acceso a la base de prueba).
5. Confirmar una operación pendiente sin cuerpo usa el monto precargado; con `{ "amount": ... }` usa el nuevo.

---

## Fuera de alcance

- Reglas recurrentes en sí (crear/editar la regla). Fase 5.
- Reportes. Fase 5.

---

## Desviaciones

**Segmento de ruta `movement` (singular), no `movements/[id]`.** El tab de la lista ya ocupa `/movements`; un archivo dinámico no puede convivir bajo el mismo segmento que un tab en expo-router. El detalle vive en su propio grupo, `app/movement/[id].tsx`. Como esa carpeta no tiene `index.tsx` hermano, expo-router no genera el atajo de plantilla `/movement/${id}` en las rutas tipadas (a diferencia de `app/accounts/`, que sí lo tiene): hay que navegar con la forma de objeto, `{ pathname: "/movement/[id]", params: { id } }`, no con un template string.

**`getOperation(id)` se agregó a `src/api/operations.ts`.** No estaba tras la Fase 3; es la pieza mínima que faltaba para alimentar el detalle y el precargado de edición.

**Edición hereda la limitación de fecha de la Fase 3.** Sigue sin selector de fecha completo: los chips son "Hoy"/"Ayer". Al editar una operación con otra fecha, aparece un tercer chip mostrando la fecha real (para no ocultarla), pero no es interactivo — no se puede mover esa fecha a una tercera que no sea hoy o ayer desde la app todavía.

**Dos disable de ESLint puntuales**, ambos con comentario de justificación en la línea: `react-hooks/static-components` en `CategoryIcon` (`movements.tsx`) y el reemplazo de `Date.now()` por mutación explícita de `Date` en `register-operation.tsx`. El linter de React Compiler (experimental) marca estos patrones de forma inconsistente — el mismo patrón de ícono no se marca dentro de un IIFE en `movement/[id].tsx` — y no hay una reestructuración razonable que lo evite sin perder legibilidad.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real, en dos sesiones: la primera con las operaciones de prueba de la Fase 3 ("Salario" fuente, "Bancolombia" depósito, usuario `prueba.fase1@lumo.test`), la segunda con un usuario descartable nuevo (`prueba.fase4@lumo.test`, mismo mecanismo de la Fase 1: `ALLOW_PUBLIC_REGISTRATION` abierto un momento y cerrado otra vez) y cuentas propias, para poder ejercitar borrado sin perder los datos de las fases anteriores.

- Movimientos lista las operaciones existentes con ícono de categoría, descripción o tipo como título, fecha, badges de "pendiente"/"histórico" cuando aplican, y monto con signo y color correctos.
- Filtro por tipo verificado tocando "Ingresos" con una sola operación de tipo `Gasto` cargada: la lista pasó a "No hay movimientos con estos filtros"; al volver a "Todas" reapareció. Los chips de estado se ven renderizados pero no se tocaron (no había pendientes que filtrar).
- El detalle de una operación (`Gasto`) muestra tipo, monto, fecha, categoría y los dos asientos con signo correcto.
- Edición de punta a punta verificada dos veces con datos reales: la primera cambiando el monto de $25.000 a $30.000 (operación 1672, Fase 3), la segunda de $45.000 a $60.000 (usuario nuevo); ambas dispararon `PUT /operations/:id` (confirmado en el log del backend) y el detalle mostró el monto y los dos asientos actualizados al volver.
- Borrado suave verificado de punta a punta: "Borrar movimiento" abre el `Alert.alert` de confirmación ("La operación desaparece de listados y saldos, pero el registro se conserva"), aceptar disparó `DELETE /operations/:id` (confirmado en el log del backend), la operación desapareció de Movimientos y los saldos de Inicio volvieron a $0 en las dos cuentas, con "Sin descuadre".
- El separador de miles del campo de monto (`formatAmountInput`/`stripAmountInput`, `src/lib/currency.ts`) se probó escribiendo `1234567` en el formulario de registro: se vio `1.234.567` actualizándose en vivo tecla a tecla, y borrar con retroceso recalculó el agrupado en cada paso sin quedar en un estado inconsistente. También se vio ya formateado (`45.000`) al precargar el formulario de edición.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

**No verificado en vivo**: paginación por cursor y `hasMore` (nunca hubo más de una operación de prueba a la vez, no alcanza para forzar una segunda página); confirmación de operaciones pendientes (no existe ninguna `status: "pending"` porque las reglas recurrentes que las generan no existen hasta la Fase 5); render de una operación `origin: "legacy"` con un solo asiento (no hay ninguna en los datos de prueba actuales); filtro por estado (Confirmadas/Pendientes) tocado en el dispositivo; y edición de un `transfer` o `adjustment` (solo se probó `expense`, pero comparten el mismo `buildPayload`/prefill ya usado en Fase 3). Ninguno tiene código nuevo sin ejercitar por otra vía: la lógica de `origin: "legacy"` (`entries.length >= 2`) y de confirmación (`ConfirmSection`) se revisaron por lectura pero no se dispararon contra el backend real; el filtro por estado usa el mismo mecanismo ya probado del filtro por tipo.
