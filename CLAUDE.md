# Lumo Wallet

Aplicación de finanzas personales/familiares. Monorepo con dos paquetes independientes:

- `server/` — API REST en Node.js + Express + MySQL. Hoy con Sequelize; migra a Prisma en la Fase 1 de `docs/BACKEND.md` §12.
- `client/` — Cliente web actual en React 19 + Vite (será reemplazado por una app React Native + Expo).

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

El código actual está mayormente en español (`cuentas`, `movimientos`, `monto`, `tipo`, `estado`). Toda línea nueva o modificada se escribe en inglés. La migración completa está descrita en `docs/BACKEND.md`.

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

Tres entidades: usuario, cuenta y movimiento.

La definición funcional completa está en `docs/LOGICA_NEGOCIO.md` y manda sobre cualquier otro documento. Resumen:

Las cuentas tienen un tipo que define su semántica financiera:

- `fuente` — lo que **debería** haber: plata que entró y aún no se gasta. Es la contrapartida de control, no contiene plata.
- `normal` — lo que **hay**: plata líquida (bancos, efectivo).
- `deuda` — lo que **me deben**: cuentas por cobrar, plata mía en manos de otro.

Cuidado: `deuda` significa *plata que a ti te deben*, no plata que tú debes. Por eso el dashboard la suma dentro de "Lo que hay". La descripción de `CONTEXTO_PROYECTO.md` ("tarjetas, préstamos") es incorrecta y ese documento está obsoleto.

Los movimientos son `ingreso` o `egreso` y pertenecen a una cuenta. El saldo nunca se almacena: se calcula como `SUM(ingresos) - SUM(egresos)` sobre los movimientos activos.

Ecuación de control del dashboard: `normal + |deudas| - fuentes = 0`. Un resultado distinto de cero significa **captura incompleta**, no plata sobrante o faltante.

Un evento real (un gasto, un ingreso) afecta siempre **dos** cuentas: la fuente y la cuenta donde está la plata. Hoy el usuario los registra a mano por separado; el rediseño los convierte en una sola operación con dos asientos.

Con la app escribiendo ambos asientos, la ecuación no puede descuadrar y el indicador deja de aportar información. El control pasa a ser la **conciliación**: el usuario informa el saldo real de un depósito y la diferencia se registra como ajuste.

### Reglas transversales del backend

- **Soft delete**: nada se borra. Se marca `estado = 'inactivo'` y todas las lecturas filtran por `estado = 'activo'`.
- **Aislamiento por usuario**: cada query debe filtrar por el usuario del token. Las cuentas por `usuarioId`; los movimientos por join con su cuenta. Un endpoint que no filtre por usuario es un bug de seguridad.
- **Cálculos en el servidor**: balances y totales se resuelven en SQL, no en el cliente.
- Rutas versionadas bajo `/api/v1`.

### Estructura del servidor

Actual:

```
server/src/
  index.js                   Bootstrap de Express
  v1/routes/                 Definición de rutas por recurso
  controllers/               Lógica de cada endpoint
  middleware/auth.js         Verificación del JWT
  database/models/           Modelos Sequelize e instancia de conexión
  database/associations/     Relaciones entre modelos
```

La estructura objetivo, con `prisma/`, `services/` y `schemas/`, está en `docs/BACKEND.md` §9. La lógica de dominio pasa a vivir en `services/`, no en los controladores.

---

## Comandos

```bash
# Backend
cd server && npm run dev      # nodemon
cd server && npm start        # producción

# Cliente web
cd client && npm run dev
cd client && npm run build
cd client && npm run lint
```

No hay suite de tests todavía.

## Variables de entorno

Estado actual — `server/.env`: `PORT`, `NODE_ENV`, `JWT_SECRET`, `CORS_ORIGIN`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_DIALECT`. `client/.env`: `VITE_API_URL`.

`server/.env.example` está desactualizado: declara `SECRETOPRIVATEKEY`, pero el código lee `JWT_SECRET`. La lista objetivo, con las variables nuevas de zona horaria, tokens y rate limiting, está en `docs/BACKEND.md` §7.

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
- El esquema se crea hoy con `sequelize.sync()` al arrancar y no hay migraciones. En cuanto exista la primera migración de Prisma, `sync()` debe salir del arranque: si conviven, pelean por el esquema.
- Los saldos se calculan siempre, nunca se almacenan en una columna. No introducir un campo de saldo ni un caché de saldo sin leer antes `docs/BACKEND.md` §3.3.
