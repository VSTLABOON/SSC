-- ============================================================================
-- MIGRACIÓN: VENTANAS TEMPORALES DINÁMICAS (BI) Y ESQUEMA UNIFICADO DE AVISOS
-- Archivo: 20260820020000_temporal_windows_and_avisos_schema.sql
-- ============================================================================

-- ── 1. Unificar Esquema de la Tabla 'avisos' ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.avisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID REFERENCES public.planteles(id) ON DELETE CASCADE,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    contenido TEXT,
    descripcion TEXT,
    destinatarios TEXT DEFAULT 'todos',
    dirigido_a TEXT DEFAULT 'todos',
    fecha_publicacion TIMESTAMPTZ DEFAULT now(),
    fecha_evento TIMESTAMPTZ DEFAULT now(),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columnas si la tabla ya existía con nombres alternativos
ALTER TABLE public.avisos
    ADD COLUMN IF NOT EXISTS contenido TEXT,
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS destinatarios TEXT DEFAULT 'todos',
    ADD COLUMN IF NOT EXISTS dirigido_a TEXT DEFAULT 'todos',
    ADD COLUMN IF NOT EXISTS fecha_publicacion TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS fecha_evento TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- Actualizar constraint de dirigido_a
ALTER TABLE public.avisos DROP CONSTRAINT IF EXISTS chk_avisos_dirigido;
ALTER TABLE public.avisos ADD CONSTRAINT chk_avisos_dirigido CHECK (dirigido_a = ANY (ARRAY['todos'::text, 'alumnos'::text, 'docentes'::text, 'padres'::text, 'semaforo_verde'::text, 'semaforo_naranja'::text, 'semaforo_rojo'::text]));

-- Sincronizar compatibilidad bidireccional de contenido y destinatarios
UPDATE public.avisos
SET contenido = COALESCE(contenido, descripcion, ''),
    descripcion = COALESCE(descripcion, contenido, ''),
    destinatarios = COALESCE(destinatarios, dirigido_a, 'todos'),
    dirigido_a = COALESCE(dirigido_a, destinatarios, 'todos'),
    fecha_publicacion = COALESCE(fecha_publicacion, fecha_evento, now()),
    fecha_evento = COALESCE(fecha_evento, fecha_publicacion, now());

-- Habilitar RLS en avisos
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sel_avisos_todos ON public.avisos;
CREATE POLICY sel_avisos_todos ON public.avisos
FOR SELECT TO authenticated
USING (
    plantel_id = public.fn_get_auth_plantel()
    AND activo = true
);

DROP POLICY IF EXISTS ins_avisos_directivo ON public.avisos;
CREATE POLICY ins_avisos_directivo ON public.avisos
FOR INSERT TO authenticated
WITH CHECK (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
);

DROP POLICY IF EXISTS del_avisos_directivo ON public.avisos;
CREATE POLICY del_avisos_directivo ON public.avisos
FOR DELETE TO authenticated
USING (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
);

-- ── 2. Actualizar RPC fn_bi_get_kpis con Ventanas Temporales Estrictas ──────
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
    v_rol text := COALESCE(public.fn_get_auth_rol(), 'directivo');
    v_plantel_id uuid := COALESCE(public.fn_get_auth_plantel(), (SELECT id FROM public.planteles LIMIT 1));
    v_teacher_group_ids uuid[];
    v_fecha_inicio timestamptz;
    v_result json;
BEGIN
    IF v_rol = 'docente' AND v_user_id IS NOT NULL THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    -- Calcular rango temporal dinámico
    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := CURRENT_DATE - INTERVAL '6 days';
    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', CURRENT_DATE);
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

-- ── 3. Actualizar RPC fn_bi_get_trend con Desglose según Ventana Temporal ─────
DROP FUNCTION IF EXISTS public.fn_bi_get_trend(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.fn_bi_get_trend CASCADE;

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
    v_rol TEXT := COALESCE(public.fn_get_auth_rol(), 'directivo');
    v_plantel_id UUID := COALESCE(public.fn_get_auth_plantel(), (SELECT id FROM public.planteles LIMIT 1));
    v_teacher_group_ids UUID[];
    v_fecha_inicio TIMESTAMPTZ;
    v_result JSON;
BEGIN
    IF v_rol = 'docente' AND v_user_id IS NOT NULL THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := CURRENT_DATE - INTERVAL '6 days';
        
        SELECT json_agg(t) INTO v_result
        FROM (
            WITH filtered_incidents AS (
                SELECT
                    i.id,
                    i.created_at AS fecha,
                    ci.color_semaforo AS severidad
                FROM public.incidencias i
                JOIN public.alumnos al ON al.id = i.alumno_id
                JOIN public.grupos g ON g.id = al.grupo_id
                JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
                WHERE g.plantel_id = v_plantel_id
                  AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
                  AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
                  AND (p_generacion IS NULL OR al.generacion = p_generacion)
                  AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
                  AND (i.created_at >= v_fecha_inicio)
            )
            SELECT
                to_char(date_trunc('day', fi.fecha), 'YYYY-MM-DD') AS mes,
                to_char(date_trunc('day', fi.fecha), 'FMDy DD/MM') AS mes_nombre,
                COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
                COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
                COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
                COUNT(*)::INT AS total
            FROM filtered_incidents fi
            GROUP BY date_trunc('day', fi.fecha)
            ORDER BY date_trunc('day', fi.fecha) ASC
        ) t;

    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', CURRENT_DATE);

        SELECT json_agg(t) INTO v_result
        FROM (
            WITH filtered_incidents AS (
                SELECT
                    i.id,
                    i.created_at AS fecha,
                    ci.color_semaforo AS severidad
                FROM public.incidencias i
                JOIN public.alumnos al ON al.id = i.alumno_id
                JOIN public.grupos g ON g.id = al.grupo_id
                JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
                WHERE g.plantel_id = v_plantel_id
                  AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
                  AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
                  AND (p_generacion IS NULL OR al.generacion = p_generacion)
                  AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
                  AND (i.created_at >= v_fecha_inicio)
            )
            SELECT
                to_char(date_trunc('day', fi.fecha), 'YYYY-MM-DD') AS mes,
                to_char(date_trunc('day', fi.fecha), 'FMDD/MM') AS mes_nombre,
                COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
                COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
                COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
                COUNT(*)::INT AS total
            FROM filtered_incidents fi
            GROUP BY date_trunc('day', fi.fecha)
            ORDER BY date_trunc('day', fi.fecha) ASC
        ) t;

    ELSE
        SELECT json_agg(t) INTO v_result
        FROM (
            WITH filtered_incidents AS (
                SELECT
                    i.id,
                    i.created_at AS fecha,
                    ci.color_semaforo AS severidad
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
                to_char(date_trunc('month', fi.fecha), 'FMMonth YYYY') AS mes_nombre,
                COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
                COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
                COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
                COUNT(*)::INT AS total
            FROM filtered_incidents fi
            GROUP BY date_trunc('month', fi.fecha)
            ORDER BY date_trunc('month', fi.fecha) ASC
        ) t;
    END IF;

    RETURN COALESCE(v_result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_bi_get_trend(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_bi_get_kpis(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;
