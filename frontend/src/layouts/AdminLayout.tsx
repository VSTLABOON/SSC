import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/DirectivosYAsesores/InicioDA.css';
import foto_maestro from '../assets/imagenes/foto_maestro.jpg';
import SCTechlogo from '../assets/imagenes/SCTechlogo.png';
import CONALEPlogo from '../assets/imagenes/CONALEPlogo.png';
import { BottomNav } from '../components/navigation/BottomNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationCenter } from '../components/NotificationCenter';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { nombre, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { id: 'usuarios', icon: 'manage_accounts', label: 'Gestión de Usuarios', path: '/admin/usuarios' },
    { id: 'importar', icon: 'upload_file',     label: 'Importación Masiva',  path: '/admin/importar' },
    { id: 'perfil',   icon: 'account_circle',   label: 'Mi Perfil',           path: '/admin/perfil' },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  function handleMenuToggleClick(event: React.MouseEvent): void {
    event.stopPropagation();
    if (window.innerWidth >= 768) return;
    setIsSidebarOpen(prev => !prev);
  }

  useEffect(() => {
    function handleResize(): void {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarClassName = [
    'grm-sidebar',
    !isSidebarOpen ? 'grm-sidebar--mobile-hidden' : '',
  ].filter(Boolean).join(' ');

  const overlayClassName = [
    'grm-overlay',
    isSidebarOpen ? 'grm-overlay--active' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="ida-body">
      <div
        className={overlayClassName}
        onClick={closeSidebar}
      />

      <aside className={sidebarClassName}>
        <div className="grm-sidebar-top">
          <div className="grm-sidebar-brand">
            <div className="grm-sidebar-brand-logo">
              <img
                src={SCTechlogo}
                alt="Logo Sistema Conductual"
                className="grm-sidebar-brand-logo-img"
              />
            </div>
            <span className="grm-sidebar-brand-name">
              Sistema
              <br />
              Conductual
            </span>
          </div>

          <div className="grm-teacher-card">
            <p className="grm-teacher-card-greeting">Bienvenido(a)</p>
            <div className="grm-teacher-card-avatar">
              <img
                src={foto_maestro}
                alt="Foto de Administrador"
                className="grm-teacher-card-avatar-img"
              />
            </div>
            <div>
              <p className="grm-teacher-card-name">{nombre || 'Administrador'}</p>
              <p className="grm-teacher-card-role">Control Escolar / TI</p>
            </div>
          </div>
        </div>

        <nav className="grm-sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`grm-nav-item ${isActive ? 'grm-nav-item--active' : ''}`}
                onClick={() => {
                  if (window.innerWidth < 768) closeSidebar();
                }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="grm-nav-item-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="grm-sidebar-footer">
          <button
            className="grm-nav-item grm-nav-item--logout"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <div className="ida-main">
        <header className="grm-topbar">
          <div className="grm-topbar-left">
            <button
              className="grm-menu-toggle"
              aria-label="Abrir menú"
              onClick={handleMenuToggleClick}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="grm-topbar-title">Administración & Control Escolar</h1>
          </div>

          <div className="grm-topbar-right">
            <ThemeToggle />
            <NotificationCenter />
            <div className="grm-topbar-divider" />
            <div className="grm-topbar-institution">
              <span className="grm-topbar-institution-label">
                CONALEP Plantel Puebla I
              </span>
              <img
                src={CONALEPlogo}
                alt="Logo CONALEP"
                className="grm-topbar-institution-logo"
              />
            </div>
            <div className="grm-topbar-divider" />
            <button
              onClick={handleLogout}
              className="topbar-logout-btn"
              title="Cerrar sesión del sistema"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              <span className="topbar-logout-text">Salir</span>
            </button>
          </div>
        </header>

        <main className="ida-content" style={{ paddingBottom: '80px' }}>
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
