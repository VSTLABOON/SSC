import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { getAlumnosDePlantel } from '../../services/alumnos';
import { getCategoriasIncidencia } from '../../services/incidencias';
import { getPeriodoActivo } from '../../services/periodos';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import './GenerarReporteRapidoModal.css';

interface AlumnoOption {
  id: string;
  nombre: string;
  matricula: string;
  grupo: string;
  nivel_semaforo: string;
  puntos_totales: number;
}

interface CategoriaOption {
  id: string;
  nombre: string;
  color_semaforo: string;
  impacto_base: number;
}

interface GenerarReporteRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAlumnoId?: string;
  onReporteGenerado?: () => void;
}

export const GenerarReporteRapidoModal: React.FC<GenerarReporteRapidoModalProps> = ({
  isOpen,
  onClose,
  preselectedAlumnoId,
  onReporteGenerado,
}) => {
  const { session, plantelId } = useAuth();
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [alumnosList, setAlumnosList] = useState<AlumnoOption[]>([]);
  const [categories, setCategories] = useState<CategoriaOption[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);

  const [selectedAlumnoId, setSelectedAlumnoId] = useState(preselectedAlumnoId || '');
  const [isSearching, setIsSearching] = useState(!preselectedAlumnoId);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'rojo' | 'naranja' | 'verde'>('all');

  const [severity, setSeverity] = useState<'verde' | 'naranja' | 'rojo'>('naranja');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [locationName, setLocationName] = useState('Aula');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [comment, setComment] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

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

    async function loadData() {
      setLoadingInitial(true);
      try {
        // 1. Cargar alumnos del plantel
        const rawAlumnos = await getAlumnosDePlantel(plantelId!);
        const formattedAlumnos: AlumnoOption[] = (rawAlumnos as any[]).map(a => {
          const us = Array.isArray(a.usuarios) ? a.usuarios[0] : a.usuarios;
          const gr = Array.isArray(a.grupos) ? a.grupos[0] : a.grupos;
          return {
            id: a.id,
            nombre: `${us?.nombre || ''} ${us?.apellido || ''}`.trim() || 'Estudiante',
            matricula: a.matricula || '',
            grupo: gr?.nombre || 'Sin Grupo',
            nivel_semaforo: a.nivel_semaforo || 'verde',
            puntos_totales: a.puntos_totales ?? 100,
          };
        });
        setAlumnosList(formattedAlumnos);

        // 2. Cargar categorías de incidencia
        const cats = await getCategoriasIncidencia(plantelId!);
        setCategories(cats as CategoriaOption[]);

        // 3. Cargar periodo activo
        const pId = await getPeriodoActivo(plantelId!);
        setPeriodoId(pId);
      } catch (err) {
        console.error('Error al cargar datos en GenerarReporteRapidoModal:', err);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadData();
  }, [isOpen, plantelId]);

  // Alumno actualmente seleccionado
  const selectedAlumno = useMemo(() => {
    return alumnosList.find(a => a.id === selectedAlumnoId) || null;
  }, [alumnosList, selectedAlumnoId]);

  // Categorías filtradas por la severidad elegida
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.color_semaforo === severity);
  }, [categories, severity]);

  // Autoseleccionar la primera categoría cuando cambie la severidad
  useEffect(() => {
    if (filteredCategories.length > 0) {
      setSelectedCategoryId(filteredCategories[0].id);
    } else {
      setSelectedCategoryId('');
    }
  }, [filteredCategories]);

  // Filtrado reactivo de alumnos
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

  function handleNextStep() {
    if (!selectedAlumnoId) {
      setError('Por favor selecciona un estudiante.');
      return;
    }
    if (!selectedCategoryId) {
      setError('Por favor selecciona un motivo o categoría de reporte.');
      return;
    }
    setError(null);
    setActiveStep(2);
  }

  function handleReset() {
    setSelectedAlumnoId('');
    setIsSearching(true);
    setSearchQuery('');
    setComment('');
    setSeverity('naranja');
    setActiveStep(1);
    setIsSuccess(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedAlumnoId || !selectedCategoryId) {
      setActiveStep(1);
      setError('Por favor selecciona un alumno y el motivo del reporte.');
      return;
    }

    if (!comment.trim()) {
      setError('Por favor describe los detalles de la incidencia.');
      return;
    }

    if (!periodoId) {
      setError('No se pudo resolver el período activo del plantel.');
      return;
    }

    setLoading(true);
    try {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      const impacto = selectedCategory ? selectedCategory.impacto_base : 0;

      const combinedTimestamp = incidentDate && incidentTime
        ? new Date(`${incidentDate}T${incidentTime}:00`).toISOString()
        : new Date().toISOString();

      const { error: insertErr } = await supabase
        .from('incidencias')
        .insert({
          alumno_id: selectedAlumnoId,
          registrado_por: session?.user?.id,
          categoria_id: selectedCategoryId,
          descripcion: comment.trim(),
          lugar: locationName,
          impacto_puntos: impacto,
          periodo_id: periodoId,
          created_at: combinedTimestamp,
        });

      if (insertErr) throw insertErr;

      try {
        window.dispatchEvent(
          new CustomEvent('ssc_data_changed', {
            detail: { type: 'incidencia', alumnoId: selectedAlumnoId },
          })
        );
      } catch {
        // Ignorar
      }

      setIsSuccess(true);
      if (onReporteGenerado) onReporteGenerado();
    } catch (err) {
      console.error('Error al emitir reporte rápido:', err);
      setError('Ocurrió un error al registrar el reporte disciplinario.');
    } finally {
      setLoading(false);
    }
  }

  const modalJSX = (
    <div className="grrm-overlay" onClick={onClose}>
      <div className="grrm-box" onClick={e => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="grrm-header">
          <div className="grrm-header-title">
            <span className="material-symbols-outlined grrm-header-icon">assignment_add</span>
            <div>
              <h3>Emisión Rápida de Reporte</h3>
              <p>Registro Inmediato de Incidencias & Conducta</p>
            </div>
          </div>
          <button type="button" className="grrm-close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {isSuccess ? (
          /* Vista de Éxito */
          <div className="grrm-success-box">
            <span className="material-symbols-outlined grrm-success-icon">check_circle</span>
            <h4 className="grrm-success-title">Reporte Emitido con Éxito</h4>
            <p className="grrm-success-desc">
              La incidencia para <strong>{selectedAlumno?.nombre}</strong> ha sido registrada en el expediente escolar y el Semáforo Conductual se ha actualizado en tiempo real.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="grrm-btn-cancel"
                onClick={handleReset}
              >
                Registrar Otro Reporte
              </button>
              <button
                type="button"
                className="grrm-btn-submit"
                onClick={onClose}
              >
                <span className="material-symbols-outlined">done</span>
                <span>Finalizar</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Barra de Pasos */}
            <nav className="grrm-steps-nav" aria-label="Pasos de Reporte">
              <button
                type="button"
                className={`grrm-step-btn ${activeStep === 1 ? 'grrm-step-btn--active' : ''}`}
                onClick={() => setActiveStep(1)}
              >
                <span className="grrm-step-badge">1</span>
                <span>Estudiante & Severidad</span>
              </button>
              <button
                type="button"
                className={`grrm-step-btn ${activeStep === 2 ? 'grrm-step-btn--active' : ''}`}
                onClick={handleNextStep}
              >
                <span className="grrm-step-badge">2</span>
                <span>Detalles & Lugar</span>
              </button>
            </nav>

            {error && (
              <div className="grrm-error">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="grrm-form">
              {/* PASO 1 */}
              {activeStep === 1 && (
                <div className="grrm-step-content">
                  {/* Selector Inteligente de Alumno */}
                  <div className="grrm-field">
                    <label>1. Estudiante</label>
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
                            {loadingInitial ? (
                              <div className="bim-empty-search">Cargando alumnos del plantel...</div>
                            ) : filteredAlumnos.length === 0 ? (
                              <div className="bim-empty-search">No se encontraron estudiantes.</div>
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

                  {/* Selector de Severidad */}
                  <div className="grrm-field">
                    <label>2. Nivel de Severidad</label>
                    <div className="grrm-severity-grid">
                      <div
                        className={`grrm-severity-card grrm-severity-card--verde ${severity === 'verde' ? 'grrm-severity-card--selected' : ''}`}
                        onClick={() => setSeverity('verde')}
                      >
                        <span className="material-symbols-outlined grrm-severity-icon" style={{ color: '#16a34a' }}>recommend</span>
                        <div className="grrm-severity-label" style={{ color: '#15803d' }}>Positiva / Leve</div>
                        <div className="grrm-severity-desc">Reconocimiento o llamada leve</div>
                      </div>

                      <div
                        className={`grrm-severity-card grrm-severity-card--naranja ${severity === 'naranja' ? 'grrm-severity-card--selected' : ''}`}
                        onClick={() => setSeverity('naranja')}
                      >
                        <span className="material-symbols-outlined grrm-severity-icon" style={{ color: '#d97706' }}>warning</span>
                        <div className="grrm-severity-label" style={{ color: '#b45309' }}>Moderada</div>
                        <div className="grrm-severity-desc">Falta a reglamento institucional</div>
                      </div>

                      <div
                        className={`grrm-severity-card grrm-severity-card--rojo ${severity === 'rojo' ? 'grrm-severity-card--selected' : ''}`}
                        onClick={() => setSeverity('rojo')}
                      >
                        <span className="material-symbols-outlined grrm-severity-icon" style={{ color: '#dc2626' }}>dangerous</span>
                        <div className="grrm-severity-label" style={{ color: '#b91c1c' }}>Grave / Crítica</div>
                        <div className="grrm-severity-desc">Incidencia de alta repercusión</div>
                      </div>
                    </div>
                  </div>

                  {/* Motivo o Categoría */}
                  <div className="grrm-field">
                    <label htmlFor="grrm-categoria">3. Motivo / Categoría del Reglamento</label>
                    <select
                      id="grrm-categoria"
                      value={selectedCategoryId}
                      onChange={e => setSelectedCategoryId(e.target.value)}
                      required
                    >
                      {filteredCategories.length === 0 ? (
                        <option value="">No hay motivos registrados para este nivel</option>
                      ) : (
                        filteredCategories.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} (Impacto: {c.impacto_base} pts)
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* PASO 2 */}
              {activeStep === 2 && (
                <div className="grrm-step-content">
                  {selectedAlumno && (
                    <div style={{ background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ color: '#0284c7', fontSize: '20px' }}>person</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                          {selectedAlumno.nombre} ({selectedAlumno.matricula})
                        </span>
                      </div>
                      <span className={`bim-student-semaforo bim-student-semaforo--${severity}`}>
                        Severidad {severity}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div className="grrm-field">
                      <label htmlFor="grrm-lugar">Lugar de la Incidencia</label>
                      <select
                        id="grrm-lugar"
                        value={locationName}
                        onChange={e => setLocationName(e.target.value)}
                      >
                        <option value="Aula">Aula de Clase</option>
                        <option value="Taller / Laboratorio">Taller / Laboratorio</option>
                        <option value="Patio / Canchas">Patio / Canchas</option>
                        <option value="Pasillos">Pasillos</option>
                        <option value="Cafetería">Cafetería</option>
                        <option value="Biblioteca">Biblioteca</option>
                        <option value="Área de Orientación">Área de Orientación</option>
                        <option value="Entrada / Salida">Entrada / Salida</option>
                      </select>
                    </div>

                    <div className="grrm-field">
                      <label htmlFor="grrm-fecha">Fecha del Suceso</label>
                      <input
                        id="grrm-fecha"
                        type="date"
                        value={incidentDate}
                        onChange={e => setIncidentDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grrm-field">
                      <label htmlFor="grrm-hora">Hora aproximada</label>
                      <input
                        id="grrm-hora"
                        type="time"
                        value={incidentTime}
                        onChange={e => setIncidentTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grrm-field">
                    <label htmlFor="grrm-comment">Descripción de los Hechos / Observaciones</label>
                    <textarea
                      id="grrm-comment"
                      rows={5}
                      placeholder="Escribe de manera objetiva los hechos ocurridos, contexto y testimonios de la incidencia..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="grrm-footer">
                {activeStep === 1 ? (
                  <>
                    <button type="button" className="grrm-btn-cancel" onClick={onClose}>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="grrm-btn-next"
                      onClick={handleNextStep}
                      disabled={!selectedAlumnoId || !selectedCategoryId}
                    >
                      <span>Continuar a Detalles</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="grrm-btn-cancel"
                      onClick={() => setActiveStep(1)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                      <span>Volver</span>
                    </button>
                    <button type="submit" className="grrm-btn-submit" disabled={loading || !comment.trim()}>
                      <span className="material-symbols-outlined">send</span>
                      <span>{loading ? 'Emitiendo...' : 'Emitir Reporte'}</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
