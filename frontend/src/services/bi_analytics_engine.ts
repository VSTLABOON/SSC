
export interface StudentRiskAnalysis {
  riskScorePercent: number;
  riskCategory: 'bajo' | 'moderado' | 'alto' | 'critico';
  dropAcceleration: number;
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
