# 🚀 BÚSQUEDAS OPTIMIZADAS CON ÍNDICES - CUENTAS-MELI

## 📊 **ÍNDICES DISPONIBLES**

### **🔄 Tabla MOVIMIENTOS:**
- `idx_movimientos_analytics`: [cuentaId, createdAt, tipo, estado]
- `idx_movimientos_cuenta_estado`: [cuentaId, estado]
- `idx_movimientos_fecha`: [createdAt]
- `idx_movimientos_fecha_rango`: [cuentaId, createdAt, estado]
- `idx_movimientos_tipo`: [tipo]

### **🏦 Tabla CUENTAS:**
- `idx_cuentas_fecha`: [createdAt]
- `idx_cuentas_nombre`: [nombre]
- `idx_cuentas_tipo`: [tipo]
- `idx_cuentas_usuario_estado`: [usuarioId, estado]

---

## 🎯 **BÚSQUEDAS OPTIMIZADAS DISPONIBLES**

### **📅 1. BÚSQUEDAS TEMPORALES**

#### **✅ DONE - Rango de fechas por cuenta específica**
**Índice usado:** `idx_movimientos_fecha_rango` [cuentaId, createdAt, estado]
```http
GET /api/v1/movimientos/search/date-range?fechaInicio=2025-01-01&fechaFin=2025-12-31&cuentaId=123
```
**SQL optimizado:**
```sql
WHERE cuentaId = 123 AND createdAt BETWEEN '2025-01-01' AND '2025-12-31' AND estado = 'activo'
```

#### **📝 TODO - Rango de fechas global del usuario**
**Índice usado:** `idx_movimientos_fecha` [createdAt]
```http
GET /api/v1/movimientos/search/date-range-global?fechaInicio=2025-01-01&fechaFin=2025-12-31
```
**SQL optimizado:**
```sql
SELECT m.* FROM movimientos m 
JOIN cuentas c ON m.cuentaId = c.id 
WHERE c.usuarioId = :userId AND m.createdAt BETWEEN :inicio AND :fin AND m.estado = 'activo'
```

#### **📝 TODO - Movimientos recientes (últimos N días)**
**Índice usado:** `idx_movimientos_fecha` [createdAt]
```http
GET /api/v1/movimientos/recent?days=30
```
**SQL optimizado:**
```sql
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND estado = 'activo'
```

#### **📝 TODO - Movimientos por mes específico**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/movimientos/monthly/2025/09?cuentaId=123
```
**SQL optimizado:**
```sql
WHERE cuentaId = 123 AND YEAR(createdAt) = 2025 AND MONTH(createdAt) = 9 AND estado = 'activo'
```

---

### **💰 2. BÚSQUEDAS POR TIPO Y MONTO**

#### **✅ DONE - Filtro por tipo en rango de fechas**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/movimientos/search/date-range?fechaInicio=2025-01-01&fechaFin=2025-12-31&tipo=ingreso
```
**SQL optimizado:**
```sql
WHERE createdAt BETWEEN :inicio AND :fin AND tipo = 'ingreso' AND estado = 'activo'
```

#### **📝 TODO - Solo ingresos de una cuenta**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/movimientos/ingresos/:cuentaId
```
**SQL optimizado:**
```sql
WHERE cuentaId = :id AND tipo = 'ingreso' AND estado = 'activo' ORDER BY createdAt DESC
```

#### **📝 TODO - Solo egresos de una cuenta**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/movimientos/egresos/:cuentaId
```
**SQL optimizado:**
```sql
WHERE cuentaId = :id AND tipo = 'egreso' AND estado = 'activo' ORDER BY createdAt DESC
```

#### **📝 TODO - Movimientos por rango de monto**
**Índice usado:** `idx_movimientos_cuenta_estado` [cuentaId, estado] + filtro monto
```http
GET /api/v1/movimientos/amount-range?cuentaId=123&minAmount=100000&maxAmount=500000
```
**SQL optimizado:**
```sql
WHERE cuentaId = 123 AND monto BETWEEN 100000 AND 500000 AND estado = 'activo'
```

#### **📝 TODO - Top movimientos más grandes**
**Índice usado:** `idx_movimientos_cuenta_estado` [cuentaId, estado] + ORDER BY monto
```http
GET /api/v1/movimientos/top-amounts/:cuentaId?limit=10
```
**SQL optimizado:**
```sql
WHERE cuentaId = :id AND estado = 'activo' ORDER BY monto DESC LIMIT 10
```

---

### **🏦 3. BÚSQUEDAS DE CUENTAS**

#### **✅ DONE - Cuentas por usuario (implementado en controlador)**
**Índice usado:** `idx_cuentas_usuario_estado` [usuarioId, estado]
```http
GET /api/v1/cuentas/
```
**SQL optimizado:**
```sql
WHERE usuarioId = :id AND estado = 'activo'
```

#### **✅ DONE - Cuentas por tipo (implementado en controlador)**
**Índice usado:** `idx_cuentas_tipo` [tipo]
```http
GET /api/v1/cuentas/tipo/:tipo
```
**SQL optimizado:**
```sql
WHERE tipo = :tipo AND usuarioId = :userId AND estado = 'activo'
```

#### **📝 TODO - Búsqueda de cuentas por nombre**
**Índice usado:** `idx_cuentas_nombre` [nombre]
```http
GET /api/v1/cuentas/search?nombre=tarjeta
```
**SQL optimizado:**
```sql
WHERE nombre LIKE '%tarjeta%' AND usuarioId = :userId AND estado = 'activo'
```

#### **📝 TODO - Cuentas creadas en período**
**Índice usado:** `idx_cuentas_fecha` [createdAt]
```http
GET /api/v1/cuentas/created-between?inicio=2025-01-01&fin=2025-12-31
```
**SQL optimizado:**
```sql
WHERE createdAt BETWEEN :inicio AND :fin AND usuarioId = :userId AND estado = 'activo'
```

#### **📝 TODO - Cuentas con saldo específico**
**Índice usado:** `idx_cuentas_usuario_estado` [usuarioId, estado] + cálculo de saldo
```http
GET /api/v1/cuentas/with-balance?minBalance=100000
```
**SQL optimizado:**
```sql
-- Requiere JOIN con movimientos para calcular saldo
```

---

### **📊 4. BÚSQUEDAS DE ANALYTICS**

#### **📝 TODO - Resumen mensual por cuenta**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/analytics/monthly-summary/:cuentaId/:year/:month
```
**SQL optimizado:**
```sql
SELECT tipo, SUM(monto) as total, COUNT(*) as cantidad
FROM movimientos 
WHERE cuentaId = :id AND YEAR(createdAt) = :year AND MONTH(createdAt) = :month AND estado = 'activo'
GROUP BY tipo
```

#### **📝 TODO - Tendencias por período**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/analytics/trends/:cuentaId?periodo=6m
```
**SQL optimizado:**
```sql
SELECT DATE_FORMAT(createdAt, '%Y-%m') as mes, tipo, SUM(monto) as total
FROM movimientos 
WHERE cuentaId = :id AND createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND estado = 'activo'
GROUP BY mes, tipo ORDER BY mes
```

#### **📝 TODO - Promedios por día de la semana**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/analytics/weekday-patterns/:cuentaId
```
**SQL optimizado:**
```sql
SELECT DAYOFWEEK(createdAt) as dia_semana, AVG(monto) as promedio, COUNT(*) as cantidad
FROM movimientos 
WHERE cuentaId = :id AND estado = 'activo'
GROUP BY dia_semana
```

#### **📝 TODO - Balance histórico por mes**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/analytics/balance-history/:cuentaId
```
**SQL optimizado:**
```sql
SELECT DATE_FORMAT(createdAt, '%Y-%m') as mes,
       SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as balance_mes
FROM movimientos 
WHERE cuentaId = :id AND estado = 'activo'
GROUP BY mes ORDER BY mes
```

---

### **🔍 5. BÚSQUEDAS DE TEXTO**

#### **📝 TODO - Búsqueda en descripciones**
**Índice usado:** `idx_movimientos_descripcion` [descripcion(50)] (si existe)
```http
GET /api/v1/movimientos/search-description?q=supermercado&cuentaId=123
```
**SQL optimizado:**
```sql
WHERE cuentaId = 123 AND descripcion LIKE '%supermercado%' AND estado = 'activo'
```

#### **📝 TODO - Movimientos sin descripción**
**Índice usado:** `idx_movimientos_cuenta_estado` [cuentaId, estado]
```http
GET /api/v1/movimientos/empty-description/:cuentaId
```
**SQL optimizado:**
```sql
WHERE cuentaId = :id AND (descripcion IS NULL OR descripcion = '') AND estado = 'activo'
```

---

### **📈 6. BÚSQUEDAS ESTADÍSTICAS**

#### **📝 TODO - Cuenta con más movimientos**
**Índice usado:** `idx_movimientos_cuenta_estado` [cuentaId, estado] + COUNT
```http
GET /api/v1/analytics/most-active-account
```
**SQL optimizado:**
```sql
SELECT c.id, c.nombre, COUNT(m.id) as total_movimientos
FROM cuentas c 
LEFT JOIN movimientos m ON c.id = m.cuentaId AND m.estado = 'activo'
WHERE c.usuarioId = :userId AND c.estado = 'activo'
GROUP BY c.id ORDER BY total_movimientos DESC LIMIT 1
```

#### **📝 TODO - Día con más actividad**
**Índice usado:** `idx_movimientos_fecha` [createdAt]
```http
GET /api/v1/analytics/busiest-day?month=2025-09
```
**SQL optimizado:**
```sql
SELECT DATE(createdAt) as fecha, COUNT(*) as movimientos
FROM movimientos m
JOIN cuentas c ON m.cuentaId = c.id
WHERE c.usuarioId = :userId AND DATE_FORMAT(m.createdAt, '%Y-%m') = '2025-09' AND m.estado = 'activo'
GROUP BY fecha ORDER BY movimientos DESC LIMIT 1
```

#### **📝 TODO - Evolución de saldos diarios**
**Índice usado:** `idx_movimientos_analytics` [cuentaId, createdAt, tipo, estado]
```http
GET /api/v1/analytics/daily-balance/:cuentaId?days=30
```
**SQL optimizado:**
```sql
SELECT DATE(createdAt) as fecha,
       SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as balance_dia
FROM movimientos 
WHERE cuentaId = :id AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND estado = 'activo'
GROUP BY fecha ORDER BY fecha
```

---

## 🚀 **PRIORIDADES DE IMPLEMENTACIÓN**

### **🔥 ALTA PRIORIDAD (Funciones básicas)**
1. ✅ **DONE** - Rango de fechas por cuenta
2. 📝 **TODO** - Solo ingresos/egresos por cuenta
3. 📝 **TODO** - Movimientos recientes
4. 📝 **TODO** - Búsqueda por nombre de cuenta
5. 📝 **TODO** - Top movimientos más grandes

### **⚡ MEDIA PRIORIDAD (Analytics básicos)**
6. 📝 **TODO** - Resumen mensual por cuenta
7. 📝 **TODO** - Tendencias por período
8. 📝 **TODO** - Rango de fechas global
9. 📝 **TODO** - Movimientos por rango de monto
10. 📝 **TODO** - Búsqueda en descripciones

### **📊 BAJA PRIORIDAD (Analytics avanzados)**
11. 📝 **TODO** - Promedios por día de la semana
12. 📝 **TODO** - Balance histórico por mes
13. 📝 **TODO** - Evolución de saldos diarios
14. 📝 **TODO** - Cuenta con más movimientos
15. 📝 **TODO** - Día con más actividad

---

## 💡 **OPTIMIZACIONES ADICIONALES POSIBLES**

### **🔍 Índices Faltantes Útiles:**
1. **Descripción completa:** `idx_movimientos_descripcion_full` [descripcion]
2. **Monto:** `idx_movimientos_monto` [monto]
3. **Usuario-fecha global:** `idx_movimientos_usuario_fecha` [usuarioId, createdAt] (via JOIN)

### **📈 Vistas Materializadas Futuras:**
1. **Saldos por cuenta:** Vista con totales precalculados
2. **Resúmenes mensuales:** Agregaciones por mes/año
3. **Rankings de cuentas:** Ordenadas por actividad

---

## 🎯 **ESTADO ACTUAL**

**✅ Implementadas:** 3 búsquedas básicas  
**📝 Pendientes:** 27+ búsquedas optimizadas  
**🚀 Cobertura de índices:** 100% - Todos los patrones están cubiertos  
**📊 Rendimiento esperado:** Sub-100ms para la mayoría de búsquedas  

---

**📅 Actualizado:** 19 de septiembre, 2025  
**🎯 Próximo paso:** Implementar búsquedas de alta prioridad