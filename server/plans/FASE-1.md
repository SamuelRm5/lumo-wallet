# Fase 1 - Prisma sobre el esquema actual

## Objetivo

Cambiar de ORM sin cambiar el esquema ni el contrato de la API (`docs/BACKEND.md` §12, Fase 1). Es un refactor puro, y por eso es verificable campo por campo.

## Precondiciones

- Fase 0 cerrada.
- `server/plans/.snapshots/` con las respuestas de referencia capturadas.
- Base local restaurada desde el backup de producción, para introspectar contra datos reales.

---

## Pasos

### 1. Instalar y configurar

```bash
cd server
npm install @prisma/client
npm install -D prisma
```

Agregar a `.env` y a `.env.example`:

```
DATABASE_URL="mysql://usuario:password@host:3306/base"
```

`config/env.js` pasa a exigir `DATABASE_URL` y a marcar las seis `DB_*` como obsoletas pero todavía requeridas: Sequelize sigue vivo hasta el paso 6.

### 2. Introspección

```bash
npx prisma init --datasource-provider mysql --skip-generate   # solo crea prisma/
npx prisma db pull
```

Revisar el `schema.prisma` generado. Lo que hay que esperar, dado el estado real del código:

- **No hay `updatedAt` en ninguna tabla.** `models/index.js` define `timestamps: false` globalmente y cada modelo declara `createdAt` a mano. Prisma reflejará exactamente eso. Agregar `updatedAt` es un cambio de esquema y pertenece a la Fase 3.
- **`monto` es `Int`, no `Decimal`.** La conversión a `Decimal(14,2)` es de la Fase 3.
- **`estado` sale como `enum` de MySQL** (`activo` / `inactivo`) en las tres tablas. Se conserva tal cual; la traducción a `deletedAt` es de la Fase 3.
- Los nombres siguen en español. Se puede añadir `@@map` / `@map` para exponerlos en inglés desde el cliente de Prisma, pero **no se hace en esta fase**: mezcla el refactor de ORM con el de nombres y rompe la propiedad de "cero cambios visibles".
- Prisma puede nombrar relaciones e índices distinto de lo que hay. Se ajustan los nombres en el esquema, no en la base.

### 3. Baseline de migraciones

La base ya existe y tiene datos, así que la primera migración se marca como aplicada en lugar de ejecutarse:

```bash
mkdir -p prisma/migrations/0_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init
```

Comprobar que la base queda limpia frente al esquema:

```bash
npx prisma migrate status   # "Database schema is up to date"
```

Desde aquí, todo cambio de esquema pasa por `prisma migrate dev`. Es el punto en que §2.10 queda cerrado.

### 4. `src/config/prisma.js`

Instancia única de `PrismaClient`, creada aquí e importada donde haga falta. Nunca un cliente por módulo: es la regla que el código actual incumple con `loadModels()` (§2.7). El nivel de log del cliente se toma de `LOG_LEVEL`.

En desarrollo, guardar la instancia en `globalThis` para que el recargado de nodemon no abra una conexión nueva en cada reinicio.

### 5. Reescribir los controladores, uno por uno

Orden: `auth` → `cuentas` → `movimientos`. Después de cada uno, comparar contra la captura correspondiente antes de seguir.

Traducciones que hay que resolver:

| Hoy | Con Prisma |
|---|---|
| `Cuentas.findAll` + `include` con `SUM(CASE WHEN ...)` | `prisma.movimientos.groupBy({ by: ["cuentaId"], _sum: { monto: true } })` y cruce en memoria, o `$queryRaw` tipado si el volumen lo pidiera (no lo pide) |
| `findAndCountAll` con `limit` / `offset` | `$transaction([findMany, count])`. La paginación por cursor es de la Fase 4 |
| `Op.between` | `gte` / `lte` con los helpers de `lib/date.js` |
| `usuario.save()` tras mutar campos | `prisma.usuarios.update` |
| `movimiento.update({ estado: "inactivo" })` | `prisma.movimientos.update` con el mismo campo |

**Decisión sobre `cuenta.total`.** Hoy Sequelize devuelve la suma como **string** y `client/src/pages/Home.jsx` la pasa por `parseInt`. Prisma devuelve un número. El cliente tolera ambos, pero la aceptación de esta fase exige respuestas idénticas: se serializa `total` como string para que la comparación sea exacta, y se anota como deuda a eliminar en la Fase 4, donde `GET /accounts` define `balance` como número desde el principio (`docs/BACKEND.md` §7.2).

El cálculo de saldos deja de usar `literal('CASE WHEN tipo = "ingreso" ...')`, que depende de que MySQL no tenga `ANSI_QUOTES` activo. Cierra §2.9.

### 6. Retirar Sequelize

```bash
npm uninstall sequelize mysql2
rm -rf src/database/models src/database/associations
rm .sequelizerc
```

`.sequelizerc` apunta a `src/database/config/config.js`, un archivo que no existe: es configuración muerta desde hace tiempo.

**Quitar `sequelize.sync()` del arranque.** Si convive con las migraciones, las dos van a pelear por el esquema y se pierde tiempo persiguiendo diferencias fantasma. Es el paso que no se puede olvidar.

Las seis variables `DB_*` salen de `config/env.js` y de `.env.example`.

---

## Aceptación

1. `npx prisma migrate status` reporta la base al día.
2. Las capturas de `.snapshots/` repetidas contra el servidor migrado son **idénticas campo por campo**:
   ```bash
   diff <(jq -S . .snapshots/00-cuentas.json) <(jq -S . .snapshots/10-cuentas.json)
   ```
3. El cliente web funciona sin ningún cambio: login, dashboard, listado, crear, editar y borrar.
4. `grep -rn "sequelize" server/src/` no devuelve nada.
5. Los saldos por cuenta coinciden con la consulta SQL de referencia tomada en la Fase 0.
6. §2.7, §2.9 y §2.10 quedan cerrados en `docs/BACKEND.md` §2.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| `db pull` genera un esquema que no refleja fielmente la base | Revisar el SQL de `0_init` a mano y compararlo con `SHOW CREATE TABLE` de las tres tablas |
| `migrate resolve` mal aplicado deja la base creyendo que una migración corrió | Se trabaja contra la base local restaurada, no contra producción |
| Diferencias sutiles de serialización (fechas, números) rompen el cliente en silencio | Es exactamente lo que detecta el `diff` de las capturas |
| Un enum de MySQL introspectado con otro nombre provoca una migración destructiva más adelante | Revisar los nombres de enum en `0_init` antes de resolver la baseline |

Reversión: mientras no se ejecute ninguna migración contra la base, la fase es solo código. `git revert` y reinstalar `sequelize` y `mysql2` restaura el estado anterior.

---

## Fuera de alcance

- Cambiar nombres de tablas o columnas al inglés. Fase 3.
- Agregar `updatedAt`, `deletedAt`, `Decimal` o el tipo `liability`. Fase 3.
- Paginación por cursor y el envelope `{ data, meta }`. Fase 4.
- La extensión de soft delete de `docs/BACKEND.md` §3.2, que asume `deletedAt`. Fase 3.
- Validación con `zod` de los request. Fase 2.

---

## Desviaciones

- Se serializa `cuenta.total` como string para preservar la respuesta byte a byte, en contra de la forma natural de Prisma. Deuda declarada, se retira en la Fase 4.
