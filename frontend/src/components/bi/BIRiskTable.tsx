import React, { useState } from 'react';
import { sendPreventiveAlertToTutor } from '../../services/bi';
import type { BIRiskStudent } from '../../services/bi';
import { useAuth } from '../../context/AuthContext';
import InlineAlert from '../InlineAlert';

interface BIRiskTableProps {
  students: BIRiskStudent[];
  loading?: boolean;
}

export const BIRiskTable: React.FC<BIRiskTableProps> = ({ students, loading }) => {
  const { session } = useAuth();
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
          🟢 No se detectan alumnos en zona de riesgo o atención prioritaria para los filtros seleccionados.
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
                  <td style={{ fontWeight: 600 }}>{student.nombre_completo}</td>
                  <td style={{ fontFamily: 'monospace' }}>{student.matricula}</td>
                  <td>{student.grupo_nombre}</td>
                  <td>
                    <span className={`bi-semaforo-chip bi-semaforo-chip--${student.nivel_semaforo}`}>
                      {student.nivel_semaforo === 'verde' ? '🟢 Verde' : student.nivel_semaforo === 'naranja' ? '🟠 Naranja' : '🔴 Rojo'}
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
    </div>
  );
};
