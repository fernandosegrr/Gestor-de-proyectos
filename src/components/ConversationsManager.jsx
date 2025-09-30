import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Search, Filter, Download, RefreshCw, AlertCircle, CheckCircle, Bot, User, Calendar, FileSpreadsheet, ExternalLink, Settings, Shield, Lock, Eye, Phone, ArrowLeft, Send, Check, CheckCheck, Clock, X, FileText } from 'lucide-react';
import { dataManager, useDataSync, DATA_EVENTS } from '../utils/dataSync';
import ConversationAnalyzer from '../utils/ConversationAnalyzer';
import { PlatformIcon } from './PlatformIcon';


function ConversationsManager() {
  const [conversations, setConversations] = useState([]);
  const [groupedChats, setGroupedChats] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [viewMode, setViewMode] = useState('chats'); // 'chats' o 'conversation'
  const [filterOption, setFilterOption] = useState('recent_all'); // opciones: recent_all, oldest_all, recent_whatsapp, oldest_whatsapp, etc.

  // Estado para anÃ¡lisis
  const [analyzer, setAnalyzer] = useState(null);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // (Eliminado: exportar anÃ¡lisis a Word con IA)

  // Cargar proyectos disponibles
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const loadedProjects = await dataManager.loadProjects();
        const projectsWithSheets = loadedProjects.filter(p => p.googleSheetId);
        setProjects(projectsWithSheets);
        
        if (projectsWithSheets.length > 0) {
          setSelectedProject(projectsWithSheets[0].id);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Cargar conversaciones desde dataManager (base local/remota) al inicializar o cambiar de proyecto
  useEffect(() => {
    const loadFromDataManager = async () => {
      if (!selectedProject) return;
      const projectMeta = projects.find((proj) => proj.id === selectedProject);
      setIsLoading(true);
      try {
        const loadedConversations = await dataManager.loadConversations({
          projectId: selectedProject,
          projectName: projectMeta?.name,
        });
        console.log('Conversaciones cargadas desde Firebase:', loadedConversations);
        if (loadedConversations && loadedConversations.length > 0) {
          setConversations(loadedConversations);
          groupConversationsByPhone(loadedConversations);
        } else {
          setConversations([]);
          groupConversationsByPhone([]);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFromDataManager();
  }, [selectedProject, projects]);

  // Escuchar cambios en conversaciones
  useDataSync(DATA_EVENTS.CONVERSATIONS_UPDATED, (updatedConversations) => {
    if (updatedConversations) {
      setConversations(updatedConversations);
      groupConversationsByPhone(updatedConversations);
    }
  });


  // âœ… FUNCIÃ“N MEJORADA para limpiar nÃºmero de telÃ©fono
  function cleanPhoneNumber(raw) {
    if (!raw) return '';
    
    let num = raw.toString().trim();
    
    // Quitar sufijos tipo @s.whatsapp.net
    num = num.replace(/@.*/, '');
    
    // Si es notaciÃ³n cientÃ­fica, intentar convertir
    if (/^\d+\.?\d*e[+-]?\d+$/i.test(num)) {
      try {
        num = Number(num).toFixed(0);
      } catch {
        return '';
      }
    }
    
    // Quitar caracteres no numÃ©ricos excepto el signo +
    num = num.replace(/[^\d+]/g, '');
    
    // Si el original empezaba con +, mantenerlo
    if (raw.toString().trim().startsWith('+') && !num.startsWith('+')) {
      num = '+' + num;
    }
    
    return num;
  }

  // âœ… FUNCIÃ“N CORREGIDA para mostrar el nÃºmero limpio
  const getDisplayTitle = (chat) => {
    if (!chat || !chat.phoneNumber) return 'Sin nÃºmero';
    const cleanNumber = cleanPhoneNumber(chat.phoneNumber);
    return cleanNumber || 'Sin nÃºmero';
  };

  // âœ… FUNCIÃ“N CORREGIDA para agrupar conversaciones por nÃºmero de telÃ©fono
  const groupConversationsByPhone = (convs) => {
    console.log('Agrupando conversaciones:', convs);
    const grouped = {};

    convs.forEach(conv => {
      // âœ… CORRECCIÃ“N: Usar phoneNumber directamente (ya viene limpio del servicio)
      const phoneNumber = conv.phoneNumber || 'Sin nÃºmero';
      
      console.log('Procesando conversaciÃ³n:', {
        id: conv.id,
        phoneNumber: phoneNumber,
        usuario: conv.usuario,
        messages: conv.messages?.length || 0
      });

      if (!grouped[phoneNumber]) {
        grouped[phoneNumber] = {
          phoneNumber: phoneNumber,
          userName: conv.usuario || conv.userName || 'Usuario desconocido',
          messages: [],
          platform: conv.plataforma || conv.platform || 'WhatsApp',
          lastMessageTime: null,
          unreadCount: 0,
          projectId: conv.projectId,
          projectName: conv.projectName,
          userNames: new Set()
        };
      }

      // Trackear todos los nombres de usuario para este nÃºmero
      const userName = conv.usuario || conv.userName;
      if (userName && userName.trim()) {
        grouped[phoneNumber].userNames.add(userName.trim());
      }

      // âœ… CORRECCIÃ“N: Agregar todos los mensajes de esta conversaciÃ³n
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
          grouped[phoneNumber].messages.push({
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            content: msg.content,
            sender: msg.sender === 'bot' ? 'bot' : 'user', // Forzar sender correcto
            timestamp: msg.timestamp,
            status: msg.sender === 'user' ? 'read' : 'sent'
          });
        });
      }

      // Actualizar Ãºltimo mensaje
      const lastMessage = conv.fecha || conv.date || new Date().toISOString();
      if (!grouped[phoneNumber].lastMessageTime || lastMessage > grouped[phoneNumber].lastMessageTime) {
        grouped[phoneNumber].lastMessageTime = lastMessage;
      }
    });

    // Determinar el nombre de usuario final para cada grupo
    Object.keys(grouped).forEach(phone => {
      const chat = grouped[phone];
      if (chat.userNames.size > 0) {
        // Usar el primer nombre encontrado
        chat.userName = Array.from(chat.userNames)[0];
      }
      // Limpiar el set ya que no lo necesitamos mÃ¡s
      delete chat.userNames;
    });

    // Ordenar mensajes por timestamp dentro de cada chat
    Object.keys(grouped).forEach(phone => {
      grouped[phone].messages.sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
    });

    console.log('Chats agrupados:', grouped);
    setGroupedChats(grouped);
  };

  // (Eliminado: analizar conversaciones con IA)

  // Verificar si el sheet es pÃºblico
  const checkSheetAccess = async (sheetId) => {
    try {
      const testUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      const response = await fetch(testUrl, { method: 'HEAD' });
      return {
        isPublic: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        isPublic: false,
        status: 0,
        error: error.message
      };
    }
  };

  // âœ… FUNCIÃ“N CORREGIDA para cargar conversaciones desde Google Sheets
  const loadConversationsFromSheet = async (projectId) => {
    if (!projectId) {
      setConnectionStatus({ 
        type: 'error', 
        message: 'Por favor selecciona un proyecto vÃ¡lido' 
      });
      return;
    }

    setIsConnecting(true);
    setConnectionStatus(null);
    setDebugInfo(null);

    try {
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.googleSheetId) {
        throw new Error('Proyecto no encontrado o sin Sheet ID configurado');
      }

      const accessCheck = await checkSheetAccess(project.googleSheetId);
      
      setDebugInfo({
        projectName: project.name,
        sheetId: project.googleSheetId,
        accessCheck: accessCheck,
        loadTime: new Date().toLocaleString('es-MX')
      });

      if (!accessCheck.isPublic) {
        throw new Error(`No se puede acceder al Google Sheet. Error ${accessCheck.status}`);
      }

      const { googleSheetsService } = await import('../utils/googleSheetsService');
      const conversations = await googleSheetsService.getConversations(project.googleSheetId);

      if (!conversations || conversations.length === 0) {
        throw new Error('No se encontraron conversaciones vÃ¡lidas en el Google Sheet');
      }

      // âœ… CORRECCIÃ“N: TransformaciÃ³n simplificada y correcta
      const transformedConversations = conversations.map(conv => {
        const fecha = conv.date !== undefined && conv.date !== null ? conv.date : null;
        return {
          id: conv.id,
          usuario: conv.userName,
          mensaje: conv.messages?.find(m => m.sender === 'user')?.content || '',
          respuestaBot: conv.messages?.find(m => m.sender === 'bot')?.content || '',
          fecha,
          numero: conv.phoneNumber,
          phoneNumber: conv.phoneNumber,
          plataforma: conv.platform || 'WhatsApp',
          platform: conv.platform || 'WhatsApp',
          projectId,
          projectName: project.name,
          loadedAt: new Date().toISOString(),
          messages: conv.messages ? conv.messages.map(m => ({ ...m })) : []
        };
      });

      console.log('Conversaciones transformadas:', transformedConversations);

      const saveResult = await dataManager.saveConversations(
        transformedConversations,
        projectId,
        project?.name
      );
      if (saveResult === true) {
        setConversations(transformedConversations);
        groupConversationsByPhone(transformedConversations);
        setConnectionStatus({ 
          type: 'success', 
          message: `Conversaciones guardadas en Firebase y cargadas (${conversations.length})` 
        });
        console.log('âœ… Conversaciones guardadas en Firebase:', transformedConversations.length);
      } else {
        setConnectionStatus({ 
          type: 'error', 
          message: 'Error al guardar conversaciones en Firebase. Revisa autenticaciÃ³n y permisos.' 
        });
        console.error('âŒ Error al guardar conversaciones en Firebase:', saveResult);
      }
      
      setConnectionStatus({ 
        type: 'success', 
        message: `Cargadas ${conversations.length} conversaciones desde Google Sheets` 
      });

    } catch (error) {
      console.error('Error loading conversations:', error);
      setConnectionStatus({ 
        type: 'error', 
        message: error.message
      });
    } finally {
      setIsConnecting(false);
    }
  };


  // Filtrar y ordenar chats segÃºn la opciÃ³n seleccionada
  let filteredChats = Object.entries(groupedChats).filter(([phone, chat]) => {
    const matchesSearch = !searchTerm ||
      chat.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.messages.some(msg => msg.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesProject = !selectedProject || chat.projectId === selectedProject;
    // Filtrado por plataforma
    if (filterOption.includes('whatsapp') && (!chat.platform || chat.platform.toLowerCase() !== 'whatsapp')) return false;
    if (filterOption.includes('messenger') && (!chat.platform || chat.platform.toLowerCase() !== 'messenger')) return false;
    if (filterOption.includes('instagram') && (!chat.platform || chat.platform.toLowerCase() !== 'instagram')) return false;
    return matchesSearch && matchesProject;
  });
  // Ordenar por fecha segÃºn opciÃ³n
  filteredChats.sort((a, b) => {
    const timeA = new Date(a[1].messages[0]?.timestamp || 0);
    const timeB = new Date(b[1].messages[0]?.timestamp || 0);
    if (filterOption.startsWith('oldest')) {
      return timeA - timeB;
    } else {
      return timeB - timeA;
    }
  });

  // Formatear tiempo
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return date.toLocaleDateString('es-MX', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  // Obtener Ãºltimo mensaje del chat
  const getLastMessage = (messages) => {
    if (messages.length === 0) return 'Sin mensajes';
    const lastMsg = messages[messages.length - 1];
    const prefix = lastMsg.sender === 'bot' ? '' : '';
    return prefix + (lastMsg.content.length > 50 
      ? lastMsg.content.substring(0, 50) + '...' 
      : lastMsg.content);
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  // Infinite scroll: solo mostrar los primeros N y cargar mÃ¡s al hacer scroll
  const CHATS_PAGE_SIZE = 40;
  const [visibleChats, setVisibleChats] = useState(CHATS_PAGE_SIZE);
  const chatListRef = useRef(null);

  // Reset visible chats al filtrar
  useEffect(() => {
    setVisibleChats(CHATS_PAGE_SIZE);
  }, [searchTerm, selectedProject, groupedChats]);

  // Handler para scroll infinito
  const handleScroll = () => {
    const el = chatListRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleChats(v => Math.min(v + CHATS_PAGE_SIZE, filteredChats.length));
    }
  };

  // Vista de lista de chats (WhatsApp style)
  const renderChatList = () => (
    <>
      {/* Header Mejorado */}
      <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl shadow-xl p-8 mb-6 flex flex-col gap-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-4 ring-white/30 shadow-lg">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white drop-shadow-lg tracking-tight">WhatsApp Conversations</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Botones de anÃ¡lisis y exportaciÃ³n eliminados */}
            <button
              onClick={() => loadConversationsFromSheet(selectedProject)}
              disabled={isConnecting || !selectedProject}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold shadow-lg hover:scale-105 hover:from-emerald-600 hover:to-green-600 transition-all duration-200 border-2 border-white/20 focus:outline-none focus:ring-4 focus:ring-emerald-300/40"
            >
              <Download className={`w-6 h-6 ${isConnecting ? 'animate-spin' : ''}`} />
              <span>Cargar conversaciones</span>
            </button>
          </div>
        </div>
        {/* Search Bar Mejorada y Filtro Unificado */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-200" />
            <input
              type="text"
              placeholder="Buscar conversaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/20 backdrop-blur-md text-white rounded-xl border-2 border-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 placeholder-green-100 text-lg shadow-inner transition-all duration-200"
            />
          </div>
          {/* Filtro Unificado */}
          <select
            value={filterOption}
            onChange={e => setFilterOption(e.target.value)}
            className="px-4 py-3 rounded-xl border-2 border-white/20 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-emerald-300/40 text-base shadow-md"
            style={{ minWidth: 220 }}
          >
            <option className="bg-gray-900 text-white" value="recent_all">MÃ¡s reciente primero - Todas las plataformas</option>
            <option className="bg-gray-900 text-white" value="oldest_all">MÃ¡s antiguo primero - Todas las plataformas</option>
            <option className="bg-gray-900 text-white" value="recent_whatsapp">MÃ¡s reciente primero - WhatsApp</option>
            <option className="bg-gray-900 text-white" value="oldest_whatsapp">MÃ¡s antiguo primero - WhatsApp</option>
            <option className="bg-gray-900 text-white" value="recent_messenger">MÃ¡s reciente primero - Messenger</option>
            <option className="bg-gray-900 text-white" value="oldest_messenger">MÃ¡s antiguo primero - Messenger</option>
            <option className="bg-gray-900 text-white" value="recent_instagram">MÃ¡s reciente primero - Instagram</option>
            <option className="bg-gray-900 text-white" value="oldest_instagram">MÃ¡s antiguo primero - Instagram</option>
          </select>
        </div>
      </div>
      {/* Connection Status Mejorado */}
      {connectionStatus && (
        <div className={`flex items-center gap-3 mx-auto max-w-xl mb-6 px-6 py-3 rounded-xl shadow-lg border-2 ${
          connectionStatus.type === 'success'
            ? 'bg-green-500/10 border-green-400/40 text-green-900'
            : 'bg-red-500/10 border-red-400/40 text-red-900'
        }`}>
          {connectionStatus.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-500" />
          )}
          <span className="text-base font-semibold">{connectionStatus.message}</span>
        </div>
      )}
      {/* Project Selector */}
      <div className="px-4 mt-4">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all duration-200"
        >
          <option value="" className="bg-gray-800">Selecciona un proyecto...</option>
          {projects.map(project => (
            <option key={project.id} value={project.id} className="bg-gray-800">
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {/* Chat List con scroll optimizado */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-400/40 scrollbar-track-transparent rounded-xl bg-black/10 shadow-inner"
        ref={chatListRef}
        style={{ maxHeight: 'calc(100vh - 340px)' }}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {conversations.length === 0
                ? 'No hay conversaciones cargadas'
                : 'No se encontraron conversaciones'}
            </p>
          </div>
        ) : (
          filteredChats.slice(0, visibleChats).map(([phone, chat]) => (
            <div
              key={phone}
              onClick={() => {
                setSelectedChat({ phone, ...chat });
                setViewMode('conversation');
              }}
              className="flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer border-b border-white/10 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10 mx-2 rounded-lg"
            >
              <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <PlatformIcon platform={chat.platform} className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-white truncate text-base">
                    {getDisplayTitle(chat)}
                  </h3>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0 bg-gray-700/50 px-2 py-1 rounded-full">
                    {formatTime(chat.lastMessageTime)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-300 truncate max-w-[200px]">
                    {getLastMessage(chat.messages)}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1 ml-2 shadow-lg">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <User className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{chat.userName || 'Usuario desconocido'}</span>
                  {chat.platform && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${
                      chat.platform.toLowerCase() === 'whatsapp' ? 'bg-green-600/30 text-green-200' :
                      chat.platform.toLowerCase() === 'messenger' ? 'bg-blue-600/30 text-blue-200' :
                      chat.platform.toLowerCase() === 'instagram' ? 'bg-pink-600/30 text-pink-200' :
                      'bg-gray-700/30 text-gray-300'
                    }`}>
                      {chat.platform}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {/* Loader para infinite scroll */}
        {visibleChats < filteredChats.length && (
          <div className="flex justify-center py-6">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        )}
      </div>
      {/* Stats Footer */}
      {conversations.length > 0 && (
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="flex justify-around text-center">
            <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-green-400">{Object.keys(groupedChats).length}</div>
              <div className="text-xs text-gray-300 font-medium">Chats</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-blue-400">{conversations.length}</div>
              <div className="text-xs text-gray-300 font-medium">Mensajes</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-purple-400">
                {Object.values(groupedChats).reduce((sum, chat) => sum + chat.messages.length, 0)}
              </div>
              <div className="text-xs text-gray-300 font-medium">Total</div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Vista de conversaciÃ³n individual
  const conversationContainerRef = useRef(null);
  useEffect(() => {
    if (viewMode === 'conversation' && conversationContainerRef.current) {
      conversationContainerRef.current.scrollTop = 0;
    }
  }, [selectedChat, viewMode]);

  const renderConversation = () => {
    if (!selectedChat) return null;
    const platform = (selectedChat.platform || '').toLowerCase();
    return (
      <>
        {/* Chat Header */}
        <div className="sticky top-0 z-10 w-full">
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-600 px-6 py-3 flex items-center gap-3 shadow-md rounded-t-2xl border-b-4 border-green-400/30">
            <button
              onClick={() => {
                setViewMode('chats');
                setSelectedChat(null);
              }}
              className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="h-9 w-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
              <PlatformIcon platform={selectedChat.platform} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-base truncate">{getDisplayTitle(selectedChat)}</h3>
              <div className="flex items-center gap-2 text-xs text-green-100">
                <User className="w-3 h-3" />
                <span>{selectedChat.userName || 'Usuario desconocido'}</span>
                {selectedChat.platform && (
                  <>
                    <span>â€¢</span>
                    <span className={
                      platform === 'whatsapp' ? 'text-green-200' :
                      platform === 'messenger' ? 'text-blue-200' :
                      platform === 'instagram' ? 'text-pink-200' : 'text-gray-200'
                    }>{selectedChat.platform}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Mensajes flotantes, sin caja central */}
        <div
          ref={conversationContainerRef}
          className="flex-1 overflow-y-auto px-0 py-8"
          style={{ background: 'none', minHeight: '60vh' }}
        >
          <div className="flex flex-col gap-6 w-full">
            {selectedChat.messages.map((message, index) => {
              const isBot = message.sender === 'bot';
              const showDate = index === 0 || 
                new Date(message.timestamp).toDateString() !== 
                new Date(selectedChat.messages[index - 1].timestamp).toDateString();
              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="text-center my-4">
                      <span className="bg-gray-700/80 text-gray-200 text-xs px-4 py-2 rounded-full">
                        {new Date(message.timestamp).toLocaleDateString('es-MX', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                  <div className={`flex w-full ${isBot ? 'justify-end' : 'justify-start'}`}> 
                    <div className={`relative px-5 py-3 rounded-2xl shadow-md text-base font-medium leading-relaxed whitespace-pre-wrap break-words select-text transition-all
                      ${isBot
                        ? platform === 'whatsapp' ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' :
                          platform === 'messenger' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' :
                          platform === 'instagram' ? 'bg-gradient-to-br from-pink-400 to-purple-500 text-white' :
                          'bg-gray-700 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'}
                      ${isBot ? 'rounded-br-3xl' : 'rounded-bl-3xl'}
                      ${isBot ? 'ml-12' : 'mr-12'}
                    `} style={{ boxShadow: '0 2px 16px 0 rgba(0,0,0,0.10)' }}>
                      <p>{message.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-2 text-xs ${
                        isBot ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString('es-MX', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        {isBot && (
                          message.status === 'sent' ? <Check className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Input Footer (decorativo) */}
        <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-3 text-gray-400 text-sm border border-white/20">
              ConversaciÃ³n de solo lectura
            </div>
            <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20" disabled>
              <Send className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {viewMode === 'chats' ? renderChatList() : renderConversation()}
      </div>
    </div>
  );
}

export default ConversationsManager;