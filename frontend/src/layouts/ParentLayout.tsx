import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { ThemeToggle } from '../components/ThemeToggle';
import { NotificationCenter } from '../components/NotificationCenter';
import { BottomNav } from '../components/navigation/BottomNav';
import '../pages/Home.css';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Inicio', path: '/padre/inicio' },
  { id: 'schedule', icon: 'schedule', label: 'Horario Tutelado', path: '/padre/horario' },
  { id: 'history', icon: 'calendar_today', label: 'Historial Conductual', path: '/padre/historial' },
  { id: 'profile', icon: 'folder_shared', label: 'Expediente Tutelado', path: '/padre/perfil' },
];

const Icon = ({ name, className = '', style }: { name: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`material-symbols-outlined ${className}`.trim()} style={style}>{name}</span>
);

export default function ParentLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [hijos, setHijos] = useState<Array<{ alumno_id: string; nombre: string; grupo: string }>>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>(() => localStorage.getItem('ssc_selected_child_id') || '');

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

  // Carga de tutelados asociados al tutor
  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadChildren() {
      try {
        const { data, error } = await supabase
          .from('padres_alumnos')
          .select('alumno_id, parentesco, alumnos(id, matricula, correo_institucional, grupos(nombre), usuarios!alumnos_usuario_id_fkey(nombre, apellido))')
          .eq('padre_id', session!.user!.id);

        if (!error && data && data.length > 0) {
          const options = data.map((r: any) => {
            const al = Array.isArray(r.alumnos) ? r.alumnos[0] : r.alumnos;
            const us = Array.isArray(al?.usuarios) ? al?.usuarios[0] : al?.usuarios;
            const gr = Array.isArray(al?.grupos) ? al?.grupos[0] : al?.grupos;
            const fallback = al?.correo_institucional
              ? al.correo_institucional.split('@')[0].replace('student.', 'Estudiante ').replace('.', ' ')
              : `Estudiante (${al?.matricula || 'Tutelado'})`;
            const nombreCompleto = us?.nombre ? `${us.nombre} ${us.apellido || ''}`.trim() : fallback;

            return {
              alumno_id: r.alumno_id,
              nombre: nombreCompleto,
              grupo: gr?.nombre || 'Sin Grupo',
            };
          });

          setHijos(options);

          let activeId = localStorage.getItem('ssc_selected_child_id') || '';
          if (!activeId || !options.some(h => h.alumno_id === activeId)) {
            activeId = options[0]?.alumno_id || '';
            if (activeId) {
              localStorage.setItem('ssc_selected_child_id', activeId);
            }
          }
          setSelectedChildId(activeId);
        }
      } catch (err) {
        console.error('Error al cargar tutelados en ParentLayout:', err);
      }
    }

    loadChildren();
  }, [session?.user?.id]);

  function handleSelectChild(childId: string) {
    setSelectedChildId(childId);
    localStorage.setItem('ssc_selected_child_id', childId);
    window.dispatchEvent(new CustomEvent('ssc_child_change', { detail: { childId } }));
  }

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
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="topbar-title">Portal de Tutores Legales</h1>
          </div>

          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Selector Global de Tutelado */}
            {hijos.length > 1 && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-bg-card, #ffffff)',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-border-subtle, #cbd5e1)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-brand-chambray, #204785)' }}>
                  school
                </span>
                <select
                  value={selectedChildId}
                  onChange={(e) => handleSelectChild(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-main, #0f172a)',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  aria-label="Seleccionar estudiante tutelado"
                >
                  {hijos.map(h => (
                    <option key={h.alumno_id} value={h.alumno_id}>
                      {h.nombre} ({h.grupo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <NotificationCenter />
            <ThemeToggle />
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
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              <span className="topbar-logout-text">Salir</span>
            </button>
          </div>
        </header>

        <main className="page-canvas" style={{ paddingBottom: '88px' }}>
          <Outlet />
        </main>
      </div>

      {/* Barra de Navegación Inferior Adaptativa */}
      <BottomNav />
    </div>
  );
}
