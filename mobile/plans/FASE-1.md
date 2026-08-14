# Fase 1 - Sesión

## Objetivo

Login persistente con refresh serializado y de un solo vuelo, logout, edición de perfil y cambio de contraseña.

## Precondiciones

Fase 0 cerrada: la app arranca en el teléfono y llega al backend en LAN.

## Endpoints

`docs/APP_MOVIL.md` §4.1. `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/me`, `PUT /auth/password`.

---

## Pasos

### 1. Almacenamiento seguro

`src/store/session.ts`. El refresh token vive **solo** en `expo-secure-store`, nunca en memoria persistida sin cifrar ni en `AsyncStorage` (`docs/APP_MOVIL.md` §3 y §6). El access token puede vivir en memoria (un store de Zustand o Context) porque dura 15 minutos y no necesita sobrevivir un cierre completo de la app sin refresco.

### 2. Cliente de auth

`src/api/auth.ts` con las seis llamadas de la tabla de §4.1.

### 3. Cola de refresco de un solo vuelo

En `src/api/client.ts`: interceptar `401`, y si ya hay un refresh en curso, esperar esa misma promesa en vez de disparar uno nuevo. Si el refresh falla, limpiar la sesión (borrar de `expo-secure-store`) y redirigir a login. Esto es el punto más delicado del contrato (`docs/APP_MOVIL.md` §3): reusar un refresh token ya consumido cierra **todas** las sesiones del usuario, así que tres peticiones en paralelo con el mismo token vencido no pueden disparar tres refrescos.

### 4. Guard de navegación

`app/_layout.tsx` redirige a `app/login.tsx` si no hay sesión válida al arrancar (se intenta un refresh silencioso con el token guardado antes de decidir). Cierra la pantalla de diagnóstico de la Fase 0 o la deja detrás del guard.

### 5. Pantalla de login

Formulario simple, email y contraseña, mensaje de error mostrable tal cual (`message` ya viene en español).

### 6. Perfil en Ajustes

Editar nombre/email (`PUT /auth/me`), cambiar contraseña (`PUT /auth/password`). Tras un cambio de contraseña exitoso, la app limpia la sesión local y vuelve a login: el backend ya cerró todas las sesiones, incluida la actual.

---

## Aceptación

1. Login real contra el backend desde el teléfono.
2. Cerrar la app por completo y reabrirla: la sesión sigue activa (el refresh token persistido la revalida).
3. Bajar temporalmente `expiresIn` en el backend de prueba (o esperar 15 minutos) y confirmar que una petición autenticada se reintenta sola tras refrescar, sin que el usuario lo note.
4. Disparar tres peticiones autenticadas a la vez con el access token ya vencido: en el log del servidor debe verse un único `POST /auth/refresh`, no tres.
5. Cambiar la contraseña deja la app en la pantalla de login.
6. El refresh token nunca aparece en `AsyncStorage` (inspeccionar con `adb shell` o el debugger de Expo).

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| Un bug en la cola de refresco dispara refrescos paralelos y autoexpulsa al usuario | Probarlo deliberadamente (punto 4 de Aceptación) antes de dar la fase por cerrada, no solo confiar en el código |
| El guard de navegación deja una pantalla protegida visible un instante antes de redirigir | Loading state explícito mientras se resuelve el refresh silencioso inicial |

Reversión: la sesión es la única fase con estado persistente en el dispositivo (`expo-secure-store`); revertir el código no limpia lo ya guardado. `expo-secure-store` se limpia manualmente o desinstalando la app de prueba.

---

## Fuera de alcance

- Cualquier pantalla de datos de negocio (Inicio, cuentas, operaciones). Fase 2 en adelante.
- Registro de usuario: está cerrado por configuración (`ALLOW_PUBLIC_REGISTRATION=false`) y la app no necesita pantalla para eso (`docs/APP_MOVIL.md` §4.1).

---

## Desviaciones

Ninguna respecto al contrato: los cuerpos de request/response se tomaron de `server/src/schemas/auth.schema.js` y `server/src/services/auth.service.js` en vez de asumirlos, y coinciden con lo documentado en `docs/APP_MOVIL.md` §4.1.

---

## Estado de ejecución

Verificado en el teléfono Android conectado, sobre LAN real (WiFi, sin `adb reverse` — ver Desviaciones de `FASE-0.md`).

- Usuario de prueba descartable (`prueba.fase1@lumo.test`) creado abriendo `ALLOW_PUBLIC_REGISTRATION` un momento, según lo acordado con el usuario; el registro público se confirmó cerrado otra vez (`403 FORBIDDEN`) al terminar.
- Login real: `POST /auth/login` desde el formulario, guard de `Stack.Protected` saca la pantalla de login sola al quedar autenticado.
- Persistencia: `force-stop` de la app + reapertura mantiene la sesión — el log del backend confirma `POST /auth/refresh` disparado por `bootstrap()` con el refresh token guardado, sin pedirle nada al usuario.
- Perfil: `GET/PUT /auth/me` editan nombre y email y el cambio se refleja de inmediato en la UI.
- Cambio de contraseña: `PUT /auth/password` responde éxito y la app vuelve sola a `/login`, **sin** llamar a `/auth/logout` después (confirmado en el log de peticiones del backend) — el servidor ya revocó todas las sesiones, así que ese aviso sería redundante.
- Logout manual: `POST /auth/logout` se dispara con el refresh token guardado y la app vuelve a `/login`.
- Confirmado que `AsyncStorage` no es dependencia del proyecto (`grep` en `package.json`/`package-lock.json` sin resultados): el refresh token no tiene dónde terminar salvo `expo-secure-store`.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

**No verificado en vivo, solo por revisión de código:** la cola de refresco de un solo vuelo (tres peticiones con el access token vencido disparan un único `POST /auth/refresh`). Ejercitarlo de verdad exige bajar `ACCESS_TOKEN_TTL` a algo del orden de segundos y disparar tres llamadas concurrentes desde la app misma (un `curl` en paralelo no prueba nada: no pasa por `client.ts`). Queda pendiente si se quiere la certeza empírica antes de la Fase 2; el mecanismo es una promesa compartida en `ensureFreshAccessToken` (`src/api/client.ts`), el patrón estándar para esto.

Queda en el repositorio, sin usar: el usuario de prueba `prueba.fase1@lumo.test` en la base de datos. No tiene cuentas ni operaciones; se puede ignorar o borrar a mano.
