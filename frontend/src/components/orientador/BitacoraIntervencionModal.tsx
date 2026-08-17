import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import './BitacoraIntervencionModal.css';

export interface IntervencionRecord {
  id: string;
  alumnoId: string;
  alumnoNombre: string;
  matricula: string;
  grupo: string;
  fechaSesion: string;
  tipo: 'conductual' | 'academico' | 'emocional' | 'familiar';
  acuerdos: string;
  fechaSeguimiento?: string;
  registradoPor: string;
  createdAt: string;
}

interface BitacoraIntervencionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIntervencionGuardada: (record: IntervencionRecord) => void;
  preselectedAlumnoId?: string;
}

export const BitacoraIntervencionModal: React.FC<BitacoraIntervencionModalProps> = ({
  isOpen,
  onClose,
  onIntervencionGuardada,
  preselectedAlumnoId,
}) => {
  const { nombre, plantelId } = useAuth();
  const [alumnosList, setAlumnosList] = useState<Array<{ id: string; nombre: string; matricula: string; grupo: string }>>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState(preselectedAlumnoId || '');
  const [tipo, setTipo] = useState<'conductual' | 'academico' | 'emocional' | 'familiar'>('conductual');
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().split('T')[0]);
  const [acuerdos, setAcuerdos] = useState('');
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeToClose(onClose);

  useEffect(() => {
    if (preselectedAlumnoId) {
      setSelectedAlumnoId(preselectedAlumnoId);
    }
  }, [preselectedAlumnoId]);

  useEffect(() => {
    if (!isOpen || !plantelId) return;

    async function loadAlumnos() {
      try {
        const { data, error: err } = await supabase
          .from('alumnos')
          .select('id, matricula, grupos(nombre), usuarios(nombre, apellido)')
          .eq('plantel_id', plantelId)
          .order('matricula');

        if (!err && data) {
          const list = data.map((r: any) => {
            const us = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;
            const gr = Array.isArray(r.grupos) ? r.grupos[0] : r.grupos;
            return {
              id: r.id,
              nombre: `${us?.nombre || ''} ${us?.apellido || ''}`.trim() || 'Sin nombre',
              matricula: r.matricula || '',
              grupo: gr?.nombre || 'Sin Grupo',
            };
          });
          setAlumnosList(list);
          if (!selectedAlumnoId && list.length > 0) {
            setSelectedAlumnoId(list[0].id);
          }
        }
      } catch (e) {
        console.error('Error al cargar lista de alumnos para intervención:', e);
      }
    }

    loadAlumnos();
  }, [isOpen, plantelId, selectedAlumnoId]);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAlumnoId || !acuerdos.trim()) {
      setError('Por favor selecciona un alumno y describe los acuerdos de la sesión.');
      return;
    }

    setLoading(true);
    setError(null);

    const al = alumnosList.find(a => a.id === selectedAlumnoId);
    const newRecord: IntervencionRecord = {
      id: `interv_${Date.now()}`,
      alumnoId: selectedAlumnoId,
      alumnoNombre: al?.nombre || 'Estudiante',
      matricula: al?.matricula || '',
      grupo: al?.grupo || '',
      fechaSesion,
      tipo,
      acuerdos: acuerdos.trim(),
      fechaSeguimiento: fechaSeguimiento || undefined,
      registradoPor: nombre || 'Orientación Educativa',
      createdAt: new Date().toISOString(),
    };

    // Guardar en almacenamiento local persistente por plantel
    const storageKey = `ssc_intervenciones_${plantelId || 'default'}`;
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existing.unshift(newRecord);
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (err) {
      console.warn('Error guardando en localStorage:', err);
    }

    onIntervencionGuardada(newRecord);
    setLoading(false);
    onClose();
  }

  const modalJSX = (
    <div className="bim-overlay" onClick={onClose}>
      <div className="bim-box" onClick={e => e.stopPropagation()}>
        <div className="bim-header">
          <div className="bim-header-title">
            <span className="material-symbols-outlined bim-header-icon">psychology</span>
            <div>
              <h3>Registrar Acuerdo de Intervención</h3>
              <p>Bitácora Psicopedagógica y Compromisos con Tutores</p>
            </div>
          </div>
          <button type="button" className="bim-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="bim-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bim-form">
          <div className="bim-field">
            <label htmlFor="bim-alumno">Estudiante Atendido</label>
            <select
              id="bim-alumno"
              value={selectedAlumnoId}
              onChange={e => setSelectedAlumnoId(e.target.value)}
              required
            >
              {alumnosList.map(a => (
                <option key={a.id} value={a.id}>
                  {a.matricula} — {a.nombre} (Grupo {a.grupo})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="bim-field">
              <label htmlFor="bim-fecha">Fecha de la Sesión</label>
              <input
                id="bim-fecha"
                type="date"
                value={fechaSesion}
                onChange={e => setFechaSesion(e.target.value)}
                required
              />
            </div>

            <div className="bim-field">
              <label htmlFor="bim-tipo">Área de Intervención</label>
              <select
                id="bim-tipo"
                value={tipo}
                onChange={e => setTipo(e.target.value as any)}
              >
                <option value="conductual">Conductual / Convivencia</option>
                <option value="academico">Rendimiento Académico</option>
                <option value="emocional">Apoyo Emocional / Psicológico</option>
                <option value="familiar">Entrevista Familiar con Tutor</option>
              </select>
            </div>
          </div>

          <div className="bim-field">
            <label htmlFor="bim-acuerdos">Acuerdos y Compromisos Establecidos</label>
            <textarea
              id="bim-acuerdos"
              rows={4}
              placeholder="Detalla los compromisos firmados por el tutor y alumno, acuerdos de asistencia y tareas de orientación..."
              value={acuerdos}
              onChange={e => setAcuerdos(e.target.value)}
              required
            />
          </div>

          <div className="bim-field">
            <label htmlFor="bim-seguimiento">Fecha de Próxima Cita / Seguimiento (Opcional)</label>
            <input
              id="bim-seguimiento"
              type="date"
              value={fechaSeguimiento}
              onChange={e => setFechaSeguimiento(e.target.value)}
            />
          </div>

          <div className="bim-footer">
            <button type="button" className="bim-btn-cancel" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="bim-btn-submit" disabled={loading}>
              <span className="material-symbols-outlined">save</span>
              {loading ? 'Guardando...' : 'Guardar en Bitácora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
