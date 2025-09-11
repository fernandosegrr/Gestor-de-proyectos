// notificationService.js
// Sistema de notificaciones WhatsApp para fechas de corte

const WHATSAPP_CONFIG = {
  serverUrl: 'https://evolution-api-evolution-api.d6cr6o.easypanel.host',
  apiKey: '6EB4C4366FAE-4208-90F9-3F9A6DC123D4',
  instance: 'vepiautomkt',
  phoneNumber: '5214623455661'
};

// Función para enviar mensaje de WhatsApp
const sendWhatsAppMessage = async (message) => {
  try {
    const response = await fetch(`${WHATSAPP_CONFIG.serverUrl}/message/sendText/${WHATSAPP_CONFIG.instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WHATSAPP_CONFIG.apiKey
      },
      body: JSON.stringify({
        number: WHATSAPP_CONFIG.phoneNumber,
        text: message
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Notificación WhatsApp enviada:', result);
      return true;
    } else {
      console.error('❌ Error enviando notificación WhatsApp:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error de conexión WhatsApp:', error);
    return false;
  }
};

// Función para verificar fechas de corte y enviar notificaciones
export const checkCutoffDatesAndNotify = async (projects) => {
  if (!Array.isArray(projects) || projects.length === 0) {
    return;
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Formatear fecha para comparación (YYYY-MM-DD)
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const tomorrowStr = formatDate(tomorrow);

  // Buscar proyectos con fecha de corte mañana
  const projectsWithCutoffTomorrow = projects.filter(project => {
    if (!project.cutoffDate || project.status === 'cancelado' || project.status === 'pausado') {
      return false;
    }

    // Si el proyecto tiene fecha de corte personalizada, usar esa
    if (project.customCutoffDate && project.cutoffDate) {
      const cutoffDate = new Date(project.cutoffDate);
      return formatDate(cutoffDate) === tomorrowStr;
    }

    // Si no tiene fecha personalizada, calcular basado en startDate
    if (project.startDate) {
      const startDate = new Date(project.startDate);
      const cutoffDay = startDate.getDate();
      
      // Crear fecha de corte para el mes actual
      const currentMonth = tomorrow.getMonth();
      const currentYear = tomorrow.getFullYear();
      const calculatedCutoff = new Date(currentYear, currentMonth, cutoffDay);
      
      return formatDate(calculatedCutoff) === tomorrowStr;
    }

    return false;
  });

  // Enviar notificaciones para cada proyecto
  for (const project of projectsWithCutoffTomorrow) {
    const message = `🚨 *RECORDATORIO DE FECHA DE CORTE* 🚨

📅 *Fecha:* Mañana (${tomorrow.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })})

🤖 *Proyecto:* ${project.name}
👤 *Cliente:* ${project.clientName || 'No especificado'}
💰 *Mensualidad:* $${project.monthlyPrice || '0'}
📊 *Estado:* ${project.status}

⏰ Se vence la fecha de corte en 1 día.

_Mensaje automático del Sistema de Gestión de Proyectos_`;

    const sent = await sendWhatsAppMessage(message);
    
    if (sent) {
      console.log(`✅ Notificación enviada para proyecto: ${project.name}`);
      
      // Marcar como notificado para evitar duplicados (opcional)
      try {
        // Guardar que se envió notificación hoy
        const notificationKey = `notification_${project.id}_${tomorrowStr}`;
        localStorage.setItem(notificationKey, 'sent');
        
        // Limpiar notificaciones antiguas (más de 7 días)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoStr = formatDate(oneWeekAgo);
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('notification_') && key.includes(oneWeekAgoStr)) {
            localStorage.removeItem(key);
          }
        }
      } catch (storageError) {
        console.warn('⚠️ Error guardando estado de notificación:', storageError);
      }
    } else {
      console.error(`❌ Error enviando notificación para proyecto: ${project.name}`);
    }

    // Esperar un poco entre mensajes para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (projectsWithCutoffTomorrow.length > 0) {
    console.log(`📱 Se enviaron ${projectsWithCutoffTomorrow.length} notificaciones de fecha de corte`);
  }
};

// Función para inicializar el sistema de notificaciones
export const initializeNotificationSystem = (projects) => {
  // Verificar inmediatamente al inicializar
  checkCutoffDatesAndNotify(projects);
  
  // Configurar verificación cada hora
  const intervalId = setInterval(() => {
    checkCutoffDatesAndNotify(projects);
  }, 60 * 60 * 1000); // 1 hora en milisegundos

  // Configurar verificación diaria a las 9 AM
  const scheduleDailyCheck = () => {
    const now = new Date();
    const next9AM = new Date();
    next9AM.setHours(9, 0, 0, 0);
    
    // Si ya pasaron las 9 AM de hoy, programar para mañana
    if (now > next9AM) {
      next9AM.setDate(next9AM.getDate() + 1);
    }
    
    const timeUntil9AM = next9AM.getTime() - now.getTime();
    
    setTimeout(() => {
      checkCutoffDatesAndNotify(projects);
      
      // Programar verificaciones diarias
      setInterval(() => {
        checkCutoffDatesAndNotify(projects);
      }, 24 * 60 * 60 * 1000); // 24 horas
      
    }, timeUntil9AM);
  };

  scheduleDailyCheck();

  // Retornar función para limpiar intervals
  return () => {
    clearInterval(intervalId);
  };
};

// Función manual para testing
export const testNotification = async () => {
  const testMessage = `🧪 *PRUEBA DE NOTIFICACIÓN* 🧪

📅 *Fecha:* ${new Date().toLocaleString('es-ES')}

Este es un mensaje de prueba del Sistema de Gestión de Proyectos.

Si recibes este mensaje, las notificaciones están funcionando correctamente.

_Sistema de Notificaciones WhatsApp - Evolution API_`;

  const sent = await sendWhatsAppMessage(testMessage);
  
  if (sent) {
    console.log('✅ Mensaje de prueba enviado correctamente');
    return { success: true, message: 'Notificación de prueba enviada correctamente' };
  } else {
    console.error('❌ Error enviando mensaje de prueba');
    return { success: false, message: 'Error enviando notificación de prueba' };
  }
};

export default {
  checkCutoffDatesAndNotify,
  initializeNotificationSystem,
  testNotification
};
