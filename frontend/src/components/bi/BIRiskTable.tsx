import React, { useState } from 'react';
import { sendPreventiveAlertToTutor } from '../../services/bi';
import type { BIRiskStudent } from '../../services/bi';
import { useAuth } from '../../context/AuthContext';
import InlineAlert from '../InlineAlert';
import { StudentExpedienteModal } from './StudentExpedienteModal';

interface BIRiskTableProps {
  students: BIRiskStudent[];
  loading?: boolean;
}

export const BIRiskTable: React.FC<BIRiskTableProps> = ({ students, loading }) => {
  const { session } = useAuth();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Estado para el modal de expediente disciplinario del alumno
  const [selectedStudent, setSelectedStudent] = useState<BIRiskStudent | null>(null);

  function handleOpenExpediente(student: BIRiskStudent) {
    setSelectedStudent(student);
  }

  function handleCloseExpediente() {
    setSelectedStudent(null);
  }

  async function handleAlertTutor(student: { alumno_id: string; nombre_completo: string; grupo_nombre: string; puntos_totales: number; nivel_semaforo: string }) {
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
                <th>Índice Riesgo (SQL)</th>
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
                    {student.risk_score !== undefined ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: student.risk_categoria === 'critico' ? '#fee2e2' : student.risk_categoria === 'alto' ? '#fef3c7' : '#dcfce7',
                          color: student.risk_categoria === 'critico' ? '#991b1b' : student.risk_categoria === 'alto' ? '#92400e' : '#166534',
                          border: `1px solid ${student.risk_categoria === 'critico' ? '#fca5a5' : student.risk_categoria === 'alto' ? '#fde68a' : '#86efac'}`,
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                          {student.risk_categoria === 'critico' ? 'warning' : 'analytics'}
                        </span>
                        {student.risk_score}% ({student.risk_categoria})
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>N/A</span>
                    )}
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

      {/* Modal Reutilizable de Expediente (Renderizado vía Portal en document.body para Centrado Instantáneo) */}
      <StudentExpedienteModal
        isOpen={!!selectedStudent}
        student={selectedStudent}
        onClose={handleCloseExpediente}
        onAlertTutor={handleAlertTutor}
        sendingAlertId={sendingId}
      />
    </div>
  );
};
