-- ============================================================================
-- MIGRACIÓN MÓDULO BI Y LEARNING ANALYTICS (SSC) - VENTANAS TEMPORALES & RLS ESTRICTO
-- Archivo oficial de migración para Supabase (supabase/migrations)
-- ============================================================================

-- 1. Permitir notificaciones preventivas/alertas directas sin incidencia asociada
ALTER TABLE public.notificaciones ALTER COLUMN incidencia_id DROP NOT NULL;

-- 2. RPC: fn_bi_get_kpis (Con soporte para p_rango_temporal y validación estricta de v_plantel_id)
CREATE OR REPLACE FUNCTION public.fn_bi_get_kpis(
    p_periodo_id uuid DEFAULT NULL,
    p_generacion text DEFAULT NULL,
    p_grupo_id uuid DEFAULT NULL,
    p_severidad text DEFAULT NULL,
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
    v_fecha_inicio timestamp;
    v_result json;
BEGIN
    IF v_rol = 'docente' THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    -- Definir fecha inicio según ventana temporal
    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := date_trunc('week', current_date);
    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', current_date);
    ELSE
        v_fecha_inicio := NULL;
    END IF;

    SELECT json_build_object(
        'total_alumnos', COUNT(a.id),
        'promedio_puntos', ROUND(AVG(a.puntos_totales), 1),
        'conteo_verde', COUNT(*) FILTER (WHERE a.nivel_semaforo = 'verde'),
        'conteo_naranja', COUNT(*) FILTER (WHERE a.nivel_semaforo = 'naranja'),
        'conteo_rojo', COUNT(*) FILTER (WHERE a.nivel_semaforo = 'rojo'),
        'total_incidencias', (
            SELECT COUNT(*)
            FROM public.incidencias i
            JOIN public.alumnos al ON al.id = i.alumno_id
            JOIN public.grupos g ON g.id = al.grupo_id
            WHERE g.plantel_id = v_plantel_id
              AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
              AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
              AND (p_generacion IS NULL OR al.generacion = p_generacion)
              AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
              AND (p_severidad IS NULL OR al.nivel_semaforo = p_severidad)
              AND (v_fecha_inicio IS NULL OR i.created_at >= v_fecha_inicio)
        )
    ) INTO v_result
    FROM public.alumnos a
    JOIN public.grupos g ON g.id = a.grupo_id
    WHERE g.plantel_id = v_plantel_id
      AND (v_rol <> 'docente' OR a.grupo_id = ANY(v_teacher_group_ids))
      AND (p_grupo_id IS NULL OR a.grupo_id = p_grupo_id)
      AND (p_generacion IS NULL OR a.generacion = p_generacion);

    RETURN v_result;
END;
$$;

-- 3. RPC: fn_bi_get_trend
CREATE OR REPLACE FUNCTION public.fn_bi_get_trend(
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
    v_fecha_inicio timestamp;
    v_result json;
BEGIN
    IF v_rol = 'docente' THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := date_trunc('week', current_date);
    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', current_date);
    ELSE
        v_fecha_inicio := NULL;
    END IF;

    SELECT json_agg(t) INTO v_result
    FROM (
        SELECT 
            to_char(i.created_at, 'YYYY-MM-DD') AS mes,
            to_char(i.created_at, 'Dy DD/MM') AS mes_nombre,
            COUNT(*) FILTER (WHERE ci.color_semaforo = 'verde') AS verde,
            COUNT(*) FILTER (WHERE ci.color_semaforo = 'naranja') AS naranja,
            COUNT(*) FILTER (WHERE ci.color_semaforo = 'rojo') AS rojo,
            COUNT(*) AS total
        FROM public.incidencias i
        JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
        JOIN public.alumnos a ON a.id = i.alumno_id
        JOIN public.grupos g ON g.id = a.grupo_id
        WHERE g.plantel_id = v_plantel_id
          AND (v_rol <> 'docente' OR a.grupo_id = ANY(v_teacher_group_ids))
          AND (p_grupo_id IS NULL OR a.grupo_id = p_grupo_id)
          AND (p_generacion IS NULL OR a.generacion = p_generacion)
          AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
          AND (v_fecha_inicio IS NULL OR i.created_at >= v_fecha_inicio)
        GROUP BY to_char(i.created_at, 'YYYY-MM-DD'), to_char(i.created_at, 'Dy DD/MM')
        ORDER BY mes ASC
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 4. RPC: fn_bi_get_categories
CREATE OR REPLACE FUNCTION public.fn_bi_get_categories(
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
    v_fecha_inicio timestamp;
    v_result json;
BEGIN
    IF v_rol = 'docente' THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := date_trunc('week', current_date);
    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', current_date);
    ELSE
        v_fecha_inicio := NULL;
    END IF;

    SELECT json_agg(t) INTO v_result
    FROM (
        SELECT 
            ci.nombre AS categoria,
            ci.color_semaforo AS severidad,
            COUNT(i.id) AS total_incidencias
        FROM public.incidencias i
        JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
        JOIN public.alumnos a ON a.id = i.alumno_id
        JOIN public.grupos g ON g.id = a.grupo_id
        WHERE g.plantel_id = v_plantel_id
          AND (v_rol <> 'docente' OR a.grupo_id = ANY(v_teacher_group_ids))
          AND (p_grupo_id IS NULL OR a.grupo_id = p_grupo_id)
          AND (p_generacion IS NULL OR a.generacion = p_generacion)
          AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
          AND (v_fecha_inicio IS NULL OR i.created_at >= v_fecha_inicio)
        GROUP BY ci.id, ci.nombre, ci.color_semaforo
        ORDER BY total_incidencias DESC
        LIMIT 6
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- 5. RPC: fn_bi_get_risk_students
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
            ) AS total_incidencias
        FROM public.alumnos a
        JOIN public.usuarios u ON u.id = a.usuario_id
        JOIN public.grupos g ON g.id = a.grupo_id
        WHERE g.plantel_id = v_plantel_id
          AND (v_rol <> 'docente' OR a.grupo_id = ANY(v_teacher_group_ids))
          AND (p_grupo_id IS NULL OR a.grupo_id = p_grupo_id)
          AND (p_generacion IS NULL OR a.generacion = p_generacion)
          AND (a.nivel_semaforo IN ('rojo', 'naranja') OR a.puntos_totales < 75)
        ORDER BY a.puntos_totales ASC, a.matricula ASC
        LIMIT 10
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;
