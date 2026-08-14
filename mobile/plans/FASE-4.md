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

_(se completa durante la ejecución de la fase)_
