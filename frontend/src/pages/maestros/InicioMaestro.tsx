import { useNavigate } from 'react-router-dom';
import './InicioMaestro.css';

export default function InicioMaestro() {
  const navigate = useNavigate();

  function handlePasarLista(): void {
    navigate('/maestro/clases');
  }

  return (
    <div className="im-canvas-only">
      {/* Bento Grid */}
      <div className="bento-grid">
        {/* Horario de Hoy Card */}
        <div className="card card--schedule">
          <div className="card-header">
            <div className="card-header-left">
              <div className="card-icon-box">
                <span className="material-symbols-outlined card-icon">schedule</span>
              </div>
              <h3 className="card-title">Horario de Hoy</h3>
            </div>
            <span className="date-chip">Lunes Académico</span>
          </div>

          <div className="schedule-list">
            {/* Class Item */}
            <div className="schedule-item">
              <div className="schedule-time">
                <p className="schedule-time-start">07:00</p>
                <p className="schedule-time-end">08:40</p>
              </div>
              <div className="schedule-divider" />
              <div className="schedule-info">
                <p className="schedule-subject">Programación de Aplicaciones Web</p>
                <p className="schedule-group">Grupo SOMA-505 • Laboratorio de Cómputo B</p>
              </div>
              <button className="btn-pasar-lista" onClick={handlePasarLista}>
                Pasar Lista
              </button>
            </div>

            {/* Class Item */}
            <div className="schedule-item">
              <div className="schedule-time">
                <p className="schedule-time-start">08:40</p>
                <p className="schedule-time-end">10:20</p>
              </div>
              <div className="schedule-divider" />
              <div className="schedule-info">
                <p className="schedule-subject">Base de Datos Avanzada</p>
                <p className="schedule-group">Grupo INFO-402 • Salón K2</p>
              </div>
              <button className="btn-pasar-lista" onClick={handlePasarLista}>
                Pasar Lista
              </button>
            </div>

            {/* Class Item (Receso) */}
            <div className="schedule-item schedule-item--break">
              <div className="schedule-time">
                <p className="schedule-time-start schedule-time-start--muted">10:20</p>
                <p className="schedule-time-end">10:50</p>
              </div>
              <div className="schedule-divider schedule-divider--muted" />
              <div className="schedule-info schedule-info--break">
                <span className="material-symbols-outlined schedule-break-icon">coffee</span>
                <p className="schedule-break-text">Receso Institucional</p>
              </div>
            </div>
          </div>
        </div>

        {/* Avisos de Dirección Card */}
        <div className="card-stack">
          <div className="card card--announcements">
            <div className="card-header card-header--no-margin">
              <div className="card-header-left">
                <div className="card-icon-box">
                  <span className="material-symbols-outlined card-icon">campaign</span>
                </div>
                <h3 className="card-title">Avisos de Dirección</h3>
              </div>
            </div>

            <div className="announcements-list">
              <div className="announcement">
                <p className="announcement-title">Cierre de Calificaciones</p>
                <p className="announcement-description">
                  Se les recuerda que el sistema cerrará para el primer parcial el día
                  viernes a las 23:59 hrs.
                </p>
                <p className="announcement-time">Hace 2 horas</p>
              </div>
              <div className="announcement announcement--low">
                <p className="announcement-title">Mantenimiento de Servidores</p>
                <p className="announcement-description">
                  El acceso al portal podrá verse interrumpido este sábado de 02:00 a
                  05:00 AM.
                </p>
                <p className="announcement-time">Ayer</p>
              </div>
            </div>

            <button className="btn-ver-avisos" onClick={() => console.log('Ver todos los avisos')}>
              <span>Ver todos los avisos</span>
              <span className="material-symbols-outlined btn-ver-avisos-icon">open_in_new</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Contextual Section */}
      <div className="bottom-grid">
        <div className="context-card" onClick={() => navigate('/maestro/clases')} style={{ cursor: 'pointer' }}>
          <div className="context-icon-circle context-icon-circle--error">
            <span className="material-symbols-outlined context-icon">warning</span>
          </div>
          <div>
            <p className="context-title">Alumnos en Semáforo Rojo/Amarillo</p>
            <p className="context-subtitle">Requieren atención y seguimiento conductual</p>
          </div>
        </div>

        <div className="context-card">
          <div className="context-icon-circle context-icon-circle--primary">
            <span className="material-symbols-outlined context-icon">task_alt</span>
          </div>
          <div>
            <p className="context-title">Asistencia Consolidada</p>
            <p className="context-subtitle">Reporte general de asistencia semanal</p>
          </div>
        </div>
      </div>
    </div>
  );
}