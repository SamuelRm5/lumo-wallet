# Fase 3 - Esquema nuevo

## Objetivo

El cambio estructural: pasar del esquema de tres tablas en español al modelo de `docs/BACKEND.md` §5, migrando el histórico según §11 (`docs/BACKEND.md` §12, Fase 3).

**Es la única fase irreversible.** Todo lo demás son commits; esto reescribe la base.

## Precondiciones

- Fase 2 cerrada.
- Backup de producción **del día**, restaurado y verificado en local. No vale el de la Fase 0.
- La consulta de saldos por cuenta ejecutada y su salida guardada. Es la referencia contra la que se verifica al terminar.
- El ensayo completo hecho al menos una vez sobre la copia local, de principio a fin, con la verificación de saldos en verde.

---

## Pasos

### 1. `prisma/schema.prisma` completo

Escribir el modelo de `docs/BACKEND.md` §5: `users`, `accounts`, `categories`, `operations`, `entries`, `recurring_rules`, `devices`, `refresh_tokens`. Nombres de tabla en plural con `@@map`, campos en camelCase.

Cambios de tipo respecto a lo que hay hoy, que la introspección de la Fase 1 dejó documentados:

| Hoy | Nuevo | Nota |
|---|---|---|
| `movimientos.monto INT` | `operations.amount DECIMAL(14,2)` y `entries.amount DECIMAL(14,2)` | Ampliación, sin pérdida. `entries.amount` va **firmado** (§3.3) |
| `estado ENUM('activo','inactivo')` | `deletedAt DATETIME NULL` | Ver paso 4 |
| sin `updatedAt` | `updatedAt` en todas las tablas mutables | `timestamps: false` de Sequelize nunca lo creó |
| `cuentas.tipo ENUM('normal','deuda','fuente')` | `accounts.type ENUM('source','cash','receivable','liability')` | Ver paso 3 |

`users.status` se conserva como enum (`active` / `disabled`): un usuario deshabilitado no es un usuario borrado.

### 2. Generar y revisar la migración

```bash
npx prisma migrate dev --create-only --name new_schema
```

`--create-only` es obligatorio: hay que leer el SQL **antes** de aplicarlo. Qué buscar:

- Ningún `DROP TABLE` ni `DROP COLUMN` que se lleve datos por delante. Si Prisma propone recrear una tabla en vez de alterarla, se reescribe el SQL a mano.
- Que los renombrados sean `RENAME`, no `DROP` + `CREATE`.
- Que las claves foráneas queden con el `ON DELETE` que declara el esquema.

Agregar a mano, porque Prisma no lo genera (§3.1):

```sql
ALTER TABLE operations ADD CONSTRAINT chk_operations_amount_positive CHECK (amount > 0);
```

`entries.amount` **no** lleva `CHECK`: va firmado y ser negativo es lo normal.

### 3. Traducción de los tipos de cuenta

| Hoy | Nuevo | Motivo |
|---|---|---|
| `fuente` | `source` | Directo |
| `normal` | `cash` | Directo |
| `deuda` | `receivable` | **Cuentas por cobrar: plata que a ti te deben.** `docs/LOGICA_NEGOCIO.md` §3 |
| — | `liability` | Valor nuevo, sin filas al migrar |

El punto de `deuda` a `receivable` no es cosmético. `docs/CONTEXTO_PROYECTO.md` lo describía como "tarjetas y préstamos", que es lo contrario, y el nombre `liability` queda libre justo para eso. Traducirlo mal invierte el signo de todo el dashboard.

Antes de migrar, revisar una por una las cuentas de tipo `deuda` en producción y confirmar que todas son dinero por cobrar. Si alguna resultara ser una deuda propia, se reclasifica **a mano a `liability` después** de migrar, nunca dentro del script.

### 4. Traducción de `estado` a `deletedAt`

`estado = 'activo'` → `deletedAt = NULL`. `estado = 'inactivo'` → `deletedAt` con un valor.

No existe registro de cuándo se dio de baja cada fila: el modelo nunca lo guardó. Se usa **la marca de tiempo del inicio de la migración**, idéntica para todas las filas inactivas, y se documenta en el propio archivo de migración. La alternativa de usar `createdAt` afirmaría que la fila se borró en el instante de crearse, que es falso y contamina los reportes.

Consecuencia asumida: las fechas de borrado anteriores a la migración son todas la misma y no significan nada. Ningún reporte de `docs/LOGICA_NEGOCIO.md` §11 depende de ellas.

### 5. Script de migración de datos

Un solo script, dentro de una transacción, con la conversión de `docs/BACKEND.md` §11. Se ejecuta **después** de la migración de esquema y **antes** de exponer la API nueva.

Orden:

1. **Registrar los saldos de partida** en una tabla temporal:
   ```sql
   CREATE TABLE _balance_check AS
   SELECT c.id AS cuentaId,
          COALESCE(SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END), 0) AS saldo_antes
   FROM cuentas c
   LEFT JOIN movimientos m ON m.cuentaId = c.id AND m.estado = 'activo'
   GROUP BY c.id;
   ```
2. **Usuarios y cuentas**: renombrar tablas y columnas, traducir enums, poblar `currency = 'COP'` y `lastReconciledAt = NULL`.
3. **Categorías**: sembrar el catálogo de `docs/BACKEND.md` §10 para cada usuario existente. Ninguna operación `legacy` queda categorizada: no hay de dónde sacar la categoría.
4. **Operaciones**: una por cada fila de `movimientos`.
   - `kind` = `income` si `tipo = 'ingreso'`, `expense` si `tipo = 'egreso'`
   - `userId` desde `cuentas.usuarioId`
   - `amount` = `monto` (positivo; ya lo es)
   - `date` = `createdAt` de la fila
   - `description` tal cual
   - `origin` = `legacy`, `status` = `confirmed`
   - `categoryId` = `NULL`
   - `deletedAt` según el paso 4
5. **Asientos**: uno por operación, con `accountId` = `cuentaId` y `amount` = `+monto` para ingreso, `−monto` para egreso.

Las operaciones `legacy` tienen **un solo asiento** y por eso no cumplen el invariante de `docs/BACKEND.md` §6.2. Es deliberado: la validación se aplica solo al escribir, nunca al leer.

### 6. Verificación de saldos, fila por fila

Criterio de aceptación duro. Si una sola cuenta difiere en un peso, se revierte todo:

```sql
SELECT b.cuentaId,
       b.saldo_antes,
       COALESCE(SUM(e.amount), 0) AS saldo_despues,
       b.saldo_antes - COALESCE(SUM(e.amount), 0) AS diferencia
FROM _balance_check b
LEFT JOIN entries e ON e.accountId = b.cuentaId
LEFT JOIN operations o ON o.id = e.operationId AND o.deletedAt IS NULL AND o.status = 'confirmed'
GROUP BY b.cuentaId
HAVING diferencia <> 0;
```

Debe devolver **cero filas**. `_balance_check` se borra al terminar la verificación.

### 7. Extensión de soft delete

`prisma.$extends` sobre `account`, `category`, `operation` y `recurringRule`, inyectando `deletedAt: null` en `findMany`, `findFirst`, `findUnique` y `count` (`docs/BACKEND.md` §3.2). Con un escape explícito y nombrado para los dos consumidores que sí necesitan ver lo borrado: el histórico de una cuenta archivada y `GET /sync`.

No se confía el filtro a la disciplina: olvidar un `deletedAt: null` significa contar dinero borrado en un saldo.

### 8. Cierre

Renombrar `movimientos` a `movimientos_legacy` en vez de borrarla. Es la única forma de reconstruir algo si aparece un error semanas después. Se borra cuando la app nueva lleve **un mes** en uso.

---

## Aceptación

1. La consulta del paso 6 devuelve cero filas.
2. Los conteos cuadran: `SELECT COUNT(*) FROM operations WHERE origin = 'legacy'` es igual al número de filas de `movimientos_legacy`, y `entries` tiene exactamente una fila por cada una.
3. `npx prisma migrate status` reporta la base al día.
4. Cada usuario tiene sus 13 categorías sembradas.
5. Ninguna cuenta quedó con `type` fuera del enum nuevo, y ninguna cuenta que era `deuda` quedó como algo distinto de `receivable`.
6. `movimientos_legacy` existe y conserva todas sus filas.
7. Una consulta del cliente de Prisma sin filtro explícito no devuelve registros con `deletedAt` distinto de nulo.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| Se pierden datos en el renombrado de tablas | Revisar el SQL a mano antes de aplicar; ensayo completo en local |
| `deuda` traducido a `liability` en vez de `receivable` | Revisión manual de las cuentas antes de migrar; invierte el dashboard entero |
| Un saldo cambia y no se detecta | La verificación del paso 6 es bloqueante, no informativa |
| La migración falla a mitad | Todo el script de datos va en una transacción; el DDL de MySQL no es transaccional, así que la reversión real es restaurar el backup |
| El cliente web deja de funcionar | Es esperado: sus endpoints siguen vivos pero contra el esquema viejo. La compatibilidad se resuelve en la Fase 4, o se acepta la ventana de indisponibilidad |

**Reversión: restaurar el backup del día.** MySQL no revierte DDL, así que no hay vuelta atrás incremental. Por eso el backup fresco es precondición y no recomendación.

### Ventana de indisponibilidad

Los endpoints actuales (`/cuentas`, `/movimientos`) consultan tablas y columnas que esta fase renombra, así que dejan de funcionar en el momento en que se aplica la migración y hasta que la Fase 4 los reemplace o se adapten. Hay que decidir **antes de empezar** cuál de las dos:

- Aceptar la ventana: la app queda caída entre la Fase 3 y la Fase 4. Es lo más simple para una app de uso familiar.
- Adaptar los controladores viejos al esquema nuevo como paso 9 de esta fase, para que sigan respondiendo igual. Cuesta trabajo que se tira a la basura en la Fase 4.

Recomendación: **aceptar la ventana**, avisando antes, y encadenar las fases 3 y 4 lo más seguido posible.

---

## Fuera de alcance

- Los endpoints nuevos de `docs/BACKEND.md` §7. Fase 4.
- La lógica de composición de asientos. Fase 4: esta fase escribe asientos con un script, no con el servicio.
- Reclasificar cuentas a `liability`. Es una decisión del usuario, a mano, después de migrar.
- Borrar `movimientos_legacy`. Un mes después.

---

## Desviaciones

- `deletedAt` de las filas históricas inactivas lleva la marca de tiempo de la migración, no la fecha real de baja, que nunca se guardó.
- El catálogo de categorías se siembra para los usuarios existentes, no solo al crear usuarios nuevos como dice `docs/BACKEND.md` §10.
- **Se invierte el signo de los asientos de las cuentas `deuda`.** No estaba previsto en `docs/BACKEND.md` §11 y se descubrió al restaurar producción. El razonamiento y los números están en §11.1.
- **`usuarios` y `cuentas` también se renombran a `_legacy`**, no solo `movimientos`. `movimientos_legacy` tiene una clave foránea hacia `cuentas`, así que borrarla dejaría la tabla histórica rota. Las tres se declaran como modelos en `schema.prisma` para que Prisma no las vea como deriva, y se borran juntas con una migración propia al mes.

---

## Verificación de saldos: cuidado con el LEFT JOIN

La primera versión de la consulta de verificación dio 13 cuentas descuadradas y **el error estaba en la consulta, no en la migración**. Vale la pena dejarlo escrito porque es fácil de repetir:

```sql
-- MAL: los asientos de operaciones borradas siguen sumando
LEFT JOIN operations o ON o.id = e.operationId AND o.deletedAt IS NULL
```

Filtrar la tabla derecha de un `LEFT JOIN` dentro del `ON` no elimina filas: conserva la de la izquierda con la derecha en nulo. La condición tiene que ir en el `WHERE`, o el join tiene que ser interno:

```sql
-- BIEN
SELECT SUM(e.amount) FROM entries e
JOIN operations o ON o.id = e.operationId
WHERE e.accountId = a.id AND o.deletedAt IS NULL AND o.status = 'confirmed'
```

Es exactamente el patrón que van a usar todos los cálculos de saldo de la Fase 4.

---

## Estado de ejecución

Migración escrita y **ensayada de principio a fin sobre una copia de producción** (`cuentas_meli_ensayo`, restaurada desde el volcado del 14 de agosto de 2026). No aplicada a producción.

Resultado del ensayo:

| Comprobación | Resultado |
|---|---|
| Cuentas cuyo saldo no cuadra | **ninguna** |
| `discrepancy` con la fórmula documentada, sin `Math.abs` | **0,00** |
| `source` / `cash` / `receivable` | 257.718.000 / 188.089.400 / **+**69.628.600 |
| Filas migradas | 2 usuarios, 27 cuentas, 1.646 operaciones, 1.646 asientos |
| Categorías sembradas | 26 (13 por usuario) |
| `movimientos_legacy` | 1.646 filas intactas |
| Operaciones con borrado suave conservado | 39 |
| `CHECK (amount > 0)` | rechaza un monto negativo |

Deriva contra producción: `prisma migrate diff` devolvió una migración vacía, así que el `schema.prisma` de la Fase 1 reflejaba producción exactamente.

**Pendiente:** aplicarla a producción. Requiere un volcado del día, no el usado en el ensayo, y abre la ventana de indisponibilidad descrita arriba hasta que la Fase 4 reemplace los endpoints.
