import { useState } from 'react';
import type { FormEvent } from 'react';
import './Login.css';
import logoConalep from '../assets/imagenes/CONALEPlogo.png';
import logoSCTech from '../assets/imagenes/SCTechlogo.png'; // <- Asegúrate de meter este archivo a la carpeta imágenes en tu explorador

// ---------------------------------------------------------------------------
// Iconos (basados en Lucide Icons, incrustados como SVG para no depender de
// librerías externas). Mantienen los mismos paths que el diseño original.
// ---------------------------------------------------------------------------

const IconBarChart3 = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </svg>
);

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <path d="M16 3.128a4 4 0 0 1 0 7.744" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <circle cx="9" cy="7" r="4" />
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </svg>
);

const IconClipboardList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface LoginProps {
  /** onLogin?: (credentials: { username: string; password: string }) => void; */
  onLoginSuccess?: () => void;
  /**
   * Callback opcional invocado al enviar el formulario.
   * Por ahora solo recibe los datos capturados (mock); la autenticación
   * real se conectará cuando exista backend.
   */
  onLogin?: (credentials: { username: string; password: string }) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

const Login = ({ onLoginSuccess }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHuman, setIsHuman] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // TODO: integrar con el servicio de autenticación real cuando exista backend.
    // Por ahora solo se simula el envío con datos mock.
    console.log('Mock login attempt:', { username, password, isHuman });

   onLoginSuccess?.();
  };

  return (
    <div className="login-page">
      {/* Panel izquierdo: identidad institucional */}
      <section className="login-intro-panel">
        <div className="login-intro-content">
          <div className="login-glass-card">
            <h1>Bienvenido al Sistema Conductual</h1>
            <p>
              Plataforma integral para la gestión institucional y el fortalecimiento del clima
              escolar.
            </p>
            <ul className="login-feature-list">
              <li>
                <span className="login-feature-icon">
                  <IconBarChart3 />
                </span>
                <span>Monitoreo conductual</span>
              </li>
              <li>
                <span className="login-feature-icon">
                  <IconUsers />
                </span>
                <span>Seguimiento de estudiantes</span>
              </li>
              <li>
                <span className="login-feature-icon">
                  <IconFileText />
                </span>
                <span>Análisis de comportamiento</span>
              </li>
              <li>
                <span className="login-feature-icon">
                  <IconClipboardList />
                </span>
                <span>Generación de reportes y estadísticas</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="login-intro-footer">
          <p>Colegio Nacional de Educación Profesional Técnica</p>
        </div>
      </section>

      {/* Panel derecho: formulario de acceso */}
      <main className="login-form-panel">
        <div className="login-form-wrapper">
          <div className="login-branding">
           <img
  src={logoConalep}
  alt="Logo CONALEP"
  className="login-logo"
/>
<div className="login-divider" />
<img
  src={logoSCTech}
  alt="Logo SC Tech"
  className="login-logo login-logo-secondary"
/>
          </div>

          <div className="login-header">
            <h2>Sistema Conductual</h2>
            <p>Ingrese sus credenciales de acceso</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {/* Usuario */}
            <div className="login-field">
              <label htmlFor="username">Usuario</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <IconUser />
                </span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <IconLock />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <IconEye /> : <IconEyeOff />}
                </button>
              </div>
            </div>

            {/* Captcha (placeholder visual, sin lógica real) */}
            <div className="login-captcha">
              <div className="login-captcha-check">
                <input
                  id="captcha"
                  type="checkbox"
                  checked={isHuman}
                  onChange={(e) => setIsHuman(e.target.checked)}
                />
                <label htmlFor="captcha">No soy un robot</label>
              </div>
              <div className="login-captcha-badge">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAImbvRoxvtsTadZWXZ9UyZHf-gIIUmx_FkNtCOGfftXyeiwFTSlfKLYKyK6kCXsp-QVFOkSKZFaECmyE2fIY5BPcZ3gmOiy3hsMNN7RHcGY7jaK6gjw1OgwRT7_rOQ0E2R4RekCa0OtqOoOHYCvCG5SGc4QH392zQhFeYLE_8GKhUPNSAeyO8Z5UoiXIIXsyUG9-Qm2qPwWGEPJZ3OPJ0L8PfkK6x7Yj-x5IGKUrl1dI3KOQ-9x2YQrI8F_Mf_rL1JDpEa81fw6Gh"
                  alt="Captcha"
                />
              </div>
            </div>

            <button type="submit" className="login-submit-btn">
              Iniciar Sesión
            </button>
          </form>
        </div>

        <footer className="login-footer">
          <div className="login-footer-brand">
            <span>CONALEP</span>
            <span>Colegio Nacional de Educación Profesional Técnica</span>
          </div>
          <div className="login-footer-links">
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
            <a href="#">Contacto</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Login;