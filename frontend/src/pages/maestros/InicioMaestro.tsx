import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { GenerarReporteRapidoModal } from '../../components/orientador/GenerarReporteRapidoModal';
import './InicioMaestro.css';

type TabType = 'operacion' | 'bi' | 'avisos';

interface AvisoItem {
  id: string;
  titulo: string;
  contenido: string;
  descripcion?: string;
  fecha_publicacion: string;
}

export default function InicioMaestro() {
  const navigate = useNavigate();
  const { session, nombre, plantelId } = useAuth();
  const [clases, setClases] = useState<ClassDocente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('operacion');
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [modalReporteOpen, setModalReporteOpen] = useState(false);
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [loadingAvisos, setLoadingAvisos] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadGroups() {
      try {
        const data = await getGruposDeDocente(session!.user!.id);
        setClases(data);
      } catch (err) {
        console.error('Error al cargar clases del docente:', err);
      } finally {
        setLoading(false);
      }
    }

    async function loadAvisos() {
      try {
        setLoadingAvisos(true);
        const { data, error } = await supabase
          .from('avisos')
          .select('id, titulo, contenido, descripcion, fecha_publicacion')
          .in('destinatarios', ['todos', 'docentes'])
          .order('fecha_publicacion', { ascending: false });

        if (!error && data) {
          setAvisos(data as AvisoItem[]);
        }
      } catch (err) {
        console.error('Error al cargar avisos:', err);
      } finally {
        setLoadingAvisos(false);
      }
    }

    loadGroups();
    loadAvisos();
  }, [session]);

  function handlePasarLista(clase?: ClassDocente): void {
    if (clase) {
      navigate('/maestro/asistencia', {
        state: {
          grupoId: clase.grupoId,
          grupoNombre: clase.grupoNombre,
          materiaId: clase.materiaId,
          materiaNombre: clase.materiaNombre,
        },
      });
    } else {
      navigate('/maestro/clases');
    }
  }

  return (
    <div className="ssc-page-canvas animate-fade-in">
      {/* Welcome Hero Docente */}
      <section className={`ssc-hero ssc-hero--docente${heroVisible ? ' ssc-hero--visible' : ''}`}>
        <div className="ssc-hero-body">
          <div className="ssc-hero-content">
            <div className="ssc-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>school</span>
              Docencia & Gestión de Aulas
            </div>
            <h2 className="ssc-hero-title">
              Panel Docente & Control Escolar
            </h2>
            <p className="ssc-hero-subtitle">
              Hola, {nombre || 'Profesor(a)'}. Pase de lista ágil, seguimiento conductual de grupos y emisión de reportes.
            </p>
          </div>
          <div className="ssc-hero-actions">
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => {
                if (clases.length > 0) {
                  handlePasarLista(clases[0]);
                } else {
                  navigate('/maestro/clases');
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>how_to_reg</span>
              <span>Pasar Lista</span>
            </button>
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--secondary"
              onClick={() => setModalReporteOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_add</span>
              <span>Generar Reporte</span>
            </button>
          </div>
        </div>
      </section>

      {/* Resumen Rápido / KPIs Docente */}
      <div className="ssc-kpi-grid">
        <div
          className={`ssc-kpi-card ${activeTab === 'operacion' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('operacion')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Mis Clases Asignadas</div>
            <div className="ssc-kpi-value">{clases.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#006341' }}>schedule</span>
              <span>Materias y grupos</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#dcfce7', color: '#00492f' }}>
            <span className="material-symbols-outlined">menu_book</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'bi' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Radar de Grupos BI</div>
            <div className="ssc-kpi-value" style={{ fontSize: '18px', paddingTop: '3px' }}>En línea</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>insights</span>
              <span>Salud conductual</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <span className="material-symbols-outlined">radar</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'avisos' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('avisos')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Avisos de Dirección</div>
            <div className="ssc-kpi-value">{avisos.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#d97706' }}>campaign</span>
              <span>Circulares oficiales</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <span className="material-symbols-outlined">campaign</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Vista Dedicada */}
      <nav className="ssc-tabs-nav" aria-label="Secciones Docente">
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'operacion' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('operacion')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
          <span>Mis Clases & Asistencia</span>
          <span className="ssc-tab-badge">{clases.length}</span>
        </button>
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'bi' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
          <span>Radar Conductual BI</span>
        </button>
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'avisos' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('avisos')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
          <span>Avisos de Dirección</span>
          <span className="ssc-tab-badge">{avisos.length}</span>
        </button>
      </nav>

      {/* Pestaña 1: Mis Clases & Asistencia */}
      {activeTab === 'operacion' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#00492f' }}>menu_book</span>
                Grupos y Materias Asignadas
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Selecciona una clase para registrar o editar el pase de lista y asistencia diaria.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/maestro/clases')}
              className="ssc-btn-action ssc-btn-action--primary"
              style={{ background: '#00492f', color: '#ffffff', padding: '8px 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>view_list</span>
              <span>Ver Catálogo Completo</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando clases...</div>
          ) : clases.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">search_off</span>
              <h4 className="ssc-empty-title">No tienes grupos asignados actualmente</h4>
              <p className="ssc-empty-desc">
                Contacta a la administración escolar de tu plantel para verificar la vinculación de tus materias.
              </p>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {clases.map(clase => (
                <div key={clase.materiaId} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px' }}>
                          Grupo {clase.grupoNombre}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #64748b)' }}>
                          {clase.turno === 'V' ? 'Turno Vespertino' : 'Turno Matutino'}
                        </span>
                      </div>
                      <h4 className="ssc-card-title">{clase.materiaNombre}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePasarLista(clase)}
                      className="ssc-btn-action ssc-btn-action--primary"
                      style={{ background: '#00492f', color: '#ffffff', padding: '8px 16px', fontSize: '12.5px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>checklist</span>
                      <span>Pasar Lista</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Pestaña 2: Radar de Grupos BI */}
      {activeTab === 'bi' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#00492f' }}>analytics</span>
              Inteligencia Conductual de tus Grupos Asignados
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Monitoreo directo del desempeño conductual y nivel de atención de los grupos bajo tu impartición.
            </p>
          </div>
          {plantelId ? (
            <BIAnalyticsDashboard userRole="docente" plantelId={plantelId} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando información del plantel...</div>
          )}
        </section>
      )}

      {/* Pestaña 3: Avisos de Dirección */}
      {activeTab === 'avisos' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#d97706' }}>campaign</span>
              Comunicados Oficiales de Dirección ({avisos.length})
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
              Notificaciones y circulares institucionales dirigidas al cuerpo docente.
            </p>
          </div>

          {loadingAvisos ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando comunicados...</div>
          ) : avisos.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">campaign</span>
              <h4 className="ssc-empty-title">No hay comunicados oficiales en este momento</h4>
              <p className="ssc-empty-desc">Los avisos emitidos por la dirección del plantel aparecerán aquí.</p>
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
                        {aviso.contenido || aviso.descripcion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal Emisión Rápida de Reportes */}
      <GenerarReporteRapidoModal
        isOpen={modalReporteOpen}
        onClose={() => setModalReporteOpen(false)}
      />
    </div>
  );
}