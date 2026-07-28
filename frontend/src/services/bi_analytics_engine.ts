
export interface EWMAHistoryPoint {
  periodLabel: string;
  points: number;
  ewma: number;
}

export interface StudentRiskAnalysis {
  riskScorePercent: number; // 0 to 100
  riskCategory: 'bajo' | 'moderado' | 'alto' | 'critico';
  dropAcceleration: number; // delta in recent periods
  narrativeSummary: string;
  recommendedAction: string;
  fortalezaDestacada: string;
}

export interface GroupExecutiveReport {
  groupId: string;
  groupName: string;
  totalStudents: number;
  averageISC: number;
  dispersionIndex: number;
  greenCount: number;
  orangeCount: number;
  redCount: number;
  highRiskCount: number;
  dominantCategory: string;
  narrativeSummary: string;
  pedagogicalRecommendation: string;
}

export interface PlantelExecutiveReport {
  plantelId: string;
  plantelNombre: string;
  totalStudents: number;
  overallISC: number;
  greenPercentage: number;
  orangePercentage: number;
  redPercentage: number;
  retentionEstimatePercent: number;
  narrativeSummary: string;
  strategicActionPlan: string[];
}

/**
 * 1. ALGORITMO EWMA (Exponentially Weighted Moving Average)
 * Calcula el promedio móvil ponderado exponencialmente dando más peso a las últimas semanas/meses.
 */
export function calculateEWMA(dataPoints: number[], alpha: number = 0.3): number[] {
  if (!dataPoints.length) return [];
  const result: number[] = [];
  let currentEWMA = dataPoints[0];
  result.push(Math.round(currentEWMA * 10) / 10);

  for (let i = 1; i < dataPoints.length; i++) {
    currentEWMA = alpha * dataPoints[i] + (1 - alpha) * currentEWMA;
    result.push(Math.round(currentEWMA * 10) / 10);
  }

  return result;
}

/**
 * 2. ALGORITMO MULTIVARIABLE DE EVALUACIÓN DE RIESGO DE DESERCIÓN (Composite Risk Score)
 */
export function calculateStudentRiskScore(
  currentISC: number,
  incidentsCount: number,
  criticalIncidentsCount: number,
  recentDrop: number
): StudentRiskAnalysis {
  // Factores ponderados
  const iscFactor = (100 - Math.min(100, Math.max(0, currentISC))) * 0.4;
  const criticalFactor = Math.min(100, criticalIncidentsCount * 25) * 0.3;
  const dropFactor = Math.min(100, Math.max(0, recentDrop) * 2.5) * 0.2;
  const volumeFactor = Math.min(100, incidentsCount * 10) * 0.1;

  const rawScore = Math.round(iscFactor + criticalFactor + dropFactor + volumeFactor);
  const riskScorePercent = Math.min(100, Math.max(0, rawScore));

  let riskCategory: 'bajo' | 'moderado' | 'alto' | 'critico' = 'bajo';
  let narrativeSummary = '';
  let recommendedAction = '';
  let fortalezaDestacada = 'Respeto a la normatividad y constancia en aula.';

  if (riskScorePercent >= 70 || currentISC < 70) {
    riskCategory = 'critico';
    narrativeSummary = `Atención Inmediata Requerida: El alumno registra un Índice de Riesgo Multivariable del ${riskScorePercent}% (ISC actual: ${currentISC} pts). Se identifica una curva acelerada de faltas o afectación de convivencia que incrementa el riesgo de rezago escolar o deserción.`;
    recommendedAction = 'Acción Prioritaria: Convocar a reunión presencial con el tutor legal, formalizar carta compromiso pedagógica y canalizar a tutoría orientativa continua.';
  } else if (riskScorePercent >= 40 || currentISC < 90) {
    riskCategory = 'alto';
    narrativeSummary = `Seguimiento Preventivo Activo: Se detecta un Índice de Riesgo del ${riskScorePercent}% con fluctuaciones conductuales en el periodo reciente. El estudiante mantiene capacidad de recuperación si se interviene a tiempo.`;
    recommendedAction = 'Acción Recomendada: Acordar metas semanales de puntualidad y convivencia con el docente asesor.';
  } else if (riskScorePercent >= 20) {
    riskCategory = 'moderado';
    narrativeSummary = `Monitoreo Regular: El estudiante muestra estabilidad general (${currentISC} pts), registrando eventos menores aislados sin afectación crítica.`;
    recommendedAction = 'Acción Recomendada: Mantener observación regular en aula durante los cambios de asignatura.';
  } else {
    riskCategory = 'bajo';
    narrativeSummary = `Salud Conductual Sobresaliente: El alumno mantiene una trayectoria intachable (${currentISC} pts) con alto grado de integración institucional.`;
    recommendedAction = 'Acción Recomendada: Reconocer públicamente el liderazgo y desempeño del estudiante.';
  }

  if (criticalIncidentsCount === 0 && incidentsCount === 0) {
    fortalezaDestacada = 'Asistencia perfecta y conducta intachable durante todo el ciclo escolar.';
  } else if (incidentsCount > 0 && criticalIncidentsCount === 0) {
    fortalezaDestacada = 'Capacidad de rectificación y ausencia de faltas graves o sanciones severas.';
  }

  return {
    riskScorePercent,
    riskCategory,
    dropAcceleration: recentDrop,
    narrativeSummary,
    recommendedAction,
    fortalezaDestacada,
  };
}

/**
 * 3. ALGORITMO Y GENERADOR DE REPORTE NARRATIVO PARA GRUPO ESCOLAR
 */
export function generateGroupExecutiveReport(
  groupId: string,
  groupName: string,
  students: Array<{ id: string; isc: number; semaforo: string }>,
  incidents: Array<{ categoriaNombre: string; color: string }>
): GroupExecutiveReport {
  const totalStudents = students.length || 1;
  const sumISC = students.reduce((acc, s) => acc + s.isc, 0);
  const averageISC = Math.round((sumISC / totalStudents) * 10) / 10;

  const greenCount = students.filter(s => s.isc >= 90).length;
  const orangeCount = students.filter(s => s.isc >= 70 && s.isc < 90).length;
  const redCount = students.filter(s => s.isc < 70).length;
  const highRiskCount = redCount + Math.floor(orangeCount * 0.3);

  // Categoría dominante
  const catCount = new Map<string, number>();
  incidents.forEach(inc => {
    const name = inc.categoriaNombre || 'Incidencia General';
    catCount.set(name, (catCount.get(name) || 0) + 1);
  });

  let dominantCategory = 'Ninguna registrada';
  let maxCount = 0;
  catCount.forEach((cnt, name) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      dominantCategory = name;
    }
  });

  // Coeficiente de variación / Dispersión
  const variance = students.reduce((acc, s) => acc + Math.pow(s.isc - averageISC, 2), 0) / totalStudents;
  const dispersionIndex = Math.round(Math.sqrt(variance) * 10) / 10;

  let narrativeSummary = '';
  let pedagogicalRecommendation = '';

  if (averageISC >= 90) {
    narrativeSummary = `El Grupo ${groupName} registra un Clima Conductual Sobresaliente con un promedio de ${averageISC} / 100 pts. El ${Math.round((greenCount / totalStudents) * 100)}% de los alumnos se ubica en Semáforo Verde, demostrando cohesión académica y respeto normativo.`;
    pedagogicalRecommendation = 'Recomendación: Promover proyectos de aprendizaje colaborativo e incentivar el liderazgo del grupo en actividades del plantel.';
  } else if (averageISC >= 75) {
    narrativeSummary = `El Grupo ${groupName} presenta un Clima Conductual Estable (${averageISC} pts), con ${greenCount} alumnos en Semáforo Verde y ${orangeCount} en Naranja. La incidencia dominante identificada es "${dominantCategory}".`;
    pedagogicalRecommendation = 'Recomendación: Reforzar las pautas de puntualidad e inasistencias en las primeras horas del turno.';
  } else {
    narrativeSummary = `Atención Prioritaria en Grupo ${groupName}: El grupo registra un promedio conductual de ${averageISC} pts con ${redCount} alumnos en zona crítica. Se observa una dispersión de ${dispersionIndex} pts que refleja heterogeneidad en el comportamiento de aula.`;
    pedagogicalRecommendation = 'Recomendación: Intervención directa del equipo de Orientación Escolar con talleres de convivencia y reunión extraordinaria de tutores del grupo.';
  }

  return {
    groupId,
    groupName,
    totalStudents,
    averageISC,
    dispersionIndex,
    greenCount,
    orangeCount,
    redCount,
    highRiskCount,
    dominantCategory,
    narrativeSummary,
    pedagogicalRecommendation,
  };
}

/**
 * 4. ALGORITMO Y GENERADOR DE REPORTE NARRATIVO PARA PLANTEL COMPLETO
 */
export function generatePlantelExecutiveReport(
  plantelNombre: string,
  totalStudents: number,
  overallISC: number,
  greenCount: number,
  orangeCount: number,
  redCount: number
): PlantelExecutiveReport {
  const total = totalStudents || 1;
  const greenPercentage = Math.round((greenCount / total) * 1000) / 10;
  const orangePercentage = Math.round((orangeCount / total) * 1000) / 10;
  const redPercentage = Math.round((redCount / total) * 1000) / 10;

  // Estimación algorítmica de retención escolar
  const retentionEstimatePercent = Math.round((100 - redPercentage * 0.85 - orangePercentage * 0.15) * 10) / 10;

  const narrativeSummary = `El Plantel ${plantelNombre} registra una matrícula evaluada de ${totalStudents} estudiantes, alcanzando un Índice de Salud Conductual (ISC) Consolidado de ${overallISC} / 100 pts. Actualmente, el ${greenPercentage}% del alumnado opera en Semáforo Verde (Óptimo), el ${orangePercentage}% en Semáforo Naranja (Prevención) y el ${redPercentage}% en Semáforo Rojo (Atención Prioritaria). Se calcula una tasa de retención estimada del ${retentionEstimatePercent}%.`;

  const strategicActionPlan = [
    `Monitoreo Focalizado: Mantener seguimiento semanal sobre los ${redCount} estudiantes en zona de atención prioritaria.`,
    `Refuerzo de Alertas Preventivas: Mantener activa la comunicación vía aviso inmediato a los tutores legales ante variaciones en Semáforo Naranja.`,
    `Evaluación Inter-Trimestral: Medir la efectividad de los compromisos conductuales al cierre de cada periodo de evaluación parcial.`,
  ];

  return {
    plantelId: '',
    plantelNombre,
    totalStudents,
    overallISC,
    greenPercentage,
    orangePercentage,
    redPercentage,
    retentionEstimatePercent,
    narrativeSummary,
    strategicActionPlan,
  };
}
