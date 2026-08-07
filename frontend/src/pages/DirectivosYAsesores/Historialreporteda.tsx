import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getIncidenciasPorPlantel } from '../../services/incidencias';
import { StudentExpedienteModal } from '../../components/bi/StudentExpedienteModal';
import type { StudentExpedienteData } from '../../components/bi/StudentExpedienteModal';
import { sendPreventiveAlertToTutor } from '../../services/bi';
import InlineAlert from '../../components/InlineAlert';
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
    puntos_totales?: number;
    nivel_semaforo?: string;
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
  puntosTotales: number;
  semaforo: string;
  reportCount: number;
  reportLevel: 'error' | 'warning' | 'info';
  initials: string;
  avatarTone: 'primary' | 'tertiary' | 'secondary';
  reports: IncidentFromDB[];
}

export default function HistorialReporteDA() {
  const { session, plantelId } = useAuth();
  const [incidents, setIncidents] = useState<IncidentFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ProcessedStudent | null>(null);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        puntos_totales?: number;
        nivel_semaforo?: string;
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
          puntosTotales: student.puntos_totales ?? 100,
          semaforo: student.nivel_semaforo || 'verde',
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

  async function handleAlertTutor(studentData: StudentExpedienteData) {
    if (!session?.user?.id) return;
    setSendingAlertId(studentData.alumno_id);
    setFeedback(null);

    try {
      const mensaje = `Estimado tutor: Se le informa que el estudiante ${studentData.nombre_completo} (${studentData.grupo_nombre}) registra incidencias en su bitácora conductual. Se solicita su seguimiento continuo.`;
      
      await sendPreventiveAlertToTutor(studentData.alumno_id, mensaje, session.user.id);

      setFeedback({
        type: 'success',
        message: `Alerta preventiva enviada con éxito al tutor de ${studentData.nombre_completo}.`,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'No se pudo enviar la alerta al tutor.';
      setFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setSendingAlertId(null);
    }
  }

  const modalStudentData: StudentExpedienteData | null = selectedStudent ? {
    alumno_id: selectedStudent.id,
    nombre_completo: selectedStudent.name,
    matricula: selectedStudent.matricula,
    grupo_nombre: selectedStudent.group,
    carrera_nombre: selectedStudent.career,
    nivel_semaforo: selectedStudent.semaforo || (selectedStudent.reportLevel === 'error' ? 'rojo' : selectedStudent.reportLevel === 'warning' ? 'naranja' : 'verde'),
    puntos_totales: selectedStudent.puntosTotales,
    total_incidencias: selectedStudent.reportCount,
  } : null;

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando bitácora disciplinaria del plantel...</div>;
  }

  return (
    <div className="hrm-canvas">
      {/* Heading and search */}
      <div className="hrm-page-header">
        <div className="hrm-page-header__text">
          <h2 className="hrm-page-title">Historial de Reportes del Plantel</h2>
          <p className="hrm-page-subtitle">Monitoreo disciplinario consolidado de todos los estudiantes.</p>
        </div>
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
      </div>

      {feedback && (
        <div style={{ marginBottom: '16px' }}>
          <InlineAlert
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        </div>
      )}

      {/* List view */}
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
                <th className="hrm-th-right">Ver Expediente Modal</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map(s => (
                  <tr
                    key={s.id}
                    className="hrm-tr-clickable"
                    onClick={() => setSelectedStudent(s)}
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
                      <span className="material-symbols-outlined hrm-chevron">visibility</span>
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

      {/* Modal Dedicado del Alumno (Renderizado vía Portal en document.body para Centrado Instantáneo) */}
      <StudentExpedienteModal
        isOpen={!!selectedStudent}
        student={modalStudentData}
        onClose={() => setSelectedStudent(null)}
        onAlertTutor={handleAlertTutor}
        sendingAlertId={sendingAlertId}
      />
    </div>
  );
}