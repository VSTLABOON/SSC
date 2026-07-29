import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './BottomNav.css';

interface BottomNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export const BottomNav: React.FC = () => {
  const [isFabOpen, setIsFabOpen] = useState(false);
  const { rol } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDocente = rol === 'docente';
  const isDirectivoOrOrientador = rol === 'directivo' || rol === 'orientador';

  // Configuración simétrica de items de navegación por rol (2 a la izquierda, FAB al centro, 2 a la derecha)
  const leftItems: BottomNavItem[] = isDocente
    ? [
        { id: 'inicio', label: 'Inicio', icon: 'dashboard', path: '/maestro/inicio' },
        { id: 'grupos', label: 'Grupos', icon: 'groups', path: '/maestro/clases' },
      ]
    : [
        { id: 'inicio', label: 'Inicio', icon: 'dashboard', path: '/director/inicio' },
        { id: 'reporte', label: 'Generar', icon: 'assessment', path: '/director/reporte' },
      ];

  const rightItems: BottomNavItem[] = isDocente
    ? [
        { id: 'reporte', label: 'Reporte', icon: 'assessment', path: '/maestro/reporte' },
        { id: 'historial', label: 'Historial', icon: 'history', path: '/maestro/historial' },
      ]
    : [
        { id: 'historial', label: 'Historial', icon: 'history', path: '/director/historial' },
        ...(rol === 'directivo'
          ? [{ id: 'usuarios', label: 'Usuarios', icon: 'manage_accounts', path: '/director/usuarios' }]
          : []),
      ];

  function triggerHaptic() {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignorar en dispositivos sin soporte háptico
    }
  }

  function handleNavigate(path: string) {
    triggerHaptic();
    setIsFabOpen(false);
    navigate(path);
  }

  return (
    <>
      {/* Fondo semi-transparente cuando el botón (+) de acción rápida está abierto */}
      {isFabOpen && (
        <div className="fab-actions-backdrop" onClick={() => setIsFabOpen(false)}>
          <div className="fab-actions-menu" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '6px 12px 8px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Acciones Rápidas
            </div>

            {isDocente && (
              <>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/maestro/clases')}>
                  <span className="material-symbols-outlined fab-action-icon">fact_check</span>
                  Pasar Lista / Asistencia
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/maestro/reporte')}>
                  <span className="material-symbols-outlined fab-action-icon">add_task</span>
                  Generar Reporte Conductual
                </button>
              </>
            )}

            {isDirectivoOrOrientador && (
              <>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/director/reporte')}>
                  <span className="material-symbols-outlined fab-action-icon">add_task</span>
                  Generar Reporte Conductual
                </button>
                {rol === 'directivo' && (
                  <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/director/usuarios')}>
                    <span className="material-symbols-outlined fab-action-icon">person_add</span>
                    Gestión de Usuarios
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Contenedor Flotante de la Navegación Inferior Simétrica */}
      <div className="bottom-nav-container">
        <nav className="bottom-nav-bar">
          {/* Bloque Izquierdo */}
          {leftItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                type="button"
                className={`bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="material-symbols-outlined bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Botón Central Elevado de Acción Rápida (+) */}
          <div className="bottom-nav-fab-wrap">
            <button
              type="button"
              className={`bottom-nav-fab ${isFabOpen ? 'bottom-nav-fab--open' : ''}`}
              onClick={() => {
                triggerHaptic();
                setIsFabOpen(prev => !prev);
              }}
              title="Acciones Rápidas"
            >
              <span className="material-symbols-outlined bottom-nav-fab-icon">add</span>
            </button>
          </div>

          {/* Bloque Derecho */}
          {rightItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                type="button"
                className={`bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="material-symbols-outlined bottom-nav-icon">{item.icon}</span>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
