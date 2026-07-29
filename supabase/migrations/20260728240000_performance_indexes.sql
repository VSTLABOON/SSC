-- ============================================================================
-- MIGRACIÓN MÓDULO BI: ÍNDICES COMPUESTOS DE RENDIMIENTO POSTGRESQL (SSC)
-- Acelera las consultas de cálculo de riesgo EWMA y agregaciones temporales
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidencias_alumno_created') THEN
    CREATE INDEX idx_incidencias_alumno_created ON public.incidencias(alumno_id, created_at ASC);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidencias_alumno_categoria') THEN
    CREATE INDEX idx_incidencias_alumno_categoria ON public.incidencias(alumno_id, categoria_id);
  END IF;
END $$;
