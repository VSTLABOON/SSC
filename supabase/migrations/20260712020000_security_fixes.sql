-- ============================================================
-- Migración: Correcciones de Seguridad OWASP & RLS
-- ============================================================

-- ── 1. Políticas RLS para refresh_tokens ────────────────────────────────────
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_refresh_tokens_propio ON public.refresh_tokens;
CREATE POLICY rls_refresh_tokens_propio ON public.refresh_tokens
FOR ALL TO authenticated
USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());


-- ── 2. Políticas RLS para audit_log ──────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_audit_log_sel ON public.audit_log;
CREATE POLICY rls_audit_log_sel ON public.audit_log
FOR SELECT TO authenticated
USING (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() = 'directivo'
);

-- Nadie puede escribir manualmente en audit_log desde la API cliente
DROP POLICY IF EXISTS rls_audit_log_no_write ON public.audit_log;
CREATE POLICY rls_audit_log_no_write ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (false);


-- ── 3. Políticas RLS para alumnos ────────────────────────────────────────────
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sel_alumnos_policy ON public.alumnos;
CREATE POLICY sel_alumnos_policy ON public.alumnos
FOR SELECT TO authenticated
USING (
  -- El alumno ve su propio registro
  usuario_id = auth.uid()
  OR
  -- El padre ve los alumnos vinculados a él en padres_alumnos
  id IN (SELECT alumno_id FROM public.padres_alumnos WHERE padre_id = auth.uid())
  OR
  -- El docente ve alumnos de los grupos donde imparte materias
  grupo_id IN (
    SELECT m.grupo_id FROM public.materias m WHERE m.docente_id = auth.uid()
  )
  OR
  -- Directivos y orientadores ven alumnos del mismo plantel
  grupo_id IN (
    SELECT g.id FROM public.grupos g WHERE g.plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'orientador')
  )
);


-- ── 4. Políticas RLS para incidencias ────────────────────────────────────────
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sel_incidencias_policy ON public.incidencias;
CREATE POLICY sel_incidencias_policy ON public.incidencias
FOR SELECT TO authenticated
USING (
  -- El docente ve las incidencias que él mismo registró
  registrado_por = auth.uid()
  OR
  -- El alumno ve sus propias incidencias
  alumno_id IN (SELECT id FROM public.alumnos WHERE usuario_id = auth.uid())
  OR
  -- El padre ve las incidencias de sus hijos vinculados
  alumno_id IN (
    SELECT alumno_id FROM public.padres_alumnos WHERE padre_id = auth.uid()
  )
  OR
  -- Directivo y orientador ven incidencias de alumnos de su propio plantel
  alumno_id IN (
    SELECT a.id FROM public.alumnos a
    JOIN public.grupos g ON g.id = a.grupo_id
    WHERE g.plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'orientador')
  )
);


-- ── 5. Column-Level Security para password_hash en usuarios ──────────────────
-- Revocar lectura pública del hash de contraseña para evitar filtraciones
REVOKE SELECT (password_hash) ON public.usuarios FROM authenticated, anon;


-- ── 6. Robustecer el trigger handle_new_user() contra formatos UUID inválidos ─
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plantel_id UUID;
  v_plantel_str TEXT;
BEGIN
  v_plantel_str := NEW.raw_user_meta_data->>'plantel_id';
  
  -- MEDIO-5: Verificar con RegExp que cumpla el formato de un UUID de 36 caracteres antes de castearlo
  IF v_plantel_str IS NOT NULL AND v_plantel_str ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    v_plantel_id := v_plantel_str::UUID;
  ELSE
    v_plantel_id := NULL;
  END IF;

  INSERT INTO public.usuarios (
    id, plantel_id, nombre, apellido, email, rol,
    password_hash, activo, intentos_fallidos
  )
  VALUES (
    NEW.id,
    v_plantel_id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    'pendiente',
    '',
    false,
    0
  );
  RETURN NEW;
END;
$$;
