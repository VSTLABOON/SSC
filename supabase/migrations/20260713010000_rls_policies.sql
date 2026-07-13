-- ============================================================
-- Migración: Row Level Security (RLS) y Políticas de Seguridad Consolidadas
-- ============================================================

-- ── 1. Crear Tabla de Bypass para Evitar Recursión en RLS ───────────────────

-- Esta tabla almacena una copia mínima de los datos de usuarios necesarios para las políticas.
-- Al no tener RLS habilitado, los helpers pueden consultarla sin disparar políticas de seguridad recursivas.
DROP TABLE IF EXISTS public.usuarios_rls_bypass CASCADE;
CREATE TABLE public.usuarios_rls_bypass (
    id UUID PRIMARY KEY,
    plantel_id UUID,
    rol TEXT,
    email TEXT,
    activo BOOLEAN,
    bloqueado_hasta TIMESTAMPTZ,
    intentos_fallidos INTEGER
);

-- Revocar todos los privilegios sobre esta tabla para asegurar que los clientes no puedan consultarla directamente
REVOKE ALL ON public.usuarios_rls_bypass FROM PUBLIC, anon, authenticated;

-- ── 2. Crear Trigger de Sincronización Automática ───────────────────────────

CREATE OR REPLACE FUNCTION public.sync_usuarios_rls_bypass()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.usuarios_rls_bypass (id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos)
        VALUES (NEW.id, NEW.plantel_id, NEW.rol, NEW.email, NEW.activo, NEW.bloqueado_hasta, NEW.intentos_fallidos)
        ON CONFLICT (id) DO UPDATE
        SET plantel_id = EXCLUDED.plantel_id,
            rol = EXCLUDED.rol,
            email = EXCLUDED.email,
            activo = EXCLUDED.activo,
            bloqueado_hasta = EXCLUDED.bloqueado_hasta,
            intentos_fallidos = EXCLUDED.intentos_fallidos;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.usuarios_rls_bypass (id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos)
        VALUES (NEW.id, NEW.plantel_id, NEW.rol, NEW.email, NEW.activo, NEW.bloqueado_hasta, NEW.intentos_fallidos)
        ON CONFLICT (id) DO UPDATE
        SET plantel_id = EXCLUDED.plantel_id,
            rol = EXCLUDED.rol,
            email = EXCLUDED.email,
            activo = EXCLUDED.activo,
            bloqueado_hasta = EXCLUDED.bloqueado_hasta,
            intentos_fallidos = EXCLUDED.intentos_fallidos;
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.usuarios_rls_bypass WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_usuarios_rls_bypass ON public.usuarios;
CREATE TRIGGER tr_sync_usuarios_rls_bypass
AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.sync_usuarios_rls_bypass();

-- Semillar/Sincronizar usuarios existentes
INSERT INTO public.usuarios_rls_bypass (id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos)
SELECT id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos FROM public.usuarios
ON CONFLICT (id) DO UPDATE
SET plantel_id = EXCLUDED.plantel_id,
    rol = EXCLUDED.rol,
    email = EXCLUDED.email,
    activo = EXCLUDED.activo,
    bloqueado_hasta = EXCLUDED.bloqueado_hasta,
    intentos_fallidos = EXCLUDED.intentos_fallidos;


-- ── 3. Redefinir Helpers de Seguridad utilizando la Tabla de Bypass ─────────

CREATE OR REPLACE FUNCTION public.fn_check_auth_user_valid()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_valid boolean;
BEGIN
    SELECT COALESCE(activo = true AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= NOW()), false)
    INTO v_valid
    FROM public.usuarios_rls_bypass
    WHERE id = auth.uid();
    RETURN COALESCE(v_valid, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_auth_rol()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol text;
BEGIN
    IF NOT public.fn_check_auth_user_valid() THEN
        RETURN NULL;
    END IF;
    
    SELECT rol INTO v_rol
    FROM public.usuarios_rls_bypass
    WHERE id = auth.uid();
    
    RETURN v_rol;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_auth_plantel()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_plantel_id uuid;
BEGIN
    IF NOT public.fn_check_auth_user_valid() THEN
        RETURN NULL;
    END IF;
    
    SELECT plantel_id INTO v_plantel_id
    FROM public.usuarios_rls_bypass
    WHERE id = auth.uid();
    
    RETURN v_plantel_id;
END;
$$;

-- Redefinir fn_registrar_intento_fallido() con mitigación de límite duro de lockout y bypass RLS
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
    -- Solo aplica si la cuenta existe en public.usuarios_rls_bypass (que refleja a usuarios)
    IF NOT EXISTS (SELECT 1 FROM public.usuarios_rls_bypass WHERE LOWER(email) = LOWER(p_email)) THEN
        RETURN;
    END IF;

    SELECT intentos_fallidos, bloqueado_hasta
    INTO v_intentos, v_bloqueado_hasta
    FROM public.usuarios_rls_bypass
    WHERE LOWER(email) = LOWER(p_email);

    -- Si el bloqueo anterior ya expiró, reinicia el conteo antes de sumar
    IF v_bloqueado_hasta IS NOT NULL AND v_bloqueado_hasta <= NOW() THEN
        v_intentos := 0;
    END IF;

    UPDATE public.usuarios
    SET intentos_fallidos = COALESCE(v_intentos, 0) + 1,
        bloqueado_hasta = CASE
            -- El límite duro bloquea al alcanzar 5 intentos y evita extender el bloqueo ya vigente
            WHEN COALESCE(v_intentos, 0) + 1 >= 5 AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= NOW())
                THEN NOW() + INTERVAL '15 minutes'
            ELSE bloqueado_hasta
        END
    WHERE LOWER(email) = LOWER(p_email);
END;
$$;

-- Ajustar permisos de ejecución para funciones base
REVOKE EXECUTE ON FUNCTION public.fn_check_auth_user_valid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_auth_user_valid() TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_auth_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_rol() TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_auth_plantel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_plantel() TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_registrar_intento_fallido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_registrar_intento_fallido(text) TO anon, authenticated;


-- ── 3.5 Funciones Helper Anti-Recursión ─────────────────────────────────────
-- Estas funciones encapsulan subconsultas sobre tablas con RLS activo.
-- Al ser SECURITY DEFINER (owner = postgres, BYPASSRLS = true), no disparan
-- evaluación de políticas RLS sobre las tablas internas, rompiendo los ciclos
-- de re-entrada que causan "infinite recursion detected in policy for relation".
--
-- ESCALABILIDAD: Todas las funciones de alcance "plantel" ya están definidas.
-- Para ampliar el acceso del docente de "solo sus grupos" a "todo el plantel",
-- basta con cambiar la referencia en la política (de fn_*_for_docente a fn_*_for_plantel)
-- sin necesidad de crear funciones nuevas.

-- 1) IDs de alumnos cuyo usuario_id coincide con un UID dado
CREATE OR REPLACE FUNCTION public.fn_alumnos_ids_for_user(p_uid UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT a.id FROM public.alumnos a WHERE a.usuario_id = p_uid;
END;
$$;

-- 2) IDs de alumnos vinculados a un padre (vía padres_alumnos)
CREATE OR REPLACE FUNCTION public.fn_alumnos_ids_for_padre(p_padre_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT pa.alumno_id FROM public.padres_alumnos pa WHERE pa.padre_id = p_padre_id;
END;
$$;

-- 3) IDs de grupos donde un docente imparte materias
CREATE OR REPLACE FUNCTION public.fn_grupo_ids_for_docente(p_docente_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT DISTINCT m.grupo_id FROM public.materias m WHERE m.docente_id = p_docente_id;
END;
$$;

-- 4) IDs de grupos de un plantel (infraestructura para escalamiento)
CREATE OR REPLACE FUNCTION public.fn_grupo_ids_for_plantel(p_plantel_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT g.id FROM public.grupos g WHERE g.plantel_id = p_plantel_id;
END;
$$;

-- 5) IDs de alumnos de un plantel (alumnos cuyos grupos pertenecen al plantel)
CREATE OR REPLACE FUNCTION public.fn_alumnos_ids_for_plantel(p_plantel_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT a.id FROM public.alumnos a
    WHERE a.grupo_id IN (SELECT g.id FROM public.grupos g WHERE g.plantel_id = p_plantel_id);
END;
$$;

-- 6) IDs de alumnos en los grupos donde un docente imparte (acceso restringido)
CREATE OR REPLACE FUNCTION public.fn_alumnos_ids_for_docente_grupos(p_docente_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT a.id FROM public.alumnos a
    WHERE a.grupo_id IN (
      SELECT DISTINCT m.grupo_id FROM public.materias m WHERE m.docente_id = p_docente_id
    );
END;
$$;

-- 7) IDs de materias asignadas a un docente
CREATE OR REPLACE FUNCTION public.fn_materia_ids_for_docente(p_docente_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT m.id FROM public.materias m WHERE m.docente_id = p_docente_id;
END;
$$;

-- 8) IDs de materias de un plantel (infraestructura para escalamiento)
CREATE OR REPLACE FUNCTION public.fn_materia_ids_for_plantel(p_plantel_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
    SELECT m.id FROM public.materias m
    WHERE m.grupo_id IN (SELECT g.id FROM public.grupos g WHERE g.plantel_id = p_plantel_id);
END;
$$;

-- Permisos de las funciones helper: revocar acceso público, otorgar solo a authenticated
REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_user(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_padre(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_padre(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_grupo_ids_for_docente(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_grupo_ids_for_docente(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_grupo_ids_for_plantel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_grupo_ids_for_plantel(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_plantel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_plantel(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_docente_grupos(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_docente_grupos(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_materia_ids_for_docente(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_materia_ids_for_docente(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_materia_ids_for_plantel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_materia_ids_for_plantel(UUID) TO authenticated;


-- ── 4. Habilitación de RLS en todas las tablas ──────────────────────────────
-- Nota: algunas tablas ya tienen RLS habilitado en migraciones anteriores.
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY es idempotente.
ALTER TABLE IF EXISTS public.planteles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categorias_incidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.padres_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contactos_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.incidencias ENABLE ROW LEVEL SECURITY;


-- ── 5. Restaurar Políticas RLS de la Tabla 'usuarios' sin Bucle ─────────────

DROP POLICY IF EXISTS sel_usuarios_directivo ON public.usuarios;
CREATE POLICY sel_usuarios_directivo ON public.usuarios
FOR SELECT TO authenticated
USING (
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() = 'directivo'
  )
);

DROP POLICY IF EXISTS upd_usuarios_directivo ON public.usuarios;
CREATE POLICY upd_usuarios_directivo ON public.usuarios
FOR UPDATE TO authenticated
USING (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() = 'directivo'
)
WITH CHECK (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() = 'directivo'
  AND plantel_id = (SELECT u.plantel_id FROM public.usuarios u WHERE u.id = usuarios.id)
);


-- ── 6. Políticas RLS para las tablas de Catálogo y Estructura ──────────────

-- A. Tabla 'planteles'
DROP POLICY IF EXISTS sel_planteles ON public.planteles;
CREATE POLICY sel_planteles ON public.planteles
  FOR SELECT TO authenticated
  USING (public.fn_check_auth_user_valid());

-- B. Tabla 'carreras'
DROP POLICY IF EXISTS sel_carreras ON public.carreras;
CREATE POLICY sel_carreras ON public.carreras
  FOR SELECT TO authenticated
  USING (plantel_id = public.fn_get_auth_plantel());

-- C. Tabla 'grupos'
DROP POLICY IF EXISTS sel_grupos ON public.grupos;
CREATE POLICY sel_grupos ON public.grupos
  FOR SELECT TO authenticated
  USING (plantel_id = public.fn_get_auth_plantel());

-- D. Tabla 'categorias_incidencia'
DROP POLICY IF EXISTS sel_categorias_incidencia ON public.categorias_incidencia;
CREATE POLICY sel_categorias_incidencia ON public.categorias_incidencia
  FOR SELECT TO authenticated
  USING (plantel_id = public.fn_get_auth_plantel());

-- E. Tabla 'materias' (REESCRITA — usa fn_grupo_ids_for_plantel para evitar recursión vía grupos)
DROP POLICY IF EXISTS sel_materias ON public.materias;
CREATE POLICY sel_materias ON public.materias
  FOR SELECT TO authenticated
  USING (
    (docente_id = auth.uid() AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() IN ('docente', 'directivo', 'orientador')
      AND grupo_id IN (SELECT public.fn_grupo_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );


-- ── 7. Políticas RLS para Tablas Sensibles y Relacionales ──────────────────

-- A. Tabla 'padres_alumnos' (sin cambios — no participa en ciclos de recursión)
DROP POLICY IF EXISTS sel_padres_alumnos ON public.padres_alumnos;
CREATE POLICY sel_padres_alumnos ON public.padres_alumnos
  FOR SELECT TO authenticated
  USING (
    (padre_id = auth.uid() AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() IN ('directivo', 'orientador')
      AND (
        EXISTS (
          SELECT 1 FROM public.usuarios u 
          WHERE u.id = padres_alumnos.padre_id 
          AND u.plantel_id = public.fn_get_auth_plantel()
        )
        OR EXISTS (
          SELECT 1 FROM public.usuarios u 
          WHERE u.id = padres_alumnos.alumno_id 
          AND u.plantel_id = public.fn_get_auth_plantel()
        )
      )
    )
  );

DROP POLICY IF EXISTS write_padres_alumnos ON public.padres_alumnos;
CREATE POLICY write_padres_alumnos ON public.padres_alumnos
  FOR ALL TO authenticated
  USING (
    public.fn_get_auth_rol() = 'directivo'
    AND EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.id = padres_alumnos.padre_id 
      AND u.plantel_id = public.fn_get_auth_plantel()
    )
    AND EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.id = padres_alumnos.alumno_id 
      AND u.plantel_id = public.fn_get_auth_plantel()
    )
  )
  WITH CHECK (
    public.fn_get_auth_rol() = 'directivo'
    AND EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.id = padres_alumnos.padre_id 
      AND u.plantel_id = public.fn_get_auth_plantel()
    )
    AND EXISTS (
      SELECT 1 FROM public.usuarios u 
      WHERE u.id = padres_alumnos.alumno_id 
      AND u.plantel_id = public.fn_get_auth_plantel()
    )
  );

-- B. Tabla 'contactos_emergency' (REESCRITA — usa helpers para evitar recursión vía alumnos)
--    NOTA SEGURIDAD: La rama de docente usa fn_alumnos_ids_for_docente_grupos (solo sus grupos),
--    NO fn_alumnos_ids_for_plantel (que expondría datos de todos los alumnos del plantel).
DROP POLICY IF EXISTS sel_contactos_emergency ON public.contactos_emergency;
CREATE POLICY sel_contactos_emergency ON public.contactos_emergency
  FOR SELECT TO authenticated
  USING (
    (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() = 'docente'
      AND alumno_id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid()))
    )
    OR (
      public.fn_get_auth_rol() IN ('directivo', 'orientador')
      AND alumno_id IN (SELECT public.fn_alumnos_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );

DROP POLICY IF EXISTS write_contactos_emergency ON public.contactos_emergency;
CREATE POLICY write_contactos_emergency ON public.contactos_emergency
  FOR ALL TO authenticated
  USING (
    public.fn_get_auth_rol() = 'directivo'
    AND alumno_id IN (SELECT public.fn_alumnos_ids_for_plantel(public.fn_get_auth_plantel()))
  )
  WITH CHECK (
    public.fn_get_auth_rol() = 'directivo'
    AND alumno_id IN (SELECT public.fn_alumnos_ids_for_plantel(public.fn_get_auth_plantel()))
  );


-- ── 8. Políticas de Lectura y Escritura en Tablas Principales ───────────────

-- A. Tabla 'alumnos' (REESCRITA — absorbida desde 20260712020000 + helpers anti-recursión)
--    PILOTO: Docente ve solo alumnos de sus grupos asignados (Opción A — más segura).
--    ESCALAMIENTO: Cambiar fn_grupo_ids_for_docente → fn_grupo_ids_for_plantel para acceso plantel completo.
DROP POLICY IF EXISTS sel_alumnos_policy ON public.alumnos;
CREATE POLICY sel_alumnos_policy ON public.alumnos
  FOR SELECT TO authenticated
  USING (
    usuario_id = auth.uid()
    OR id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid()))
    OR grupo_id IN (SELECT public.fn_grupo_ids_for_docente(auth.uid()))
    OR (
      public.fn_get_auth_rol() IN ('directivo', 'orientador')
      AND grupo_id IN (SELECT public.fn_grupo_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );

DROP POLICY IF EXISTS write_alumnos_directivo ON public.alumnos;
CREATE POLICY write_alumnos_directivo ON public.alumnos
  FOR ALL TO authenticated
  USING (
    public.fn_get_auth_rol() = 'directivo'
    AND grupo_id IN (SELECT public.fn_grupo_ids_for_plantel(public.fn_get_auth_plantel()))
  )
  WITH CHECK (
    public.fn_get_auth_rol() = 'directivo'
    AND grupo_id IN (SELECT public.fn_grupo_ids_for_plantel(public.fn_get_auth_plantel()))
  );

-- B. Tabla 'incidencias' (REESCRITA — absorbida desde 20260712020000 + helpers anti-recursión)
DROP POLICY IF EXISTS sel_incidencias_policy ON public.incidencias;
CREATE POLICY sel_incidencias_policy ON public.incidencias
  FOR SELECT TO authenticated
  USING (
    registrado_por = auth.uid()
    OR alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid()))
    OR alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid()))
    OR (
      public.fn_get_auth_rol() IN ('directivo', 'orientador')
      AND alumno_id IN (SELECT public.fn_alumnos_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );

DROP POLICY IF EXISTS ins_incidencias ON public.incidencias;
CREATE POLICY ins_incidencias ON public.incidencias
  FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_get_auth_rol() IN ('docente', 'orientador', 'directivo')
    AND registrado_por = auth.uid()
    AND alumno_id IN (SELECT public.fn_alumnos_ids_for_plantel(public.fn_get_auth_plantel()))
  );

-- C. Tabla 'periodos_escolares' (sin cambios — no participa en ciclos de recursión)
DROP POLICY IF EXISTS sel_periodos_escolares ON public.periodos_escolares;
CREATE POLICY sel_periodos_escolares ON public.periodos_escolares
  FOR SELECT TO authenticated
  USING (plantel_id = public.fn_get_auth_plantel());

DROP POLICY IF EXISTS write_periodos_escolares ON public.periodos_escolares;
CREATE POLICY write_periodos_escolares ON public.periodos_escolares
  FOR ALL TO authenticated
  USING (
    public.fn_get_auth_rol() = 'directivo'
    AND plantel_id = public.fn_get_auth_plantel()
  )
  WITH CHECK (
    public.fn_get_auth_rol() = 'directivo'
    AND plantel_id = public.fn_get_auth_plantel()
  );

-- D. Tabla 'asistencias' (REESCRITA — usa helpers para evitar recursión vía alumnos/materias/grupos)
DROP POLICY IF EXISTS sel_asistencias ON public.asistencias;
CREATE POLICY sel_asistencias ON public.asistencias
  FOR SELECT TO authenticated
  USING (
    (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (materia_id IN (SELECT public.fn_materia_ids_for_docente(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() IN ('directivo', 'orientador')
      AND materia_id IN (SELECT public.fn_materia_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );

DROP POLICY IF EXISTS write_asistencias ON public.asistencias;
CREATE POLICY write_asistencias ON public.asistencias
  FOR ALL TO authenticated
  USING (
    (materia_id IN (SELECT public.fn_materia_ids_for_docente(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() = 'directivo'
      AND materia_id IN (SELECT public.fn_materia_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  )
  WITH CHECK (
    (materia_id IN (SELECT public.fn_materia_ids_for_docente(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() = 'directivo'
      AND materia_id IN (SELECT public.fn_materia_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );

-- E. Tabla 'participaciones' (REESCRITA — usa helpers para evitar recursión vía alumnos/materias/grupos)
DROP POLICY IF EXISTS sel_participaciones ON public.participaciones;
CREATE POLICY sel_participaciones ON public.participaciones
  FOR SELECT TO authenticated
  USING (
    (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (materia_id IN (SELECT public.fn_materia_ids_for_docente(auth.uid())) AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() IN ('directivo', 'orientador')
      AND materia_id IN (SELECT public.fn_materia_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );

DROP POLICY IF EXISTS write_participaciones ON public.participaciones;
CREATE POLICY write_participaciones ON public.participaciones
  FOR ALL TO authenticated
  USING (
    (materia_id IN (SELECT public.fn_materia_ids_for_docente(auth.uid())) AND registrado_por = auth.uid() AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() = 'directivo'
      AND materia_id IN (SELECT public.fn_materia_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  )
  WITH CHECK (
    (materia_id IN (SELECT public.fn_materia_ids_for_docente(auth.uid())) AND registrado_por = auth.uid() AND public.fn_check_auth_user_valid())
    OR (
      public.fn_get_auth_rol() = 'directivo'
      AND materia_id IN (SELECT public.fn_materia_ids_for_plantel(public.fn_get_auth_plantel()))
    )
  );
