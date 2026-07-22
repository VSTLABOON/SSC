import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGruposDeDocente } from '../../services/grupos';
import { getCategoriasIncidencia } from '../../services/incidencias';
import { getPeriodoActivo } from '../../services/periodos';
import { supabase } from '../../lib/supabaseClient';
import './GenerarReporteM.css';
import { Modal } from '../../components/Modal';
import '../../components/Modal.css';
import InlineAlert from '../../components/InlineAlert';

type Severity = 'verde' | 'naranja' | 'rojo' | null;

interface StudentFromDB {
  id: string;
  name: string;
  matricula: string;
  groupName: string;
  status: string;
  puntosTotales: number;
}

interface CategoriaFromDB {
  id: string;
  nombre: string;
  color_semaforo: string;
  impacto_base: number;
}

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

export default function GenerarReporteM() {
  const { session, plantelId } = useAuth();
  const [students, setStudents] = useState<StudentFromDB[]>([]);
  const [categories, setCategories] = useState<CategoriaFromDB[]>([]);
  const [periodoId, setPeriodoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Estados del modal de reporte
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentFromDB | null>(null);
  const [severity, setSeverity] = useState<Severity>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [comment, setComment] = useState('');
  const [locationName, setLocationName] = useState('Aula');
  const [activeTab, setActiveTab] = useState<'clasificacion' | 'detalles'>('clasificacion');

  // Estados de éxito/advertencia
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadInitialData() {
      try {
        // 1. Obtener grupos del docente
        const teacherGroups = await getGruposDeDocente(session!.user!.id);
        const groupIds = teacherGroups.map(g => g.grupoId);

        if (groupIds.length > 0) {
          // 2. Obtener alumnos de estos grupos
          const { data: alumnosData, error: alumnosErr } = await supabase
            .from('alumnos')
            .select('id, matricula, nivel_semaforo, puntos_totales, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos(nombre)')
            .in('grupo_id', groupIds);

          if (!alumnosErr && alumnosData) {
            const formatted = (alumnosData as unknown as Array<{
              id: string;
              matricula: string;
              nivel_semaforo: string;
              puntos_totales: number | null;
              usuarios: { nombre: string; apellido: string } | null;
              grupos: { nombre: string } | null;
            }>).map((a) => ({
              id: a.id,
              name: `${a.usuarios?.nombre || ''} ${a.usuarios?.apellido || ''}`.trim(),
              matricula: a.matricula,
              groupName: a.grupos?.nombre || 'N/A',
              status: a.nivel_semaforo || 'verde',
              puntosTotales: a.puntos_totales ?? 100,
            }));
            setStudents(formatted);
          }
        }

        // 3. Obtener categorías de incidencia
        if (plantelId) {
          const cats = await getCategoriasIncidencia(plantelId);
          setCategories(cats as CategoriaFromDB[]);

          // 4. Obtener periodo activo
          const pId = await getPeriodoActivo(plantelId);
          setPeriodoId(pId);
        }
      } catch (err) {
        console.error('Error al cargar datos en GenerarReporteM:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [session, plantelId]);

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q);
  });

  function handleOpenModal(student: StudentFromDB) {
    setSelectedStudent(student);
    setSeverity(null);
    setSelectedCategoryId('');
    setComment('');
    setLocationName('Aula');
    setActiveTab('clasificacion');
    setErrorMsg(null);
    setModalOpen(true);
  }

  /******************************************/
  /* MANEJADORES DE CIERRE DE MODAL Y ENVÍO */
  /******************************************/
  function handleCloseModal() {
    setModalOpen(false);
    setSelectedStudent(null);
    setSeverity(null);
    setSelectedCategoryId('');
    setComment('');
    setActiveTab('clasificacion');
    setErrorMsg(null);
  }

  function handleSelectSeverity(color: NonNullable<Severity>) {
    setSeverity(color);
    setSelectedCategoryId('');
    setErrorMsg(null);
  }

  function handleNextTab() {
    if (!severity) {
      setErrorMsg('Por favor selecciona un nivel de severidad.');
      return;
    }
    if (!selectedCategoryId) {
      setErrorMsg('Por favor selecciona una categoría o motivo específico.');
      return;
    }
    setErrorMsg(null);
    setActiveTab('detalles');
  }

  const filteredCategories = categories.filter(c => {
    if (severity === 'verde') return c.color_semaforo === 'verde';
    if (severity === 'naranja') return c.color_semaforo === 'naranja';
    if (severity === 'rojo') return c.color_semaforo === 'rojo';
    return false;
  });

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!severity || !selectedCategoryId || !selectedStudent) {
      setActiveTab('clasificacion');
      setErrorMsg('Selecciona un nivel de severidad y un motivo antes de guardar.');
      return;
    }
    if (!periodoId) {
      setErrorMsg('Error: No se pudo resolver el período activo del plantel.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      const impacto = selectedCategory ? selectedCategory.impacto_base : 0;

      const { error } = await supabase
        .from('incidencias')
        .insert({
          alumno_id: selectedStudent.id,
          registrado_por: session!.user!.id,
          categoria_id: selectedCategoryId,
          descripcion: comment,
          lugar: locationName,
          impacto_puntos: impacto,
          periodo_id: periodoId,
        });

      if (error) throw error;

      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Error al guardar reporte:', err);
      setErrorMsg('Ocurrió un error al guardar el reporte en la base de datos.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseSuccess() {
    setSuccessModalOpen(false);
    handleCloseModal();
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando datos de reportes...</div>;
  }

  return (
    <div className="grm-canvas-only">
      {/* Search and Stats */}
      <div className="grm-search-bar-row">
        <div className="grm-search-wrap">
          <span className="material-symbols-outlined grm-search-icon">search</span>
          <input
            className="grm-search-input"
            placeholder="Buscar por nombre o matrícula de tus alumnos..."
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grm-stats-row">
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--rojo">
            {students.filter(s => s.status === 'rojo').length}
          </span>
          <span className="grm-stat-label">Alumnos Críticos (Rojo)</span>
        </div>
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--naranja">
            {students.filter(s => s.status === 'naranja').length}
          </span>
          <span className="grm-stat-label">Advertencias (Naranja)</span>
        </div>
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--verde">
            {students.filter(s => s.status === 'verde').length}
          </span>
          <span className="grm-stat-label">Alumnos Óptimos (Verde)</span>
        </div>
      </div>

      {/* Tabla de Alumnos */}
      <div className="grm-table-container">
        <div className="grm-table-header">
          <h3 className="grm-table-title">Mis Alumnos Asignados</h3>
        </div>
        <div className="grm-table-scroll">
          <table className="grm-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Grupo</th>
                <th>Puntos Semáforo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td className="grm-td-name">{student.name}</td>
                    <td className="grm-td-matricula">{student.matricula}</td>
                    <td>{student.groupName}</td>
                    <td className="grm-td-center">{student.puntosTotales} pts</td>
                    <td>
                      <span className={`grm-status-badge grm-status-badge--${student.status}`}>
                        {student.status === 'verde' && 'Óptimo'}
                        {student.status === 'naranja' && 'Grave'}
                        {student.status === 'rojo' && 'Crítico'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="grm-btn-report"
                        onClick={() => handleOpenModal(student)}
                      >
                        <span className="material-symbols-outlined">description</span>
                        Reportar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    No se encontraron alumnos con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GENERAR REPORTE */}
      <Modal isOpen={modalOpen && !!selectedStudent} onClose={handleCloseModal} className="grm-modal-box">
        <div className="grm-modal-header">
          <div>
            <h4 className="grm-modal-title">Generar Reporte de Incidencia</h4>
            <p className="grm-modal-subtitle">
              {selectedStudent?.name} • {selectedStudent?.groupName} ({selectedStudent?.matricula})
            </p>
          </div>
          <button className="grm-modal-close" onClick={handleCloseModal} aria-label="Cerrar modal">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="grm-tab-bar">
          <button
            type="button"
            className={`grm-tab-btn ${activeTab === 'clasificacion' ? 'grm-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('clasificacion')}
          >
            <span className="material-symbols-outlined">label</span>
            <span>1. Severidad y Motivo</span>
          </button>
          <button
            type="button"
            className={`grm-tab-btn ${activeTab === 'detalles' ? 'grm-tab-btn--active' : ''}`}
            onClick={() => {
              if (!severity || !selectedCategoryId) {
                setErrorMsg('Selecciona un nivel de severidad y un motivo antes de continuar.');
                return;
              }
              setErrorMsg(null);
              setActiveTab('detalles');
            }}
          >
            <span className="material-symbols-outlined">edit_note</span>
            <span>2. Detalles y Ubicación</span>
          </button>
        </div>

        <form onSubmit={handleSubmitReport} className="grm-modal-form-wrap">
          <div className="grm-modal-body">
            {errorMsg && (
              <InlineAlert type="error" message={errorMsg} onClose={() => setErrorMsg(null)} />
            )}

            {/* TAB 1: CLASIFICACIÓN (SEVERIDAD Y MOTIVO) */}
            {activeTab === 'clasificacion' && (
              <>
                {/* Severidad */}
                <div className="grm-form-group">
                  <label className="grm-form-label">Nivel de Severidad</label>
                  <div className="grm-severity-grid">
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--verde ${severity === 'verde' ? 'grm-severity-btn--selected' : ''}`}
                      onClick={() => handleSelectSeverity('verde')}
                    >
                      <Icon name="check_circle" className="grm-severity-btn-icon" />
                      <span className="grm-severity-btn-label">Verde (Positivo)</span>
                    </button>
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--naranja ${severity === 'naranja' ? 'grm-severity-btn--selected' : ''}`}
                      onClick={() => handleSelectSeverity('naranja')}
                    >
                      <Icon name="warning" className="grm-severity-btn-icon" />
                      <span className="grm-severity-btn-label">Naranja (Grave)</span>
                    </button>
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--rojo ${severity === 'rojo' ? 'grm-severity-btn--selected' : ''}`}
                      onClick={() => handleSelectSeverity('rojo')}
                    >
                      <Icon name="error" className="grm-severity-btn-icon" />
                      <span className="grm-severity-btn-label">Rojo (Crítico)</span>
                    </button>
                  </div>
                </div>

                {/* Motivos / Categoría Incidencia */}
                <div className="grm-form-group">
                  <label className="grm-form-label">Motivo o Categoría específica</label>
                  <div className="grm-reasons-list">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(cat => (
                        <label className={`grm-reason-item ${selectedCategoryId === cat.id ? 'grm-reason-item--selected' : ''}`} key={cat.id}>
                          <input
                            type="radio"
                            name="categoria"
                            className="grm-reason-radio"
                            value={cat.id}
                            checked={selectedCategoryId === cat.id}
                            onChange={() => {
                              setSelectedCategoryId(cat.id);
                              setErrorMsg(null);
                            }}
                          />
                          <span className="grm-reason-text">{cat.nombre}</span>
                          <span className="grm-reason-badge">Impacto: {cat.impacto_base} pts</span>
                        </label>
                      ))
                    ) : (
                      <p style={{ color: '#ba1a1a', fontSize: '13px', padding: '12px 0', textAlign: 'center' }}>
                        Selecciona un nivel de severidad arriba para ver los motivos disponibles.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: DETALLES Y UBICACIÓN */}
            {activeTab === 'detalles' && (
              <>
                {/* Lugar de la incidencia + chips */}
                <div className="grm-form-group">
                  <label className="grm-form-label" htmlFor="location">Lugar del Incidente</label>
                  <input
                    type="text"
                    id="location"
                    className="grm-field-input"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                  />
                  <div className="grm-location-chips">
                    {['Aula', 'Laboratorio', 'Patio', 'Cafetería', 'Biblioteca'].map(chip => (
                      <button
                        key={chip}
                        type="button"
                        className={`grm-location-chip ${locationName === chip ? 'grm-location-chip--selected' : ''}`}
                        onClick={() => setLocationName(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comentarios / Detalles */}
                <div className="grm-form-group">
                  <label className="grm-form-label" htmlFor="comment">Descripción detallada y Compromisos</label>
                  <textarea
                    id="comment"
                    className="grm-field-input"
                    rows={3}
                    placeholder="Escriba los detalles del incidente y los compromisos acordados con el estudiante..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="grm-modal-footer">
            {activeTab === 'clasificacion' ? (
              <>
                <button type="button" className="grm-btn-cancel" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="button" className="grm-btn-submit" onClick={handleNextTab}>
                  Siguiente: Detalles →
                </button>
              </>
            ) : (
              <>
                <button type="button" className="grm-btn-cancel" onClick={() => setActiveTab('clasificacion')}>
                  ← Volver
                </button>
                <button type="submit" className="grm-btn-submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Reporte'}
                </button>
              </>
            )}
          </div>
        </form>
      </Modal>

      {/* MODAL ADVERTENCIA */}
      <Modal isOpen={warningModalOpen} onClose={() => setWarningModalOpen(false)} className="grm-modal-box grm-modal-box--alert">
        <div className="grm-modal-header">
          <h4 className="grm-modal-title">Faltan Campos obligatorios</h4>
        </div>
        <div className="grm-modal-body">
          <p>Por favor seleccione un nivel de severidad y el motivo del reporte antes de guardar.</p>
        </div>
        <div className="grm-modal-footer">
          <button className="grm-success-btn-primary" onClick={() => setWarningModalOpen(false)}>
            Aceptar
          </button>
        </div>
      </Modal>

      {/* MODAL ÉXITO */}
      <Modal isOpen={successModalOpen} onClose={handleCloseSuccess} className="grm-modal-box grm-modal-box--alert">
        <div className="grm-modal-header">
          <h4 className="grm-modal-title" style={{ color: '#22c55e' }}>Reporte Guardado</h4>
        </div>
        <div className="grm-modal-body">
          <p>El reporte de incidencia ha sido guardado exitosamente en la base de datos de Supabase.</p>
        </div>
        <div className="grm-modal-footer">
          <button className="grm-success-btn-primary" onClick={handleCloseSuccess}>
            Aceptar
          </button>
        </div>
      </Modal>
    </div>
  );
}