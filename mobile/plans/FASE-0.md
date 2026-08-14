# Fase 0 - Andamio y entorno de dispositivo

## Objetivo

Dejar `mobile/` en condiciones de arrancar en el teléfono Android conectado: scaffolding de Expo Router, cliente HTTP sin sesión todavía, navegación de las cuatro pestañas con pantallas vacías, y los tokens de diseño recortados del design system a lo que aplica a Lumo Wallet.

## Precondiciones

- Backend corriendo en local y accesible por LAN: `cd server && npm run dev`, con `DATABASE_URL` apuntando a una base con datos (la migrada o una de prueba).
- IP local de la máquina conocida (`ipconfig`, adaptador de la red donde está el teléfono).
- Teléfono Android con Expo Go instalado desde Play Store, en la misma red WiFi que el PC.

---

## Pasos

### 0. Entorno del dispositivo

No hay `ANDROID_HOME` ni `adb` en esta máquina. Se necesita `adb` para diagnosticar (logs, `adb devices`, capturas) aunque el desarrollo corra sobre Expo Go, que no requiere Android Studio completo:

1. Descargar **SDK Platform-Tools** standalone (`https://developer.android.com/tools/releases/platform-tools`), descomprimir en `C:\Users\Samue\AppData\Local\Android\Sdk\platform-tools`.
2. Agregar esa ruta al `PATH` del usuario.
3. En el teléfono: Ajustes → Acerca del teléfono → tocar "Número de compilación" 7 veces para activar Opciones de desarrollador → activar "Depuración USB".
4. Conectar por cable y aceptar el diálogo de confianza en el teléfono, o usar depuración inalámbrica (Android 11+: Opciones de desarrollador → Depuración inalámbrica → `adb pair IP:PUERTO`).
5. Verificar: `adb devices` debe listar el dispositivo como `device`, no `unauthorized` ni vacío.

### 1. Scaffolding de Expo

```bash
npx create-expo-app@latest mobile
cd mobile
```

La plantilla por defecto (SDK 53+) ya trae TypeScript y `expo-router`. Reorganizar contra el árbol de `docs/APP_MOVIL.md` §2:

```
mobile/
  app/            rutas de expo-router (se generan con la plantilla, se ajustan)
  src/
    api/          cliente HTTP y un módulo por recurso
    components/
    hooks/
    store/        sesión y caché
    lib/          formato de moneda, fechas, validación
  plans/          este directorio
```

### 2. Variables de entorno

`mobile/.env.example`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000
```

Documentar en un comentario que nunca es `localhost` (desde el teléfono, `localhost` es el teléfono) y que cambia si cambia la red WiFi. `app.config.ts` no necesita leer esto manualmente: `EXPO_PUBLIC_*` ya llega a `process.env` en tiempo de bundling por convención de Expo.

### 3. Cliente HTTP base

`src/api/client.ts`: wrapper sobre `fetch` con:

- Base URL desde `process.env.EXPO_PUBLIC_API_URL + "/api/v1"`.
- Header `X-Client-Version` leído de `expo-constants` (`Constants.expoConfig.version`).
- Normalización del envelope de error de `docs/APP_MOVIL.md` §3 a una clase `ApiError` con `code`, `message`, `details`, `requestId`.

Sin lógica de sesión ni de refresh todavía: eso es la Fase 1. Sin `Authorization` header todavía.

### 4. Pantalla de diagnóstico temporal

Una pantalla (`app/_diagnostics.tsx` o dentro de `app/index.tsx` provisional) que llama a `GET /api/health` sin autenticación y muestra el resultado. Se borra o se oculta al cerrar la Fase 1, cuando el índice pasa a ser el login/dashboard real.

### 5. Navegación shell

Cuatro pestañas de expo-router más la acción central, según `docs/APP_MOVIL.md` §5:

```
app/(tabs)/index.tsx           Inicio         (placeholder)
app/(tabs)/movements.tsx       Movimientos    (placeholder)
app/(tabs)/reports.tsx         Reportes       (placeholder)
app/(tabs)/settings.tsx        Ajustes        (placeholder)
app/register-operation.tsx     modal, botón central del tab bar (placeholder)
```

### 6. Tokens de diseño recortados

`src/theme/` con lo que se toma de `docs/Lumo Wallet Design System/tokens/` (colors, typography, spacing, radii, shadows, motion) portado a valores de React Native (no CSS custom properties: objetos JS/TS, o `StyleSheet` + un tema de contexto). Ver tabla de selección en Desviaciones.

### 7. Lint y formato

Copiar la configuración de lint que ya use el monorepo si aplica, o dejar la de la plantilla de Expo. No se introduce una convención nueva sin necesidad.

---

## Aceptación

1. `adb devices` lista el teléfono como `device`.
2. `cd server && npm run dev` en una terminal, `cd mobile && npx expo start` en otra; escanear el QR con Expo Go en el teléfono.
3. La pantalla de diagnóstico muestra `{"status":"ok"}` obtenido en vivo del backend en LAN, no un valor hardcodeado.
4. Las cuatro pestañas navegan sin crash y sin datos reales todavía.
5. `mobile/src/` refleja el árbol de `docs/APP_MOVIL.md` §2.

---

## Riesgos y reversión

| Riesgo | Mitigación |
|---|---|
| El firewall de Windows bloquea el puerto de Metro (8081) o el del backend (3000) en la red local | Permitir el puerto en el firewall al primer aviso; si persiste, `npx expo start --tunnel` como alternativa más lenta |
| La IP local cambia entre sesiones de desarrollo (DHCP) | Vive en `.env`, no hardcodeada; se documenta el comando para volver a obtenerla |
| El teléfono queda como `unauthorized` en `adb` | Revocar autorizaciones USB en el teléfono y volver a conectar, aceptando el diálogo |

Reversión: fase entera de scaffolding, sin datos ni esquema. Borrar `mobile/` y repetir si algo queda mal encaminado.

---

## Fuera de alcance

- Sesión y cualquier llamada autenticada. Fase 1.
- Cualquier pantalla con datos de negocio reales. Fases 2 en adelante.
- `EAS build` y development build. Fase 7.

---

## Desviaciones

**Conexión por USB/adb reverse en vez de LAN, para esta sesión.** El teléfono de prueba tiene el WiFi apagado (solo datos móviles) y esta máquina solo tenía Ethernet activo, sin WiFi que compartir: no había una LAN común. Se resolvió con el túnel de `adb`:

```bash
adb reverse tcp:8081 tcp:8081   # Metro
adb reverse tcp:3000 tcp:3000   # backend
npx expo start --android --localhost
```

y `EXPO_PUBLIC_API_URL=http://localhost:3000` en `.env` **solo mientras dure ese reverse**. Esto no contradice la regla de "nunca localhost" de `docs/APP_MOVIL.md` §2: esa regla asume conexión por LAN, donde `localhost` en el teléfono es el teléfono. Bajo `adb reverse`, `localhost:3000` en el teléfono se reenvía por el cable al `localhost:3000` de esta máquina, así que es correcto ahí y solo ahí. En cuanto haya una red WiFi común, se vuelve a la IP de LAN (`.env.example`) y se retira el reverse.

**Metro se quedó escuchando solo en `::1` (IPv6) con `--localhost` en Windows**, y `adb reverse` reenvía al `127.0.0.1` (IPv4) del host: la app no cargaba ("Something went wrong" sin log de bundle) porque el teléfono no llegaba al puerto. Se resolvió forzando `NODE_OPTIONS=--dns-result-order=ipv4first` antes de `expo start`, para que Node resuelva `localhost` a IPv4 primero. Vale la pena revisar si esto se necesita en cada arranque o es propio de esta instalación de Node/Windows.

**Node de esta máquina es 20.19.0**; varios paquetes de Expo SDK 57 (`react-native`, `metro-*`) piden `^20.19.4`. `npm install` avisa (`EBADENGINE`) pero instala y corre igual; no bloqueó nada de esta fase. Si algo falla más adelante de forma rara, es el primer sospechoso.

**`use-color-scheme.web.ts` generado por la plantilla de Expo** llama `setState` directo dentro de un efecto para detectar hidratación en `expo start --web`, y el lint nuevo de React Compiler (`react-hooks/set-state-in-effect`) lo marca como error. Es el uso legítimo de ese patrón (detección de montaje en cliente), así que se silenció con `eslint-disable-next-line` y un comentario, en vez de reescribirlo.

Selección de qué se toma del design system y qué se descarta, porque el kit describe una app de pagos P2P con tarjetas y no la app real:

| Se toma | Se descarta | Por qué |
|---|---|---|
| `tokens/colors.css`, `typography.css`, `spacing.css`, `radii.css`, `shadows.css`, `motion.css` | El gradiente de tarjeta (`--green-600 → --green-800`), la regla de "una superficie brand-green por pantalla" pensada para el carrusel de tarjetas | Son valores agnósticos al dominio; el gradiente de tarjeta no aplica porque no hay tarjetas |
| Voz y contenido: sentence case, sin exclamaciones, sin emoji, cifras tabulares con signo, mensajes de error que nombran causa y siguiente paso | Ejemplos de copy centrados en transferencias P2P ("Sent $240.00 to Musa") | `CLAUDE.md` ya exige textos de usuario en español; el tono y las reglas de puntuación se adaptan, los ejemplos no |
| Componentes `core` (`Button`, `IconButton`, `Icon`, `Badge`, `Card`), `forms` (`Input`, `Select`, `Checkbox`, `Radio`, `Switch`, `AmountField`), `navigation` (`AppBar`, `TabBar`, `SegmentedControl`, `SectionHeader`), `feedback` (`Sheet`, `Toast`, `EmptyState`) | `PaymentCard` (tarjeta física/virtual), `CurrencyChip` (multi-moneda; Lumo es solo COP), `Avatar` en su uso de persona-a-persona, el FAB cítrico de scan-to-pay | Lumo no tiene tarjetas, no es multi-moneda y no tiene pagos por escaneo |
| `TransactionRow`, `StatTile` como base visual | Su acoplamiento a "una tarjeta, un balance" | Se adaptan a `entries` (posiblemente un solo asiento en operaciones legacy) y a `byType`/`byCategory`, que no son el modelo del kit |
| `QuickAction` como patrón de icono circular + etiqueta | Su contenido de ejemplo (Request/Transfer/Top-up entre personas) | Los accesos rápidos reales son registrar ingreso/gasto, no P2P |
| Iconografía Lucide, outline, stroke 2px | El componente `Icon` del kit (fetch a jsDelivr + SVG inline en runtime) | Coincide con el criterio de "identificador semántico" de `icon` en categorías (`docs/APP_MOVIL.md` §4.6), pero el mecanismo no sirve en RN: depender de red para el tab bar es fràgil y no funciona offline. Se usa `lucide-react-native` (mismo set de iconos, empaquetado) en su lugar |

---

## Estado de ejecución

Verificado en el teléfono Android conectado (Samsung SM-A057M, vía USB/adb reverse):

- `adb devices` lo lista como `device`.
- La app carga en Expo Go, las cuatro pestañas navegan sin crash, el botón central abre `/register-operation` como modal con cabecera y flecha de volver, sin quedar seleccionado como pestaña activa.
- La pantalla de diagnóstico (Inicio) golpea `GET /api/health` contra el backend real corriendo en esta máquina y muestra `OK — {"status":"ok"}`.
- Tipografía (Sora/Plus Jakarta Sans), color de marca (`interactiveBrand`) y radios de pill en el botón se ven aplicados correctamente en pantalla.
- `npx tsc --noEmit` y `npx expo lint` sin errores.

Pendiente para cuando haya LAN real disponible: repetir la verificación de conectividad con `EXPO_PUBLIC_API_URL` apuntando a la IP local en vez de `localhost` con `adb reverse`, y confirmar que el firewall de Windows no bloquea el puerto 3000/8081 en ese escenario (no se pudo probar: no había WiFi común en esta sesión).
