import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getPerfilAlumno } from '../../services/alumnos';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import { exportElementToPDF } from '../../services/pdfExportService';
import { SolicitarJustificanteModal, type JustificanteRecord } from '../../components/alumno/SolicitarJustificanteModal';
import '../Home.css';

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

const Icon = ({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`material-symbols-outlined ${className}`.trim()} style={style}>{name}</span>
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

export default function InicioAlumno() {
  const { session } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoProfile | null>(null);
  const [incidencias, setIncidencias] = useState<IncidentFromDB[]>([]);
  const [asistenciaPorcentaje, setAsistenciaPorcentaje] = useState<number>(100);
  const [loadingData, setLoadingData] = useState(true);
  const [modalJustificanteOpen, setModalJustificanteOpen] = useState(false);
  const [justificantes, setJustificantes] = useState<JustificanteRecord[]>([]);
  const [avisos, setAvisos] = useState<Array<{ id: string; titulo: string; contenido: string; fecha_publicacion: string }>>([]);

  const loadJustificantes = useCallback((alumnoId: string) => {
    try {
      const storageKey = `ssc_justificantes_${alumnoId}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setJustificantes(saved);
    } catch (e) {
      console.warn('Error al cargar justificantes:', e);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!session?.user?.id) return;
      try {
        setLoadingData(true);
        const perfil = await getPerfilAlumno(session.user.id);
        if (perfil) {
          setAlumno(perfil as AlumnoProfile);
          loadJustificantes(perfil.id);

          const [incList, avisosRes] = await Promise.all([
            getIncidenciasDelAlumno(perfil.id),
            supabase
              .from('avisos')
              .select('id, titulo, contenido, fecha_publicacion')
              .in('destinatarios', ['todos', 'alumnos'])
              .order('fecha_publicacion', { ascending: false })
              .limit(3),
          ]);

          setIncidencias((incList || []) as unknown as IncidentFromDB[]);
          if (!avisosRes.error && avisosRes.data) {
            setAvisos(avisosRes.data);
          }

          // Cálculo de asistencia
          const faltas = (incList || []).filter((i: any) =>
            i.categorias_incidencia?.nombre?.toLowerCase().includes('falta') ||
            i.categorias_incidencia?.nombre?.toLowerCase().includes('inasistencia')
          ).length;
          const totalClases = 50;
          const pct = Math.max(0, Math.min(100, Math.round(((totalClases - faltas) / totalClases) * 100)));
          setAsistenciaPorcentaje(pct);
        }
      } catch (err) {
        console.error('Error al cargar datos del alumno:', err);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [session?.user?.id, loadJustificantes]);

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
        generadoPor: 'Portal Alumno',
      });
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const semaforoKey = (alumno?.nivel_semaforo || 'verde').toLowerCase();
  const semTheme = SEMAPHORE_THEME[semaforoKey] || SEMAPHORE_THEME.verde;
  const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
  const grupoObj = alumno?.grupos as { nombre?: string } | undefined;
  const nombreEstudiante = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante';
  const grupoNombre = grupoObj?.nombre || 'Grupo Asignado';

  if (loadingData) {
    return (
      <div className="home-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>Cargando información escolar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container" ref={pageRef}>
      {/* Botones de Acción Superior */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setModalJustificanteOpen(true)}
          style={{
            background: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
          }}
        >
          <Icon name="edit_calendar" style={{ fontSize: '18px' }} />
          Solicitar Justificante
        </button>

        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isExporting}
          style={{
            background: 'var(--color-brand-chambray, #204785)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            opacity: isExporting ? 0.7 : 1,
          }}
        >
          <Icon name="download" style={{ fontSize: '18px' }} />
          {isExporting ? 'Generando PDF...' : 'Descargar Ficha'}
        </button>
      </div>

      {/* Grid Principal */}
      <div className="home-grid">
        {/* Panel de Semáforo Conductual */}
        <section className={semTheme.panelClass}>
          <div className="semaphore-visual">
            <div className={semTheme.circleClass}>
              <Icon name={semTheme.icon} className="semaphore-icon" />
            </div>
            <div className="semaphore-badge">
              <span className={semTheme.labelClass}>{semTheme.label}</span>
              <span className={semTheme.sublabelClass}>Estado Actual</span>
            </div>
          </div>
          <p className="semaphore-desc">{semTheme.desc}</p>

          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', opacity: 0.8, display: 'block' }}>Puntos de Salud Conductual</span>
              <strong style={{ fontSize: '18px' }}>{alumno?.puntos_totales ?? 100} / 100 pts</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', opacity: 0.8, display: 'block' }}>Asistencia Estimada</span>
              <strong style={{ fontSize: '18px' }}>{asistenciaPorcentaje}%</strong>
            </div>
          </div>
        </section>

        {/* Hero Card del Estudiante */}
        <section className="hero-card">
          <div className="hero-card__badge">
            <Icon name="school" className="hero-card__badge-icon" />
            <span>Perfil del Estudiante • CONALEP Puebla I</span>
          </div>
          <h2 className="hero-card__title">¡Hola, {nombreEstudiante}!</h2>
          <p className="hero-card__subtitle">
            Matrícula: <strong>{alumno?.matricula || '---'}</strong> • Grupo: <strong>{grupoNombre}</strong>
          </p>
          <div className="hero-stats">
            <div className="hero-stat-item">
              <span className="hero-stat-value">{incidencias.length}</span>
              <span className="hero-stat-label">Registros Conductuales</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-value">{justificantes.length}</span>
              <span className="hero-stat-label">Justificantes Tramitados</span>
            </div>
          </div>
        </section>
      </div>

      {/* Sección de Solicitudes de Justificantes Tramitados */}
      {justificantes.length > 0 && (
        <section style={{ marginTop: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
            <Icon name="assignment" style={{ color: '#0284c7' }} />
            Mis Solicitudes de Justificante
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {justificantes.map(j => (
              <div key={j.id} style={{ background: 'var(--color-bg-app, #f8fafc)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-border-subtle, #f1f5f9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                      {j.motivo}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main, #0f172a)' }}>
                      Periodo: {j.fechaInicio} al {j.fechaFin}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>{j.descripcion}</p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: j.estado === 'aprobado' ? '#dcfce7' : j.estado === 'rechazado' ? '#fee2e2' : '#fef3c7', color: j.estado === 'aprobado' ? '#166534' : j.estado === 'rechazado' ? '#991b1b' : '#92400e' }}>
                  {j.estado === 'aprobado' ? 'Aprobado' : j.estado === 'rechazado' ? 'Rechazado' : 'En Revisión por Orientación'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Avisos del Plantel */}
      {avisos.length > 0 && (
        <section style={{ marginTop: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
            <Icon name="campaign" style={{ color: '#204785' }} />
            Avisos y Comunicados Oficiales
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {avisos.map(a => (
              <div key={a.id} style={{ background: 'var(--color-bg-app, #f8fafc)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>{a.titulo}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)' }}>{formatDate(a.fecha_publicacion)}</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-main, #334155)', whiteSpace: 'pre-line' }}>{a.contenido}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bitácora de Observaciones Recientes */}
      <section className="incidents-card" style={{ marginTop: '24px' }}>
        <div className="incidents-card__header">
          <div className="incidents-card__title-group">
            <h3 className="incidents-card__title">Bitácora de Observaciones y Méritos</h3>
            <p className="incidents-card__subtitle">Historial de registros acumulados en el periodo escolar activo.</p>
          </div>
        </div>

        {incidencias.length === 0 ? (
          <div className="incidents-empty">
            <Icon name="verified" className="incidents-empty__icon" />
            <p className="incidents-empty__text">Excelente historial. No cuentas con reportes de incidencias en este periodo.</p>
          </div>
        ) : (
          <div className="incidents-list">
            {incidencias.map((inc) => {
              const catName = inc.categorias_incidencia?.nombre || 'Observación Conductual';
              const style = getStyleForIncidencia(catName, inc.impacto_puntos);
              const isPositive = inc.impacto_puntos > 0;
              return (
                <article key={inc.id} className="incident-item">
                  <div className="incident-item__main">
                    <div className="incident-item__tags">
                      <span className={style.badgeClass}>{catName}</span>
                      <span className="incident-item__date">{formatDate(inc.created_at)}</span>
                      {inc.lugar && <span className="incident-item__location">📍 {inc.lugar}</span>}
                    </div>
                    {inc.descripcion && <p className="incident-item__desc">{inc.descripcion}</p>}
                  </div>
                  <div className="incident-item__impact">
                    <span className={style.impactClass}>
                      {isPositive ? `+${inc.impacto_puntos}` : inc.impacto_puntos} pts
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Solicitar Justificante */}
      <SolicitarJustificanteModal
        isOpen={modalJustificanteOpen}
        onClose={() => setModalJustificanteOpen(false)}
        alumnoDbId={alumno?.id || ''}
        onJustificanteEnviado={() => {
          if (alumno?.id) loadJustificantes(alumno.id);
        }}
      />
    </div>
  );
}
