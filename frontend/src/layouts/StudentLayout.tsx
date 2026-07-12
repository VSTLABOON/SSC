import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../pages/Home.css';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Inicio', path: '/alumno/inicio' },
  { id: 'profile', icon: 'person', label: 'Perfil', path: '/alumno/perfil' },
  { id: 'schedule', icon: 'schedule', label: 'Horario', path: '/alumno/horario' },
  { id: 'history', icon: 'calendar_today', label: 'Historial de Reportes', path: '/alumno/historial' },
];

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

export default function StudentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.classList.toggle('no-scroll', isSidebarOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="home-page">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <nav className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <Icon name="school" className="sidebar-brand-icon" />
          <span className="sidebar-brand-name">CONALEP</span>
        </div>
        <div className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                onClick={closeSidebar}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="sidebar-footer">
          <a
            href="#"
            className="sidebar-logout"
            onClick={(event) => {
              event.preventDefault();
              handleLogout();
            }}
          >
            <Icon name="logout" />
            <span>Cerrar Sesión</span>
          </a>
        </div>
      </nav>

      <div className="home-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Abrir menú de navegación"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              <Icon name="menu" />
            </button>
            <h1 className="topbar-title">CONALEP Gestión Conductual</h1>
          </div>
        </header>

        <main className="page-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
