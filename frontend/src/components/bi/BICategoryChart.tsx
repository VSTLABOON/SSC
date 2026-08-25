import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import type { BICategoryItem } from '../../services/bi';

interface BICategoryChartProps {
  data: BICategoryItem[];
  loading?: boolean;
  onChartClick?: () => void;
}

export const BICategoryChart: React.FC<BICategoryChartProps> = ({ data, loading, onChartClick }) => {
  if (loading) {
    return (
      <div className="bi-chart-card">
        <div className="skeleton-box" style={{ height: '24px', width: '50%', marginBottom: '16px' }} />
        <div className="skeleton-box" style={{ height: '180px', width: '100%' }} />
      </div>
    );
  }

  function getBarColor(severidad: string): string {
    if (severidad === 'verde') return '#10b981';
    if (severidad === 'naranja') return '#f59e0b';
    return '#ef4444';
  }

  return (
    <div
      className="bi-chart-card"
      onClick={onChartClick}
      style={{ cursor: onChartClick ? 'pointer' : 'default' }}
      title="Haz clic para analizar esta gráfica con el Agente IA"
    >
      <div className="bi-chart-title-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 className="bi-chart-title">
          <span className="material-symbols-outlined" style={{ color: '#204785' }}>bar_chart</span>
          Top Motivos de Reporte
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
            No hay motivos registrados para este filtro.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="categoria"
                stroke="#475569"
                fontSize={11}
                width={130}
                tickFormatter={(val: string) => (val.length > 18 ? `${val.slice(0, 16)}...` : val)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '12px' }}
                formatter={(val: any) => [`${val} incidencias`, 'Frecuencia']}
              />
              <Bar dataKey="total_incidencias" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.severidad)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
