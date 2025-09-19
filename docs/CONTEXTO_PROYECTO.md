# 📊 CONTEXTO COMPLETO - Proyecto Finanzas Personales

## 🎯 **DESCRIPCIÓN GENERAL**

**cuentas-meli** es una aplicación web para finanzas personales que permite gestionar cuentas y movimientos financieros. Está diseñada como un sistema de control de presupuesto personal con 3 tipos de cuentas principales.

### **Concepto Financiero:**
- **Fuentes**: Dinero que debe haber (ingresos, presupuesto disponible)
- **Normal/Depósitos**: Dinero que realmente hay (bancos, efectivo)
- **Deudas**: Dinero que se debe (tarjetas, préstamos)

**Fórmula de control:** `Total Real = Normal + |Deudas| - Fuentes`

---

## 🏗️ **ARQUITECTURA GENERAL**

```
cuentas-meli/
├── client/          # Frontend React + Vite
└── server/          # Backend Node.js + Express + Sequelize
```

### **Stack Tecnológico:**

**Backend:**
- Node.js + Express
- Sequelize ORM + MySQL
- Autenticación: bcryptjs + JWT
- Seguridad: helmet + cors
- Validación: zod
- Desarrollo: nodemon

**Frontend:**
- React 19 + Vite
- React Router DOM v7
- Tailwind CSS v4
- Iconify React (iconos)
- Axios (HTTP client)
- Day.js (fechas)
- Recharts (gráficos)

---

## 🗄️ **BASE DE DATOS**

### **Modelo de Datos:**

#### **Tabla: cuentas**
```sql
- id (PK, AUTO_INCREMENT)
- nombre (VARCHAR(100), NOT NULL)
- descripcion (VARCHAR(255), NULLABLE)
- tipo (ENUM: 'normal', 'deuda', 'fuente', DEFAULT: 'deuda')
- createdAt (DATE, DEFAULT: NOW)
- estado (ENUM: 'activo', 'inactivo', DEFAULT: 'activo')
```

#### **Tabla: movimientos**
```sql
- id (PK, AUTO_INCREMENT)
- cuentaId (FK → cuentas.id, CASCADE)
- tipo (ENUM: 'ingreso', 'egreso', DEFAULT: 'ingreso')
- monto (INTEGER, NOT NULL)
- descripcion (VARCHAR(255), NULLABLE)
- createdAt (DATE, DEFAULT: NOW)
- estado (ENUM: 'activo', 'inactivo', DEFAULT: 'activo')
```

### **Relaciones:**
- `Cuentas.hasMany(Movimientos)` → Una cuenta puede tener muchos movimientos
- `Movimientos.belongsTo(Cuentas)` → Un movimiento pertenece a una cuenta

---

## 🚀 **BACKEND (Node.js + Express)**

### **Estructura del Servidor:**
```
server/src/
├── index.js                    # Punto de entrada principal
├── controllers/
│   ├── cuentas.controller.js   # CRUD de cuentas
│   └── movimientos.controller.js # CRUD de movimientos
├── database/
│   ├── models/
│   │   ├── index.js           # Configuración Sequelize
│   │   ├── Cuentas.js         # Modelo de cuentas
│   │   └── Movimientos.js     # Modelo de movimientos
│   └── associations/
│       └── associations.js    # Relaciones entre modelos
└── v1/routes/
    ├── index.js              # Exportador de rutas
    ├── cuentas.routes.js     # Rutas de cuentas
    └── movimientos.routes.js # Rutas de movimientos
```

### **API Endpoints:**

#### **Cuentas (`/api/v1/cuentas`):**
- `GET /` → Obtener todas las cuentas con totales calculados
- `GET /:id` → Obtener cuenta específica
- `GET /tipo/:tipo` → Obtener cuentas por tipo (normal/deuda/fuente)
- `POST /` → Crear nueva cuenta
- `PUT /:id` → Actualizar cuenta
- `DELETE /:id` → Eliminar cuenta (soft delete)

#### **Movimientos (`/api/v1/movimientos`):**
- `GET /:cuentaId` → Obtener movimientos de una cuenta
- `GET /byid/:id` → Obtener movimiento específico
- `POST /:cuentaId` → Crear nuevo movimiento
- `PUT /:id` → Actualizar movimiento
- `DELETE /:id` → Eliminar movimiento (soft delete)

### **Características Técnicas:**
- **Soft Delete**: Los registros se marcan como `estado: 'inactivo'`
- **Cálculo automático**: Los totales se calculan dinámicamente con SQL
- **Timezone**: Configurado para `America/Bogota`
- **CORS**: Configurado para desarrollo y producción
- **Pool de conexiones**: Configurado para MySQL

---

## 🎨 **FRONTEND (React + Vite)**

### **Estructura del Cliente:**
```
client/src/
├── App.jsx                    # Configuración de rutas principales
├── main.jsx                   # Punto de entrada React
├── index.css                  # Estilos globales Tailwind
├── components/
│   ├── CuentaCard.jsx        # Componente de tarjeta de cuenta
│   └── MovementCard.jsx      # Componente de tarjeta de movimiento
├── pages/
│   ├── MainLayout.jsx        # Layout principal con navegación
│   ├── Home.jsx              # Dashboard principal
│   ├── CuentasPage.jsx       # Lista de cuentas por tipo
│   ├── CreateAccount.jsx     # Formulario de nueva cuenta
│   ├── Movements.jsx         # Lista de movimientos de cuenta
│   ├── CreateMovement.jsx    # Formulario de nuevo/editar movimiento
│   └── Deposites.jsx         # Lista de depósitos (cuentas normales)
└── services/
    └── api.js                # Cliente HTTP con Axios
```

### **Rutas de la Aplicación:**
```
/ → Redirect to /home
/home → Dashboard principal
/deposites → Lista de depósitos
/accounts/:type → Lista de cuentas por tipo
/accounts/create/:type → Crear nueva cuenta
/accounts/movements/:idAccount → Movimientos de cuenta
/accounts/movements/:idType/:type → Crear/editar movimiento
```

### **Funcionalidades Frontend:**

#### **Dashboard (Home.jsx):**
- Resumen financiero con diferencia entre lo que hay vs lo que debe haber
- Indicador visual: Verde (excedente), Rojo (falta), Azul (equilibrado)
- Lista de cuentas agrupadas por tipo con totales

#### **Gestión de Cuentas:**
- Navegación por pestañas (Deudas/Fuentes)
- Creación con nombre, descripción y tipo automático
- Visualización con saldo calculado en tiempo real
- Colores según saldo (verde/rojo)

#### **Gestión de Movimientos:**
- Input de monto con formato de moneda colombiana (COP)
- Teclado numérico en móviles (`inputMode="numeric"`)
- Selector de tipo (Ingreso/Egreso) con colores
- Fecha y hora con timezone de Bogotá
- Edición con cursor al final del valor
- Validación de monto > 0

### **Características UX/UI:**
- **Responsive**: Diseñado mobile-first, máximo 500px
- **Tailwind CSS**: Sistema de utilidades para estilos
- **Iconify**: Iconos consistentes en toda la app
- **Loading states**: Indicadores de carga en todas las operaciones
- **Navegación**: Bottom navigation bar fija
- **Fechas localizadas**: En español con Day.js
- **Formato monetario**: Pesos colombianos con separadores de miles

---

## 🔄 **FLUJOS DE DATOS**

### **Flujo Principal:**
1. **Usuario accede** → `MainLayout` carga la estructura
2. **Dashboard** → Consulta todas las cuentas y calcula totales
3. **Gestión de cuentas** → CRUD completo con navegación por tipos
4. **Movimientos** → CRUD con validaciones y formato de moneda
5. **Cálculos** → Se actualizan automáticamente en tiempo real

### **Estados de Carga:**
- Loading spinners en todas las operaciones async
- Manejo de errores con alerts
- Estados vacíos con mensajes descriptivos

---

## 📱 **CARACTERÍSTICAS MÓVILES**

- **Viewport**: Optimizado para pantallas pequeñas
- **Teclado numérico**: `inputMode="numeric"` para campos de monto
- **Touch**: Botones y áreas táctiles optimizadas
- **Navegación**: Bottom bar para fácil acceso con pulgar
- **Scrolling**: Contenido scrolleable con barras ocultas

---

## 🛠️ **PATRONES Y CONVENCIONES**

### **Patrones de Código:**
- **Hooks personalizados**: Para lógica reutilizable
- **Componentes controlados**: Todos los forms usan estado local
- **Props drilling**: Datos pasan por props, no contexto global
- **Error boundaries**: Manejo de errores en componentes
- **Async/await**: Para todas las operaciones asíncronas

### **Convenciones de Nomenclatura:**
- **Componentes**: PascalCase (`CuentaCard.jsx`)
- **Archivos**: camelCase para páginas, PascalCase para componentes
- **Variables**: camelCase en JS, snake_case en SQL
- **Estados**: Nombres descriptivos (`loading`, `accounts`, `inputs`)

### **Estructura de Carpetas:**
- **Separación clara**: Backend y frontend independientes
- **Agrupación por funcionalidad**: Controllers, models, pages, components
- **Rutas versionadas**: `/api/v1/` para futuras versiones

---

## 🔧 **CONFIGURACIÓN Y DEPLOYMENT**

### **Variables de Entorno:**

#### **Backend (.env):**
```env
DB_NAME=nombre_base_datos
DB_USER=usuario_mysql
DB_PASSWORD=password_mysql
DB_HOST=localhost
DB_PORT=3306
DB_DIALECT=mysql
CORS_ORIGIN=http://localhost:5173
PORT=3000
NODE_ENV=development
```

#### **Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

### **Scripts Disponibles:**

#### **Backend:**
```json
"start": "node src/index.js"
"dev": "nodemon ./src/index.js"
"build": "echo \"No build step necessary\""
```

#### **Frontend:**
```json
"dev": "vite"
"build": "vite build"
"preview": "vite preview"
"lint": "eslint ."
```

---

## 📈 **OPORTUNIDADES DE MEJORA**

### **Técnicas:**
1. **Testing**: Implementar Jest/Vitest para pruebas unitarias
2. **Validación**: Zod en frontend para validación consistente
3. **Estado global**: Redux/Zustand para estado complejo
4. **Cache**: React Query para cache de datos
5. **PWA**: Service Workers para uso offline
6. **TypeScript**: Migración gradual para mejor tipado

### **Funcionales:**
1. **Categorías**: Clasificación de movimientos
2. **Metas**: Objetivos de ahorro
3. **Reportes**: Gráficos y estadísticas detalladas
4. **Exportación**: PDF/Excel de reportes
5. **Alertas**: Notificaciones de límites
6. **Multi-usuario**: Sistema de usuarios y autenticación

### **UX/UI:**
1. **Dark mode**: Tema oscuro
2. **Animaciones**: Transiciones suaves
3. **Gestos**: Swipe para acciones rápidas
4. **Accesibilidad**: ARIA labels y navegación por teclado
5. **Onboarding**: Tutorial inicial

---

## 🚨 **CONSIDERACIONES IMPORTANTES**

### **Seguridad:**
- No hay autenticación implementada actualmente
- Datos sensibles sin encriptación
- CORS básico configurado

### **Performance:**
- Consultas SQL optimizadas con JOINs
- Carga lazy de componentes pendiente
- Imágenes y assets sin optimizar

### **Escalabilidad:**
- Base de datos puede crecer sin límites
- Paginación no implementada
- Cache de consultas pendiente

### **Mantenimiento:**
- Logs básicos en consola
- Monitoreo de errores pendiente
- Backup automático no configurado

---

## 🎯 **CONCLUSIÓN**

Este es un **proyecto sólido y bien estructurado** para finanzas personales que demuestra buenas prácticas en:

✅ **Arquitectura limpia** con separación backend/frontend  
✅ **Tecnologías modernas** y bien documentadas  
✅ **UX móvil** optimizada para uso diario  
✅ **Código legible** y mantenible  
✅ **Funcionalidad completa** para necesidades básicas  

El proyecto está **listo para uso** y tiene **excelente potencial** para crecimiento y nuevas funcionalidades.

---

**Fecha de análisis:** 19 de septiembre, 2025  
**Versión del proyecto:** 1.0.0  
**Estado:** ✅ Funcional y estable