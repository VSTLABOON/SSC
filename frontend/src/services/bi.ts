import { supabase } from '../lib/supabaseClient';

export interface BIFilters {
  periodoId?: string;
  generacion?: string;
  grupoId?: string;
  severidad?: string;
  rangoTemporal?: 'semana' | 'mes' | 'periodo';
}

export interface BIKPIStats {
  total_alumnos: number;
  promedio_puntos: number | null;
  conteo_verde: number;
  conteo_naranja: number;
  conteo_rojo: number;
  total_incidencias: number;
}

export interface BITrendItem {
  mes: string;
  mes_nombre: string;
  verde: number;
  naranja: number;
  rojo: number;
  total: number;
}

export interface BICategoryItem {
  categoria: string;
  severidad: string;
  total_incidencias: number;
}

export interface BIRiskStudent {
  alumno_id: string;
  nombre_completo: string;
  matricula: string;
  grupo_nombre: string;
  nivel_semaforo: 'verde' | 'naranja' | 'rojo';
  puntos_totales: number;
  total_incidencias: number;
  risk_score?: number;
  risk_categoria?: string;
}

export interface StudentRiskScoreResult {
  alumno_id: string;
  score: number;
  categoria: string;
  recent_drop: number;
}

/**
 * Obtener estadísticas globales de KPIs mediante el RPC PostgreSQL 'fn_bi_get_kpis'
 * FUENTE ÚNICA DE VERDAD: PostgreSQL RPC
 */
export async function getBIKPIStats(filters: BIFilters): Promise<BIKPIStats> {
  const { data, error } = await supabase.rpc('fn_bi_get_kpis', {
    p_periodo_id: filters.periodoId || null,
    p_generacion: filters.generacion || null,
    p_grupo_id: filters.grupoId || null,
    p_severidad: filters.severidad || null,
    p_rango_temporal: filters.rangoTemporal || 'periodo',
  });

  if (error) {
    console.error('Error en RPC fn_bi_get_kpis:', error);
    throw error;
  }
  return data as BIKPIStats;
}

/**
 * Obtener tendencia de incidencias mediante el RPC PostgreSQL 'fn_bi_get_trend'
 * FUENTE ÚNICA DE VERDAD: PostgreSQL RPC
 */
export async function getBITrend(filters: BIFilters): Promise<BITrendItem[]> {
  const { data, error } = await supabase.rpc('fn_bi_get_trend', {
    p_periodo_id: filters.periodoId || null,
    p_generacion: filters.generacion || null,
    p_grupo_id: filters.grupoId || null,
    p_rango_temporal: filters.rangoTemporal || 'periodo',
  });

  if (error) {
    console.error('Error en RPC fn_bi_get_trend:', error);
    throw error;
  }
  return (data || []) as BITrendItem[];
}

/**
 * Obtener distribución de categorías más frecuentes mediante el RPC PostgreSQL 'fn_bi_get_categories'
 * FUENTE ÚNICA DE VERDAD: PostgreSQL RPC
 */
export async function getBICategories(filters: BIFilters): Promise<BICategoryItem[]> {
  const { data, error } = await supabase.rpc('fn_bi_get_categories', {
    p_periodo_id: filters.periodoId || null,
    p_generacion: filters.generacion || null,
    p_grupo_id: filters.grupoId || null,
    p_rango_temporal: filters.rangoTemporal || 'periodo',
  });

  if (error) {
    console.error('Error en RPC fn_bi_get_categories:', error);
    throw error;
  }
  return (data || []) as BICategoryItem[];
}

/**
 * Obtener estudiantes en riesgo / atención prioritaria mediante el RPC PostgreSQL 'fn_bi_get_risk_students'
 * FUENTE ÚNICA DE VERDAD: PostgreSQL RPC
 */
export async function getBIRiskStudents(filters: BIFilters): Promise<BIRiskStudent[]> {
  const { data, error } = await supabase.rpc('fn_bi_get_risk_students', {
    p_periodo_id: filters.periodoId || null,
    p_generacion: filters.generacion || null,
    p_grupo_id: filters.grupoId || null,
    p_rango_temporal: filters.rangoTemporal || 'periodo',
  });

  if (error) {
    console.error('Error en RPC fn_bi_get_risk_students:', error);
    throw error;
  }
  return (data || []) as BIRiskStudent[];
}

/**
 * Obtener la evaluación de riesgo multivariable de un alumno específico mediante el RPC SQL 'fn_bi_get_risk_score_alumno'
 * FUENTE ÚNICA DE VERDAD: PostgreSQL RPC
 */
export async function getBIRiskScoreAlumno(alumnoId: string): Promise<StudentRiskScoreResult | null> {
  const { data, error } = await supabase.rpc('fn_bi_get_risk_score_alumno', {
    p_alumno_id: alumnoId,
  });

  if (error) {
    console.error('Error en RPC fn_bi_get_risk_score_alumno:', error);
    throw error;
  }

  if (Array.isArray(data) && data.length > 0) {
    return data[0] as StudentRiskScoreResult;
  }
  return data as StudentRiskScoreResult | null;
}

/**
 * Obtener lista de generaciones distintas registradas en la base de datos
 */
export async function getGeneracionesDisponibles(): Promise<string[]> {
  const { data, error } = await supabase
    .from('alumnos')
    .select('generacion')
    .not('generacion', 'is', null);

  if (error) {
    console.error('Error al obtener generaciones:', error);
    throw error;
  }

  const set = new Set<string>();
  (data || []).forEach(item => {
    if (item.generacion && item.generacion.trim()) {
      set.add(item.generacion.trim());
    }
  });
  return Array.from(set).sort().reverse();
}

/**
 * Enviar alerta directa al tutor legal del alumno (notificación preventiva con incidencia_id = null)
 */
export async function sendPreventiveAlertToTutor(
  alumnoId: string,
  mensaje: string,
  sessionUserId: string
): Promise<boolean> {
  const { data: relacion, error: relErr } = await supabase
    .from('padres_alumnos')
    .select('padre_id')
    .eq('alumno_id', alumnoId)
    .limit(1)
    .single();

  if (relErr || !relacion?.padre_id) {
    throw new Error('El alumno no tiene un tutor registrado en la plataforma.');
  }

  const { error: insertErr } = await supabase
    .from('notificaciones')
    .insert({
      usuario_id: relacion.padre_id,
      incidencia_id: null,
      titulo: 'Alerta Preventiva Conductual',
      mensaje: mensaje,
      leido: false,
      canal: 'push',
      tipo: 'alerta_conductual',
      registrado_por: sessionUserId,
    });

  if (insertErr) throw insertErr;
  return true;
}
