import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { PublicarAvisoModal } from '../../components/directivo/PublicarAvisoModal';
import '../DirectivosYAsesores/InicioDA.css';

type TabType = 'bi' | 'operacion' | 'comunicados';

interface AvisoItem {
  id: string;
  titulo: string;
  contenido: string;
  destinatarios: string;
  fecha_publicacion: string;
}

export default function InicioDirectivo() {
  const { nombre, plantelId } = useAuth();
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('bi');
  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const [loadingAvisos, setLoadingAvisos] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const loadAvisos = useCallback(async () => {
    if (!plantelId) return;
    try {
      setLoadingAvisos(true);
      const { data, error } = await supabase
        .from('avisos')
        .select('*')
        .eq('plantel_id', plantelId)
        .order('fecha_publicacion', { ascending: false });

      if (!error && data) {
        setAvisos(data);
      }
    } catch (err) {
      console.error('Error al cargar avisos:', err);
    } finally {
      setLoadingAvisos(false);
    }
  }, [plantelId]);

  useEffect(() => {
    loadAvisos();
  }, [loadAvisos]);

  async function handleEliminarAviso(id: string) {
    if (!window.confirm('¿Estás seguro de eliminar este aviso institucional?')) return;
    try {
      const { error } = await supabase.from('avisos').delete().eq('id', id);
      if (!error) {
        setAvisos(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error al eliminar aviso:', err);
    }
  }

  return (
    <div className="ida-canvas-only animate-fade-in">
      {/* Welcome Hero Directivo */}
      <section className={`ida-hero${heroVisible ? ' ida-hero--visible' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', color: '#ffffff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>admin_panel_settings</span>
              Dirección General de Plantel
            </div>
            <h2 className="ida-hero__title">
              Panel Ejecutivo de Inteligencia & Control Directivo
            </h2>
            <p className="ida-hero__subtitle">
              Bienvenido(a), {nombre || 'Director(a)'}. Supervisión integral de salud conductual, tendencias analíticas y gobernanza del plantel.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="ida-btn-primary"
              onClick={() => setModalAvisoOpen(true)}
              style={{ width: 'auto', display: 'inline-flex', padding: '10px 16px', fontSize: '13px', background: '#059669' }}
            >
              <span className="material-symbols-outlined">campaign</span>
              Publicar Aviso
            </button>
            <button
              type="button"
              className="ida-btn-primary"
              onClick={() => navigate('/director/reporte')}
              style={{ width: 'auto', display: 'inline-flex', padding: '10px 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined">assignment_add</span>
              Generar Reporte
            </button>
          </div>
        </div>
      </section>

      {/* Selector de Pestañas de Vista Dedicada */}
      <div className="dedicated-tabs-container">
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'bi' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
          Centro BI & KPIs Globales
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'operacion' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('operacion')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
          Operación & Administración
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'comunicados' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('comunicados')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
          Avisos del Plantel ({avisos.length})
        </button>
      </div>

      {/* Pestaña 1: BI & KPIs */}
      {activeTab === 'bi' && (
        <section className="dedicated-tab-content">
          {plantelId ? (
            <BIAnalyticsDashboard userRole="directivo" plantelId={plantelId} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando datos del plantel...</div>
          )}
        </section>
      )}

      {/* Pestaña 2: Operación & Administración Directiva */}
      {activeTab === 'operacion' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="op-card" onClick={() => navigate('/director/usuarios')} style={{ cursor: 'pointer', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '12px' }}>manage_accounts</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-main, #0f172a)' }}>Gestión de Usuarios</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>Invitar docentes, asignar roles, reactivar cuentas y desbloquear contraseñas.</p>
            </div>

            <div className="op-card" onClick={() => navigate('/director/reporte')} style={{ cursor: 'pointer', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#204785', background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>post_add</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-main, #0f172a)' }}>Generar Reporte Oficial</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>Registrar reportes disciplinarios oficiales a nivel institucional.</p>
            </div>

            <div className="op-card" onClick={() => navigate('/director/historial')} style={{ cursor: 'pointer', background: 'var(--color-bg-card, #ffffff)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0284c7', background: '#e0f2fe', padding: '10px', borderRadius: '12px' }}>history_edu</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-main, #0f172a)' }}>Historial de Incidencias</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>Consultar y filtrar la bitácora histórica de todos los estudiantes del plantel.</p>
            </div>
          </div>
        </section>
      )}

      {/* Pestaña 3: Avisos y Comunicados Institucionales */}
      {activeTab === 'comunicados' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#204785' }}>campaign</span>
              Comunicados Activos del Plantel
            </h4>
            <button
              type="button"
              onClick={() => setModalAvisoOpen(true)}
              style={{ background: '#204785', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Nuevo Comunicado
            </button>
          </div>

          {loadingAvisos ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando avisos...</div>
          ) : avisos.length === 0 ? (
            <div style={{ background: 'var(--color-bg-card, #ffffff)', padding: '32px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--color-border-subtle, #e2e8f0)', color: 'var(--color-text-sub, #64748b)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '42px', color: '#94a3b8', marginBottom: '8px' }}>campaign</span>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No hay avisos publicados actualmente.</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Haz clic en "Publicar Aviso" para emitir el primer comunicado oficial.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {avisos.map(a => (
                <div key={a.id} style={{ background: 'var(--color-bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--color-border-subtle, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: '#eff6ff', color: '#204785', padding: '2px 8px', borderRadius: '4px' }}>
                        Audiencia: {a.destinatarios}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)' }}>
                        {new Date(a.fecha_publicacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h5 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-main, #0f172a)' }}>
                      {a.titulo}
                    </h5>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-main, #334155)', whiteSpace: 'pre-line' }}>
                      {a.contenido}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEliminarAviso(a.id)}
                    title="Eliminar aviso"
                    style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal Publicar Aviso */}
      <PublicarAvisoModal
        isOpen={modalAvisoOpen}
        onClose={() => setModalAvisoOpen(false)}
        onAvisoPublicado={loadAvisos}
      />
    </div>
  );
}
