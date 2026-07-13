import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getIncidenciasDelAlumno } from '../services/incidencias';
import './History.css';

interface IncidentFromDB {
  id: string;
  descripcion: string;
  lugar: string;
  impacto_puntos: number;
  created_at: string;
  categorias_incidencia: {
    nombre: string;
    color_semaforo: string;
  } | null;
}

interface ProcessedReport {
  id: string;
  date: string;
  dateGroupLabel: string;
  category: string;
  categoryLabel: string;
  description: string;
  impact: number;
  status: 'registrado' | 'revision' | 'resuelto';
  statusLabel: string;
  filterGroup: 'positive' | 'warning' | 'negative';
}

type IncidentFilter = 'all' | 'positive' | 'warning' | 'negative';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

const Icon = ({ name, className = '', filled = false, style }: { name: string; className?: string; filled?: boolean; style?: React.CSSProperties }) => (
  <span
    className={`material-symbols-outlined ${className}`.trim()}
    style={{
      ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
      ...style
    }}
  >
    {name}
  </span>
);

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  inasistencia: 'badge badge--error',
  participacion: 'badge badge--secondary',
  conducta: 'badge badge--neutral',
  general: 'badge badge--neutral',
};

const STATUS_DOT_CLASS = {
  registrado: 'status-dot status-dot--primary',
  revision: 'status-dot status-dot--pending',
  resuelto: 'status-dot status-dot--neutral',
};

const STATUS_TEXT_CLASS = {
  registrado: 'status-text status-text--primary',
  revision: 'status-text status-text--pending',
  resuelto: 'status-text status-text--neutral',
};

function formatDateGroup(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function History() {
  const { session } = useAuth();
  const [dbReports, setDbReports] = useState<IncidentFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadReports() {
      try {
        const data = await getIncidenciasDelAlumno(session!.user!.id);
        setDbReports(data as unknown as IncidentFromDB[]);
      } catch (err) {
        console.error('Error al cargar historial de reportes:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [session]);

  // Procesamos incidencias del backend a las estructuras de la UI
  const reports: ProcessedReport[] = useMemo(() => {
    return dbReports.map((r) => {
      const catRaw = r.categorias_incidencia;
      const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { nombre?: string; color_semaforo?: string } | null;
      const catName = cat?.nombre || 'General';
      const color = cat?.color_semaforo || 'verde';
      
      let filterGroup: 'positive' | 'warning' | 'negative' = 'positive';
      if (r.impacto_puntos < 0) {
        filterGroup = color === 'rojo' ? 'negative' : 'warning';
      }

      let categoryKey = 'general';
      const lowerCat = catName.toLowerCase();
      if (lowerCat.includes('inasistencia') || lowerCat.includes('falta')) {
        categoryKey = 'inasistencia';
      } else if (r.impacto_puntos > 0) {
        categoryKey = 'participacion';
      } else if (lowerCat.includes('conducta')) {
        categoryKey = 'conducta';
      }

      return {
        id: r.id,
        date: formatDateShort(r.created_at),
        dateGroupLabel: formatDateGroup(r.created_at),
        category: categoryKey,
        categoryLabel: catName.toUpperCase(),
        description: r.descripcion,
        impact: r.impacto_puntos,
        status: 'registrado', // Por defecto en el prototipo
        statusLabel: 'Registrado',
        filterGroup,
      };
    });
  }, [dbReports]);

  // Filtrado
  const filteredReports = useMemo(() => {
    const now = new Date();

    return reports.filter((report) => {
      if (incidentFilter !== 'all' && report.filterGroup !== incidentFilter) {
        return false;
      }

      if (timeFilter !== 'all') {
        const reportDate = new Date(dbReports.find(r => r.id === report.id)?.created_at || '');
        if (!reportDate.getTime()) return true;

        const diffMs = now.getTime() - reportDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (timeFilter === 'today' && diffDays > 1) return false;
        if (timeFilter === 'week' && diffDays > 7) return false;
        if (timeFilter === 'month' && diffDays > 31) return false;
      }

      return true;
    });
  }, [reports, incidentFilter, timeFilter, dbReports]);

  // Agrupación por fecha
  const groupedReports = useMemo(() => {
    const groups: { label: string; items: ProcessedReport[] }[] = [];
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

  // Estadísticas del total
  const totalPoints = useMemo(() => reports.reduce((sum, r) => sum + r.impact, 0), [reports]);
  const positiveCount = useMemo(() => reports.filter((r) => r.impact > 0).length, [reports]);
  const negativeCount = useMemo(() => reports.filter((r) => r.impact < 0).length, [reports]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando historial de reportes...</div>;
  }

  return (
    <div className="history-canvas-only">
      {/* Encabezado de página */}
      <header className="page-header animate-fade-in">
        <div className="page-header__left">
          <div className="page-header__icon-box">
            <span className="material-symbols-outlined page-header__icon">assignment_late</span>
          </div>
          <div>
            <h2 className="page-header__title">Historial de Reportes</h2>
            <p className="page-header__subtitle">Registro completo de incidencias y participaciones</p>
          </div>
        </div>
        <div className="page-header__actions">
          <button className="btn-download" onClick={() => console.log('Mock: descargar reporte PDF')}>
            <Icon name="download" />
            Descargar Historial
          </button>
        </div>
      </header>

      {/* Resumen de estadísticas (Bento) */}
      <section className="stats-grid animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="stat-card">
          <div className="stat-card__icon-box stat-card__icon-box--primary">
            <Icon name="star" filled />
          </div>
          <div className="stat-card__info">
            <p className="stat-card__value">{totalPoints > 0 ? `+${totalPoints}` : totalPoints} pts</p>
            <p className="stat-card__label">Impacto Neto en Semáforo</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon-box stat-card__icon-box--secondary">
            <Icon name="thumb_up" filled />
          </div>
          <div className="stat-card__info">
            <p className="stat-card__value">{positiveCount}</p>
            <p className="stat-card__label">Participaciones Positivas</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon-box stat-card__icon-box--error">
            <Icon name="warning" filled />
          </div>
          <div className="stat-card__info">
            <p className="stat-card__value">{negativeCount}</p>
            <p className="stat-card__label">Reportes de Incidencia</p>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="filters-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="segmented-control">
          <button
            className={`segmented-btn ${incidentFilter === 'all' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('all')}
          >
            Todos
          </button>
          <button
            className={`segmented-btn ${incidentFilter === 'positive' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('positive')}
          >
            Positivos
          </button>
          <button
            className={`segmented-btn ${incidentFilter === 'warning' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('warning')}
          >
            Leves / Advertencias
          </button>
          <button
            className={`segmented-btn ${incidentFilter === 'negative' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('negative')}
          >
            Graves / Incidencias
          </button>
        </div>

        <div className="select-wrapper">
          <Icon name="filter_alt" className="select-icon" />
          <select
            className="filter-select"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          >
            <option value="all">Cualquier fecha</option>
            <option value="today">Últimas 24 horas</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>
      </section>

      {/* Tabla e Historial */}
      <section className="history-table-section animate-fade-in" style={{ animationDelay: '0.15s' }}>
        {groupedReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#5c5f60', background: '#ffffff', borderRadius: '8px' }}>
            <Icon name="search_off" style={{ fontSize: '48px', marginBottom: '8px' }} />
            <p>No se encontraron reportes con los filtros seleccionados.</p>
          </div>
        ) : (
          groupedReports.map((group) => (
            <div className="date-group" key={group.label}>
              <h3 className="date-group__title">{group.label}</h3>
              <div className="table-card">
                <div className="table-responsive">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Descripción / Acuerdos</th>
                        <th>Impacto</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((report) => {
                        const badgeClass = CATEGORY_BADGE_CLASS[report.category] || CATEGORY_BADGE_CLASS.general;
                        const impactClass = report.impact > 0 ? 'impact impact--positive' : 'impact impact--negative';
                        return (
                          <tr key={report.id}>
                            <td className="cell-category">
                              <span className={badgeClass}>{report.categoryLabel}</span>
                            </td>
                            <td className="cell-desc">
                              <p className="report-desc-text">{report.description}</p>
                              <span className="report-meta-text">Código: {report.id.substring(0, 8)}</span>
                            </td>
                            <td className="cell-impact">
                              <span className={impactClass}>
                                {report.impact > 0 ? `+${report.impact}` : report.impact} pts
                              </span>
                            </td>
                            <td className="cell-status">
                              <div className="status-cell">
                                <span className={STATUS_DOT_CLASS[report.status]} />
                                <span className={STATUS_TEXT_CLASS[report.status]}>{report.statusLabel}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}