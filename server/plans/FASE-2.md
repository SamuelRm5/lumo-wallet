# Fase 2 - Blindaje

## Objetivo

Cerrar los agujeros de seguridad y validación sobre el código ya migrado a Prisma (`docs/BACKEND.md` §12, Fase 2).

## Precondiciones

- Fase 1 cerrada: los tres controladores corren sobre Prisma y el cliente web funciona igual.

---

## Pasos

### 1. `src/middleware/validate.js`

Middleware genérico que recibe `{ body, params, query }` con esquemas `zod` y valida lo que corresponda. En caso de fallo lanza un `AppError` con código `VALIDATION_ERROR` y `details` construido desde `error.issues`, con `path` y `message` por campo. Nada llega al controlador sin validar.

Reemplaza la salida parseada en `req`: `zod` normaliza tipos (`page` de string a número, por ejemplo) y el controlador debe consumir el valor normalizado, no el crudo.

### 2. Esquemas en `src/schemas/`

Un archivo por recurso. Inventario de los 18 endpoints actuales:

**`auth.schema.js`**

| Endpoint | Validación |
|---|---|
| `POST /auth/register` | `nombre` 1-100, `email` válido, `password` mínimo 8 |
| `POST /auth/login` | `email` válido, `password` no vacío |
| `PUT /auth/profile` | `nombre?` 1-100, `email?` válido; al menos uno |
| `PUT /auth/change-password` | `currentPassword` no vacío, `newPassword` mínimo 8 y distinto del actual |

Las comprobaciones que hoy están dentro de `changePassword` (campos requeridos, longitud mínima) salen del controlador y pasan al esquema. La regla de "distinta a la actual" se queda en el controlador: necesita el hash.

Nota: hoy el mínimo es 6 caracteres. Subirlo a 8 invalida contraseñas existentes solo al cambiarlas, nunca al iniciar sesión, porque el login no valida longitud.

**`cuentas.schema.js`**

| Endpoint | Validación |
|---|---|
| `GET /cuentas/tipo/:tipo` | `tipo` en `normal` / `deuda` / `fuente` |
| `GET /cuentas/:id`, `PUT`, `DELETE` | `id` entero positivo |
| `POST /cuentas` | `nombre` 1-100, `descripcion?` máx 255 y **nullable**, `tipo` del enum |
| `PUT /cuentas/:id` | los mismos, todos opcionales |

Aquí se arregla el `campo || cuenta.campo` de `updateCuenta`: con `zod`, `undefined` (no enviado) y `""` (vaciar) son distinguibles, y hoy no lo son. Enviar `descripcion: ""` debe borrar la descripción.

**`movimientos.schema.js`**

| Endpoint | Validación |
|---|---|
| `GET /movimientos/search/date-range` | `fechaInicio` y `fechaFin` ISO obligatorias, `fechaInicio <= fechaFin`, `cuentaId?` entero, `tipo?` en `ingreso`/`egreso`, `page?` entero ≥ 1 |
| `GET /movimientos/:cuentaId` | `cuentaId` entero, `page?` entero ≥ 1 |
| `POST /movimientos/:cuentaId` | `tipo` del enum, `monto` entero **> 0**, `descripcion?` máx 255, `createdAt?` ISO **no más de 24 h en el futuro** |
| `PUT /movimientos/:id` | los mismos, opcionales |

El límite de fecha futura viene de `docs/BACKEND.md` §13: la fecha la manda el cliente y puede venir de un reloj desajustado. Hoy no hay ninguna comprobación y se puede grabar un movimiento en el año 3000.

`monto > 0` estricto es el invariante de `docs/LOGICA_NEGOCIO.md` §9.2. Hoy un monto negativo entra sin problema y corrompe el saldo.

### 3. Filtro de estado activo en las lecturas que faltan

Cierra §2.8 y la variante detectada en `getMovimientos`:

- `getMovimiento`, `updateMovimiento` y `deleteMovimiento` no filtran `estado: "activo"`: un movimiento borrado se puede leer, editar y volver a borrar.
- `getMovimientos` busca la cuenta sin `estado: "activo"`, así que una cuenta archivada sigue devolviendo movimientos y balance.

Las cuatro son de una línea cada una y son de seguridad de datos, no de estilo.

### 4. Rate limiting

`express-rate-limit` en `POST /auth/login` y `POST /auth/register`, con ventana y máximo desde `RATE_LIMIT_AUTH_WINDOW_MIN` y `RATE_LIMIT_AUTH_MAX` (`docs/BACKEND.md` §8). Al superarse devuelve `429` con código `RATE_LIMITED` en el formato del catálogo, no el texto por defecto de la librería.

Clave por IP. Detrás de un proxy hay que fijar `app.set("trust proxy", 1)` o el límite se aplica a la IP del proxy y afecta a todos por igual.

### 5. Registro público cerrado

`POST /auth/register` queda detrás de `ALLOW_PUBLIC_REGISTRATION`, con default `false` (§2.4). Con la bandera apagada devuelve `403` `FORBIDDEN`. Es una app familiar: el registro abierto no aporta y sí permite llenar la base.

Antes de apagarlo hay que confirmar que todos los usuarios previstos ya existen; si no, se crean con la bandera encendida y se apaga después.

### 6. Traducción de errores de Prisma

En `middleware/errorHandler.js`, mapear los errores conocidos al catálogo de `docs/BACKEND.md` §4:

| Prisma | Código | HTTP |
|---|---|---|
| `P2002` unicidad | `CONFLICT` | 409 |
| `P2025` registro no encontrado | `NOT_FOUND` | 404 |
| `P2003` clave foránea | `VALIDATION_ERROR` | 400 |
| Cualquier otro | `INTERNAL` | 500 |

El mensaje al cliente es genérico y en español; el detalle de Prisma va solo al log con el `requestId`.

---

## Aceptación

1. `POST /auth/login` sin `password` devuelve `400` con el formato de §4 y `details` nombrando el campo, no `500`.
2. `POST /movimientos/1` con `monto: -500` devuelve `400`.
3. `POST /movimientos/1` con `tipo: "otro"` devuelve `400`.
4. `POST /movimientos/1` con `createdAt` a un año vista devuelve `400`.
5. Once intentos seguidos de login devuelven `429` con `code: "RATE_LIMITED"`.
6. Con `ALLOW_PUBLIC_REGISTRATION=false`, `POST /auth/register` devuelve `403`.
7. Registrar un email ya existente devuelve `409`, no `400` ni `500`.
8. `GET /movimientos/byid/:id` de un movimiento borrado devuelve `404`.
9. `PUT /cuentas/:id` con `descripcion: ""` deja la descripción vacía.
10. El cliente web sigue funcionando: sus request actuales pasan todas las validaciones.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| Una validación más estricta rompe una pantalla del cliente web | Recorrer `client/src/services/api.js` y comprobar cada payload contra su esquema antes de activar |
| El rate limit deja fuera al usuario legítimo en desarrollo | Ventana y máximo por variable de entorno; en `development` se puede subir |
| Cerrar el registro deja a alguien sin cuenta | Verificar la lista de usuarios en la base antes de apagar la bandera |
| El mínimo de contraseña sube a 8 y frustra un cambio de contraseña | Es intencional y solo afecta al cambio, nunca al login |

Reversión: solo código. `git revert` de la fase.

---

## Fuera de alcance

- Access y refresh tokens. Fase 4: los tokens actuales de 30 y 365 días siguen vigentes hasta entonces.
- Cambios de esquema de cualquier tipo. Fase 3.
- Tests automatizados. Fase 4.
- Idempotencia de `POST`. Fase 4.

---

## Desviaciones

- El plan de `docs/BACKEND.md` §12 no menciona el filtro de estado activo ni el arreglo de `updateCuenta`. Se incluyen aquí porque son de una línea y la fase ya recorre esos mismos archivos.
- **`filtros.cuentaId` se sigue devolviendo como texto.** Al coaccionar `cuentaId` a número, `zod` cambiaba el tipo de ese campo en la respuesta. `filtros` es un eco de lo que pidió el cliente, así que se convierte de vuelta a texto para no alterar el contrato.
- **El arreglo de "campo vacío no borra" se aplicó también a `updateMovimiento`**, no solo a `updateCuenta`: tenía el mismo patrón con `??`.
- **Se reordenaron las rutas** para que las de prefijo literal (`/byid/:id`) se declaren antes que las paramétricas (`/:cuentaId`). Funcionaba por el número de segmentos, pero dependía de una coincidencia, no de una regla.

---

## Estado de ejecución

Cerrada. 20 comprobaciones nuevas en verde y las 26 de la Fase 1 sin regresión:

- `POST /auth/login` sin `password` devuelve `400` con `details` señalando `body.password`.
- `monto` negativo, `monto` cero, `tipo` fuera del enum, `id` no numérico, rango de fechas invertido y formato de fecha inválido: todos `400`.
- `createdAt` a un año vista se rechaza; dentro de la hora siguiente se acepta.
- `PUT /cuentas/:id` con `descripcion: ""` la deja en `null`; sin el campo, la conserva.
- Leer, editar o volver a borrar un movimiento ya borrado devuelve `404`. Lo mismo con una cuenta archivada y sus movimientos.
- `POST /auth/register` con la bandera apagada devuelve `403 FORBIDDEN`.
- Los intentos repetidos de login acaban en `429 RATE_LIMITED` con el formato del catálogo.
- Las capturas de `.snapshots/` siguen idénticas a las de la Fase 1.

Nota operativa: `ALLOW_PUBLIC_REGISTRATION` está en `false`. Para dar de alta un usuario nuevo hay que ponerla en `true`, registrarlo y volver a apagarla.
