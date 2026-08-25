import { supabase } from '../lib/supabaseClient';

export async function getAlumnosDeGrupo(grupoId: string) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, matricula, nivel_semaforo, puntos_totales, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos(nombre)')
    .eq('grupo_id', grupoId);

  if (error) throw error;
  return data;
}

export async function getAlumnosDePlantel(plantelId: string) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, matricula, nivel_semaforo, puntos_totales, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos!inner(plantel_id, nombre)')
    .eq('grupos.plantel_id', plantelId);

  if (error) {
    // Reintento sin inner join si el esquema de claves foráneas varía
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('alumnos')
      .select('id, matricula, nivel_semaforo, puntos_totales, usuarios(nombre, apellido), grupos(nombre, plantel_id)')
      .eq('grupos.plantel_id', plantelId);

    if (fallbackError) throw fallbackError;
    return fallbackData;
  }
  return data;
}

export async function getPerfilAlumno(alumnoId: string) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, matricula, nivel_semaforo, puntos_totales, tipo_sangre, alergias, usuarios!alumnos_usuario_id_fkey(nombre, apellido, email), grupos(nombre), contactos_emergency(nombre, parentesco, telefono)')
    .eq('id', alumnoId)
    .single();

  if (error) throw error;
  return data;
}
