import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { queryGroqAgent } from '../../services/groq_agent_service';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';

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

  // Bloquear el scroll del body mientras el modal está abierto para evitar traslapes
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

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

  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = inputQuery.trim();
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

    const aiReplyText = await queryGroqAgent({
      kpiOrChartTitle: target.title,
      dbContextJson: JSON.stringify(target.dataSummary, null, 2),
      userQuery: q,
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

  const modalJSX = (
    <div
      className="modal-backdrop-animated"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-box-animated"
        style={{
          backgroundColor: 'var(--color-bg-card, #ffffff)',
          color: 'var(--color-text-main, #0f172a)',
          borderRadius: '20px',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 2010,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header del Agente IA */}
        <div style={{ background: 'var(--color-brand-chambray, #204785)', color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#a2f4c7' }}>smart_toy</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a2f4c7', fontWeight: 700 }}>
                  Agente IA • Groq Llama 3.3 70B
                </span>
                <span style={{ fontSize: '9px', background: '#10b981', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  Grounded en BD Real
                </span>
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                {target.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Subtitle Bar */}
        <div style={{ background: 'var(--color-bg-app, #f8fafc)', padding: '8px 20px', borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)', fontSize: '12px', color: 'var(--color-text-sub, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-brand-chambray, #60a5fa)' }}>analytics</span>
            {target.subtitle}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-main, #f8fafc)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>database</span>
            Fuente: PostgreSQL RPC (Datos Reales)
          </span>
        </div>

        {/* Chat del Agente IA */}
        <div ref={chatContainerRef} style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--color-bg-app, #0f172a)' }}>
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: m.sender === 'user' ? '80%' : '92%',
                backgroundColor: m.sender === 'user' ? 'var(--color-brand-chambray, #204785)' : 'var(--color-bg-card, #1e293b)',
                color: m.sender === 'user' ? '#ffffff' : 'var(--color-text-main, #f8fafc)',
                padding: '12px 16px',
                borderRadius: m.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: m.sender === 'ai' ? '1px solid var(--color-border-subtle, #334155)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: m.sender === 'user' ? '#a2f4c7' : 'var(--color-brand-chambray, #60a5fa)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {m.sender === 'user' ? 'person' : 'smart_toy'}
                  </span>
                  {m.sender === 'user' ? 'Directivo' : 'Agente IA (Grounded)'}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.7, color: 'var(--color-text-sub, #cbd5e1)' }}>{m.timestamp}</span>
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-line', color: m.sender === 'user' ? '#ffffff' : 'var(--color-text-main, #f8fafc)' }}>
                {m.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div style={{ alignSelf: 'flex-start', backgroundColor: 'var(--color-bg-card, #1e293b)', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #334155)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-brand-chambray, #60a5fa)', animation: 'spin 1s linear infinite' }}>sync</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-sub, #cbd5e1)', fontWeight: 600 }}>Sintetizando consulta con Groq / Llama 3.3 sobre datos reales de la BD...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} style={{ padding: '12px 16px', background: 'var(--color-bg-card, #1e293b)', borderTop: '1px solid var(--color-border-subtle, #334155)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Pregunta al Agente IA sobre esta gráfica..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--color-border-subtle, #475569)',
              background: 'var(--color-bg-app, #0f172a)',
              color: 'var(--color-text-main, #f8fafc)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isThinking}
            style={{
              background: 'var(--color-brand-chambray, #204785)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: !inputQuery.trim() || isThinking ? 0.6 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
            Consultar
          </button>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
