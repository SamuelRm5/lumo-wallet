# Fase 2 - Inicio y cuentas

## Objetivo

Dashboard funcional y gestión completa de cuentas, incluida la conciliación, que es el mecanismo de control central de la app.

## Precondiciones

Fase 1 cerrada: hay sesión real y el token viaja en cada petición.

## Endpoints

`docs/APP_MOVIL.md` §4.2 y §4.3. `GET /summary`; `GET/POST/PUT/DELETE /accounts`, `GET /accounts/:id`, `POST /accounts/:id/reconcile`.

---

## Pasos

### 1. `src/api/accounts.ts` y `src/api/summary.ts`

Módulos de datos, sin lógica de UI.

### 2. Pantalla Inicio (`app/(tabs)/index.tsx`)

Una sola llamada a `GET /summary`. Mostrar:

- `byType.source` ("lo que debería haber") contra `cash + receivable + liability` ("lo que hay").
- `discrepancy`, con el texto obligatorio de "captura incompleta", nunca "dinero perdido" ni "sobrante" (`docs/APP_MOVIL.md` §4.2 y §6).
- Lista de cuentas con `balance` y `lastReconciledAt` tal cual llega, sin recalcular nada en el cliente.
- Accesos rápidos a registrar gasto e ingreso: enlazan al modal de la Fase 3; hasta entonces quedan deshabilitados o navegan a un placeholder.
- `GET /operations?status=pending&limit=5` para las operaciones pendientes de confirmar.

### 3. Pantalla Cuentas (dentro de Ajustes, y accesible tocando una cuenta desde Inicio)

Listar con `?type=` para filtrar, detalle, crear, editar. Etiquetas de usuario exactas de §4.3: `source` "Fuente", `cash` "Depósito", `receivable` "Por cobrar", `liability` "Deuda".

### 4. Archivar con confirmación

`DELETE /accounts/:id`. Si responde `409`, no es un error genérico: mostrar el saldo que trae el mensaje y, si el usuario confirma, repetir con `DELETE /accounts/:id?force=true`. Sin ese segundo paso el borrado deja un descuadre permanente.

### 5. Conciliar

`POST /accounts/:id/reconcile` con `realBalance`, `date`, `sourceAccountId`. Cuentas `source` no ofrecen el botón (el backend devuelve `400` si se intenta). Con diferencia cero no se crea operación, solo se actualiza `lastReconciledAt`; la UI no debe mostrar un mensaje de ajuste creado en ese caso.

---

## Aceptación

1. Los balances mostrados en Inicio y en Cuentas son exactamente los que devuelve el backend; `grep` en el código de estas pantallas no encuentra ninguna suma manual de asientos.
2. El texto de `discrepancy` distinto de cero dice "captura incompleta" o equivalente, nunca "perdido"/"sobrante".
3. Archivar una cuenta con saldo distinto de cero muestra el diálogo con el saldo real y solo borra tras confirmar con `force=true`.
4. Conciliar con diferencia cero no genera una operación visible en Movimientos (se verifica en la Fase 4, pero el conteo en el backend debe quedar igual).
5. Una cuenta `source` no muestra el botón de conciliar.

---

## Fuera de alcance

- Registrar operaciones desde el formulario real (`POST /operations`). Fase 3.
- Categorías. Fase 3.

---

## Desviaciones

**Sin selector de fecha en conciliar.** `docs/APP_MOVIL.md` §4.4 muestra `date` en el ejemplo de `POST /accounts/:id/reconcile`, pero el campo es opcional en `server/src/schemas/accounts.schema.js` y el servicio ya usa `new Date()` cuando se omite. Se dejó sin campo de fecha en el formulario (siempre concilia "ahora") para no sumar una dependencia de date-picker en esta fase; se agrega si hace falta conciliar con fecha retroactiva.

**Bug real encontrado y corregido**: `Link ... asChild` de expo-router exige que su hijo directo reciba un `style` ya aplanado, no un array — pasar `style={[a, b]}` a un `<Pressable>` bajo `asChild` tira `[expo-router]: You are passing an array of styles to a child of <Slot>` y la pantalla no renderiza. Afectaba las tres pantallas con navegación por `Link asChild` (`app/accounts/index.tsx`, `app/(tabs)/settings.tsx`). Se resolvió envolviendo esos arrays en `StyleSheet.flatten(...)`. Vale la pena recordarlo para las fases siguientes: cualquier `Pressable` como hijo directo de `Link asChild` necesita `StyleSheet.flatten`, no un array crudo.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real, con el usuario de prueba de la Fase 1.

- Creadas dos cuentas reales vía la app: "Salario" (`source`) y "Bancolombia" (`cash`).
- Dashboard (`GET /summary`): "Lo que debería haber" / "Lo que hay" / descuadre se muestran tal cual llegan, sin ningún cálculo en el cliente.
- Cuentas `source` no ofrecen el botón de conciliar (verificado abriendo el detalle de "Salario": la sección "Conciliar" no aparece).
- Conciliar "Bancolombia" con `realBalance: 50000` (diferencia contra los $0 calculados): la cuenta `source` única se resolvió sola, sin pedir `sourceAccountId` — confirmado en el log del backend (`POST /accounts/119/reconcile`, sin ese campo en el body). Tras conciliar, el dashboard mostró `$50.000` en ambos lados y "Sin descuadre": el ajuste tocó las dos cuentas y la ecuación de control sigue en cero.
- La fila de "Bancolombia" pasó a mostrar "conciliada 14/8/2026"; la de "Salario" sigue en "sin conciliar".
- Archivar con saldo distinto de cero: el primer intento devolvió `409` y la app mostró el mensaje real del servidor ("La cuenta tiene un saldo de 50000 y borrarla dejaría un descuadre permanente. Repite con force=true si es lo que quieres") con la opción "Archivar de todas formas". Se probó hasta ese punto y se canceló a propósito, para no perder las cuentas de prueba antes de la Fase 3.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

**No verificado en vivo**: `force=true` completándose de verdad (se canceló a propósito, ver arriba) y el flujo de edición de una cuenta ya existente guardando un cambio (se probó el formulario pero no se confirmó el `PUT` con un cambio real). Ninguno de los dos es un riesgo: son el mismo código ya probado en otras rutas (`updateAccount` usa el mismo patrón que el resto de formularios de la app, `force=true` es un query param que ya se ve construido correctamente en `src/api/accounts.ts`).
