# Fase 7 - Development build en el teléfono

## Objetivo

Dejar una development build instalable en el teléfono conectado, para usar la app sin depender de Metro corriendo en el PC. Esta es la última fase: completa la app hasta el límite que fija `docs/APP_MOVIL.md` §1, que se detiene en desarrollo local.

Con el push fuera del alcance (Fase 6), este es el único motivo que queda para la build, y sigue siendo suficiente por sí solo: hoy la app solo arranca con el portátil encendido sirviendo el bundle.

## Precondiciones

Fase 6 cerrada.

---

## Pasos

### 1. Configurar EAS

```bash
cd mobile
npx eas-cli login
npx eas build:configure
```

Perfil `development` en `eas.json`: `developmentClient: true`, `distribution: "internal"`, `android.gradleCommand` por defecto.

### 2. Build e instalación

```bash
npx eas build --profile development --platform android
```

Descargar el `.apk` (o instalar directo si EAS ofrece el link/QR) e instalar en el teléfono conectado:

```bash
adb install ruta-al-apk.apk
```

### 3. Ícono y splash mínimos

Los mínimos indispensables para que la build no se vea como el placeholder de Expo: ícono derivado de la marca de texto de Lumo (`Logotype` del design system, ver Fase 0 — la app no tiene logo real, solo tipografía), color de splash desde `theme` de la Fase 0.

### 4. Confirmar que sigue apuntando a LAN

La development build lee `EXPO_PUBLIC_API_URL` igual que Expo Go. No hay despliegue ni dominio en esta fase: sigue apuntando a la IP local del backend en desarrollo.

---

## Aceptación

1. La build instalada abre sin Metro corriendo en el PC (usa el bundle embebido o se conecta a un servidor de desarrollo si se lanza `npx expo start --dev-client`).
2. Login funciona igual que en Expo Go.
3. Un ciclo de background → foreground dispara `GET /sync` y refleja cambios hechos desde otra sesión.
4. El ícono no es el placeholder por defecto de Expo.

---

## Fuera de alcance

Explícitamente fuera de las ocho fases, por `docs/APP_MOVIL.md` §1 y §7:

- Publicación en Play Store.
- HTTPS y dominio propio.
- Despliegue de producción del backend.
- Push, retirado del alcance en la Fase 6. No hace falta `EXPO_ACCESS_TOKEN` para esta build.
- `refresh_tokens.deviceId`: el login todavía no recibe el dispositivo (§7), así que no se puede cerrar sesión en un teléfono concreto desde otro. Es una mejora de backend, no de esta fase; catalogada en `docs/BACKEND.md` §2.25.

---

## Desviaciones

**Perfil `preview`, no `development`.** El paso 1 pedía `development`, que produce un dev client: sigue necesitando Metro sirviendo el bundle, que es justo lo que el criterio 1 dice que no debe pasar. El perfil que cumple la aceptación es `preview` con `android.buildType: "apk"`, un release con el bundle embebido. `eas.json` deja los dos.

**La build espera al backend en el VPS (2026-08-16).** El paso 4 daba por hecho que el APK seguiría apuntando a la IP de la LAN. No sirve, por dos razones que aparecieron al configurar la build:

- `EXPO_PUBLIC_API_URL` se resuelve en tiempo de build y queda escrito dentro del APK. Con la IP de la LAN, el APK deja de funcionar en cuanto el PC cambia de red, y no hay forma de corregirlo sin reconstruir.
- Android 9 y superiores bloquean el tráfico en claro en una build de release. Un `http://` obliga a habilitar `usesCleartextTraffic` con `expo-build-properties`, es decir a desactivar una protección de la plataforma para toda la app.

Las dos las resuelve la misma cosa: una URL estable con HTTPS. Eso mueve el despliegue del backend, que §"Fuera de alcance" excluía de las ocho fases, a precondición de esta. La build se lanza cuando el VPS esté sirviendo, cambiando `EXPO_PUBLIC_API_URL` en el perfil `preview` de `eas.json`.

Antes de esa decisión se llegó a lanzar una build, cancelada a los pocos segundos (`2616a23a`, sin artefacto). Quedaron de ella el proyecto `@samuelrm5/lumo-wallet` en EAS, su `projectId` en `app.json` y un keystore de Android generado en el servidor de Expo. Los tres sirven igual para la build definitiva.
