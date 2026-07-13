-- =============================================================================
-- Script de Semillero (Seed) para el Sistema Conductual (SSC / EduTrack 360)
-- =============================================================================
--
-- IMPORTANTE: Este archivo solo semilla tablas publicas que NO dependen de
-- auth.users. Los usuarios de prueba DEBEN crearse mediante la Admin API
-- de Supabase Auth, ya que INSERT directo en auth.users omite tablas internas
-- (auth.identities, created_at, etc.) y provoca errores 500 en el login.
--
-- Despues de ejecutar este seed, corre el script de Node.js:
--
--   node frontend/src/seed_users.js
--
-- Ese script crea los 5 usuarios de prueba via la Admin API, les asigna
-- roles y activa sus cuentas, y luego inserta los datos dependientes
-- (alumnos, contactos, materias, incidencias).
-- =============================================================================

-- 1. Insertar Plantel por defecto
INSERT INTO public.planteles (id, nombre, clave_centro, estado, municipio, activo)
VALUES ('b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'CONALEP Plantel Puebla I', '21DPT0001G', 'Puebla', 'Puebla', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Periodo Escolar activo
INSERT INTO public.periodos_escolares (id, plantel_id, nombre, fecha_inicio, fecha_fin, activo)
VALUES ('a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre A-2026', '2026-02-01', '2026-07-31', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Categorias de Incidencia
--    Nota: "Llegada Tarde / Retardo" usa color 'naranja' (no 'verde').
INSERT INTO public.categorias_incidencia (id, plantel_id, nombre, color_semaforo, impacto_base)
VALUES
  ('c1a11111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Participacion Activa', 'verde', 5),
  ('c2a22222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Llegada Tarde / Retardo', 'naranja', -5),
  ('c3a33333-4444-5555-6666-777777777777', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Inconducta en Clase', 'naranja', -10),
  ('c4a44444-5555-6666-7777-888888888888', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Falta de Respeto Grave', 'rojo', -15)
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Carrera (obligatorio para vincular grupos)
INSERT INTO public.carreras (id, plantel_id, nombre, clave)
VALUES ('c0000000-0000-0000-0000-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Informatica', 'INFO-01')
ON CONFLICT (id) DO NOTHING;

-- 5. Insertar Grupos vinculados a carrera y periodo (turno char(1) 'M'/'V')
INSERT INTO public.grupos (id, plantel_id, periodo_id, carrera_id, nombre, semestre, turno)
VALUES
  ('11111111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'c0000000-0000-0000-0000-000000000000', 'SOMA-505', 5, 'M'),
  ('22222222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'c0000000-0000-0000-0000-000000000000', 'INFO-402', 4, 'V')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Las secciones 6-11 (usuarios auth, usuarios publicos, alumnos, contactos,
-- materias e incidencias) se manejan en el script:
--
--   node frontend/src/seed_users.js
--
-- Ese script usa la Admin API de Supabase para crear usuarios correctamente,
-- y luego inserta los datos dependientes via PostgREST.
-- =============================================================================
