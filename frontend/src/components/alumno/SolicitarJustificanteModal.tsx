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

export const SolicitarJustificanteModal: React.FC<SolicitarJustificanteModalProps> = ({
  isOpen,
  onClose,
  alumnoDbId,
  onJustificanteEnviado,
}) => {
  const { session } = useAuth();
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [motivo, setMotivo] = useState<'medico' | 'familiar' | 'tramite' | 'fuerza_mayor'>('medico');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeToClose(onClose);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError('Por favor explica el motivo y circunstancias de tu inasistencia.');
      return;
    }
    if (new Date(fechaFin) < new Date(fechaInicio)) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
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
      // Intentar guardar en public.justificantes si la tabla está disponible
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

    // Almacenamiento local persistente para el alumno
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

  const modalJSX = (
    <div className="sjm-overlay" onClick={onClose}>
      <div className="sjm-box" onClick={e => e.stopPropagation()}>
        <div className="sjm-header">
          <div className="sjm-header-title">
            <span className="material-symbols-outlined sjm-header-icon">edit_calendar</span>
            <div>
              <h3>Solicitar Justificante de Inasistencia</h3>
              <p>Envía tu solicitud a revisión de Orientación Escolar</p>
            </div>
          </div>
          <button type="button" className="sjm-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="sjm-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sjm-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="sjm-field">
              <label htmlFor="sjm-inicio">Fecha de Inicio de Falta</label>
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
            <label htmlFor="sjm-motivo">Causa de la Inasistencia</label>
            <select
              id="sjm-motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value as any)}
            >
              <option value="medico">Causa de Salud / Cita Médica (IMSS, ISSSTE, etc.)</option>
              <option value="familiar">Emergencia Familiar Ineludible</option>
              <option value="tramite">Trámite Oficial / Beca / Documentación</option>
              <option value="fuerza_mayor">Causa de Fuerza Mayor / Transporte</option>
            </select>
          </div>

          <div className="sjm-field">
            <label htmlFor="sjm-desc">Descripción y Justificación</label>
            <textarea
              id="sjm-desc"
              rows={4}
              placeholder="Explica detalladamente el motivo de tu ausencia e indica si cuentas con receta médica o constancia física..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
            />
          </div>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#16a34a' }}>info</span>
            <span>Al enviar tu solicitud, Orientación Escolar revisará el caso para justificar las faltas correspondientes en tus asignaturas.</span>
          </div>

          <div className="sjm-footer">
            <button type="button" className="sjm-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="sjm-btn-submit" disabled={loading}>
              <span className="material-symbols-outlined">send</span>
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
