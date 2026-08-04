import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function parseSupabaseError(error: unknown, fallbackMessage = 'Ocurrió un error al procesar la solicitud'): Error {
  if (!error) return new Error(fallbackMessage);

  const errObj = error as { code?: string; message?: string; details?: string };
  if (errObj.code === '42501' || errObj.message?.includes('permission denied') || errObj.message?.includes('row-level security')) {
    return new Error('No tienes permisos suficientes (RLS) para consultar o modificar estos registros.');
  }

  if (errObj.code === 'PGRST116') {
    return new Error('No se encontró ningún registro que coincida con los criterios solicitados.');
  }

  if (errObj.code === '23505') {
    return new Error('Ya existe un registro con estos mismos datos únicos en la base de datos.');
  }

  return new Error(errObj.message || fallbackMessage);
}
