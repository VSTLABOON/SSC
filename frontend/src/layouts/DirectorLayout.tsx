import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/DirectivosYAsesores/InicioDA.css';
import foto_maestro from '../assets/imagenes/foto_maestro.jpg';
import SCTechlogo from '../assets/imagenes/SCTechlogo.png';
import CONALEPlogo from '../assets/imagenes/CONALEPlogo.png';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}




import { BottomNav } from '../components/navigation/BottomNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationCenter } from '../components/NotificationCenter';

export default function DirectorLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { nombre, rol, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Nav items — usuarios solo visible al directivo
  const navItems: NavItem[] = [
    { id: 'inicio',    icon: 'dashboard',      label: 'Inicio',                path: '/director/inicio' },
    { id: 'reporte',  icon: 'assessment',      label: 'Generar Reporte',       path: '/director/reporte' },
    { id: 'historial',icon: 'history',         label: 'Historial de Reportes', path: '/director/historial' },
    ...(rol === 'directivo'
      ? [{ id: 'usuarios', icon: 'manage_accounts', label: 'Gestión de Usuarios', path: '/director/usuarios' }]
      : []
    ),
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
                alt="Foto de Directivo"
                className="grm-teacher-card-avatar-img"
              />
            </div>
            <div>
              <p className="grm-teacher-card-name">{nombre || 'Directivo'}</p>
              <p className="grm-teacher-card-role">Administración / Asesoría</p>
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
          <a
            className="grm-nav-item grm-nav-item--logout"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="grm-nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      <main className="ida-main">
        <header className="grm-topbar">
          <div className="grm-topbar-left">
            <button className="grm-menu-toggle" onClick={handleMenuToggleClick}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="grm-topbar-title">
              {location.pathname === '/director/inicio'
                ? 'Inicio'
                : location.pathname === '/director/reporte'
                ? 'Generar Reporte'
                : location.pathname === '/director/historial'
                ? 'Historial de Reportes'
                : location.pathname === '/director/usuarios'
                ? 'Gestión de Usuarios'
                : 'Panel Directivo'}
            </h1>
          </div>
          <div className="grm-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <NotificationCenter />
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ef4444' }}>logout</span>
              <span className="topbar-logout-text">Salir</span>
            </button>
            <div className="grm-topbar-divider" />
            <div className="grm-topbar-institution">
              <span className="grm-topbar-institution-label">Plantel Puebla I</span>
              <img
                alt="Logo Institucional"
                className="grm-topbar-institution-logo"
                src={CONALEPlogo}
              />
            </div>
          </div>
        </header>

        <div className="ida-canvas">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
