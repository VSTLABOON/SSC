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
        const yellowCat = cats.find(c => c.color_semaforo === 'yellow') || cats[0];
        setDefaultCatId(yellowCat?.id || null);
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
    try {
      const fechaHoy = new Date().toISOString().split('T')[0];

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const status = statuses[i];

        if (status.selectedIndex === null) continue;

        const optionTitle = STATUS_OPTIONS[status.selectedIndex].title;

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
              fecha: fechaHoy,
              nivel: 'positiva',
            });
          if (partError) throw partError;
        } else if (optionTitle === 'No trabajó') {
          const { error: partError } = await supabase
            .from('participaciones')
            .insert({
              alumno_id: student.id,
              materia_id: materiaId,
              fecha: fechaHoy,
              nivel: 'nula',
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
      }

      setToastState('visible');
      setTimeout(() => setToastState('fading'), 2000);
      setTimeout(() => setToastState('hidden'), 2300);
    } catch (err) {
      console.error('Error al guardar registros de asistencia:', err);
      alert('Ocurrió un error al registrar los datos en Supabase.');
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
    <div className="status-canvas-only">
      {/* Cabecera */}
      <header className="attendance-header">
        <button className="btn-back" onClick={() => navigate('/maestro/clases')}>
          <span className="material-symbols-outlined">arrow_back</span>
          Regresar a Clases
        </button>
        <div className="attendance-title-row">
          <div>
            <h2 className="attendance-title">{materiaNombre}</h2>
            <p className="attendance-subtitle">Grupo: {grupoNombre} • {students.length} Alumnos Inscritos</p>
          </div>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            <span className="material-symbols-outlined">save</span>
            {isSaving ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-text-row">
          <span>Progreso de registro diario: {totalAssigned} de {students.length} alumnos</span>
          <span>{progressPercent}% completado</span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <section className="controls-row">
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Buscar alumno por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-chips">
          <button
            className={`filter-chip ${activeFilter === 'todos' ? 'filter-chip--active' : ''}`}
            onClick={() => setActiveFilter('todos')}
          >
            Todos ({students.length})
          </button>
          <button
            className={`filter-chip ${activeFilter === 'guardados' ? 'filter-chip--active' : ''}`}
            onClick={() => setActiveFilter('guardados')}
          >
            Registrados ({totalAssigned})
          </button>
          <button
            className={`filter-chip ${activeFilter === 'pendientes' ? 'filter-chip--active' : ''}`}
            onClick={() => setActiveFilter('pendientes')}
          >
            Pendientes ({students.length - totalAssigned})
          </button>
        </div>
      </section>

      {/* Tabla de Escritorio */}
      <div className="table-responsive">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="th-num">#</th>
              <th>Matrícula</th>
              <th>Nombre Completo del Alumno</th>
              <th style={{ width: '450px' }}>Estatus de Participación / Asistencia</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>
                  No se encontraron alumnos con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filteredStudents.map(({ student, originalIndex }, idx) => {
                const rowStatus = statuses[originalIndex];
                return (
                  <tr key={student.id}>
                    <td className="th-num">{idx + 1}</td>
                    <td style={{ color: '#5c5f60', fontSize: '14px' }}>{student.matricula}</td>
                    <td className="student-name">
                      {(() => {
                        const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
                        return `${user?.nombre || ''} ${user?.apellido || ''}`;
                      })()}
                    </td>
                    <td>
                      <div className="status-options-row">
                        {STATUS_OPTIONS.map((opt, optIdx) => {
                          const isSelected = rowStatus.selectedIndex === optIdx;
                          const btnStyle = isSelected
                            ? { backgroundColor: opt.color, color: opt.color === 'white' ? '#181d1a' : 'white', borderColor: opt.border !== 'none' ? opt.border : 'transparent' }
                            : {};
                          return (
                            <button
                              key={optIdx}
                              className={`btn-option ${isSelected ? 'btn-option--selected' : ''}`}
                              style={btnStyle}
                              onClick={() => handleSelectStatus(originalIndex, optIdx)}
                            >
                              {opt.title}
                            </button>
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