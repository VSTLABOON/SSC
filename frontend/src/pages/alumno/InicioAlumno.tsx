import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getPerfilAlumno } from '../../services/alumnos';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import { exportFichaConductualAlumnoPDF } from '../../services/pdfExportService';
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
    desc: 'Se mantiene en verde mientras tengas buen desempeño conductual y académico (90 a 100 pts).',
  },
  naranja: {
    icon: 'warning',
    panelClass: 'semaphore-panel semaphore-panel--naranja',
    circleClass: 'semaphore-circle semaphore-circle--naranja',
    labelClass: 'semaphore-label semaphore-label--naranja',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--naranja',
    label: 'Naranja',
    desc: 'Atención preventiva: Puntos en observación (70 a 89 pts) por retardos o faltas leves.',
  },
  rojo: {
    icon: 'error',
    panelClass: 'semaphore-panel semaphore-panel--rojo',
    circleClass: 'semaphore-circle semaphore-circle--rojo',
    labelClass: 'semaphore-label semaphore-label--rojo',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--rojo',
    label: 'Rojo',
    desc: 'Atención prioritaria: Saldo crítico de salud conductual (menor a 70 pts) o acumulación de reportes disciplinarios.',
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
  const [heroVisible, setHeroVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoProfile | null>(null);
  const [incidencias, setIncidencias] = useState<IncidentFromDB[]>([]);
  const [asistenciaPorcentaje, setAsistenciaPorcentaje] = useState<number>(100);
  const [loadingData, setLoadingData] = useState(true);
  const [modalJustificanteOpen, setModalJustificanteOpen] = useState(false);
  const [justificantes, setJustificantes] = useState<JustificanteRecord[]>([]);
  const [avisos, setAvisos] = useState<Array<{ id: string; titulo: string; contenido: string; fecha_publicacion: string }>>([]);
  const [activeTab, setActiveTab] = useState<'resumen' | 'bitacora' | 'justificantes' | 'avisos'>('resumen');
  const [incFilter, setIncFilter] = useState<'all' | 'verde' | 'naranja' | 'rojo'>('all');

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

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
            .limit(10),
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

    // Sincronización en tiempo real
    const channel = supabase
      .channel('realtime-alumno-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alumnos' }, () => loadData())
      .subscribe();

    const handleDataChanged = () => loadData();
    window.addEventListener('ssc_data_changed', handleDataChanged);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ssc_data_changed', handleDataChanged);
    };
  }, [loadData]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
      const nombreAlumno = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante';
      const grupoObj = alumno?.grupos as { nombre?: string } | undefined;
      const puntos = alumno?.puntos_totales ?? 100;

      await exportFichaConductualAlumnoPDF({
        nombreCompleto: nombreAlumno,
        matricula: alumno?.matricula || '---',
        grupoNombre: grupoObj?.nombre || 'Grupo Asignado',
        puntosTotales: puntos,
        asistenciaPorcentaje,
        incidencias: incidencias.map(i => ({
          created_at: i.created_at,
          descripcion: i.descripcion || '',
          lugar: i.lugar,
          impacto_puntos: i.impacto_puntos,
          categoria_nombre: i.categorias_incidencia?.nombre,
        })),
        generadoPor: 'Portal Alumno',
      });
    } catch (err) {
      console.error('Error al exportar Ficha Conductual PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const puntosTotales = alumno?.puntos_totales ?? 100;
  const semaforoKey = puntosTotales < 70 ? 'rojo' : puntosTotales < 90 ? 'naranja' : 'verde';
  const semTheme = SEMAPHORE_THEME[semaforoKey] || SEMAPHORE_THEME.verde;
  const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
  const grupoObj = alumno?.grupos as { nombre?: string } | undefined;
  const nombreEstudiante = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante';
  const grupoNombre = grupoObj?.nombre || 'Grupo Asignado';

  const countVerdes = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).length;
  const countNaranjas = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'naranja' && i.impacto_puntos <= 0)).length;
  const countRojas = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'rojo' || i.impacto_puntos <= -15)).length;

  const filteredIncidencias = incidencias.filter(i => {
    if (incFilter === 'all') return true;
    if (incFilter === 'verde') return i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0;
    if (incFilter === 'naranja') return i.categorias_incidencia?.color_semaforo === 'naranja';
    if (incFilter === 'rojo') return i.categorias_incidencia?.color_semaforo === 'rojo' || i.impacto_puntos <= -15;
    return true;
  });

  if (loadingData) {
    return (
      <div className="ssc-page-canvas" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Cargando información del estudiante...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ssc-page-canvas animate-fade-in" ref={pageRef}>
      {/* Welcome Hero Alumno */}
      <section className={`ssc-hero ssc-hero--alumno${heroVisible ? ' ssc-hero--visible' : ''}`}>
        <div className="ssc-hero-body">
          <div className="ssc-hero-content">
            <div className="ssc-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
              Estudiante CONALEP • {grupoNombre}
            </div>
            <h2 className="ssc-hero-title">
              ¡Hola, {nombreEstudiante}!
            </h2>
            <p className="ssc-hero-subtitle">
              Matrícula: {alumno?.matricula || '---'} • Monitoreo de salud conductual, asistencia y trámites.
            </p>
          </div>
          <div className="ssc-hero-actions">
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => setModalJustificanteOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_calendar</span>
              <span>Solicitar Justificante</span>
            </button>
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--secondary"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              <span>{isExporting ? 'Generando...' : 'Descargar Ficha'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Resumen Rápido / KPIs Estudiante */}
      <div className="ssc-kpi-grid">
        <div
          className={`ssc-kpi-card ${activeTab === 'resumen' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Semáforo Conductual</div>
            <div className="ssc-kpi-value" style={{ color: semaforoKey === 'verde' ? '#15803d' : semaforoKey === 'naranja' ? '#b45309' : '#b91c1c' }}>
              {puntosTotales} <span style={{ fontSize: '13px', fontWeight: 600 }}>/ 100 pts</span>
            </div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: semaforoKey === 'verde' ? '#16a34a' : semaforoKey === 'naranja' ? '#d97706' : '#dc2626' }}>
                {semTheme.icon}
              </span>
              <span>Nivel {semTheme.label}</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: semaforoKey === 'verde' ? '#dcfce7' : semaforoKey === 'naranja' ? '#fef3c7' : '#fee2e2', color: semaforoKey === 'verde' ? '#15803d' : semaforoKey === 'naranja' ? '#b45309' : '#b91c1c' }}>
            <span className="material-symbols-outlined">{semTheme.icon}</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'resumen' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Asistencia Estimada</div>
            <div className="ssc-kpi-value">{asistenciaPorcentaje}%</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0d9488' }}>event_available</span>
              <span>Semestre en curso</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#ccfbf1', color: '#0f766e' }}>
            <span className="material-symbols-outlined">how_to_reg</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'bitacora' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bitacora')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Incidencias Registradas</div>
            <div className="ssc-kpi-value">{incidencias.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748b' }}>history_edu</span>
              <span>{countRojas} faltas graves</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#f1f5f9', color: '#475569' }}>
            <span className="material-symbols-outlined">history_edu</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'justificantes' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Mis Justificantes</div>
            <div className="ssc-kpi-value">{justificantes.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0284c7' }}>assignment</span>
              <span>{justificantes.filter(j => j.estado === 'pendiente').length} en revisión</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <span className="material-symbols-outlined">assignment</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <nav className="ssc-tabs-nav" aria-label="Secciones del Alumno">
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'resumen' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dashboard</span>
          <span>Semáforo & Perfil</span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'bitacora' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bitacora')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history_edu</span>
          <span>Bitácora Conductual</span>
          <span className="ssc-tab-badge">{incidencias.length}</span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'justificantes' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('justificantes')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment</span>
          <span>Justificantes</span>
          <span className="ssc-tab-badge">{justificantes.length}</span>
        </button>

        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'avisos' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('avisos')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
          <span>Avisos del Plantel</span>
          <span className="ssc-tab-badge">{avisos.length}</span>
        </button>
      </nav>

      {/* Pestaña 1: Resumen & Semáforo */}
      {activeTab === 'resumen' && (
        <section className="dedicated-tab-content">
          <div className="home-grid" style={{ marginBottom: '16px' }}>
            {/* Panel de Semáforo Conductual */}
            <div className={semTheme.panelClass}>
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
            </div>

            {/* Hero Card del Estudiante */}
            <div className="hero-card">
              <div className="hero-card__badge">
                <Icon name="school" className="hero-card__badge-icon" />
                <span>Perfil del Estudiante • CONALEP Puebla I</span>
              </div>
              <h3 className="hero-card__title">¡Hola, {nombreEstudiante}!</h3>
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
            </div>
          </div>
        </section>
      )}

      {/* Pestaña 2: Bitácora Conductual */}
      {activeTab === 'bitacora' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0f766e' }}>history_edu</span>
                Bitácora de Seguimiento Conductual ({incidencias.length})
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Historial de reconocimientos, llamados de atención y reportes disciplinarios.
              </p>
            </div>

            {/* Filtros rápidos */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIncFilter('all')}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: incFilter === 'all' ? '1.5px solid #0f766e' : '1px solid #cbd5e1', background: incFilter === 'all' ? '#0f766e' : 'transparent', color: incFilter === 'all' ? '#ffffff' : '#64748b', cursor: 'pointer' }}
              >
                Todas ({incidencias.length})
              </button>
              <button
                type="button"
                onClick={() => setIncFilter('rojo')}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: incFilter === 'rojo' ? '1.5px solid #dc2626' : '1px solid #cbd5e1', background: incFilter === 'rojo' ? '#fee2e2' : 'transparent', color: '#b91c1c', cursor: 'pointer' }}
              >
                Graves ({countRojas})
              </button>
              <button
                type="button"
                onClick={() => setIncFilter('naranja')}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: incFilter === 'naranja' ? '1.5px solid #d97706' : '1px solid #cbd5e1', background: incFilter === 'naranja' ? '#fef3c7' : 'transparent', color: '#b45309', cursor: 'pointer' }}
              >
                Moderadas ({countNaranjas})
              </button>
              <button
                type="button"
                onClick={() => setIncFilter('verde')}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: incFilter === 'verde' ? '1.5px solid #16a34a' : '1px solid #cbd5e1', background: incFilter === 'verde' ? '#dcfce7' : 'transparent', color: '#15803d', cursor: 'pointer' }}
              >
                Positivas ({countVerdes})
              </button>
            </div>
          </div>

          {filteredIncidencias.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">verified_user</span>
              <h4 className="ssc-empty-title">Sin registros en este filtro</h4>
              <p className="ssc-empty-desc">Mantienes un expediente limpio en esta categoría de seguimiento.</p>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {filteredIncidencias.map(i => {
                const colorTag = i.categorias_incidencia?.color_semaforo || (i.impacto_puntos > 0 ? 'verde' : i.impacto_puntos < -10 ? 'rojo' : 'naranja');
                return (
                  <div key={i.id} className="ssc-item-card">
                    <div className="ssc-card-top">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: colorTag === 'verde' ? '#dcfce7' : colorTag === 'naranja' ? '#fef3c7' : '#fee2e2', color: colorTag === 'verde' ? '#15803d' : colorTag === 'naranja' ? '#b45309' : '#b91c1c' }}>
                            {i.categorias_incidencia?.nombre || 'Incidencia Registrada'}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #94a3b8)' }}>
                            {formatDate(i.created_at)} • {i.lugar || 'Plantel'}
                          </span>
                        </div>
                        <h4 className="ssc-card-title">{i.descripcion}</h4>
                      </div>

                      <span style={{ fontSize: '13px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', background: i.impacto_puntos > 0 ? '#dcfce7' : '#fee2e2', color: i.impacto_puntos > 0 ? '#15803d' : '#b91c1c' }}>
                        {i.impacto_puntos > 0 ? `+${i.impacto_puntos}` : i.impacto_puntos} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 3: Justificantes */}
      {activeTab === 'justificantes' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#0f766e' }}>assignment</span>
                Mis Solicitudes de Justificante ({justificantes.length})
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Estado de trámites de inasistencia presentados ante Orientación Educativa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalJustificanteOpen(true)}
              className="ssc-btn-action ssc-btn-action--primary"
              style={{ background: '#0f766e', color: '#ffffff', padding: '8px 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>Nueva Solicitud</span>
            </button>
          </div>

          {justificantes.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">edit_calendar</span>
              <h4 className="ssc-empty-title">No tienes justificantes registrados</h4>
              <p className="ssc-empty-desc">Si tuviste una falta por salud, trámite o causa mayor, puedes justificarla aquí.</p>
              <button
                type="button"
                className="ssc-btn-action ssc-btn-action--primary"
                onClick={() => setModalJustificanteOpen(true)}
                style={{ background: '#0f766e', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_calendar</span>
                <span>Solicitar Mi Primer Justificante</span>
              </button>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {justificantes.map(j => (
                <div key={j.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px' }}>
                          Motivo: {j.motivo}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #64748b)' }}>
                          Periodo: {j.fechaInicio} al {j.fechaFin}
                        </span>
                      </div>
                      <div className="ssc-note-box" style={{ borderLeftColor: '#0f766e', margin: '4px 0 8px' }}>
                        {j.descripcion}
                      </div>
                    </div>

                    <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '9999px', background: j.estado === 'aprobado' ? '#dcfce7' : j.estado === 'rechazado' ? '#fee2e2' : '#fef3c7', color: j.estado === 'aprobado' ? '#166534' : j.estado === 'rechazado' ? '#991b1b' : '#92400e' }}>
                      {j.estado === 'aprobado' ? 'Aprobado' : j.estado === 'rechazado' ? 'Rechazado' : 'En Revisión por Orientación'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 4: Avisos */}
      {activeTab === 'avisos' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#0f766e' }}>campaign</span>
              Comunicados Oficiales del Plantel ({avisos.length})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Avisos, circulares y convocatorias dirigidas a la comunidad estudiantil.
            </p>
          </div>

          {avisos.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">campaign</span>
              <h4 className="ssc-empty-title">No hay comunicados oficiales en este momento</h4>
              <p className="ssc-empty-desc">Las publicaciones de la dirección y áreas escolares aparecerán aquí.</p>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {avisos.map(aviso => (
                <div key={aviso.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #94a3b8)', marginBottom: '4px' }}>
                        {new Date(aviso.fecha_publicacion).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <h4 className="ssc-card-title" style={{ marginBottom: '6px' }}>{aviso.titulo}</h4>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-main, #334155)', whiteSpace: 'pre-line' }}>
                        {aviso.contenido}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal Solicitar Justificante */}
      <SolicitarJustificanteModal
        isOpen={modalJustificanteOpen}
        onClose={() => setModalJustificanteOpen(false)}
        alumnoDbId={alumno?.id || ''}
        onJustificanteEnviado={(newRecord) => {
          setJustificantes(prev => [newRecord, ...prev]);
        }}
      />
    </div>
  );
}
