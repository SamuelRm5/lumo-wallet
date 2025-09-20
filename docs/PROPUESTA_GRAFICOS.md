# 📊 PROPUESTA DE GRÁFICOS PARA CUENTAS-MELI

## 🎯 **RESUMEN EJECUTIVO**

Esta propuesta detalla la implementación de **gráficos financieros interactivos** para la aplicación cuentas-meli, aprovechando los datos existentes de cuentas y movimientos con **separación por usuario** para crear insights valiosos qu### **🚀 FASE 2 - Distribución y Patrones (2 semanas)**
1. **✅ Distribución de gastos:** Pie + Bar charts interactivos
2. **✅ Calendario de gastos:** Heatmap básico
3. **✅ Filtros y controles:** Selectores de período
4. **✅ Búsquedas por fecha:** Endpoint optimizado para rangos

### **🔧 FASE 3 - Pulimiento y Optimización (2 semanas)**
1. **✅ Métricas avanzadas:** KPIs y ratios financieros
2. **✅ Exportación:** PDF/PNG de gráficos
3. **✅ Responsive:** Optimización móvil
4. **✅ Testing:** Pruebas y documentaciónla toma de decisiones financieras familiares.

---

## 📋 **ANÁLISIS DE DATOS DISPONIBLES**

### **🗄️ Datos Base Existentes:**

#### **Tabla Usuarios:**
```sql
- id, nombre, email, crea## 🎯 **VALOR AGREGADO PARA USUARIOS**

### **📈 Para Gestión Personal:**
- **Visibilidad financiera:** Situación clara de cada cuenta
- **Patrones identificados:** Detectar gastos excesivos o hábitos
- **Metas visuales:** Progreso hacia objetivos personales
- **Educación financiera:** Gráficos ayudan a entender conceptos

### **💼 Para Toma de Decisiones:**
- **Análisis visual:** Datos claros para mejores elecciones
- **Planificación:** Proyecciones y tendencias para presupuestar
- **Control:** Identificar desviaciones rápidamente
- **Motivación:** Ver progreso visualmente es motivador

### **📅 Para Búsquedas Temporales:**
- **Rangos personalizados:** Buscar movimientos por fechas específicas
- **Estadísticas automáticas:** Totales y promedios del período
- **Filtros avanzados:** Por cuenta, tipo de movimiento
- **Reportes rápidos:** Datos organizados para análisis

#### **Tabla Cuentas:**
```sql
- id, nombre, descripcion, tipo, usuarioId, createdAt, estado
- tipos: 'normal', 'deuda', 'fuente'
```

#### **Tabla Movimientos:**
```sql
- id, cuentaId, tipo, monto, descripcion, createdAt, estado
- tipos: 'ingreso', 'egreso'
```

### **💡 Datos Calculados Posibles:**
- **Totales por tipo de cuenta** (normal, deuda, fuente)
- **Balance general** por usuario: `Normal + |Deuda| - Fuente`
- **Flujo temporal** de ingresos vs egresos
- **Tendencias mensuales** de gastos/ingresos
- **Distribución de gastos** por cuenta
- **Evolución de saldos** en el tiempo
- **Comparativas familiares** (opcional)

---

## 📊 **GRÁFICOS PROPUESTOS**

### **1. 📈 GRÁFICO DE TENDENCIAS TEMPORALES**
**Tipo:** Line Chart (Recharts)  
**Objetivo:** Visualizar evolución de ingresos vs egresos en el tiempo

#### **Datos a mostrar:**
```javascript
{
  fecha: '2025-09',
  ingresos: 2500000,
  egresos: 1800000,
  balance: 700000,
  acumulado: 3200000
}
```

#### **Funcionalidades:**
- **Período seleccionable:** Últimos 6 meses, 1 año, todo el tiempo
- **Toggle de datos:** Mostrar/ocultar ingresos, egresos, balance
- **Tooltips informativos** con detalles del período
- **Zoom y pan** para explorar períodos específicos

#### **Implementación:**
```javascript
const TendenciasChart = ({ usuarioId, periodo = '6m' }) => {
  const [data, setData] = useState([]);
  
  const fetchTendencias = async () => {
    const movimientos = await api.getMovimientosByPeriodo(usuarioId, periodo);
    const agrupados = agruparPorMes(movimientos);
    setData(agrupados);
  };
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="fecha" />
        <YAxis />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Legend />
        <Line type="monotone" dataKey="ingresos" stroke="#10B981" strokeWidth={2} />
        <Line type="monotone" dataKey="egresos" stroke="#EF4444" strokeWidth={2} />
        <Line type="monotone" dataKey="acumulado" stroke="#3B82F6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

### **2. 🥧 DISTRIBUCIÓN DE GASTOS POR CUENTA**
**Tipo:** Pie Chart + Bar Chart  
**Objetivo:** Entender dónde se va el dinero

#### **Datos a mostrar:**
```javascript
[
  { nombre: 'Tarjeta Crédito', valor: 850000, tipo: 'deuda', porcentaje: 45 },
  { nombre: 'Gastos Casa', valor: 600000, tipo: 'normal', porcentaje: 32 },
  { nombre: 'Préstamo Auto', valor: 450000, tipo: 'deuda', porcentaje: 23 }
]
```

#### **Funcionalidades:**
- **Pie Chart interactivo** con colores por tipo de cuenta
- **Bar Chart complementario** para mejor comparación
- **Filtros:** Por tipo de cuenta, por período
- **Drill-down:** Click para ver movimientos de la cuenta

#### **Implementación:**
```javascript
const DistribucionGastos = ({ usuarioId, periodo = '1m' }) => {
  const [chartType, setChartType] = useState('pie'); // 'pie' | 'bar'
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Distribución de Gastos</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setChartType('pie')}
            className={`px-3 py-1 rounded ${chartType === 'pie' ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}
          >
            🥧 Torta
          </button>
          <button 
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 rounded ${chartType === 'bar' ? 'bg-primary-500 text-white' : 'bg-gray-200'}`}
          >
            📊 Barras
          </button>
        </div>
      </div>
      
      {chartType === 'pie' ? <PieChartComponent data={data} /> : <BarChartComponent data={data} />}
    </div>
  );
};
```

---

### **3. 💰 BALANCE PATRIMONIAL**
**Tipo:** Stacked Bar Chart + Gauge Chart  
**Objetivo:** Visualizar salud financiera general

#### **Datos a mostrar:**
```javascript
{
  normal: 1200000,    // Lo que tengo
  deudas: -800000,    // Lo que debo
  fuentes: 2000000,   // Lo que debería tener
  balance: -600000,   // Diferencia (Normal + |Deudas| - Fuentes)
  porcentajeEficiencia: 70 // (Normal + |Deudas|) / Fuentes * 100
}
```

#### **Funcionalidades:**
- **Gauge Chart** para porcentaje de eficiencia financiera
- **Stacked bars** mostrando composición de activos/pasivos
- **Indicadores visuales:** Verde (bien), Amarillo (cuidado), Rojo (problema)
- **Comparación temporal:** Evolución del balance

#### **Implementación:**
```javascript
const BalancePatrimonial = ({ usuarioId }) => {
  const getColorByBalance = (balance) => {
    if (balance >= 0) return '#10B981'; // Verde
    if (balance >= -500000) return '#F59E0B'; // Amarillo
    return '#EF4444'; // Rojo
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl">
        <h3>Eficiencia Financiera</h3>
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart data={[{value: porcentajeEficiencia}]}>
            <RadialBar dataKey="value" fill={getColorByBalance(balance)} />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
              {porcentajeEficiencia}%
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-white p-6 rounded-xl">
        <h3>Composición Patrimonial</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={patrimonialData} layout="horizontal">
            <XAxis type="number" />
            <YAxis type="category" dataKey="tipo" />
            <Bar dataKey="valor" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
```

---

### **4. 📅 CALENDARIO DE GASTOS**
**Tipo:** Heatmap Calendar  
**Objetivo:** Identificar patrones de gastos por día/semana

#### **Datos a mostrar:**
```javascript
[
  { fecha: '2025-09-01', gastos: 45000, intensidad: 0.3 },
  { fecha: '2025-09-02', gastos: 120000, intensidad: 0.8 },
  { fecha: '2025-09-03', gastos: 0, intensidad: 0 }
]
```

#### **Funcionalidades:**
- **Heatmap** con intensidad de color por cantidad gastada
- **Selector de mes/año**
- **Tooltips** con detalles del día
- **Patrones visuales:** Identificar días de mayor gasto

---

## 🏗️ **ARQUITECTURA TÉCNICA**

### **📦 Dependencias Nuevas:**
```json
{
  "recharts": "^2.8.0",
  "date-fns": "^2.30.0",
  "d3-scale": "^4.0.2",
  "react-calendar-heatmap": "^1.9.0"
}
```

### **🗄️ Nuevos Endpoints Backend:**

#### **`GET /api/v1/analytics/tendencias/:usuarioId`**
```javascript
// Parámetros: periodo (1m, 3m, 6m, 1y, all)
// Respuesta: Array de { fecha, ingresos, egresos, balance, acumulado }
```

#### **`GET /api/v1/analytics/distribucion/:usuarioId`**
```javascript
// Parámetros: periodo, tipo_cuenta
// Respuesta: Array de { cuenta, tipo, total, porcentaje }
```

#### **`GET /api/v1/analytics/balance/:usuarioId`**
```javascript
// Respuesta: { normal, deudas, fuentes, balance, eficiencia }
```

#### **`GET /api/v1/analytics/calendario/:usuarioId`**
```javascript
// Parámetros: año, mes
// Respuesta: Array de { fecha, gastos, ingresos, cantidad_movimientos }
```

### **🎨 Estructura Frontend:**
```
client/src/
├── pages/
│   └── Analytics.jsx          # Nueva página de gráficos
├── components/
│   ├── charts/
│   │   ├── TendenciasChart.jsx
│   │   ├── DistribucionChart.jsx
│   │   ├── BalanceChart.jsx
│   │   └── CalendarioChart.jsx
│   └── analytics/
│       ├── PeriodSelector.jsx
│       ├── ChartContainer.jsx
│       └── MetricsCards.jsx
└── hooks/
    ├── useAnalytics.js
    └── useChartData.js
```

---

## 🎯 **IMPLEMENTACIÓN POR FASES**

### **🚀 FASE 1 - MVP (2-3 semanas)**
1. **✅ Setup básico:** Recharts + página Analytics
2. **✅ Gráfico de tendencias:** Line chart ingresos vs egresos
3. **✅ Balance patrimonial:** Gauge + indicadores simples
4. **✅ Endpoints backend:** Datos básicos de analytics

### **📈 FASE 2 - Distribución y Patrones (2 semanas)**
1. **✅ Distribución de gastos:** Pie + Bar charts interactivos
2. **✅ Calendario de gastos:** Heatmap básico
3. **✅ Filtros y controles:** Selectores de período

### **👥 FASE 3 - Comparativas y Avanzado (3 semanas)**
1. **✅ Comparativa familiar:** Multi-user charts (opcional)
2. **✅ Métricas avanzadas:** KPIs y ratios financieros
3. **✅ Exportación:** PDF/PNG de gráficos
4. **✅ Responsive:** Optimización móvil

---

## 💡 **MÉTRICAS Y KPIs CALCULADOS**

### **📊 Indicadores Principales:**
```javascript
const metrics = {
  // Liquidez
  ratioLiquidez: cuentasNormales / deudas,
  
  // Eficiencia
  eficienciaPresupuesto: (ingresosTotales / fuentesTotales) * 100,
  
  // Tendencias
  crecimientoMensual: (ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior,
  
  // Patrones
  gastoPromedioDiario: gastosMensuales / 30,
  diaConMayorGasto: maxGastoPorDia.fecha,
  
  // Salud financiera
  indiceSaludFinanciera: calcularIndiceSalud(normal, deudas, fuentes),
  
  // Proyecciones
  proyeccionBalance: calcularProyeccion(tendenciaActual, mesesProyectar)
};
```

### **🎨 Cards de Métricas:**
```javascript
const MetricsCards = ({ metrics }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <MetricCard 
      titulo="Eficiencia" 
      valor={`${metrics.eficienciaPresupuesto}%`}
      color={getColorByValue(metrics.eficienciaPresupuesto)}
      icono="📊"
    />
    <MetricCard 
      titulo="Liquidez" 
      valor={formatRatio(metrics.ratioLiquidez)}
      color={getColorByRatio(metrics.ratioLiquidez)}
      icono="💧"
    />
    <MetricCard 
      titulo="Crecimiento" 
      valor={`${metrics.crecimientoMensual}%`}
      color={metrics.crecimientoMensual >= 0 ? 'green' : 'red'}
      icono="📈"
    />
    <MetricCard 
      titulo="Salud" 
      valor={metrics.indiceSaludFinanciera}
      color={getColorBySalud(metrics.indiceSaludFinanciera)}
      icono="❤️"
    />
  </div>
);
```

---

## 📱 **DISEÑO UX/UI**

### **🎨 Paleta de Colores Financieros:**
```css
:root {
  --green-income: #10B981;    /* Ingresos */
  --red-expense: #EF4444;     /* Egresos */
  --primary-balance: #243252;    /* Balance */
  --orange-debt: #F59E0B;     /* Deudas */
  --purple-savings: #8B5CF6;  /* Ahorros */
  --gray-neutral: #6B7280;    /* Neutro */
}
```

### **📱 Responsive Design:**
```javascript
const ResponsiveChart = ({ children, minHeight = 300 }) => (
  <div className="w-full" style={{ minHeight }}>
    <div className="block md:hidden">
      {/* Versión móvil simplificada */}
      <MobileChart {...props} />
    </div>
    <div className="hidden md:block">
      {/* Versión desktop completa */}
      {children}
    </div>
  </div>
);
```

### **🎯 Interactividad:**
- **Tooltips informativos** con formato de moneda
- **Zoom y pan** en gráficos temporales
- **Click para drill-down** en segmentos
- **Filtros dinámicos** sin recargar página
- **Exportación** de gráficos como imagen

---

## 🔧 **BACKEND - CONTROLADOR DE ANALYTICS**

### **📁 Estructura:**
```javascript
// controllers/analytics.controller.js
const analytics = {
  
  // Tendencias temporales
  getTendencias: async (req, res) => {
    const { usuarioId } = req;
    const { periodo = '6m' } = req.query;
    
    try {
      const fechaInicio = calcularFechaInicio(periodo);
      
      const movimientos = await Movimientos.findAll({
        include: [{
          model: Cuentas,
          where: { usuarioId },
          attributes: ['tipo']
        }],
        where: {
          createdAt: { [Op.gte]: fechaInicio },
          estado: 'activo'
        },
        order: [['createdAt', 'ASC']]
      });
      
      const tendencias = agruparPorPeriodo(movimientos, periodo);
      res.json(tendencias);
      
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener tendencias' });
    }
  },
  
  // Distribución de gastos
  getDistribucion: async (req, res) => {
    const { usuarioId } = req;
    const { periodo = '1m', tipoCuenta } = req.query;
    
    const whereClause = { usuarioId, estado: 'activo' };
    if (tipoCuenta) whereClause.tipo = tipoCuenta;
    
    const distribucion = await Cuentas.findAll({
      where: whereClause,
      include: [{
        model: Movimientos,
        where: {
          tipo: 'egreso',
          createdAt: { [Op.gte]: calcularFechaInicio(periodo) },
          estado: 'activo'
        },
        attributes: []
      }],
      attributes: [
        'id', 'nombre', 'tipo',
        [fn('SUM', col('movimientos.monto')), 'total']
      ],
      group: ['cuentas.id'],
      order: [[literal('total'), 'DESC']]
    });
    
    res.json(distribucion);
  },
  
  // Balance patrimonial
  getBalance: async (req, res) => {
    const { usuarioId } = req;
    
    const resumen = await Cuentas.findAll({
      where: { usuarioId, estado: 'activo' },
      include: [{
        model: Movimientos,
        where: { estado: 'activo' },
        attributes: []
      }],
      attributes: [
        'tipo',
        [fn('SUM', 
          literal('CASE WHEN movimientos.tipo = "ingreso" THEN movimientos.monto ELSE -movimientos.monto END')
        ), 'saldo']
      ],
      group: ['tipo']
    });
    
    const balance = calcularBalance(resumen);
    res.json(balance);
  }
};
```

---

## 🎯 **VALOR AGREGADO PARA USUARIOS**

### **👨‍👩‍👧‍👦 Para Familias:**
- **Visibilidad financiera:** Cada miembro ve su situación claramente
- **Patrones identificados:** Detectar gastos excesivos o hábitos
- **Metas visuales:** Progreso hacia objetivos familiares
- **Educación financiera:** Gráficos ayudan a entender conceptos

### **💼 Para Gestión Personal:**
- **Toma de decisiones:** Datos visuales para mejores elecciones
- **Planificación:** Proyecciones y tendencias para presupuestar
- **Control:** Identificar desviaciones rápidamente
- **Motivación:** Ver progreso visualmente es motivador

### **📊 Para Análisis Avanzado:**
- **Comparaciones temporales:** ¿Estoy mejorando?
- **Benchmarking familiar:** ¿Cómo van otros miembros?
- **Alertas visuales:** Problemas identificados automáticamente
- **Reportes:** Datos para tomar decisiones importantes

---

## 🚀 **CRONOGRAMA DE IMPLEMENTACIÓN**

### **Semana 1-2: Setup y Backend**
- ✅ Instalar Recharts y dependencias
- ✅ Crear controlador analytics
- ✅ Endpoints básicos de tendencias y balance
- ✅ Migrations y SQL optimizados

### **Semana 3-4: Gráficos Core**
- ✅ Componente de tendencias temporales
- ✅ Balance patrimonial con gauge
- ✅ Página Analytics con navegación
- ✅ Responsive design básico

### **Semana 5-6: Distribución y Patrones**
- ✅ Pie/Bar charts de distribución
- ✅ Calendario heatmap
- ✅ Filtros y controles interactivos
- ✅ Métricas y KPIs cards

### **Semana 7-8: Pulimiento y Extras**
- ✅ Comparativa familiar (opcional)
- ✅ Exportación de gráficos
- ✅ Optimización móvil
- ✅ Testing y documentación

---

## 💰 **ESTIMACIÓN DE ESFUERZO**

### **Backend (35 horas):**
- Analytics controller: 14h
- Endpoints y SQL: 10h
- Búsquedas por fecha: 6h
- Testing y optimización: 5h

### **Frontend (50 horas):**
- Setup y configuración: 8h
- Componentes de gráficos: 28h
- Página Analytics: 10h
- Responsive y UX: 4h

### **🎯 Total Estimado: 85 horas (2 meses a tiempo parcial)**

---

## 🎉 **RESULTADO ESPERADO**

Al finalizar esta implementación, los usuarios familiares de cuentas-meli tendrán:

✅ **Dashboard visual** con insights financieros claros  
✅ **Gráficos interactivos** para explorar sus datos  
✅ **Métricas automáticas** de salud financiera  
✅ **Patrones identificados** de gastos e ingresos  
✅ **Comparativas temporales** para medir progreso  
✅ **Herramientas de planificación** visual  
✅ **Experiencia móvil optimizada** para consulta diaria  

**¡Una aplicación de finanzas familiares verdaderamente completa y poderosa!** 🚀

---

**📅 Fecha de propuesta:** 19 de septiembre, 2025  
**👥 Destinatarios:** Usuarios familiares de cuentas-meli  
**🎯 Objetivo:** Transformar datos en insights financieros valiosos