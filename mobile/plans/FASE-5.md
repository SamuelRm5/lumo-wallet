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

_(se completa durante la ejecución de la fase)_
