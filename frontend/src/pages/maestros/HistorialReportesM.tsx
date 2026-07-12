import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getIncidenciasPorDocente } from '../../services/incidencias';
import './HistorialReportesM.css';

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

export default function HistorialReportesM() {
  const { session } = useAuth();
  const [incidents, setIncidents] = useState<IncidentFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ProcessedStudent | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadIncidents() {
      try {
        const data = await getIncidenciasPorDocente(session!.user!.id);
        setIncidents(data as unknown as IncidentFromDB[]);
      } catch (err) {
        console.error('Error al cargar historial de incidencias:', err);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, [session]);

  // Procesamos y agrupamos incidencias por alumno
  const studentsList: ProcessedStudent[] = useMemo(() => {
    const map = new Map<string, ProcessedStudent>();
    const tones: Array<'primary' | 'tertiary' | 'secondary'> = ['primary', 'tertiary', 'secondary'];

    incidents.forEach((inc, idx) => {
      const studentRaw = inc.alumnos;
      const student = (Array.isArray(studentRaw) ? studentRaw[0] : studentRaw) as {
        matricula?: string;
        usuarios?: { nombre: string; apellido: string } | null;
      } | null;
      if (!student) return;

      const studentId = inc.alumno_id;
      if (!map.has(studentId)) {
        const name = `${student.usuarios?.nombre || ''} ${student.usuarios?.apellido || ''}`.trim();
        const initials = ((student.usuarios?.nombre?.substring(0, 1) || '') + (student.usuarios?.apellido?.substring(0, 1) || '')).toUpperCase();
        
        map.set(studentId, {
          id: studentId,
          name,
          matricula: student.matricula || 'N/A',
          career: 'CONALEP Plantel Puebla I',
          group: 'Grupo Asignado',
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

      const color = inc.categorias_incidencia?.color_semaforo || 'green';
      if (color === 'red') {
        sObj.reportLevel = 'error';
      } else if (color === 'yellow' || color === 'orange') {
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
  }

  function handleHideDetail() {
    setSelectedStudent(null);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando historial de reportes...</div>;
  }

  return (
    <div className="hrm-canvas-only">
      {/* Page heading + search */}
      <div className="hrm-page-header">
        <div className="hrm-page-header__text">
          <h2 className="hrm-page-title">Historial de Reportes</h2>
          <p className="hrm-page-subtitle">Gestión y seguimiento de incidencias académicas y conductuales.</p>
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
                  <th>Carrera / Plantel</th>
                  <th>Reportes</th>
                  <th className="hrm-th-right">Acción</th>
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
                    <td colSpan={5} className="hrm-td-empty" style={{ textAlign: 'center', padding: '32px' }}>
                      No tienes reportes de alumnos registrados en tu historial.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail view */}
      {selectedStudent && (
        <div className="hrm-detail animate-fade-in">
          <button className="hrm-back-btn" onClick={handleHideDetail}>
            <span className="material-symbols-outlined">arrow_back</span>
            Regresar al listado
          </button>

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
                    <span className="material-symbols-outlined hrm-meta-icon">school</span>
                    {selectedStudent.career}
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
            <h3 className="hrm-timeline-title">Bitácora Histórica</h3>
            <div className="hrm-timeline">
              {selectedStudent.reports.map((report) => {
                const isCritical = report.categorias_incidencia?.color_semaforo === 'red';
                const isWarning = report.categorias_incidencia?.color_semaforo === 'yellow' || report.categorias_incidencia?.color_semaforo === 'orange';
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
          </div>
        </div>
      )}
    </div>
  );
}