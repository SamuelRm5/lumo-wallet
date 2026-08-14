# Fase 7 - Development build en el teléfono

## Objetivo

Dejar una development build instalable en el teléfono conectado, para usar la app sin depender de Metro corriendo en el PC y para que el push real (Fase 6) sea reproducible en cualquier momento. Esta es la última fase: completa la app hasta el límite que fija `docs/APP_MOVIL.md` §1, que se detiene en desarrollo local.

## Precondiciones

Fase 6 cerrada, incluida la verificación de push sobre una development build preliminar.

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
3. Una notificación push real llega con la app en background.
4. Un ciclo de background → foreground dispara `GET /sync` y refleja cambios hechos desde otra sesión.
5. El ícono no es el placeholder por defecto de Expo.

---

## Fuera de alcance

Explícitamente fuera de las ocho fases, por `docs/APP_MOVIL.md` §1 y §7:

- Publicación en Play Store.
- HTTPS y dominio propio.
- Despliegue de producción del backend.
- `refresh_tokens.deviceId`: el login todavía no recibe el dispositivo (§7), así que no se puede cerrar sesión en un teléfono concreto desde otro. Es una mejora de backend, no de esta fase; catalogada en `docs/BACKEND.md` §2.25.

---

## Desviaciones

_(se completa durante la ejecución de la fase)_
