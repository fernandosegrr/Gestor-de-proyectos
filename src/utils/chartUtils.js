// utils/chartUtils.js
// Utilidades completas para cálculos financieros y preparación de datos para gráficos

// Las funciones en chartUtils.js deben ser independientes y recibir datos como parámetros

// Colores para gráficos
export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#EC4899',
  gray: '#6B7280'
};

export const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#22C55E', '#F97316', '#84CC16'
];

export const EXPENSE_CATEGORIES = {
  hosting: { name: 'Hosting & Dominios', color: '#3B82F6', icon: '🌐', type: 'fixed' },
  software: { name: 'Software & Licencias', color: '#8B5CF6', icon: '💻', type: 'fixed' },
  marketing: { name: 'Marketing & Publicidad', color: '#10B981', icon: '📢', type: 'variable' },
  operativos: { name: 'Gastos Operativos', color: '#F59E0B', icon: '🏢', type: 'variable' },
  servicios: { name: 'Servicios Profesionales', color: '#EF4444', icon: '🤝', type: 'variable' },
  otros: { name: 'Otros', color: '#6B7280', icon: '📦', type: 'variable' }
};

export const PROJECT_STATUS = {
  activo: { name: 'Activo', color: '#22C55E', icon: '✅' },
  pendiente: { name: 'Pendiente', color: '#F59E0B', icon: '⏳' },
  pausado: { name: 'Pausado', color: '#6B7280', icon: '⏸️' },
  cancelado: { name: 'Cancelado', color: '#EF4444', icon: '❌' },
  completado: { name: 'Completado', color: '#8B5CF6', icon: '🏆' },
  demo: { name: 'Demo', color: '#06B6D4', icon: '💡' },
  semana_gratis: { name: 'Semana Gratis', color: '#FFD700', icon: '🆓' },
  establecido: { name: 'Establecido', color: '#4CAF50', icon: '📈' }
};

export const formatCurrencyMXN = (amount) => {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export const formatCompactNumberMXN = (amount) => {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
};

// ✅ CORRECCIÓN: Función formatDate que maneja correctamente las zonas horarias
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  try {
    let dateObj;
    
    // Si viene en formato YYYY-MM-DD del input HTML
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day); // month - 1 porque Date usa índice 0
    } else {
      dateObj = new Date(date);
    }
    
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) {
      console.warn('Fecha inválida pasada a formatDate:', date);
      return 'Fecha inválida';
    }
    
    // Opciones de formato según el tipo solicitado
    const options = {
      timeZone: 'America/Mexico_City',
      year: 'numeric'
    };
    
    switch (format) {
      case 'short':
        options.day = '2-digit';
        options.month = '2-digit';
        return dateObj.toLocaleDateString('es-MX', options);
      case 'month':
        options.month = 'short';
        return dateObj.toLocaleDateString('es-MX', options);
      case 'monthYear':
        options.month = 'short';
        return dateObj.toLocaleDateString('es-MX', options);
      case 'full':
        options.day = '2-digit';
        options.month = 'long';
        return dateObj.toLocaleDateString('es-MX', options);
      default:
        options.day = 'numeric';
        options.month = 'short';
        return dateObj.toLocaleDateString('es-MX', options);
    }
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return date.toString();
  }
};

export const formatPercentage = (value, decimals = 1) => {
  return `${parseFloat(value || 0).toFixed(decimals)}%`;
};

export const groupExpensesByCategory = (expenses) => {
  if (!Array.isArray(expenses)) return {};
  return expenses.reduce((acc, expense) => {
    const category = expense.categoria || expense.category || 'otros';
    const amount = parseFloat(expense.monto || expense.amount || 0);
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {});
};

export const groupExpensesByDate = (expenses, groupBy = 'day') => {
  if (!Array.isArray(expenses)) return {};
  return expenses.reduce((acc, expense) => {
    const date = new Date(expense.fecha || expense.date);
    let key;
    switch (groupBy) {
      case 'day': key = date.toISOString().split('T')[0]; break;
      case 'month': key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; break;
      case 'year': key = date.getFullYear().toString(); break;
      default: key = date.toISOString().split('T')[0];
    }
    const amount = parseFloat(expense.monto || expense.amount || 0);
    acc[key] = (acc[key] || 0) + amount;
    return acc;
  }, {});
};

export const groupExpensesByType = (expenses) => {
  if (!Array.isArray(expenses)) return { fixed: 0, variable: 0 };
  return expenses.reduce((acc, expense) => {
    const category = expense.categoria || expense.category || 'otros';
    const amount = parseFloat(expense.monto || expense.amount || 0);
    const categoryInfo = EXPENSE_CATEGORIES[category] || EXPENSE_CATEGORIES.otros;
    acc[categoryInfo.type] = (acc[categoryInfo.type] || 0) + amount; // Asegurar inicialización
    return acc;
  }, { fixed: 0, variable: 0 });
};

export const groupProjectsByStatus = (projects) => {
  if (!Array.isArray(projects)) return {};
  return projects.reduce((acc, project) => {
    const status = project.estado || project.status || 'pendiente';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
};

export const calculateExpenseStats = (expenses = []) => {
  if (!Array.isArray(expenses) || expenses.length === 0) {
    return {
      total: 0,
      average: 0,
      count: 0,
      min: 0,
      max: 0,
      monthlyAverage: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      categoryDistribution: []
    };
  }

  const amounts = expenses.map(e => parseFloat(e.monto || e.amount || 0));
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const average = total / amounts.length;
  const monthlyAverage = total / 12; // Esto se corregirá en dataSync si se usa desde allí

  const typeDistribution = groupExpensesByType(expenses);
  const categoryGrouped = groupExpensesByCategory(expenses);

  // ✅ CORRECCIÓN: Declarar min y max como variables locales
  const min = amounts.length > 0 ? Math.min(...amounts) : 0;
  const max = amounts.length > 0 ? Math.max(...amounts) : 0;

  const categoryDistribution = Object.entries(categoryGrouped).map(([category, amount]) => {
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
    min, // Usar la variable local
    max, // Usar la variable local
    monthlyAverage,
    fixedExpenses: typeDistribution.fixed,
    variableExpenses: typeDistribution.variable,
    categoryDistribution,
    formattedTotal: formatCurrencyMXN(total),
    formattedAverage: formatCurrencyMXN(average),
    formattedMin: formatCurrencyMXN(min), // Ahora 'min' está definida
    formattedMax: formatCurrencyMXN(max), // Ahora 'max' está definida
    formattedMonthlyAverage: formatCurrencyMXN(monthlyAverage)
  };
};

// ===== FUNCIONES FALTANTES PARA FINANCIAL REPORTS =====

// Obtener años disponibles de los proyectos
export const getAvailableYears = (projects = []) => {
  if (!Array.isArray(projects)) return [new Date().getFullYear()];

  const years = new Set();
  const currentYear = new Date().getFullYear();

  projects.forEach(project => {
    if (project.startDate) {
      // Crear fecha local sin problemas de zona horaria
      const [year_str] = project.startDate.split('-');
      const year = parseInt(year_str);
      if (!isNaN(year)) years.add(year);
    }
    if (project.cutoffDate) {
      // Crear fecha local sin problemas de zona horaria
      const [year_str] = project.cutoffDate.split('-');
      const year = parseInt(year_str);
      if (!isNaN(year)) years.add(year);
    }
    if (project.createdAt) {
      // Para createdAt que puede venir en formato ISO, mantener el parsing original
      const year = new Date(project.createdAt).getFullYear();
      if (!isNaN(year)) years.add(year);
    }
    if (project.installationDate) {
      // Crear fecha local para installationDate
      const [year_str] = project.installationDate.split('-');
      const year = parseInt(year_str);
      if (!isNaN(year)) years.add(year);
    }
  });

  // Asegurar que el año actual esté incluido
  years.add(currentYear);

  return Array.from(years).sort((a, b) => b - a);
};

// Calcular ingresos mensuales
export const calculateMonthlyIncome = (projects = [], year = new Date().getFullYear()) => {
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
    ingresosInstalacion: 0,
    proyectosActivos: 0,
    nuevosProyectos: 0
  }));

  projects.forEach(project => {
    if (!project) return;

    const monthlyPrice = parseFloat(project.monthlyPrice || 0);
    const installationCost = parseFloat(project.installationCost || 0);

    // Determinar el rango de meses activos del proyecto
    let startMonth = 0;
    let endMonth = 11;

    if (project.startDate) {
      // Crear fecha local sin problemas de zona horaria
      const [year_str, month_str, day_str] = project.startDate.split('-');
      const startDate = new Date(parseInt(year_str), parseInt(month_str) - 1, parseInt(day_str));
      
      if (startDate.getFullYear() === year) {
        startMonth = startDate.getMonth();
      } else if (startDate.getFullYear() > year) {
        return; // Proyecto no empezó este año
      }
    }

    if (project.status === 'cancelado' && project.updatedAt) {
      // Para updatedAt que puede venir en formato ISO, usar parsing directo
      const endDate = new Date(project.updatedAt);
      if (endDate.getFullYear() === year) {
        endMonth = endDate.getMonth();
      } else if (endDate.getFullYear() < year) {
        return; // Proyecto terminó antes de este año
      }
    }

    // Aplicar ingresos mensuales para proyectos activos/establecidos
    if (['activo', 'establecido'].includes(project.status) && monthlyPrice > 0) {
      for (let monthIndex = startMonth; monthIndex <= endMonth; monthIndex++) {
        monthlyData[monthIndex].ingresosRecurrentes += monthlyPrice;
        monthlyData[monthIndex].ingresos += monthlyPrice;
        monthlyData[monthIndex].proyectosActivos += 1;
      }
    }

    // Aplicar costo de instalación en el mes de la fecha de instalación
    if (installationCost > 0) {
      let installationDate = null;
      
      // Usar installationDate si está disponible, sino usar startDate como fallback
      if (project.installationDate) {
        // Crear fecha local sin problemas de zona horaria
        const [year_str, month_str, day_str] = project.installationDate.split('-');
        installationDate = new Date(parseInt(year_str), parseInt(month_str) - 1, parseInt(day_str));
      } else if (project.startDate) {
        // Crear fecha local sin problemas de zona horaria
        const [year_str, month_str, day_str] = project.startDate.split('-');
        installationDate = new Date(parseInt(year_str), parseInt(month_str) - 1, parseInt(day_str));
      }
      
      if (installationDate && installationDate.getFullYear() === year) {
        const monthIndex = installationDate.getMonth();
        monthlyData[monthIndex].ingresosInstalacion += installationCost;
        monthlyData[monthIndex].ingresos += installationCost;
        monthlyData[monthIndex].nuevosProyectos += 1;
      }
    }
  });

  return monthlyData;
};

// Calcular estadísticas generales
export const calculateGeneralStats = (projects = []) => {
  if (!Array.isArray(projects)) {
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalRevenue: 0,
      averageMonthlyRevenue: 0,
      conversionRate: 0
    };
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => ['activo', 'establecido'].includes(p.status)).length;
  const completedProjects = projects.filter(p => p.status === 'completado').length;
  const trialProjects = projects.filter(p => p.status === 'semana_gratis').length;

  // Calcular ingresos totales
  const totalRevenue = projects.reduce((total, project) => {
    const monthlyPrice = parseFloat(project.monthlyPrice || 0);
    const installationCost = parseFloat(project.installationCost || 0);

    // Estimar ingresos basado en el estado del proyecto
    let projectRevenue = installationCost;

    if (['activo', 'establecido'].includes(project.status)) {
      // Calcular meses activos (estimación simple)
      const monthsActive = project.startDate ?
        Math.max(1, Math.ceil((Date.now() - new Date(project.startDate)) / (1000 * 60 * 60 * 24 * 30))) : 1;
      projectRevenue += monthlyPrice * Math.min(monthsActive, 12); // Max 12 meses para el año actual
    }

    return total + projectRevenue;
  }, 0);

  const averageMonthlyRevenue = activeProjects > 0 ?
    projects.reduce((sum, p) => sum + parseFloat(p.monthlyPrice || 0), 0) : 0;

  const conversionRate = trialProjects > 0 ?
    (activeProjects / (activeProjects + trialProjects)) * 100 : 0;

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    trialProjects,
    totalRevenue,
    averageMonthlyRevenue,
    conversionRate: parseFloat(conversionRate.toFixed(1)),
    formattedTotalRevenue: formatCurrencyMXN(totalRevenue),
    formattedAverageMonthlyRevenue: formatCurrencyMXN(averageMonthlyRevenue)
  };
};

// Preparar datos de distribución de estados
export const prepareStatusDistributionData = (projects = []) => {
  if (!Array.isArray(projects)) return [];

  const statusCount = groupProjectsByStatus(projects);
  const total = projects.length;

  return Object.entries(statusCount).map(([status, count]) => {
    const statusInfo = PROJECT_STATUS[status] || { name: status, color: '#6B7280' }; // Aquí se usa el PROJECT_STATUS
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

    return {
      name: statusInfo.name,
      value: count,
      percentage: parseFloat(percentage),
      fill: statusInfo.color // Este es el color que se usa en el gráfico
    };
  }).sort((a, b) => b.value - a.value);
};