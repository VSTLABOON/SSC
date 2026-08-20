import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import './InicioMaestro.css';

type TabType = 'bi' | 'operacion' | 'avisos';

interface AvisoItem {
  id: string;
  titulo: string;
  contenido: string;
  descripcion?: string;
  fecha_publicacion: string;
}

export default function InicioMaestro() {
  const navigate = useNavigate();
  const { session, plantelId } = useAuth();
  const [clases, setClases] = useState<ClassDocente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('bi');
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [loadingAvisos, setLoadingAvisos] = useState(false);

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
    <div className="im-canvas-only animate-fade-in">
      {/* Selector de Pestañas de Vista Dedicada (Dedicated View Tabs) */}
      <div className="dedicated-tabs-container">
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'bi' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
          Centro BI & KPIs
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'operacion' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('operacion')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>schedule</span>
          Mis Clases & Asistencia
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'avisos' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('avisos')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
          Avisos de Dirección
        </button>
      </div>

      {/* Pestaña 1: BI & KPIs (Vista Predeterminada Inicial) */}
      {activeTab === 'bi' && (
        <section className="dedicated-tab-content">
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#204785' }}>analytics</span>
              Inteligencia Conductual de tus Grupos Asignados
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
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

      {/* Pestaña 2: Mis Clases & Asistencia */}
      {activeTab === 'operacion' && (
        <section className="dedicated-tab-content">
          <div className="bento-grid">
            <div className="card card--schedule">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon-box">
                    <span className="material-symbols-outlined card-icon">schedule</span>
                  </div>
                  <h3 className="card-title">Horario de Hoy</h3>
                </div>
                <span className="date-chip">Lunes Académico</span>
              </div>

              <div className="schedule-list">
                {loading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#5c5f60' }}>Cargando clases de hoy...</div>
                ) : clases.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#5c5f60' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>search_off</span>
                    No tienes grupos ni materias asignadas.
                  </div>
                ) : (
                  <>
                    {clases.map((clase) => (
                      <div className="schedule-item" key={clase.materiaId}>
                        <div className="schedule-time" title="Horario pendiente de configurar">
                          <p className="schedule-time-start">—:—</p>
                          <p className="schedule-time-end">—:—</p>
                        </div>
                        <div className="schedule-divider" />
                        <div className="schedule-info">
                          <p className="schedule-subject">{clase.materiaNombre}</p>
                          <p className="schedule-group">
                            Grupo {clase.grupoNombre} • {clase.turno === 'V' ? 'Turno Vespertino' : 'Turno Matutino'}
                          </p>
                        </div>
                        <button className="btn-pasar-lista" onClick={() => handlePasarLista(clase)}>
                          Pasar Lista
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pestaña 3: Avisos de Dirección */}
      {activeTab === 'avisos' && (
        <section className="dedicated-tab-content">
          <div className="card card--announcements" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div className="card-header card-header--no-margin" style={{ marginBottom: '16px' }}>
              <div className="card-header-left">
                <div className="card-icon-box">
                  <span className="material-symbols-outlined card-icon">campaign</span>
                </div>
                <h3 className="card-title">Avisos y Comunicados Oficiales de Dirección ({avisos.length})</h3>
              </div>
            </div>

            {loadingAvisos ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando comunicados...</div>
            ) : avisos.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No hay comunicados oficiales en este momento.</div>
            ) : (
              <div className="announcements-list">
                {avisos.map(aviso => (
                  <div key={aviso.id} className="announcement" style={{ marginBottom: '12px' }}>
                    <p className="announcement-title">{aviso.titulo}</p>
                    <p className="announcement-description">{aviso.contenido || aviso.descripcion}</p>
                    <p className="announcement-time">
                      {new Date(aviso.fecha_publicacion).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}