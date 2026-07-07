// InicioMaestro.tsx
//
// Conversión literal de HTML + Tailwind (CDN) a React + TypeScript.
// Respeta exactamente la lógica y el comportamiento del HTML original:
// - El sidebar abre/cierra igual que en el script original (toggle por
//   clase, overlay, cierre al hacer click en un nav-item en móvil,
//   comportamiento en resize).
// - El dropdown de búsqueda (#search-dropdown) existe en el marcado
//   pero permanece oculto, igual que en el HTML (no tenía lógica de
//   apertura ni de filtrado).
// - Los botones sin lógica en el HTML ("Pasar Lista", "Ver todos los
//   avisos", el botón vacío de notificaciones) quedan con un handler
//   temporal mínimo (console.log), sin funcionalidad inventada.
// - No se agregaron pantallas, rutas, estados ni componentes que no
//   existieran en el HTML original.
// - Se agregó la navegación del menú lateral mediante `onNavigate`,
//   incluyendo la nueva opción "Historial de reportes", sin alterar
//   el resto de la lógica ni el diseño.

import { useEffect, useRef, useState } from 'react';
import './InicioMaestro.css';
import foto_maestro from '../../assets/imagenes/foto_maestro.jpg';
import SCTechlogo from '../../assets/imagenes/SCTechlogo.png';

// Pantallas del menú oficial del módulo de Maestros.
// Se deja preparado para conectar la navegación real desde App.tsx.
type MaestroScreen =
  | 'InicioMaestro'
  | 'Clasespantalla'
  | 'GenerarReporteM'
  | 'HistorialReportesM'
  | 'login';

interface InicioMaestroProps {
  /** Callback de navegación a conectar posteriormente desde App.tsx */
  onNavigate?: (screen: MaestroScreen) => void;
}

export default function InicioMaestro({ onNavigate }: InicioMaestroProps) {
  // ────────────────────────────────────────
  // Estado del sidebar — equivalente exacto a las clases
  // 'mobile-hidden' (oculto) y 'active' (overlay visible) del HTML.
  // ────────────────────────────────────────
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(true);
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);

  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function openSidebar(): void {
    setIsSidebarHidden(false);
    setIsOverlayActive(true);
  }

  function closeSidebar(): void {
    setIsSidebarHidden(true);
    setIsOverlayActive(false);
  }

  // Botón de menú (hamburguesa): replica exactamente
  // menuToggle.addEventListener('click', ...) del script original.
  function handleMenuToggleClick(event: React.MouseEvent): void {
    event.stopPropagation();
    if (isSidebarHidden) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  // Click en un ítem de navegación: replica
  // navItems.forEach(item => item.addEventListener('click', ...)),
  // y adicionalmente dispara la navegación hacia la pantalla indicada.
  function handleNavItemClick(screen: MaestroScreen): void {
    if (window.innerWidth < 768) {
      closeSidebar();
    }
    onNavigate?.(screen);
  }

  // Listener de resize: replica exactamente el comportamiento original.
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

  // ────────────────────────────────────────
  // Handlers temporales — el HTML no tenía lógica real para estos
  // elementos, así que se deja únicamente un handler mínimo.
  // ────────────────────────────────────────
  function handlePasarLista(): void {
    console.log('Pasar Lista');
  }

  function handleVerTodosLosAvisos(): void {
    console.log('Ver todos los avisos');
  }

  function handleNotificationsClick(): void {
    console.log('Notificaciones');
  }

  function handleInstitutionLogoClick(): void {
    console.log('Logo institucional');
  }

  function handleSearchResultClick(): void {
    console.log('Resultado de búsqueda seleccionado');
  }

  // Clases dinámicas del sidebar y overlay, equivalentes a las
  // manipuladas vía classList en el script original.
  const sidebarClassName = [
    'sidebar',
    isSidebarHidden ? 'sidebar--mobile-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const overlayClassName = [
    'sidebar-overlay',
    isOverlayActive ? 'sidebar-overlay--active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="im-body">
      {/* Overlay for mobile drawer */}
      <div
        className={overlayClassName}
        id="sidebar-overlay"
        ref={overlayRef}
        onClick={closeSidebar}
      />

      {/* SideNavBar */}
      <aside className={sidebarClassName} id="sidebar" ref={sidebarRef}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo">
              <img
                src={SCTechlogo}
                alt="Logo SCTech"
                className="sidebar-brand-logo-img"
              />
            </div>
            <span className="sidebar-brand-name">
              Sistema
              <br />
              Conductual
            </span>
          </div>

          {/* Teacher Profile Card */}
          <div className="teacher-card">
            <p className="teacher-card-greeting">Bienvenida Maestra</p>
            <div className="teacher-card-avatar">
              <img
                src={foto_maestro}
                alt="Foto de Maestro"
                className="teacher-card-avatar-img"
              />
            </div>
            <div>
              <p className="teacher-card-name">Andrew mike</p>
              <p className="teacher-card-role">Docente en Redes</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" id="sidebar-nav">
          <a
            className="nav-item nav-item--active"
            href="#"
            onClick={() => handleNavItemClick('InicioMaestro')}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="nav-item-label">Inicio</span>
          </a>
          <a
            className="nav-item"
            href="#"
            onClick={() => handleNavItemClick('Clasespantalla')}
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="nav-item-label">Grupos</span>
          </a>
          <a
            className="nav-item"
            href="#"
            onClick={() => handleNavItemClick('GenerarReporteM')}
          >
            <span className="material-symbols-outlined">assessment</span>
            <span className="nav-item-label">Generar reporte</span>
          </a>
          <a
            className="nav-item"
            href="#"
            onClick={() => handleNavItemClick('HistorialReportesM')}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="nav-item-label">Historial de reportes</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a
            className="nav-item nav-item--logout"
            href="#"
            onClick={() => handleNavItemClick('login')}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* TopAppBar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              id="menu-toggle"
              onClick={handleMenuToggleClick}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="topbar-title">Portal de Docencia</h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-icon-group">
              <button
                className="icon-button"
                onClick={handleNotificationsClick}
              />
            </div>
            <div className="topbar-divider" />
            <div className="topbar-institution">
              <span className="topbar-institution-label">Plantel Puebla I</span>
              <img
                alt="Logo Institucional"
                className="topbar-institution-logo"
                data-alt="The official institutional logo of CONALEP..."
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVN4tbYkPmVGUA7PiggmYiGSDi1vpBbCLGyR3yjxujoiVsb8az6OYz9kmbH1GmmTX9_Weg6fhNo1kse5BbZbXJKe03j-_v6ssJ--uGU89jcouUcr5lB6_TetGEee59J7cU4Ms6GbAJ9eDwArGKV8Xh9LG56EEyx9A0shJS5oqlj-8bPi7AI-IxPRE6TF-gqKT9bSBulPhnyEI5cSgFQ4b7rUSLZKsXI8XWoALTtM1qkDhOeh7nKqeKSQk8J7-jdD7_SDggbGWlKw0"
                onClick={handleInstitutionLogoClick}
              />
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="content-canvas">
          {/* Global Search Section */}
          <section className="search-section">
            <div className="search-wrapper">
              {/* Autocomplete Dropdown — oculto, igual que en el HTML original */}
              <div className="search-dropdown search-dropdown--hidden" id="search-dropdown">
                <div className="search-dropdown-header">
                  <span className="search-dropdown-title">Resultados sugeridos</span>
                  <span className="search-dropdown-hint">Presiona Enter para ver todos</span>
                </div>
                <div className="search-dropdown-body">
                  <button
                    className="search-result"
                    onClick={handleSearchResultClick}
                  >
                    <div className="search-result-left">
                      <div className="search-result-avatar">AP</div>
                      <div className="search-result-text">
                        <p className="search-result-name">Agustín Juan Pérez</p>
                        <p className="search-result-meta">
                          Matrícula: 22090402 • 4to Grupo 402
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined search-result-arrow">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Grid de Control Diario (Bento Style) */}
          <div className="bento-grid">
            {/* Horario de Hoy Card */}
            <div className="card card--schedule">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon-box">
                    <span className="material-symbols-outlined card-icon">schedule</span>
                  </div>
                  <h3 className="card-title">Horario de Hoy</h3>
                </div>
                <span className="date-chip">Lunes, 01 Jun</span>
              </div>

              <div className="schedule-list">
                {/* Class Item */}
                <div className="schedule-item">
                  <div className="schedule-time">
                    <p className="schedule-time-start">07:00</p>
                    <p className="schedule-time-end">08:40</p>
                  </div>
                  <div className="schedule-divider" />
                  <div className="schedule-info">
                    <p className="schedule-subject">Programación de Aplicaciones Web</p>
                    <p className="schedule-group">Grupo 402 • Laboratorio de Cómputo B</p>
                  </div>
                  <button className="btn-pasar-lista" onClick={handlePasarLista}>
                    Pasar Lista
                  </button>
                </div>

                {/* Class Item */}
                <div className="schedule-item">
                  <div className="schedule-time">
                    <p className="schedule-time-start">08:40</p>
                    <p className="schedule-time-end">10:20</p>
                  </div>
                  <div className="schedule-divider" />
                  <div className="schedule-info">
                    <p className="schedule-subject">Base de Datos Avanzada</p>
                    <p className="schedule-group">Grupo 401 • Salón K2</p>
                  </div>
                  <button className="btn-pasar-lista" onClick={handlePasarLista}>
                    Pasar Lista
                  </button>
                </div>

                {/* Class Item (Receso) */}
                <div className="schedule-item schedule-item--break">
                  <div className="schedule-time">
                    <p className="schedule-time-start schedule-time-start--muted">10:20</p>
                    <p className="schedule-time-end">10:50</p>
                  </div>
                  <div className="schedule-divider schedule-divider--muted" />
                  <div className="schedule-info schedule-info--break">
                    <span className="material-symbols-outlined schedule-break-icon">
                      coffee
                    </span>
                    <p className="schedule-break-text">Receso Institucional</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Avisos de Dirección Card */}
            <div className="card-stack">
              <div className="card card--announcements">
                <div className="card-header card-header--no-margin">
                  <div className="card-header-left">
                    <div className="card-icon-box">
                      <span className="material-symbols-outlined card-icon">campaign</span>
                    </div>
                    <h3 className="card-title">Avisos de Dirección</h3>
                  </div>
                </div>

                <div className="announcements-list">
                  <div className="announcement">
                    <p className="announcement-title">Cierre de Calificaciones</p>
                    <p className="announcement-description">
                      Se les recuerda que el sistema cerrará para el primer parcial el día
                      viernes a las 23:59 hrs.
                    </p>
                    <p className="announcement-time">Hace 2 horas</p>
                  </div>
                  <div className="announcement announcement--low">
                    <p className="announcement-title">Mantenimiento de Servidores</p>
                    <p className="announcement-description">
                      El acceso al portal podrá verse interrumpido este sábado de 02:00 a
                      05:00 AM.
                    </p>
                    <p className="announcement-time">Ayer</p>
                  </div>
                </div>

                <button className="btn-ver-avisos" onClick={handleVerTodosLosAvisos}>
                  <span>Ver todos los avisos</span>
                  <span className="material-symbols-outlined btn-ver-avisos-icon">
                    open_in_new
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Contextual Section */}
          <div className="bottom-grid">
            <div className="context-card">
              <div className="context-icon-circle context-icon-circle--error">
                <span className="material-symbols-outlined context-icon">warning</span>
              </div>
              <div>
                <p className="context-title">5 Alumnos en Riesgo</p>
                <p className="context-subtitle">Requieren atención inmediata</p>
              </div>
            </div>

            <div className="context-card">
              <div className="context-icon-circle context-icon-circle--primary">
                <span className="material-symbols-outlined context-icon">task_alt</span>
              </div>
              <div>
                <p className="context-title">92% Asistencia Promedio</p>
                <p className="context-subtitle">Consolidado de la semana</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}