import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAlumnosDeGrupo } from '../../services/alumnos';
import { getPeriodoActivo } from '../../services/periodos';
import { getCategoriasIncidencia } from '../../services/incidencias';
import { supabase } from '../../lib/supabaseClient';
import './Asignacionestatus.css';

interface StatusOption {
  color: string;
  border: string;
  title: string;
}

interface RowStatus {
  selectedIndex: number | null;
  color: string;
  border: string;
}

type ToastState = 'hidden' | 'visible' | 'fading';

const STATUS_OPTIONS: StatusOption[] = [
  { color: '#22C55E', border: 'none', title: 'Participó' },
  { color: 'white', border: '#E2E8F0', title: 'Falta' },
  { color: '#EF4444', border: 'none', title: 'Problema' },
  { color: '#FACC15', border: 'none', title: 'Retardo' },
  { color: '#F97316', border: 'none', title: 'No trabajó' },
];

interface StudentForAttendance {
  id: string;
  matricula: string;
  nivel_semaforo: string;
  puntos_totales: number;
  usuarios: unknown;
}

export default function AsignacionEstatus() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, plantelId } = useAuth();

  // Obtenemos los datos del grupo y la materia pasados por react-router state
  const state = location.state as {
    grupoId?: string;
    grupoNombre?: string;
    materiaId?: string;
    materiaNombre?: string;
  } | null;

  const grupoId = state?.grupoId || 'sin-id';
  const grupoNombre = state?.grupoNombre || 'Grupo Desconocido';
  const materiaId = state?.materiaId || 'sin-id';
  const materiaNombre = state?.materiaNombre || 'Materia Desconocida';

  const [students, setStudents] = useState<StudentForAttendance[]>([]);
  const [statuses, setStatuses] = useState<RowStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Período activo y categorías de incidencia del plantel
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [defaultCatId, setDefaultCatId] = useState<string | null>(null);

  // Estados propios del comportamiento interactivo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'guardados' | 'pendientes'>('todos');

  // Estados de retroalimentación de guardado
  const [isSaving, setIsSaving] = useState(false);
  const [toastState, setToastState] = useState<ToastState>('hidden');
  const [undoTarget, setUndoTarget] = useState<{ index: number; previousState: RowStatus } | null>(null);

  // 1. Carga de alumnos desde Supabase
  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await getAlumnosDeGrupo(grupoId);
        setStudents(data || []);
        setStatuses((data || []).map(() => ({ selectedIndex: null, color: '', border: '' })));
      } catch (err) {
        console.error('Error al cargar alumnos del grupo:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [grupoId]);

  // 2. Cargar período activo y categoría por defecto para reportes disciplinarios rápidos
  useEffect(() => {
    if (!plantelId) return;

    async function loadPeriodAndCategory() {
      try {
        const pId = await getPeriodoActivo(plantelId!);
        setPeriodoId(pId);

        const cats = await getCategoriasIncidencia(plantelId!);
        // 'yellow' no existe en BD — usar categoría verde con impacto negativo (ej: Retardo/Llegada tarde)
        const defaultCat = cats.find(c => c.color_semaforo === 'verde' && c.impacto_base < 0) || cats[0];
        setDefaultCatId(defaultCat?.id || null);
      } catch (err) {
        console.error('Error al resolver periodo o categoria por defecto:', err);
      }
    }

    loadPeriodAndCategory();
  }, [plantelId]);

  // Manejador del paso de lista rápido
  const handleSelectStatus = (studentIndex: number, optionIndex: number) => {
    const selected = STATUS_OPTIONS[optionIndex];
    const previous = statuses[studentIndex];

    const updated = [...statuses];
    updated[studentIndex] = {
      selectedIndex: optionIndex,
      color: selected.color,
      border: selected.border,
    };
    setStatuses(updated);

    // Guardar para deshacer
    setUndoTarget({ index: studentIndex, previousState: previous });
  };

  // Guardar datos en la base de datos de Supabase distribuyendo a las 3 tablas
  // Guardar datos en la base de datos de Supabase distribuyendo a las 3 tablas
  const handleSave = async () => {
    if (materiaId === 'sin-id') {
      alert('Error: No se ha provisto una materia válida para registrar la asistencia.');
      return;
    }
    if (!periodoId) {
      alert('Error: No se pudo resolver el período escolar activo para este plantel.');
      return;
    }

    setIsSaving(true);
    // ALTO-6: Clonar el estado en un snapshot local para evitar race conditions si el docente hace undo
    const statusesSnapshot = [...statuses];

    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const errorsList: string[] = [];

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const status = statusesSnapshot[i];

        if (status.selectedIndex === null) continue;

        const optionTitle = STATUS_OPTIONS[status.selectedIndex].title;

        try {
          // A. Guardar en tabla 'asistencias' (con upsert/onConflict por uq_asistencia_dia)
          let presente = true;
          let observaciones = '';

          if (optionTitle === 'Falta') {
            presente = false;
          } else if (optionTitle === 'Retardo') {
            observaciones = 'Retardo';
          }

          const { error: asistError } = await supabase
            .from('asistencias')
            .upsert({
              alumno_id: student.id,
              materia_id: materiaId,
              fecha: fechaHoy,
              presente,
              observaciones,
              justificada: false,
            }, { onConflict: 'alumno_id,materia_id,fecha' });

          if (asistError) throw asistError;

          // B. Guardar en tabla 'participaciones' (si aplica)
          if (optionTitle === 'Participó') {
            const { error: partError } = await supabase
              .from('participaciones')
              .insert({
                alumno_id: student.id,
                materia_id: materiaId,
                registrado_por: session!.user!.id,
                periodo_id: periodoId,
                fecha: fechaHoy,
                nivel: 'positiva',
                impacto_puntos: 5,
              });
            if (partError) throw partError;
          } else if (optionTitle === 'No trabajó') {
            const { error: partError } = await supabase
              .from('participaciones')
              .insert({
                alumno_id: student.id,
                materia_id: materiaId,
                registrado_por: session!.user!.id,
                periodo_id: periodoId,
                fecha: fechaHoy,
                nivel: 'nula',
                impacto_puntos: -3,
              });
            if (partError) throw partError;
          }

          // C. Guardar en tabla 'incidencias' (si aplica)
          if (optionTitle === 'Problema') {
            const { error: incError } = await supabase
              .from('incidencias')
              .insert({
                alumno_id: student.id,
                registrado_por: session!.user!.id,
                categoria_id: defaultCatId,
                descripcion: 'Problema de conducta reportado en pase de lista.',
                lugar: 'Aula',
                impacto_puntos: -5,
                periodo_id: periodoId,
              });
            if (incError) throw incError;
          }
        } catch (studentErr: unknown) {
          const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
          const errorMsg = studentErr instanceof Error ? studentErr.message : 'Error desconocido';
          errorsList.push(`${user?.nombre || 'Alumno'}: ${errorMsg}`);
        }
      }

      if (errorsList.length > 0) {
        alert(`Se guardaron algunos registros con errores:\n\n${errorsList.join('\n')}`);
      } else {
        setToastState('visible');
        setTimeout(() => setToastState('fading'), 2000);
        setTimeout(() => setToastState('hidden'), 2300);
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error('Error al guardar asistencia:', err);
      }
      alert('Ocurrió un error inesperado al registrar los datos en Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // Deshacer último cambio
  const handleUndo = () => {
    if (!undoTarget) return;
    const updated = [...statuses];
    updated[undoTarget.index] = undoTarget.previousState;
    setStatuses(updated);
    setUndoTarget(null);
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando lista de asistencia del grupo...</div>;
  }

  // Filtrado y búsqueda
  const filteredStudents = students
    .map((student, originalIndex) => ({ student, originalIndex }))
    .filter(({ student, originalIndex }) => {
      // Búsqueda
      const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
      const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`.toLowerCase();
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filtro de estado
      const status = statuses[originalIndex];
      if (activeFilter === 'guardados' && status.selectedIndex === null) return false;
      if (activeFilter === 'pendientes' && status.selectedIndex !== null) return false;

      return true;
    });

  const totalAssigned = statuses.filter(s => s.selectedIndex !== null).length;
  const progressPercent = students.length > 0 ? Math.round((totalAssigned / students.length) * 100) : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
      {/* Cabecera */}
      <header className="page-header">
        <div>
          <div className="page-breadcrumb">
            <span>Grupos</span>
            <span className="material-symbols-outlined page-breadcrumb-separator">chevron_right</span>
            <span className="page-breadcrumb-current">Pase de Lista</span>
          </div>
          <div className="page-title-row">
            <button className="page-back-btn" onClick={() => navigate('/maestro/clases')} title="Regresar a Clases">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="page-title">{materiaNombre}</h2>
          </div>
          <p className="page-subtitle">Grupo: {grupoNombre} • {students.length} Alumnos Inscritos</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-guardar" onClick={handleSave} disabled={isSaving}>
            <span className="material-symbols-outlined">save</span>
            {isSaving ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-section" style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid rgba(190,201,192,0.2)' }}>
        <div className="progress-text-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#5c5f60' }}>
          <span>Progreso de registro diario: {totalAssigned} de {students.length} alumnos</span>
          <span>{progressPercent}% completado</span>
        </div>
        <div className="progress-bar-container" style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, height: '100%', background: '#204785', borderRadius: '4px', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <section className="filter-bar">
        <div className="filter-search">
          <span className="material-symbols-outlined filter-search-icon">search</span>
          <input
            className="filter-search-input"
            type="text"
            placeholder="Buscar alumno por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Chips de filtro (Todos, Registrados, Pendientes) */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeFilter === 'todos' ? '#204785' : 'white',
              color: activeFilter === 'todos' ? 'white' : '#5c5f60',
              border: activeFilter === 'todos' ? 'none' : '1px solid #bec9c0',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveFilter('todos')}
          >
            Todos ({students.length})
          </button>
          <button
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeFilter === 'guardados' ? '#204785' : 'white',
              color: activeFilter === 'guardados' ? 'white' : '#5c5f60',
              border: activeFilter === 'guardados' ? 'none' : '1px solid #bec9c0',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveFilter('guardados')}
          >
            Registrados ({totalAssigned})
          </button>
          <button
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: activeFilter === 'pendientes' ? '#204785' : 'white',
              color: activeFilter === 'pendientes' ? 'white' : '#5c5f60',
              border: activeFilter === 'pendientes' ? 'none' : '1px solid #bec9c0',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setActiveFilter('pendientes')}
          >
            Pendientes ({students.length - totalAssigned})
          </button>
        </div>

        {/* Leyenda de estatus */}
        <div className="filter-legend">
          <div className="filter-legend-item">
            <span className="filter-legend-dot filter-legend-dot--participo" />
            <span>Participó</span>
          </div>
          <div className="filter-legend-item">
            <span className="filter-legend-dot filter-legend-dot--falta" />
            <span>Falta</span>
          </div>
          <div className="filter-legend-item">
            <span className="filter-legend-dot filter-legend-dot--problema" />
            <span>Problema</span>
          </div>
          <div className="filter-legend-item">
            <span className="filter-legend-dot filter-legend-dot--retardo" />
            <span>Retardo</span>
          </div>
          <div className="filter-legend-item">
            <span className="filter-legend-dot filter-legend-dot--no-trabajo" />
            <span>No trabajó</span>
          </div>
        </div>
      </section>

      {/* Tarjeta Contenedora de Lista */}
      <div className="attendance-card">
        {/* Cabecera de Tabla (Fija en Desktop) */}
        <div className="attendance-table-header-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th className="attendance-th" style={{ width: '60px', textAlign: 'center' }}>#</th>
                <th className="attendance-th attendance-th--matricula">Matrícula</th>
                <th className="attendance-th">Nombre Completo del Alumno</th>
                <th className="attendance-th attendance-th--center" style={{ width: '300px' }}>Estatus de Participación / Asistencia</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Cuerpo de Tabla con Scroll */}
        <div className="attendance-scroll custom-scrollbar">
          <div className="attendance-table-body-wrap">
            <table className="attendance-table">
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td className="attendance-td" colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>
                      No se encontraron alumnos con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(({ student, originalIndex }, idx) => {
                    const rowStatus = statuses[originalIndex];
                    const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
                    const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`;
                    
                    return (
                      <tr className="attendance-row" key={student.id}>
                        <td className="attendance-td" style={{ width: '60px', textAlign: 'center', fontWeight: 'bold', color: '#5c5f60' }}>{idx + 1}</td>
                        <td className="attendance-td attendance-td--matricula" style={{ color: '#5c5f60' }}>{student.matricula}</td>
                        <td className="attendance-td attendance-td--name">{fullName}</td>
                        <td className="attendance-td attendance-td--status" style={{ width: '300px' }}>
                          <div className="status-container">
                            {STATUS_OPTIONS.map((opt, optIdx) => {
                              const isSelected = rowStatus.selectedIndex === optIdx;
                              const isAnySelected = rowStatus.selectedIndex !== null;
                              const btnClass = [
                                'status-btn',
                                isSelected ? 'status-active' : '',
                                (isAnySelected && !isSelected) ? 'status-fade-out' : ''
                              ].filter(Boolean).join(' ');
                              
                              const btnStyle = {
                                backgroundColor: opt.color,
                                border: opt.color === 'white' ? '1px solid #bec9c0' : 'none',
                                cursor: 'pointer',
                                boxShadow: isSelected ? '0 0 0 3px rgba(32, 71, 133, 0.4)' : 'none'
                              };
                              
                              return (
                                <button
                                  key={optIdx}
                                  className={btnClass}
                                  style={btnStyle}
                                  onClick={() => handleSelectStatus(originalIndex, optIdx)}
                                  title={opt.title}
                                />
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Lista Móvil (Tarjetas) */}
          <div className="attendance-mobile-list">
            {filteredStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#5c5f60' }}>
                No se encontraron alumnos con los criterios seleccionados.
              </div>
            ) : (
              filteredStudents.map(({ student, originalIndex }, idx) => {
                const rowStatus = statuses[originalIndex];
                const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
                const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`;
                
                return (
                  <div className="attendance-mobile-row" key={student.id}>
                    <div className="attendance-mobile-id-row">
                      <span className="attendance-mobile-id">{student.matricula}</span>
                      <span style={{ fontSize: '12px', color: '#5c5f60', fontWeight: 'bold' }}>#{idx + 1}</span>
                    </div>
                    <h4 className="attendance-mobile-name">{fullName}</h4>
                    <div className="attendance-mobile-status-row">
                      <span className="attendance-mobile-status-label">Asistencia:</span>
                      <div className="status-container">
                        {STATUS_OPTIONS.map((opt, optIdx) => {
                          const isSelected = rowStatus.selectedIndex === optIdx;
                          const isAnySelected = rowStatus.selectedIndex !== null;
                          const btnClass = [
                            'status-btn',
                            isSelected ? 'status-active' : '',
                            (isAnySelected && !isSelected) ? 'status-fade-out' : ''
                          ].filter(Boolean).join(' ');
                          
                          const btnStyle = {
                            backgroundColor: opt.color,
                            border: opt.color === 'white' ? '1px solid #bec9c0' : 'none',
                            cursor: 'pointer',
                            boxShadow: isSelected ? '0 0 0 3px rgba(32, 71, 133, 0.4)' : 'none'
                          };
                          
                          return (
                            <button
                              key={optIdx}
                              className={btnClass}
                              style={btnStyle}
                              onClick={() => handleSelectStatus(originalIndex, optIdx)}
                              title={opt.title}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta de notificación Flotante (Toast) */}
      {toastState !== 'hidden' && (
        <div className={`toast ${toastState === 'fading' ? 'toast--fading' : ''}`}>
          <div className="toast-content">
            <span className="material-symbols-outlined check-icon">check_circle</span>
            <span>Asistencia diaria guardada exitosamente en Supabase.</span>
            {undoTarget && (
              <button className="btn-undo" onClick={handleUndo}>
                Deshacer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}