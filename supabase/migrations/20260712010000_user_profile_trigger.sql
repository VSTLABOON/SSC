-- ============================================================
-- Migración: Trigger de auto-perfil + RLS de directivo
-- ============================================================

-- ── 1. Ampliar el CHECK constraint de rol para incluir 'pendiente' ──────────
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS chk_usuarios_rol;

ALTER TABLE public.usuarios
  ADD CONSTRAINT chk_usuarios_rol
  CHECK (rol IN ('docente', 'orientador', 'directivo', 'padre', 'alumno', 'pendiente'));

-- ── 2. Helpers de RLS (si no existen aún) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_auth_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.fn_get_auth_plantel()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT plantel_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- ── 3. Política RLS: el directivo puede actualizar usuarios de su plantel ───
-- Primero eliminar si ya existe para idempotencia
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
  -- Evita que el directivo cambie el plantel_id de otra persona (alcance mono-plantel)
  AND plantel_id = (SELECT plantel_id FROM public.usuarios u WHERE u.id = usuarios.id)
);

-- ── 4. Función del trigger: crea perfil automáticamente al registrar Auth ───
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
    -- La Edge Function invite-user SIEMPRE inyecta plantel_id en raw_user_meta_data.
    -- Si llega nulo (registro directo sin invitación), el insert fallará por NOT NULL — comportamiento deseado.
    (NEW.raw_user_meta_data->>'plantel_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    'pendiente',
    -- password_hash es requerido pero Auth maneja la autenticación; se guarda vacío
    '',
    -- La cuenta inicia inactiva hasta que el directivo la active desde el panel
    false,
    0
  );
  RETURN NEW;
END;
$$;

-- ── 5. Trigger sobre auth.users ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── 6. Política SELECT: el directivo puede ver todos los usuarios de su plantel
DROP POLICY IF EXISTS sel_usuarios_directivo ON public.usuarios;

CREATE POLICY sel_usuarios_directivo ON public.usuarios
FOR SELECT TO authenticated
USING (
  -- Cada usuario ve su propia fila (ya cubierto por política existente)
  -- O el directivo ve todos los del mismo plantel
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() = 'directivo'
  )
);
