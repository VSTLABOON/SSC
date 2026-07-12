-- Script de Semillero (Seed) para el Sistema Conductual (SSC / EduTrack 360)
-- Inserta datos iniciales alineados 100% con las restricciones reales de la base de datos y formato UUID hexadecimal.

-- 1. Insertar Plantel por defecto
INSERT INTO public.planteles (id, nombre, clave_centro, estado, municipio, activo)
VALUES ('b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'CONALEP Plantel Puebla I', '21DPT0001G', 'Puebla', 'Puebla', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Insertar Período Escolar activo
INSERT INTO public.periodos_escolares (id, plantel_id, nombre, fecha_inicio, fecha_fin, activo)
VALUES ('a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre A-2026', '2026-02-01', '2026-07-31', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Insertar Categorías de Incidencia (sin columna descripcion, usando impacto_base)
INSERT INTO public.categorias_incidencia (id, plantel_id, nombre, color_semaforo, impacto_base)
VALUES
  ('c1a11111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Participación Activa', 'verde', 5),
  ('c2a22222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Llegada Tarde / Retardo', 'verde', -5),
  ('c3a33333-4444-5555-6666-777777777777', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Inconducta en Clase', 'naranja', -10),
  ('c4a44444-5555-6666-7777-888888888888', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Falta de Respeto Grave', 'rojo', -15)
ON CONFLICT (id) DO NOTHING;

-- 4. Insertar Carrera (Obligatorio para vincular grupos)
INSERT INTO public.carreras (id, plantel_id, nombre, clave)
VALUES ('c0000000-0000-0000-0000-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Informática', 'INFO-01')
ON CONFLICT (id) DO NOTHING;

-- 5. Insertar Grupos vinculados a carrera y período (turno char(1) 'M'/'V')
INSERT INTO public.grupos (id, plantel_id, periodo_id, carrera_id, nombre, semestre, turno)
VALUES
  ('11111111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'c0000000-0000-0000-0000-000000000000', 'SOMA-505', 5, 'M'),
  ('22222222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'c0000000-0000-0000-0000-000000000000', 'INFO-402', 4, 'V')
ON CONFLICT (id) DO NOTHING;

-- 6. Crear Cuentas de Acceso en Supabase Auth
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES
  ('d0000000-0000-0000-0000-000000000000', 'docente@conalep.edu.mx', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d1111111-1111-1111-1111-111111111111', 'director@conalep.edu.mx', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('d2222222-2222-2222-2222-222222222222', 'orientador@conalep.edu.mx', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('a0000000-0000-0000-0000-000000000000', 'alumno@conalep.edu.mx', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000000', 'padre@conalep.edu.mx', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- 7. Insertar Cuentas en la tabla pública de usuarios (relación 1:1 con Auth.Users)
INSERT INTO public.usuarios (id, plantel_id, nombre, apellido, email, rol)
VALUES
  ('d0000000-0000-0000-0000-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Prof. Francisco', 'Gómez', 'docente@conalep.edu.mx', 'docente'),
  ('d1111111-1111-1111-1111-111111111111', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Ing. Roberto', 'Hernández', 'director@conalep.edu.mx', 'directivo'),
  ('d2222222-2222-2222-2222-222222222222', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Lic. Sofía', 'Ramírez', 'orientador@conalep.edu.mx', 'orientador'),
  ('a0000000-0000-0000-0000-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Alejandro', 'López', 'alumno@conalep.edu.mx', 'alumno'),
  ('b0000000-0000-0000-0000-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Marta', 'López', 'padre@conalep.edu.mx', 'padre')
ON CONFLICT (id) DO NOTHING;

-- 8. Insertar Datos de Alumnos (vinculado a usuario_id y con tipo_alumno obligatorio)
INSERT INTO public.alumnos (id, usuario_id, grupo_id, matricula, tipo_alumno, puntos_totales)
VALUES ('a0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', '11111111-2222-3333-4444-555555555555', '202611029', 'Regular', 100)
ON CONFLICT (id) DO NOTHING;

-- 9. Insertar Contacto de Emergencia (tabla contactos_emergency y con campo es_primario)
INSERT INTO public.contactos_emergency (id, alumno_id, nombre, parentesco, telefono, es_primario)
VALUES ('e0000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Marta López', 'Madre', '222-123-4567', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Insertar Asignaturas / Materias
INSERT INTO public.materias (id, docente_id, grupo_id, nombre)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000000', '11111111-2222-3333-4444-555555555555', 'Programación de Aplicaciones Web'),
  ('22222222-2222-2222-2222-222222222222', 'd0000000-0000-0000-0000-000000000000', '22222222-3333-4444-5555-666666666666', 'Base de Datos Avanzada')
ON CONFLICT (id) DO NOTHING;

-- 11. Insertar Incidencias iniciales (columna registrado_por en vez de docente_id)
INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, descripcion, lugar, impacto_puntos, created_at)
VALUES
  ('11111111-1111-1111-1111-333333333333', 'a0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'c1a11111-2222-3333-4444-555555555555', 'Excelente desempeño y participación en la clase práctica de desarrollo web.', 'Aula 5', 5, now() - INTERVAL '3 days'),
  ('22222222-2222-2222-2222-333333333333', 'a0000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'c2a22222-3333-4444-5555-666666666666', 'Llegó 20 minutos tarde a la primera sesión de laboratorio.', 'Laboratorio 2', -5, now() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;
