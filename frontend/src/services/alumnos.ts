import { supabase } from '../lib/supabaseClient';

export async function getAlumnosDeGrupo(grupoId: string) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, matricula, nivel_semaforo, puntos_totales, usuarios(nombre, apellido)')
    .eq('grupo_id', grupoId);

  if (error) throw error;
  return data;
}

export async function getAlumnosDePlantel(plantelId: string) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, matricula, nivel_semaforo, puntos_totales, usuarios(nombre, apellido), grupos!inner(plantel_id)')
    .eq('grupos.plantel_id', plantelId);

  if (error) throw error;
  return data;
}

export async function getPerfilAlumno(alumnoId: string) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, matricula, nivel_semaforo, puntos_totales, usuarios(nombre, apellido, email), grupos(nombre), contactos_emergencia(nombre, parentesco, telefono)')
    .eq('id', alumnoId)
    .single();

  if (error) throw error;
  return data;
}
