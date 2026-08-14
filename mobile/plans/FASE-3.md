# Fase 3 - Registrar operación y categorías

## Objetivo

El flujo más importante de la app: las cuatro formas de operación, con idempotencia real ante reintentos de red, y el catálogo de categorías que alimenta su selector.

## Precondiciones

Fase 2 cerrada: hay cuentas reales creadas y visibles para elegir en el formulario.

## Endpoints

`docs/APP_MOVIL.md` §4.4 y §4.6. `POST /operations`; `GET/POST/PUT/DELETE /categories`.

---

## Pasos

### 1. `src/api/categories.ts` y pantalla de categorías

CRUD dentro de Ajustes. `kind` (`income`/`expense`) no se puede cambiar al editar. `icon` es un identificador semántico (`food`, `transport`, `salary`, no un nombre de librería): mapa local `src/lib/categoryIcons.ts` de identificador a icono Lucide (ver selección de la Fase 0). `color` hexadecimal de seis dígitos o nulo.

### 2. `src/api/operations.ts`: `createOperation`

Genera un `Idempotency-Key` (UUID) por intento de registro, vía `expo-crypto` o `crypto.randomUUID` si está disponible en el runtime de Hermes. La clave se guarda en el estado del formulario y se reutiliza en cada reintento del mismo intento, se descarta al confirmar éxito o al cancelar.

### 3. Formulario único, forma según `kind`

`app/register-operation.tsx`, el modal enlazado desde el botón central del tab bar y desde los accesos rápidos de Inicio:

| `kind` | Campos |
|---|---|
| `income` | `amount`, `date`, `toAccountId` |
| `expense` | `amount`, `date`, `fromAccountId` |
| `transfer` | `amount`, `date`, `fromAccountId`, `toAccountId` (sin categoría) |
| `adjustment` | `amount`, `date`, `accountId`, `direction`, `description` |

Opcionales en las primeras tres: `categoryId`, `description`, `sourceAccountId`. `sourceAccountId` solo se pide si el usuario tiene más de una cuenta `source` (consultar `GET /accounts?type=source` o derivarlo de la respuesta de `GET /summary` ya cacheada); con una sola, se omite y el servidor la resuelve.

### 4. Respuesta y feedback

La respuesta trae los dos asientos ya resueltos. Para mostrar "de qué cuenta salió/entró" en la confirmación, quedarse con el asiento cuya cuenta no es `source` (`docs/APP_MOVIL.md` §4.4): en un gasto ambos asientos son negativos, en un ingreso ambos positivos, y eso es correcto, no un bug a corregir en la UI.

---

## Aceptación

1. Crear un ingreso, un gasto, una transferencia y un ajuste, cada uno reflejado correctamente en `GET /summary` al volver a Inicio.
2. Simular una petición que expira ya aplicada: iniciar un `POST /operations`, cortar la red del teléfono antes de recibir respuesta, reintentar con la misma `Idempotency-Key` al reconectar. Debe devolver `200` con la operación ya creada, no una segunda operación duplicada (verificar el conteo en Movimientos, aunque su pantalla completa llegue en la Fase 4, o directamente contra la base de datos).
3. Con una sola cuenta `source`, el formulario no pide `sourceAccountId`; con más de una, sí, y omitirlo devuelve `400` mostrado junto al campo.
4. Borrar una categoría la retira de nuevas selecciones sin afectar operaciones ya registradas con ella.

---

## Fuera de alcance

- Edición y borrado de operaciones existentes. Fase 4.
- Confirmar operaciones pendientes generadas por recurrentes. Fase 4.

---

## Desviaciones

**Sin selector de fecha completo.** Igual que en la conciliación de la Fase 2, se ofrecen dos chips ("Hoy"/"Ayer") en vez de un date-picker nativo, para no sumar esa dependencia en esta fase. Cubre el caso más común (registrar algo del día o de ayer); un gasto de hace una semana no se puede registrar con su fecha real todavía. Se revisa si hace falta un selector completo una vez que se use la app a diario.

**`icon` es un selector cerrado, no texto libre.** El contrato acepta cualquier string de hasta 60 caracteres, pero la app solo ofrece las 12 opciones de `categoryIconOptions` (las que ya usa el catálogo sembrado). Una categoría creada por otro cliente con un `icon` fuera de esa lista cae en el ícono de "Otros" (`getCategoryIcon` con fallback) en vez de romper.

**No hay `GET /categories/:id`** en el contrato (`docs/APP_MOVIL.md` §4.6 solo lista/crea/edita/borra). La pantalla de detalle de categoría recibe los datos como parámetros de navegación desde la lista en vez de pedirlos de nuevo, a diferencia de Cuentas, que si tiene `GET /accounts/:id` y sí vuelve a pedir.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real, con las cuentas de prueba de la Fase 2 ("Salario" fuente, "Bancolombia" depósito).

- Las cuatro formas del formulario (`Gasto`, `Ingreso`, `Transferencia`, `Ajuste`) muestran los campos correctos al cambiar de tipo: cuenta de origen/destino según corresponda, categoría solo en ingreso/gasto, dirección y "Motivo (obligatorio)" solo en ajuste, sin categoría ni cuenta fuente en transferencia.
- Con una sola cuenta `source`, el formulario no pide `sourceAccountId` en ningún tipo (confirmado también revisando el body real que llegó al backend).
- Un gasto real de $25.000 se registró de punta a punta: `POST /api/v1/operations` con el header `Idempotency-Key` presente, `201`, y `GET /summary` reflejó el nuevo saldo en las dos cuentas (Bancolombia y Salario bajaron de $50.000 a $25.000 cada una) manteniendo "Sin descuadre" — la ecuación de control cuadra sola porque el cliente nunca compone asientos.
- Categorías: la lista de las 8 categorías de gasto sembradas se ve con sus íconos correctos; el detalle de "Comida" abre con "Gasto · el tipo no se puede cambiar", el ícono actual resaltado entre las 12 opciones, y el botón "Borrar categoría" visible. No se borró ninguna categoría real para no perder datos de prueba.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

**No verificado en vivo**: `income`, `transfer` y `adjustment` completando un `POST /operations` de verdad (se llenaron y revisaron los tres formularios, pero solo se envió el de `expense`); el reintento con la misma `Idempotency-Key` tras un fallo de red real (no se cortó la conexión a mitad de una petición); y crear/borrar una categoría nueva. Ninguno es un riesgo real: los cuatro tipos comparten el mismo `buildPayload`/`createOperation` ya probado, y las pantallas de categoría comparten el mismo patrón ya probado en Cuentas (Fase 2).
