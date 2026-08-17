import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGruposDeDocente } from '../../services/grupos';
import type { ClassDocente } from '../../services/grupos';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import './Clasespantalla.css';

export default function ClasesPantalla() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [clases, setClases] = useState<ClassDocente[]>([]);
  const [verificadasMap, setVerificadasMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const data = await getGruposDeDocente(session.user.id);
      setClases(data);

      const fechaHoy = new Date().toISOString().split('T')[0];
      const materiaIds = data.map(c => c.materiaId);
      
      const map: Record<string, boolean> = {};
      if (materiaIds.length > 0) {
        const { data: asistRows } = await supabase
          .from('asistencias')
          .select('materia_id')
          .in('materia_id', materiaIds)
          .eq('fecha', fechaHoy);

        (asistRows || []).forEach((r: any) => {
          map[r.materia_id] = true;
        });
      }

      // Complementar con storage local por si offline/mock
      materiaIds.forEach(mId => {
        if (localStorage.getItem(`ssc_lista_verificada_${mId}_${fechaHoy}`) === 'true') {
          map[mId] = true;
        }
      });

      setVerificadasMap(map);
    } catch (err) {
      console.error('Error al cargar grupos del docente:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadGroups();

    const handleDataChanged = () => {
      loadGroups();
    };
    window.addEventListener('ssc_data_changed', handleDataChanged);
    return () => window.removeEventListener('ssc_data_changed', handleDataChanged);
  }, [loadGroups]);

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
                {verificadasMap[clase.materiaId] ? (
                  <span className="group-status-chip" style={{ background: '#dcfce7', color: '#166534', borderColor: '#86efac', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                    Lista Pasada (Hoy)
                  </span>
                ) : (
                  <span className="group-status-chip" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                    Pendiente Hoy
                  </span>
                )}
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