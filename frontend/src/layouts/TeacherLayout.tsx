import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import '../pages/maestros/InicioMaestro.css';
import foto_maestro from '../assets/imagenes/foto_maestro.jpg';
import SCTechlogo from '../assets/imagenes/SCTechlogo.png';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'inicio', icon: 'dashboard', label: 'Inicio', path: '/maestro/inicio' },
  { id: 'grupos', icon: 'groups', label: 'Grupos', path: '/maestro/clases' },
  { id: 'reporte', icon: 'assessment', label: 'Generar reporte', path: '/maestro/reporte' },
  { id: 'historial', icon: 'history', label: 'Historial de reportes', path: '/maestro/historial' },
];

import { BottomNav } from '../components/navigation/BottomNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationCenter } from '../components/NotificationCenter';

export default function TeacherLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { nombre, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  useLockBodyScroll(isSidebarOpen);

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarClassName = [
    'tl-sidebar',
    !isSidebarOpen ? 'tl-sidebar--mobile-hidden' : '',
  ].filter(Boolean).join(' ');

  const overlayClassName = [
    'tl-sidebar-overlay',
    isSidebarOpen ? 'tl-sidebar-overlay--active' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="im-body">
      <div
        className={overlayClassName}
        id="tl-sidebar-overlay"
        onClick={closeSidebar}
      />

      <aside className={sidebarClassName} id="tl-sidebar">
        <div className="tl-sidebar-top">
          <div className="tl-sidebar-brand">
            <div className="tl-sidebar-brand-logo">
              <img
                src={SCTechlogo}
                alt="Logo SCTech"
                className="tl-sidebar-brand-logo-img"
              />
            </div>
            <span className="tl-sidebar-brand-name">
              Sistema
              <br />
              Conductual
            </span>
          </div>

          <div className="teacher-card">
            <p className="teacher-card-greeting">Bienvenido(a)</p>
            <div className="teacher-card-avatar">
              <img
                src={foto_maestro}
                alt="Foto de Maestro"
                className="teacher-card-avatar-img"
              />
            </div>
            <div>
              <p className="teacher-card-name">{nombre || 'Docente'}</p>
              <p className="teacher-card-role">Docente de Plantel</p>
            </div>
          </div>
        </div>

        <nav className="tl-sidebar-nav" id="tl-sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.id === 'grupos' && location.pathname === '/maestro/asistencia');
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`tl-nav-item ${isActive ? 'tl-nav-item--active' : ''}`}
                onClick={() => {
                  if (window.innerWidth < 768) closeSidebar();
                }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="tl-nav-item-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="tl-sidebar-footer">
          <a
            className="tl-nav-item tl-nav-item--logout"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleLogout();
            }}
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="tl-nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      <main className="tl-main-content">
        <header className="tl-topbar">
          <div className="tl-topbar-left">
            <button
              className="tl-menu-toggle"
              id="tl-menu-toggle"
              onClick={handleMenuToggleClick}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="tl-topbar-title">Portal de Docencia</h1>
          </div>
          <div className="tl-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThemeToggle />
            <NotificationCenter />
            <div className="tl-topbar-divider" />
            <div className="tl-topbar-institution">
              <span className="tl-topbar-institution-label">Plantel Puebla I</span>
              <img
                alt="Logo Institucional"
                className="tl-topbar-institution-logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVN4tbYkPmVGUA7PiggmYiGSDi1vpBbCLGyR3yjxujoiVsb8az6OYz9kmbH1GmmTX9_Weg6fhNo1kse5BbZbXJKe03j-_v6ssJ--uGU89jcouUcr5lB6_TetGEee59J7cU4Ms6GbAJ9eDwArGKV8Xh9LG56EEyx9A0shJS5oqlj-8bPi7AI-IxPRE6TF-gqKT9bSBulPhnyEI5cSgFQ4b7rUSLZKsXI8XWoALTtM1qkDhOeh7nKqeKSQk8J7-jdD7_SDggbGWlKw0"
                onClick={() => console.log('Logo institucional')}
              />
            </div>
          </div>
        </header>

        <div className="tl-content-canvas">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
