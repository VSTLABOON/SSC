// Edge Function: sai-sync — Puente de integración con Sistema de Administración Institucional (SAI)
//
// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO: STUB — 501 Not Implemented
// Esta función define el CONTRATO de integración con el SAI de CONALEP.
// Se activará completamente después del piloto, cuando se provea acceso a la API del SAI.
// ═══════════════════════════════════════════════════════════════════════════════
//
// ── CONTRATO DE LA API ──────────────────────────────────────────────────────
//
// Endpoint: POST /functions/v1/sai-sync
//
// Headers requeridos:
//   Authorization: Bearer <JWT del directivo>
//   Content-Type: application/json
//
// Body esperado:
// {
//   plantelId: string,    -- UUID del plantel en el SSC
//   periodo: string,      -- Identificador del periodo en el SAI (ej: "2026-A")
//   sai_token: string,    -- Token de acceso a la API del SAI (provisto por CONALEP)
//   modo: "full" | "delta" -- "full": sincronización completa del periodo
//                          -- "delta": solo cambios desde la última sincronización
// }
//
// Datos esperados del SAI (respuesta de la API que se integrará):
// {
//   alumnos: Array<{
//     matricula: string,
//     nombre: string,
//     apellido: string,
//     correo_institucional: string,
//     grupo_clave: string,         -- ej: "SOMA-505"
//     carrera_clave: string,       -- ej: "INFO-01"
//     semestre: number,
//     turno: "M" | "V",
//     tipo_alumno: "Regular" | "Recursamiento",
//     generacion: string           -- ej: "2023-2026"
//   }>,
//   docentes: Array<{
//     rfc: string,
//     nombre: string,
//     apellido: string,
//     correo_institucional: string,
//     materias: Array<{ clave: string, nombre: string, grupo_clave: string }>
//   }>
// }
//
// Comportamiento esperado al implementar:
//   1. Verificar JWT → solo directivos autenticados
//   2. Llamar a la API del SAI con el sai_token
//   3. Para cada alumno:
//      a. Crear usuario en auth.users (inviteUserByEmail) si no existe
//      b. El trigger handle_new_user() creará el perfil en public.usuarios
//      c. Asignar grupo_id, carrera_id, matricula, generacion en public.alumnos
//      d. Si modo "delta", actualizar solo registros modificados
//   4. Para cada docente: ídem + asignar materias en public.materias
//   5. Retornar resumen: { creados: n, actualizados: n, errores: [] }
//
// ── ERRORES CONOCIDOS A RESOLVER ANTES DE IMPLEMENTAR ────────────────────────
//   - El SAI usa RFC como identificador, no UUID → necesitar tabla de mapeo sai_id ↔ uuid
//   - Confirmar si el SAI expone una API REST/SOAP o solo exporta CSV
//   - Validar encoding de caracteres (ISO-8859-1 vs UTF-8) en nombres con acentos
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // TODO: Implementar después del piloto cuando CONALEP provea acceso al SAI.
  // Ver contrato de integración en los comentarios de este archivo.
  return new Response(
    JSON.stringify({
      error: 'No implementado',
      mensaje: 'La integración con el SAI estará disponible después del piloto, ' +
               'cuando CONALEP provea las credenciales de acceso a su API. ' +
               'El contrato de integración está documentado en este archivo.',
      contrato_version: '1.0.0',
      estado: 'pendiente_acceso_sai',
    }),
    {
      status: 501,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  );
});
