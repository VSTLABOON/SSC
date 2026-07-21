import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAlumnosDeGrupo } from '../../services/alumnos';
import { getPeriodoActivo } from '../../services/periodos';
import { getCategoriasIncidencia } from '../../services/incidencias';
import { supabase } from '../../lib/supabaseClient';
import InlineAlert from '../../components/InlineAlert';
import './Asignacionestatus.css';

// ── Tipos ────────────────────────────────────────────────────────────────────

type AsistenciaValue = 'asistio' | 'retardo' | 'falta' | null;
type DesempenoValue = 'participo' | 'neutral' | 'no_participo' | null;
type ToastState = 'hidden' | 'visible' | 'fading';

interface RowStatus {
  asistencia: AsistenciaValue;
  justificada: boolean;
  desempeno: DesempenoValue;
  observacion: string;
  justificanteFile: File | null;
}

interface CatImpacto {
  id: string;
  impacto_base: number;
}

interface StudentForAttendance {
  id: string;
  matricula: string;
  nivel_semaforo: string;
  puntos_totales: number;
  usuarios: unknown;
}

// ── Opciones de Selectores ───────────────────────────────────────────────────

const ASISTENCIA_OPTIONS: { key: AsistenciaValue; color: string; label: string; icon: string }[] = [
  { key: 'asistio',  color: '#10B981', label: 'Asistió',  icon: 'check_circle' },
  { key: 'retardo',  color: '#F59E0B', label: 'Retardo',  icon: 'schedule' },
  { key: 'falta',    color: '#EF4444', label: 'Falta',    icon: 'cancel' },
];

const DESEMPENO_OPTIONS: { key: DesempenoValue; color: string; label: string; icon: string }[] = [
  { key: 'participo',     color: '#10B981', label: 'Participó',     icon: 'thumb_up' },
  { key: 'neutral',       color: '#F59E0B', label: 'Neutral',       icon: 'remove' },
  { key: 'no_participo',  color: '#EF4444', label: 'No participó',  icon: 'thumb_down' },
];

// ── Componente Principal ─────────────────────────────────────────────────────

export default function AsignacionEstatus() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, plantelId } = useAuth();

  // Datos de ruta
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

  // Estado principal
  const [students, setStudents] = useState<StudentForAttendance[]>([]);
  const [statuses, setStatuses] = useState<RowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Período y categorías (fuente de verdad para puntos)
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [catPositiva, setCatPositiva] = useState<CatImpacto | null>(null);
  const [catNula, setCatNula] = useState<CatImpacto | null>(null);

  // UI interactivo
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'guardados' | 'pendientes'>('todos');
  const [expandedObs, setExpandedObs] = useState<Set<number>>(new Set());

  // Guardado
  const [isSaving, setIsSaving] = useState(false);
  const [toastState, setToastState] = useState<ToastState>('hidden');
  const [undoTarget, setUndoTarget] = useState<{ index: number; previousState: RowStatus } | null>(null);

  // ── useEffect: Cargar alumnos ────────────────────────────────────────────
  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await getAlumnosDeGrupo(grupoId);
        setStudents(data || []);
        setStatuses((data || []).map(() => ({
          asistencia: null,
          justificada: false,
          desempeno: null,
          observacion: '',
          justificanteFile: null,
        })));
      } catch (err) {
        console.error('Error al cargar alumnos del grupo:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, [grupoId]);

  // ── useEffect: Cargar período y categorías (fuente de verdad de puntos) ──
  useEffect(() => {
    if (!plantelId) return;

    async function loadPeriodAndCategories() {
      try {
        const pId = await getPeriodoActivo(plantelId!);
        setPeriodoId(pId);

        const cats = await getCategoriasIncidencia(plantelId!);
        // Categoría de participación positiva (verde con impacto > 0)
        const positiva = cats.find(c => c.color_semaforo === 'verde' && c.impacto_base > 0);
        if (positiva) setCatPositiva({ id: positiva.id, impacto_base: positiva.impacto_base });

        // Categoría de no-participación (verde con impacto < 0, o primera naranja)
        const nula = cats.find(c => c.color_semaforo === 'verde' && c.impacto_base < 0)
                  || cats.find(c => c.color_semaforo === 'naranja');
        if (nula) setCatNula({ id: nula.id, impacto_base: nula.impacto_base });
      } catch (err) {
        console.error('Error al resolver periodo o categorías:', err);
      }
    }
    loadPeriodAndCategories();
  }, [plantelId]);

  // ── Manejadores de Asistencia ────────────────────────────────────────────

  const handleAsistencia = (studentIndex: number, value: AsistenciaValue) => {
    const previous = statuses[studentIndex];
    const updated = [...statuses];

    // Toggle: si ya está seleccionado, deseleccionar
    if (previous.asistencia === value) {
      updated[studentIndex] = { ...previous, asistencia: null, justificada: false, desempeno: null, justificanteFile: null };
    } else if (value === 'falta') {
      // Falta: bloquear desempeño
      updated[studentIndex] = { ...previous, asistencia: 'falta', desempeno: null, justificada: false, justificanteFile: null };
    } else {
      // Asistió o Retardo: auto-seleccionar Neutral si no hay desempeño previo
      updated[studentIndex] = {
        ...previous,
        asistencia: value,
        justificada: false,
        justificanteFile: null,
        desempeno: previous.desempeno || 'neutral',
      };
    }

    setStatuses(updated);
    setUndoTarget({ index: studentIndex, previousState: previous });
  };

  const handleDesempeno = (studentIndex: number, value: DesempenoValue) => {
    const previous = statuses[studentIndex];
    if (previous.asistencia === 'falta') return; // Bloqueado

    const updated = [...statuses];
    // Toggle
    if (previous.desempeno === value) {
      updated[studentIndex] = { ...previous, desempeno: null };
    } else {
      updated[studentIndex] = { ...previous, desempeno: value };
    }
    setStatuses(updated);
    setUndoTarget({ index: studentIndex, previousState: previous });
  };

  const handleJustificada = (studentIndex: number, checked: boolean) => {
    const updated = [...statuses];
    updated[studentIndex] = { ...statuses[studentIndex], justificada: checked, justificanteFile: checked ? statuses[studentIndex].justificanteFile : null };
    setStatuses(updated);
  };

  const handleJustificanteFile = (studentIndex: number, file: File | null) => {
    const updated = [...statuses];
    updated[studentIndex] = { ...statuses[studentIndex], justificanteFile: file };
    setStatuses(updated);
  };

  const handleObservacion = (studentIndex: number, text: string) => {
    const updated = [...statuses];
    updated[studentIndex] = { ...statuses[studentIndex], observacion: text };
    setStatuses(updated);
  };

  const toggleObsExpand = (studentIndex: number) => {
    setExpandedObs(prev => {
      const next = new Set(prev);
      if (next.has(studentIndex)) next.delete(studentIndex);
      else next.add(studentIndex);
      return next;
    });
  };

  // ── Guardar ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setErrorText(null);
    if (materiaId === 'sin-id') {
      setErrorText('Error: No se ha provisto una materia válida para registrar la asistencia.');
      return;
    }
    if (!periodoId) {
      setErrorText('Error: No se pudo resolver el período escolar activo para este plantel.');
      return;
    }

    // Validar que haya categorías cargadas si hay alumnos con desempeño no-neutral
    const needsPositiva = statuses.some(s => s.desempeno === 'participo');
    const needsNula = statuses.some(s => s.desempeno === 'no_participo');
    if (needsPositiva && !catPositiva) {
      setErrorText('Error: No se pudo cargar la categoría de participación positiva desde la base de datos.');
      return;
    }
    if (needsNula && !catNula) {
      setErrorText('Error: No se pudo cargar la categoría de no-participación desde la base de datos.');
      return;
    }

    setIsSaving(true);
    const snapshot = [...statuses];

    try {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const errorsList: string[] = [];

      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const status = snapshot[i];

        if (status.asistencia === null) continue; // Sin marcar

        const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string } | null;

        try {
          // ── A. Subir justificante si existe ──
          let justificanteUrl: string | null = null;
          if (status.asistencia === 'falta' && status.justificada && status.justificanteFile) {
            const ext = status.justificanteFile.name.split('.').pop() || 'pdf';
            const path = `${materiaId}/${student.id}/${fechaHoy}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from('justificantes')
              .upload(path, status.justificanteFile, { upsert: true });

            if (uploadErr) {
              errorsList.push(`${user?.nombre || 'Alumno'}: Error al subir justificante — ${uploadErr.message}`);
            } else {
              const { data: urlData } = supabase.storage.from('justificantes').getPublicUrl(path);
              justificanteUrl = urlData?.publicUrl || null;
            }
          }

          // ── B. Upsert en asistencias ──
          const { error: asistError } = await supabase
            .from('asistencias')
            .upsert({
              alumno_id: student.id,
              materia_id: materiaId,
              fecha: fechaHoy,
              presente: status.asistencia !== 'falta',
              retardo: status.asistencia === 'retardo',
              justificada: status.asistencia === 'falta' && status.justificada,
              observaciones: status.observacion || null,
              justificante_url: justificanteUrl,
            }, { onConflict: 'alumno_id,materia_id,fecha' });

          if (asistError) throw asistError;

          // ── C. Participaciones ──
          if (status.desempeno === null || status.desempeno === 'neutral') {
            // Limpiar registro previo si existe (neutral = sin huella)
            await supabase
              .from('participaciones')
              .delete()
              .eq('alumno_id', student.id)
              .eq('materia_id', materiaId)
              .eq('fecha', fechaHoy);
          } else if (status.desempeno === 'participo') {
            const { error: partError } = await supabase
              .from('participaciones')
              .upsert({
                alumno_id: student.id,
                materia_id: materiaId,
                registrado_por: session!.user!.id,
                periodo_id: periodoId,
                fecha: fechaHoy,
                nivel: 'positiva',
                impacto_puntos: catPositiva!.impacto_base,
                observacion: status.observacion || null,
              }, { onConflict: 'alumno_id,materia_id,fecha' });
            if (partError) throw partError;
          } else if (status.desempeno === 'no_participo') {
            const { error: partError } = await supabase
              .from('participaciones')
              .upsert({
                alumno_id: student.id,
                materia_id: materiaId,
                registrado_por: session!.user!.id,
                periodo_id: periodoId,
                fecha: fechaHoy,
                nivel: 'nula',
                impacto_puntos: catNula!.impacto_base,
                observacion: status.observacion || null,
              }, { onConflict: 'alumno_id,materia_id,fecha' });
            if (partError) throw partError;
          }
        } catch (studentErr: unknown) {
          const errMsg = studentErr instanceof Error ? studentErr.message
            : (typeof studentErr === 'object' && studentErr !== null && 'message' in studentErr) ? String((studentErr as { message: unknown }).message)
            : 'Error desconocido';
          errorsList.push(`${user?.nombre || 'Alumno'}: ${errMsg}`);
        }
      }

      if (errorsList.length > 0) {
        setErrorText(`Se guardaron algunos registros con errores:\n\n${errorsList.join('\n')}`);
      } else {
        setToastState('visible');
        setTimeout(() => setToastState('fading'), 2000);
        setTimeout(() => setToastState('hidden'), 2300);
      }
    } catch (err: unknown) {
      if (import.meta.env.DEV) {
        console.error('Error al guardar asistencia:', err);
      }
      setErrorText('Ocurrió un error inesperado al registrar los datos en Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Deshacer ─────────────────────────────────────────────────────────────
  const handleUndo = () => {
    if (!undoTarget) return;
    const updated = [...statuses];
    updated[undoTarget.index] = undoTarget.previousState;
    setStatuses(updated);
    setUndoTarget(null);
  };

  // ── Carga ────────────────────────────────────────────────────────────────
  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando lista de asistencia del grupo...</div>;
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const filteredStudents = students
    .map((student, originalIndex) => ({ student, originalIndex }))
    .filter(({ student, originalIndex }) => {
      const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
      const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`.toLowerCase();

      if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) return false;

      const status = statuses[originalIndex];
      if (activeFilter === 'guardados' && status.asistencia === null) return false;
      if (activeFilter === 'pendientes' && status.asistencia !== null) return false;

      return true;
    });

  const totalAssigned = statuses.filter(s => s.asistencia !== null).length;
  const progressPercent = students.length > 0 ? Math.round((totalAssigned / students.length) * 100) : 0;

  // ── Helper: Renderizar grupo de bolitas ───────────────────────────────────
  const renderDotGroup = (
    options: typeof ASISTENCIA_OPTIONS | typeof DESEMPENO_OPTIONS,
    selectedKey: string | null,
    onSelect: (key: string) => void,
    disabled: boolean,
  ) => (
    <div className={`status-group ${disabled ? 'status-group--disabled' : ''}`}>
      {options.map(opt => {
        const isSelected = selectedKey === opt.key;
        const isAnySelected = selectedKey !== null;
        const dotClass = [
          'status-dot',
          isSelected ? 'status-dot--active' : '',
          (isAnySelected && !isSelected) ? 'status-dot--faded' : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={opt.key}
            className={dotClass}
            style={{
              backgroundColor: opt.color,
              boxShadow: isSelected ? `0 0 0 4px ${opt.color}4D` : 'none',
            }}
            onClick={() => onSelect(opt.key!)}
            title={opt.label}
            disabled={disabled}
          />
        );
      })}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
      {errorText && (
        <InlineAlert type="error" message={errorText} onClose={() => setErrorText(null)} />
      )}

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
          <p className="page-subtitle">Grupo: {grupoNombre} &bull; {students.length} Alumnos Inscritos</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-guardar" onClick={handleSave} disabled={isSaving}>
            <span className="material-symbols-outlined">save</span>
            {isSaving ? 'Guardando...' : 'Guardar Registro'}
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

        {/* Chips de filtro */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {([
            { key: 'todos' as const, label: `Todos (${students.length})` },
            { key: 'guardados' as const, label: `Registrados (${totalAssigned})` },
            { key: 'pendientes' as const, label: `Pendientes (${students.length - totalAssigned})` },
          ]).map(chip => (
            <button
              key={chip.key}
              style={{
                padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: activeFilter === chip.key ? '#204785' : 'white',
                color: activeFilter === chip.key ? 'white' : '#5c5f60',
                border: activeFilter === chip.key ? 'none' : '1px solid #bec9c0',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setActiveFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Leyenda de estatus */}
        <div className="filter-legend">
          <div className="filter-legend-section">
            <span className="filter-legend-section-title">Asistencia:</span>
            {ASISTENCIA_OPTIONS.map(opt => (
              <div className="filter-legend-item" key={opt.key}>
                <span className="filter-legend-dot" style={{ backgroundColor: opt.color }} />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
          <div className="filter-legend-section">
            <span className="filter-legend-section-title">Desempe&ntilde;o:</span>
            {DESEMPENO_OPTIONS.map(opt => (
              <div className="filter-legend-item" key={opt.key}>
                <span className="filter-legend-dot" style={{ backgroundColor: opt.color }} />
                <span>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarjeta Contenedora de Lista */}
      <div className="attendance-card">
        {/* Cabecera de Tabla */}
        <div className="attendance-table-header-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                <th className="attendance-th" style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th className="attendance-th attendance-th--matricula">Matr&iacute;cula</th>
                <th className="attendance-th">Nombre del Alumno</th>
                <th className="attendance-th attendance-th--asistencia">Asistencia</th>
                <th className="attendance-th attendance-th--desempeno">Desempe&ntilde;o</th>
                <th className="attendance-th" style={{ width: '44px', textAlign: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#8896a0' }}>edit_note</span>
                </th>
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
                    <td className="attendance-td" colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                      No se encontraron alumnos con los criterios seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(({ student, originalIndex }, idx) => {
                    const rowStatus = statuses[originalIndex];
                    const user = (Array.isArray(student.usuarios) ? student.usuarios[0] : student.usuarios) as { nombre?: string; apellido?: string } | null;
                    const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`;

                    const rowTintClass = rowStatus.asistencia === 'asistio' ? 'attendance-row--asistio'
                      : rowStatus.asistencia === 'retardo' ? 'attendance-row--retardo'
                      : rowStatus.asistencia === 'falta' ? 'attendance-row--falta'
                      : '';

                    const isObsExpanded = expandedObs.has(originalIndex);

                    return (
                      <tr className={`attendance-row ${rowTintClass}`} key={student.id}>
                        <td className="attendance-td" style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', color: '#5c5f60' }}>{idx + 1}</td>
                        <td className="attendance-td attendance-td--matricula" style={{ color: '#5c5f60' }}>{student.matricula}</td>
                        <td className="attendance-td attendance-td--name">
                          {fullName}
                          {/* Justified toggle inline */}
                          {rowStatus.asistencia === 'falta' && (
                            <div className="justified-toggle">
                              <input
                                type="checkbox"
                                id={`just-${originalIndex}`}
                                checked={rowStatus.justificada}
                                onChange={(e) => handleJustificada(originalIndex, e.target.checked)}
                              />
                              <label htmlFor={`just-${originalIndex}`}>Falta justificada</label>
                            </div>
                          )}
                          {/* Evidence upload */}
                          {rowStatus.asistencia === 'falta' && rowStatus.justificada && (
                            <div className="evidence-upload">
                              <label className="evidence-label" htmlFor={`ev-${originalIndex}`}>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>attach_file</span>
                                {' '}Adjuntar evidencia
                              </label>
                              <input
                                id={`ev-${originalIndex}`}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                style={{ display: 'none' }}
                                onChange={(e) => handleJustificanteFile(originalIndex, e.target.files?.[0] || null)}
                              />
                              {rowStatus.justificanteFile && (
                                <span className="evidence-filename">
                                  <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>description</span>
                                  {' '}{rowStatus.justificanteFile.name}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Observation inline */}
                          {isObsExpanded && (
                            <div className="obs-expand-row">
                              <input
                                className="obs-input"
                                type="text"
                                placeholder="Observaci&#243;n del docente (opcional)..."
                                value={rowStatus.observacion}
                                onChange={(e) => handleObservacion(originalIndex, e.target.value)}
                              />
                            </div>
                          )}
                        </td>
                        <td className="attendance-td attendance-td--asistencia">
                          {renderDotGroup(
                            ASISTENCIA_OPTIONS,
                            rowStatus.asistencia,
                            (key) => handleAsistencia(originalIndex, key as AsistenciaValue),
                            false,
                          )}
                        </td>
                        <td className="attendance-td attendance-td--desempeno">
                          {renderDotGroup(
                            DESEMPENO_OPTIONS,
                            rowStatus.desempeno,
                            (key) => handleDesempeno(originalIndex, key as DesempenoValue),
                            rowStatus.asistencia === 'falta' || rowStatus.asistencia === null,
                          )}
                        </td>
                        <td className="attendance-td" style={{ width: '44px', textAlign: 'center' }}>
                          <button className="obs-toggle-btn" onClick={() => toggleObsExpand(originalIndex)} title="Agregar observación">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                              {isObsExpanded ? 'edit_note' : 'note_add'}
                            </span>
                          </button>
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
                      <div>
                        <span className="status-group__label">Asistencia</span>
                        {renderDotGroup(
                          ASISTENCIA_OPTIONS,
                          rowStatus.asistencia,
                          (key) => handleAsistencia(originalIndex, key as AsistenciaValue),
                          false,
                        )}
                      </div>
                      <div>
                        <span className="status-group__label">Desempe&ntilde;o</span>
                        {renderDotGroup(
                          DESEMPENO_OPTIONS,
                          rowStatus.desempeno,
                          (key) => handleDesempeno(originalIndex, key as DesempenoValue),
                          rowStatus.asistencia === 'falta' || rowStatus.asistencia === null,
                        )}
                      </div>
                    </div>
                    {/* Justified toggle */}
                    {rowStatus.asistencia === 'falta' && (
                      <div className="justified-toggle">
                        <input
                          type="checkbox"
                          id={`just-m-${originalIndex}`}
                          checked={rowStatus.justificada}
                          onChange={(e) => handleJustificada(originalIndex, e.target.checked)}
                        />
                        <label htmlFor={`just-m-${originalIndex}`}>Falta justificada</label>
                      </div>
                    )}
                    {/* Evidence upload mobile */}
                    {rowStatus.asistencia === 'falta' && rowStatus.justificada && (
                      <div className="evidence-upload">
                        <label className="evidence-label" htmlFor={`ev-m-${originalIndex}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>attach_file</span>
                          {' '}Adjuntar evidencia
                        </label>
                        <input
                          id={`ev-m-${originalIndex}`}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          onChange={(e) => handleJustificanteFile(originalIndex, e.target.files?.[0] || null)}
                        />
                        {rowStatus.justificanteFile && (
                          <span className="evidence-filename">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>description</span>
                            {' '}{rowStatus.justificanteFile.name}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Observation mobile */}
                    <div style={{ marginTop: '8px' }}>
                      <input
                        className="obs-input"
                        type="text"
                        placeholder="Observación (opcional)..."
                        value={rowStatus.observacion}
                        onChange={(e) => handleObservacion(originalIndex, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Toast de éxito */}
      {toastState !== 'hidden' && (
        <div className={`toast ${toastState === 'fading' ? 'toast--fading' : ''}`}>
          <div className="toast-content">
            <span className="material-symbols-outlined check-icon">check_circle</span>
            <span>Registro diario guardado exitosamente.</span>
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