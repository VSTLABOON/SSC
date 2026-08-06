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
  const title = payload.kpiOrChartTitle;

  const totalAlumnos = kpis.total_alumnos ?? kpis.total_matricula ?? 0;
  const promedio = kpis.promedio_isc ?? kpis.promedio_puntos ?? 100;
  const verde = kpis.semaforo_verde ?? kpis.conteo_verde ?? 0;
  const naranja = kpis.semaforo_naranja ?? kpis.conteo_naranja ?? 0;
  const rojo = kpis.semaforo_rojo ?? kpis.conteo_rojo ?? 0;
  const incidencias = kpis.total_incidencias_periodo ?? kpis.total_incidencias ?? 0;

  if (payload.userQuery) {
    const q = payload.userQuery.toLowerCase();
    if (q.includes('deser') || q.includes('riesgo') || q.includes('atencion')) {
      return `📌 **Diagnóstico de Riesgo Conductual y Prevención Escolar:**

• **Alumnos en Atención Prioritaria (Rojo):** ${rojo} estudiantes.
• **Alumnos en Seguimiento Preventivo (Naranja):** ${naranja} estudiantes.
• **Total Matrícula Evaluada:** ${totalAlumnos} alumnos.

💡 **Recomendación Directiva:**
Se sugiere priorizar las sesiones de acompañamiento y tutoría conductual para los ${rojo} estudiantes en Semáforo Rojo en las primeras 2 semanas del periodo, a fin de prevenir la deserción escolar.`;
    }
    return `📌 **Consulta sobre ${title}:**

• **Promedio de Salud Conductual:** ${promedio} / 100 pts.
• **Estado Saludable (Verde):** ${verde} alumnos.
• **En Prevención / Atención Prioritaria:** ${naranja} Naranja | ${rojo} Rojo.
• **Volumen de Incidencias:** ${incidencias} reportes acumulados.

¿Deseas profundizar en algún grupo o periodo específico?`;
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
