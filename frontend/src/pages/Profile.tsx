// ============================================================
// Profile.tsx — Perfil de Alumno | CONALEP Gestión Conductual
// Adaptado al CSS propio (sin Tailwind)
//
// NOTA DE INTEGRACIÓN DEL MENÚ:
// El bloque de Sidebar/Navegación de este archivo fue reemplazado
// en su totalidad por el "Menú Base Oficial" extraído de Home.tsx.
// Se conserva exactamente la misma estructura JSX, clases CSS,
// lógica de apertura/cierre (estado + overlay) e ícono de marca
// que existen en Home. La única diferencia permitida es el ítem
// de navegación activo (activeNavId="profile").
// El resto del contenido de la pantalla (hero card, info-grid,
// footer) permanece intacto.
//
// NOTA DE NAVEGACIÓN GLOBAL:
// Esta pantalla ya exponía activeNavId / onNavigate / onLogout con
// el mismo contrato usado en el resto de las pantallas, por lo que
// no requirió cambios de comportamiento. Solo se formalizó el tipo
// con la interfaz ScreenProps compartida.
// ============================================================

import { useEffect, useState } from 'react';
import './Profile.css';
import fotoPerfil from "../assets/imagenes/FotoPerfil.jpg";

// ────────────────────────────────────────
// Tipos e ítems de navegación
// (idénticos en estructura a los de Home.tsx / mockData.navItems)
// ────────────────────────────────────────
interface NavItem {
  id: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: 'home', label: 'Inicio' },
  { id: 'profile', icon: 'person', label: 'Perfil' },
  { id: 'schedule', icon: 'schedule', label: 'Horario' },
  { id: 'history', icon: 'calendar_today', label: 'Historial de Reportes' },
];

// ────────────────────────────────────────
// Contrato de navegación global (idéntico al usado en Home/Schedule/History)
// ────────────────────────────────────────
interface ScreenProps {
  activeNavId?: string;
  onNavigate?: (screen: string) => void;
  onLogout?: () => void;
}

// ────────────────────────────────────────
// Ícono (Material Symbols Outlined) — igual que en Home.tsx
// ────────────────────────────────────────
const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
);

// ────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────
type ProfileProps = ScreenProps;

export default function Profile({
  activeNavId = 'perfil',
  onNavigate,
  onLogout,
}: ProfileProps) {

  // ────────────────────────────────────────
  // ESTADO DEL MENÚ — trasplantado literalmente de Home.tsx
  // (sustituye a los refs + classList.toggle que usaba Profile)
  // ────────────────────────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Bloquea el scroll del body mientras el sidebar móvil está abierto.
  // (idéntico al efecto de Home.tsx)
  useEffect(() => {
    document.body.classList.toggle('no-scroll', isSidebarOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    console.log('Mock: cerrar sesión');
    onLogout?.();
  };

  // ────────────────────────────────────────
  // EFECTO PROPIO DE LA PANTALLA (no es parte del menú)
  // Efecto de scroll en el header — se conserva igual que en el
  // Profile original, solo se quitó lo relativo al sidebar.
  // ────────────────────────────────────────
  useEffect(() => {
    const handleScroll = (): void => {
      const header = document.querySelector('.topbar');
      if (!header) return;
      if (window.scrollY > 20) {
        header.classList.add('topbar--scrolled');
      } else {
        header.classList.remove('topbar--scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────
  return (
    <div className="profile-root">

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
          ÁREA DE CONTENIDO PRINCIPAL
          Desplazada a la derecha del sidebar en desktop
          ────────────────────────────────────── */}
      <main className="main-content">

        {/* ──────────────────────────────────────
            HEADER — Barra superior (TopAppBar)
            Sticky con efecto glassmorphism al hacer scroll
            (botón hamburguesa adaptado al patrón de estado de Home)
            ────────────────────────────────────── */}
        <header className="topbar">
          <div className="topbar__left">

            {/* Botón de menú hamburguesa — clase del Menú Base Oficial */}
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label="Abrir menú de navegación"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              <Icon name="menu" />
            </button>

            {/* Breadcrumb visible solo en móvil */}
            <span className="topbar__breadcrumb">Conalep / Perfil</span>

            {/* Navegación breadcrumb (desktop, vacía en el original) */}
            <nav className="topbar__nav-desktop" />
          </div>
        </header>

        {/* ──────────────────────────────────────
            CONTENIDO PRINCIPAL (sin cambios)
            ────────────────────────────────────── */}
        <div className="page-content">

          {/* ──────────────────────────────────────
              HERO CARD — Resumen del perfil del alumno
              Foto, nombre, carrera y matrícula
              ────────────────────────────────────── */}
          <section className="hero-card hero-dot-pattern">
            <div className="hero-card__inner">

              {/* Avatar con badge de verificado */}
              <div className="hero-card__avatar-wrapper">
                <div className="hero-card__avatar-ring">
                  <img
                    alt="Agustín Pérez"
                    className="w-full h-full rounded-full object-cover"
                    src={fotoPerfil}
                  />
                </div>

                {/* Badge de verificado */}
                <div className="hero-card__verified-badge" title="Verificado">
                  <span className="material-symbols-outlined">verified</span>
                </div>
              </div>

              {/* Información del alumno */}
              <div className="hero-card__info">
                <div className="hero-card__name-row">
                  <h1 className="hero-card__name">
                    Agustín Juan Pérez González
                  </h1>
                  <span className="hero-card__badge">Alumno Regular</span>
                </div>
                <div className="hero-card__details">
                  <div className="hero-card__detail-row">
                    <span className="material-symbols-outlined">settings_suggest</span>
                    <p className="hero-card__detail-text">
                      Soporte y Mantenimiento en Equipo de Cómputo
                    </p>
                  </div>
                  <div className="hero-card__detail-row">
                    <span className="material-symbols-outlined">id_card</span>
                    <p className="hero-card__detail-text">Matrícula: 21001020-5</p>
                  </div>
                </div>
              </div>

              {/* Botón de editar datos */}
              <div className="hero-card__actions">
                <button className="btn-edit">
                  <span className="material-symbols-outlined">edit</span>
                  Editar Datos
                </button>
              </div>
            </div>
          </section>

          {/* ──────────────────────────────────────
              GRILLA DE INFORMACIÓN
              3 tarjetas: Académica, Contacto, Médica
              ────────────────────────────────────── */}
          <section className="info-grid">

            {/* Tarjeta: Información Académica */}
            <div className="info-card">
              <div className="info-card__header">
                <div className="info-card__icon-box">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <h3 className="info-card__title">Información Académica</h3>
              </div>
              <div className="info-card__body">
                <div className="info-field">
                  <label className="info-field__label">Plantel</label>
                  <p className="info-field__value">CONALEP Puebla I</p>
                </div>
                <div className="info-field">
                  <label className="info-field__label">Semestre y Grupo</label>
                  <p className="info-field__value">4to - Grupo 402</p>
                </div>
                <div className="info-field">
                  <label className="info-field__label">Turno</label>
                  <p className="info-field__value">Matutino</p>
                </div>
                <div className="info-field">
                  <label className="info-field__label">Generación</label>
                  <p className="info-field__value">2023 - 2026</p>
                </div>
              </div>
            </div>

            {/* Tarjeta: Datos de Contacto */}
            <div className="info-card">
              <div className="info-card__header">
                <div className="info-card__icon-box">
                  <span className="material-symbols-outlined">contact_mail</span>
                </div>
                <h3 className="info-card__title">Datos de Contacto</h3>
              </div>
              <div className="info-card__body">
                <div className="info-field">
                  <label className="info-field__label">Correo Institucional</label>
                  <p className="info-field__value info-field__value--truncate">
                    agustin.perez210@pue.conalep.edu.mx
                  </p>
                </div>
                <div className="info-field">
                  <label className="info-field__label">Correo Personal</label>
                  <p className="info-field__value">agustin.perez.gj@gmail.com</p>
                </div>
                <div className="info-field">
                  <label className="info-field__label">Teléfono</label>
                  <p className="info-field__value">+52 222 456 7890</p>
                </div>
              </div>
            </div>

            {/* Tarjeta: Información Médica */}
            <div className="info-card">
              <div className="info-card__header">
                <div className="info-card__icon-box info-card__icon-box--error">
                  <span className="material-symbols-outlined icon-filled">
                    medical_services
                  </span>
                </div>
                <h3 className="info-card__title">Información Médica</h3>
              </div>
              <div className="info-card__body">

                {/* Tipo de sangre */}
                <div className="info-field info-field--row">
                  <div>
                    <label className="info-field__label">Tipo de Sangre</label>
                    <div className="blood-type-chip">
                      <span className="material-symbols-outlined">water_drop</span>
                      <span>O+</span>
                    </div>
                  </div>
                </div>

                {/* Tutor de emergencia */}
                <div className="info-field">
                  <label className="info-field__label">Tutor de Emergencia</label>
                  <p className="info-field__value">María González</p>
                  <p className="info-field__sub">+52 222 123 4567</p>
                </div>

                {/* Alergias */}
                <div className="info-field">
                  <label className="info-field__label">Alergias / Notas</label>
                  <p className="info-field__value info-field__value--error">
                    Ninguna reportada
                  </p>
                </div>

              </div>
            </div>

          </section>
        </div>

        {/* ──────────────────────────────────────
            FOOTER — Pie de página (sin cambios)
            ────────────────────────────────────── */}
        <footer className="page-footer">
          <div className="page-footer__inner">
            <div className="page-footer__copy">
              © 2026 CONALEP. Sistema Integral de Gestión Conductual. Todos los derechos reservados.
            </div>
            <div className="page-footer__links">
              <a href="#">Aviso de Privacidad</a>
              <a href="#">Términos y Condiciones</a>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
}