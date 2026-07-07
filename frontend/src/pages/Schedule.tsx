// Schedule.tsx
//
// NOTA DE INTEGRACIÓN DEL MENÚ:
// El bloque de Sidebar/Navegación/Overlay/Botón-hamburguesa de este
// archivo fue reemplazado en su totalidad por el "Menú Base Oficial"
// extraído de Home.tsx. Se conserva exactamente la misma estructura
// JSX, clases CSS, lógica de apertura/cierre (estado + overlay) e
// ícono de marca que existen en Home. La única diferencia permitida
// es el ítem de navegación activo (activeNavId="horario").
// El resto del contenido de la pantalla (header, grilla de horario,
// tarjetas de clase, estadísticas, notas) permanece intacto, así
// como la lógica propia de Schedule (handleResize del contenido,
// handleDownload del PDF).
//
// NOTA DE NAVEGACIÓN GLOBAL:
// Esta pantalla ya exponía activeNavId / onNavigate / onLogout con
// el mismo contrato usado en el resto de las pantallas, por lo que
// no requirió cambios de comportamiento. Solo se formalizó el tipo
// con la interfaz ScreenProps compartida.

/* =========================================================
   IMPORTACIONES
   ========================================================= */
import { useEffect, useRef, useState } from 'react';
import './Schedule.css';

/* =========================================================
   TIPOS E INTERFACES
   ========================================================= */
interface ClassCardProps {
  borderColor: string;
  textColor: string;
  subject: string;
  professor: string;
  icon: string;
  room: string;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

/* =========================================================
   Contrato de navegación global (idéntico al usado en Home/Profile/History)
   ========================================================= */
interface ScreenProps {
  activeNavId?: string;
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
}

/* =========================================================
   ÍCONOS Y NAV ITEMS DEL MENÚ BASE OFICIAL (idénticos a Home.tsx)
   ========================================================= */
const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

const navItems: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Inicio' },
  { id: 'profile', icon: 'person', label: 'Perfil' },
  { id: 'schedule', icon: 'schedule', label: 'Horario' },
  { id: 'history', icon: 'assignment_late', label: 'Historial de Reportes' },
];

/* =========================================================
   COMPONENTE AUXILIAR — Tarjeta de clase (sin cambios)
   ========================================================= */
function ClassCard({ borderColor, textColor, subject, professor, icon, room }: ClassCardProps) {
  return (
    <div className="class-card" style={{ borderLeftColor: borderColor }}>
      <p className="class-card__subject" style={{ color: textColor }}>{subject}</p>
      <p className="class-card__professor">{professor}</p>
      <div className="class-card__room">
        <span className="material-symbols-outlined">{ icon }</span>
        {room}
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
   ========================================================= */
type ScheduleProps = ScreenProps;

export default function Schedule({
  activeNavId = 'horario',
  onNavigate,
  onLogout,
}: ScheduleProps) {

  /* =========================================================
     ESTADO DEL MENÚ — trasplantado literalmente de Home.tsx
     (sustituye a los refs + classList.toggle del sidebar/overlay
     que usaba Schedule originalmente)
     ========================================================= */
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Bloquea el scroll del body mientras el sidebar móvil está abierto.
  // (idéntico al efecto de Home.tsx; sustituye el
  // document.body.style.overflow manual que usaba Schedule)
  useEffect(() => {
    document.body.classList.toggle('no-scroll', isSidebarOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    console.log('Mock: cerrar sesión');
    onLogout?.();
  };

  /* =========================================================
     REFS PROPIOS DE LA PANTALLA (no son parte del menú)
     ========================================================= */
  const downloadBtnRef = useRef<HTMLButtonElement>(null);
  const btnTextRef     = useRef<HTMLSpanElement>(null);

  /* =========================================================
     EFECTO PROPIO DE LA PANTALLA — Descargar PDF
     (idéntico al original; no depende del sidebar)
     ========================================================= */
  useEffect(() => {
    const downloadBtn = downloadBtnRef.current;
    const btnText     = btnTextRef.current;

    function handleDownload() {
      if (!btnText || !downloadBtn) return;
      const originalContent = btnText.textContent;
      btnText.textContent = 'Generando...';
      downloadBtn.classList.add('btn-download--loading');

      setTimeout(() => {
        btnText.textContent = originalContent;
        downloadBtn.classList.remove('btn-download--loading');
        alert('El horario se ha descargado correctamente.');
      }, 1500);
    }

    if (downloadBtn) downloadBtn.addEventListener('click', handleDownload);
    return () => {
      if (downloadBtn) downloadBtn.removeEventListener('click', handleDownload);
    };
  }, []);

  /* =========================================================
     RENDERIZADO DE LA INTERFAZ
     ========================================================= */
  return (
    <div className="app-root">

      {/* ──────────────────────────────────────
          MENÚ BASE OFICIAL (extraído de Home.tsx)
          Overlay + Sidebar — estructura, clases y lógica
          idénticas a Home, sin alteraciones.
          ────────────────────────────────────── */}

      {/* Overlay del sidebar en móvil */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <nav className={`sidebar ${isSidebarOpen ? 'sidebar--open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <Icon name="school" className="sidebar-brand-icon" />
          <span className="sidebar-brand-name">CONALEP</span>
        </div>

        <div className="sidebar-nav">
          {navItems.map((item: NavItem) => (
            <a
              key={item.id}
              href="#"
              className={`sidebar-link ${
                activeNavId === item.id ? 'sidebar-link--active' : ''
              }`}
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(item.id);
                closeSidebar();
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
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

      {/* ──────────────────────────────────────
          CONTENIDO PRINCIPAL (sin cambios de lógica/estructura,
          salvo el botón de menú que ahora usa la clase y el
          comportamiento del Menú Base Oficial)
          ────────────────────────────────────── */}
      <main className="main-content" id="main-content">

        {/* ── Barra superior móvil ── */}
        <div className="mobile-header">
          <div className="mobile-header__left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Abrir menú de navegación"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              <Icon name="menu" />
            </button>
            <h1 className="mobile-header__brand mobile-header__brand--full">CONALEP</h1>
            <h1 className="mobile-header__brand mobile-header__brand--short">CONALEP / HORARIO</h1>
          </div>
        </div>

        {/* ── Encabezado de página ── */}
        <header className="page-header animate-fade-in">
          <div className="page-header__left">
            <div className="page-header__icon-box">
              <span className="material-symbols-outlined page-header__icon">school</span>
            </div>
            <div>
              <h2 className="page-header__title">Mi Horario de Clases</h2>
              <div className="page-header__period">
                <span className="page-header__period-label">Periodo:</span>
                <span className="page-header__period-badge">Semestre 2024-B</span>
              </div>
            </div>
          </div>
          <div className="page-header__actions">
            <button className="btn-print">
              <span className="material-symbols-outlined">print</span>
              <span className="btn-print__label">Imprimir</span>
            </button>
            <button
              ref={downloadBtnRef}
              className="btn-download"
              id="downloadBtn"
            >
              <span className="material-symbols-outlined">download</span>
              <span ref={btnTextRef} id="btnText">Descargar PDF</span>
            </button>
          </div>
        </header>

        {/* ──────────────────────────────────────
            GRILLA DE HORARIO (sin cambios)
            ────────────────────────────────────── */}
        <div className="schedule-wrapper animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="schedule-scroll">
            <div className="schedule-grid">

              {/* Encabezados de columna */}
              <div className="header-cell">Hora</div>
              <div className="header-cell">Lunes</div>
              <div className="header-cell">Martes</div>
              <div className="header-cell">Miércoles</div>
              <div className="header-cell">Jueves</div>
              <div className="header-cell">Viernes</div>

              {/* ── Fila 07:00 ── */}
              <div className="schedule-cell schedule-cell--time">07:00</div>
              <div className="schedule-cell">
                <ClassCard borderColor="#00492f" textColor="#00492f" subject="Matemáticas IV" professor="Prof. Martínez" icon="meeting_room" room="Aula 204" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#486459" textColor="#486459" subject="Física II" professor="Prof. López" icon="biotech" room="Lab B" />
              </div>
              <div className="schedule-cell">
                <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Filosofía" professor="Prof. Castro" icon="auto_stories" room="Aula 205" />
              </div>

              {/* ── Fila 08:00 ── */}
              <div className="schedule-cell schedule-cell--time">08:00</div>
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Historia Univ." professor="Prof. García" icon="public" room="Aula 301" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Literatura" professor="Prof. Sánchez" icon="book" room="Aula 201" />
              </div>

              {/* ── Fila 09:00 ── */}
              <div className="schedule-cell schedule-cell--time">09:00</div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#1a237e" textColor="#1a237e" subject="Desarrollo Web" professor="Prof. Rodríguez" icon="computer" room="Lab C" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />

              {/* ── Fila 10:00 ── */}
              <div className="schedule-cell schedule-cell--time">10:00</div>
              <div className="schedule-cell">
                <ClassCard borderColor="#1a237e" textColor="#1a237e" subject="Redes" professor="Prof. M. Ruiz" icon="lan" room="Sistemas 2" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell" />

              {/* ── RECESO ── */}
              <div className="receso-row">TIEMPO DE RECESO</div>

              {/* ── Fila 12:00 ── */}
              <div className="schedule-cell schedule-cell--time">12:00</div>
              <div className="schedule-cell">
                <ClassCard borderColor="#1a237e" textColor="#1a237e" subject="Química" professor="Prof. Díaz" icon="science" room="Lab A" />
              </div>
              <div className="schedule-cell">
                <ClassCard borderColor="#00492f" textColor="#00492f" subject="Arte y Diseño" professor="Prof. Torres" icon="palette" room="Taller 1" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#8b4513" textColor="#5d2e0d" subject="Inglés VI" professor="Prof. Hernández" icon="translate" room="Aula 102" />
              </div>
              <div className="schedule-cell">
                <ClassCard borderColor="#ba1a1a" textColor="#ba1a1a" subject="Tutoría Grupal" professor="Coord. Académica" icon="groups" room="Auditorio" />
              </div>

              {/* ── Fila 13:00 ── */}
              <div className="schedule-cell schedule-cell--time">13:00</div>
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#1a237e" textColor="#1a237e" subject="Programación" professor="Prof. Pérez" icon="terminal" room="Lab D" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#486459" textColor="#486459" subject="Ética Prof." professor="Mtro. G. Vela" icon="balance" room="Aula 204" />
              </div>

              {/* ── Fila 14:00 ── */}
              <div className="schedule-cell schedule-cell--time">14:00</div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />
              <div className="schedule-cell">
                <ClassCard borderColor="#486459" textColor="#486459" subject="Ed. Física" professor="Prof. Gómez" icon="fitness_center" room="Gimnasio" />
              </div>
              <div className="schedule-cell" />
              <div className="schedule-cell" />

            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────
            TARJETAS DE ESTADÍSTICAS (sin cambios)
            ────────────────────────────────────── */}
        <div className="stats-grid animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-card">
            <div className="stat-card__icon-box">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <div>
              <p className="stat-card__label">Asignaturas</p>
              <p className="stat-card__value">8 materias</p>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────
            NOTAS DEL PERIODO — Footer informativo (sin cambios)
            ────────────────────────────────────── */}
        <section className="notes-section glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="notes-section__content">
            <h4 className="notes-section__title">
              <span className="material-symbols-outlined">info</span>
              Notas del Periodo
            </h4>
            <p className="notes-section__text">
              Las clases de laboratorio requieren el uso obligatorio de bata blanca. Cualquier cambio en el aula será notificado.
            </p>
          </div>
          <div className="notes-section__action">
            <button className="btn-report">
              <span className="material-symbols-outlined">help</span>
              Reportar Incidencia
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}