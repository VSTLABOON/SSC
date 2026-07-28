import { supabase } from '../lib/supabaseClient';

export interface ClassDocente {
  materiaId: string;
  materiaNombre: string;
  grupoId: string;
  grupoNombre: string;
  semestre: number;
  turno: string;
}

export async function getGruposDeDocente(docenteId: string): Promise<ClassDocente[]> {
  const { data, error } = await supabase
    .from('materias')
    .select('id, nombre, grupo_id, grupos(id, nombre, semestre, turno)')
    .eq('docente_id', docenteId);

  if (error) throw error;

  return ((data || []) as unknown as Array<{
    id: string;
    nombre: string | null;
    grupo_id: string;
    grupos: { id: string; nombre: string; semestre: number; turno: string } | null;
  }>).map((item) => ({
    materiaId: item.id,
    materiaNombre: item.nombre || 'Materia Desconocida',
    grupoId: item.grupo_id,
    grupoNombre: item.grupos?.nombre || 'N/A',
    semestre: item.grupos?.semestre || 1,
    turno: item.grupos?.turno || 'Matutino',
  }));
}

export async function getGruposDePlantel(plantelId: string): Promise<Array<{ id: string; nombre: string }>> {
  const { data, error } = await supabase
    .from('grupos')
    .select('id, nombre')
    .eq('plantel_id', plantelId)
    .order('nombre');

  if (error) throw error;
  return data || [];
}

export async function getGeneracionesDisponibles(): Promise<string[]> {
  return ['2023-2026', '2024-2027', '2025-2028'];
}
