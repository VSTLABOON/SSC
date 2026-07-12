import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PendienteActivacion.css';

export default function PendienteActivacion() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSalir() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="pa-page">
      <div className="pa-card">
        <div className="pa-icon-wrap">
          <span className="material-symbols-outlined pa-icon">hourglass_top</span>
        </div>
        <h1 className="pa-title">Cuenta en revisión</h1>
        <p className="pa-desc">
          Tu cuenta ha sido creada correctamente, pero aún no ha sido activada
          por el directivo de tu plantel.
        </p>
        <p className="pa-desc pa-desc--secondary">
          Recibirás una notificación cuando tu acceso esté listo. Si crees que
          esto es un error, contacta al área de Control Escolar.
        </p>
        <button className="pa-btn" onClick={handleSalir}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
