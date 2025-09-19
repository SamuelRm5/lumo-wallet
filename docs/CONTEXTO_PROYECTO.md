# 📊 CONTEXTO COMPLETO - Proyecto Finanzas Personales

## 🎯 **DESCRIPCIÓN GENERAL**

**cuentas-meli** es una aplicación web para finanzas personales **multi-usuario** que permite gestionar cuentas y movimientos financieros con **separación completa de datos por usuario**. Diseñada para uso familiar donde cada miembro tiene su propio espacio financiero privado.

### **Concepto Financiero:**
- **Fuentes**: Dinero que debe haber (ingresos, presupuesto disponible)
- **Normal/Depósitos**: Dinero que realmente hay (bancos, efectivo)
- **Deudas**: Dinero que se debe (tarjetas, préstamos)

**Fórmula de control:** `Total Real = Normal + |Deudas| - Fuentes`

### **🔐 Sistema de Autenticación:**
- **Multi-usuario familiar** con JWT
- **Separación total de datos** por usuario
- **Tokens de larga duración** (1 año) para UX fluida
- **Auto-logout** por seguridad cuando expira

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
- **Autenticación:** bcryptjs + JWT (tokens 1 año)
- **Multi-usuario:** Separación total de datos
- Seguridad: helmet + cors
- Validación: zod
- Desarrollo: nodemon

**Frontend:**
- React 19 + Vite
- React Router DOM v7
- **Autenticación:** AuthContext + ProtectedRoute
- **UX:** Login, cambio de contraseña, auto-logout
- Tailwind CSS v4
- Iconify React (iconos)
- Axios (HTTP client con interceptores)
- Day.js (fechas)
- Recharts (gráficos)

---

## 🗄️ **BASE DE DATOS**

### **Modelo de Datos:**

#### **Tabla: usuarios - ✅ NUEVA**
```sql
- id (PK, AUTO_INCREMENT)
- nombre (VARCHAR(100), NOT NULL)
- email (VARCHAR(255), UNIQUE, NOT NULL)
- password (VARCHAR(255), NOT NULL, BCRYPT HASH)
- createdAt (DATE, DEFAULT: NOW)
- estado (ENUM: 'activo', 'inactivo', DEFAULT: 'activo')
```

#### **Tabla: cuentas - ✅ ACTUALIZADA**
```sql
- id (PK, AUTO_INCREMENT)
- nombre (VARCHAR(100), NOT NULL)
- descripcion (VARCHAR(255), NULLABLE)
- tipo (ENUM: 'normal', 'deuda', 'fuente', DEFAULT: 'deuda')
- usuarioId (FK → usuarios.id, CASCADE) # ← NUEVA COLUMNA
- createdAt (DATE, DEFAULT: NOW)
- estado (ENUM: 'activo', 'inactivo', DEFAULT: 'activo')
```

#### **Tabla: movimientos - ✅ SIN CAMBIOS**
```sql
- id (PK, AUTO_INCREMENT)
- cuentaId (FK → cuentas.id, CASCADE)
- tipo (ENUM: 'ingreso', 'egreso', DEFAULT: 'ingreso')
- monto (INTEGER, NOT NULL)
- descripcion (VARCHAR(255), NULLABLE)
- createdAt (DATE, DEFAULT: NOW)
- estado (ENUM: 'activo', 'inactivo', DEFAULT: 'activo')
```

### **Relaciones Actualizadas:**
- `Usuarios.hasMany(Cuentas)` → Un usuario puede tener muchas cuentas
- `Cuentas.belongsTo(Usuarios)` → Una cuenta pertenece a un usuario
- `Cuentas.hasMany(Movimientos)` → Una cuenta puede tener muchos movimientos
- `Movimientos.belongsTo(Cuentas)` → Un movimiento pertenece a una cuenta
- **Separación automática:** Todos los datos se filtran por `usuarioId`

---

## 🚀 **BACKEND (Node.js + Express)**

### **Estructura del Servidor:**
```
server/src/
├── index.js                     # Punto de entrada principal
├── controllers/
│   ├── auth.controller.js       # ✅ NUEVO - Autenticación JWT
│   ├── cuentas.controller.js    # ✅ ACTUALIZADO - Filtro por usuario
│   └── movimientos.controller.js # ✅ ACTUALIZADO - Filtro por usuario
├── middleware/
│   └── auth.js                  # ✅ NUEVO - Middleware JWT
├── database/
│   ├── models/
│   │   ├── index.js            # Configuración Sequelize
│   │   ├── Usuarios.js         # ✅ NUEVO - Modelo de usuarios
│   │   ├── Cuentas.js          # ✅ ACTUALIZADO - Con usuarioId
│   │   └── Movimientos.js      # Modelo de movimientos
│   └── associations/
│       └── associations.js     # ✅ ACTUALIZADO - Relaciones con usuarios
└── v1/routes/
    ├── index.js                # Exportador de rutas
    ├── auth.routes.js          # ✅ NUEVO - Rutas de autenticación
    ├── cuentas.routes.js       # ✅ PROTEGIDO - Con middleware auth
    └── movimientos.routes.js   # ✅ PROTEGIDO - Con middleware auth
```

### **API Endpoints:**

#### **🔐 Autenticación (`/api/v1/auth`) - ✅ NUEVO:**
- `POST /login` → Iniciar sesión (email + password)
- `GET /validate` → Validar token JWT (protegido)
- `GET /profile` → Obtener perfil de usuario (protegido)
- `PUT /profile` → Actualizar perfil (protegido)
- `PUT /change-password` → Cambiar contraseña (protegido)
- `POST /register` → Registro (implementado pero no usado en frontend)

#### **🏦 Cuentas (`/api/v1/cuentas`) - ✅ PROTEGIDO:**
- `GET /` → Obtener cuentas del usuario autenticado
- `GET /:id` → Obtener cuenta específica del usuario
- `GET /tipo/:tipo` → Obtener cuentas por tipo del usuario
- `POST /` → Crear nueva cuenta (se asigna usuarioId automáticamente)
- `PUT /:id` → Actualizar cuenta (solo del usuario)
- `DELETE /:id` → Eliminar cuenta (solo del usuario, soft delete)

#### **💰 Movimientos (`/api/v1/movimientos`) - ✅ PROTEGIDO:**
- `GET /:cuentaId` → Obtener movimientos de cuenta del usuario
- `GET /byid/:id` → Obtener movimiento específico del usuario
- `POST /:cuentaId` → Crear movimiento en cuenta del usuario
- `PUT /:id` → Actualizar movimiento (solo del usuario)
- `DELETE /:id` → Eliminar movimiento (solo del usuario, soft delete)

### **Características Técnicas:**
- **🔐 Autenticación JWT**: Tokens de 1 año de duración
- **🛡️ Middleware de seguridad**: Todas las rutas principales protegidas
- **👥 Multi-usuario**: Separación automática de datos por `usuarioId`
- **Soft Delete**: Los registros se marcan como `estado: 'inactivo'`
- **Cálculo automático**: Los totales se calculan dinámicamente con SQL
- **Filtrado automático**: Todos los queries incluyen filtro por usuario
- **Timezone**: Configurado para `America/Bogota`
- **CORS**: Configurado para desarrollo y producción
- **Pool de conexiones**: Configurado para MySQL
- **🔄 Auto-logout**: Interceptor axios para tokens expirados

---

## 🎨 **FRONTEND (React + Vite)**

### **Estructura del Cliente:**
```
client/src/
├── App.jsx                    # ✅ ACTUALIZADO - Con AuthProvider y ProtectedRoute
├── main.jsx                   # ✅ ACTUALIZADO - Listener para auto-logout
├── index.css                  # Estilos globales Tailwind
├── context/
│   └── AuthContext.jsx       # ✅ NUEVO - Context de autenticación
├── components/
│   ├── CuentaCard.jsx        # Componente de tarjeta de cuenta
│   └── MovementCard.jsx      # Componente de tarjeta de movimiento
├── pages/
│   ├── MainLayout.jsx        # ✅ ACTUALIZADO - Menú usuario y navegación inteligente
│   ├── Login.jsx             # ✅ NUEVO - Pantalla de login simplificada
│   ├── ProtectedRoute.jsx    # ✅ NUEVO - Protección de rutas
│   ├── ChangePassword.jsx    # ✅ NUEVO - Cambio de contraseña
│   ├── Home.jsx              # Dashboard principal (filtrado por usuario)
│   ├── CuentasPage.jsx       # Lista de cuentas por tipo (filtrado por usuario)
│   ├── CreateAccount.jsx     # Formulario de nueva cuenta
│   ├── Movements.jsx         # Lista de movimientos de cuenta
│   ├── CreateMovement.jsx    # Formulario de nuevo/editar movimiento
│   └── Deposites.jsx         # Lista de depósitos (cuentas normales)
└── services/
    └── api.js                # ✅ ACTUALIZADO - Cliente con auth + interceptores
```

### **Rutas de la Aplicación:**
```
/ → ProtectedRoute → Redirect to /home
/home → Dashboard principal (datos del usuario autenticado)
/deposites → Lista de depósitos del usuario
/accounts/:type → Lista de cuentas por tipo del usuario
/accounts/create/:type → Crear nueva cuenta
/accounts/movements/:idAccount → Movimientos de cuenta del usuario
/accounts/movements/:idType/:type → Crear/editar movimiento
/change-password → Cambio de contraseña (fuera del layout principal)

🔐 TODAS las rutas están protegidas por ProtectedRoute
📱 Login automático si no hay sesión activa
```

### **Funcionalidades Frontend:**

#### **🔐 Sistema de Autenticación (NUEVO):**
- **Login simplificado**: Solo email y contraseña (sin registro público)
- **Persistencia de sesión**: Token guardado en localStorage
- **Auto-validación**: Token verificado al cargar la app
- **Auto-logout**: Redirección automática cuando token expira
- **Cambio de contraseña**: Para usuarios ya registrados
- **Menú de usuario**: Dropdown con opciones de cuenta

#### **Dashboard (Home.jsx):**
- Resumen financiero **del usuario autenticado** con diferencia entre lo que hay vs lo que debe haber
- Indicador visual: Verde (excedente), Rojo (falta), Azul (equilibrado)
- Lista de cuentas **del usuario** agrupadas por tipo con totales

#### **Gestión de Cuentas:**
- Navegación por pestañas (Deudas/Fuentes)
- Creación con nombre, descripción y tipo automático (**asignadas al usuario**)
- Visualización con saldo calculado en tiempo real
- Colores según saldo (verde/rojo)
- **Solo cuentas del usuario autenticado**

#### **Gestión de Movimientos:**
- Input de monto con formato de moneda colombiana (COP)
- Teclado numérico en móviles (`inputMode="numeric"`)
- Selector de tipo (Ingreso/Egreso) con colores
- Fecha y hora con timezone de Bogotá
- Edición con cursor al final del valor
- Validación de monto > 0
- **Solo movimientos de cuentas del usuario**

### **Características UX/UI:**
- **🔐 Autenticación fluida**: Login una vez al año por usuario
- **📱 Responsive**: Diseñado mobile-first, máximo 500px
- **🎨 Tailwind CSS**: Sistema de utilidades para estilos
- **🔄 Navegación inteligente**: Botón "volver" contextual (no más formularios obsoletos)
- **👤 Menú de usuario**: Dropdown con perfil, cambio de contraseña y logout
- **🔔 Auto-logout visual**: Loading y redirección automática
- **📍 Iconify**: Iconos consistentes en toda la app
- **⏳ Loading states**: Indicadores de carga en todas las operaciones
- **📍 Navegación**: Bottom navigation bar fija
- **📅 Fechas localizadas**: En español con Day.js
- **💰 Formato monetario**: Pesos colombianos con separadores de miles
- **🛡️ Seguridad visual**: Separación clara de datos por usuario

---

## 🔄 **FLUJOS DE DATOS**

### **Flujo Principal Multi-Usuario:**
1. **Usuario accede** → `ProtectedRoute` verifica autenticación
2. **Sin token** → Muestra `Login` con validaciones
3. **Con token válido** → `MainLayout` carga estructura con datos del usuario
4. **Dashboard** → Consulta cuentas filtradas por `usuarioId`
5. **Gestión de cuentas** → CRUD completo con separación automática
6. **Movimientos** → CRUD con validaciones y formato, solo del usuario
7. **Cálculos** → Se actualizan automáticamente por usuario
8. **Token expira** → Auto-logout y vuelta a login

### **Estados de Carga y Seguridad:**
- Loading spinners en validación de token
- Loading en todas las operaciones async
- Manejo de errores con interceptores axios
- Estados vacíos con mensajes descriptivos
- **Separación garantizada**: Backend filtra automáticamente por usuario

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
JWT_SECRET=tu_clave_secreta_muy_segura_aqui  # ← NUEVO REQUERIDO
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

### **✅ YA IMPLEMENTADO:**
1. **✅ Multi-usuario**: Sistema de autenticación JWT completo
2. **✅ Separación de datos**: Filtrado automático por usuario
3. **✅ Navegación inteligente**: Botón "volver" contextual
4. **✅ Auto-logout**: Manejo de tokens expirados

### **🔄 EN PROGRESO:**
1. **Manejo de errores**: Toast notifications (reemplazar alerts)
2. **Estado global**: Context API para auto-refresh
3. **Validaciones**: Sistema unificado frontend

### **📋 PENDIENTES - Técnicas:**
1. **Testing**: Implementar Jest/Vitest para pruebas unitarias
2. **Validación**: Zod en frontend para validación consistente
3. **Cache**: React Query para cache de datos
4. **PWA**: Service Workers para uso offline
5. **TypeScript**: Migración gradual para mejor tipado

### **🎯 PENDIENTES - Funcionales:**
1. **Categorías**: Clasificación de movimientos por usuario
2. **Metas**: Objetivos de ahorro individuales
3. **Reportes**: Gráficos y estadísticas por usuario
4. **Exportación**: PDF/Excel de reportes individuales
5. **Alertas**: Notificaciones de límites personalizadas
6. **Gestión de usuarios**: Panel admin para crear/gestionar usuarios familiares

### **🎨 PENDIENTES - UX/UI:**
1. **Dark mode**: Tema oscuro
2. **Animaciones**: Transiciones suaves
3. **Gestos**: Swipe para acciones rápidas
4. **Accesibilidad**: ARIA labels y navegación por teclado
5. **Onboarding**: Tutorial inicial por usuario

---

## 🚨 **CONSIDERACIONES IMPORTANTES**

### **✅ Seguridad IMPLEMENTADA:**
- **✅ Autenticación JWT** con tokens de 1 año
- **✅ Middleware de protección** en todas las rutas críticas
- **✅ Passwords hasheadas** con bcrypt (salt 10)
- **✅ Separación de datos** automática por usuario
- **✅ Auto-logout** por tokens expirados
- **✅ CORS** configurado para frontend específico

### **⚠️ Seguridad PENDIENTE:**
- Rate limiting en endpoints de login
- Validación más estricta de inputs
- Logs de auditoría por usuario
- Encriptación de datos sensibles en BD

### **✅ Performance IMPLEMENTADA:**
- **✅ Consultas optimizadas** con filtro automático por usuario
- **✅ Relaciones SQL** eficientes con foreign keys
- **✅ Auto-logout** evita consultas innecesarias

### **⚠️ Performance PENDIENTE:**
- Carga lazy de componentes
- Paginación para usuarios con muchos datos
- Cache de consultas frecuentes
- Optimización de imágenes/assets

### **✅ Escalabilidad IMPLEMENTADA:**
- **✅ Separación por usuario** permite crecimiento familiar
- **✅ Soft deletes** mantienen integridad histórica
- **✅ Estructura modular** fácil de extender

### **⚠️ Escalabilidad PENDIENTE:**
- Pool de conexiones DB optimizado
- Backup automático por usuario
- Migración de esquemas versionada

### **✅ Mantenimiento IMPLEMENTADO:**
- **✅ Logs básicos** en consola con contexto de usuario
- **✅ Estructura clara** separada por responsabilidades

### **⚠️ Mantenimiento PENDIENTE:**
- Monitoreo de errores con Sentry
- Métricas de uso por usuario
- Backup automático configurado

---

## 🎯 **CONCLUSIÓN**

Este es un **proyecto robusto y bien estructurado** para finanzas familiares que demuestra excelentes prácticas en:

✅ **Arquitectura limpia** con separación backend/frontend  
✅ **Tecnologías modernas** y bien documentadas  
✅ **🔐 Autenticación multi-usuario** completa y segura  
✅ **👥 Separación de datos** automática por usuario familiar  
✅ **📱 UX móvil** optimizada para uso diario  
✅ **🔄 Navegación inteligente** sin estados obsoletos  
✅ **⚡ Auto-logout** por seguridad  
✅ **Código legible** y mantenible  
✅ **Funcionalidad completa** para gestión financiera familiar  

### **🏆 HITOS ALCANZADOS:**
- **Sistema multi-usuario familiar funcional**
- **Separación total de datos financieros**
- **UX fluida con tokens de larga duración**
- **Navegación contextual inteligente**
- **Seguridad robusta con JWT**

El proyecto está **✅ LISTO PARA USO FAMILIAR** y tiene **excelente potencial** para crecimiento con nuevas funcionalidades como categorías, reportes y gráficos.

---

**Fecha de análisis:** 19 de septiembre, 2025  
**Versión del proyecto:** 2.0.0 (Multi-usuario)  
**Estado:** ✅ **FUNCIONAL, SEGURO Y LISTO PARA PRODUCCIÓN FAMILIAR**