-- =============================================================================
-- SEED DE DATOS EXTENSO Y REALISTA (SSC / EduTrack 360)
-- =============================================================================
-- Credenciales de prueba principales:
--   - Directivo:    director.gral@conalep.edu.mx      / 123456 (Roberto Hernandez)
--   - Docente:      docente.1@conalep.edu.mx          / 123456 (Francisco Gomez)
--   - Orientador:   orientador.1@conalep.edu.mx       / 123456 (Sofia Ramirez)
--   - Alumno Reg.:  student.1@conalep.edu.mx          / 123456 (Alejandro Lopez - Grupo INFO-201)
--   - Alumno Irreg: student.2@conalep.edu.mx          / 123456 (Tipo Alumno: Irregular)
--   - Alumno Crit.: student.50@conalep.edu.mx         / 123456 (Semaforo Rojo)
--   - Padre:        padre.1@conalep.edu.mx            / 123456 (Marta Lopez - Tutor de student.1)
--
-- Cuentas de pruebas limites adicionales:
--   - Pendiente:    pendiente.1@conalep.edu.mx        / 123456 (Rol: pendiente, activo: false)
--   - Inactivo:     inactivo.1@conalep.edu.mx         / 123456 (Rol: docente, activo: false)
--   - Bloqueado:    bloqueado.1@conalep.edu.mx        / 123456 (bloqueado_hasta activo)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- Paso 1: Limpieza de seed previo (evitar duplicados de conalep.edu.mx) ----
DELETE FROM auth.users WHERE email LIKE '%@conalep.edu.mx';

TRUNCATE TABLE public.seguimientos CASCADE;
TRUNCATE TABLE public.asistencias CASCADE;
TRUNCATE TABLE public.participaciones CASCADE;
TRUNCATE TABLE public.incidencias CASCADE;
TRUNCATE TABLE public.materias CASCADE;
TRUNCATE TABLE public.contactos_emergency CASCADE;
TRUNCATE TABLE public.padres_alumnos CASCADE;
TRUNCATE TABLE public.alumnos CASCADE;
TRUNCATE TABLE public.usuarios CASCADE;
TRUNCATE TABLE public.grupos CASCADE;
TRUNCATE TABLE public.carreras CASCADE;
TRUNCATE TABLE public.periodos_escolares CASCADE;
TRUNCATE TABLE public.categorias_incidencia CASCADE;
TRUNCATE TABLE public.planteles CASCADE;
TRUNCATE TABLE public.avisos CASCADE;
TRUNCATE TABLE public.insignias CASCADE;

-- ---- Paso 2: Helper SQL para crear usuarios en auth.users ----
CREATE OR REPLACE FUNCTION public.fn_seed_create_auth_user(
    p_id UUID,
    p_email TEXT,
    p_nombre TEXT,
    p_apellido TEXT,
    p_plantel_id UUID
) RETURNS VOID AS $$
BEGIN
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud, created_at, updated_at
    )
    VALUES (
        p_id, '00000000-0000-0000-0000-000000000000'::UUID, p_email,
        crypt('123456', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('nombre', p_nombre, 'apellido', p_apellido, 'plantel_id', p_plantel_id),
        false, 'authenticated', 'authenticated', NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE provider = 'email' AND provider_id = p_email) THEN
        INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, provider_id)
        VALUES (p_id::text, p_id, jsonb_build_object('sub', p_id, 'email', p_email), 'email', NOW(), NOW(), NOW(), p_email);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ---- Paso 3: Semillar planteles, periodos, carreras y categorias ----

-- Plantel
INSERT INTO public.planteles (id, nombre, clave_centro, estado, municipio, activo)
VALUES ('b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'CONALEP Plantel Puebla I', '21ETH0001Q', 'Puebla', 'Puebla', true);

-- Periodos (6 periodos)
INSERT INTO public.periodos_escolares (id, plantel_id, nombre, fecha_inicio, fecha_fin, activo)
VALUES 
  ('a3f12456-7c90-412f-8da1-ee0b15b3c5e2', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre A-2026', '2026-02-01', '2026-07-31', true),
  ('a3f12456-7c90-412f-8da1-ee0b15b3c5e3', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre B-2025', '2025-08-01', '2026-01-31', false),
  ('a3f12456-7c90-412f-8da1-ee0b15b3c5e4', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre A-2025', '2025-02-01', '2025-07-31', false),
  ('a3f12456-7c90-412f-8da1-ee0b15b3c5e5', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre B-2024', '2024-08-01', '2025-01-31', false),
  ('a3f12456-7c90-412f-8da1-ee0b15b3c5e6', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre A-2024', '2024-02-01', '2024-07-31', false),
  ('a3f12456-7c90-412f-8da1-ee0b15b3c5e7', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Semestre B-2023', '2023-08-01', '2024-01-31', false);

-- Carreras (5 carreras de CONALEP)
INSERT INTO public.carreras (id, plantel_id, nombre, clave)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Informatica', 'INFO-01'),
  ('c0000000-0000-0000-0000-000000000002', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Administracion', 'ADMN-02'),
  ('c0000000-0000-0000-0000-000000000003', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Contabilidad', 'CONT-03'),
  ('c0000000-0000-0000-0000-000000000004', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Mantenimiento Automotriz', 'MANT-04'),
  ('c0000000-0000-0000-0000-000000000005', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Enfermeria General', 'ENFE-05');

-- Categorías de Incidencia
INSERT INTO public.categorias_incidencia (id, plantel_id, nombre, color_semaforo, impacto_base)
VALUES
  ('c1a11111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Participacion Activa', 'verde', 5),
  ('c2a22222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Llegada Tarde / Retardo', 'naranja', -5),
  ('c3a33333-4444-5555-6666-777777777777', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Inconducta en Clase', 'naranja', -10),
  ('c4a44444-5555-6666-7777-888888888888', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Falta de Respeto Grave', 'rojo', -15),
  ('c5a55555-6666-7777-8888-999999999999', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Participacion Excepcional', 'verde', 15),
  ('c6a66666-7777-8888-9999-000000000000', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Falta Conductual Extrema', 'rojo', -20);

-- Insignias
INSERT INTO public.insignias (id, plantel_id, nombre, icono_url, puntos_requeridos)
VALUES
  ('i1a11111-2222-3333-4444-555555555555', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Alumno Ejemplar', 'star', 120),
  ('i2a22222-3333-4444-5555-666666666666', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Conducta Optima', 'verified', 110),
  ('i3a33333-4444-5555-6666-777777777777', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Participacion Constante', 'forum', 105),
  ('i4a44444-5555-6666-7777-888888888888', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Esfuerzo Sobresaliente', 'trending_up', 115),
  ('i5a55555-6666-7777-8888-999999999999', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'Compromiso Civico', 'diversity_3', 100);

-- ---- Paso 4: Creación de Grupos, Docentes, Estudiantes y Padres en PL/pgSQL ----
CREATE TEMP TABLE temp_active_grupos (id UUID, carrera_id UUID, semestre INT, turno CHAR(1));
CREATE TEMP TABLE temp_teachers (id UUID);
CREATE TEMP TABLE temp_alumnos (id UUID, grupo_id UUID, matricula TEXT, behavior_profile TEXT);
CREATE TEMP TABLE temp_materias (id UUID, grupo_id UUID, docente_id UUID, nombre TEXT);

DO $$
DECLARE
    v_carrera_rec RECORD;
    v_semestre INT;
    v_turno CHAR(1);
    v_grupo_id UUID;
    v_grupo_nombre TEXT;
BEGIN
    -- Semillar 30 Grupos Activos (5 carreras * 3 semestres * 2 turnos)
    FOR v_carrera_rec IN SELECT id, clave, nombre FROM public.carreras LOOP
        FOR v_semestre IN 2, 4, 6 LOOP
            FOR v_turno IN 'M', 'V' LOOP
                v_grupo_id := gen_random_uuid();
                v_grupo_nombre := SUBSTR(v_carrera_rec.clave, 1, 4) || '-' || (v_semestre || '0' || CASE WHEN v_turno = 'M' THEN '1' ELSE '2' END);
                
                INSERT INTO public.grupos (id, plantel_id, periodo_id, carrera_id, nombre, semestre, turno)
                VALUES (v_grupo_id, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', v_carrera_rec.id, v_grupo_nombre, v_semestre, v_turno);
                
                INSERT INTO temp_active_grupos (id, carrera_id, semestre, turno)
                VALUES (v_grupo_id, v_carrera_rec.id, v_semestre, v_turno);
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Generación de Docentes (50 usuarios)
DO $$
DECLARE
    nombres_m TEXT[] := ARRAY['Juan', 'Pedro', 'Jesus', 'Manuel', 'Santiago', 'Sebastian', 'Alejandro', 'Diego', 'Mateo', 'Angel', 'David', 'Daniel', 'Carlos', 'Luis', 'Javier', 'Miguel', 'Ricardo', 'Fernando', 'Jorge', 'Eduardo'];
    nombres_f TEXT[] := ARRAY['Maria', 'Guadalupe', 'Sofia', 'Valentina', 'Isabella', 'Camila', 'Andrea', 'Mariana', 'Gabriela', 'Alejandra', 'Daniela', 'Fernanda', 'Ana', 'Lucia', 'Regina', 'Valeria', 'Natalia', 'Ximena', 'Elizabeth', 'Juana'];
    apellidos TEXT[] := ARRAY['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Rodriguez', 'Sanchez', 'Ramirez', 'Cruz', 'Gomez', 'Flores', 'Morales', 'Vazquez', 'Jimenez', 'Reyes', 'Diaz', 'Torres', 'Gutierrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Mendez', 'Salazar', 'Castillo'];
    v_nombre TEXT;
    v_apellido TEXT;
    v_email TEXT;
    v_id UUID;
    v_idx INT;
    v_cargo TEXT;
    cargos TEXT[] := ARRAY['Docente Titular A', 'Docente Asociado B', 'Coordinador de Area', 'Docente de Asignatura', 'Instructor Tecnico'];
BEGIN
    FOR v_idx IN 1..50 LOOP
        v_id := gen_random_uuid();
        -- Docente 1 por defecto ( Francisco Gomez )
        IF v_idx = 1 THEN
            v_id := 'f1d22222-3333-4444-5555-666666666666';
            v_nombre := 'Francisco';
            v_apellido := 'Gomez';
            v_email := 'docente.1@conalep.edu.mx';
            v_cargo := 'Docente Titular de Informatica';
        ELSE
            v_nombre := CASE WHEN random() > 0.5 THEN nombres_m[floor(random() * array_length(nombres_m, 1) + 1)] ELSE nombres_f[floor(random() * array_length(nombres_f, 1) + 1)] END;
            v_apellido := apellidos[floor(random() * array_length(apellidos, 1) + 1)] || ' ' || apellidos[floor(random() * array_length(apellidos, 1) + 1)];
            v_email := 'docente.' || v_idx || '@conalep.edu.mx';
            v_cargo := cargos[floor(random() * array_length(cargos, 1) + 1)];
        END IF;
        
        PERFORM public.fn_seed_create_auth_user(v_id, v_email, v_nombre, v_apellido, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
        
        UPDATE public.usuarios 
        SET rol = 'docente', activo = true, cargo = v_cargo
        WHERE id = v_id;
        
        INSERT INTO temp_teachers (id) VALUES (v_id);
    END LOOP;
END $$;

-- Generación de Directivos y Orientadores
DO $$
DECLARE
    v_id UUID;
BEGIN
    -- Directivo 1 (director@conalep.edu.mx)
    v_id := 'd1a11111-2222-3333-4444-555555555555';
    PERFORM public.fn_seed_create_auth_user(v_id, 'director.gral@conalep.edu.mx', 'Roberto', 'Hernandez', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
    UPDATE public.usuarios SET rol = 'directivo', activo = true, cargo = 'Director General' WHERE id = v_id;
    
    -- Directivo 2
    v_id := gen_random_uuid();
    PERFORM public.fn_seed_create_auth_user(v_id, 'subdirector.acad@conalep.edu.mx', 'Guillermo', 'Sosa', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
    UPDATE public.usuarios SET rol = 'directivo', activo = true, cargo = 'Subdirector Academico' WHERE id = v_id;

    -- Orientador 1 (orientador.1@conalep.edu.mx)
    v_id := 'o1a11111-2222-3333-4444-555555555555';
    PERFORM public.fn_seed_create_auth_user(v_id, 'orientador.1@conalep.edu.mx', 'Sofia', 'Ramirez', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
    UPDATE public.usuarios SET rol = 'orientador', activo = true, cargo = 'Orientador Turno Matutino' WHERE id = v_id;
    
    -- Orientador 2 (Turno Vespertino)
    v_id := gen_random_uuid();
    PERFORM public.fn_seed_create_auth_user(v_id, 'orientador.2@conalep.edu.mx', 'Javier', 'Ortega', 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
    UPDATE public.usuarios SET rol = 'orientador', activo = true, cargo = 'Orientador Turno Vespertino' WHERE id = v_id;
END $$;

-- Generación de Materias (Asignadas a los 30 grupos, 5 materias c/u)
-- Case 4: docente.1 enseña en múltiples carreras (Informatica y Administracion) y turnos (Matutino y Vespertino)
DO $$
DECLARE
    v_grupo_rec RECORD;
    v_carrera_rec RECORD;
    v_materia_names TEXT[];
    v_materia_name TEXT;
    v_docente_id UUID;
    v_materia_id UUID;
    v_idx INT;
    v_teacher_compartido_id UUID;
BEGIN
    SELECT id INTO v_teacher_compartido_id FROM temp_teachers LIMIT 1;
    
    FOR v_grupo_rec IN SELECT id, carrera_id, nombre, semestre, turno FROM public.grupos LOOP
        SELECT nombre INTO v_carrera_rec FROM public.carreras WHERE id = v_grupo_rec.carrera_id;
        
        IF v_carrera_rec.nombre = 'Informatica' THEN
            v_materia_names := ARRAY['Programacion Orientada a Objetos', 'Diseno de Paginas Web', 'Redes de Computadoras', 'Sistemas Operativos', 'Bases de Datos Relacionales'];
        ELSIF v_carrera_rec.nombre = 'Administracion' THEN
            v_materia_names := ARRAY['Administracion de Recursos Humanos', 'Mercadotecnia Estrategica', 'Contabilidad Basica', 'Procesos Administrativos', 'Gestion de Calidad'];
        ELSIF v_carrera_rec.nombre = 'Contabilidad' THEN
            v_materia_names := ARRAY['Auditoria Gubernamental', 'Calculo de Impuestos', 'Contabilidad de Costos', 'Finanzas Corporativas', 'Derecho Mercantil'];
        ELSIF v_carrera_rec.nombre = 'Mantenimiento Automotriz' THEN
            v_materia_names := ARRAY['Sistemas del Motor', 'Mecanica de Combustion', 'Sistemas de Suspension', 'Electricidad Automotriz', 'Diagnostico Computarizado'];
        ELSE -- Enfermeria
            v_materia_names := ARRAY['Fundamentos de Enfermeria', 'Anatomia y Fisiologia', 'Salud Publica', 'Farmacologia Clinica', 'Enfermeria Pediatrica'];
        END IF;
        
        FOR v_idx IN 1..5 LOOP
            v_materia_name := v_materia_names[v_idx];
            v_materia_id := gen_random_uuid();
            
            -- Asignación del Docente Compartido (Francisco Gomez)
            -- Asignado a la materia 1 de Informática Turno Matutino y a la materia 1 de Administración Turno Vespertino
            IF v_idx = 1 AND (
                (v_carrera_rec.nombre = 'Informatica' AND v_grupo_rec.turno = 'M') OR 
                (v_carrera_rec.nombre = 'Administracion' AND v_grupo_rec.turno = 'V')
            ) THEN
                v_docente_id := v_teacher_compartido_id;
            ELSE
                SELECT id INTO v_docente_id FROM temp_teachers ORDER BY random() LIMIT 1;
            END IF;
            
            INSERT INTO public.materias (id, grupo_id, docente_id, nombre)
            VALUES (v_materia_id, v_grupo_rec.id, v_docente_id, v_materia_name);
            
            INSERT INTO temp_materias (id, grupo_id, docente_id, nombre)
            VALUES (v_materia_id, v_grupo_rec.id, v_docente_id, v_materia_name);
        END LOOP;
    END LOOP;
END $$;

-- Generación de Alumnos y Padres (744 alumnos totales)
DO $$
DECLARE
    nombres_m TEXT[] := ARRAY['Juan', 'Pedro', 'Jesus', 'Manuel', 'Santiago', 'Sebastian', 'Alejandro', 'Diego', 'Mateo', 'Angel', 'David', 'Daniel', 'Carlos', 'Luis', 'Javier', 'Miguel', 'Ricardo', 'Fernando', 'Jorge', 'Eduardo'];
    nombres_f TEXT[] := ARRAY['Maria', 'Guadalupe', 'Sofia', 'Valentina', 'Isabella', 'Camila', 'Andrea', 'Mariana', 'Gabriela', 'Alejandra', 'Daniela', 'Fernanda', 'Ana', 'Lucia', 'Regina', 'Valeria', 'Natalia', 'Ximena', 'Elizabeth', 'Juana'];
    apellidos TEXT[] := ARRAY['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Rodriguez', 'Sanchez', 'Ramirez', 'Cruz', 'Gomez', 'Flores', 'Morales', 'Vazquez', 'Jimenez', 'Reyes', 'Diaz', 'Torres', 'Gutierrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Mendez', 'Salazar', 'Castillo'];
    v_grupo_rec RECORD;
    v_student_idx INT := 0;
    v_alumnos_por_grupo INT;
    v_alumno_id UUID;
    v_nombre TEXT;
    v_apellido TEXT;
    v_email TEXT;
    v_matricula TEXT;
    v_tipo_alumno TEXT;
    v_generacion TEXT;
    v_tipo_sangre TEXT;
    v_alergias TEXT;
    v_parent_id UUID;
    v_parent_nombre TEXT;
    v_parent_apellido TEXT;
    v_parent_email TEXT;
    v_behavior_profile TEXT;
    v_sangre_types TEXT[] := ARRAY['O+', 'A+', 'B+', 'O-', NULL];
    v_alergias_types TEXT[] := ARRAY['Ninguna', 'Polen', 'Penicilina', NULL];
BEGIN
    FOR v_grupo_rec IN SELECT id, nombre, semestre FROM public.grupos LOOP
        -- Case 3: Pequeño (6) vs Lleno (38) vs Regular (25)
        IF v_grupo_rec.nombre LIKE '%-201%' AND v_grupo_rec.nombre LIKE 'INFO%' THEN
            v_alumnos_por_grupo := 6;
        ELSIF v_grupo_rec.nombre LIKE '%-202%' AND v_grupo_rec.nombre LIKE 'INFO%' THEN
            v_alumnos_por_grupo := 38;
        ELSE
            v_alumnos_por_grupo := 25;
        END IF;
        
        FOR v_idx IN 1..v_alumnos_por_grupo LOOP
            v_student_idx := v_student_idx + 1;
            v_alumno_id := gen_random_uuid();
            v_nombre := CASE WHEN random() > 0.5 THEN nombres_m[floor(random() * array_length(nombres_m, 1) + 1)] ELSE nombres_f[floor(random() * array_length(nombres_f, 1) + 1)] END;
            v_apellido := apellidos[floor(random() * array_length(apellidos, 1) + 1)] || ' ' || apellidos[floor(random() * array_length(apellidos, 1) + 1)];
            
            -- Alumno 1 por defecto ( Alejandro Lopez )
            IF v_student_idx = 1 THEN
                v_alumno_id := '1a111111-2222-3333-4444-555555555555';
                v_email := 'student.1@conalep.edu.mx';
                v_nombre := 'Alejandro';
                v_apellido := 'Lopez';
                v_tipo_alumno := 'Regular';
            ELSIF v_student_idx = 2 THEN
                -- Case 2: Alumno irregular
                v_email := 'student.2@conalep.edu.mx';
                v_tipo_alumno := 'Irregular';
            ELSE
                v_email := 'student.' || v_student_idx || '@conalep.edu.mx';
                v_tipo_alumno := 'Regular';
            END IF;
            
            v_matricula := '26' || lpad(v_student_idx::text, 7, '0');
            v_generacion := CASE v_grupo_rec.semestre 
                WHEN 2 THEN '2025-2028' 
                WHEN 4 THEN '2024-2027' 
                ELSE '2023-2026' 
            END;
            
            v_tipo_sangre := v_sangre_types[floor(random() * array_length(v_sangre_types, 1) + 1)];
            v_alergias := v_alergias_types[floor(random() * array_length(v_alergias_types, 1) + 1)];
            
            -- Case 6: Alergias y tipo sangre llenos (student.1) vs nulos (student.3)
            IF v_student_idx = 1 THEN
                v_tipo_sangre := 'O+';
                v_alergias := 'Ninguna';
            ELSIF v_student_idx = 3 THEN
                v_tipo_sangre := NULL;
                v_alergias := NULL;
            END IF;
            
            PERFORM public.fn_seed_create_auth_user(v_alumno_id, v_email, v_nombre, v_apellido, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
            
            UPDATE public.usuarios 
            SET rol = 'alumno', activo = true, cargo = 'Estudiante'
            WHERE id = v_alumno_id;
            
            INSERT INTO public.alumnos (
                id, usuario_id, grupo_id, matricula, generacion, tipo_alumno, 
                correo_institucional, correo_personal_enc, telefono_enc, tipo_sangre, alergias, puntos_totales, nivel_semaforo
            )
            VALUES (
                v_alumno_id, v_alumno_id, v_grupo_rec.id, v_matricula, v_generacion, v_tipo_alumno,
                v_email, 'personal.' || v_student_idx || '@gmail.com', '2221234567', v_tipo_sangre, v_alergias, 100, 'verde'
            );
            
            -- Perfil conductual (para la curva del semáforo: 55% verde, 30% naranja, 15% rojo)
            v_behavior_profile := CASE 
                WHEN v_student_idx = 1 THEN 'Verde' -- Caso 1: Cero incidencias
                WHEN v_student_idx % 10 IN (0, 1) THEN 'Rojo'
                WHEN v_student_idx % 10 IN (2, 3, 4) THEN 'Naranja'
                ELSE 'Verde'
            END;
            
            -- student.50 es forzado a ser Rojo para tener un alumno crítico de prueba
            IF v_student_idx = 50 THEN
                v_behavior_profile := 'Rojo';
            END IF;
            
            INSERT INTO temp_alumnos (id, grupo_id, matricula, behavior_profile)
            VALUES (v_alumno_id, v_grupo_rec.id, v_matricula, v_behavior_profile);
            
            INSERT INTO public.contactos_emergency (id, alumno_id, nombre, parentesco, telefono, es_primario)
            VALUES (
                gen_random_uuid(), v_alumno_id, 
                apellidos[floor(random() * array_length(apellidos, 1) + 1)] || ' ' || apellidos[floor(random() * array_length(apellidos, 1) + 1)],
                CASE WHEN random() > 0.5 THEN 'Madre' ELSE 'Padre' END,
                '222' || lpad((floor(random()*9000000)+1000000)::text, 7, '0'),
                true
            );
            
            -- Asignación de Padres (Case 5: Hermanos compartiendo tutor)
            IF v_student_idx = 1 THEN
                v_parent_id := '5a555555-6666-7777-8888-999999999999';
                v_parent_nombre := 'Marta';
                v_parent_apellido := 'Lopez';
                v_parent_email := 'padre.1@conalep.edu.mx';
                
                PERFORM public.fn_seed_create_auth_user(v_parent_id, v_parent_email, v_parent_nombre, v_parent_apellido, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
                UPDATE public.usuarios SET rol = 'padre', activo = true, cargo = 'Tutor' WHERE id = v_parent_id;
            ELSIF v_student_idx % 15 = 0 AND v_student_idx > 1 THEN
                -- Se rehusa el tutor del estudiante anterior (simula hermanos)
            ELSE
                v_parent_id := gen_random_uuid();
                v_parent_nombre := CASE WHEN random() > 0.5 THEN nombres_m[floor(random() * array_length(nombres_m, 1) + 1)] ELSE nombres_f[floor(random() * array_length(nombres_f, 1) + 1)] END;
                v_parent_apellido := v_apellido;
                v_parent_email := 'padre.' || v_student_idx || '@conalep.edu.mx';
                
                PERFORM public.fn_seed_create_auth_user(v_parent_id, v_parent_email, v_parent_nombre, v_parent_apellido, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
                UPDATE public.usuarios SET rol = 'padre', activo = true, cargo = 'Tutor' WHERE id = v_parent_id;
            END IF;
            
            INSERT INTO public.padres_alumnos (padre_id, alumno_id, parentesco, notificaciones_activas)
            VALUES (v_parent_id, v_alumno_id, 'Tutor', true)
            ON CONFLICT (padre_id, alumno_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- ---- Paso 5: Generación de Incidencias y Participaciones orgánicas ----
--      (Los triggers calcularán el puntaje acumulado y el color del semáforo automáticamente)
DO $$
DECLARE
    v_alumno RECORD;
    v_materia RECORD;
    v_inc_desc_verde TEXT[] := ARRAY[
        'Participo de forma sobresaliente en el debate de etica y tecnologia.',
        'Apoyo de manera proactiva en la organizacion del laboratorio de computo.',
        'Mostro gran iniciativa al resolver el problema de logica planteado en clase.',
        'Excelente desempeno en el trabajo en equipo de desarrollo de sistemas.',
        'Entrego todas las tareas de la semana con excelente presentacion y limpieza.'
    ];
    v_inc_desc_naranja TEXT[] := ARRAY[
        'Llego tarde a la clase de Bases de Datos por segunda vez en la semana.',
        'Se distrajo de forma recurrente con el celular durante la explicacion del tema.',
        'No trajo el material de trabajo requerido para la sesion de laboratorio.',
        'Salio del salon de clases sin autorizacion del docente durante el ejercicio practico.',
        'Llego tarde a la primera sesion de la mañana por problemas de transporte.'
    ];
    v_inc_desc_roja TEXT[] := ARRAY[
        'Falta de respeto grave hacia el docente al ser cuestionado por su tarea.',
        'Uso lenguaje inapropiado y altisonante durante la discusion en el aula.',
        'Falto al respeto a un compañero de clase de manera verbal y agresiva.',
        'Salio del aula de forma agresiva y azoto la puerta tras una llamada de atencion.',
        'Se nego rotundamente a seguir las indicaciones de seguridad en el taller.'
    ];
    v_date DATE;
    v_cat_id UUID;
    v_impacto INT;
BEGIN
    FOR v_alumno IN SELECT id, grupo_id, behavior_profile FROM temp_alumnos LOOP
        -- Caso 1: student.1 con CERO incidencias y participaciones
        IF v_alumno.id = '1a111111-2222-3333-4444-555555555555'::UUID THEN
            CONTINUE;
        END IF;

        IF v_alumno.behavior_profile = 'Verde' THEN
            -- 50% de probabilidad de tener una participación positiva
            IF random() > 0.5 THEN
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                
                INSERT INTO public.participaciones (id, alumno_id, materia_id, registrado_por, periodo_id, fecha, nivel, impacto_puntos, observacion, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.id, v_materia.docente_id, 
                    'a3f12456-7c90-412f-8da1-ee0b15b3c5e2', v_date, 'positiva', 5, 
                    v_inc_desc_verde[floor(random() * array_length(v_inc_desc_verde, 1) + 1)],
                    v_date + TIME '10:00:00'
                );
            END IF;
            
        ELSIF v_alumno.behavior_profile = 'Naranja' THEN
            -- 2 incidencias conductuales medias para llevar el semáforo a naranja (85 puntos)
            -- 1. Retardo (-5)
            SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
            v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
            INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
            VALUES (
                gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                'c2a22222-3333-4444-5555-666666666666', v_materia.id, 
                v_inc_desc_naranja[floor(random() * array_length(v_inc_desc_naranja, 1) + 1)],
                'Aula de Clase', -5, v_date + TIME '08:00:00'
            );
            
            -- 2. Inconducta (-10)
            SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
            v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
            INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
            VALUES (
                gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                'c3a33333-4444-5555-6666-777777777777', v_materia.id, 
                'Inconducta: ' || v_inc_desc_naranja[floor(random() * array_length(v_inc_desc_naranja, 1) + 1)],
                'Aula de Clase', -10, v_date + TIME '11:00:00'
            );
            
        ELSIF v_alumno.behavior_profile = 'Rojo' THEN
            -- Múltiples incidencias graves para llevar el semáforo a rojo (< 60 puntos)
            IF random() > 0.5 THEN
                -- 1) Retardo (-5)
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c2a22222-3333-4444-5555-666666666666', v_materia.id, 'Llego tarde', 'Aula', -5, v_date + TIME '08:00:00'
                );
                
                -- 2) Inconducta (-10)
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c3a33333-4444-5555-6666-777777777777', v_materia.id, 'Inconducta en el aula', 'Aula', -10, v_date + TIME '10:00:00'
                );
                
                -- 3) Falta grave (-15)
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c4a44444-5555-6666-7777-888888888888', v_materia.id, v_inc_desc_roja[floor(random() * array_length(v_inc_desc_roja, 1) + 1)], 'Aula', -15, v_date + TIME '13:00:00'
                );
                
                -- 4) Falta grave adicional (-15) para forzar rojo a 55 puntos
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c4a44444-5555-6666-7777-888888888888', v_materia.id, 'Segunda falta conductual grave en pasillos', 'Pasillos', -15, v_date + TIME '14:30:00'
                );
            ELSE
                -- 1 Falta conductual extrema (-20) y 1 inconducta (-10) y 1 falta grave (-15) -> 55 puntos
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c6a66666-7777-8888-9999-000000000000', v_materia.id, 'Falta extrema conductual: ' || v_inc_desc_roja[floor(random() * array_length(v_inc_desc_roja, 1) + 1)], 'Taller', -20, v_date + TIME '09:00:00'
                );
                
                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c3a33333-4444-5555-6666-777777777777', v_materia.id, 'Inconducta en taller', 'Taller', -10, v_date + TIME '11:00:00'
                );

                SELECT id, docente_id INTO v_materia FROM temp_materias WHERE grupo_id = v_alumno.grupo_id ORDER BY random() LIMIT 1;
                v_date := CURRENT_DATE - (floor(random() * 60) || ' days')::INTERVAL;
                INSERT INTO public.incidencias (id, alumno_id, registrado_por, periodo_id, categoria_id, materia_id, descripcion, lugar, impacto_puntos, created_at)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.docente_id, 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2',
                    'c4a44444-5555-6666-7777-888888888888', v_materia.id, 'Falta verbal grave', 'Taller', -15, v_date + TIME '12:30:00'
                );
            END IF;
        END IF;
    END LOOP;
END $$;

-- ---- Paso 6: Generación de Asistencias (15 días de clases por alumno) ----
DO $$
DECLARE
    v_alumno RECORD;
    v_materia RECORD;
    v_date DATE;
    v_presente BOOLEAN;
    v_absentee_rate FLOAT;
    v_days INT;
BEGIN
    FOR v_alumno IN SELECT id, grupo_id FROM temp_alumnos LOOP
        -- Tasa de ausentismo aleatoria entre 3% y 12%
        v_absentee_rate := 0.03 + (random() * 0.09);
        
        FOR v_materia IN SELECT id FROM temp_materias WHERE grupo_id = v_alumno.grupo_id LOOP
            FOR v_days IN 1..15 LOOP
                -- Fecha secuencial del mes de marzo
                v_date := DATE '2026-03-01' + (v_days || ' days')::INTERVAL;
                
                v_presente := (random() > v_absentee_rate);
                
                INSERT INTO public.asistencias (id, alumno_id, materia_id, fecha, presente, justificada, observaciones)
                VALUES (
                    gen_random_uuid(), v_alumno.id, v_materia.id, v_date, 
                    v_presente, 
                    CASE WHEN NOT v_presente AND random() > 0.7 THEN true ELSE false END,
                    CASE WHEN NOT v_presente THEN 'Ausencia reportada' ELSE NULL END
                )
                ON CONFLICT (alumno_id, materia_id, fecha) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Case 9: Forzar duplicación de asistencia para verificar que ON CONFLICT no rompa la ejecución del seed
DO $$
DECLARE
    v_alumno_id UUID;
    v_materia_id UUID;
BEGIN
    SELECT id, grupo_id INTO v_alumno_id FROM temp_alumnos LIMIT 1;
    SELECT id INTO v_materia_id FROM temp_materias WHERE grupo_id = (SELECT grupo_id FROM temp_alumnos WHERE id = v_alumno_id) LIMIT 1;
    
    -- Insertar primera
    INSERT INTO public.asistencias (id, alumno_id, materia_id, fecha, presente)
    VALUES (gen_random_uuid(), v_alumno_id, v_materia_id, '2026-03-20', true)
    ON CONFLICT (alumno_id, materia_id, fecha) DO NOTHING;
    
    -- Insertar duplicado (debería ignorarse limpiamente)
    INSERT INTO public.asistencias (id, alumno_id, materia_id, fecha, presente)
    VALUES (gen_random_uuid(), v_alumno_id, v_materia_id, '2026-03-20', false)
    ON CONFLICT (alumno_id, materia_id, fecha) DO NOTHING;
END $$;

-- ---- Paso 7: Generación de Seguimientos de Orientación ----
DO $$
DECLARE
    v_alumno RECORD;
    v_orientador_id UUID;
    v_seguimiento_count INT := 0;
    v_notas TEXT[] := ARRAY[
        'Se cito al padre de familia para discutir el rendimiento conductual del alumno.',
        'Se realizo entrevista individual con el alumno para tratar su conducta en clase.',
        'El orientador hace un llamado de atencion sobre retardos constantes.',
        'El alumno muestra compromiso de mejorar su asistencia y participacion.',
        'Se firma carta compromiso con el tutor y el alumno.'
    ];
BEGIN
    SELECT id INTO v_orientador_id FROM public.usuarios WHERE rol = 'orientador' ORDER BY random() LIMIT 1;
    
    -- Generar 120 seguimientos conductuales dirigidos a alumnos críticos (naranja/rojo)
    FOR v_alumno IN SELECT id FROM temp_alumnos WHERE behavior_profile IN ('Rojo', 'Naranja') LOOP
        FOR v_idx IN 1..2 LOOP
            v_seguimiento_count := v_seguimiento_count + 1;
            INSERT INTO public.seguimientos (id, alumno_id, orientador_id, nota, tipo, created_at)
            VALUES (
                gen_random_uuid(), v_alumno.id, v_orientador_id,
                v_notas[floor(random() * array_length(v_notas, 1) + 1)] || ' (Seguimiento ' || v_seguimiento_count || ')',
                CASE WHEN random() > 0.5 THEN 'Entrevista' ELSE 'Citatorio' END,
                NOW() - (v_seguimiento_count || ' hours')::INTERVAL
            );
            EXIT WHEN v_seguimiento_count >= 120;
        END LOOP;
        EXIT WHEN v_seguimiento_count >= 120;
    END LOOP;
END $$;

-- ---- Paso 8: Generación de Avisos del Plantel ----
DO $$
DECLARE
    v_director_id UUID;
    v_avisos TEXT[][] := ARRAY[
        ARRAY['Reunion de Consejo Tecnico Escolar', 'Estimados docentes, se les convoca a la sesion ordinaria del CTE el proximo viernes.', 'docentes'],
        ARRAY['Entrega de Reportes del Primer Parcial', 'Padres de familia, los reportes de evaluacion del primer parcial estaran disponibles para su consulta fisica en el plantel.', 'padres'],
        ARRAY['Campaña de Vacunacion y Salud', 'Se realizara una jornada de vacunacion en el plantel para todos los alumnos. Traer cartilla de vacunacion.', 'todos'],
        ARRAY['Convocatoria de Becas CONALEP', 'Se abre el registro para las becas de excelencia y apoyo socioeconomico. Consultar bases en direccion.', 'todos'],
        ARRAY['Charla de Prevencion y Convivencia', 'Se convoca a los alumnos con incidencias recurrentes a la plática de cultura de paz en la biblioteca.', 'semaforo_naranja'],
        ARRAY['Taller de Regularizacion Conductual Urgente', 'Cita obligatoria para alumnos en semaforo critico y sus respectivos tutores.', 'semaforo_rojo'],
        ARRAY['Suspension de Labores por Festivo', 'Se informa que el proximo lunes se suspenderan las labores escolares por dia festivo oficial.', 'todos'],
        ARRAY['Concurso de Informatica y Diseno Web', 'Participa en el torneo anual de desarrollo web. Inscripciones abiertas con tu jefe de carrera.', 'todos'],
        ARRAY['Simulacro Nacional de Proteccion Civil', 'Se llevara a cabo el simulacro de evacuacion a las 11:00 AM. Favor de seguir las rutas de evacuacion.', 'todos'],
        ARRAY['Citatorio Urgente de Orientacion', 'Atencion orientadores, se les solicita informe de seguimientos de alumnos en semaforo rojo.', 'docentes']
    ];
    v_idx INT;
    v_aviso_data TEXT[];
BEGIN
    SELECT id INTO v_director_id FROM public.usuarios WHERE rol = 'directivo' LIMIT 1;
    
    FOR v_idx IN 1..20 LOOP
        v_aviso_data := v_avisos[(v_idx % 10) + 1];
        INSERT INTO public.avisos (id, plantel_id, creado_por, titulo, descripcion, fecha_evento, dirigido_a, activo)
        VALUES (
            gen_random_uuid(), 'b5cde2a6-38d5-450f-90db-3367c3bb1b51', v_director_id,
            v_aviso_data[1] || ' (Aviso ' || v_idx || ')',
            v_aviso_data[2],
            CURRENT_DATE + ((v_idx - 10) || ' days')::INTERVAL,
            v_aviso_data[3],
            true
        );
    END LOOP;
END $$;

-- ---- Paso 9: Inserción de Casos Límite de Acceso y Activación ----
DO $$
DECLARE
    v_id UUID;
    v_idx INT;
BEGIN
    -- 7 Cuentas en estado Pendiente
    FOR v_idx IN 1..7 LOOP
        v_id := gen_random_uuid();
        PERFORM public.fn_seed_create_auth_user(v_id, 'pendiente.' || v_idx || '@conalep.edu.mx', 'Usuario', 'Pendiente ' || v_idx, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
    END LOOP;

    -- 4 Cuentas Desactivadas (activo = false)
    FOR v_idx IN 1..4 LOOP
        v_id := gen_random_uuid();
        PERFORM public.fn_seed_create_auth_user(v_id, 'inactivo.' || v_idx || '@conalep.edu.mx', 'Usuario', 'Inactivo ' || v_idx, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
        UPDATE public.usuarios SET rol = 'docente', activo = false WHERE id = v_id;
    END LOOP;

    -- 3 Cuentas Bloqueadas temporalmente (bloqueado_hasta activo)
    FOR v_idx IN 1..3 LOOP
        v_id := gen_random_uuid();
        PERFORM public.fn_seed_create_auth_user(v_id, 'bloqueado.' || v_idx || '@conalep.edu.mx', 'Usuario', 'Bloqueado ' || v_idx, 'b5cde2a6-38d5-450f-90db-3367c3bb1b51');
        UPDATE public.usuarios SET rol = 'docente', activo = true, intentos_fallidos = 5, bloqueado_hasta = NOW() + INTERVAL '1 hour' WHERE id = v_id;
    END LOOP;
END $$;

-- ---- Paso 10: Consultas de Verificación y Resumen del Seed ----
SELECT '=== CONTEO DE REGISTROS POR TABLA ===' AS reporte;
SELECT 
  (SELECT COUNT(*) FROM public.planteles) AS planteles,
  (SELECT COUNT(*) FROM public.periodos_escolares) AS periodos_escolares,
  (SELECT COUNT(*) FROM public.carreras) AS carreras,
  (SELECT COUNT(*) FROM public.grupos) AS grupos,
  (SELECT COUNT(*) FROM public.usuarios) AS usuarios,
  (SELECT COUNT(*) FROM public.alumnos) AS alumnos,
  (SELECT COUNT(*) FROM public.padres_alumnos) AS padres_vinculados,
  (SELECT COUNT(*) FROM public.materias) AS materias,
  (SELECT COUNT(*) FROM public.asistencias) AS asistencias,
  (SELECT COUNT(*) FROM public.participaciones) AS participaciones,
  (SELECT COUNT(*) FROM public.incidencias) AS incidencias,
  (SELECT COUNT(*) FROM public.seguimientos) AS seguimientos_orientacion,
  (SELECT COUNT(*) FROM public.avisos) AS avisos_plantel,
  (SELECT COUNT(*) FROM public.insignias) AS insignias;

SELECT '=== DISTRIBUCION REAL DEL SEMAFORO ===' AS reporte;
SELECT 
  nivel_semaforo, 
  COUNT(*) AS cantidad, 
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM public.alumnos) * 100, 2) || '%' AS porcentaje
FROM public.alumnos
GROUP BY nivel_semaforo;

SELECT '=== TOP 5 ALUMNOS CON MAS INCIDENCIAS ===' AS reporte;
SELECT 
  a.matricula, 
  u.nombre || ' ' || u.apellido AS alumno, 
  a.puntos_totales,
  a.nivel_semaforo,
  COUNT(i.id) AS total_incidencias
FROM public.alumnos a
JOIN public.usuarios u ON u.id = a.id
LEFT JOIN public.incidencias i ON i.alumno_id = a.id
GROUP BY a.matricula, u.nombre, u.apellido, a.puntos_totales, a.nivel_semaforo
ORDER BY total_incidencias DESC
LIMIT 5;

SELECT '=== USUARIOS PENDIENTES, INACTIVOS Y BLOQUEADOS ===' AS reporte;
SELECT email, rol, activo, intentos_fallidos, bloqueado_hasta
FROM public.usuarios
WHERE email LIKE 'pendiente.%' OR email LIKE 'inactivo.%' OR email LIKE 'bloqueado.%'
ORDER BY email;
