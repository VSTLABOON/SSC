import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import './SolicitarJustificanteModal.css';

export interface JustificanteRecord {
  id: string;
  alumnoId: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  descripcion: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  createdAt: string;
}

interface SolicitarJustificanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  alumnoDbId: string;
  onJustificanteEnviado: (record: JustificanteRecord) => void;
}

const CAUSAS = [
  { id: 'medico', label: 'Causa Médica', desc: 'Cita en IMSS/ISSSTE o enfermedad', icon: 'medical_services' },
  { id: 'familiar', label: 'Emergencia Familiar', desc: 'Situación familiar ineludible', icon: 'family_restroom' },
  { id: 'tramite', label: 'Trámite Oficial', desc: 'Trámite de beca o documentación', icon: 'description' },
  { id: 'fuerza_mayor', label: 'Fuerza Mayor', desc: 'Causa de fuerza mayor / transporte', icon: 'commute' },
] as const;

export const SolicitarJustificanteModal: React.FC<SolicitarJustificanteModalProps> = ({
  isOpen,
  onClose,
  alumnoDbId,
  onJustificanteEnviado,
}) => {
  const { session } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<typeof CAUSAS[number]['id']>('medico');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeToClose(onClose);

  if (!isOpen) return null;

  function handleNextStep() {
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    setError(null);
    setCurrentStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError('Por favor explica el motivo y circunstancias de tu inasistencia.');
      return;
    }

    setLoading(true);
    setError(null);

    const newRecord: JustificanteRecord = {
      id: `justif_${Date.now()}`,
      alumnoId: alumnoDbId || session?.user?.id || 'alumno',
      fechaInicio,
      fechaFin,
      motivo,
      descripcion: descripcion.trim(),
      estado: 'pendiente',
      createdAt: new Date().toISOString(),
    };

    try {
      if (alumnoDbId) {
        await supabase.from('justificantes').insert({
          alumno_id: alumnoDbId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          motivo: `${motivo.toUpperCase()}: ${descripcion.trim()}`,
          estado: 'pendiente',
        });
      }
    } catch (err) {
      console.warn('Registro en justificantes BD falló, respaldando localmente:', err);
    }

    try {
      const storageKey = `ssc_justificantes_${alumnoDbId || session?.user?.id || 'default'}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift(newRecord);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (e) {
      console.warn('Error en storage justificantes:', e);
    }

    onJustificanteEnviado(newRecord);
    setLoading(false);
    onClose();
  }

  const selectedCausaObj = CAUSAS.find(c => c.id === motivo) || CAUSAS[0];

  const modalJSX = (
    <div className="sjm-overlay" onClick={onClose}>
      <div className="sjm-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sjm-header">
          <div className="sjm-header-title">
            <span className="material-symbols-outlined sjm-header-icon">edit_calendar</span>
            <div>
              <h3>Solicitar Justificante de Inasistencia</h3>
              <p>Envía tu trámite a revisión de Orientación Escolar</p>
            </div>
          </div>
          <button type="button" className="sjm-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Pestañas de Paso */}
        <nav className="sjm-steps-nav">
          <button
            type="button"
            className={`sjm-step-btn ${currentStep === 1 ? 'sjm-step-btn--active' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <span className="sjm-step-badge">1</span>
            <span>Fechas y Causa</span>
          </button>
          <button
            type="button"
            className={`sjm-step-btn ${currentStep === 2 ? 'sjm-step-btn--active' : ''}`}
            onClick={() => {
              if (new Date(fechaFin) >= new Date(fechaInicio)) {
                setCurrentStep(2);
              }
            }}
          >
            <span className="sjm-step-badge">2</span>
            <span>Explicación y Envío</span>
          </button>
        </nav>

        {error && (
          <div className="sjm-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sjm-form">
          {/* Paso 1: Fechas y Causa */}
          {currentStep === 1 && (
            <div className="sjm-step-content">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="sjm-field">
                  <label htmlFor="sjm-inicio">Fecha de Inicio</label>
                  <input
                    id="sjm-inicio"
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    required
                  />
                </div>

                <div className="sjm-field">
                  <label htmlFor="sjm-fin">Fecha de Fin</label>
                  <input
                    id="sjm-fin"
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="sjm-field">
                <label>Tipo de Causa</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {CAUSAS.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setMotivo(c.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: motivo === c.id ? '1.5px solid #0d9488' : '1px solid var(--color-border-subtle, #cbd5e1)',
                        background: motivo === c.id ? 'rgba(13, 148, 136, 0.08)' : 'var(--color-bg-card, #ffffff)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: motivo === c.id ? '#0d9488' : '#64748b' }}>
                          {c.icon}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: motivo === c.id ? '#0d9488' : 'var(--color-text-main, #0f172a)' }}>
                          {c.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-sub, #64748b)' }}>{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Paso 2: Explicación y Envío */}
          {currentStep === 2 && (
            <div className="sjm-step-content">
              <div style={{ background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)', borderRadius: '10px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#0d9488', display: 'block' }}>
                    {selectedCausaObj.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-main, #0f172a)' }}>
                    Periodo: {fechaInicio} al {fechaFin}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{ fontSize: '11px', fontWeight: 700, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Cambiar
                </button>
              </div>

              <div className="sjm-field">
                <label htmlFor="sjm-desc">Descripción y Motivos de la Ausencia</label>
                <textarea
                  id="sjm-desc"
                  rows={4}
                  placeholder="Detalla las razones de tu falta e indica si cuentas con receta médica, constancia o comprobante..."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', fontSize: '11.5px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#16a34a' }}>info</span>
                <span>Orientación Escolar validará tu solicitud para justificar tus faltas de manera oficial.</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="sjm-footer">
            {currentStep === 1 ? (
              <>
                <button type="button" className="sjm-btn-cancel" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button type="button" className="sjm-btn-submit" onClick={handleNextStep}>
                  <span>Continuar</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" className="sjm-btn-cancel" onClick={() => setCurrentStep(1)} disabled={loading}>
                  Atrás
                </button>
                <button type="submit" className="sjm-btn-submit" disabled={loading}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                  <span>{loading ? 'Enviando...' : 'Enviar Solicitud'}</span>
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
