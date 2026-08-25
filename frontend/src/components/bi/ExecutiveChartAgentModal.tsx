import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { queryGroqAgent } from '../../services/groq_agent_service';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export interface ChartAgentTarget {
  type: 'kpi_isc' | 'kpi_semaforo' | 'kpi_riesgo' | 'kpi_incidencias' | 'chart_tendencia' | 'chart_categorias';
  title: string;
  subtitle: string;
  dataSummary: Record<string, any>;
}

interface ExecutiveChartAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ChartAgentTarget | null;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const ExecutiveChartAgentModal: React.FC<ExecutiveChartAgentModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useLockBodyScroll(isOpen);

  // Escuchar tecla Escape con guard para campos editables
  useEscapeToClose(onClose);

  // Auto-scroll al final del chat al recibir mensajes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isThinking]);

  useEffect(() => {
    if (isOpen && target) {
      setIsThinking(true);
      setMessages([]);

      async function initAgent() {
        if (!target) return;
        const groundedAnalysis = await queryGroqAgent({
          kpiOrChartTitle: target.title,
          dbContextJson: JSON.stringify(target.dataSummary, null, 2),
        });

        setMessages([
          {
            id: '1',
            sender: 'ai',
            text: groundedAnalysis,
            timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsThinking(false);
      }

      initAgent();
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  async function handleSendQueryText(queryText: string) {
    const q = queryText.trim();
    if (!q || !target) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    // Construir historial conversacional para contexto del agente IA
    const history = messages.map(m => ({ sender: m.sender, text: m.text }));
    history.push({ sender: 'user' as const, text: q });

    const aiReplyText = await queryGroqAgent({
      kpiOrChartTitle: target.title,
      dbContextJson: JSON.stringify(target.dataSummary, null, 2),
      userQuery: q,
      conversationHistory: history,
    });

    const aiMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: aiReplyText,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsThinking(false);
  }

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    await handleSendQueryText(inputQuery);
  }

  const modalJSX = (
    <div className="ecm-backdrop" onClick={onClose}>
      <div className="ecm-box" onClick={e => e.stopPropagation()}>
        {/* Header del Agente IA */}
        <header className="ecm-header">
          <div className="ecm-header-left">
            <div className="ecm-avatar-wrap">
              <span className="material-symbols-outlined ecm-avatar-icon">smart_toy</span>
            </div>
            <div className="ecm-header-info">
              <div className="ecm-header-tags">
                <span className="ecm-header-tag-role">
                  Asistente IA • Inteligencia Conductual
                </span>
                <span className="ecm-header-tag-online">
                  En Línea
                </span>
              </div>
              <h3 className="ecm-header-title" title={target.title}>
                {target.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="ecm-btn-close"
            onClick={onClose}
            aria-label="Cerrar modal"
            title="Cerrar asistente"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </header>

        {/* Subtitle / Context Bar */}
        <div className="ecm-context-bar">
          <div className="ecm-context-target" title={target.subtitle}>
            <span className="material-symbols-outlined ecm-context-target-icon">analytics</span>
            <span>{target.subtitle}</span>
          </div>
          <span className="ecm-context-badge">
            <span className="material-symbols-outlined ecm-context-badge-icon">verified</span>
            Análisis en Tiempo Real
          </span>
        </div>

        {/* Chat del Agente IA */}
        <div ref={chatContainerRef} className="ecm-chat-container">
          {messages.map(m => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`ecm-bubble ${isUser ? 'ecm-bubble-user' : 'ecm-bubble-ai'}`}
              >
                <div className="ecm-bubble-meta">
                  <span className="ecm-bubble-sender">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                      {isUser ? 'person' : 'smart_toy'}
                    </span>
                    {isUser ? 'Tú' : 'Asistente IA'}
                  </span>
                  <span className="ecm-bubble-timestamp">{m.timestamp}</span>
                </div>
                <div className="ecm-bubble-text">
                  {m.text}
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div className="ecm-thinking-bubble">
              <span className="material-symbols-outlined ecm-spin-icon">sync</span>
              <span className="ecm-thinking-text">El Asistente está consultando la información...</span>
            </div>
          )}
        </div>

        {/* Botones de Sugerencia Rápida */}
        <div className="ecm-suggestions-strip">
          {[
            '¿Qué acciones recomiendas hoy?',
            '¿Cuáles son los grupos con mayor riesgo?',
            '¿Cómo podemos prevenir la deserción?',
          ].map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              className="ecm-chip-btn"
              onClick={() => handleSendQueryText(promptText)}
              disabled={isThinking}
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Formulario de Entrada */}
        <form onSubmit={handleSendMessage} className="ecm-input-form">
          <input
            type="text"
            className="ecm-input-field"
            placeholder="Escribe tu duda sobre estos datos..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
          />
          <button
            type="submit"
            className="ecm-btn-send"
            disabled={!inputQuery.trim() || isThinking}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
