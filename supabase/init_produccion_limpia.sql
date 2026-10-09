-- =============================================================================
-- COLEGIO DE EDUCACIÓN PROFESIONAL TÉCNICA DEL ESTADO DE PUEBLA
-- SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC / EduTrack 360)
-- SCRIPT MAESTRO DE INICIALIZACIÓN LIMPIA PARA PRODUCCIÓN (ON-PREMISE)
-- =============================================================================
-- Cumplimiento estricto: LGPDPPSO (Soberanía y Protección de Datos Personales)
-- Este script:
--   1. Configura extensiones necesarias.
--   2. Genera las 24 tablas en orden estricto de integridad referencial.
--   3. Establece la tabla shadow usuarios_rls_bypass con su trigger anti-recursión.
--   4. Registra funciones de seguridad, triggers de semáforo conductual y RPCs de BI.
--   5. Aplica la matriz de Row Level Security (RLS) consolidada.
--   6. Siembra ÚNICAMENTE catálogos institucionales maestros (Plantel Puebla I).
--   7. Da de alta al Super Administrador inicial (admin@conalep.edu.mx).
--   8. Mantiene las tablas de alumnos, incidencias y tutores 100% VACÍAS.
-- =============================================================================

BEGIN;

-- ── 1. Extensiones Criptográficas y de Identificadores ────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. Creación Estructurada de Tablas (Orden de Dependencias) ────────────────

-- 1. Planteles
CREATE TABLE IF NOT EXISTS public.planteles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    clave_centro VARCHAR(50) UNIQUE NOT NULL,
    estado VARCHAR(100) NOT NULL DEFAULT 'Puebla',
    municipio VARCHAR(100) NOT NULL DEFAULT 'Puebla',
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Períodos Escolares
CREATE TABLE IF NOT EXISTS public.periodos_escolares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID NOT NULL REFERENCES public.planteles(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_periodo_activo_plantel 
ON public.periodos_escolares (plantel_id) WHERE (activo = true);

-- 3. Usuarios Institucionales
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plantel_id UUID REFERENCES public.planteles(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL DEFAULT '',
    apellido VARCHAR(100) NOT NULL DEFAULT '',
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('docente', 'orientador', 'directivo', 'administrador', 'padre', 'alumno', 'pendiente')),
    cargo VARCHAR(100) DEFAULT 'Usuario',
    password_hash VARCHAR(255) DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    bloqueado_hasta TIMESTAMPTZ,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_lower ON public.usuarios (LOWER(email));

-- 4. Tabla Shadow Anti-Recursión RLS (Contiene columna email para control de bloqueos)
DROP TABLE IF EXISTS public.usuarios_rls_bypass CASCADE;
CREATE TABLE public.usuarios_rls_bypass (
    id UUID PRIMARY KEY,
    plantel_id UUID,
    rol TEXT NOT NULL,
    email TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    bloqueado_hasta TIMESTAMPTZ,
    intentos_fallidos INTEGER NOT NULL DEFAULT 0
);
-- REVOKE ALL para garantizar aislamiento y evitar consultas directas no autorizadas
REVOKE ALL ON public.usuarios_rls_bypass FROM PUBLIC, anon, authenticated;

-- 5. Carreras Técnicas
CREATE TABLE IF NOT EXISTS public.carreras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID NOT NULL REFERENCES public.planteles(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    clave VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Grupos
CREATE TABLE IF NOT EXISTS public.grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID NOT NULL REFERENCES public.planteles(id) ON DELETE CASCADE,
    periodo_id UUID REFERENCES public.periodos_escolares(id) ON DELETE SET NULL,
    carrera_id UUID REFERENCES public.carreras(id) ON DELETE SET NULL,
    nombre VARCHAR(50) NOT NULL,
    semestre INTEGER NOT NULL CHECK (semestre BETWEEN 1 AND 6),
    turno VARCHAR(20) NOT NULL DEFAULT 'Matutino',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Alumnos
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID UNIQUE NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
    carrera_id UUID REFERENCES public.carreras(id) ON DELETE SET NULL,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    generacion VARCHAR(20) DEFAULT '2024-2027',
    tipo_alumno VARCHAR(30) DEFAULT 'regular',
    correo_institucional VARCHAR(255),
    correo_personal_enc TEXT,
    telefono_enc TEXT,
    tipo_sangre VARCHAR(10) DEFAULT 'O+',
    alergias TEXT DEFAULT 'Ninguna',
    puntos_totales INTEGER NOT NULL DEFAULT 100,
    nivel_semaforo VARCHAR(20) NOT NULL DEFAULT 'verde' CHECK (nivel_semaforo IN ('verde', 'naranja', 'rojo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Vinculación Padre / Tutor - Alumno
CREATE TABLE IF NOT EXISTS public.padres_alumnos (
    padre_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    parentesco VARCHAR(50) DEFAULT 'Tutor Legal',
    notificaciones_activas BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (padre_id, alumno_id)
);

-- 9. Contactos de Emergencia
CREATE TABLE IF NOT EXISTS public.contactos_emergency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    parentesco VARCHAR(50) DEFAULT 'Familiar',
    telefono VARCHAR(30) NOT NULL,
    es_primario BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Materias
CREATE TABLE IF NOT EXISTS public.materias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    nombre VARCHAR(150) NOT NULL,
    clave VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Categorías de Incidencia Normativas
CREATE TABLE IF NOT EXISTS public.categorias_incidencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID REFERENCES public.planteles(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    color_semaforo VARCHAR(20) NOT NULL CHECK (color_semaforo IN ('verde', 'naranja', 'rojo')),
    impacto_base INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Incidencias Conductuales
CREATE TABLE IF NOT EXISTS public.incidencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias_incidencia(id) ON DELETE RESTRICT,
    periodo_id UUID REFERENCES public.periodos_escolares(id) ON DELETE SET NULL,
    materia_id UUID REFERENCES public.materias(id) ON DELETE SET NULL,
    descripcion TEXT NOT NULL,
    lugar VARCHAR(150) DEFAULT 'Aula',
    impacto_puntos INTEGER NOT NULL DEFAULT 0,
    registrado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Asistencias (Pase de lista con granularidad)
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    presente BOOLEAN NOT NULL DEFAULT true,
    justificada BOOLEAN NOT NULL DEFAULT false,
    estatus VARCHAR(20) DEFAULT 'asistencia',
    desempeno INTEGER DEFAULT 100,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_asistencia_dia UNIQUE (alumno_id, materia_id, fecha)
);

-- 14. Participaciones en Clase
CREATE TABLE IF NOT EXISTS public.participaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('positiva', 'nula')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Seguimientos Psicopedagógicos de Orientación Educativa
CREATE TABLE IF NOT EXISTS public.seguimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    orientador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    observaciones TEXT NOT NULL,
    estado_atencion VARCHAR(50) NOT NULL DEFAULT 'En proceso',
    fecha_cita TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Avisos Institucionales
CREATE TABLE IF NOT EXISTS public.avisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID NOT NULL REFERENCES public.planteles(id) ON DELETE CASCADE,
    creado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'general',
    destinatarios VARCHAR(50) DEFAULT 'todos',
    activo BOOLEAN NOT NULL DEFAULT true,
    fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Insignias y Reconocimientos
CREATE TABLE IF NOT EXISTS public.insignias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID REFERENCES public.planteles(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    icono_url VARCHAR(100) DEFAULT 'star',
    puntos_requeridos INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. Insignias Otorgadas a Alumnos
CREATE TABLE IF NOT EXISTS public.alumno_insignias (
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    insignia_id UUID NOT NULL REFERENCES public.insignias(id) ON DELETE CASCADE,
    otorgado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (alumno_id, insignia_id)
);

-- 19. Justificantes Médicos / Oficiales
CREATE TABLE IF NOT EXISTS public.justificantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo TEXT NOT NULL,
    archivo_url TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    revisado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Citatorios Formales
CREATE TABLE IF NOT EXISTS public.citatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    fecha_cita TIMESTAMPTZ NOT NULL,
    motivo TEXT NOT NULL,
    estatus VARCHAR(30) NOT NULL DEFAULT 'programado' CHECK (estatus IN ('programado', 'atendido', 'cancelado')),
    generado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Notificaciones del Sistema
CREATE TABLE IF NOT EXISTS public.notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'info',
    leida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Auditoría y Trazabilidad (Forensic Logging)
CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id UUID,
    detalles JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. Historial de Reportes Exportados
CREATE TABLE IF NOT EXISTS public.exportaciones_reportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tipo_reporte VARCHAR(50) NOT NULL,
    parametros JSONB,
    formato VARCHAR(10) NOT NULL DEFAULT 'PDF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. Configuraciones Institucionales por Plantel
CREATE TABLE IF NOT EXISTS public.configuraciones_plantel (
    plantel_id UUID PRIMARY KEY REFERENCES public.planteles(id) ON DELETE CASCADE,
    umbral_semaforo_amarillo INTEGER NOT NULL DEFAULT 85,
    umbral_semaforo_rojo INTEGER NOT NULL DEFAULT 70,
    dias_justificacion_limite INTEGER NOT NULL DEFAULT 3,
    notificar_tutores_inmediato BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 25. Control de Rate Limiting Persistente para Groq IA (Agregado en feat/frontend)
CREATE TABLE IF NOT EXISTS public.groq_rate_limits (
    user_id UUID PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
    request_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.groq_rate_limits ENABLE ROW LEVEL SECURITY;

-- ── 3. Triggers y Funciones de Seguridad Esenciales ──────────────────────────

-- Trigger de sincronización de la tabla shadow
CREATE OR REPLACE FUNCTION public.sync_usuarios_rls_bypass()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM public.usuarios_rls_bypass WHERE id = OLD.id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.usuarios_rls_bypass (id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos)
        VALUES (NEW.id, NEW.plantel_id, NEW.rol, NEW.email, NEW.activo, NEW.bloqueado_hasta, NEW.intentos_fallidos)
        ON CONFLICT (id) DO UPDATE
        SET plantel_id = EXCLUDED.plantel_id,
            rol = EXCLUDED.rol,
            email = EXCLUDED.email,
            activo = EXCLUDED.activo,
            bloqueado_hasta = EXCLUDED.bloqueado_hasta,
            intentos_fallidos = EXCLUDED.intentos_fallidos;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.usuarios_rls_bypass (id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos)
        VALUES (NEW.id, NEW.plantel_id, NEW.rol, NEW.email, NEW.activo, NEW.bloqueado_hasta, NEW.intentos_fallidos)
        ON CONFLICT (id) DO UPDATE
        SET plantel_id = EXCLUDED.plantel_id,
            rol = EXCLUDED.rol,
            email = EXCLUDED.email,
            activo = EXCLUDED.activo,
            bloqueado_hasta = EXCLUDED.bloqueado_hasta,
            intentos_fallidos = EXCLUDED.intentos_fallidos;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_usuarios_rls_bypass ON public.usuarios;
CREATE TRIGGER tr_sync_usuarios_rls_bypass
AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.sync_usuarios_rls_bypass();

-- Trigger sobre auth.users para auto-provisionar fila en public.usuarios
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
    COALESCE((NEW.raw_user_meta_data->>'plantel_id')::uuid, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51'::uuid),
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'pendiente'),
    '',
    COALESCE((NEW.raw_user_meta_data->>'activo')::boolean, true),
    0
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nombre = CASE WHEN EXCLUDED.nombre <> '' THEN EXCLUDED.nombre ELSE usuarios.nombre END,
      apellido = CASE WHEN EXCLUDED.apellido <> '' THEN EXCLUDED.apellido ELSE usuarios.apellido END,
      rol = CASE WHEN EXCLUDED.rol <> 'pendiente' THEN EXCLUDED.rol ELSE usuarios.rol END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helpers de Contexto de Seguridad Anti-Recursión
CREATE OR REPLACE FUNCTION public.fn_check_auth_user_valid()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
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
LANGUAGE plpgsql STABLE SECURITY DEFINER
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
LANGUAGE plpgsql STABLE SECURITY DEFINER
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

-- Funciones de Bloqueo y Registro de Intentos Fallidos
CREATE OR REPLACE FUNCTION public.fn_registrar_intento_fallido(p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_intentos integer;
    v_bloqueado_hasta timestamptz;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios_rls_bypass WHERE LOWER(email) = LOWER(p_email)) THEN
        RETURN;
    END IF;

    SELECT intentos_fallidos, bloqueado_hasta
    INTO v_intentos, v_bloqueado_hasta
    FROM public.usuarios_rls_bypass
    WHERE LOWER(email) = LOWER(p_email);

    IF v_bloqueado_hasta IS NOT NULL AND v_bloqueado_hasta <= NOW() THEN
        v_intentos := 0;
    END IF;

    UPDATE public.usuarios
    SET intentos_fallidos = COALESCE(v_intentos, 0) + 1,
        bloqueado_hasta = CASE
            WHEN COALESCE(v_intentos, 0) + 1 >= 5 AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= NOW())
                THEN NOW() + INTERVAL '15 minutes'
            ELSE bloqueado_hasta
        END
    WHERE LOWER(email) = LOWER(p_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_reset_intentos_fallidos(p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL
    WHERE LOWER(email) = LOWER(p_email);
END;
$$;

-- Helpers de Alcance para Relaciones de Alumnos
CREATE OR REPLACE FUNCTION public.fn_alumnos_ids_for_user(p_uid UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT a.id FROM public.alumnos a WHERE a.usuario_id = p_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_alumnos_ids_for_padre(p_padre_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT pa.alumno_id FROM public.padres_alumnos pa WHERE pa.padre_id = p_padre_id;
END;
$$;

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

-- Función Atómica de Rate Limiting para Groq IA
CREATE OR REPLACE FUNCTION public.fn_check_groq_rate_limit(
    p_user_id UUID,
    p_max_requests INT DEFAULT 10,
    p_window_seconds INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_window_start TIMESTAMPTZ;
    v_count INT;
BEGIN
    SELECT request_count, window_start INTO v_count, v_window_start
    FROM public.groq_rate_limits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.groq_rate_limits (user_id, request_count, window_start)
        VALUES (p_user_id, 1, v_now);
        RETURN FALSE;
    END IF;

    IF v_now > v_window_start + (p_window_seconds || ' seconds')::INTERVAL THEN
        UPDATE public.groq_rate_limits
        SET request_count = 1, window_start = v_now
        WHERE user_id = p_user_id;
        RETURN FALSE;
    END IF;

    IF v_count >= p_max_requests THEN
        RETURN TRUE;
    END IF;

    UPDATE public.groq_rate_limits
    SET request_count = request_count + 1
    WHERE user_id = p_user_id;

    RETURN FALSE;
END;
$$;

-- Permisos de Ejecución
REVOKE EXECUTE ON FUNCTION public.fn_check_auth_user_valid() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_auth_user_valid() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_auth_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_rol() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_get_auth_plantel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_auth_plantel() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_registrar_intento_fallido(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_registrar_intento_fallido(text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_user(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_padre(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_padre(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_plantel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_plantel(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_alumnos_ids_for_docente_grupos(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_docente_grupos(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.fn_check_groq_rate_limit(UUID, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_groq_rate_limit(UUID, INT, INT) TO authenticated, service_role;

-- ── 4. Lógica de Negocio y Semáforo Conductual Automático ──────────────────────
CREATE OR REPLACE FUNCTION public.fn_actualizar_semaforo_alumno()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total INTEGER;
    v_color VARCHAR(20);
BEGIN
    SELECT COALESCE(SUM(impacto_puntos), 0) + 100
    INTO v_total
    FROM public.incidencias
    WHERE alumno_id = NEW.alumno_id;

    IF v_total < 0 THEN v_total := 0; END IF;
    IF v_total > 100 THEN v_total := 100; END IF;

    IF v_total >= 85 THEN
        v_color := 'verde';
    ELSIF v_total >= 70 THEN
        v_color := 'naranja';
    ELSE
        v_color := 'rojo';
    END IF;

    UPDATE public.alumnos
    SET puntos_totales = v_total,
        nivel_semaforo = v_color
    WHERE id = NEW.alumno_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_incidencia_cambio ON public.incidencias;
CREATE TRIGGER trg_incidencia_cambio
AFTER INSERT OR UPDATE OR DELETE ON public.incidencias
FOR EACH ROW EXECUTE FUNCTION public.fn_actualizar_semaforo_alumno();

-- ── 5. Habilitación Consolidada de Row Level Security (RLS) ───────────────────

ALTER TABLE public.planteles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_escolares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padres_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contactos_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_incidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insignias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumno_insignias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.justificantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas Maestras para Usuarios
DROP POLICY IF EXISTS sel_usuarios_propio_o_admin ON public.usuarios;
CREATE POLICY sel_usuarios_propio_o_admin ON public.usuarios
FOR SELECT TO authenticated
USING (
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador')
  )
);

DROP POLICY IF EXISTS upd_usuarios_admin ON public.usuarios;
CREATE POLICY upd_usuarios_admin ON public.usuarios
FOR UPDATE TO authenticated
USING (
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
  )
)
WITH CHECK (
  (id = auth.uid())
  OR (
    plantel_id = public.fn_get_auth_plantel()
    AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
  )
);

DROP POLICY IF EXISTS ins_usuarios_admin ON public.usuarios;
CREATE POLICY ins_usuarios_admin ON public.usuarios
FOR INSERT TO authenticated
WITH CHECK (
  plantel_id = public.fn_get_auth_plantel()
  AND public.fn_get_auth_rol() IN ('directivo', 'administrador')
);

-- Políticas para Catálogos de Plantel y Carreras
DROP POLICY IF EXISTS sel_planteles_auth ON public.planteles;
CREATE POLICY sel_planteles_auth ON public.planteles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sel_carreras_auth ON public.carreras;
CREATE POLICY sel_carreras_auth ON public.carreras FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sel_periodos_auth ON public.periodos_escolares;
CREATE POLICY sel_periodos_auth ON public.periodos_escolares FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sel_grupos_auth ON public.grupos;
CREATE POLICY sel_grupos_auth ON public.grupos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sel_categorias_auth ON public.categorias_incidencia;
CREATE POLICY sel_categorias_auth ON public.categorias_incidencia FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS sel_insignias_auth ON public.insignias;
CREATE POLICY sel_insignias_auth ON public.insignias FOR SELECT TO authenticated USING (true);

-- Políticas para Alumnos
DROP POLICY IF EXISTS sel_alumnos_policy ON public.alumnos;
CREATE POLICY sel_alumnos_policy ON public.alumnos
FOR SELECT TO authenticated
USING (
  (usuario_id = auth.uid() AND public.fn_check_auth_user_valid())
  OR (id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() = 'docente' AND id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid())) AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_alumnos_directivo ON public.alumnos;
CREATE POLICY write_alumnos_directivo ON public.alumnos
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('directivo', 'administrador'));

-- Políticas para Incidencias
DROP POLICY IF EXISTS sel_incidencias_policy ON public.incidencias;
CREATE POLICY sel_incidencias_policy ON public.incidencias
FOR SELECT TO authenticated
USING (
  (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() = 'docente' AND alumno_id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid())) AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS ins_incidencias_policy ON public.incidencias;
CREATE POLICY ins_incidencias_policy ON public.incidencias
FOR INSERT TO authenticated
WITH CHECK (
  public.fn_get_auth_rol() IN ('docente', 'orientador', 'directivo', 'administrador')
  AND public.fn_check_auth_user_valid()
);

-- Políticas para Asistencias
DROP POLICY IF EXISTS sel_asistencias_policy ON public.asistencias;
CREATE POLICY sel_asistencias_policy ON public.asistencias
FOR SELECT TO authenticated
USING (
  (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() = 'docente' AND alumno_id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid())) AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_asistencias_docente ON public.asistencias;
CREATE POLICY write_asistencias_docente ON public.asistencias
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('docente', 'directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('docente', 'directivo', 'administrador'));

-- Políticas para Vinculación Padres-Alumnos
DROP POLICY IF EXISTS sel_padres_alumnos ON public.padres_alumnos;
CREATE POLICY sel_padres_alumnos ON public.padres_alumnos
FOR SELECT TO authenticated
USING (
  (padre_id = auth.uid() AND public.fn_check_auth_user_valid())
  OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_padres_alumnos_admin ON public.padres_alumnos;
CREATE POLICY write_padres_alumnos_admin ON public.padres_alumnos
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('directivo', 'administrador'));

-- Políticas para Contactos de Emergencia
DROP POLICY IF EXISTS sel_contactos_emergency ON public.contactos_emergency;
CREATE POLICY sel_contactos_emergency ON public.contactos_emergency
FOR SELECT TO authenticated
USING (
  (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() = 'docente' AND alumno_id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid())) AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_contactos_emergency ON public.contactos_emergency;
CREATE POLICY write_contactos_emergency ON public.contactos_emergency
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('directivo', 'administrador'));

-- Políticas para Materias
DROP POLICY IF EXISTS sel_materias_auth ON public.materias;
CREATE POLICY sel_materias_auth ON public.materias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS write_materias_admin ON public.materias;
CREATE POLICY write_materias_admin ON public.materias
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('directivo', 'administrador'));

-- Políticas para Participaciones
DROP POLICY IF EXISTS sel_participaciones ON public.participaciones;
CREATE POLICY sel_participaciones ON public.participaciones
FOR SELECT TO authenticated
USING (
  (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() = 'docente' AND alumno_id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid())) AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_participaciones_docente ON public.participaciones;
CREATE POLICY write_participaciones_docente ON public.participaciones
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('docente', 'directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('docente', 'directivo', 'administrador'));

-- Políticas para Avisos Institucionales
DROP POLICY IF EXISTS sel_avisos_auth ON public.avisos;
CREATE POLICY sel_avisos_auth ON public.avisos FOR SELECT TO authenticated USING (activo = true);

DROP POLICY IF EXISTS write_avisos_admin ON public.avisos;
CREATE POLICY write_avisos_admin ON public.avisos
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('directivo', 'administrador'));

-- Políticas para Seguimientos Psicopedagógicos
DROP POLICY IF EXISTS sel_seguimientos ON public.seguimientos;
CREATE POLICY sel_seguimientos ON public.seguimientos
FOR SELECT TO authenticated
USING (
  (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_seguimientos ON public.seguimientos;
CREATE POLICY write_seguimientos ON public.seguimientos
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('orientador', 'directivo', 'administrador'))
WITH CHECK (public.fn_get_auth_rol() IN ('orientador', 'directivo', 'administrador'));

-- Políticas para Justificantes y Citatorios
DROP POLICY IF EXISTS sel_justificantes ON public.justificantes;
CREATE POLICY sel_justificantes ON public.justificantes
FOR SELECT TO authenticated
USING (
  (alumno_id IN (SELECT public.fn_alumnos_ids_for_user(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (alumno_id IN (SELECT public.fn_alumnos_ids_for_padre(auth.uid())) AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() IN ('directivo', 'administrador', 'orientador') AND public.fn_check_auth_user_valid())
  OR (public.fn_get_auth_rol() = 'docente' AND alumno_id IN (SELECT public.fn_alumnos_ids_for_docente_grupos(auth.uid())) AND public.fn_check_auth_user_valid())
);

DROP POLICY IF EXISTS write_justificantes ON public.justificantes;
CREATE POLICY write_justificantes ON public.justificantes
FOR ALL TO authenticated
USING (public.fn_get_auth_rol() IN ('orientador', 'directivo', 'administrador', 'padre', 'alumno'))
WITH CHECK (public.fn_get_auth_rol() IN ('orientador', 'directivo', 'administrador', 'padre', 'alumno'));

-- ── 6. Carga de Catálogos Maestros Oficiales (CONALEP Puebla I) ───────────────

-- 1. Plantel Sede
INSERT INTO public.planteles (id, nombre, clave_centro, estado, municipio, direccion, activo)
VALUES (
    'b5cde2a6-38d5-450f-90db-3367c3bb1b51',
    'Colegio de Educación Profesional Técnica del Estado de Puebla — Plantel Puebla I',
    '21DPT0001G',
    'Puebla',
    'Heroica Puebla de Zaragoza',
    'Calle 11 Sur y Av. 105 Poniente, Col. Arboledas de Loma Bella, C.P. 72490',
    true
)
ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, clave_centro = EXCLUDED.clave_centro;

-- 2. Periodo Escolar Activo
INSERT INTO public.periodos_escolares (id, plantel_id, nombre, fecha_inicio, fecha_fin, activo)
VALUES (
    'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
    'b5cde2a6-38d5-450f-90db-3367c3bb1b51',
    'Ciclo Escolar 2026-2027 / Semestre A',
    '2026-08-17',
    '2027-01-29',
    true
)
ON CONFLICT (id) DO UPDATE SET activo = true;

-- 3. Carreras Técnicas Acreditadas
INSERT INTO public.carreras (id, plantel_id, nombre, clave)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'P.T.B. en Informática', 'INFO-01'),
    ('c0000000-0000-0000-0000-000000000002', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'P.T.B. en Administración', 'ADMN-02'),
    ('c0000000-0000-0000-0000-000000000003', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'P.T.B. en Contabilidad', 'CONT-03'),
    ('c0000000-0000-0000-0000-000000000004', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'P.T.B. en Mantenimiento Automotriz', 'MANT-04'),
    ('c0000000-0000-0000-0000-000000000005', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'P.T.B. en Enfermería General', 'ENFE-05')
ON CONFLICT (id) DO NOTHING;

-- 4. Catálogo Normativo de Incidencias Escolares CONALEP
INSERT INTO public.categorias_incidencia (id, plantel_id, nombre, color_semaforo, impacto_base)
VALUES
    ('c1a11111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Participación Destacada y Proactividad', 'verde', 5),
    ('c2a22222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Retardo o Llegada Tarde al Aula', 'naranja', -5),
    ('c3a33333-4444-5555-6666-777777777777', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Uso No Autorizado de Celular / Distracción', 'naranja', -10),
    ('c4a44444-5555-6666-7777-888888888888', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Falta de Respeto a Docente o Compañeros', 'rojo', -15),
    ('c5a55555-6666-7777-8888-999999999999', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Mérito Académico o Concurso Institucional', 'verde', 15),
    ('c6a66666-7777-8888-9999-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Infracción Grave al Reglamento Escolar', 'rojo', -25)
ON CONFLICT (id) DO NOTHING;

-- 5. Catálogo de Insignias Institucionales
INSERT INTO public.insignias (id, plantel_id, nombre, icono_url, puntos_requeridos)
VALUES
    ('11a11111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Alumno Ejemplar CONALEP', 'star', 120),
    ('22a22222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Conducta Óptima y Respeto', 'verified', 110),
    ('33a33333-4444-5555-6666-777777777777', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Puntualidad y Asistencia Perfecta', 'schedule', 105),
    ('44a44444-5555-6666-7777-888888888888', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Superación y Esfuerzo Académico', 'trending_up', 115)
ON CONFLICT (id) DO NOTHING;

-- ── 7. Alta del Super Administrador Maestro de TI (Sin Datos Dummy) ───────────
-- Crea la cuenta admin@conalep.edu.mx con contraseña inicial: AdminConalep.2026!
-- Se inyecta en auth.users y se sincroniza en public.usuarios y usuarios_rls_bypass.

DO $$
DECLARE
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
    v_plantel_id UUID := 'b5cde2a6-38d5-450f-90db-3367c3bb1b51'::UUID;
    v_admin_email TEXT := 'admin@conalep.edu.mx';
    v_admin_pass TEXT := 'AdminConalep.2026!';
BEGIN
    -- 1. Insertar en auth.users si no existe
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud, created_at, updated_at
    )
    VALUES (
        v_admin_id,
        '00000000-0000-0000-0000-000000000000'::UUID,
        v_admin_email,
        crypt(v_admin_pass, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
            'nombre', 'Administrador',
            'apellido', 'General TI',
            'rol', 'administrador',
            'plantel_id', v_plantel_id
        ),
        false,
        'authenticated',
        'authenticated',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = crypt(v_admin_pass, gen_salt('bf')),
        email_confirmed_at = NOW();

    -- 2. Asegurar fila en public.usuarios
    INSERT INTO public.usuarios (
        id, plantel_id, email, nombre, apellido, rol, cargo, activo, created_at, updated_at
    )
    VALUES (
        v_admin_id,
        v_plantel_id,
        v_admin_email,
        'Administrador',
        'General TI',
        'administrador',
        'Jefatura de Informática y Soporte',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        rol = 'administrador',
        activo = true,
        email = v_admin_email;

    -- 3. Resincronizar en tabla bypass
    INSERT INTO public.usuarios_rls_bypass (
        id, plantel_id, rol, email, activo, bloqueado_hasta, intentos_fallidos
    )
    VALUES (
        v_admin_id,
        v_plantel_id,
        'administrador',
        v_admin_email,
        true,
        NULL,
        0
    )
    ON CONFLICT (id) DO UPDATE SET
        rol = 'administrador',
        email = v_admin_email,
        activo = true,
        bloqueado_hasta = NULL,
        intentos_fallidos = 0;
END;
$$;

COMMIT;

-- =============================================================================
-- BASE DE DATOS INICIALIZADA EXITOSAMENTE PARA PRODUCCIÓN CONALEP PUEBLA I
-- CUMPLIMIENTO LGPDPPSO: 0 registros personales de estudiantes cargados.
-- Credencial Maestra Inicial:
--   Usuario:    admin@conalep.edu.mx
--   Contraseña: AdminConalep.2026!
--   Rol:        administrador
-- =============================================================================
