# Fase 6 - Dispositivo, push y sincronización

## Objetivo

Registro del token de push, pantalla de dispositivos y el ciclo de sincronización incremental que mantiene la app al día sin recargar todo en cada apertura.

## Precondiciones

Fase 5 cerrada. Esta fase es también la que cierra la brecha señalada en `docs/APP_MOVIL.md` §7: "el envío real de un push no está verificado".

## Endpoints

`docs/APP_MOVIL.md` §4.9 y §4.10. `POST/GET/DELETE /devices`; `GET /sync`.

---

## Pasos

### 1. Aviso sobre Expo Go

Desde el SDK 53, Expo Go en Android **no soporta push remoto**: hace falta una development build (`eas build --profile development`) para probar el registro y la recepción real de una notificación. El registro del token y la pantalla de dispositivos se pueden construir sobre Expo Go, pero la Aceptación de esta fase que involucra una notificación real requiere adelantar el primer paso de la Fase 7 (una development build instalada) antes de darla por cerrada.

### 2. Registro del token

`expo-notifications`: pedir permiso, obtener el `ExponentPushToken`. `src/api/devices.ts`: `POST /devices` con `{ expoPushToken, platform: "android" }`. Repetir el mismo token no duplica, lo reasigna: no hace falta lógica de deduplicación en el cliente.

### 3. Pantalla de dispositivos

Dentro de Ajustes: `GET /devices` lista los registrados, `DELETE /devices/:id` quita uno. Las notificaciones son solo para recurrentes (`docs/APP_MOVIL.md` §4.9); no hay otro tipo que mostrar.

### 4. Sincronización incremental

`src/api/sync.ts`: `GET /sync?since=<serverTime guardado>`. Guardar `serverTime` de la respuesta (nunca el reloj del dispositivo) y usarlo como `since` en la siguiente llamada. `since` ausente trae el histórico completo; se dispara así la primera vez que la app abre tras el login.

`deleted` en cada colección son solo IDs: el cliente ya tiene el resto localmente y solo necesita quitarlos de su caché/estado. Disparar `GET /sync` al volver del background y al abrir la app.

### 5. ETag en el arranque

`GET /accounts`, `/categories` y `/summary` responden `304` con `If-None-Match`. Guardar el `ETag` de cada respuesta y mandarlo en la siguiente petición al arrancar la app, para no volver a bajar lo mismo si nada cambió.

---

## Aceptación

1. El token de push se registra y aparece en `GET /devices` desde el teléfono.
2. Con una development build instalada (adelantando el primer paso de la Fase 7), una regla recurrente en modo `auto` genera una notificación real recibida en el teléfono.
3. Borrar una operación desde otra sesión (o directamente por API) la retira de la lista local tras el siguiente `GET /sync`, sin recargar todo el histórico.
4. El primer `GET /sync` sin `since` trae el histórico completo; medir el tamaño real de la respuesta contra los ~350 KB (~50 KB comprimidos) documentados en §7.
5. Un `GET /accounts` repetido con el `ETag` guardado recibe `304`, verificable en el log de red del teléfono o del servidor.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| Sin `EXPO_ACCESS_TOKEN` configurado en el backend, el envío real de push sigue sin probarse | Es un prerequisito documentado en §7; configurarlo antes de dar la fase por cerrada, no simular el resultado |
| La sincronización incremental deja el estado local desincronizado si `serverTime` no se persiste correctamente | Persistir `serverTime` en el mismo store seguro/local que la sesión, y probar deliberadamente un ciclo de background/foreground |

---

## Fuera de alcance

- Empaquetar la development build en sí (se adelanta solo lo mínimo para probar push). El resto de la Fase 7 —ícono, splash, instalación estable— llega después.

---

## Desviaciones

_(se completa durante la ejecución de la fase)_
