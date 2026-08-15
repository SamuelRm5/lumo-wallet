# App móvil - Lumo Wallet

Punto de partida para construir el cliente React Native + Expo. Define **qué secciones tiene la app y con qué endpoints se alimenta cada una**.

No repite las reglas de negocio: las enlaza. `docs/LOGICA_NEGOCIO.md` manda sobre este documento, y `docs/BACKEND.md` §7 es la especificación del contrato. Si algo aquí contradice a esos dos, ellos ganan y esto se corrige.

---

## 1. Situación

El backend está terminado. Las cinco fases de `docs/BACKEND.md` §12 están ejecutadas y su detalle está en `server/plans/`, un documento por fase con su estado. La API cubre toda la funcionalidad de `LOGICA_NEGOCIO.md` y tiene 106 tests en verde.

- `server/` — Node + Express + Prisma + MySQL. Contrato estable bajo `/api/v1`.
- `client/` — cliente web viejo en React + Vite. **Habla el contrato anterior, que ya no existe.** No sirve de referencia ni para copiar componentes; se archiva.
- Base de datos con datos reales migrados: 1.646 movimientos históricos convertidos a operaciones.

Lo que falta para que la app viva en un teléfono no es código de producto: dominio con HTTPS, despliegue y el cron del respaldo. En desarrollo nada de eso hace falta.

### Convenciones del repo

Están en `CLAUDE.md` y aplican igual a la app: identificadores en inglés, comentarios en español y solo cuando aportan lo que el código no dice, sin emojis en ningún sitio, textos de usuario en español, commits convencionales sin firmas.

---

## 2. Dónde vive la app

Carpeta nueva `mobile/` en la raíz del monorepo, al lado de `server/` y `client/`. No se reutiliza `client/`: es otro contrato y otra plataforma, y mezclarlos solo arrastra código muerto.

```
mobile/
  app/            Rutas de expo-router
  src/
    api/          Cliente HTTP y un módulo por recurso
    components/
    hooks/
    store/        Sesión y caché
    lib/          Formato de moneda, fechas, validación
```

Variables de entorno: `EXPO_PUBLIC_API_URL`. En desarrollo apunta a la IP de la máquina en la red local (`http://192.168.x.x:3000`), **nunca a `localhost`**: desde el teléfono, `localhost` es el teléfono. El servidor ya escucha en todas las interfaces.

CORS no aplica: las peticiones nativas no envían `Origin` y la política del mismo origen es del navegador. Solo reaparece si se ejecuta la app con `expo start --web`.

---

## 3. El contrato

Base: `{EXPO_PUBLIC_API_URL}/api/v1`. Todo JSON. `GET /api/health` responde `{"status":"ok"}` sin autenticación y sirve para comprobar conectividad.

### Sesión

`POST /auth/login` devuelve:

```json
{
  "accessToken": "jwt...",
  "refreshToken": "opaco...",
  "expiresIn": 900,
  "user": { "id": 1, "name": "Samuel", "email": "..." }
}
```

- El access token dura **15 minutos** y viaja en `Authorization: Bearer <token>`.
- El refresh token dura 90 días, es opaco y **rotativo**: cada `POST /auth/refresh` lo invalida y entrega uno nuevo. Guardar siempre el último.
- Ante un `401`, refrescar una vez y reintentar la petición. Si el refresh también falla, ir al login.
- Reusar un refresh token ya consumido **cierra todas las sesiones del usuario**. Por eso el refresco tiene que estar serializado: si tres peticiones fallan a la vez con `401`, una sola refresca y las otras esperan. Tres refrescos en paralelo con el mismo token se autoexpulsan.
- Ambos tokens van en `expo-secure-store`, no en `AsyncStorage`.

### Errores

Formato único en toda la API:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos",
    "details": [{ "path": "body.amount", "message": "El monto debe ser mayor que cero" }],
    "requestId": "uuid"
  }
}
```

| Código | HTTP | Qué hacer en la UI |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Mostrar `details` junto al campo; `message` si no hay `details` |
| `UNAUTHENTICATED` | 401 | Refrescar y reintentar; si falla, login |
| `FORBIDDEN` | 403 | Mensaje y volver |
| `NOT_FOUND` | 404 | El recurso no existe o no es del usuario |
| `CONFLICT` | 409 | Requiere confirmación explícita (ver borrado de cuentas) |
| `UPGRADE_REQUIRED` | 426 | Pantalla de bloqueo con enlace a la tienda |
| `RATE_LIMITED` | 429 | Solo en `/auth`. Esperar |
| `INTERNAL` | 500 | Mensaje genérico. `requestId` sirve para buscarlo en el log |

`message` ya viene en español y es mostrable tal cual.

### Formas transversales

- **Colecciones simples**: `{ "data": [...] }`. Cuentas, categorías, recurrentes, dispositivos.
- **Colección paginada**: solo operaciones. `{ "data": [...], "meta": { "nextCursor": "...", "hasMore": true } }`. Paginación por cursor, no por página: insertar una operación mientras se hace scroll no duplica ni salta filas. Se pasa `?cursor=` tal cual llegó.
- **Montos**: números, nunca strings ni objetos. Enteros en COP, sin decimales en la práctica.
- **Fechas**: ISO 8601 **con offset** (`2026-08-05T14:30:00-05:00`). El servidor rechaza fechas a más de 24 h en el futuro, porque el reloj del dispositivo puede estar desajustado. Los rangos (`from`, `to`) aceptan `2026-08-01` y se resuelven en `America/Bogota` incluyendo el día completo.
- **`Idempotency-Key`**: cabecera opcional en `POST /operations`. Generar un UUID por intento de registro y **reutilizarlo en los reintentos**. Repetir la clave devuelve `200` con la operación ya creada en vez de `201` con una segunda. En red móvil un `POST` puede expirar habiéndose aplicado; sin esto el usuario duplica el gasto.
- **`X-Client-Version`**: enviar la versión de la app en cada petición. Por debajo del mínimo configurado en el servidor la respuesta es `426`.
- **`ETag`**: `GET /accounts`, `/categories` y `/summary` responden `304` si se manda `If-None-Match`. Vale la pena aprovecharlo en el arranque.

---

## 4. Secciones y sus endpoints

### 4.1 Acceso

Login, y nada más en el arranque. El registro está cerrado por configuración (`ALLOW_PUBLIC_REGISTRATION=false`) y responde `403`: es una app familiar y las altas se hacen abriendo el flag un momento. La app puede no tener pantalla de registro.

| Acción | Endpoint |
|---|---|
| Iniciar sesión | `POST /auth/login` |
| Refrescar sesión | `POST /auth/refresh` |
| Cerrar sesión | `POST /auth/logout` |
| Usuario actual | `GET /auth/me` |
| Editar nombre o email | `PUT /auth/me` |
| Cambiar contraseña | `PUT /auth/password` |

`PUT /auth/password` cierra **todas** las sesiones, incluida la actual: hay que volver al login después de un cambio exitoso.

### 4.2 Inicio

La pantalla principal. Una sola llamada resuelve el dashboard entero:

`GET /summary`

```json
{
  "currency": "COP",
  "byType": { "source": 0, "cash": 0, "receivable": 0, "liability": 0 },
  "accounts": [
    { "id": 1, "name": "Bancolombia", "type": "cash", "balance": 2600000, "lastReconciledAt": null }
  ],
  "discrepancy": 0
}
```

Qué mostrar:

- **Lo que debería haber** (`byType.source`) contra **lo que hay** (`cash + receivable + liability`).
- **El descuadre** (`discrepancy`). Distinto de cero significa **captura incompleta**, no plata perdida ni sobrante (`LOGICA_NEGOCIO.md` §4). El texto de la UI tiene que decir eso; "te faltan $50.000" es un mensaje incorrecto.
- **`lastReconciledAt` por cuenta.** La conciliación es pasiva por decisión explícita (§12.4): la app **no** notifica ni insiste, solo muestra cuándo se revisó por última vez cada depósito.
- Accesos rápidos a registrar gasto e ingreso, que es la acción más frecuente.

Las operaciones pendientes de confirmar merecen sitio aquí: `GET /operations?status=pending&limit=5`.

### 4.3 Cuentas

| Acción | Endpoint |
|---|---|
| Listar con saldo | `GET /accounts` (`?type=` para filtrar) |
| Detalle | `GET /accounts/:id` |
| Crear | `POST /accounts` |
| Editar | `PUT /accounts/:id` |
| Archivar | `DELETE /accounts/:id` |
| Conciliar | `POST /accounts/:id/reconcile` |

Los cuatro tipos y su significado están en `LOGICA_NEGOCIO.md` §3. Etiquetas para el usuario: `source` es "Fuente", `cash` es "Depósito", `receivable` es "Por cobrar", `liability` es "Deuda". Ojo con el par `receivable`/`liability`: el primero es plata que **te deben**.

**Archivar una cuenta con saldo distinto de cero devuelve `409`.** No es un error a mostrar y ya: es una confirmación. El mensaje trae el saldo, y si el usuario acepta se repite con `DELETE /accounts/:id?force=true`. Borrar sin más produce un descuadre permanente y silencioso.

**Conciliar** es el mecanismo de control central de la app. El usuario informa cuánta plata hay de verdad y el servidor registra la diferencia como ajuste:

```
POST /accounts/:id/reconcile
{ "realBalance": 2550000, "date": "2026-08-05T14:30:00-05:00", "sourceAccountId": 3 }
```

```json
{
  "accountId": 2, "calculatedBalance": 2600000, "realBalance": 2550000,
  "difference": -50000, "lastReconciledAt": "...", "operation": { }
}
```

Con diferencia cero no se crea ninguna operación y solo se actualiza la fecha. Las cuentas `source` no se concilian: devuelven `400`, y la UI no debería ofrecer el botón.

### 4.4 Registrar una operación

El flujo más importante de la app. **El cliente nunca envía asientos**: manda la operación y el servidor deriva las dos filas con su signo y verifica la ecuación antes de escribir.

`POST /operations`, con `Idempotency-Key`. Cuatro formas:

| Tipo | Campos obligatorios | Notas |
|---|---|---|
| `income` | `amount`, `date`, `toAccountId` | Entra a un depósito |
| `expense` | `amount`, `date`, `fromAccountId` | Sale de un depósito o de una cuenta de crédito |
| `transfer` | `amount`, `date`, `fromAccountId`, `toAccountId` | No toca la fuente ni lleva categoría |
| `adjustment` | `amount`, `date`, `accountId`, `direction`, `description` | `direction` es `in` u `out`. Normalmente lo genera la conciliación |

Opcionales: `categoryId`, `description`, `sourceAccountId`.

**`sourceAccountId` se puede omitir si el usuario tiene una sola cuenta fuente**: el servidor la resuelve. Con varias es obligatorio y su ausencia devuelve `400`. La UI debería pedirlo solo en ese caso.

La respuesta incluye los asientos ya resueltos:

```json
{
  "id": 1670, "kind": "expense", "amount": 200000,
  "date": "...", "description": "Mercado", "status": "confirmed", "origin": "manual",
  "category": { "id": 1, "name": "Comida", "icon": "food", "color": null },
  "entries": [
    { "accountId": 3, "amount": -200000, "accountName": "Salario" },
    { "accountId": 2, "amount": -200000, "accountName": "Bancolombia" }
  ]
}
```

Los dos asientos de un gasto son **ambos negativos**, y los de un ingreso ambos positivos. No es un error: lo que suma cero es su contribución a la ecuación, porque las cuentas `source` cuentan invertidas (`LOGICA_NEGOCIO.md` §9.1). Para mostrar "de qué cuenta salió" hay que quedarse con el asiento cuya cuenta no es `source`.

### 4.5 Movimientos

| Acción | Endpoint |
|---|---|
| Listar | `GET /operations` |
| Detalle | `GET /operations/:id` |
| Editar | `PUT /operations/:id` |
| Borrar | `DELETE /operations/:id` |
| Confirmar una pendiente | `POST /operations/:id/confirm` |

Filtros de `GET /operations`: `accountId`, `kind`, `categoryId`, `status`, `from`, `to`, `search`, `limit` (1 a 100, por defecto 20) y `cursor`.

Editar reemplaza los dos asientos en una transacción; cambiar cuenta, monto, tipo o fecha es válido (§10). Borrar es suave: la operación desaparece de listados y saldos pero el registro se conserva.

**`status: "pending"`**: las operaciones que generó una regla recurrente en modo recordatorio. No afectan saldos hasta confirmarlas, y el monto es editable al confirmar, que es justo para lo que existe el modo: `POST /operations/:id/confirm` con `{ "amount": 187500 }` o sin cuerpo si el monto precargado es correcto.

**Las operaciones históricas tienen un solo asiento.** Vienen del modelo anterior, donde cada movimiento era una fila suelta, y llegan con `origin: "legacy"`. La relación entre las dos patas nunca se guardó y no se puede reconstruir (`LOGICA_NEGOCIO.md` §12.5). La UI no puede asumir que `entries` tiene siempre dos elementos.

### 4.6 Categorías

`GET /categories?kind=`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`.

Cada usuario nace con un catálogo sembrado de 13 categorías. `kind` es `income` o `expense` y no se puede cambiar al editar. `icon` es un identificador semántico (`food`, `transport`, `salary`), no el nombre de un icono de una librería concreta: **el mapeo a iconos lo hace la app**. `color` es hexadecimal de seis dígitos o nulo.

Borrar es suave: las operaciones que la usaban la conservan y siguen apareciendo en los reportes históricos.

### 4.7 Recurrentes

`GET /recurring-rules`, `POST /recurring-rules`, `PUT /recurring-rules/:id`, `DELETE /recurring-rules/:id`.

Campos: `name`, `kind` (`income`, `expense`, `transfer`), `amount`, `frequency` (`weekly`, `biweekly`, `monthly`, `yearly`), `dayOfMonth` **o** `dayOfWeek` según la frecuencia, `startDate`, `endDate` opcional, `mode` (`auto` o `reminder`) y las cuentas según el tipo, igual que una operación. Las fechas van como `2026-01-31`, sin hora.

El servidor calcula `nextRunAt` y lo devuelve; la app solo lo muestra. Un job diario genera las ocurrencias. Los dos modos están en `LOGICA_NEGOCIO.md` §8: `auto` registra y avisa, `reminder` deja la operación pendiente y pide confirmación.

Editar una regla no reescribe lo ya generado.

### 4.8 Reportes

`GET /operations/stats?from=2026-01-01&to=2026-12-31`

```json
{
  "income": 5200000, "expense": 3100000, "adjustments": -50000, "net": 2050000,
  "byCategory": [{ "categoryId": 1, "name": "Comida", "kind": "expense", "total": 800000 }],
  "byMonth": [{ "month": "2026-01", "income": 0, "expense": 0, "adjustments": 0 }]
}
```

El servidor ya aplica las tres reglas obligatorias de `LOGICA_NEGOCIO.md` §11: no cuenta los asientos por duplicado, excluye transferencias y deja los ajustes en línea propia. **La app no debe recalcular nada de esto sumando la lista de operaciones**; si lo hace, todas las cifras salen al doble.

Dos líneas que la UI no puede fusionar: `byCategory` con `categoryId: null` es **"Sin categoría"** —plata que sabes en qué se fue pero no clasificaste— y `adjustments` es **"Sin identificar"** —plata que no sabes dónde quedó, detectada al conciliar—. Si la segunda crece mes a mes, la captura se está degradando, y eso es exactamente lo que la app existe para mostrar.

### 4.9 Ajustes y dispositivo

| Acción | Endpoint |
|---|---|
| Registrar el token de push | `POST /devices` |
| Ver dispositivos | `GET /devices` |
| Quitar uno | `DELETE /devices/:id` |

`POST /devices` con `{ "expoPushToken": "ExponentPushToken[...]", "platform": "android" }`, tras pedir permiso de notificaciones. Repetir el mismo token no duplica: lo reasigna. Las notificaciones son **solo** para recurrentes.

> **La app no implementa esto.** El push se retiró del alcance el 2026-08-15: no hace falta un aviso proactivo. El job de recurrentes sigue registrando la operación de una regla `auto` y dejando en `pending` la de una `reminder`; el usuario se entera al abrir la app. Estos tres endpoints y `push.service.js` siguen en pie y probados, pero sin cliente. El detalle está en `mobile/plans/FASE-6.md`.

### 4.10 Sincronización

`GET /sync?since=<ISO>` devuelve el delta de cuentas, categorías y operaciones:

```json
{
  "serverTime": "2026-08-14T20:00:00.000Z",
  "since": null,
  "accounts": { "updated": [], "deleted": [] },
  "categories": { "updated": [], "deleted": [] },
  "operations": { "updated": [], "deleted": [12, 15] }
}
```

Reglas:

- `since` ausente significa sincronización completa. La primera trae el histórico entero.
- `deleted` son solo identificadores: el cliente ya tiene el resto y lo único que necesita es quitarlos. Es la razón de ser del endpoint; ningún otro reporta borrados.
- **Guardar `serverTime` y usarlo como `since` en la siguiente llamada.** Nunca el reloj del dispositivo.

---

## 5. Navegación propuesta

Cuatro pestañas, con el registro como acción central:

```
Inicio        GET /summary
Movimientos   GET /operations
   [ + ]      POST /operations
Reportes      GET /operations/stats
Ajustes       cuentas, categorías, recurrentes, perfil, dispositivos
```

Cuentas vive dentro de Ajustes y también se llega desde el dashboard tocando una cuenta. Es configuración, no consulta diaria.

---

## 6. Lo que la app no debe hacer

Cada punto de esta lista fue una decisión, no una omisión:

- **No calcular saldos.** Nunca se almacenan y siempre los suma el servidor (`BACKEND.md` §3.3). Un saldo calculado en el cliente se desincroniza, que es justo el error que esta app existe para detectar.
- **No agregar reportes sumando operaciones.** Duplica las cifras. Usar `stats`.
- **No componer asientos.** Se manda la operación.
- **No usar el reloj del dispositivo como `since`** ni para fechas de más de 24 h en el futuro: el servidor las rechaza.
- **No guardar tokens en `AsyncStorage`.**
- **No refrescar en paralelo.** El refresh token es de un solo uso y reusarlo cierra todas las sesiones.
- **No presentar el descuadre como dinero perdido.** Es captura incompleta.

---

## 7. Lo que el backend todavía no da

- **El envío real de un push no está verificado, y deja de ser un pendiente.** El código maneja tickets y recibos, pero sin `EXPO_ACCESS_TOKEN` y sin una app instalada no se ha probado contra Expo. Desde el 2026-08-15 el push está fuera del alcance de la app (§4.9), así que esto queda como una capacidad del backend sin usar, no como algo que falte por cerrar.
- **`GET /sync` no pagina** (`BACKEND.md` §2.23). Con 1.668 operaciones son unos 350 KB, ~50 KB comprimidos, una sola vez.
- **`refresh_tokens.deviceId` siempre es `null`**: el login no recibe todavía el dispositivo, así que no se puede cerrar sesión en un teléfono concreto. `issueSession` ya acepta el parámetro; falta pasarlo desde el cliente y exponerlo en `POST /auth/login`.
- **No hay HTTPS ni despliegue.** En desarrollo se trabaja contra la IP local por HTTP; una app compilada exige TLS en Android e iOS.
