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
  const { rol, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDocente = rol === 'docente';
  const isOrientador = rol === 'orientador';
  const isDirectivo = rol === 'directivo';
  const isAlumno = rol === 'alumno';
  const isPadre = rol === 'padre';

  // Configuración simétrica de items de navegación para CADA ROL
  let leftItems: BottomNavItem[] = [];
  let rightItems: BottomNavItem[] = [];

  if (isDocente) {
    leftItems = [
      { id: 'inicio', label: 'Inicio', icon: 'dashboard', path: '/maestro/inicio' },
      { id: 'grupos', label: 'Grupos', icon: 'groups', path: '/maestro/clases' },
    ];
    rightItems = [
      { id: 'reporte', label: 'Reporte', icon: 'assessment', path: '/maestro/reporte' },
      { id: 'historial', label: 'Historial', icon: 'history', path: '/maestro/historial' },
    ];
  } else if (isOrientador) {
    leftItems = [
      { id: 'inicio', label: 'Inicio', icon: 'radar', path: '/orientador/inicio' },
      { id: 'reporte', label: 'Reporte', icon: 'edit_note', path: '/orientador/reporte' },
    ];
    rightItems = [
      { id: 'historial', label: 'Bitácora', icon: 'history', path: '/orientador/historial' },
      { id: 'intervenciones', label: 'Acuerdos', icon: 'handshake', path: '/orientador/inicio' },
    ];
  } else if (isAlumno) {
    leftItems = [
      { id: 'inicio', label: 'Inicio', icon: 'dashboard', path: '/alumno/inicio' },
      { id: 'horario', label: 'Horario', icon: 'schedule', path: '/alumno/horario' },
    ];
    rightItems = [
      { id: 'historial', label: 'Historial', icon: 'history', path: '/alumno/historial' },
      { id: 'perfil', label: 'Perfil', icon: 'person', path: '/alumno/perfil' },
    ];
  } else if (isPadre) {
    leftItems = [
      { id: 'inicio', label: 'Inicio', icon: 'dashboard', path: '/padre/inicio' },
      { id: 'horario', label: 'Horario', icon: 'schedule', path: '/padre/horario' },
    ];
    rightItems = [
      { id: 'historial', label: 'Historial', icon: 'history', path: '/padre/historial' },
      { id: 'perfil', label: 'Perfil', icon: 'person', path: '/padre/perfil' },
    ];
  } else {
    // Directivo por defecto
    leftItems = [
      { id: 'inicio', label: 'Inicio', icon: 'dashboard', path: '/director/inicio' },
      { id: 'reporte', label: 'Generar', icon: 'assessment', path: '/director/reporte' },
    ];
    rightItems = [
      { id: 'historial', label: 'Historial', icon: 'history', path: '/director/historial' },
      { id: 'usuarios', label: 'Usuarios', icon: 'manage_accounts', path: '/director/usuarios' },
    ];
  }

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

            {isOrientador && (
              <>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/orientador/inicio')}>
                  <span className="material-symbols-outlined fab-action-icon">radar</span>
                  Radar BI & Atención Prioritaria
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/orientador/reporte')}>
                  <span className="material-symbols-outlined fab-action-icon">add_task</span>
                  Generar Reporte Conductual
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/orientador/historial')}>
                  <span className="material-symbols-outlined fab-action-icon">history</span>
                  Bitácora del Plantel
                </button>
              </>
            )}

            {isDirectivo && (
              <>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/director/reporte')}>
                  <span className="material-symbols-outlined fab-action-icon">add_task</span>
                  Generar Reporte Conductual
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/director/usuarios')}>
                  <span className="material-symbols-outlined fab-action-icon">person_add</span>
                  Gestión de Usuarios
                </button>
              </>
            )}

            {isPadre && (
              <>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/padre/inicio')}>
                  <span className="material-symbols-outlined fab-action-icon">dashboard</span>
                  Ver Estado Conductual
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/padre/historial')}>
                  <span className="material-symbols-outlined fab-action-icon">history</span>
                  Historial de Reportes
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/padre/horario')}>
                  <span className="material-symbols-outlined fab-action-icon">schedule</span>
                  Consultar Horario
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/padre/perfil')}>
                  <span className="material-symbols-outlined fab-action-icon">person</span>
                  Perfil del Tutelado
                </button>
              </>
            )}

            {isAlumno && (
              <>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/alumno/inicio')}>
                  <span className="material-symbols-outlined fab-action-icon">dashboard</span>
                  Mi Estado Conductual
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/alumno/historial')}>
                  <span className="material-symbols-outlined fab-action-icon">history</span>
                  Historial de Incidencias
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/alumno/horario')}>
                  <span className="material-symbols-outlined fab-action-icon">schedule</span>
                  Mi Horario de Clases
                </button>
                <button type="button" className="fab-action-btn" onClick={() => handleNavigate('/alumno/perfil')}>
                  <span className="material-symbols-outlined fab-action-icon">person</span>
                  Mi Perfil
                </button>
              </>
            )}

            <div style={{ height: '1px', background: 'var(--color-border-subtle, #e2e8f0)', margin: '6px 0' }} />
            <button
              type="button"
              className="fab-action-btn"
              style={{ color: '#ef4444', fontWeight: 600 }}
              onClick={async () => {
                setIsFabOpen(false);
                await signOut();
                navigate('/login');
              }}
            >
              <span className="material-symbols-outlined fab-action-icon" style={{ color: '#ef4444' }}>logout</span>
              Cerrar Sesión
            </button>
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
