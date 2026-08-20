// =============================================================================
// seed_users.js - Semillado de usuarios y datos dependientes para SSC
// =============================================================================
// Ejecutar DESPUES de que seed.sql haya insertado planteles, periodos,
// categorias, carreras y grupos.
//
// Uso:  node frontend/src/seed_users.js
// =============================================================================
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// -- Configuracion --------------------------------------------------------
const envSup = fs.readFileSync('c:\\Users\\User\\Documents\\SSC\\.env_Sup', 'utf8');
const SUPABASE_URL = envSup.match(/SUPABASE_URL=(.+)/)[1].trim();
const SERVICE_KEY  = envSup.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PLANTEL_ID  = 'b5cde2a6-38d5-450f-90db-3367c3bb1b51';
const PERIODO_ID  = 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2';
const GRUPO_1_ID  = '11111111-2222-3333-4444-555555555555';
const GRUPO_2_ID  = '22222222-3333-4444-5555-666666666666';
const CAT_VERDE   = 'c1a11111-2222-3333-4444-555555555555';
const CAT_NARANJA = 'c2a22222-3333-4444-5555-666666666666';

const USERS = [
  { email: 'admin@conalep.edu.mx',      nombre: 'Ing. Carlos',    apellido: 'Mendoza',   rol: 'administrador' },
  { email: 'docente@conalep.edu.mx',    nombre: 'Prof. Francisco', apellido: 'Gomez',     rol: 'docente' },
  { email: 'director@conalep.edu.mx',   nombre: 'Ing. Roberto',   apellido: 'Hernandez', rol: 'directivo' },
  { email: 'orientador@conalep.edu.mx', nombre: 'Lic. Sofia',     apellido: 'Ramirez',   rol: 'orientador' },
  { email: 'alumno@conalep.edu.mx',     nombre: 'Alejandro',      apellido: 'Lopez',     rol: 'alumno' },
  { email: 'padre@conalep.edu.mx',      nombre: 'Marta',          apellido: 'Lopez',     rol: 'padre' },
];

// -- Utilidades -----------------------------------------------------------
async function deleteExistingUser(email) {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (data && data.users) {
    const existing = data.users.find(u => u.email === email);
    if (existing) {
      await supabase.from('usuarios').delete().eq('id', existing.id);
      await supabase.auth.admin.deleteUser(existing.id);
      return true;
    }
  }
  return false;
}

// -- Main -----------------------------------------------------------------
async function main() {
  const userIdMap = {};

  // ---- Paso 1: Crear usuarios via Admin API -----------------------------
  console.log('=== Paso 1: Crear usuarios via Admin API ===');
  for (const u of USERS) {
    await deleteExistingUser(u.email);

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: '123456',
      email_confirm: true,
      user_metadata: {
        plantel_id: PLANTEL_ID,
        nombre: u.nombre,
        apellido: u.apellido
      }
    });

    if (error) {
      console.log('  ERROR creando ' + u.email + ': ' + error.message);
      continue;
    }
    userIdMap[u.email] = data.user.id;
    console.log('  Creado ' + u.email + ' -> ' + data.user.id);
  }

  // ---- Paso 2: Asignar roles y activar ---------------------------------
  console.log('=== Paso 2: Asignar roles y activar ===');
  for (const u of USERS) {
    const uid = userIdMap[u.email];
    if (!uid) continue;
    const { error } = await supabase
      .from('usuarios')
      .upsert({
        id: uid,
        plantel_id: PLANTEL_ID,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        rol: u.rol,
        password_hash: '',
        activo: true,
        intentos_fallidos: 0
      }, { onConflict: 'id' });
    if (error) console.log('  ERROR insertando/actualizando ' + u.email + ': ' + error.message);
    else console.log('  ' + u.email + ' -> rol: ' + u.rol + ', activo: true (en public.usuarios)');
  }

  // ---- Paso 3: Datos de alumno -----------------------------------------
  const alumnoId = userIdMap['alumno@conalep.edu.mx'];
  const docenteId = userIdMap['docente@conalep.edu.mx'];

  if (alumnoId) {
    console.log('=== Paso 3: Insertar datos de alumno ===');
    const { error } = await supabase.from('alumnos').upsert({
      id: alumnoId,
      usuario_id: alumnoId,
      grupo_id: GRUPO_1_ID,
      matricula: '202611029',
      tipo_alumno: 'Regular',
      puntos_totales: 100
    }, { onConflict: 'id' });
    if (error) console.log('  ERROR insertando alumno: ' + error.message);
    else console.log('  Alumno insertado: ' + alumnoId);

    // ---- Paso 4: Insertar contacto de emergencia ---------------------------------
    console.log('=== Paso 4: Insertar contacto de emergencia ===');
    // Borrar contactos anteriores de este alumno para evitar duplicaciones
    await supabase.from('contactos_emergency').delete().eq('alumno_id', alumnoId);
    
    const { error: errCont } = await supabase.from('contactos_emergency').insert({
      alumno_id: alumnoId,
      nombre: 'Marta Lopez',
      parentesco: 'Madre',
      telefono: '222-123-4567',
      es_primario: true
    }).select();
    if (errCont) console.log('  ERROR insertando contacto: ' + errCont.message);
    else console.log('  Contacto de emergencia insertado');
  }

  // ---- Paso 5: Materias ------------------------------------------------
  if (docenteId) {
    console.log('=== Paso 5: Insertar materias ===');
    const materias = [
      { docente_id: docenteId, grupo_id: GRUPO_1_ID, nombre: 'Programacion de Aplicaciones Web' },
      { docente_id: docenteId, grupo_id: GRUPO_2_ID, nombre: 'Base de Datos Avanzada' },
    ];
    for (const m of materias) {
      const { error } = await supabase.from('materias').insert(m);
      if (error) console.log('  ERROR insertando materia "' + m.nombre + '": ' + error.message);
      else console.log('  Materia insertada: ' + m.nombre);
    }
  }

  // ---- Paso 6: Incidencias de ejemplo -----------------------------------
  if (alumnoId && docenteId) {
    console.log('=== Paso 6: Insertar incidencias de ejemplo ===');
    const incidencias = [
      {
        alumno_id: alumnoId,
        registrado_por: docenteId,
        periodo_id: PERIODO_ID,
        categoria_id: CAT_VERDE,
        descripcion: 'Excelente desempeno y participacion en la clase practica de desarrollo web.',
        lugar: 'Aula 5',
        impacto_puntos: 5
      },
      {
        alumno_id: alumnoId,
        registrado_por: docenteId,
        periodo_id: PERIODO_ID,
        categoria_id: CAT_NARANJA,
        descripcion: 'Llego 20 minutos tarde a la primera sesion de laboratorio.',
        lugar: 'Laboratorio 2',
        impacto_puntos: -5
      }
    ];
    for (const inc of incidencias) {
      const { error } = await supabase.from('incidencias').insert(inc);
      if (error) console.log('  ERROR insertando incidencia: ' + error.message);
      else console.log('  Incidencia insertada: ' + inc.descripcion.substring(0, 50) + '...');
    }
  }

  // ---- Paso 7: Verificar login ------------------------------------------
  console.log('=== Paso 7: Verificar login ===');
  const envFront = fs.readFileSync('c:\\Users\\User\\Documents\\SSC\\frontend\\.env', 'utf8');
  const ANON_KEY = envFront.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  for (const u of USERS) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: u.email,
      password: '123456'
    });
    if (error) console.log('  LOGIN FALLO para ' + u.email + ': ' + error.message);
    else console.log('  LOGIN OK para ' + u.email + ' (session: ' + !!data.session + ')');
  }

  console.log('\n=== Semillado completo ===');
}

main().catch(console.error);
