import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  AlertTriangle,
  Target,
  Percent,
  Calculator
} from 'lucide-react';
import {
  calculateMonthlyIncome,
  calculateGeneralStats,
  prepareStatusDistributionData,
  formatCurrencyMXN,
  formatCompactNumberMXN,
  getAvailableYears,
  CHART_COLORS,
  EXPENSE_CATEGORIES
} from '../utils/chartUtils';

// ✅ DataManager SOLO de dataSync
import {
  dataManager,
  useDataSync,
  DATA_EVENTS,
  initializeData
} from '../utils/dataSync';

// Función local para calcular profit analysis sin llamadas recursivas
const calculateNetProfitLocal = (projects, expenses, year) => {
  try {
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
      totalProfit: totals.totalProfit + month.ganancia
    }), { totalIncome: 0, totalExpenses: 0, totalProfit: 0 });

    return {
      monthlyData: netProfitData,
      yearTotals
    };
  } catch (error) {
    console.error('❌ Error calculando profit analysis:', error);
    return { monthlyData: [], yearTotals: { totalIncome: 0, totalExpenses: 0, totalProfit: 0 } };
  }
};

const FinancialReports = () => {
  // Estados existentes
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState('bar');
  const [showInstallation, setShowInstallation] = useState(true);
  const [viewMode, setViewMode] = useState('profit'); // 'income', 'expenses', 'profit'

  // Datos calculados existentes
  const [monthlyData, setMonthlyData] = useState([]);
  const [generalStats, setGeneralStats] = useState({});
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);

  // Nuevos datos para gastos
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [expenseStats, setExpenseStats] = useState({});
  const [profitAnalysis, setProfitAnalysis] = useState({ monthlyData: [], yearTotals: {} });

  // Función para cargar y procesar todos los datos
  const loadAndProcessData = async (projectsData, expensesData) => {
    try {
      // Validar datos con controles de seguridad adicionales
      if (!Array.isArray(projectsData)) projectsData = [];
      if (!Array.isArray(expensesData)) expensesData = [];

      console.log('📊 FinancialReports: Procesando datos:', {
        proyectos: projectsData.length,
        gastos: expensesData.length
      });

      setProjects(projectsData);
      setExpenses(expensesData);

      // Calcular años disponibles con validación
      const years = getAvailableYears(projectsData);
      if (Array.isArray(years) && years.length > 0) {
        setAvailableYears(years);
      }

      // Calcular datos de ingresos con try-catch
      const monthly = calculateMonthlyIncome(projectsData, selectedYear);
      const stats = calculateGeneralStats(projectsData);
      const distribution = prepareStatusDistributionData(projectsData);

      setMonthlyData(Array.isArray(monthly) ? monthly : []);
      setGeneralStats(stats || {});
      setStatusDistribution(Array.isArray(distribution) ? distribution : []);

      // Calcular datos de gastos con validación
      const monthlyExp = dataManager.calculateMonthlyExpenses(expensesData, selectedYear);
      const expStats = dataManager.calculateExpenseStats(expensesData);

      setMonthlyExpenses(Array.isArray(monthlyExp) ? monthlyExp : []);
      setExpenseStats(expStats || {});

      // Calcular análisis de ganancia neta usando los datos ya cargados
      const profitData = calculateNetProfitLocal(projectsData, expensesData, selectedYear);
      setProfitAnalysis(profitData || { monthlyData: [], yearTotals: {} });

      console.log('📈 Datos calculados exitosamente:', {
        monthly: monthly?.length || 0,
        expenses: monthlyExp?.length || 0,
        profit: profitData?.monthlyData?.length || 0
      });

    } catch (error) {
      console.error('❌ Error procesando datos:', error);
      // En caso de error, establecer valores por defecto
      setProjects([]);
      setExpenses([]);
      setAvailableYears([new Date().getFullYear()]);
      setMonthlyData([]);
      setGeneralStats({});
      setStatusDistribution([]);
      setMonthlyExpenses([]);
      setExpenseStats({});
      setProfitAnalysis({ monthlyData: [], yearTotals: {} });
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        console.log('🔄 FinancialReports: Iniciando carga de datos...');

        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Timeout de carga alcanzado, forzando fin de carga');
          setIsLoading(false);
        }, 10000); // 10 segundos

        await initializeData();

        const [projectsData, expensesData] = await Promise.all([
          dataManager.loadProjects(),
          dataManager.loadExpenses()
        ]);

        await loadAndProcessData(projectsData, expensesData);

        clearTimeout(timeoutId);

      } catch (error) {
        console.error('❌ Error loading data for reports:', error);
        await loadAndProcessData([], []);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [selectedYear]);

  // Escuchar cambios en proyectos
  useDataSync(DATA_EVENTS.PROJECTS_UPDATED, async (updatedProjects) => {
    console.log('🔄 Proyectos actualizados:', updatedProjects?.length || 0);

    try {
      const projectsData = Array.isArray(updatedProjects) ? updatedProjects : [];
      await loadAndProcessData(projectsData, expenses);
    } catch (error) {
      console.error('❌ Error en sincronización de proyectos:', error);
    }
  });

  // Escuchar cambios en gastos
  useDataSync(DATA_EVENTS.EXPENSES_UPDATED, async (updatedExpenses) => {
    console.log('🔄 Gastos actualizados:', updatedExpenses?.length || 0);

    try {
      const expensesData = Array.isArray(updatedExpenses) ? updatedExpenses : [];
      await loadAndProcessData(projects, expensesData);
    } catch (error) {
      console.error('❌ Error en sincronización de gastos:', error);
    }
  });

  // Función para forzar recarga
  const forceReload = async () => {
    try {
      setIsLoading(true);

      console.log('🔄 FinancialReports: Recarga manual iniciada');

      // Pequeña pausa para UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const [projectsData, expensesData] = await Promise.all([
        dataManager.loadProjects(),
        dataManager.loadExpenses()
      ]);

      await loadAndProcessData(projectsData, expensesData);
    } catch (error) {
      console.error('❌ Error en recarga forzada:', error);
      await loadAndProcessData([], []);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      console.log('🧹 FinancialReports: Limpiando recursos');
      // Limpiar estados si es necesario
    };
  }, []);

  // Componente de tarjeta de estadística mejorado
  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend, percentage }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
          )}
          {percentage && (
            <div className="flex items-center gap-1 mt-2">
              <div className={`text-xs px-2 py-1 rounded-full ${
                percentage > 0 ? 'bg-green-600 bg-opacity-20 text-green-400' :
                percentage < 0 ? 'bg-red-600 bg-opacity-20 text-red-400' :
                'bg-gray-600 bg-opacity-20 text-gray-400'
              }`}>
                {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('400', '600')} bg-opacity-20 flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm font-medium">{trend}</span>
        </div>
      )}
    </div>
  );

  // Tooltip personalizado para gráficos de ganancia
  const ProfitTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm flex items-center gap-2" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.dataKey === 'ingresos' ? 'Ingresos' :
               entry.dataKey === 'gastos' ? 'Gastos' :
               entry.dataKey === 'ganancia' ? 'Ganancia Neta' : entry.dataKey}
              : {formatCurrencyMXN(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Función para exportar reporte completo
  const exportReport = () => {
    const reportData = {
      year: selectedYear,
      currency: 'MXN',
      generatedAt: new Date().toISOString(),

      // Datos de ingresos
      generalStats,
      monthlyData,
      statusDistribution,

      // Datos de gastos
      expenseStats,
      monthlyExpenses,

      // Análisis de ganancia
      profitAnalysis,

      // Métricas clave
      summary: {
        totalProjects: projects.length,
        totalExpenses: expenses.length,
        totalIncome: profitAnalysis.yearTotals.totalIncome || 0,
        totalExpenses: profitAnalysis.yearTotals.totalExpenses || 0,
        netProfit: profitAnalysis.yearTotals.totalProfit || 0,
        profitMargin: profitAnalysis.yearTotals.avgProfitMargin || 0
      }
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-financiero-completo-${selectedYear}-MXN.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-gray-300 text-lg">Cargando reportes financieros...</span>
              <div className="text-sm text-gray-500">
                Proyectos: {projects.length} | Gastos: {expenses.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay datos
  if (!isLoading && projects.length === 0 && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col justify-center items-center py-20">
            <div className="text-center">
              <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-300 mb-2">No hay datos disponibles</h2>
              <p className="text-gray-500 mb-6">
                Crea algunos proyectos y registra gastos para ver los reportes financieros
              </p>
              <button
                onClick={forceReload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Datos
              </button>
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
              <h1 className="text-3xl font-bold text-gray-100 mb-2">Reportes Financieros Completos</h1>
              <p className="text-gray-400">
                Análisis integral de ingresos, gastos y rentabilidad - <span className="text-green-400 font-semibold">Pesos Mexicanos (MXN)</span>
                <span className="ml-2 text-xs bg-green-600 bg-opacity-20 px-2 py-1 rounded">
                  🔄 Sincronización automática
                </span>
              </p>
            </div>

            {/* Controles */}
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-blue-500"
              >
                <option value="profit">Vista: Ganancia Neta</option>
                <option value="income">Vista: Solo Ingresos</option>
                <option value="expenses">Vista: Solo Gastos</option>
              </select>

              <button
                onClick={forceReload}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                title="Recargar datos"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar
              </button>

              <button
                onClick={exportReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>

          {/* Indicador de estado mejorado */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-400">{projects.length} proyectos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              <span className="text-gray-400">{expenses.length} gastos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-400">
                Actualizado: {new Date().toLocaleTimeString()}
              </span>
            </div>
            {profitAnalysis.yearTotals.avgProfitMargin && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-400">
                  Margen: {profitAnalysis.yearTotals.avgProfitMargin.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tarjetas de estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrencyMXN(profitAnalysis.yearTotals.totalIncome || 0)}
            icon={TrendingUp}
            color="text-green-400"
            subtitle={`${selectedYear}`}
          />

          <StatCard
            title="Gastos Totales"
            value={formatCurrencyMXN(profitAnalysis.yearTotals.totalExpenses || 0)}
            icon={TrendingDown}
            color="text-red-400"
            subtitle={`${selectedYear}`}
          />

          <StatCard
            title="Ganancia Neta"
            value={formatCurrencyMXN(profitAnalysis.yearTotals.totalProfit || 0)}
            icon={Calculator}
            color={profitAnalysis.yearTotals.totalProfit >= 0 ? "text-green-400" : "text-red-400"}
            subtitle="Ingresos - Gastos"
          />

          <StatCard
            title="Margen de Ganancia"
            value={`${(profitAnalysis.yearTotals.avgProfitMargin || 0).toFixed(1)}%`}
            icon={Percent}
            color={profitAnalysis.yearTotals.avgProfitMargin >= 20 ? "text-green-400" :
                  profitAnalysis.yearTotals.avgProfitMargin >= 10 ? "text-yellow-400" : "text-red-400"}
            subtitle="Rentabilidad promedio"
          />

          <StatCard
            title="Proyectos Activos"
            value={generalStats.activeProjects || 0}
            icon={Users}
            color="text-blue-400"
            subtitle={`de ${generalStats.totalProjects || 0} totales`}
          />
        </div>

        {/* Gráfico principal - Análisis de Ganancia */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-100">
                {viewMode === 'profit' ? 'Análisis de Ganancia Neta' :
                 viewMode === 'income' ? 'Análisis de Ingresos' :
                 'Análisis de Gastos'} {selectedYear}
              </h3>
              <p className="text-gray-400 text-sm">
                {viewMode === 'profit' ? 'Comparación de ingresos, gastos y ganancia neta (MXN)' :
                 viewMode === 'income' ? 'Desglose de ingresos por mes (MXN)' :
                 'Desglose de gastos por categoría (MXN)'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-lg transition-colors ${
                  chartType === 'bar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded-lg transition-colors ${
                  chartType === 'line' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'profit' ? (
                chartType === 'bar' ? (
                  <ComposedChart data={profitAnalysis.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatCompactNumberMXN} />
                    <Tooltip content={<ProfitTooltip />} />
                    <Legend />
                    <Bar dataKey="ingresos" name="Ingresos" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="gastos" name="Gastos" fill={CHART_COLORS.danger} radius={[2, 2, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="ganancia"
                      name="Ganancia Neta"
                      stroke={CHART_COLORS.success}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                ) : (
                  <LineChart data={profitAnalysis.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatCompactNumberMXN} />
                    <Tooltip content={<ProfitTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ingresos"
                      name="Ingresos"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gastos"
                      name="Gastos"
                      stroke={CHART_COLORS.danger}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.danger, strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ganancia"
                      name="Ganancia Neta"
                      stroke={CHART_COLORS.success}
                      strokeWidth={4}
                      dot={{ fill: CHART_COLORS.success, strokeWidth: 2, r: 5 }}
                    />
                  </LineChart>
                )
              ) : viewMode === 'income' ? (
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatCompactNumberMXN} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="ingresosRecurrentes"
                    stackId="1"
                    name="Ingresos Recurrentes"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.6}
                  />
                  {showInstallation && (
                    <Area
                      type="monotone"
                      dataKey="ingresosInstalacion"
                      stackId="1"
                      name="Instalaciones"
                      stroke={CHART_COLORS.secondary}
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.6}
                    />
                  )}
                </AreaChart>
              ) : (
                <BarChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatCompactNumberMXN} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="gastosFijos" name="Gastos Fijos" fill="#3B82F6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gastosVariables" name="Gastos Variables" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gastosMarketing" name="Marketing" fill="#10B981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gastosOperativos" name="Operativos" fill="#F59E0B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gastosOtros" name="Otros" fill="#6B7280" radius={[2, 2, 0, 0]} /> {/* Added 'Otros' category */}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {viewMode === 'income' && (
            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={showInstallation}
                  onChange={(e) => setShowInstallation(e.target.checked)}
                  className="rounded"
                />
                Mostrar ingresos por instalación
              </label>
            </div>
          )}
        </div>

        {/* Grid de gráficos secundarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Distribución de gastos por categoría */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-100">Distribución de Gastos</h3>
              <p className="text-gray-400 text-sm">Por categoría ({selectedYear})</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseStats.categoryDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {/* ERROR 1.1: Solución - Modificar el mapeo de colores para usar entry.color */}
                    {(expenseStats.categoryDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrencyMXN(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-2">
              {(expenseStats.categoryDistribution || []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color || '#6B7280' }}
                      />
                      <span className="text-gray-300">{item.name}</span>
                    </div>
                    <div className="text-gray-400">
                      {formatCurrencyMXN(item.value)} ({item.percentage}%)
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Distribución de proyectos por estado */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-100">Estado de Proyectos</h3>
              <p className="text-gray-400 text-sm">Distribución actual</p>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-2">
              {statusDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <div className="text-gray-400">
                    {item.value} ({item.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla resumen mensual */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-bold text-gray-100">
              Resumen Mensual {selectedYear}
            </h3>
            <p className="text-gray-400 text-sm">
              {viewMode === 'income' ? 'Análisis detallado de ingresos por mes (MXN)' :
               viewMode === 'expenses' ? 'Análisis detallado de gastos por mes (MXN)' :
               'Análisis completo por mes (MXN)'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">Mes</th>
                  {/* ERROR 1.2: Solución - Actualizar headers de tabla según viewMode */}
                  {viewMode === 'income' ? (
                    <>
                      <th className="text-right p-4 text-gray-300 font-medium">Ingresos Totales</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Recurrentes</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Instalaciones</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Proyectos</th>
                    </>
                  ) : viewMode === 'expenses' ? (
                    <>
                      <th className="text-right p-4 text-gray-300 font-medium">Gastos Fijos</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Gastos Variables</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Marketing</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Operativos</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Otros</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Total Mes</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right p-4 text-gray-300 font-medium">Ingresos</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Gastos</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Ganancia</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Margen %</th>
                      <th className="text-right p-4 text-gray-300 font-medium">Proyectos</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {viewMode === 'income' ? (
                  // Vista de solo ingresos
                  monthlyData.map((month, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-4 text-gray-100 font-medium">{month.month}</td>
                      <td className="p-4 text-right text-green-400 font-bold">
                        {formatCurrencyMXN((month.ingresosRecurrentes || 0) + (month.ingresosInstalacion || 0))}
                      </td>
                      <td className="p-4 text-right text-blue-400 font-medium">
                        {formatCurrencyMXN(month.ingresosRecurrentes || 0)}
                      </td>
                      <td className="p-4 text-right text-purple-400 font-medium">
                        {formatCurrencyMXN(month.ingresosInstalacion || 0)}
                      </td>
                      <td className="p-4 text-right text-gray-300">
                        {month.proyectosActivos || 0}
                      </td>
                    </tr>
                  ))
                ) : viewMode === 'expenses' ? (
                  // ERROR 1.2: Solución - Nueva vista solo gastos
                  monthlyExpenses.map((month, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-4 text-gray-100 font-medium">{month.month}</td>
                      <td className="p-4 text-right text-blue-400 font-medium">
                        {formatCurrencyMXN(month.gastosFijos || 0)}
                      </td>
                      <td className="p-4 text-right text-red-400 font-medium">
                        {formatCurrencyMXN(month.gastosVariables || 0)}
                      </td>
                      <td className="p-4 text-right text-green-400 font-medium">
                        {formatCurrencyMXN(month.gastosMarketing || 0)}
                      </td>
                      <td className="p-4 text-right text-orange-400 font-medium">
                        {formatCurrencyMXN(month.gastosOperativos || 0)}
                      </td>
                      <td className="p-4 text-right text-gray-300 font-medium">
                        {formatCurrencyMXN(month.gastosOtros || 0)}
                      </td>
                      <td className="p-4 text-right text-gray-300 font-bold">
                        {formatCurrencyMXN(month.totalMes || 0)}
                      </td>
                    </tr>
                  ))
                ) : (
                  // Vista completa (ganancia/gastos) - mantener existente
                  profitAnalysis.monthlyData.map((month, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="p-4 text-gray-100 font-medium">{month.month}</td>
                      <td className="p-4 text-right text-green-400 font-medium">
                        {formatCurrencyMXN(month.ingresos)}
                      </td>
                      <td className="p-4 text-right text-red-400 font-medium">
                        {formatCurrencyMXN(month.gastos)}
                      </td>
                      <td className={`p-4 text-right font-bold ${
                        month.ganancia >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrencyMXN(month.ganancia)}
                      </td>
                      <td className={`p-4 text-right ${
                        month.margenPorcentaje >= 20 ? 'text-green-400' :
                        month.margenPorcentaje >= 10 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {month.margenPorcentaje.toFixed(1)}%
                      </td>
                      <td className="p-4 text-right text-gray-300">
                        {monthlyData.find(m => m.month === month.month)?.proyectosActivos || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-700">
                <tr>
                  <td className="p-4 text-gray-100 font-bold">TOTALES</td>
                  {viewMode === 'income' ? (
                    <>
                      <td className="p-4 text-right text-green-400 font-bold">
                        {formatCurrencyMXN(
                          monthlyData.reduce((sum, m) => sum + (m.ingresosRecurrentes || 0) + (m.ingresosInstalacion || 0), 0)
                        )}
                      </td>
                      <td className="p-4 text-right text-blue-400 font-bold">
                        {formatCurrencyMXN(
                          monthlyData.reduce((sum, m) => sum + (m.ingresosRecurrentes || 0), 0)
                        )}
                      </td>
                      <td className="p-4 text-right text-purple-400 font-bold">
                        {formatCurrencyMXN(
                          monthlyData.reduce((sum, m) => sum + (m.ingresosInstalacion || 0), 0)
                        )}
                      </td>
                      <td className="p-4 text-right text-gray-300 font-bold">
                        {generalStats.activeProjects || 0}
                      </td>
                    </>
                  ) : viewMode === 'expenses' ? (
                    <>
                      <td className="p-4 text-right text-blue-400 font-bold">
                        {formatCurrencyMXN(monthlyExpenses.reduce((sum, m) => sum + (m.gastosFijos || 0), 0))}
                      </td>
                      <td className="p-4 text-right text-red-400 font-bold">
                        {formatCurrencyMXN(monthlyExpenses.reduce((sum, m) => sum + (m.gastosVariables || 0), 0))}
                      </td>
                      <td className="p-4 text-right text-green-400 font-bold">
                        {formatCurrencyMXN(monthlyExpenses.reduce((sum, m) => sum + (m.gastosMarketing || 0), 0))}
                      </td>
                      <td className="p-4 text-right text-orange-400 font-bold">
                        {formatCurrencyMXN(monthlyExpenses.reduce((sum, m) => sum + (m.gastosOperativos || 0), 0))}
                      </td>
                      <td className="p-4 text-right text-gray-300 font-bold">
                        {formatCurrencyMXN(monthlyExpenses.reduce((sum, m) => sum + (m.gastosOtros || 0), 0))}
                      </td>
                      <td className="p-4 text-right text-gray-300 font-bold">
                        {formatCurrencyMXN(monthlyExpenses.reduce((sum, m) => sum + (m.totalMes || 0), 0))}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-right text-green-400 font-bold">
                        {formatCurrencyMXN(profitAnalysis.yearTotals.totalIncome || 0)}
                      </td>
                      <td className="p-4 text-right text-red-400 font-bold">
                        {formatCurrencyMXN(profitAnalysis.yearTotals.totalExpenses || 0)}
                      </td>
                      <td className={`p-4 text-right font-bold ${
                        (profitAnalysis.yearTotals.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrencyMXN(profitAnalysis.yearTotals.totalProfit || 0)}
                      </td>
                      <td className={`p-4 text-right font-bold ${
                        (profitAnalysis.yearTotals.avgProfitMargin || 0) >= 20 ? 'text-green-400' :
                        (profitAnalysis.yearTotals.avgProfitMargin || 0) >= 10 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {(profitAnalysis.yearTotals.avgProfitMargin || 0).toFixed(1)}%
                      </td>
                      <td className="p-4 text-right text-gray-300 font-bold">
                        {generalStats.activeProjects || 0}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Insights y recomendaciones mejorados */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-gray-100 mb-4">📊 Insights Financieros</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">
                  Margen de ganancia promedio: <span className="font-bold text-green-400">
                    {(profitAnalysis.yearTotals.avgProfitMargin || 0).toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-gray-300">
                  Gastos fijos mensuales: <span className="font-bold text-blue-400">
                    {formatCurrencyMXN(expenseStats.fixedExpenses / 12 || 0)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-300">
                  Punto de equilibrio: <span className="font-bold text-yellow-400">
                    {formatCurrencyMXN(expenseStats.monthlyAverageExpenses || 0)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">
                  ROI proyectado: <span className="font-bold text-purple-400">
                    {profitAnalysis.yearTotals.totalExpenses > 0
                      ? ((profitAnalysis.yearTotals.totalProfit / profitAnalysis.yearTotals.totalExpenses) * 100).toFixed(1)
                      : 0}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-gray-100 mb-4">💡 Recomendaciones</h3>
            <div className="space-y-3 text-sm text-gray-300">
              {(profitAnalysis.yearTotals.avgProfitMargin || 0) < 20 && (
                <div className="p-3 bg-yellow-600 bg-opacity-20 rounded-lg border border-yellow-600 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p>Margen bajo: considera optimizar gastos o aumentar precios.</p>
                </div>
              )}

              {expenseStats.variableExpenses > expenseStats.fixedExpenses && (
                <div className="p-3 bg-blue-600 bg-opacity-20 rounded-lg border border-blue-600 flex items-start gap-2">
                  <Target className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p>Gastos variables altos: evalúa convertir algunos en gastos fijos para mejor control.</p>
                </div>
              )}

              {(generalStats.activeProjects || 0) < 10 && (
                <div className="p-3 bg-green-600 bg-opacity-20 rounded-lg border border-green-600 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p>Oportunidad de crecimiento: aumentar la base de clientes activos.</p>
                </div>
              )}

              {(profitAnalysis.yearTotals.totalProfit || 0) < 0 && (
                <div className="p-3 bg-red-600 bg-opacity-20 rounded-lg border border-red-600 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p>Pérdidas detectadas: revisar estrategia de precios y reducir gastos no esenciales.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FinancialReports;