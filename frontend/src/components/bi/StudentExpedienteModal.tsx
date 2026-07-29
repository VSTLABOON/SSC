import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
  const [incidents, setIncidents] = useState<StudentIncident[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoEscolar[]>([]);
  const [selectedPeriodoId, setSelectedPeriodoId] = useState<string>('all');
  const [granularity, setGranularity] = useState<TimeGranularity>('mensual');
  const [loading, setLoading] = useState(false);
  const [modalFilter, setModalFilter] = useState<ModalFilterType>('all');
  const [sqlRiskScore, setSqlRiskScore] = useState<StudentRiskScoreResult | null>(null);

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

  // Cálculo de Conteos de Incidencias por Severidad
  const categoryCounts = useMemo(() => {
    let verde = 0;
    let naranja = 0;
    let rojo = 0;

    periodFilteredIncidents.forEach(inc => {
      const color = inc.categorias_incidencia?.color_semaforo || 'verde';
      if (color === 'verde' || inc.impacto_puntos > 0) verde++;
      else if (color === 'naranja' && inc.impacto_puntos <= 0) naranja++;
      else if (color === 'rojo') rojo++;
    });

    return { verde, naranja, rojo, total: periodFilteredIncidents.length };
  }, [periodFilteredIncidents]);

  // Cálculo Dinámico de Puntos y Semáforo Actual
  const periodPuntos = useMemo(() => {
    if (trajectoryData.length === 0) return 100;
    return trajectoryData[trajectoryData.length - 1].puntos;
  }, [trajectoryData]);

  // Diagnóstico Narrativo Humanizado y Detección de Riesgo de Deserción
  const humanDiagnostic = useMemo(() => {
    const currentPoints = periodPuntos;
    const initialPoints = 100;
    const drop = initialPoints - currentPoints;

    const negativeIncidents = periodFilteredIncidents.filter(i => i.impacto_puntos < 0);
    const positiveIncidents = periodFilteredIncidents.filter(i => i.impacto_puntos > 0);

    let statusText = '';
    let riskLevel: 'ok' | 'warning' | 'critical' = 'ok';
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
      riskLevel = 'ok';
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
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          zIndex: 10000,
          padding: '24px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado Principal del Expediente Humanizado */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#eff6ff', color: '#204785', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '20px', flexShrink: 0, boxShadow: '0 2px 8px rgba(32,71,133,0.15)' }}>
              {initials}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>{student.nombre_completo}</h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                Matrícula: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{student.matricula}</code> • Grupo: <strong>{student.grupo_nombre}</strong>
                {student.carrera_nombre ? ` • ${student.carrera_nombre}` : ''}
              </p>
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

        {/* 1. SECCIÓN DE DIAGNÓSTICO NARRATIVO HUMANIZADO Y PREVENCIÓN DE DESERCIÓN */}
        <div
          style={{
            background: humanDiagnostic.riskLevel === 'critical' ? '#fef2f2' : humanDiagnostic.riskLevel === 'warning' ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${humanDiagnostic.riskLevel === 'critical' ? '#fca5a5' : humanDiagnostic.riskLevel === 'warning' ? '#fde68a' : '#86efac'}`,
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: humanDiagnostic.riskLevel === 'critical' ? '#991b1b' : humanDiagnostic.riskLevel === 'warning' ? '#92400e' : '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {humanDiagnostic.riskLevel === 'critical' ? 'warning' : humanDiagnostic.riskLevel === 'warning' ? 'info' : 'verified'}
              </span>
              Diagnóstico Pedagógico y Salud Conductual
            </h4>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', backgroundColor: humanDiagnostic.riskLevel === 'critical' ? '#fee2e2' : humanDiagnostic.riskLevel === 'warning' ? '#fef3c7' : '#dcfce7', color: humanDiagnostic.riskLevel === 'critical' ? '#991b1b' : humanDiagnostic.riskLevel === 'warning' ? '#92400e' : '#166534' }}>
              {humanDiagnostic.riskLevel === 'critical' ? 'Intervención Requerida' : humanDiagnostic.riskLevel === 'warning' ? 'Seguimiento Activo' : 'Estado Saludable'}
            </span>
          </div>

          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#1e293b', lineHeight: 1.45, fontWeight: 500 }}>
            {humanDiagnostic.statusText}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(0,0,0,0.1)' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fortaleza Destacada</span>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>{humanDiagnostic.fortaleza}</p>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Recomendación para el Equipo</span>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>{humanDiagnostic.recommendation}</p>
            </div>
            {sqlRiskScore && (
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#204785', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#10b981' }}>database</span>
                  Índice de Riesgo (Motor SQL)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>
                  {sqlRiskScore.score}% — Categoría: <span style={{ textTransform: 'capitalize' }}>{sqlRiskScore.categoria}</span> (Caída EWMA: -{sqlRiskScore.recent_drop} pts)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. EVOLUCIÓN CONDUCTUAL GRANULAR Y PICOS / BAJAS (RECHARTS) */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#204785', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>show_chart</span>
                Línea de Tiempo de Evolución Conductual (Picos y Bajas)
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                Permite observar caídas temporales o tendencias de cambio antes de que afecten la permanencia escolar.
              </p>
            </div>

            {/* Selector de Escala de Tiempo Granular */}
            <div className="dedicated-tabs-container" style={{ background: '#ffffff', padding: '2px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              {(['semanal', 'mensual', 'bimestral', 'semestral'] as TimeGranularity[]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGranularity(g)}
                  className={`dedicated-tab-btn ${granularity === g ? 'dedicated-tab-btn--active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '11px', textTransform: 'capitalize' }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Gráfica de Área con Tendencia en Recharts */}
          <div style={{ height: '180px', width: '100%', marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPointsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={periodSemaforo === 'rojo' ? '#ef4444' : periodSemaforo === 'naranja' ? '#f59e0b' : '#10b981'} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={periodSemaforo === 'rojo' ? '#ef4444' : periodSemaforo === 'naranja' ? '#f59e0b' : '#10b981'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#ffffff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val ?? 0} pts`, 'Puntaje']}
                />
                <ReferenceLine y={70} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'Límite Crítico (70 pts)', fill: '#dc2626', fontSize: 10 }} />
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

        {/* 3. SELECTOR DE PERIODO ESCOLAR Y PASTILLAS */}
        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#204785', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
              Filtrar por Periodo Escolar Completo:
            </label>
            <select
              value={selectedPeriodoId}
              onChange={e => setSelectedPeriodoId(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <option value="all">Historico Consolidado (Todos los Periodos)</option>
              {periodos.map(p => (
                <option key={p.id} value={p.id}>
                  Periodo: {p.nombre} {p.activo ? '(Activo Actualmente)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Pastillas de Organización por Tipo de Incidencia */}
          <div className="dedicated-tabs-container" style={{ background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
            <button
              type="button"
              className={`dedicated-tab-btn ${modalFilter === 'all' ? 'dedicated-tab-btn--active' : ''}`}
              onClick={() => setModalFilter('all')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>list_alt</span>
              Todos ({periodFilteredIncidents.length})
            </button>
            <button
              type="button"
              className={`dedicated-tab-btn ${modalFilter === 'verde' ? 'dedicated-tab-btn--active' : ''}`}
              onClick={() => setModalFilter('verde')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#10b981' }}>check_circle</span>
              Positivos ({positiveCount})
            </button>
            <button
              type="button"
              className={`dedicated-tab-btn ${modalFilter === 'naranja' ? 'dedicated-tab-btn--active' : ''}`}
              onClick={() => setModalFilter('naranja')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f59e0b' }}>warning</span>
              Leves ({warningCount})
            </button>
            <button
              type="button"
              className={`dedicated-tab-btn ${modalFilter === 'rojo' ? 'dedicated-tab-btn--active' : ''}`}
              onClick={() => setModalFilter('rojo')}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ef4444' }}>error</span>
              Críticos ({criticalCount})
            </button>
          </div>
        </div>

        {/* 4. LISTADO HISTÓRICO CONTEXTUALIZADO DE INCIDENCIAS */}
        <div>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              <div className="skeleton-box" style={{ height: '50px', marginBottom: '10px' }} />
              <div className="skeleton-box" style={{ height: '50px' }} />
            </div>
          ) : finalFilteredIncidents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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

        {/* Footer del Modal */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="bi-btn-reset"
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Imprimir expediente del alumno en PDF"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
            Imprimir Ficha PDF
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
