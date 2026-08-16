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

## Estado de ejecución

Cerrada. 106 tests en verde, 32 de ellos nuevos: el job, `/sync`, `/devices` y el transporte.

| Punto de aceptación | Comprobación |
|---|---|
| 1. El job no duplica al correr dos veces | `recurring.job.test.js`: se devuelve `nextRunAt` a la primera ocurrencia y la segunda pasada genera 0 y descarta 3 |
| 2. Una `pending` no altera saldos | El saldo del depósito sigue en 0 tras generar tres recordatorios |
| 3. La notificación llega a un dispositivo real | **Retirado el 2026-08-15.** El push salió del alcance de la app, así que no hay dispositivo al que llegar ni nada que verificar |
| 4. Un token dado de baja se elimina | Retirado por lo mismo. El manejo de ticket y recibo sigue escrito y sin ejercitar |
| 5. `GET /sync?since=` devuelve los borrados | `sync.api.test.js`: borrar una operación y una categoría las reporta en `deleted` y no en `updated` |
| 6. `X-Client-Version` por debajo del mínimo recibe `426` | `transport.api.test.js`, con las cuatro variantes: vieja, mínima, posterior y ausente |
| 7. El backup corre y su restauración está probada | `scripts/backup.sh` y `scripts/restore-check.sh`, ejecutados sobre la base local: 27/118/1668/1690 idénticos entre origen y copia |

Lo que los tests protegen, más allá del CRUD:

- Que la puesta al día genere **todas** las ocurrencias atrasadas y no solo la última, y que el tope corte sin perder las que faltan: `nextRunAt` queda apuntando a la primera sin generar.
- Que una regla con una cuenta borrada no detenga a las demás.
- Que una regla borrada deje de generar.
- Que `/sync` no filtre nada de otro usuario, y que los montos salgan como número.
- Que un teléfono que cambia de manos deje de recibir las notificaciones del dueño anterior.

## Desviaciones

- **`GET /devices` no estaba en la especificación.** Sin listado no hay forma de revocar un dispositivo desde la app: `DELETE /devices/:id` pide un identificador que el cliente no tiene de otra manera. Añadido a `docs/BACKEND.md` §7.7.
- **La aritmética de fechas sin hora se rehizo.** Las columnas `DATE` se leen a medianoche UTC y el cálculo de ocurrencias las convertía a `APP_TIMEZONE`, lo que las corría un día hacia atrás. Catalogado y cerrado como §2.22.
- **`GET /sync` no pagina.** Decisión deliberada, §2.23: las filas migradas comparten `updatedAt` al milisegundo y un corte por marca de tiempo se atascaría.
- **Los recibos de Expo se esperan en memoria**, no en una tabla. §2.24.
- **El job corre también al arrancar**, no solo en la hora programada: si el servidor estuvo caído, las ocurrencias atrasadas no esperan a la siguiente medianoche (`LOGICA_NEGOCIO.md` §8).
- **La notificación nunca se probó contra un dispositivo real, y ya no se va a probar.** El 2026-08-15 el push salió del alcance de la app móvil: el aviso pasa a ser pasivo y nada del modelo depende de él, porque el job genera las operaciones se entere el usuario o no. `push.service.js`, los tres endpoints de `/devices` y sus tests siguen en pie como capacidad del backend sin cliente. El motivo y la trampa del import de `expo-notifications`, por si algún día se repone, están en `mobile/plans/FASE-6.md`.
