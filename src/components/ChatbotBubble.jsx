import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Bot } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const WEBHOOK_URL = 'https://n8n-n8n.d6cr6o.easypanel.host/webhook/b2469a03-31d4-4db9-b823-75f8bcb3d739';
const LOCAL_STORAGE_KEY = 'chatbot-bubble-history';
const SESSION_ID_KEY = 'chatbot-bubble-session-id';
const TYPING_MESSAGE = 'El asistente esta escribiendo...';

function getSessionId() {
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).slice(2, 18);
    }
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

function loadHistory() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (_err) {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
}

function normalizeReply(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload.trim();
  if (payload.reply) return String(payload.reply).trim();
  if (payload.output) return String(payload.output).trim();
  if (payload.message) return String(payload.message).trim();
  if (payload.text) return String(payload.text).trim();
  if (payload.data && typeof payload.data.text === 'string') {
    return payload.data.text.trim();
  }
  if (payload.result && typeof payload.result === 'string') {
    return payload.result.trim();
  }
  if (Array.isArray(payload) && payload.length > 0) {
    return normalizeReply(payload[0]);
  }
  return '';
}

export default function ChatbotBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => loadHistory());
  const messagesViewportRef = useRef(null);
  const inputRef = useRef(null);
  const sessionId = getSessionId();

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (!messagesViewportRef.current) return;
    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = {
      id: uuidv4(),
      text: trimmed,
      from: 'user',
      date: new Date().toISOString(),
    };

    const placeholderId = uuidv4();
    const typingMessage = {
      id: placeholderId,
      text: TYPING_MESSAGE,
      from: 'bot',
      date: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setInput('');

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, date: userMessage.date, sessionId }),
      });

      let raw = '';
      try {
        raw = await response.text();
      } catch (_readErr) {
        raw = '';
      }

      if (!response.ok) {
        throw new Error(raw || `Request failed with status ${response.status}`);
      }

      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch (_parseErr) {
          payload = null;
        }
      }

      const reply = normalizeReply(payload ?? raw) || (typeof raw === 'string' ? raw.trim() : '');
      if (!reply) {
        throw new Error('Empty reply');
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
              ...msg,
              text: reply,
              pending: false,
              date: new Date().toISOString(),
            }
            : msg,
        ),
      );
    } catch (err) {
      console.error('ChatbotBubble failed to fetch reply', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
              ...msg,
              text: 'No se pudo obtener la respuesta del asistente.',
              from: 'bot',
              pending: false,
              date: new Date().toISOString(),
            }
            : msg,
        ),
      );
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  // Usar portal para asegurar que el bubble siempre esté en la ventana
  return createPortal(
    <>
      {!open && (
        <button
          type="button"
          className="chatbot-bubble-fixed"
          onClick={() => setOpen(true)}
          title="Abrir asistente virtual"
          aria-label="Abrir asistente virtual"
        >
          <div className="chatbot-bubble-circle">
            <Bot size={38} />
          </div>
          <span className="chatbot-bubble-tooltip">Habla con el asistente</span>
        </button>
      )}

      {open && (
        <div className="chatbot-window fade-in" role="dialog" aria-label="Chatbot">
          <div className="chatbot-window__header">
            <div>
              <span>Asistente Virtual</span>
              <div style={{ fontSize: 12, opacity: 0.8 }}>En linea</div>
            </div>
            <button
              type="button"
              className="icon-pill"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chatbot-window__messages" ref={messagesViewportRef}>
            {messages.length === 0 && (
              <div className="chat-message chat-message--bot">
                <div className="chat-message__bubble">
                  Hola, soy tu asistente. En que puedo ayudarte hoy?
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.from === 'user';
              const wrapperClass = `chat-message ${isUser ? 'chat-message--user' : 'chat-message--bot'}`;
              return (
                <div key={msg.id || msg.date} className={wrapperClass}>
                  <div
                    className="chat-message__bubble"
                    style={{ opacity: msg.pending ? 0.6 : 1 }}
                  >
                    {msg.text}
                  </div>
                  <div className="chat-message__meta">
                    {new Date(msg.date).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <form className="chatbot-window__footer" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Escribe tu mensaje..."
              className="chatbot-window__input"
              aria-label="Mensaje para el asistente"
            />
            <button type="submit" className="chatbot-window__send">
              <Send size={16} style={{ marginRight: 6 }} />
              Enviar
            </button>
          </form>
        </div>
      )}
    </>,
    document.body
  );
}
