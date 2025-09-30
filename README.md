# 🤖 Chatbot Manager - Sistema de Gestión de Proyectos

Un sistema completo de gestión para proyectos de chatbots, diseñado para agencias y freelancers que necesitan organizar, facturar y analizar sus proyectos de manera eficiente.

![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![Firebase](https://img.shields.io/badge/Firebase-10.14.1-orange.svg)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4.4-38B2AC.svg)
![Recharts](https://img.shields.io/badge/Recharts-2.12.0-8884d8.svg)

## 📋 Características Principales

### 🏗️ Gestión de Proyectos
- **Estados de proyecto**: Demo, Semana Gratis, Establecido, Pausado, Cancelado
- **Fechas de corte automáticas**: Cálculo inteligente de fechas de facturación mensual
- **Precios mensuales**: Seguimiento de ingresos recurrentes
- **Instalación**: Costos únicos de setup con fechas específicas
- **Facturación**: Soporte completo para RFC y razón social

### 👥 Base de Clientes
- **Creación automática**: Los clientes se crean automáticamente al agregar proyectos
- **Información completa**: Email, teléfono, empresa, RFC, dirección
- **Historial**: Vinculación automática con proyectos

### 💰 Control Financiero
- **Gastos categorizados**: Hosting, Software, Marketing, Operativos, Servicios, Otros
- **Gastos recurrentes**: Mensual, semestral, anual
- **Reportes visuales**: Gráficos de ingresos vs gastos, márgenes de ganancia
- **Análisis de rentabilidad**: Por mes, trimestre y año

### 📊 Reportes y Analytics
- **Dashboard financiero**: Ingresos, gastos y ganancias en tiempo real
- **Gráficos interactivos**: Barras, líneas, pastel y áreas
- **Exportación**: Excel y JSON para análisis externos
- **Filtros avanzados**: Por estado, fechas, montos

### 🔄 Sincronización en Tiempo Real
- **Firebase Firestore**: Base de datos NoSQL escalable
- **Modo offline**: Funciona sin conexión con sincronización automática
- **Cache inteligente**: Memoria + localStorage para rendimiento óptimo
- **Autenticación**: Usuario anónimo seguro

### 📱 Notificaciones Inteligentes
- **WhatsApp**: Alertas automáticas para fechas críticas
- **Fechas de corte**: Recordatorios 3 días antes
- **Fin de pruebas**: Notificaciones cuando terminan períodos de prueba
- **Configurable**: Sistema extensible para más tipos de notificaciones

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18**: Framework principal con hooks modernos
- **React Router**: Navegación SPA
- **Tailwind CSS**: Estilos utilitarios con tema oscuro
- **Lucide React**: Iconos consistentes y modernos
- **Recharts**: Gráficos y visualizaciones de datos

### Backend & Base de Datos
- **Firebase Firestore**: Base de datos NoSQL en tiempo real
- **Firebase Auth**: Autenticación anónima
- **Firebase Hosting**: Despliegue (opcional)

### Utilidades
- **date-fns**: Manejo avanzado de fechas
- **xlsx**: Exportación a Excel
- **file-saver**: Descargas de archivos
- **react-scripts**: Build y desarrollo

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 16+ y npm
- Cuenta de Firebase (gratuita)

### 1. Clonar el repositorio
```bash
git clone https://github.com/fernandosegrr/Gestor-de-proyectos.git
cd mi-gestor-proyectos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Firebase
1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Firestore Database
3. Configurar Authentication (Anonymous sign-in)
4. Copiar configuración del proyecto

### 4. Configurar variables de entorno
Crear archivo `.env.local` en la raíz del proyecto:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 5. Ejecutar la aplicación
```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 📖 Uso de la Aplicación

### Primeros Pasos
1. **Configurar Firebase**: Ingresar credenciales en la sección de configuración
2. **Crear primer proyecto**: Usar el formulario de "Nuevo Proyecto"
3. **Agregar gastos**: Registrar costos operativos
4. **Ver reportes**: Analizar la rentabilidad en la pestaña de "Reportes"

### Gestión de Proyectos
- **Demo**: Proyectos en fase de demostración (sin costo)
- **Semana Gratis**: Período de prueba con días configurables
- **Establecido**: Proyectos activos con facturación mensual
- **Pausado**: Proyectos temporariamente detenidos
- **Cancelado**: Proyectos finalizados

### Sistema de Fechas
- **Fecha de inicio**: Cuando comenzó el proyecto
- **Fecha de corte**: Día del mes para facturación (calculada automáticamente)
- **Fecha de instalación**: Para costos únicos de setup
- **Días de prueba**: Duración del período gratuito

### Categorías de Gastos
- **Hosting & Dominios**: Servicios de alojamiento
- **Software & Licencias**: Herramientas y suscripciones
- **Marketing & Publicidad**: Campañas y promoción
- **Gastos Operativos**: Oficina, suministros
- **Servicios Profesionales**: Consultores externos
- **Otros**: Gastos misceláneos

## 🏛️ Arquitectura del Proyecto

```
src/
├── components/           # Componentes de UI
│   ├── Navigation.jsx    # Barra de navegación
│   ├── ProjectManager.jsx # Gestión de proyectos
│   ├── ClientDatabase.jsx # Base de clientes
│   ├── ExpenseManager.jsx # Control de gastos
│   ├── FinancialReports.jsx # Reportes financieros
│   └── ...
├── utils/               # Utilidades y servicios
│   ├── dataSync.js      # Sistema de datos centralizado
│   ├── chartUtils.js    # Utilidades para gráficos
│   ├── notificationService.js # Sistema de notificaciones
│   └── ...
├── App.js              # Componente principal
├── index.js            # Punto de entrada
└── ...
```

### Sistema de Datos (`dataSync.js`)
- **DataManager**: CRUD operations para proyectos, clientes y gastos
- **FirebaseManager**: Conexión y autenticación con Firebase
- **Cache System**: Memoria + localStorage + Firebase
- **Real-time Sync**: Suscripciones a cambios en Firestore
- **Offline Support**: Funcionamiento sin conexión

### Eventos del Sistema
```javascript
DATA_EVENTS = {
  PROJECTS_UPDATED: 'projects-updated',
  CLIENTS_UPDATED: 'clients-updated',
  EXPENSES_UPDATED: 'expenses-updated',
  FIREBASE_STATUS_CHANGED: 'firebase-status-changed'
}
```

## 📊 API y Hooks

### Hooks Personalizados
```javascript
// Escuchar cambios en proyectos
useDataSync(DATA_EVENTS.PROJECTS_UPDATED, (projects) => {
  console.log('Proyectos actualizados:', projects);
});

// Estado de conexión Firebase
const connectionState = useConnectionState();
```

### DataManager API
```javascript
// Proyectos
await dataManager.createProject(projectData);
await dataManager.updateProject(id, updateData);
await dataManager.deleteProject(id);
const projects = await dataManager.loadProjects();

// Clientes
await dataManager.createClient(clientData);
await dataManager.clientExists(clientName); // Verificación optimizada

// Gastos
await dataManager.createExpense(expenseData);
const expenses = await dataManager.loadExpenses();
```

## 🔧 Scripts Disponibles

```bash
npm start          # Inicia servidor de desarrollo
npm run build      # Construye para producción
npm test           # Ejecuta tests
npm run eject      # Expone configuración de webpack
```

## 🚀 Despliegue

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Otras Opciones
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **Build local**: `npm run build` genera carpeta `build/`

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

### Guías de Desarrollo
- Usar ESLint para linting
- Componentes funcionales con hooks
- Nombres descriptivos en inglés
- Comentarios en español para lógica compleja
- Tests para funcionalidades críticas

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**Fernando Segura**
- GitHub: [@fernandosegrr](https://github.com/fernandosegrr)
- LinkedIn: [Tu LinkedIn]

## 🙏 Agradecimientos

- Firebase por la excelente plataforma NoSQL
- React Community por el framework
- Tailwind CSS por el sistema de estilos
- Lucide por los iconos
- Recharts por las visualizaciones

---

**⭐ Si este proyecto te resulta útil, ¡dale una estrella en GitHub!**