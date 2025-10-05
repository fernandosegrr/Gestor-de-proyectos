# 📚 Documentación Técnica - Chatbot Manager

## 🏗️ Arquitectura del Sistema

### Patrón de Diseño
El proyecto sigue una **arquitectura híbrida** que combina:
- **Clean Architecture** principles
- **Observer Pattern** para eventos
- **Repository Pattern** para acceso a datos
- **Service Layer** para lógica de negocio

### Capas de la Arquitectura

```
┌─────────────────┐
│   Components    │  ← UI Layer (React)
├─────────────────┤
│   Services      │  ← Business Logic
├─────────────────┤
│   Data Access   │  ← Repository Pattern
├─────────────────┤
│   Infrastructure│  ← Firebase, Cache, Storage
└─────────────────┘
```

## 🔄 Sistema de Datos Centralizado

### `dataSync.js` - Núcleo del Sistema

#### DataManager
```javascript
const dataManager = {
  // === PROYECTOS ===
  createProject(data) → Promise<{success: boolean, project?: object, error?: string}>
  updateProject(id, data) → Promise<{success: boolean, error?: string}>
  deleteProject(id) → Promise<{success: boolean, error?: string}>
  loadProjects() → Promise<Array>

  // === CLIENTES ===
  createClient(data) → Promise<{success: boolean, client?: object, error?: string}>
  updateClient(id, data) → Promise<{success: boolean, error?: string}>
  deleteClient(id) → Promise<{success: boolean, error?: string}>
  loadClients() → Promise<Array>
  clientExists(name) → Promise<boolean>  // Optimizado, sin cargar todos

  // === GASTOS ===
  createExpense(data) → Promise<{success: boolean, expense?: object, error?: string}>
  updateExpense(id, data) → Promise<{success: boolean, error?: string}>
  deleteExpense(id) → Promise<{success: boolean, error?: string}>
  loadExpenses() → Promise<Array>
  calculateMonthlyExpenses(expenses, year) → Array
  calculateExpenseStats(expenses) → Object

  // === UTILIDADES ===
  calculateNextCutoffDate(startDate) → string
  updateExpiredCutoffDates() → Promise<boolean>
  checkAndSendNotifications() → Promise<Array>
}
```

#### FirebaseManager
```javascript
const firebaseManager = {
  initialized: boolean
  initialize() → Promise<boolean>
  getConnectionState() → Object
  reconnect() → Promise<boolean>
}
```

#### Sistema de Cache Híbrido
```javascript
// Niveles de cache (orden de prioridad):
// 1. Memoria (Map) - Más rápido
// 2. localStorage - Persistente en sesión
// 3. Firebase - Fuente de verdad

const cacheStrategy = {
  read: 'memory → localStorage → firebase',
  write: 'firebase (onSnapshot updates cache automatically)',
  sync: 'real-time subscriptions (single source of truth)'
}

// ✅ OPTIMIZACIÓN v1.0.1:
// - CRUD operations no longer trigger manual cache updates
// - All updates delegated to onSnapshot listeners
// - Eliminates duplicate updates and race conditions
```

### Eventos del Sistema

#### Tipos de Eventos
```javascript
const DATA_EVENTS = {
  PROJECTS_UPDATED: 'projects-updated',
  CLIENTS_UPDATED: 'clients-updated',
  EXPENSES_UPDATED: 'expenses-updated',
  FIREBASE_STATUS_CHANGED: 'firebase-status-changed'
}
```

#### Hook useDataSync
```javascript
function useDataSync(eventType, callback) {
  // Suscribe al evento en mount
  // Cleanup en unmount
  // Manejo automático de errores
}
```

## 📊 Sistema de Reportes Financieros

### Cálculos Principales

#### Ingresos Mensuales
```javascript
calculateMonthlyIncome(projects, year) → Array<MonthlyData>
// Retorna array de 12 meses con:
// - ingresos: total del mes
// - ingresosRecurrentes: de proyectos establecidos
// - proyectosActivos: cantidad
// - proyectosNuevos: incorporados en el mes
```

#### Gastos Mensuales
```javascript
calculateMonthlyExpenses(expenses, year) → Array<MonthlyData>
// Categorías:
// - gastosFijos: hosting, software
// - gastosVariables: marketing, servicios
// - gastosOperativos: oficina
// - gastosOtros: misceláneos
// - totalMes: suma total
```

#### Análisis de Rentabilidad
```javascript
calculateNetProfitAnalysis(year) → {
  monthlyData: Array<MonthlyData>,
  yearTotals: {
    totalIncome,
    totalExpenses,
    totalProfit,
    avgProfitMargin
  }
}
```

### Utilidades de Gráficos (`chartUtils.js`)

#### Funciones de Formato
```javascript
formatCurrencyMXN(amount) → string  // "$1,234.56"
formatCompactNumberMXN(amount) → string  // "$1.2K", "$1.5M"
getAvailableYears(data) → Array<number>
```

#### Constantes de Colores
```javascript
CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  // ... más colores
}
```

## 📱 Sistema de Notificaciones

### Arquitectura de Notificaciones

#### Tipos de Notificación
```javascript
const NOTIFICATION_TYPES = {
  CUTOFF_WARNING: 'cutoff_warning',    // Fecha de corte próxima
  TRIAL_ENDING: 'trial_ending',        // Fin de período de prueba
  PROJECT_OVERDUE: 'project_overdue',  // Proyecto vencido
  EXPENSE_REMINDER: 'expense_reminder' // Recordatorio de gastos
}
```

#### Servicio de Notificaciones
```javascript
const notificationService = {
  initializeNotificationSystem(projects) → Promise<cleanupFunction>
  checkCutoffDatesAndNotify(projects) → void
  testNotification() → Promise<{success: boolean, message: string}>
}
```

### Integración WhatsApp
- **API externa** para envío de mensajes
- **Templates configurables** por tipo de notificación
- **Queue system** para reintentos automáticos
- **Logging** de envíos exitosos/fallidos

## 🎨 Arquitectura de UI

### Sistema de Modales (v1.0.1)

#### Implementación con React Portals
```javascript
import { createPortal } from 'react-dom';

// Template de modal optimizado
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
```

#### Modales en el Sistema

**ProjectManager.jsx** (5 modales):
1. Modal de formulario (crear/editar proyecto)
2. Modal de configuración Firebase
3. Modal de filtros y ordenamiento
4. Modal de alerta
5. Modal de confirmación

**ClientDatabase.jsx** (4 modales):
1. Modal de formulario (crear/editar cliente)
2. Modal de detalle del cliente
3. Modal de alerta
4. Modal de confirmación

**ExpenseManager.jsx** (2 modales):
1. Modal de formulario (crear/editar gasto)
2. ConfirmDialog (confirmación de eliminación)

#### Ventajas de React Portals
- ✅ **Scroll preservado**: No afecta el scroll del contenedor padre
- ✅ **Z-index consistente**: Todos los modales usan z-[1000]
- ✅ **Separación DOM**: Renderizados fuera del árbol de componentes
- ✅ **Mejor accesibilidad**: Gestión de foco más simple
- ✅ **Performance**: No causa reflows en el contenedor padre

## 🔧 Gestión de Estado

### Estado Global
```javascript
// Estado de conexión Firebase
connectionState = {
  firebaseInitialized: boolean,
  authStatus: 'initializing' | 'authenticated' | 'error',
  dbConnection: boolean,
  userId: string | null,
  appId: string,
  lastError: object | null,
  isOnline: boolean,
  dataLoaded: {
    projects: boolean,
    clients: boolean,
    expenses: boolean
  }
}
```

### Cache Global
```javascript
globalDataCache = {
  projects: Array,
  clients: Array,
  expenses: Array,
  lastUpdated: {
    projects: ISOString,
    clients: ISOString,
    expenses: ISOString
  }
}
```

## 🚀 Optimizaciones de Rendimiento

### Debouncing de Eventos
```javascript
const debouncedTriggerDataUpdate = (eventType, data, delay = 50) => {
  // Evita actualizaciones excesivas de UI
  // Agrupa múltiples cambios en uno solo
  // Previene renders innecesarios
}
```

### Queue de Operaciones
```javascript
const queueOperation = async (operation) => {
  // Evita race conditions
  // Maneja concurrencia de operaciones Firebase
  // Retry automático en fallos temporales
}
```

### Cache Inteligente
```javascript
const isCacheValid = (dataType, maxAgeMinutes = 5) => {
  // Valida edad del cache
  // Evita requests innecesarios a Firebase
  // Fallback automático a datos locales
}
```

### React Portals para Modales (v1.0.1)
```javascript
// ANTES: Modales en flujo DOM normal
{showModal && (
  <div className="fixed inset-0 ...">
    {/* Causa scroll issues */}
  </div>
)}

// DESPUÉS: Modales renderizados fuera del flujo DOM
{showModal && createPortal(
  <div className="fixed inset-0 ... z-[1000]" 
       style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
    {/* Preserva scroll position */}
  </div>,
  document.body
)}

// Beneficios:
// ✅ Scroll position preserved
// ✅ Better z-index management
// ✅ Cleaner component tree
// ✅ No layout interference
```

### Sincronización Optimizada (v1.0.1)
```javascript
// ANTES: Doble actualización
createProject() {
  await saveToFirebase();
  updateLocalCache();     // ❌ Manual
  triggerEvent();         // ❌ Manual
}

// DESPUÉS: Single source of truth
createProject() {
  await saveToFirebase();
  // ✅ onSnapshot listener updates cache automatically
  // ✅ Single event triggered by Firebase
}

// Resultado:
// - Sin duplicaciones de datos
// - Menos operaciones de red
// - UI más responsive
```

## 🔒 Seguridad y Validación

### Autenticación
- **Firebase Anonymous Auth**: Usuario temporal seguro
- **No storage de credenciales**: Solo tokens de sesión
- **Auto-refresh**: Renovación automática de tokens

### Validación de Datos
```javascript
// Validaciones en múltiples niveles:
// 1. UI (inputs, required fields)
// 2. Component (lógica de negocio)
// 3. DataManager (tipos de datos)
// 4. Firebase (reglas de seguridad)
```

### Sanitización
- **Input sanitization**: Prevención XSS
- **Data validation**: Schemas consistentes
- **Error boundaries**: UI no se rompe con datos corruptos

## 🧪 Testing Strategy

### Tipos de Tests
```javascript
// Unit Tests
- Utilidades puras (chartUtils, date helpers)
- Componentes individuales (sin Firebase)

// Integration Tests
- DataManager con mock de Firebase
- Componentes con contexto completo

// E2E Tests
- Flujos completos de usuario
- Sincronización offline/online
```

### Herramientas de Testing
- **Jest**: Framework de testing
- **React Testing Library**: Tests de componentes
- **Firebase Emulator**: Tests de integración
- **Cypress**: Tests E2E (futuro)

## 📈 Métricas y Monitoreo

### Performance Metrics
- **Load times**: Tiempo de carga inicial
- **Cache hit rates**: Eficiencia del sistema de cache
- **Firebase latency**: Respuesta de la base de datos
- **Memory usage**: Consumo de memoria

### Error Tracking
- **Console logging**: Logs estructurados
- **Error boundaries**: Captura de errores de UI
- **Firebase errors**: Manejo específico de errores de red
- **Offline detection**: Monitoreo de conectividad

## 🚀 Roadmap de Mejoras

### Corto Plazo (1-3 meses)
- [ ] Agregar TypeScript
- [ ] Implementar tests unitarios
- [ ] Optimizar bundle size
- [ ] Mejorar UX en móviles

### Mediano Plazo (3-6 meses)
- [ ] PWA completa
- [ ] Multi-tenancy
- [ ] API REST para integraciones
- [ ] Dashboard avanzado con IA

### Largo Plazo (6+ meses)
- [ ] Mobile app (React Native)
- [ ] Integración con CRMs
- [ ] Analytics avanzado
- [ ] Marketplace de templates

---

## 📞 Soporte y Contacto

Para preguntas técnicas o soporte:
- **Issues**: [GitHub Issues](https://github.com/fernandosegrr/Gestor-de-proyectos/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fernandosegrr/Gestor-de-proyectos/discussions)
- **Email**: [Tu email de contacto]

---

**📌 Historial de Versiones Documentadas:**
- v1.0.0 (Septiembre 2025) - Lanzamiento inicial
- v1.0.1 (Octubre 2025) - Corrección de bugs críticos y optimizaciones

*Última actualización: 5 de octubre de 2025*