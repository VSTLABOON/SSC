import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import './PublicarAvisoModal.css';

interface PublicarAvisoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvisoPublicado: () => void;
}

export const PublicarAvisoModal: React.FC<PublicarAvisoModalProps> = ({
  isOpen,
  onClose,
  onAvisoPublicado,
}) => {
  const { plantelId } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [destinatarios, setDestinatarios] = useState<'todos' | 'alumnos' | 'padres' | 'docentes'>('todos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeToClose(onClose);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      setError('Por favor completa el título y el contenido del comunicado.');
      return;
    }
    if (!plantelId) {
      setError('No se pudo identificar el plantel asociado al directivo.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: insertError } = await supabase.from('avisos').insert({
        plantel_id: plantelId,
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        destinatarios,
        fecha_publicacion: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setTitulo('');
      setContenido('');
      setDestinatarios('todos');
      onAvisoPublicado();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al publicar el aviso institucional.');
    } finally {
      setLoading(false);
    }
  }

  const modalJSX = (
    <div className="pam-overlay" onClick={onClose}>
      <div className="pam-box" onClick={e => e.stopPropagation()}>
        <div className="pam-header">
          <div className="pam-header-title">
            <span className="material-symbols-outlined pam-header-icon">campaign</span>
            <div>
              <h3>Publicar Aviso Institucional</h3>
              <p>Emite un comunicado oficial a la comunidad del plantel</p>
            </div>
          </div>
          <button type="button" className="pam-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="pam-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="pam-form">
          <div className="pam-field">
            <label htmlFor="pam-titulo">Título del Comunicado</label>
            <input
              id="pam-titulo"
              type="text"
              placeholder="Ej. Junta General de Padres de Familia / Suspensión de Labores"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              maxLength={150}
              required
            />
          </div>

          <div className="pam-field">
            <label htmlFor="pam-audiencia">Audiencia Destinataria</label>
            <select
              id="pam-audiencia"
              value={destinatarios}
              onChange={e => setDestinatarios(e.target.value as any)}
            >
              <option value="todos">Toda la Comunidad (Alumnos, Padres y Docentes)</option>
              <option value="alumnos">Solo Alumnos</option>
              <option value="padres">Solo Padres / Tutores</option>
              <option value="docentes">Solo Personal Docente</option>
            </select>
          </div>

          <div className="pam-field">
            <label htmlFor="pam-contenido">Contenido del Aviso</label>
            <textarea
              id="pam-contenido"
              rows={4}
              placeholder="Escribe los detalles, fechas importantes e instrucciones oficiales..."
              value={contenido}
              onChange={e => setContenido(e.target.value)}
              required
            />
          </div>

          <div className="pam-footer">
            <button type="button" className="pam-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="pam-btn-submit" disabled={loading}>
              <span className="material-symbols-outlined">send</span>
              {loading ? 'Publicando...' : 'Publicar Aviso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
