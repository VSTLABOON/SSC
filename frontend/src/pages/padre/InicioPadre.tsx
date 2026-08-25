import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getPerfilAlumno } from '../../services/alumnos';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import { exportFichaConductualAlumnoPDF } from '../../services/pdfExportService';
import { SolicitarCitaModal, type CitaRecord } from '../../components/padre/SolicitarCitaModal';
import { getCitasOrientacion } from '../../services/citas';
import InlineAlert from '../../components/InlineAlert';
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
    icon: 'sentiment_very_satisfied',
    panelClass: 'semaphore-panel-green',
    circleClass: 'semaphore-circle-green',
    labelClass: 'semaphore-label-green',
    sublabelClass: 'semaphore-sublabel-green',
    label: 'Semáforo Verde • Excelente Desempeño',
    desc: 'El alumno muestra una conducta ejemplar y constante en el aula.',
  },
  naranja: {
    icon: 'sentiment_neutral',
    panelClass: 'semaphore-panel-orange',
    circleClass: 'semaphore-circle-orange',
    labelClass: 'semaphore-label-orange',
    sublabelClass: 'semaphore-sublabel-orange',
    label: 'Semáforo Naranja • Precaución / Atención',
    desc: 'Se registran incidencias que requieren diálogo y seguimiento preventivo.',
  },
  rojo: {
    icon: 'sentiment_very_dissatisfied',
    panelClass: 'semaphore-panel-red',
    circleClass: 'semaphore-circle-red',
    labelClass: 'semaphore-label-red',
    sublabelClass: 'semaphore-sublabel-red',
    label: 'Semáforo Rojo • Acción Urgente Requerida',
    desc: 'Se requiere la intervención inmediata del tutor y orientación educativa.',
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

export default function InicioPadre() {
  const { session, nombre, plantelId } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [alumno, setAlumno] = useState<AlumnoProfile | null>(null);
  const [incidencias, setIncidencias] = useState<IncidentFromDB[]>([]);
  const [asistenciaPorcentaje, setAsistenciaPorcentaje] = useState<number>(100);
  const [loadingData, setLoadingData] = useState(true);
  const [hijos, setHijos] = useState<Array<{ alumno_id: string; nombre: string; grupo: string }>>([]);
  const [selectedHijoId, setSelectedHijoId] = useState<string>(() => localStorage.getItem('ssc_selected_child_id') || '');
  const [avisos, setAvisos] = useState<Array<{ id: string; titulo: string; contenido: string; fecha_publicacion: string }>>([]);
  const [modalCitaOpen, setModalCitaOpen] = useState(false);
  const [citas, setCitas] = useState<CitaRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'resumen' | 'bitacora' | 'citas' | 'avisos'>('resumen');
  const [incFilter, setIncFilter] = useState<'all' | 'verde' | 'naranja' | 'rojo'>('all');
  const [nativeAlert, setNativeAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const loadCitas = useCallback(async () => {
    try {
      const list = await getCitasOrientacion(plantelId || undefined, selectedHijoId || alumno?.id || undefined, session?.user?.id);
      setCitas(list);
    } catch (e) {
      console.warn('Error al cargar citas de orientación:', e);
    }
  }, [plantelId, selectedHijoId, alumno?.id, session?.user?.id]);

  useEffect(() => {
    loadCitas();

    const channel = supabase
      .channel('realtime-ssc-citas-padre')
      .on('broadcast', { event: 'nueva_cita' }, () => {
        loadCitas();
      })
      .on('broadcast', { event: 'cita_confirmada' }, (payload: any) => {
        loadCitas();
        if (payload?.payload?.updatedRecord?.padreId === session?.user?.id) {
          setNativeAlert({
            type: 'success',
            message: `¡Tu cita para ${payload.payload.updatedRecord.alumnoNombre} ha sido confirmada por Orientación Educativa!`,
          });
        }
      })
      .subscribe();

    const handleLocalCita = () => {
      loadCitas();
    };
    window.addEventListener('ssc_cita_creada', handleLocalCita);
    window.addEventListener('ssc_cita_actualizada', handleLocalCita);
    window.addEventListener('ssc_data_changed', handleLocalCita);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ssc_cita_creada', handleLocalCita);
      window.removeEventListener('ssc_cita_actualizada', handleLocalCita);
      window.removeEventListener('ssc_data_changed', handleLocalCita);
    };
  }, [loadCitas, session?.user?.id]);

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

  const loadDataForChild = useCallback(async (targetChildId: string) => {
    try {
      setLoadingData(true);
      const perfil = await getPerfilAlumno(targetChildId);
      if (perfil) {
        setAlumno(perfil as AlumnoProfile);
        const [incList, avisosRes] = await Promise.all([
          getIncidenciasDelAlumno(perfil.id),
          supabase
            .from('avisos')
            .select('id, titulo, contenido, fecha_publicacion')
            .in('destinatarios', ['todos', 'padres'])
            .order('fecha_publicacion', { ascending: false })
            .limit(10),
        ]);

        setIncidencias((incList || []) as unknown as IncidentFromDB[]);
        if (!avisosRes.error && avisosRes.data) {
          setAvisos(avisosRes.data);
        }

        const faltas = (incList || []).filter((i: any) =>
          i.categorias_incidencia?.nombre?.toLowerCase().includes('falta') ||
          i.categorias_incidencia?.nombre?.toLowerCase().includes('inasistencia')
        ).length;
        const totalClases = 50;
        const pct = Math.max(0, Math.min(100, Math.round(((totalClases - faltas) / totalClases) * 100)));
        setAsistenciaPorcentaje(pct);
      }
    } catch (err) {
      console.error('Error al cargar datos del tutelado:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    async function initParent() {
      if (!session?.user?.id) return;
      try {
        const { data: rels } = await supabase
          .from('padres_alumnos')
          .select('alumno_id, parentesco, alumnos(id, matricula, correo_institucional, grupos(nombre), usuarios!alumnos_usuario_id_fkey(nombre, apellido))')
          .eq('padre_id', session.user.id);

        if (rels && rels.length > 0) {
          const list = rels.map((r: any) => {
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
          setHijos(list);

          let activeId = selectedHijoId;
          if (!activeId || !list.some(h => h.alumno_id === activeId)) {
            activeId = list[0].alumno_id;
            setSelectedHijoId(activeId);
            localStorage.setItem('ssc_selected_child_id', activeId);
          }
          await loadDataForChild(activeId);
        } else {
          setLoadingData(false);
        }
      } catch (err) {
        console.error('Error al inicializar portal padre:', err);
        setLoadingData(false);
      }
    }

    initParent();
  }, [session?.user?.id, loadDataForChild, selectedHijoId]);

  useEffect(() => {
    if (selectedHijoId) {
      loadDataForChild(selectedHijoId);

      const channel = supabase
        .channel(`realtime-padre-child-${selectedHijoId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidencias' }, () => loadDataForChild(selectedHijoId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alumnos' }, () => loadDataForChild(selectedHijoId))
        .subscribe();

      const handleDataChanged = () => loadDataForChild(selectedHijoId);
      window.addEventListener('ssc_data_changed', handleDataChanged);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('ssc_data_changed', handleDataChanged);
      };
    }
  }, [selectedHijoId, loadDataForChild]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
      const nombreAlumno = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante Tutelado';
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
        generadoPor: `Portal Familiar (${nombre || 'Tutor'})`,
      });
    } catch (err) {
      console.error('Error al exportar Expediente Familiar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const puntosTotales = alumno?.puntos_totales ?? 100;
  const semaforoKey = puntosTotales < 70 ? 'rojo' : puntosTotales < 90 ? 'naranja' : 'verde';
  const semTheme = SEMAPHORE_THEME[semaforoKey] || SEMAPHORE_THEME.verde;
  const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
  const grupoObj = alumno?.grupos as { nombre?: string } | undefined;
  const nombreTutelado = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante Tutelado';
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
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Cargando expediente familiar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ssc-page-canvas animate-fade-in" ref={pageRef}>
      {/* Welcome Hero Padre */}
      <section className={`ssc-hero ssc-hero--padre${heroVisible ? ' ssc-hero--visible' : ''}`}>
        <div className="ssc-hero-body">
          <div className="ssc-hero-content">
            <div className="ssc-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>family_restroom</span>
              Acompañamiento Familiar • CONALEP
            </div>
            <h2 className="ssc-hero-title">
              Portal del Padre de Familia & Tutor
            </h2>
            <p className="ssc-hero-subtitle">
              Bienvenido(a), {nombre || 'Tutor'}. Monitoreo de salud conductual, asistencia y citas de orientación para {nombreTutelado}.
            </p>
          </div>
          <div className="ssc-hero-actions">
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => setModalCitaOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
              <span>Solicitar Cita</span>
            </button>
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--secondary"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              <span>{isExporting ? 'Generando...' : 'Descargar Expediente'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Alerta Nativa de Confirmación de Citas */}
      {nativeAlert && (
        <div style={{ marginBottom: '12px' }}>
          <InlineAlert
            type={nativeAlert.type}
            message={nativeAlert.message}
            onClose={() => setNativeAlert(null)}
          />
        </div>
      )}

      {/* Selector de Hijo si hay más de 1 */}
      {hijos.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-sub, #64748b)' }}>Estudiante:</span>
          {hijos.map(h => (
            <button
              key={h.alumno_id}
              type="button"
              onClick={() => {
                setSelectedHijoId(h.alumno_id);
                localStorage.setItem('ssc_selected_child_id', h.alumno_id);
              }}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: '9999px',
                border: selectedHijoId === h.alumno_id ? '2px solid #7c3aed' : '1px solid var(--color-border-subtle, #cbd5e1)',
                background: selectedHijoId === h.alumno_id ? '#7c3aed' : 'var(--color-bg-card, #ffffff)',
                color: selectedHijoId === h.alumno_id ? '#ffffff' : 'var(--color-text-main, #0f172a)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {h.nombre} ({h.grupo})
            </button>
          ))}
        </div>
      )}

      {/* Resumen Rápido / KPIs Padre */}
      <div className="ssc-kpi-grid">
        <div
          className={`ssc-kpi-card ${activeTab === 'resumen' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('resumen')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Semáforo del Tutelado</div>
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
            <div className="ssc-kpi-label">Asistencia Acumulada</div>
            <div className="ssc-kpi-value">{asistenciaPorcentaje}%</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#7c3aed' }}>event_available</span>
              <span>Semestre en curso</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            <span className="material-symbols-outlined">how_to_reg</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'bitacora' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bitacora')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Historial Conductual</div>
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
          className={`ssc-kpi-card ${activeTab === 'citas' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Citas de Orientación</div>
            <div className="ssc-kpi-value">{citas.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0284c7' }}>calendar_month</span>
              <span>{citas.filter(c => c.estado === 'pendiente').length} por confirmar</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <nav className="ssc-tabs-nav" aria-label="Secciones del Padre">
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
          className={`ssc-tab-btn ${activeTab === 'citas' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('citas')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
          <span>Citas de Orientación</span>
          <span className="ssc-tab-badge">{citas.length}</span>
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
                  <span className={semTheme.sublabelClass}>Estado del Tutelado</span>
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

            {/* Hero Card del Tutelado */}
            <div className="hero-card">
              <div className="hero-card__badge">
                <Icon name="school" className="hero-card__badge-icon" />
                <span>Ficha del Tutelado • CONALEP Puebla I</span>
              </div>
              <h3 className="hero-card__title">{nombreTutelado}</h3>
              <p className="hero-card__subtitle">
                Matrícula: <strong>{alumno?.matricula || '---'}</strong> • Grupo: <strong>{grupoNombre}</strong>
              </p>
              <div className="hero-stats">
                <div className="hero-stat-item">
                  <span className="hero-stat-value">{incidencias.length}</span>
                  <span className="hero-stat-label">Reportes Conductuales</span>
                </div>
                <div className="hero-stat-item">
                  <span className="hero-stat-value">{citas.length}</span>
                  <span className="hero-stat-label">Citas Agendadas</span>
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
                <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>history_edu</span>
                Expediente de Conducta de {nombreTutelado} ({incidencias.length})
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Historial de reconocimientos, llamados de atención y reportes disciplinarios registrados por el personal.
              </p>
            </div>

            {/* Filtros rápidos */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIncFilter('all')}
                style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', border: incFilter === 'all' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1', background: incFilter === 'all' ? '#7c3aed' : 'transparent', color: incFilter === 'all' ? '#ffffff' : '#64748b', cursor: 'pointer' }}
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
              <h4 className="ssc-empty-title">Sin reportes registrados</h4>
              <p className="ssc-empty-desc">Tu tutelado mantiene un historial libre de incidencias en esta categoría.</p>
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

      {/* Pestaña 3: Citas de Orientación */}
      {activeTab === 'citas' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>calendar_month</span>
                Citas de Orientación Educativa ({citas.length})
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Sesiones agendadas con el equipo de orientación y psicología para dar seguimiento a {nombreTutelado}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalCitaOpen(true)}
              className="ssc-btn-action ssc-btn-action--primary"
              style={{ background: '#7c3aed', color: '#ffffff', padding: '8px 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>Solicitar Nueva Cita</span>
            </button>
          </div>

          {citas.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">calendar_month</span>
              <h4 className="ssc-empty-title">No hay citas agendadas</h4>
              <p className="ssc-empty-desc">Puedes solicitar una sesión presencial o virtual con Orientación Educativa.</p>
              <button
                type="button"
                className="ssc-btn-action ssc-btn-action--primary"
                onClick={() => setModalCitaOpen(true)}
                style={{ background: '#7c3aed', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
                <span>Agendar Mi Primera Cita</span>
              </button>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {citas.map(c => (
                <div key={c.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: '#f3e8ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '4px' }}>
                          {c.motivo}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #64748b)' }}>
                          Fecha Propuesta: {c.fechaPropuesta} a las {c.horaPropuesta} hrs
                        </span>
                      </div>
                      <div className="ssc-note-box" style={{ borderLeftColor: '#7c3aed', margin: '4px 0 8px' }}>
                        {c.detalles}
                      </div>
                    </div>

                    <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '9999px', background: c.estado === 'confirmada' ? '#dcfce7' : c.estado === 'reprogramada' ? '#fee2e2' : '#fef3c7', color: c.estado === 'confirmada' ? '#166534' : c.estado === 'reprogramada' ? '#991b1b' : '#92400e' }}>
                      {c.estado === 'confirmada' ? 'Confirmada' : c.estado === 'reprogramada' ? 'Reprogramada' : 'En Espera de Confirmación'}
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
              <span className="material-symbols-outlined" style={{ color: '#7c3aed' }}>campaign</span>
              Comunicados Oficiales para Padres de Familia ({avisos.length})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Avisos, circulares y convocatorias a juntas generales o entregas de boletas.
            </p>
          </div>

          {avisos.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">campaign</span>
              <h4 className="ssc-empty-title">No hay comunicados oficiales en este momento</h4>
              <p className="ssc-empty-desc">Los avisos dirigidos a tutores aparecerán en esta sección.</p>
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

      {/* Modal Solicitar Cita */}
      <SolicitarCitaModal
        isOpen={modalCitaOpen}
        onClose={() => setModalCitaOpen(false)}
        alumnoId={selectedHijoId || alumno?.id}
        alumnoNombre={nombreTutelado}
        onCitaSolicitada={(newCita) => {
          setCitas(prev => [newCita, ...prev.filter(c => c.id !== newCita.id)]);
          setNativeAlert({
            type: 'success',
            message: `Solicitud de cita para ${newCita.alumnoNombre} registrada con éxito. Se notificó al orientador del plantel.`,
          });
        }}
      />
    </div>
  );
}
