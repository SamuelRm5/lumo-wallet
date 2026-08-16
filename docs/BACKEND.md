# Backend - Lumo Wallet

Especificación del backend: estado actual, decisiones de arquitectura, modelo de datos, contrato de la API y plan de ejecución por fases.

`LOGICA_NEGOCIO.md` define el comportamiento funcional y manda sobre este documento. Aquí se define **cómo** se implementa, no **qué** debe pasar.

---

## 1. Estado actual

Stack: Node.js, Express 4, Sequelize 6, MySQL 8, JWT, bcryptjs, helmet, cors. Base `{HOST}/api/v1`.

Tres tablas (`usuarios`, `cuentas`, `movimientos`) y 18 endpoints. El esquema se crea con `sequelize.sync()` al arrancar; no hay migraciones ni tests.

| Recurso | Endpoints |
|---|---|
| `/auth` | `POST /register`, `POST /login`, `GET /validate`, `GET /profile`, `PUT /profile`, `PUT /change-password` |
| `/cuentas` | `GET /`, `GET /:id`, `GET /tipo/:tipo`, `POST /`, `PUT /:id`, `DELETE /:id` |
| `/movimientos` | `GET /search/date-range`, `GET /:cuentaId`, `GET /byid/:id`, `POST /:cuentaId`, `PUT /:id`, `DELETE /:id` |

Comportamiento a preservar:

- Soft delete en todo. Nada se borra físicamente.
- Aislamiento por usuario en cada consulta.
- Los saldos se calculan, nunca se almacenan.

---

## 2. Deuda técnica del backend actual

Verificado contra el código. La columna indica si el rediseño lo resuelve solo o si hay que arreglarlo explícitamente.

| # | Problema | Estado |
|---|---|---|
| 2.1 | `Op.between` con `new Date("2025-12-31")` excluye el último día completo del rango | Cerrado en la Fase 0 con `lib/date.js` |
| 2.2 | `.env.example` declara `SECRETOPRIVATEKEY`; el código lee `JWT_SECRET` | Cerrado en la Fase 0 |
| 2.3 | `register` emite token de 365d y `login` de 30d, sin revocación posible | Cerrado en la Fase 4: access token de 15 min y refresh rotativo revocable |
| 2.4 | `POST /auth/register` abierto al público, sin rate limiting | Cerrado en la Fase 2 |
| 2.5 | `zod` está instalado y nunca se usa: cero validación de entrada | Cerrado en las Fases 0 y 2 |
| 2.6 | Varios `catch` devuelven el objeto `error` crudo al cliente | Cerrado en la Fase 0 |
| 2.7 | `loadModels()` corre en el top-level de 4 archivos y duplica asociaciones | Cerrado en la Fase 1 |
| 2.8 | `getMovimiento`, `update` y `delete` no filtran por estado activo | Cerrado en la Fase 2 |
| 2.9 | `literal('CASE WHEN tipo = "ingreso" ...')` depende de MySQL sin `ANSI_QUOTES` | Cerrado en la Fase 1: el `literal` desapareció |
| 2.10 | `sequelize.sync()` no aplica cambios sobre tablas existentes; sin migraciones | Cerrado en la Fase 1 |
| 2.11 | Timezone removida de Sequelize sin reemplazo (commit `aea1ebc`) | Cerrado en la Fase 0 con `APP_TIMEZONE` y `lib/date.js` |
| 2.12 | `validateToken` imprime el usuario completo por consola en cada arranque | Cerrado en la Fase 0 |
| 2.13 | `getMovimientos` busca la cuenta sin filtrar `estado`: una cuenta archivada sigue devolviendo movimientos y balance | Cerrado en la Fase 2 |
| 2.14 | `createMovimiento` acepta `createdAt` del cliente sin límite: se puede grabar un movimiento en el año 3000 | Cerrado en la Fase 2 |
| 2.15 | `POST /movimientos/:cuentaId` acepta `monto` negativo o cero, contra el invariante de `LOGICA_NEGOCIO.md` §9.2 | Cerrado en la Fase 2 |
| 2.16 | `updateCuenta` usa `campo \|\| cuenta.campo`: es imposible vaciar `descripcion` | Cerrado en la Fase 2, también en `updateMovimiento` |
| 2.17 | `.sequelizerc` apunta a `src/database/config/config.js`, que no existe | Cerrado en la Fase 1 |
| 2.18 | `optionalAuthMiddleware` exportado y sin usar en ninguna ruta | Cerrado en la Fase 0 |
| 2.19 | `parseInt` sobre el balance en `movimientos.controller.js` truncaría los centavos cuando `monto` pase a `Decimal(14,2)` | Cerrado: el controlador desapareció en la Fase 4 y los saldos pasan por `serialize.js` |
| 2.20 | `ORDER BY createdAt DESC` sin desempate: con dos filas del mismo instante el orden lo decide MySQL, y paginar sobre él puede repetir o saltarse filas. En esta app el empate es lo normal, no la excepción: cada evento se registra hoy como dos movimientos a la vez | Cerrado en la Fase 4 con la paginación por cursor, que desempata por `id` |
| 2.21 | El corte de rango a medianoche UTC (§2.1) reaparece en cualquier endpoint nuevo que acepte fechas: `z.coerce.date()` sobre `2026-08-05` produce medianoche UTC y deja fuera el día entero | Cerrado en la Fase 4: los rangos pasan por `rangeStart` y `rangeEnd`, que resuelven en `APP_TIMEZONE`. Todo endpoint nuevo con fechas debe usarlos |
| 2.22 | La aritmética de las columnas `DATE` (`startDate`, `nextRunAt`, `scheduledDate`) se hacía en `APP_TIMEZONE`: MySQL las devuelve a medianoche UTC y convertirlas a Bogotá las corre al día anterior. Una regla del día 5 habría generado su ocurrencia el 4, y cada relectura la habría corrido un día más | Cerrado en la Fase 5: `lib/date.js` expone `plainDate` y `fromPlainDate`, y las fechas sin hora se calculan en UTC |
| 2.23 | `GET /sync` no pagina: devuelve todo lo cambiado desde `since` en una sola respuesta, y la primera sincronización de un dispositivo trae las 1.668 operaciones del histórico (~350 KB, ~50 KB comprimidos) | Abierto, deliberado. Paginar exige un corte estable, y las filas migradas comparten `updatedAt` al milisegundo, así que un corte por marca de tiempo se atascaría. Se revisa si el histórico crece un orden de magnitud |
| 2.24 | Los identificadores de los tickets de Expo esperan el recibo en memoria: al reiniciar el proceso se pierden y la baja de un token muerto se retrasa hasta el siguiente envío | Latente desde el 2026-08-15: sin cliente que registre dispositivos no se envía nada y no hay recibos que perder. Vuelve a contar si alguien repone el push |
| 2.25 | `refresh_tokens.deviceId` siempre es `null`: `issueSession` ya acepta el parámetro, pero `POST /auth/login` no lo recibe del cliente ni lo expone en la respuesta. Sin eso no se puede cerrar sesión en un teléfono concreto desde otro (`docs/APP_MOVIL.md` §7) | Abierto. Lo cierra quien conecte el login al identificador de dispositivo del cliente móvil, candidato natural la Fase 6 de `mobile/plans/` |

El detalle de ejecución de cada fase está en `server/plans/`.

---

## 3. Decisiones de arquitectura

### 3.1 Prisma reemplaza a Sequelize

`schema.prisma` pasa a ser la única fuente de verdad del esquema, y `prisma migrate` el mecanismo de cambio. Desaparecen `models/`, `associations/`, `.sequelizerc` y `sequelize.sync()`.

Lo que resuelve de entrada:

- **§2.7 deja de existir.** `PrismaClient` se instancia una vez y se importa; no hay carga de modelos ni asociaciones que aplicar cuatro veces.
- **§2.10 deja de existir.** `prisma migrate` genera migraciones versionadas y falla si la base no está en el estado esperado, en vez de aplicar cambios en silencio o ignorarlos.
- **Tipado real.** El cliente se genera a partir del esquema, así que renombrar una columna rompe en tiempo de compilación en vez de en tiempo de ejecución.

Lo que hay que tener presente:

- **No existe `paranoid`.** El soft delete se maneja explícitamente con `deletedAt`. Ver §3.2.
- **Los `CHECK` no se declaran en el esquema.** `CHECK (amount > 0)` se agrega con SQL crudo dentro del archivo de migración. Prisma lo respeta y lo conserva, solo no lo genera solo.
- **`Decimal` no es un número de JavaScript.** Prisma devuelve `Prisma.Decimal` para las columnas decimales. Hay que convertirlo en el borde de la API o el JSON sale como objeto. Ver §4.
- **Una sola variable de conexión.** Prisma usa `DATABASE_URL`, no las seis variables `DB_*` actuales.

### 3.2 Soft delete explícito

Al no haber `paranoid`, el filtro `deletedAt: null` se aplica mediante una **extensión del cliente** (`prisma.$extends`) sobre `account`, `category`, `operation` y `recurringRule`. La extensión inyecta el filtro en `findMany`, `findFirst`, `findUnique` y `count`.

La extensión expone un escape explícito para los pocos casos que necesitan ver lo borrado: el histórico de una cuenta archivada y el endpoint de sincronización, que precisamente necesita reportar los borrados al cliente móvil.

No se confía el filtro únicamente a la disciplina del programador: olvidar un `deletedAt: null` en una consulta significa mostrar datos borrados y contarlos en un saldo.

### 3.3 Los saldos se calculan, y `entries.amount` va con signo

El saldo de una cuenta es siempre la suma de sus asientos. No se almacena en ninguna columna.

**Por qué no una columna de saldo.** Guardarlo ahorra una suma y a cambio introduce desincronización: editar una operación vieja, borrar una cuenta o fallar a mitad de una escritura deja la columna mintiendo sin que nada avise. Es justo la clase de error que esta aplicación existe para detectar. Un saldo calculado no puede desincronizarse.

**Por qué el volumen no es un problema.** Al ritmo de uso real —unas 50 operaciones al mes, o 100 asientos— son 1.200 filas al año y 12.000 en diez años. Una suma con índice sobre `accountId` a ese volumen es de microsegundos. El punto donde convendría revisar esta decisión está por encima del millón de filas; a este ritmo, siglos. Si algún día se importan extractos bancarios masivamente, se reevalúa con datos, no antes.

**Por qué el monto va con signo.** `entries.amount` guarda el valor ya firmado (negativo si sale de la cuenta) en lugar de un monto positivo más una columna `direction`. Con eso el saldo es un `SUM` plano y se expresa con la API tipada de Prisma, sin `CASE WHEN` ni SQL crudo:

```js
const { _sum } = await prisma.entry.aggregate({
  _sum: { amount: true },
  where: {
    accountId,
    operation: { deletedAt: null, status: "confirmed" },
  },
});
```

Y para todas las cuentas del usuario de una sola vez:

```js
const rows = await prisma.entry.groupBy({
  by: ["accountId"],
  _sum: { amount: true },
  where: {
    account: { userId, deletedAt: null },
    operation: { deletedAt: null, status: "confirmed" },
  },
});
```

Esto elimina §2.9: no queda dependencia del dialecto ni comillas dobles como delimitador de cadena.

`operations.amount` sigue siendo **siempre positivo**: es el monto que el usuario escribe y ve. El signo vive solo en los asientos, que son internos.

---

## 4. Convenciones transversales

### Errores

Un solo formato. Nunca se devuelve el error de Prisma ni el stack.

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "El monto debe ser mayor a cero", "details": [] } }
```

| Código | HTTP |
|---|---|
| `VALIDATION_ERROR` | 400 |
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 |
| `INTERNAL` | 500 |

Manejador global y handler `404`. El detalle real va al log con un `requestId` que también viaja en la respuesta. Los errores conocidos de Prisma (`P2002` unicidad, `P2025` no encontrado) se traducen a códigos del catálogo; el resto es `INTERNAL`.

### Colecciones

Envelope único `{ data, meta }`. Paginación por cursor, no por offset: con `offset`, insertar una operación mientras el usuario hace scroll duplica o salta filas.

```json
{ "data": [], "meta": { "nextCursor": "MjAyNi0wOC0wNXwxNDIz", "hasMore": true } }
```

El cursor es base64 de `${date}|${id}`. `limit` por defecto 20, máximo 100.

### Montos

`Decimal(14,2)` en base. En JSON viajan como **número**, convertidos explícitamente en el borde de la API. Prisma devuelve `Prisma.Decimal`, que serializado directamente produce un objeto y rompe el cliente en silencio. La conversión se hace en una capa de presentación, nunca dejando que el objeto de Prisma llegue a `res.json()`.

`operations.amount` siempre positivo. `entries.amount` firmado (§3.3).

### Fechas

ISO 8601 con offset explícito en entrada y salida. La zona horaria se fija por configuración (`APP_TIMEZONE`, default `America/Bogota`) y define los cortes de mes en los reportes. Los rangos se interpretan como `[from 00:00:00, to 23:59:59.999]` en esa zona: es el arreglo de §2.1.

### Validación

`zod` en un middleware por ruta, con los esquemas en `src/schemas/`. Se valida body, params y query. Nada llega al servicio sin validar.

---

## 5. Modelo de datos

Definido en `prisma/schema.prisma`. Las tablas se mapean con `@@map` a nombres en plural y snake case; los campos del cliente van en camelCase.

### 5.1 users

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK autoincrement | |
| name | VarChar(100) | |
| email | VarChar(255) unique | |
| password | VarChar(255) | bcrypt |
| status | enum `active` \| `disabled` | default `active` |
| createdAt / updatedAt | DateTime | |

### 5.2 accounts

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| userId | Int FK → users | onDelete Cascade |
| name | VarChar(100) | |
| description | VarChar(255)? | |
| type | enum `source` \| `cash` \| `receivable` \| `liability` | ver `LOGICA_NEGOCIO.md` §3 |
| currency | Char(3) | default `COP`, fijo |
| lastReconciledAt | DateTime? | nulo en cuentas `source`, que no se concilian |
| createdAt / updatedAt / deletedAt | DateTime | |

Índices: `[userId, deletedAt]`, `[userId, type]`.

### 5.3 categories

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| userId | Int FK → users | |
| name | VarChar(60) | |
| icon | VarChar(60)? | identificador semántico, no de una librería concreta |
| color | Char(7)? | hex |
| kind | enum `income` \| `expense` | filtra el selector según la operación |
| createdAt / updatedAt / deletedAt | DateTime | |

Índice: `[userId, kind]`. La unicidad de `(userId, kind, name)` entre las no borradas se valida en el servicio: MySQL no soporta índices únicos parciales.

### 5.4 operations

El evento real. Es lo que el usuario ve y edita.

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| userId | Int FK → users | denormalizado desde `accounts` para no unir en cada consulta |
| kind | enum `income` \| `expense` \| `transfer` \| `adjustment` | |
| amount | Decimal(14,2) | siempre positivo, `CHECK (amount > 0)` por SQL en la migración |
| categoryId | Int? FK → categories | opcional; solo en `income` y `expense` |
| date | DateTime | fecha del movimiento, la elige el usuario |
| description | VarChar(255)? | obligatoria en `adjustment` |
| status | enum `pending` \| `confirmed` | default `confirmed`; `pending` no afecta saldos |
| origin | enum `manual` \| `recurring` \| `reconciliation` \| `legacy` | default `manual` |
| recurringRuleId | Int? FK | |
| scheduledDate | Date? | fecha prevista de la ocurrencia |
| createdAt / updatedAt / deletedAt | DateTime | `createdAt` es inmutable y de auditoría |

Índices: `[userId, date]`, `[userId, categoryId, date]`, `[userId, status]`, único `[recurringRuleId, scheduledDate]` para que una ocurrencia no se genere dos veces.

### 5.5 entries

El efecto sobre una cuenta. No se expone como recurso propio.

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| operationId | Int FK → operations | onDelete Cascade |
| accountId | Int FK → accounts | |
| amount | Decimal(14,2) | **firmado**: negativo si sale de la cuenta (§3.3) |

Índices: `[accountId]`, `[operationId]`.

No tiene borrado propio: sigue la vida de su operación, y por eso toda consulta de saldo filtra por `operation.deletedAt` y `operation.status`.

### 5.6 recurring_rules

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| userId | Int FK | |
| name | VarChar(100) | |
| kind | enum `income` \| `expense` \| `transfer` | |
| amount | Decimal(14,2) | |
| categoryId | Int? FK | |
| sourceAccountId | Int? FK | cuenta `source` a imputar |
| fromAccountId | Int? FK | |
| toAccountId | Int? FK | |
| frequency | enum `weekly` \| `biweekly` \| `monthly` \| `yearly` | |
| dayOfMonth | Int? | |
| dayOfWeek | Int? | |
| startDate | Date | |
| endDate | Date? | |
| mode | enum `auto` \| `reminder` | |
| nextRunAt | Date? | |
| createdAt / updatedAt / deletedAt | DateTime | |

### 5.7 devices

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| userId | Int FK | |
| expoPushToken | VarChar(255) unique | |
| platform | enum `android` \| `ios` | |
| lastSeenAt | DateTime | |

### 5.8 refresh_tokens

| Campo | Tipo | Notas |
|---|---|---|
| id | Int PK | |
| userId | Int FK | |
| tokenHash | VarChar(255) | nunca el token en claro |
| deviceId | Int? FK | |
| expiresAt | DateTime | |
| revokedAt | DateTime? | |

---

## 6. Reglas que el backend debe garantizar

### 6.1 Composición de los asientos

El cliente nunca envía asientos. Envía una operación y el backend deriva las dos filas, con el signo ya aplicado:

| kind | Asiento 1 | Asiento 2 |
|---|---|---|
| `income` | `sourceAccountId` · **+amount** | `toAccountId` · **+amount** |
| `expense` | `sourceAccountId` · **−amount** | `fromAccountId` · **−amount** |
| `transfer` | `fromAccountId` · **−amount** | `toAccountId` · **+amount** |
| `adjustment` | `sourceAccountId` · mismo signo | `accountId` · signo según faltante o sobrante |

La conciliación (§7.2) no es un `kind` aparte: calcula la diferencia y crea un `adjustment` con `origin = 'reconciliation'`.

### 6.2 Invariante de la ecuación de control

Toda operación debe dejar intacta la ecuación `cash + receivable + liability − source = 0`. La contribución de un asiento es su monto firmado, invertido si la cuenta es de tipo `source`:

```js
const signed = (entry, account) =>
  account.type === "source" ? -entry.amount : entry.amount;
```

La operación es válida si la suma de las contribuciones de sus asientos es cero. Se verifica **antes** de escribir.

Comprobación de las cuatro formas, con monto `X`:

| kind | Contribución asiento 1 | Contribución asiento 2 | Σ |
|---|---|---|---|
| `income` | `source +X` → −X | `cash +X` → +X | 0 |
| `expense` | `source −X` → +X | `cash −X` → −X | 0 |
| `transfer` | `cash −X` → −X | `cash +X` → +X | 0 |
| `adjustment` | `source ∓X` → ±X | `account ±X` → ±X | 0 |

Nótese que los asientos **no suman cero entre sí** salvo en las transferencias: en un ingreso los dos son positivos. Lo que suma cero es su contribución a la ecuación, porque las cuentas `source` entran invertidas.

### 6.3 Validaciones de escritura

1. Ambas cuentas pertenecen al usuario autenticado, no están borradas y son distintas entre sí.
2. `operations.amount > 0` estrictamente.
3. `transfer` no puede involucrar una cuenta `source`.
4. `income` deposita en `cash`. `expense` sale de `cash` o de `liability`.
5. `categoryId`, si viene, pertenece al usuario y su `kind` coincide con el de la operación. No se acepta en `transfer` ni en `adjustment`.
6. `adjustment` exige `description`.
7. Si el usuario tiene una sola cuenta `source`, `sourceAccountId` es opcional y se resuelve en el servidor.

### 6.4 Atomicidad

Crear, editar y borrar una operación corre dentro de `prisma.$transaction()`. Editar reemplaza los dos asientos; nunca puede quedar media operación viva. Es la primera vez que este backend usa transacciones y es obligatorio aquí.

---

## 7. API objetivo

Todas las rutas bajo `/api/v1`. Todas exigen `Authorization: Bearer <accessToken>` salvo donde se indique.

### 7.1 Auth

| Endpoint | Notas |
|---|---|
| `POST /auth/login` | público, rate limited |
| `POST /auth/register` | público, rate limited, detrás de `ALLOW_PUBLIC_REGISTRATION` |
| `POST /auth/refresh` | público, consume el refresh token |
| `POST /auth/logout` | revoca el refresh token del dispositivo |
| `GET /auth/me` | reemplaza `GET /validate` y `GET /profile` |
| `PUT /auth/me` | |
| `PUT /auth/password` | revoca todos los refresh tokens del usuario |

```json
// POST /auth/login → 200
{
  "accessToken": "jwt",
  "refreshToken": "opaque",
  "expiresIn": 900,
  "user": { "id": 1, "name": "Samuel", "email": "..." }
}
```

Access token de 15 minutos. Refresh token opaco, rotativo, guardado hasheado, con expiración de 90 días. Cada `refresh` revoca el anterior. Si llega un refresh token ya revocado se revocan todos los del usuario: es la señal de que uno fue robado.

Reemplaza los tokens de 30 y 365 días, que hoy no se pueden revocar ni cambiando la contraseña.

### 7.2 Accounts

| Endpoint | Notas |
|---|---|
| `GET /accounts` | filtro opcional `?type=`; incluye saldo |
| `GET /accounts/:id` | |
| `POST /accounts` | |
| `PUT /accounts/:id` | |
| `DELETE /accounts/:id` | soft delete; `409` si el saldo no es cero, salvo `?force=true` |
| `POST /accounts/:id/reconcile` | concilia contra el saldo real |

```json
// GET /accounts → 200
{
  "data": [
    { "id": 4, "name": "Bancolombia", "description": null, "type": "cash",
      "currency": "COP", "balance": 2800000,
      "lastReconciledAt": "2026-08-10T09:12:00-05:00", "createdAt": "..." }
  ]
}
```

El `409` al borrar una cuenta con saldo evita el descuadre permanente que hoy se produce en silencio.

**Conciliación:**

```json
// POST /accounts/4/reconcile
{ "realBalance": 2760000, "date": "2026-08-13T10:00:00-05:00", "sourceAccountId": 1 }

// 200
{
  "accountId": 4,
  "calculatedBalance": 2800000,
  "realBalance": 2760000,
  "difference": -40000,
  "lastReconciledAt": "2026-08-13T10:00:00-05:00",
  "operation": { "id": 1519, "kind": "adjustment", "origin": "reconciliation", "amount": 40000 }
}
```

- `difference = realBalance − calculatedBalance`. Negativa genera un `adjustment` de salida; positiva, de entrada. El ajuste toca también la cuenta `source`: es plata que entró o salió del sistema sin registrarse.
- Diferencia cero: no se crea operación, `operation` viene `null` y solo se actualiza `lastReconciledAt`.
- `description` la genera el servidor (`Conciliación de {cuenta}`), no se acepta del cliente.
- `400` si la cuenta es de tipo `source`: no hay realidad externa contra la cual compararla.
- Todo dentro de una transacción.

### 7.3 Summary

`GET /summary` — una sola llamada para el dashboard. Reemplaza la agregación que hoy hace el cliente sobre `GET /cuentas`.

```json
{
  "currency": "COP",
  "byType": { "source": 2350000, "cash": 2800000, "receivable": 0, "liability": -450000 },
  "accounts": [
    { "id": 4, "name": "Bancolombia", "type": "cash", "balance": 2800000,
      "lastReconciledAt": "2026-08-10T09:12:00-05:00" }
  ],
  "discrepancy": 0
}
```

`discrepancy = cash + receivable + liability − source`.

### 7.4 Operations

| Endpoint | Notas |
|---|---|
| `GET /operations` | filtros `accountId`, `kind`, `categoryId`, `status`, `from`, `to`, `search`, `limit`, `cursor` |
| `GET /operations/:id` | |
| `POST /operations` | crea operación + asientos en una transacción |
| `PUT /operations/:id` | reemplaza los asientos atómicamente |
| `DELETE /operations/:id` | soft delete; los asientos la siguen |
| `POST /operations/:id/confirm` | confirma una ocurrencia recurrente en modo recordatorio |
| `GET /operations/stats` | agregados para gráficos |

Campos requeridos por `kind`:

| kind | Campos |
|---|---|
| `income` | `amount`, `date`, `toAccountId`, `sourceAccountId`, `categoryId?`, `description?` |
| `expense` | `amount`, `date`, `fromAccountId`, `sourceAccountId`, `categoryId?`, `description?` |
| `transfer` | `amount`, `date`, `fromAccountId`, `toAccountId`, `description?` |
| `adjustment` | `amount`, `date`, `accountId`, `direction`, `sourceAccountId`, `description` |

`direction` (`in` o `out`) es un campo **de entrada** que indica si el ajuste suma o resta, y a partir de él el servidor calcula el signo de los asientos. No existe como columna: `entries.amount` ya viene firmado (§3.3). En la conciliación no se envía, se deduce del signo de la diferencia.

```json
// POST /operations
{
  "kind": "expense", "amount": 200000, "date": "2026-08-05T14:30:00-05:00",
  "fromAccountId": 4, "sourceAccountId": 1, "categoryId": 3, "description": "Mercado"
}

// 201
{
  "id": 1423, "kind": "expense", "amount": 200000, "date": "2026-08-05T14:30:00-05:00",
  "description": "Mercado", "status": "confirmed", "origin": "manual",
  "category": { "id": 3, "name": "Comida", "icon": "food", "color": "#..." },
  "entries": [
    { "accountId": 1, "accountName": "Salario", "amount": -200000 },
    { "accountId": 4, "accountName": "Bancolombia", "amount": -200000 }
  ]
}
```

Prestar 5.000.000 desde Bancolombia es una sola llamada:

```json
{ "kind": "transfer", "amount": 5000000, "date": "...",
  "fromAccountId": 4, "toAccountId": 7, "description": "Préstamo a Juan" }
```

`GET /operations/stats?from=&to=`:

```json
{
  "from": "2026-08-01", "to": "2026-08-31",
  "income": 3000000, "expense": 650000, "adjustments": -40000, "net": 2310000,
  "byCategory": [
    { "categoryId": 3, "name": "Comida", "kind": "expense", "total": 200000 },
    { "categoryId": null, "name": "Sin categoría", "kind": "expense", "total": 90000 }
  ],
  "byMonth": [ { "month": "2026-08", "income": 3000000, "expense": 650000, "adjustments": -40000 } ]
}
```

Reglas de agregación (`LOGICA_NEGOCIO.md` §11):

- Sumar **solo los asientos de cuentas que no son `source`**. Sin esto toda cifra sale al doble, porque cada operación tiene dos asientos del mismo monto.
- Excluir `transfer`: no es consumo.
- Las operaciones sin categoría se agrupan con `categoryId: null`. La categoría es opcional y esa plata sí está identificada, solo no clasificada.
- Los `adjustment` van en línea propia, con signo, **fuera** de `byCategory`. Meterlos en el desglose crea una categoría fantasma; esconderlos subestima el gasto real. No son lo mismo que "Sin categoría": ahí no se sabe dónde quedó la plata.
- `net = income − expense + adjustments`.

### 7.5 Categories

CRUD estándar en `/categories`, filtro `?kind=`. Borrar es soft delete: las operaciones que la usaban la conservan y siguen apareciendo en reportes históricos.

### 7.6 Recurring rules

CRUD estándar en `/recurring-rules`. Un job diario recorre las reglas con `nextRunAt <= hoy`:

- `mode = auto` → crea la operación con `status = 'confirmed'`.
- `mode = reminder` → crea la operación con `status = 'pending'`. No afecta saldos hasta `POST /operations/:id/confirm`, donde el monto es editable.

El índice único `[recurringRuleId, scheduledDate]` hace la generación idempotente: si el job corre dos veces, o recupera ocurrencias atrasadas tras una caída, no duplica nada.

El job intenta notificar cada ocurrencia, pero desde el 2026-08-15 no hay cliente que registre dispositivos, así que la lista está vacía y el envío se salta. El usuario se entera al abrir la app (`LOGICA_NEGOCIO.md` §8).

### 7.7 Devices y sync

| Endpoint | Notas |
|---|---|
| `POST /devices` | registra el push token de Expo. Repetir el mismo token no duplica: lo reasigna al usuario que lo envía |
| `GET /devices` | los dispositivos del usuario, para poder revocar uno |
| `DELETE /devices/:id` | |
| `GET /sync?since=` | delta de operaciones, cuentas y categorías creadas, actualizadas y borradas desde una marca de tiempo |

Los tres de `devices` están en pie y probados, pero **ningún cliente los llama**: el push salió del alcance de la app móvil el 2026-08-15 (`docs/APP_MOVIL.md` §4.9). Se conservan porque reponer el envío sería volver a escribirlos igual, no porque algo los use.

`GET /sync` es uno de los pocos consumidores del escape de §3.2: necesita ver los registros borrados para poder reportarlos al cliente. Devuelve cada colección partida en `updated` y `deleted`, esta última solo con identificadores, y un `serverTime` que el cliente guarda para la siguiente llamada. El corte superior es ese mismo `serverTime`, tomado antes de consultar: lo que se escriba mientras la consulta corre entra en el delta siguiente en vez de perderse. `since` ausente significa sincronización completa.

---

## 8. Configuración y dependencias

### Variables de entorno

Se leen y validan una sola vez al arrancar, en `src/config/env.js`, con un esquema `zod`. Si falta una obligatoria el proceso no arranca: es preferible a fallar en el primer login, como pasa hoy con `JWT_SECRET`.

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

APP_TIMEZONE=America/Bogota
APP_CURRENCY=COP

DATABASE_URL="mysql://user:password@host:3306/database"

JWT_SECRET=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=90

ALLOW_PUBLIC_REGISTRATION=false
RATE_LIMIT_AUTH_WINDOW_MIN=15
RATE_LIMIT_AUTH_MAX=10

CORS_ORIGIN=http://localhost:5173

RECURRING_JOB_ENABLED=true
RECURRING_JOB_CRON=0 6 * * *
RECURRING_MAX_CATCHUP=12

EXPO_ACCESS_TOKEN=
MIN_CLIENT_VERSION=
```

`DATABASE_URL` reemplaza las seis variables `DB_*`. `.env.example` debe reflejar exactamente esta lista; hoy declara `SECRETOPRIVATEKEY`, que no existe en el código.

### Dependencias

| Acción | Paquete | Para qué |
|---|---|---|
| Quitar | `sequelize`, `mysql2` | los reemplaza Prisma |
| Agregar | `@prisma/client` | cliente |
| Agregar | `prisma` (dev) | CLI y migraciones |
| Agregar | `express-rate-limit` | límite en `/auth/login` y `/auth/register` |
| Agregar | `pino`, `pino-http` | logging estructurado con `requestId` |
| Agregar | `compression` | respuestas comprimidas en listados |
| Agregar | `luxon` | aritmética de fechas con zona horaria |
| Agregar | `expo-server-sdk` | envío de push |
| Agregar | `node-cron` | disparo del job de recurrentes |
| Agregar | `vitest`, `supertest` (dev) | tests de integración |
| Usar | `zod` | ya instalado, hoy sin usar |

---

## 9. Estructura de archivos

```
server/
  prisma/
    schema.prisma           Única fuente de verdad del esquema
    migrations/             Generadas por prisma migrate
    seed.js                 Catálogo inicial de categorías
  src/
    index.js                Arranque: config, servidor y job
    app.js                  Express app sin listen, para poder testear
    config/
      env.js                Lectura y validación de variables de entorno
      prisma.js             Instancia única de PrismaClient con las extensiones
    middleware/
      auth.js               Verificación del access token
      validate.js           Middleware genérico de zod
      errorHandler.js       Handler global y 404
      requestLogger.js
      rateLimit.js
    schemas/                Esquemas zod por recurso
    services/
      operations.service.js Composición de asientos, invariante de §6.2
      balances.service.js   Saldos, resumen y estadísticas
      reconcile.service.js  Conciliación
      recurring.service.js  Generación de ocurrencias
      auth.service.js       Access y refresh tokens
    controllers/            Solo traducen HTTP a llamadas de servicio
    v1/routes/
    jobs/
      recurring.job.js
    lib/
      errors.js             AppError y catálogo de códigos
      cursor.js             Codificación del cursor
      date.js               Helpers de zona horaria sobre luxon
      serialize.js          Conversión de Decimal a número en el borde
```

Tres reglas que el código actual no cumple:

- **Una sola instancia de Prisma**, creada en `config/prisma.js` e importada donde haga falta. Nada de instanciar clientes por módulo.
- **La lógica de dominio vive en `services/`.** El invariante de §6.2 y la composición de asientos se prueban sin levantar HTTP.
- **Ningún objeto de Prisma llega a `res.json()` sin pasar por `serialize.js`.** Es lo que evita que los `Decimal` salgan como objetos.

---

## 10. Datos iniciales

Al crear un usuario se siembra su catálogo de categorías. `icon` guarda un identificador semántico, no el nombre de un set concreto: web y móvil usan librerías distintas y cada una hace su mapeo.

| kind | name | icon |
|---|---|---|
| `expense` | Comida | `food` |
| `expense` | Transporte | `transport` |
| `expense` | Servicios | `utilities` |
| `expense` | Salud | `health` |
| `expense` | Hogar | `home` |
| `expense` | Ocio | `leisure` |
| `expense` | Educación | `education` |
| `expense` | Otros | `other` |
| `income` | Salario | `salary` |
| `income` | Freelance | `freelance` |
| `income` | Ventas | `sales` |
| `income` | Regalos | `gift` |
| `income` | Otros | `other` |

Editables y borrables. No hay categorías del sistema protegidas.

---

## 11. Migración del histórico

Los movimientos actuales son asientos sueltos sin pareja y esa relación no se puede reconstruir (`LOGICA_NEGOCIO.md` §12.5). Se conservan tal cual.

Conversión de cada fila de `movimientos`:

- Una `operation` con `kind` = `income` si `tipo = 'ingreso'` o `expense` si `tipo = 'egreso'`; `userId` tomado de la cuenta; `amount` = `monto`; `date` = `createdAt`; `description`; `origin = 'legacy'`; `status = 'confirmed'`; `deletedAt` poblado si la fila estaba inactiva.
- Un único `entry` con `accountId` = `cuentaId` y `amount` = `+monto` para ingreso, `−monto` para egreso.

### 11.1 El signo de las cuentas `deuda` se invierte

Verificado contra el volcado de producción: **las 27 cuentas `deuda` tienen saldo negativo o cero**, nunca positivo. En ellas un `egreso` significa "le presté más" y un `ingreso` significa "me abonó", así que el saldo almacenado es el negativo de lo que a uno le deben.

Por eso `Home.jsx:63` usa `Math.abs` sobre el total de deudas, y por eso la ecuación cierra:

| Fórmula | Resultado |
|---|---|
| `normal + deuda − fuente` | −139.257.200 |
| `normal + \|deuda\| − fuente` | **0** |

El cero exacto confirma que la captura del usuario está completa y es consistente; lo que está invertido es la convención de signo, no los datos.

`LOGICA_NEGOCIO.md` §4 define la ecuación como `cash + receivable + liability − source = 0`, con `receivable` positivo. Para que el modelo nuevo cumpla eso sin arrastrar el `Math.abs`, la migración **invierte el signo de los asientos de las cuentas `deuda`**:

| Cuenta | `tipo` del movimiento | `entries.amount` |
|---|---|---|
| `normal`, `fuente` | `ingreso` | `+monto` |
| `normal`, `fuente` | `egreso` | `−monto` |
| `deuda` → `receivable` | `ingreso` (me abonan) | `−monto` |
| `deuda` → `receivable` | `egreso` (le presto) | `+monto` |

Tras la inversión, `cash + receivable − source = 188.089.400 + 69.628.600 − 257.718.000 = 0`, sin valor absoluto en ninguna parte.

Es además lo coherente con el modelo nuevo: prestar plata pasa a ser una transferencia `cash → receivable`, que por definición resta en la de origen y suma en la de destino.

**Consecuencia visible:** el saldo mostrado de esas cuentas cambia de signo. Donde hoy se lee `−22.200.000` en Samy, se leerá `22.200.000`, que es lo que Samy debe.

Las operaciones `legacy` tienen un solo asiento y por eso no cumplen el invariante de §6.2. La validación se aplica únicamente al escribir, nunca al leer.

---

## 12. Plan por fases

Cada fase se puede desplegar sola y tiene un criterio de aceptación verificable. No se empieza una sin cerrar la anterior.

### Fase 0 — Andamio

**Objetivo:** dejar el proyecto en condiciones de que los cambios siguientes sean seguros. No se toca el modelo de datos ni la ORM.

1. Backup de producción, restaurado al menos una vez en local. Sin esto no se sigue.
2. `src/config/env.js` con validación `zod` de todas las variables. El proceso no arranca si falta una.
3. Fijar `APP_TIMEZONE` y centralizar el manejo de fechas en `lib/date.js` sobre luxon (§2.11).
4. Partir `index.js` en `app.js` (sin `listen`) e `index.js` (arranque), para poder testear.
5. `lib/errors.js`, `middleware/errorHandler.js` y handler `404` con el formato de §4. Eliminar toda devolución del objeto `error` crudo (§2.6).
6. `pino` con `requestId`. Quitar el `console.log` de `validateToken` (§2.12).
7. Corregir `.env.example` (§2.2).

**Aceptación:** la app se comporta igual que antes desde el punto de vista del cliente web, ningún endpoint devuelve un error crudo, y arrancar sin `JWT_SECRET` falla al instante con un mensaje claro.

### Fase 1 — Prisma sobre el esquema actual

**Objetivo:** cambiar de ORM sin cambiar ni el esquema ni el contrato de la API. Es un refactor puro, y por eso es verificable.

1. Instalar `prisma` y `@prisma/client`, agregar `DATABASE_URL`.
2. `npx prisma db pull` para introspectar la base actual. Genera un `schema.prisma` que refleja `usuarios`, `cuentas` y `movimientos` tal como están.
3. Baseline: generar la migración inicial a partir del esquema introspectado y marcarla como ya aplicada con `prisma migrate resolve --applied`. Desde aquí la base queda bajo control de migraciones.
4. `config/prisma.js` con la instancia única.
5. Reescribir los tres controladores contra Prisma, uno por uno, sin cambiar rutas ni formas de respuesta. El cálculo de saldos pasa de `literal('CASE WHEN ...')` a agregaciones de Prisma.
6. Desinstalar `sequelize` y `mysql2`. Borrar `database/models/`, `database/associations/` y `.sequelizerc`.
7. **Quitar `sequelize.sync()` del arranque.** Si se queda junto a las migraciones van a pelear y se pierde tiempo persiguiendo diferencias fantasma.

**Aceptación:** el cliente web funciona sin ningún cambio. Guardar las respuestas de los endpoints principales antes de empezar y compararlas al terminar: deben ser idénticas, campo por campo. §2.7 y §2.10 quedan cerrados.

### Fase 2 — Blindaje

**Objetivo:** cerrar los agujeros de seguridad y validación sobre el código ya migrado.

1. Esquemas `zod` en `src/schemas/` y `middleware/validate.js` aplicado a todos los endpoints existentes (§2.5).
2. `express-rate-limit` en `/auth/login` y `/auth/register`.
3. Cerrar el registro público detrás de `ALLOW_PUBLIC_REGISTRATION` (§2.4).
4. Traducción de errores de Prisma a los códigos de §4.

**Aceptación:** un `POST` sin `password`, con `monto` negativo o con `tipo` inválido devuelve `400` con el formato de §4, no un `500`. Once intentos seguidos de login devuelven `429`.

### Fase 3 — Esquema nuevo

**Objetivo:** el cambio estructural. Es el único paso irreversible.

1. Escribir el `schema.prisma` completo de §5.
2. Generar la migración y revisarla **a mano** antes de aplicarla. Agregar por SQL el `CHECK (amount > 0)` que Prisma no genera (§3.1).
3. Script de migración de datos con la conversión de §11, dentro de una transacción.
4. Registrar el saldo de cada cuenta **antes** de migrar; verificar al terminar que coincide exactamente con el calculado por §3.3. Si alguno difiere, revertir.
5. Extensión de soft delete de §3.2.
6. Sembrar el catálogo de categorías (§10).
7. Dejar `movimientos` renombrada a `movimientos_legacy`. Borrarla cuando la app nueva lleve un mes en uso.

**Aceptación:** los saldos de todas las cuentas son idénticos antes y después, verificado fila por fila. La base está en el esquema de §5 y el histórico completo es consultable.

### Fase 4 — API nueva

**Objetivo:** los endpoints de §7, montados **junto** a los viejos y no encima. El cliente web sigue funcionando con `/movimientos` mientras se construye.

1. `services/` con la composición de asientos y el invariante de §6.2.
2. Endpoints en este orden, cada uno con sus tests: `accounts` y `summary` → `operations` → `categories` → conciliación → `recurring-rules`.
3. Auth con access y refresh tokens (§7.1).
4. Tests de integración con Vitest y Supertest sobre base de pruebas. Prioridad: el invariante de §6.2, el aislamiento entre usuarios, el cálculo de saldos, la paginación por cursor y las validaciones de §6.3.
5. Retirar las rutas viejas cuando la app móvil las reemplace.

**Aceptación:** toda la funcionalidad de `LOGICA_NEGOCIO.md` es alcanzable desde la API nueva, con tests en verde. Un intento de crear una operación que rompa la ecuación de control devuelve `400`.

### Fase 5 — Operación

**Objetivo:** lo que hace falta para que la app móvil viva en un teléfono real.

1. Job de recurrentes con `node-cron` y envío de push por Expo.
2. `POST /devices` y `GET /sync`.
3. `compression` y `ETag` en los listados.
4. Backup automático programado.
5. Reporte de errores con la versión del cliente móvil.

**Aceptación:** una regla recurrente en modo recordatorio genera su ocurrencia sin duplicar aunque el job corra dos veces. La segunda mitad de esta aceptación, que la notificación llegue al dispositivo, se retiró el 2026-08-15 al sacar el push del alcance de la app: no hay dispositivo al que llegar.

---

## 13. Consideraciones para React Native + Expo

- **Token en `expo-secure-store`**, no en `AsyncStorage`. El patrón actual de `localStorage` no se traslada.
- **CORS deja de aplicar**: las peticiones nativas no envían `Origin`. `CORS_ORIGIN` solo sigue haciendo falta si se mantiene un cliente web.
- **Idempotencia**: en red móvil un `POST` puede expirar por timeout habiéndose aplicado. `POST /operations` acepta `Idempotency-Key`; una clave repetida devuelve la operación ya creada en vez de duplicarla.
- **Payload liviano**: `GET /operations` devuelve `accountId` y el nombre, no el objeto cuenta completo. El cliente resuelve el resto contra la lista que ya tiene cacheada.
- **Versión del cliente**: cabecera `X-Client-Version` y respuesta `426` cuando una versión queda obsoleta. Actualizar una app instalada no es instantáneo como recargar una web.
- **Reloj del dispositivo**: la `date` la manda el cliente y puede venir de un reloj desajustado. Rechazar fechas más de 24 horas en el futuro.

---

## 14. Decisiones tomadas

No quedan decisiones abiertas. El backend se puede desarrollar tal como está especificado.

| Decisión | Resolución | Implicación |
|---|---|---|
| ORM | **Prisma**, se elimina Sequelize | `schema.prisma` como fuente de verdad; resuelve §2.7 y §2.10 de entrada. Fase 1 |
| Cálculo de saldos | **Siempre calculado**, nunca almacenado | Un saldo guardado se desincroniza y esta app existe para detectar descuadres, no para crearlos (§3.3) |
| Monto de los asientos | **Firmado** | Elimina el `CASE WHEN` y todo el SQL crudo; el saldo es un `SUM` con la API tipada (§3.3) |
| Tipo `liability` | Se agrega | Cuarto valor del enum de `accounts.type`; entra en la ecuación con su signo natural |
| Categoría | **Opcional** | `categoryId` nullable. Los reportes agrupan lo no categorizado como "Sin categoría", separado de los ajustes |
| Moneda | **Solo COP** | `currency` existe con default fijo y ningún código ramifica sobre él. Sin tasas ni conversión |
| Conciliación | **Pasiva** | Sin notificaciones. `lastReconciledAt` se muestra en el dashboard y el usuario concilia cuando quiere |
| Histórico | **Se conserva** | Cada movimiento migra como operación `legacy` de un solo asiento (§11) |
| Recurrentes | Dos modos | `auto` registra la operación; `reminder` la deja en `pending`. El aviso es pasivo desde el 2026-08-15: la app no notifica nada |
