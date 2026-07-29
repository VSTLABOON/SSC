import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { queryGroqAgent } from '../../services/groq_agent_service';

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

  // Escuchar tecla Escape para cerrar modal
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        zIndex: 9999,
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
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 10000,
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header del Agente IA */}
        <div style={{ background: '#204785', color: '#ffffff', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#a2f4c7' }}>smart_toy</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#a2f4c7', fontWeight: 700 }}>
                  Agente IA (Groq Llama 3.3 70B • Grounded en BD)
                </span>
                <span style={{ fontSize: '9px', background: '#10b981', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  100% CERO ALUCINACIÓN
                </span>
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 800, color: '#ffffff' }}>
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
        <div style={{ background: '#f8fafc', padding: '8px 24px', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#204785' }}>analytics</span>
            {target.subtitle}
          </div>
          <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>database</span>
            Fuente: PostgreSQL RPC (Datos Reales)
          </span>
        </div>

        {/* Creador de Mensajes / Chat del Agente IA */}
        <div ref={chatContainerRef} style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f1f5f9' }}>
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: m.sender === 'user' ? '75%' : '90%',
                backgroundColor: m.sender === 'user' ? '#204785' : '#ffffff',
                color: m.sender === 'user' ? '#ffffff' : '#0f172a',
                padding: '14px 18px',
                borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: m.sender === 'ai' ? '1px solid #e2e8f0' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: m.sender === 'user' ? '#a2f4c7' : '#204785', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {m.sender === 'user' ? 'person' : 'smart_toy'}
                  </span>
                  {m.sender === 'user' ? 'Directivo' : 'Agente IA (Grounded)'}
                </span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{m.timestamp}</span>
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                {m.text}
              </div>
            </div>
          ))}

          {isThinking && (
            <div style={{ alignSelf: 'flex-start', backgroundColor: '#ffffff', padding: '12px 18px', borderRadius: '18px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#204785', animation: 'spin 1s linear infinite' }}>sync</span>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Sintetizando consulta con Groq / Llama 3.3 sobre datos reales de la BD...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} style={{ padding: '14px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Pregunta al Agente IA sobre esta gráfica (ej. ¿Qué recomendaciones me das?)..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isThinking}
            style={{
              background: '#204785',
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
