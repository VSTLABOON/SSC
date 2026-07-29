/**
 * Constantes y helper unificado para la resolución de rutas de inicio por rol (RBAC).
 * Evita la duplicación de diccionarios de rutas entre App.tsx (RequireAuth / DefaultRouteRedirect)
 * y Login.tsx.
 */
export const RUTA_INICIO_POR_ROL: Record<string, string> = {
  alumno: '/alumno/inicio',
  docente: '/maestro/inicio',
  directivo: '/director/inicio',
  orientador: '/director/inicio',
  padre: '/alumno/inicio',
  pendiente: '/pendiente-activacion',
};

export function resolverRutaInicio(rol: string | null | undefined): string {
  if (!rol) return '/login';
  return RUTA_INICIO_POR_ROL[rol] ?? '/login';
}
