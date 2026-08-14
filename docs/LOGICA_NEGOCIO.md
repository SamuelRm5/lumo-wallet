# Lógica de negocio - Lumo Wallet

Definición funcional de la aplicación. Es el documento base: el modelo de datos, la API y el cliente móvil se derivan de aquí. Si algo en `BACKEND.md` contradice este archivo, manda este archivo.

---

## 1. Qué resuelve la app

Llevar el control de las finanzas de una persona respondiendo dos preguntas a la vez:

- **¿Cuánta plata debería tener?** — lo que entró menos lo que gasté.
- **¿Cuánta plata tengo de verdad?** — lo que hay en las cuentas más lo que me deben.

Cuando ambas cifras coinciden, el registro está completo. Cuando no coinciden, falta registrar algo. Esa reconciliación es el corazón de la app y la razón por la que existe el tipo de cuenta `fuente`; no es una app de presupuestos ni un libro contable, es un **detector de descuadres**.

---

## 2. Vocabulario

Los identificadores en código van en inglés; las etiquetas visibles al usuario en español.

| Concepto | Código | Etiqueta en la app |
|---|---|---|
| Usuario | `user` | Usuario |
| Cuenta | `account` | Cuenta |
| Cuenta líquida | `account` tipo `cash` | Depósito |
| Operación (evento real) | `operation` | Movimiento |
| Asiento (efecto sobre una cuenta) | `entry` | — (interno) |
| Categoría | `category` | Categoría |
| Regla recurrente | `recurringRule` | Recurrente |
| Monto | `amount` | Monto |
| Saldo | `balance` | Saldo |
| Descuadre | `discrepancy` | Descuadre |

---

## 3. Tipos de cuenta

Cuatro tipos. Los tres primeros existen hoy; el cuarto es una adición propuesta (ver sección 12).

| Código | Etiqueta | Qué representa | Ejemplos |
|---|---|---|---|
| `source` | Fuente | Plata que entró y todavía no se ha gastado. Es el presupuesto vivo. | Salario, Freelance, Venta de la moto |
| `cash` | Depósito | Plata líquida bajo mi control, donde efectivamente llega y de donde efectivamente sale. | Bancolombia, Nequi, Efectivo |
| `receivable` | Me deben | Plata mía que está en manos de otro y va a volver. | Préstamo a Juan, Reembolso pendiente |
| `liability` | Yo debo | Plata que gasté con crédito y todavía no sale de mis depósitos. | Tarjeta VISA, Fiado en la tienda |

En el dashboard, "Lo que debe haber" es el total de las fuentes y "Lo que hay" agrupa depósitos, por cobrar y deudas propias.

> **Corrección importante.** El tipo se llama hoy `deuda` y `CONTEXTO_PROYECTO.md` lo describe como "dinero que se debe (tarjetas, préstamos)". Eso es incorrecto: en el uso real son **cuentas por cobrar**, plata que a ti te deben. Por eso el dashboard la suma dentro de "Lo que hay" y por eso la fórmula con `+` está bien. En la migración a inglés pasa a llamarse `receivable`, y el nombre `liability` queda libre para lo que la doc creía que era.

`source` es la única cuenta que no contiene plata: es la contrapartida de control. `cash`, `receivable` y `liability` sí representan valor real.

---

## 4. La ecuación de control

```
cash + receivable + liability - source = 0
```

Con `liability` en negativo (deber es un saldo negativo), es equivalente a:

```
lo que tengo  -  lo que debo  =  lo que debería tener
```

El dashboard muestra la diferencia:

| Resultado | Significado | Color |
|---|---|---|
| `= 0` | Todo registrado. Estado normal y objetivo permanente. | Neutro |
| `> 0` | Tienes más plata de la que tu registro explica. Te faltó registrar un ingreso. | Verde |
| `< 0` | Tienes menos plata de la que tu registro explica. Te faltó registrar un gasto. | Rojo |

Sin cuentas `liability` la ecuación se reduce a `cash + receivable - source = 0`, que es exactamente lo que hace el código hoy en `Home.jsx:63`. El cambio es aditivo y no rompe los datos existentes.

El descuadre es **una señal de captura incompleta, no un dato financiero**. El texto actual "Tienes un excedente de X" / "Te faltan X" induce a leerlo como plata sobrante o faltante. Debe redactarse como lo que es: "Hay $X sin registrar".

### Conciliación contra la realidad

La ecuación solo detecta un error: registrar una pata y olvidar la otra. Con la app escribiendo ambas patas ese error se vuelve imposible, y el indicador queda permanentemente en cero. No miente —el registro sí es internamente consistente— pero deja de aportar información.

| Error posible | Modelo actual | Modelo nuevo |
|---|---|---|
| Se registra una pata y se olvida la otra | Descuadra | No puede ocurrir |
| Los montos de las dos patas no coinciden | Descuadra | No puede ocurrir: hay un solo monto |
| No se registra la operación en absoluto | No se detecta | Se detecta al conciliar |
| Comisión o cobro del banco que el usuario desconoce | No se detecta | Se detecta al conciliar |
| Ingreso que el usuario no anotó | No se detecta | Se detecta al conciliar |

Los tres últimos casos nunca fueron detectables por la ecuación: si no se registra nada, ambos lados quedan iguales y la resta sigue dando cero. La verificación que sí los cubre es la **conciliación**, y pasa a ser el mecanismo de control central de la app.

**Cómo funciona.** El usuario abre un depósito y responde cuánto hay de verdad. La app compara contra su saldo calculado y, si hay diferencia, registra un **ajuste** por el faltante o el sobrante.

```
Bancolombia, saldo calculado    2.800.000
Saldo real segun el banco       2.760.000
Diferencia                        -40.000  ->  ajuste de salida
```

Un faltante genera un ajuste de salida: plata que se fue sin registrarse, es decir un gasto que no se anotó. Un sobrante genera un ajuste de entrada: un ingreso que no se anotó. En ambos casos el ajuste toca también la fuente, porque no es plata que cambió de lugar sino que entró o salió del sistema sin quedar registrada.

Reglas:

- Solo se concilian cuentas con contrapartida real: `cash`, `receivable` y `liability`. Una cuenta `source` no se puede conciliar porque no hay nada afuera contra qué compararla.
- Cada cuenta guarda cuándo se concilió por última vez. El dashboard muestra ese estado por depósito, que es la pregunta que el usuario realmente necesita responder: si la app refleja la plata que existe.
- Si la diferencia es cero, no se crea ningún ajuste; solo se registra la fecha de conciliación.
- El ajuste generado queda marcado como originado en una conciliación, para distinguirlo de un ajuste manual.

---

## 5. Operaciones

Hoy el usuario crea movimientos sueltos: comprar mercado obliga a registrar a mano un egreso en la fuente y otro en Nequi, en dos pantallas distintas, sin que nada los relacione. Olvidar el segundo produce un descuadre indistinguible de un error real.

La app pasa a registrar **operaciones**: un evento del mundo real que genera automáticamente sus dos asientos.

| Operación | El usuario elige | Asientos generados | Toca `source` |
|---|---|---|---|
| **Ingreso** | monto, cuenta destino (`cash`), categoría, fecha | `source` +monto · destino +monto | Sí, sube |
| **Gasto** | monto, cuenta origen (`cash` o `liability`), categoría, fecha | `source` −monto · origen −monto | Sí, baja |
| **Transferencia** | monto, cuenta origen, cuenta destino, fecha | origen −monto · destino +monto | No |
| **Ajuste** | monto, cuenta, motivo | `source` ±monto · cuenta ±monto | Sí |

Reglas:

- Un **ingreso** trae plata nueva al sistema. Sube lo que hay y lo que debería haber.
- Un **gasto** saca plata del sistema. Baja ambos lados.
- Una **transferencia** solo cambia la plata de lugar: entre cuentas propias (Nequi → Efectivo), al prestar (`cash` → `receivable`), al cobrar (`receivable` → `cash`) o al pagar una tarjeta (`cash` → `liability`). **Nunca toca `source`**, y por eso nunca aparece como ingreso ni como gasto en los reportes. Ese es el problema que resuelve: hoy prestarle plata a alguien se ve como un gasto y cobrarla se ve como un ingreso, inflando ambos totales.
- Un **ajuste** registra plata que entró o salió sin quedar anotada. Es lo que genera la conciliación (§4) y también la salida manual para cerrar un descuadre irreconstruible. Queda marcado como tal para que no se mezcle con el gasto categorizado.

Si hay varias cuentas `source`, el ingreso y el gasto piden a cuál se imputan. Con una sola, se selecciona por defecto y no se pregunta.

---

## 6. Recorrido completo

Estado inicial en cero. Cada paso muestra la ecuación cerrando.

| # | Evento | Operación | Efecto | source | cash | receivable | Control |
|---|---|---|---|---|---|---|---|
| 1 | Llega el salario a Nequi | Ingreso 3.000.000 | Salario +3.000.000 · Nequi +3.000.000 | 3.000.000 | 3.000.000 | 0 | 0 |
| 2 | Mercado con Nequi | Gasto 200.000, cat. Comida | Salario −200.000 · Nequi −200.000 | 2.800.000 | 2.800.000 | 0 | 0 |
| 3 | Retiro a efectivo | Transferencia 500.000 | Nequi −500.000 · Efectivo +500.000 | 2.800.000 | 2.800.000 | 0 | 0 |
| 4 | Le prestas a Juan | Transferencia 300.000 | Efectivo −300.000 · Juan +300.000 | 2.800.000 | 2.500.000 | 300.000 | 0 |
| 5 | Juan te paga a Nequi | Transferencia 300.000 | Juan −300.000 · Nequi +300.000 | 2.800.000 | 2.800.000 | 0 | 0 |

Con el tipo `liability` propuesto:

| # | Evento | Operación | Efecto | source | cash | liability | Control |
|---|---|---|---|---|---|---|---|
| 6 | Compra con la VISA | Gasto 450.000, cat. Ropa | Salario −450.000 · VISA −450.000 | 2.350.000 | 2.800.000 | −450.000 | 0 |
| 7 | Pagas la VISA con Nequi | Transferencia 450.000 | Nequi −450.000 · VISA +450.000 | 2.350.000 | 2.350.000 | 0 | 0 |

Nótese el paso 6: el gasto se registra el día de la compra, no el día del pago. Es la única forma de que el reporte de gastos del mes refleje lo que realmente consumiste.

---

## 7. Categorías

Catálogo plano por usuario, editable.

- Cada categoría tiene `name`, `icon`, `color` y `kind` (`income` o `expense`), que filtra el selector según la operación.
- La categoría es **opcional** en ingresos y gastos. No se pide en transferencias ni en ajustes: una transferencia no es consumo.
- Al crear un usuario se siembra un set inicial: Comida, Transporte, Servicios, Salud, Hogar, Ocio, Educación, Otros para gasto; Salario, Freelance, Ventas, Regalos, Otros para ingreso.
- Borrar una categoría es soft delete. Las operaciones que la usaban la conservan y siguen apareciendo en reportes históricos.
- Sin subcategorías. Si más adelante hacen falta, se agregan como campo `parentId` sin romper nada.

---

## 8. Movimientos recurrentes

Los eventos que se repiten (arriendo, suscripciones, salario) se definen una vez como regla.

Una regla guarda: tipo de operación, monto, categoría, cuentas origen/destino, frecuencia, día, fecha de inicio, fecha de fin opcional y modo de ejecución.

Dos modos:

- **Automático** — la app genera la operación en la fecha y notifica que ya quedó registrada. Para montos fijos y confiables: arriendo, Netflix.
- **Recordatorio** — la app notifica y deja la operación **pendiente de confirmación**, con el monto precargado y editable. Para montos variables: servicios públicos, mercado quincenal.

Reglas:

- Una operación generada por una regla queda enlazada a ella (`recurringRuleId`) y es editable y borrable como cualquier otra, sin afectar la regla.
- Editar una regla no reescribe las operaciones ya generadas.
- Si la app estuvo cerrada, al abrir se generan las ocurrencias pendientes desde la última ejecución. Nunca se duplican: cada ocurrencia se identifica por `(recurringRuleId, fecha prevista)`.
- Una operación pendiente de confirmación **no afecta saldos** hasta que se confirma.
- Las notificaciones se entregan por push a través de Expo, con el dispositivo registrado por usuario.

---

## 9. Invariantes

Reglas que el backend debe garantizar siempre, sin depender del cliente.

1. Toda operación genera **exactamente dos asientos** y deja intacta la ecuación de control. Se escriben en una sola transacción de base de datos o no se escribe ninguno.

   Los dos asientos **no suman cero entre sí**, salvo en las transferencias: en un ingreso ambos son entradas (sube la fuente y sube el depósito) y en un gasto ambos son salidas. Lo que suma cero es su contribución a la ecuación, porque las cuentas `source` cuentan con signo invertido:

   ```
   signed(asiento) = monto_del_asiento * (cuenta es source ? -1 : +1)
   ```

   El monto del asiento ya viene firmado: negativo si sale de la cuenta. Una operación es válida si `Σ signed(asientos) = 0`, y se verifica antes de escribir. La implementación está en `BACKEND.md` §6.2.
2. `amount` es siempre **estrictamente positivo**. El signo lo determina la dirección del asiento, nunca el monto.
3. Las dos cuentas de una operación pertenecen al usuario autenticado, están activas y son distintas entre sí.
4. Una transferencia no puede involucrar una cuenta `source`.
5. Un ingreso deposita en `cash`. Un gasto sale de `cash` o de `liability`.
6. Los saldos **nunca se almacenan**: se calculan sumando los asientos activos.
7. Un saldo negativo es legal en cualquier tipo de cuenta. Es información, no un error: Nequi en negativo significa que falta registrar un ingreso.
8. Nada se borra físicamente. Todo es soft delete y toda lectura filtra por estado activo.
9. Borrar una operación borra sus dos asientos. Es imposible dejar media operación viva.
10. Todos los datos se filtran por usuario. Cada usuario es una isla: no hay cuentas ni categorías compartidas.

---

## 10. Ciclo de vida y edición

- **Editar una operación** reemplaza sus dos asientos dentro de una transacción. Cambiar de cuenta, de monto, de tipo o de fecha es válido.
- **Borrar una cuenta** es soft delete. Las operaciones asociadas se conservan pero dejan de contar en los saldos. Una cuenta con saldo distinto de cero no debería poder borrarse sin advertencia explícita: hacerlo produce un descuadre permanente.
- **La fecha de la operación la controla el usuario** y es independiente de cuándo se registró. Ambas se guardan: `date` para reportes, `createdAt` para auditoría.
- **No hay cierre de período.** Se puede registrar y editar en cualquier fecha, hacia atrás o hacia adelante.

---

## 11. Reportes

Todo lo siguiente se deriva del modelo sin datos adicionales:

- Gasto por categoría en un período, y su evolución mes a mes.
- Ingreso contra gasto por mes, con el neto.
- Evolución del saldo de una cuenta en el tiempo.
- Distribución de la plata entre cuentas en una fecha dada.
- Historial del descuadre: si sube, la captura se está degradando.
- Total por cobrar y antigüedad de cada préstamo.

Reglas obligatorias en todo reporte de ingreso o gasto:

- **Sumar solo los asientos de cuentas que no son `source`.** Cada operación tiene dos asientos por el mismo monto; contar ambos duplica la cifra. Aplica igual a datos nuevos y a los `legacy`.
- **Excluir transferencias.** No son consumo, solo cambio de lugar.
- **Reportar los ajustes en una línea propia**, ni mezclados con el gasto categorizado ni escondidos. Un faltante de conciliación es plata que sí se gastó, así que ocultarlo subestima el total; pero no tiene categoría, así que meterlo en el desglose crea una categoría fantasma. Va aparte, como "Sin identificar".

Un desglose mensual sano se lee: ingresos, gastos por categoría, gastos sin categoría, ajustes sin identificar, neto. Las dos últimas líneas no son lo mismo y no deben mezclarse: **sin categoría** es plata que sabes en qué se fue pero no clasificaste; **sin identificar** es plata que no sabes dónde quedó, detectada al conciliar. Si la segunda crece mes a mes, la captura se está degradando.

---

## 12. Decisiones tomadas

No quedan decisiones abiertas: el modelo está cerrado y se puede desarrollar.

1. **Se agrega el tipo `liability`.** Sin él no hay dónde registrar una tarjeta de crédito o un préstamo recibido, y el gasto quedaría registrado el día que pagas en vez del día que compras, desfasando el reporte del mes. La ecuación de control lo absorbe sin cambios (§4).

2. **La categoría es opcional.** No frena la captura rápida. Las operaciones sin categoría se agrupan en los reportes como "Sin categoría", que es una línea distinta de la de ajustes: "Sin categoría" es plata que sí sabes en qué se fue pero no clasificaste; "Sin identificar" es plata que no sabes dónde quedó.

3. **Una sola moneda: COP.** No hay conversión ni tasas de cambio en ninguna parte. El campo de moneda existe en la cuenta con valor fijo, solo para no requerir una migración si algún día cambia.

4. **La conciliación es pasiva.** La app no recuerda ni notifica: muestra en el dashboard cuándo se concilió por última vez cada depósito y el usuario decide cuándo hacerlo. Las notificaciones quedan reservadas a los recurrentes (§8).

5. **Qué se hace con el histórico.** Los movimientos actuales son asientos sueltos: un gasto de 200.000 quedó como dos filas independientes, una en la fuente y otra en Nequi, sin ninguna referencia entre ellas. Esa relación nunca se guardó y no se puede reconstruir: emparejar por monto y fecha adivina mal cuando hay dos gastos iguales el mismo día, y las veces que se olvidó registrar una pata dejaron filas huérfanas reales.

   **Se conserva.** Cada fila vieja entra como una operación de un solo asiento marcada `legacy`. Los saldos quedan idénticos a los actuales y el historial se mantiene completo. El invariante de §9.1 aplica solo a operaciones nuevas, y se verifica al escribir, nunca al leer.

   Se descartó la alternativa de arrancar limpio con saldos iniciales por cuenta: es un modelo sin excepciones desde el día uno, pero pierde el detalle histórico.

   En cualquier caso no se puede graficar el descuadre hacia atrás, porque depende de si en su momento se registraron ambas patas.

---

## 13. Impacto en el modelo de datos

Resumen de lo que este documento implica. El detalle de migración está en `BACKEND.md`.

| Tabla | Cambio |
|---|---|
| `users` | Sin cambios funcionales |
| `accounts` | `type` pasa a `source` / `cash` / `receivable` / `liability`; se agregan `currency` y `lastReconciledAt` |
| `operations` | **Nueva.** `id`, `userId`, `kind`, `amount`, `categoryId`, `date`, `description`, `origin`, `recurringRuleId`, `status`, `createdAt`, `updatedAt` |
| `entries` | **Nueva.** `id`, `operationId`, `accountId`, `amount` firmado |
| `categories` | **Nueva.** `id`, `userId`, `name`, `icon`, `color`, `kind`, `status` |
| `recurring_rules` | **Nueva.** definición de la regla, `mode` (`auto`/`reminder`), `nextRunAt` |
| `movimientos` | Se convierte en `entries` + `operations`; el histórico migra como operaciones de un asiento |

El cambio de fondo es que **el saldo de una cuenta pasa a calcularse sobre `entries`**, no sobre movimientos con tipo `ingreso`/`egreso`. Como el monto del asiento ya viene firmado, el saldo es un `SUM` plano sobre una tabla indexada por `accountId`, sin condicionales.

El saldo nunca se almacena. El razonamiento y los números que sostienen esa decisión están en `BACKEND.md` §3.3.
