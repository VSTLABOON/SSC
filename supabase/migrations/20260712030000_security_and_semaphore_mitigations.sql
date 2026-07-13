-- ============================================================
-- Migracion: Correcciones de Seguridad y Semaforo Conductual
-- ============================================================

-- ── 1. Reclasificar Llegada Tarde / Retardo a naranja en categorias_incidencia
UPDATE public.categorias_incidencia 
SET color_semaforo = 'naranja' 
WHERE nombre = 'Llegada Tarde / Retardo';


-- ── 2. Crear indice unico case-insensitive para email de usuarios (Full Table Scan prevention)
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_lower 
ON public.usuarios (LOWER(email));


-- ── 3. Funcion de registro de intentos fallidos
CREATE OR REPLACE FUNCTION public.fn_registrar_intento_fallido(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_intentos integer;
    v_bloqueado_hasta timestamptz;
BEGIN
    SELECT intentos_fallidos, bloqueado_hasta
    INTO v_intentos, v_bloqueado_hasta
    FROM public.usuarios
    WHERE LOWER(email) = LOWER(p_email);

    -- si el bloqueo anterior ya expiro, reinicia el conteo antes de sumar
    IF v_bloqueado_hasta IS NOT NULL AND v_bloqueado_hasta <= NOW() THEN
        v_intentos := 0;
    END IF;

    UPDATE public.usuarios
    SET intentos_fallidos = COALESCE(v_intentos, 0) + 1,
        bloqueado_hasta = CASE
            WHEN COALESCE(v_intentos, 0) + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
            ELSE bloqueado_hasta
        END
    WHERE LOWER(email) = LOWER(p_email);
END;
$$;


-- ── 4. Funcion para resetear intentos fallidos
CREATE OR REPLACE FUNCTION public.fn_reset_intentos_fallidos(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE LOWER(email) = LOWER(p_email);
END;
$$;


-- ── 5. Redefinir la funcion fn_get_auth_rol para manejar bloqueos e inactividad
CREATE OR REPLACE FUNCTION public.fn_get_auth_rol()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol text;
    v_activo boolean;
    v_bloqueado_hasta timestamptz;
BEGIN
    SELECT rol, activo, bloqueado_hasta
    INTO v_rol, v_activo, v_bloqueado_hasta
    FROM public.usuarios
    WHERE id = auth.uid();

    IF v_rol IS NULL THEN
        RETURN NULL;
    END IF;

    IF v_activo = false THEN
        RETURN NULL; -- desactivado: RLS deniega sin revelar estado 'pendiente'
    END IF;

    IF v_bloqueado_hasta IS NOT NULL AND v_bloqueado_hasta > NOW() THEN
        RETURN NULL; -- bloqueo temporal: RLS deniega sin revelar estado 'pendiente'
    END IF;

    RETURN v_rol;
END;
$$;


-- ── 6. Ajustar permisos de ejecucion para roles anon y authenticated
REVOKE EXECUTE ON FUNCTION public.fn_get_auth_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_rol() TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_auth_plantel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_plantel() TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_registrar_intento_fallido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_registrar_intento_fallido(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_reset_intentos_fallidos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_reset_intentos_fallidos(text) TO anon, authenticated;


-- ── 7. Habilitacion de RLS en todas las tablas locales
ALTER TABLE IF EXISTS public.periodos_escolares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
