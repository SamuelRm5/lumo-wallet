# Fase 5 - Operación

## Objetivo

Lo que hace falta para que la app móvil viva en un teléfono real (`docs/BACKEND.md` §12, Fase 5).

## Precondiciones

- Fase 4 cerrada, con tests en verde.
- Cuenta de Expo con `EXPO_ACCESS_TOKEN` disponible.

---

## Pasos

### 1. Job de recurrentes

`src/jobs/recurring.job.js` con `node-cron`, disparado una vez al día desde `index.js` (nunca desde `app.js`, que debe seguir siendo montable en tests sin efectos secundarios).

`src/services/recurring.service.js` recorre las reglas con `nextRunAt <= hoy` y, según el modo (`docs/BACKEND.md` §7.6):

- `auto` → crea la operación con `status = 'confirmed'` y notifica que quedó registrada.
- `reminder` → crea la operación con `status = 'pending'` y notifica que hay que confirmarla. No afecta saldos hasta `POST /operations/:id/confirm`, donde el monto es editable.

**Idempotencia.** El índice único `[recurringRuleId, scheduledDate]` es lo que hace que el job se pueda correr dos veces sin duplicar. La generación lo aprovecha con un `createMany({ skipDuplicates: true })` o capturando `P2002`, nunca comprobando antes con un `findFirst`: entre la comprobación y la escritura hay una carrera.

**Ocurrencias atrasadas.** Si el servidor estuvo caído, al arrancar se generan todas las pendientes desde `nextRunAt` hasta hoy, no solo la última (`docs/LOGICA_NEGOCIO.md` §8). Poner un tope de seguridad: una regla con `startDate` de hace tres años no debe generar mil operaciones de golpe.

Cada operación generada queda enlazada por `recurringRuleId` y es editable y borrable como cualquier otra, sin afectar la regla. Editar una regla no reescribe lo ya generado.

### 2. Push con Expo

`expo-server-sdk`. `POST /devices` registra el token de Expo por usuario y plataforma; `DELETE /devices/:id` lo retira.

Manejo obligatorio de los recibos: Expo devuelve `DeviceNotRegistered` para tokens muertos, y ese dispositivo hay que borrarlo. Sin eso la tabla se llena de tokens que fallan en cada envío.

Las notificaciones son **solo** para recurrentes. La conciliación es pasiva por decisión explícita (`docs/LOGICA_NEGOCIO.md` §12.4): la app muestra `lastReconciledAt` en el dashboard y el usuario decide cuándo conciliar.

### 3. `GET /sync?since=`

Delta de operaciones, cuentas y categorías creadas, actualizadas y borradas desde una marca de tiempo. Es uno de los dos consumidores del escape de la extensión de soft delete (`docs/BACKEND.md` §3.2): necesita ver los registros borrados precisamente para poder reportarlos al cliente.

La respuesta lleva una marca de tiempo del servidor que el cliente guarda para la siguiente llamada. Nunca se usa el reloj del dispositivo como `since`, por lo mismo que se rechazan fechas futuras: viene de un reloj que puede estar desajustado.

### 4. Transporte

- `compression` en los listados.
- `ETag` con `304` en `GET /accounts`, `GET /categories` y `GET /summary`, que el cliente móvil pide en cada arranque y casi nunca cambian.
- `X-Client-Version` y respuesta `426` cuando una versión queda obsoleta (`docs/BACKEND.md` §13). Actualizar una app instalada no es instantáneo como recargar una web, así que el corte debe ser explícito y avisado.

### 5. Backup automático

`mysqldump` programado con retención, y **una restauración de prueba**. Un backup que nunca se ha restaurado no es un backup. Fijar la periodicidad y verificar la restauración al menos una vez.

### 6. Reporte de errores

Los errores del servidor ya salen por `pino` con `requestId` desde la Fase 0. Aquí se añade la versión del cliente móvil al contexto del log, para poder correlacionar un fallo con la versión instalada.

---

## Aceptación

1. Una regla recurrente en modo recordatorio genera su ocurrencia y **no la duplica** aunque el job corra dos veces seguidas.
2. Una operación `pending` generada por una regla no altera ningún saldo hasta confirmarla.
3. La notificación llega a un dispositivo real registrado.
4. Un token de Expo dado de baja se elimina de `devices` tras el recibo de error.
5. `GET /sync?since=` devuelve los registros borrados desde esa marca, no solo los vivos.
6. Un cliente con `X-Client-Version` por debajo del mínimo recibe `426`.
7. El backup automático corre y su restauración se ha probado.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| El job duplica operaciones | El índice único es la garantía, no la comprobación previa. Test que corre el job dos veces |
| Una regla vieja genera cientos de ocurrencias al recuperar atrasos | Tope de ocurrencias por ejecución |
| Los tokens muertos se acumulan | Procesar los recibos de Expo y borrar en `DeviceNotRegistered` |
| `GET /sync` omite borrados y el cliente muestra datos fantasma | Test explícito de que el escape de soft delete está activo en esa ruta |
| El `426` deja fuera a usuarios que no pueden actualizar | Subir el mínimo solo cuando haya un cambio incompatible real |

Reversión: el job se puede desactivar por configuración sin tocar el resto. `GET /sync` y `/devices` son aditivos.

---

## Fuera de alcance

- El cliente React Native.
- Retirar `/cuentas` y `/movimientos`: ocurre cuando la app móvil los reemplace.
- Borrar `movimientos_legacy`: un mes después de la Fase 3.

---

## Desviaciones

Ninguna prevista.
