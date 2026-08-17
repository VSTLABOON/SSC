import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getPerfilAlumno } from '../services/alumnos';
import { getIncidenciasDelAlumno } from '../services/incidencias';
import { exportElementToPDF } from '../services/pdfExportService';
import './Home.css';

interface IncidentFromDB {
  id: string;
  descripcion: string;
  lugar: string;
  impacto_puntos: number;
  created_at: string;
  categorias_incidencia: {
    nombre: string;
    color_semaforo: string;
  } | null;
}

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

const SEMAPHORE_THEME: Record<
  string,
  { icon: string; panelClass: string; circleClass: string; labelClass: string; sublabelClass: string; label: string; desc: string }
> = {
  verde: {
    icon: 'check_circle',
    panelClass: 'semaphore-panel semaphore-panel--verde',
    circleClass: 'semaphore-circle semaphore-circle--verde',
    labelClass: 'semaphore-label semaphore-label--verde',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--verde',
    label: 'Verde',
    desc: 'Se mantiene en verde mientras tengas buen desempeño conductual y académico.',
  },
  naranja: {
    icon: 'warning',
    panelClass: 'semaphore-panel semaphore-panel--naranja',
    circleClass: 'semaphore-circle semaphore-circle--naranja',
    labelClass: 'semaphore-label semaphore-label--naranja',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--naranja',
    label: 'Naranja',
    desc: 'Se activa por incidencias acumuladas o faltas recurrentes.',
  },
  rojo: {
    icon: 'error',
    panelClass: 'semaphore-panel semaphore-panel--rojo',
    circleClass: 'semaphore-circle semaphore-circle--rojo',
    labelClass: 'semaphore-label semaphore-label--rojo',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--rojo',
    label: 'Rojo',
    desc: 'Se activa por más de 3 faltas o acumulación de reportes conductuales graves.',
  },
};

function getStyleForIncidencia(nombre: string, impacto: number) {
  const lower = nombre.toLowerCase();
  if (lower.includes('inasistencia') || lower.includes('falta')) {
    return { badgeClass: 'badge badge--error', impactClass: 'impact impact--negative-strong' };
  } else if (impacto > 0) {
    return { badgeClass: 'badge badge--secondary', impactClass: 'impact impact--positive' };
  } else {
    return { badgeClass: 'badge badge--amber', impactClass: 'impact impact--negative-mild' };
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface AlumnoProfile {
  id: string;
  matricula: string;
  nivel_semaforo: string;
  puntos_totales: number;
  usuarios: unknown;
  grupos: unknown;
}

export default function Home() {
  const { session, rol } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoProfile | null>(null);
  const [incidencias, setIncidencias] = useState<IncidentFromDB[]>([]);
  const [asistenciaPorcentaje, setAsistenciaPorcentaje] = useState<number>(100);
  const [loadingData, setLoadingData] = useState(true);
  const [hijos, setHijos] = useState<Array<{ alumno_id: string; nombre: string; grupo: string }>>([]);
  const [selectedHijoId, setSelectedHijoId] = useState<string>(() => localStorage.getItem('ssc_selected_child_id') || '');

  // Sincronización con el selector global de tutelados
  useEffect(() => {
    function handleChildChange(evt: Event) {
      const custom = evt as CustomEvent<{ childId: string }>;
      if (custom.detail?.childId) {
        setSelectedHijoId(custom.detail.childId);
      }
    }
    window.addEventListener('ssc_child_change', handleChildChange);
    return () => window.removeEventListener('ssc_child_change', handleChildChange);
  }, []);

  const handleExportPDF = async () => {
    if (!pageRef.current) return;
    setIsExporting(true);
    try {
      const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
      const nombreAlumno = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}` : 'Alumno';
      await exportElementToPDF(pageRef.current, {
        title: `Ficha Conductual - ${nombreAlumno}`,
        filename: `Ficha_Conductual_${alumno?.matricula || 'Alumno'}.pdf`,
        plantelNombre: 'CONALEP Plantel Puebla I',
        periodoNombre: 'Semestre A-2026',
        generadoPor: rol === 'padre' ? 'Tutor Legal' : 'Alumno',
      });
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadData() {
      try {
        setLoadingData(true);
        let studentId = session!.user!.id;

        if (rol === 'padre') {
          const { data: linkRows, error: linkError } = await supabase
            .from('padres_alumnos')
            .select('alumno_id, parentesco, alumnos(id, matricula, correo_institucional, grupos(nombre), usuarios!alumnos_usuario_id_fkey(nombre, apellido))')
            .eq('padre_id', session!.user!.id);

          if (linkError) throw linkError;
          if (!linkRows || linkRows.length === 0) {
            console.warn('El tutor no tiene alumnos vinculados.');
            setAlumno(null);
            setLoadingData(false);
            return;
          }

          const options = linkRows.map((r: any) => {
            const al = Array.isArray(r.alumnos) ? r.alumnos[0] : r.alumnos;
            const us = Array.isArray(al?.usuarios) ? al?.usuarios[0] : al?.usuarios;
            const gr = Array.isArray(al?.grupos) ? al?.grupos[0] : al?.grupos;
            const fallback = al?.correo_institucional
              ? al.correo_institucional.split('@')[0].replace('student.', 'Estudiante ').replace('.', ' ')
              : `Estudiante (${al?.matricula || 'Tutelado'})`;
            const nombreCompleto = us?.nombre ? `${us.nombre} ${us.apellido || ''}`.trim() : fallback;

            return {
              alumno_id: r.alumno_id,
              nombre: nombreCompleto,
              grupo: gr?.nombre || 'Sin Grupo',
            };
          });

          setHijos(options);

          let currentChildId = selectedHijoId;
          if (!currentChildId || !options.some(h => h.alumno_id === currentChildId)) {
            currentChildId = options[0].alumno_id;
            setSelectedHijoId(currentChildId);
            localStorage.setItem('ssc_selected_child_id', currentChildId);
          }
          studentId = currentChildId;
        }

        const studentData = await getPerfilAlumno(studentId);
        setAlumno(studentData);

        const incs = await getIncidenciasDelAlumno(studentId);
        setIncidencias(incs as unknown as IncidentFromDB[]);

        // Cálculo dinámico de asistencia real desde la base de datos
        const { data: astRows } = await supabase
          .from('asistencias')
          .select('estatus, presente, justificada')
          .eq('alumno_id', studentId);

        if (astRows && astRows.length > 0) {
          const valid = astRows.filter(a =>
            a.estatus === 'asistencia' ||
            a.estatus === 'justificada' ||
            a.presente === true ||
            a.justificada === true
          ).length;
          setAsistenciaPorcentaje(Math.round((valid / astRows.length) * 100));
        } else {
          setAsistenciaPorcentaje(100);
        }
      } catch (err) {
        console.error('Error al cargar datos del alumno:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [session, rol, selectedHijoId]);

  function handleSelectHijo(childId: string) {
    setSelectedHijoId(childId);
    localStorage.setItem('ssc_selected_child_id', childId);
    window.dispatchEvent(new CustomEvent('ssc_child_change', { detail: { childId } }));
  }

  if (loadingData) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando información del alumno...</div>;
  }

  const level = alumno?.nivel_semaforo || 'verde';
  const theme = SEMAPHORE_THEME[level] || SEMAPHORE_THEME.verde;

  const user = (Array.isArray(alumno?.usuarios) ? alumno?.usuarios[0] : alumno?.usuarios) as { nombre?: string; apellido?: string } | null;
  const group = (Array.isArray(alumno?.grupos) ? alumno?.grupos[0] : alumno?.grupos) as { nombre?: string } | null;

  return (
    <div className="home-canvas-only" ref={pageRef}>
      {/* Selector de Hijo si el tutor tiene 2 o más estudiantes vinculados */}
      {rol === 'padre' && hijos.length > 1 && (
        <div style={{ marginBottom: '16px', background: 'var(--color-bg-card, #ffffff)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--color-border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-brand-chambray, #204785)' }}>family_restroom</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>Seleccionar Estudiante Tutelado:</span>
          </div>
          <select
            value={selectedHijoId}
            onChange={e => handleSelectHijo(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border-subtle, #cbd5e1)', background: 'var(--color-bg-card, #ffffff)', color: 'var(--color-text-main, #0f172a)', fontSize: '13px', fontWeight: 600, outline: 'none' }}
          >
            {hijos.map(h => (
              <option key={h.alumno_id} value={h.alumno_id}>
                {h.nombre} (Grupo {h.grupo})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Hero */}
      <div className="hero">
        <div className="hero-text">
          <h2 className="hero-greeting">
            <span className="hero-greeting-light">¡Bienvenido, </span>
            <span className="hero-greeting-bold">
              {user?.nombre} {user?.apellido}!
            </span>
          </h2>
          <p className="hero-subtitle">
            Matrícula: {alumno?.matricula || 'N/A'} &nbsp;&nbsp; {group?.nombre || 'Sin Grupo'}
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn-download" onClick={handleExportPDF} disabled={isExporting} title="Descargar Ficha Conductual en PDF">
            <Icon name="download" />
            <span className="btn-download-label-full">{isExporting ? 'Generando PDF...' : 'Descargar Reporte PDF'}</span>
            <span className="btn-download-label-short">Reporte</span>
          </button>
          <div className="cycle-badge">
            <Icon name="verified_user" className="cycle-badge-icon" />
            <span>Ciclo Escolar Activo</span>
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className="dashboard-grid">
        {/* 1. Semáforo conductual */}
        <section className="card card-semaforo">
          <div className="card-header">
            <h3 className="card-title">Estado Conductual</h3>
            <span className="pill pill--neutral">Semáforo Actual</span>
          </div>
          <div className={theme.panelClass}>
            <div className={theme.circleClass}>
              <Icon name={theme.icon} className="semaphore-icon" />
            </div>
            <div className="semaphore-text">
              <span className={theme.labelClass}>{theme.label}</span>
              <span className={theme.sublabelClass}>({alumno?.puntos_totales ?? 100} pts)</span>
            </div>
          </div>
          <div className="info-box">
            <Icon name="info" className="info-box-icon" />
            <p>{theme.desc}</p>
          </div>
        </section>

        {/* 2. Historial de cumplimiento (Estático por diseño visual) */}
        <section className="card card-historial">
          <div className="card-header card-header--wrap">
            <h3 className="card-title">Historial de Cumplimiento</h3>
            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot legend-dot--primary" />
                <span>Óptimo</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot--amber" />
                <span>Riesgo</span>
              </div>
            </div>
          </div>
          <div className="chart">
            <div className="chart-gridlines" aria-hidden="true">
              <div className="chart-gridline"><span>100%</span></div>
              <div className="chart-gridline"><span>50%</span></div>
              <div className="chart-gridline chart-gridline--last"><span>0%</span></div>
            </div>
            <div className="chart-bars">
              <div className="chart-bar-col">
                <div className="chart-bar chart-bar--primary" style={{ height: '98%' }} />
                <span className="chart-bar-label">Feb</span>
              </div>
              <div className="chart-bar-col">
                <div className="chart-bar chart-bar--primary" style={{ height: '85%' }} />
                <span className="chart-bar-label">Mar</span>
              </div>
              <div className="chart-bar-col">
                <div className="chart-bar chart-bar--amber" style={{ height: '65%' }} />
                <span className="chart-bar-label">Abr</span>
              </div>
              <div className="chart-bar-col">
                <div className="chart-bar chart-bar--amber" style={{ height: '72%' }} />
                <span className="chart-bar-label">May</span>
              </div>
              <div className="chart-bar-col">
                <div className="chart-bar chart-bar--primary" style={{ height: '88%' }} />
                <span className="chart-bar-label">Jun</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Asistencia */}
        <section className="card card-asistencia">
          <div className="card-icon-title">
            <div className="card-icon"><Icon name="calendar_today" /></div>
            <h3 className="card-title">Asistencia</h3>
          </div>
          <div className="attendance-value">
            <span className="attendance-percentage">{asistenciaPorcentaje}%</span>
            <span className="attendance-label">Promedio Mensual</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${asistenciaPorcentaje}%` }} />
          </div>
          <p className="card-note">Mantienes un buen desempeño, sigue manteniendo este nivel.</p>
        </section>

        {/* 4. Aviso próximo (Estático/Mock) */}
        <section className="card card-aviso">
          <div>
            <h3 className="card-title card-title--inverse">Reunión de Tutoría</h3>
            <p className="notice-description">Reunión de tutoría para alumnos en seguimiento conductual.</p>
          </div>
          <div className="notice-date">
            <Icon name="calendar_month" />
            <span>Viernes 15 Jul, 10:00 AM</span>
          </div>
        </section>

        {/* 5. Actividad reciente */}
        <section className="card card-actividad">
          <h3 className="card-title">Actividad Reciente</h3>
          <div className="table-wrapper custom-scrollbar">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th className="text-right">Impacto</th>
                </tr>
              </thead>
              <tbody>
                {incidencias.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '16px' }}>
                      Sin actividad registrada recientemente.
                    </td>
                  </tr>
                ) : (
                  incidencias.map((record) => {
                    const catRaw = record.categorias_incidencia;
                    const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { nombre?: string } | null;
                    const catName = cat?.nombre || 'General';
                    const styles = getStyleForIncidencia(catName, record.impacto_puntos);
                    return (
                      <tr key={record.id}>
                        <td className="cell-date">{formatDate(record.created_at)}</td>
                        <td>
                          <span className={styles.badgeClass}>{catName.toUpperCase()}</span>
                        </td>
                        <td className="cell-description">{record.descripcion}</td>
                        <td className={`text-right ${styles.impactClass}`}>
                          {record.impacto_puntos > 0 ? `+${record.impacto_puntos}` : record.impacto_puntos} pts
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <footer className="home-footer">
        <p>© 2026 CONALEP - Sistema de Gestión de Conducta Estudiantil</p>
      </footer>
    </div>
  );
}