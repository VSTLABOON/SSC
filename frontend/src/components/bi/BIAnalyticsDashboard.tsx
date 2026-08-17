import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  getBIKPIStats,
  getBITrend,
  getBICategories,
  getBIRiskStudents,
} from '../../services/bi';
import type {
  BIFilters,
  BIKPIStats,
  BITrendItem,
  BICategoryItem,
  BIRiskStudent,
} from '../../services/bi';

import { getPeriodoActivo } from '../../services/periodos';
import { getGeneracionesDisponibles, getGruposDePlantel, getGruposDeDocente } from '../../services/grupos';

import { BIFilterBar } from './BIFilterBar';
import { BIKpiCardSection } from './BIKpiCard';
import { BITrendChart } from './BITrendChart';
import { BICategoryChart } from './BICategoryChart';
import { BIRiskTable } from './BIRiskTable';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import { ExecutiveChartAgentModal } from './ExecutiveChartAgentModal';
import type { ChartAgentTarget } from './ExecutiveChartAgentModal';
import { generatePlantelExecutiveReport } from '../../services/bi_analytics_engine';
import type { PlantelExecutiveReport } from '../../services/bi_analytics_engine';
import './BIAnalytics.css';

interface BIAnalyticsDashboardProps {
  userRole?: 'directivo' | 'orientador' | 'docente';
  plantelId?: string;
}

export const BIAnalyticsDashboard: React.FC<BIAnalyticsDashboardProps> = ({
  userRole: propUserRole,
  plantelId: propPlantelId,
}) => {
  const { session, plantelId: authPlantelId, rol } = useAuth();
  const activePlantelId = propPlantelId || authPlantelId;
  const userRole = propUserRole || (rol as 'directivo' | 'orientador' | 'docente') || 'directivo';

  const [loading, setLoading] = useState(true);

  // Estados de Datos de BI
  const [kpis, setKpis] = useState<BIKPIStats | null>(null);
  const [trend, setTrend] = useState<BITrendItem[]>([]);
  const [categories, setCategories] = useState<BICategoryItem[]>([]);
  const [riskStudents, setRiskStudents] = useState<BIRiskStudent[]>([]);

  // Opciones dinámicas de filtros
  const [generaciones, setGeneraciones] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: string; nombre: string }>>([]);

  // Estado de Filtros
  const [filters, setFilters] = useState<BIFilters>({});

  // Estado del Modal Ejecutivo Directivo de Plantel
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [plantelReportData, setPlantelReportData] = useState<PlantelExecutiveReport | null>(null);

  // Estado del Agente IA Resumidor de Gráficas/KPIs
  const [agentTarget, setAgentTarget] = useState<ChartAgentTarget | null>(null);

  // 1. Inicialización de Filtros Opciones
  useEffect(() => {
    if (!activePlantelId) {
      setLoading(false);
      return;
    }

    async function initOptions() {
      try {
        setLoading(true);
        let pId: string | undefined;
        try {
          pId = await getPeriodoActivo(activePlantelId!);
        } catch {
          pId = undefined;
        }

        let gens: string[] = [];
        try {
          gens = await getGeneracionesDisponibles();
        } catch {
          gens = [];
        }
        setGeneraciones(gens);

        let groupList: Array<{ id: string; nombre: string }> = [];
        try {
          if (userRole === 'docente' && session?.user?.id) {
            const mGrupos = await getGruposDeDocente(session.user.id);
            const map = new Map<string, string>();
            mGrupos.forEach(c => map.set(c.grupoId, c.grupoNombre));
            groupList = Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
          } else {
            const pGrupos = await getGruposDePlantel(activePlantelId!);
            groupList = pGrupos.map(g => ({ id: g.id, nombre: g.nombre }));
          }
        } catch (err) {
          console.error('Error al cargar grupos:', err);
        }
        setGrupos(groupList);

        setFilters({
          periodoId: pId,
          generacion: undefined,
          grupoId: undefined,
          rangoTemporal: 'periodo',
        });
      } catch (err) {
        console.error('Error al inicializar opciones de filtros BI:', err);
      } finally {
        setLoading(false);
      }
    }

    initOptions();
  }, [activePlantelId, userRole, session]);

  // 2. Carga Principal de Datos
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [kpiRes, trendRes, catRes, riskRes] = await Promise.allSettled([
        getBIKPIStats(filters),
        getBITrend(filters),
        getBICategories(filters),
        getBIRiskStudents(filters),
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        setKpis(kpiRes.value);
      } else {
        setKpis({
          total_alumnos: 0,
          promedio_puntos: null,
          conteo_verde: 0,
          conteo_naranja: 0,
          conteo_rojo: 0,
          total_incidencias: 0,
        });
      }

      setTrend(trendRes.status === 'fulfilled' ? trendRes.value : []);
      setCategories(catRes.status === 'fulfilled' ? catRes.value : []);
      setRiskStudents(riskRes.status === 'fulfilled' ? riskRes.value : []);
    } catch (err) {
      console.error('Error al cargar datos del dashboard de BI:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (activePlantelId) {
      loadDashboardData();

      // 1. Suscripción WebSocket en Tiempo Real a las tablas operativas de Supabase
      const channel = supabase
        .channel('realtime-bi-analytics-suite')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'incidencias' },
          () => {
            loadDashboardData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'asistencias' },
          () => {
            loadDashboardData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'participaciones' },
          () => {
            loadDashboardData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alumnos' },
          () => {
            loadDashboardData();
          }
        )
        .subscribe();

      // 2. Escucha de eventos de mutación local inmediata en la misma pestaña / ventanas
      const handleDataChanged = () => {
        loadDashboardData();
      };
      window.addEventListener('ssc_data_changed', handleDataChanged);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('ssc_data_changed', handleDataChanged);
      };
    } else {
      setLoading(false);
    }
  }, [loadDashboardData, activePlantelId]);

  function handleOpenPlantelExecutiveReport() {
    if (!kpis) return;
    const report = generatePlantelExecutiveReport(
      'Puebla I',
      kpis.total_alumnos,
      kpis.promedio_puntos ?? 100,
      kpis.conteo_verde,
      kpis.conteo_naranja,
      kpis.conteo_rojo
    );
    setPlantelReportData(report);
    setExecModalOpen(true);
  }

  // Construir el contexto exhaustivo multi-dimensional para el Agente IA
  function buildFullDbContext() {
    return {
      _contexto_usuario_y_filtros: {
        rol_usuario: userRole,
        grupo_filtrado: grupos.find(g => g.id === filters.grupoId)?.nombre || 'Todos los Grupos del Plantel',
        generacion_filtrada: filters.generacion || 'Todas las Generaciones',
        ventana_temporal: filters.rangoTemporal === 'semana' ? 'Esta Semana' : filters.rangoTemporal === 'mes' ? 'Este Mes' : 'Ciclo Escolar Completo',
        severidad_filtrada: filters.severidad || 'Todas las Severidades',
      },
      _seccion_KPIs: {
        _descripcion: 'Indicadores globales calculados por fn_bi_get_kpis en PostgreSQL',
        total_alumnos: kpis?.total_alumnos ?? 0,
        promedio_isc: kpis?.promedio_puntos ?? 100,
        semaforo_verde: kpis?.conteo_verde ?? 0,
        semaforo_naranja: kpis?.conteo_naranja ?? 0,
        semaforo_rojo: kpis?.conteo_rojo ?? 0,
        total_incidencias_periodo: kpis?.total_incidencias ?? 0,
        pct_verde: kpis && kpis.total_alumnos > 0 ? Math.round((kpis.conteo_verde / kpis.total_alumnos) * 100) : 0,
        pct_naranja: kpis && kpis.total_alumnos > 0 ? Math.round((kpis.conteo_naranja / kpis.total_alumnos) * 100) : 0,
        pct_rojo: kpis && kpis.total_alumnos > 0 ? Math.round((kpis.conteo_rojo / kpis.total_alumnos) * 100) : 0,
      },
      _seccion_tendencia_temporal: {
        _descripcion: 'Evolución mes a mes de incidencias (fn_bi_get_trend)',
        registros: (trend || []).map(t => ({
          periodo: t.mes_nombre,
          verde: t.verde,
          naranja: t.naranja,
          rojo: t.rojo,
          total: t.total,
        })),
      },
      _seccion_categorias_frecuentes: {
        _descripcion: 'Desglose por categoría y severidad de incidencias (fn_bi_get_categories)',
        registros: (categories || []).map(c => ({
          categoria: c.categoria,
          severidad: c.severidad,
          total: c.total_incidencias,
        })),
      },
      _seccion_alumnos_riesgo: {
        _descripcion: 'Alumnos en atención prioritaria ordenados por Risk Score SQL (fn_bi_get_risk_students) - Datos Seudonimizados por LGPDPPSO',
        total_en_riesgo: (riskStudents || []).length,
        top_15: (riskStudents || []).slice(0, 15).map((s, idx) => ({
          identificador: `Estudiante #${idx + 1}`,
          grupo: s.grupo_nombre,
          semaforo: s.nivel_semaforo,
          puntos_isc: s.puntos_totales,
          incidencias: s.total_incidencias,
          risk_score: s.risk_score ?? null,
          risk_categoria: s.risk_categoria ?? null,
        })),
      },
    };
  }

  function handleKpiClick(type: 'kpi_isc' | 'kpi_semaforo' | 'kpi_incidencias' | 'kpi_riesgo') {
    if (!kpis) return;
    let title = '';
    let subtitle = '';

    if (type === 'kpi_isc') {
      title = 'Resumen Ejecutivo: Índice de Salud Conductual (ISC)';
      subtitle = `Promedio actual del conjunto: ${kpis.promedio_puntos ?? 100} / 100 pts.`;
    } else if (type === 'kpi_semaforo') {
      title = 'Resumen Ejecutivo: Distribución Semafórica';
      subtitle = `${kpis.conteo_verde} Verde, ${kpis.conteo_naranja} Naranja, ${kpis.conteo_rojo} Rojo (Total: ${kpis.total_alumnos} alumnos).`;
    } else if (type === 'kpi_incidencias') {
      title = 'Resumen Ejecutivo: Volumen Total de Incidencias';
      subtitle = `${kpis.total_incidencias} reportes registrados acumulados en el periodo.`;
    } else {
      title = 'Resumen Ejecutivo: Alumnos en Atención Prioritaria';
      subtitle = `${kpis.conteo_naranja + kpis.conteo_rojo} estudiantes registrados en Semáforo Naranja y Rojo.`;
    }

    setAgentTarget({
      type,
      title,
      subtitle,
      dataSummary: buildFullDbContext(),
    });
  }

  function handleTrendChartClick() {
    setAgentTarget({
      type: 'chart_tendencia',
      title: 'Resumen Ejecutivo: Tendencia Temporal de Incidencias',
      subtitle: 'Evolución cronológica de reportes mes por mes.',
      dataSummary: buildFullDbContext(),
    });
  }

  function handleCategoryChartClick() {
    setAgentTarget({
      type: 'chart_categorias',
      title: 'Resumen Ejecutivo: Incidencias Frecuentes por Categoría',
      subtitle: 'Desglose frecuencial por motivo de reporte.',
      dataSummary: buildFullDbContext(),
    });
  }

  return (
    <div className="bi-dashboard">
      {/* Botón de Reporte Ejecutivo Directivo (Exclusivo para Directivos y Orientadores) */}
      {(userRole === 'directivo' || userRole === 'orientador') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={handleOpenPlantelExecutiveReport}
            disabled={!kpis}
            style={{
              background: '#204785',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(32,71,133,0.2)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
            Generar Reporte Ejecutivo de Plantel
          </button>
        </div>
      )}

      {/* Barra de Filtros Multidimensionales */}
      <BIFilterBar
        filters={filters}
        userRole={userRole}
        generaciones={generaciones}
        grupos={grupos}
        onFilterChange={setFilters}
      />

      {/* Tarjetas de Métricas de Alto Nivel con Lanzador de Agente IA */}
      <BIKpiCardSection stats={kpis} loading={loading} onKpiClick={handleKpiClick} />

      {/* Sección de Gráficas Recharts con Lanzador de Agente IA */}
      <div className="bi-charts-grid">
        <BITrendChart data={trend} loading={loading} onChartClick={handleTrendChartClick} />
        <BICategoryChart data={categories} loading={loading} onChartClick={handleCategoryChartClick} />
      </div>

      {/* Tabla Radar de Riesgo */}
      <BIRiskTable students={riskStudents} loading={loading} />

      {/* Modal de Reporte Ejecutivo Directivo de Plantel */}
      <ExecutiveReportModal
        isOpen={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        reportType="plantel"
        plantelData={plantelReportData}
      />

      {/* Modal del Agente IA Resumidor de Gráficas/KPIs */}
      <ExecutiveChartAgentModal
        isOpen={!!agentTarget}
        target={agentTarget}
        onClose={() => setAgentTarget(null)}
      />
    </div>
  );
};
