// HistorialReportesM.tsx
import { useEffect, useRef, useState } from 'react';
import './HistorialReportesM.css';
import foto_docente from '../../assets/imagenes/foto_maestro.jpg';
import SCTechlogo from '../../assets/imagenes/SCTechlogo.png';

// ── Types ──────────────────────────────────────────────────────────────────

type MaestroScreen =
  | 'InicioMaestro'
  | 'Clasespantalla'
  | 'GenerarReporteM'
  | 'HistorialReportesM'
  | 'login';

interface Props {
  onNavigate?: (screen: MaestroScreen) => void;
}

interface Student {
  id: string;
  name: string;
  matricula: string;
  career: string;
  group: string;
  reportCount: number;
  reportLevel: 'error' | 'warning' | 'info';
  initials: string;
  avatarTone: 'primary' | 'tertiary' | 'secondary';
}

interface Report {
  id: number;
  level: 'critical' | 'warning' | 'informative';
  title: string;
  date: string;
  time: string;
  teacher: string;
  reason: string;
  comments?: string;
}

// ── Static data ────────────────────────────────────────────────────────────

const STUDENTS: Student[] = [
  { id: '1', name: 'Carlos Méndez',     matricula: '20210452', career: 'Ingeniería en Software', group: '7mo A', reportCount: 3, reportLevel: 'error',   initials: 'CM', avatarTone: 'primary'   },
  { id: '2', name: 'Ana Sofía Torres',  matricula: '20220118', career: 'Arquitectura',            group: '4to B', reportCount: 1, reportLevel: 'info',    initials: 'AT', avatarTone: 'tertiary'  },
  { id: '3', name: 'Roberto Jiménez',   matricula: '20200893', career: 'Psicología Clínica',      group: '9no C', reportCount: 2, reportLevel: 'warning', initials: 'RJ', avatarTone: 'secondary' },
];

const REPORTS: Report[] = [
  {
    id: 1, level: 'critical',
    title: 'Inasistencia injustificada recurrente',
    date: '12 Oct 2023', time: '10:30 AM',
    teacher: 'Prof. Ricardo Valenzuela',
    reason: 'Falta de asistencia a 5 sesiones consecutivas sin previo aviso.',
    comments: 'Se intentó contactar al alumno vía correo institucional sin respuesta alguna. Se recomienda citación a tutoría académica.',
  },
  {
    id: 2, level: 'warning',
    title: 'Incumplimiento de entregables',
    date: '25 Sep 2023', time: '02:15 PM',
    teacher: 'Dra. Marta Sánchez',
    reason: 'Entrega extemporánea del proyecto parcial sin justificación médica.',
  },
  {
    id: 3, level: 'informative',
    title: 'Conducta ejemplar tras retroalimentación',
    date: '05 Ago 2023', time: '09:00 AM',
    teacher: 'Mtro. Elena Rivas',
    reason: 'Mejora notable en la participación grupal y apoyo a compañeros en laboratorio.',
  },
];

// ── Component ──────────────────────────────────────────────────────────────
export default function HistorialReportesM({ onNavigate }: Props) {

  // ── Sidebar state (copied from GenerarReporteM) ──────────────────────────
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(true);
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function openSidebar(): void  { setIsSidebarHidden(false); setIsOverlayActive(true);  }
  function closeSidebar(): void { setIsSidebarHidden(true);  setIsOverlayActive(false); }

  function handleMenuToggleClick(e: React.MouseEvent): void {
    e.stopPropagation();
    
    // Si el sidebar está oculto, lo abrimos; si no, lo cerramos.
    if (isSidebarHidden) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  function handleNavItemClick(screen: MaestroScreen): void {
    onNavigate?.(screen);
    if (window.innerWidth < 768) closeSidebar();
  }

  useEffect(() => {
    function handleResize(): void {
      if (window.innerWidth >= 768) {
        setIsSidebarHidden(false);
        setIsOverlayActive(false);
      } else if (!isOverlayActive) {
        setIsSidebarHidden(true);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOverlayActive]);
  // ── Page state ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]           = useState<string>('');
  const [selectedStudent, setSelectedStudent]   = useState<Student | null>(null);

  const filteredStudents = STUDENTS.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || s.matricula.includes(q);
  });

  function handleShowDetail(student: Student): void {
    setSelectedStudent(student);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleHideDetail(): void {
    setSelectedStudent(null);
  }

  function handleLogout(): void { handleNavItemClick('login'); }
  function handleInstitutionLogoClick(): void { console.log('Logo institucional'); }

  // ── Dynamic classes (same pattern as GenerarReporteM) ────────────────────
  const sidebarClassName = ['grm-sidebar', isSidebarHidden ? 'grm-sidebar--mobile-hidden' : ''].filter(Boolean).join(' ');
  const overlayClassName = ['grm-overlay', isOverlayActive ? 'grm-overlay--active' : ''].filter(Boolean).join(' ');

  return (
    <div className="hrm-body">

      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      <div className={overlayClassName} ref={overlayRef} onClick={closeSidebar} />

      {/* ── Sidebar (exact copy from GenerarReporteM) ─────────────────────── */}
      <aside className={sidebarClassName} ref={sidebarRef}>
        <div className="grm-sidebar-top">
          <div className="grm-sidebar-brand">
            <div className="grm-sidebar-brand-logo">
              <img alt="Logo Sistema Conductual" className="grm-sidebar-brand-logo-img" src={SCTechlogo} />
            </div>
            <span className="grm-sidebar-brand-name">Sistema<br />Conductual</span>
          </div>
          <div className="grm-teacher-card">
            <p className="grm-teacher-card-greeting">Bienvenida Maestro</p>
            <div className="grm-teacher-card-avatar">
              <img alt="Andrew Mike" className="grm-teacher-card-avatar-img" src={foto_docente} />
            </div>
            <div>
              <p className="grm-teacher-card-name">Andrew Mike</p>
              <p className="grm-teacher-card-role">Docente en Redes</p>
            </div>
          </div>
        </div>

        <nav className="grm-sidebar-nav">
          <a
            className="grm-nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('InicioMaestro');
            }}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className="grm-nav-item-label">Inicio</span>
          </a>
          <a
            className="grm-nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('Clasespantalla');
            }}
          >
            <span className="material-symbols-outlined">groups</span>
            <span className="grm-nav-item-label">Grupos</span>
          </a>
          <a
            className="grm-nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('GenerarReporteM');
            }}
          >
            <span className="material-symbols-outlined">assessment</span>
            <span className="grm-nav-item-label">Generar reporte</span>
          </a>
          <a
            className="grm-nav-item grm-nav-item--active"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('HistorialReportesM');
            }}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="grm-nav-item-label">Historial de Reportes</span>
          </a>
        </nav>

        <div className="grm-sidebar-footer">
          <a className="grm-nav-item grm-nav-item--logout" href="#" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            <span className="grm-nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="hrm-main">

        {/* TopBar (exact copy from GenerarReporteM) */}
        <header className="grm-topbar">
          <div className="grm-topbar-left">
            <button className="grm-menu-toggle" onClick={handleMenuToggleClick}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="grm-topbar-title">Historial de Reportes</h1>
          </div>
          <div className="grm-topbar-right">
            <div className="grm-topbar-divider" />
            <div className="grm-topbar-institution">
              <span className="grm-topbar-institution-label">Plantel Puebla I</span>
              <img
                alt="Logo Institucional"
                className="grm-topbar-institution-logo"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVN4tbYkPmVGUA7PiggmYiGSDi1vpBbCLGyR3yjxujoiVsb8az6OYz9kmbH1GmmTX9_Weg6fhNo1kse5BbZbXJKe03j-_v6ssJ--uGU89jcouUcr5lB6_TetGEee59J7cU4Ms6GbAJ9eDwArGKV8Xh9LG56EEyx9A0shJS5oqlj-8bPi7AI-IxPRE6TF-gqKT9bSBulPhnyEI5cSgFQ4b7rUSLZKsXI8XWoALTtM1qkDhOeh7nKqeKSQk8J7-jdD7_SDggbGWlKw0"
                onClick={handleInstitutionLogoClick}
              />
            </div>
          </div>
        </header>

        {/* ── Canvas ──────────────────────────────────────────────────────── */}
        <div className="hrm-canvas">

          {/* Page heading + search */}
          <div className="hrm-page-header">
            <div className="hrm-page-header__text">
              <h2 className="hrm-page-title">Historial de Reportes</h2>
              <p className="hrm-page-subtitle">Gestión y seguimiento de incidencias académicas y conductuales.</p>
            </div>
            <div className="hrm-search-wrap">
              <span className="material-symbols-outlined hrm-search-icon">search</span>
              <input
                className="hrm-search-input"
                placeholder="Buscar por nombre o matrícula..."
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ── List view ───────────────────────────────────────────────── */}
          {!selectedStudent && (
            <div className="hrm-table-container">
              <div className="hrm-table-scroll">
                <table className="hrm-table">
                  <thead>
                    <tr>
                      <th>Nombre del Alumno</th>
                      <th>Matrícula</th>
                      <th>Carrera</th>
                      <th>Grado y Grupo</th>
                      <th>Reportes</th>
                      <th className="hrm-th-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? filteredStudents.map(s => (
                      <tr
                        key={s.id}
                        className="hrm-tr-clickable"
                        onClick={() => handleShowDetail(s)}
                      >
                        <td>
                          <div className="hrm-student-cell">
                            <div className={`hrm-avatar hrm-avatar--${s.avatarTone}`}>{s.initials}</div>
                            <span className="hrm-student-name">{s.name}</span>
                          </div>
                        </td>
                        <td className="hrm-td-muted">{s.matricula}</td>
                        <td className="hrm-td-muted">{s.career}</td>
                        <td className="hrm-td-muted">{s.group}</td>
                        <td>
                          <span className={`hrm-report-badge hrm-report-badge--${s.reportLevel}`}>
                            {s.reportCount} {s.reportCount === 1 ? 'Reporte' : 'Reportes'}
                          </span>
                        </td>
                        <td className="hrm-td-action">
                          <span className="material-symbols-outlined hrm-chevron">chevron_right</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="hrm-td-empty">
                          No se encontraron alumnos con ese criterio de búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Detail view ─────────────────────────────────────────────── */}
          {selectedStudent && (
            <div className="hrm-detail">
              <button className="hrm-back-btn" onClick={handleHideDetail}>
                <span className="material-symbols-outlined">arrow_back</span>
                Regresar al listado
              </button>

              {/* Student card */}
              <div className="hrm-student-card">
                <div className="hrm-student-card__left">
                  <div className={`hrm-detail-avatar hrm-avatar--${selectedStudent.avatarTone}`}>
                    {selectedStudent.initials}
                  </div>
                  <div>
                    <h2 className="hrm-detail-name">{selectedStudent.name}</h2>
                    <div className="hrm-detail-meta">
                      <span className="hrm-detail-meta__item">
                        <span className="material-symbols-outlined hrm-meta-icon">id_card</span>
                        {selectedStudent.matricula}
                      </span>
                      <span className="hrm-detail-meta__item">
                        <span className="material-symbols-outlined hrm-meta-icon">school</span>
                        {selectedStudent.career}
                      </span>
                      <span className="hrm-detail-meta__item">
                        <span className="material-symbols-outlined hrm-meta-icon">meeting_room</span>
                        {selectedStudent.group}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report timeline */}
              <div className="hrm-reports-list">
                {REPORTS.map(report => (
                  <div key={report.id} className={`hrm-report-card hrm-report-card--${report.level}`}>
                    <div className="hrm-report-card__top">
                      <div>
                        <span className={`hrm-level-badge hrm-level-badge--${report.level}`}>
                          {report.level === 'critical'    && 'Nivel Crítico'}
                          {report.level === 'warning'     && 'Advertencia'}
                          {report.level === 'informative' && 'Informativo'}
                        </span>
                        <h3 className="hrm-report-title">{report.title}</h3>
                      </div>
                      <div className="hrm-report-date">
                        <p className="hrm-report-date__main">{report.date}</p>
                        <p className="hrm-report-date__time">{report.time}</p>
                      </div>
                    </div>

                    <div className="hrm-report-body">
                      <div>
                        <p className="hrm-report-body__label">Profesor que reporta</p>
                        <p className="hrm-report-body__value hrm-report-body__value--bold">{report.teacher}</p>
                      </div>
                      <div>
                        <p className="hrm-report-body__label">Motivo</p>
                        <p className="hrm-report-body__value">{report.reason}</p>
                      </div>
                    </div>

                    {report.comments && (
                      <div className="hrm-report-comments">
                        <p className="hrm-report-body__label">Comentarios</p>
                        <p className="hrm-report-comments__text">"{report.comments}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="hrm-footer">
            <p>© 2024 Educational Management Systems. All rights reserved.</p>
            <div className="hrm-footer__links">
              <a href="#">Política de Privacidad</a>
              <a href="#">Soporte Técnico</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}