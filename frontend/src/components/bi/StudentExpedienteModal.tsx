import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useEscapeToClose } from '../../hooks/useEscapeToClose';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';
import { exportStudentExpedientePDF } from '../../services/pdfExportService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { getIncidenciasDelAlumno } from '../../services/incidencias';
import { useAuth } from '../../context/AuthContext';
import { getPeriodosDelPlantel } from '../../services/periodos';
import type { PeriodoEscolar } from '../../services/periodos';
import { getBIRiskScoreAlumno } from '../../services/bi';
import type { StudentRiskScoreResult } from '../../services/bi';

export interface StudentExpedienteData {
  alumno_id: string;
  nombre_completo: string;
  matricula: string;
  grupo_nombre: string;
  carrera_nombre?: string;
  nivel_semaforo: string;
  puntos_totales: number;
  total_incidencias: number;
}

interface StudentIncident {
  id: string;
  descripcion: string;
  lugar: string;
  impacto_puntos: number;
  created_at: string;
  periodo_id?: string;
  periodos_escolares?: {
    nombre: string;
  } | null;
  categorias_incidencia: {
    nombre: string;
    color_semaforo: string;
  } | null;
}

type ModalFilterType = 'all' | 'verde' | 'naranja' | 'rojo';
type TimeGranularity = 'semanal' | 'mensual' | 'bimestral' | 'semestral';

interface StudentExpedienteModalProps {
  isOpen: boolean;
  student: StudentExpedienteData | null;
  onClose: () => void;
  onAlertTutor?: (student: StudentExpedienteData) => void;
  sendingAlertId?: string | null;
}

export const StudentExpedienteModal: React.FC<StudentExpedienteModalProps> = ({
  isOpen,
  student,
  onClose,
  onAlertTutor,
  sendingAlertId,
}) => {
  const { plantelId } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeModalTab, setActiveModalTab] = useState<'diagnostico' | 'evolucion' | 'incidencias'>('diagnostico');
  const [isExporting, setIsExporting] = useState(false);
  const [incidents, setIncidents] = useState<StudentIncident[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoEscolar[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('all');
  const [granularity, setGranularity] = useState<TimeGranularity>('mensual');
  const [loading, setLoading] = useState(false);
  const [modalFilter, setModalFilter] = useState<ModalFilterType>('all');
  const [sqlRiskScore, setSqlRiskScore] = useState<StudentRiskScoreResult | null>(null);

  useLockBodyScroll(isOpen);

  const handleExportPDF = async () => {
    if (!student) return;
    setIsExporting(true);
    try {
      await exportStudentExpedientePDF({
        student: {
          nombre_completo: student.nombre_completo,
          matricula: student.matricula,
          grupo_nombre: student.grupo_nombre,
          carrera_nombre: student.carrera_nombre,
        },
        diagnostic: {
          riskLevel: humanDiagnostic.riskLevel,
          statusText: humanDiagnostic.statusText,
          fortaleza: humanDiagnostic.fortaleza,
          recommendation: humanDiagnostic.recommendation,
        },
        incidents: incidents.map(inc => ({
          created_at: inc.created_at,
          descripcion: inc.descripcion,
          lugar: inc.lugar,
          impacto_puntos: inc.impacto_puntos,
          categoria_nombre: inc.categorias_incidencia?.nombre,
          color_semaforo: inc.categorias_incidencia?.color_semaforo,
        })),
        sqlRiskScore,
      });
    } catch (err) {
      console.error('Error al exportar expediente a PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (isOpen && student?.alumno_id) {
      setLoading(true);
      setIncidents([]);
      setModalFilter('all');
      setSelectedPeriodoId('all');
      setSqlRiskScore(null);

      Promise.all([
        getIncidenciasDelAlumno(student.alumno_id),
        plantelId ? getPeriodosDelPlantel(plantelId) : Promise.resolve([]),
        getBIRiskScoreAlumno(student.alumno_id).catch(() => null),
      ])
        .then(([incData, periodosData, riskData]) => {
          setIncidents((incData || []) as unknown as StudentIncident[]);
          setPeriodos(periodosData || []);
          setSqlRiskScore(riskData);
        })
        .catch(err => {
          console.error('Error al cargar expediente y periodos del alumno:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, student, plantelId]);



  // Escuchar tecla Escape con guard para campos editables
  useEscapeToClose(onClose);

  // Filtrado de incidencias por Periodo Seleccionado
  const periodFilteredIncidents = useMemo(() => {
    if (selectedPeriodoId === 'all') return incidents;
    return incidents.filter(inc => inc.periodo_id === selectedPeriodoId);
  }, [incidents, selectedPeriodoId]);

  // Cálculo de Trayectoria Temporal Granular (Picos y Bajas)
  const trajectoryData = useMemo(() => {
    if (!periodFilteredIncidents.length) {
      return [
        { label: 'Inicio', puntos: 100 },
        { label: 'Actual', puntos: student?.puntos_totales ?? 100 },
      ];
    }

    const sorted = [...periodFilteredIncidents].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const buckets = new Map<string, number>();

    sorted.forEach(inc => {
      const d = new Date(inc.created_at);
      let key = '';

      if (granularity === 'semanal') {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
        key = `Sem ${weekNum}`;
      } else if (granularity === 'mensual') {
        const mesNombre = d.toLocaleDateString('es-MX', { month: 'short' });
        key = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
      } else if (granularity === 'bimestral') {
        const monthNum = d.getMonth();
        const bimesterNum = Math.floor(monthNum / 2) + 1;
        key = `Bim ${bimesterNum}`;
      } else if (granularity === 'semestral') {
        const monthNum = d.getMonth();
        const semesterNum = monthNum < 6 ? 1 : 2;
        key = `Semestre ${semesterNum}`;
      }

      buckets.set(key, (buckets.get(key) || 0) + (inc.impacto_puntos || 0));
    });

    let currentPoints = 100;
    const result: { label: string; puntos: number }[] = [
      { label: 'Inicio', puntos: 100 },
    ];

    buckets.forEach((impactoTotal, periodLabel) => {
      currentPoints = Math.max(0, currentPoints + impactoTotal);
      result.push({
        label: periodLabel,
        puntos: currentPoints,
      });
    });

    return result;
  }, [periodFilteredIncidents, granularity, student]);

  // Cálculo Dinámico de Puntos y Semáforo Actual
  const periodPuntos = useMemo(() => {
    if (trajectoryData.length === 0) return 100;
    return trajectoryData[trajectoryData.length - 1].puntos;
  }, [trajectoryData]);

  // Cálculo Dinámico de Dominio Y para que la curva tenga respiro y no se vea encajonada
  const dynamicYDomain = useMemo(() => {
    if (!trajectoryData || trajectoryData.length === 0) return [0, 110];
    const pts = trajectoryData.map(d => d.puntos);
    const minPts = Math.min(...pts);
    const maxPts = Math.max(...pts);
    const yMin = Math.max(0, Math.floor((Math.min(minPts, 65) - 10) / 10) * 10);
    const yMax = Math.min(120, Math.ceil((Math.max(maxPts, 105) + 5) / 10) * 10);
    return [yMin, yMax];
  }, [trajectoryData]);

  const periodSemaforo = useMemo(() => {
    if (periodPuntos >= 90) return 'verde';
    if (periodPuntos >= 70) return 'naranja';
    return 'rojo';
  }, [periodPuntos]);

  // Diagnóstico Narrativo Humanizado y Detección de Riesgo de Deserción
  const humanDiagnostic = useMemo(() => {
    const currentPoints = periodPuntos;
    const initialPoints = 100;
    const drop = initialPoints - currentPoints;

    const negativeIncidents = periodFilteredIncidents.filter(i => i.impacto_puntos < 0);
    const positiveIncidents = periodFilteredIncidents.filter(i => i.impacto_puntos > 0);

    let statusText = '';
    let riskLevel: 'healthy' | 'warning' | 'critical' = 'healthy';
    let recommendation = '';

    if (currentPoints < 70 || drop >= 25) {
      riskLevel = 'critical';
      statusText = `Atención Pedagógica Prioritaria: Se registra una inflexión o descenso significativo (${drop > 0 ? '-' + drop + ' pts' : 'riesgo conductual'}). Se identifica riesgo de rezago escolar o deserción si no se interviene oportunamente.`;
      recommendation = 'Acción recomendada: Agendar entrevista de tutoría con los padres y canalizar a acompañamiento orientativo de inmediato.';
    } else if (currentPoints < 90 || drop > 0) {
      riskLevel = 'warning';
      statusText = `Seguimiento Preventivo Continuo: El alumno muestra variaciones puntuales en su salud conductual (${currentPoints} pts). Su desempeño es recuperable con diálogo directo.`;
      recommendation = 'Acción recomendada: Acordar metas semanales de puntualidad y convivencia dentro del aula.';
    } else {
      riskLevel = 'healthy';
      statusText = `Trayectoria Sobresaliente y Estabilidad: Mantiene un desempeño conductual alto (${currentPoints} pts) con constancia a lo largo del tiempo.`;
      recommendation = 'Acción recomendada: Felicitar al estudiante para reforzar su liderazgo positivo.';
    }

    let fortaleza = 'Acatamiento constante del reglamento escolar y respeto a sus compañeros.';
    if (positiveIncidents.length > 0) {
      fortaleza = `Reconocido activamente por ${positiveIncidents[0].categorias_incidencia?.nombre || 'participación y desempeño destacado'}.`;
    } else if (negativeIncidents.length === 0) {
      fortaleza = 'Trayectoria limpia sin registros negativos de disciplina.';
    }

    return { statusText, riskLevel, recommendation, fortaleza };
  }, [periodPuntos, periodFilteredIncidents]);

  if (!isOpen || !student) return null;

  // Conteo para pastillas según el periodo seleccionado
  const positiveCount = periodFilteredIncidents.filter(i => (i.categorias_incidencia?.color_semaforo === 'verde' || i.impacto_puntos > 0)).length;
  const warningCount = periodFilteredIncidents.filter(i => (i.categorias_incidencia?.color_semaforo === 'naranja' && i.impacto_puntos <= 0)).length;
  const criticalCount = periodFilteredIncidents.filter(i => (i.categorias_incidencia?.color_semaforo === 'rojo')).length;

  const finalFilteredIncidents = periodFilteredIncidents.filter(inc => {
    if (modalFilter === 'all') return true;
    const color = inc.categorias_incidencia?.color_semaforo || 'verde';
    if (modalFilter === 'verde') return color === 'verde' || inc.impacto_puntos > 0;
    if (modalFilter === 'naranja') return color === 'naranja' && inc.impacto_puntos <= 0;
    if (modalFilter === 'rojo') return color === 'rojo';
    return true;
  });

  const initials = student.nombre_completo
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isSending = sendingAlertId === student.alumno_id;

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
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="modal-box-animated"
        style={{
          backgroundColor: 'var(--color-bg-card, #ffffff)',
          color: 'var(--color-text-main, #0f172a)',
          borderRadius: '20px',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 2010,
          padding: '24px',
          position: 'relative',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado Principal del Expediente Humanizado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-brand-chambray, #204785)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '18px', flexShrink: 0, boxShadow: '0 2px 8px rgba(32,71,133,0.2)' }}>
              {initials}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main, #f8fafc)' }}>{student.nombre_completo}</h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--color-text-sub, #cbd5e1)' }}>
                Matrícula: <code style={{ background: 'var(--color-bg-app, #334155)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, color: 'var(--color-text-main, #f8fafc)' }}>{student.matricula}</code> • Grupo: <strong>{student.grupo_nombre}</strong>
                {student.carrera_nombre ? ` • ${student.carrera_nombre}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'var(--color-bg-app, #334155)', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-main, #f8fafc)', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS PRINCIPALES (Evita amontonamientos y fija la altura) */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--color-bg-app, #0f172a)', padding: '4px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--color-border-subtle, #334155)' }}>
          <button
            type="button"
            onClick={() => setActiveModalTab('diagnostico')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: activeModalTab === 'diagnostico' ? 'var(--color-brand-chambray, #204785)' : 'transparent',
              color: activeModalTab === 'diagnostico' ? '#ffffff' : 'var(--color-text-sub, #cbd5e1)',
              transition: 'all 0.16s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>psychology</span>
            Diagnóstico
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('evolucion')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: activeModalTab === 'evolucion' ? 'var(--color-brand-chambray, #204785)' : 'transparent',
              color: activeModalTab === 'evolucion' ? '#ffffff' : 'var(--color-text-sub, #cbd5e1)',
              transition: 'all 0.16s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>show_chart</span>
            Evolución
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('incidencias')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: activeModalTab === 'incidencias' ? 'var(--color-brand-chambray, #204785)' : 'transparent',
              color: activeModalTab === 'incidencias' ? '#ffffff' : 'var(--color-text-sub, #cbd5e1)',
              transition: 'all 0.16s ease',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>format_list_bulleted</span>
            Incidencias ({finalFilteredIncidents.length})
          </button>
        </div>

        {/* CONTENEDOR CON SCROLL INTERNO CONTROLADO */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', maxHeight: '55vh' }}>
          {/* PESTAÑA 1: DIAGNÓSTICO NARRATIVO Y SALUD CONDUCTUAL */}
          {activeModalTab === 'diagnostico' && (
            <div
              style={{
                background: humanDiagnostic.riskLevel === 'critical' ? 'var(--color-bg-critical, #450a0a)' : humanDiagnostic.riskLevel === 'warning' ? 'var(--color-bg-warning, #451a03)' : 'var(--color-bg-healthy, #064e3b)',
                border: `1px solid ${humanDiagnostic.riskLevel === 'critical' ? '#ef4444' : humanDiagnostic.riskLevel === 'warning' ? '#f59e0b' : '#10b981'}`,
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: humanDiagnostic.riskLevel === 'critical' ? '#f87171' : humanDiagnostic.riskLevel === 'warning' ? '#fbbf24' : '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {humanDiagnostic.riskLevel === 'critical' ? 'warning' : humanDiagnostic.riskLevel === 'warning' ? 'info' : 'verified'}
                  </span>
                  Diagnóstico Pedagógico y Salud Conductual
                </h4>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '9999px', backgroundColor: humanDiagnostic.riskLevel === 'critical' ? '#7f1d1d' : humanDiagnostic.riskLevel === 'warning' ? '#78350f' : '#065f46', color: humanDiagnostic.riskLevel === 'critical' ? '#fca5a5' : humanDiagnostic.riskLevel === 'warning' ? '#fde68a' : '#a7f3d0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {humanDiagnostic.riskLevel === 'critical' ? 'Intervención Requerida' : humanDiagnostic.riskLevel === 'warning' ? 'Seguimiento Activo' : 'Estado Saludable'}
                </span>
              </div>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#f8fafc', lineHeight: 1.6, fontWeight: 500 }}>
                {humanDiagnostic.statusText}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.2)' }}>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fortaleza Destacada</span>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#ffffff', fontWeight: 700, lineHeight: 1.4 }}>{humanDiagnostic.fortaleza}</p>
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recomendación para el Equipo</span>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#ffffff', fontWeight: 700, lineHeight: 1.4 }}>{humanDiagnostic.recommendation}</p>
                </div>
                {sqlRiskScore && (
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#a2f4c7', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#10b981' }}>database</span>
                      Índice de Riesgo (Motor SQL)
                    </span>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#ffffff', fontWeight: 700 }}>
                      {sqlRiskScore.score}% — Categoría: <span style={{ textTransform: 'capitalize' }}>{sqlRiskScore.categoria}</span> (Caída EWMA: -{sqlRiskScore.recent_drop} pts)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: EVOLUCIÓN CONDUCTUAL GRANULAR Y GRÁFICA */}
          {activeModalTab === 'evolucion' && (
            <div style={{ background: 'var(--color-bg-app, #1e293b)', padding: '18px', borderRadius: '14px', border: '1px solid var(--color-border-subtle, #334155)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main, #f8fafc)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#60a5fa' }}>show_chart</span>
                    Línea de Tiempo de Evolución Conductual
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-sub, #cbd5e1)' }}>
                    Permite observar caídas temporales o tendencias de cambio antes de que afecten la permanencia escolar.
                  </p>
                </div>

                {/* Selector de Escala de Tiempo Granular */}
                <div style={{ background: 'var(--color-bg-card, #0f172a)', padding: '3px', borderRadius: '8px', border: '1px solid var(--color-border-subtle, #475569)', display: 'flex', gap: '2px' }}>
                  {(['semanal', 'mensual', 'bimestral', 'semestral'] as TimeGranularity[]).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: granularity === g ? 'var(--color-brand-chambray, #204785)' : 'transparent',
                        color: granularity === g ? '#ffffff' : 'var(--color-text-sub, #cbd5e1)',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gráfica de Área con Tendencia en Recharts */}
              <div style={{ height: '220px', width: '100%', marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPointsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={periodSemaforo === 'rojo' ? '#ef4444' : periodSemaforo === 'naranja' ? '#f59e0b' : '#10b981'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={periodSemaforo === 'rojo' ? '#ef4444' : periodSemaforo === 'naranja' ? '#f59e0b' : '#10b981'} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="label" stroke="var(--color-text-sub, #94a3b8)" fontSize={11} tickLine={false} />
                    <YAxis domain={dynamicYDomain} stroke="var(--color-text-sub, #94a3b8)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: '#ffffff', fontSize: '12px' }}
                      formatter={(val: any) => [`${val ?? 0} pts`, 'Puntaje']}
                    />
                    <ReferenceLine
                      y={70}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: 'Límite Crítico (70 pts)',
                        fill: '#fca5a5',
                        fontSize: 10,
                        position: 'top',
                        style: { fontWeight: 700 }
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="puntos"
                      stroke={periodSemaforo === 'rojo' ? '#ef4444' : periodSemaforo === 'naranja' ? '#f59e0b' : '#10b981'}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPointsGrad)"
                      dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: HISTORIAL FILTRABLE DE INCIDENCIAS */}
          {activeModalTab === 'incidencias' && (
            <div>
              {/* SELECTOR DE PERIODO ESCOLAR Y PASTILLAS */}
              <div style={{ background: 'var(--color-bg-app, #1e293b)', padding: '16px', borderRadius: '14px', border: '1px solid var(--color-border-subtle, #334155)', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main, #f8fafc)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#60a5fa' }}>calendar_month</span>
                    Filtrar por Periodo Escolar:
                  </label>
                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <select
                      value={selectedPeriodoId}
                      onChange={e => setSelectedPeriodoId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 32px 8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border-subtle, #475569)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#f8fafc',
                        backgroundColor: '#0f172a',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%3Acbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                      }}
                    >
                      <option value="all">Histórico Consolidado (Todos los Periodos)</option>
                      {periodos.map(p => (
                        <option key={p.id} value={p.id}>
                          Periodo: {p.nombre} {p.activo ? '(Activo)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pastillas de Organización por Tipo de Incidencia con Espaciado Adecuado */}
                <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg-card, #0f172a)', padding: '6px', borderRadius: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setModalFilter('all')}
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid', borderColor: modalFilter === 'all' ? '#60a5fa' : 'transparent', cursor: 'pointer', fontWeight: 700, backgroundColor: modalFilter === 'all' ? 'var(--color-brand-chambray, #204785)' : 'rgba(255,255,255,0.04)', color: modalFilter === 'all' ? '#ffffff' : '#cbd5e1', transition: 'all 0.15s ease' }}
                  >
                    Todos ({periodFilteredIncidents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('verde')}
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid', borderColor: modalFilter === 'verde' ? '#34d399' : 'transparent', cursor: 'pointer', fontWeight: 700, backgroundColor: modalFilter === 'verde' ? '#047857' : 'rgba(16, 185, 129, 0.1)', color: modalFilter === 'verde' ? '#ffffff' : '#34d399', transition: 'all 0.15s ease' }}
                  >
                    Positivos ({positiveCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('naranja')}
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid', borderColor: modalFilter === 'naranja' ? '#fbbf24' : 'transparent', cursor: 'pointer', fontWeight: 700, backgroundColor: modalFilter === 'naranja' ? '#b45309' : 'rgba(245, 158, 11, 0.1)', color: modalFilter === 'naranja' ? '#ffffff' : '#fbbf24', transition: 'all 0.15s ease' }}
                  >
                    Leves ({warningCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilter('rojo')}
                    style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid', borderColor: modalFilter === 'rojo' ? '#f87171' : 'transparent', cursor: 'pointer', fontWeight: 700, backgroundColor: modalFilter === 'rojo' ? '#b91c1c' : 'rgba(239, 68, 68, 0.1)', color: modalFilter === 'rojo' ? '#ffffff' : '#f87171', transition: 'all 0.15s ease' }}
                  >
                    Críticos ({criticalCount})
                  </button>
                </div>
              </div>

              {/* LISTADO HISTÓRICO CONTEXTUALIZADO DE INCIDENCIAS */}
              {loading ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-sub, #cbd5e1)' }}>
                  <div className="skeleton-box" style={{ height: '50px', marginBottom: '10px' }} />
                  <div className="skeleton-box" style={{ height: '50px' }} />
                </div>
              ) : finalFilteredIncidents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-sub, #cbd5e1)', background: 'var(--color-bg-app, #1e293b)', borderRadius: '12px', border: '1px solid var(--color-border-subtle, #334155)' }}>
                  No se encontraron registros en el periodo o categoría seleccionada.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {finalFilteredIncidents.map(inc => (
                    <div
                      key={inc.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: 'var(--color-bg-card, #1e293b)',
                        border: '1px solid var(--color-border-subtle, #334155)',
                        borderLeft: `4px solid ${inc.categorias_incidencia?.color_semaforo === 'rojo' ? '#ef4444' : inc.categorias_incidencia?.color_semaforo === 'naranja' ? '#f59e0b' : '#10b981'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-main, #f8fafc)' }}>
                          {inc.categorias_incidencia?.nombre || 'Incidencia General'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-sub, #cbd5e1)' }}>
                          {new Date(inc.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--color-text-sub, #cbd5e1)', lineHeight: 1.4 }}>
                        {inc.descripcion}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'var(--color-text-sub, #94a3b8)' }}>
                        <span>Lugar: {inc.lugar || 'No especificado'}</span>
                        <span style={{ fontWeight: 700, color: inc.impacto_puntos > 0 ? '#34d399' : '#f87171' }}>
                          Impacto: {inc.impacto_puntos > 0 ? `+${inc.impacto_puntos}` : inc.impacto_puntos} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border-subtle, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bi-btn-reset"
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#00492f', color: '#ffffff', opacity: isExporting ? 0.7 : 1 }}
            title="Descargar expediente del alumno en PDF"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
            {isExporting ? 'Generando PDF...' : 'Descargar PDF'}
          </button>

          <button
            type="button"
            className="bi-btn-reset"
            onClick={onClose}
          >
            Cerrar
          </button>

          {onAlertTutor && (
            <button
              type="button"
              className="bi-btn-alert-tutor"
              disabled={isSending}
              onClick={() => onAlertTutor(student)}
              style={
                humanDiagnostic.riskLevel === 'healthy'
                  ? {
                      backgroundColor: 'var(--color-bg-app, #334155)',
                      color: 'var(--color-text-sub, #cbd5e1)',
                      border: '1px solid var(--color-border-subtle, #475569)',
                      boxShadow: 'none',
                    }
                  : undefined
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {isSending ? 'sync' : 'notifications_active'}
              </span>
              {isSending ? 'Enviando...' : 'Alertar Tutor'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalJSX, document.body);
};
