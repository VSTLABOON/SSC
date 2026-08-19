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

  const loadData = useCallback(async () => {
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
  }, [session?.user?.id, loadJustificantes]);

  useEffect(() => {
    loadData();

    // 1. Suscripción en tiempo real a cambios en incidencias y saldo de puntos
    const channel = supabase
      .channel('realtime-alumno-home')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidencias' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alumnos' },
        () => {
          loadData();
        }
      )
      .subscribe();

    // 2. Escucha de eventos locales
    const handleDataChanged = () => {
      loadData();
    };
    window.addEventListener('ssc_data_changed', handleDataChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ssc_data_changed', handleDataChanged);
    };
  }, [loadData]);

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

  const [activeTab, setActiveTab] = useState<'todos' | 'resumen' | 'bitacora' | 'justificantes' | 'avisos'>('todos');
  const [incFilter, setIncFilter] = useState<'all' | 'verde' | 'naranja' | 'rojo'>('all');

  const semaforoKey = (alumno?.nivel_semaforo || 'verde').toLowerCase();
  const semTheme = SEMAPHORE_THEME[semaforoKey] || SEMAPHORE_THEME.verde;
  const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
  const grupoObj = alumno?.grupos as { nombre?: string } | undefined;
  const nombreEstudiante = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante';
  const grupoNombre = grupoObj?.nombre || 'Grupo Asignado';

  const countVerdes = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).length;
  const countNaranjas = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'naranja' && i.impacto_puntos <= 0)).length;
  const countRojas = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'rojo' || i.impacto_puntos <= -15)).length;

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
            background: '#00492f',
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
            boxShadow: '0 2px 8px rgba(0, 73, 47, 0.25)',
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

      {/* Barra de División Principal por Píldoras */}
      <nav aria-label="Secciones del portal" style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '14px', marginBottom: '20px', display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'todos' ? '2px solid #00492f' : '1px solid #cbd5e1',
            background: activeTab === 'todos' ? '#00492f' : '#f8fafc',
            color: activeTab === 'todos' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="view_cozy" style={{ fontSize: '18px' }} />
          Vista Completa
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resumen')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'resumen' ? '2px solid #00492f' : '1px solid #cbd5e1',
            background: activeTab === 'resumen' ? '#00492f' : '#f8fafc',
            color: activeTab === 'resumen' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="dashboard" style={{ fontSize: '18px' }} />
          Semáforo & Perfil
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bitacora')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'bitacora' ? '2px solid #00492f' : '1px solid #cbd5e1',
            background: activeTab === 'bitacora' ? '#00492f' : '#f8fafc',
            color: activeTab === 'bitacora' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="history_edu" style={{ fontSize: '18px' }} />
          Bitácora Conductual ({incidencias.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('justificantes')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'justificantes' ? '2px solid #00492f' : '1px solid #cbd5e1',
            background: activeTab === 'justificantes' ? '#00492f' : '#f8fafc',
            color: activeTab === 'justificantes' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="assignment" style={{ fontSize: '18px' }} />
          Justificantes ({justificantes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('avisos')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'avisos' ? '2px solid #00492f' : '1px solid #cbd5e1',
            background: activeTab === 'avisos' ? '#00492f' : '#f8fafc',
            color: activeTab === 'avisos' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="campaign" style={{ fontSize: '18px' }} />
          Avisos ({avisos.length})
        </button>
      </nav>

      {/* Grid Principal (Resumen / Semáforo) */}
      {(activeTab === 'todos' || activeTab === 'resumen') && (
        <div className="home-grid" style={{ marginBottom: '24px' }}>
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
      )}

      {/* Sección de Solicitudes de Justificantes Tramitados */}
      {(activeTab === 'todos' || activeTab === 'justificantes') && justificantes.length > 0 && (
        <section style={{ marginBottom: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
              <Icon name="assignment" style={{ color: '#00492f' }} />
              Mis Solicitudes de Justificante ({justificantes.length})
            </h3>
            <button
              type="button"
              onClick={() => setModalJustificanteOpen(true)}
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Icon name="add" style={{ fontSize: '16px' }} />
              Nueva Solicitud
            </button>
          </div>
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
      {(activeTab === 'todos' || activeTab === 'avisos') && avisos.length > 0 && (
        <section style={{ marginBottom: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
            <Icon name="campaign" style={{ color: '#204785' }} />
            Avisos y Comunicados Oficiales ({avisos.length})
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

      {/* Bitácora de Observaciones Recientes: Separación Nítida Positiva vs Negativa */}
      {(activeTab === 'todos' || activeTab === 'bitacora') && (
        <section className="incidents-card" style={{ marginBottom: '24px' }}>
          <div className="incidents-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div className="incidents-card__title-group">
              <h3 className="incidents-card__title">Bitácora de Actividad Escolar</h3>
              <p className="incidents-card__subtitle">Desglose nítido y separado de reconocimientos positivos y reportes de conducta.</p>
            </div>

            {/* Píldoras de Filtro de Polaridad */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIncFilter('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  border: incFilter === 'all' ? '2px solid #00492f' : '1px solid #cbd5e1',
                  background: incFilter === 'all' ? '#00492f' : '#f8fafc',
                  color: incFilter === 'all' ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon name="splitscreen" style={{ fontSize: '16px' }} />
                2 Columnas (Todo: {incidencias.length})
              </button>

              <button
                type="button"
                onClick={() => setIncFilter('verde')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  border: incFilter === 'verde' ? '2px solid #15803d' : '1px solid #cbd5e1',
                  background: incFilter === 'verde' ? '#15803d' : '#f8fafc',
                  color: incFilter === 'verde' ? '#ffffff' : '#15803d',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon name="workspace_premium" style={{ fontSize: '16px' }} />
                Solo Méritos (+{countVerdes})
              </button>

              <button
                type="button"
                onClick={() => setIncFilter('naranja')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  border: (incFilter === 'naranja' || incFilter === 'rojo') ? '2px solid #b45309' : '1px solid #cbd5e1',
                  background: (incFilter === 'naranja' || incFilter === 'rojo') ? '#b45309' : '#f8fafc',
                  color: (incFilter === 'naranja' || incFilter === 'rojo') ? '#ffffff' : '#b45309',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Icon name="warning" style={{ fontSize: '16px' }} />
                Solo Observaciones (-{countNaranjas + countRojas})
              </button>
            </div>
          </div>

          {/* Grid de 2 Columnas Independientes */}
          <div style={{ display: 'grid', gridTemplateColumns: incFilter === 'all' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '20px', marginTop: '16px' }}>
            
            {/* COLUMNA 1: ACTIVIDAD POSITIVA (+ Puntos) */}
            {(incFilter === 'all' || incFilter === 'verde') && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #bbf7d0', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="workspace_premium" style={{ color: '#166534' }} />
                    Méritos y Participaciones Positivas
                  </h4>
                  <span style={{ fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '9999px' }}>
                    {countVerdes} registros
                  </span>
                </div>

                {incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: '#166534', opacity: 0.8 }}>
                    <Icon name="stars" style={{ fontSize: '32px', marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Aún no hay participaciones destacadas registradas en este periodo.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).map((inc) => (
                      <article key={inc.id} style={{ background: '#ffffff', border: '1px solid #dcfce7', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(22, 101, 52, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                            {inc.categorias_incidencia?.nombre || 'Mérito Escolar'}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
                            +{inc.impacto_puntos} pts
                          </span>
                        </div>
                        {inc.descripcion && <p style={{ margin: '4px 0', fontSize: '13px', color: '#334155' }}>{inc.descripcion}</p>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                          <span>{formatDate(inc.created_at)}</span>
                          {inc.lugar && <span>{inc.lugar}</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COLUMNA 2: ACTIVIDAD PREVENTIVA Y OBSERVACIONES (- Puntos) */}
            {(incFilter === 'all' || incFilter === 'naranja' || incFilter === 'rojo') && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #fde68a', paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="warning" style={{ color: '#b45309' }} />
                    Observaciones y Faltas Disciplinarias
                  </h4>
                  <span style={{ fontSize: '12px', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '9999px' }}>
                    {countNaranjas + countRojas} registros
                  </span>
                </div>

                {incidencias.filter(i => (i.impacto_puntos <= 0 && i.categorias_incidencia?.color_semaforo !== 'verde')).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: '#92400e', opacity: 0.8 }}>
                    <Icon name="verified" style={{ fontSize: '32px', marginBottom: '6px', color: '#15803d' }} />
                    <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Excelente conducta. 0 faltas u observaciones registradas.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {incidencias.filter(i => (i.impacto_puntos <= 0 && i.categorias_incidencia?.color_semaforo !== 'verde')).map((inc) => {
                      const isCritical = inc.impacto_puntos <= -15 || inc.categorias_incidencia?.color_semaforo === 'rojo';
                      return (
                        <article key={inc.id} style={{ background: '#ffffff', border: isCritical ? '1px solid #fecaca' : '1px solid #fde68a', borderRadius: '10px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(146, 64, 14, 0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: isCritical ? '#fee2e2' : '#fef3c7', color: isCritical ? '#991b1b' : '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                              {inc.categorias_incidencia?.nombre || 'Observación Conductual'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: isCritical ? '#b91c1c' : '#b45309' }}>
                              {inc.impacto_puntos} pts
                            </span>
                          </div>
                          {inc.descripcion && <p style={{ margin: '4px 0', fontSize: '13px', color: '#334155' }}>{inc.descripcion}</p>}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                            <span>{formatDate(inc.created_at)}</span>
                            {inc.lugar && <span>{inc.lugar}</span>}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </section>
      )}

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
