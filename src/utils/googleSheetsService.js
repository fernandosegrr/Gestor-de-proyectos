// utils/googleSheetsService.js
// Servicio para integración con Google Sheets API - Versión Corregida

import { dataManager } from "./dataSync";

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.isAuthenticated = false;
    this.google = null;
  }

  /**
   * Leer conversaciones desde un Google Sheet
   */
  async getConversations(sheetId, range = "A:E") {
    try {
      console.log(`📊 Attempting to read conversations from sheet: ${sheetId}`);

      if (!sheetId || sheetId.length < 10) {
        throw new Error(`Invalid sheet ID: ${sheetId}`);
      }

      // Estrategia 1: CSV Export
      try {
        console.log("📄 Strategy 1: Trying CSV export...");
        const conversations = await this.getConversationsFromCSV(sheetId, range);
        if (conversations && conversations.length > 0) {
          console.log(`✅ CSV Strategy successful: ${conversations.length} conversations loaded`);
          return conversations;
        }
      } catch (csvError) {
        console.log("❌ CSV Strategy failed:", csvError.message);
      }

      throw new Error("All connection strategies failed. The sheet might be private or the ID is incorrect.");

    } catch (error) {
      console.error("🚨 Error reading conversations from Google Sheets:", error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('400') || error.message.includes('404')) {
        errorMessage = `❌ Google Sheet no encontrado o no es público. Verifica:
        • El Sheet ID es correcto: ${sheetId}
        • El sheet está compartido como "Cualquiera con el enlace puede ver"
        • El sheet existe y tiene datos en las columnas A-E`;
      } else if (error.message.includes('403')) {
        errorMessage = `🔒 Acceso denegado al Google Sheet. El sheet debe ser público.`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener datos via CSV export
   */
  async getConversationsFromCSV(sheetId, range = "A:E") {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    
    console.log("📥 Making CSV export request:", csvUrl);
    
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      }
    });

    if (!response.ok) {
      throw new Error(`CSV Export failed: ${response.status} - ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log("📄 CSV response stats:", {
      totalLength: csvText.length,
      lineCount: csvText.split('\n').length,
      preview: csvText.substring(0, 500) + (csvText.length > 500 ? '...' : '')
    });

    if (!csvText || csvText.trim().length === 0) {
      throw new Error("Empty CSV response");
    }

    const rows = this.parseCSV(csvText);
    console.log(`📋 Parsed ${rows.length} rows from CSV`);

    if (rows.length <= 1) {
      throw new Error("No data rows found in CSV");
    }

    return this.parseConversationsFromRows(rows.slice(1));
  }

  /**
   * Parsear CSV
   */
  parseCSV(csvText) {
    // Soporte robusto para saltos de línea y comillas en celdas CSV
    const result = [];
    let row = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (i < text.length) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
        i++;
      } else if (char === '\n' && !inQuotes) {
        row.push(current);
        result.push(row);
        row = [];
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    // Última celda
    if (current.length > 0 || row.length > 0) {
      row.push(current);
      result.push(row);
    }
    // Limpiar espacios
    return result.map(r => r.map(cell => (cell || '').trim()));
  }

  /**
   * Parsear conversaciones desde filas CSV - VERSIÓN CORREGIDA
   */
  parseConversationsFromRows(rows) {
    // Agrupar mensajes por número
    const grouped = {};
    let skippedEmptyRows = 0;
    let skippedInsufficientColumns = 0;
    let processedRows = 0;

    const nonEmptyRows = rows.filter((row) => {
      const hasContent = row && row.some(cell => cell && typeof cell === 'string' && cell.trim().length > 0 && cell.trim() !== ',');
      if (!hasContent) {
        skippedEmptyRows++;
        return false;
      }
      return true;
    });

    nonEmptyRows.forEach((row, index) => {
      try {
        const cleanRow = row.map(cell => cell ? cell.toString().trim() : '');
        const [usuarioMensaje, respuestaBot, numero, fecha, plataforma] = cleanRow;
        if (!usuarioMensaje || usuarioMensaje.length < 1) {
          skippedInsufficientColumns++;
          return;
        }
        // Filtrar headers
        const lowerMessage = usuarioMensaje.toLowerCase();
        const isHeader = [
          'mensaje', 'message', 'usuario', 'user', 'conversacion', 'conversation',
          'respuesta', 'response', 'bot', 'numero', 'number', 'fecha', 'date',
          'plataforma', 'platform'
        ].some(keyword => lowerMessage.includes(keyword) && lowerMessage.length < 50);
        if (isHeader) {
          skippedInsufficientColumns++;
          return;
        }
        let parsedDate = this.parseDate(fecha);
        if (!parsedDate) parsedDate = new Date();
        // Extraer solo el número antes del @
        let cleanNumber = (numero || '').split('@')[0].replace(/\D/g, '');
        // Validar que sea un número real (al menos 8 dígitos)
        if (!cleanNumber || cleanNumber.length < 8) {
          skippedInsufficientColumns++;
          return;
        }
        const phoneNumber = cleanNumber;
        if (!grouped[phoneNumber]) {
          grouped[phoneNumber] = {
            id: `conv_${phoneNumber}`,
            userId: `user_${phoneNumber}`,
            userName: `Cliente ${cleanNumber.slice(-4)}`,
            phoneNumber: phoneNumber,
            platform: plataforma || "WhatsApp",
            messages: [],
            status: "completed",
            duration: 0,
            tags: [],
            metadata: { originalNumbers: [numero] }
          };
        }
        // Mensaje usuario
        grouped[phoneNumber].messages.push({
          id: `msg_user_${index}`,
          timestamp: parsedDate.toISOString(),
          sender: "user",
          content: usuarioMensaje,
          type: "text"
        });
        // Mensaje bot
        if (respuestaBot && respuestaBot.trim().length > 0) {
          grouped[phoneNumber].messages.push({
            id: `msg_bot_${index}`,
            timestamp: new Date(parsedDate.getTime() + 1000).toISOString(),
            sender: "bot",
            content: respuestaBot,
            type: "text"
          });
        }
        grouped[phoneNumber].metadata.originalNumbers.push(numero);
        processedRows++;
      } catch (error) {
        skippedInsufficientColumns++;
      }
    });
    // Consolidar y ordenar mensajes por fecha
    const conversations = Object.values(grouped).map(conv => {
      conv.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return conv;
    });
    return conversations;
  }

  /**
   * Limpiar número de teléfono - FUNCIÓN MEJORADA
   */
  cleanPhoneNumber(raw) {
    if (!raw) return '';
    
    let num = raw.toString().trim();
    
    // Quitar sufijos tipo @s.whatsapp.net
    num = num.replace(/@.*/, '');
    
    // Si es notación científica, intentar convertir
    if (/^\d+\.?\d*e[+-]?\d+$/i.test(num)) {
      try {
        num = Number(num).toFixed(0);
      } catch {
        return '';
      }
    }
    
    // Quitar caracteres no numéricos excepto el signo +
    num = num.replace(/[^\d+]/g, '');
    
    // Si empieza con +, mantenerlo
    if (raw.toString().trim().startsWith('+') && !num.startsWith('+')) {
      num = '+' + num;
    }
    
    return num;
  }

  /**
   * Parsear fecha con múltiples formatos
   */
  parseDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const cleanDate = dateString.trim();
    
    // Formato 1: 2025-09-25-17:28
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}$/)) {
      const parts = cleanDate.split('-');
      const timePart = parts[3];
      const [hours, minutes] = timePart.split(':');
      return new Date(parts[0], parts[1] - 1, parts[2], hours, minutes);
    }

    // Formato 2: DD/MM/YYYY
    if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [day, month, year] = cleanDate.split('/');
      return new Date(year, month - 1, day);
    }

    // Formato 3: YYYY-MM-DD
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(cleanDate);
    }

    try {
      const nativeDate = new Date(cleanDate);
      if (!isNaN(nativeDate.getTime())) {
        return nativeDate;
      }
    } catch (e) {
      // Ignore
    }

    return null;
  }
}

// Exportar instancia singleton
export const googleSheetsService = new GoogleSheetsService();