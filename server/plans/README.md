# Planes de ejecución del backend

Detalle de ejecución de las fases definidas en `docs/BACKEND.md` §12. Aquí no se decide **qué** hay que construir: eso lo fijan `docs/LOGICA_NEGOCIO.md` y `docs/BACKEND.md`, y mandan sobre estos archivos. Aquí se escribe **en qué orden se tocan los archivos, con qué comandos y cómo se comprueba que la fase quedó cerrada**.

## Estado

| Fase | Documento | Objetivo | Estado |
|---|---|---|---|
| 0 | [FASE-0.md](FASE-0.md) | Andamio: configuración, fechas, errores y logging | cerrada |
| 1 | [FASE-1.md](FASE-1.md) | Prisma sobre el esquema actual, sin cambiar el contrato | cerrada. Deriva contra producción verificada: ninguna |
| 2 | [FASE-2.md](FASE-2.md) | Blindaje: validación, rate limiting, registro cerrado | cerrada |
| 3 | [FASE-3.md](FASE-3.md) | Esquema nuevo y migración del histórico | ensayada y verificada sobre una copia de producción; falta aplicarla |
| 4 | [FASE-4.md](FASE-4.md) | API nueva: operaciones, conciliación, categorías | siguiente |
| 5 | [FASE-5.md](FASE-5.md) | Operación: recurrentes, push, sync | pendiente |

## Reglas comunes

- **No se empieza una fase sin cerrar la anterior.** Cerrar significa que todos los puntos de la sección Aceptación pasan, no que el código esté escrito.
- **Cada fase deja la aplicación funcionando.** Un commit intermedio puede estar incompleto; el último de la fase no.
- **Toda desviación respecto a `docs/BACKEND.md` se anota** en la sección Desviaciones del documento de la fase, con el motivo. Si la desviación es permanente, se lleva también al documento de origen.
- **Las mejoras que aparezcan por el camino no se arreglan en silencio.** Van a `docs/BACKEND.md` §2 con su estado, y se arreglan en la fase que les corresponde.
- La sección **Fuera de alcance** de cada fase existe para frenar el impulso de adelantar trabajo. Si algo aparece ahí, no se hace ahora aunque cueste diez minutos.

## Formato de cada documento

1. **Objetivo** — una frase.
2. **Precondiciones** — qué debe estar cerrado antes de empezar.
3. **Pasos** — numerados, con los archivos concretos y los comandos exactos.
4. **Aceptación** — comprobaciones ejecutables con su resultado esperado.
5. **Riesgos y reversión** — qué puede salir mal y cómo se vuelve atrás.
6. **Fuera de alcance** — lo que pertenece a otra fase.
7. **Desviaciones** — diferencias respecto a la especificación, con motivo.
