import React, { useEffect, useState, useCallback } from 'react';
import './BIAnalytics.css';
import { useAuth } from '../../context/AuthContext';
import type {
  BIFilters,
  BIKPIStats,
  BITrendItem,
  BICategoryItem,
  BIRiskStudent,
} from '../../services/bi';
import {
  getBIKPIStats,
  getBITrend,
  getBICategories,
  getBIRiskStudents,
  getGeneracionesDisponibles,
} from '../../services/bi';
import { getGruposDePlantel, getGruposDeDocente } from '../../services/grupos';
import { getPeriodoActivo } from '../../services/periodos';
import { BIFilterBar } from './BIFilterBar';
import { BIKpiCardSection } from './BIKpiCard';
import { BITrendChart } from './BITrendChart';
import { BICategoryChart } from './BICategoryChart';
import { BIRiskTable } from './BIRiskTable';

interface BIAnalyticsDashboardProps {
  userRole: 'docente' | 'directivo' | 'orientador';
  plantelId: string;
}

export const BIAnalyticsDashboard: React.FC<BIAnalyticsDashboardProps> = ({
  userRole,
  plantelId,
}) => {
  const { session } = useAuth();
  const [filters, setFilters] = useState<BIFilters>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [generaciones, setGeneraciones] = useState<string[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: string; nombre: string }>>([]);

  const [kpis, setKpis] = useState<BIKPIStats | null>(null);
  const [trend, setTrend] = useState<BITrendItem[]>([]);
  const [categories, setCategories] = useState<BICategoryItem[]>([]);
  const [riskStudents, setRiskStudents] = useState<BIRiskStudent[]>([]);

  // 1. Carga inicial de catálogo (Generaciones, Grupos, Periodo Activo)
  useEffect(() => {
    async function initCatalog() {
      try {
        setLoading(true);
        // Periodo Activo por defecto
        let pId: string | undefined;
        try {
          pId = await getPeriodoActivo(plantelId);
        } catch {
          pId = undefined;
        }

        // Generaciones
        const gens = await getGeneracionesDisponibles();
        setGeneraciones(gens);

        let groupList: Array<{ id: string; nombre: string }> = [];
        if (userRole === 'docente' && session?.user?.id) {
          const mGrupos = await getGruposDeDocente(session.user.id);
          // Eliminar duplicados de grupos asignados
          const map = new Map<string, string>();
          mGrupos.forEach(c => map.set(c.grupoId, c.grupoNombre));
          groupList = Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
        } else {
          const pGrupos = await getGruposDePlantel(plantelId);
          groupList = pGrupos.map(g => ({ id: g.id, nombre: g.nombre }));
        }
        setGrupos(groupList);

        // Establecer filtros iniciales
        setFilters({
          periodoId: pId,
          generacion: undefined,
          grupoId: userRole === 'docente' && groupList.length > 0 ? groupList[0].id : undefined,
          severidad: undefined,
        });
      } catch (err) {
        console.error('Error al inicializar catálogo de BI:', err);
      } finally {
        setLoading(false);
      }
    }

    if (plantelId) {
      initCatalog();
    }
  }, [plantelId, userRole, session?.user?.id]);

  // 2. Consulta de métricas al cambiar filtros
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
    if (plantelId) {
      loadDashboardData();
    }
  }, [loadDashboardData, plantelId]);

  return (
    <div className="bi-dashboard">
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
    </div>
  );
};
