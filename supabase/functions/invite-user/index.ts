// Edge Function: invite-user
// Invita a un nuevo usuario al plantel. Requiere service_role key (nunca expuesta en cliente).
// Solo puede ser llamada por un usuario autenticado con rol 'directivo'.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CRIT-2: Restringir CORS al origen del frontend sin comodin wildcard
const SITE_URL = Deno.env.get('SITE_URL');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': SITE_URL || '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ROLES_VALIDOS = ['docente', 'orientador', 'alumno', 'padre', 'directivo', 'administrador'];

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Si SITE_URL no está definida en el entorno, abortar de forma segura sin exponer stack trace
  if (!SITE_URL) {
    console.error('Error de configuracion: la variable SITE_URL no esta definida en el entorno.');
    return json({ error: 'Error interno del servidor.' }, 500);
  }

  try {
    // ── 1. Verificar que el solicitante es un directivo o administrador autenticado ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'No autorizado: falta Authorization header.' }, 401);
    }

    // Cliente con la clave del usuario (para verificar su rol vía RLS)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Sesión inválida.' }, 401);
    }

    // Leer perfil del solicitante para confirmar rol y obtener plantel_id
    const { data: perfil, error: perfilError } = await supabaseUser
      .from('usuarios')
      .select('rol, plantel_id')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      return json({ error: 'No se encontró el perfil del solicitante.' }, 403);
    }

    if (perfil.rol !== 'directivo' && perfil.rol !== 'administrador') {
      return json({ error: 'Solo los administradores y directivos pueden invitar usuarios.' }, 403);
    }

    // ── 2. Validar body de la petición ──────────────────────────────────────
    const body = await req.json();
    const { email, nombre, apellido, rol } = body;
    let { plantelId } = body;

    if (!email || !nombre || !apellido || !rol) {
      return json({ error: 'Campos requeridos: email, nombre, apellido, rol.' }, 400);
    }

    // MEDIO-6: Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return json({ error: 'Formato de correo electrónico inválido.' }, 400);
    }

    // MEDIO-3: Validación de longitud
    if (nombre.trim().length > 100 || apellido.trim().length > 100) {
      return json({ error: 'El nombre y apellido no pueden exceder los 100 caracteres.' }, 400);
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return json({ error: `Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}.` }, 400);
    }

    // Validación de plantelId: si viene, debe ser el del director.
    if (plantelId && plantelId !== perfil.plantel_id) {
      return json({ error: 'No tienes permiso para invitar a un plantel diferente al tuyo.' }, 403);
    }
    if (!plantelId) {
      plantelId = perfil.plantel_id;
    }

    // ── 3. Invitar usuario vía Admin API (requiere service_role key) ─────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: {
          plantel_id: plantelId,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
        },
        redirectTo: `${SITE_URL}/login`,
      }
    );

    if (inviteError) {
      console.error('Error al invitar usuario:', inviteError.message);
      return json({ error: inviteError.message }, 500);
    }

    // ── 4. Respuesta exitosa (BAJO-1: No retornar userId de inviteData) ──────
    return json({
      message: `Invitación enviada a ${email.trim()}. El usuario aparecerá en el panel con rol 'pendiente' hasta que lo actives.`,
    }, 200);

  } catch (err) {
    console.error('Error inesperado en invite-user:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
