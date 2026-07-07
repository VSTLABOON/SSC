// History.tsx — Historial de Reportes | Portal Académico
//
// NOTA DE INTEGRACIÓN DEL MENÚ:
// El sidebar/navegación de este archivo usa el "Menú Base Oficial"
// extraído de Home.tsx: misma estructura JSX, clases CSS, animaciones,
// estados hover/activo y lógica de apertura/cierre (estado + overlay)
// que en Home. La única diferencia permitida es el ítem de navegación
// activo (activeNavId="historial").
//
// El resto del contenido (stats, tabla, banner) fue convertido de
// HTML/Tailwind a JSX + CSS propio, conservando el diseño y las
// animaciones originales, y agregando:
// - Responsive básico para stats y tabla en móvil.
// - Filtrado real (tipo de incidencia + periodo de tiempo) vía useState.
//
// NOTA DE NAVEGACIÓN GLOBAL:
// Esta pantalla ya exponía activeNavId / onNavigate / onLogout con el
// mismo contrato usado en el resto de las pantallas (Home, Profile,
// Schedule), por lo que no requirió cambios de comportamiento. Se
// mantiene además onDownloadReport como prop opcional adicional,
// ajena al flujo de navegación (solo controla el botón "Descargar PDF").

import { Fragment, useEffect, useMemo, useState } from 'react';
import './History.css';

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------
interface NavItem {
  id: string;
  icon: string;
  label: string;
}

type IncidentCategory = 'participacion' | 'inasistencia' | 'conducta';
type IncidentFilter = 'all' | 'positive' | 'warning' | 'negative';
type TimeFilter = 'all' | 'today' | 'week' | 'month';
type StatusKind = 'registrado' | 'revision' | 'resuelto';

interface ReportRecord {
  id: string;
  date: string;
  dateGroupLabel: string;
  category: IncidentCategory;
  categoryLabel: string;
  description: string;
  impact: number;
  status: StatusKind;
  statusLabel: string;
  /** Filtro segmentado al que pertenece este registro (verde / amarillo / rojo) */
  filterGroup: 'positive' | 'warning' | 'negative';
}

// ---------------------------------------------------------------------
// Contrato de navegación global (idéntico al usado en Home/Profile/Schedule)
// ---------------------------------------------------------------------
interface ScreenProps {
  activeNavId?: string;
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
}

// ---------------------------------------------------------------------
// Navegación (Menú Base Oficial — idéntico a Home/Profile/Schedule)
// ---------------------------------------------------------------------
const navItems: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Inicio' },
  { id: 'profile', icon: 'person', label: 'Perfil' },
  { id: 'schedule', icon: 'schedule', label: 'Horario' },
  { id: 'history', icon: 'assignment_late', label: 'Historial de Reportes' },
];

const Icon = ({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) => (
  <span
    className={`material-symbols-outlined ${className}`.trim()}
    style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
  >
    {name}
  </span>
);

// ---------------------------------------------------------------------
// Datos de incidencias (estáticos, equivalentes a las filas del HTML)
// ---------------------------------------------------------------------
const REPORTS: ReportRecord[] = [
  {
    id: 'r1',
    date: '24 Oct 2023',
    dateGroupLabel: '24 de Octubre de 2023',
    category: 'participacion',
    categoryLabel: 'PARTICIPACIÓN',
    description: 'Destacada intervención en el foro de ética profesional.',
    impact: 10,
    status: 'registrado',
    statusLabel: 'Registrado',
    filterGroup: 'positive',
  },
  {
    id: 'r2',
    date: '20 Oct 2023',
    dateGroupLabel: '20 de Octubre de 2023',
    category: 'inasistencia',
    categoryLabel: 'INASISTENCIA',
    description: 'Falta injustificada a la sesión de laboratorio.',
    impact: -5,
    status: 'revision',
    statusLabel: 'En Revisión',
    filterGroup: 'negative',
  },
  {
    id: 'r3',
    date: '15 Oct 2023',
    dateGroupLabel: '15 de Octubre de 2023',
    category: 'conducta',
    categoryLabel: 'CONDUCTA',
    description: 'Uso de dispositivos no autorizados en examen.',
    impact: -2,
    status: 'resuelto',
    statusLabel: 'Resuelto',
    filterGroup: 'warning',
  },
  {
    id: 'r4',
    date: '10 Oct 2023',
    dateGroupLabel: '10 de Octubre de 2023',
    category: 'participacion',
    categoryLabel: 'PARTICIPACIÓN',
    description: 'Apoyo voluntario en la organización del congreso.',
    impact: 5,
    status: 'registrado',
    statusLabel: 'Registrado',
    filterGroup: 'positive',
  },
];

// Mapa de estilos por categoría (badge) — separa presentación de datos
const CATEGORY_BADGE_CLASS: Record<IncidentCategory, string> = {
  participacion: 'badge badge--secondary',
  inasistencia: 'badge badge--error',
  conducta: 'badge badge--neutral',
};

const IMPACT_CLASS: Record<'positive' | 'negative', string> = {
  positive: 'impact impact--positive',
  negative: 'impact impact--negative',
};

const STATUS_DOT_CLASS: Record<StatusKind, string> = {
  registrado: 'status-dot status-dot--primary',
  revision: 'status-dot status-dot--pending',
  resuelto: 'status-dot status-dot--neutral',
};

const STATUS_TEXT_CLASS: Record<StatusKind, string> = {
  registrado: 'status-text status-text--primary',
  revision: 'status-text status-text--pending',
  resuelto: 'status-text status-text--neutral',
};

// Parseo simple de fecha en español ("24 Oct 2023") a Date, para el filtro de tiempo
const MONTHS_ES: Record<string, number> = {
  Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5,
  Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11,
};

function parseSpanishDate(value: string): Date | null {
  const parts = value.split(' ');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = MONTHS_ES[parts[1]];
  const year = Number(parts[2]);
  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) return null;
  return new Date(year, month, day);
}

// ---------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------
interface HistoryProps extends ScreenProps {
  /** Acción opcional del botón "Descargar PDF" (no forma parte de la navegación global) */
  onDownloadReport?: () => void;
}

export default function History({
  activeNavId = 'historial',
  onNavigate,
  onLogout,
  onDownloadReport,
}: HistoryProps) {

  // ────────────────────────────────────────
  // ESTADO DEL MENÚ — idéntico al patrón de Home.tsx
  // ────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const closeSidebar = () => setIsSidebarOpen(false);

  // Bloquea el scroll del body mientras el sidebar móvil está abierto
  // (idéntico al efecto de Home.tsx / Profile.tsx / Schedule.tsx)
  useEffect(() => {
    document.body.classList.toggle('no-scroll', isSidebarOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isSidebarOpen]);

  // ────────────────────────────────────────
  // ESTADO DE FILTROS — filtrado real (segmentado + tiempo)
  // ────────────────────────────────────────
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const handleLogout = () => {
    console.log('Mock: cerrar sesión');
    onLogout?.();
  };

  const handleDownload = () => {
    console.log('Mock: descargar reporte PDF');
    onDownloadReport?.();
  };

  // ────────────────────────────────────────
  // Filtrado de registros
  // ────────────────────────────────────────
  const filteredReports = useMemo(() => {
    const now = new Date();

    return REPORTS.filter((report) => {
      // Filtro por tipo de incidencia (segmentado)
      if (incidentFilter !== 'all' && report.filterGroup !== incidentFilter) {
        return false;
      }

      // Filtro por periodo de tiempo
      if (timeFilter !== 'all') {
        const reportDate = parseSpanishDate(report.date);
        if (!reportDate) return true;

        const diffMs = now.getTime() - reportDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (timeFilter === 'today' && diffDays > 1) return false;
        if (timeFilter === 'week' && diffDays > 7) return false;
        if (timeFilter === 'month' && diffDays > 31) return false;
      }

      return true;
    });
  }, [incidentFilter, timeFilter]);

  // Agrupa los registros filtrados por fecha, preservando el orden original
  const groupedReports = useMemo(() => {
    const groups: { label: string; items: ReportRecord[] }[] = [];
    filteredReports.forEach((report) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === report.dateGroupLabel) {
        lastGroup.items.push(report);
      } else {
        groups.push({ label: report.dateGroupLabel, items: [report] });
      }
    });
    return groups;
  }, [filteredReports]);

  // ────────────────────────────────────────
  // Estadísticas (derivadas de TODOS los registros, no de los filtrados,
  // para que el resumen siempre refleje el total real del periodo completo)
  // ────────────────────────────────────────
  const totalPoints = useMemo(
    () => REPORTS.reduce((sum, r) => sum + r.impact, 0),
    []
  );
  const positiveCount = useMemo(
    () => REPORTS.filter((r) => r.impact > 0).length,
    []
  );
  const negativeCount = useMemo(
    () => REPORTS.filter((r) => r.impact < 0).length,
    []
  );

  return (
    <div className="history-page">

      {/* ──────────────────────────────────────
          MENÚ BASE OFICIAL (extraído de Home.tsx)
          Overlay + Sidebar — estructura, clases y lógica
          idénticas a Home, sin alteraciones.
          ────────────────────────────────────── */}

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
          {navItems.map((item) => (
            <a
              key={item.id}
              href="#"
              className={`sidebar-link ${activeNavId === item.id ? 'sidebar-link--active' : ''}`}
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

      {/* ──────────────────────────────────────
          CONTENIDO PRINCIPAL
          ────────────────────────────────────── */}
      <div className="history-content">

        {/* Topbar — incluye botón hamburguesa del Menú Base Oficial */}
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
            <h2 className="topbar-title">Historial de Reportes</h2>
          </div>
        </header>

        <main className="page-canvas">

          {/* ──────────────────────────────────────
              STATS — Bento grid de estadísticas
              ────────────────────────────────────── */}
          <section className="stats-grid">
            <div className="stat-card stat-card--highlight">
              <div className="stat-card--highlight-glow" aria-hidden="true" />
              <div>
                <p className="stat-label">Balance total de puntos</p>
                <h3 className="stat-display">
                  {totalPoints > 0 ? `+${totalPoints}` : totalPoints} pts
                </h3>
              </div>
              <div className="stat-trend-chip">
                <Icon name="trending_up" className="stat-trend-icon" filled />
                <span>Incremento positivo</span>
              </div>
            </div>

            <div className="stat-card stat-card--simple">
              <div className="stat-icon-circle stat-icon-circle--positive">
                <Icon name="workspace_premium" className="stat-icon-circle-symbol" filled />
              </div>
              <div>
                <h3 className="stat-display stat-display--dark">{String(positiveCount).padStart(2, '0')}</h3>
                <p className="stat-sublabel">Reportes Positivos</p>
              </div>
            </div>

            <div className="stat-card stat-card--simple">
              <div className="stat-icon-circle stat-icon-circle--negative">
                <Icon name="error" className="stat-icon-circle-symbol" filled />
              </div>
              <div>
                <h3 className="stat-display stat-display--dark">{String(negativeCount).padStart(2, '0')}</h3>
                <p className="stat-sublabel">Reportes Negativos</p>
              </div>
            </div>
          </section>

          {/* ──────────────────────────────────────
              TABLA DE DATOS — Detalle de incidencias
              ────────────────────────────────────── */}
          <section className="table-section">
            <div className="table-section-header">
              <div className="table-section-titles">
                <h4 className="table-section-title">Detalle de Incidencias</h4>
                <p className="table-section-subtitle">Visualiza y filtra tus registros académicos</p>
              </div>

              <div className="table-filters">
                {/* Filtro segmentado por tipo */}
                <div className="segmented-filter" role="group" aria-label="Filtrar por tipo de incidencia">
                  <button
                    type="button"
                    className={`segmented-filter-btn segmented-filter-btn--all ${incidentFilter === 'all' ? 'segmented-filter-btn--active-all' : ''}`}
                    aria-pressed={incidentFilter === 'all'}
                    aria-label="Mostrar todos los registros"
                    onClick={() => setIncidentFilter('all')}
                  >
                    <Icon name="check" className="segmented-filter-icon" />
                  </button>
                  <button
                    type="button"
                    className={`segmented-filter-btn ${incidentFilter === 'warning' ? 'segmented-filter-btn--active' : ''}`}
                    aria-pressed={incidentFilter === 'warning'}
                    aria-label="Filtrar por conducta"
                    onClick={() => setIncidentFilter((prev) => (prev === 'warning' ? 'all' : 'warning'))}
                  >
                    <span className="segmented-filter-dot segmented-filter-dot--warning" />
                  </button>
                  <button
                    type="button"
                    className={`segmented-filter-btn ${incidentFilter === 'negative' ? 'segmented-filter-btn--active' : ''}`}
                    aria-pressed={incidentFilter === 'negative'}
                    aria-label="Filtrar por inasistencia"
                    onClick={() => setIncidentFilter((prev) => (prev === 'negative' ? 'all' : 'negative'))}
                  >
                    <span className="segmented-filter-dot segmented-filter-dot--negative" />
                  </button>
                </div>

                {/* Filtro por tiempo */}
                <select
                  className="time-filter-select"
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
                  aria-label="Filtrar por periodo de tiempo"
                >
                  <option value="all">Todo el tiempo</option>
                  <option value="today">Hoy</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mes</option>
                </select>

                <button type="button" className="btn-download-pdf" onClick={handleDownload}>
                  <Icon name="download" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Impacto</th>
                    <th>Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedReports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state-cell">
                        No hay registros para los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                  {groupedReports.map((group) => (
                    <Fragment key={`group-${group.label}`}>
                      <tr className="date-group-row">
                        <td colSpan={5}>{group.label}</td>
                      </tr>
                      {group.items.map((report) => (
                        <tr className="report-row" key={report.id}>
                          <td className="cell-date">{report.date}</td>
                          <td>
                            <span className={CATEGORY_BADGE_CLASS[report.category]}>
                              {report.categoryLabel}
                            </span>
                          </td>
                          <td className="cell-description">{report.description}</td>
                          <td className={IMPACT_CLASS[report.impact >= 0 ? 'positive' : 'negative']}>
                            {report.impact > 0 ? `+${report.impact}` : report.impact} pts
                          </td>
                          <td>
                            <div className="status-cell">
                              <span className={STATUS_DOT_CLASS[report.status]} />
                              <span className={STATUS_TEXT_CLASS[report.status]}>{report.statusLabel}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ──────────────────────────────────────
              BANNER INFORMATIVO
              ────────────────────────────────────── */}
          <div className="info-banner">
            <Icon name="info" className="info-banner-icon" />
            <p className="info-banner-text">
              Los reportes académicos se actualizan cada <span className="info-banner-highlight">24 horas</span>.
              Si detectas alguna inconsistencia, por favor contacta a Coordinación.
            </p>
          </div>

        </main>
      </div>
    </div>
  );
}