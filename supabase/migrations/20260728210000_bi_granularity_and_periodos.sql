-- ============================================================================
-- MIGRACIÓN SUPABASE: PERIODOS ESCOLARES, GRANULARIDAD TEMPORAL Y RPCs BI (FIXED 42P13)
-- Archivo oficial de migración: 20260728210000_bi_granularity_and_periodos.sql
-- ============================================================================

-- 1. Tabla public.periodos_escolares
CREATE TABLE IF NOT EXISTS public.periodos_escolares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID REFERENCES public.planteles(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS en periodos_escolares
ALTER TABLE public.periodos_escolares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de periodos por usuarios autenticados" ON public.periodos_escolares;
CREATE POLICY "Lectura de periodos por usuarios autenticados"
ON public.periodos_escolares FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Administracion de periodos por directivos" ON public.periodos_escolares;
CREATE POLICY "Administracion de periodos por directivos"
ON public.periodos_escolares FOR ALL
TO authenticated
USING (public.fn_get_auth_rol() = 'directivo');

-- Insertar Periodo por Defecto si la tabla está vacía
INSERT INTO public.periodos_escolares (plantel_id, nombre, fecha_inicio, fecha_fin, activo)
SELECT p.id, 'Semestre Febrero 2026 - Julio 2026', '2026-02-01', '2026-07-31', true
FROM public.planteles p
WHERE NOT EXISTS (SELECT 1 FROM public.periodos_escolares);

-- 2. RPC: fn_get_periodo_activo
DROP FUNCTION IF EXISTS public.fn_get_periodo_activo(UUID);
CREATE OR REPLACE FUNCTION public.fn_get_periodo_activo(p_plantel_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_periodo_id UUID;
BEGIN
    SELECT id INTO v_periodo_id
    FROM public.periodos_escolares
    WHERE (p_plantel_id IS NULL OR plantel_id = p_plantel_id)
      AND activo = true
    ORDER BY fecha_inicio DESC
    LIMIT 1;

    RETURN v_periodo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_periodo_activo(UUID) TO authenticated;

-- 3. RPC: fn_get_periodos_plantel
DROP FUNCTION IF EXISTS public.fn_get_periodos_plantel(UUID);
CREATE OR REPLACE FUNCTION public.fn_get_periodos_plantel(p_plantel_id UUID)
RETURNS TABLE (
    id UUID,
    nombre TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT pe.id, pe.nombre, pe.fecha_inicio, pe.fecha_fin, pe.activo
    FROM public.periodos_escolares pe
    WHERE (p_plantel_id IS NULL OR pe.plantel_id = p_plantel_id)
    ORDER BY pe.fecha_inicio DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_periodos_plantel(UUID) TO authenticated;

-- 4. DROP OBLIGATORIO DE fn_bi_get_trend PARA EVITAR ERROR 42P13 (cannot change return type)
DROP FUNCTION IF EXISTS public.fn_bi_get_trend(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.fn_bi_get_trend CASCADE;

-- 5. RPC fn_bi_get_trend (RETORNA JSON CON SOPORTE PARA CUALQUIER GRANULARIDAD TEMPORAL)
CREATE OR REPLACE FUNCTION public.fn_bi_get_trend(
    p_periodo_id UUID DEFAULT NULL,
    p_generacion TEXT DEFAULT NULL,
    p_grupo_id UUID DEFAULT NULL,
    p_rango_temporal TEXT DEFAULT 'periodo'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_rol TEXT := public.fn_get_auth_rol();
    v_plantel_id UUID := public.fn_get_auth_plantel();
    v_teacher_group_ids UUID[];
    v_result JSON;
BEGIN
    IF v_rol = 'docente' THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    SELECT json_agg(t) INTO v_result
    FROM (
        WITH filtered_incidents AS (
            SELECT
                i.id,
                i.created_at AS fecha,
                ci.color AS severidad
            FROM public.incidencias i
            JOIN public.alumnos al ON al.id = i.alumno_id
            JOIN public.grupos g ON g.id = al.grupo_id
            JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
            WHERE g.plantel_id = v_plantel_id
              AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
              AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
              AND (p_generacion IS NULL OR al.generacion = p_generacion)
              AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
        )
        SELECT
            to_char(date_trunc('month', fi.fecha), 'YYYY-MM') AS mes,
            to_char(date_trunc('month', fi.fecha), 'TCMonth YYYY') AS mes_nombre,
            COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
            COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
            COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
            COUNT(*)::INT AS total
        FROM filtered_incidents fi
        GROUP BY date_trunc('month', fi.fecha)
        ORDER BY date_trunc('month', fi.fecha) ASC
    ) t;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_bi_get_trend(UUID, TEXT, UUID, TEXT) TO authenticated;
