import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './InicioDA.css';

interface ComingSoonCard {
  id: number;
  icon: string;
  title: string;
  description: string;
}

const COMING_SOON: ComingSoonCard[] = [
  { id: 1, icon: 'history',       title: 'Historial de reportes',  description: 'Consulta registros históricos de incidencias previas.'         },
  { id: 2, icon: 'person_search', title: 'Gestión de alumnos',     description: 'Administración de expedientes estudiantiles.'                   },
  { id: 3, icon: 'track_changes', title: 'Seguimiento',            description: 'Evolución de compromisos y acuerdos parentales.'               },
];

function getFormattedDate(): string {
  const now = new Date();
  const formatted = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function InicioDA() {
  const { nombre } = useAuth();
  const navigate = useNavigate();
  const [currentDate] = useState<string>(getFormattedDate());
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
        <h2 className="ida-hero__title">Panel de Gestión Directiva</h2>
        <p className="ida-hero__subtitle">Bienvenido(a), {nombre || 'Administrador(a)'}. Acceso a las funciones de control y reportes de comportamiento.</p>
      </section>

      {/* Bento grid */}
      <div className="ida-bento">
        {/* Main action card */}
        <div className="ida-main-card" onClick={handleGoToReport} style={{ cursor: 'pointer' }}>
          <div className="ida-main-card__img-wrap">
            <img
              className="ida-main-card__img"
              alt="Panel de gestión institucional"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAohDibCl1g1K_fVJsA1SeLrLNN6jjRzZw94s4Mq_wNlf9g6ehB2lRU--Kd1XL1yOtdjWjN5hPfj89iM6sXrVtpY2KgvBi6ftfMfFYHMD4bMA51zpZMI6mU-WIwD5WUT-6GRVhlbG_eQMu4b-Xby-oMLCWbtl2KAnYoGUq68cYp1YNKcFa832UipU_rBNuPrJKOkp9y3jDtmbmG_1h1hz5mDc7J4cIoYEa43u_BYnLUh1GJKf2dYAaN"
            />
            <div className="ida-main-card__img-overlay" />
          </div>
          <div className="ida-main-card__body">
            <div className="ida-main-card__tag">
              <span className="material-symbols-outlined">assignment_add</span>
              <span>Módulo Principal</span>
            </div>
            <h3 className="ida-main-card__title">Generar Reporte Disciplinario</h3>
            <p className="ida-main-card__desc">
              Registra un nuevo reporte de incidencia conductual grave para cualquier alumno del plantel con total trazabilidad.
            </p>
            <button className="ida-btn-primary" onClick={handleGoToReport}>
              Ir a Generar Reporte
              <span className="material-symbols-outlined ida-btn-primary__icon">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Institutional info card */}
        <div className="ida-info-card">
          <h4 className="ida-info-card__heading">
            <span className="material-symbols-outlined ida-info-card__heading-icon">account_balance</span>
            Información del Plantel
          </h4>
          <div className="ida-info-list">
            <div className="ida-info-item">
              <p className="ida-info-item__label">Nombre de la institución</p>
              <p className="ida-info-item__value">CONALEP Plantel Puebla I</p>
            </div>
            <div className="ida-info-item">
              <p className="ida-info-item__label">Ciclo Escolar</p>
              <p className="ida-info-item__value">2026-2027</p>
            </div>
            <div className="ida-info-item">
              <p className="ida-info-item__label">Fecha actual</p>
              <p className="ida-info-item__value">{currentDate}</p>
            </div>
            <div className="ida-info-item ida-info-item--role">
              <div>
                <p className="ida-info-item__label">Tu Rol</p>
                <p className="ida-info-item__value ida-info-item__value--primary">Directivo / Orientador</p>
              </div>
              <span className="material-symbols-outlined ida-role-icon">verified_user</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coming soon section */}
      <section className="ida-coming-soon">
        <div className="ida-coming-soon__header">
          <h3 className="ida-coming-soon__title">Funciones de Gestión</h3>
          <div className="ida-coming-soon__divider" />
        </div>
        <div className="ida-coming-soon__grid">
          {COMING_SOON.map(card => (
            <div key={card.id} className="ida-future-card" onClick={() => card.id === 1 && navigate('/director/historial')} style={{ cursor: card.id === 1 ? 'pointer' : 'default' }}>
              <div className="ida-future-card__icon-wrap">
                <span className="material-symbols-outlined ida-future-card__icon">{card.icon}</span>
              </div>
              <h5 className="ida-future-card__title">{card.title}</h5>
              <p className="ida-future-card__desc">{card.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}