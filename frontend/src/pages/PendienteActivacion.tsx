import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PendienteActivacion.css';

export default function PendienteActivacion() {
  const { signOut, activo, bloqueadoHasta } = useAuth();
  const navigate = useNavigate();

  async function handleSalir() {
    await signOut();
    navigate('/login');
  }

  const ahora = new Date();
  const isLocked = bloqueadoHasta && new Date(bloqueadoHasta) > ahora;
  const isInactive = activo === false;

  let title = 'Cuenta en revisión';
  let desc = 'Tu cuenta ha sido creada correctamente, pero aún no ha sido activada por el directivo de tu plantel.';
  let secondaryDesc = 'Recibirás una notificación cuando tu acceso esté listo. Si crees que esto es un error, contacta al área de Control Escolar.';
  let icon = 'hourglass_top';

  if (isLocked) {
    title = 'Cuenta bloqueada';
    desc = 'Esta cuenta se encuentra bloqueada temporalmente debido a demasiados intentos de inicio de sesión fallidos.';
    secondaryDesc = 'Por favor, espera 15 minutos antes de volver a intentarlo.';
    icon = 'lock';
  } else if (isInactive) {
    title = 'Cuenta desactivada';
    desc = 'Tu cuenta ha sido desactivada por el directivo de tu plantel.';
    secondaryDesc = 'Si crees que esto es un error, contacta al administrador o a la dirección escolar.';
    icon = 'block';
  }

  return (
    <div className="pa-page">
      <div className="pa-card">
        <div className="pa-icon-wrap">
          <span className="material-symbols-outlined pa-icon">{icon}</span>
        </div>
        <h1 className="pa-title">{title}</h1>
        <p className="pa-desc">
          {desc}
        </p>
        <p className="pa-desc pa-desc--secondary">
          {secondaryDesc}
        </p>
        <button className="pa-btn" onClick={handleSalir}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
