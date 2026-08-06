import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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

    // 1.5. Verificación Estricta de Rol Autorizado (RBAC) y Estado de Cuenta Activa
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('usuarios')
      .select('rol, activo')
      .eq('id', user.id)
      .single();

    const ROLES_AUTORIZADOS = ['directivo', 'orientador'];

    if (perfilError || !perfil || !perfil.activo || !ROLES_AUTORIZADOS.includes(perfil.rol)) {
      return new Response(
        JSON.stringify({ error: "No autorizado para consultar el Agente de Inteligencia Directiva." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
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

    const systemPrompt = `Eres el Asistente IA de Inteligencia Conductual de CONALEP Plantel Puebla I. Tu función es orientar a directivos y docentes con análisis claros, humanos, precisos y accionables para prevenir la deserción escolar.

=== TONO Y ESTILO (OBLIGATORIO) ===
1. **Humano y Directo:** Responde como un consultor pedagógico experto, empático y profesional. Sé directo y ágil: evita la jerga técnica innecesaria (no menciones nombres de funciones SQL como '_seccion' o 'RPC').
2. **Conciso y Estructurado:** Usa párrafos breves, viñetas claras y negritas en los datos clave. Máximo 250-300 palabras por respuesta a menos que se solicite un informe detallado.
3. **Respuesta Guiada por la Pregunta:** Si el usuario hace una pregunta específica, RESPÓNNDELA DIRECTAMENTE en el primer párrafo antes de agregar cualquier contexto adicional.
4. **Cero Alucinación:** Basarás tus cifras y datos ÚNICAMENTE en la información proporcionada en CONTEXTO_DB. Nunca inventes nombres ni porcentajes.
5. **Formato:** Usa títulos breves, listas ordenadas y destaca siempre una **Acción Recomendada Relevante**.

=== ESTRUCTURA RECOMENDADA ===
- **Resumen Directo:** ¿Qué significan estos datos de un vistazo?
- **Puntos Clave / Hallazgos:** Cifras concretas de alumnos, grupos y semáforos.
- **Acción Sugerida:** Paso a paso concreto para el equipo docente o directivo.`;

    const userPrompt = `=== CONSULTA EN PANTALLA ===
VISTA SELECCIONADA: ${kpiOrChartTitle}

=== DATOS DE LA BASE DE DATOS (CONALEP PUEBLA I) ===
${safeContext}

=== PREGUNTA / INSTRUCCIÓN DEL USUARIO ===
${userQuery
  ? `El usuario pregunta: "${userQuery}"

Responde la pregunta con un tono ágil, claro y directo basándote en los datos reales de la BD.`
  : `Genera una síntesis ejecutiva clara y conversacional sobre la vista "${kpiOrChartTitle}", destacando el estado actual y la recomendación prioritaria.`}`;

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
