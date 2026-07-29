-- ============================================================================
-- MIGRACIÓN MÓDULO BI: HABILITAR SUPABASE REALTIME (WEBSOCKETS)
-- Añade las tablas public.incidencias y public.notificaciones a la publicación
-- supabase_realtime para permitir suscripciones push en vivo en el frontend.
-- ============================================================================

DO $$
BEGIN
  -- Agregar incidencias a la publicación de tiempo real si existe
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.incidencias;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
