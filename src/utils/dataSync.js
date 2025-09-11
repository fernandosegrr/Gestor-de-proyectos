// utils/dataSync.js
// Sistema centralizado de gestión de datos y sincronización con Firebase
import React, { useEffect, useState } from 'react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  query,
  where
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';

// Importar sistema de notificaciones
import { initializeNotificationSystem, checkCutoffDatesAndNotify } from './notificationService';

// Configuración de Firebase con tus credenciales
const firebaseConfig = {
  apiKey: "AIzaSyBe673Oz3T6a72qWx7gE5m8B_R5q2CIGgQ",
  authDomain: "gestor-proyectos-7c12c.firebaseapp.com",
  projectId: "gestor-proyectos-7c12c",
  storageBucket: "gestor-proyectos-7c12c.firebaseapp.com",
  messagingSenderId: "316589220104",
  appId: "1:316589220104:web:32a708217b8077a3230cbd"
};

// Inicializar Firebase solo una vez
let app = null;
let db = null;
let auth = null;

// Unsubscribe functions for real-time listeners
let unsubscribeProjects = null;
let unsubscribeClients = null;
let unsubscribeExpenses = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('✅ Firebase inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
}

// App ID personalizado
const CUSTOM_APP_ID = 'vepiautomkt-chatbots';

// Eventos del sistema de datos
export const DATA_EVENTS = {
  PROJECTS_UPDATED: 'projects-updated',
  CLIENTS_UPDATED: 'clients-updated',
  EXPENSES_UPDATED: 'expenses-updated',
  FIREBASE_STATUS_CHANGED: 'firebase-status-changed'
};

// ✅ CORRECCIÓN 1: Sistema de almacenamiento híbrido CORREGIDO
const inMemoryStorage = {
  storage: new Map(),
  setItem: function(key, value) {
    try {
      this.storage.set(key, value);
    } catch (error) {
      console.error('Error saving to memory:', error);
    }
  },
  getItem: function(key) {
    try {
      return this.storage.get(key) || null;
    } catch (error) {
      console.error('Error reading from memory:', error);
      return null;
    }
  },
  removeItem: function(key) {
    this.storage.delete(key);
  },
  clear: function() {
    this.storage.clear();
  }
};

// ✅ CORRECCIÓN: Sistema de queue para operaciones mejorado
let operationQueue = [];
let isProcessingQueue = false;

// ✅ NUEVA FUNCIONALIDAD: Sistema de debouncing para eventos
let eventDebounceTimeouts = new Map();

const debouncedTriggerDataUpdate = (eventType, data = null, delay = 50) => {
  // Limpiar timeout anterior si existe
  if (eventDebounceTimeouts.has(eventType)) {
    clearTimeout(eventDebounceTimeouts.get(eventType));
  }
  
  // Crear nuevo timeout
  const timeoutId = setTimeout(() => {
    triggerDataUpdate(eventType, data);
    eventDebounceTimeouts.delete(eventType);
  }, delay);
  
  eventDebounceTimeouts.set(eventType, timeoutId);
};

const queueOperation = async (operation) => {
  return new Promise((resolve, reject) => {
    operationQueue.push({ operation, resolve, reject });
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessingQueue || operationQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (operationQueue.length > 0) {
    const { operation, resolve, reject } = operationQueue.shift();
    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }
  
  isProcessingQueue = false;
};

// Función para disparar eventos de actualización
export const triggerDataUpdate = (eventType, data = null) => {
  try {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventType, {
        detail: data
      });
      window.dispatchEvent(event);
    }
  } catch (error) {
    console.error('Error dispatching event:', error);
  }
};

// Hook personalizado para escuchar cambios de datos
export const useDataSync = (eventType, callback) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleDataUpdate = (event) => {
      try {
        callback(event.detail);
      } catch (error) {
        console.error('Error in data sync callback:', error);
      }
    };

    window.addEventListener(eventType, handleDataUpdate);

    return () => {
      window.removeEventListener(eventType, handleDataUpdate);
    };
  }, [eventType, callback]);
};

// ✅ CORRECCIÓN PRINCIPAL: Estado de conexión simplificado y más robusto
let connectionState = {
  firebaseInitialized: false,
  authStatus: 'initializing', // 'initializing', 'authenticated', 'error'
  dbConnection: false,
  appIdLoaded: true,
  userId: null,
  appId: CUSTOM_APP_ID,
  lastError: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  dataLoaded: {
    projects: false,
    clients: false,
    expenses: false
  }
};

// ✅ NUEVA FUNCIONALIDAD: Cache global de datos
let globalDataCache = {
  projects: [],
  clients: [],
  expenses: [],
  lastUpdated: {
    projects: null,
    clients: null,
    expenses: null
  }
};

// Funciones para manejar el cache global
const updateGlobalCache = (dataType, data) => {
  globalDataCache[dataType] = Array.isArray(data) ? [...data] : [];
  globalDataCache.lastUpdated[dataType] = new Date().toISOString();
  
  // También guardar en localStorage como respaldo
  try {
    localStorage.setItem(`chatbot-${dataType}`, JSON.stringify(globalDataCache[dataType]));
    localStorage.setItem(`chatbot-${dataType}-timestamp`, globalDataCache.lastUpdated[dataType]);
  } catch (error) {
    console.warn(`Error guardando ${dataType} en localStorage:`, error);
  }
  
  console.log(`📦 Cache global actualizado para ${dataType}:`, globalDataCache[dataType].length, 'elementos');
};

const getFromGlobalCache = (dataType) => {
  // Primero intentar desde el cache en memoria
  if (globalDataCache[dataType] && globalDataCache[dataType].length > 0) {
    console.log(`✅ Datos obtenidos del cache en memoria para ${dataType}:`, globalDataCache[dataType].length);
    return globalDataCache[dataType];
  }
  
  // Si no hay datos en memoria, intentar desde localStorage
  try {
    const stored = localStorage.getItem(`chatbot-${dataType}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalDataCache[dataType] = parsed;
        const timestamp = localStorage.getItem(`chatbot-${dataType}-timestamp`);
        globalDataCache.lastUpdated[dataType] = timestamp;
        console.log(`📱 Datos restaurados desde localStorage para ${dataType}:`, parsed.length);
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`Error leyendo ${dataType} desde localStorage:`, error);
  }
  
  return [];
};

const isCacheValid = (dataType, maxAgeMinutes = 5) => {
  // ✅ CORRECCIÓN: Usar la estructura correcta del cache global
  const lastUpdated = globalDataCache.lastUpdated[dataType];
  if (!lastUpdated) return false;
  
  const ageMinutes = (new Date() - new Date(lastUpdated)) / (1000 * 60);
  const isValid = ageMinutes < maxAgeMinutes;
  
  console.log(`📋 Cache ${dataType}: edad=${ageMinutes.toFixed(1)}min, válido=${isValid}`);
  return isValid;
};

// Hook para estado de conexión
export const useConnectionState = () => {
  const [state, setState] = useState(connectionState);

  useEffect(() => {
    const handleStateUpdate = (event) => {
      setState({ ...event.detail });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(DATA_EVENTS.FIREBASE_STATUS_CHANGED, handleStateUpdate);
      return () => window.removeEventListener(DATA_EVENTS.FIREBASE_STATUS_CHANGED, handleStateUpdate);
    }
  }, []);

  return state;
};

// Utilidades de Firebase
const getCollectionPath = (collectionName) => {
  return `apps/${CUSTOM_APP_ID}/${collectionName}`;
};

// ✅ CORRECCIÓN: Manejo de errores mejorado
const handleFirebaseError = (error, operation) => {
  console.error(`❌ Firebase error in ${operation}:`, error);
  
  let errorType = 'unknown';
  if (error.code === 'permission-denied') {
    errorType = 'permissions';
  } else if (error.code === 'unavailable') {
    errorType = 'network';
  } else if (error.code === 'unauthenticated') {
    errorType = 'auth';
  }
  
  connectionState.lastError = {
    message: error.message,
    code: error.code,
    type: errorType,
    operation,
    timestamp: new Date().toISOString()
  };
  
  if (errorType === 'network') {
    connectionState.dbConnection = false;
  } else if (errorType === 'auth') {
    connectionState.authStatus = 'error';
    connectionState.userId = null;
  }
  
  triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
  return false;
};

// Función para calcular ingresos mensuales
const calculateMonthlyIncome = (projects, year) => {
  try {
    if (!Array.isArray(projects)) return [];

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const monthlyData = months.map((month, index) => ({
      month,
      monthNumber: index + 1,
      ingresos: 0,
      ingresosRecurrentes: 0,
      proyectosActivos: 0,
      proyectosNuevos: 0
    }));

    projects.forEach(project => {
      if (!project || !project.monthlyPrice) return;

      const monthlyPrice = parseFloat(project.monthlyPrice) || 0;

      if (project.status === 'establecido' && project.startDate) {
        const startDate = new Date(project.startDate);
        if (startDate.getFullYear() <= year) {
          for (let month = 0; month < 12; month++) {
            const monthDate = new Date(year, month, 1);
            if (monthDate >= startDate) {
              monthlyData[month].ingresos += monthlyPrice;
              monthlyData[month].ingresosRecurrentes += monthlyPrice;
              monthlyData[month].proyectosActivos += 1;

              if (startDate.getFullYear() === year && startDate.getMonth() === month) {
                monthlyData[month].proyectosNuevos += 1;
              }
            }
          }
        }
      }

      if (project.status === 'convertido' && project.startDate) {
        const startDate = new Date(project.startDate);
        if (startDate.getFullYear() === year) {
          const month = startDate.getMonth();
          monthlyData[month].ingresos += monthlyPrice;
          monthlyData[month].proyectosNuevos += 1;
        }
      }
    });

    return monthlyData;
  } catch (error) {
    console.error('❌ Error calculating monthly income:', error);
    return [];
  }
};

// ✅ CORRECCIÓN PRINCIPAL: Gestión centralizada de datos con Firebase mejorada
export const dataManager = {
  // === PROYECTOS ===
  saveProjects: async (projects) => {
    return queueOperation(async () => {
      try {
        if (!Array.isArray(projects)) {
          console.error('❌ saveProjects: projects must be an array');
          return false;
        }

        // Siempre guardar en memoria primero
        inMemoryStorage.setItem('chatbot-projects', projects);
        debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, projects);

        if (!connectionState.firebaseInitialized || !connectionState.userId) {
          console.log('✅ Proyectos guardados solo localmente:', projects.length);
          return true;
        }

        // Guardar en Firebase
        const projectsRef = collection(db, getCollectionPath('projects'));
        const batch = [];

        for (const project of projects) {
          if (project && project.id) {
            const docRef = doc(projectsRef, project.id);
            batch.push(setDoc(docRef, project));
          }
        }

        if (batch.length > 0) {
          await Promise.all(batch);
        }

        console.log('✅ Proyectos guardados en Firebase:', projects.length);
        return true;
      } catch (error) {
        console.error('❌ Error saving projects:', error);
        return handleFirebaseError(error, 'saveProjects');
      }
    });
  },

  loadProjects: async () => {
    return queueOperation(async () => {
      try {
        console.log('📊 loadProjects: Iniciando carga...');

        // ✅ PRIMERO: Intentar servir desde cache si es válido
        const cachedProjects = getFromGlobalCache('projects');
        if (cachedProjects.length > 0 && isCacheValid('projects')) {
          console.log('⚡ Sirviendo proyectos desde cache válido:', cachedProjects.length);
          connectionState.dataLoaded.projects = true;
          debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, cachedProjects);
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
          return cachedProjects;
        }

        // Si no hay conexión a Firebase, usar datos locales/cache
        if (!connectionState.firebaseInitialized || !connectionState.userId) {
          const projects = cachedProjects.length > 0 ? cachedProjects : inMemoryStorage.getItem('chatbot-projects') || [];
          console.log('📊 Proyectos cargados localmente:', projects.length);
          updateGlobalCache('projects', projects);
          connectionState.dataLoaded.projects = true;
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
          return projects;
        }

        // Cargar desde Firebase
        console.log('🔥 loadProjects: Cargando desde Firebase...');
        const projectsRef = collection(db, getCollectionPath('projects'));
        const snapshot = await getDocs(projectsRef);
        const projects = [];

        snapshot.forEach((doc) => {
          projects.push({ id: doc.id, ...doc.data() });
        });

        // Actualizar cache global y local
        updateGlobalCache('projects', projects);
        inMemoryStorage.setItem('chatbot-projects', projects);
        connectionState.dataLoaded.projects = true;
        debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, projects);
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        console.log('📊 Proyectos cargados desde Firebase:', projects.length);
        return projects;
      } catch (error) {
        handleFirebaseError(error, 'loadProjects');
        // En caso de error, usar cache como fallback
        const projects = getFromGlobalCache('projects');
        console.log('📊 Fallback: Proyectos desde cache:', projects.length);
        updateGlobalCache('projects', projects);
        connectionState.dataLoaded.projects = true;
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        return projects;
      }
    });
  },

  createProject: async (projectData) => {
    return queueOperation(async () => {
      try {
        if (!projectData || typeof projectData !== 'object') {
          return { success: false, error: 'Invalid project data' };
        }

        const now = new Date().toISOString();
        const newProject = {
          ...projectData,
          id: 'project-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          createdAt: now,
          updatedAt: now
        };

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const projectRef = doc(db, getCollectionPath('projects'), newProject.id);
          await setDoc(projectRef, newProject);
        }

        // ✅ Actualizar cache local y global
        const currentProjects = getFromGlobalCache('projects');
        const updatedProjects = [...currentProjects, newProject];
        updateGlobalCache('projects', updatedProjects);
        inMemoryStorage.setItem('chatbot-projects', updatedProjects);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, updatedProjects);

        console.log('✅ Proyecto creado:', newProject.id);
        return { success: true, project: newProject };
      } catch (error) {
        console.error('❌ Error creating project:', error);
        return { success: false, error: error.message };
      }
    });
  },

  updateProject: async (projectId, updateData) => {
    return queueOperation(async () => {
      try {
        if (!projectId || !updateData) {
          return { success: false, error: 'Invalid parameters' };
        }

        const now = new Date().toISOString();
        const updatedData = {
          ...updateData,
          updatedAt: now
        };

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const projectRef = doc(db, getCollectionPath('projects'), projectId);
          await updateDoc(projectRef, updatedData);
        }

        // ✅ Actualizar cache local y global
        const currentProjects = getFromGlobalCache('projects');
        const updatedProjects = currentProjects.map(project => 
          project.id === projectId ? { ...project, ...updatedData } : project
        );
        updateGlobalCache('projects', updatedProjects);
        inMemoryStorage.setItem('chatbot-projects', updatedProjects);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, updatedProjects);

        console.log('✅ Proyecto actualizado:', projectId);
        return { success: true };
      } catch (error) {
        console.error('❌ Error updating project:', error);
        return { success: false, error: error.message };
      }
    });
  },

  deleteProject: async (projectId) => {
    return queueOperation(async () => {
      try {
        if (!projectId) {
          return { success: false, error: 'Project ID required' };
        }

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const projectRef = doc(db, getCollectionPath('projects'), projectId);
          await deleteDoc(projectRef);
        }

        // ✅ Actualizar cache local y global
        const currentProjects = getFromGlobalCache('projects');
        const updatedProjects = currentProjects.filter(project => project.id !== projectId);
        updateGlobalCache('projects', updatedProjects);
        inMemoryStorage.setItem('chatbot-projects', updatedProjects);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, updatedProjects);

        console.log('✅ Proyecto eliminado:', projectId);
        return { success: true };
      } catch (error) {
        console.error('❌ Error deleting project:', error);
        return { success: false, error: error.message };
      }
    });
  },

  // === CLIENTES ===
  saveClients: async (clients) => {
    return queueOperation(async () => {
      try {
        if (!Array.isArray(clients)) {
          console.error('❌ saveClients: clients must be an array');
          return false;
        }

        inMemoryStorage.setItem('chatbot-clients', clients);
        debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, clients);

        if (!connectionState.firebaseInitialized || !connectionState.userId) {
          console.log('✅ Clientes guardados solo localmente:', clients.length);
          return true;
        }

        const clientsRef = collection(db, getCollectionPath('clients'));
        const batch = [];

        for (const client of clients) {
          if (client && client.id) {
            const docRef = doc(clientsRef, client.id);
            batch.push(setDoc(docRef, client));
          }
        }

        if (batch.length > 0) {
          await Promise.all(batch);
        }

        console.log('✅ Clientes guardados en Firebase:', clients.length);
        return true;
      } catch (error) {
        return handleFirebaseError(error, 'saveClients');
      }
    });
  },

  loadClients: async () => {
    return queueOperation(async () => {
      try {
        if (!connectionState.firebaseInitialized || !connectionState.userId) {
          const clients = inMemoryStorage.getItem('chatbot-clients') || [];
          console.log('👥 Clientes cargados localmente:', clients.length);
          connectionState.dataLoaded.clients = true;
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
          return clients;
        }

        const clientsRef = collection(db, getCollectionPath('clients'));
        const snapshot = await getDocs(clientsRef);
        const clients = [];

        snapshot.forEach((doc) => {
          clients.push({ id: doc.id, ...doc.data() });
        });

        inMemoryStorage.setItem('chatbot-clients', clients);
        connectionState.dataLoaded.clients = true;
        debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, clients);
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        console.log('👥 Clientes cargados desde Firebase:', clients.length);
        return clients;
      } catch (error) {
        handleFirebaseError(error, 'loadClients');
        const clients = inMemoryStorage.getItem('chatbot-clients') || [];
        connectionState.dataLoaded.clients = true;
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        return clients;
      }
    });
  },

  // ✅ NUEVA FUNCIÓN: Verificar si un cliente existe sin cargar todos los datos
  clientExists: async (clientName) => {
    try {
      if (!clientName || !clientName.trim()) {
        return false;
      }

      const normalizedName = clientName.toLowerCase().trim();
      
      // Verificar primero en el cache global
      const cachedClients = getFromGlobalCache('clients');
      if (cachedClients && cachedClients.length > 0) {
        const exists = cachedClients.some(client => 
          client.name?.toLowerCase().trim() === normalizedName
        );
        if (exists) {
          console.log('🔍 Cliente encontrado en cache:', clientName);
          return true;
        }
      }

      // Si no está en cache y Firebase está disponible, hacer consulta específica
      if (connectionState.firebaseInitialized && connectionState.userId) {
        const clientsRef = collection(db, getCollectionPath('clients'));
        const q = query(clientsRef, where('name', '>=', clientName), where('name', '<=', clientName + '\uf8ff'));
        const snapshot = await getDocs(q);
        
        const exists = !snapshot.empty && snapshot.docs.some(doc => {
          const data = doc.data();
          return data.name?.toLowerCase().trim() === normalizedName;
        });

        console.log('🔍 Cliente consultado en Firebase:', clientName, exists ? 'EXISTE' : 'NO EXISTE');
        return exists;
      }

      // Modo local: verificar en localStorage
      const localClients = inMemoryStorage.getItem('chatbot-clients') || [];
      const exists = localClients.some(client => 
        client.name?.toLowerCase().trim() === normalizedName
      );
      
      console.log('🔍 Cliente verificado localmente:', clientName, exists ? 'EXISTE' : 'NO EXISTE');
      return exists;
    } catch (error) {
      console.warn('⚠️ Error verificando existencia de cliente:', error);
      return false; // En caso de error, asumir que no existe para permitir creación
    }
  },

  createClient: async (clientData) => {
    return queueOperation(async () => {
      try {
        if (!clientData || typeof clientData !== 'object') {
          return { success: false, error: 'Invalid client data' };
        }

        const now = new Date().toISOString();
        const newClient = {
          ...clientData,
          id: 'client-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          createdAt: now,
          updatedAt: now
        };

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const clientRef = doc(db, getCollectionPath('clients'), newClient.id);
          await setDoc(clientRef, newClient);
        }

        // ✅ Actualizar cache local y global sin recargar todos los datos
        const currentClients = getFromGlobalCache('clients');
        const updatedClients = [...currentClients, newClient];
        updateGlobalCache('clients', updatedClients);
        inMemoryStorage.setItem('chatbot-clients', updatedClients);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, updatedClients);

        console.log('✅ Cliente creado:', newClient.id);
        return { success: true, client: newClient };
      } catch (error) {
        console.error('❌ Error creating client:', error);
        return { success: false, error: error.message };
      }
    });
  },

  updateClient: async (clientId, updateData) => {
    return queueOperation(async () => {
      try {
        if (!clientId || !updateData) {
          return { success: false, error: 'Invalid parameters' };
        }

        const now = new Date().toISOString();
        const updatedData = {
          ...updateData,
          updatedAt: now
        };

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const clientRef = doc(db, getCollectionPath('clients'), clientId);
          await updateDoc(clientRef, updatedData);
        }

        // ✅ CORRECCIÓN: Actualizar cache local usando cache global sin recargar
        const currentClients = getFromGlobalCache('clients');
        const updatedClients = currentClients.map(client => 
          client.id === clientId ? { ...client, ...updatedData } : client
        );
        updateGlobalCache('clients', updatedClients);
        inMemoryStorage.setItem('chatbot-clients', updatedClients);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, updatedClients);

        console.log('✅ Cliente actualizado:', clientId);
        return { success: true };
      } catch (error) {
        console.error('❌ Error updating client:', error);
        return { success: false, error: error.message };
      }
    });
  },

  deleteClient: async (clientId) => {
    return queueOperation(async () => {
      try {
        if (!clientId) {
          return { success: false, error: 'Client ID required' };
        }

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const clientRef = doc(db, getCollectionPath('clients'), clientId);
          await deleteDoc(clientRef);
        }

        // ✅ CORRECCIÓN: Actualizar cache local usando cache global sin recargar
        const currentClients = getFromGlobalCache('clients');
        const updatedClients = currentClients.filter(client => client.id !== clientId);
        updateGlobalCache('clients', updatedClients);
        inMemoryStorage.setItem('chatbot-clients', updatedClients);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, updatedClients);

        console.log('✅ Cliente eliminado:', clientId);
        return { success: true };
      } catch (error) {
        console.error('❌ Error deleting client:', error);
        return { success: false, error: error.message };
      }
    });
  },

  // === GASTOS/EXPENSES ===
  saveExpenses: async (expenses) => {
    return queueOperation(async () => {
      try {
        if (!Array.isArray(expenses)) {
          console.error('❌ saveExpenses: expenses must be an array');
          return false;
        }

        inMemoryStorage.setItem('chatbot-expenses', expenses);
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, expenses);

        if (!connectionState.firebaseInitialized || !connectionState.userId) {
          console.log('✅ Gastos guardados solo localmente:', expenses.length);
          return true;
        }

        const expensesRef = collection(db, getCollectionPath('expenses'));
        const batch = [];

        for (const expense of expenses) {
          if (expense && expense.id) {
            const docRef = doc(expensesRef, expense.id);
            batch.push(setDoc(docRef, expense));
          }
        }

        if (batch.length > 0) {
          await Promise.all(batch);
        }

        console.log('✅ Gastos guardados en Firebase:', expenses.length);
        return true;
      } catch (error) {
        return handleFirebaseError(error, 'saveExpenses');
      }
    });
  },

  loadExpenses: async () => {
    return queueOperation(async () => {
      try {
        console.log('💰 loadExpenses: Iniciando carga...');

        // ✅ PRIMERO: Intentar servir desde cache si es válido
        const cachedExpenses = getFromGlobalCache('expenses');
        if (cachedExpenses.length > 0 && isCacheValid('expenses')) {
          console.log('⚡ Sirviendo gastos desde cache válido:', cachedExpenses.length);
          connectionState.dataLoaded.expenses = true;
          debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, cachedExpenses);
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
          return cachedExpenses;
        }

        // Si no hay conexión a Firebase, usar datos locales y marcar como cargado
        if (!connectionState.firebaseInitialized || !connectionState.userId) {
          const expenses = cachedExpenses.length > 0 ? cachedExpenses : inMemoryStorage.getItem('chatbot-expenses') || [];
          console.log('💰 Gastos cargados localmente:', expenses.length);
          updateGlobalCache('expenses', expenses);
          connectionState.dataLoaded.expenses = true;
          debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, expenses);
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
          return expenses;
        }

        // Cargar desde Firebase
        console.log('🔥 loadExpenses: Cargando desde Firebase...');
        const expensesRef = collection(db, getCollectionPath('expenses'));
        const snapshot = await getDocs(expensesRef);
        const expenses = [];

        snapshot.forEach((doc) => {
          expenses.push({ id: doc.id, ...doc.data() });
        });

        // Actualizar cache global y local
        updateGlobalCache('expenses', expenses);
        inMemoryStorage.setItem('chatbot-expenses', expenses);
        connectionState.dataLoaded.expenses = true;
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, expenses);
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        console.log('💰 Gastos cargados desde Firebase:', expenses.length);
        return expenses;
      } catch (error) {
        console.error('❌ Error loading expenses:', error);
        handleFirebaseError(error, 'loadExpenses');
        
        // En caso de error, usar cache como fallback
        const expenses = getFromGlobalCache('expenses');
        console.log('💰 Fallback: Gastos desde cache:', expenses.length);
        updateGlobalCache('expenses', expenses);
        connectionState.dataLoaded.expenses = true;
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, expenses);
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        return expenses;
      }
    });
  },

  createExpense: async (expenseData) => {
    return queueOperation(async () => {
      try {
        if (!expenseData || typeof expenseData !== 'object') {
          return { success: false, error: 'Invalid expense data' };
        }

        const now = new Date().toISOString();
        const newExpense = {
          ...expenseData,
          id: 'expense-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          createdAt: now,
          updatedAt: now
        };

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const expenseRef = doc(db, getCollectionPath('expenses'), newExpense.id);
          await setDoc(expenseRef, newExpense);
        }

        // ✅ Actualizar cache local y global
        const currentExpenses = getFromGlobalCache('expenses');
        const updatedExpenses = [...currentExpenses, newExpense];
        updateGlobalCache('expenses', updatedExpenses);
        inMemoryStorage.setItem('chatbot-expenses', updatedExpenses);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, updatedExpenses);

        console.log('✅ Gasto creado:', newExpense.id);
        return { success: true, expense: newExpense };
      } catch (error) {
        console.error('❌ Error creating expense:', error);
        return { success: false, error: error.message };
      }
    });
  },

  updateExpense: async (expenseId, updateData) => {
    return queueOperation(async () => {
      try {
        if (!expenseId || !updateData) {
          return { success: false, error: 'Invalid parameters' };
        }

        const now = new Date().toISOString();
        const updatedData = {
          ...updateData,
          updatedAt: now
        };

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const expenseRef = doc(db, getCollectionPath('expenses'), expenseId);
          await updateDoc(expenseRef, updatedData);
        }

        // ✅ Actualizar cache local y global
        const currentExpenses = getFromGlobalCache('expenses');
        const updatedExpenses = currentExpenses.map(expense => 
          expense.id === expenseId ? { ...expense, ...updatedData } : expense
        );
        updateGlobalCache('expenses', updatedExpenses);
        inMemoryStorage.setItem('chatbot-expenses', updatedExpenses);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, updatedExpenses);

        console.log('✅ Gasto actualizado:', expenseId);
        return { success: true };
      } catch (error) {
        console.error('❌ Error updating expense:', error);
        return { success: false, error: error.message };
      }
    });
  },

  deleteExpense: async (expenseId) => {
    return queueOperation(async () => {
      try {
        if (!expenseId) {
          return { success: false, error: 'Expense ID required' };
        }

        if (connectionState.firebaseInitialized && connectionState.userId) {
          const expenseRef = doc(db, getCollectionPath('expenses'), expenseId);
          await deleteDoc(expenseRef);
        }

        // ✅ Actualizar cache local y global
        const currentExpenses = getFromGlobalCache('expenses');
        const updatedExpenses = currentExpenses.filter(expense => expense.id !== expenseId);
        updateGlobalCache('expenses', updatedExpenses);
        inMemoryStorage.setItem('chatbot-expenses', updatedExpenses);
        
        // Disparar evento de actualización con debouncing
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, updatedExpenses);

        console.log('✅ Gasto eliminado:', expenseId);
        return { success: true };
      } catch (error) {
        console.error('❌ Error deleting expense:', error);
        return { success: false, error: error.message };
      }
    });
  },

  // Real-time subscriptions mejoradas
  subscribeToProjects: () => {
    if (unsubscribeProjects) {
      unsubscribeProjects();
      unsubscribeProjects = null;
    }

    if (!db || !connectionState.firebaseInitialized || !connectionState.userId) {
      console.warn('⚠️ No se puede suscribir a proyectos: Firebase no inicializado');
      return;
    }

    const projectsRef = collection(db, getCollectionPath('projects'));
    unsubscribeProjects = onSnapshot(projectsRef, 
      (snapshot) => {
        const projects = [];
        snapshot.forEach(doc => {
          projects.push({ id: doc.id, ...doc.data() });
        });
        
        // ✅ CORRECCIÓN: Actualizar cache global y usar debouncing
        updateGlobalCache('projects', projects);
        inMemoryStorage.setItem('chatbot-projects', projects);
        debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, projects);
        console.log('🔄 Proyectos actualizados en tiempo real:', projects.length);
      }, 
      (error) => {
        console.error('❌ Error en onSnapshot projects:', error);
        handleFirebaseError(error, 'onSnapshot projects');
        unsubscribeProjects = null;
      }
    );
    console.log('✅ Suscrito a cambios en tiempo real de proyectos');
  },

  unsubscribeFromProjects: () => {
    if (unsubscribeProjects) {
      unsubscribeProjects();
      unsubscribeProjects = null;
      console.log('🚫 Desuscrito de cambios en tiempo real de proyectos');
    }
  },

  subscribeToClients: () => {
    if (unsubscribeClients) {
      unsubscribeClients();
      unsubscribeClients = null;
    }

    if (!db || !connectionState.firebaseInitialized || !connectionState.userId) {
      console.warn('⚠️ No se puede suscribir a clientes: Firebase no inicializado');
      return;
    }

    const clientsRef = collection(db, getCollectionPath('clients'));
    unsubscribeClients = onSnapshot(clientsRef, 
      (snapshot) => {
        const clients = [];
        snapshot.forEach(doc => {
          clients.push({ id: doc.id, ...doc.data() });
        });
        
        // ✅ CORRECCIÓN: Actualizar cache global y usar debouncing
        updateGlobalCache('clients', clients);
        inMemoryStorage.setItem('chatbot-clients', clients);
        debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, clients);
        console.log('🔄 Clientes actualizados en tiempo real:', clients.length);
      }, 
      (error) => {
        console.error('❌ Error en onSnapshot clients:', error);
        handleFirebaseError(error, 'onSnapshot clients');
        unsubscribeClients = null;
      }
    );
    console.log('✅ Suscrito a cambios en tiempo real de clientes');
  },

  unsubscribeFromClients: () => {
    if (unsubscribeClients) {
      unsubscribeClients();
      unsubscribeClients = null;
      console.log('🚫 Desuscrito de cambios en tiempo real de clientes');
    }
  },

  subscribeToExpenses: () => {
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }

    if (!db || !connectionState.firebaseInitialized || !connectionState.userId) {
      console.warn('⚠️ No se puede suscribir a gastos: Firebase no inicializado');
      // Si no hay Firebase, disparar evento con datos locales para evitar carga infinita
      const localExpenses = inMemoryStorage.getItem('chatbot-expenses') || [];
      connectionState.dataLoaded.expenses = true;
      debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, localExpenses);
      triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
      return;
    }

    const expensesRef = collection(db, getCollectionPath('expenses'));
    unsubscribeExpenses = onSnapshot(expensesRef, 
      (snapshot) => {
        const expenses = [];
        snapshot.forEach(doc => {
          expenses.push({ id: doc.id, ...doc.data() });
        });
        
        // ✅ CORRECCIÓN: Actualizar cache global y usar debouncing
        updateGlobalCache('expenses', expenses);
        inMemoryStorage.setItem('chatbot-expenses', expenses);
        connectionState.dataLoaded.expenses = true;
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, expenses);
        debouncedTriggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState, 100);
        console.log('🔄 Gastos actualizados en tiempo real:', expenses.length);
      }, 
      (error) => {
        console.error('❌ Error en onSnapshot expenses:', error);
        handleFirebaseError(error, 'onSnapshot expenses');
        unsubscribeExpenses = null;
        
        // En caso de error, usar datos locales y marcar como cargado
        const localExpenses = inMemoryStorage.getItem('chatbot-expenses') || [];
        connectionState.dataLoaded.expenses = true;
        debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, localExpenses);
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
      }
    );
    console.log('✅ Suscrito a cambios en tiempo real de gastos');
  },

  unsubscribeFromExpenses: () => {
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
      console.log('🚫 Desuscrito de cambios en tiempo real de gastos');
    }
  },

  // === ANÁLISIS FINANCIERO CORREGIDO ===
  // Función para debugging y verificación de gastos fantasma
  debugExpenses: (expenses, year) => {
    console.log('🔍 DEBUG: Analizando gastos para detectar problemas...');
    console.log(`📅 Año objetivo: ${year}`);
    console.log(`📊 Total de gastos en la base: ${expenses?.length || 0}`);
    
    if (!Array.isArray(expenses) || expenses.length === 0) {
      console.log('✅ No hay gastos en la base de datos');
      return { hasIssues: false, totalExpenses: 0 };
    }

    expenses.forEach((expense, index) => {
      console.log(`Gasto ${index + 1}:`, {
        id: expense?.id,
        name: expense?.name || 'Sin nombre',
        amount: expense?.amount,
        date: expense?.date,
        category: expense?.category || 'sin categoría',
        isRecurring: expense?.isRecurring,
        vendor: expense?.vendor || 'sin proveedor'
      });
    });

    return { hasIssues: false, totalExpenses: expenses.length };
  },

  calculateMonthlyExpenses: (expenses, year) => {
    try {
      console.log('🔍 Calculando gastos mensuales para el año:', year);
      console.log('📊 Gastos recibidos:', expenses?.length || 0);

      if (!Array.isArray(expenses) || expenses.length === 0) {
        console.log('⚠️ No hay gastos para procesar');
        return [];
      }

      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      const monthlyData = months.map((month, index) => ({
        month,
        monthNumber: index + 1,
        gastosFijos: 0,
        gastosVariables: 0,
        gastosOperativos: 0,
        gastosMarketing: 0,
        gastosOtros: 0,
        totalMes: 0
      }));

      // Procesar cada gasto con validación estricta
      expenses.forEach((expense, index) => {
        console.log(`🔎 Procesando gasto ${index + 1}:`, {
          id: expense?.id,
          name: expense?.name,
          amount: expense?.amount,
          date: expense?.date,
          category: expense?.category,
          isRecurring: expense?.isRecurring
        });

        // Validaciones estrictas
        if (!expense || !expense.date || !expense.amount) {
          console.log(`⚠️ Gasto ${index + 1} ignorado: datos incompletos`);
          return;
        }

        const amount = parseFloat(expense.amount);
        if (isNaN(amount) || amount <= 0) {
          console.log(`⚠️ Gasto ${index + 1} ignorado: cantidad inválida (${expense.amount})`);
          return;
        }

        // Parsear fecha con validación - SIN problemas de zona horaria
        let expenseDate;
        try {
          // Crear fecha local sin problemas de zona horaria
          const [year_str, month_str, day_str] = expense.date.split('-');
          expenseDate = new Date(parseInt(year_str), parseInt(month_str) - 1, parseInt(day_str));
          
          if (isNaN(expenseDate.getTime())) {
            throw new Error('Fecha inválida');
          }
        } catch (error) {
          console.log(`⚠️ Gasto ${index + 1} ignorado: fecha inválida (${expense.date})`);
          return;
        }

        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth(); // 0-11

        console.log(`📅 Gasto fecha procesada: ${expense.date} -> año: ${expenseYear}, mes: ${expenseMonth + 1}`);

        // Determinar categoría con valor por defecto
        const category = expense.category || 'otros';

        if (expense.isRecurring === true) {
          console.log(`🔄 Procesando gasto recurrente: ${expense.name}, tipo: ${expense.recurringType || 'monthly'}`);
          
          const recurringType = expense.recurringType || 'monthly'; // Por defecto mensual para compatibilidad
          
          // Para gastos recurrentes, aplicar según el tipo de recurrencia
          if (expenseYear <= year) {
            for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
              let shouldApply = false;
              
              // Determinar si debe aplicarse según el tipo de recurrencia
              switch (recurringType) {
                case 'monthly':
                  // Mensual: desde el mes del gasto hacia adelante
                  shouldApply = (expenseYear < year) || 
                               (expenseYear === year && monthIndex >= expenseMonth);
                  break;
                
                case 'biannual':
                  // Semestral: aplicar cada 6 meses desde la fecha inicial
                  if (expenseYear === year) {
                    // Aplicar en el mes inicial y 6 meses después si está en el año
                    shouldApply = (monthIndex === expenseMonth) || 
                                 (monthIndex === (expenseMonth + 6) % 12 && expenseMonth + 6 < 12);
                  } else if (expenseYear < year) {
                    // Para años posteriores, calcular cuáles meses corresponden
                    const monthsSinceStart = (year - expenseYear) * 12 + monthIndex - expenseMonth;
                    shouldApply = monthsSinceStart >= 0 && monthsSinceStart % 6 === 0;
                  }
                  break;
                
                case 'annual':
                  // Anual: aplicar solo en el mismo mes cada año
                  if (expenseYear === year) {
                    shouldApply = monthIndex === expenseMonth;
                  } else if (expenseYear < year) {
                    shouldApply = monthIndex === expenseMonth;
                  }
                  break;
                
                default:
                  // Por defecto, comportamiento mensual
                  shouldApply = (expenseYear < year) || 
                               (expenseYear === year && monthIndex >= expenseMonth);
              }
              
              if (shouldApply) {
                console.log(`💰 Aplicando gasto recurrente ${recurringType} "${expense.name}" (${amount}) al mes ${monthIndex + 1}`);
                
                switch (category) {
                  case 'hosting':
                  case 'software':
                    monthlyData[monthIndex].gastosFijos += amount;
                    break;
                  case 'marketing':
                    monthlyData[monthIndex].gastosMarketing += amount;
                    break;
                  case 'operativos':
                    monthlyData[monthIndex].gastosOperativos += amount;
                    break;
                  case 'servicios':
                    monthlyData[monthIndex].gastosVariables += amount;
                    break;
                  default:
                    monthlyData[monthIndex].gastosOtros += amount;
                }
                monthlyData[monthIndex].totalMes += amount;
              }
            }
          }
        } else {
          // Gasto único - solo aplicar al mes específico del año específico
          if (expenseYear === year && expenseMonth >= 0 && expenseMonth < 12) {
            console.log(`💸 Aplicando gasto único "${expense.name}" (${amount}) al mes ${expenseMonth + 1} del año ${year}`);
            
            const monthData = monthlyData[expenseMonth];

            switch (category) {
              case 'hosting':
              case 'software':
                monthData.gastosFijos += amount;
                break;
              case 'marketing':
                monthData.gastosMarketing += amount;
                break;
              case 'operativos':
                monthData.gastosOperativos += amount;
                break;
              case 'servicios':
                monthData.gastosVariables += amount;
                break;
              default:
                monthData.gastosOtros += amount;
            }
            monthData.totalMes += amount;
          } else {
            console.log(`⏭️ Gasto único "${expense.name}" no aplicable (año: ${expenseYear}, mes: ${expenseMonth + 1})`);
          }
        }
      });

      // Log del resultado final
      console.log('📊 Resultado final de gastos mensuales:');
      monthlyData.forEach((month, index) => {
        if (month.totalMes > 0) {
          console.log(`${month.month}: ${month.totalMes} (Fijos: ${month.gastosFijos}, Variables: ${month.gastosVariables}, Marketing: ${month.gastosMarketing}, Operativos: ${month.gastosOperativos}, Otros: ${month.gastosOtros})`);
        }
      });

      return monthlyData;
    } catch (error) {
      console.error('❌ Error calculating monthly expenses:', error);
      return [];
    }
  },

  calculateExpenseStats: (expenses = []) => {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return {
        totalExpenses: 0,
        monthlyAverageExpenses: 0,
        categoryDistribution: [],
        fixedExpenses: 0,
        variableExpenses: 0,
        expensesByCategory: {},
        expenseGrowthRate: 0,
        total: 0,
        average: 0,
        count: 0,
        min: 0,
        max: 0,
        monthlyAverage: 0
      };
    }

    const amounts = expenses.map(e => parseFloat(e.amount) || 0);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    const average = expenses.length > 0 ? total / expenses.length : 0;

    let monthlyRecurringTotal = 0;
    let oneTimeExpensesTotal = 0;

    expenses.forEach(expense => {
      const amount = parseFloat(expense.amount) || 0;
      if (expense.isRecurring) {
        monthlyRecurringTotal += amount;
      } else {
        oneTimeExpensesTotal += amount;
      }
    });

    const monthlyAverage = monthlyRecurringTotal + (oneTimeExpensesTotal / 12);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentYearExpenses = expenses.filter(expense => {
      if (!expense.date) return false;
      const expenseDate = new Date(expense.date);
      return expenseDate.getFullYear() === currentYear;
    });

    const totalExpenses = currentYearExpenses.reduce((sum, expense) => {
      return sum + (parseFloat(expense.amount) || 0);
    }, 0);

    const expensesByCategory = {};
    const categoryDistribution = [];

    currentYearExpenses.forEach(expense => {
      const category = expense.category || 'otros';
      const amount = parseFloat(expense.amount) || 0;

      if (!expensesByCategory[category]) {
        expensesByCategory[category] = 0;
      }
      expensesByCategory[category] += amount;
    });

    Object.keys(expensesByCategory).forEach(category => {
      const amount = expensesByCategory[category];
      const percentage = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0;

      const categoryInfo = {
        hosting: { name: 'Hosting & Dominios', color: '#3B82F6', icon: '🌐', type: 'fixed' },
        software: { name: 'Software & Licencias', color: '#8B5CF6', icon: '💻', type: 'fixed' },
        marketing: { name: 'Marketing & Publicidad', color: '#10B981', icon: '📢', type: 'variable' },
        operativos: { name: 'Gastos Operativos', color: '#F59E0B', icon: '🏢', type: 'variable' },
        servicios: { name: 'Servicios Profesionales', color: '#EF4444', icon: '🤝', type: 'variable' },
        otros: { name: 'Otros', color: '#6B7280', icon: '📦', type: 'variable' }
      }[category] || { name: category, color: '#6B7280', icon: '📦', type: 'variable' };

      categoryDistribution.push({
        name: categoryInfo.name,
        value: amount,
        percentage: parseFloat(percentage),
        color: categoryInfo.color
      });
    });

    const fixedCategories = ['hosting', 'software'];
    const fixedExpenses = currentYearExpenses
      .filter(expense => fixedCategories.includes(expense.category))
      .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);

    const variableExpenses = totalExpenses - fixedExpenses;

    const currentMonthExpenses = currentYearExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth;
      })
      .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);

    const previousMonthExpenses = currentMonth > 0 ? currentYearExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getMonth() === currentMonth - 1;
      })
      .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0) : 0;

    const expenseGrowthRate = previousMonthExpenses > 0
      ? ((currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses * 100)
      : 0;

    return {
      totalExpenses,
      monthlyAverageExpenses: monthlyAverage,
      categoryDistribution: categoryDistribution.sort((a, b) => b.value - a.value),
      fixedExpenses,
      variableExpenses,
      expensesByCategory,
      expenseGrowthRate: parseFloat(expenseGrowthRate.toFixed(2)),
      total,
      average,
      count: expenses.length,
      min: Math.min(...amounts),
      max: Math.max(...amounts),
      monthlyAverage
    };
  },

  calculateNetProfitAnalysis: async (year = new Date().getFullYear()) => {
    try {
      const [projects, expenses] = await Promise.all([
        dataManager.loadProjects(),
        dataManager.loadExpenses()
      ]);

      const monthlyIncome = calculateMonthlyIncome(projects, year);
      const monthlyExpenses = dataManager.calculateMonthlyExpenses(expenses, year);

      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];

      const netProfitData = months.map((month, index) => {
        const incomeData = monthlyIncome.find(m => m.month === month) || {};
        const expenseData = monthlyExpenses.find(m => m.month === month) || {};

        const totalIncome = incomeData.ingresos || 0;
        const totalExpenses = expenseData.totalMes || 0;
        const netProfit = totalIncome - totalExpenses;
        const profitMargin = totalIncome > 0 ? (netProfit / totalIncome * 100) : 0;

        return {
          month,
          monthNumber: index + 1,
          ingresos: totalIncome,
          gastos: totalExpenses,
          ganancia: netProfit,
          margenPorcentaje: parseFloat(profitMargin.toFixed(2)),
          ingresosRecurrentes: incomeData.ingresosRecurrentes || 0,
          gastosFijos: expenseData.gastosFijos || 0,
          gastosVariables: expenseData.gastosVariables || 0
        };
      });

      const yearTotals = netProfitData.reduce((totals, month) => ({
        totalIncome: totals.totalIncome + month.ingresos,
        totalExpenses: totals.totalExpenses + month.gastos,
        totalProfit: totals.totalProfit + month.ganancia,
        totalRecurringIncome: totals.totalRecurringIncome + month.ingresosRecurrentes,
        totalFixedExpenses: totals.totalFixedExpenses + month.gastosFijos
      }), {
        totalIncome: 0,
        totalExpenses: 0,
        totalProfit: 0,
        totalRecurringIncome: 0,
        totalFixedExpenses: 0
      });

      const avgProfitMargin = yearTotals.totalIncome > 0
        ? (yearTotals.totalProfit / yearTotals.totalIncome * 100)
        : 0;

      return {
        monthlyData: netProfitData,
        yearTotals: {
          ...yearTotals,
          avgProfitMargin: parseFloat(avgProfitMargin.toFixed(2))
        }
      };
    } catch (error) {
      console.error('❌ Error calculating net profit analysis:', error);
      return {
        monthlyData: [],
        yearTotals: {
          totalIncome: 0,
          totalExpenses: 0,
          totalProfit: 0,
          totalRecurringIncome: 0,
          totalFixedExpenses: 0,
          avgProfitMargin: 0
        }
      };
    }
  },

  // === UTILIDADES DE FECHAS ===
}

// Función para calcular la siguiente fecha de corte
const calculateNextCutoffDate = (startDate) => {
  if (!startDate) return '';
  
  const start = new Date(startDate + 'T12:00:00');
  const today = new Date();
  
  // Primera fecha de corte: 30 días después del inicio
  const initialCutoff = new Date(start);
  initialCutoff.setDate(start.getDate() + 30);
  
  // Si ya pasó, calcular la siguiente fecha mensual
  let cutoffDate = new Date(initialCutoff);
  
  while (cutoffDate <= today) {
    const currentDay = cutoffDate.getDate();
    cutoffDate.setMonth(cutoffDate.getMonth() + 1);
    
    // Manejar meses con menos días
    if (cutoffDate.getDate() !== currentDay) {
      cutoffDate.setDate(0); // Último día del mes anterior
    }
  }
  
  return cutoffDate.toISOString().split('T')[0];
};

// Función para actualizar fechas de corte expiradas
const updateExpiredCutoffDates = async () => {
  try {
    const projects = await dataManager.loadProjects();
    let updated = false;

    const updatedProjects = projects.map(project => {
      if (project.status === 'establecido' && project.cutoffDate) {
        const today = new Date();
        const cutoff = new Date(project.cutoffDate);

        if (cutoff < today) {
          const newCutoffDate = dataManager.calculateNextCutoffDate(project.cutoffDate);
          console.log(`📅 Actualizando fecha de corte para ${project.name}: ${project.cutoffDate} -> ${newCutoffDate}`);
          updated = true;
          return { ...project, cutoffDate: newCutoffDate };
        }
      }
      return project;
    });

    if (updated) {
      await dataManager.saveProjects(updatedProjects);
      console.log('✅ Fechas de corte actualizadas');
    }

    return updated;
  } catch (error) {
    console.error('❌ Error updating cutoff dates:', error);
    return false;
  }
};

// Agregar las funciones utilitarias como propiedades del objeto dataManager
dataManager.calculateNextCutoffDate = calculateNextCutoffDate;
dataManager.updateExpiredCutoffDates = updateExpiredCutoffDates;

// === NOTIFICACIONES ===
dataManager.checkAndSendNotifications = async () => {
  try {
    const projects = await dataManager.loadProjects();
    const today = new Date();
    const notifications = [];

    projects.forEach(project => {
      if (!project) return;

      if (project.status === 'establecido' && project.cutoffDate) {
        const cutoffDate = new Date(project.cutoffDate);
        if (!isNaN(cutoffDate.getTime())) {
          const daysUntilCutoff = Math.ceil((cutoffDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilCutoff <= 3 && daysUntilCutoff >= 0) {
            notifications.push({
              type: 'cutoff_warning',
              project: project.name,
              days: daysUntilCutoff,
              message: `El proyecto "${project.name}" tiene fecha de corte en ${daysUntilCutoff} días`
            });
          }
        }
      }

      if (project.status === 'semana_gratis' && project.startDate) {
        const startDate = new Date(project.startDate);
        if (!isNaN(startDate.getTime())) {
          const trialDays = parseInt(project.trialDays || 7);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + trialDays);

          const daysUntilEnd = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

          if (daysUntilEnd <= 2 && daysUntilEnd >= 0) {
            notifications.push({
              type: 'trial_ending',
              project: project.name,
              days: daysUntilEnd,
              message: `La prueba de "${project.name}" termina en ${daysUntilEnd} días`
            });
          }
        }
      }
    });

    if (notifications.length > 0) {
      console.log('🔔 Notificaciones pendientes:', notifications.length);
      notifications.forEach(notif => {
        console.log(`📱 [WhatsApp] ${notif.message}`);
      });
    }

    return notifications;
  } catch (error) {
    console.error('❌ Error checking notifications:', error);
    return [];
  }
};

// ✅ CORRECCIÓN PRINCIPAL: Firebase Manager mejorado
export const firebaseManager = {
  initialized: false,

  initialize: async () => {
    try {
      if (!app || !db || !auth) {
        throw new Error('Firebase no se pudo inicializar');
      }

      console.log('🔧 Inicializando Firebase Manager...');

      // Configurar listeners de conectividad
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          connectionState.isOnline = true;
          if (db) enableNetwork(db);
          console.log('🌐 Conexión restaurada');
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        });

        window.addEventListener('offline', () => {
          connectionState.isOnline = false;
          console.log('📵 Sin conexión - modo offline');
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        });
      }

      // ✅ CORRECCIÓN: Autenticación simplificada y más robusta
      connectionState.authStatus = 'authenticating';
      triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('❌ Timeout en autenticación Firebase');
          connectionState.authStatus = 'error';
          connectionState.lastError = { message: 'Authentication timeout', code: 'timeout' };
          triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
          reject(new Error('Authentication timeout'));
        }, 10000); // 10 segundos timeout

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          clearTimeout(timeout);
          
          try {
            if (user) {
              connectionState.userId = user.uid;
              connectionState.authStatus = 'authenticated';
              connectionState.dbConnection = true;
              connectionState.firebaseInitialized = true;
              firebaseManager.initialized = true;
              
              console.log('✅ Usuario autenticado:', user.uid);
              
              // Suscribirse a actualizaciones en tiempo real
              dataManager.subscribeToProjects();
              dataManager.subscribeToClients();
              dataManager.subscribeToExpenses();
              
              triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
              unsubscribe();
              resolve(true);
            } else {
              // Intentar autenticación anónima
              console.log('🔑 Iniciando autenticación anónima...');
              await signInAnonymously(auth);
              // onAuthStateChanged se ejecutará nuevamente con el usuario anónimo
            }
          } catch (error) {
            console.error('❌ Error en autenticación:', error);
            connectionState.authStatus = 'error';
            connectionState.dbConnection = false;
            connectionState.lastError = { message: error.message, code: error.code };
            triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
            unsubscribe();
            reject(error);
          }
        });
      });

    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error);
      connectionState.lastError = { message: error.message, code: error.code };
      connectionState.authStatus = 'error';
      connectionState.dbConnection = false;
      triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
      return false;
    }
  },

  getConnectionState: () => connectionState,

  reconnect: async () => {
    try {
      if (db) {
        await enableNetwork(db);
        console.log('🔄 Intentando reconectar...');
        
        if (auth.currentUser) {
          connectionState.userId = auth.currentUser.uid;
          connectionState.authStatus = 'authenticated';
          connectionState.dbConnection = true;
        } else {
          await signInAnonymously(auth);
        }
        
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error reconectando:', error);
      connectionState.lastError = { message: error.message, code: error.code };
      triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
      return false;
    }
  }
};

// ✅ CORRECCIÓN: Función de inicialización mejorada
export const initializeData = async (forceInitialization = false) => {
  try {
    console.log('🔧 Iniciando sistema de datos...');

    // Restaurar cache global desde localStorage al inicializar
    console.log('📦 Restaurando cache global desde localStorage...');
    try {
      const savedCache = localStorage.getItem('gestor_proyectos_cache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        // Verificar si el cache es válido (no expirado)
        if (isCacheValid(parsedCache.projects?.lastUpdated) && 
            isCacheValid(parsedCache.expenses?.lastUpdated) && 
            isCacheValid(parsedCache.clients?.lastUpdated)) {
          globalDataCache.projects = parsedCache.projects || { data: [], lastUpdated: null };
          globalDataCache.expenses = parsedCache.expenses || { data: [], lastUpdated: null };
          globalDataCache.clients = parsedCache.clients || { data: [], lastUpdated: null };
          console.log('✅ Cache global restaurado exitosamente');
          
          // Disparar eventos para actualizar componentes con datos del cache
          debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, globalDataCache.projects.data);
          debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, globalDataCache.expenses.data);
          debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, globalDataCache.clients.data);
        } else {
          console.log('⚠️ Cache expirado, se cargará desde servidor');
        }
      }
    } catch (cacheError) {
      console.warn('⚠️ Error restaurando cache:', cacheError);
    }

    // Inicializar Firebase Manager si no está inicializado
    if (!firebaseManager.initialized) {
      const success = await firebaseManager.initialize();
      if (!success) {
        console.warn('⚠️ Firebase no se pudo inicializar, continuando en modo local');
        // Marcar los datos como cargados para evitar carga infinita
        connectionState.dataLoaded.projects = true;
        connectionState.dataLoaded.clients = true;
        connectionState.dataLoaded.expenses = true;
        triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
      }
    }

    // Solo crear datos de ejemplo si se fuerza explícitamente
    if (forceInitialization) {
      console.log('⚠️ Inicialización forzada - creando datos de ejemplo...');

      const SAMPLE_DATA = {
        projects: [
          {
            id: 'project-sample-1',
            name: 'Chatbot Demo',
            status: 'demo',
            monthlyPrice: '299',
            cutoffDate: '',
            description: 'Proyecto de demostración',
            startDate: '2025-01-15',
            clientName: 'Cliente Demo',
            trialDays: '7',
            installationCost: '',
            requiresBilling: false,
            rfc: '',
            businessName: '',
            createdAt: new Date('2025-01-15').toISOString(),
            updatedAt: new Date('2025-01-15').toISOString()
          }
        ],
        clients: [
          {
            id: 'client-sample-1',
            name: 'Cliente de Ejemplo',
            company: 'Empresa Demo',
            email: 'demo@ejemplo.com',
            phone: '+52 444 123 4567',
            industry: 'Tecnología',
            notes: 'Cliente de ejemplo para pruebas',
            status: 'active',
            createdAt: new Date('2025-01-15').toISOString(),
            updatedAt: new Date('2025-01-15').toISOString()
          }
        ],
        expenses: [
          {
            id: 'expense-sample-1',
            name: 'Gasto de Ejemplo',
            amount: '100',
            category: 'otros',
            date: '2025-01-15',
            isRecurring: false,
            vendor: 'Proveedor Demo',
            createdAt: new Date('2025-01-15').toISOString(),
            updatedAt: new Date('2025-01-15').toISOString()
          }
        ]
      };

      await dataManager.saveProjects(SAMPLE_DATA.projects);
      await dataManager.saveClients(SAMPLE_DATA.clients);
      await dataManager.saveExpenses(SAMPLE_DATA.expenses);

      console.log('✅ Datos de ejemplo creados');
    }

    console.log('✅ Sistema de datos inicializado correctamente');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    // En caso de error, marcar datos como cargados para evitar carga infinita
    connectionState.dataLoaded.projects = true;
    connectionState.dataLoaded.clients = true;
    connectionState.dataLoaded.expenses = true;
    triggerDataUpdate(DATA_EVENTS.FIREBASE_STATUS_CHANGED, connectionState);
  }
};

// Función para limpiar todos los datos
export const clearAllData = async () => {
  try {
    console.log('🧹 Limpiando todos los datos...');

    // Limpiar cache global
    globalDataCache.projects = { data: [], lastUpdated: null };
    globalDataCache.expenses = { data: [], lastUpdated: null };
    globalDataCache.clients = { data: [], lastUpdated: null };
    
    // Actualizar localStorage
    localStorage.removeItem('gestor_proyectos_cache');

    inMemoryStorage.clear();

    if (connectionState.firebaseInitialized && connectionState.userId) {
      dataManager.unsubscribeFromProjects();
      dataManager.unsubscribeFromClients();
      dataManager.unsubscribeFromExpenses();

      const [projects, clients, expenses] = await Promise.all([
        dataManager.loadProjects(),
        dataManager.loadClients(),
        dataManager.loadExpenses()
      ]);

      for (const project of projects) {
        await dataManager.deleteProject(project.id);
      }

      for (const client of clients) {
        await dataManager.deleteClient(client.id);
      }

      for (const expense of expenses) {
        await dataManager.deleteExpense(expense.id);
      }
    }

    debouncedTriggerDataUpdate(DATA_EVENTS.PROJECTS_UPDATED, []);
    debouncedTriggerDataUpdate(DATA_EVENTS.CLIENTS_UPDATED, []);
    debouncedTriggerDataUpdate(DATA_EVENTS.EXPENSES_UPDATED, []);

    console.log('✅ Todos los datos han sido eliminados');
    return true;
  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
    return false;
  }
};

// Export notification service
export const notificationService = {
  initializeNotificationSystem,
  checkCutoffDatesAndNotify
};

// Export all by default for compatibility
export default {
  dataManager,
  firebaseManager,
  useDataSync,
  useConnectionState,
  DATA_EVENTS,
  initializeData,
  clearAllData,
  triggerDataUpdate,
  // Funciones de cache para uso externo si es necesario
  updateGlobalCache,
  getFromGlobalCache,
  isCacheValid,
  // Sistema de notificaciones
  notificationService: {
    initializeNotificationSystem,
    checkCutoffDatesAndNotify
  }
};