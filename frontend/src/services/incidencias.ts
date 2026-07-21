import { supabase } from '../lib/supabaseClient';

export async function getIncidenciasDelAlumno(alumnoId: string) {
  const { data, error } = await supabase
    .from('incidencias')
    .select('id, descripcion, lugar, impacto_puntos, created_at, categorias_incidencia(nombre, color_semaforo)')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getIncidenciasPorDocente(docenteId: string) {
  const { data, error } = await supabase
    .from('incidencias')
    .select('id, descripcion, lugar, impacto_puntos, created_at, alumno_id, alumnos(matricula, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos(nombre, carreras(nombre))), categorias_incidencia(nombre, color_semaforo)')
    .eq('registrado_por', docenteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getIncidenciasPorPlantel(plantelId: string) {
  const { data, error } = await supabase
    .from('incidencias')
    .select('id, descripcion, lugar, impacto_puntos, created_at, alumno_id, alumnos!inner(matricula, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos!inner(nombre, plantel_id, carreras(nombre))), categorias_incidencia(nombre, color_semaforo)')
    .eq('alumnos.grupos.plantel_id', plantelId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCategoriasIncidencia(plantelId: string) {
  const { data, error } = await supabase
    .from('categorias_incidencia')
    .select('id, nombre, color_semaforo, impacto_base')
    .eq('plantel_id', plantelId);

  if (error) throw error;
  return data;
}
