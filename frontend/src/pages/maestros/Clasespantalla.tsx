// ClasesPantalla.tsx
//
// Conversión literal de HTML + Tailwind (CDN) a React + TypeScript.
// El sidebar, overlay, topbar-toggle y lógica de apertura/cierre son
// una copia exacta del menú oficial de InicioMaestro.tsx (misma
// estructura JSX, mismas clases CSS, mismo comportamiento responsive).
// La única diferencia permitida es marcar como activo el ítem
// "Mis Clases" en lugar de "Generar reporte".
//
// El resto del contenido (header de sección, grid de tarjetas de
// grupo, footer de estadísticas) es la conversión fiel del HTML
// original "Mis Grupos", sin Tailwind, con su propio CSS.
//
// La micro-interacción del HTML original (mover la flecha
// "arrow_forward" al hacer hover sobre la tarjeta) se replica de
// forma declarativa vía CSS (:hover), sin necesidad de manipular
// el DOM manualmente, ya que el efecto es puramente visual y no
// depende de estado.

import { useEffect, useRef, useState } from 'react';
import './ClasesPantalla.css';
import SCTechlogo from '../../assets/imagenes/SCTechlogo.png';
import foto_maestro from '../../assets/imagenes/foto_maestro.jpg';
// ────────────────────────────────────────
// Tipos
// ────────────────────────────────────────
interface GroupCard {
  id: string;
  code: string;
  title: string;
  studentsCount: number;
  average: string;
}

type MaestroScreen =
  | 'InicioMaestro'
  | 'Clasespantalla'
  | 'Asignacionestatus'
  | 'GenerarReporteM'
  | 'HistorialReportesM'
  | 'login';

interface Props {
  onNavigate?: (screen: MaestroScreen) => void;
}

// ────────────────────────────────────────
// Datos de las tarjetas de grupo (estáticos, equivalentes a las
// tarjetas del HTML original)
// ────────────────────────────────────────
const GROUPS: GroupCard[] = [
  {
    id: 'soma-505',
    code: 'SOMA-505',
    title: 'Soporte y Mantenimiento de Equipo de Cómputo',
    studentsCount: 38,
    average: '8.2',
  },
  {
    id: 'info-402',
    code: 'INFO-402',
    title: 'Informática y Sistemas de Información',
    studentsCount: 42,
    average: '8.7',
  },
  {
    id: 'enfe-201',
    code: 'ENFE-201',
    title: 'Enfermería General • Propedéutica Médica',
    studentsCount: 35,
    average: '8.9',
  },
  {
    id: 'admn-301',
    code: 'ADMN-301',
    title: 'Administración de Recursos Humanos',
    studentsCount: 31,
    average: '7.8',
  },
];

export default function ClasesPantalla({ onNavigate }: Props) {
  // ────────────────────────────────────────
  // Estado del sidebar — idéntico al patrón de InicioMaestro.tsx
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

  // Botón de menú (hamburguesa): idéntico a InicioMaestro.tsx
  function handleMenuToggleClick(event: React.MouseEvent): void {
    event.stopPropagation();
    if (isSidebarHidden) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  // Click en un ítem de navegación: idéntico al patrón de InicioMaestro.tsx
  // Ahora invoca onNavigate con la pantalla correspondiente y, en
  // móvil, cierra el sidebar tal como antes.
  function handleNavItemClick(screen: MaestroScreen): void {
    onNavigate?.(screen);
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  }

  // Listener de resize: idéntico a InicioMaestro.tsx
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
  // Handlers propios de esta pantalla — el HTML original solo tenía
  // el botón "Asignar Grupo" y los enlaces "Gestionar" sin lógica
  // real (href="#"), así que se deja un handler mínimo equivalente.
  // ────────────────────────────────────────
  function handleAsignarGrupo(): void {
    console.log('Asignar Grupo');
  }

  function handleGestionarGrupo(groupId: string): void {
    console.log('Gestionar grupo', groupId);
    onNavigate?.('Asignacionestatus');
  }

  function handleNotificationsClick(): void {
    console.log('Notificaciones');
  }

  function handleInstitutionLogoClick(): void {
    console.log('Logo institucional');
  }

  // Clases dinámicas del sidebar y overlay — idéntico a InicioMaestro.tsx
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
      {/* Overlay for mobile drawer — Menú Base Oficial */}
      <div
        className={overlayClassName}
        id="sidebar-overlay"
        ref={overlayRef}
        onClick={closeSidebar}
      />

      {/* SideNavBar — Menú Base Oficial (idéntico a InicioMaestro.tsx) */}
      <aside className={sidebarClassName} id="sidebar" ref={sidebarRef}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo">
              <img
                alt="Logo SCTech"
                className="sidebar-brand-logo-img"
                src={SCTechlogo}
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
            <p className="teacher-card-greeting">Bienvenida Maestro</p>
            <div className="teacher-card-avatar">
              <img
                alt="Andrew mike"
                className="teacher-card-avatar-img"
                src={foto_maestro}
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
            className="nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('InicioMaestro');
            }}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="nav-item-label">Inicio</span>
          </a>
          <a
            className="nav-item nav-item--active"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('Clasespantalla');
            }}
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="nav-item-label">Mis Clases</span>
          </a>
          <a
            className="nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('GenerarReporteM');
            }}
          >
            <span className="material-symbols-outlined">assessment</span>
            <span className="nav-item-label">Generar reporte</span>
          </a>
          <a
            className="nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('HistorialReportesM');
            }}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="nav-item-label">Historial de reportes</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <a
            className="nav-item nav-item--logout"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('login');
            }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* TopAppBar — Menú Base Oficial */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              id="menu-toggle"
              onClick={handleMenuToggleClick}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="topbar-title">Mis Grupos</h1>
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
          {/* Header de la sección "Mis Grupos" */}
          <header className="section-header">
            <div>
              <h1 className="section-title">Mis Grupos</h1>
              <p className="section-subtitle">
                <span className="material-symbols-outlined section-subtitle-icon">
                  calendar_today
                </span>
                Ciclo Escolar 2024-1 • Periodo Actual
              </p>
            </div>
            <div className="section-header-actions">
              <button className="btn-asignar-grupo" onClick={handleAsignarGrupo}>
                <span className="material-symbols-outlined">group_add</span>
                Asignar Grupo
              </button>
            </div>
          </header>

          {/* Cuadrícula de tarjetas de grupos */}
          <div className="groups-grid">
            {GROUPS.map((group) => (
              <div className="group-card" key={group.id}>
                <div className="group-card-header">
                  <div>
                    <span className="group-code-chip">{group.code}</span>
                    <h3 className="group-title">{group.title}</h3>
                  </div>
                  <span className="group-status-chip">
                    <span className="group-status-dot" />
                    ACTIVO
                  </span>
                </div>

                <div className="group-card-stats">
                  <div className="group-stat">
                    <span className="material-symbols-outlined group-stat-icon">
                      group
                    </span>
                    <span className="group-stat-text">
                      {group.studentsCount} alumnos
                    </span>
                  </div>
                  <div className="group-stat">
                    <span className="material-symbols-outlined group-stat-icon">
                      star
                    </span>
                    <span className="group-stat-text">Prom. {group.average}</span>
                  </div>
                </div>

                <div className="group-card-footer">
                  <a
                    className="link-gestionar"
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      handleGestionarGrupo(group.id);
                    }}
                  >
                    Gestionar
                    <span className="material-symbols-outlined link-gestionar-icon">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Panel de resumen inferior con estadísticas */}
          <footer className="summary-footer">
            <div className="summary-item">
              <div className="summary-icon-circle">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div>
                <p className="summary-label">Total de Alumnos</p>
                <p className="summary-value">146</p>
              </div>
            </div>

            <div className="summary-item summary-item--bordered">
              <div className="summary-icon-circle">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  fact_check
                </span>
              </div>
              <div>
                <p className="summary-label">Grupos Activos</p>
                <p className="summary-value">4</p>
              </div>
            </div>

            <div className="summary-item">
              <div className="summary-icon-circle">
                <span className="material-symbols-outlined">trending_up</span>
              </div>
              <div>
                <p className="summary-label">Promedio Grupal</p>
                <p className="summary-value">8.4</p>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}