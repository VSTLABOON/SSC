import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import { BIAnalyticsDashboard } from '../../components/bi/BIAnalyticsDashboard';
import './InicioMaestro.css';

export default function InicioMaestro() {
  const navigate = useNavigate();
  const { session, plantelId } = useAuth();
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
                    </div>
                    <button className="btn-pasar-lista" onClick={() => handlePasarLista(clase)}>
                      Pasar Lista
                    </button>
                  </div>
                ))}
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
                  Se les recuerda que el sistema cerrará para el primer parcial el día viernes a las 23:59 hrs.
                </p>
                <p className="announcement-time">Hace 2 horas</p>
              </div>
              <div className="announcement announcement--low">
                <p className="announcement-title">Mantenimiento de Servidores</p>
                <p className="announcement-description">
                  El acceso al portal podrá verse interrumpido este sábado de 02:00 a 05:00 AM.
                </p>
                <p className="announcement-time">Ayer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Analítica de BI para Docentes */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#204785' }}>analytics</span>
          Inteligencia Conductual de tus Grupos
        </h3>
        {plantelId ? (
          <BIAnalyticsDashboard userRole="docente" plantelId={plantelId} />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando información del plantel...</div>
        )}
      </div>
    </div>
  );
}