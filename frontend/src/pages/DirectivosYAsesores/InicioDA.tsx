import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import './InicioDA.css';

type TabType = 'bi' | 'operacion' | 'comunicados';

export default function InicioDA() {
  const { nombre, rol, plantelId } = useAuth();
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('bi');

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function handleGoToReport(): void {
    navigate('/director/reporte');
  }

  return (
    <div className="ida-canvas-only animate-fade-in">
      {/* Welcome Hero */}
      <section className={`ida-hero${heroVisible ? ' ida-hero--visible' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="ida-hero__title">Panel de Inteligencia de Negocio & Control Directivo</h2>
            <p className="ida-hero__subtitle">
              Bienvenido(a), {nombre || 'Administrador(a)'}. Monitoreo en tiempo real de salud conductual, tendencias e indicadores clave.
            </p>
          </div>
          <button
            type="button"
            className="ida-btn-primary"
            onClick={handleGoToReport}
            style={{ width: 'auto', display: 'inline-flex', padding: '10px 18px', fontSize: '13px' }}
          >
            <span className="material-symbols-outlined">assignment_add</span>
            Generar Reporte Disciplinario
          </button>
        </div>
      </section>

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
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>
          Operación & Acciones
        </button>
        <button
          type="button"
          className={`dedicated-tab-btn ${activeTab === 'comunicados' ? 'dedicated-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('comunicados')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>campaign</span>
          Avisos del Plantel
        </button>
      </div>

      {/* Pestaña 1: BI & KPIs (Vista Predeterminada Inicial) */}
      {activeTab === 'bi' && (
        <section className="dedicated-tab-content">
          {plantelId ? (
            <BIAnalyticsDashboard userRole={rol === 'directivo' ? 'directivo' : 'orientador'} plantelId={plantelId} />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando datos del plantel...</div>
          )}
        </section>
      )}

      {/* Pestaña 2: Operación & Acciones Rápidas */}
      {activeTab === 'operacion' && (
        <section className="dedicated-tab-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div className="op-card" onClick={() => navigate('/director/reporte')} style={{ cursor: 'pointer', background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#204785', background: '#eff6ff', padding: '10px', borderRadius: '12px' }}>post_add</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Generar Nuevo Reporte</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Registrar una incidencia conductual positiva o negativa en el sistema.</p>
            </div>

            <div className="op-card" onClick={() => navigate('/director/historial')} style={{ cursor: 'pointer', background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0284c7', background: '#e0f2fe', padding: '10px', borderRadius: '12px' }}>manage_search</span>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Historial de Incidencias</h4>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Consultar y filtrar todos los reportes disciplinarios del plantel.</p>
            </div>

            {rol === 'directivo' && (
              <div className="op-card" onClick={() => navigate('/director/usuarios')} style={{ cursor: 'pointer', background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '12px' }}>group_add</span>
                  <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>Gestión de Usuarios</h4>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Administrar accesos, roles y cuentas de docentes y orientadores.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pestaña 3: Avisos y Comunicados */}
      {activeTab === 'comunicados' && (
        <section className="dedicated-tab-content">
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#204785' }}>campaign</span>
              Comunicados Institucionales del Plantel
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              No hay avisos urgentes en este momento. El canal de difusión general permanece activo.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}