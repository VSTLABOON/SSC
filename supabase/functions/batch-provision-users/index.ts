// Edge Function: batch-provision-users
// Aprovisionamiento masivo de usuarios para el plantel. Requiere service_role key.
// Solo puede ser llamada por un usuario autenticado con rol 'directivo'.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Restringir CORS al origen del frontend
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

    // Cliente con la clave del usuario para verificar su rol
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
      return json({ error: 'Solo los administradores y directivos pueden usar el aprovisionamiento masivo.' }, 403);
    }

    const plantelId = perfil.plantel_id;

    // ── 2. Validar body de la petición ──────────────────────────────────────
    const body = await req.json();
    const { usuarios } = body;

    if (!Array.isArray(usuarios)) {
      return json({ error: 'El campo "usuarios" debe ser un arreglo.' }, 400);
    }

    // ── 3. Procesamiento masivo vía Admin API ───────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let exitosos = 0;
    let fallidos = 0;
    const resultados = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Procesar usuarios secuencialmente para evitar condiciones de carrera al crear padres
    for (const u of usuarios) {
      const email = typeof u.email === 'string' ? u.email.trim().toLowerCase() : '';
      
      try {
        const nombre = typeof u.nombre === 'string' ? u.nombre.trim() : '';
        const apellido = typeof u.apellido === 'string' ? u.apellido.trim() : '';
        const rol = u.rol;

        if (!email || !nombre || !apellido || !rol) {
          throw new Error('Campos requeridos faltantes (email, nombre, apellido, rol).');
        }

        if (!emailRegex.test(email)) {
          throw new Error('Formato de correo electrónico inválido.');
        }

        if (nombre.length > 100 || apellido.length > 100) {
          throw new Error('El nombre y apellido no pueden exceder los 100 caracteres.');
        }

        if (!ROLES_VALIDOS.includes(rol)) {
          throw new Error(`Rol inválido. Valores permitidos: ${ROLES_VALIDOS.join(', ')}.`);
        }

        let password = u.password;
        if (!password) {
          password = (rol === 'alumno' && u.matricula) ? u.matricula : 'Conalep.2026!';
        }

        // a. Crear usuario auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            plantel_id: plantelId,
            nombre,
            apellido,
          },
        });

        if (createError) {
          throw new Error(`Error al crear usuario auth: ${createError.message}`);
        }

        const newUserId = newUser.user.id;

        // b. Actualizar rol y estado activo en public.usuarios
        const { error: updateError } = await supabaseAdmin
          .from('usuarios')
          .update({ rol, activo: true })
          .eq('id', newUserId);

        if (updateError) {
          throw new Error(`Error al actualizar perfil del usuario: ${updateError.message}`);
        }

        // c. Lógica específica si el rol es alumno
        if (rol === 'alumno') {
          if (!u.matricula) {
            throw new Error('Matrícula requerida para alumnos.');
          }

          let grupoId = null;
          let carreraId = null;

          if (u.grupo_nombre) {
            const { data: gData } = await supabaseAdmin
              .from('grupos')
              .select('id')
              .eq('nombre', u.grupo_nombre)
              .eq('plantel_id', plantelId)
              .maybeSingle();
            if (gData) grupoId = gData.id;
          }

          if (u.carrera_nombre) {
            const { data: cData } = await supabaseAdmin
              .from('carreras')
              .select('id')
              .eq('nombre', u.carrera_nombre)
              .eq('plantel_id', plantelId)
              .maybeSingle();
            if (cData) carreraId = cData.id;
          }

          const { data: alumnoData, error: alumnoError } = await supabaseAdmin
            .from('alumnos')
            .insert({
              usuario_id: newUserId,
              matricula: u.matricula,
              grupo_id: grupoId,
              carrera_id: carreraId,
              nivel_semaforo: 'verde',
              puntos_conducta: 100
            })
            .select('id')
            .single();

          if (alumnoError || !alumnoData) {
            throw new Error(`Error al registrar alumno: ${alumnoError?.message ?? 'Sin datos'}`);
          }

          const alumnoId = alumnoData.id;

          // Vincular tutor si se provee
          if (u.tutor_email) {
            const tEmail = u.tutor_email.trim().toLowerCase();
            const tNombre = u.tutor_nombre ? u.tutor_nombre.trim() : 'Tutor';
            const tApellido = u.tutor_apellido ? u.tutor_apellido.trim() : '';

            // Verificar si ya existe el usuario con ese email
            const { data: tutorExistente, error: tSearchErr } = await supabaseAdmin
              .from('usuarios')
              .select('id')
              .eq('email', tEmail)
              .maybeSingle();

            let tutorId = null;

            if (tutorExistente) {
              tutorId = tutorExistente.id;
            } else {
              // Crear nuevo usuario auth para el padre
              const { data: newTutor, error: tCreateErr } = await supabaseAdmin.auth.admin.createUser({
                email: tEmail,
                password: 'Conalep.2026!',
                email_confirm: true,
                user_metadata: {
                  plantel_id: plantelId,
                  nombre: tNombre,
                  apellido: tApellido,
                },
              });

              if (tCreateErr) {
                throw new Error(`Error al crear tutor auth: ${tCreateErr.message}`);
              }

              tutorId = newTutor.user.id;

              // Actualizar a rol padre y activo
              const { error: tUpdateErr } = await supabaseAdmin
                .from('usuarios')
                .update({ rol: 'padre', activo: true })
                .eq('id', tutorId);
                
              if (tUpdateErr) {
                throw new Error(`Error al actualizar rol de tutor: ${tUpdateErr.message}`);
              }
            }

            // Crear vínculo padre_alumno
            if (tutorId) {
              const { error: linkErr } = await supabaseAdmin
                .from('padres_alumnos')
                .insert({
                  padre_id: tutorId,
                  alumno_id: alumnoId,
                  parentesco: 'Tutor'
                });
                
              if (linkErr) {
                throw new Error(`Error al vincular tutor: ${linkErr.message}`);
              }
            }
          }

          // Guardar teléfono de emergencia si se provee
          if (u.tel_emergencia) {
            const { error: telErr } = await supabaseAdmin
              .from('contactos_emergency')
              .insert({
                alumno_id: alumnoId,
                nombre_contacto: `${nombre} ${apellido}`,
                parentesco: 'Alumno',
                telefono: u.tel_emergencia,
                es_principal: true
              });
              
            if (telErr) {
              throw new Error(`Error al guardar teléfono de emergencia: ${telErr.message}`);
            }
          }
        }

        // Si llega hasta aquí, el usuario se procesó correctamente
        exitosos++;
        resultados.push({ email, exito: true });

      } catch (err: any) {
        fallidos++;
        resultados.push({ email, exito: false, error: err.message });
      }
    }

    // ── 4. Respuesta ──────────────────────────────────────────────────────────
    return json({
      resumen: {
        total: usuarios.length,
        exitosos,
        fallidos
      },
      resultados
    }, 200);

  } catch (err) {
    console.error('Error inesperado en batch-provision-users:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
