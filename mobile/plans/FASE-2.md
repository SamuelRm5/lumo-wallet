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

_(se completa durante la ejecución de la fase)_
