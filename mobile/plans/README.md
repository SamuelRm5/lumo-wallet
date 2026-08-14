# Planes de ejecución de la app móvil

Detalle de ejecución de las fases necesarias para construir `mobile/` según `docs/APP_MOVIL.md`. Aquí no se decide **qué** hay que construir: eso lo fija `docs/APP_MOVIL.md`, que a su vez enlaza `docs/LOGICA_NEGOCIO.md` y `docs/BACKEND.md` §7. Aquí se escribe **en qué orden se tocan los archivos, con qué comandos y cómo se comprueba que la fase quedó cerrada en el teléfono real.**

## Estado

| Fase | Documento | Objetivo | Estado |
|---|---|---|---|
| 0 | [FASE-0.md](FASE-0.md) | Andamio: scaffolding de Expo, entorno del dispositivo Android, tokens de diseño recortados | cerrada. Verificada en el teléfono real vía USB/adb reverse (no había LAN común disponible, ver Desviaciones) |
| 1 | [FASE-1.md](FASE-1.md) | Sesión: login, refresh serializado, perfil | cerrada. Verificada en el teléfono real; la cola de refresco de un solo vuelo solo se revisó por código, ver Estado de ejecución |
| 2 | [FASE-2.md](FASE-2.md) | Inicio y cuentas, incluida conciliación | pendiente |
| 3 | [FASE-3.md](FASE-3.md) | Registrar operación (las cuatro formas) y categorías | pendiente |
| 4 | [FASE-4.md](FASE-4.md) | Movimientos: listado por cursor, edición, confirmación de pendientes | pendiente |
| 5 | [FASE-5.md](FASE-5.md) | Recurrentes y reportes | pendiente |
| 6 | [FASE-6.md](FASE-6.md) | Dispositivo, push y sincronización incremental | pendiente |
| 7 | [FASE-7.md](FASE-7.md) | Development build instalable en el teléfono | pendiente |

## Reglas comunes

- **No se empieza una fase sin cerrar la anterior.** Cerrar significa que todos los puntos de la sección Aceptación pasan **en el teléfono conectado**, no que el código esté escrito. Este proyecto tiene el dispositivo real disponible desde el día uno: no se acepta una fase solo porque compila.
- **Cada fase deja la app funcionando** en Expo Go (o la development build, desde la Fase 7) contra el backend en LAN.
- **El design system de `docs/Lumo Wallet Design System/`** describe una app de pagos entre personas con tarjetas físicas y virtuales, scan-to-pay y multi-moneda: no es el producto que se está construyendo. Se toma de ahí la parte agnóstica al dominio (tokens de color, tipografía, spacing, radios, sombras, motion, voz y componentes genéricos de `core`, `forms`, `feedback`, `navigation`) y se descarta lo específico de tarjetas/P2P/scan-to-pay. La Fase 0 deja escrita esa selección; ninguna fase posterior debe importar `PaymentCard`, `CurrencyChip` ni el patrón de FAB cítrico de scan-to-pay sin volver a justificarlo.
- **Toda desviación respecto a `docs/APP_MOVIL.md`** se anota en la sección Desviaciones del documento de la fase, con el motivo. Si es permanente, se lleva también al documento de origen.
- **Las mejoras que aparezcan por el camino no se arreglan en silencio.** Se señalan con la convención de `CLAUDE.md` (archivo:línea, por qué importa, costo, recomendación) en la sección Desviaciones u Observaciones de la fase donde aparecen.
- La sección **Fuera de alcance** de cada fase frena el impulso de adelantar trabajo. Si algo aparece ahí, no se hace ahora aunque cueste diez minutos.
- **HTTPS y despliegue quedan fuera de las ocho fases**, por decisión explícita de `docs/APP_MOVIL.md` §1: "en desarrollo nada de eso hace falta". Completar la app "hasta el límite descrito en el documento" se detiene en una development build funcionando en el teléfono contra el backend local.

## Formato de cada documento

1. **Objetivo** — una frase.
2. **Precondiciones** — qué debe estar cerrado antes de empezar.
3. **Endpoints** — qué sección de `docs/APP_MOVIL.md` §4 cubre.
4. **Pasos** — numerados, con los archivos concretos y los comandos exactos.
5. **Aceptación** — comprobaciones ejecutables en el teléfono, con su resultado esperado.
6. **Riesgos y reversión** — qué puede salir mal y cómo se vuelve atrás.
7. **Fuera de alcance** — lo que pertenece a otra fase.
8. **Desviaciones** — diferencias respecto a la especificación, con motivo.
