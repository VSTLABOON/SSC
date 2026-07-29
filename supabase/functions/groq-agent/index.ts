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

    const systemPrompt = `Eres el Agente IA de Inteligencia Directiva del Sistema SSC de CONALEP Plantel Puebla I.
REGLAS STRICTAS DE RESPUESTA (CERO ALUCINACIONES):
1. Basarás tu análisis ÚNICAMENTE y EXCLUSIVAMENTE en los datos de la Base de Datos PostgreSQL provistos en el CONTEXTO_DB.
2. NUNCA inventes números, estadísticas, nombres de alumnos o eventos que no estén en el CONTEXTO_DB.
3. Si los datos están vacíos o no hay registros en el periodo, dirás explícitamente "No hay registros conductuales en la base de datos para este periodo".
4. Tu tono es profesional, ejecutivo, preventivo y enfocado en evitar la deserción escolar.
5. NO uses emojis bajo ninguna circunstancia.`;

    const userPrompt = `GRÁFICA / KPI SELECCIONADA: ${kpiOrChartTitle}

CONTEXTO DURO DE BASE DE DATOS POSTGRESQL (DATOS REALES EN TIEMPO REAL):
${dbContextJson}

${userQuery ? `PREGUNTA ESPECÍFICA DEL DIRECTIVO: "${userQuery}"` : 'Genera una síntesis ejecutiva estructurada con: 1) Resumen del indicador, 2) Hallazgos clave en la BD, 3) Recomendación directiva preventiva.'}`;

    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY no configurada en Supabase Edge Function Secrets." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
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
        temperature: 0.2,
        max_tokens: 600,
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
