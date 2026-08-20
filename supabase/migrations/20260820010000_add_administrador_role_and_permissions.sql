-- ============================================================
-- Migración: Integración del Rol 'administrador' y Permisos RBAC
-- ============================================================

-- ── 1. Ampliar el CHECK constraint de rol para incluir 'administrador' ───────
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_rol;

ALTER TABLE public.usuarios
  ADD CONSTRAINT chk_usuarios_rol
  CHECK (rol IN ('docente', 'orientador', 'directivo', 'administrador', 'padre', 'alumno', 'pendiente'));

-- ── 2. Resincronizar la tabla de bypass de RLS ──────────────────────────────
INSERT INTO public.usuarios_rls_bypass (id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos)
SELECT id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos FROM public.usuarios
ON CONFLICT (id) DO UPDATE
SET plantel_id = EXCLUDED.plantel_id,
    rol = EXCLUDED.rol,
    email = EXCLUDED.email,
    activo = EXCLUDED.activo,
    bloqueado_hasta = EXCLUDED.bloqueado_hasta,
    intentos_fallidos = EXCLUDED.intentos_fallidos;

-- ── 3. Políticas RLS para la tabla 'usuarios' ─────────────────────────────────

-- Permitir SELECT a administradores y directivos sobre usuarios de su plantel
DROP POLICY IF EXISTS sel_usuarios_directivo ON public.usuarios;
CREATE POLICY sel_usuarios_directivo ON public.usuarios
FOR SELECT TO authenticated
USING (
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
  )
);

-- Permitir UPDATE a administradores y directivos sobre usuarios de su plantel
DROP POLICY IF EXISTS upd_usuarios_directivo ON public.usuarios;
CREATE POLICY upd_usuarios_directivo ON public.usuarios
FOR UPDATE TO authenticated
USING (
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
  )
)
WITH CHECK (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
  AND plantel_id = (SELECT plantel_id FROM public.usuarios u WHERE u.id = usuarios.id)
);

-- Permitir INSERT a administradores y directivos para invitar/crear cuentas en su plantel
DROP POLICY IF EXISTS ins_usuarios_admin ON public.usuarios;
CREATE POLICY ins_usuarios_admin ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
);

-- ── 4. Políticas RLS para Grupos, Carreras y Periodos Escolares ───────────────

-- Administradores pueden gestionar grupos
DROP POLICY IF EXISTS all_grupos_admin ON public.grupos;
CREATE POLICY all_grupos_admin ON public.grupos
FOR ALL TO authenticated
USING (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
)
WITH CHECK (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
);

-- Administradores pueden gestionar vinculaciones padre-alumno
DROP POLICY IF EXISTS all_padres_alumnos_admin ON public.padres_alumnos;
CREATE POLICY all_padres_alumnos_admin ON public.padres_alumnos
FOR ALL TO authenticated
USING (
  public.fn_get_auth_rol() IN ('directivo', 'administrador')
)
WITH CHECK (
  public.fn_get_auth_rol() IN ('directivo', 'administrador')
);

-- ── 5. Actualizar trigger de auto-perfil ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.usuarios (
    id, plantel_id, nombre, apellido, email, rol,
    password_hash, activo, intentos_fallidos
  )
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'plantel_id')::UUID, (SELECT id FROM public.planteles LIMIT 1)),
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'pendiente'),
    '',
    true,
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nombre = EXCLUDED.nombre,
      apellido = EXCLUDED.apellido,
      rol = EXCLUDED.rol;

  RETURN NEW;
END;
$$;
