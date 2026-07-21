-- Migration: Attendance Redesign (3+3 buttons)
-- Adds structured retardo tracking, participation unique constraint, and evidence URL

-- 1. Add retardo boolean to asistencias for structured distinction
ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS retardo BOOLEAN NOT NULL DEFAULT false;

-- 2. Add justificante_url for evidence attachments on justified absences
ALTER TABLE public.asistencias
  ADD COLUMN IF NOT EXISTS justificante_url TEXT;

-- 3. Add unique constraint to participaciones to enable upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_participacion_dia'
  ) THEN
    ALTER TABLE public.participaciones
      ADD CONSTRAINT uq_participacion_dia UNIQUE (alumno_id, materia_id, fecha);
  END IF;
END $$;

-- 4. Expand the CHECK constraint on nivel to allow 'neutral'
ALTER TABLE public.participaciones
  DROP CONSTRAINT IF EXISTS participaciones_nivel_check;
ALTER TABLE public.participaciones
  ADD CONSTRAINT participaciones_nivel_check CHECK (nivel IN ('positiva', 'nula', 'neutral'));

-- 5. Create storage bucket for justificantes (evidence files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('justificantes', 'justificantes', false)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS policies for the justificantes bucket
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Docentes upload justificantes" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated read justificantes" ON storage.objects;

  -- Docentes and directivos can upload
  CREATE POLICY "Docentes upload justificantes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'justificantes'
    AND public.fn_get_auth_rol() IN ('docente', 'directivo', 'orientador')
  );

  -- Authenticated users can read justificantes
  CREATE POLICY "Authenticated read justificantes"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'justificantes'
  );
END $$;
