# Fase 4 - API nueva

## Objetivo

Construir los endpoints de `docs/BACKEND.md` §7 sobre el esquema nuevo, con la lógica de dominio en `services/` y tests que la respalden (`docs/BACKEND.md` §12, Fase 4).

## Precondiciones

- Fase 3 cerrada y saldos verificados.
- Base de pruebas separada, con su propia `DATABASE_URL`, que se puede borrar y recrear sin miedo.

---

## Pasos

### 1. Infraestructura de servicios y presentación

Antes de cualquier endpoint:

- `src/lib/serialize.js` — conversión de `Prisma.Decimal` a número en el borde. Regla dura: **ningún objeto de Prisma llega a `res.json()` sin pasar por aquí** (`docs/BACKEND.md` §9). Un `Decimal` serializado directamente sale como objeto y rompe el cliente en silencio.
- `src/lib/cursor.js` — codificación base64 de `${date}|${id}` y su decodificación, con manejo de cursor corrupto.
- `src/services/balances.service.js` — saldo de una cuenta y saldos de todas las del usuario, con las dos agregaciones de `docs/BACKEND.md` §3.3. Todo lo demás las reutiliza; no se escribe una segunda forma de calcular un saldo.

### 2. `services/operations.service.js`

El corazón. Se construye y se prueba **antes** de exponer ningún endpoint, porque es donde vive el invariante.

- Composición de los dos asientos según `kind` (`docs/BACKEND.md` §6.1).
- Verificación de la ecuación de control **antes de escribir** (§6.2): la suma de las contribuciones firmadas, con las cuentas `source` invertidas, debe dar cero.
- Las siete validaciones de escritura de §6.3.
- Creación, edición y borrado dentro de `prisma.$transaction()` (§6.4). Editar reemplaza los dos asientos; nunca puede quedar media operación viva.

Resolución de `sourceAccountId`: si el usuario tiene exactamente una cuenta `source`, el campo es opcional y el servidor la resuelve. Con varias, es obligatorio.

### 3. Endpoints, en este orden

Cada uno se cierra con sus tests antes de pasar al siguiente.

**a. `accounts` y `summary`** (`docs/BACKEND.md` §7.2, §7.3)

`GET /accounts` incluye el saldo como **número**, no como el string que devolvía `/cuentas` en la Fase 1: aquí se retira esa deuda. `GET /summary` resuelve el dashboard en una llamada, con `byType`, `accounts` y `discrepancy`. `DELETE /accounts/:id` devuelve `409` si el saldo no es cero, salvo `?force=true`: es lo que hoy produce un descuadre permanente en silencio.

**b. `operations`** (`docs/BACKEND.md` §7.4)

CRUD sobre el servicio del paso 2, más `GET /operations/stats`. Envelope `{ data, meta }` y paginación por cursor. Las reglas de agregación de `docs/LOGICA_NEGOCIO.md` §11 no son opcionales:

- Sumar **solo los asientos de cuentas que no son `source`**, o toda cifra sale al doble.
- Excluir `transfer`: no es consumo.
- Los `adjustment` en línea propia, con signo, fuera de `byCategory`.
- Lo no categorizado se agrupa con `categoryId: null`, que es distinto de los ajustes.

`POST /operations` acepta `Idempotency-Key` (`docs/BACKEND.md` §13): en red móvil un `POST` puede expirar por timeout habiéndose aplicado, y sin esto el usuario duplica la operación al reintentar.

**c. `categories`** (§7.5) — CRUD con filtro `?kind=`. Borrado suave: las operaciones que la usaban la conservan y siguen apareciendo en reportes históricos. La unicidad de `(userId, kind, name)` entre las no borradas se valida en el servicio, porque MySQL no soporta índices únicos parciales.

**d. Conciliación** — `POST /accounts/:id/reconcile` (§7.2). `difference = realBalance − calculatedBalance`; si es cero no se crea operación y solo se actualiza `lastReconciledAt`. `400` si la cuenta es `source`: no hay realidad externa contra la cual compararla. La `description` la genera el servidor. Todo en una transacción.

**e. `recurring-rules`** (§7.6) — CRUD. El job que las ejecuta es de la Fase 5.

### 4. Auth con access y refresh tokens

`docs/BACKEND.md` §7.1. Access token de 15 minutos; refresh token opaco, rotativo, guardado **hasheado**, con 90 días de vida. Cada `refresh` revoca el anterior. Si llega un refresh token ya revocado se revocan todos los del usuario: es la señal de que uno fue robado.

`GET /auth/me` reemplaza `GET /validate` y `GET /profile`. `PUT /auth/password` revoca todos los refresh tokens del usuario, que es justo lo que hoy no se puede hacer con los tokens de 30 y 365 días.

### 5. Tests con Vitest y Supertest

Sobre `app.js`, que la Fase 0 dejó exportable sin `listen`. Base de pruebas propia, migrada con `prisma migrate deploy` y truncada entre tests.

Prioridad, en este orden:

1. **El invariante de §6.2** — las cuatro formas de operación suman cero; un intento de romper la ecuación devuelve `400`.
2. **Aislamiento entre usuarios** — un usuario no ve ni toca cuentas, operaciones ni categorías de otro. Un test por endpoint, sin excepciones: un endpoint que no filtra por usuario es un bug de seguridad, no un detalle.
3. **Cálculo de saldos** — incluyendo saldo negativo, que es legal (`docs/LOGICA_NEGOCIO.md` §9.7), y operaciones `pending`, que no cuentan.
4. **Atomicidad** — editar una operación deja exactamente dos asientos; un fallo a mitad no deja ninguno.
5. **Paginación por cursor** — insertar una operación durante el recorrido no duplica ni salta filas.
6. **Validaciones de §6.3** — las siete, una por test.
7. **Agregación de `stats`** — que no cuente los asientos de `source` por duplicado y que excluya transferencias.

### 6. Retirada de las rutas viejas

`/cuentas` y `/movimientos` se quitan cuando la app móvil las reemplace, no antes. Hasta entonces conviven.

---

## Aceptación

1. Toda la funcionalidad de `docs/LOGICA_NEGOCIO.md` es alcanzable desde la API nueva.
2. Los tests están en verde, con el invariante y el aislamiento entre usuarios cubiertos.
3. Crear una operación que rompa la ecuación de control devuelve `400`.
4. El recorrido completo de `docs/LOGICA_NEGOCIO.md` §6, ejecutado como test de integración, deja `discrepancy = 0` en los siete pasos.
5. Conciliar una cuenta con diferencia genera un `adjustment` con `origin = 'reconciliation'` y actualiza `lastReconciledAt`; con diferencia cero no crea operación.
6. `GET /operations/stats` de un mes con un gasto de 200.000 reporta 200.000, no 400.000.
7. Repetir un `POST /operations` con el mismo `Idempotency-Key` devuelve la operación ya creada, no una segunda.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| Los reportes cuentan los asientos por duplicado | Es el error más probable de toda la fase. Test explícito con cifras conocidas |
| Un endpoint se olvida de filtrar por usuario | Un test de aislamiento por endpoint, obligatorio |
| Un `Decimal` llega crudo a `res.json()` | Serialización centralizada y test que comprueba el tipo en la respuesta |
| La rotación de refresh tokens deja al usuario fuera | Probar el ciclo completo antes de retirar los tokens actuales |
| La transacción de edición deja asientos huérfanos | Test de atomicidad con fallo forzado |

Reversión: los endpoints nuevos conviven con los viejos, así que una fase incompleta no rompe nada mientras no se retiren las rutas antiguas.

---

## Fuera de alcance

- Job de recurrentes y push. Fase 5.
- `POST /devices` y `GET /sync`. Fase 5.
- `compression` y `ETag`. Fase 5.
- El cliente móvil.

---

## Desviaciones

Ninguna prevista. Si aparece, se anota aquí.
