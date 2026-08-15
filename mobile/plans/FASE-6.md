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

**`expo-notifications` se importa bajo demanda, no arriba del archivo.** En Expo Go con SDK 53+ el módulo lanza al **cargarse**, no al llamarlo: bastaba tener el `import` estático en `src/lib/push.ts` para que la pantalla de Dispositivos entera muriera con un Render Error antes de poder listar nada. `pushSupportedHere()` comprobaba el entorno demasiado tarde, porque el import ya había reventado. Se carga con `await import("expo-notifications")` dentro de `registerForPush()`, solo donde el push está soportado, y así la pantalla funciona en Expo Go para lo que sí puede hacer (listar y quitar dispositivos) y explica por qué no puede registrar.

**El ETag guarda también el cuerpo, no solo la marca.** El paso 5 pedía guardar el `ETag` y reenviarlo, pero un `304` no trae cuerpo: sin el último cuerpo guardado no habría nada que mostrar y habría que volver a pedirlo, que es justo lo que el ETag venía a evitar. `src/api/cached.ts` guarda ambos en AsyncStorage y devuelve el cuerpo guardado cuando el servidor responde `304`. Se aplicó a `GET /summary`, `/accounts` y `/categories`. La petición se sigue haciendo siempre: el ETag ahorra la descarga, no el viaje, así que un cambio hecho desde otra sesión llega igual.

**AsyncStorage para el estado de sincronización, no SecureStore.** El corte (`serverTime`), los ETag y los cuerpos guardados no son secretos. SecureStore queda reservado para el refresh token, como fija `docs/APP_MOVIL.md` §6.

**El logout limpia el estado de sincronización.** No estaba en el plan y es necesario: si el corte sobreviviera al cierre de sesión, el siguiente usuario pediría un delta en vez del histórico completo y arrancaría con datos ajenos a medias. `clearLocalSession()` borra corte, ETag y cuerpos.

**Sin pantalla que muestre el resultado del delta.** `useSyncStore` guarda un resumen del último delta (cuántos actualizados y borrados por colección) pero ninguna pantalla lo pinta: cada una sigue pidiendo lo suyo a su endpoint, que ya devuelve lo calculado. El resumen existe para poder comprobar el ciclo y para que la Fase 7 tenga de dónde colgar un indicador si hace falta.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real, con el usuario `prueba.fase4@lumo.test`.

- **Aceptación 5 (ETag)**: verificada de las dos formas. Contra el servidor, `GET /accounts` con `If-None-Match` responde `304` con 0 bytes frente a `200` con 520. Desde el teléfono, en el segundo arranque seguido `GET /summary` respondió **`304`** en el log del backend, y la pantalla de Inicio siguió mostrando los datos completos ($2.440.000, tres cuentas, "Sin descuadre"), que es lo que prueba que el cuerpo guardado se está reusando. Se comprobó además que lo mostrado coincide exactamente con `GET /summary` recién pedido: la caché no estaba sirviendo nada obsoleto.
- **Aceptación 3 (borrado vía sync)**: con un corte tomado antes, el delta llegaba vacío; tras borrar la operación 1676 por API, el mismo corte devolvió `operations.deleted: [1676]` y nada más, sin reenviar el histórico.
- **Ciclo de sincronización**: en el arranque el log del backend muestra `GET /api/v1/sync?since=<corte guardado>`, con el `since` avanzando entre arranques. El corte persiste entre reinicios completos de la app y sale siempre del `serverTime` del servidor.
- **Pantalla de Dispositivos**: lista `GET /devices` (vacía) y muestra el aviso de por qué no se puede registrar en Expo Go, en vez de romperse.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

**Aceptación 4 (tamaño del histórico), medida pero no comparable**: el primer `GET /sync` sin `since` devolvió **4.826 bytes (882 comprimidos)** para las 21 entidades de este usuario de prueba. No sirve para contrastar los ~350 KB (~50 KB comprimidos) que documenta §7, que son del histórico real migrado, al que no se tiene acceso desde aquí (es de otro usuario y no se conoce su contraseña). Extrapolando los ~230 bytes por entidad de esta medición a las ~1.500 operaciones del histórico real salen ~345 KB, y aplicando la misma tasa de compresión observada (18%) unos 63 KB: el orden de magnitud documentado se sostiene, pero **la cifra real sigue sin medirse**.

**No verificado en vivo, y es lo que deja la fase abierta**:

- **Aceptación 1 (registro del token)** y **Aceptación 2 (notificación real recibida)**. Ambas exigen una development build: Expo Go no entrega tokens de push en Android desde el SDK 53. El código está escrito y la pantalla degrada explicando el motivo, pero **no se ha ejecutado ni una sola vez** contra el servicio real de Expo.
- Falta además, antes de poder darlas por buenas, `EXPO_ACCESS_TOKEN` en `server/.env` (hoy vacío) y un `projectId` de EAS en `app.json`, que hoy no existe: `eas init` no se ha corrido y no hay `eas.json`. Sin esas dos piezas el backend no envía y el cliente no sabe a qué proyecto pide el token.
- Tampoco se probó registrar y luego quitar un dispositivo real, porque no se pudo llegar a registrar ninguno.

Se acordó con el usuario construir todo lo que no depende del build y dejar esas dos aceptaciones para la Fase 7, que ya incluye la development build en su alcance. **La fase queda cerrada solo en lo que Expo Go permite comprobar**; el push real sigue sin verificarse, que es exactamente la brecha que `docs/APP_MOVIL.md` §7 señala y que esta fase se proponía cerrar.
