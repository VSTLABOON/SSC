import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// -- Configuración --------------------------------------------------------
const envSup = fs.readFileSync('c:\\Users\\User\\Documents\\SSC\\.env_Sup', 'utf8');
const SUPABASE_URL = envSup.match(/SUPABASE_URL=(.+)/)[1].trim();
const SERVICE_KEY  = envSup.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();

const envFront = fs.readFileSync('c:\\Users\\User\\Documents\\SSC\\frontend\\.env', 'utf8');
const ANON_KEY = envFront.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

// Cliente con Service Role (bypass RLS) para preparar datos y verificar estados
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Cliente normal con clave Anon (afectado por RLS)
function createAnonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const PLANTEL_ID  = 'b5cde2a6-38d5-450f-90db-3367c3bb1b51';
const PERIODO_ID  = 'a3f12456-7c90-412f-8da1-ee0b15b3c5e2';
const GRUPO_1_ID  = '11111111-2222-3333-4444-555555555555';
const CAT_VERDE   = 'c1a11111-2222-3333-4444-555555555555';

const USER_EMAILS = {
  docente: 'docente@conalep.edu.mx',
  directivo: 'director@conalep.edu.mx',
  orientador: 'orientador@conalep.edu.mx',
  alumno: 'alumno@conalep.edu.mx',
  padre: 'padre@conalep.edu.mx'
};

async function testAsUser(roleName, email, testFn) {
  console.log(`\n--------------------------------------------------`);
  console.log(`Probando como ROL: ${roleName.toUpperCase()} (${email})`);
  console.log(`--------------------------------------------------`);
  
  const client = createAnonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: '123456'
  });

  if (error) {
    console.error(`[ERROR] Error de login para ${email}:`, error.message);
    return;
  }

  try {
    await testFn(client, data.user.id);
  } catch (err) {
    console.error(`[ERROR] Excepción durante las pruebas de ${roleName}:`, err);
  } finally {
    await client.auth.signOut();
  }
}

async function main() {
  console.log('=== Iniciando verificación de políticas RLS ===');

  // Primero, asegurar que los datos básicos de prueba existen
  // (alumno, contacto de emergencia, materia)
  const { data: listUsr } = await adminClient.auth.admin.listUsers();
  const alumnoUser = listUsr.users.find(u => u.email === USER_EMAILS.alumno);
  const docenteUser = listUsr.users.find(u => u.email === USER_EMAILS.docente);
  const directivoUser = listUsr.users.find(u => u.email === USER_EMAILS.directivo);

  if (!alumnoUser || !docenteUser || !directivoUser) {
    console.error('[ERROR] Falta semillar los usuarios de prueba. Corre "node frontend/src/seed_users.js" primero.');
    process.exit(1);
  }

  // 1. Probar como ALUMNO
  await testAsUser('alumno', USER_EMAILS.alumno, async (client, uid) => {
    // Lectura de planteles (Debe permitir)
    const { data: planteles, error: errPl } = await client.from('planteles').select('*');
    if (errPl) console.log(`[ERROR] Error leyendo planteles: ${errPl.message}`);
    else console.log(`[OK] Lectura de planteles exitosa. Registros devueltos: ${planteles.length}`);

    // Lectura de carreras del plantel (Debe permitir)
    const { data: carreras, error: errCa } = await client.from('carreras').select('*');
    if (errCa) console.log(`[ERROR] Error leyendo carreras: ${errCa.message}`);
    else console.log(`[OK] Lectura de carreras exitosa. Registros devueltos: ${carreras.length}`);

    // Lectura de sus propios contactos de emergencia (Debe permitir)
    const { data: contactos, error: errCo } = await client.from('contactos_emergency').select('*');
    if (errCo) console.log(`[ERROR] Error leyendo contactos: ${errCo.message}`);
    else console.log(`[OK] Lectura de contactos_emergency exitosa. Registros devueltos: ${contactos.length}`);

    // Intentar escribir en incidencias (Debe denegar)
    const { error: errInc } = await client.from('incidencias').insert({
      alumno_id: uid,
      registrado_por: uid,
      periodo_id: PERIODO_ID,
      categoria_id: CAT_VERDE,
      descripcion: 'Intento malicioso de alumno',
      lugar: 'Aula',
      impacto_puntos: 10
    });
    if (errInc) console.log(`[OK] Inserción en incidencias denegada correctamente: ${errInc.message}`);
    else console.log(`[ERROR] ERROR: Se permitió al alumno registrar una incidencia.`);

    // Intentar actualizar alumnos (Debe denegar)
    // Primero obtener el ID real del registro en 'alumnos' (distinto de auth.uid)
    const { data: myAlumno } = await client.from('alumnos').select('id').eq('usuario_id', uid).single();
    if (myAlumno) {
      const { data: updData, error: errUpAl } = await client.from('alumnos').update({ puntos_totales: 100 }).eq('id', myAlumno.id).select();
      if (errUpAl) console.log(`[OK] Actualización de puntos de alumno denegada correctamente: ${errUpAl.message}`);
      else if (!updData || updData.length === 0) console.log(`[OK] Actualización de puntos de alumno denegada correctamente (0 filas afectadas).`);
      else console.log(`[ERROR] ERROR: Se permitió al alumno actualizar su propio puntaje.`);
    } else {
      console.log(`⚠️ No se encontró registro en 'alumnos' para este usuario, no se puede probar update.`);
    }
  });

  // 2. Probar como DOCENTE
  await testAsUser('docente', USER_EMAILS.docente, async (client, uid) => {
    // Lectura de materias (Debe devolver sus materias asignadas)
    const { data: materias, error: errMat } = await client.from('materias').select('*');
    if (errMat) console.log(`[ERROR] Error leyendo materias: ${errMat.message}`);
    else console.log(`[OK] Lectura de materias exitosa. Registros devueltos: ${materias.length}`);

    // Crear asistencia para alumno (Debe permitir si es su materia)
    // Buscamos una materia asignada
    const myMateria = materias && materias.length > 0 ? materias[0] : null;
    if (myMateria) {
      const { error: errAsist } = await client.from('asistencias').upsert({
        alumno_id: alumnoUser.id,
        materia_id: myMateria.id,
        fecha: new Date().toISOString().split('T')[0],
        presente: true
      }, { onConflict: 'alumno_id,materia_id,fecha' });

      if (errAsist) console.log(`[ERROR] Error insertando asistencia: ${errAsist.message}`);
      else console.log(`[OK] Inserción de asistencia como docente exitosa.`);

      // Registrar incidencia (Debe permitir)
      const { error: errInc } = await client.from('incidencias').insert({
        alumno_id: alumnoUser.id,
        registrado_por: uid,
        periodo_id: PERIODO_ID,
        categoria_id: CAT_VERDE,
        materia_id: myMateria.id,
        descripcion: 'Participación registrada por verificación',
        lugar: 'Aula 1',
        impacto_puntos: 5
      });
      if (errInc) console.log(`[ERROR] Error insertando incidencia como docente: ${errInc.message}`);
      else console.log(`[OK] Inserción de incidencia como docente exitosa.`);
    } else {
      console.log('⚠️ No se encontraron materias asignadas para probar asistencia/incidencia.');
    }

    // Intentar vincular un tutor (Debe denegar)
    const { error: errPadAl } = await client.from('padres_alumnos').insert({
      padre_id: docenteUser.id, // ID cualquiera
      alumno_id: alumnoUser.id,
      parentesco: 'Tutor de prueba'
    });
    if (errPadAl) console.log(`[OK] Vinculación de tutores denegada correctamente: ${errPadAl.message}`);
    else console.log(`[ERROR] ERROR: Se permitió a un docente vincular tutores.`);
  });

  // 3. Probar como DIRECTIVO
  await testAsUser('directivo', USER_EMAILS.directivo, async (client, uid) => {
    // Vincular un tutor (Debe permitir)
    const { error: errPadAl } = await client.from('padres_alumnos').upsert({
      padre_id: listUsr.users.find(u => u.email === USER_EMAILS.padre).id,
      alumno_id: alumnoUser.id,
      parentesco: 'Madre',
      notificaciones_activas: true
    }, { onConflict: 'padre_id,alumno_id' });

    if (errPadAl) console.log(`[ERROR] Error vinculando tutor como directivo: ${errPadAl.message}`);
    else console.log(`[OK] Vinculación de tutor como directivo exitosa.`);

    // Crear contacto de emergencia (Debe permitir)
    const { error: errCont } = await client.from('contactos_emergency').insert({
      alumno_id: alumnoUser.id,
      nombre: 'Contacto Test Directivo',
      parentesco: 'Tío',
      telefono: '555-987-6543',
      es_primario: false
    });

    if (errCont) console.log(`[ERROR] Error creando contacto como directivo: ${errCont.message}`);
    else console.log(`[OK] Creación de contacto de emergencia como directivo exitosa.`);

    // Crear periodo escolar (Debe permitir)
    const { error: errPer } = await client.from('periodos_escolares').insert({
      plantel_id: PLANTEL_ID,
      nombre: 'Periodo Verificación',
      fecha_inicio: '2026-08-01',
      fecha_fin: '2026-12-31',
      activo: false
    });

    if (errPer) {
      if (errPer.message.includes('duplicate') || errPer.message.includes('unique')) {
        console.log(`[OK] El periodo ya existía o se detectó colisión de índice único.`);
      } else {
        console.log(`[ERROR] Error creando periodo escolar como directivo: ${errPer.message}`);
      }
    } else {
      console.log(`[OK] Creación de periodo escolar como directivo exitosa.`);
    }
  });

  // 4. Probar comportamiento con cuenta inactiva (PENDIENTE)
  console.log(`\n--------------------------------------------------`);
  console.log(`Probando RLS con cuenta INACTIVA / PENDIENTE`);
  console.log(`--------------------------------------------------`);
  
  // Desactivamos temporalmente al docente
  console.log('Desactivando cuenta del docente temporalmente...');
  await adminClient.from('usuarios').update({ activo: false }).eq('id', docenteUser.id);

  const docClient = createAnonClient();
  const { error: errDocLogin } = await docClient.auth.signInWithPassword({
    email: USER_EMAILS.docente,
    password: '123456'
  });

  if (errDocLogin) {
    console.log(`Login falló como se esperaba o pasó: ${errDocLogin.message}`);
  } else {
    // Si inicia sesión, RLS de todas formas debe denegar todo porque fn_check_auth_user_valid() devuelve false
    const { data: planteles, error: errPl } = await docClient.from('planteles').select('*');
    if (errPl || (planteles && planteles.length === 0)) {
      console.log(`[OK] RLS denegó lectura de planteles a cuenta inactiva correctamente.`);
    } else {
      console.log(`[ERROR] ERROR: Cuenta inactiva pudo leer planteles.`);
    }
    await docClient.auth.signOut();
  }

  // Restauramos al docente
  console.log('Restaurando cuenta del docente...');
  await adminClient.from('usuarios').update({ activo: true }).eq('id', docenteUser.id);

  console.log('\n=== Verificación finalizada ===');
}

main().catch(console.error);
