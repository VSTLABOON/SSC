import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import './SolicitarCitaModal.css';

export interface CitaRecord {
  id: string;
  padreId: string;
  padreNombre: string;
  alumnoNombre: string;
  motivo: string;
  fechaPropuesta: string;
  horaPropuesta: string;
  detalles: string;
  estado: 'pendiente' | 'confirmada' | 'reprogramada';
  createdAt: string;
}

interface SolicitarCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumnoNombre: string;
  onCitaSolicitada: (record: CitaRecord) => void;
}

export const SolicitarCitaModal: React.FC<SolicitarCitaModalProps> = ({
  isOpen,
  onClose,
  alumnoNombre,
  onCitaSolicitada,
}) => {
  const { session, nombre, plantelId } = useAuth();
  const [motivo, setMotivo] = useState('Seguimiento Conductual y Académico');
  const [fechaPropuesta, setFechaPropuesta] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [horaPropuesta, setHoraPropuesta] = useState('10:00');
  const [detalles, setDetalles] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeToClose(onClose);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detalles.trim()) {
      setError('Por favor indica los temas o inquietudes que deseas tratar en la sesión.');
      return;
    }

    setLoading(true);
    setError(null);

    const newCita: CitaRecord = {
      id: `cita_${Date.now()}`,
      padreId: session?.user?.id || 'padre',
      padreNombre: nombre || 'Padre de Familia / Tutor',
      alumnoNombre,
      motivo,
      fechaPropuesta,
      horaPropuesta,
      detalles: detalles.trim(),
      estado: 'pendiente',
      createdAt: new Date().toISOString(),
    };

    // Almacenamiento en el registro del plantel para consulta de Orientación
    try {
      const storageKey = `ssc_citas_orientacion_${plantelId || 'default'}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift(newCita);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (err) {
      console.warn('Error al guardar cita de orientación:', err);
    }

    onCitaSolicitada(newCita);
    setLoading(false);
    onClose();
  }

  const modalJSX = (
    <div className="scm-overlay" onClick={onClose}>
      <div className="scm-box" onClick={e => e.stopPropagation()}>
        <div className="scm-header">
          <div className="scm-header-title">
            <span className="material-symbols-outlined scm-header-icon">calendar_month</span>
            <div>
              <h3>Solicitar Cita con Orientación Educativa</h3>
              <p>Agenda una sesión presencial o virtual para dar seguimiento a {alumnoNombre}</p>
            </div>
          </div>
          <button type="button" className="scm-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="scm-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="scm-form">
          <div className="scm-field">
            <label htmlFor="scm-motivo">Motivo Principal de la Solicitud</label>
            <select
              id="scm-motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            >
              <option value="Seguimiento Conductual y Académico">Seguimiento Conductual y Académico</option>
              <option value="Aclaración de Reportes / Faltas">Aclaración de Reportes o Inasistencias</option>
              <option value="Apoyo Psicopedagógico / Emocional">Solicitud de Apoyo Psicopedagógico / Emocional</option>
              <option value="Plática Informativa sobre Rendimiento">Plática Informativa sobre Rendimiento Escolar</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="scm-field">
              <label htmlFor="scm-fecha">Fecha Sugerida</label>
              <input
                id="scm-fecha"
                type="date"
                value={fechaPropuesta}
                onChange={e => setFechaPropuesta(e.target.value)}
                required
              />
            </div>

            <div className="scm-field">
              <label htmlFor="scm-hora">Horario Preferido</label>
              <input
                id="scm-hora"
                type="time"
                value={horaPropuesta}
                onChange={e => setHoraPropuesta(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="scm-field">
            <label htmlFor="scm-detalles">Temas a Tratar y Observaciones del Tutor</label>
            <textarea
              id="scm-detalles"
              rows={4}
              placeholder="Describe brevemente tus inquietudes o la situación específica que deseas conversar con el orientador..."
              value={detalles}
              onChange={e => setDetalles(e.target.value)}
              required
            />
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563eb' }}>info</span>
            <span>El departamento de Orientación Escolar revisará tu solicitud y confirmará la fecha y hora a través del portal.</span>
          </div>

          <div className="scm-footer">
            <button type="button" className="scm-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="scm-btn-submit" disabled={loading}>
              <span className="material-symbols-outlined">send</span>
              {loading ? 'Enviando...' : 'Enviar Solicitud de Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
