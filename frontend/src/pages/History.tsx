import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { getIncidenciasDelAlumno } from '../services/incidencias';
import { getPerfilAlumno } from '../services/alumnos';
import { exportHistorialBitacoraPDF } from '../services/pdfExportService';
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
  location: string;
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
  conducta: 'badge badge--amber',
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
  const { session, rol } = useAuth();
  const [dbReports, setDbReports] = useState<IncidentFromDB[]>([]);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [activeChildId, setActiveChildId] = useState<string>(() => localStorage.getItem('ssc_selected_child_id') || '');

  // Sincronización con el selector global de tutelados
  useEffect(() => {
    function handleChildChange(evt: Event) {
      const custom = evt as CustomEvent<{ childId: string }>;
      if (custom.detail?.childId) {
        setActiveChildId(custom.detail.childId);
      }
    }
    window.addEventListener('ssc_child_change', handleChildChange);
    return () => window.removeEventListener('ssc_child_change', handleChildChange);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadReports() {
      try {
        setLoading(true);
        let studentId = session!.user!.id;

        if (rol === 'padre') {
          const { data: linkRows, error: linkError } = await supabase
            .from('padres_alumnos')
            .select('alumno_id')
            .eq('padre_id', session!.user!.id);

          if (linkError) throw linkError;
          if (!linkRows || linkRows.length === 0) {
            console.warn('El tutor no tiene alumnos vinculados.');
            setDbReports([]);
            setLoading(false);
            return;
          }

          const selectedId = activeChildId || localStorage.getItem('ssc_selected_child_id');
          const matched = linkRows.find(r => r.alumno_id === selectedId);
          studentId = matched ? matched.alumno_id : linkRows[0].alumno_id;
        }

        const [data, profileData] = await Promise.all([
          getIncidenciasDelAlumno(studentId),
          getPerfilAlumno(studentId).catch(() => null),
        ]);

        setDbReports(data as unknown as IncidentFromDB[]);
        setStudentProfile(profileData);
      } catch (err) {
        console.error('Error al cargar historial de reportes:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [session, rol, activeChildId]);

  // Procesamos incidencias del backend a las estructuras de la UI
  const reports: ProcessedReport[] = useMemo(() => {
    return dbReports.map((r) => {
      const catRaw = r.categorias_incidencia;
      const cat = (Array.isArray(catRaw) ? catRaw[0] : catRaw) as { nombre?: string; color_semaforo?: string } | null;
      const catName = cat?.nombre || 'Observación Conductual';
      const color = cat?.color_semaforo || (r.impacto_puntos > 0 ? 'verde' : 'naranja');
      
      let filterGroup: 'positive' | 'warning' | 'negative' = 'positive';
      if (r.impacto_puntos < 0) {
        filterGroup = color === 'rojo' || r.impacto_puntos <= -15 ? 'negative' : 'warning';
      }

      let categoryKey = 'general';
      const lowerCat = catName.toLowerCase();
      if (lowerCat.includes('inasistencia') || lowerCat.includes('falta') || lowerCat.includes('retardo')) {
        categoryKey = 'inasistencia';
      } else if (r.impacto_puntos > 0) {
        categoryKey = 'participacion';
      } else if (lowerCat.includes('conducta') || lowerCat.includes('respeto')) {
        categoryKey = 'conducta';
      }

      return {
        id: r.id,
        date: formatDateShort(r.created_at),
        dateGroupLabel: formatDateGroup(r.created_at),
        category: categoryKey,
        categoryLabel: catName.toUpperCase(),
        description: r.descripcion || 'Sin descripción adicional.',
        location: r.lugar || 'Aula',
        impact: r.impacto_puntos,
        status: 'registrado',
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

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      const userObj = studentProfile?.usuarios as { nombre?: string; apellido?: string } | undefined;
      const grupoObj = studentProfile?.grupos as { nombre?: string } | undefined;
      const nombreCompleto = userObj?.nombre ? `${userObj.nombre} ${userObj.apellido || ''}`.trim() : 'Estudiante CONALEP';
      const matricula = studentProfile?.matricula || '260000001';
      const grupoNombre = grupoObj?.nombre || 'INFO-201';

      const filtroTipoLabel =
        incidentFilter === 'positive'
          ? 'Solo Participaciones Positivas'
          : incidentFilter === 'warning'
          ? 'Solo Faltas Leves'
          : incidentFilter === 'negative'
          ? 'Solo Faltas Graves'
          : 'Todos los Registros';

      const filtroPeriodoLabel =
        timeFilter === 'today'
          ? 'Últimas 24 Horas'
          : timeFilter === 'week'
          ? 'Última Semana'
          : timeFilter === 'month'
          ? 'Último Mes'
          : 'Cualquier fecha';

      const puntosPositivos = filteredReports.filter(r => r.impact > 0).reduce((sum, r) => sum + r.impact, 0);
      const puntosNegativos = filteredReports.filter(r => r.impact < 0).reduce((sum, r) => sum + r.impact, 0);
      const totalPuntosExtracto = filteredReports.reduce((sum, r) => sum + r.impact, 0);

      await exportHistorialBitacoraPDF({
        nombreCompleto,
        matricula,
        grupoNombre,
        carreraNombre: 'Informática Técnica',
        filtroTipo: filtroTipoLabel,
        filtroPeriodo: filtroPeriodoLabel,
        totalPuntos: totalPuntosExtracto,
        puntosPositivos,
        puntosNegativos,
        items: filteredReports.map(r => ({
          date: r.date,
          categoryLabel: r.categoryLabel,
          description: r.description,
          location: r.location,
          impact: r.impact,
          statusLabel: r.statusLabel,
        })),
        generadoPor: rol === 'padre' ? 'Portal de Tutor / Historial' : 'Portal de Alumno / Historial',
      });
    } catch (err) {
      console.error('Error al exportar bitácora a PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
        <div className="spinner" style={{ margin: '0 auto 12px' }} />
        <p>Cargando historial de reportes...</p>
      </div>
    );
  }

  return (
    <div className="page-canvas" style={{ paddingBottom: '96px' }}>
      {/* Encabezado de página */}
      <header className="page-header animate-fade-in">
        <div className="page-header__left">
          <div className="page-header__icon-box">
            <span className="material-symbols-outlined page-header__icon">history_edu</span>
          </div>
          <div>
            <h2 className="page-header__title">Historial de Incidencias</h2>
            <p className="page-header__subtitle">Registro cronológico de méritos y observaciones de conducta</p>
          </div>
        </div>
        <div className="page-header__actions">
          <button
            className="btn-download"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            title="Descargar Historial Oficial en PDF"
          >
            <Icon name={isExporting ? 'hourglass_top' : 'download'} />
            {isExporting ? 'Generando PDF...' : 'Descargar Historial'}
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
            <Icon name="list_alt" style={{ fontSize: '16px' }} />
            Todos ({reports.length})
          </button>
          <button
            className={`segmented-btn ${incidentFilter === 'positive' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('positive')}
          >
            <Icon name="check_circle" style={{ fontSize: '16px', color: incidentFilter === 'positive' ? '#ffffff' : '#10b981' }} />
            Positivos ({positiveCount})
          </button>
          <button
            className={`segmented-btn ${incidentFilter === 'warning' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('warning')}
          >
            <Icon name="warning" style={{ fontSize: '16px', color: incidentFilter === 'warning' ? '#ffffff' : '#f59e0b' }} />
            Leves ({reports.filter(r => r.filterGroup === 'warning').length})
          </button>
          <button
            className={`segmented-btn ${incidentFilter === 'negative' ? 'segmented-btn--active' : ''}`}
            onClick={() => setIncidentFilter('negative')}
          >
            <Icon name="error" style={{ fontSize: '16px', color: incidentFilter === 'negative' ? '#ffffff' : '#ef4444' }} />
            Graves ({negativeCount})
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
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-sub, #64748b)', background: 'var(--color-bg-card, #ffffff)', borderRadius: '16px', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
            <Icon name="search_off" style={{ fontSize: '48px', marginBottom: '8px', color: '#94a3b8' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No se encontraron reportes con los filtros seleccionados.</p>
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
                        <th style={{ width: '180px' }}>Categoría</th>
                        <th>Descripción y Ubicación</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Impacto</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((report) => {
                        const badgeClass = CATEGORY_BADGE_CLASS[report.category] || CATEGORY_BADGE_CLASS.general;
                        const isPositive = report.impact > 0;
                        return (
                          <tr key={report.id}>
                            <td className="cell-category">
                              <span className={badgeClass}>{report.categoryLabel}</span>
                            </td>
                            <td className="cell-desc">
                              <p className="report-desc-text">{report.description}</p>
                              <span className="report-meta-text">
                                <Icon name="location_on" style={{ fontSize: '13px', verticalAlign: 'middle', marginRight: '2px' }} />
                                {report.location} • {report.date}
                              </span>
                            </td>
                            <td className="cell-impact" style={{ textAlign: 'center' }}>
                              <span className={isPositive ? 'impact impact--positive' : 'impact impact--negative-strong'} style={{ fontSize: '13px', fontWeight: 800 }}>
                                {isPositive ? `+${report.impact}` : report.impact} pts
                              </span>
                            </td>
                            <td className="cell-status" style={{ textAlign: 'center' }}>
                              <div className="status-cell" style={{ justifyContent: 'center' }}>
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