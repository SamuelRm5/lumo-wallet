# Fase 0 - Andamio

## Objetivo

Dejar el proyecto en condiciones de que los cambios siguientes sean seguros, sin tocar el modelo de datos, la ORM ni el contrato de la API (`docs/BACKEND.md` §12, Fase 0).

## Precondiciones

- Backup de producción tomado y restaurado en local (paso 0). Bloqueante.
- El cliente web funciona contra el servidor actual. Es la línea base de comparación.

---

## Pasos

### 0. Backup de producción

Bloqueante: sin esto no se ejecuta ningún otro paso. Requiere credenciales que no están en el repositorio, así que lo corre el desarrollador.

```bash
mysqldump \
  --host=$PROD_DB_HOST --port=$PROD_DB_PORT \
  --user=$PROD_DB_USER --password \
  --single-transaction --routines --triggers --set-gtid-purged=OFF \
  $PROD_DB_NAME > backup-$(date +%Y%m%d-%H%M).sql
```

Restauración en local:

```bash
mysql -u root -p -e "CREATE DATABASE lumo_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p lumo_local < backup-YYYYMMDD-HHMM.sql
```

Verificación de que el volcado está completo. Los tres conteos deben coincidir con los de producción:

```sql
SELECT 'usuarios' AS tabla, COUNT(*) AS filas FROM usuarios
UNION ALL SELECT 'cuentas', COUNT(*) FROM cuentas
UNION ALL SELECT 'movimientos', COUNT(*) FROM movimientos;
```

Y el saldo por cuenta, que es la cifra que hay que preservar intacta hasta la Fase 3:

```sql
SELECT c.id, c.nombre, c.tipo,
       COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0) AS saldo
FROM cuentas c
LEFT JOIN movimientos m ON m.cuentaId = c.id AND m.estado = 'activo'
WHERE c.estado = 'activo'
GROUP BY c.id
ORDER BY c.id;
```

Guardar esa salida. Es la referencia de la Fase 3.

### 1. Línea base de respuestas

Antes de tocar código, capturar las respuestas de los endpoints que el cliente web consume, con un token válido:

```bash
mkdir -p server/plans/.snapshots
TOKEN=...
BASE=http://localhost:3000/api/v1
curl -s -H "Authorization: Bearer $TOKEN" $BASE/auth/validate      > server/plans/.snapshots/00-auth-validate.json
curl -s -H "Authorization: Bearer $TOKEN" $BASE/cuentas            > server/plans/.snapshots/00-cuentas.json
curl -s -H "Authorization: Bearer $TOKEN" $BASE/movimientos/1      > server/plans/.snapshots/00-movimientos.json
```

`.snapshots/` no se versiona. Sirve de comparación al terminar esta fase y de línea base de la Fase 1.

### 2. `src/config/env.js`

Esquema `zod` con todas las variables, leído y validado una sola vez al arrancar. `zod` ya está en `package.json` y hoy no se usa (`docs/BACKEND.md` §2.5); esta es su primera aplicación real.

| Variable | Obligatoria | Default |
|---|---|---|
| `PORT` | no | `3000` |
| `NODE_ENV` | no | `development` |
| `LOG_LEVEL` | no | `info` |
| `APP_TIMEZONE` | no | `America/Bogota` |
| `APP_CURRENCY` | no | `COP` |
| `JWT_SECRET` | **sí** | — |
| `CORS_ORIGIN` | no | `http://localhost:5173` |
| `DB_NAME` `DB_USER` `DB_PASSWORD` `DB_HOST` `DB_PORT` `DB_DIALECT` | **sí** (`DB_PASSWORD` admite cadena vacía) | `DB_PORT` 3306, `DB_DIALECT` `mysql` |

Si falta una obligatoria, el proceso imprime cuáles y sale con código 1. Hoy la ausencia de `JWT_SECRET` no se nota hasta el primer login, que devuelve 500.

`DATABASE_URL` **no** entra aquí: llega en la Fase 1 con Prisma.

Consumidores que dejan de leer `process.env` directamente: `src/database/models/index.js`, `src/middleware/auth.js`, `src/controllers/auth.controller.js` y `src/index.js`.

### 3. `src/lib/date.js`

Cierra §2.11 (zona horaria quitada de Sequelize sin reemplazo) y §2.1 (rango que excluye el último día). Sobre `luxon`:

- `startOfDay(input)` — inicio del día en `APP_TIMEZONE`.
- `endOfDay(input)` — `23:59:59.999` en `APP_TIMEZONE`.
- `parseISO(input)` — parseo con offset explícito.
- `now()`.

Se aplica en esta fase **solo** en `getMovimientosByDateRange` (`src/controllers/movimientos.controller.js`, el `Op.between` del filtro y el del cálculo de balance). El resto de consumidores llegan con la API nueva.

El bug de §2.1 es concreto: `new Date("2025-12-31")` es medianoche UTC, así que un movimiento del 31 de diciembre a las 10 de la mañana en Bogotá queda fuera del rango `2025-01-01` a `2025-12-31`.

### 4. Partir `index.js`

- `src/app.js` — construye la app de Express (helmet, cors, json, requestLogger, rutas, health, 404, errorHandler) y la exporta. Sin `listen` y sin `sequelize.sync()`, para que la Fase 4 pueda montarla en Supertest.
- `src/index.js` — importa `config/env.js` primero, corre el `sync()`, arranca el `listen` y maneja `SIGTERM` cerrando el servidor y la conexión.

Corrige de paso un orden que hoy funciona por accidente: `loadModels()` con top-level await corre antes de `dotenv.config()`, y solo se salva porque `models/index.js` llama a `dotenv.config()` por su cuenta.

### 5. Errores unificados

- `src/lib/errors.js` — clase `AppError` y catálogo de códigos de `docs/BACKEND.md` §4.
- `src/middleware/errorHandler.js` — handler global con el formato del catálogo, más el handler `404`.

Se eliminan todas las devoluciones del objeto `error` crudo (§2.6): `cuentas.controller.js` en crear, actualizar y eliminar, y `movimientos.controller.js` en las cinco funciones que hacen `descripcion: error`. El detalle real va al log con el `requestId`; al cliente solo el mensaje.

**Compatibilidad temporal con el cliente web.** `client/src/services/api.js` lee `error.response?.data?.error` esperando un string. Con el envelope nuevo eso pasa a ser un objeto y todos los mensajes de error quedarían en blanco. Mientras el cliente web siga en uso, la respuesta de error incluye el envelope **y** un `message` plano en la raíz. Es deuda con fecha de retirada: se quita cuando la app móvil reemplace al cliente web.

### 6. Logging

`src/middleware/requestLogger.js` con `pino-http`, un `requestId` por petición propagado a la respuesta de error, y nivel desde `LOG_LEVEL`.

Se elimina el `console.log("Usuario validado:", ...)` de `auth.controller.js`, que imprime el usuario completo en cada validación de token (§2.12). El `logging` de Sequelize pasa a depender de `LOG_LEVEL === "debug"` en vez de `NODE_ENV`.

### 7. `.env.example` y limpieza

- Reescribir `.env.example` con la lista exacta que lee el código tras esta fase. Desaparece `SECRETOPRIVATEKEY`, que no existe en ninguna parte del código (§2.2).
- Borrar `optionalAuthMiddleware` de `src/middleware/auth.js`: no se usa en ninguna ruta.
- Agregar a `docs/BACKEND.md` §2 las mejoras detectadas al explorar el código, con su fase asignada.

### Dependencias

Se agregan `pino`, `pino-http` y `luxon`. Nada más: `express-rate-limit`, `compression`, `prisma` y el resto llegan en su fase.

---

## Aceptación

1. Arrancar sin `JWT_SECRET` falla al instante nombrando la variable que falta:
   ```bash
   cd server && JWT_SECRET= node src/index.js   # exit 1
   ```
2. `npm run dev` levanta y `GET /api/health` devuelve `200 {"status":"ok"}` con log estructurado y `requestId`.
3. `GET /api/v1/no-existe` devuelve `404` con `{ "error": { "code": "NOT_FOUND", ... } }`, no el HTML de Express.
4. Ningún controlador devuelve el objeto de error crudo:
   ```bash
   grep -rn "descripcion: error\|error })\|error: error" server/src/controllers/   # sin resultados
   ```
5. Con un movimiento del `2025-12-31`, `GET /api/v1/movimientos/search/date-range?fechaInicio=2025-01-01&fechaFin=2025-12-31` lo incluye.
6. Validar un token no imprime el usuario por consola.
7. Las capturas del paso 1, repetidas al terminar, son idénticas campo por campo.
8. El cliente web funciona sin cambios: login, dashboard con los mismos totales, listado, crear y borrar un movimiento.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| El formato nuevo de error deja al cliente web sin mensajes | `message` plano en la raíz durante la transición (paso 5) |
| `config/env.js` rechaza un entorno de producción que hoy arranca | Correr `node -e "import('./src/config/env.js')"` contra el `.env` de producción antes de desplegar |
| El arreglo de fechas cambia los resultados que el usuario ya conocía | Es el comportamiento correcto: hoy faltan movimientos del último día. Se avisa, no se revierte |
| `pino` cambia el formato del log y rompe algún parseo externo | No hay consumidores del log hoy |

Reversión: la fase entera es código, sin cambios de esquema. `git revert` del rango de commits deja el servidor exactamente como estaba.

---

## Fuera de alcance

- Prisma, `DATABASE_URL` y borrar Sequelize. Fase 1.
- Esquemas `zod` de request, rate limiting y cerrar el registro público. Fase 2. Solo se usa `zod` para el entorno.
- Renombrar nada al inglés en el código existente. Fase 3.
- Arreglar §2.8 (`getMovimiento`, `update` y `delete` sin filtro de estado) y el filtro de cuenta activa de `getMovimientos`. Fase 2, con la validación.
- Tests. Fase 4.

---

## Desviaciones

- **La compatibilidad del cliente web se resolvió en el cliente, no en el servidor.** La idea inicial era duplicar el mensaje en la raíz de la respuesta de error. En su lugar, `client/src/services/api.js` normaliza `data.error` a cadena en su interceptor de axios: seis líneas en un archivo descartable, en vez de un campo redundante en un contrato que va a durar años. La respuesta del servidor queda exactamente como la define `docs/BACKEND.md` §4.
- **Un fallo de conexión a la base ahora aborta el arranque.** Antes se registraba el error y el servidor seguía escuchando, devolviendo `500` en cada petición. Es coherente con fallar rápido ante configuración inválida.
- **`register` con un email repetido devuelve `409`, no `400`.** Lo exige el catálogo de §4. Ningún consumidor discrimina por ese código; el cliente muestra el mensaje.
- Borrar `optionalAuthMiddleware` no está en `docs/BACKEND.md` §12: es limpieza de código muerto.
- Los `literal` de saldo pasaron a comillas simples de paso, lo que quita la dependencia de `ANSI_QUOTES` (§2.9) antes de que la Fase 1 elimine el `literal` entero.

---

## Estado de ejecución

Verificado sin base de datos:

- Arranque sin `JWT_SECRET` sale con código 1 listando todas las variables que faltan, con mensajes en español.
- `GET /api/health` devuelve `200 {"status":"ok"}` con `X-Request-Id` en la cabecera.
- `GET /api/v1/no-existe` devuelve `404` con el envelope de §4.
- Sin token y con token inválido devuelven `401` `UNAUTHENTICATED` con el envelope.
- El log sale estructurado por `pino`, con el `requestId` de la petición y `authorization` y las contraseñas redactadas.
- `startOfDay("2025-01-01")` a `endOfDay("2025-12-31")` sí incluye un movimiento del 31 de diciembre a las 10:30 de Bogotá; el rango anterior lo dejaba fuera.
- `grep` confirma cero devoluciones del error crudo, cero `console.log` y cero `process.env` fuera de `config/env.js`.

Pendiente, requiere base de datos y el `.env` real (no está en el repositorio):

- Backup de producción y su restauración (paso 0).
- Capturas de línea base de `.snapshots/` (paso 1).
- Recorrido del cliente web: login, dashboard, listado, crear y borrar.
- Comprobación del rango de fechas contra datos reales.
