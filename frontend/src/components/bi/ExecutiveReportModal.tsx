import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import type {
  StudentRiskAnalysis,
  GroupExecutiveReport,
  PlantelExecutiveReport,
} from '../../services/bi_analytics_engine';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'alumno' | 'grupo' | 'plantel';
  studentData?: {
    nombre: string;
    matricula: string;
    grupo: string;
    isc: number;
    analysis: StudentRiskAnalysis;
  } | null;
  groupData?: GroupExecutiveReport | null;
  plantelData?: PlantelExecutiveReport | null;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  studentData,
  groupData,
  plantelData,
}) => {
  // Bloquear el scroll del body mientras el modal está abierto para evitar traslapes
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('no-scroll');
    return () => document.body.classList.remove('no-scroll');
  }, [isOpen]);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalJSX = (
    <div
      className="modal-backdrop-animated"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="modal-box-animated"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '820px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 10000,
          padding: '28px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ENCABEZADO INSTITUCIONAL OFICIAL */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '2px solid #204785' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#204785', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '22px', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#204785' }}>
                {reportType === 'alumno' ? 'person' : reportType === 'grupo' ? 'groups' : 'domain'}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#00492f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                CONALEP Plantel Puebla I • Sistema SSC
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                {reportType === 'alumno'
                  ? 'Ficha Narrativa de Salud Conductual'
                  : reportType === 'grupo'
                  ? `Reporte de Clima Escolar — Grupo ${groupData?.groupName || ''}`
                  : `Reporte Ejecutivo Directivo — ${plantelData?.plantelNombre || 'Plantel Puebla I'}`}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* CONTENIDO 1: FICHA NARRATIVA DEL ALUMNO */}
        {reportType === 'alumno' && studentData && (
          <div>
            {/* Ficha Meta */}
            <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{studentData.nombre}</h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Matrícula: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{studentData.matricula}</code> • Grupo: <strong>{studentData.grupo}</strong>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Índice de Riesgo Multivariable</span>
                <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: studentData.analysis.riskScorePercent >= 50 ? '#dc2626' : '#10b981' }}>
                  {studentData.analysis.riskScorePercent}% ({studentData.analysis.riskCategory.toUpperCase()})
                </p>
              </div>
            </div>

            {/* Diagnóstico Narrativo */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>psychology</span>
                Síntesis Diagnóstica Algorítmica
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.55 }}>
                {studentData.analysis.narrativeSummary}
              </p>
            </div>

            {/* Fortalezas y Recomendaciones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                  Fortaleza Destacada
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>
                  {studentData.analysis.fortalezaDestacada}
                </p>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lightbulb</span>
                  Recomendación Pedagógica
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#0f172a', fontWeight: 600, lineHeight: 1.4 }}>
                  {studentData.analysis.recommendedAction}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CONTENIDO 2: REPORTE DE CLIMA ESCOLAR DE GRUPO */}
        {reportType === 'grupo' && groupData && (
          <div>
            {/* Métricas de Grupo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Promedio ISC del Grupo</span>
                <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: groupData.averageISC >= 90 ? '#10b981' : groupData.averageISC >= 75 ? '#f59e0b' : '#ef4444' }}>
                  {groupData.averageISC} / 100 pts
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Alumnos Evaluados</span>
                <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                  {groupData.totalStudents} Estudiantes
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Incidencia Dominante</span>
                <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: '#204785' }}>
                  {groupData.dominantCategory}
                </p>
              </div>
            </div>

            {/* Distribución Semafórica */}
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Distribución Semafórica del Grupo</span>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', fontWeight: 700 }}>
                <span style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                  Verde: {groupData.greenCount}
                </span>
                <span style={{ color: '#9a3412', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                  Naranja: {groupData.orangeCount}
                </span>
                <span style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                  Rojo: {groupData.redCount}
                </span>
              </div>
            </div>

            {/* Narrativa de Grupo */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
                Análisis de Clima Escolar
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.55 }}>
                {groupData.narrativeSummary}
              </p>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>Plan de Intervención Pedagógica Sugerido</span>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
                {groupData.pedagogicalRecommendation}
              </p>
            </div>
          </div>
        )}

        {/* CONTENIDO 3: REPORTE EJECUTIVO DIRECTIVO DE PLANTEL COMPLETO */}
        {reportType === 'plantel' && plantelData && (
          <div>
            {/* KPI Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Matrícula Evaluada</span>
                <p style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                  {plantelData.totalStudents} Alumnos
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Salud General ISC</span>
                <p style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                  {plantelData.overallISC} / 100
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tasa Est. Retención</span>
                <p style={{ margin: '2px 0 0', fontSize: '24px', fontWeight: 800, color: '#204785' }}>
                  {plantelData.retentionEstimatePercent}%
                </p>
              </div>
            </div>

            {/* Narrativa Ejecutiva */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>domain</span>
                Resumen Ejecutivo Consolidado del Plantel
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#1e293b', lineHeight: 1.55 }}>
                {plantelData.narrativeSummary}
              </p>
            </div>

            {/* Plan de Acción Estratégico */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: '#204785', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>checklist</span>
                Plan Estratégico Directivo de Permanencia Escolar
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
                {plantelData.strategicActionPlan.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* FOOTER CON BOTÓN DE IMPRESIÓN PDF */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="bi-btn-reset"
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#204785', color: '#ffffff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
            Imprimir Reporte Ejecutivo PDF
          </button>
          <button
            type="button"
            className="bi-btn-reset"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
