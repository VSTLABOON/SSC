import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
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

  // Estado del Modal Ejecutivo
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [plantelReportData, setPlantelReportData] = useState<PlantelExecutiveReport | null>(null);

  // 1. Inicialización de Filtros Opciones
  useEffect(() => {
    if (!activePlantelId) return;

    async function initOptions() {
      try {
        setLoading(true);
        let pId: string | undefined;
        try {
          pId = await getPeriodoActivo(activePlantelId!);
        } catch {
          pId = undefined;
        }

        const gens = await getGeneracionesDisponibles();
        setGeneraciones(gens);

        let groupList: Array<{ id: string; nombre: string }> = [];
        if (userRole === 'docente' && session?.user?.id) {
          const mGrupos = await getGruposDeDocente(session.user.id);
          const map = new Map<string, string>();
          mGrupos.forEach(c => map.set(c.grupoId, c.grupoNombre));
          groupList = Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
        } else {
          const pGrupos = await getGruposDePlantel(activePlantelId!);
          groupList = pGrupos.map(g => ({ id: g.id, nombre: g.nombre }));
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

      const [kpiRes, trendRes, catRes, riskRes] = await Promise.all([
        getBIKPIStats(filters),
        getBITrend(filters),
        getBICategories(filters),
        getBIRiskStudents(filters),
      ]);

      setKpis(kpiRes);
      setTrend(trendRes);
      setCategories(catRes);
      setRiskStudents(riskRes);
    } catch (err) {
      console.error('Error al cargar datos del dashboard de BI:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (activePlantelId) {
      loadDashboardData();
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

  return (
    <div className="bi-dashboard">
      {/* Botón de Reporte Ejecutivo Directivo */}
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

      {/* Barra de Filtros Multidimensionales */}
      <BIFilterBar
        filters={filters}
        userRole={userRole}
        generaciones={generaciones}
        grupos={grupos}
        onFilterChange={setFilters}
      />

      {/* Tarjetas de Métricas de Alto Nivel */}
      <BIKpiCardSection stats={kpis} loading={loading} />

      {/* Sección de Gráficas Recharts */}
      <div className="bi-charts-grid">
        <BITrendChart data={trend} loading={loading} />
        <BICategoryChart data={categories} loading={loading} />
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
    </div>
  );
};
