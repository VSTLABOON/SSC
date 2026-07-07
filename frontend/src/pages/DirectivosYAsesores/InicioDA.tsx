// InicioDA.tsx
import { useEffect, useRef, useState } from 'react';
import './InicioDA.css';
import foto_docente from '../../assets/imagenes/foto_maestro.jpg';
import SCTechlogo from '../../assets/imagenes/SCTechlogo.png';

// ── Types ──────────────────────────────────────────────────────────────────
type DAScreen =
  | 'InicioDA'
  | 'GenerarReporteDA'
  | 'Historialreporteda'
  | 'login';

interface InicioDAProps {
  /** Callback de navegación a conectar posteriormente desde App.tsx */
  onNavigate?: (screen: DAScreen) => void;
}

interface ComingSoonCard {
  id: number;
  icon: string;
  title: string;
  description: string;
}

// ── Static data ────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────

export default function InicioDA({ onNavigate }: InicioDAProps) {
  // ── Sidebar state (exact copy from GenerarReporteM) ──────────────────────
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(true);
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function openSidebar(): void  { setIsSidebarHidden(false); setIsOverlayActive(true);  }
  function closeSidebar(): void { setIsSidebarHidden(true);  setIsOverlayActive(false); }
function handleMenuToggleClick(e: React.MouseEvent): void {
    e.stopPropagation();
    
    if (isSidebarHidden) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  function handleNavItemClick(screen: DAScreen): void {
    if (window.innerWidth < 768) closeSidebar();
    onNavigate?.(screen);
  }

  useEffect(() => {
    function handleResize(): void {
      if (window.innerWidth >= 768) {
        setIsSidebarHidden(false);
        setIsOverlayActive(false);
      } else if (!isOverlayActive) {
        setIsSidebarHidden(true);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOverlayActive]);

  // ── Page state ────────────────────────────────────────────────────────────
  const [currentDate] = useState<string>(getFormattedDate());
  const [heroVisible, setHeroVisible]   = useState<boolean>(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function handleGoToReport(): void {onNavigate?.('GenerarReporteDA');}
  function handleLogout(): void     { handleNavItemClick('login'); }
  function handleInstitutionLogoClick(): void { console.log('Logo institucional'); }

  // ── Dynamic classes ───────────────────────────────────────────────────────
  const sidebarClassName = ['grm-sidebar', isSidebarHidden ? 'grm-sidebar--mobile-hidden' : ''].filter(Boolean).join(' ');
  const overlayClassName = ['grm-overlay', isOverlayActive ? 'grm-overlay--active' : ''].filter(Boolean).join(' ');

  return (
    <div className="ida-body">

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      <div className={overlayClassName} ref={overlayRef} onClick={closeSidebar} />

      {/* ── Sidebar (menu oficial, opciones de esta pantalla) ─────────────── */}
      <aside className={sidebarClassName} ref={sidebarRef}>
        <div className="grm-sidebar-top">
          <div className="grm-sidebar-brand">
            <div className="grm-sidebar-brand-logo">
              <img alt="Logo Sistema Conductual" className="grm-sidebar-brand-logo-img" src={SCTechlogo} />
            </div>
            <span className="grm-sidebar-brand-name">Sistema<br />Conductual</span>
          </div>
          <div className="grm-teacher-card">
            <p className="grm-teacher-card-greeting">Bienvenida Maestro</p>
            <div className="grm-teacher-card-avatar">
              <img alt="Andrew Mike" className="grm-teacher-card-avatar-img" src={foto_docente} />
            </div>
            <div>
              <p className="grm-teacher-card-name">Andrew Mike</p>
              <p className="grm-teacher-card-role">Docente en Redes</p>
            </div>
          </div>
        </div>

        <nav className="grm-sidebar-nav">
          <a className="grm-nav-item grm-nav-item--active" href="#" onClick={() => handleNavItemClick('InicioDA')}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="grm-nav-item-label">Inicio</span>
          </a>
          <a className="grm-nav-item" href="#" onClick={() => handleNavItemClick('GenerarReporteDA')}>
            <span className="material-symbols-outlined">assessment</span>
            <span className="grm-nav-item-label">Generar Reporte</span>
          </a>
          <a className="grm-nav-item" href="#" onClick={() => handleNavItemClick('Historialreporteda')}>
            <span className="material-symbols-outlined">history</span>
            <span className="grm-nav-item-label">Historial de Reportes</span>
          </a>
        </nav>

        <div className="grm-sidebar-footer">
          <a className="grm-nav-item grm-nav-item--logout" href="#" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            <span className="grm-nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="ida-main">

        {/* TopBar (menu oficial) */}
        <header className="grm-topbar">
          <div className="grm-topbar-left">
            <button className="grm-menu-toggle" onClick={handleMenuToggleClick}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="grm-topbar-title">Inicio</h1>
          </div>
          <div className="grm-topbar-right">
            <div className="grm-topbar-divider" />
            <div className="grm-topbar-institution">
              <span className="grm-topbar-institution-label">Plantel Puebla I</span>
              <img
                alt="Logo Institucional"
                className="grm-topbar-institution-logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVN4tbYkPmVGUA7PiggmYiGSDi1vpBbCLGyR3yjxujoiVsb8az6OYz9kmbH1GmmTX9_Weg6fhNo1kse5BbZbXJKe03j-_v6ssJ--uGU89jcouUcr5lB6_TetGEee59J7cU4Ms6GbAJ9eDwArGKV8Xh9LG56EEyx9A0shJS5oqlj-8bPi7AI-IxPRE6TF-gqKT9bSBulPhnyEI5cSgFQ4b7rUSLZKsXI8XWoALTtM1qkDhOeh7nKqeKSQk8J7-jdD7_SDggbGWlKw0"
                onClick={handleInstitutionLogoClick}
              />
            </div>
          </div>
        </header>

        {/* ── Canvas ──────────────────────────────────────────────────────── */}
        <div className="ida-canvas">

          {/* Welcome hero */}
          <section className={`ida-hero${heroVisible ? ' ida-hero--visible' : ''}`}>
            <h2 className="ida-hero__title">Bienvenido al Sistema de Reportes Escolares</h2>
            <p className="ida-hero__subtitle">Desde este panel podrás acceder a las funciones disponibles del sistema.</p>
          </section>

          {/* Bento grid */}
          <div className="ida-bento">

            {/* Main action card */}
            <div className="ida-main-card">
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
                <h3 className="ida-main-card__title">Generar Reporte</h3>
                <p className="ida-main-card__desc">
                  Registra un nuevo reporte de incidencia para un alumno con total
                  trazabilidad y cumplimiento normativo.
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
                Información Institucional
              </h4>
              <div className="ida-info-list">
                <div className="ida-info-item">
                  <p className="ida-info-item__label">Nombre de la institución</p>
                  <p className="ida-info-item__value">CONALEP</p>
                </div>
                <div className="ida-info-item">
                  <p className="ida-info-item__label">Ciclo Escolar</p>
                  <p className="ida-info-item__value">2023-2024</p>
                </div>
                <div className="ida-info-item">
                  <p className="ida-info-item__label">Fecha actual</p>
                  <p className="ida-info-item__value">{currentDate}</p>
                </div>
                <div className="ida-info-item ida-info-item--role">
                  <div>
                    <p className="ida-info-item__label">Tu Rol</p>
                    <p className="ida-info-item__value ida-info-item__value--primary">Directivo</p>
                  </div>
                  <span className="material-symbols-outlined ida-role-icon">verified_user</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coming soon section */}
          <section className="ida-coming-soon">
            <div className="ida-coming-soon__header">
              <h3 className="ida-coming-soon__title">Funciones Principales</h3>
              <div className="ida-coming-soon__divider" />
            </div>
            <div className="ida-coming-soon__grid">
              {COMING_SOON.map(card => (
                <div key={card.id} className="ida-future-card">
                  <div className="ida-future-card__icon-wrap">
                    <span className="material-symbols-outlined ida-future-card__icon">{card.icon}</span>
                  </div>
                  <h5 className="ida-future-card__title">{card.title}</h5>
                  <p className="ida-future-card__desc">{card.description}</p>
                </div>
              ))}
            </div>
          </section>

        </div>{/* /canvas */}
      </main>
    </div>
  );
}