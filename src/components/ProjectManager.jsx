import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Calendar, DollarSign, Eye, Clock, CheckCircle, Edit, Trash2, AlertCircle, X, Wifi, WifiOff, Download, Upload, Settings, Save, FileText, Filter, SortAsc, SortDesc, FileSpreadsheet, BadgeCheck } from 'lucide-react';

// Importar funciones centralizadas del sistema dataSync
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Importar funciones centralizadas del sistema dataSync

import { 
  dataManager, 
  useDataSync, 
  useConnectionState,
  DATA_EVENTS, 
  initializeData
} from '../utils/dataSync';

function ProjectManager() {
  // State variables
  const [projects, setProjects] = useState([]);

  // Acción para marcar como pagado
  const handleMarkAsPaid = async (project) => {
    // Calcular la próxima fecha de corte
    const nextCutoff = dataManager.calculateNextCutoffDate(project.cutoffDate || project.startDate);
    // Limpiar factura si existe
    const updatedProject = {
      ...project,
      cutoffDate: nextCutoff,
      facturaGenerada: false,
      folioFactura: '',
      fechaFactura: ''
    };
    await dataManager.updateProject(updatedProject);
    setProjects((prev) => prev.map(p => p.id === project.id ? updatedProject : p));
    setAlertMessage('¡Pago registrado y fecha de corte actualizada!');
    setShowAlertModal(true);
  };
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    status: 'demo',
    monthlyPrice: '',
    cutoffDate: '',
    description: '',
    startDate: '',
    clientName: '',
    trialDays: '7',
    installationCost: '',
    hasInstallationCost: false,
    installationDate: '', // Nueva fecha específica para la instalación
    requiresBilling: false,
    rfc: '',
    businessName: '',
    customCutoffDate: false // Nuevo campo para controlar si se usa fecha personalizada
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);
  const [firebaseConfigData, setFirebaseConfigData] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    customAppId: ''
  });

  // Estados para filtrado y ordenamiento
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    cutoffDaysFilter: 'all'
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Usar hook de estado de conexión centralizado
  const connectionState = useConnectionState();

  const statusOptions = [
    { value: 'demo', label: 'Demo', color: 'bg-gray-700 text-gray-200' },
    { value: 'semana_gratis', label: 'Semana Gratis', color: 'bg-blue-600 text-blue-100' },
    { value: 'establecido', label: 'Establecido', color: 'bg-green-600 text-green-100' },
    { value: 'pausado', label: 'Pausado', color: 'bg-yellow-600 text-yellow-100' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-600 text-red-100' }
  ];

  // Inicializar datos al montar el componente
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        await initializeData();
        const loadedProjects = await dataManager.loadProjects(); // Esperar la Promise
        setProjects(loadedProjects || []); // Asegurar que sea array
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setProjects([]); // Fallback a array vacío
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Escuchar cambios en los proyectos desde el sistema centralizado
  useDataSync(DATA_EVENTS.PROJECTS_UPDATED, (updatedProjects) => {
    if (updatedProjects) {
      setProjects(updatedProjects);
      // Verificar fechas de corte cuando se actualizan los proyectos
  // notificationService.checkCutoffDatesAndNotify(updatedProjects); // Eliminado
    }
  });

  // Hook para escuchar cambios en el estado de conexión Firebase
  useDataSync(DATA_EVENTS.FIREBASE_STATUS_CHANGED, (newConnectionState) => {
    console.log('Estado de conexión actualizado:', newConnectionState);
  });

  // Inicializar sistema de notificaciones
  useEffect(() => {
    let cleanupNotifications = null;
    
    if (projects.length > 0) {
      // Inicializar el sistema de notificaciones cuando hay proyectos
  // cleanupNotifications = notificationService.initializeNotificationSystem(projects); // Eliminado
    }
    
    return () => {
      // Limpiar el sistema de notificaciones al desmontar
      if (cleanupNotifications) {
        cleanupNotifications();
      }
    };
  }, [projects.length > 0]); // Solo ejecutar cuando cambie si hay proyectos o no

  // Función para calcular fecha automática cuando cambia la fecha de inicio
  useEffect(() => {
    if (formData.status === 'establecido' && formData.startDate && !formData.customCutoffDate) {
      const autoCalculatedDate = dataManager.calculateNextCutoffDate(formData.startDate);
      setFormData(prev => ({ ...prev, cutoffDate: autoCalculatedDate }));
    }
  }, [formData.startDate, formData.status, formData.customCutoffDate]);

  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const showCustomConfirm = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showCustomAlert("El nombre del proyecto es obligatorio.");
      return;
    }

    // Validar campos de facturación si es requerida
    if (formData.requiresBilling) {
      if (!formData.rfc.trim()) {
        showCustomAlert("El RFC es obligatorio cuando se requiere facturación.");
        return;
      }
      if (!formData.businessName.trim()) {
        showCustomAlert("La razón social es obligatoria cuando se requiere facturación.");
        return;
      }
    }

    // Validar fecha de instalación si se requiere instalación
    if (formData.hasInstallationCost) {
      if (!formData.installationDate.trim()) {
        showCustomAlert("La fecha de instalación es obligatoria cuando se incluye costo de instalación.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const dataToSave = { ...formData };

      // Asegurar que los campos de factura se guarden correctamente
      if (dataToSave.requiresBilling) {
        dataToSave.facturaGenerada = !!formData.facturaGenerada;
        dataToSave.folioFactura = formData.facturaGenerada ? (formData.folioFactura || '') : '';
        dataToSave.fechaFactura = formData.facturaGenerada ? (formData.fechaFactura || '') : '';
      } else {
        dataToSave.facturaGenerada = false;
        dataToSave.folioFactura = '';
        dataToSave.fechaFactura = '';
      }

      if (!dataToSave.hasInstallationCost) {
        dataToSave.installationCost = '';
        dataToSave.installationDate = '';
      }
      delete dataToSave.hasInstallationCost;
      delete dataToSave.customCutoffDate; // No guardar este campo de control

      if (dataToSave.status === 'demo') {
        dataToSave.trialDays = '';
      }

      // Limpiar campos de facturación si no se requiere
      if (!dataToSave.requiresBilling) {
        dataToSave.rfc = '';
        dataToSave.businessName = '';
      }

      // Calculate cutoff date for established projects
      if (dataToSave.status === 'establecido' && dataToSave.startDate) {
        if (!editingProject || !editingProject.cutoffDate || !formData.customCutoffDate) {
          // Solo calcular si es nuevo proyecto, no tiene fecha de corte, o no se está usando fecha personalizada
          if (!formData.customCutoffDate) {
            dataToSave.cutoffDate = dataManager.calculateNextCutoffDate(dataToSave.startDate);
          }
          // Si customCutoffDate es true, mantener la fecha que ya está en formData.cutoffDate
        } else {
          // Mantener la fecha de corte existente si se está editando y no se cambió a personalizada
          if (!formData.customCutoffDate) {
            dataToSave.cutoffDate = editingProject.cutoffDate;
          }
        }
      } else {
        dataToSave.cutoffDate = '';
      }

      // Clean up null/undefined values
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === null || dataToSave[key] === undefined) {
          dataToSave[key] = '';
        }
      });

      // ✅ NUEVA FUNCIONALIDAD: Crear cliente automáticamente si se proporciona nombre
      let clientCreationPromise = null;
      if (dataToSave.clientName && dataToSave.clientName.trim()) {
        clientCreationPromise = (async () => {
          try {
            console.log('🏢 Verificando si el cliente existe:', dataToSave.clientName);
            
            // ✅ OPTIMIZACIÓN: Usar función específica para verificar existencia sin cargar todos los datos
            const clientExists = await dataManager.clientExists(dataToSave.clientName);

            if (!clientExists) {
              console.log('➕ Creando nuevo cliente automáticamente:', dataToSave.clientName);
              
              // Crear objeto cliente con datos del proyecto
              const newClientData = {
                name: dataToSave.clientName.trim(),
                email: '', // Se puede completar después manualmente
                phone: '',
                company: dataToSave.businessName || dataToSave.clientName.trim(),
                rfc: dataToSave.rfc || '',
                address: '',
                notes: `Cliente creado automáticamente desde el proyecto: ${dataToSave.name}`,
                createdFrom: 'project', // Indicador de que fue creado desde un proyecto
                projectName: dataToSave.name,
                createdAt: new Date().toISOString()
              };

              const clientResult = await dataManager.createClient(newClientData);
              if (clientResult.success) {
                console.log('✅ Cliente creado automáticamente:', dataToSave.clientName);
                return { success: true, clientName: dataToSave.clientName };
              } else {
                console.warn('⚠️ No se pudo crear el cliente automáticamente:', clientResult.error);
                return { success: false, error: clientResult.error };
              }
            } else {
              console.log('ℹ️ El cliente ya existe, no se crea duplicado:', dataToSave.clientName);
              return { success: true, existed: true };
            }
          } catch (error) {
            console.warn('⚠️ Error al crear cliente automáticamente:', error);
            return { success: false, error: error.message };
          }
        })();
      }

      let result;
      if (editingProject) {
        // ✅ FUNCIONALIDAD EXTENDIDA: También crear cliente al actualizar proyecto si cambió el nombre
        if (dataToSave.clientName && dataToSave.clientName.trim() && 
            dataToSave.clientName.trim() !== editingProject.clientName?.trim()) {
          // Crear cliente de forma asíncrona sin bloquear el guardado del proyecto
          dataManager.createClient({
            name: dataToSave.clientName.trim(),
            email: '',
            phone: '',
            company: dataToSave.businessName || dataToSave.clientName.trim(),
            rfc: dataToSave.rfc || '',
            address: '',
            notes: `Cliente creado automáticamente desde la edición del proyecto: ${dataToSave.name}`,
            createdFrom: 'project_edit',
            projectName: dataToSave.name,
            createdAt: new Date().toISOString()
          }).then(clientResult => {
            if (clientResult.success) {
              console.log('✅ Cliente creado desde edición:', dataToSave.clientName);
              setTimeout(() => {
                showCustomAlert(`Nuevo cliente "${dataToSave.clientName}" agregado automáticamente a la base de datos.`);
              }, 1000);
            }
          }).catch(error => {
            console.warn('⚠️ Error al crear cliente desde edición:', error);
          });
        }

        // Actualizar proyecto usando dataManager centralizado
        result = await dataManager.updateProject(editingProject.id, dataToSave);
        if (result.success) {
          showCustomAlert("Proyecto actualizado exitosamente.");
        } else {
          throw new Error(result.error);
        }
      } else {
        // Crear proyecto usando dataManager centralizado
        result = await dataManager.createProject(dataToSave);
        if (result.success) {
          showCustomAlert("Proyecto creado exitosamente.");
          
          // Crear cliente de forma asíncrona DESPUÉS de crear el proyecto exitosamente
          if (clientCreationPromise) {
            clientCreationPromise.then(clientResult => {
              if (clientResult.success && !clientResult.existed) {
                setTimeout(() => {
                  showCustomAlert(`Cliente "${clientResult.clientName || dataToSave.clientName}" creado automáticamente en la base de datos de clientes.`);
                }, 1500);
              }
            }).catch(error => {
              console.warn('⚠️ Error en creación de cliente asíncrona:', error);
            });
          }
        } else {
          throw new Error(result.error);
        }
      }

      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      let errorMessage = "Error al guardar el proyecto: " + error.message;

      if (error.code === 'permission-denied') {
        errorMessage = "Sin permisos para escribir. Verifica las reglas de Firestore.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Base de datos no disponible. Verifica tu conexión.";
      }

      showCustomAlert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name || '',
      status: project.status || 'demo',
      monthlyPrice: project.monthlyPrice || '',
      cutoffDate: project.cutoffDate || '',
      description: project.description || '',
      startDate: project.startDate || '',
      clientName: project.clientName || '',
      trialDays: project.trialDays || '7',
      installationCost: project.installationCost || '',
      hasInstallationCost: typeof project.installationCost !== 'undefined' && project.installationCost !== '' && parseFloat(project.installationCost) > 0,
      installationDate: project.installationDate || '',
      requiresBilling: project.requiresBilling || false,
      rfc: project.rfc || '',
      businessName: project.businessName || '',
      customCutoffDate: false,
      // Factura
      facturaGenerada: !!project.facturaGenerada,
      folioFactura: project.folioFactura || '',
      fechaFactura: project.fechaFactura || ''
    });
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    showCustomConfirm('¿Estás seguro de que quieres eliminar este proyecto?', async () => {
      setIsLoading(true);
      try {
        const result = await dataManager.deleteProject(id);
        if (result.success) {
          showCustomAlert("Proyecto eliminado exitosamente.");
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        showCustomAlert("Error al eliminar: " + error.message);
      } finally {
        setIsLoading(false);
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '', status: 'demo', monthlyPrice: '', cutoffDate: '',
      description: '', startDate: '', clientName: '',
      trialDays: '7',
      installationCost: '', hasInstallationCost: false,
      installationDate: '', // Nueva fecha específica para la instalación
      requiresBilling: false, rfc: '', businessName: '',
      customCutoffDate: false
    });
    setShowForm(false);
    setEditingProject(null);
  };

  // Función para probar notificaciones WhatsApp
  const testWhatsAppNotification = async () => {
    try {
      // Importar dinámicamente el módulo de notificaciones
      setAlertMessage('Funcionalidad de notificación eliminada.');
      setShowAlertModal(true);
    } catch (error) {
      console.error('Error testing notification:', error);
      setAlertMessage('❌ Error al probar notificación: ' + error.message);
      setShowAlertModal(true);
    }
  };

  // Export data to JSON file
  const exportData = () => {
    try {
      const dataToExport = {
        projects: projects,
        clients: dataManager.loadClients(),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `chatbot-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      showCustomAlert('Datos exportados exitosamente.');
    } catch (error) {
      console.error('Error exporting data:', error);
      showCustomAlert('Error al exportar datos: ' + error.message);
    }
  };

  // Import data from JSON file using centralized dataManager
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        if (importedData.projects && Array.isArray(importedData.projects)) {
          // Validate and clean imported data
          const validProjects = importedData.projects.filter(project => project.name && typeof project.name === 'string'
          );

          if (validProjects.length > 0) {
            // Usar dataManager centralizado para importar
            const success = await dataManager.saveProjects(validProjects);

            if (success) {
              // También importar clientes si existen
              if (importedData.clients && Array.isArray(importedData.clients)) {
                const validClients = importedData.clients.filter(client => client.name && typeof client.name === 'string'
                );
                if (validClients.length > 0) {
                  dataManager.saveClients(validClients);
                }
              }

              showCustomAlert(`${validProjects.length} proyectos importados exitosamente.`);
            } else {
              showCustomAlert('Error al importar proyectos.');
            }
          } else {
            showCustomAlert('No se encontraron proyectos válidos en el archivo.');
          }
        } else {
          showCustomAlert('Formato de archivo inválido. Asegúrate de que sea un archivo de exportación válido.');
        }
      } catch (error) {
        console.error('Error importing data:', error);
        showCustomAlert('Error al importar datos: ' + error.message);
      }
    };

    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  // Save Firebase configuration
  const saveFirebaseConfig = () => {
    try {
      localStorage.setItem('firebase-config', JSON.stringify(firebaseConfigData));
      setShowFirebaseConfig(false);
      showCustomAlert('Configuración de Firebase guardada. Recarga la página para aplicar los cambios.');
    } catch (error) {
      showCustomAlert('Error al guardar configuración: ' + error.message);
    }
  };

  // Load saved Firebase config
  useEffect(() => {
    const savedConfig = localStorage.getItem('firebase-config');
    if (savedConfig) {
      try {
        setFirebaseConfigData(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading Firebase config:', error);
      }
    }
  }, []);

  const getStatusInfo = (status) => statusOptions.find(s => s.value === status) || statusOptions[0];

  // ✅ FUNCIÓN CORREGIDA - Calcular días correctamente SIN problemas de zona horaria
  const getDaysDifference = (futureDate) => {
    if (!futureDate) return null;
    
    try {
      // Crear fecha actual sin tiempo (solo fecha) en zona horaria local
      const today = new Date();
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Parsear la fecha objetivo (formato YYYY-MM-DD) sin problemas de zona horaria
      const [year, month, day] = futureDate.split('-').map(num => parseInt(num, 10));
      const targetDate = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
      
      // Calcular diferencia en milisegundos y convertir a días
      const diffInMs = targetDate.getTime() - todayOnly.getTime();
      const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
      
      return diffInDays;
    } catch (error) {
      console.error('Error calculating date difference:', error);
      return null;
    }
  };

  const getTrialEndDate = (project) => {
    if (!project.startDate || project.status !== 'semana_gratis') return null;

    // Crear fecha de inicio sin problemas de zona horaria
    const [year, month, day] = project.startDate.split('-').map(num => parseInt(num, 10));
    const start = new Date(year, month - 1, day);
    
    const days = parseInt(project.trialDays || 7);
    const end = new Date(start);
    end.setDate(start.getDate() + days);
    return end;
  };

  const getDaysUntilTrialEnd = (project) => {
    const end = getTrialEndDate(project);
    if (!end) return null;
    return getDaysDifference(end.toISOString().split('T')[0]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'demo': return <Eye className="w-4 h-4" />;
      case 'semana_gratis': return <Clock className="w-4 h-4" />;
      case 'establecido': return <CheckCircle className="w-4 h-4" />;
      case 'pausado': return <AlertCircle className="w-4 h-4" />;
      case 'cancelado': return <Trash2 className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const getConnectionStatusIcon = () => {
    if (!connectionState) return <Clock className="w-4 h-4 text-blue-400" />;

    switch (connectionState.authStatus) {
      case 'authenticated': return <Wifi className="w-4 h-4 text-green-400" />;
      case 'offline_mode': return <WifiOff className="w-4 h-4 text-yellow-400" />;
      case 'error': return <WifiOff className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  const getConnectionStatusText = () => {
    if (!connectionState) return 'Inicializando sistema...';

    switch (connectionState.authStatus) {
      case 'authenticated': return 'Conectado a Firebase';
      case 'offline_mode': return 'Modo Offline (Datos Locales)';
      case 'error': return 'Error de Conexión';
      case 'checking': return 'Verificando conexión...';
      case 'initializing': return 'Inicializando...';
      default: return 'Estado desconocido';
    }
  };

  // Función para exportar a Excel
  const exportToExcel = () => {
    try {
      // Preparar datos para Excel
      const excelData = projects.map(project => {
        const statusInfo = getStatusInfo(project.status);
        const daysUntilCutoff = getDaysDifference(project.cutoffDate);
        const daysUntilTrialEnd = getDaysUntilTrialEnd(project);
        
        return {
          'Nombre del Proyecto': project.name || '',
          'Cliente': project.clientName || '',
          'Estado': statusInfo.label,
          'Precio Mensual': project.monthlyPrice ? `$${project.monthlyPrice}` : '',
          'Fecha de Inicio': project.startDate ? (() => {
            const [year, month, day] = project.startDate.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('es-MX');
          })() : '',
          'Fecha de Corte': project.cutoffDate ? (() => {
            const [year, month, day] = project.cutoffDate.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('es-MX');
          })() : '',
          'Días para Corte': project.status === 'establecido' && daysUntilCutoff !== null ? 
            (daysUntilCutoff > 0 ? `${daysUntilCutoff} días` : 
             daysUntilCutoff === 0 ? 'Hoy' : 
             `${Math.abs(daysUntilCutoff)} días vencido`) : '',
          'Días de Prueba Restantes': project.status === 'semana_gratis' && daysUntilTrialEnd !== null ?
            (daysUntilTrialEnd > 0 ? `${daysUntilTrialEnd} días` :
             daysUntilTrialEnd === 0 ? 'Hoy' : 'Expirado') : '',
          'Costo de Instalación': project.installationCost && parseFloat(project.installationCost) > 0 ? 
            `$${project.installationCost}` : '',
          'Fecha de Instalación': project.installationDate ? (() => {
            const [year, month, day] = project.installationDate.split('-').map(num => parseInt(num, 10));
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('es-MX');
          })() : '',
          'Requiere Facturación': project.requiresBilling ? 'Sí' : 'No',
          'RFC': project.rfc || '',
          'Razón Social': project.businessName || '',
          'Descripción': project.description || ''
        };
      });

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 25 }, // Nombre del Proyecto
        { wch: 20 }, // Cliente
        { wch: 15 }, // Estado
        { wch: 15 }, // Precio Mensual
        { wch: 15 }, // Fecha de Inicio
        { wch: 15 }, // Fecha de Corte
        { wch: 15 }, // Días para Corte
        { wch: 20 }, // Días de Prueba Restantes
        { wch: 18 }, // Costo de Instalación
        { wch: 18 }, // Fecha de Instalación
        { wch: 18 }, // Requiere Facturación
        { wch: 15 }, // RFC
        { wch: 25 }, // Razón Social
        { wch: 30 }  // Descripción
      ];
      ws['!cols'] = colWidths;

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');

      // Generar archivo y descargar
      const fileName = `proyectos-chatbot-${new Date().toISOString().split('T')[0]}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, fileName);

      showCustomAlert(`Reporte Excel exportado exitosamente: ${fileName}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showCustomAlert('Error al exportar a Excel: ' + error.message);
    }
  };

  // Función para filtrar y ordenar proyectos
  const getFilteredAndSortedProjects = () => {
    let filteredProjects = [...projects];

    // Filtrar por estado
    if (filters.status !== 'all') {
      filteredProjects = filteredProjects.filter(project => project.status === filters.status);
    }

    // Filtrar por días hasta corte
    if (filters.cutoffDaysFilter !== 'all') {
      filteredProjects = filteredProjects.filter(project => {
        const daysUntilCutoff = getDaysDifference(project.cutoffDate);
        const daysUntilTrialEnd = getDaysUntilTrialEnd(project);
        
        switch (filters.cutoffDaysFilter) {
          case 'urgent': // 0-3 días
            return (project.status === 'establecido' && daysUntilCutoff !== null && daysUntilCutoff >= 0 && daysUntilCutoff <= 3) ||
                   (project.status === 'semana_gratis' && daysUntilTrialEnd !== null && daysUntilTrialEnd >= 0 && daysUntilTrialEnd <= 3);
          case 'soon': // 4-7 días
            return (project.status === 'establecido' && daysUntilCutoff !== null && daysUntilCutoff >= 4 && daysUntilCutoff <= 7) ||
                   (project.status === 'semana_gratis' && daysUntilTrialEnd !== null && daysUntilTrialEnd >= 4 && daysUntilTrialEnd <= 7);
          case 'later': // 8+ días
            return (project.status === 'establecido' && daysUntilCutoff !== null && daysUntilCutoff > 7) ||
                   (project.status === 'semana_gratis' && daysUntilTrialEnd !== null && daysUntilTrialEnd > 7);
          case 'overdue': // Vencidos
            return (project.status === 'establecido' && daysUntilCutoff !== null && daysUntilCutoff < 0) ||
                   (project.status === 'semana_gratis' && daysUntilTrialEnd !== null && daysUntilTrialEnd < 0);
          default:
            return true;
        }
      });
    }

    // Ordenar proyectos
    filteredProjects.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'client':
          comparison = (a.clientName || '').localeCompare(b.clientName || '');
          break;
        case 'status':
          const statusOrder = { demo: 0, semana_gratis: 1, establecido: 2, pausado: 3, cancelado: 4 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'startDate':
          const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
          const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
          comparison = dateA - dateB;
          break;
        case 'cutoffDays':
          const daysA = a.status === 'establecido' ? getDaysDifference(a.cutoffDate) : 
                       a.status === 'semana_gratis' ? getDaysUntilTrialEnd(a) : 999;
          const daysB = b.status === 'establecido' ? getDaysDifference(b.cutoffDate) : 
                       b.status === 'semana_gratis' ? getDaysUntilTrialEnd(b) : 999;
          comparison = (daysA !== null ? daysA : 999) - (daysB !== null ? daysB : 999);
          break;
        case 'monthlyPrice':
          const priceA = parseFloat(a.monthlyPrice) || 0;
          const priceB = parseFloat(b.monthlyPrice) || 0;
          comparison = priceA - priceB;
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filteredProjects;
  };

  // Obtener estadísticas de filtrado
  const getFilterStats = () => {
    const filtered = getFilteredAndSortedProjects();
    return {
      total: projects.length,
      filtered: filtered.length,
      demo: filtered.filter(p => p.status === 'demo').length,
      semana_gratis: filtered.filter(p => p.status === 'semana_gratis').length,
      establecido: filtered.filter(p => p.status === 'establecido').length,
      pausado: filtered.filter(p => p.status === 'pausado').length,
      cancelado: filtered.filter(p => p.status === 'cancelado').length
    };
  };

  const filteredProjects = getFilteredAndSortedProjects();

  return (
    <div className="section-shell fade-in">
      {/* Project Form Modal usando React Portal */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl shadow-2xl border border-gray-700" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-2xl font-bold text-gray-100">
                {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-200 p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Chatbot de Ventas" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cliente
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del cliente" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio Mensual ($)
                </label>
                <input
                  type="number"
                  value={formData.monthlyPrice}
                  onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="299" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              {formData.status === 'semana_gratis' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Días de Prueba
                  </label>
                  <input
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="7" />
                </div>
              )}
              {/* Sección de Fecha de Corte */}
              {formData.status === 'establecido' && (
                <div className="md:col-span-2 bg-orange-900/30 border border-orange-600 rounded-lg p-4">
                  <div className="flex items-center mb-4">
                    <Calendar className="w-5 h-5 text-orange-400 mr-2" />
                    <label className="text-sm font-medium text-orange-300">
                      Configuración de Fecha de Corte
                    </label>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="cutoffDateType"
                          checked={!formData.customCutoffDate}
                          onChange={() => {
                            setFormData(prev => ({ 
                              ...prev, 
                              customCutoffDate: false,
                              cutoffDate: prev.startDate ? dataManager.calculateNextCutoffDate(prev.startDate) : ''
                            }));
                          }}
                          className="mr-2"
                        />
                        <span className="text-orange-200">Fecha automática</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="cutoffDateType"
                          checked={formData.customCutoffDate}
                          onChange={() => setFormData(prev => ({ ...prev, customCutoffDate: true }))}
                          className="mr-2"
                        />
                        <span className="text-orange-200">Fecha personalizada</span>
                      </label>
                    </div>
                    {formData.startDate && !formData.customCutoffDate && (
                      <div className="bg-gray-800 p-3 rounded-lg border border-gray-600">
                        <div className="text-sm text-gray-300">
                          <span className="font-medium">Fecha calculada automáticamente:</span>
                          <span className="ml-2 text-green-400 font-mono">
                            {formData.cutoffDate ? new Date(formData.cutoffDate + 'T00:00:00').toLocaleDateString('es-MX') : 'Selecciona fecha de inicio'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Se calculará automáticamente según la fecha de inicio
                        </div>
                      </div>
                    )}
                    {formData.customCutoffDate && (
                      <div>
                        <label className="block text-sm font-medium text-orange-300 mb-2">
                          Fecha de Corte Personalizada
                        </label>
                        <input
                          type="date"
                          value={formData.cutoffDate}
                          onChange={(e) => setFormData({ ...formData, cutoffDate: e.target.value })}
                          className="w-full px-4 py-2 border border-orange-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <div className="text-xs text-orange-200 mt-1">
                          Puedes establecer una fecha de corte específica diferente al cálculo automático
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Sección de Costo de Instalación */}
              <div className="md:col-span-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={formData.hasInstallationCost}
                    onChange={(e) => setFormData({
                      ...formData,
                      hasInstallationCost: e.target.checked,
                      installationCost: e.target.checked ? formData.installationCost : '',
                      installationDate: e.target.checked ? formData.installationDate : ''
                    })}
                    className="mr-2" />
                  <label className="text-sm font-medium text-gray-300">
                    ¿Incluye costo de instalación?
                  </label>
                </div>
                {formData.hasInstallationCost && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-yellow-900/30 p-4 rounded-lg border border-yellow-600">
                    <div>
                      <label className="block text-sm font-medium text-yellow-300 mb-2">
                        Costo de Instalación ($)
                      </label>
                      <input
                        type="number"
                        value={formData.installationCost}
                        onChange={(e) => setFormData({ ...formData, installationCost: e.target.value })}
                        className="w-full px-4 py-2 border border-yellow-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        placeholder="1000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-300 mb-2">
                        Fecha de Instalación
                      </label>
                      <input
                        type="date"
                        value={formData.installationDate}
                        onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                        className="w-full px-4 py-2 border border-yellow-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent" />
                    </div>
                  </div>
                )}
              </div>
              {/* Sección de Facturación */}
              <div className="md:col-span-2 border-t border-gray-600 pt-6">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="requiresBilling"
                    checked={formData.requiresBilling}
                    onChange={(e) => setFormData({
                      ...formData,
                      requiresBilling: e.target.checked,
                      rfc: e.target.checked ? formData.rfc : '',
                      businessName: e.target.checked ? formData.businessName : ''
                    })}
                    className="mr-2" />
                  <label htmlFor="requiresBilling" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Requiere facturación
                  </label>
                </div>
                {formData.requiresBilling && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900 p-4 rounded-lg border border-purple-600">
                    <div>
                      <label className="block text-sm font-medium text-purple-300 mb-2">
                        RFC *
                      </label>
                      <input
                        type="text"
                        value={formData.rfc}
                        onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                        className="w-full px-4 py-2 border border-purple-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="ABC123456789"
                        maxLength="13" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-300 mb-2">
                        Razón Social *
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="w-full px-4 py-2 border border-purple-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Empresa S.A. de C.V." />
                    </div>
                  </div>
                )}
                {/* Flujo de factura generada */}
                {formData.requiresBilling && (
                  <div className="mt-4 bg-gray-900 p-4 rounded-lg border border-purple-700">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="facturaGenerada"
                        checked={formData.facturaGenerada}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(f => ({
                            ...f,
                            facturaGenerada: checked,
                            fechaFactura: checked ? (f.fechaFactura || new Date().toISOString().slice(0, 10)) : '',
                            folioFactura: checked ? f.folioFactura : ''
                          }));
                        }}
                        className="mr-2" />
                      <label htmlFor="facturaGenerada" className="text-sm text-purple-200">¿Hay factura generada este mes?</label>
                    </div>
                    {formData.facturaGenerada && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-purple-300 mb-1">Folio de factura *</label>
                          <input
                            type="text"
                            value={formData.folioFactura}
                            onChange={e => setFormData(f => ({ ...f, folioFactura: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-purple-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Folio de la factura" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-purple-300 mb-1">Fecha de factura</label>
                          <input
                            type="date"
                            value={formData.fechaFactura}
                            onChange={e => setFormData(f => ({ ...f, fechaFactura: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-purple-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                        </div>
                        <div className="col-span-2 flex justify-end mt-2">
                          <button
                            type="button"
                            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 text-xs"
                            onClick={() => setFormData(f => ({ ...f, facturaGenerada: false, folioFactura: '', fechaFactura: '' }))
                            }
                          >
                            Cancelar factura
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Descripción del proyecto..." />
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingProject ? 'Actualizar' : 'Crear'} Proyecto
              </button>
              <button
                onClick={resetForm}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <div className="max-w-6xl mx-auto bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-gray-700">
                {/* Action Buttons */}
        <div className="pm-toolbar">
          <button
            onClick={() => setShowForm(true)}
            disabled={isLoading}
            className="pill-button pill-button--primary"
          >
            <Plus className="w-5 h-5" />
            Nuevo proyecto
          </button>
          <button
            onClick={() => setShowFilterModal(true)}
            className="pill-button pill-button--surface"
          >
            <Filter className="w-5 h-5" />
            Filtros y orden
          </button>
          <button
            onClick={exportToExcel}
            className="pill-button pill-button--accent-secondary"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Exportar Excel
          </button>
          <button
            onClick={exportData}
            className="pill-button pill-button--surface"
          >
            <Download className="w-5 h-5" />
            Exportar JSON
          </button>
                                      </div>

        {/* Filter Statistics */}
        {(filters.status !== 'all' || filters.cutoffDaysFilter !== 'all') && (
          <div className="mb-4 p-4 bg-indigo-900/30 border border-indigo-600 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-indigo-400" />
                <span className="text-indigo-300 font-medium">Filtros activos:</span>
              </div>
              <button
                onClick={() => setFilters({ status: 'all', sortBy: 'name', sortOrder: 'asc', cutoffDaysFilter: 'all' })}
                className="text-indigo-300 hover:text-indigo-200 text-sm"
              >
                Limpiar filtros
              </button>
            </div>
            <div className="mt-2 text-sm text-indigo-200">
              {(() => {
                const stats = getFilterStats();
                return `Mostrando ${stats.filtered} de ${stats.total} proyectos`;
              })()}
              {filters.status !== 'all' && <span className="ml-2">• Estado: {statusOptions.find(s => s.value === filters.status)?.label}</span>}
              {filters.cutoffDaysFilter !== 'all' && <span className="ml-2">• Fecha de corte: {
                filters.cutoffDaysFilter === 'urgent' ? 'Urgente (0-3 días)' :
                filters.cutoffDaysFilter === 'soon' ? 'Próximo (4-7 días)' :
                filters.cutoffDaysFilter === 'later' ? 'Futuro (8+ días)' :
                filters.cutoffDaysFilter === 'overdue' ? 'Vencido' : ''
              }</span>}
            </div>
          </div>
        )}

        {/* Firebase Configuration Modal */}
        {showFirebaseConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-100">Configuración de Firebase</h2>
                <button onClick={() => setShowFirebaseConfig(false)} className="text-gray-400 hover:text-gray-200 p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                  <input
                    type="text"
                    value={firebaseConfigData.apiKey}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, apiKey: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="AIza..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Auth Domain</label>
                  <input
                    type="text"
                    value={firebaseConfigData.authDomain}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, authDomain: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="proyecto.firebaseapp.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Project ID</label>
                  <input
                    type="text"
                    value={firebaseConfigData.projectId}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, projectId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="proyecto-id" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Storage Bucket</label>
                  <input
                    type="text"
                    value={firebaseConfigData.storageBucket}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, storageBucket: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="proyecto.appspot.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Messaging Sender ID</label>
                  <input
                    type="text"
                    value={firebaseConfigData.messagingSenderId}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, messagingSenderId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="123456789" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">App ID</label>
                  <input
                    type="text"
                    value={firebaseConfigData.appId}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, appId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="1:123:web:abc123" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Custom App ID (para la colección)</label>
                  <input
                    type="text"
                    value={firebaseConfigData.customAppId}
                    onChange={(e) => setFirebaseConfigData({ ...firebaseConfigData, customAppId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100"
                    placeholder="mi-app-chatbot" />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={saveFirebaseConfig}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </button>
                <button
                  onClick={() => setShowFirebaseConfig(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                  <Filter className="w-6 h-6" />
                  Filtros y Ordenamiento
                </h2>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-200 p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Filtro por Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Filtrar por Estado
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.status === 'all' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Todos los Estados
                    </button>
                    {statusOptions.map(status => (
                      <button
                        key={status.value}
                        onClick={() => setFilters(prev => ({ ...prev, status: status.value }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          filters.status === status.value 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {getStatusIcon(status.value)}
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtro por Días hasta Corte */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Filtrar por Días hasta Fecha de Corte
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, cutoffDaysFilter: 'all' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.cutoffDaysFilter === 'all' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Todos los Plazos
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, cutoffDaysFilter: 'overdue' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.cutoffDaysFilter === 'overdue' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🔴 Vencidos
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, cutoffDaysFilter: 'urgent' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.cutoffDaysFilter === 'urgent' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🟠 Urgente (0-3 días)
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, cutoffDaysFilter: 'soon' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.cutoffDaysFilter === 'soon' 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🟡 Próximo (4-7 días)
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, cutoffDaysFilter: 'later' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filters.cutoffDaysFilter === 'later' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      🟢 Futuro (8+ días)
                    </button>
                  </div>
                </div>

                {/* Ordenamiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Ordenar por
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-4">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                        className="flex-1 px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="name">Nombre del Proyecto</option>
                        <option value="client">Cliente</option>
                        <option value="status">Estado</option>
                        <option value="startDate">Fecha de Inicio</option>
                        <option value="cutoffDays">Días para Fecha de Corte</option>
                        <option value="monthlyPrice">Precio Mensual</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'asc' }))}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            filters.sortOrder === 'asc' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <SortAsc className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, sortOrder: 'desc' }))}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            filters.sortOrder === 'desc' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          <SortDesc className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vista previa de estadísticas */}
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                  <h4 className="text-gray-300 font-medium mb-2">Vista Previa</h4>
                  <div className="text-sm text-gray-400">
                    {(() => {
                      const stats = getFilterStats();
                      return (
                        <div className="space-y-1">
                          <div>Se mostrarán <span className="text-indigo-400 font-medium">{stats.filtered}</span> de <span className="text-gray-300">{stats.total}</span> proyectos</div>
                          <div className="flex gap-4 mt-2">
                            <span>Demo: {stats.demo}</span>
                            <span>Prueba: {stats.semana_gratis}</span>
                            <span>Establecido: {stats.establecido}</span>
                            <span>Pausado: {stats.pausado}</span>
                            <span>Cancelado: {stats.cancelado}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setFilters({ status: 'all', sortBy: 'name', sortOrder: 'asc', cutoffDaysFilter: 'all' });
                    setShowFilterModal(false);
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Limpiar y Cerrar
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Aplicar Filtros
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-400">Cargando proyectos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const statusInfo = getStatusInfo(project.status);
              const daysUntilCutoff = getDaysDifference(project.cutoffDate);
              const daysUntilTrialEnd = getDaysUntilTrialEnd(project);

              return (
                <div key={project.id} className="bg-gray-700 rounded-xl p-6 shadow-lg border border-gray-600 hover:shadow-xl transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-100 mb-1">{project.name}</h3>
                      {project.clientName && (
                        <p className="text-gray-400 text-sm">{project.clientName}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(project)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Editar proyecto"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMarkAsPaid(project)}
                        className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Marcar como pagado (actualiza fecha de corte)"
                      >
                        <BadgeCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Eliminar proyecto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${statusInfo.color}`}>
                        {getStatusIcon(project.status)}
                        {statusInfo.label}
                      </span>
                    </div>

                    {project.monthlyPrice && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span>${project.monthlyPrice}/mes</span>
                      </div>
                    )}

                    {project.installationCost && parseFloat(project.installationCost) > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <DollarSign className="w-4 h-4 text-yellow-400" />
                        <span>Instalación: ${project.installationCost}</span>
                      </div>
                    )}

                    {/* Información de Facturación */}
                    {project.requiresBilling && (
                      <div className="bg-purple-900/30 border border-purple-600 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-purple-300">
                          <FileText className="w-4 h-4" />
                          <span className="font-medium">Facturación Requerida</span>
                        </div>
                        {project.rfc && (
                          <div className="text-sm text-gray-300">
                            <span className="font-medium">RFC:</span> {project.rfc}
                          </div>
                        )}
                        {project.businessName && (
                          <div className="text-sm text-gray-300">
                            <span className="font-medium">Razón Social:</span> {project.businessName}
                          </div>
                        )}
                        {project.facturaGenerada && project.folioFactura && (
                          <div className="text-sm text-purple-200">
                            <span className="font-medium">Folio Factura:</span> {project.folioFactura}
                          </div>
                        )}
                        {project.facturaGenerada && project.fechaFactura && (
                          <div className="text-xs text-purple-300">
                            <span className="font-medium">Fecha Factura:</span> {project.fechaFactura}
                          </div>
                        )}
                      </div>
                    )}

                    {project.startDate && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>Inicio: {(() => {
                          const [year, month, day] = project.startDate.split('-').map(num => parseInt(num, 10));
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('es-MX');
                        })()}</span>
                      </div>
                    )}

                    {project.status === 'establecido' && project.cutoffDate && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span>
                          Corte: {(() => {
                            const [year, month, day] = project.cutoffDate.split('-').map(num => parseInt(num, 10));
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString('es-MX');
                          })()}
                          {daysUntilCutoff !== null && (
                            <span className={`ml-2 font-medium ${daysUntilCutoff <= 3 ? 'text-red-400' :
                                daysUntilCutoff <= 7 ? 'text-yellow-400' : 'text-green-400'}`}>
                              ({daysUntilCutoff > 0 ? `${daysUntilCutoff} días` :
                                daysUntilCutoff === 0 ? 'Hoy' : `${Math.abs(daysUntilCutoff)} días vencido`})
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {project.status === 'semana_gratis' && daysUntilTrialEnd !== null && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>
                          Prueba termina en:
                          <span className={`ml-2 font-medium ${daysUntilTrialEnd <= 1 ? 'text-red-400' :
                              daysUntilTrialEnd <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {daysUntilTrialEnd > 0 ? `${daysUntilTrialEnd} días` :
                              daysUntilTrialEnd === 0 ? 'Hoy' : 'Expirado'}
                          </span>
                        </span>
                      </div>
                    )}

                    {project.description && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-gray-400 text-sm">{project.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && projects.length > 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No hay proyectos que coincidan con los filtros</div>
                <button
                  onClick={() => setFilters({ status: 'all', sortBy: 'name', sortOrder: 'asc', cutoffDaysFilter: 'all' })}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Filter className="w-5 h-5" />
                  Limpiar filtros
                </button>
              </div>
            )}

            {projects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No hay proyectos registrados</div>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Crear primer proyecto
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom Alert Modal */}
        {showAlertModal && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-gray-100">Información</h3>
              </div>
              <p className="text-gray-300 mb-6">{alertMessage}</p>
              <button
                onClick={() => setShowAlertModal(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Custom Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-gray-100">Confirmación</h3>
              </div>
              <p className="text-gray-300 mb-6">{confirmMessage}</p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectManager;

