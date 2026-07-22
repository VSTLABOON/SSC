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
}

export const BICategoryChart: React.FC<BICategoryChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bi-chart-card">
        <div className="bi-chart-title">Cargando motivos...</div>
      </div>
    );
  }

  function getBarColor(severidad: string): string {
    if (severidad === 'verde') return '#10b981';
    if (severidad === 'naranja') return '#f59e0b';
    return '#ef4444';
  }

  return (
    <div className="bi-chart-card">
      <div className="bi-chart-title-wrap">
        <h4 className="bi-chart-title">
          <span className="material-symbols-outlined" style={{ color: '#204785' }}>bar_chart</span>
          Top Motivos de Reporte
        </h4>
      </div>

      <div className="bi-chart-container">
        {data.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            No hay motivos registrados para este filtro.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="categoria"
                stroke="#475569"
                fontSize={11}
                width={120}
                tickFormatter={(val: string) => (val.length > 18 ? `${val.slice(0, 16)}...` : val)}
              />
              <Tooltip
                contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                formatter={(val: any) => [`${val ?? 0} incidencias`, 'Frecuencia']}
              />
              <Bar dataKey="total_incidencias" radius={[0, 6, 6, 0]} barSize={18}>
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
