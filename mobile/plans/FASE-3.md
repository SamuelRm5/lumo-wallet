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

_(se completa durante la ejecución de la fase)_
