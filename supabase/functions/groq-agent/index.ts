import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate Limiter en memoria efímero por instancia Deno (Limitación técnica conocida en Deno Deploy)
// En producción con múltiples pods distribuidos, se recomienda migrar a la tabla PostgreSQL public.groq_rate_limits.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRecord = rateLimitMap.get(userId);

  if (!userRecord || now > userRecord.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (userRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  userRecord.count += 1;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validación de Autenticación de Usuario (JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado. Cabecera Authorization requerida." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Sesión no válida o token JWT expirado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // 2. Control de Rate Limiting por usuario
    if (isRateLimited(user.id)) {
      return new Response(
        JSON.stringify({ error: "Límite de peticiones excedido (máximo 10 por minuto). Intente más tarde." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    const { kpiOrChartTitle, dbContextJson, userQuery } = await req.json();

    // Sanitización preventiva: truncar a 6000 chars para dar espacio exhaustivo sin exceder tokens
    const safeContext = (dbContextJson || "").length > 6000
      ? (dbContextJson || "").slice(0, 6000) + "\n... (contexto truncado por longitud)"
      : (dbContextJson || "");

    const systemPrompt = `Eres el Agente IA de Inteligencia Directiva del Sistema de Seguimiento Conductual (SSC) de CONALEP Plantel Puebla I. Tu audiencia son directivos y orientadores escolares responsables de prevenir la deserción estudiantil.

=== PROTOCOLO DE ANÁLISIS EXHAUSTIVO (OBLIGATORIO) ===

PASO 1 — INSPECCIÓN COMPLETA DEL CONTEXTO:
Antes de emitir cualquier conclusión, DEBES leer y procesar TODAS las secciones del CONTEXTO_DB sin excepción:
• _seccion_KPIs: Indicadores globales (matrícula, ISC promedio, distribución semafórica, incidencias totales, porcentajes).
• _seccion_tendencia_temporal: Evolución cronológica mes a mes (verde, naranja, rojo por periodo).
• _seccion_categorias_frecuentes: Desglose por categoría y severidad de cada tipo de incidencia.
• _seccion_alumnos_riesgo: Lista nominal de los alumnos en atención prioritaria con su Risk Score, grupo, semáforo y conteo individual.

PASO 2 — CRUCE MULTI-DIMENSIONAL:
Toda conclusión DEBE cruzar al menos 2 secciones. Ejemplos de cruces obligatorios:
• Correlación entre las categorías más frecuentes (_seccion_categorias) y los alumnos específicos que acumulan esas categorías (_seccion_alumnos_riesgo).
• Correlación entre la tendencia temporal (_seccion_tendencia) y los KPIs actuales: ¿la situación mejora o empeora?
• Identificación de concentración por grupo: ¿hay un grupo específico que concentre desproporcionadamente los alumnos en riesgo?

PASO 3 — DETECCIÓN DE PATRONES OCULTOS Y SESGO POR OMISIÓN:
• Si un grupo tiene muchos alumnos pero cero incidencias, MENCIONA esa anomalía (puede ser sub-registro, no ausencia de problemas).
• Si la tendencia temporal muestra meses sin datos, NO asumas normalidad; señala explícitamente que hay un vacío de información.
• Si todas las incidencias son de la misma categoría, señala el sesgo de registro.
• Si hay alumnos con muchas incidencias pero ISC alto (o viceversa), señala la discrepancia.

=== REGLAS ESTRICTAS DE RESPUESTA (CERO ALUCINACIONES) ===

1. Basarás tu análisis ÚNICAMENTE en los datos del CONTEXTO_DB proporcionado. NUNCA inventes nombres, números, fechas ni porcentajes.
2. Si una sección del contexto está vacía o tiene 0 registros, DEBES declararlo explícitamente: "La sección [X] no contiene registros en el periodo evaluado, lo cual puede indicar [sub-registro / periodo sin actividad / filtro demasiado estrecho]."
3. Cita datos textuales del contexto. Ejemplo correcto: "Según _seccion_alumnos_riesgo, Juan Pérez (matrícula 2024001, grupo 3A) acumula 8 incidencias con Risk Score de 78.5."
4. NO uses emojis bajo ninguna circunstancia.
5. Tu tono es profesional, ejecutivo, preventivo y enfocado en proteger la permanencia escolar de menores de edad.
6. Estructura tu respuesta con encabezados claros y numerados.
7. Siempre cierra con una sección de "Vacíos de Información Detectados" listando qué datos faltan o qué anomalías podrían indicar sub-registro.

=== ESTRUCTURA DE RESPUESTA OBLIGATORIA ===

1. DIAGNÓSTICO SITUACIONAL: Resumen del estado actual cruzando KPIs + tendencia.
2. HALLAZGOS ESPECÍFICOS: Datos concretos con nombres, grupos y cifras exactas del contexto.
3. PATRONES DETECTADOS: Correlaciones entre categorías, tendencias y alumnos específicos.
4. RECOMENDACIONES DIRECTIVAS: Acciones concretas priorizadas por urgencia.
5. VACÍOS DE INFORMACIÓN: Qué datos faltan, qué anomalías sugieren sub-registro o sesgo.`;

    const userPrompt = `=== CONSULTA DEL DIRECTIVO ===
GRÁFICA / KPI SELECCIONADA: ${kpiOrChartTitle}

=== CONTEXTO_DB: DATOS REALES EXTRAÍDOS DE POSTGRESQL EN TIEMPO REAL ===
(Lee TODAS las secciones antes de responder. No omitas ninguna.)

${safeContext}

=== INSTRUCCIÓN DE ANÁLISIS ===
${userQuery
  ? `El directivo pregunta específicamente: "${userQuery}"

Responde esta pregunta PERO además cruza la respuesta con las demás secciones del CONTEXTO_DB para dar una visión completa. Si la pregunta solo se refiere a una dimensión (ej. solo KPIs), igualmente verifica si los datos de tendencia, categorías o alumnos en riesgo aportan matices relevantes.`
  : `Genera un análisis ejecutivo EXHAUSTIVO siguiendo los 5 pasos de la estructura obligatoria. Cruza TODAS las secciones del contexto entre sí. No te limites a resumir cada sección por separado: el valor está en las correlaciones y patrones cruzados.`}`;

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY no configurada en Supabase Edge Function Secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // AbortSignal timeout de 15 segundos para dar margen al análisis exhaustivo
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.15,
        max_tokens: 1200,
      }),
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "Síntesis no disponible.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
