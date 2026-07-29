-- ============================================================================
-- MIGRACIÓN MÓDULO BI: MOTOR DE CÁLCULO DE RIESGO Y EWMA EN SQL (SSC)
-- Traslada la lógica de EWMA y Composite Risk Score desde TypeScript a SQL.
-- ============================================================================

-- 1. Función inmutable para calcular el promedio móvil ponderado exponencialmente (EWMA)
CREATE OR REPLACE FUNCTION public.fn_calcular_ewma(
    p_valores numeric[],
    p_alpha numeric DEFAULT 0.3
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_resultado numeric;
    v_valor numeric;
    v_len integer;
BEGIN
    v_len := array_length(p_valores, 1);
    IF p_valores IS NULL OR v_len IS NULL OR v_len = 0 THEN
        RETURN 100; -- Salud conductual por defecto si no existen registros
    END IF;

    v_resultado := p_valores[1];
    FOR i IN 2..v_len LOOP
        v_valor := p_valores[i];
        v_resultado := p_alpha * v_valor + (1 - p_alpha) * v_resultado;
    END LOOP;

    RETURN ROUND(v_resultado, 1);
END;
$$;

-- 2. Función inmutable para el cálculo del Composite Risk Score (Riesgo de Deserción)
-- Replica exactamente 1:1 las fórmulas y ponderadores de bi_analytics_engine.ts
CREATE OR REPLACE FUNCTION public.fn_calcular_risk_score(
    p_isc_actual numeric,
    p_incidencias_count integer,
    p_incidencias_criticas integer,
    p_recent_drop numeric
)
RETURNS TABLE (
    score numeric,
    categoria text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_isc numeric;
    v_inc_count integer;
    v_crit_count integer;
    v_drop numeric;
    v_isc_factor numeric;
    v_critical_factor numeric;
    v_drop_factor numeric;
    v_volume_factor numeric;
    v_raw_score numeric;
    v_score numeric;
    v_categoria text;
BEGIN
    v_isc := COALESCE(p_isc_actual, 100);
    v_inc_count := GREATEST(0, COALESCE(p_incidencias_count, 0));
    v_crit_count := GREATEST(0, COALESCE(p_incidencias_criticas, 0));
    v_drop := GREATEST(0, COALESCE(p_recent_drop, 0));

    -- Ponderadores documentados (Misma matemática exacta que el cliente TS):
    -- 1. Factor ISC: (100 - clamped(currentISC)) * 0.4
    v_isc_factor := (100 - LEAST(100, GREATEST(0, v_isc))) * 0.40;

    -- 2. Factor Crítico: min(100, criticalIncidentsCount * 25) * 0.3
    v_critical_factor := LEAST(100, v_crit_count * 25) * 0.30;

    -- 3. Factor Caída / EWMA Delta: min(100, max(0, recentDrop) * 2.5) * 0.2
    v_drop_factor := LEAST(100, v_drop * 2.5) * 0.20;

    -- 4. Factor Volumen: min(100, incidentsCount * 10) * 0.1
    v_volume_factor := LEAST(100, v_inc_count * 10) * 0.10;

    v_raw_score := ROUND(v_isc_factor + v_critical_factor + v_drop_factor + v_volume_factor);
    v_score := LEAST(100, GREATEST(0, v_raw_score));

    -- Clasificación semafórica idéntica:
    IF v_score >= 70 OR v_isc < 70 THEN
        v_categoria := 'critico';
    ELSIF v_score >= 40 OR v_isc < 90 THEN
        v_categoria := 'alto';
    ELSIF v_score >= 20 THEN
        v_categoria := 'moderado';
    ELSE
        v_categoria := 'bajo';
    END IF;

    RETURN QUERY SELECT v_score, v_categoria;
END;
$$;

-- 3. RPC Oficial para consultar el score de riesgo multivariable de un alumno
CREATE OR REPLACE FUNCTION public.fn_bi_get_risk_score_alumno(
    p_alumno_id uuid
)
RETURNS TABLE (
    alumno_id uuid,
    score numeric,
    categoria text,
    recent_drop numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_rol text := public.fn_get_auth_rol();
    v_plantel_id uuid := public.fn_get_auth_plantel();
    v_student_plantel_id uuid;
    v_isc numeric;
    v_incidents_count integer;
    v_critical_count integer;
    v_puntos_array numeric[];
    v_ewma numeric;
    v_recent_drop numeric;
BEGIN
    IF v_rol NOT IN ('directivo', 'orientador', 'docente', 'superadmin') THEN
        RAISE EXCEPTION 'No autorizado para consultar indicadores de riesgo conductual.';
    END IF;

    -- Obtener datos base del alumno
    SELECT g.plantel_id, a.puntos_totales
    INTO v_student_plantel_id, v_isc
    FROM public.alumnos a
    JOIN public.grupos g ON g.id = a.grupo_id
    WHERE a.id = p_alumno_id;

    IF v_student_plantel_id IS NULL THEN
        RAISE EXCEPTION 'Alumno no encontrado.';
    END IF;

    IF v_rol <> 'superadmin' AND v_student_plantel_id <> v_plantel_id THEN
        RAISE EXCEPTION 'Alumno fuera del alcance del plantel del usuario.';
    END IF;

    -- Conteo de incidencias totales
    SELECT COUNT(*) INTO v_incidents_count
    FROM public.incidencias
    WHERE alumno_id = p_alumno_id;

    -- Conteo de incidencias críticas (color semáforo rojo)
    SELECT COUNT(*) INTO v_critical_count
    FROM public.incidencias i
    JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
    WHERE i.alumno_id = p_alumno_id
      AND ci.color_semaforo = 'rojo';

    -- Historial cronológico de puntos para cálculo de EWMA
    SELECT array_agg(sub.puntos ORDER BY sub.created_at ASC)
    INTO v_puntos_array
    FROM (
        SELECT 
            i.created_at,
            100 + SUM(i.impacto_puntos) OVER (ORDER BY i.created_at ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS puntos
        FROM public.incidencias i
        WHERE i.alumno_id = p_alumno_id
    ) sub;

    -- Si no hay incidencias, el historial es [100]
    IF v_puntos_array IS NULL OR array_length(v_puntos_array, 1) = 0 THEN
        v_puntos_array := ARRAY[100]::numeric[];
    ELSE
        -- Prepend del puntaje inicial de 100 pts
        v_puntos_array := ARRAY[100]::numeric[] || v_puntos_array;
    END IF;

    v_ewma := public.fn_calcular_ewma(v_puntos_array, 0.3);
    v_recent_drop := GREATEST(0, 100 - COALESCE(v_ewma, v_isc, 100));

    RETURN QUERY
    SELECT 
        p_alumno_id,
        r.score,
        r.categoria,
        v_recent_drop
    FROM public.fn_calcular_risk_score(v_isc, v_incidents_count, v_critical_count, v_recent_drop) r;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_calcular_ewma(numeric[], numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_calcular_risk_score(numeric, integer, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bi_get_risk_score_alumno(uuid) TO authenticated;

-- 4. Actualización del RPC fn_bi_get_risk_students para incluir score y categoría calculados por SQL
CREATE OR REPLACE FUNCTION public.fn_bi_get_risk_students(
    p_periodo_id uuid DEFAULT NULL,
    p_generacion text DEFAULT NULL,
    p_grupo_id uuid DEFAULT NULL,
    p_rango_temporal text DEFAULT 'periodo'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_rol text := public.fn_get_auth_rol();
    v_plantel_id uuid := public.fn_get_auth_plantel();
    v_teacher_group_ids uuid[];
    v_result json;
BEGIN
    IF v_rol = 'docente' THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    SELECT json_agg(t) INTO v_result
    FROM (
        SELECT 
            a.id AS alumno_id,
            u.nombre || ' ' || u.apellido AS nombre_completo,
            a.matricula,
            g.nombre AS grupo_nombre,
            a.nivel_semaforo,
            a.puntos_totales,
            (
                SELECT COUNT(*)
                FROM public.incidencias inc
                WHERE inc.alumno_id = a.id
                  AND (p_periodo_id IS NULL OR inc.periodo_id = p_periodo_id)
            ) AS total_incidencias,
            rs.score AS risk_score,
            rs.categoria AS risk_categoria
        FROM public.alumnos a
        JOIN public.usuarios u ON u.id = a.usuario_id
        JOIN public.grupos g ON g.id = a.grupo_id
        CROSS JOIN LATERAL public.fn_bi_get_risk_score_alumno(a.id) rs
        WHERE g.plantel_id = v_plantel_id
          AND (v_rol <> 'docente' OR a.grupo_id = ANY(v_teacher_group_ids))
          AND (p_grupo_id IS NULL OR a.grupo_id = p_grupo_id)
          AND (p_generacion IS NULL OR a.generacion = p_generacion)
          AND (a.nivel_semaforo IN ('rojo', 'naranja') OR a.puntos_totales < 75 OR rs.score >= 40)
        ORDER BY rs.score DESC, a.puntos_totales ASC, a.matricula ASC
        LIMIT 10
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;
