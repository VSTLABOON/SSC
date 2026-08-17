import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getPerfilAlumno } from '../../services/alumnos';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import { exportElementToPDF } from '../../services/pdfExportService';
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
    desc: 'Su hijo(a) mantiene un buen desempeño conductual y asistencia regular.',
  },
  naranja: {
    icon: 'warning',
    panelClass: 'semaphore-panel semaphore-panel--naranja',
    circleClass: 'semaphore-circle semaphore-circle--naranja',
    labelClass: 'semaphore-label semaphore-label--naranja',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--naranja',
    label: 'Naranja',
    desc: 'Atención preventiva: Su hijo(a) presenta incidencias acumuladas o faltas en el periodo.',
  },
  rojo: {
    icon: 'error',
    panelClass: 'semaphore-panel semaphore-panel--rojo',
    circleClass: 'semaphore-circle semaphore-circle--rojo',
    labelClass: 'semaphore-label semaphore-label--rojo',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--rojo',
    label: 'Rojo',
    desc: 'Atención prioritaria: Se requiere comunicación inmediata con Orientación Educativa por faltas o reportes graves.',
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
          .select('alumno_id, alumnos(id, matricula, grupos(nombre), usuarios(nombre, apellido))')
          .eq('padre_id', session.user.id);

        if (rels && rels.length > 0) {
          const list = rels.map((r: any) => {
            const al = Array.isArray(r.alumnos) ? r.alumnos[0] : r.alumnos;
            const us = Array.isArray(al?.usuarios) ? al?.usuarios[0] : al?.usuarios;
            const gr = Array.isArray(al?.grupos) ? al?.grupos[0] : al?.grupos;
            return {
              alumno_id: r.alumno_id,
              nombre: `${us?.nombre || ''} ${us?.apellido || ''}`.trim() || 'Estudiante',
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
    if (!pageRef.current) return;
    setIsExporting(true);
    try {
      const userObj = alumno?.usuarios as { nombre?: string; apellido?: string } | undefined;
      const nombreAlumno = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}` : 'Alumno';
      await exportElementToPDF(pageRef.current, {
        title: `Ficha Tutelar - ${nombreAlumno}`,
        filename: `Ficha_Tutor_${alumno?.matricula || 'Alumno'}.pdf`,
        plantelNombre: 'CONALEP Plantel Puebla I',
        periodoNombre: 'Semestre A-2026',
        generadoPor: `Tutor Legal: ${nombre || 'Padre de Familia'}`,
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
  const nombreHijo = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante Tutelado';
  const grupoNombre = grupoObj?.nombre || 'Grupo Asignado';

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
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
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
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: selectedHijoId === h.alumno_id ? '2px solid #204785' : '1px solid #cbd5e1',
                  background: selectedHijoId === h.alumno_id ? '#204785' : '#ffffff',
                  color: selectedHijoId === h.alumno_id ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
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
          <Icon name="calendar_add_on" style={{ fontSize: '18px' }} />
          Solicitar Cita con Orientación
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
          {isExporting ? 'Generando Ficha PDF...' : 'Descargar Ficha del Tutor'}
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
        <section className="hero-card">
          <div className="hero-card__badge">
            <Icon name="family_restroom" className="hero-card__badge-icon" />
            <span>Portal de Tutores Legales • CONALEP Puebla I</span>
          </div>
          <h2 className="hero-card__title">Bienvenido(a), {nombre || 'Tutor(a)'}</h2>
          <p className="hero-card__subtitle">
            Monitoreando a: <strong>{nombreHijo}</strong> (Matrícula: {alumno?.matricula || '---'} • Grupo: {grupoNombre})
          </p>
          <div className="hero-stats">
            <div className="hero-stat-item">
              <span className="hero-stat-value">{incidencias.length}</span>
              <span className="hero-stat-label">Reportes en el Periodo</span>
            </div>
            <div className="hero-stat-item">
              <span className="hero-stat-value">{asistenciaPorcentaje}%</span>
              <span className="hero-stat-label">Índice de Asistencia</span>
            </div>
          </div>
        </section>
      </div>

      {/* Avisos para Padres de Familia */}
      {avisos.length > 0 && (
        <section style={{ marginTop: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
            <Icon name="campaign" style={{ color: '#204785' }} />
            Comunicados Oficiales para Padres y Tutores
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

      {/* Bitácora de Observaciones del Estudiante */}
      <section className="incidents-card" style={{ marginTop: '24px' }}>
        <div className="incidents-card__header">
          <div className="incidents-card__title-group">
            <h3 className="incidents-card__title">Bitácora Conductual de {nombreHijo}</h3>
            <p className="incidents-card__subtitle">Reportes registrados por el cuerpo docente y orientación educativa.</p>
          </div>
        </div>

        {incidencias.length === 0 ? (
          <div className="incidents-empty">
            <Icon name="verified" className="incidents-empty__icon" />
            <p className="incidents-empty__text">Su hijo(a) no cuenta con incidencias negativas en este periodo escolar.</p>
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
                      {inc.lugar && (
                        <span className="incident-item__location">
                          <Icon name="location_on" style={{ fontSize: '14px', verticalAlign: 'middle' }} /> {inc.lugar}
                        </span>
                      )}
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

      {/* Sección de Citas Agendadas con Orientación */}
      {citas.length > 0 && (
        <section style={{ marginTop: '24px', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-main, #0f172a)' }}>
            <Icon name="calendar_month" style={{ color: '#0284c7' }} />
            Mis Citas Solicitadas con Orientación Educativa
          </h3>
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
