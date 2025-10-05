import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Tag,
  TrendingDown,
  AlertCircle,
  Save,
  X,
  Building,
  Repeat,
  BarChart3,
  Calculator,
  RefreshCw,
  Wifi,
  WifiOff,
  Info
} from 'lucide-react';

// ✅ IMPORTAR EL DATASYNC CORREGIDO
import {
  dataManager,
  useDataSync,
  DATA_EVENTS,
  useConnectionState,
  initializeData
} from '../utils/dataSync';

// Importar utilitarios
import { formatCurrencyMXN, EXPENSE_CATEGORIES, formatDate } from '../utils/chartUtils';

// ✅ CORRECCIÓN: Cálculo de estadísticas mejorado
const calculateExpenseStats = (expenses = []) => {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {
      total: 0,
      average: 0,
      count: 0,
      monthlyAverage: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      categoryDistribution: []
    };
  }

  const amounts = expenses.map(e => parseFloat(e.amount || 0));
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const average = expenses.length > 0 ? total / expenses.length : 0;

  // Calcular promedio mensual real basado en gastos recurrentes
  let monthlyRecurringTotal = 0;
  let oneTimeExpensesTotal = 0;

  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount) || 0;
    if (expense.isRecurring) {
      // Ajustar según el tipo de recurrencia
      switch (expense.recurringType) {
        case 'monthly':
          monthlyRecurringTotal += amount;
          break;
        case 'biannual':
          monthlyRecurringTotal += amount / 6; // Dividir entre 6 meses
          break;
        case 'annual':
          monthlyRecurringTotal += amount / 12; // Dividir entre 12 meses
          break;
        default:
          monthlyRecurringTotal += amount; // Por defecto mensual
      }
    } else {
      oneTimeExpensesTotal += amount;
    }
  });

  const monthlyAverage = monthlyRecurringTotal + (oneTimeExpensesTotal / 12);

  // Calcular gastos fijos vs variables
  const fixedCategories = ['hosting', 'software'];
  const fixedExpenses = expenses
    .filter(expense => fixedCategories.includes(expense.category))
    .reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
  const variableExpenses = total - fixedExpenses;

  // Distribución por categoría
  const categoryTotals = {};
  expenses.forEach(expense => {
    const category = expense.category || 'otros';
    const amount = parseFloat(expense.amount) || 0;
    categoryTotals[category] = (categoryTotals[category] || 0) + amount;
  });

  const categoryDistribution = Object.entries(categoryTotals).map(([category, amount]) => {
    const info = EXPENSE_CATEGORIES[category] || EXPENSE_CATEGORIES.otros;
    return {
      name: info.name,
      value: amount,
      percentage: parseFloat(((amount / total) * 100).toFixed(1)),
      color: info.color,
      icon: info.icon
    };
  }).sort((a, b) => b.value - a.value);

  return {
    total,
    average,
    count: expenses.length,
    monthlyAverage,
    fixedExpenses,
    variableExpenses,
    categoryDistribution
  };
};

// Componente de confirmación
const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[1000]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-600 bg-opacity-20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-100">{title}</h3>
          </div>

          <p className="text-gray-300 mb-6">{message}</p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ExpenseManager = () => {
  // ✅ ESTADOS PRINCIPALES
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, expenseId: null });

  // ✅ ESTADO DE CONEXIÓN FIREBASE
  const connectionState = useConnectionState();

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'otros',
    date: new Date().toISOString().split('T')[0],
    description: '',
    isRecurring: false,
    recurringType: 'monthly', // 'monthly', 'annual', 'biannual'
    recurringDay: '',
    vendor: ''
  });

  const categories = Object.entries(EXPENSE_CATEGORIES).map(([id, info]) => ({
    id,
    name: info.name,
    color: info.color,
    icon: info.icon
  }));

  // ✅ CORRECCIÓN PRINCIPAL: Inicialización del sistema mejorada
  useEffect(() => {
    const initializeSystem = async () => {
      console.log('🔧 [ExpenseManager] Inicializando sistema...');
      
      try {
        // Inicializar Firebase Manager si no está inicializado
        await initializeData();
        console.log('✅ [ExpenseManager] Sistema inicializado');
      } catch (error) {
        console.error('❌ [ExpenseManager] Error inicializando sistema:', error);
        // En caso de error, asegurar que no se quede en carga infinita
        setIsLoading(false);
      }
    };

    initializeSystem();
  }, []); // Solo ejecutar una vez al montar el componente

  // ✅ CORRECCIÓN: Carga inicial de datos basada en el estado de conexión
  useEffect(() => {
    const loadInitialData = async () => {
      // Solo cargar datos cuando Firebase esté completamente inicializado O en caso de error
      if (connectionState.authStatus === 'authenticated' || connectionState.authStatus === 'error') {
        console.log('🔄 [ExpenseManager] Cargando datos iniciales...', {
          authStatus: connectionState.authStatus,
          firebaseInitialized: connectionState.firebaseInitialized,
          dataLoaded: connectionState.dataLoaded?.expenses
        });

        try {
          setIsLoading(true);
          const expensesData = await dataManager.loadExpenses();
          console.log('📊 [ExpenseManager] Datos cargados:', expensesData.length);
          setExpenses(Array.isArray(expensesData) ? expensesData : []);
        } catch (error) {
          console.error('❌ [ExpenseManager] Error cargando datos:', error);
          setExpenses([]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadInitialData();
  }, [connectionState.authStatus, connectionState.firebaseInitialized]);

  // ✅ CORRECCIÓN: Sistema de sincronización en tiempo real mejorado
  useDataSync(DATA_EVENTS.EXPENSES_UPDATED, useCallback((updatedExpenses) => {
    console.log('🔄 [ExpenseManager] Datos actualizados via useDataSync:', updatedExpenses?.length);
    console.log('🔄 [ExpenseManager] Estado actual antes de actualizar:', expenses.length);
    if (Array.isArray(updatedExpenses)) {
      setExpenses(updatedExpenses);
      // Si estaba cargando y llegan datos, dejar de cargar
      if (isLoading) {
        setIsLoading(false);
      }
      console.log('✅ [ExpenseManager] Estado actualizado a:', updatedExpenses.length, 'gastos');
    } else {
      console.warn('⚠️ [ExpenseManager] Los datos recibidos no son un array:', typeof updatedExpenses, updatedExpenses);
    }
  }, [])); // ✅ CORRECCIÓN: Array vacío para callback estable

  // ✅ CORRECCIÓN: Monitoreo del estado de carga basado en dataLoaded
  useEffect(() => {
    // Si los datos ya están marcados como cargados pero seguimos en loading, actualizar estado
    if (connectionState.dataLoaded?.expenses && isLoading) {
      console.log('✅ [ExpenseManager] Datos marcados como cargados, actualizando estado');
      setIsLoading(false);
    }
  }, [connectionState.dataLoaded?.expenses, isLoading]);

  // ✅ CORRECCIÓN: Timeout de seguridad para evitar carga infinita
  useEffect(() => {
    // Timeout de seguridad: si después de 15 segundos sigue cargando, forzar fin de carga
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ [ExpenseManager] Timeout de carga alcanzado, forzando fin de carga');
        setIsLoading(false);
      }
    }, 15000); // 15 segundos

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // ✅ NUEVA CORRECCIÓN: Recargar gastos si el componente está vacío pero debería tener datos
  useEffect(() => {
    const recheckExpenses = async () => {
      // Si no estamos cargando, los datos están marcados como cargados, pero no hay gastos
      if (!isLoading && 
          connectionState.dataLoaded?.expenses && 
          expenses.length === 0 && 
          (connectionState.authStatus === 'authenticated' || connectionState.authStatus === 'error')) {
        
        console.log('🔍 [ExpenseManager] Verificando si realmente no hay gastos...');
        
        try {
          const freshExpenses = await dataManager.loadExpenses();
          if (Array.isArray(freshExpenses) && freshExpenses.length > 0) {
            console.log('🔄 [ExpenseManager] Encontrados gastos que no estaban sincronizados:', freshExpenses.length);
            setExpenses(freshExpenses);
          } else {
            console.log('✅ [ExpenseManager] Confirmado: no hay gastos almacenados');
          }
        } catch (error) {
          console.warn('⚠️ [ExpenseManager] Error verificando gastos:', error);
        }
      }
    };

    // Ejecutar verificación después de un breve delay para evitar loops
    const timeout = setTimeout(recheckExpenses, 1000);
    return () => clearTimeout(timeout);
  }, [isLoading, connectionState.dataLoaded?.expenses, expenses.length, connectionState.authStatus]);

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      category: 'otros',
      date: new Date().toISOString().split('T')[0],
      description: '',
      isRecurring: false,
      recurringType: 'monthly',
      recurringDay: '',
      vendor: ''
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  // ✅ MANEJAR ENVÍO CON FIREBASE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.amount || !formData.date) {
      console.error('Por favor completa los campos obligatorios');
      return;
    }

    try {
      setIsSaving(true);

      if (editingExpense) {
        console.log('✏️ [ExpenseManager] Actualizando gasto:', editingExpense.id);
        const result = await dataManager.updateExpense(editingExpense.id, formData);
        if (result.success) {
          console.log('✅ [ExpenseManager] Gasto actualizado exitosamente');
          resetForm();
        } else {
          console.error('Error actualizando el gasto:', result.error);
        }
      } else {
        console.log('➕ [ExpenseManager] Creando nuevo gasto');
        const result = await dataManager.createExpense(formData);
        if (result.success) {
          console.log('✅ [ExpenseManager] Gasto creado exitosamente');
          resetForm();
        } else {
          console.error('Error creando el gasto:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ [ExpenseManager] Error guardando gasto:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Editar gasto
  const handleEdit = (expense) => {
    console.log('✏️ [ExpenseManager] Editando gasto:', expense.id);
    setFormData({
      name: expense.name || '',
      amount: expense.amount || '',
      category: expense.category || 'otros',
      date: expense.date || '',
      description: expense.description || '',
      isRecurring: expense.isRecurring || false,
      recurringType: expense.recurringType || 'monthly',
      recurringDay: expense.recurringDay || '',
      vendor: expense.vendor || ''
    });
    setEditingExpense(expense);
    setShowForm(true);
  };

  // Mostrar diálogo de confirmación para eliminar
  const handleDeleteConfirm = (expenseId) => {
    setConfirmDialog({ isOpen: true, expenseId });
  };

  // ✅ ELIMINAR USANDO FIREBASE
  const handleDelete = async () => {
    const { expenseId } = confirmDialog;

    try {
      console.log('🗑️ [ExpenseManager] Eliminando gasto:', expenseId);
      const result = await dataManager.deleteExpense(expenseId);
      if (result.success) {
        console.log('✅ [ExpenseManager] Gasto eliminado exitosamente');
      } else {
        console.error('Error eliminando el gasto:', result.error);
      }
    } catch (error) {
      console.error('❌ [ExpenseManager] Error eliminando gasto:', error);
    } finally {
      setConfirmDialog({ isOpen: false, expenseId: null });
    }
  };

  // ✅ RECARGAR DATOS MANUALMENTE
  const forceReload = async () => {
    console.log('🔄 [ExpenseManager] Recarga manual solicitada');
    setIsLoading(true);
    try {
      const expensesData = await dataManager.loadExpenses();
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
    } catch (error) {
      console.error('❌ Error en recarga manual:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar gastos
  const filteredExpenses = expenses.filter(expense => {
    const matchesFilter = filter === 'all' || expense.category === filter;
    const matchesSearch = expense.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Obtener información de categoría
  const getCategoryInfo = (categoryId) => {
    return EXPENSE_CATEGORIES[categoryId] || EXPENSE_CATEGORIES.otros;
  };

  // Calcular estadísticas
  const expenseStats = calculateExpenseStats(expenses);
  const totalExpenses = filteredExpenses.reduce((sum, expense) =>
    sum + (parseFloat(expense.amount) || 0), 0
  );
  const recurringExpenses = filteredExpenses.filter(expense => expense.isRecurring).length;

  // ✅ ESTADO DE CARGA MEJORADO
  // Solo mostrar loading si realmente está cargando Y la autenticación no ha terminado
  const shouldShowLoading = isLoading && (
    connectionState.authStatus === 'initializing' || 
    connectionState.authStatus === 'authenticating' ||
    !connectionState.dataLoaded?.expenses
  );

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <span className="text-gray-300 text-lg">
                {connectionState.authStatus === 'initializing' || connectionState.authStatus === 'authenticating' 
                  ? 'Conectando con Firebase...' 
                  : 'Cargando gastos...'}
              </span>
              <p className="text-gray-500 text-sm mt-2">
                {connectionState.firebaseInitialized ? '✅ Firebase inicializado' : '⚠️ Inicializando Firebase...'}
              </p>
              <div className="text-xs text-gray-600 mt-1">
                Estado: {connectionState.authStatus} | DB: {connectionState.dbConnection ? 'Conectada' : 'Desconectada'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Datos cargados: {connectionState.dataLoaded?.expenses ? 'Sí' : 'No'}
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

        {/* Header con estado de conexión */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2 flex items-center gap-3">
              💰 Gestión de Gastos
              {connectionState.dbConnection ? (
                <div className="flex items-center gap-1 text-sm bg-green-600 bg-opacity-20 px-2 py-1 rounded-full">
                  <Wifi className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">Firebase</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm bg-red-600 bg-opacity-20 px-2 py-1 rounded-full">
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">Sin conexión</span>
                </div>
              )}
            </h1>
            <p className="text-gray-400">
              Control y seguimiento de gastos empresariales - <span className="text-green-400 font-semibold">Pesos Mexicanos (MXN)</span>
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-500">
                  🔥 Firebase: {expenses.length} gastos sincronizados
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-500">
                  App ID: {connectionState.appId}
                </span>
              </div>
              {connectionState.userId && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-500">
                    Usuario: {connectionState.userId.substring(0, 8)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Filtrado</div>
              <div className="text-2xl font-bold text-red-400">
                {formatCurrencyMXN(totalExpenses)}
              </div>
            </div>

            <button
              onClick={forceReload}
              disabled={isSaving || isLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              title="Recargar desde Firebase"
            >
              <RefreshCw className={`w-4 h-4 ${(isSaving || isLoading) ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>

            <button
              onClick={() => setShowForm(true)}
              disabled={isSaving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Nuevo Gasto
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Gastos</p>
                <p className="text-2xl font-bold text-red-400">{expenses.length}</p>
              </div>
              <div className="p-3 bg-red-600 bg-opacity-20 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Gastos Recurrentes</p>
                <p className="text-2xl font-bold text-yellow-400">{recurringExpenses}</p>
              </div>
              <div className="p-3 bg-yellow-600 bg-opacity-20 rounded-lg">
                <Repeat className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Promedio Mensual</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrencyMXN(expenseStats.monthlyAverage)}
                </p>
              </div>
              <div className="p-3 bg-blue-600 bg-opacity-20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Categorías Activas</p>
                <p className="text-2xl font-bold text-purple-400">
                  {expenseStats.categoryDistribution.length}
                </p>
              </div>
              <div className="p-3 bg-purple-600 bg-opacity-20 rounded-lg">
                <Tag className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Análisis de gastos fijos vs variables */}
        {expenses.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Análisis de Gastos (MXN) - 🔥 Datos en Tiempo Real desde Firebase
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">
                  {formatCurrencyMXN(expenseStats.fixedExpenses)}
                </div>
                <div className="text-sm text-gray-400">Gastos Fijos</div>
                <div className="text-xs text-gray-500 mt-1">
                  {expenseStats.total > 0 ? ((expenseStats.fixedExpenses / expenseStats.total) * 100).toFixed(1) : 0}% del total
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  {formatCurrencyMXN(expenseStats.variableExpenses)}
                </div>
                <div className="text-sm text-gray-400">Gastos Variables</div>
                <div className="text-xs text-gray-500 mt-1">
                  {expenseStats.total > 0 ? ((expenseStats.variableExpenses / expenseStats.total) * 100).toFixed(1) : 0}% del total
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {formatCurrencyMXN(expenseStats.average)}
                </div>
                <div className="text-sm text-gray-400">Promedio por Gasto</div>
                <div className="text-xs text-gray-500 mt-1">
                  Base para presupuestos
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros y búsqueda */}
        {expenses.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar gastos por nombre, descripción o proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="min-w-48">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {EXPENSE_CATEGORIES[category.id].icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Lista de gastos */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                📋 Gastos Registrados ({filteredExpenses.length})
                {connectionState.dbConnection ? (
                  <span className="text-xs bg-green-600 bg-opacity-20 text-green-400 px-2 py-1 rounded">
                    🔥 Firebase Sync
                  </span>
                ) : (
                  <span className="text-xs bg-red-600 bg-opacity-20 text-red-400 px-2 py-1 rounded">
                    📵 Sin conexión DB
                  </span>
                )}
              </h3>
              <div className="text-sm text-gray-400">
                Total mostrado: <span className="text-red-400 font-semibold">{formatCurrencyMXN(totalExpenses)}</span>
              </div>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                {expenses.length === 0 ? 'Base de datos limpia' : 'No hay gastos que coincidan'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filter !== 'all'
                  ? 'No se encontraron gastos con los filtros aplicados'
                  : expenses.length === 0
                    ? 'Tu base de datos está completamente limpia. Comienza agregando tu primer gasto empresarial real.'
                    : 'Comienza agregando tu primer gasto empresarial'
                }
              </p>
              {(!searchTerm && filter === 'all') && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {expenses.length === 0 ? 'Agregar Primer Gasto Real' : 'Agregar Primer Gasto'}
                  </button>
                  {expenses.length === 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      ✅ Sin datos de ejemplo - Base de datos completamente limpia
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredExpenses.map((expense) => {
                const categoryData = getCategoryInfo(expense.category);

                return (
                  <div key={expense.id} className="p-6 hover:bg-gray-700 hover:bg-opacity-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="p-3 rounded-lg bg-opacity-20 flex-shrink-0"
                          style={{ backgroundColor: `${categoryData.color}20` }}
                        >
                          <span className="text-lg">{categoryData.icon}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-medium text-gray-100 truncate">
                              {expense.name}
                            </h4>
                            {expense.isRecurring && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-600 bg-opacity-20 rounded-full">
                                <Repeat className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400">
                                  {expense.recurringType === 'monthly' ? 'Mensual' : 
                                   expense.recurringType === 'biannual' ? 'Semestral' : 
                                   expense.recurringType === 'annual' ? 'Anual' : 'Recurrente'}
                                </span>
                              </div>
                            )}
                            <div
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${categoryData.color}20`,
                                color: categoryData.color
                              }}
                            >
                              {categoryData.type === 'fixed' ? 'Fijo' : 'Variable'}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Tag className="w-4 h-4" />
                              {categoryData.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(expense.date, 'short')}
                            </span>
                            {expense.vendor && (
                              <span className="flex items-center gap-1">
                                <Building className="w-4 h-4" />
                                {expense.vendor}
                              </span>
                            )}
                          </div>

                          {expense.description && (
                            <p className="text-gray-500 text-sm mt-2 truncate">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xl font-bold text-red-400">
                            {formatCurrencyMXN(expense.amount)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-2 rounded-full bg-gray-700 text-blue-400 hover:bg-gray-600 transition-colors"
                            title="Editar gasto"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(expense.id)}
                            className="p-2 rounded-full bg-gray-700 text-red-400 hover:bg-gray-600 transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Formulario para agregar/editar gasto (Modal) */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-2xl font-bold text-gray-100">
                {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-gray-300 text-sm font-medium mb-2">
                    Nombre del Gasto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej. Renta de Oficina"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="amount" className="block text-gray-300 text-sm font-medium mb-2">
                    Monto (MXN) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      id="amount"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })}
                      className="w-full pl-8 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="5000"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="category" className="block text-gray-300 text-sm font-medium mb-2">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {EXPENSE_CATEGORIES[category.id].icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="date" className="block text-gray-300 text-sm font-medium mb-2">
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    title="Fecha en que inicia este gasto (para gastos recurrentes, se repetirá mensualmente desde esta fecha)"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-gray-300 text-sm font-medium mb-2">
                  Descripción (Opcional)
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detalles adicionales sobre el gasto..."
                ></textarea>
              </div>

              <div>
                <label htmlFor="vendor" className="block text-gray-300 text-sm font-medium mb-2">
                  Proveedor (Opcional)
                </label>
                <input
                  type="text"
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej. Telmex, AWS, Freelancer XYZ"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="text-gray-300 text-sm font-medium">
                  Gasto Recurrente
                </label>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-600 bg-opacity-20 rounded-lg border border-blue-600">
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-blue-400 text-sm">
                        💡 <strong>Gasto Recurrente:</strong> Este gasto se aplicará automáticamente según la frecuencia seleccionada.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-blue-300 text-sm font-medium mb-2">
                        Tipo de Recurrencia
                      </label>
                      <select
                        value={formData.recurringType}
                        onChange={(e) => setFormData({ ...formData, recurringType: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700 border border-blue-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">📅 Mensual - Cada mes</option>
                        <option value="biannual">📅 Semestral - Cada 6 meses</option>
                        <option value="annual">📅 Anual - Cada año</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {formData.isRecurring && (
                <div>
                  <label htmlFor="recurringDay" className="block text-gray-300 text-sm font-medium mb-2">
                    Día de recurrencia (1-31)
                  </label>
                  <input
                    type="number"
                    id="recurringDay"
                    value={formData.recurringDay}
                    onChange={(e) => setFormData({ ...formData, recurringDay: parseInt(e.target.value) || '' })}
                    min="1"
                    max="31"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Ej. 5 (para el día 5 de cada ${formData.recurringType === 'monthly' ? 'mes' : formData.recurringType === 'biannual' ? 'semestre' : 'año'})`}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> {editingExpense ? 'Actualizar Gasto' : 'Crear Gasto'}
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, expenseId: null })}
      />
    </div>
  );
};

export default ExpenseManager;