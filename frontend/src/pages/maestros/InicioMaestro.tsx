import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import './InicioMaestro.css';

export default function InicioMaestro() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [clases, setClases] = useState<ClassDocente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadGroups() {
      try {
        const data = await getGruposDeDocente(session!.user!.id);
        setClases(data);
      } catch (err) {
        console.error('Error al cargar clases del docente:', err);
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, [session]);

  function handlePasarLista(clase?: ClassDocente): void {
    if (clase) {
      navigate('/maestro/asistencia', {
        state: {
          grupoId: clase.grupoId,
          grupoNombre: clase.grupoNombre,
          materiaId: clase.materiaId,
          materiaNombre: clase.materiaNombre,
        },
      });
    } else {
      navigate('/maestro/clases');
    }
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
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#5c5f60' }}>Cargando clases de hoy...</div>
            ) : clases.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#5c5f60' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', display: 'block' }}>search_off</span>
                No tienes grupos ni materias asignadas.
              </div>
            ) : (
              <>
                {/* NOTA: El horario detallado por día/hora es estático en el frontend (mostrando placeholders "—:—")
                    porque el backend no cuenta aún con una tabla 'horarios' u otra estructura de base de datos dedicada.
                    Esta funcionalidad queda pendiente de una fase futura. */}
                {clases.map((clase) => (
                  <div className="schedule-item" key={clase.materiaId}>
                    <div className="schedule-time" title="Horario pendiente de configurar">
                      <p className="schedule-time-start">—:—</p>
                      <p className="schedule-time-end">—:—</p>
                    </div>
                    <div className="schedule-divider" />
                    <div className="schedule-info">
                      <p className="schedule-subject">{clase.materiaNombre}</p>
                      <p className="schedule-group">
                        Grupo {clase.grupoNombre} • {clase.turno === 'V' ? 'Turno Vespertino' : 'Turno Matutino'}
                      </p>
                      <p style={{ fontSize: '11px', color: '#8e9192', fontStyle: 'italic', marginTop: '2px' }}>
                        * Horario pendiente de configurar
                      </p>
                    </div>
                    <button className="btn-pasar-lista" onClick={() => handlePasarLista(clase)}>
                      Pasar Lista
                    </button>
                  </div>
                ))}

                {/* Class Item (Receso) decorativo */}
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
              </>
            )}
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

            {/* Funcionalidad de ver todos los avisos pendiente de implementar en el backend */}
            <button className="btn-ver-avisos" disabled title="Próximamente" onClick={() => console.log('Ver todos los avisos')}>
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
            <p className="context-title">Alumnos en Semáforo de Alerta (Naranja/Rojo)</p>
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