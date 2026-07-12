import { supabase } from '../lib/supabaseClient';

export async function getPeriodoActivo(plantelId: string): Promise<string> {
  const { data, error } = await supabase
    .from('periodos_escolares')
    .select('id')
    .eq('plantel_id', plantelId)
    .eq('activo', true)
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('No se encontró un período activo para este plantel.');
  return data.id;
}
