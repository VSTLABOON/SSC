import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import { PublicarAvisoModal } from '../../components/directivo/PublicarAvisoModal';
import { GenerarReporteRapidoModal } from '../../components/orientador/GenerarReporteRapidoModal';
import '../DirectivosYAsesores/InicioDA.css';

type TabType = 'bi' | 'comunicados';

interface AvisoItem {
  id: string;
  titulo: string;
  contenido: string;
  destinatarios: string;
  fecha_publicacion: string;
}

export default function InicioDirectivo() {
  const { nombre, plantelId } = useAuth();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('bi');
  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [modalReporteOpen, setModalReporteOpen] = useState(false);
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
    <div className="ssc-page-canvas animate-fade-in">
      {/* Welcome Hero Directivo */}
      <section className={`ssc-hero ssc-hero--directivo${heroVisible ? ' ssc-hero--visible' : ''}`}>
        <div className="ssc-hero-body">
          <div className="ssc-hero-content">
            <div className="ssc-welcome-chip">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>admin_panel_settings</span>
              Dirección General & Gobernanza
            </div>
            <h2 className="ssc-hero-title">
              Panel Ejecutivo de Inteligencia & Control Directivo
            </h2>
            <p className="ssc-hero-subtitle">
              Bienvenido(a), {nombre || 'Director(a)'}. Supervisión integral de salud conductual, tendencias analíticas y gobernanza del plantel.
            </p>
          </div>
          <div className="ssc-hero-actions">
            <button
              type="button"
              className="ssc-btn-action ssc-btn-action--primary"
              onClick={() => setModalAvisoOpen(true)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
              <span>Publicar Aviso</span>
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

      {/* Resumen Rápido / KPIs Directivos */}
      <div className="ssc-kpi-grid">
        <div
          className={`ssc-kpi-card ${activeTab === 'bi' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Centro BI & Radar</div>
            <div className="ssc-kpi-value" style={{ fontSize: '18px', paddingTop: '3px' }}>En línea</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>analytics</span>
              <span>Métricas del plantel</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <span className="material-symbols-outlined">insights</span>
          </div>
        </div>

        <div
          className={`ssc-kpi-card ${activeTab === 'comunicados' ? 'ssc-kpi-card--active' : ''}`}
          onClick={() => setActiveTab('comunicados')}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Comunicados Activos</div>
            <div className="ssc-kpi-value">{avisos.length}</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#0284c7' }}>campaign</span>
              <span>Avisos institucionales</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <span className="material-symbols-outlined">campaign</span>
          </div>
        </div>

        <div
          className="ssc-kpi-card"
          onClick={() => setModalReporteOpen(true)}
        >
          <div className="ssc-kpi-info">
            <div className="ssc-kpi-label">Emisión Disciplinaria</div>
            <div className="ssc-kpi-value" style={{ fontSize: '18px', paddingTop: '3px' }}>Rápida</div>
            <div className="ssc-kpi-subtext">
              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>add_circle</span>
              <span>Emitir incidencia</span>
            </div>
          </div>
          <div className="ssc-kpi-icon-wrap" style={{ background: '#dcfce7', color: '#15803d' }}>
            <span className="material-symbols-outlined">assignment_add</span>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas de Vista Dedicada */}
      <nav className="ssc-tabs-nav" aria-label="Secciones Directivas">
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'bi' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('bi')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
          <span>Centro BI & Radar Global</span>
        </button>
        <button
          type="button"
          className={`ssc-tab-btn ${activeTab === 'comunicados' ? 'ssc-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('comunicados')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
          <span>Avisos del Plantel</span>
          <span className="ssc-tab-badge">{avisos.length}</span>
        </button>
      </nav>

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

      {/* Pestaña 2: Avisos y Comunicados Institucionales */}
      {activeTab === 'comunicados' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>campaign</span>
                Comunicados Oficiales del Plantel
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--color-text-sub, #64748b)' }}>
                Gestiona avisos visibles para alumnos, tutores y personal docente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalAvisoOpen(true)}
              className="ssc-btn-action ssc-btn-action--primary"
              style={{ background: '#2563eb', color: '#ffffff', padding: '8px 16px', fontSize: '13px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              <span>Nuevo Comunicado</span>
            </button>
          </div>

          {loadingAvisos ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando avisos...</div>
          ) : avisos.length === 0 ? (
            <div className="ssc-empty-state">
              <span className="material-symbols-outlined ssc-empty-icon">campaign</span>
              <h4 className="ssc-empty-title">No hay avisos publicados actualmente</h4>
              <p className="ssc-empty-desc">
                Publica el primer aviso institucional para notificar a la comunidad escolar sobre fechas clave, avisos o circulares.
              </p>
              <button
                type="button"
                className="ssc-btn-action ssc-btn-action--primary"
                onClick={() => setModalAvisoOpen(true)}
                style={{ background: '#2563eb', color: '#ffffff' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
                <span>Publicar Primer Aviso</span>
              </button>
            </div>
          ) : (
            <div className="ssc-cards-list">
              {avisos.map(a => (
                <div key={a.id} className="ssc-item-card">
                  <div className="ssc-card-top">
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px' }}>
                          Audiencia: {a.destinatarios}
                        </span>
                        <span style={{ fontSize: '11.5px', color: 'var(--color-text-sub, #94a3b8)' }}>
                          {new Date(a.fecha_publicacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="ssc-card-title" style={{ marginBottom: '6px' }}>
                        {a.titulo}
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-main, #334155)', whiteSpace: 'pre-line' }}>
                        {a.contenido}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEliminarAviso(a.id)}
                      title="Eliminar aviso"
                      style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      <span>Eliminar</span>
                    </button>
                  </div>
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

      {/* Modal Generación Rápida de Reportes */}
      <GenerarReporteRapidoModal
        isOpen={modalReporteOpen}
        onClose={() => setModalReporteOpen(false)}
      />
    </div>
  );
}
