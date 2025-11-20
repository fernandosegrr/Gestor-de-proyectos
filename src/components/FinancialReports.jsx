import React, { useState, useEffect, useRef } from 'react';
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
  Calculator,
  FileText,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

import {
  dataManager,
  useDataSync,
  DATA_EVENTS,
  initializeData
} from '../utils/dataSync';

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 1 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12
    }
  }
};

// Función local para calcular profit analysis
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

    // Calcular margen promedio anual
    yearTotals.avgProfitMargin = yearTotals.totalIncome > 0
      ? (yearTotals.totalProfit / yearTotals.totalIncome * 100)
      : 0;

    return {
      monthlyData: netProfitData,
      yearTotals
    };
  } catch (error) {
    console.error('❌ Error calculando profit analysis:', error);
    return { monthlyData: [], yearTotals: { totalIncome: 0, totalExpenses: 0, totalProfit: 0, avgProfitMargin: 0 } };
  }
};

const FinancialReports = () => {
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState('bar');
  const [showInstallation, setShowInstallation] = useState(true);
  const [viewMode, setViewMode] = useState('profit'); // 'income', 'expenses', 'profit'
  const reportRef = useRef(null); // Referencia para exportar a PDF

  // Datos calculados
  const [monthlyData, setMonthlyData] = useState([]);
  const [generalStats, setGeneralStats] = useState({});
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [expenseStats, setExpenseStats] = useState({});
  const [profitAnalysis, setProfitAnalysis] = useState({ monthlyData: [], yearTotals: {} });

  // Métricas adicionales
  const [avgRevenuePerProject, setAvgRevenuePerProject] = useState(0);
  const [projectedAnnualRevenue, setProjectedAnnualRevenue] = useState(0);

  const loadAndProcessData = async (projectsData, expensesData) => {
    try {
      if (!Array.isArray(projectsData)) projectsData = [];
      if (!Array.isArray(expensesData)) expensesData = [];

      setProjects(projectsData);
      setExpenses(expensesData);

      const years = getAvailableYears(projectsData);
      if (Array.isArray(years) && years.length > 0) {
        setAvailableYears(years);
      }

      const monthly = calculateMonthlyIncome(projectsData, selectedYear);
      const stats = calculateGeneralStats(projectsData);
      const distribution = prepareStatusDistributionData(projectsData);

      setMonthlyData(Array.isArray(monthly) ? monthly : []);
      setGeneralStats(stats || {});
      setStatusDistribution(Array.isArray(distribution) ? distribution : []);

      const monthlyExp = dataManager.calculateMonthlyExpenses(expensesData, selectedYear);
      const expStats = dataManager.calculateExpenseStats(expensesData);

      setMonthlyExpenses(Array.isArray(monthlyExp) ? monthlyExp : []);
      setExpenseStats(expStats || {});

      const profitData = calculateNetProfitLocal(projectsData, expensesData, selectedYear);
      setProfitAnalysis(profitData || { monthlyData: [], yearTotals: {} });

      // Calcular métricas adicionales
      const activeProjectsCount = stats.activeProjects || 1; // Evitar división por cero
      const totalIncome = profitData.yearTotals.totalIncome || 0;

      setAvgRevenuePerProject(totalIncome / activeProjectsCount);

      // Proyección simple: promedio mensual * 12
      const currentMonth = new Date().getMonth() + 1;
      const avgMonthlyIncome = totalIncome / (selectedYear === new Date().getFullYear() ? currentMonth : 12);
      setProjectedAnnualRevenue(avgMonthlyIncome * 12);

    } catch (error) {
      console.error('❌ Error procesando datos:', error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        await initializeData();
        const [projectsData, expensesData] = await Promise.all([
          dataManager.loadProjects(),
          dataManager.loadExpenses()
        ]);
        await loadAndProcessData(projectsData, expensesData);
      } catch (error) {
        console.error('❌ Error loading data:', error);
        await loadAndProcessData([], []);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [selectedYear]);

  useDataSync(DATA_EVENTS.PROJECTS_UPDATED, async (updatedProjects) => {
    const projectsData = Array.isArray(updatedProjects) ? updatedProjects : [];
    await loadAndProcessData(projectsData, expenses);
  });

  useDataSync(DATA_EVENTS.EXPENSES_UPDATED, async (updatedExpenses) => {
    const expensesData = Array.isArray(updatedExpenses) ? updatedExpenses : [];
    await loadAndProcessData(projects, expensesData);
  });

  const forceReload = async () => {
    try {
      setIsLoading(true);
      const [projectsData, expensesData] = await Promise.all([
        dataManager.loadProjects(),
        dataManager.loadExpenses()
      ]);
      await loadAndProcessData(projectsData, expensesData);
    } catch (error) {
      console.error('❌ Error reloading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#111827', // bg-gray-900
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`reporte-financiero-${selectedYear}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF. Intenta de nuevo.');
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend, percentage, delay = 0 }) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, translateY: -5 }}
      className="bg-gray-800/90 backdrop-blur-xl rounded-xl p-6 border border-gray-600/50 shadow-xl hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium tracking-wide">{title}</p>
          <p className={`text-2xl font-bold mt-2 ${color} drop-shadow-sm`}>{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1 font-light">{subtitle}</p>
          )}
          {percentage !== undefined && (
            <div className="flex items-center gap-1 mt-3">
              <div className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${percentage > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                percentage < 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                }`}>
                {percentage > 0 ? <TrendingUp size={10} /> : percentage < 0 ? <TrendingDown size={10} /> : <Activity size={10} />}
                {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('400', '500')}/10 flex-shrink-0 border border-${color.replace('text-', 'border-').replace('400', '500')}/20`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </motion.div>
  );

  const ProfitTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-xl p-4 shadow-2xl">
          <p className="text-gray-200 font-bold mb-3 border-b border-gray-700 pb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: entry.color }}></span>
                <span className="text-gray-300">
                  {entry.dataKey === 'ingresos' ? 'Ingresos' :
                    entry.dataKey === 'gastos' ? 'Gastos' :
                      entry.dataKey === 'ganancia' ? 'Ganancia Neta' : entry.dataKey}
                </span>
              </div>
              <span className="font-mono font-medium" style={{ color: entry.color }}>
                {formatCurrencyMXN(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex justify-center items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
          </div>
          <span className="text-gray-400 text-lg font-light tracking-wider">Cargando Finanzas...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0B0F19] to-gray-900 p-4 md:p-8 text-gray-100 font-sans selection:bg-blue-500/30">
      <motion.div
        ref={reportRef}
        variants={containerVariants}
        animate="visible"
        className="max-w-7xl mx-auto space-y-8"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-gray-800 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Reportes Financieros
              </h1>
            </div>
            <p className="text-gray-400 max-w-2xl leading-relaxed">
              Análisis integral de rendimiento financiero.
              <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                En vivo
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="appearance-none pl-10 pr-8 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none cursor-pointer hover:bg-gray-800"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <div className="h-8 w-px bg-gray-800 mx-2 hidden md:block"></div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={forceReload}
              className="p-2.5 bg-gray-800/50 text-gray-300 rounded-xl border border-gray-700 hover:bg-gray-700 hover:text-white transition-all"
              title="Actualizar datos"
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportToPDF}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 border border-blue-500/20 flex items-center gap-2 font-medium transition-all"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </motion.button>
          </div>
        </motion.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrencyMXN(profitAnalysis.yearTotals.totalIncome || 0)}
            icon={TrendingUp}
            color="text-emerald-400"
            subtitle={`Acumulado ${selectedYear}`}
            percentage={12.5} // Ejemplo estático, idealmente calcular vs año anterior
          />
          <StatCard
            title="Gastos Operativos"
            value={formatCurrencyMXN(profitAnalysis.yearTotals.totalExpenses || 0)}
            icon={TrendingDown}
            color="text-rose-400"
            subtitle={`Acumulado ${selectedYear}`}
            percentage={-5.2}
          />
          <StatCard
            title="Ganancia Neta"
            value={formatCurrencyMXN(profitAnalysis.yearTotals.totalProfit || 0)}
            icon={Calculator}
            color={profitAnalysis.yearTotals.totalProfit >= 0 ? "text-blue-400" : "text-rose-400"}
            subtitle="Margen neto"
            percentage={profitAnalysis.yearTotals.avgProfitMargin}
          />
          <StatCard
            title="Proyección Anual"
            value={formatCurrencyMXN(projectedAnnualRevenue)}
            icon={Target}
            color="text-purple-400"
            subtitle="Basado en promedio actual"
          />
        </div>

        {/* Main Chart Section */}
        <motion.div
          variants={itemVariants}
          className="bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-gray-600/50 shadow-xl"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                Análisis de Rentabilidad
                <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300 border border-gray-600">MXN</span>
              </h3>
              <p className="text-gray-400 text-sm mt-1">Comparativa mensual de flujo de caja</p>
            </div>

            <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-700/50">
              {['profit', 'income', 'expenses'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === mode
                    ? 'bg-gray-700 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                  {mode === 'profit' ? 'Ganancia' : mode === 'income' ? 'Ingresos' : 'Gastos'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'profit' ? (
                <ComposedChart data={profitAnalysis.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={formatCompactNumberMXN}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip content={<ProfitTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="ingresos"
                    name="Ingresos"
                    fill="url(#colorIngresos)"
                    stroke={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="gastos"
                    name="Gastos"
                    fill="url(#colorGastos)"
                    stroke={CHART_COLORS.danger}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Line
                    type="monotone"
                    dataKey="ganancia"
                    name="Ganancia Neta"
                    stroke={CHART_COLORS.success}
                    strokeWidth={3}
                    dot={{ fill: '#0B0F19', stroke: CHART_COLORS.success, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </ComposedChart>
              ) : viewMode === 'income' ? (
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRecurrentes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorInstalacion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatCompactNumberMXN} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={<ProfitTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Area
                    type="monotone"
                    dataKey="ingresosRecurrentes"
                    stackId="1"
                    name="Recurrentes"
                    stroke={CHART_COLORS.primary}
                    fill="url(#colorRecurrentes)"
                    strokeWidth={2}
                  />
                  {showInstallation && (
                    <Area
                      type="monotone"
                      dataKey="ingresosInstalacion"
                      stackId="1"
                      name="Instalaciones"
                      stroke={CHART_COLORS.secondary}
                      fill="url(#colorInstalacion)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              ) : (
                <BarChart data={monthlyExpenses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatCompactNumberMXN} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip content={<ProfitTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="gastosFijos" stackId="a" name="Fijos" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="gastosVariables" stackId="a" name="Variables" fill="#EF4444" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="gastosMarketing" stackId="a" name="Marketing" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="gastosOperativos" stackId="a" name="Operativos" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Secondary Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Distribution */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-600/50 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-100 mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-400" />
              Distribución de Gastos
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-64 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseStats.categoryDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {(expenseStats.categoryDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#6B7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrencyMXN(value)}
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#F3F4F6' }}
                      itemStyle={{ color: '#E5E7EB' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {(expenseStats.categoryDistribution || []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-gray-700"
                        style={{ backgroundColor: item.color || '#6B7280' }}
                      />
                      <span className="text-gray-200 font-medium group-hover:text-white transition-colors">{item.name}</span>
                    </div>
                    <div className="text-gray-300 font-mono font-semibold">
                      {item.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Project Status */}
          <motion.div
            variants={itemVariants}
            className="bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-600/50 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-100 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Estado de Proyectos
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-64 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem', color: '#F3F4F6' }}
                      itemStyle={{ color: '#E5E7EB' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {statusDistribution.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm group">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full ring-2 ring-gray-700"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-gray-200 font-medium group-hover:text-white transition-colors">{item.name}</span>
                    </div>
                    <div className="text-gray-300 font-mono font-semibold">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Detailed Table Section */}
        <motion.div
          variants={itemVariants}
          className="bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-600/50 shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Detalle Mensual
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-4 font-medium border-b border-gray-700">Mes</th>
                  <th className="p-4 font-medium border-b border-gray-700 text-right">Ingresos</th>
                  <th className="p-4 font-medium border-b border-gray-700 text-right">Gastos</th>
                  <th className="p-4 font-medium border-b border-gray-700 text-right">Ganancia Neta</th>
                  <th className="p-4 font-medium border-b border-gray-700 text-right">Margen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {profitAnalysis.monthlyData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-700/30 transition-colors text-sm"
                  >
                    <td className="p-4 font-medium text-gray-200">{row.month}</td>
                    <td className="p-4 text-right text-emerald-400 font-mono">
                      {formatCurrencyMXN(row.ingresos)}
                    </td>
                    <td className="p-4 text-right text-rose-400 font-mono">
                      {formatCurrencyMXN(row.gastos)}
                    </td>
                    <td className={`p-4 text-right font-mono font-bold ${row.ganancia >= 0 ? 'text-blue-400' : 'text-rose-400'
                      }`}>
                      {formatCurrencyMXN(row.ganancia)}
                    </td>
                    <td className="p-4 text-right text-gray-300 font-mono">
                      {row.margenPorcentaje}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-900/80 font-bold text-gray-100">
                <tr>
                  <td className="p-4">Total Anual</td>
                  <td className="p-4 text-right text-emerald-400 font-mono">
                    {formatCurrencyMXN(profitAnalysis.yearTotals.totalIncome || 0)}
                  </td>
                  <td className="p-4 text-right text-rose-400 font-mono">
                    {formatCurrencyMXN(profitAnalysis.yearTotals.totalExpenses || 0)}
                  </td>
                  <td className={`p-4 text-right font-mono ${(profitAnalysis.yearTotals.totalProfit || 0) >= 0 ? 'text-blue-400' : 'text-rose-400'
                    }`}>
                    {formatCurrencyMXN(profitAnalysis.yearTotals.totalProfit || 0)}
                  </td>
                  <td className="p-4 text-right text-gray-300 font-mono">
                    {(profitAnalysis.yearTotals.avgProfitMargin || 0).toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FinancialReports;