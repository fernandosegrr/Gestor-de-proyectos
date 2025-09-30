# 🔧 Guía de Configuración - Chatbot Manager

## Firebase Setup

### 1. Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear un proyecto" o "Add project"
3. Nombre del proyecto: `gestor-proyectos-[tu-nombre]`
4. Habilita Google Analytics (opcional pero recomendado)
5. Elige cuenta de Google Analytics

### 2. Configurar Firestore Database

1. En el menú lateral, ve a **Firestore Database**
2. Haz clic en **"Crear base de datos"**
3. Elige **"Comenzar en modo de producción"**
4. Selecciona ubicación: `nam5 (us-central)` o la más cercana a tus usuarios

### 3. Configurar Authentication

1. Ve a **Authentication** en el menú lateral
2. Haz clic en **"Comenzar"**
3. Ve a la pestaña **"Método de acceso"**
4. Busca **"Acceso anónimo"** y habilita el interruptor
5. Confirma en el diálogo

### 4. Obtener Credenciales del Proyecto

1. Ve a **Configuración del proyecto** (icono de engranaje)
2. Desplázate hacia abajo hasta **"Tus apps"**
3. Si no tienes una app web, haz clic en **"</>"** para agregar una
4. Nombre de la app: `chatbot-manager`
5. **IMPORTANTE**: Marca la casilla **"También configurar Firebase Hosting"**
6. Copia la configuración que aparece

### 5. Configurar Variables de Entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```env
# Configuración de Firebase (reemplaza con tus valores)
REACT_APP_FIREBASE_API_KEY=AIzaSyBe673Oz3T6a72qWx7gE5m8B_R5q2CIGgQ
REACT_APP_FIREBASE_AUTH_DOMAIN=gestor-proyectos-7c12c.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=gestor-proyectos-7c12c
REACT_APP_FIREBASE_STORAGE_BUCKET=gestor-proyectos-7c12c.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=316589220104
REACT_APP_FIREBASE_APP_ID=1:316589220104:web:32a708217b8077a3230cbd
```

### 6. Configurar Reglas de Seguridad (Firestore)

Ve a **Firestore Database** → **Reglas** y reemplaza con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden acceder
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 7. Configurar Reglas de Storage (Opcional)

Si usas Firebase Storage para archivos, ve a **Storage** → **Reglas**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Despliegue

### Opción 1: Firebase Hosting (Recomendado)

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar en el proyecto
firebase init hosting

# Seleccionar proyecto existente
# Directorio público: build
# Reescribir: Yes
# Deploy
firebase deploy
```

### Opción 2: Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Opción 3: Netlify

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Build del proyecto
npm run build

# Deploy
netlify deploy --prod --dir=build
```

## 🔍 Verificación de Configuración

### Checklist de Configuración

- [ ] Proyecto Firebase creado
- [ ] Firestore Database habilitado
- [ ] Authentication con Anonymous sign-in habilitado
- [ ] Archivo `.env.local` creado con credenciales correctas
- [ ] Reglas de seguridad configuradas
- [ ] Proyecto ejecutándose localmente (`npm start`)
- [ ] Datos de prueba creados exitosamente

### Testing Básico

1. **Conexión Firebase**: Deberías ver "Conectado a Firebase" en la barra de estado
2. **Crear Proyecto**: Intenta crear un proyecto de prueba
3. **Persistencia**: Recarga la página, los datos deberían mantenerse
4. **Offline**: Desconecta internet, la app debería seguir funcionando

## 🐛 Solución de Problemas

### Error: "Firebase: No Firebase App '[DEFAULT]' has been created"

**Solución**: Verifica que las variables de entorno estén correctamente configuradas en `.env.local`

### Error: "Missing or insufficient permissions"

**Solución**: Revisa las reglas de Firestore Security Rules

### Error: "Auth domain not authorized"

**Solución**: Agrega tu dominio local (`localhost:3000`) en Authentication → Settings → Authorized domains

### App no carga datos

**Solución**:
1. Verifica conexión a internet
2. Revisa Firebase Console que los datos existen
3. Abre DevTools → Console para ver errores
4. Intenta `firebase deploy` si es un problema de configuración

## 📊 Configuración de Producción

### Variables de Entorno de Producción

Para despliegue, configura estas variables en tu plataforma de hosting:

```env
NODE_ENV=production
REACT_APP_FIREBASE_API_KEY=your_prod_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_prod_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_prod_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_prod_sender_id
REACT_APP_FIREBASE_APP_ID=your_prod_app_id
```

### Optimizaciones de Producción

1. **Build optimizado**: `npm run build`
2. **Service Worker**: Para PWA completa
3. **CDN**: Configurar CDN para assets estáticos
4. **Monitoring**: Configurar Firebase Crashlytics

## 🔐 Seguridad Adicional

### Configuración de Producción

1. **Habilitar App Check** en Firebase Console
2. **Configurar CORS** apropiadamente
3. **Rate limiting** en Firebase Functions (si usas)
4. **Backup automático** de Firestore

### Mejores Prácticas

- Nunca commits las credenciales reales de Firebase
- Usa diferentes proyectos para desarrollo y producción
- Configura budgets de performance
- Monitorea uso y costos en Firebase Console

## 📞 Soporte

Si tienes problemas con la configuración:

1. Revisa los [Firebase Docs](https://firebase.google.com/docs)
2. Consulta los [GitHub Issues](https://github.com/fernandosegrr/Gestor-de-proyectos/issues)
3. Crea un issue con:
   - Error exacto
   - Pasos para reproducir
   - Configuración de Firebase (sin credenciales sensibles)

---

*Configuración verificada para Firebase v10.14.1*