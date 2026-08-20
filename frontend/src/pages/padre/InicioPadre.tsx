import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getPerfilAlumno } from '../../services/alumnos';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import { exportFichaConductualAlumnoPDF } from '../../services/pdfExportService';
import { SolicitarCitaModal, type CitaRecord } from '../../components/padre/SolicitarCitaModal';
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
    desc: 'Buen desempeño: El estudiante mantiene una trayectoria conductual y académica óptima (90 a 100 pts).',
  },
  naranja: {
    icon: 'warning',
    panelClass: 'semaphore-panel semaphore-panel--naranja',
    circleClass: 'semaphore-circle semaphore-circle--naranja',
    labelClass: 'semaphore-label semaphore-label--naranja',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--naranja',
    label: 'Naranja',
    desc: 'Atención preventiva: Se registran incidencias o retardos acumulados (70 a 89 pts).',
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

export default function InicioPadre() {
  const { session, nombre } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
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

  const loadCitas = useCallback(() => {
    try {
      const storageKey = `ssc_citas_orientacion_${alumno?.id || 'default'}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setCitas(saved);
    } catch (e) {
      console.warn('Error al cargar citas de orientación:', e);
    }
  }, [alumno?.id]);

  useEffect(() => {
    loadCitas();
  }, [loadCitas]);

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
            .limit(3),
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
  }, [session?.user?.id, loadDataForChild]);

  // Recargar al cambiar de hijo seleccionado y escuchar cambios en tiempo real
  useEffect(() => {
    if (selectedHijoId) {
      loadDataForChild(selectedHijoId);

      // 1. Suscripción a cambios de incidencias y datos del estudiante
      const channel = supabase
        .channel(`realtime-padre-child-${selectedHijoId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incidencias' },
          () => {
            loadDataForChild(selectedHijoId);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alumnos' },
          () => {
            loadDataForChild(selectedHijoId);
          }
        )
        .subscribe();

      // 2. Escucha de eventos locales
      const handleDataChanged = () => {
        loadDataForChild(selectedHijoId);
      };
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
        generadoPor: `Tutor Legal: ${nombre || 'Padre de Familia'}`,
      });
    } catch (err) {
      console.error('Error al exportar Ficha Tutelar PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'todos' | 'resumen' | 'reportes' | 'citas' | 'avisos'>('todos');
  const [incFilter, setIncFilter] = useState<'all' | 'verde' | 'naranja' | 'rojo'>('all');

  const puntosTotales = alumno?.puntos_totales ?? 100;
  // Semáforo dinámico calculado con base en los puntos reales
  const semaforoKey = puntosTotales < 70 ? 'rojo' : puntosTotales < 90 ? 'naranja' : 'verde';
  const semTheme = SEMAPHORE_THEME[semaforoKey] || SEMAPHORE_THEME.verde;
  const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
  const grupoObj = alumno?.grupos as { nombre?: string } | undefined;
  const nombreHijo = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante Tutelado';
  const grupoNombre = grupoObj?.nombre || 'Grupo Asignado';

  const countVerdes = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).length;
  const countNaranjas = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'naranja' && i.impacto_puntos <= 0)).length;
  const countRojas = incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'rojo' || i.impacto_puntos <= -15)).length;

  if (loadingData) {
    return (
      <div className="home-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <p>Cargando información del estudiante tutelado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container" ref={pageRef}>
      {/* Selector Multi-Hijo si aplica */}
      {hijos.length > 1 && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="family_restroom" style={{ color: '#204785' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>Estudiante en Consulta:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {hijos.map(h => (
              <button
                key={h.alumno_id}
                type="button"
                onClick={() => {
                  setSelectedHijoId(h.alumno_id);
                  localStorage.setItem('ssc_selected_child_id', h.alumno_id);
                  window.dispatchEvent(new CustomEvent('ssc_child_change', { detail: { childId: h.alumno_id } }));
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  border: selectedHijoId === h.alumno_id ? '2px solid #204785' : '1px solid #cbd5e1',
                  background: selectedHijoId === h.alumno_id ? '#204785' : '#ffffff',
                  color: selectedHijoId === h.alumno_id ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {h.nombre} ({h.grupo})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Botones de Acción Superior */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setModalCitaOpen(true)}
          style={{
            background: '#204785',
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
            boxShadow: '0 2px 8px rgba(32, 71, 133, 0.25)',
          }}
        >
          <Icon name="calendar_add_on" style={{ fontSize: '18px' }} />
          Solicitar Cita con Orientación
        </button>

        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isExporting}
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
            opacity: isExporting ? 0.7 : 1,
            boxShadow: '0 2px 8px rgba(0, 73, 47, 0.25)',
          }}
        >
          <Icon name="download" style={{ fontSize: '18px' }} />
          {isExporting ? 'Generando Ficha PDF...' : 'Descargar Ficha del Tutor'}
        </button>
      </div>

      {/* Barra de División Principal por Píldoras */}
      <nav aria-label="Secciones del portal tutelar" style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '14px', marginBottom: '20px', display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('todos')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'todos' ? '2px solid #204785' : '1px solid #cbd5e1',
            background: activeTab === 'todos' ? '#204785' : '#f8fafc',
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
            border: activeTab === 'resumen' ? '2px solid #204785' : '1px solid #cbd5e1',
            background: activeTab === 'resumen' ? '#204785' : '#f8fafc',
            color: activeTab === 'resumen' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="dashboard" style={{ fontSize: '18px' }} />
          Semáforo & Asistencia
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reportes')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'reportes' ? '2px solid #204785' : '1px solid #cbd5e1',
            background: activeTab === 'reportes' ? '#204785' : '#f8fafc',
            color: activeTab === 'reportes' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="history_edu" style={{ fontSize: '18px' }} />
          Reportes de Conducta ({incidencias.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('citas')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '9999px',
            border: activeTab === 'citas' ? '2px solid #204785' : '1px solid #cbd5e1',
            background: activeTab === 'citas' ? '#204785' : '#f8fafc',
            color: activeTab === 'citas' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="event" style={{ fontSize: '18px' }} />
          Citas ({citas.length})
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
            border: activeTab === 'avisos' ? '2px solid #204785' : '1px solid #cbd5e1',
            background: activeTab === 'avisos' ? '#204785' : '#f8fafc',
            color: activeTab === 'avisos' ? '#ffffff' : '#334155',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon name="campaign" style={{ fontSize: '18px' }} />
          Comunicados ({avisos.length})
        </button>
      </nav>

      {/* Grid Principal */}
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
                <span className={semTheme.sublabelClass}>Estado de su Tutorado</span>
              </div>
            </div>
            <p className="semaphore-desc">{semTheme.desc}</p>

            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', opacity: 0.8, display: 'block' }}>Puntos de Salud Conductual</span>
                <strong style={{ fontSize: '18px' }}>{alumno?.puntos_totales ?? 100} / 100 pts</strong>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', opacity: 0.8, display: 'block' }}>Asistencia Regular</span>
                <strong style={{ fontSize: '18px' }}>{asistenciaPorcentaje}%</strong>
              </div>
            </div>
          </section>

          {/* Hero Card del Tutor */}
          <section className="hero-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '14px', borderRadius: '18px', background: 'var(--color-bg-card, #ffffff)', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div className="hero-card__badge" style={{ margin: 0, padding: '4px 10px', fontSize: '11px', maxWidth: '100%' }}>
                <Icon name="family_restroom" className="hero-card__badge-icon" style={{ fontSize: '14px' }} />
                <span>Portal de Tutores • CONALEP Puebla I</span>
              </div>
            </div>

            <div>
              <h2 className="hero-card__title" style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--color-text-main, #0f172a)' }}>
                Bienvenido(a), {nombre || 'Tutor(a)'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '13px', color: 'var(--color-text-sub, #64748b)', lineHeight: 1.4 }}>
                <span>Monitoreando a:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main, #0f172a)', background: 'var(--color-bg-app, #f1f5f9)', padding: '2px 8px', borderRadius: '6px' }}>
                  {nombreHijo}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-sub, #94a3b8)' }}>• Matrícula: {alumno?.matricula || '---'}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#204785', background: '#eff6ff', padding: '2px 7px', borderRadius: '4px' }}>
                  {grupoNombre}
                </span>
              </div>
            </div>

            <div className="hero-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '2px' }}>
              <div className="hero-stat-item" style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
                <span className="hero-stat-value" style={{ fontSize: '22px', fontWeight: 800, color: '#204785' }}>{incidencias.length}</span>
                <span className="hero-stat-label" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-sub, #64748b)' }}>Reportes en el Periodo</span>
              </div>
              <div className="hero-stat-item" style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--color-bg-app, #f8fafc)', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
                <span className="hero-stat-value" style={{ fontSize: '22px', fontWeight: 800, color: '#00492f' }}>{asistenciaPorcentaje}%</span>
                <span className="hero-stat-label" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-sub, #64748b)' }}>Índice de Asistencia</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Avisos para Padres de Familia */}
      {(activeTab === 'todos' || activeTab === 'avisos') && avisos.length > 0 && (
        <section style={{ marginBottom: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '22px 20px', borderRadius: '18px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#204785' }}>
                <Icon name="campaign" style={{ fontSize: '22px' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)' }}>
                  Comunicados Oficiales
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
                  Avisos y circulares dirigidas a tutores y padres de familia
                </p>
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, background: '#eff6ff', color: '#204785', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: '9999px' }}>
              {avisos.length} {avisos.length === 1 ? 'comunicado' : 'comunicados'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {avisos.map(a => (
              <article key={a.id} style={{ background: 'var(--color-bg-app, #f8fafc)', padding: '16px 18px', borderRadius: '14px', border: '1px solid var(--color-border-subtle, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Fila Superior: Badge + Fecha */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                    <Icon name="notifications_active" style={{ fontSize: '13px' }} />
                    Aviso Institucional
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-sub, #64748b)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="calendar_today" style={{ fontSize: '13px' }} />
                    {formatDate(a.fecha_publicacion)}
                  </span>
                </div>

                {/* Título de ancho completo */}
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, lineHeight: 1.35, color: 'var(--color-text-main, #0f172a)' }}>
                  {a.titulo}
                </h4>

                {/* Contenido con legibilidad y aire visual */}
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'var(--color-text-main, #334155)', whiteSpace: 'pre-line' }}>
                  {a.contenido}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Bitácora de Observaciones del Estudiante con Píldoras de Filtro */}
      {(activeTab === 'todos' || activeTab === 'reportes') && (
        <section className="incidents-card" style={{ marginBottom: '24px' }}>
          <div className="incidents-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div className="incidents-card__title-group">
              <h3 className="incidents-card__title">Bitácora de Actividad del Estudiante</h3>
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
                  border: incFilter === 'all' ? '2px solid #204785' : '1px solid #cbd5e1',
                  background: incFilter === 'all' ? '#204785' : '#f8fafc',
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
                Solo Reportes (-{countNaranjas + countRojas})
              </button>
            </div>
          </div>

          {/* Grid de 2 Columnas Independientes */}
          <div style={{ display: 'grid', gridTemplateColumns: incFilter === 'all' ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '20px', marginTop: '16px' }}>
            
            {/* COLUMNA 1: ACTIVIDAD POSITIVA (+ Puntos) */}
            {(incFilter === 'all' || incFilter === 'verde') && (
              <div className="activity-col activity-col--positive">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid currentColor', opacity: 0.9, paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="workspace_premium" style={{ color: '#166534' }} />
                    Méritos y Reconocimientos
                  </h4>
                  <span style={{ fontSize: '12px', fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '9999px' }}>
                    {countVerdes} registros
                  </span>
                </div>

                {incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: '#166534', opacity: 0.8 }}>
                    <Icon name="stars" style={{ fontSize: '32px', marginBottom: '6px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Aún no hay méritos adicionales registrados para este periodo.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {incidencias.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).map((inc) => (
                      <article key={inc.id} className="activity-card-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                            {inc.categorias_incidencia?.nombre || 'Mérito Escolar'}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
                            +{inc.impacto_puntos} pts
                          </span>
                        </div>
                        {inc.descripcion && <p className="activity-card-desc">{inc.descripcion}</p>}
                        <div className="activity-card-meta">
                          <span>{formatDate(inc.created_at)}</span>
                          {inc.lugar && <span>{inc.lugar}</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COLUMNA 2: ACTIVIDAD PREVENTIVA Y REPORTES (- Puntos) */}
            {(incFilter === 'all' || incFilter === 'naranja' || incFilter === 'rojo') && (
              <div className="activity-col activity-col--negative">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid currentColor', opacity: 0.9, paddingBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="warning" style={{ color: '#b45309' }} />
                    Observaciones y Reportes de Conducta
                  </h4>
                  <span style={{ fontSize: '12px', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '9999px' }}>
                    {countNaranjas + countRojas} registros
                  </span>
                </div>

                {incidencias.filter(i => (i.impacto_puntos <= 0 && i.categorias_incidencia?.color_semaforo !== 'verde')).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', color: '#92400e', opacity: 0.8 }}>
                    <Icon name="verified" style={{ fontSize: '32px', marginBottom: '6px', color: '#15803d' }} />
                    <p style={{ margin: 0, fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Excelente historial conductual. 0 reportes o inasistencias.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {incidencias.filter(i => (i.impacto_puntos <= 0 && i.categorias_incidencia?.color_semaforo !== 'verde')).map((inc) => {
                      const isCritical = inc.impacto_puntos <= -15 || inc.categorias_incidencia?.color_semaforo === 'rojo';
                      return (
                        <article key={inc.id} className="activity-card-item" style={{ borderLeft: isCritical ? '3px solid #ef4444' : '3px solid #f59e0b' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: isCritical ? '#fee2e2' : '#fef3c7', color: isCritical ? '#991b1b' : '#b45309', padding: '2px 8px', borderRadius: '4px' }}>
                              {inc.categorias_incidencia?.nombre || 'Observación de Conducta'}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: isCritical ? '#b91c1c' : '#b45309' }}>
                              {inc.impacto_puntos} pts
                            </span>
                          </div>
                          {inc.descripcion && <p className="activity-card-desc">{inc.descripcion}</p>}
                          <div className="activity-card-meta">
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

      {/* Sección de Citas Agendadas con Orientación */}
      {(activeTab === 'todos' || activeTab === 'citas') && (
        <section style={{ marginBottom: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
              <Icon name="calendar_month" style={{ color: '#204785' }} />
              Mis Citas Solicitadas con Orientación Educativa ({citas.length})
            </h3>
            <button
              type="button"
              onClick={() => setModalCitaOpen(true)}
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
              Solicitar Nueva Cita
            </button>
          </div>

          {citas.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-sub, #64748b)' }}>No tiene citas programadas actualmente con orientación educativa.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {citas.map(c => (
                <div key={c.id} style={{ background: 'var(--color-bg-app, #f8fafc)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-border-subtle, #f1f5f9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px' }}>
                        {c.motivo}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-main, #0f172a)' }}>
                        Fecha: {c.fechaPropuesta} a las {c.horaPropuesta} hrs
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>{c.detalles}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '9999px', background: c.estado === 'confirmada' ? '#dcfce7' : '#fef3c7', color: c.estado === 'confirmada' ? '#166534' : '#92400e' }}>
                    {c.estado === 'confirmada' ? 'Cita Confirmada' : 'Pendiente de Confirmación'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal de Solicitud de Cita */}
      <SolicitarCitaModal
        isOpen={modalCitaOpen}
        onClose={() => setModalCitaOpen(false)}
        alumnoNombre={nombreHijo}
        onCitaSolicitada={() => {
          loadCitas();
        }}
      />
    </div>
  );
}
