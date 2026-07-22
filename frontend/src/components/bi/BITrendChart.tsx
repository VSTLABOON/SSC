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
}

export const BITrendChart: React.FC<BITrendChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="bi-chart-card">
        <div className="bi-chart-title">Cargando tendencia...</div>
      </div>
    );
  }

  return (
    <div className="bi-chart-card">
      <div className="bi-chart-title-wrap">
        <h4 className="bi-chart-title">
          <span className="material-symbols-outlined" style={{ color: '#204785' }}>show_chart</span>
          Tendencia Temporal de Incidencias
        </h4>
      </div>

      <div className="bi-chart-container">
        {data.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            No hay registros de incidencias para este filtro.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
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
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="verde" name="Positivo (Verde)" stroke="#10b981" fillOpacity={1} fill="url(#colorVerde)" />
              <Area type="monotone" dataKey="naranja" name="Atención (Naranja)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorNaranja)" />
              <Area type="monotone" dataKey="rojo" name="Crítico (Rojo)" stroke="#ef4444" fillOpacity={1} fill="url(#colorRojo)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
