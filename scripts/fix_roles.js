import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnvConfig() {
  const possiblePaths = [
    process.env.ENV_FILE,
    path.resolve(__dirname, '../.env_Sup'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../frontend/.env'),
  ].filter(Boolean);

  let content = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      content += '\n' + fs.readFileSync(p, 'utf8');
    }
  }

  const url = process.env.SUPABASE_URL || content.match(/SUPABASE_URL=(.+)/)?.[1]?.trim() || content.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim() || 'http://localhost:8000';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || content.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim() || '';
  return { url, serviceKey };
}

const { url: SUPABASE_URL, serviceKey: SERVICE_KEY } = getEnvConfig();

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PLANTEL_ID = 'b5cde2a6-38d5-450f-90db-3367c3bb1b51';

const USERS = [
  { email: 'docente@conalep.edu.mx',    id: '275631dc-e512-4267-986e-87547b8d5ac5', nombre: 'Prof. Francisco', apellido: 'Gomez',     rol: 'docente' },
  { email: 'director@conalep.edu.mx',   id: 'fdff2f17-e28d-432e-88c4-ffd072137bb8', nombre: 'Ing. Roberto',   apellido: 'Hernandez', rol: 'directivo' },
  { email: 'orientador@conalep.edu.mx', id: 'e13c764f-a1fb-466a-a199-c3ede94c92b8', nombre: 'Lic. Sofia',     apellido: 'Ramirez',   rol: 'orientador' },
  { email: 'alumno@conalep.edu.mx',     id: '3e92028d-2728-4875-8a4d-6fb35a690f43', nombre: 'Alejandro',      apellido: 'Lopez',     rol: 'alumno' },
  { email: 'padre@conalep.edu.mx',      id: '25ee6b64-2256-40aa-b37d-e47a603263a7', nombre: 'Marta',          apellido: 'Lopez',     rol: 'padre' },
];

async function main() {
  // Clean leftover test users
  console.log('--- Cleaning leftover test users ---');
  await supabase.from('usuarios').delete().eq('email', 'docente_test@conalep.edu.mx');

  // Insert all 5 users into public.usuarios
  console.log('--- Inserting into public.usuarios ---');
  for (const u of USERS) {
    const { data, error } = await supabase.from('usuarios').upsert({
      id: u.id,
      plantel_id: PLANTEL_ID,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol,
      password_hash: '',
      activo: true,
      intentos_fallidos: 0
    }, { onConflict: 'id' }).select('email, rol, activo');
    
    if (error) console.log('  ERROR ' + u.email + ': ' + error.message);
    else console.log('  OK ' + u.email + ': ' + JSON.stringify(data));
  }

  // Insert alumno record
  const alumnoId = USERS.find(u => u.rol === 'alumno').id;
  const docenteId = USERS.find(u => u.rol === 'docente').id;
  
  console.log('--- Inserting alumno record ---');
  const { error: alErr } = await supabase.from('alumnos').upsert({
    id: alumnoId,
    usuario_id: alumnoId,
    grupo_id: '11111111-2222-3333-4444-555555555555',
    matricula: '202611029',
    tipo_alumno: 'Regular',
    puntos_totales: 100
  }, { onConflict: 'id' });
  console.log(alErr ? '  ERROR: ' + alErr.message : '  OK alumno inserted');

  // Insert materias
  console.log('--- Inserting materias ---');
  const materias = [
    { docente_id: docenteId, grupo_id: '11111111-2222-3333-4444-555555555555', nombre: 'Programacion de Aplicaciones Web' },
    { docente_id: docenteId, grupo_id: '22222222-3333-4444-5555-666666666666', nombre: 'Base de Datos Avanzada' },
  ];
  for (const m of materias) {
    const { error } = await supabase.from('materias').insert(m);
    if (error) {
      if (error.message.includes('duplicate')) console.log('  SKIP (ya existe): ' + m.nombre);
      else console.log('  ERROR: ' + error.message);
    } else {
      console.log('  OK: ' + m.nombre);
    }
  }

  // Verify final state
  console.log('\n--- Estado final de public.usuarios ---');
  const { data: pub } = await supabase.from('usuarios').select('email, rol, activo').order('email');
  for (const u of pub) {
    console.log('  ' + u.email + ' | rol: ' + u.rol + ' | activo: ' + u.activo);
  }
}

main().catch(console.error);
