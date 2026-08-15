# Fase 6 - Sincronización incremental

## Objetivo

El ciclo de sincronización incremental que mantiene la app al día sin recargar todo en cada apertura, y el ETag que evita volver a bajar lo que no cambió.

## Precondiciones

Fase 5 cerrada.

## Endpoints

`docs/APP_MOVIL.md` §4.10. `GET /sync`.

---

## Push: fuera de alcance

Esta fase incluía el registro del token de push y una pantalla de dispositivos. **Se sacaron del alcance por decisión del usuario el 2026-08-15: la app no necesita avisos proactivos.**

Lo que eso cambia y lo que no:

- El job de recurrentes vive en el servidor, así que una regla `auto` sigue registrando su operación sola y una `reminder` sigue dejándola en `pending`. Lo único que se pierde es el aviso: el usuario se entera al abrir la app, no por una notificación.
- Se borraron `src/lib/push.ts`, `src/api/devices.ts` y la pantalla `app/devices.tsx` con su enlace en Ajustes, y se desinstaló `expo-notifications`. Una pantalla de dispositivos no se sostiene por su cuenta: un dispositivo registrado existe solo para recibir notificaciones.
- Los endpoints `POST/GET/DELETE /devices` y el `push.service.js` del backend **siguen existiendo y sin cliente**. No se tocan: funcionan, están probados y volver a usarlos es cuestión de reponer el cliente. `EXPO_ACCESS_TOKEN` sigue vacío en `server/.env`, que es lo que hace que el job registre el aviso en el log en vez de enviarlo.
- La brecha que señala `docs/APP_MOVIL.md` §7 ("el envío real de un push no está verificado") **queda abierta a propósito**, ya no como deuda de esta fase.

Si alguna vez se repone, hay una trampa que ya costó una depuración: en Expo Go con SDK 53+, `expo-notifications` lanza al **cargarse**, no al llamarlo. Un `import` estático tumba la pantalla entera con un Render Error antes de que cualquier comprobación de entorno llegue a ejecutarse; hay que cargarlo con `await import(...)` dentro de la función, ya detrás de la comprobación. Y hacen falta dos piezas que hoy no existen: `EXPO_ACCESS_TOKEN` en `server/.env` y un `projectId` de EAS en `app.json` (`eas init` nunca se corrió).

---

## Pasos

### 1. Sincronización incremental

`src/api/sync.ts`: `GET /sync?since=<serverTime guardado>`. Guardar `serverTime` de la respuesta (nunca el reloj del dispositivo) y usarlo como `since` en la siguiente llamada. `since` ausente trae el histórico completo; se dispara así la primera vez que la app abre tras el login.

`deleted` en cada colección son solo IDs: el cliente ya tiene el resto localmente y solo necesita quitarlos de su caché/estado. Disparar `GET /sync` al volver del background y al abrir la app.

### 2. ETag en el arranque

`GET /accounts`, `/categories` y `/summary` responden `304` con `If-None-Match`. Guardar el `ETag` de cada respuesta y mandarlo en la siguiente petición al arrancar la app, para no volver a bajar lo mismo si nada cambió.

---

## Aceptación

1. Borrar una operación desde otra sesión (o directamente por API) la retira de la lista local tras el siguiente `GET /sync`, sin recargar todo el histórico.
2. El primer `GET /sync` sin `since` trae el histórico completo; medir el tamaño real de la respuesta contra los ~350 KB (~50 KB comprimidos) documentados en §7.
3. Un `GET /accounts` repetido con el `ETag` guardado recibe `304`, verificable en el log de red del teléfono o del servidor.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| La sincronización incremental deja el estado local desincronizado si `serverTime` no se persiste correctamente | Persistir `serverTime` en el mismo store local que la sesión, y probar deliberadamente un ciclo de background/foreground |

---

## Fuera de alcance

- Push y pantalla de dispositivos, retirados del alcance (ver arriba).
- Empaquetar la development build. Es la Fase 7 entera.

---

## Desviaciones

**El ETag guarda también el cuerpo, no solo la marca.** El paso 2 pedía guardar el `ETag` y reenviarlo, pero un `304` no trae cuerpo: sin el último cuerpo guardado no habría nada que mostrar y habría que volver a pedirlo, que es justo lo que el ETag venía a evitar. `src/api/cached.ts` guarda ambos en AsyncStorage y devuelve el cuerpo guardado cuando el servidor responde `304`. Se aplicó a `GET /summary`, `/accounts` y `/categories`. La petición se sigue haciendo siempre: el ETag ahorra la descarga, no el viaje, así que un cambio hecho desde otra sesión llega igual.

**AsyncStorage para el estado de sincronización, no SecureStore.** El corte (`serverTime`), los ETag y los cuerpos guardados no son secretos. SecureStore queda reservado para el refresh token, como fija `docs/APP_MOVIL.md` §6.

**El logout limpia el estado de sincronización.** No estaba en el plan y es necesario: si el corte sobreviviera al cierre de sesión, el siguiente usuario pediría un delta en vez del histórico completo y arrancaría con datos ajenos a medias. `clearLocalSession()` borra corte, ETag y cuerpos.

**Sin pantalla que muestre el resultado del delta.** `useSyncStore` guarda un resumen del último delta (cuántos actualizados y borrados por colección) pero ninguna pantalla lo pinta: cada una sigue pidiendo lo suyo a su endpoint, que ya devuelve lo calculado. El resumen existe para poder comprobar el ciclo y para que la Fase 7 tenga de dónde colgar un indicador si hace falta.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real, con el usuario `prueba.fase4@lumo.test`.

- **Aceptación 3 (ETag)**: verificada de las dos formas. Contra el servidor, `GET /accounts` con `If-None-Match` responde `304` con 0 bytes frente a `200` con 520. Desde el teléfono, en el segundo arranque seguido `GET /summary` respondió **`304`** en el log del backend, y la pantalla de Inicio siguió mostrando los datos completos ($2.440.000, tres cuentas, "Sin descuadre"), que es lo que prueba que el cuerpo guardado se está reusando. Se comprobó además que lo mostrado coincide exactamente con `GET /summary` recién pedido: la caché no estaba sirviendo nada obsoleto.
- **Aceptación 1 (borrado vía sync)**: con un corte tomado antes, el delta llegaba vacío; tras borrar la operación 1676 por API, el mismo corte devolvió `operations.deleted: [1676]` y nada más, sin reenviar el histórico.
- **Ciclo de sincronización**: en el arranque el log del backend muestra `GET /api/v1/sync?since=<corte guardado>`, con el `since` avanzando entre arranques. El corte persiste entre reinicios completos de la app y sale siempre del `serverTime` del servidor.
- `npx tsc --noEmit` y `npx expo lint` sin errores, también después de retirar el push.

**Aceptación 2 (tamaño del histórico), medida pero no comparable**: el primer `GET /sync` sin `since` devolvió **4.826 bytes (882 comprimidos)** para las 21 entidades de este usuario de prueba. No sirve para contrastar los ~350 KB (~50 KB comprimidos) que documenta §7, que son del histórico real migrado, al que no se tiene acceso desde aquí (es de otro usuario y no se conoce su contraseña). Extrapolando los ~230 bytes por entidad de esta medición a las ~1.500 operaciones del histórico real salen ~345 KB, y aplicando la misma tasa de compresión observada (18%) unos 63 KB: el orden de magnitud documentado se sostiene, pero **la cifra real sigue sin medirse**. Es lo único de esta fase que queda a medias, y no depende de la app sino de poder entrar con el usuario que tiene ese histórico.

**No verificado en vivo**: el ciclo background → foreground disparando `GET /sync`. El listener de `AppState` está puesto y el sync al abrir sí se comprobó, pero mandar la app al fondo y traerla de vuelta no se ejercitó; queda cubierto por la Aceptación 4 de la Fase 7, que lo pide explícitamente.
