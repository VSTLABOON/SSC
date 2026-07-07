import { useEffect, useState } from 'react';
import type { ActivityCategory, BehaviorLevel } from '../Data/mockData';
import {
  attendance,
  behaviorStatus,
  complianceHistory,
  navItems,
  recentActivity,
  studentInfo,
  upcomingNotice,
} from '../Data/mockData';
import './Home.css';

// ---------------------------------------------------------------------------
// Tipos e Interfaces Locales para el tipado estricto de bucles
// ---------------------------------------------------------------------------
interface NavItem {
  id: string;
  icon: string;
  label: string;
}

interface ComplianceItem {
  month: string;
  status: 'optimo' | 'riesgo';
  value: number;
}

interface ActivityRecord {
  date: string;
  category: ActivityCategory;
  categoryLabel: string;
  description: string;
  impact: number;
}

// ---------------------------------------------------------------------------
// Ícono (Material Symbols Outlined cargado vía Google Fonts en Home.css).
// Se usa como ligadura tipográfica, igual que en el diseño original.
// ---------------------------------------------------------------------------

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

// ---------------------------------------------------------------------------
// Temas visuales según el nivel del semáforo conductual.
// ---------------------------------------------------------------------------

const SEMAPHORE_THEME: Record<
  BehaviorLevel,
  { icon: string; panelClass: string; circleClass: string; labelClass: string; sublabelClass: string }
> = {
  green: {
    icon: 'check_circle',
    panelClass: 'semaphore-panel semaphore-panel--green',
    circleClass: 'semaphore-circle semaphore-circle--green',
    labelClass: 'semaphore-label semaphore-label--green',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--green',
  },
  yellow: {
    icon: 'warning',
    panelClass: 'semaphore-panel semaphore-panel--yellow',
    circleClass: 'semaphore-circle semaphore-circle--yellow',
    labelClass: 'semaphore-label semaphore-label--yellow',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--yellow',
  },
  red: {
    icon: 'error',
    panelClass: 'semaphore-panel semaphore-panel--red',
    circleClass: 'semaphore-circle semaphore-circle--red',
    labelClass: 'semaphore-label semaphore-label--red',
    sublabelClass: 'semaphore-sublabel semaphore-sublabel--red',
  },
};

// ---------------------------------------------------------------------------
// Estilos de las insignias y el color de impacto en la tabla de actividad.
// ---------------------------------------------------------------------------

const ACTIVITY_STYLES: Record<ActivityCategory, { badgeClass: string; impactClass: string }> = {
  inasistencia: { badgeClass: 'badge badge--error', impactClass: 'impact impact--negative-strong' },
  participacion: { badgeClass: 'badge badge--secondary', impactClass: 'impact impact--positive' },
  conducta: { badgeClass: 'badge badge--amber', impactClass: 'impact impact--negative-mild' },
};

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface HomeProps {
  /** id del ítem de navegación activo */
  activeNavId?: string;

  /** Navegación entre pantallas */
  onNavigate?: (screen: string) => void;

  onLogout?: () => void;
  onDownloadReport?: () => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const Home = ({ activeNavId = 'inicio', onNavigate, onLogout, onDownloadReport,}: HomeProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartAnimated, setChartAnimated] = useState(false);

  // Animación de entrada de las barras del historial (igual que el script original).
  useEffect(() => {
    const timer = setTimeout(() => setChartAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Bloquea el scroll del body mientras el sidebar móvil está abierto.
  useEffect(() => {
    document.body.classList.toggle('no-scroll', isSidebarOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleDownloadReport = () => {
    console.log('Mock: descargar reporte PDF');
    onDownloadReport?.();
  };

  const handleLogout = () => {
    console.log('Mock: cerrar sesión');
    onLogout?.();
  };

  const theme = SEMAPHORE_THEME[behaviorStatus.level as BehaviorLevel];

  return (
    <div className="home-page">
      {/* Overlay del sidebar en móvil */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <nav className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <Icon name="school" className="sidebar-brand-icon" />
          <span className="sidebar-brand-name">CONALEP</span>
        </div>

       <div className="sidebar-nav">
        {navItems.map((item: NavItem) => (
         <a
        key={item.id}
       href="#"
       className={`sidebar-link ${
        activeNavId === item.id ? 'sidebar-link--active' : ''
      }`}
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.(item.id);
        closeSidebar();
      }}
    >
      <Icon name={item.icon} />
      <span>{item.label}</span>
       </a>
         ))}
      </div>

        <div className="sidebar-footer">
          <a
            href="#"
            className="sidebar-logout"
            onClick={(event) => {
              event.preventDefault();
              handleLogout();
            }}
          >
            <Icon name="logout" />
            <span>Cerrar Sesión</span>
          </a>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="home-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Abrir menú de navegación"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              <Icon name="menu" />
            </button>
            <h1 className="topbar-title">CONALEP Gestión Conductual</h1>
          </div>
        </header>

        <main className="page-canvas">
          {/* Hero */}
          <div className="hero">
            <div className="hero-text">
              <h2 className="hero-greeting">
                <span className="hero-greeting-light">¡Bienvenido,</span>
                <span className="hero-greeting-bold">{studentInfo.name}!</span>
              </h2>
              <p className="hero-subtitle">
                Matrícula: {studentInfo.enrollment} &nbsp;&nbsp; {studentInfo.group}
              </p>
            </div>
            <div className="hero-actions">
              <button type="button" className="btn-download" onClick={handleDownloadReport}>
                <Icon name="download" />
                <span className="btn-download-label-full">Descargar Reporte PDF</span>
                <span className="btn-download-label-short">Reporte</span>
              </button>
              <div className="cycle-badge">
                <Icon name="verified_user" className="cycle-badge-icon" />
                <span>{studentInfo.schoolCycle}</span>
              </div>
            </div>
          </div>

          {/* Bento grid */}
          <div className="dashboard-grid">
            {/* 1. Semáforo conductual */}
            <section className="card card-semaforo">
              <div className="card-header">
                <h3 className="card-title">Estado Conductual</h3>
                <span className="pill pill--neutral">Semáforo Actual</span>
              </div>
              <div className={theme.panelClass}>
                <div className={theme.circleClass}>
                  <Icon name={theme.icon} className="semaphore-icon" />
                </div>
                <div className="semaphore-text">
                  <span className={theme.labelClass}>{behaviorStatus.label}</span>
                  <span className={theme.sublabelClass}>{behaviorStatus.sublabel}</span>
                </div>
              </div>
              <div className="info-box">
                <Icon name="info" className="info-box-icon" />
                <p>{behaviorStatus.description}</p>
              </div>
            </section>

            {/* 2. Historial de cumplimiento */}
            <section className="card card-historial">
              <div className="card-header card-header--wrap">
                <h3 className="card-title">Historial de Cumplimiento</h3>
                <div className="legend">
                  <div className="legend-item">
                    <span className="legend-dot legend-dot--primary" />
                    <span>Óptimo</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot legend-dot--amber" />
                    <span>Riesgo</span>
                  </div>
                </div>
              </div>
              <div className="chart">
                <div className="chart-gridlines" aria-hidden="true">
                  <div className="chart-gridline">
                    <span>100%</span>
                  </div>
                  <div className="chart-gridline">
                    <span>50%</span>
                  </div>
                  <div className="chart-gridline chart-gridline--last">
                    <span>0%</span>
                  </div>
                </div>
                <div className="chart-bars">
                  {complianceHistory.map((item: ComplianceItem) => (
                    <div className="chart-bar-col" key={item.month}>
                      <div
                        className={`chart-bar ${
                          item.status === 'optimo' ? 'chart-bar--primary' : 'chart-bar--amber'
                        }`}
                        style={{ height: chartAnimated ? `${item.value}%` : '0%' }}
                      />
                      <span className="chart-bar-label">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. Asistencia */}
            <section className="card card-asistencia">
              <div className="card-icon-title">
                <div className="card-icon">
                  <Icon name="calendar_today" />
                </div>
                <h3 className="card-title">Asistencia</h3>
              </div>
              <div className="attendance-value">
                <span className="attendance-percentage">{attendance.percentage}%</span>
                <span className="attendance-label">Promedio Mensual</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${attendance.percentage}%` }} />
              </div>
              <p className="card-note">{attendance.note}</p>
            </section>

            {/* 4. Aviso próximo */}
            <section className="card card-aviso">
              <div>
                <h3 className="card-title card-title--inverse">{upcomingNotice.title}</h3>
                <p className="notice-description">{upcomingNotice.description}</p>
              </div>
              <div className="notice-date">
                <Icon name="calendar_month" />
                <span>{upcomingNotice.date}</span>
              </div>
            </section>

            {/* 5. Actividad reciente */}
            <section className="card card-actividad">
              <h3 className="card-title">Actividad Reciente</h3>
              <div className="table-wrapper custom-scrollbar">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Descripción</th>
                      <th className="text-right">Impacto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((record: ActivityRecord, index: number) => {
                      const styles = ACTIVITY_STYLES[record.category];
                      return (
                        <tr key={`${record.date}-${index}`}>
                          <td className="cell-date">{record.date}</td>
                          <td>
                            <span className={styles.badgeClass}>{record.categoryLabel}</span>
                          </td>
                          <td className="cell-description">{record.description}</td>
                          <td className={`text-right ${styles.impactClass}`}>
                            {record.impact > 0 ? `+${record.impact}` : record.impact} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>

        <footer className="home-footer">
          <p>© 2026 CONALEP - Sistema de Gestión de Conducta Estudiantil</p>
        </footer>
      </div>
    </div>
  );
};

export default Home;