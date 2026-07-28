import React from 'react';
import type { BIKPIStats } from '../../services/bi';

interface BIKpiCardProps {
  stats: BIKPIStats | null;
  loading: boolean;
  onKpiClick?: (type: 'kpi_isc' | 'kpi_semaforo' | 'kpi_incidencias' | 'kpi_riesgo') => void;
}

export const BIKpiCardSection: React.FC<BIKpiCardProps> = ({ stats, loading, onKpiClick }) => {
  if (loading || !stats) {
    return (
      <div className="bi-kpi-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bi-kpi-card">
            <div className="skeleton-box" style={{ height: '16px', width: '60%', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ height: '32px', width: '40%', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ height: '14px', width: '80%' }} />
          </div>
        ))}
      </div>
    );
  }

  const {
    total_alumnos,
    promedio_puntos,
    conteo_verde,
    conteo_naranja,
    conteo_rojo,
    total_incidencias,
  } = stats;

  return (
    <div className="bi-kpi-grid">
      {/* 1. Índice de Salud Conductual (ISC) */}
      <div
        className="bi-kpi-card"
        onClick={() => onKpiClick?.('kpi_isc')}
        style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
        title="Haz clic para abrir el análisis del Agente IA Resumidor"
      >
        <div className="bi-kpi-header">
          <span className="bi-kpi-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Índice Salud Conductual
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#204785' }}>smart_toy</span>
          </span>
          <div className="bi-kpi-icon-wrap">
            <span className="material-symbols-outlined">health_metrics</span>
          </div>
        </div>
        {promedio_puntos !== null ? (
          <p className="bi-kpi-value">{promedio_puntos} <span style={{ fontSize: '14px', color: '#64748b' }}>/ 100</span></p>
        ) : (
          <p className="bi-kpi-value bi-kpi-value--null">Sin datos</p>
        )}
        <p className="bi-kpi-subtext">
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>trending_up</span>
          Promedio del conjunto seleccionado
        </p>
      </div>

      {/* 2. Distribución Semafórica */}
      <div
        className="bi-kpi-card"
        onClick={() => onKpiClick?.('kpi_semaforo')}
        style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
        title="Haz clic para abrir el análisis del Agente IA Resumidor"
      >
        <div className="bi-kpi-header">
          <span className="bi-kpi-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Distribución Semafórica
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#204785' }}>smart_toy</span>
          </span>
          <div className="bi-kpi-icon-wrap">
            <span className="material-symbols-outlined">traffic</span>
          </div>
        </div>
        <p className="bi-kpi-value">{total_alumnos} <span style={{ fontSize: '13px', color: '#64748b' }}>Alumnos</span></p>
        <div className="bi-semaforo-badge-group">
          <span className="bi-semaforo-chip bi-semaforo-chip--verde">
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10b981', verticalAlign: 'middle' }}>check_circle</span> {conteo_verde}
          </span>
          <span className="bi-semaforo-chip bi-semaforo-chip--naranja">
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#f59e0b', verticalAlign: 'middle' }}>warning</span> {conteo_naranja}
          </span>
          <span className="bi-semaforo-chip bi-semaforo-chip--rojo">
            <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#ef4444', verticalAlign: 'middle' }}>error</span> {conteo_rojo}
          </span>
        </div>
      </div>

      {/* 3. Total de Incidencias */}
      <div
        className="bi-kpi-card"
        onClick={() => onKpiClick?.('kpi_incidencias')}
        style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
        title="Haz clic para abrir el análisis del Agente IA Resumidor"
      >
        <div className="bi-kpi-header">
          <span className="bi-kpi-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Total de Incidencias
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#204785' }}>smart_toy</span>
          </span>
          <div className="bi-kpi-icon-wrap">
            <span className="material-symbols-outlined">assignment_late</span>
          </div>
        </div>
        <p className="bi-kpi-value">{total_incidencias} <span style={{ fontSize: '13px', color: '#64748b' }}>Reportes</span></p>
        <p className="bi-kpi-subtext">
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#3b82f6' }}>info</span>
          Acumulado en el periodo
        </p>
      </div>

      {/* 4. Alumnos en Riesgo Crítico */}
      <div
        className="bi-kpi-card"
        onClick={() => onKpiClick?.('kpi_riesgo')}
        style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
        title="Haz clic para abrir el análisis del Agente IA Resumidor"
      >
        <div className="bi-kpi-header">
          <span className="bi-kpi-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Atención Prioritaria
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#dc2626' }}>smart_toy</span>
          </span>
          <div className="bi-kpi-icon-wrap" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <span className="material-symbols-outlined">warning</span>
          </div>
        </div>
        <p className="bi-kpi-value" style={{ color: conteo_rojo > 0 ? '#dc2626' : '#0f172a' }}>
          {conteo_rojo + conteo_naranja} <span style={{ fontSize: '13px', color: '#64748b' }}>Estudiantes</span>
        </p>
        <p className="bi-kpi-subtext">
          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#dc2626' }}>priority_high</span>
          Semáforo Naranja y Rojo
        </p>
      </div>
    </div>
  );
};
