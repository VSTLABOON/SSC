import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import '../History.css';

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

const Icon = ({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`material-symbols-outlined ${className}`.trim()} style={style}>{name}</span>
);

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

export default function HistorialTutelado() {
  const { session, nombre } = useAuth();
  const [dbReports, setDbReports] = useState<IncidentFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all');
  const [activeChildId, setActiveChildId] = useState<string>(() => localStorage.getItem('ssc_selected_child_id') || '');
  const [enteradosMap, setEnteradosMap] = useState<Record<string, { tutor: string; fecha: string }>>({});

  // Cargar acuses de enterado guardados
  const loadEnterados = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ssc_enterados_tutor') || '{}');
      setEnteradosMap(saved);
    } catch (e) {
      console.warn('Error al cargar acuses de enterado:', e);
    }
  }, []);

  useEffect(() => {
    loadEnterados();
  }, [loadEnterados]);

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
        const { data: linkRows } = await supabase
          .from('padres_alumnos')
          .select('alumno_id')
          .eq('padre_id', session!.user!.id);

        if (!linkRows || linkRows.length === 0) {
          setDbReports([]);
          setLoading(false);
          return;
        }

        const selectedId = activeChildId || localStorage.getItem('ssc_selected_child_id');
        const matched = linkRows.find(r => r.alumno_id === selectedId);
        const targetStudentId = matched ? matched.alumno_id : linkRows[0].alumno_id;

        const data = await getIncidenciasDelAlumno(targetStudentId);
        setDbReports(data as unknown as IncidentFromDB[]);
      } catch (err) {
        console.error('Error al cargar historial de reportes del tutelado:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, [session, activeChildId]);

  function handleConfirmarEnterado(reportId: string) {
    const tutorNombre = nombre || 'Tutor Legal';
    const fechaHora = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const updated = {
      ...enteradosMap,
      [reportId]: { tutor: tutorNombre, fecha: fechaHora },
    };
    setEnteradosMap(updated);
    try {
      localStorage.setItem('ssc_enterados_tutor', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error al guardar acuse de enterado:', e);
    }
  }

  const reports: ProcessedReport[] = useMemo(() => {
    return dbReports.map((r) => {
      const catRaw = r.categorias_incidencia;
      const catName = catRaw?.nombre || 'Observación Conductual';
      const color = catRaw?.color_semaforo || 'verde';

      let filterGroup: ProcessedReport['filterGroup'] = 'negative';
      let category = 'conducta';

      const lower = catName.toLowerCase();
      if (lower.includes('falta') || lower.includes('inasistencia')) {
        category = 'inasistencia';
        filterGroup = 'negative';
      } else if (r.impacto_puntos > 0 || color === 'verde') {
        category = 'participacion';
        filterGroup = 'positive';
      } else if (color === 'naranja') {
        filterGroup = 'warning';
      } else {
        filterGroup = 'negative';
      }

      return {
        id: r.id,
        date: r.created_at,
        dateGroupLabel: formatDateGroup(r.created_at),
        category,
        categoryLabel: catName,
        description: r.descripcion || 'Sin descripción detallada.',
        impact: r.impacto_puntos,
        status: 'registrado',
        statusLabel: 'Registrado en Bitácora',
        filterGroup,
      };
    });
  }, [dbReports]);

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (incidentFilter === 'all') return true;
      return r.filterGroup === incidentFilter;
    });
  }, [reports, incidentFilter]);

  const groupedReports = useMemo(() => {
    const groups: { [key: string]: ProcessedReport[] } = {};
    filteredReports.forEach((r) => {
      if (!groups[r.dateGroupLabel]) {
        groups[r.dateGroupLabel] = [];
      }
      groups[r.dateGroupLabel].push(r);
    });
    return groups;
  }, [filteredReports]);

  return (
    <div className="history-page animate-fade-in">
      <div className="history-container">
        {/* Encabezado */}
        <header className="history-header">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#1e40af', padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>
              <Icon name="family_restroom" style={{ fontSize: '14px' }} />
              Expediente Escolar del Tutor
            </div>
            <h1 className="history-title">Historial de Reportes y Acuses</h1>
            <p className="history-subtitle">
              Consulta las observaciones registradas por el personal docente y confirma de enterado oficial.
            </p>
          </div>
        </header>

        {/* Filtros */}
        <div className="history-filters-card">
          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${incidentFilter === 'all' ? 'filter-pill--active' : ''}`}
              onClick={() => setIncidentFilter('all')}
            >
              Todos ({reports.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${incidentFilter === 'positive' ? 'filter-pill--active' : ''}`}
              onClick={() => setIncidentFilter('positive')}
            >
              Méritos y Reconocimientos ({reports.filter(r => r.filterGroup === 'positive').length})
            </button>
            <button
              type="button"
              className={`filter-pill ${incidentFilter === 'warning' ? 'filter-pill--active' : ''}`}
              onClick={() => setIncidentFilter('warning')}
            >
              Observaciones Preventivas ({reports.filter(r => r.filterGroup === 'warning').length})
            </button>
            <button
              type="button"
              className={`filter-pill ${incidentFilter === 'negative' ? 'filter-pill--active' : ''}`}
              onClick={() => setIncidentFilter('negative')}
            >
              Reportes Críticos ({reports.filter(r => r.filterGroup === 'negative').length})
            </button>
          </div>
        </div>

        {/* Lista de Reportes Agrupados */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Cargando bitácora disciplinaria...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div style={{ background: 'var(--color-bg-card, #ffffff)', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
            <Icon name="verified" style={{ fontSize: '48px', color: '#10b981', marginBottom: '8px' }} />
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--color-text-main, #0f172a)' }}>Sin registros en esta categoría</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-sub, #64748b)' }}>No se encontraron reportes con el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="history-groups-list">
            {Object.entries(groupedReports).map(([dateLabel, items]) => (
              <div key={dateLabel} className="history-group">
                <h3 className="history-group-date">{dateLabel}</h3>
                <div className="history-table-card">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Fecha</th>
                        <th style={{ width: '180px' }}>Motivo</th>
                        <th>Descripción</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Puntos</th>
                        <th style={{ width: '200px', textAlign: 'center' }}>Acuse de Enterado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => {
                        const enterado = enteradosMap[r.id];
                        const isPositive = r.impact > 0;
                        return (
                          <tr key={r.id}>
                            <td style={{ fontSize: '12px', color: 'var(--color-text-sub, #64748b)' }}>
                              {formatDateShort(r.date)}
                            </td>
                            <td>
                              <span className={`badge ${isPositive ? 'badge--secondary' : r.filterGroup === 'warning' ? 'badge--amber' : 'badge--error'}`}>
                                {r.categoryLabel}
                              </span>
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--color-text-main, #334155)', lineHeight: 1.4 }}>
                              {r.description}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', color: isPositive ? '#16a34a' : '#dc2626' }}>
                              {isPositive ? `+${r.impact}` : r.impact} pts
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {enterado ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                                  <Icon name="check_circle" style={{ fontSize: '14px', color: '#16a34a' }} />
                                  <span>Enterado ({enterado.fecha})</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmarEnterado(r.id)}
                                  style={{
                                    background: '#204785',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '5px 12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(32,71,133,0.2)',
                                  }}
                                  title="Confirmar que ha leído y está enterado de esta incidencia escolar"
                                >
                                  <Icon name="draw" style={{ fontSize: '14px' }} />
                                  Confirmar Enterado
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
