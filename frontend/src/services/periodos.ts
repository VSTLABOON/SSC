import { supabase } from '../lib/supabaseClient';

export interface PeriodoEscolar {
  id: string;
  nombre: string;
  activo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export async function getPeriodoActivo(plantelId: string): Promise<string> {
  const { data, error } = await supabase
    .from('periodos_escolares')
    .select('id')
    .eq('plantel_id', plantelId)
    .eq('activo', true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error('No se encontró un período activo para este plantel.');
  return data.id;
}

export async function getPeriodosDelPlantel(plantelId: string): Promise<PeriodoEscolar[]> {
  const { data, error } = await supabase
    .from('periodos_escolares')
    .select('id, nombre, activo, fecha_inicio, fecha_fin')
    .eq('plantel_id', plantelId)
    .order('fecha_inicio', { ascending: false });

  if (error) console.error('Error al obtener periodos del plantel:', error);
  return (data || []) as PeriodoEscolar[];
}
