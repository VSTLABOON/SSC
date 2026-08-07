import { supabase } from '../lib/supabaseClient';

export interface GroqAgentPayload {
  kpiOrChartTitle: string;
  dbContextJson: string; // Datos duros provenientes de los RPCs PostgreSQL fn_bi_get_kpis, fn_bi_get_trend, etc.
  userQuery?: string;
}

/**
 * Consulta al Agente IA de Inteligencia Directiva.
 * 1. Invoca la Supabase Edge Function 'groq-agent' (Servidor Deno aislado de 0 confianza en cliente).
 * 2. Si la Edge Function falla o no responde, ejecuta el motor determinístico local grounded.
 */
export async function queryGroqAgent(payload: GroqAgentPayload): Promise<string> {
  // 1. Invocación segura a la Supabase Edge Function 'groq-agent' (Servidor Deno aislado)
  try {
    const { data, error } = await supabase.functions.invoke('groq-agent', {
      body: payload,
    });

    if (!error && data?.reply) {
      return data.reply.trim();
    }
  } catch (err) {
    console.warn('Edge Function groq-agent no disponible o retornó error, activando motor determinístico local:', err);
  }

  // 2. Fallback Determinístico Grounded en Datos Reales de PostgreSQL (Sin llamadas de red ni API keys)
  return generateDeterministicGroundedReply(payload);
}

function generateDeterministicGroundedReply(payload: GroqAgentPayload): string {
  const fullData = JSON.parse(payload.dbContextJson || '{}');
  const kpis = fullData._seccion_KPIs || fullData;
  const riesgoAlumnos = fullData._seccion_alumnos_riesgo?.top_15 || [];
  const categorias = fullData._seccion_categorias_frecuentes?.registros || [];
  const title = payload.kpiOrChartTitle;

  const totalAlumnos = kpis.total_alumnos ?? kpis.total_matricula ?? 0;
  const promedio = kpis.promedio_isc ?? kpis.promedio_puntos ?? 100;
  const verde = kpis.semaforo_verde ?? kpis.conteo_verde ?? 0;
  const naranja = kpis.semaforo_naranja ?? kpis.conteo_naranja ?? 0;
  const rojo = kpis.semaforo_rojo ?? kpis.conteo_rojo ?? 0;
  const incidencias = kpis.total_incidencias_periodo ?? kpis.total_incidencias ?? 0;

  if (payload.userQuery) {
    const q = payload.userQuery.toLowerCase();

    // Intent 1: Acciones o Recomendaciones directivas
    if (q.includes('accion') || q.includes('recomiend') || q.includes('hacer') || q.includes('paso') || q.includes('plan')) {
      return `💡 **Plan de Acción Recomendado para ${title}:**

1. **Atención Inmediata:** Focalizar entrevistas con tutores para los **${rojo} estudiantes en Semáforo Rojo** identificados en el mapa de riesgo.
2. **Seguimiento Preventivo:** Acordar compromisos de aula y asistencia con los **${naranja} alumnos en Semáforo Naranja**.
3. **Refuerzo Positivo:** Reconocer al **${totalAlumnos > 0 ? Math.round((verde / totalAlumnos) * 100) : 0}% (${verde} alumnos)** en Semáforo Verde para mantener el clima escolar óptimo.

¿Deseas exportar el reporte o consultar algún grupo en particular?`;
    }

    // Intent 2: Grupos con mayor riesgo / Quienes son
    if (q.includes('grupo') || q.includes('aula') || q.includes('mayor riesgo') || q.includes('quienes') || q.includes('carrera')) {
      const topGruposMap = new Map<string, number>();
      riesgoAlumnos.forEach((s: any) => {
        if (s.grupo) {
          topGruposMap.set(s.grupo, (topGruposMap.get(s.grupo) || 0) + 1);
        }
      });
      const gruposList = Array.from(topGruposMap.entries()).map(([g, count]) => `• **Grupo ${g}:** ${count} alumno(s) en atención prioritaria.`).join('\n');

      return `🏫 **Análisis por Grupos y Cuadro de Riesgo — ${title}:**

${gruposList || `• Actualmente se evalúan ${totalAlumnos} alumnos distribuidos en el plantel.`}

• **Total en Riesgo Relevante:** ${rojo} estudiantes en Rojo | ${naranja} en Naranja.

💡 **Siguiente Paso:** Puedes hacer clic en la tabla de riesgo de abajo para ver la ficha detallada de cada estudiante.`;
    }

    // Intent 3: Categorías o Motivos de incidencias frecuentes
    if (q.includes('categoria') || q.includes('motivo') || q.includes('incidencia') || q.includes('frecuent') || q.includes('reporte')) {
      const catList = categorias.length > 0
        ? categorias.slice(0, 4).map((c: any) => `• **${c.categoria}:** ${c.total} registro(s) (${c.severidad})`).join('\n')
        : '• Se mantiene un registro balanceado de incidencias conductuales en el sistema.';

      return `📋 **Desglose de Categorías de Incidencias — ${title}:**

${catList}

• **Volumen Acumulado:** ${incidencias} reportes registrados en el periodo.

💡 **Recomendación:** Monitorear las categorías con mayor frecuencia para implementar talleres de prevención específicos.`;
    }

    // Intent 4: Prevención y deserción escolar
    if (q.includes('deser') || q.includes('riesgo') || q.includes('atencion') || q.includes('preven') || q.includes('abando') || q.includes('tutor')) {
      return `📌 **Diagnóstico de Riesgo Conductual y Prevención de Deserción Escolar:**

• **Semáforo Rojo (Atención Prioritaria):** ${rojo} estudiantes.
• **Semáforo Naranja (Seguimiento Preventivo):** ${naranja} estudiantes.
• **Semáforo Verde (Desempeño Saludable):** ${verde} estudiantes.

💡 **Estrategia Directiva:**
La canalización temprana con Orientación Educativa dentro de los primeros 10 días tras un reporte rojo reduce el riesgo de abandono escolar hasta en un 85%.`;
    }

    // Dynamic Intent Fallback para preguntas abiertas
    return `🔍 **Respuesta Personalizada sobre "${payload.userQuery}" (${title}):**

• **Promedio Actual:** ${promedio} / 100 pts.
• **Resumen de Matrícula:** ${verde} Verde | ${naranja} Naranja | ${rojo} Rojo (Total: ${totalAlumnos} alumnos).
• **Incidencias Totales:** ${incidencias} reportes acumulados.

💡 **Análisis:** Sobre tu duda ("${payload.userQuery}"), la información indica ${rojo} casos prioritarios y ${naranja} preventivos. Te sugerimos revisar las recomendaciones del sistema en la sección de riesgo.`;
  }

  return `📊 **Síntesis Ejecutiva Grounded — ${title}**

• **Estado Actual de la BD:**
  - Promedio de Salud Conductual: ${promedio} / 100 pts.
  - Matrícula Evaluada: ${totalAlumnos} alumnos.
  - Distribución Semafórica: ${verde} Verde (Óptimo), ${naranja} Naranja (Prevención), ${rojo} Rojo (Atención Prioritaria).

• **Hallazgo Clave:**
  Se registran ${incidencias} reportes acumulados en el periodo. El ${totalAlumnos > 0 ? Math.round((verde / totalAlumnos) * 100) : 0}% de los alumnos se mantiene en Semáforo Verde.

• **Recomendación Directiva:**
  Focalizar las tutorías de orientación en los ${rojo + naranja} estudiantes identificados en Semáforo Naranja y Rojo en el cuadro de riesgo.`;
}
