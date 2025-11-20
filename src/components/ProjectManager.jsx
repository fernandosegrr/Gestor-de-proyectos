import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, DollarSign, Eye, Clock, CheckCircle, Edit, Trash2, AlertCircle, X, Wifi, WifiOff, Download, Save, FileText, Filter, SortAsc, SortDesc, FileSpreadsheet, BadgeCheck, ChevronDown, ChevronUp, User, MapPin } from 'lucide-react';

// Importar funciones centralizadas del sistema dataSync
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import {
  dataManager,
  useDataSync,
  useConnectionState,
  DATA_EVENTS,
  initializeData
} from '../utils/dataSync';

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 10 }
  }
};

// --- SUB-COMPONENTE: Tarjeta de Proyecto (Con arreglos de texto cortado) ---
const ProjectCard = ({ project, onEdit, onMarkPaid, onDelete, getStatusInfo, getDaysDifference, getDaysUntilTrialEnd, getStatusIcon }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = getStatusInfo(project.status);
  const daysUntilCutoff = getDaysDifference(project.cutoffDate);
  const daysUntilTrialEnd = getDaysUntilTrialEnd(project);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-gray-600/50 hover:shadow-2xl hover:border-blue-400/50 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* --- SECCIÓN VISIBLE SIEMPRE (Resumen) --- */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-800 relative">

        {/* Encabezado: Nombre y Estado */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-2">
            {/* CORRECCIÓN: break-words y leading-tight para nombres largos */}
            <h3 className="text-lg font-bold text-gray-100 leading-tight break-words" title={project.name}>{project.name}</h3>
            <span className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${statusInfo.color}`}>
              {getStatusIcon(project.status)}
              {statusInfo.label}
            </span>
          </div>

          {/* Botones de Acción Rápida */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onMarkPaid(project); }}
              className="p-2 bg-gray-700 hover:bg-green-900/50 text-green-400 rounded-lg transition-colors"
              title="Registrar Pago (Actualizar fecha corte)"
            >
              <BadgeCheck className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(project); }}
              className="p-2 bg-gray-700 hover:bg-blue-900/50 text-blue-400 rounded-lg transition-colors"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="p-2 bg-gray-700 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumen de Fechas y Dinero */}
        <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-2 rounded-lg">
          {/* Columna Izq: Precio */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Mensualidad</span>
            <div className="flex items-center text-green-400 font-bold text-lg">
              <DollarSign className="w-4 h-4" />
              {project.monthlyPrice || '0'}
            </div>
          </div>

          {/* Columna Der: Fechas */}
          <div className="flex flex-col items-end justify-center text-right">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              {project.status === 'semana_gratis' ? 'Fin Prueba' : 'Próximo Corte'}
            </span>

            {project.status === 'establecido' && project.cutoffDate ? (
              <div className={`text-sm font-bold ${daysUntilCutoff <= 3 ? 'text-red-400' : 'text-gray-200'}`}>
                {new Date(project.cutoffDate + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                <div className="text-[10px] font-normal opacity-75">
                  {daysUntilCutoff === 0 ? 'Vence Hoy' : daysUntilCutoff < 0 ? `Vencido hace ${Math.abs(daysUntilCutoff)}d` : `Faltan ${daysUntilCutoff} días`}
                </div>
              </div>
            ) : project.status === 'semana_gratis' && daysUntilTrialEnd !== null ? (
              <div className={`text-sm font-bold ${daysUntilTrialEnd <= 1 ? 'text-red-400' : 'text-blue-300'}`}>
                {daysUntilTrialEnd} días rest.
              </div>
            ) : (
              <span className="text-gray-500 text-sm italic">--</span>
            )}
          </div>
        </div>
      </div>

      {/* --- BOTÓN DESPLEGABLE (Toggle) --- */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-center items-center py-1 bg-gray-700/30 hover:bg-gray-700/60 transition-colors text-gray-400 hover:text-white border-t border-gray-700/50"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* --- SECCIÓN OCULTA (Detalles Extras) --- */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800/50 overflow-hidden"
          >
            <div className="p-4 space-y-3 text-sm border-t border-gray-700/30">

              {/* Datos Secundarios */}
              {project.clientName && (
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="w-4 h-4 text-blue-400 shrink-0" />
                  {/* CORRECCIÓN: break-words para nombres largos de clientes */}
                  <span className="break-words">{project.clientName}</span>
                </div>
              )}

              {project.startDate && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>Inicio: {new Date(project.startDate + 'T00:00:00').toLocaleDateString('es-MX')}</span>
                </div>
              )}

              {project.installationCost && parseFloat(project.installationCost) > 0 && (
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
                  <span>Instalación: ${project.installationCost} {project.installationDate ? `(${project.installationDate})` : ''}</span>
                </div>
              )}

              {/* Bloque de Facturación */}
              {project.requiresBilling && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded p-3 space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase mb-1">
                    <FileText className="w-3 h-3" /> Facturación
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    <div className="text-xs text-gray-400 flex justify-between items-start">
                      <span className="shrink-0 mr-2">RFC:</span>
                      <span className="text-gray-200 font-mono text-right break-all">{project.rfc}</span>
                    </div>
                    {project.businessName && (
                      <div className="text-xs text-gray-400 flex justify-between items-start">
                        <span className="shrink-0 mr-2">Razón:</span>
                        {/* CORRECCIÓN: text-right, break-words y items-start para que baje de línea y se alinee a la derecha */}
                        <span className="text-gray-200 text-right break-words">{project.businessName}</span>
                      </div>
                    )}
                  </div>

                  {project.facturaGenerada && (
                    <div className="text-xs text-green-400 mt-2 pt-2 border-t border-purple-500/20 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 shrink-0" />
                      <span className="break-words">Factura {project.folioFactura} generada</span>
                    </div>
                  )}
                </div>
              )}

              {/* Descripción */}
              {project.description && (
                <div className="pt-2 border-t border-gray-700/50 mt-2">
                  {/* CORRECCIÓN: whitespace-pre-wrap respeta saltos de línea y break-words evita cortes */}
                  <p className="text-gray-400 italic text-xs whitespace-pre-wrap break-words">{project.description}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function ProjectManager() {
  // State variables
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '', status: 'demo', monthlyPrice: '', cutoffDate: '',
    description: '', startDate: '', clientName: '', trialDays: '7',
    installationCost: '', hasInstallationCost: false, installationDate: '',
    requiresBilling: false, rfc: '', businessName: '', customCutoffDate: false,
    facturaGenerada: false, folioFactura: '', fechaFactura: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);
  const [firebaseConfigData, setFirebaseConfigData] = useState({
    apiKey: '', authDomain: '', projectId: '', storageBucket: '',
    messagingSenderId: '', appId: '', customAppId: ''
  });
  const [filters, setFilters] = useState({
    status: 'all', sortBy: 'name', sortOrder: 'asc', cutoffDaysFilter: 'all'
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  const connectionState = useConnectionState();

  const statusOptions = [
    { value: 'demo', label: 'Demo', color: 'bg-gray-700 text-gray-200' },
    { value: 'semana_gratis', label: 'Semana Gratis', color: 'bg-blue-600 text-blue-100' },
    { value: 'establecido', label: 'Establecido', color: 'bg-green-600 text-green-100' },
    { value: 'pausado', label: 'Pausado', color: 'bg-yellow-600 text-yellow-100' },
    { value: 'cancelado', label: 'Cancelado', color: 'bg-red-600 text-red-100' }
  ];

  // --- LÓGICA DE PAGO ---
  const handleMarkAsPaid = async (project) => {
    try {
      if (!project.id) {
        showCustomAlert("Error: El proyecto no tiene ID válido.");
        return;
      }

      // 1. Calcular nueva fecha
      const nextCutoff = dataManager.calculateNextCutoffDate(project.cutoffDate || project.startDate);

      // 2. Crear objeto actualizado (reiniciando factura)
      const updatedProject = {
        ...project,
        cutoffDate: nextCutoff,
        facturaGenerada: false,
        folioFactura: '',
        fechaFactura: ''
      };

      // 3. GUARDAR EN BD
      await dataManager.updateProject(project.id, updatedProject);

      // 4. Actualizar estado local
      setProjects((prev) => prev.map(p => p.id === project.id ? updatedProject : p));

      setAlertMessage(`¡Pago registrado! Nueva fecha de corte: ${new Date(nextCutoff + 'T00:00:00').toLocaleDateString('es-MX')}`);
      setShowAlertModal(true);
    } catch (error) {
      console.error("Error updating payment:", error);
      showCustomAlert("Error al registrar pago: " + error.message);
    }
  };

  // Carga inicial
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        await initializeData();
        const loadedProjects = await dataManager.loadProjects();
        setProjects(loadedProjects || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setProjects([]);
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Sincronización
  useDataSync(DATA_EVENTS.PROJECTS_UPDATED, (updatedProjects) => {
    if (updatedProjects) {
      setProjects(prevProjects => {
        if (JSON.stringify(prevProjects) === JSON.stringify(updatedProjects)) return prevProjects;
        return updatedProjects;
      });
    }
  });

  // Auto-cálculo de fecha al crear
  useEffect(() => {
    if (formData.status === 'establecido' && formData.startDate && !formData.customCutoffDate) {
      const autoCalculatedDate = dataManager.calculateNextCutoffDate(formData.startDate);
      setFormData(prev => ({ ...prev, cutoffDate: autoCalculatedDate }));
    }
  }, [formData.startDate, formData.status, formData.customCutoffDate]);

  // Utilitarios UI
  const showCustomAlert = (message) => { setAlertMessage(message); setShowAlertModal(true); };
  const showCustomConfirm = (message, action) => { setConfirmMessage(message); setConfirmAction(() => action); setShowConfirmModal(true); };
  const handleConfirm = () => { if (confirmAction) confirmAction(); setShowConfirmModal(false); setConfirmAction(null); };
  const handleCancelConfirm = () => { setShowConfirmModal(false); setConfirmAction(null); };

  // Manejo del Formulario
  const handleSubmit = async () => {
    if (!formData.name.trim()) return showCustomAlert("El nombre del proyecto es obligatorio.");
    if (formData.requiresBilling && (!formData.rfc.trim() || !formData.businessName.trim())) return showCustomAlert("RFC y Razón Social son obligatorios para facturación.");

    setIsLoading(true);
    try {
      const dataToSave = { ...formData };

      // Limpieza de datos condicionales
      if (dataToSave.requiresBilling) {
        dataToSave.folioFactura = formData.facturaGenerada ? (formData.folioFactura || '') : '';
        dataToSave.fechaFactura = formData.facturaGenerada ? (formData.fechaFactura || '') : '';
      } else {
        dataToSave.facturaGenerada = false; dataToSave.folioFactura = ''; dataToSave.fechaFactura = '';
        dataToSave.rfc = ''; dataToSave.businessName = '';
      }

      if (!dataToSave.hasInstallationCost) { dataToSave.installationCost = ''; dataToSave.installationDate = ''; }
      delete dataToSave.hasInstallationCost; delete dataToSave.customCutoffDate;
      if (dataToSave.status === 'demo') dataToSave.trialDays = '';

      // Lógica fecha corte
      if (dataToSave.status === 'establecido' && dataToSave.startDate) {
        if (!formData.customCutoffDate && (!editingProject || !editingProject.cutoffDate)) {
          dataToSave.cutoffDate = dataManager.calculateNextCutoffDate(dataToSave.startDate);
        } else if (editingProject && !formData.customCutoffDate) {
          dataToSave.cutoffDate = editingProject.cutoffDate; // Mantener si editamos
        }
      } else {
        dataToSave.cutoffDate = '';
      }

      // Creación Cliente Automático
      if (dataToSave.clientName && dataToSave.clientName.trim()) {
        const clientExists = await dataManager.clientExists(dataToSave.clientName);
        if (!clientExists) {
          await dataManager.createClient({
            name: dataToSave.clientName.trim(),
            company: dataToSave.businessName || dataToSave.clientName,
            rfc: dataToSave.rfc || '',
            notes: `Auto-creado desde: ${dataToSave.name}`,
            createdAt: new Date().toISOString()
          });
        }
      }

      // Guardar/Actualizar
      let result;
      if (editingProject) {
        result = await dataManager.updateProject(editingProject.id, dataToSave);
        if (result.success) showCustomAlert("Proyecto actualizado exitosamente.");
      } else {
        result = await dataManager.createProject(dataToSave);
        if (result.success) showCustomAlert("Proyecto creado exitosamente.");
      }

      if (!result.success) throw new Error(result.error);
      resetForm();

    } catch (error) {
      console.error("Error saving project:", error);
      showCustomAlert("Error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (project) => {
    setFormData({
      name: project.name || '', status: project.status || 'demo',
      monthlyPrice: project.monthlyPrice || '', cutoffDate: project.cutoffDate || '',
      description: project.description || '', startDate: project.startDate || '',
      clientName: project.clientName || '', trialDays: project.trialDays || '7',
      installationCost: project.installationCost || '',
      hasInstallationCost: !!(project.installationCost && parseFloat(project.installationCost) > 0),
      installationDate: project.installationDate || '',
      requiresBilling: project.requiresBilling || false, rfc: project.rfc || '',
      businessName: project.businessName || '', customCutoffDate: false,
      facturaGenerada: !!project.facturaGenerada, folioFactura: project.folioFactura || '',
      fechaFactura: project.fechaFactura || ''
    });
    setEditingProject(project);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    showCustomConfirm('¿Eliminar proyecto?', async () => {
      setIsLoading(true);
      try {
        await dataManager.deleteProject(id);
        showCustomAlert("Proyecto eliminado.");
      } catch (e) { showCustomAlert(e.message); }
      finally { setIsLoading(false); }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '', status: 'demo', monthlyPrice: '', cutoffDate: '',
      description: '', startDate: '', clientName: '', trialDays: '7',
      installationCost: '', hasInstallationCost: false, installationDate: '',
      requiresBilling: false, rfc: '', businessName: '', customCutoffDate: false,
      facturaGenerada: false, folioFactura: '', fechaFactura: ''
    });
    setShowForm(false); setEditingProject(null);
  };

  // Helpers de Fechas y Estado
  const getStatusInfo = (status) => statusOptions.find(s => s.value === status) || statusOptions[0];
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

  const getDaysDifference = (futureDate) => {
    if (!futureDate) return null;
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [y, m, d] = futureDate.split('-').map(n => parseInt(n, 10));
      const target = new Date(y, m - 1, d);
      return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    } catch (e) { return null; }
  };

  const getDaysUntilTrialEnd = (project) => {
    if (!project.startDate || project.status !== 'semana_gratis') return null;
    const [y, m, d] = project.startDate.split('-').map(n => parseInt(n, 10));
    const end = new Date(y, m - 1, d);
    end.setDate(end.getDate() + parseInt(project.trialDays || 7));
    return getDaysDifference(end.toISOString().split('T')[0]);
  };

  // Exportar/Importar
  const exportToExcel = () => {
    try {
      const excelData = projects.map(p => ({
        'Nombre': p.name, 'Cliente': p.clientName, 'Estado': p.status,
        'Precio': p.monthlyPrice, 'Corte': p.cutoffDate, 'Descripción': p.description
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excelData), 'Proyectos');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `proyectos.xlsx`);
    } catch (e) { showCustomAlert("Error excel: " + e.message); }
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ projects, version: '1.0' }, null, 2);
    saveAs(new Blob([dataStr], { type: 'application/json' }), `backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const getFilteredAndSortedProjects = () => {
    let res = [...projects];
    if (filters.status !== 'all') res = res.filter(p => p.status === filters.status);
    if (filters.cutoffDaysFilter !== 'all') {
      res = res.filter(p => {
        const d = getDaysDifference(p.cutoffDate);
        if (filters.cutoffDaysFilter === 'overdue') return d !== null && d < 0;
        if (filters.cutoffDaysFilter === 'urgent') return d !== null && d >= 0 && d <= 3;
        if (filters.cutoffDaysFilter === 'soon') return d !== null && d >= 4 && d <= 7;
        if (filters.cutoffDaysFilter === 'later') return d !== null && d > 7;
        return true;
      });
    }
    res.sort((a, b) => {
      if (filters.sortBy === 'name') return filters.sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (filters.sortBy === 'monthlyPrice') return filters.sortOrder === 'asc' ? (a.monthlyPrice - b.monthlyPrice) : (b.monthlyPrice - a.monthlyPrice);
      return 0;
    });
    return res;
  };

  const filteredProjects = getFilteredAndSortedProjects();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0B0F19] to-gray-900 p-2 sm:p-4 md:p-6 lg:p-8 font-sans text-gray-100 overflow-x-hidden">

      {/* --- MODAL FORMULARIO --- */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[1000]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/95 backdrop-blur-xl rounded-2xl p-4 sm:p-6 w-[95vw] sm:w-full max-w-4xl shadow-2xl border border-gray-600/50"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-2xl font-bold text-gray-100">{editingProject ? 'Editar' : 'Nuevo'} Proyecto</h2>
              <button onClick={resetForm}><X className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nombre *</label>
                <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Cliente</label>
                <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2" value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Estado</label>
                <select className="w-full bg-gray-900 border border-gray-600 rounded p-2" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Precio Mensual</label>
                <input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2" value={formData.monthlyPrice} onChange={e => setFormData({ ...formData, monthlyPrice: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Fecha Inicio</label>
                <input type="date" className="w-full bg-gray-900 border border-gray-600 rounded p-2" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
              </div>

              {formData.status === 'establecido' && (
                <div className="md:col-span-2 bg-orange-900/30 border border-orange-500/50 rounded p-3">
                  <label className="block text-sm text-orange-300 mb-2">Fecha de Corte</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={!formData.customCutoffDate} onChange={() => setFormData(p => ({ ...p, customCutoffDate: false, cutoffDate: p.startDate ? dataManager.calculateNextCutoffDate(p.startDate) : '' }))} />
                      Automática
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={formData.customCutoffDate} onChange={() => setFormData(p => ({ ...p, customCutoffDate: true }))} />
                      Manual
                    </label>
                  </div>
                  {formData.customCutoffDate && (
                    <input type="date" className="mt-2 w-full bg-gray-900 border border-orange-500/50 rounded p-2" value={formData.cutoffDate} onChange={e => setFormData({ ...formData, cutoffDate: e.target.value })} />
                  )}
                  {!formData.customCutoffDate && formData.cutoffDate && <p className="text-xs text-orange-400 mt-1">Fecha calculada: {formData.cutoffDate}</p>}
                </div>
              )}

              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm text-gray-300 mb-1">Descripción</label>
                <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="md:col-span-2 border-t border-gray-700 pt-4">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={formData.hasInstallationCost} onChange={e => setFormData({ ...formData, hasInstallationCost: e.target.checked })} />
                  ¿Tiene costo de instalación?
                </label>
                {formData.hasInstallationCost && (
                  <div className="grid grid-cols-2 gap-4 mt-2 bg-gray-900/50 p-3 rounded">
                    <input type="number" placeholder="Costo $" className="bg-gray-800 border border-gray-600 rounded p-2" value={formData.installationCost} onChange={e => setFormData({ ...formData, installationCost: e.target.value })} />
                    <input type="date" className="bg-gray-800 border border-gray-600 rounded p-2" value={formData.installationDate} onChange={e => setFormData({ ...formData, installationDate: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="md:col-span-2 border-t border-gray-700 pt-4">
                <label className="flex items-center gap-2 text-purple-300 cursor-pointer font-medium">
                  <input type="checkbox" checked={formData.requiresBilling} onChange={e => setFormData({ ...formData, requiresBilling: e.target.checked })} />
                  ¿Requiere Facturación?
                </label>
                {formData.requiresBilling && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-purple-900/20 p-3 rounded border border-purple-500/30">
                    <input placeholder="RFC *" className="bg-gray-800 border border-gray-600 rounded p-2" value={formData.rfc} onChange={e => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })} />
                    <input placeholder="Razón Social *" className="bg-gray-800 border border-gray-600 rounded p-2" value={formData.businessName} onChange={e => setFormData({ ...formData, businessName: e.target.value })} />

                    <div className="md:col-span-2 mt-2 border-t border-purple-500/20 pt-2">
                      <label className="flex items-center gap-2 text-sm text-purple-200 mb-2">
                        <input type="checkbox" checked={formData.facturaGenerada} onChange={e => setFormData({ ...formData, facturaGenerada: e.target.checked })} />
                        ¿Ya se generó factura este mes?
                      </label>
                      {formData.facturaGenerada && (
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="Folio Factura" className="bg-gray-800 border border-gray-600 rounded p-2 text-sm" value={formData.folioFactura} onChange={e => setFormData({ ...formData, folioFactura: e.target.value })} />
                          <input type="date" className="bg-gray-800 border border-gray-600 rounded p-2 text-sm" value={formData.fechaFactura} onChange={e => setFormData({ ...formData, fechaFactura: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6 pt-4 border-t border-gray-700">
              <button onClick={handleSubmit} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2">
                <Save className="w-4 h-4" /> {editingProject ? 'Actualizar' : 'Guardar'}
              </button>
              <button onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg">Cancelar</button>
            </div>
          </motion.div>
        </div>, document.body
      )}

      {/* --- CUERPO PRINCIPAL --- */}
      <div className="max-w-[95vw] mx-auto bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg p-3 sm:p-4 md:p-6 lg:p-8 border border-gray-700/50">

        {/* Botonera Superior */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg shadow-blue-500/20 transition-all">
            <Plus className="w-5 h-5" /> Nuevo Proyecto
          </button>
          <button onClick={() => setShowFilterModal(true)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full transition-all">
            <Filter className="w-5 h-5" /> Filtros
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-full transition-all">
            <FileSpreadsheet className="w-5 h-5" /> Excel
          </button>
          <button onClick={exportData} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-full transition-all">
            <Download className="w-5 h-5" /> JSON
          </button>
        </div>

        {/* --- GRID DE PROYECTOS --- */}
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 md:gap-6"
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onMarkPaid={handleMarkAsPaid}
                onDelete={handleDelete}
                getStatusInfo={getStatusInfo}
                getDaysDifference={getDaysDifference}
                getDaysUntilTrialEnd={getDaysUntilTrialEnd}
                getStatusIcon={getStatusIcon}
              />
            ))}
            {filteredProjects.length === 0 && (
              <div className="col-span-full text-center text-gray-500 py-10">No se encontraron proyectos.</div>
            )}
          </motion.div>
        )}
      </div>

      {/* --- MODALES AUXILIARES (Alert, Confirm, Filter) --- */}
      {showAlertModal && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[2000]">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-blue-400"><AlertCircle className="w-6 h-6" /> <h3 className="font-bold text-white">Información</h3></div>
            <p className="text-gray-300 mb-6">{alertMessage}</p>
            <button onClick={() => setShowAlertModal(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded transition-colors">Aceptar</button>
          </div>
        </div>, document.body
      )}

      {showConfirmModal && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[2000]">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-yellow-400"><AlertCircle className="w-6 h-6" /> <h3 className="font-bold text-white">Confirmar Acción</h3></div>
            <p className="text-gray-300 mb-6">{confirmMessage}</p>
            <div className="flex gap-3">
              <button onClick={handleConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded transition-colors">Sí, Confirmar</button>
              <button onClick={handleCancelConfirm} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition-colors">Cancelar</button>
            </div>
          </div>
        </div>, document.body
      )}

      {showFilterModal && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[1000]">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Filtros</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Estado</label>
                <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                  <option value="all">Todos</option>
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Vencimiento</label>
                <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={filters.cutoffDaysFilter} onChange={e => setFilters({ ...filters, cutoffDaysFilter: e.target.value })}>
                  <option value="all">Todos</option>
                  <option value="overdue">Vencidos</option>
                  <option value="urgent">Próximos (3 días)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Ordenar por</label>
                <div className="flex gap-2">
                  <select className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-white" value={filters.sortBy} onChange={e => setFilters({ ...filters, sortBy: e.target.value })}>
                    <option value="name">Nombre</option>
                    <option value="monthlyPrice">Precio</option>
                  </select>
                  <button onClick={() => setFilters(f => ({ ...f, sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc' }))} className="bg-gray-700 p-2 rounded text-white">
                    {filters.sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setFilters({ status: 'all', sortBy: 'name', sortOrder: 'asc', cutoffDaysFilter: 'all' }); setShowFilterModal(false); }} className="flex-1 bg-gray-600 text-white py-2 rounded">Limpiar</button>
              <button onClick={() => setShowFilterModal(false)} className="flex-1 bg-blue-600 text-white py-2 rounded">Aplicar</button>
            </div>
          </div>
        </div>, document.body
      )}

    </div>
  );
}

export default ProjectManager;