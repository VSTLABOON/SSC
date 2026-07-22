import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import './InicioDA.css';

export default function InicioDA() {
  const { nombre, rol, plantelId } = useAuth();
  const navigate = useNavigate();
  const [heroVisible, setHeroVisible] = useState<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function handleGoToReport(): void {
    navigate('/director/reporte');
  }

  return (
    <div className="ida-canvas-only animate-fade-in">
      {/* Welcome hero */}
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

      {/* BI Analytics Dashboard */}
      {plantelId ? (
        <BIAnalyticsDashboard userRole={rol === 'directivo' ? 'directivo' : 'orientador'} plantelId={plantelId} />
      ) : (
        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando datos del plantel...</div>
      )}
    </div>
  );
}