
import { dataManager } from './dataSync';

// Para exportar a Word, necesitas instalar la librería 'docx':
// npm install docx

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';

class ConversationAnalyzer {
  constructor(conversations = [], aiAnalysis = null) {
    this.conversations = conversations;
    this.messages = [];
    this.stats = {};
    this.aiAnalysis = aiAnalysis;
    this.processConversations();
  }

  /**
   * Genera un reporte Word (.docx) con el análisis de las conversaciones.
   * @param {string} outputFile - Nombre sugerido para el archivo (ej: "reporte_conversaciones.docx")
   * @returns {Promise<Blob|Uint8Array>} Blob en navegador, Uint8Array en Node.js
   */

  async generateWordReport(outputFile = 'reporte_conversaciones.docx', aiAnalysis = null) {
    // Solo mostrar los datos tal cual los da la IA, sin tablas ni formato extra
    const analysis = aiAnalysis || this.aiAnalysis;
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: 'Reporte de análisis de conversaciones', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
            ...(analysis?.resumen ? [new Paragraph({ text: 'Resumen:', heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: String(analysis.resumen), spacing: { after: 200 } })] : []),
            ...(analysis?.temas ? [new Paragraph({ text: 'Temas:', heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: JSON.stringify(analysis.temas, null, 2), spacing: { after: 200 } })] : []),
            ...(analysis?.palabrasFrecuentes ? [new Paragraph({ text: 'Palabras Frecuentes:', heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: JSON.stringify(analysis.palabrasFrecuentes, null, 2), spacing: { after: 200 } })] : []),
            ...(analysis?.recomendaciones ? [new Paragraph({ text: 'Recomendaciones:', heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: Array.isArray(analysis.recomendaciones) ? analysis.recomendaciones.join('\n') : String(analysis.recomendaciones), spacing: { after: 200 } })] : []),
            ...(analysis?.plataformas ? [new Paragraph({ text: 'Plataformas:', heading: HeadingLevel.HEADING_2 }), new Paragraph({ text: JSON.stringify(analysis.plataformas, null, 2), spacing: { after: 200 } })] : []),
          ],
        },
      ],
    });

    // Empaquetar y descargar/retornar
    if (typeof window !== 'undefined') {
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return blob;
    } else {
      return await Packer.toBuffer(doc);
    }
  }

  // Tabla de plataformas
  _buildPlatformsTable(platforms) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Plataforma')], width: { size: 60, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Cantidad')], width: { size: 40, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];
    platforms.forEach(([plat, count]) => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(plat.charAt(0).toUpperCase() + plat.slice(1))] }),
          new TableCell({ children: [new Paragraph(count.toString())] }),
        ],
      }));
    });
    return new Table({ rows });
  }

  // Tabla de temas
  _buildTopicsTable(topics) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Tema')], width: { size: 60, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Menciones')], width: { size: 40, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];
    (topics.topics || []).forEach(([topic, count]) => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(topic)] }),
          new TableCell({ children: [new Paragraph(count.toString())] }),
        ],
      }));
    });
    return new Table({ rows });
  }

  // Helpers para tablas Word
  _buildUserTable(stats, userBehavior) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Usuario')], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Mensajes')], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('% Chat')], width: { size: 15, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Palabras Prom.')], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Hora + Activa')], width: { size: 15, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];
    Object.entries(stats.messagesPerUser || {}).forEach(([user, count]) => {
      const userData = userBehavior[user] || {};
      const percentage = ((count / (stats.totalMessages || 1)) * 100).toFixed(1);
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(user)] }),
          new TableCell({ children: [new Paragraph(count.toString())] }),
          new TableCell({ children: [new Paragraph(`${percentage}%`)] }),
          new TableCell({ children: [new Paragraph(userData.avgWords?.toFixed(1) || '0')] }),
          new TableCell({ children: [new Paragraph((userData.mostActiveHour || 0) + ':00')] }),
        ],
      }));
    });
    return new Table({ rows });
  }

  _buildWordFreqTable(wordFreq) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Palabra')], width: { size: 60, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Frecuencia')], width: { size: 40, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];
    wordFreq.forEach(([word, count]) => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(word)] }),
          new TableCell({ children: [new Paragraph(count.toString())] }),
        ],
      }));
    });
    return new Table({ rows });
  }

  _buildHourTable(activity) {
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Hora')], width: { size: 50, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph('Mensajes')], width: { size: 50, type: WidthType.PERCENTAGE } }),
        ],
      }),
    ];
    Object.entries(activity.messagesByHour || {}).sort(([a], [b]) => a - b).forEach(([hour, count]) => {
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(hour + ':00')] }),
          new TableCell({ children: [new Paragraph(count.toString())] }),
        ],
      }));
    });
    return new Table({ rows });
  }

  // Agrupa mensajes por temas usando reglas simples (palabras clave)
  analyzeTopics() {
    const topicRules = [
      { name: 'Agendar clase', keywords: ['agendar', 'agenda', 'clase', 'reserv', 'cita', 'sesión'] },
      { name: 'Promociones', keywords: ['promo', 'promocion', 'descuento', 'oferta', 'código', 'cupon'] },
      { name: 'Ubicación', keywords: ['ubicacion', 'direccion', 'dónde', 'donde', 'mapa', 'lugar'] },
      { name: 'Precios', keywords: ['precio', 'costo', 'tarifa', 'cuanto', 'vale', 'pago'] },
      { name: 'Horarios', keywords: ['horario', 'hora', 'disponible', 'cuando', 'dias', 'día'] },
      { name: 'Contacto', keywords: ['contacto', 'telefono', 'llamar', 'celular', 'whatsapp'] },
      { name: 'Otros', keywords: [] },
    ];
    const topicCounts = {};
    const topicExamples = {};
    this.messages.forEach(msg => {
      if (msg.sender === 'Bot' || msg.isMedia) return;
      const text = (msg.message || '').toLowerCase();
      let found = false;
      for (const rule of topicRules) {
        if (rule.keywords.some(k => text.includes(k))) {
          topicCounts[rule.name] = (topicCounts[rule.name] || 0) + 1;
          if (!topicExamples[rule.name]) topicExamples[rule.name] = msg.message;
          found = true;
          break;
        }
      }
      if (!found) {
        topicCounts['Otros'] = (topicCounts['Otros'] || 0) + 1;
        if (!topicExamples['Otros']) topicExamples['Otros'] = msg.message;
      }
    });
    const sorted = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
    return { topics: sorted, examples: topicExamples };
  }

  // Resumen de plataformas
  analyzePlatforms() {
    const counts = {};
    this.messages.forEach(msg => {
      const plat = (msg.platform || 'unknown').toLowerCase();
      counts[plat] = (counts[plat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  // Insights de comportamiento (texto explicativo)
  generateBehaviorInsights() {
    const activity = this.analyzeActivityPatterns();
    const stats = this.stats;
    let insights = [];
    if (activity && activity.mostActiveHour !== undefined) {
      insights.push(`Los picos de interacción se concentran en el horario de las ${activity.mostActiveHour}:00 horas, lo cual puede coincidir con la planeación de actividades.`);
    }
    if (this.stats && this.stats.totalMessages) {
      const topUser = Object.entries(this.stats.messagesPerUser || {}).sort((a, b) => b[1] - a[1])[0];
      if (topUser) {
        insights.push(`El usuario más activo participó con ${topUser[1]} mensajes (${topUser[0]}).`);
      }
    }
    if (this.stats && this.stats.totalParticipants) {
      insights.push(`Se detectaron ${this.stats.totalParticipants} usuarios únicos interactuando en el periodo.`);
    }
    return insights;
  }

  // Texto resumen general
  generateSummaryText() {
    const stats = this.stats;
    if (!stats || !stats.totalMessages) return '';
    return `Durante el periodo analizado, el bot registró un total de ${stats.totalMessages} interacciones provenientes de ${stats.totalParticipants} usuarios únicos.`;
  }

  processConversations() {
    this.messages = [];
    this.conversations.forEach(conv => {
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
          const msgDate = new Date(msg.timestamp || conv.date);
          this.messages.push({
            datetime: msgDate,
            date: msgDate.toDateString(),
            time: msgDate.toTimeString().split(' ')[0],
            hour: msgDate.getHours(),
            dayOfWeek: msgDate.toLocaleDateString('es-ES', { weekday: 'long' }),
            sender: msg.sender === 'user' ? (conv.userName || conv.userId || 'Usuario') : 'Bot',
            message: msg.content || '',
            wordCount: (msg.content || '').split(/\s+/).filter(w => w.length > 0).length,
            charCount: (msg.content || '').length,
            isMedia: (msg.content || '').toLowerCase().includes('<media') ||
                    (msg.content || '').toLowerCase().includes('multimedia') ||
                    (msg.content || '').toLowerCase().includes('imagen') ||
                    (msg.content || '').toLowerCase().includes('video'),
            platform: conv.platform || 'unknown',
            conversationId: conv.id
          });
        });
      }
    });
  }

  generateBasicStats() {
    if (this.messages.length === 0) {
      this.stats = { error: 'No hay mensajes para analizar' };
      return this.stats;
    }

    const dates = this.messages.map(m => new Date(m.datetime));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const daysDiff = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    const messagesPerUser = {};
    this.messages.forEach(msg => {
      messagesPerUser[msg.sender] = (messagesPerUser[msg.sender] || 0) + 1;
    });

    const totalWords = this.messages.reduce((sum, m) => sum + m.wordCount, 0);
    const totalChars = this.messages.reduce((sum, m) => sum + m.charCount, 0);
    const mediaMessages = this.messages.filter(m => m.isMedia).length;

    this.stats = {
      totalMessages: this.messages.length,
      totalParticipants: Object.keys(messagesPerUser).length,
      dateRange: {
        start: minDate.toISOString(),
        end: maxDate.toISOString(),
        days: daysDiff
      },
      messagesPerUser: messagesPerUser,
      avgWordsPerMessage: totalWords / this.messages.length,
      avgCharsPerMessage: totalChars / this.messages.length,
      totalWords: totalWords,
      totalChars: totalChars,
      mediaMessages: mediaMessages
    };

    return this.stats;
  }

  analyzeActivityPatterns() {
    if (this.messages.length === 0) return {};

    const messagesByHour = {};
    const messagesByDay = {};
    const messagesByDate = {};

    this.messages.forEach(msg => {
      messagesByHour[msg.hour] = (messagesByHour[msg.hour] || 0) + 1;
      messagesByDay[msg.dayOfWeek] = (messagesByDay[msg.dayOfWeek] || 0) + 1;
      messagesByDate[msg.date] = (messagesByDate[msg.date] || 0) + 1;
    });

    const mostActiveHour = Object.keys(messagesByHour).reduce((a, b) =>
      messagesByHour[a] > messagesByHour[b] ? a : b
    );

    const mostActiveDay = Object.keys(messagesByDay).reduce((a, b) =>
      messagesByDay[a] > messagesByDay[b] ? a : b
    );

    return {
      messagesByHour: messagesByHour,
      messagesByDay: messagesByDay,
      messagesByDate: messagesByDate,
      mostActiveHour: parseInt(mostActiveHour),
      mostActiveDay: mostActiveDay
    };
  }

  analyzeWordFrequency(topN = 20) {
    const stopWords = new Set([
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
      'da', 'su', 'por', 'son', 'con', 'para', 'al', 'me', 'mi', 'ya', 'si', 'pero',
      'más', 'muy', 'sin', 'sobre', 'este', 'esta', 'estos', 'estas', 'del', 'los',
      'las', 'una', 'como', 'cuando', 'donde', 'porque', 'hola', 'gracias', 'buenos',
      'días', 'buenas', 'tardes', 'noches', 'si', 'no', 'ok', 'bien', 'vale'
    ]);

    const allWords = [];
    this.messages.forEach(msg => {
      if (!msg.isMedia && msg.sender !== 'Bot') {
        const words = (msg.message || '').toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w));
        allWords.push(...words);
      }
    });

    const wordFreq = {};
    allWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, topN);
  }

  analyzeUserBehavior() {
    const userStats = {};

    this.messages.forEach(msg => {
      const user = msg.sender;
      if (!userStats[user]) {
        userStats[user] = {
          totalMessages: 0,
          totalWords: 0,
          totalChars: 0,
          mediaMessages: 0,
          messagesByHour: {},
          messagesByDay: {}
        };
      }

      userStats[user].totalMessages++;
      userStats[user].totalWords += msg.wordCount;
      userStats[user].totalChars += msg.charCount;
      if (msg.isMedia) userStats[user].mediaMessages++;

      userStats[user].messagesByHour[msg.hour] = (userStats[user].messagesByHour[msg.hour] || 0) + 1;
      userStats[user].messagesByDay[msg.dayOfWeek] = (userStats[user].messagesByDay[msg.dayOfWeek] || 0) + 1;
    });

    Object.keys(userStats).forEach(user => {
      const stats = userStats[user];
      stats.avgWords = stats.totalWords / stats.totalMessages;
      stats.avgChars = stats.totalChars / stats.totalMessages;
      stats.mostActiveHour = Object.keys(stats.messagesByHour).reduce((a, b) =>
        stats.messagesByHour[a] > stats.messagesByHour[b] ? a : b, '0'
      );
      stats.percentageOfChat = (stats.totalMessages / this.messages.length) * 100;
    });

    return userStats;
  }

  generateHTMLReport(outputFile = 'conversation_report.html') {
    const activityPatterns = this.analyzeActivityPatterns();
    const wordFreq = this.analyzeWordFrequency();
    const userBehavior = this.analyzeUserBehavior();

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Análisis de Conversaciones</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            border-left: 4px solid #4facfe;
            transition: transform 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #4facfe;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
            font-weight: 300;
        }
        .chart-container {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 500;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .user-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin: 10px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-left: 4px solid #00f2fe;
        }
        .user-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .user-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            font-size: 0.9em;
        }
        .user-stat {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .user-stat strong {
            display: block;
            color: #4facfe;
            font-size: 1.2em;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            background: #4facfe;
            color: white;
            border-radius: 12px;
            font-size: 0.8em;
            margin: 2px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reporte de Análisis de Conversaciones</h1>
            <p>Generado el ${new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.stats.totalMessages?.toLocaleString() || 0}</div>
                <div class="stat-label">Mensajes Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.totalParticipants || 0}</div>
                <div class="stat-label">Participantes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.dateRange?.days || 0}</div>
                <div class="stat-label">Días Analizados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.avgWordsPerMessage?.toFixed(1) || 0}</div>
                <div class="stat-label">Palabras Promedio</div>
            </div>
        </div>

        <div class="section">
            <h2>📊 Estadísticas Generales</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${this.stats.totalWords?.toLocaleString() || 0}</div>
                    <div class="stat-label">Palabras Totales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.stats.mediaMessages || 0}</div>
                    <div class="stat-label">Mensajes Multimedia</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${activityPatterns.mostActiveHour || 0}:00</div>
                    <div class="stat-label">Hora Más Activa</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${activityPatterns.mostActiveDay || 'N/A'}</div>
                    <div class="stat-label">Día Más Activo</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>👥 Mensajes por Usuario</h2>
            <table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Mensajes</th>
                        <th>Porcentaje</th>
                        <th>Palabras Promedio</th>
                        <th>Hora Más Activa</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(this.stats.messagesPerUser || {}).map(([user, count]) => {
                        const userData = userBehavior[user] || {};
                        const percentage = ((count / (this.stats.totalMessages || 1)) * 100).toFixed(1);
                        return `
                            <tr>
                                <td>${user}</td>
                                <td>${count}</td>
                                <td>${percentage}%</td>
                                <td>${userData.avgWords?.toFixed(1) || 0}</td>
                                <td>${userData.mostActiveHour || 0}:00</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>📝 Palabras Más Frecuentes</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${wordFreq.map(([word, count]) => `
                    <span class="badge" style="font-size: ${Math.max(0.8, Math.min(1.5, count / 10))}em;">
                        ${word} (${count})
                    </span>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>📈 Actividad por Hora</h2>
            <div class="chart-container">
                <p>Esta sección requeriría una librería de gráficos como Chart.js para visualización completa.</p>
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Mensajes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(activityPatterns.messagesByHour || {}).sort(([a], [b]) => a - b).map(([hour, count]) => `
                            <tr>
                                <td>${hour}:00</td>
                                <td>${count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            <p>Reporte generado automáticamente por ConversationAnalyzer</p>
            <p>Proyecto: ${this.conversations.length > 0 ? this.conversations[0]?.projectName || 'N/A' : 'N/A'}</p>
        </div>
    </div>
</body>
</html>`;

    // En un entorno de navegador, descargar el archivo
    if (typeof window !== 'undefined') {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return htmlContent;
  }

  generateJSONReport(outputFile = 'conversation_stats.json') {
    const activityPatterns = this.analyzeActivityPatterns();
    const wordFreq = this.analyzeWordFrequency();
    const userBehavior = this.analyzeUserBehavior();

    const reportData = {
      basicStats: this.stats,
      activityPatterns: activityPatterns,
      wordFrequency: Object.fromEntries(wordFreq),
      userBehavior: userBehavior,
      generationDate: new Date().toISOString(),
      totalConversations: this.conversations.length
    };

    const jsonString = JSON.stringify(reportData, null, 2);

    // En un entorno de navegador, descargar el archivo
    if (typeof window !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return jsonString;
  }

  // Método para actualizar conversaciones
  updateConversations(conversations) {
    this.conversations = conversations;
    this.processConversations();
    this.generateBasicStats();
  }
}

export default ConversationAnalyzer;