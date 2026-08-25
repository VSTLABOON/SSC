import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { BITrendItem } from '../../services/bi';

interface BITrendChartProps {
  data: BITrendItem[];
  loading?: boolean;
  severidad?: string;
  onChartClick?: () => void;
}

export const BITrendChart: React.FC<BITrendChartProps> = ({ data, loading, severidad, onChartClick }) => {
  if (loading) {
    return (
      <div className="bi-chart-card">
        <div className="skeleton-box" style={{ height: '24px', width: '50%', marginBottom: '16px' }} />
        <div className="skeleton-box" style={{ height: '180px', width: '100%' }} />
      </div>
    );
  }

  const showVerde = !severidad || severidad === 'verde';
  const showNaranja = !severidad || severidad === 'naranja';
  const showRojo = !severidad || severidad === 'rojo';

  return (
    <div
      className="bi-chart-card"
      onClick={onChartClick}
      style={{ cursor: onChartClick ? 'pointer' : 'default' }}
      title="Haz clic para analizar esta gráfica con el Agente IA"
    >
      <div className="bi-chart-title-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 className="bi-chart-title">
          <span className="material-symbols-outlined" style={{ color: '#204785' }}>show_chart</span>
          Tendencia Temporal de Incidencias {severidad ? `(${severidad.toUpperCase()})` : ''}
        </h4>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#204785',
            background: '#eff6ff',
            padding: '3px 8px',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>smart_toy</span>
          Resumir con Agente IA
        </span>
      </div>

      <div className="bi-chart-container" style={{ minHeight: '220px', width: '100%' }}>
        {data.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No hay registros de incidencias para este filtro.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVerde" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNaranja" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRojo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes_nombre" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {showVerde && (
                <Area type="monotone" dataKey="verde" name="Positivos / Verdes" stroke="#10b981" fillOpacity={1} fill="url(#colorVerde)" />
              )}
              {showNaranja && (
                <Area type="monotone" dataKey="naranja" name="Leves / Naranjas" stroke="#f59e0b" fillOpacity={1} fill="url(#colorNaranja)" />
              )}
              {showRojo && (
                <Area type="monotone" dataKey="rojo" name="Críticos / Rojos" stroke="#ef4444" fillOpacity={1} fill="url(#colorRojo)" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
