// GenerarReporteM.tsx
import { useEffect, useRef, useState } from 'react';
import './GenerarReporteM.css';
import foto_docente from '../../assets//imagenes/foto_maestro.jpg';
import SCTechlogo from '../../assets/imagenes/SCTechlogo.png';

type Severity = 'red' | 'orange' | 'yellow' | 'green' | null;

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
  id: number;
  name: string;
  matricula: string;
  group: string;
  career: string;
  status: 'green' | 'yellow' | 'orange' | 'red';
  incidents: number;
}

const STUDENTS: Student[] = [
  { id: 1,  name: 'Rodrigo Javier Méndez',   matricula: '2021-00458-ING', group: '502-B', career: 'Ingeniería en Software',   status: 'yellow', incidents: 3 },
  { id: 2,  name: 'Valentina Cruz López',     matricula: '2021-00123-RED', group: '401-A', career: 'Administración de Redes',  status: 'green',  incidents: 0 },
  { id: 3,  name: 'Carlos Herrera Soto',      matricula: '2020-00987-WEB', group: '301-C', career: 'Desarrollo Web',           status: 'red',    incidents: 7 },
  { id: 4,  name: 'María Fernández Gil',      matricula: '2021-00321-ING', group: '502-B', career: 'Ingeniería en Software',   status: 'orange', incidents: 4 },
  { id: 5,  name: 'Andrés Mora Quintero',     matricula: '2022-00654-SIS', group: '202-A', career: 'Sistemas Computacionales', status: 'green',  incidents: 1 },
  { id: 6,  name: 'Lucía Ramírez Torres',     matricula: '2021-00789-RED', group: '401-A', career: 'Administración de Redes',  status: 'yellow', incidents: 2 },
  { id: 7,  name: 'Diego Salinas Paredes',    matricula: '2020-00111-WEB', group: '301-C', career: 'Desarrollo Web',           status: 'red',    incidents: 9 },
  { id: 8,  name: 'Sofía Vargas Mendoza',     matricula: '2022-00432-ING', group: '502-B', career: 'Ingeniería en Software',   status: 'green',  incidents: 0 },
  { id: 9,  name: 'Tomás Jiménez Ruiz',       matricula: '2021-00567-SIS', group: '202-A', career: 'Sistemas Computacionales', status: 'orange', incidents: 5 },
  { id: 10, name: 'Camila Ortega Navarro',    matricula: '2022-00890-RED', group: '401-A', career: 'Administración de Redes',  status: 'yellow', incidents: 2 },
];

const REASONS: Record<NonNullable<Severity>, string[]> = {
  red: [
    'Agresión física a compañeros o personal',
    'Falta de respeto grave al docente',
    'Daño deliberado a infraestructura',
    'Portación de objetos prohibidos',
    'Acoso o bullying documentado',
  ],
  orange: [
    'Incumplimiento reiterado de normas',
    'Uso inapropiado de tecnología en clase',
    'Inasistencias injustificadas',
    'Alteración del orden en pasillos',
    'Vocabulario soez',
  ],
  yellow: [
    'Retardo injustificado',
    'Falta de uniforme reglamentario',
    'No entrega de actividades',
    'Distracción menor en aula',
    'Ruido excesivo',
  ],
  green: [
    'Participación destacada en clase',
    'Apoyo a compañeros',
    'Cumplimiento ejemplar de actividades',
    'Actitud proactiva y respetuosa',
    'Mejora notable en el desempeño',
  ],
};

function getCurrentFormattedDate(): string {
  const now = new Date();
  const day   = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year  = now.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function GenerarReporteM({ onNavigate }: Props) {
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(true);
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);

  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  function openSidebar(): void {
    setIsSidebarHidden(false);
    setIsOverlayActive(true);
  }

  function closeSidebar(): void {
    setIsSidebarHidden(true);
    setIsOverlayActive(false);
  }

  function handleMenuToggleClick(event: React.MouseEvent): void {
    event.stopPropagation();
    if (isSidebarHidden) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }

  function handleNavItemClick(screen: MaestroScreen): void {
    onNavigate?.(screen);
    if (window.innerWidth < 768) {
      closeSidebar();
    }
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

  const [modalOpen, setModalOpen]             = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [severity, setSeverity]               = useState<Severity>(null);
  const [checkedReasons, setCheckedReasons]   = useState<Record<number, boolean>>({});
  const [comment, setComment]                 = useState<string>('');
  const [incidentDate, setIncidentDate]       = useState<string>('');
  const [searchQuery, setSearchQuery]         = useState<string>('');
  const [successModalOpen, setSuccessModalOpen] = useState<boolean>(false);
  const [warningModalOpen, setWarningModalOpen] = useState<boolean>(false);

  const filteredStudents = STUDENTS.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.matricula.toLowerCase().includes(q)
    );
  });

  function handleOpenModal(student: Student): void {
    setSelectedStudent(student);
    setSeverity('yellow');
    setCheckedReasons({});
    setComment('');
    setIncidentDate(getCurrentFormattedDate());
    setModalOpen(true);
  }

  function handleCloseModal(): void {
    setModalOpen(false);
    setSelectedStudent(null);
    setSeverity(null);
  }

  function handleSelectSeverity(color: NonNullable<Severity>): void {
    setSeverity(color);
    setCheckedReasons({});
  }

  function handleReasonChange(index: number): void {
    setCheckedReasons(prev => ({ ...prev, [index]: !prev[index] }));
  }

  function handleSubmitReport(e: React.FormEvent): void {
    e.preventDefault();

    const hasReasonSelected = Object.values(checkedReasons).some(Boolean);
    const isFormValid = !!severity && hasReasonSelected;

    if (!isFormValid) {
      setWarningModalOpen(true);
      return;
    }

    console.log('Generar Reporte', { selectedStudent, severity, checkedReasons, comment, incidentDate });
    setSuccessModalOpen(true);
  }

  function handleCancelModal(): void {
    handleCloseModal();
  }

  function handleCloseWarning(): void {
    setWarningModalOpen(false);
  }

  function handleAcceptSuccess(): void {
    setSuccessModalOpen(false);
    handleCloseModal();
  }

  function handleGenerateAnotherReport(): void {
    setSuccessModalOpen(false);
    setSeverity('yellow');
    setCheckedReasons({});
    setComment('');
    setIncidentDate(getCurrentFormattedDate());
  }

  function handleLogout(): void {
    handleNavItemClick('login');
  }

  function handleInstitutionLogoClick(): void {
    console.log('Logo institucional');
  }

  const sidebarClassName = [
    'grm-sidebar',
    isSidebarHidden ? 'grm-sidebar--mobile-hidden' : '',
  ].filter(Boolean).join(' ');

  const overlayClassName = [
    'grm-overlay',
    isOverlayActive ? 'grm-overlay--active' : '',
  ].filter(Boolean).join(' ');

  const currentReasons = severity ? REASONS[severity] : [];

  return (
    <div className="grm-body">

      <div
        className={overlayClassName}
        ref={overlayRef}
        onClick={closeSidebar}
      />

      <aside className={sidebarClassName} ref={sidebarRef}>
        <div className="grm-sidebar-top">
          <div className="grm-sidebar-brand">
            <div className="grm-sidebar-brand-logo">
              <img
                alt="Logo Sistema Conductual"
                className="grm-sidebar-brand-logo-img"
                src={SCTechlogo}
              />
            </div>
            <span className="grm-sidebar-brand-name">
              Sistema<br />Conductual
            </span>
          </div>

          <div className="grm-teacher-card">
            <p className="grm-teacher-card-greeting">Bienvenida Maestro</p>
            <div className="grm-teacher-card-avatar">
              <img
                alt="Elena Rivas"
                className="grm-teacher-card-avatar-img"
                src={foto_docente}
              />
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
            className="grm-nav-item grm-nav-item--active"
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
            className="grm-nav-item"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              handleNavItemClick('HistorialReportesM');
            }}
          >
            <span className="material-symbols-outlined">history</span>
            <span className="grm-nav-item-label">Historial de reportes</span>
          </a>
        </nav>

        <div className="grm-sidebar-footer">
          <a className="grm-nav-item grm-nav-item--logout" href="#" onClick={handleLogout}>
            <span className="material-symbols-outlined">logout</span>
            <span className="grm-nav-item-label">Cerrar Sesión</span>
          </a>
        </div>
      </aside>

      <main className="grm-main">

        <header className="grm-topbar">
          <div className="grm-topbar-left">
            <button className="grm-menu-toggle" onClick={handleMenuToggleClick}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="grm-topbar-title">Gestión de Reportes</h1>
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

        <div className="grm-canvas">

          <div className="grm-search-bar-row">
            <div className="grm-search-wrap">
              <span className="material-symbols-outlined grm-search-icon">search</span>
              <input
                className="grm-search-input"
                placeholder="Buscar por nombre o matrícula..."
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grm-stats-row">
            <div className="grm-stat-card">
              <span className="grm-stat-number grm-stat-number--red">12</span>
              <span className="grm-stat-label">Reportes Críticos (Rojo)</span>
            </div>
            <div className="grm-stat-card">
              <span className="grm-stat-number grm-stat-number--orange">28</span>
              <span className="grm-stat-label">Advertencias (Naranja)</span>
            </div>
            <div className="grm-stat-card">
              <span className="grm-stat-number grm-stat-number--yellow">45</span>
              <span className="grm-stat-label">Seguimientos (Amarillo)</span>
            </div>
          </div>

          <div className="grm-table-container">
            <div className="grm-table-header">
              <h3 className="grm-table-title">Historial de Incidentes</h3>
            </div>
            <div className="grm-table-scroll">
              <table className="grm-table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Matrícula</th>
                    <th>Grupo</th>
                    <th>Carrera</th>
                    <th>Incidentes</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td className="grm-td-name">{student.name}</td>
                        <td className="grm-td-matricula">{student.matricula}</td>
                        <td>{student.group}</td>
                        <td>{student.career}</td>
                        <td className="grm-td-center">{student.incidents}</td>
                        <td>
                          <span className={`grm-status-badge grm-status-badge--${student.status}`}>
                            {student.status === 'green'  && 'Óptimo'}
                            {student.status === 'yellow' && 'Leve'}
                            {student.status === 'orange' && 'Grave'}
                            {student.status === 'red'    && 'Crítico'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="grm-btn-report"
                            onClick={() => handleOpenModal(student)}
                          >
                            <span className="material-symbols-outlined">description</span>
                            Generar Reporte
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="grm-td-empty">
                        No se encontraron alumnos con ese criterio de búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {modalOpen && selectedStudent && (
        <div className="grm-modal-backdrop" onClick={handleCloseModal}>
          <div className="grm-modal" onClick={e => e.stopPropagation()}>

            <div className="grm-modal-header">
              <h2 className="grm-modal-title">Nuevo Reporte Conductual</h2>
              <button className="grm-modal-close" onClick={handleCloseModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="grm-modal-form" onSubmit={handleSubmitReport}>

              <div className="grm-student-info-grid">
                <div className="grm-field">
                  <label className="grm-field-label">Nombre del Alumno</label>
                  <input
                    className="grm-field-input grm-field-input--readonly"
                    type="text"
                    readOnly
                    value={selectedStudent.name}
                  />
                </div>
                <div className="grm-field">
                  <label className="grm-field-label">Matrícula</label>
                  <input
                    className="grm-field-input grm-field-input--readonly"
                    type="text"
                    readOnly
                    value={selectedStudent.matricula}
                  />
                </div>
                <div className="grm-field">
                  <label className="grm-field-label">Grupo</label>
                  <input
                    className="grm-field-input grm-field-input--readonly"
                    type="text"
                    readOnly
                    value={selectedStudent.group}
                  />
                </div>
                <div className="grm-field">
                  <label className="grm-field-label">Carrera</label>
                  <input
                    className="grm-field-input grm-field-input--readonly"
                    type="text"
                    readOnly
                    value={selectedStudent.career}
                  />
                </div>
              </div>

              <div className="grm-severity-section">
                <label className="grm-section-label">
                  <span className="material-symbols-outlined grm-section-label-icon">traffic</span>
                  Nivel de Gravedad
                </label>
                <div className="grm-severity-grid">
                  <button
                    type="button"
                    className={`grm-severity-btn grm-severity-btn--red${severity === 'red' ? ' grm-severity-btn--selected' : ''}`}
                    onClick={() => handleSelectSeverity('red')}
                  >
                    <div className="grm-severity-dot grm-severity-dot--red" />
                    <span className="grm-severity-name grm-severity-name--red">Crítico</span>
                    <span className="grm-severity-desc">Infracciones graves al reglamento.</span>
                  </button>
                  <button
                    type="button"
                    className={`grm-severity-btn grm-severity-btn--orange${severity === 'orange' ? ' grm-severity-btn--selected' : ''}`}
                    onClick={() => handleSelectSeverity('orange')}
                  >
                    <div className="grm-severity-dot grm-severity-dot--orange" />
                    <span className="grm-severity-name grm-severity-name--orange">Grave</span>
                    <span className="grm-severity-desc">Conductas disruptivas recurrentes.</span>
                  </button>
                  <button
                    type="button"
                    className={`grm-severity-btn grm-severity-btn--yellow${severity === 'yellow' ? ' grm-severity-btn--selected' : ''}`}
                    onClick={() => handleSelectSeverity('yellow')}
                  >
                    <div className="grm-severity-dot grm-severity-dot--yellow" />
                    <span className="grm-severity-name grm-severity-name--yellow">Leve</span>
                    <span className="grm-severity-desc">Llamadas de atención preventivas.</span>
                  </button>
                  <button
                    type="button"
                    className={`grm-severity-btn grm-severity-btn--green${severity === 'green' ? ' grm-severity-btn--selected' : ''}`}
                    onClick={() => handleSelectSeverity('green')}
                  >
                    <div className="grm-severity-dot grm-severity-dot--green" />
                    <span className="grm-severity-name grm-severity-name--green">Excelente</span>
                    <span className="grm-severity-desc">Reconocimiento por conductas positivas, buen desempeño o participación destacada.</span>
                  </button>
                </div>
              </div>

              {severity && (
                <div className="grm-reasons-section">
                  <label className="grm-reasons-title">Seleccione el motivo principal:</label>
                  <div className="grm-reasons-list">
                    {currentReasons.map((reason, idx) => (
                      <label key={idx} className="grm-reason-item">
                        <input
                          type="checkbox"
                          className="grm-reason-checkbox"
                          checked={!!checkedReasons[idx]}
                          onChange={() => handleReasonChange(idx)}
                        />
                        <span className="grm-reason-text">{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grm-comment-section">
                <div className="grm-comment-header">
                  <label className="grm-field-label">Comentarios Adicionales (opcional)</label>
                  <span className={`grm-char-counter${comment.length >= 450 ? ' grm-char-counter--warning' : ''}`}>
                    {comment.length} / 500
                  </span>
                </div>
                <textarea
                  className="grm-textarea"
                  maxLength={500}
                  placeholder="Descripción adicional del incidente (opcional)..."
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>

              <div className="grm-meta-grid">
                <div className="grm-field">
                  <label className="grm-field-label">Fecha del Incidente</label>
                  <div className="grm-field-icon-wrap">
                    <span className="material-symbols-outlined grm-field-icon">event</span>
                    <input
                      className="grm-field-input grm-field-input--icon grm-field-input--readonly"
                      type="text"
                      readOnly
                      value={incidentDate}
                    />
                  </div>
                </div>
                <div className="grm-field">
                  <label className="grm-field-label">Docente Responsable</label>
                  <div className="grm-field-icon-wrap">
                    <span className="material-symbols-outlined grm-field-icon">badge</span>
                    <input
                      className="grm-field-input grm-field-input--icon grm-field-input--readonly"
                      type="text"
                      readOnly
                      value="Andrew Mike"
                    />
                  </div>
                </div>
              </div>

              <div className="grm-modal-actions">
                <button type="button" className="grm-btn-cancel" onClick={handleCancelModal}>
                  Cancelar
                </button>
                <button type="submit" className="grm-btn-submit">
                  <span className="material-symbols-outlined">description</span>
                  Generar Reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successModalOpen && selectedStudent && (
        <div className="grm-success-backdrop">
          <div className="grm-success-modal">
            <div className="grm-success-icon-wrap">
              <div className="grm-success-icon-glow" />
              <div className="grm-success-icon-circle">
                <span className="material-symbols-outlined grm-success-icon">check</span>
              </div>
            </div>

            <h2 className="grm-success-title">Reporte generado correctamente</h2>
            <p className="grm-success-text">
              El reporte conductual del alumno ha sido registrado exitosamente.
              Los cambios ahora son visibles en el panel académico institucional.
            </p>

            <div className="grm-success-actions">
              <button
                type="button"
                className="grm-success-btn-primary"
                onClick={handleAcceptSuccess}
              >
                Aceptar
              </button>
              <button
                type="button"
                className="grm-success-btn-secondary"
                onClick={handleGenerateAnotherReport}
              >
                Generar otro reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {warningModalOpen && (
        <div className="grm-success-backdrop">
          <div className="grm-success-modal grm-warning-modal">
            <div className="grm-success-icon-wrap">
              <div className="grm-success-icon-glow grm-warning-icon-glow" />
              <div className="grm-success-icon-circle grm-warning-icon-circle">
                <span className="material-symbols-outlined grm-success-icon">priority_high</span>
              </div>
            </div>

            <h2 className="grm-success-title">No es posible guardar el reporte</h2>
            <p className="grm-success-text">
              Debes completar toda la información obligatoria antes de guardar el reporte.
              Asegúrate de seleccionar el nivel del reporte y el motivo principal antes de continuar.
            </p>

            <div className="grm-success-actions">
              <button
                type="button"
                className="grm-success-btn-primary"
                onClick={handleCloseWarning}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}