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

const MOTIVOS_CITA = [
  'Seguimiento Conductual y Disciplinario',
  'Rendimiento Académico y Calificaciones',
  'Orientación Vocacional y Apoyo Psicológico',
  'Situación Personal / Familiar',
  'Aclaración de Reportes o Inasistencias',
];

export const SolicitarCitaModal: React.FC<SolicitarCitaModalProps> = ({
  isOpen,
  onClose,
  alumnoNombre,
  onCitaSolicitada,
}) => {
  const { session, nombre, plantelId } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [motivo, setMotivo] = useState(MOTIVOS_CITA[0]);
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

  function handleNextStep() {
    if (!fechaPropuesta || !horaPropuesta) {
      setError('Por favor selecciona la fecha y hora sugerida.');
      return;
    }
    setError(null);
    setCurrentStep(2);
  }

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
        {/* Header */}
        <div className="scm-header">
          <div className="scm-header-title">
            <span className="material-symbols-outlined scm-header-icon">calendar_month</span>
            <div>
              <h3>Solicitar Cita con Orientación</h3>
              <p>Seguimiento y apoyo escolar para {alumnoNombre}</p>
            </div>
          </div>
          <button type="button" className="scm-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Pestañas de Paso */}
        <nav className="scm-steps-nav">
          <button
            type="button"
            className={`scm-step-btn ${currentStep === 1 ? 'scm-step-btn--active' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="scm-step-badge">1</span>
            <span>Motivo y Horario</span>
          </button>
          <button
            type="button"
            className={`scm-step-btn ${currentStep === 2 ? 'scm-step-btn--active' : ''}`}
            onClick={() => {
              if (fechaPropuesta && horaPropuesta) setCurrentStep(2);
            }}
          >
            <span className="scm-step-badge">2</span>
            <span>Detalles y Confirmación</span>
          </button>
        </nav>

        {error && (
          <div className="scm-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="scm-form">
          {/* Paso 1: Motivo y Horario */}
          {currentStep === 1 && (
            <div className="scm-step-content">
              <div style={{ background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                  {alumnoNombre.charAt(0)}
                </div>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-text-sub, #64748b)', textTransform: 'uppercase', display: 'block' }}>
                    Estudiante Tutelado
                  </span>
                  <strong style={{ fontSize: '13px', color: 'var(--color-text-main, #0f172a)' }}>{alumnoNombre}</strong>
                </div>
              </div>

              <div className="scm-field">
                <label htmlFor="scm-motivo">Motivo Principal de la Sesión</label>
                <select
                  id="scm-motivo"
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                >
                  {MOTIVOS_CITA.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
                  <select
                    id="scm-hora"
                    value={horaPropuesta}
                    onChange={e => setHoraPropuesta(e.target.value)}
                  >
                    <option value="08:00">08:00 hrs</option>
                    <option value="09:00">09:00 hrs</option>
                    <option value="10:00">10:00 hrs</option>
                    <option value="11:00">11:00 hrs</option>
                    <option value="12:00">12:00 hrs</option>
                    <option value="13:00">13:00 hrs</option>
                    <option value="15:00">15:00 hrs (Vespertino)</option>
                    <option value="16:00">16:00 hrs (Vespertino)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Detalles y Confirmación */}
          {currentStep === 2 && (
            <div className="scm-step-content">
              <div style={{ background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: '10px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#7c3aed', display: 'block' }}>
                    {motivo}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-main, #0f172a)' }}>
                    Cita para el {fechaPropuesta} a las {horaPropuesta} hrs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cambiar
                </button>
              </div>

              <div className="scm-field">
                <label htmlFor="scm-detalles">Temas o Inquietudes a Tratar</label>
                <textarea
                  id="scm-detalles"
                  rows={4}
                  placeholder="Describe brevemente los puntos que te gustaría dialogar con el orientador o psicopedagogo..."
                  value={detalles}
                  onChange={e => setDetalles(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#7c3aed' }}>event_available</span>
                <span>El área de Orientación revisará tu solicitud y confirmará la disponibilidad del horario.</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="scm-footer">
            {currentStep === 1 ? (
              <>
                <button type="button" className="scm-btn-cancel" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="scm-btn-submit" onClick={handleNextStep}>
                  <span>Continuar</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="scm-btn-cancel" onClick={() => setCurrentStep(1)} disabled={loading}>
                  Atrás
                </button>
                <button type="submit" className="scm-btn-submit" disabled={loading}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                  <span>{loading ? 'Enviando...' : 'Confirmar Solicitud'}</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
