import React, { useState } from 'react';
import { sendPreventiveAlertToTutor } from '../../services/bi';
import type { BIRiskStudent } from '../../services/bi';
import { useAuth } from '../../context/AuthContext';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import InlineAlert from '../InlineAlert';

interface BIRiskTableProps {
  students: BIRiskStudent[];
  loading?: boolean;
}

interface StudentIncident {
  id: string;
  descripcion: string;
  lugar: string;
  impacto_puntos: number;
  created_at: string;
  categorias_incidencia: {
    nombre: string;
    color_semaforo: string;
  } | null;
}

export const BIRiskTable: React.FC<BIRiskTableProps> = ({ students, loading }) => {
  const { session } = useAuth();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Estado para el modal de expediente disciplinario del alumno
  const [selectedStudent, setSelectedStudent] = useState<BIRiskStudent | null>(null);
  const [studentIncidents, setStudentIncidents] = useState<StudentIncident[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  async function handleOpenExpediente(student: BIRiskStudent) {
    setSelectedStudent(student);
    setLoadingIncidents(true);
    setStudentIncidents([]);
    try {
      const data = await getIncidenciasDelAlumno(student.alumno_id);
      setStudentIncidents((data || []) as unknown as StudentIncident[]);
    } catch (err) {
      console.error('Error al obtener incidencias del alumno:', err);
    } finally {
      setLoadingIncidents(false);
    }
  }

  function handleCloseExpediente() {
    setSelectedStudent(null);
    setStudentIncidents([]);
  }

  async function handleAlertTutor(student: BIRiskStudent) {
    if (!session?.user?.id) return;
    setSendingId(student.alumno_id);
    setFeedback(null);

    try {
      const mensaje = `Estimado tutor: Se le informa que el estudiante ${student.nombre_completo} (${student.grupo_nombre}) registra una disminución en su puntaje conductual (${student.puntos_totales} pts, Semáforo ${student.nivel_semaforo.toUpperCase()}). Se solicita su seguimiento continuo.`;
      
      await sendPreventiveAlertToTutor(student.alumno_id, mensaje, session.user.id);

      setFeedback({
        type: 'success',
        message: `Alerta preventiva enviada con éxito al tutor de ${student.nombre_completo}.`,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'No se pudo enviar la alerta al tutor.';
      setFeedback({
        type: 'error',
        message: errMsg,
      });
    } finally {
      setSendingId(null);
    }
  }

  if (loading) {
    return (
      <div className="bi-risk-card">
        <h4 className="bi-chart-title">Cargando radar de riesgo...</h4>
      </div>
    );
  }

  return (
    <div className="bi-risk-card">
      <div className="bi-chart-title-wrap">
        <h4 className="bi-chart-title" style={{ color: '#b91c1c' }}>
          <span className="material-symbols-outlined" style={{ color: '#dc2626' }}>radar</span>
          Radar de Alumnos en Atención Prioritaria (Top Risk)
        </h4>
      </div>

      {feedback && (
        <div style={{ marginBottom: '12px' }}>
          <InlineAlert
            type={feedback.type}
            message={feedback.message}
            onClose={() => setFeedback(null)}
          />
        </div>
      )}

      {students.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ color: '#10b981' }}>check_circle</span>
          No se detectan alumnos en zona de riesgo o atención prioritaria para los filtros seleccionados.
        </p>
      ) : (
        <div className="bi-table-wrap">
          <table className="bi-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Matrícula</th>
                <th>Grupo</th>
                <th>Semáforo</th>
                <th>Puntos Totales</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.alumno_id}>
                  <td style={{ fontWeight: 600 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenExpediente(student)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#204785',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'underline',
                      }}
                      title="Ver expediente e incidencias del alumno"
                    >
                      {student.nombre_completo}
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                    </button>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{student.matricula}</td>
                  <td>{student.grupo_nombre}</td>
                  <td>
                    <span className={`bi-semaforo-chip bi-semaforo-chip--${student.nivel_semaforo}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                        {student.nivel_semaforo === 'verde' ? 'check_circle' : student.nivel_semaforo === 'naranja' ? 'warning' : 'error'}
                      </span>
                      <span style={{ textTransform: 'capitalize', marginLeft: '4px' }}>{student.nivel_semaforo}</span>
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: student.puntos_totales < 70 ? '#dc2626' : '#1e293b' }}>
                    {student.puntos_totales} pts
                  </td>
                  <td>
                    <button
                      type="button"
                      className="bi-btn-alert-tutor"
                      disabled={sendingId === student.alumno_id}
                      onClick={() => handleAlertTutor(student)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {sendingId === student.alumno_id ? 'sync' : 'notifications_active'}
                      </span>
                      {sendingId === student.alumno_id ? 'Enviando...' : 'Alertar Tutor'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Expediente Disciplinario y Salud Conductual (UI/UX Impecable) */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={handleCloseExpediente}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              zIndex: 210,
              padding: '24px',
              position: 'relative',
              animation: 'fabPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#eff6ff', color: '#204785', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '18px' }}>
                  {selectedStudent.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{selectedStudent.nombre_completo}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Matrícula: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{selectedStudent.matricula}</code> • Grupo: <strong>{selectedStudent.grupo_nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseExpediente}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* Métrica de Salud del Alumno */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Puntaje Actual</span>
                <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: selectedStudent.puntos_totales < 70 ? '#dc2626' : '#1e293b' }}>
                  {selectedStudent.puntos_totales} / 100 pts
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Estado de Semáforo</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`bi-semaforo-chip bi-semaforo-chip--${selectedStudent.nivel_semaforo}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>
                      {selectedStudent.nivel_semaforo === 'verde' ? 'check_circle' : selectedStudent.nivel_semaforo === 'naranja' ? 'warning' : 'error'}
                    </span>
                    <span style={{ textTransform: 'capitalize', marginLeft: '4px' }}>{selectedStudent.nivel_semaforo}</span>
                  </span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Incidencias</span>
                <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedStudent.total_incidencias} Reportes
                </p>
              </div>
            </div>

            {/* Historial de Incidencias / Expediente */}
            <div>
              <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ color: '#204785', fontSize: '18px' }}>history</span>
                Expediente y Registro Disciplinario
              </h4>

              {loadingIncidents ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Cargando expediente...</div>
              ) : studentIncidents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  No hay incidencias registradas en el historial de este alumno.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {studentIncidents.map(inc => (
                    <div
                      key={inc.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${inc.categorias_incidencia?.color_semaforo === 'rojo' ? '#ef4444' : inc.categorias_incidencia?.color_semaforo === 'naranja' ? '#f59e0b' : '#10b981'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                          {inc.categorias_incidencia?.nombre || 'Incidencia General'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {new Date(inc.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                        {inc.descripcion}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#64748b' }}>
                        <span>Lugar: {inc.lugar || 'No especificado'}</span>
                        <span style={{ fontWeight: 600, color: inc.impacto_puntos > 0 ? '#10b981' : '#ef4444' }}>
                          Impacto: {inc.impacto_puntos > 0 ? `+${inc.impacto_puntos}` : inc.impacto_puntos} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con Botón de Alerta */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="bi-btn-reset"
                onClick={handleCloseExpediente}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="bi-btn-alert-tutor"
                disabled={sendingId === selectedStudent.alumno_id}
                onClick={() => handleAlertTutor(selectedStudent)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                  {sendingId === selectedStudent.alumno_id ? 'sync' : 'notifications_active'}
                </span>
                {sendingId === selectedStudent.alumno_id ? 'Enviando...' : 'Alertar Tutor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
