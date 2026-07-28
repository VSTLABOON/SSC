import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getIncidenciasPorPlantel } from '../../services/incidencias';
import './Historialreporteda.css';

interface IncidentFromDB {
  id: string;
  descripcion: string;
  lugar: string;
  impacto_puntos: number;
  created_at: string;
  alumno_id: string;
  alumnos: {
    matricula: string;
    usuarios: {
      nombre: string;
      apellido: string;
    } | null;
    grupos: {
      nombre: string;
      carreras: {
        nombre: string;
      } | null;
    } | null;
  } | null;
  categorias_incidencia: {
    nombre: string;
    color_semaforo: string;
  } | null;
}

interface ProcessedStudent {
  id: string;
  name: string;
  matricula: string;
  career: string;
  group: string;
  reportCount: number;
  reportLevel: 'error' | 'warning' | 'info';
  initials: string;
  avatarTone: 'primary' | 'tertiary' | 'secondary';
  reports: IncidentFromDB[];
}

type DetailFilterType = 'all' | 'verde' | 'naranja' | 'rojo';

export default function HistorialReporteDA() {
  const { plantelId } = useAuth();
  const [incidents, setIncidents] = useState<IncidentFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ProcessedStudent | null>(null);
  const [detailFilter, setDetailFilter] = useState<DetailFilterType>('all');

  useEffect(() => {
    if (!plantelId) return;

    async function loadIncidents() {
      try {
        const data = await getIncidenciasPorPlantel(plantelId!);
        setIncidents(data as unknown as IncidentFromDB[]);
      } catch (err) {
        console.error('Error al cargar historial disciplinario del plantel:', err);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, [plantelId]);

  // Agrupación de incidencias por alumno
  const studentsList: ProcessedStudent[] = useMemo(() => {
    const map = new Map<string, ProcessedStudent>();
    const tones: Array<'primary' | 'tertiary' | 'secondary'> = ['primary', 'tertiary', 'secondary'];

    incidents.forEach((inc, idx) => {
      const studentRaw = inc.alumnos;
      const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as {
        matricula?: string;
        usuarios?: { nombre: string; apellido: string } | null;
        grupos?: {
          nombre: string;
          carreras?: {
            nombre: string;
          } | null;
        } | null;
      } | null;
      if (!student) return;

      const studentId = inc.alumno_id;
      if (!map.has(studentId)) {
        const name = `${student.usuarios?.nombre || ''} ${student.usuarios?.apellido || ''}`.trim();
        const initials = ((student.usuarios?.nombre?.substring(0, 1) || '') + (student.usuarios?.apellido?.substring(0, 1) || '')).toUpperCase();
        
        const groupObj = Array.isArray(student.grupos) ? student.grupos[0] : student.grupos;
        const carreraObj = groupObj?.carreras;
        const careerName = (Array.isArray(carreraObj) ? carreraObj[0] : carreraObj)?.nombre || 'Carrera No Especificada';

        map.set(studentId, {
          id: studentId,
          name,
          matricula: student.matricula || 'N/A',
          career: careerName,
          group: groupObj?.nombre || 'Sin Grupo',
          reportCount: 0,
          reportLevel: 'info',
          initials,
          avatarTone: tones[idx % tones.length],
          reports: [],
        });
      }

      const sObj = map.get(studentId)!;
      sObj.reports.push(inc);
      sObj.reportCount++;

      const color = inc.categorias_incidencia?.color_semaforo || 'verde';
      if (color === 'rojo') {
        sObj.reportLevel = 'error';
      } else if (color === 'naranja') {
        if (sObj.reportLevel !== 'error') {
          sObj.reportLevel = 'warning';
        }
      }
    });

    return Array.from(map.values());
  }, [incidents]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return studentsList;
    return studentsList.filter(s =>
      s.name.toLowerCase().includes(q) || s.matricula.toLowerCase().includes(q)
    );
  }, [studentsList, searchQuery]);

  function handleShowDetail(student: ProcessedStudent) {
    setSelectedStudent(student);
    setDetailFilter('all');
  }

  function handleHideDetail() {
    setSelectedStudent(null);
    setDetailFilter('all');
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Filtrado de incidencias del alumno por pastillas
  const positiveCount = selectedStudent?.reports.filter(r => (r.categorias_incidencia?.color_semaforo === 'verde' || r.impacto_puntos > 0)).length || 0;
  const warningCount = selectedStudent?.reports.filter(r => (r.categorias_incidencia?.color_semaforo === 'naranja' && r.impacto_puntos <= 0)).length || 0;
  const criticalCount = selectedStudent?.reports.filter(r => (r.categorias_incidencia?.color_semaforo === 'rojo')).length || 0;

  const filteredDetailReports = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.reports.filter(r => {
      if (detailFilter === 'all') return true;
      const color = r.categorias_incidencia?.color_semaforo || 'verde';
      if (detailFilter === 'verde') return color === 'verde' || r.impacto_puntos > 0;
      if (detailFilter === 'naranja') return color === 'naranja' && r.impacto_puntos <= 0;
      if (detailFilter === 'rojo') return color === 'rojo';
      return true;
    });
  }, [selectedStudent, detailFilter]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando bitácora disciplinaria del plantel...</div>;
  }

  return (
    <div className="hrm-canvas-only">
      {/* Heading and search */}
      <div className="hrm-page-header">
        <div className="hrm-page-header__text">
          <h2 className="hrm-page-title">Historial de Reportes del Plantel</h2>
          <p className="hrm-page-subtitle">Monitoreo disciplinario consolidado de todos los estudiantes.</p>
        </div>
        {!selectedStudent && (
          <div className="hrm-search-wrap">
            <span className="material-symbols-outlined hrm-search-icon">search</span>
            <input
              className="hrm-search-input"
              placeholder="Buscar por nombre o matrícula..."
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* List view */}
      {!selectedStudent && (
        <div className="hrm-table-container animate-fade-in">
          <div className="hrm-table-scroll">
            <table className="hrm-table">
              <thead>
                <tr>
                  <th>Nombre del Alumno</th>
                  <th>Matrícula</th>
                  <th>Grupo</th>
                  <th>Carrera / Plantel</th>
                  <th>Reportes Totales</th>
                  <th className="hrm-th-right">Ver Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(s => (
                    <tr
                      key={s.id}
                      className="hrm-tr-clickable"
                      onClick={() => handleShowDetail(s)}
                    >
                      <td>
                        <div className="hrm-student-cell">
                          <div className={`hrm-avatar hrm-avatar--${s.avatarTone}`}>{s.initials}</div>
                          <span className="hrm-student-name">{s.name}</span>
                        </div>
                      </td>
                      <td className="hrm-td-muted">{s.matricula}</td>
                      <td className="hrm-td-muted">{s.group}</td>
                      <td className="hrm-td-muted">{s.career}</td>
                      <td>
                        <span className={`hrm-report-badge hrm-report-badge--${s.reportLevel}`}>
                          {s.reportCount} {s.reportCount === 1 ? 'Reporte' : 'Reportes'}
                        </span>
                      </td>
                      <td className="hrm-td-action">
                        <span className="material-symbols-outlined hrm-chevron">chevron_right</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="hrm-td-empty" style={{ textAlign: 'center', padding: '32px' }}>
                      {incidents.length === 0
                        ? 'No se han registrado reportes disciplinarios en el plantel.'
                        : 'No se encontraron alumnos con los criterios de búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail view con Pastillas de Organización */}
      {selectedStudent && (
        <div className="hrm-detail animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <button className="hrm-back-btn" onClick={handleHideDetail} style={{ margin: 0 }}>
              <span className="material-symbols-outlined">arrow_back</span>
              Regresar al listado consolidado
            </button>
            <button
              type="button"
              className="hrm-back-btn"
              onClick={() => window.print()}
              style={{ margin: 0, background: '#ffffff', border: '1px solid #e2e8f0', color: '#204785' }}
              title="Imprimir expediente del alumno"
            >
              <span className="material-symbols-outlined">print</span>
              Imprimir Ficha PDF
            </button>
          </div>

          {/* Student card */}
          <div className="hrm-student-card">
            <div className="hrm-student-card__left">
              <div className={`hrm-detail-avatar hrm-avatar--${selectedStudent.avatarTone}`}>
                {selectedStudent.initials}
              </div>
              <div>
                <h2 className="hrm-detail-name">{selectedStudent.name}</h2>
                <div className="hrm-detail-meta">
                  <span className="hrm-detail-meta__item">
                    <span className="material-symbols-outlined hrm-meta-icon">id_card</span>
                    Matrícula: {selectedStudent.matricula}
                  </span>
                  <span className="hrm-detail-meta__item">
                    <span className="material-symbols-outlined hrm-meta-icon">groups</span>
                    Grupo: {selectedStudent.group}
                  </span>
                  <span className="hrm-detail-meta__item">
                    <span className="material-symbols-outlined hrm-meta-icon">school</span>
                    Carrera: {selectedStudent.career}
                  </span>
                </div>
              </div>
            </div>
            <div className="hrm-student-card__right">
              <span className={`hrm-report-badge hrm-report-badge--large hrm-report-badge--${selectedStudent.reportLevel}`}>
                {selectedStudent.reportCount} {selectedStudent.reportCount === 1 ? 'Reporte' : 'Reportes'}
              </span>
            </div>
          </div>

          {/* Timeline of reports */}
          <div className="hrm-timeline-container">
            <h3 className="hrm-timeline-title">Expediente Disciplinario Completo</h3>

            {/* Pastillas de Organización del Historial (Pill Tabs) */}
            <div className="dedicated-tabs-container" style={{ margin: '14px 0 20px', background: '#ffffff', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className={`dedicated-tab-btn ${detailFilter === 'all' ? 'dedicated-tab-btn--active' : ''}`}
                onClick={() => setDetailFilter('all')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
                Todos ({selectedStudent.reports.length})
              </button>
              <button
                type="button"
                className={`dedicated-tab-btn ${detailFilter === 'verde' ? 'dedicated-tab-btn--active' : ''}`}
                onClick={() => setDetailFilter('verde')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>check_circle</span>
                Positivos / Méritos ({positiveCount})
              </button>
              <button
                type="button"
                className={`dedicated-tab-btn ${detailFilter === 'naranja' ? 'dedicated-tab-btn--active' : ''}`}
                onClick={() => setDetailFilter('naranja')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#f59e0b' }}>warning</span>
                Faltas Leves ({warningCount})
              </button>
              <button
                type="button"
                className={`dedicated-tab-btn ${detailFilter === 'rojo' ? 'dedicated-tab-btn--active' : ''}`}
                onClick={() => setDetailFilter('rojo')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ef4444' }}>error</span>
                Faltas Críticas ({criticalCount})
              </button>
            </div>

            {filteredDetailReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                No hay incidencias registradas de este tipo para el estudiante.
              </div>
            ) : (
              <div className="hrm-timeline">
                {filteredDetailReports.map((report) => {
                  const isCritical = report.categorias_incidencia?.color_semaforo === 'rojo';
                  const isWarning = report.categorias_incidencia?.color_semaforo === 'naranja';
                  let dotClass = 'hrm-timeline-dot--info';
                  if (isCritical) dotClass = 'hrm-timeline-dot--danger';
                  else if (isWarning) dotClass = 'hrm-timeline-dot--warning';

                  return (
                    <div className="hrm-timeline-item" key={report.id}>
                      <div className={`hrm-timeline-dot ${dotClass}`} />
                      <div className="hrm-timeline-content">
                        <div className="hrm-timeline-header">
                          <h4 className="hrm-timeline-item-title">
                            {report.categorias_incidencia?.nombre || 'Incidencia General'}
                          </h4>
                          <span className="hrm-timeline-date">{formatDate(report.created_at)}</span>
                        </div>
                        <p className="hrm-timeline-desc">
                          {report.descripcion}
                        </p>
                        <div className="hrm-timeline-meta">
                          <span className="hrm-timeline-meta-label">Lugar: {report.lugar}</span>
                          <span className="hrm-timeline-meta-label" style={{ color: report.impacto_puntos > 0 ? '#22c55e' : '#ba1a1a' }}>
                            Impacto: {report.impacto_puntos > 0 ? `+${report.impacto_puntos}` : report.impacto_puntos} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}