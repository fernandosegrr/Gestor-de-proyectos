import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Building,
  Phone,
  Mail,
  Calendar,
  Filter,
  Download,
  Eye,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';

// === IMPORTAR FUNCIONES UTILITARIAS ===
import { 
  CATEGORY_COLORS, 
  CHART_COLORS, 
  EXPENSE_CATEGORIES, 
  PROJECT_STATUS, 
  calculateExpenseStats, 
  calculateGeneralStats, 
  calculateMonthlyIncome, 
  formatCompactNumberMXN, 
  formatCurrencyMXN, 
  formatDate, 
  formatPercentage, 
  getAvailableYears, 
  groupExpensesByCategory, 
  groupExpensesByDate, 
  groupExpensesByType, 
  groupProjectsByStatus, 
  prepareStatusDistributionData 
} from '../utils/chartUtils';

// === IMPORTAR SISTEMA CENTRALIZADO DE DATOS ===
import { 
  dataManager,
  useDataSync,
  useConnectionState,
  DATA_EVENTS,
  initializeData
} from '../utils/dataSync';

// El resto del componente permanece igual...
const ClientDatabase = () => {
  // Estados principales - INICIALIZADOS COMO ARRAYS VACÍOS
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Estados de formulario
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    industry: '',
    notes: '',
    status: 'active'
  });

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');

  // Estados de modales
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  // Obtener estado de conexión del sistema centralizado
  const connectionState = useConnectionState();
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Opciones de industrias
  const industries = [
    'Tecnología',
    'Retail',
    'Restaurantes',
    'Servicios',
    'Salud',
    'Educación',
    'Inmobiliaria',
    'Automotriz',
    'Consultoría',
    'Otros'
  ];

  // === FUNCIÓN DE CARGA MEJORADA ===
  const loadData = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('loading');
      
      console.log('🔄 ClientDatabase: Iniciando carga de datos...');
      
      // Inicializar datos usando el sistema centralizado
      await initializeData();
      
      // Cargar datos con validación
      let clientsData = [];
      let projectsData = [];
      
      try {
        const loadedClients = await dataManager.loadClients();
        clientsData = Array.isArray(loadedClients) ? loadedClients : [];
        console.log('📊 ClientDatabase: Clientes cargados:', clientsData.length);
      } catch (error) {
        console.warn('⚠️ Error cargando clientes:', error);
        clientsData = [];
      }
      
      try {
        const loadedProjects = await dataManager.loadProjects();
        projectsData = Array.isArray(loadedProjects) ? loadedProjects : [];
        console.log('📊 ClientDatabase: Proyectos cargados:', projectsData.length);
      } catch (error) {
        console.warn('⚠️ Error cargando proyectos:', error);
        projectsData = [];
      }
      
      // Actualizar estados
      setClients(clientsData);
      setProjects(projectsData);
      setDataInitialized(true);
      setConnectionStatus('connected');
      
      console.log('✅ ClientDatabase: Datos cargados exitosamente');
      
    } catch (error) {
      console.error('❌ ClientDatabase: Error loading data:', error);
      setConnectionStatus('error');
      setClients([]);
      setProjects([]);
      showCustomAlert('Error al cargar los datos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, []);

  // === ESCUCHAR CAMBIOS DEL SISTEMA CENTRALIZADO ===
  // Escuchar actualizaciones de clientes
  useDataSync(DATA_EVENTS.CLIENTS_UPDATED, async (updatedClients) => {
    console.log('🔄 ClientDatabase: Clientes sincronizados desde sistema centralizado:', updatedClients?.length || 0);
    
    if (updatedClients && Array.isArray(updatedClients)) {
      setClients(updatedClients);
      setConnectionStatus('synced');
    } else {
      // Fallback: recargar desde el sistema centralizado
      try {
        const clientsData = await dataManager.loadClients();
        setClients(Array.isArray(clientsData) ? clientsData : []);
      } catch (error) {
        console.warn('⚠️ Error en fallback de clientes:', error);
        setClients([]);
      }
    }
  });

  // Escuchar actualizaciones de proyectos para relaciones
  useDataSync(DATA_EVENTS.PROJECTS_UPDATED, async (updatedProjects) => {
    console.log('🔄 ClientDatabase: Proyectos sincronizados desde sistema centralizado:', updatedProjects?.length || 0);
    
    if (updatedProjects && Array.isArray(updatedProjects)) {
      setProjects(updatedProjects);
    } else {
      // Fallback: recargar desde el sistema centralizado
      try {
        const projectsData = await dataManager.loadProjects()
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (error) {
        console.warn('⚠️ Error en fallback de proyectos:', error);
        setProjects([]);
      }
    }
  });

  // Escuchar cambios en el estado de Firebase
  useDataSync(DATA_EVENTS.FIREBASE_STATUS_CHANGED, (status) => {
    console.log('🔄 ClientDatabase: Estado de Firebase actualizado:', status);
    if (status?.authStatus) {
      setConnectionStatus(status.dbConnection ? 'connected' : 'offline_mode');
    }
  });

  // === FUNCIONES QUE USAN EL SISTEMA CENTRALIZADO ===
  const forceReload = async () => {
    setIsLoading(true);
    setConnectionStatus('refreshing');
    const clientsData = await dataManager.loadClients();
    const projectsData = await dataManager.loadProjects();
    try {
      // Usar el sistema centralizado para recargar
      
      
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setConnectionStatus('connected');
      
      console.log('🔄 ClientDatabase: Datos recargados desde sistema centralizado');
    } catch (error) {
      console.error('❌ Error al recargar datos:', error);
      setConnectionStatus('error');
      setClients([]);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Funciones de modal
  const showCustomAlert = (message) => {
    setAlertMessage(message);
    setShowAlert(true);
  };

  const showCustomConfirm = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirm(false);
    setConfirmAction(null);
  };

  // === OPERACIONES CRUD USANDO SISTEMA CENTRALIZADO ===
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showCustomAlert('El nombre del cliente es obligatorio.');
      return;
    }

    if (!formData.company.trim()) {
      showCustomAlert('El nombre de la empresa es obligatorio.');
      return;
    }

    try {
      setConnectionStatus('saving');
      
      if (editingClient) {
        // Actualizar usando el sistema centralizado
        const result = await dataManager.updateClient(editingClient.id, formData);
        
        if (result.success) {
          showCustomAlert('Cliente actualizado exitosamente.');
          setConnectionStatus('synced');
        } else {
          showCustomAlert('Error al actualizar el cliente: ' + result.error);
          setConnectionStatus('error');
        }
      } else {
        // Crear usando el sistema centralizado
        const result = await dataManager.createClient(formData);
        
        if (result.success) {
          showCustomAlert('Cliente creado exitosamente.');
          setConnectionStatus('synced');
        } else {
          showCustomAlert('Error al crear el cliente: ' + result.error);
          setConnectionStatus('error');
        }
      }

      resetForm();
    } catch (error) {
      console.error('❌ ClientDatabase: Error saving client:', error);
      setConnectionStatus('error');
      showCustomAlert('Error al guardar el cliente: ' + error.message);
    }
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      industry: client.industry || '',
      notes: client.notes || '',
      status: client.status || 'active'
    });
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    showCustomConfirm('¿Estás seguro de que quieres eliminar este cliente?', async () => {
      setConnectionStatus('deleting');
      
      try {
        // Usar el sistema centralizado para eliminar
        const result = await dataManager.deleteClient(id);
        
        if (result.success) {
          showCustomAlert('Cliente eliminado exitosamente.');
          setConnectionStatus('synced');
        } else {
          showCustomAlert('Error al eliminar el cliente: ' + result.error);
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('❌ Error al eliminar cliente:', error);
        setConnectionStatus('error');
        showCustomAlert('Error al eliminar el cliente: ' + error.message);
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      industry: '',
      notes: '',
      status: 'active'
    });
    setShowForm(false);
    setEditingClient(null);
  };

  const handleViewDetail = (client) => {
    setSelectedClient(client);
    setShowDetail(true);
  };

  // === FUNCIONES DE UTILIDAD CON VALIDACIÓN ===
  // Filtrar clientes - CON VALIDACIÓN DE ARRAYS
  const filteredClients = Array.isArray(clients) ? clients.filter(client => {
    if (!client) return false;
    
    const matchesSearch = 
      (client.name && client.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    const matchesIndustry = industryFilter === 'all' || client.industry === industryFilter;

    return matchesSearch && matchesStatus && matchesIndustry;
  }) : [];

  // Obtener proyectos de un cliente - CON VALIDACIÓN
  const getClientProjects = (clientCompany) => {
    if (!Array.isArray(projects) || !clientCompany) return [];
    
    return projects.filter(project => 
      project && project.clientName === clientCompany
    );
  };

  // Exportar clientes
  const exportClients = () => {
    try {
      const dataToExport = {
        clients: clients || [],
        projects: projects || [],
        exportDate: new Date().toISOString(),
        version: '2.1',
        source: 'ClientDatabase_DataSync_Fixed',
        connectionState: connectionState || {},
        dataInitialized: dataInitialized
      };

      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `clientes-fixed-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showCustomAlert('Clientes exportados exitosamente.');
    } catch (error) {
      console.error('❌ Error exporting clients:', error);
      showCustomAlert('Error al exportar clientes: ' + error.message);
    }
  };

  // === FUNCIONES DE UI ===
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
      case 'synced':
        return <Wifi className="w-4 h-4 text-green-400" />;
      case 'loading':
      case 'saving':
      case 'deleting':
      case 'refreshing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      case 'offline_mode':
        return <Database className="w-4 h-4 text-yellow-400" />;
      default:
        return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Conectado';
      case 'synced':
        return 'Sincronizado';
      case 'loading':
        return 'Cargando...';
      case 'saving':
        return 'Guardando...';
      case 'deleting':
        return 'Eliminando...';
      case 'refreshing':
        return 'Actualizando...';
      case 'error':
        return 'Error de conexión';
      case 'offline_mode':
        return 'Modo sin conexión';
      default:
        return 'Desconectado';
    }
  };

  // === CÁLCULOS SEGUROS PARA ESTADÍSTICAS ===
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const totalClients = safeClients.length;
  const activeClients = safeClients.filter(c => c && c.status === 'active').length;
  const clientsWithProjects = safeClients.filter(c => c && getClientProjects(c.company).length > 0).length;
  const totalIndustries = new Set(safeClients.map(c => c && c.industry).filter(Boolean)).size;

  // Pantalla de carga mejorada
  if (isLoading || !dataInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="flex items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <div>
                <span className="text-gray-300 text-lg block">
                  Cargando base de datos de clientes...
                </span>
                <div className="text-sm text-gray-500 mt-1">
                  Sistema centralizado DataSync - Inicializando datos seguros
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Estado: {getConnectionText()} | Datos: {dataInitialized ? 'Listos' : 'Cargando...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 text-gray-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">Base de Datos de Clientes</h1>
              <p className="text-gray-400">
                Gestión completa de información de clientes
                <span className="ml-2 text-xs bg-green-600 bg-opacity-20 px-2 py-1 rounded">
                  🔄 Sistema DataSync Centralizado v2.1
                </span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
              <button
                onClick={forceReload}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>
              <button
                onClick={exportClients}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
          
          {/* Indicador de estado del sistema centralizado mejorado */}
          <div className="mt-4 flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-400">
                {totalClients} clientes | {safeProjects.length} proyectos
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getConnectionIcon()}
              <span className="text-gray-400">
                Estado: {getConnectionText()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-400">
                DataSync: {connectionState?.firebaseInitialized ? 'Activo' : 'Iniciando...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-400">
                Datos: {dataInitialized ? 'Inicializados' : 'Cargando...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-400">
                Última sync: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, empresa o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            
            <div>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las industrias</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas - CON DATOS SEGUROS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-100">{totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Clientes Activos</p>
                <p className="text-2xl font-bold text-green-400">{activeClients}</p>
              </div>
              <Building className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Con Proyectos</p>
                <p className="text-2xl font-bold text-purple-400">{clientsWithProjects}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Industrias</p>
                <p className="text-2xl font-bold text-yellow-400">{totalIndustries}</p>
              </div>
              <Filter className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-bold text-gray-100">
              Clientes ({filteredClients.length})
              <span className="ml-2 text-sm text-gray-400">
                - Sincronizados con DataSync v2.1
              </span>
            </h3>
          </div>
          
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                {totalClients === 0 ? 'No hay clientes registrados' : 'No se encontraron clientes'}
              </h3>
              <p className="text-gray-500 mb-6">
                {totalClients === 0 
                  ? 'Comienza agregando tu primer cliente al sistema centralizado'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {totalClients === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Agregar Primer Cliente
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-medium">Cliente</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Empresa</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Industria</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Contacto</th>
                    <th className="text-center p-4 text-gray-300 font-medium">Estado</th>
                    <th className="text-center p-4 text-gray-300 font-medium">Proyectos</th>
                    <th className="text-center p-4 text-gray-300 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    if (!client) return null;
                    
                    const clientProjects = getClientProjects(client.company);
                    
                    return (
                      <tr key={client.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium text-gray-100">{client.name || 'Sin nombre'}</div>
                            <div className="text-sm text-gray-400">
                              {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'Fecha no disponible'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-100">{client.company || 'Sin empresa'}</div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {client.industry || 'Sin especificar'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            {client.email && (
                              <div className="flex items-center gap-1 text-gray-300 mb-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center gap-1 text-gray-300">
                                <Phone className="w-3 h-3" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            client.status === 'active' 
                              ? 'bg-green-600 text-green-100' 
                              : 'bg-red-600 text-red-100'
                          }`}>
                            {client.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-100 font-medium">{clientProjects.length}</span>
                            {clientProjects.length > 0 && (
                              <div className="flex -space-x-1">
                                {clientProjects.slice(0, 2).map((project, index) => (
                                  <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full border border-gray-600 ${
                                      project.status === 'establecido' ? 'bg-green-400' :
                                      project.status === 'semana_gratis' ? 'bg-blue-400' :
                                      project.status === 'demo' ? 'bg-gray-400' :
                                      project.status === 'pausado' ? 'bg-yellow-400' :
                                      'bg-red-400'
                                    }`}
                                    title={project.name}
                                  />
                                ))}
                                {clientProjects.length > 2 && (
                                  <div className="w-2 h-2 rounded-full bg-gray-500 border border-gray-600" />
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetail(client)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(client)}
                              className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-600 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de formulario */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-100">
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                  <span className="ml-2 text-sm text-gray-400">- DataSync v2.1</span>
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-200 p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Empresa *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="cliente@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+52 444 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Industria
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({...formData, industry: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar industria</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Información adicional sobre el cliente..."
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={connectionStatus === 'saving'}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectionStatus === 'saving' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingClient ? 'Actualizar' : 'Crear'} Cliente
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de detalle del cliente */}
        {showDetail && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-100">
                  Detalle del Cliente
                  <span className="ml-2 text-sm text-gray-400">- DataSync v2.1</span>
                </h2>
                <button 
                  onClick={() => setShowDetail(false)} 
                  className="text-gray-400 hover:text-gray-200 p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información del cliente */}
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-100 mb-4">Información Personal</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-400">Nombre</label>
                      <p className="text-gray-100 font-medium">{selectedClient.name || 'Sin nombre'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Empresa</label>
                      <p className="text-gray-100 font-medium">{selectedClient.company || 'Sin empresa'}</p>
                    </div>
                    {selectedClient.email && (
                      <div>
                        <label className="text-sm text-gray-400">Email</label>
                        <p className="text-gray-100">{selectedClient.email}</p>
                      </div>
                    )}
                    {selectedClient.phone && (
                      <div>
                        <label className="text-sm text-gray-400">Teléfono</label>
                        <p className="text-gray-100">{selectedClient.phone}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-400">Industria</label>
                      <p className="text-gray-100">{selectedClient.industry || 'Sin especificar'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Estado</label>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        selectedClient.status === 'active' 
                          ? 'bg-green-600 text-green-100' 
                          : 'bg-red-600 text-red-100'
                      }`}>
                        {selectedClient.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Fecha de registro</label>
                      <p className="text-gray-100">
                        {selectedClient.createdAt ? new Date(selectedClient.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Fecha no disponible'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Última actualización</label>
                      <p className="text-gray-100">
                        {selectedClient.updatedAt ? new Date(selectedClient.updatedAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Fecha no disponible'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Proyectos del cliente */}
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-100 mb-4">
                    Proyectos ({getClientProjects(selectedClient.company).length})
                    <span className="ml-2 text-xs text-gray-400">- Sincronizados</span>
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {getClientProjects(selectedClient.company).length > 0 ? (
                      getClientProjects(selectedClient.company).map((project) => (
                        <div key={project.id || Math.random()} className="bg-gray-600 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-gray-100">{project.name || 'Proyecto sin nombre'}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              project.status === 'establecido' ? 'bg-green-600 text-green-100' :
                              project.status === 'semana_gratis' ? 'bg-blue-600 text-blue-100' :
                              project.status === 'demo' ? 'bg-gray-600 text-gray-100' :
                              project.status === 'pausado' ? 'bg-yellow-600 text-yellow-100' :
                              'bg-red-600 text-red-100'
                            }`}>
                              {project.status === 'establecido' ? 'Establecido' :
                               project.status === 'semana_gratis' ? 'Semana Gratis' :
                               project.status === 'demo' ? 'Demo' :
                               project.status === 'pausado' ? 'Pausado' : 'Cancelado'}
                            </span>
                          </div>
                          {project.monthlyPrice && (
                            <p className="text-sm text-gray-300">
                              ${project.monthlyPrice}/mes
                            </p>
                          )}
                          {project.startDate && (
                            <p className="text-sm text-gray-400">
                              Inicio: {new Date(project.startDate).toLocaleDateString()}
                            </p>
                          )}
                          {project.cutoffDate && (
                            <p className="text-sm text-gray-400">
                              Próximo corte: {new Date(project.cutoffDate).toLocaleDateString()}
                            </p>
                          )}
                          {project.description && (
                            <p className="text-sm text-gray-400 mt-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400">No hay proyectos asociados</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Los proyectos se sincronizan automáticamente
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notas */}
              {selectedClient.notes && (
                <div className="mt-6 bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-100 mb-4">Notas</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedClient.notes}</p>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowDetail(false);
                    handleEdit(selectedClient);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar Cliente
                </button>
                <button
                  onClick={() => setShowDetail(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de alerta */}
        {showAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold text-gray-100">
                  Sistema DataSync v2.1
                </h3>
              </div>
              <p className="text-gray-300 mb-6">{alertMessage}</p>
              <div className="text-xs text-gray-500 mb-4">
                Estado: {getConnectionText()} | Datos inicializados: {dataInitialized ? 'Sí' : 'No'}
              </div>
              <button
                onClick={() => setShowAlert(false)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmación */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold text-gray-100">
                  Confirmación - DataSync v2.1
                </h3>
              </div>
              <p className="text-gray-300 mb-6">{confirmMessage}</p>
              <div className="text-xs text-gray-500 mb-4">
                Esta acción se ejecutará usando el sistema DataSync centralizado
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={connectionStatus === 'deleting'}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connectionStatus === 'deleting' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : null}
                  Confirmar
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
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
};

export default ClientDatabase;