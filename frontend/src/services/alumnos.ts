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

export interface AlumnoSearchResult {
  id: string;
  matricula: string;
  nivel_semaforo: string;
  puntos_totales: number;
  nombre: string;
  apellido: string;
  grupo_nombre: string;
}

export async function getAlumnosBusqueda(plantelId?: string | null): Promise<AlumnoSearchResult[]> {
  try {
    let query = supabase
      .from('alumnos')
      .select('id, matricula, nivel_semaforo, puntos_totales, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos(nombre, plantel_id)')
      .limit(300);

    if (plantelId) {
      query = query.eq('grupos.plantel_id', plantelId);
    }

    const { data, error } = await query;
    if (error) {
      let fbQuery = supabase
        .from('alumnos')
        .select('id, matricula, nivel_semaforo, puntos_totales, usuarios(nombre, apellido), grupos(nombre, plantel_id)')
        .limit(300);

      if (plantelId) {
        fbQuery = fbQuery.eq('grupos.plantel_id', plantelId);
      }

      const { data: fbData, error: fbErr } = await fbQuery;

      if (fbErr) throw fbErr;
      return (fbData || []).map((row: any) => {
        const u = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
        const g = Array.isArray(row.grupos) ? row.grupos[0] : row.grupos;
        return {
          id: row.id,
          matricula: row.matricula || '',
          nivel_semaforo: row.nivel_semaforo || 'verde',
          puntos_totales: row.puntos_totales || 0,
          nombre: u?.nombre || 'Alumno',
          apellido: u?.apellido || '',
          grupo_nombre: g?.nombre || 'Sin Grupo',
        };
      });
    }

    return (data || []).map((row: any) => {
      const u = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
      const g = Array.isArray(row.grupos) ? row.grupos[0] : row.grupos;
      return {
        id: row.id,
        matricula: row.matricula || '',
        nivel_semaforo: row.nivel_semaforo || 'verde',
        puntos_totales: row.puntos_totales || 0,
        nombre: u?.nombre || 'Alumno',
        apellido: u?.apellido || '',
        grupo_nombre: g?.nombre || 'Sin Grupo',
      };
    });
  } catch (err) {
    console.error('[getAlumnosBusqueda error]:', err);
    return [];
  }
}
