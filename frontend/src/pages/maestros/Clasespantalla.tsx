import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import { useNavigate } from 'react-router-dom';
import './Clasespantalla.css';

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
    <div className="animate-fade-in">
      {/* Sección Header */}
      <section className="section-header">
        <div>
          <h2 className="section-title">Mis Clases y Grupos</h2>
          <p className="section-subtitle">
            <span className="material-symbols-outlined section-subtitle-icon" style={{ marginRight: '8px', verticalAlign: 'middle' }}>groups</span>
            Administra la asistencia, participaciones y reportes conductuales de tus alumnos asignados.
          </p>
        </div>
        {/* Funcionalidad de "Asignar Grupo" pendiente de implementar en el backend */}
        <button className="btn-asignar-grupo" disabled title="Próximamente" onClick={() => console.log('Asignar Grupo')}>
          <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>add</span>
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
                <span className="group-code-chip">{clase.grupoNombre}</span>
                <span className="group-status-chip">
                  <span className="group-status-dot" />
                  Activo
                </span>
              </div>
              <h3 className="group-title" style={{ marginBottom: '12px' }}>{clase.materiaNombre}</h3>
              <div className="group-card-stats" style={{ marginBottom: '20px' }}>
                <div className="group-stat">
                  <span className="material-symbols-outlined group-stat-icon">import_contacts</span>
                  <span className="group-stat-text">Semestre: {clase.semestre}º</span>
                </div>
                <div className="group-stat">
                  <span className="material-symbols-outlined group-stat-icon">schedule</span>
                  <span className="group-stat-text">Turno: {clase.turno === 'M' ? 'Matutino' : 'Vespertino'}</span>
                </div>
              </div>
              <div className="group-card-footer">
                <button
                  className="link-gestionar"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGestionarGrupo(clase);
                  }}
                >
                  <span>Gestionar Clase</span>
                  <span className="material-symbols-outlined link-gestionar-icon">arrow_forward</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sección Resumen de Estadísticas */}
      <footer className="summary-footer">
        <div className="summary-item">
          <div className="summary-icon-circle">
            <span className="material-symbols-outlined">collections_bookmark</span>
          </div>
          <div>
            <p className="summary-value">{clases.length}</p>
            <p className="summary-label">Clases Asignadas</p>
          </div>
        </div>
        <div className="summary-item summary-item--bordered">
          <div className="summary-icon-circle">
            <span className="material-symbols-outlined">toggle_on</span>
          </div>
          <div>
            <p className="summary-value">Activo</p>
            <p className="summary-label">Estado de Carga</p>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon-circle">
            <span className="material-symbols-outlined">event_available</span>
          </div>
          <div>
            <p className="summary-value">2026</p>
            <p className="summary-label">Ciclo Escolar</p>
          </div>
        </div>
      </footer>
    </div>
  );
}