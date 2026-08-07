import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationCenter } from '../components/NotificationCenter';
import '../pages/Home.css';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'inicio', icon: 'family_restroom', label: 'Mis Tutelados', path: '/padre/inicio' },
  { id: 'perfil', icon: 'badge', label: 'Perfil del Alumno', path: '/padre/perfil' },
  { id: 'horario', icon: 'schedule', label: 'Horario Escolar', path: '/padre/horario' },
  { id: 'historial', icon: 'history', label: 'Historial de Reportes', path: '/padre/historial' },
];

const Icon = ({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`material-symbols-outlined ${className}`.trim()} style={style}>{name}</span>
);

export default function ParentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useLockBodyScroll(isSidebarOpen);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

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

  const closeSidebar = () => setIsSidebarOpen(false);

  function handleMenuToggleClick(event: React.MouseEvent): void {
    event.stopPropagation();
    if (window.innerWidth >= 768) return;
    setIsSidebarOpen(prev => !prev);
  }

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

      <nav className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`} aria-label="Navegación del tutor">
        <div className="sidebar-brand">
          <Icon name="family_restroom" className="sidebar-brand-icon" style={{ color: '#60a5fa' }} />
          <span className="sidebar-brand-name">Portal de Padres</span>
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
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            <Icon name="logout" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      <div className="home-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Abrir menú de navegación"
              onClick={handleMenuToggleClick}
            >
              <Icon name="menu" />
            </button>
            <h1 className="topbar-title">Portal de Tutores Legales</h1>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </header>

        <main className="page-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
