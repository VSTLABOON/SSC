import React from 'react';
import type { BIFilters } from '../../services/bi';

interface GrupoOption {
  id: string;
  nombre: string;
}

interface BIFilterBarProps {
  filters: BIFilters;
  userRole: string;
  generaciones: string[];
  grupos: GrupoOption[];
  onFilterChange: (newFilters: BIFilters) => void;
}

export const BIFilterBar: React.FC<BIFilterBarProps> = ({
  filters,
  userRole,
  generaciones,
  grupos,
  onFilterChange,
}) => {
  const isDocente = userRole === 'docente';

  function handleChange(field: keyof BIFilters, value: string) {
    onFilterChange({
      ...filters,
      [field]: value === 'all' ? undefined : value,
    });
  }

  function handleReset() {
    onFilterChange({
      periodoId: filters.periodoId, // Preservar periodo activo por defecto
      generacion: undefined,
      grupoId: isDocente && grupos.length > 0 ? grupos[0].id : undefined,
      severidad: undefined,
      rangoTemporal: 'periodo',
    });
  }

  return (
    <div className="bi-filter-bar">
      {/* Ventana Temporal (Semanal / Mensual / Ciclo Completo) */}
      <div className="bi-filter-item">
        <label className="bi-filter-label">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_view_week</span>
          Ventana Temporal
        </label>
        <select
          className="bi-filter-select"
          value={filters.rangoTemporal || 'periodo'}
          onChange={e => handleChange('rangoTemporal', e.target.value)}
        >
          <option value="semana">Esta Semana</option>
          <option value="mes">Este Mes</option>
          <option value="periodo">Ciclo Escolar Completo</option>
        </select>
      </div>

      {/* Filtro Generación */}
      <div className="bi-filter-item">
        <label className="bi-filter-label">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>school</span>
          Generación
        </label>
        <select
          className="bi-filter-select"
          value={filters.generacion || 'all'}
          onChange={e => handleChange('generacion', e.target.value)}
        >
          <option value="all">Todas las Generaciones</option>
          {generaciones.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Filtro Grupo */}
      <div className="bi-filter-item">
        <label className="bi-filter-label">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>groups</span>
          Grupo
        </label>
        <select
          className="bi-filter-select"
          value={filters.grupoId || 'all'}
          onChange={e => handleChange('grupoId', e.target.value)}
        >
          {!isDocente && <option value="all">Todos los Grupos del Plantel</option>}
          {grupos.map(g => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
      </div>

      {/* Filtro Severidad */}
      <div className="bi-filter-item">
        <label className="bi-filter-label">
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>traffic</span>
          Severidad
        </label>
        <select
          className="bi-filter-select"
          value={filters.severidad || 'all'}
          onChange={e => handleChange('severidad', e.target.value)}
        >
          <option value="all">Todas las Severidades</option>
          <option value="verde">Verde (Positivo)</option>
          <option value="naranja">Naranja (Atención)</option>
          <option value="rojo">Rojo (Crítico)</option>
        </select>
      </div>

      {/* Botón de Reset */}
      <button type="button" className="bi-btn-reset" onClick={handleReset}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
        Limpiar Filtros
      </button>
    </div>
  );
};
