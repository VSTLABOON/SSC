-- DDL para alinear el esquema de Supabase con el frontend de SSC / EduTrack 360

-- 1. Tabla de períodos escolares (si no existe)
CREATE TABLE IF NOT EXISTS public.periodos_escolares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantel_id UUID NOT NULL REFERENCES public.planteles(id),
    nombre TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar que solo haya un período activo por plantel a nivel de índice único
CREATE UNIQUE INDEX IF NOT EXISTS uq_periodo_activo_plantel 
ON public.periodos_escolares (plantel_id) 
WHERE (activo = true);

-- 2. Tabla de asistencias (si no existe)
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    presente BOOLEAN NOT NULL DEFAULT true,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_asistencia_dia UNIQUE (alumno_id, materia_id, fecha)
);

-- 3. Tabla de participaciones (si no existe)
CREATE TABLE IF NOT EXISTS public.participaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alumno_id UUID NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
    materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    nivel TEXT NOT NULL CHECK (nivel IN ('positiva', 'nula')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Asegurar columnas e integridad referencial en incidencias (si no existen)
ALTER TABLE public.incidencias 
ADD COLUMN IF NOT EXISTS periodo_id UUID REFERENCES public.periodos_escolares(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias_incidencia(id) ON DELETE SET NULL;

-- 5. Asegurar políticas de seguridad de roles en PostgreSQL
ALTER ROLE anon NOBYPASSRLS;
ALTER ROLE authenticated NOBYPASSRLS;

