import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAlumnosDePlantel } from '../../services/alumnos';
import { getCategoriasIncidencia } from '../../services/incidencias';
import { getPeriodoActivo } from '../../services/periodos';
import { supabase } from '../../lib/supabaseClient';
import './GenerarReporteDA.css';

type Severity = 'red' | 'orange' | 'yellow' | 'green' | null;

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
  descripcion: string;
}

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

export default function GenerarReporteDA() {
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
  const [locationName, setLocationName] = useState('Plantel');

  // Estados de éxito/advertencia
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!plantelId) return;

    async function loadData() {
      try {
        // 1. Obtener todos los alumnos del plantel
        const alumnosData = await getAlumnosDePlantel(plantelId!);
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
          status: a.nivel_semaforo || 'green',
          puntosTotales: a.puntos_totales ?? 100,
        }));
        setStudents(formatted);

        // 2. Obtener categorías de incidencia del plantel
        const cats = await getCategoriasIncidencia(plantelId!);
        setCategories(cats as CategoriaFromDB[]);

        // 3. Obtener periodo activo
        const pId = await getPeriodoActivo(plantelId!);
        setPeriodoId(pId);
      } catch (err) {
        console.error('Error al cargar datos en GenerarReporteDA:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [plantelId]);

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q);
  });

  function handleOpenModal(student: StudentFromDB) {
    setSelectedStudent(student);
    setSeverity('yellow');
    setSelectedCategoryId('');
    setComment('');
    setLocationName('Plantel');
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedStudent(null);
    setSeverity(null);
    setSelectedCategoryId('');
    setComment('');
  }

  function handleSelectSeverity(color: NonNullable<Severity>) {
    setSeverity(color);
    setSelectedCategoryId('');
  }

  const filteredCategories = categories.filter(c => c.color_semaforo === severity);

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();

    if (!severity || !selectedCategoryId || !selectedStudent) {
      setWarningModalOpen(true);
      return;
    }
    if (!periodoId) {
      alert('Error: No se pudo resolver el período activo del plantel.');
      return;
    }

    setSubmitting(true);
    try {
      let impacto = -5;
      if (severity === 'red') impacto = -15;
      else if (severity === 'orange') impacto = -10;
      else if (severity === 'yellow') impacto = -5;
      else if (severity === 'green') impacto = 5;

      const { error } = await supabase
        .from('incidencias')
        .insert({
          alumno_id: selectedStudent.id,
          docente_id: session!.user!.id,
          categoria_id: selectedCategoryId,
          descripcion: comment,
          lugar: locationName,
          impacto_puntos: impacto,
          periodo_id: periodoId,
        });

      if (error) throw error;

      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Error al guardar reporte disciplinario:', err);
      alert('Ocurrió un error al guardar el reporte disciplinario.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseSuccess() {
    setSuccessModalOpen(false);
    handleCloseModal();
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando datos del plantel...</div>;
  }

  return (
    <div className="grm-canvas-only">
      {/* Search and Stats */}
      <div className="grm-search-bar-row">
        <div className="grm-search-wrap">
          <span className="material-symbols-outlined grm-search-icon">search</span>
          <input
            className="grm-search-input"
            placeholder="Buscar por nombre o matrícula de cualquier alumno del plantel..."
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grm-stats-row">
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--red">
            {students.filter(s => s.status === 'red').length}
          </span>
          <span className="grm-stat-label">Reportes Críticos (Rojo)</span>
        </div>
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--orange">
            {students.filter(s => s.status === 'orange').length}
          </span>
          <span className="grm-stat-label">Advertencias (Naranja)</span>
        </div>
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--yellow">
            {students.filter(s => s.status === 'yellow').length}
          </span>
          <span className="grm-stat-label">Seguimientos (Amarillo)</span>
        </div>
      </div>

      {/* Tabla de Alumnos */}
      <div className="grm-table-container">
        <div className="grm-table-header">
          <h3 className="grm-table-title">Expedientes Escolares de Alumnos</h3>
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
                        {student.status === 'green' && 'Óptimo'}
                        {student.status === 'yellow' && 'Leve'}
                        {student.status === 'orange' && 'Grave'}
                        {student.status === 'red' && 'Crítico'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="grm-btn-report"
                        onClick={() => handleOpenModal(student)}
                      >
                        <span className="material-symbols-outlined">description</span>
                        Generar Reporte
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                    No se encontraron alumnos registrados en este plantel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GENERAR REPORTE */}
      {modalOpen && selectedStudent && (
        <div className="grm-modal grm-modal--open">
          <div className="grm-modal-box">
            <div className="grm-modal-header">
              <h4 className="grm-modal-title">Generar Reporte Disciplinario</h4>
              <button className="grm-modal-close" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitReport}>
              <div className="grm-modal-body">
                {/* Info Alumno */}
                <div className="grm-modal-student-info">
                  <div>
                    <p className="grm-student-info-label">Alumno seleccionado</p>
                    <p className="grm-student-info-name">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="grm-student-info-label">Matrícula</p>
                    <p className="grm-student-info-value">{selectedStudent.matricula}</p>
                  </div>
                  <div>
                    <p className="grm-student-info-label">Grupo</p>
                    <p className="grm-student-info-value">{selectedStudent.groupName}</p>
                  </div>
                </div>

                {/* Severidad */}
                <div className="grm-form-group">
                  <label className="grm-form-label">Nivel de Severidad</label>
                  <div className="grm-severity-selector">
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--green ${severity === 'green' ? 'active' : ''}`}
                      onClick={() => handleSelectSeverity('green')}
                    >
                      <Icon name="check_circle" />
                      <span>Verde (Positivo)</span>
                    </button>
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--yellow ${severity === 'yellow' ? 'active' : ''}`}
                      onClick={() => handleSelectSeverity('yellow')}
                    >
                      <Icon name="warning" />
                      <span>Amarillo (Leve)</span>
                    </button>
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--orange ${severity === 'orange' ? 'active' : ''}`}
                      onClick={() => handleSelectSeverity('orange')}
                    >
                      <Icon name="warning" />
                      <span>Naranja (Grave)</span>
                    </button>
                    <button
                      type="button"
                      className={`grm-severity-btn grm-severity-btn--red ${severity === 'red' ? 'active' : ''}`}
                      onClick={() => handleSelectSeverity('red')}
                    >
                      <Icon name="error" />
                      <span>Rojo (Crítico)</span>
                    </button>
                  </div>
                </div>

                {/* Motivos / Categoría */}
                <div className="grm-form-group">
                  <label className="grm-form-label">Motivo o Reglamento infringido</label>
                  <div className="grm-reasons-list">
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map(cat => (
                        <label className="grm-reason-item" key={cat.id}>
                          <input
                            type="radio"
                            name="categoria"
                            value={cat.id}
                            checked={selectedCategoryId === cat.id}
                            onChange={() => setSelectedCategoryId(cat.id)}
                          />
                          <span>{cat.nombre} — <small style={{ color: '#5c5f60' }}>{cat.descripcion}</small></span>
                        </label>
                      ))
                    ) : (
                      <p style={{ color: '#ba1a1a', fontSize: '14px', padding: '8px 0' }}>
                        No hay motivos registrados en la base de datos para este nivel de severidad.
                      </p>
                    )}
                  </div>
                </div>

                {/* Lugar */}
                <div className="grm-form-group">
                  <label className="grm-form-label" htmlFor="location">Lugar del Incidente</label>
                  <input
                    type="text"
                    id="location"
                    className="grm-input"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                  />
                </div>

                {/* Comentarios */}
                <div className="grm-form-group">
                  <label className="grm-form-label" htmlFor="comment">Descripción del incidente y Acuerdos de Compromiso</label>
                  <textarea
                    id="comment"
                    className="grm-textarea"
                    rows={4}
                    placeholder="Detalle el reporte disciplinario y acuerdos parentales..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="grm-modal-footer">
                <button type="button" className="grm-btn-secondary" onClick={handleCloseModal}>
                  Cancelar
                </button>
                <button type="submit" className="grm-btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADVERTENCIA */}
      {warningModalOpen && (
        <div className="grm-modal grm-modal--open">
          <div className="grm-modal-box grm-modal-box--alert">
            <div className="grm-modal-header">
              <h4 className="grm-modal-title">Faltan Campos</h4>
            </div>
            <div className="grm-modal-body">
              <p>Por favor complete el nivel de severidad y el motivo reglamentario.</p>
            </div>
            <div className="grm-modal-footer">
              <button className="grm-btn-primary" onClick={() => setWarningModalOpen(false)}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉXITO */}
      {successModalOpen && (
        <div className="grm-modal grm-modal--open">
          <div className="grm-modal-box grm-modal-box--alert">
            <div className="grm-modal-header">
              <h4 className="grm-modal-title" style={{ color: '#22c55e' }}>Reporte Guardado</h4>
            </div>
            <div className="grm-modal-body">
              <p>El reporte disciplinario del plantel ha sido guardado exitosamente en Supabase.</p>
            </div>
            <div className="grm-modal-footer">
              <button className="grm-btn-primary" onClick={handleCloseSuccess}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}