import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import { useNavigate } from 'react-router-dom';
import './ClasesPantalla.css';

export default function ClasesPantalla() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [clases, setClases] = useState<ClassDocente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function loadGroups() {
      try {
        const data = await getGruposDeDocente(session!.user!.id);
        setClases(data);
      } catch (err) {
        console.error('Error al cargar grupos del docente:', err);
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, [session]);

  function handleGestionarGrupo(clase: ClassDocente): void {
    navigate('/maestro/asistencia', {
      state: {
        grupoId: clase.grupoId,
        grupoNombre: clase.grupoNombre,
        materiaId: clase.materiaId,
        materiaNombre: clase.materiaNombre,
      },
    });
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Cargando clases...</div>;
  }

  return (
    <div className="groups-canvas-only animate-fade-in">
      {/* Sección Header */}
      <section className="section-header">
        <div className="section-header-left">
          <div className="section-header-icon-box">
            <span className="material-symbols-outlined section-header-icon">groups</span>
          </div>
          <div>
            <h2 className="section-header-title">Mis Clases y Grupos</h2>
            <p className="section-header-subtitle">
              Administra la asistencia, participaciones y reportes conductuales de tus alumnos asignados.
            </p>
          </div>
        </div>
        <button className="btn-add-group" onClick={() => console.log('Asignar Grupo')}>
          <span className="material-symbols-outlined btn-add-group-icon">add</span>
          <span>Asignar Grupo</span>
        </button>
      </section>

      {/* Grid de Tarjetas de Grupo */}
      <div className="groups-grid">
        {clases.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#5c5f60', background: '#ffffff', borderRadius: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '8px' }}>search_off</span>
            <p>No tienes grupos ni materias asignadas en este ciclo escolar.</p>
          </div>
        ) : (
          clases.map((clase) => (
            <div className="group-card" key={clase.materiaId} onClick={() => handleGestionarGrupo(clase)}>
              <div className="group-card-header">
                <span className="group-code-badge">{clase.grupoNombre}</span>
                <span className="group-stats-pill">Activo</span>
              </div>
              <h3 className="group-card-title">{clase.materiaNombre}</h3>
              <p className="group-card-desc">
                Semestre: {clase.semestre}º • Turno: {clase.turno}
                <br />
                Haz clic para pasar asistencia, registrar participaciones o ver incidencias.
              </p>
              <div className="group-card-footer">
                <button
                  className="btn-manage-group"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGestionarGrupo(clase);
                  }}
                >
                  <span>Gestionar Clase</span>
                  <span className="material-symbols-outlined btn-manage-group-arrow">arrow_forward</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sección Resumen de Estadísticas */}
      <footer className="stats-footer">
        <div className="stat-item">
          <p className="stat-number">{clases.length}</p>
          <p className="stat-label">Clases Asignadas</p>
        </div>
        <div className="stat-item-divider" />
        <div className="stat-item">
          <p className="stat-number">Activas</p>
          <p className="stat-label">Estado de Carga</p>
        </div>
      </footer>
    </div>
  );
}