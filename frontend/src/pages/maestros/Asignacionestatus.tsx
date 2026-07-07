// AsignacionEstatus.tsx
import { useEffect, useState } from 'react';
import './AsignacionEstatus.css';
import SCTechlogo from '../../assets/imagenes/SCTechlogo.png';
import foto_maestro from '../../assets/imagenes/foto_maestro.jpg';

interface StatusOption {
  color: string;
  border: string; // 'none' o un color de borde
  title: string;
}

interface RowStatus {
  selectedIndex: number | null;
  color: string;
  border: string;
}

type AttendanceView = 'desktop' | 'mobile';

interface EditingTarget {
  view: AttendanceView;
  index: number;
}

type ToastState = 'hidden' | 'visible' | 'fading';

// ────────────────────────────────────────
// Props del componente — se agrega únicamente lo necesario para
// integrar esta pantalla al sistema de navegación (onNavigate) ya
// utilizado por el resto del proyecto, permitiendo que la flecha
// de regreso navegue hacia Clasespantalla.tsx.
// ────────────────────────────────────────
type MaestroScreen =
  | 'InicioMaestro'
  | 'Clasespantalla'
  | 'Asignacionestatus'
  | 'GenerarReporteM'
  | 'HistorialReportesM'
  | 'login';

interface AsignacionEstatusProps {
  onNavigate: (screen: MaestroScreen) => void;
}
// ────────────────────────────────────────
// Datos estáticos — equivalentes exactos a los arreglos de estatus y
// de alumnos (mockStudents) del script original.
// ────────────────────────────────────────
const STATUS_OPTIONS: StatusOption[] = [
  { color: '#22C55E', border: 'none', title: 'Participó' },
  { color: 'white', border: '#E2E8F0', title: 'Falta' },
  { color: '#EF4444', border: 'none', title: 'Problema' },
  { color: '#FACC15', border: 'none', title: 'Retardo' },
  { color: '#F97316', border: 'none', title: 'No trabajó' },
];

const mockStudents: string[] = [
  'Aguilar Ruiz, María Elena',
  'Campos Flores, Jorge',
  'García Méndez, Luis Alberto',
  'Hernández Ortiz, Sofía',
  'Jiménez López, Ricardo',
  'Martínez Cruz, Ana Victoria',
  'Mendoza Salas, Carlos',
  'Paredes Ruiz, Diego',
  'Ramírez Vega, Lucía',
  'Sánchez Téllez, Gabriel',
  'Torres Muñoz, Fernanda',
  'Vargas Rojas, Adrián',
  'Zepeda Franco, Isabella',
  'Acosta Solís, Roberto',
  'Barraza Ponce, Claudia',
  'Cabrera Valdés, Manuel',
  'Dávila Luna, Patricia',
  'Espinoza Herrera, Javier',
  'Fuentes Lara, Gabriela',
  'Gutiérrez Peña, Oscar',
  'Ibarra Soto, Mónica',
  'Juárez Delgado, Fernando',
  'Lara Mendoza, Beatriz',
  'Morales Ortiz, Raúl',
  'Navarro Silva, Elena',
  'Orozco Ruiz, Miguel',
  'Peralta Salas, Diana',
  'Quintana Marín, Hugo',
  'Reyes Castro, Silvia',
  'Salazar Vega, Antonio',
  'Trevino Soto, Lorena',
  'Urbina Ponce, David',
  'Vallejo Luna, Ximena',
  'Wong Torres, Alejandro',
  'Xicoténcatl Cruz, Sara',
  'Yáñez Herrera, Pablo',
  'Zúñiga Lara, Cristina',
  'Aburto Ruiz, Mateo',
];

function buildInitialStatuses(): RowStatus[] {
  return mockStudents.map(() => ({ selectedIndex: null, color: '', border: '' }));
}

function buildMatricula(index: number): string {
  return (2209140001 + index).toString();
}

export default function AsignacionEstatus({ onNavigate }: AsignacionEstatusProps) {
  // ────────────────────────────────────────
  // Estado del sidebar — equivalente exacto al de InicioMaestro.
  // ────────────────────────────────────────
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(true);
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);

  function openSidebar(): void {
    setIsSidebarHidden(false);
    setIsOverlayActive(true);
  }

  function closeSidebar(): void {
    setIsSidebarHidden(true);
    setIsOverlayActive(false);
  }

  function handleMenuToggleClick(event: React.MouseEvent): void {
    event.stopPropagation();
    if (isSidebarHidden) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  function handleNavItemClick(): void {
    if (window.innerWidth < 768) {
      closeSidebar();
    }
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

  function handleNotificationsClick(): void {
    console.log('Notificaciones');
  }

  function handleInstitutionLogoClick(): void {
    console.log('Logo institucional');
  }

  // ────────────────────────────────────────
  // Navegación de regreso — reutiliza el mismo sistema onNavigate
  // ya usado por el resto de las pantallas del proyecto para volver
  // a Clasespantalla.tsx.
  // ────────────────────────────────────────
  function handleBackClick(): void {
    onNavigate('Clasespantalla');
  }

  // ────────────────────────────────────────
  // Cierre de sesión — reutiliza el mismo sistema onNavigate para
  // navegar hacia la pantalla de login.
  // ────────────────────────────────────────
  function handleLogout(): void {
    onNavigate('login');
  }

  // ────────────────────────────────────────
  // Estado de asistencia — equivalente exacto a handleStatusClick /
  // openModal / closeModal / confirmStatusChange / showSuccessToast
  // del script original.
  // ────────────────────────────────────────
  const [desktopStatuses, setDesktopStatuses] = useState<RowStatus[]>(buildInitialStatuses);
  const [mobileStatuses, setMobileStatuses] = useState<RowStatus[]>(buildInitialStatuses);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [pendingOptionIndex, setPendingOptionIndex] = useState<number | null>(null);
  const [toastState, setToastState] = useState<ToastState>('hidden');

  // Replica la secuencia de setTimeout del script original:
  // se muestra de inmediato, en el siguiente tick comienza a
  // desvanecerse (transición de 0.66s) y a los 660ms se oculta.
  useEffect(() => {
    if (toastState !== 'visible') {
      return;
    }
    const fadeTimer = setTimeout(() => setToastState('fading'), 0);
    const hideTimer = setTimeout(() => setToastState('hidden'), 660);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [toastState]);

  function getStatuses(view: AttendanceView): RowStatus[] {
    return view === 'desktop' ? desktopStatuses : mobileStatuses;
  }

  function setStatuses(view: AttendanceView, next: RowStatus[]): void {
    if (view === 'desktop') {
      setDesktopStatuses(next);
    } else {
      setMobileStatuses(next);
    }
  }

  function handleStatusClick(view: AttendanceView, rowIndex: number, optionIndex: number): void {
    const statuses = getStatuses(view);
    const current = statuses[rowIndex];

    if (current.selectedIndex !== null) {
      // Ya hay un estatus activo en esta fila: el único botón
      // clicable es el activo, y al pulsarlo se abre el modal.
      setEditingTarget({ view, index: rowIndex });
      setPendingOptionIndex(null);
      setIsModalOpen(true);
      return;
    }

    const option = STATUS_OPTIONS[optionIndex];
    const next = [...statuses];
    next[rowIndex] = { selectedIndex: optionIndex, color: option.color, border: option.border };
    setStatuses(view, next);
  }

  function handleModalOptionSelect(optionIndex: number): void {
    setPendingOptionIndex(optionIndex);
  }

  function closeModal(): void {
    setIsModalOpen(false);
    setEditingTarget(null);
    setPendingOptionIndex(null);
  }

  function confirmStatusChange(): void {
    if (pendingOptionIndex === null || !editingTarget) {
      return;
    }
    const option = STATUS_OPTIONS[pendingOptionIndex];
    const { view, index } = editingTarget;
    const statuses = getStatuses(view);
    const current = statuses[index];
    const next = [...statuses];
    next[index] = { ...current, color: option.color, border: option.border };
    setStatuses(view, next);
    closeModal();
    setToastState('visible');
  }

  function handleGuardarAsistencia(): void {
    console.log('Guardar Asistencia');
  }

  // ────────────────────────────────────────
  // Clases dinámicas del sidebar y overlay.
  // ────────────────────────────────────────
  const sidebarClassName = ['sidebar', isSidebarHidden ? 'sidebar--mobile-hidden' : '']
    .filter(Boolean)
    .join(' ');

  const overlayClassName = ['sidebar-overlay', isOverlayActive ? 'sidebar-overlay--active' : '']
    .filter(Boolean)
    .join(' ');

  function renderStatusButtons(view: AttendanceView, rowIndex: number, withTitle: boolean) {
    const status = getStatuses(view)[rowIndex];
    return (
      <div className="status-container">
        {STATUS_OPTIONS.map((option, optionIndex) => {
          const isActiveSlot = status.selectedIndex === optionIndex;
          const isAnySelected = status.selectedIndex !== null;
          const displayColor = isActiveSlot ? status.color : option.color;
          const displayBorder = isActiveSlot ? status.border : option.border;
          const className = [
            'status-btn',
            isAnySelected && !isActiveSlot ? 'status-fade-out' : '',
            isActiveSlot ? 'status-active' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={option.title}
              type="button"
              className={className}
              style={{
                backgroundColor: displayColor,
                border: displayBorder !== 'none' ? `1px solid ${displayBorder}` : 'none',
              }}
              title={withTitle ? option.title : undefined}
              disabled={isAnySelected && !isActiveSlot}
              onClick={() => handleStatusClick(view, rowIndex, optionIndex)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="im-body">
      {/* Overlay for mobile drawer */}
      <div className={overlayClassName} id="sidebar-overlay" onClick={closeSidebar} />
    
      {/* SideNavBar — reutilización exacta de InicioMaestro */}
      <aside className={sidebarClassName} id="sidebar">
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
          <a className="nav-item" href="#" onClick={handleNavItemClick}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="nav-item-label">Inicio</span>
          </a>
          <a className="nav-item nav-item--active" href="#" onClick={handleNavItemClick}>
            <span className="material-symbols-outlined">groups</span>
            <span className="nav-item-label">Grupos</span>
          </a>
          <a className="nav-item" href="#" onClick={handleNavItemClick}>
            <span className="material-symbols-outlined">assessment</span>
            <span className="nav-item-label">Generar reporte</span>
          </a>
            <a className="nav-item" href="#" onClick={handleNavItemClick}>
            <span className="material-symbols-outlined">assessment</span>
            <span className="nav-item-label">Historial de reportes</span>
          </a>

        </nav>

        <div className="sidebar-footer">
          <a className="nav-item nav-item--logout" href="#" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            <span className="nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* TopAppBar — reutilización exacta de InicioMaestro */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" id="menu-toggle" onClick={handleMenuToggleClick}>
              <span className="material-symbols-outlined">menu</span>
            </button>
        <button
  type="button"
  className="regresar-a-grupos"
  onClick={handleBackClick}
>
  ← Regresar
</button>
            <h1 className="topbar-title">SOMA-505</h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-icon-group">
              <button className="icon-button" onClick={handleNotificationsClick} />
            </div>
            <div className="topbar-divider" />
            
            <div className="topbar-institution">
              <span className="topbar-institution-label">Plantel Puebla I</span>
              <img
                alt="Logo Institucional"
                className="topbar-institution-logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVN4tbYkPmVGUA7PiggmYiGSDi1vpBbCLGyR3yjxujoiVsb8az6OYz9kmbH1GmmTX9_Weg6fhNo1kse5BbZbXJKe03j-_v6ssJ--uGU89jcouUcr5lB6_TetGEee59J7cU4Ms6GbAJ9eDwArGKV8Xh9LG56EEyx9A0shJS5oqlj-8bPi7AI-IxPRE6TF-gqKT9bSBulPhnyEI5cSgFQ4b7rUSLZKsXI8XWoALTtM1qkDhOeh7nKqeKSQk8J7-jdD7_SDggbGWlKw0"
                onClick={handleInstitutionLogoClick}
              />
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <div className="content-canvas">
          {/* Header Section */}
          <section className="page-header">
            <div>
              <nav className="page-breadcrumb">
                <span>Mis Clases</span>
                <span className="material-symbols-outlined page-breadcrumb-separator">
                  chevron_right
                </span>
                <span className="page-breadcrumb-current">SOMA-505</span>
              </nav>

              {/* Fila de título con la flecha de regreso — corregida:
                  ahora navega hacia Clasespantalla.tsx mediante onNavigate,
                  el mismo sistema utilizado en el resto del proyecto. */}
              <div className="page-title-row">
                <button
                  type="button"
                  className="page-back-btn"
                  aria-label="Regresar"
                  onClick={handleBackClick}
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h2 className="page-title">Toma de Asistencia y Estatus</h2>
              </div>

              <p className="page-subtitle">
                Soporte y Mantenimiento de Equipos de Computo • 11 Junio 2026
              </p>
            </div>
            <div className="page-header-actions">
              <button className="btn-guardar" onClick={handleGuardarAsistencia}>
                <span className="material-symbols-outlined">save</span> Guardar Asistencia
              </button>
            </div>
          </section>

          {/* Search & Filter */}
          <div className="filter-bar">
            <div className="filter-search">
              <span className="material-symbols-outlined filter-search-icon">search</span>
              <input className="filter-search-input" placeholder="Buscar por nombre..." type="text" />
            </div>
            <div className="filter-legend">
              <div className="filter-legend-item">
                <span className="filter-legend-dot filter-legend-dot--participo" /> Participó
              </div>
              <div className="filter-legend-item">
                <span className="filter-legend-dot filter-legend-dot--falta" /> Falta
              </div>
              <div className="filter-legend-item">
                <span className="filter-legend-dot filter-legend-dot--problema" /> Problema
              </div>
              <div className="filter-legend-item">
                <span className="filter-legend-dot filter-legend-dot--retardo" /> Retardo
              </div>
              <div className="filter-legend-item">
                <span className="filter-legend-dot filter-legend-dot--no-trabajo" /> No trabajó
              </div>
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="attendance-card">
            {/* Header (Static) */}
            <div className="attendance-table-header-wrap">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th className="attendance-th attendance-th--matricula">Matrícula</th>
                    <th className="attendance-th">Nombre Completo</th>
                    <th className="attendance-th attendance-th--center">ESTATUS DE ALUMNOS</th>
                  </tr>
                </thead>
              </table>
            </div>

            {/* Scrollable Container */}
            <div className="attendance-scroll custom-scrollbar">
              {/* Desktop Table View */}
              <div className="attendance-table-body-wrap">
                <table className="attendance-table">
                  <tbody>
                    {mockStudents.map((name, index) => (
                      <tr className="attendance-row" key={`d${index}`}>
                        <td className="attendance-td attendance-td--matricula">
                          {buildMatricula(index)}
                        </td>
                        <td className="attendance-td attendance-td--name">{name}</td>
                        <td className="attendance-td attendance-td--status">
                          {renderStatusButtons('desktop', index, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List View */}
              <div className="attendance-mobile-list">
                {mockStudents.map((name, index) => (
                  <div className="attendance-mobile-row" key={`m${index}`}>
                    <div className="attendance-mobile-id-row">
                      <p className="attendance-mobile-id">{buildMatricula(index)}</p>
                    </div>
                    <h3 className="attendance-mobile-name">{name}</h3>
                    <div className="attendance-mobile-status-row">
                      <span className="attendance-mobile-status-label">Estatus:</span>
                      {renderStatusButtons('mobile', index, false)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Liquid Glass Modal */}
      {isModalOpen && (
        <div className="status-modal">
          <div className="status-modal-backdrop" onClick={closeModal} />
          <div className="glass-modal">
            <h3 className="glass-modal-title">¿A qué estatus deseas cambiar?</h3>
            <div className="modal-status-options">
              {STATUS_OPTIONS.map((option, optionIndex) => (
                <button
                  key={option.title}
                  type="button"
                  className={[
                    'modal-status-btn',
                    pendingOptionIndex === optionIndex ? 'modal-status-btn--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    backgroundColor: option.color,
                    border: option.border !== 'none' ? `1px solid ${option.border}` : 'none',
                  }}
                  title={option.title}
                  onClick={() => handleModalOptionSelect(optionIndex)}
                />
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn-confirm" onClick={confirmStatusChange}>
                Confirmar
              </button>
              <button className="btn-cancel" onClick={closeModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {toastState !== 'hidden' && (
        <div className={`success-toast ${toastState === 'fading' ? 'success-toast--fade-out' : ''}`}>
          <div className="success-toast-content">
            <span className="material-symbols-outlined">check_circle</span> OK
          </div>
        </div>
      )}
    </div>
  );
}