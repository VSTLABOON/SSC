-- ============================================================================
-- MIGRACIÓN: TABLA DE RATE LIMITING PARA GROQ-AGENT (PERSISTENTE)
-- Reemplaza el rate limiter en memoria (Map) que no funciona en Deno Deploy
-- distribuido donde cada instancia tiene su propio estado aislado.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.groq_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    request_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Solo el sistema (SECURITY DEFINER) accede a esta tabla
ALTER TABLE public.groq_rate_limits ENABLE ROW LEVEL SECURITY;

-- Función atómica para verificar y registrar rate limit
CREATE OR REPLACE FUNCTION public.fn_check_groq_rate_limit(
    p_user_id UUID,
    p_max_requests INT DEFAULT 10,
    p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_window_start TIMESTAMPTZ;
    v_count INT;
BEGIN
    -- Intentar obtener registro existente
    SELECT request_count, window_start INTO v_count, v_window_start
    FROM public.groq_rate_limits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Primera solicitud del usuario
        INSERT INTO public.groq_rate_limits (user_id, request_count, window_start)
        VALUES (p_user_id, 1, v_now);
        RETURN FALSE; -- No limitado
    END IF;

    -- Verificar si la ventana expiró
    IF v_now > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
        -- Reiniciar ventana
        UPDATE public.groq_rate_limits
        SET request_count = 1, window_start = v_now
        WHERE user_id = p_user_id;
        RETURN FALSE; -- No limitado
    END IF;

    -- Dentro de la ventana: verificar límite
    IF v_count >= p_max_requests THEN
        RETURN TRUE; -- LIMITADO
    END IF;

    -- Incrementar contador
    UPDATE public.groq_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id;

    RETURN FALSE; -- No limitado
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_check_groq_rate_limit(UUID, INT, INT) TO authenticated;

-- Limpieza periódica de ventanas expiradas (opcional, ejecutar con pg_cron)
-- SELECT cron.schedule('cleanup-groq-rate-limits', '*/10 * * * *',
--   $$DELETE FROM public.groq_rate_limits WHERE window_start < now() - interval '2 minutes'$$
-- );
