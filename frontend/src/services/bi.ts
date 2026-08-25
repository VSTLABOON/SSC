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
 * FUENTE ÚNICA DE VERDAD: PostgreSQL RPC con fallback relacional reactivo
 */
export async function getBIKPIStats(filters: BIFilters): Promise<BIKPIStats> {
  try {
    const { data, error } = await supabase.rpc('fn_bi_get_kpis', {
      p_periodo_id: filters.periodoId || null,
      p_generacion: filters.generacion || null,
      p_grupo_id: filters.grupoId || null,
      p_severidad: filters.severidad || null,
      p_rango_temporal: filters.rangoTemporal || 'periodo',
    });

    if (!error && data) {
      return data as BIKPIStats;
    }
  } catch (err) {
    console.warn('[BI] RPC fn_bi_get_kpis no disponible, utilizando fallback relacional:', err);
  }

  // Fallback relacional directo
  try {
    let queryAlumnos = supabase
      .from('alumnos')
      .select('id, nivel_semaforo, puntos_totales, generacion, grupo_id');

    if (filters.generacion) queryAlumnos = queryAlumnos.eq('generacion', filters.generacion);
    if (filters.grupoId) queryAlumnos = queryAlumnos.eq('grupo_id', filters.grupoId);
    if (filters.severidad) queryAlumnos = queryAlumnos.eq('nivel_semaforo', filters.severidad);

    const { data: alumnosData } = await queryAlumnos;
    const alumnos = alumnosData || [];

    const total_alumnos = alumnos.length;
    const conteo_verde = alumnos.filter(a => a.nivel_semaforo === 'verde').length;
    const conteo_naranja = alumnos.filter(a => a.nivel_semaforo === 'naranja').length;
    const conteo_rojo = alumnos.filter(a => a.nivel_semaforo === 'rojo').length;
    const sumPuntos = alumnos.reduce((acc, a) => acc + (a.puntos_totales ?? 100), 0);
    const promedio_puntos = total_alumnos > 0 ? Number((sumPuntos / total_alumnos).toFixed(1)) : null;

    let queryIncs = supabase
      .from('incidencias')
      .select('id, created_at, periodo_id, categorias_incidencia(color_semaforo), alumnos!inner(id, generacion, grupo_id, nivel_semaforo)', { count: 'exact' });

    if (filters.periodoId) queryIncs = queryIncs.eq('periodo_id', filters.periodoId);
    if (filters.generacion) queryIncs = queryIncs.eq('alumnos.generacion', filters.generacion);
    if (filters.grupoId) queryIncs = queryIncs.eq('alumnos.grupo_id', filters.grupoId);
    if (filters.severidad) queryIncs = queryIncs.eq('alumnos.nivel_semaforo', filters.severidad);

    if (filters.rangoTemporal === 'semana') {
      const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      queryIncs = queryIncs.gte('created_at', d.toISOString());
    } else if (filters.rangoTemporal === 'mes') {
      const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      queryIncs = queryIncs.gte('created_at', d.toISOString());
    }

    const { count } = await queryIncs;

    return {
      total_alumnos,
      promedio_puntos,
      conteo_verde,
      conteo_naranja,
      conteo_rojo,
      total_incidencias: count || 0,
    };
  } catch (err) {
    console.error('Error en fallback getBIKPIStats:', err);
    return {
      total_alumnos: 0,
      promedio_puntos: null,
      conteo_verde: 0,
      conteo_naranja: 0,
      conteo_rojo: 0,
      total_incidencias: 0,
    };
  }
}

/**
 * Obtener tendencia de incidencias mediante el RPC PostgreSQL 'fn_bi_get_trend' o fallback relacional
 */
export async function getBITrend(filters: BIFilters): Promise<BITrendItem[]> {
  try {
    const { data, error } = await supabase.rpc('fn_bi_get_trend', {
      p_periodo_id: filters.periodoId || null,
      p_generacion: filters.generacion || null,
      p_grupo_id: filters.grupoId || null,
      p_rango_temporal: filters.rangoTemporal || 'periodo',
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      let result = data as BITrendItem[];
      if (filters.severidad) {
        result = result.map(item => ({
          ...item,
          verde: filters.severidad === 'verde' ? item.verde : 0,
          naranja: filters.severidad === 'naranja' ? item.naranja : 0,
          rojo: filters.severidad === 'rojo' ? item.rojo : 0,
          total: filters.severidad === 'verde' ? item.verde : filters.severidad === 'naranja' ? item.naranja : item.rojo,
        }));
      }
      return result;
    }
  } catch (err) {
    console.warn('[BI] RPC fn_bi_get_trend no disponible, usando fallback relacional:', err);
  }

  // Fallback relacional directo
  try {
    let query = supabase
      .from('incidencias')
      .select('created_at, categorias_incidencia(color_semaforo), alumnos!inner(id, generacion, grupo_id, nivel_semaforo)');

    if (filters.periodoId) query = query.eq('periodo_id', filters.periodoId);
    if (filters.generacion) query = query.eq('alumnos.generacion', filters.generacion);
    if (filters.grupoId) query = query.eq('alumnos.grupo_id', filters.grupoId);

    if (filters.rangoTemporal === 'semana') {
      const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', d.toISOString());
    } else if (filters.rangoTemporal === 'mes') {
      const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      query = query.gte('created_at', d.toISOString());
    }

    const { data: rows, error: qErr } = await query;
    if (qErr || !rows) return [];

    const monthMap = new Map<string, { mes: string; mes_nombre: string; verde: number; naranja: number; rojo: number; total: number }>();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    rows.forEach((r: any) => {
      const d = new Date(r.created_at);
      let mesKey: string;
      let mesNombre: string;

      if (filters.rangoTemporal === 'semana') {
        mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        mesNombre = `${dayNames[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (filters.rangoTemporal === 'mes') {
        mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        mesNombre = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mesNombre = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      }

      if (!monthMap.has(mesKey)) {
        monthMap.set(mesKey, { mes: mesKey, mes_nombre: mesNombre, verde: 0, naranja: 0, rojo: 0, total: 0 });
      }

      const item = monthMap.get(mesKey)!;
      const cat = Array.isArray(r.categorias_incidencia) ? r.categorias_incidencia[0] : r.categorias_incidencia;
      const color = cat?.color_semaforo;

      if (!filters.severidad || filters.severidad === color) {
        item.total++;
        if (color === 'verde') item.verde++;
        else if (color === 'naranja') item.naranja++;
        else if (color === 'rojo') item.rojo++;
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  } catch (err) {
    console.error('Error al generar tendencia de incidencias:', err);
    return [];
  }
}

/**
 * Obtener distribución de categorías más frecuentes mediante el RPC PostgreSQL 'fn_bi_get_categories'
 */
export async function getBICategories(filters: BIFilters): Promise<BICategoryItem[]> {
  try {
    const { data, error } = await supabase.rpc('fn_bi_get_categories', {
      p_periodo_id: filters.periodoId || null,
      p_generacion: filters.generacion || null,
      p_grupo_id: filters.grupoId || null,
      p_rango_temporal: filters.rangoTemporal || 'periodo',
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      let result = data as BICategoryItem[];
      if (filters.severidad) {
        result = result.filter(c => c.severidad === filters.severidad);
      }
      return result;
    }
  } catch (err) {
    console.warn('[BI] RPC fn_bi_get_categories no disponible, usando fallback relacional:', err);
  }

  try {
    let query = supabase
      .from('incidencias')
      .select('created_at, categorias_incidencia!inner(nombre, color_semaforo), alumnos!inner(id, generacion, grupo_id, nivel_semaforo)');

    if (filters.periodoId) query = query.eq('periodo_id', filters.periodoId);
    if (filters.generacion) query = query.eq('alumnos.generacion', filters.generacion);
    if (filters.grupoId) query = query.eq('alumnos.grupo_id', filters.grupoId);

    if (filters.rangoTemporal === 'semana') {
      const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      query = query.gte('created_at', d.toISOString());
    } else if (filters.rangoTemporal === 'mes') {
      const d = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      query = query.gte('created_at', d.toISOString());
    }

    const { data: rows, error: qErr } = await query;
    if (qErr || !rows) return [];

    const map = new Map<string, { categoria: string; severidad: string; total_incidencias: number }>();
    rows.forEach((r: any) => {
      const cat = Array.isArray(r.categorias_incidencia) ? r.categorias_incidencia[0] : r.categorias_incidencia;
      const name = cat?.nombre || 'General';
      const sev = cat?.color_semaforo || 'verde';

      if (!filters.severidad || filters.severidad === sev) {
        if (!map.has(name)) {
          map.set(name, { categoria: name, severidad: sev, total_incidencias: 0 });
        }
        map.get(name)!.total_incidencias++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total_incidencias - a.total_incidencias);
  } catch (err) {
    console.error('Error al generar categorías BI:', err);
    return [];
  }
}

/**
 * Obtener estudiantes en riesgo / atención prioritaria mediante el RPC PostgreSQL o motor compuesto
 */
export async function getBIRiskStudents(filters: BIFilters): Promise<BIRiskStudent[]> {
  try {
    const { data, error } = await supabase.rpc('fn_bi_get_risk_students', {
      p_periodo_id: filters.periodoId || null,
      p_generacion: filters.generacion || null,
      p_grupo_id: filters.grupoId || null,
      p_rango_temporal: filters.rangoTemporal || 'periodo',
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      let list = data as BIRiskStudent[];
      if (filters.severidad) {
        list = list.filter(s => s.nivel_semaforo === filters.severidad);
      }
      return list;
    }
  } catch (err) {
    console.warn('[BI] RPC fn_bi_get_risk_students no disponible, usando motor compuesto:', err);
  }

  // Fallback relacional con cálculo exacto de Composite Risk Score
  try {
    let query = supabase
      .from('alumnos')
      .select('id, matricula, nivel_semaforo, puntos_totales, generacion, usuarios!alumnos_usuario_id_fkey(nombre, apellido), grupos(nombre), incidencias(id, impacto_puntos, categorias_incidencia(color_semaforo))')
      .or('nivel_semaforo.in.(rojo,naranja),puntos_totales.lt.75');

    if (filters.generacion) query = query.eq('generacion', filters.generacion);
    if (filters.grupoId) query = query.eq('grupo_id', filters.grupoId);
    if (filters.severidad) query = query.eq('nivel_semaforo', filters.severidad);

    const { data: rows, error: qErr } = await query;
    if (qErr || !rows) return [];

    const list: BIRiskStudent[] = rows.map((a: any) => {
      const us = Array.isArray(a.usuarios) ? a.usuarios[0] : a.usuarios;
      const gr = Array.isArray(a.grupos) ? a.grupos[0] : a.grupos;
      const incs = a.incidencias || [];
      const totalInc = incs.length;
      const critInc = incs.filter((i: any) => {
        const c = Array.isArray(i.categorias_incidencia) ? i.categorias_incidencia[0] : i.categorias_incidencia;
        return c?.color_semaforo === 'rojo' || (i.impacto_puntos || 0) <= -15;
      }).length;

      const isc = a.puntos_totales ?? 100;
      const drop = Math.max(0, 100 - isc);

      const iscFct = (100 - Math.min(100, Math.max(0, isc))) * 0.40;
      const critFct = Math.min(100, critInc * 25) * 0.30;
      const dropFct = Math.min(100, drop * 2.5) * 0.20;
      const volFct = Math.min(100, totalInc * 10) * 0.10;
      const score = Math.min(100, Math.max(0, Math.round(iscFct + critFct + dropFct + volFct)));

      let cat = 'bajo';
      if (score >= 70 || isc < 70) cat = 'critico';
      else if (score >= 40 || isc < 90) cat = 'alto';
      else if (score >= 20) cat = 'moderado';

      return {
        alumno_id: a.id,
        nombre_completo: `${us?.nombre || ''} ${us?.apellido || ''}`.trim() || 'Estudiante',
        matricula: a.matricula,
        grupo_nombre: gr?.nombre || 'Grupo',
        nivel_semaforo: (a.nivel_semaforo || 'verde') as 'verde' | 'naranja' | 'rojo',
        puntos_totales: a.puntos_totales,
        total_incidencias: totalInc,
        risk_score: score,
        risk_categoria: cat,
      };
    });

    return list.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 15);
  } catch (err) {
    console.error('Error al generar lista de riesgo BI:', err);
    return [];
  }
}

/**
 * Obtener la evaluación de riesgo multivariable de un alumno específico
 */
export async function getBIRiskScoreAlumno(alumnoId: string): Promise<StudentRiskScoreResult | null> {
  try {
    const { data, error } = await supabase.rpc('fn_bi_get_risk_score_alumno', {
      p_alumno_id: alumnoId,
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data[0] as StudentRiskScoreResult;
    }
  } catch {
    // Continuar a fallback
  }

  try {
    const { data: al, error: alErr } = await supabase
      .from('alumnos')
      .select('id, puntos_totales, incidencias(id, impacto_puntos, categorias_incidencia(color_semaforo))')
      .eq('id', alumnoId)
      .single();

    if (alErr || !al) return null;

    const incs = al.incidencias || [];
    const totalInc = incs.length;
    const critInc = incs.filter((i: any) => {
      const c = Array.isArray(i.categorias_incidencia) ? i.categorias_incidencia[0] : i.categorias_incidencia;
      return c?.color_semaforo === 'rojo' || (i.impacto_puntos || 0) <= -15;
    }).length;

    const isc = al.puntos_totales ?? 100;
    const drop = Math.max(0, 100 - isc);

    const iscFct = (100 - Math.min(100, Math.max(0, isc))) * 0.40;
    const critFct = Math.min(100, critInc * 25) * 0.30;
    const dropFct = Math.min(100, drop * 2.5) * 0.20;
    const volFct = Math.min(100, totalInc * 10) * 0.10;
    const score = Math.min(100, Math.max(0, Math.round(iscFct + critFct + dropFct + volFct)));

    let cat = 'bajo';
    if (score >= 70 || isc < 70) cat = 'critico';
    else if (score >= 40 || isc < 90) cat = 'alto';
    else if (score >= 20) cat = 'moderado';

    return {
      alumno_id: alumnoId,
      score,
      categoria: cat,
      recent_drop: drop,
    };
  } catch (err) {
    console.error('Error al calcular risk score alumno:', err);
    return null;
  }
}

/**
 * Enviar alerta preventiva al tutor del alumno desde el Radar BI
 */
export async function sendPreventiveAlertToTutor(alumnoId: string, mensaje: string, directivoUserId: string): Promise<boolean> {
  const { data: tutorLinks, error: linkErr } = await supabase
    .from('padres_alumnos')
    .select('padre_id, padres(id, usuario_id)')
    .eq('alumno_id', alumnoId);

  if (linkErr || !tutorLinks || tutorLinks.length === 0) {
    throw new Error('El estudiante no tiene un padre o tutor vinculado para recibir notificaciones.');
  }

  const tutorRecords = tutorLinks
    .map((tl: any) => {
      const p = Array.isArray(tl.padres) ? tl.padres[0] : tl.padres;
      return p?.usuario_id;
    })
    .filter(Boolean);

  if (tutorRecords.length === 0) {
    throw new Error('No se encontró el identificador de usuario del tutor.');
  }

  const alerts = tutorRecords.map((tutorUserId: string) => ({
    usuario_id: tutorUserId,
    tipo: 'alerta_conductual',
    titulo: 'Alerta Preventiva Institucional - Seguimiento Conductual',
    mensaje,
    leido: false,
    creado_por: directivoUserId,
  }));

  const { error: notifErr } = await supabase.from('notificaciones').insert(alerts);

  if (notifErr) {
    throw new Error(`Error al registrar notificación institucional: ${notifErr.message}`);
  }

  return true;
}
