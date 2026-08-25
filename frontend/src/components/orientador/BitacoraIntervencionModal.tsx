import React, { useState, useEffect, useMemo } from 'react';
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

interface AlumnoOption {
  id: string;
  nombre: string;
  matricula: string;
  grupo: string;
  nivel_semaforo: string;
  puntos_totales: number;
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
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [alumnosList, setAlumnosList] = useState<AlumnoOption[]>([]);
  const [selectedAlumnoId, setSelectedAlumnoId] = useState(preselectedAlumnoId || '');
  const [isSearching, setIsSearching] = useState(!preselectedAlumnoId);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'rojo' | 'naranja' | 'verde'>('all');
  const [tipo, setTipo] = useState<'conductual' | 'academico' | 'emocional' | 'familiar'>('conductual');
  const [fechaSesion, setFechaSesion] = useState(new Date().toISOString().split('T')[0]);
  const [acuerdos, setAcuerdos] = useState('');
  const [fechaSeguimiento, setFechaSeguimiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLockBodyScroll(isOpen);
  useEscapeToClose(onClose);

  useEffect(() => {
    if (preselectedAlumnoId) {
      setSelectedAlumnoId(preselectedAlumnoId);
      setIsSearching(false);
      setActiveStep(1);
    }
  }, [preselectedAlumnoId]);

  useEffect(() => {
    if (!isOpen || !plantelId) return;

    async function loadAlumnos() {
      setLoadingAlumnos(true);
      try {
        const { data, error: err } = await supabase
          .from('alumnos')
          .select('id, matricula, nivel_semaforo, puntos_totales, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos!inner(plantel_id, nombre)')
          .eq('grupos.plantel_id', plantelId)
          .order('matricula');

        if (!err && data) {
          const list: AlumnoOption[] = data.map((r: any) => {
            const us = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;
            const gr = Array.isArray(r.grupos) ? r.grupos[0] : r.grupos;
            return {
              id: r.id,
              nombre: `${us?.nombre || ''} ${us?.apellido || ''}`.trim() || 'Estudiante',
              matricula: r.matricula || '',
              grupo: gr?.nombre || 'Sin Grupo',
              nivel_semaforo: r.nivel_semaforo || 'verde',
              puntos_totales: r.puntos_totales ?? 100,
            };
          });
          setAlumnosList(list);

          if (preselectedAlumnoId) {
            setSelectedAlumnoId(preselectedAlumnoId);
            setIsSearching(false);
          }
        } else if (err) {
          console.warn('[Bitácora] Reintentando carga de alumnos sin inner join:', err);
          const { data: fallbackData } = await supabase
            .from('alumnos')
            .select('id, matricula, nivel_semaforo, puntos_totales, usuarios(nombre, apellido), grupos(nombre)')
            .limit(300);

          if (fallbackData) {
            const list: AlumnoOption[] = fallbackData.map((r: any) => {
              const us = Array.isArray(r.usuarios) ? r.usuarios[0] : r.usuarios;
              const gr = Array.isArray(r.grupos) ? r.grupos[0] : r.grupos;
              return {
                id: r.id,
                nombre: `${us?.nombre || ''} ${us?.apellido || ''}`.trim() || 'Estudiante',
                matricula: r.matricula || '',
                grupo: gr?.nombre || 'Sin Grupo',
                nivel_semaforo: r.nivel_semaforo || 'verde',
                puntos_totales: r.puntos_totales ?? 100,
              };
            });
            setAlumnosList(list);
          }
        }
      } catch (e) {
        console.error('Error al cargar lista de alumnos para intervención:', e);
      } finally {
        setLoadingAlumnos(false);
      }
    }

    loadAlumnos();
  }, [isOpen, plantelId, preselectedAlumnoId]);

  const selectedAlumno = useMemo(() => {
    return alumnosList.find(a => a.id === selectedAlumnoId) || null;
  }, [alumnosList, selectedAlumnoId]);

  const filteredAlumnos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return alumnosList.filter(a => {
      if (riskFilter !== 'all' && a.nivel_semaforo !== riskFilter) {
        return false;
      }
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        a.matricula.toLowerCase().includes(q) ||
        a.grupo.toLowerCase().includes(q)
      );
    });
  }, [alumnosList, searchQuery, riskFilter]);

  if (!isOpen) return null;

  function handleSelectStudent(a: AlumnoOption) {
    setSelectedAlumnoId(a.id);
    setIsSearching(false);
    setError(null);
  }

  function handleSetQuickDate(daysToAdd: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setFechaSeguimiento(d.toISOString().split('T')[0]);
  }

  function handleNextStep() {
    if (!selectedAlumnoId) {
      setError('Por favor selecciona un estudiante antes de continuar.');
      return;
    }
    setError(null);
    setActiveStep(2);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAlumnoId) {
      setActiveStep(1);
      setError('Por favor selecciona un estudiante.');
      return;
    }
    if (!acuerdos.trim()) {
      setError('Por favor describe los acuerdos y compromisos establecidos.');
      return;
    }

    setLoading(true);
    setError(null);

    const al = selectedAlumno || alumnosList.find(a => a.id === selectedAlumnoId);
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
        {/* Encabezado */}
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

        {/* Barra de Pasos / Pestañas */}
        <nav className="bim-steps-nav" aria-label="Pasos de Registro">
          <button
            type="button"
            className={`bim-step-btn ${activeStep === 1 ? 'bim-step-btn--active' : ''}`}
            onClick={() => setActiveStep(1)}
          >
            <span className="bim-step-badge">1</span>
            <span>Estudiante y Sesión</span>
          </button>
          <button
            type="button"
            className={`bim-step-btn ${activeStep === 2 ? 'bim-step-btn--active' : ''}`}
            onClick={handleNextStep}
          >
            <span className="bim-step-badge">2</span>
            <span>Acuerdos y Seguimiento</span>
          </button>
        </nav>

        {error && (
          <div className="bim-error">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bim-form">
          {/* PASO 1: Selección de Alumno y Contexto de la Sesión */}
          {activeStep === 1 && (
            <div className="bim-step-content">
              <div className="bim-field">
                <label>1. Estudiante Atendido</label>
                <div className="bim-smart-picker">
                  {selectedAlumno && !isSearching ? (
                    <div className="bim-selected-student-card">
                      <div className="bim-student-avatar">
                        {selectedAlumno.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="bim-student-info">
                        <div className="bim-student-name">{selectedAlumno.nombre}</div>
                        <div className="bim-student-meta">
                          <span>Matrícula: <strong>{selectedAlumno.matricula}</strong></span>
                          <span>• Grupo: <strong>{selectedAlumno.grupo}</strong></span>
                          <span className={`bim-student-semaforo bim-student-semaforo--${selectedAlumno.nivel_semaforo}`}>
                            {selectedAlumno.puntos_totales} pts ({selectedAlumno.nivel_semaforo})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="bim-btn-change-student"
                        onClick={() => {
                          setIsSearching(true);
                          setSearchQuery('');
                        }}
                        title="Buscar otro estudiante"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
                        <span>Cambiar</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bim-search-box">
                        <span className="material-symbols-outlined bim-search-icon">search</span>
                        <input
                          type="text"
                          className="bim-search-input"
                          placeholder="Buscar por nombre, matrícula o grupo..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          autoFocus={isSearching}
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            className="bim-btn-clear-search"
                            onClick={() => setSearchQuery('')}
                            aria-label="Limpiar búsqueda"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                          </button>
                        )}
                      </div>

                      <div className="bim-filter-chips">
                        <button
                          type="button"
                          className={`bim-filter-chip ${riskFilter === 'all' ? 'bim-filter-chip--active' : ''}`}
                          onClick={() => setRiskFilter('all')}
                        >
                          Todos ({alumnosList.length})
                        </button>
                        <button
                          type="button"
                          className={`bim-filter-chip bim-filter-chip--rojo ${riskFilter === 'rojo' ? 'bim-filter-chip--active' : ''}`}
                          onClick={() => setRiskFilter('rojo')}
                        >
                          Semáforo Rojo ({alumnosList.filter(a => a.nivel_semaforo === 'rojo').length})
                        </button>
                        <button
                          type="button"
                          className={`bim-filter-chip bim-filter-chip--naranja ${riskFilter === 'naranja' ? 'bim-filter-chip--active' : ''}`}
                          onClick={() => setRiskFilter('naranja')}
                        >
                          Semáforo Naranja ({alumnosList.filter(a => a.nivel_semaforo === 'naranja').length})
                        </button>
                      </div>

                      <div className="bim-results-list">
                        {loadingAlumnos ? (
                          <div className="bim-empty-search">Cargando alumnos del plantel...</div>
                        ) : filteredAlumnos.length === 0 ? (
                          <div className="bim-empty-search">
                            No se encontraron estudiantes con los criterios especificados.
                          </div>
                        ) : (
                          filteredAlumnos.slice(0, 40).map(a => (
                            <div
                              key={a.id}
                              className={`bim-result-item ${selectedAlumnoId === a.id ? 'bim-result-item--selected' : ''}`}
                              onClick={() => handleSelectStudent(a)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <div className="bim-student-avatar" style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                                  {a.nombre.substring(0, 2).toUpperCase()}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {a.nombre}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-text-sub, #64748b)' }}>
                                    {a.matricula} • Grupo {a.grupo}
                                  </div>
                                </div>
                              </div>
                              <span className={`bim-student-semaforo bim-student-semaforo--${a.nivel_semaforo}`}>
                                {a.puntos_totales} pts
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <div className="bim-field">
                  <label htmlFor="bim-fecha">2. Fecha de la Sesión</label>
                  <input
                    id="bim-fecha"
                    type="date"
                    value={fechaSesion}
                    onChange={e => setFechaSesion(e.target.value)}
                    required
                  />
                </div>

                <div className="bim-field">
                  <label htmlFor="bim-tipo">3. Área de Intervención</label>
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
            </div>
          )}

          {/* PASO 2: Redacción de Acuerdos y Próxima Cita */}
          {activeStep === 2 && (
            <div className="bim-step-content">
              {/* Resumen del Estudiante en Paso 2 */}
              {selectedAlumno && (
                <div style={{ background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '20px' }}>person</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                      {selectedAlumno.nombre} (Grupo {selectedAlumno.grupo})
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    Área: {tipo}
                  </span>
                </div>
              )}

              <div className="bim-field">
                <label htmlFor="bim-acuerdos">Acuerdos y Compromisos Establecidos</label>
                <textarea
                  id="bim-acuerdos"
                  rows={5}
                  placeholder="Detalla los compromisos asumidos por el alumno, acuerdos de asistencia y tareas de orientación escolar..."
                  value={acuerdos}
                  onChange={e => setAcuerdos(e.target.value)}
                  required
                  autoFocus
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
                <div className="bim-quick-date-chips">
                  <span style={{ fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)' }}>Accesos rápidos:</span>
                  <button type="button" className="bim-quick-date-btn" onClick={() => handleSetQuickDate(7)}>
                    +7 días
                  </button>
                  <button type="button" className="bim-quick-date-btn" onClick={() => handleSetQuickDate(15)}>
                    +15 días
                  </button>
                  <button type="button" className="bim-quick-date-btn" onClick={() => handleSetQuickDate(30)}>
                    +1 mes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer con Navegación de Pasos */}
          <div className="bim-footer">
            {activeStep === 1 ? (
              <>
                <button type="button" className="bim-btn-cancel" onClick={onClose}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="bim-btn-next"
                  onClick={handleNextStep}
                  disabled={!selectedAlumnoId}
                >
                  <span>Continuar a Acuerdos</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="bim-btn-cancel"
                  onClick={() => setActiveStep(1)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                  <span>Volver al Paso 1</span>
                </button>
                <button type="submit" className="bim-btn-submit" disabled={loading || !acuerdos.trim()}>
                  <span className="material-symbols-outlined">save</span>
                  <span>{loading ? 'Guardando...' : 'Guardar en Bitácora'}</span>
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
