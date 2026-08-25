import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAlumnosDePlantel } from '../../services/alumnos';
import { getCategoriasIncidencia } from '../../services/incidencias';
import { getPeriodoActivo } from '../../services/periodos';
import { supabase } from '../../lib/supabaseClient';
import './GenerarReporteDA.css';
import { Modal } from '../../components/Modal';
import '../../components/Modal.css';
import InlineAlert from '../../components/InlineAlert';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';

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
  const [locationName, setLocationName] = useState('Aula');
  const [incidentDate, setIncidentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [activeTab, setActiveTab] = useState<'clasificacion' | 'detalles'>('clasificacion');

  // Estados de éxito/advertencia
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAnyModalOpen = modalOpen || successModalOpen || warningModalOpen;
  useLockBodyScroll(isAnyModalOpen);
  useEscapeToClose(() => {
    if (modalOpen) handleCloseModal();
    else if (successModalOpen) setSuccessModalOpen(false);
    else if (warningModalOpen) setWarningModalOpen(false);
  });

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
          status: a.nivel_semaforo || 'verde',
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

  const [riskFilter, setRiskFilter] = useState<'all' | 'rojo' | 'naranja' | 'verde'>('all');

  const filteredStudents = students.filter(s => {
    if (riskFilter !== 'all' && s.status !== riskFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.matricula.toLowerCase().includes(q) ||
      s.groupName.toLowerCase().includes(q)
    );
  });

  function handleOpenModal(student: StudentFromDB) {
    setSelectedStudent(student);
    setSeverity(null);
    setSelectedCategoryId('');
    setLocationName('Aula');
    setComment('');
    setIncidentDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setIncidentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setActiveTab('clasificacion');
    setErrorMsg(null);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    setSelectedStudent(null);
    setSeverity(null);
    setSelectedCategoryId('');
    setLocationName('Aula');
    setComment('');
    setIncidentDate(new Date().toISOString().split('T')[0]);
    const now = new Date();
    setIncidentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
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
      setErrorMsg('Por favor selecciona un reglamento o motivo específico.');
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

      const combinedTimestamp = (incidentDate && incidentTime)
        ? new Date(`${incidentDate}T${incidentTime}:00`).toISOString()
        : new Date().toISOString();

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
          created_at: combinedTimestamp,
        });

      if (error) throw error;

      try {
        window.dispatchEvent(new CustomEvent('ssc_data_changed', { detail: { type: 'incidencia', alumnoId: selectedStudent.id } }));
      } catch {
        // Ignorar
      }

      setSuccessModalOpen(true);
    } catch (err) {
      console.error('Error al guardar reporte disciplinario:', err);
      setErrorMsg('Ocurrió un error al guardar el reporte disciplinario.');
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
    <div className="grm-canvas">
      {/* Search and Risk Filter Row */}
      <div className="grm-search-bar-row" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="grm-search-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span className="material-symbols-outlined grm-search-icon">search</span>
          <input
            className="grm-search-input"
            placeholder="Buscar por nombre, matrícula o grupo de cualquier alumno..."
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
            </button>
          )}
        </div>

        {/* Chips de Filtro Semáforo */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setRiskFilter('all')}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              border: riskFilter === 'all' ? '1.5px solid #204785' : '1px solid #cbd5e1',
              background: riskFilter === 'all' ? '#204785' : 'var(--color-bg-card, #ffffff)',
              color: riskFilter === 'all' ? '#ffffff' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Todos ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter('rojo')}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              border: riskFilter === 'rojo' ? '1.5px solid #dc2626' : '1px solid #fecaca',
              background: riskFilter === 'rojo' ? '#fee2e2' : 'var(--color-bg-card, #ffffff)',
              color: '#dc2626',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Semáforo Rojo ({students.filter(s => s.status === 'rojo').length})
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter('naranja')}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              border: riskFilter === 'naranja' ? '1.5px solid #d97706' : '1px solid #fed7aa',
              background: riskFilter === 'naranja' ? '#fef3c7' : 'var(--color-bg-card, #ffffff)',
              color: '#d97706',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Semáforo Naranja ({students.filter(s => s.status === 'naranja').length})
          </button>
          <button
            type="button"
            onClick={() => setRiskFilter('verde')}
            style={{
              padding: '4px 10px',
              borderRadius: '9999px',
              border: riskFilter === 'verde' ? '1.5px solid #16a34a' : '1px solid #bbf7d0',
              background: riskFilter === 'verde' ? '#dcfce7' : 'var(--color-bg-card, #ffffff)',
              color: '#16a34a',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Semáforo Verde ({students.filter(s => s.status === 'verde').length})
          </button>
        </div>
      </div>

      <div className="grm-stats-row">
        <div className="grm-stat-card">
          <span className="grm-stat-number grm-stat-number--rojo">
            {students.filter(s => s.status === 'rojo').length}
          </span>
          <span className="grm-stat-label">Reportes Críticos (Rojo)</span>
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
          <h3 className="grm-table-title">Expedientes Escolares de Alumnos</h3>
        </div>
        <div className="grm-table-scroll">
          <table className="grm-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Grupo</th>
                <th style={{ textAlign: 'center' }}>Puntos Semáforo</th>
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
      <Modal isOpen={modalOpen && !!selectedStudent} onClose={handleCloseModal} className="grm-modal-box">
        <div className="grm-modal-header">
          <div>
            <h4 className="grm-modal-title">Generar Reporte Disciplinario</h4>
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

                {/* Motivo / Reglamento infringido */}
                <div className="grm-form-group">
                  <label className="grm-form-label">Motivo o Reglamento infringido</label>
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
                {/* Fecha y Hora del Suceso */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="grm-form-group" style={{ marginBottom: 0 }}>
                    <label className="grm-form-label" htmlFor="incident-date">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: '4px' }}>calendar_today</span>
                      Fecha del Suceso
                    </label>
                    <input
                      type="date"
                      id="incident-date"
                      className="grm-field-input"
                      value={incidentDate}
                      onChange={e => setIncidentDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grm-form-group" style={{ marginBottom: 0 }}>
                    <label className="grm-form-label" htmlFor="incident-time">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: '4px' }}>schedule</span>
                      Hora del Suceso
                    </label>
                    <input
                      type="time"
                      id="incident-time"
                      className="grm-field-input"
                      value={incidentTime}
                      onChange={e => setIncidentTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

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
                  <label className="grm-form-label" htmlFor="comment">Descripción y Compromisos</label>
                  <textarea
                    id="comment"
                    className="grm-field-input"
                    rows={3}
                    placeholder="Detalle de la incidencia y compromisos acordados..."
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
          <h4 className="grm-modal-title">Faltan Campos</h4>
        </div>
        <div className="grm-modal-body">
          <p>Por favor complete el nivel de severidad y el motivo reglamentario.</p>
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
          <p>El reporte disciplinario del plantel ha sido guardado exitosamente en Supabase.</p>
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