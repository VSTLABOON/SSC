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
    }
  }, [preselectedAlumnoId]);

  useEffect(() => {
    if (!isOpen || !plantelId) return;

    async function loadAlumnos() {
      setLoadingAlumnos(true);
      try {
        // Consulta resiliente a la tabla de alumnos vinculada al plantel mediante grupos
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
          } else if (list.length > 0 && !selectedAlumnoId) {
            // No auto-seleccionar para que el orientador pueda buscar limpiamente
            setIsSearching(true);
          }
        } else if (err) {
          console.warn('[Bitácora] Reintentando carga de alumnos sin inner join:', err);
          // Fallback en caso de esquemas alternativos
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

  // Alumno actualmente seleccionado
  const selectedAlumno = useMemo(() => {
    return alumnosList.find(a => a.id === selectedAlumnoId) || null;
  }, [alumnosList, selectedAlumnoId]);

  // Filtrado inteligente en tiempo real por búsqueda y semáforo
  const filteredAlumnos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return alumnosList.filter(a => {
      // Filtro de semáforo
      if (riskFilter !== 'all' && a.nivel_semaforo !== riskFilter) {
        return false;
      }
      // Filtro de texto
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAlumnoId || !acuerdos.trim()) {
      setError('Por favor selecciona un alumno y describe los acuerdos de la sesión.');
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
          {/* Selector Inteligente de Estudiante */}
          <div className="bim-field">
            <label>Estudiante Atendido</label>
            <div className="bim-smart-picker">
              {selectedAlumno && !isSearching ? (
                /* Ficha de Alumno Seleccionado */
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
                /* Buscador Interactivo con Filtros Rápidos */
                <>
                  <div className="bim-search-box">
                    <span className="material-symbols-outlined bim-search-icon">search</span>
                    <input
                      type="text"
                      className="bim-search-input"
                      placeholder="Escribe nombre, apellido, matrícula o grupo..."
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

                  {/* Chips de Filtro Rápido por Riesgo */}
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

                  {/* Lista de Resultados Filtrados */}
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
            <button type="submit" className="bim-btn-submit" disabled={loading || !selectedAlumnoId}>
              <span className="material-symbols-outlined">save</span>
              <span>{loading ? 'Guardando...' : 'Guardar en Bitácora'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
