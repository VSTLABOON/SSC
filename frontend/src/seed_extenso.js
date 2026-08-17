// =============================================================================
// seed_extenso.js - Semillado Masivo y Realista 360° para SSC (Optimizacion Total)
// =============================================================================
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envSup = fs.readFileSync('c:\\Users\\User\\Documents\\SSC\\.env_Sup', 'utf8');
const SUPABASE_URL = envSup.match(/SUPABASE_URL=(.+)/)[1].trim();
const SERVICE_KEY  = envSup.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PLANTEL_ID = 'b5cde2a6-38d5-450f-90db-3367c3bb1b51';
const PERIODO_ACTIVO_ID = 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2';

const nombres_m = ['Juan', 'Pedro', 'Jesus', 'Manuel', 'Santiago', 'Sebastian', 'Alejandro', 'Diego', 'Mateo', 'Angel', 'David', 'Daniel', 'Carlos', 'Luis', 'Javier', 'Miguel', 'Ricardo', 'Fernando', 'Jorge', 'Eduardo'];
const nombres_f = ['Maria', 'Guadalupe', 'Sofia', 'Valentina', 'Isabella', 'Camila', 'Andrea', 'Mariana', 'Gabriela', 'Alejandra', 'Daniela', 'Fernanda', 'Ana', 'Lucia', 'Regina', 'Valeria', 'Natalia', 'Ximena', 'Elizabeth', 'Juana'];
const apellidos = ['Hernandez', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Rodriguez', 'Sanchez', 'Ramirez', 'Cruz', 'Gomez', 'Flores', 'Morales', 'Vazquez', 'Jimenez', 'Reyes', 'Diaz', 'Torres', 'Gutierrez', 'Ruiz', 'Mendoza', 'Aguilar', 'Mendez', 'Salazar', 'Castillo'];

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('=============================================================================');
  console.log('=== Iniciando Semillado Masivo y Purga Total (SSC Puebla I - Ciclo 2026)  ===');
  console.log('=============================================================================\n');

  // ---- Paso 1: Limpiar usuarios en auth.users ----
  console.log('[1/10] Purgando cuentas de prueba en auth.users (GoTrue)...');
  let hasMoreUsers = true;
  let totalAuthDeleted = 0;
  while (hasMoreUsers) {
    const { data: authUsers, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
      console.warn(`  Aviso al listar auth.users: ${listErr.message}`);
      break;
    }
    const toDelete = (authUsers?.users || []).filter(u => u.email && u.email.endsWith('@conalep.edu.mx'));
    if (toDelete.length === 0) {
      hasMoreUsers = false;
      break;
    }
    for (const u of toDelete) {
      await supabase.from('usuarios').delete().eq('id', u.id);
      await supabase.auth.admin.deleteUser(u.id);
      totalAuthDeleted++;
    }
  }
  console.log(`  ${totalAuthDeleted} cuentas eliminadas de auth.users.`);

  // ---- Paso 2: Limpiar tablas públicas de forma segura ----
  console.log('\n[2/10] Purgando tablas de la base de datos PostgreSQL...');
  const tablesToClear = [
    { name: 'seguimientos', col: 'id' },
    { name: 'notificaciones', col: 'id' },
    { name: 'asistencias', col: 'id' },
    { name: 'participaciones', col: 'id' },
    { name: 'incidencias', col: 'id' },
    { name: 'materias', col: 'id' },
    { name: 'contactos_emergency', col: 'id' },
    { name: 'padres_alumnos', col: 'padre_id' },
    { name: 'alumnos', col: 'id' },
    { name: 'usuarios', col: 'id' },
    { name: 'grupos', col: 'id' },
    { name: 'carreras', col: 'id' },
    { name: 'periodos_escolares', col: 'id' },
    { name: 'categorias_incidencia', col: 'id' },
    { name: 'planteles', col: 'id' },
    { name: 'avisos', col: 'id' },
    { name: 'insignias', col: 'id' }
  ];

  for (const t of tablesToClear) {
    const { error } = await supabase.from(t.name).delete().neq(t.col, '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.warn(`  Advertencia al limpiar tabla ${t.name}: ${error.message}`);
    }
  }
  console.log('  Todas las tablas publicas fueron purgadas exitosamente.');

  // ---- Paso 3: Insertar Catálogos Base ----
  console.log('\n[3/10] Insertando catalogos base del plantel y periodo escolar...');
  
  const { error: errPlantel } = await supabase.from('planteles').insert({
    id: PLANTEL_ID,
    nombre: 'CONALEP Plantel Puebla I',
    clave_centro: '21ETH0001Q',
    estado: 'Puebla',
    municipio: 'Puebla',
    activo: true
  });
  if (errPlantel) throw errPlantel;

  const periodos = [
    { id: PERIODO_ACTIVO_ID, plantel_id: PLANTEL_ID, nombre: 'Semestre A-2026', fecha_inicio: '2026-02-01', fecha_fin: '2026-07-31', activo: true },
    { id: 'a3f12456-7c90-412f-8da1-ee0b15b3c5e3', plantel_id: PLANTEL_ID, nombre: 'Semestre B-2025', fecha_inicio: '2025-08-01', fecha_fin: '2026-01-31', activo: false },
    { id: 'a3f12456-7c90-412f-8da1-ee0b15b3c5e4', plantel_id: PLANTEL_ID, nombre: 'Semestre A-2025', fecha_inicio: '2025-02-01', fecha_fin: '2025-07-31', activo: false },
    { id: 'a3f12456-7c90-412f-8da1-ee0b15b3c5e5', plantel_id: PLANTEL_ID, nombre: 'Semestre B-2024', fecha_inicio: '2024-08-01', fecha_fin: '2025-01-31', activo: false },
    { id: 'a3f12456-7c90-412f-8da1-ee0b15b3c5e6', plantel_id: PLANTEL_ID, nombre: 'Semestre A-2024', fecha_inicio: '2024-02-01', fecha_fin: '2024-07-31', activo: false },
    { id: 'a3f12456-7c90-412f-8da1-ee0b15b3c5e7', plantel_id: PLANTEL_ID, nombre: 'Semestre B-2023', fecha_inicio: '2023-08-01', fecha_fin: '2024-01-31', activo: false }
  ];
  const { error: errPeriodos } = await supabase.from('periodos_escolares').insert(periodos);
  if (errPeriodos) throw errPeriodos;

  const carreras = [
    { id: 'c0000000-0000-0000-0000-000000000001', plantel_id: PLANTEL_ID, nombre: 'Informatica', clave: 'INFO-01' },
    { id: 'c0000000-0000-0000-0000-000000000002', plantel_id: PLANTEL_ID, nombre: 'Administracion', clave: 'ADMN-02' },
    { id: 'c0000000-0000-0000-0000-000000000003', plantel_id: PLANTEL_ID, nombre: 'Contabilidad', clave: 'CONT-03' },
    { id: 'c0000000-0000-0000-0000-000000000004', plantel_id: PLANTEL_ID, nombre: 'Mantenimiento Automotriz', clave: 'MANT-04' },
    { id: 'c0000000-0000-0000-0000-000000000005', plantel_id: PLANTEL_ID, nombre: 'Enfermeria General', clave: 'ENFE-05' }
  ];
  const { error: errCarreras } = await supabase.from('carreras').insert(carreras);
  if (errCarreras) throw errCarreras;

  const categorias = [
    { id: 'c1a11111-2222-3333-4444-555555555555', plantel_id: PLANTEL_ID, nombre: 'Participacion Activa', color_semaforo: 'verde', impacto_base: 5 },
    { id: 'c2a22222-3333-4444-5555-666666666666', plantel_id: PLANTEL_ID, nombre: 'Llegada Tarde / Retardo', color_semaforo: 'naranja', impacto_base: -5 },
    { id: 'c3a33333-4444-5555-6666-777777777777', plantel_id: PLANTEL_ID, nombre: 'Inconducta en Clase', color_semaforo: 'naranja', impacto_base: -10 },
    { id: 'c4a44444-5555-6666-7777-888888888888', plantel_id: PLANTEL_ID, nombre: 'Falta de Respeto Grave', color_semaforo: 'rojo', impacto_base: -15 },
    { id: 'c5a55555-6666-7777-8888-999999999999', plantel_id: PLANTEL_ID, nombre: 'Participacion Excepcional', color_semaforo: 'verde', impacto_base: 15 },
    { id: 'c6a66666-7777-8888-9999-000000000000', plantel_id: PLANTEL_ID, nombre: 'Falta Conductual Extrema', color_semaforo: 'rojo', impacto_base: -20 }
  ];
  const { error: errCategorias } = await supabase.from('categorias_incidencia').insert(categorias);
  if (errCategorias) throw errCategorias;

  const insignias = [
    { id: '11a11111-2222-3333-4444-555555555555', plantel_id: PLANTEL_ID, nombre: 'Alumno Ejemplar', icono_url: 'star', puntos_requeridos: 120 },
    { id: '22a22222-3333-4444-5555-666666666666', plantel_id: PLANTEL_ID, nombre: 'Conducta Optima', icono_url: 'verified', puntos_requeridos: 110 },
    { id: '33a33333-4444-5555-6666-777777777777', plantel_id: PLANTEL_ID, nombre: 'Participacion Constante', icono_url: 'forum', puntos_requeridos: 105 },
    { id: '44a44444-5555-6666-7777-888888888888', plantel_id: PLANTEL_ID, nombre: 'Esfuerzo Sobresaliente', icono_url: 'trending_up', puntos_requeridos: 115 },
    { id: '55a55555-6666-7777-8888-999999999999', plantel_id: PLANTEL_ID, nombre: 'Compromiso Civico', icono_url: 'diversity_3', puntos_requeridos: 100 }
  ];
  const { error: errInsignias } = await supabase.from('insignias').insert(insignias);
  if (errInsignias) throw errInsignias;

  // ---- Paso 4: Generar 30 Grupos / Salones Activos ----
  console.log('\n[4/10] Creando 30 salones de clases estructurados...');
  const grupos = [];
  let isFirstGroup = true;
  for (const c of carreras) {
    for (const sem of [2, 4, 6]) {
      for (const turno of ['M', 'V']) {
        const id = isFirstGroup ? '11111111-2222-3333-4444-555555555555' : crypto.randomUUID();
        isFirstGroup = false;
        const nombre = `${c.clave.split('-')[0]}-${sem}0${turno === 'M' ? '1' : '2'}`;
        grupos.push({ id, plantel_id: PLANTEL_ID, periodo_id: PERIODO_ACTIVO_ID, carrera_id: c.id, nombre, semestre: sem, turno });
      }
    }
  }
  const { error: errGrupos } = await supabase.from('grupos').insert(grupos);
  if (errGrupos) throw errGrupos;
  console.log(`  ${grupos.length} salones activos insertados.`);

  // ---- Paso 5: Cuentas Maestras de Acceso en Auth ----
  console.log('\n[5/10] Semillando cuentas maestras de acceso en Auth Admin...');
  const authAccounts = [
    { email: 'director@conalep.edu.mx', nombre: 'Roberto', apellido: 'Hernandez', rol: 'directivo', cargo: 'Director General', activo: true },
    { email: 'subdirector.acad@conalep.edu.mx', nombre: 'Guillermo', apellido: 'Sosa', rol: 'directivo', cargo: 'Subdirector Academico', activo: true },
    { email: 'orientador@conalep.edu.mx', nombre: 'Sofia', apellido: 'Ramirez', rol: 'orientador', cargo: 'Orientador Turno Matutino', activo: true },
    { email: 'orientador.2@conalep.edu.mx', nombre: 'Javier', apellido: 'Ortega', rol: 'orientador', cargo: 'Orientador Turno Vespertino', activo: true },
    { email: 'docente@conalep.edu.mx', nombre: 'Francisco', apellido: 'Gomez', rol: 'docente', cargo: 'Docente Titular de Informatica', activo: true },
    { email: 'alumno@conalep.edu.mx', nombre: 'Alejandro', apellido: 'Lopez', rol: 'alumno', cargo: 'Estudiante', activo: true, irregular: false },
    { email: 'student.2@conalep.edu.mx', nombre: 'Carlos', apellido: 'Perez', rol: 'alumno', cargo: 'Estudiante', activo: true, irregular: true },
    { email: 'student.50@conalep.edu.mx', nombre: 'Daniel', apellido: 'Cruz', rol: 'alumno', cargo: 'Estudiante', activo: true, irregular: false },
    { email: 'padre@conalep.edu.mx', nombre: 'Marta', apellido: 'Lopez', rol: 'padre', cargo: 'Tutor', activo: true }
  ];

  // Cuentas auxiliares para pruebas de seguridad y lockout
  for (let i = 1; i <= 7; i++) {
    authAccounts.push({ email: `pendiente.${i}@conalep.edu.mx`, nombre: 'Usuario', apellido: `Pendiente ${i}`, rol: 'pendiente', cargo: 'Registro Pendiente', activo: false });
  }
  for (let i = 1; i <= 4; i++) {
    authAccounts.push({ email: `inactivo.${i}@conalep.edu.mx`, nombre: 'Usuario', apellido: `Inactivo ${i}`, rol: 'docente', cargo: 'Docente Inactivo', activo: false });
  }
  for (let i = 1; i <= 3; i++) {
    authAccounts.push({ email: `bloqueado.${i}@conalep.edu.mx`, nombre: 'Usuario', apellido: `Bloqueado ${i}`, rol: 'docente', cargo: 'Docente Bloqueado', activo: true, locked: true });
  }

  for (const acc of authAccounts) {
    const { data: userCreated, error: errAuth } = await supabase.auth.admin.createUser({
      email: acc.email,
      password: '123456',
      email_confirm: true,
      user_metadata: { nombre: acc.nombre, apellido: acc.apellido, plantel_id: PLANTEL_ID }
    });

    if (errAuth) {
      console.warn(`  Fallo al crear en Auth: ${acc.email} - ${errAuth.message}`);
      continue;
    }

    const userId = userCreated.user.id;

    const { error: errUsUpsert } = await supabase.from('usuarios').upsert({
      id: userId,
      plantel_id: PLANTEL_ID,
      nombre: acc.nombre,
      apellido: acc.apellido,
      email: acc.email,
      rol: acc.rol,
      cargo: acc.cargo,
      password_hash: '',
      activo: acc.activo,
      intentos_fallidos: acc.locked ? 5 : 0,
      bloqueado_hasta: acc.locked ? new Date(Date.now() + 3600000).toISOString() : null
    });
    if (errUsUpsert) throw errUsUpsert;

    acc.finalId = userId;
  }
  console.log(`  ${authAccounts.length} cuentas de autenticacion semilladas exitosamente.`);

  // ---- Paso 6: Generar 50 Docentes Distribuidos ----
  console.log('\n[6/10] Generando cuerpo docente...');
  const docentes = [];
  const docBase = authAccounts.find(a => a.email === 'docente@conalep.edu.mx');
  docentes.push({ id: docBase.finalId, name: 'Francisco Gomez' });

  const extraDocentesRows = [];
  for (let i = 2; i <= 50; i++) {
    const id = crypto.randomUUID();
    const nombre = randItem(Math.random() > 0.5 ? nombres_m : nombres_f);
    const apellido = `${randItem(apellidos)} ${randItem(apellidos)}`;
    const email = `docente.${i}@conalep.edu.mx`;
    const cargo = randItem(['Docente Titular A', 'Docente Asociado B', 'Coordinador de Area', 'Docente de Asignatura', 'Instructor Tecnico']);
    
    extraDocentesRows.push({
      id, plantel_id: PLANTEL_ID, nombre, apellido, email,
      rol: 'docente', cargo, password_hash: '', activo: true, intentos_fallidos: 0
    });
    docentes.push({ id, name: `${nombre} ${apellido}` });
  }
  const { error: errDocentes } = await supabase.from('usuarios').insert(extraDocentesRows);
  if (errDocentes) throw errDocentes;
  console.log(`  50 docentes asignables registrados.`);

  // ---- Paso 7: Asignar 150 Materias en Todos los 30 Salones ----
  console.log('\n[7/10] Asignando 5 asignaturas por salon con docentes titulares...');
  const materias = [];
  const teacherCompartidoId = docBase.finalId; // Francisco Gomez

  for (const g of grupos) {
    const carrera = carreras.find(c => c.id === g.carrera_id);
    let materiaNames = [];
    if (carrera.nombre === 'Informatica') {
      materiaNames = ['Programacion Orientada a Objetos', 'Diseno de Paginas Web', 'Redes de Computadoras', 'Sistemas Operativos', 'Bases de Datos Relacionales'];
    } else if (carrera.nombre === 'Administracion') {
      materiaNames = ['Administracion de Recursos Humanos', 'Mercadotecnia Estrategica', 'Contabilidad Basica', 'Procesos Administrativos', 'Gestion de Calidad'];
    } else if (carrera.nombre === 'Contabilidad') {
      materiaNames = ['Auditoria Gubernamental', 'Calculo de Impuestos', 'Contabilidad de Costos', 'Finanzas Corporativas', 'Derecho Mercantil'];
    } else if (carrera.nombre === 'Mantenimiento Automotriz') {
      materiaNames = ['Sistemas del Motor', 'Mecanica de Combustion', 'Sistemas de Suspension', 'Electricidad Automotriz', 'Diagnostico Computarizado'];
    } else {
      materiaNames = ['Fundamentos de Enfermeria', 'Anatomia y Fisiologia', 'Salud Publica', 'Farmacologia Clinica', 'Enfermeria Pediatrica'];
    }

    for (let idx = 0; idx < 5; idx++) {
      const id = crypto.randomUUID();
      const nombre = materiaNames[idx];
      let docente_id = randItem(docentes).id;

      // Garantizar que el docente demo tenga asignadas clases clave
      if (idx === 0 && (
        (carrera.nombre === 'Informatica' && g.turno === 'M') ||
        (carrera.nombre === 'Administracion' && g.turno === 'V')
      )) {
        docente_id = teacherCompartidoId;
      }

      materias.push({ id, grupo_id: g.id, docente_id, nombre });
    }
  }
  const { error: errMaterias } = await supabase.from('materias').insert(materias);
  if (errMaterias) throw errMaterias;
  console.log(`  ${materias.length} materias registradas (5 por cada uno de los 30 salones).`);

  // ---- Paso 8: Generar 750 Alumnos (25 por salón), Tutores y Contactos ----
  console.log('\n[8/10] Registrando 750 alumnos (25 por salon), tutores y contactos de emergencia...');
  
  const usuariosToInsert = [];
  const alumnosToInsert = [];
  const parentsToInsert = [];
  const parentStudentRelations = [];
  const emergencyContacts = [];

  const student1 = authAccounts.find(a => a.email === 'alumno@conalep.edu.mx');
  const student2 = authAccounts.find(a => a.email === 'student.2@conalep.edu.mx');
  const student50 = authAccounts.find(a => a.email === 'student.50@conalep.edu.mx');
  const padre1 = authAccounts.find(a => a.email === 'padre@conalep.edu.mx');

  let studentIdx = 0;
  
  // Vincular tutor demo inicial con Alejandro Lopez
  parentStudentRelations.push({ padre_id: padre1.finalId, alumno_id: student1.finalId, parentesco: 'Madre', notificaciones_activas: true });

  const activeAlumnosList = [];

  for (const g of grupos) {
    const alumnosEnGrupo = 25; // 25 alumnos por cada salón = 750 alumnos en total

    for (let idx = 0; idx < alumnosEnGrupo; idx++) {
      studentIdx++;
      let alumnoId;
      let email;
      let nombre;
      let apellido;
      let tipo_alumno;

      if (studentIdx === 1) {
        alumnoId = student1.finalId;
        email = student1.email;
        nombre = student1.nombre;
        apellido = student1.apellido;
        tipo_alumno = 'Regular';
      } else if (studentIdx === 2) {
        alumnoId = student2.finalId;
        email = student2.email;
        nombre = student2.nombre;
        apellido = student2.apellido;
        tipo_alumno = 'Irregular';
      } else if (studentIdx === 50) {
        alumnoId = student50.finalId;
        email = student50.email;
        nombre = student50.nombre;
        apellido = student50.apellido;
        tipo_alumno = 'Regular';
      } else {
        alumnoId = crypto.randomUUID();
        email = `student.${studentIdx}@conalep.edu.mx`;
        nombre = randItem(Math.random() > 0.5 ? nombres_m : nombres_f);
        apellido = `${randItem(apellidos)} ${randItem(apellidos)}`;
        tipo_alumno = 'Regular';

        usuariosToInsert.push({
          id: alumnoId,
          plantel_id: PLANTEL_ID,
          nombre,
          apellido,
          email,
          rol: 'alumno',
          cargo: 'Estudiante',
          password_hash: '',
          activo: true,
          intentos_fallidos: 0
        });
      }

      const matricula = `26${String(studentIdx).padStart(7, '0')}`;
      const generacion = g.semestre === 2 ? '2025-2028' : g.semestre === 4 ? '2024-2027' : '2023-2026';
      
      let tipo_sangre = randItem(['O+', 'A+', 'B+', 'O-', null]);
      let alergias = randItem(['Ninguna', 'Polen', 'Penicilina', null]);
      if (studentIdx === 1) {
        tipo_sangre = 'O+';
        alergias = 'Ninguna';
      }

      alumnosToInsert.push({
        id: alumnoId,
        usuario_id: alumnoId,
        grupo_id: g.id,
        matricula,
        generacion,
        tipo_alumno,
        correo_institucional: email,
        correo_personal_enc: `personal.${studentIdx}@gmail.com`,
        telefono_enc: `222${Math.floor(1000000 + Math.random() * 9000000)}`,
        tipo_sangre,
        alergias,
        puntos_totales: 100
      });

      let behaviorProfile = 'Verde';
      if (studentIdx === 1) behaviorProfile = 'Verde';
      else if (studentIdx === 50) behaviorProfile = 'Rojo';
      else if (studentIdx % 10 === 0 || studentIdx % 10 === 1) behaviorProfile = 'Rojo';
      else if (studentIdx % 10 >= 2 && studentIdx % 10 <= 4) behaviorProfile = 'Naranja';

      activeAlumnosList.push({ id: alumnoId, grupo_id: g.id, behaviorProfile });

      emergencyContacts.push({
        id: crypto.randomUUID(),
        alumno_id: alumnoId,
        nombre: `${randItem(apellidos)} ${randItem(apellidos)}`,
        parentesco: Math.random() > 0.5 ? 'Madre' : 'Padre',
        telefono: `222${Math.floor(1000000 + Math.random() * 9000000)}`,
        es_primario: true
      });

      // Crear Tutor vinculado para cada estudiante (con multi-hijo para pruebas)
      if (studentIdx > 1) {
        let parentId;
        if (studentIdx % 15 === 0 && parentsToInsert.length > 0) {
          // Caso multi-hijo: hermano menor comparte tutor
          parentId = parentsToInsert[parentsToInsert.length - 1].id;
        } else {
          parentId = crypto.randomUUID();
          const pNombre = randItem(Math.random() > 0.5 ? nombres_m : nombres_f);
          const pApellido = apellido;
          const pEmail = `padre.${studentIdx}@conalep.edu.mx`;
          
          usuariosToInsert.push({
            id: parentId,
            plantel_id: PLANTEL_ID,
            nombre: pNombre,
            apellido: pApellido,
            email: pEmail,
            rol: 'padre',
            cargo: 'Tutor',
            password_hash: '',
            activo: true,
            intentos_fallidos: 0
          });
          parentsToInsert.push({ id: parentId });
        }
        parentStudentRelations.push({ padre_id: parentId, alumno_id: alumnoId, parentesco: 'Tutor', notificaciones_activas: true });
      }
    }
  }

  console.log(`  Insertando ${usuariosToInsert.length} usuarios adicionales en bloque...`);
  const { error: errUsrs } = await supabase.from('usuarios').insert(usuariosToInsert);
  if (errUsrs) throw errUsrs;
  
  console.log(`  Insertando ${alumnosToInsert.length} expedientes de alumnos en bloque...`);
  const { error: errAlumnos } = await supabase.from('alumnos').insert(alumnosToInsert);
  if (errAlumnos) throw errAlumnos;

  console.log(`  Insertando ${parentStudentRelations.length} vinculos tutelares en padres_alumnos...`);
  const { error: errRelations } = await supabase.from('padres_alumnos').insert(parentStudentRelations);
  if (errRelations) throw errRelations;

  console.log(`  Insertando ${emergencyContacts.length} contactos de emergencia...`);
  const { error: errContacts } = await supabase.from('contactos_emergency').insert(emergencyContacts);
  if (errContacts) throw errContacts;

  // ---- Paso 9: Generar Asistencias, Participaciones e Incidencias en Bloque ----
  console.log('\n[9/10] Generando 56,000+ asistencias historicas y registros conductuales...');
  
  const asistencias = [];
  const incidencias = [];
  const participaciones = [];
  const seguimientos = [];
  const orientadorId = authAccounts.find(a => a.email === 'orientador@conalep.edu.mx').finalId;
  const notasSeguimiento = [
    'Se cito al tutor legal para acordar plan de apoyo academico y puntualidad.',
    'Entrevista individual psicopedagogica sobre integracion y participacion en el aula.',
    'Se suscribe carta compromiso con el alumno y padre de familia.',
    'Orientacion vocacional y seguimiento al reporte conductual de taller.',
    'Canalizacion preventiva para fortalecimiento de habitos de estudio.'
  ];

  let totalSeguimientos = 0;

  for (const al of activeAlumnosList) {
    const materiasGrupo = materias.filter(m => m.grupo_id === al.grupo_id);
    if (materiasGrupo.length === 0) continue;

    // Asistencias (15 días escolares)
    const absenteeRate = 0.03 + Math.random() * 0.08;
    for (const m of materiasGrupo) {
      for (let day = 1; day <= 15; day++) {
        const fecha = `2026-03-${String(day).padStart(2, '0')}`;
        const presente = Math.random() > absenteeRate;
        asistencias.push({
          id: crypto.randomUUID(),
          alumno_id: al.id,
          materia_id: m.id,
          fecha,
          presente,
          justificada: !presente && Math.random() > 0.7
        });
      }
    }

    // Conducta y Puntos
    if (al.behaviorProfile === 'Verde') {
      if (Math.random() > 0.5) {
        const m = randItem(materiasGrupo);
        participaciones.push({
          id: crypto.randomUUID(),
          alumno_id: al.id,
          materia_id: m.id,
          registrado_por: m.docente_id,
          periodo_id: PERIODO_ACTIVO_ID,
          fecha: '2026-03-10',
          nivel: 'positiva',
          impacto_puntos: 5,
          observacion: 'Excelente participacion y aportes de valor al tema discutido.'
        });
      }
    } else if (al.behaviorProfile === 'Naranja') {
      const m1 = materiasGrupo[0];
      const m2 = materiasGrupo[1];
      
      incidencias.push({
        id: crypto.randomUUID(),
        alumno_id: al.id,
        registrado_por: m1.docente_id,
        periodo_id: PERIODO_ACTIVO_ID,
        categoria_id: 'c2a22222-3333-4444-5555-666666666666',
        materia_id: m1.id,
        descripcion: 'Llegada tarde por segunda vez consecutiva a la clase.',
        lugar: 'Aula de Clase',
        impacto_puntos: -5
      });

      incidencias.push({
        id: crypto.randomUUID(),
        alumno_id: al.id,
        registrado_por: m2.docente_id,
        periodo_id: PERIODO_ACTIVO_ID,
        categoria_id: 'c3a33333-4444-5555-6666-777777777777',
        materia_id: m2.id,
        descripcion: 'Distraccion reiterada de sus compañeros de mesa de trabajo.',
        lugar: 'Aula de Clase',
        impacto_puntos: -10
      });

      if (totalSeguimientos < 120) {
        totalSeguimientos++;
        seguimientos.push({
          id: crypto.randomUUID(),
          alumno_id: al.id,
          orientador_id: orientadorId,
          nota: randItem(notasSeguimiento),
          tipo: 'llamada'
        });
      }
    } else if (al.behaviorProfile === 'Rojo') {
      const m1 = materiasGrupo[0];
      const m2 = materiasGrupo[1];
      const m3 = materiasGrupo[2];

      incidencias.push({
        id: crypto.randomUUID(),
        alumno_id: al.id,
        registrado_por: m1.docente_id,
        periodo_id: PERIODO_ACTIVO_ID,
        categoria_id: 'c6a66666-7777-8888-9999-000000000000',
        materia_id: m1.id,
        descripcion: 'Inasistencia sin justificacion y actitud desafiante en el taller.',
        lugar: 'Taller',
        impacto_puntos: -20
      });

      incidencias.push({
        id: crypto.randomUUID(),
        alumno_id: al.id,
        registrado_por: m2.docente_id,
        periodo_id: PERIODO_ACTIVO_ID,
        categoria_id: 'c3a33333-4444-5555-6666-777777777777',
        materia_id: m2.id,
        descripcion: 'Falta de material y desorden durante la clase practica.',
        lugar: 'Aula de Clase',
        impacto_puntos: -10
      });

      incidencias.push({
        id: crypto.randomUUID(),
        alumno_id: al.id,
        registrado_por: m3.docente_id,
        periodo_id: PERIODO_ACTIVO_ID,
        categoria_id: 'c4a44444-5555-6666-7777-888888888888',
        materia_id: m3.id,
        descripcion: 'Contesto de forma inapropiada e insulto verbalmente al docente al llamarle la atencion.',
        lugar: 'Aula de Clase',
        impacto_puntos: -15
      });

      if (totalSeguimientos < 120) {
        totalSeguimientos++;
        seguimientos.push({
          id: crypto.randomUUID(),
          alumno_id: al.id,
          orientador_id: orientadorId,
          nota: `Urgente: ${randItem(notasSeguimiento)}`,
          tipo: 'llamada'
        });
      }
    }
  }

  const batchSize = 1000;
  console.log(`  Insertando ${asistencias.length} asistencias en lotes de 1000...`);
  for (let i = 0; i < asistencias.length; i += batchSize) {
    const { error: errAsist } = await supabase.from('asistencias').insert(asistencias.slice(i, i + batchSize));
    if (errAsist) throw errAsist;
  }

  console.log(`  Insertando ${participaciones.length} participaciones positivas...`);
  const { error: errPart } = await supabase.from('participaciones').insert(participaciones);
  if (errPart) throw errPart;

  console.log(`  Insertando ${incidencias.length} incidencias conductuales...`);
  for (let i = 0; i < incidencias.length; i += 100) {
    const { error: errInc } = await supabase.from('incidencias').insert(incidencias.slice(i, i + 100));
    if (errInc) throw errInc;
  }

  console.log(`  Insertando ${seguimientos.length} bitacoras psicopedagogicas...`);
  const { error: errSegs } = await supabase.from('seguimientos').insert(seguimientos);
  if (errSegs) throw errSegs;

  // ---- Paso 10: Generar Comunicados Institucionales (Avisos) ----
  console.log('\n[10/10] Generando avisos del plantel...');
  const directorId = authAccounts.find(a => a.email === 'director@conalep.edu.mx').finalId;
  const avisos = [];
  const avisosConfig = [
    { title: 'Reunion de Consejo Tecnico Escolar', desc: 'Estimados docentes, se les convoca a la sesion ordinaria del CTE el proximo viernes.', audience: 'docentes' },
    { title: 'Entrega de Reportes del Primer Parcial', desc: 'Padres de familia, los reportes de evaluacion del primer parcial estaran disponibles para su consulta fisica en el plantel.', audience: 'padres' },
    { title: 'Campaña de Vacunacion y Salud', desc: 'Se realizara una jornada de vacunacion en el plantel para todos los alumnos. Traer cartilla de vacunacion.', audience: 'todos' },
    { title: 'Convocatoria de Becas CONALEP', desc: 'Se abre el registro para las becas de excelencia y apoyo socioeconomico. Consultar bases en direccion.', audience: 'todos' },
    { title: 'Charla de Convivencia Sana', desc: 'Se convoca a los alumnos con incidencias preventivas a la charla en la biblioteca del plantel.', audience: 'semaforo_naranja' },
    { title: 'Taller de Regularizacion Conductual Urgente', desc: 'Cita obligatoria para alumnos en semaforo critico y sus respectivos tutores.', audience: 'semaforo_rojo' }
  ];

  for (let i = 1; i <= 20; i++) {
    const config = avisosConfig[i % avisosConfig.length];
    const dateOffset = i - 10;
    const fecha = new Date(Date.now() + dateOffset * 86400000).toISOString().split('T')[0];
    
    avisos.push({
      id: crypto.randomUUID(),
      plantel_id: PLANTEL_ID,
      creado_por: directorId,
      titulo: `${config.title} (Aviso ${i})`,
      descripcion: config.desc,
      fecha_evento: fecha,
      dirigido_a: config.audience,
      activo: true
    });
  }
  const { error: errAvisos } = await supabase.from('avisos').insert(avisos);
  if (errAvisos) throw errAvisos;

  console.log('\n=============================================================================');
  console.log('=== SEMILLADO MASIVO Y REPOBLACION 360° COMPLETADO CON EXITO TOTAL ===');
  console.log('=============================================================================');
}

main().catch(console.error);
