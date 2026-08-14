# Lumo Wallet

Aplicación de finanzas personales/familiares. Monorepo con dos paquetes independientes:

- `server/` — API REST en Node.js + Express + MySQL con Prisma. Las cinco fases de `docs/BACKEND.md` §12 están ejecutadas; el detalle está en `server/plans/`.
- `client/` — Cliente web viejo en React 19 + Vite. Habla el contrato anterior, que ya no existe. Se archiva; lo reemplaza una app React Native + Expo.

Documentación, en orden de autoridad:

| Documento | Qué contiene |
|---|---|
| `docs/LOGICA_NEGOCIO.md` | Definición funcional. Manda sobre todo lo demás |
| `docs/BACKEND.md` | Modelo de datos, contrato de la API y plan de ejecución |
| `docs/CONTEXTO_PROYECTO.md` | Obsoleto. Referencia histórica, contiene errores |

---

## Convenciones obligatorias

### Idioma del código

- **Todos los identificadores en inglés**: variables, funciones, clases, archivos, campos de modelos, nombres de tablas y columnas, rutas de la API, claves de request y response, ramas de git.
- **Comentarios en español**, y solo cuando aportan información que el código no expresa: qué hace una función no evidente, por qué se tomó una decisión, qué regla de negocio aplica. Nada de comentarios que repiten la línea siguiente.
- Los textos visibles para el usuario final (mensajes de error de la API, etiquetas de UI) van en español.

```js
// Calcula el saldo de la cuenta sumando ingresos y restando egresos
const calculateBalance = transactions => { ... };
```

El código del servidor ya está en inglés. Lo único que conserva el español son las tablas `*_legacy`, que son el modelo anterior congelado, y el cliente web, que se archiva.

### Estilo

- Sin emojis en código, comentarios, documentación, mensajes de commit ni respuestas.
- Sin referencias a conversaciones con asistentes, sin marcas de "NUEVO", "ACTUALIZADO", "DONE" ni banderas de estado dentro del código. Eso lo cuenta el historial de git.
- Sin resúmenes ni celebraciones al final de los documentos.
- Indentación con tabs en `server/`, dos espacios en `client/` (respetar lo que ya existe en cada archivo).
- `PascalCase` para componentes y clases, `camelCase` para variables y funciones, `SCREAMING_SNAKE_CASE` para constantes de entorno.

### Git

- Commits sin `Co-Authored-By` ni ninguna otra firma. El único autor es `samuelrm5`.
- Mensajes en formato convencional y en inglés: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.
- Una línea de asunto en imperativo, máximo 72 caracteres. Cuerpo solo si aporta contexto no evidente.
- No hacer commit ni push salvo petición explícita.

### Respuestas

- Directo al punto. Sin repetir la petición, sin resumir lo ya dicho, sin listas de "lo que hice" cuando el diff ya lo muestra.
- Extenderse solo cuando se pida explícitamente.
- Si algo no se pudo completar, decirlo con claridad y explicar por qué.

---

## Arquitectura

### Modelo de dominio

Un evento real es una `operation` con exactamente dos `entries`, uno por cada cuenta que toca. El cliente nunca envía asientos: manda la operación y el servidor deriva las dos filas con el signo aplicado.

La definición funcional completa está en `docs/LOGICA_NEGOCIO.md` y manda sobre cualquier otro documento. Resumen:

Las cuentas tienen un tipo que define su semántica financiera:

- `source` — lo que **debería** haber: plata que entró y aún no se gasta. Es la contrapartida de control, no contiene plata.
- `cash` — lo que **hay**: plata líquida (bancos, efectivo).
- `receivable` — lo que **me deben**: cuentas por cobrar, plata mía en manos de otro.
- `liability` — lo que **yo debo**: tarjetas y créditos.

Cuidado: `receivable` es *plata que a ti te deben*. El histórico la traía con el signo invertido y la migración lo corrigió (`docs/BACKEND.md` §11.1). La descripción de `CONTEXTO_PROYECTO.md` ("tarjetas, préstamos") es incorrecta y ese documento está obsoleto.

El saldo nunca se almacena: es la suma de los asientos de operaciones vivas y confirmadas.

Ecuación de control: `Σ signed(asientos) = 0`, donde las cuentas `source` cuentan con signo invertido. Se verifica **antes** de escribir; una operación que la rompe se rechaza con `400`. Como la app escribe ambos asientos, el descuadre ya no puede aparecer solo: el control real es la **conciliación**, donde el usuario informa el saldo verdadero de un depósito y la diferencia se registra como ajuste.

### Reglas transversales del backend

- **Soft delete**: nada se borra. Se marca `deletedAt` y una extensión de Prisma (`config/prisma.js`) inyecta el filtro en toda lectura. El escape sin filtro es `prismaIncludingDeleted`, y solo lo usa `GET /sync`.
- **Aislamiento por usuario**: cada query filtra por el usuario del token. Un endpoint que no filtre es un bug de seguridad, y cada uno tiene un test que lo comprueba.
- **Cálculos en el servidor**: balances y totales se resuelven en SQL, no en el cliente.
- **Ningún objeto de Prisma llega a `res.json()` sin pasar por `lib/serialize.js`**, o los `Decimal` salen como objeto.
- Rutas versionadas bajo `/api/v1`.

### Estructura del servidor

```
server/
  prisma/schema.prisma       Única fuente de verdad del esquema
  prisma/migrations/         Generadas y aplicadas con prisma migrate
  scripts/                   Respaldo y verificación de la restauración
  plans/                     Ejecución de cada fase, con su estado
  tests/                     Vitest y Supertest sobre una base propia
  src/
    index.js                 Arranque: conexión, servidor y job
    app.js                   Express sin listen, para poder testear
    config/                  env.js y prisma.js
    middleware/
    schemas/                 Esquemas zod por recurso
    services/                La lógica de dominio vive aquí
    controllers/             Solo traducen HTTP a llamadas de servicio
    v1/routes/
    jobs/recurring.job.js
    lib/                     errors, cursor, date, serialize
```

---

## Comandos

```bash
# Backend
cd server && npm run dev      # nodemon
cd server && npm start        # producción
cd server && npm test         # vitest, recrea y migra la base de pruebas

# Esquema
cd server && npx prisma migrate deploy
cd server && npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script

# Respaldo y verificación de que se puede restaurar
cd server && sh scripts/backup.sh
cd server && sh scripts/restore-check.sh
```

Los tests corren contra `lumo_wallet_test`, que se borra y se recrea en cada ejecución. Se lanzan desde `server/`: fuera de ahí no encuentran `vitest.config.js` y fallan todos.

## Variables de entorno

`server/.env.example` refleja la lista exacta que valida `src/config/env.js` al arrancar. Si falta una obligatoria el proceso no arranca. `DATABASE_URL` es una sola variable, no las seis `DB_*` de antes, y la leen tanto el servidor como el CLI de Prisma.

---

## Señalar mejoras

Este proyecto se escribió hace tiempo y tiene decisiones que hoy se tomarían distinto. Si al trabajar en cualquier cosa se encuentra algo mejorable en el código existente, **se dice**. No se arregla en silencio dentro de un cambio que iba de otro tema, y tampoco se deja pasar.

Cómo señalarlo:

- Qué es y dónde está, con `archivo:línea`.
- Por qué importa, con números reales cuando sea de rendimiento. "Esto es lento" no sirve; "esto recorre N filas y a este volumen son 12.000 en diez años" sí.
- Qué costaría cambiarlo y qué se rompería.
- Una recomendación explícita, **incluida la de no tocarlo**.

**Mejorable no significa que haya que cambiarlo.** El caso de referencia es el cálculo de saldos: sumar todos los asientos cada vez parece candidato obvio a optimizar con una columna de saldo almacenado, y la respuesta correcta es dejarlo como está. A este volumen la suma es de microsegundos, y un saldo guardado se desincroniza en silencio, que es exactamente el error que esta app existe para detectar. El razonamiento completo está en `docs/BACKEND.md` §3.3.

Lo ya catalogado está en `docs/BACKEND.md` §2, con su estado. Si aparece algo nuevo, se agrega ahí; no se queda solo en la conversación.

## Al trabajar en este repo

- Antes de agregar un endpoint, revisar `docs/BACKEND.md`: puede que ya esté planificado con una forma concreta.
- El objetivo actual es preparar el backend para una app React Native + Expo. Priorizar contratos estables, respuestas ligeras y campos que permitan sincronización incremental.
- La UI web actual es descartable. No invertir esfuerzo en ella salvo petición explícita.
- El esquema lo gobiernan las migraciones de Prisma. Nada de tocar tablas a mano: un cambio empieza en `prisma/schema.prisma` y sigue con una migración.
- Las tablas `*_legacy` guardan el modelo anterior y se borran con su propia migración un mes después de la Fase 3.
- Los saldos se calculan siempre, nunca se almacenan en una columna. No introducir un campo de saldo ni un caché de saldo sin leer antes `docs/BACKEND.md` §3.3.
