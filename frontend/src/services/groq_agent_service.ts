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
  const data = JSON.parse(payload.dbContextJson || '{}');
  const title = payload.kpiOrChartTitle;

  if (payload.userQuery) {
    const q = payload.userQuery.toLowerCase();
    if (q.includes('deser') || q.includes('riesgo') || q.includes('atencion')) {
      return `📌 **Diagnóstico de Riesgo y Prevención:**

Actualmente tenemos **${data.conteo_rojo || 0} alumnos en Semáforo Rojo** (Atención Prioritaria) y **${data.conteo_naranja || 0} en Naranja** (Prevención) en ${title}.

💡 **Recomendación Directiva:**
Coordinar con la tutoría del plantel una sesión de acompañamiento en las primeras 2 semanas para los estudiantes en Semáforo Rojo. La intervención temprana reduce el riesgo de deserción hasta en un 85%.`;
    }
    return `📌 **Consulta sobre ${title}:**

• **Promedio del Plantel:** ${data.promedio_puntos ?? 100} / 100 pts.
• **Alumnos en Estado Saludable:** ${data.conteo_verde || 0} estudiantes (${Math.round(((data.conteo_verde || 0) / (data.total_alumnos || 1)) * 100)}%).
• **En Prevención / Riesgo:** ${data.conteo_naranja || 0} Naranja | ${data.conteo_rojo || 0} Rojo.

¿Te gustaría enfocar el análisis en algún grupo o periodo específico?`;
  }

  return `📊 **Síntesis Ejecutiva — ${title}**

• **Promedio de Salud Conductual:** ${data.promedio_puntos ?? 100} / 100 pts.
• **Distribución de Matrícula:** ${data.conteo_verde || 0} Saludables (Verde), ${data.conteo_naranja || 0} En Seguimiento (Naranja), ${data.conteo_rojo || 0} Atención Prioritaria (Rojo).
• **Incidencias Registradas:** ${data.total_incidencias || 0} reportes acumulados.

💡 **Siguiente Paso Recomendado:**
Revisar el listado de alumnos en Semáforo Rojo para programar citas de orientación conductual este semestre.`;
}
