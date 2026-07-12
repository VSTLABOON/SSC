# Sistema Conductual CONALEP Puebla I - Documentacion Tecnica e Integracion

Este documento contiene la especificacion completa de la arquitectura, base de datos, politicas de seguridad RLS, control de accesos, flujos de invitacion de usuarios y auditorias tecnicas de seguridad aplicadas al proyecto del Sistema Conductual de CONALEP Puebla I (EduTrack 360).

---

## 1. Descripcion General del Sistema

El Sistema Conductual esta disenado para facilitar la gestion de la disciplina, asistencia y participacion de los alumnos en el plantel CONALEP Puebla I. Permite a los docentes registrar pases de lista diarios, participaciones e incidencias de conducta. Los directivos y orientadores supervisan el estado general del plantel, gestionan las cuentas de acceso y generan reportes detallados.

El sistema se basa en una arquitectura cliente-servidor desacoplada utilizando React en el frontend y Supabase (PostgreSQL, Auth y Edge Functions) en el backend.

---

## 2. Arquitectura de Componentes y Flujos de Datos

### Frontend (React, TypeScript, Vite)
- Estructura modular organizada en componentes, vistas, layouts por rol y servicios para la comunicacion con el backend.
- Ruteador (React Router DOM) con proteccion por roles mediante el componente RequireAuth.
- Contexto de Autenticacion (AuthContext.tsx) que gestiona el estado de la sesion de Supabase y recupera la informacion del perfil en tiempo real.

### Backend (Supabase)
- PostgreSQL: Motor de base de datos relacional con Row Level Security (RLS) habilitado.
- Supabase Auth: Manejo de autenticacion de usuarios mediante JWT y envio de invitaciones por correo electronico.
- Edge Functions: Funciones escritas en TypeScript sobre el entorno Deno para operaciones administrativas seguras.

---

## 3. Estructura de la Base de Datos y Correcciones Realizadas

A lo largo del desarrollo, se identificaron y subsanaron desajustes entre la definicion de tipos del frontend y las restricciones fisicas de PostgreSQL.

### Tabla public.planteles
- Llave primaria: id (UUID)
- Columna clave_centro (text): Es una columna requerida (NOT NULL) que identifica el codigo oficial del centro escolar. Se corrigio el semillado para asegurar su inclusion.

### Tabla public.usuarios
- Llave primaria: id (UUID)
- Relacion: 1:1 con auth.users.
- Rol: La columna rol tiene una restriccion de tipo CHECK (chk_usuarios_rol) que limita los valores a: 'docente', 'orientador', 'directivo', 'padre', 'alumno' y 'pendiente'.
- Seguridad: La columna password_hash es requerida por herencia del diseno original pero no es utilizada para autenticar en el frontend. Se inicializa en vacio y se le han revocado los permisos de lectura para roles publicos.
- Estado: Se anadieron las columnas obligatorias activo (boolean) e intentos_fallidos (integer).

### Tabla public.alumnos
- Llave primaria: id (UUID)
- Relacion: Vinculado a public.usuarios via usuario_id.
- Columna nivel_semaforo: Es una columna generada de solo lectura (GENERATED ALWAYS AS). El sistema calcula el nivel conductual de manera automatica en la base de datos basandose en reglas de negocio y puntajes totales. Se elimino cualquier insercion manual sobre este campo en el frontend y en el script de semillado.
- Campos clinicos: Se integraron campos de tipo text nullable para tipo_sangre y alergias.

### Tabla public.contactos_emergency
- Nombre de la tabla: public.contactos_emergency. Inicialmente referenciada como contactos_emergencia en el frontend. Se corrigieron todas las llamadas API y estructuras de datos para usar el nombre correcto.

### Tabla public.categorias_incidencia
- Restriccion chk_cat_color: La columna color_semaforo solo acepta los valores textuales en espanol: 'verde', 'naranja' y 'rojo'. Cualquier intento de enviar codigos en ingles o hexadecimales lanza una violacion de CHECK constraint. Se realizo la conversion de valores en los formularios de reportes disciplinarios.

---

## 4. Ciclo de Vida de Usuarios y Control de Roles

La gestion de accesos se ha automatizado por completo para mitigar fallas en la asignacion manual de privilegios:

### Flujo de Registro
1. Invitacion: Un directivo introduce el correo, nombre, apellido y rol del nuevo usuario en el panel administrativo.
2. Edge Function: El panel envia los datos a la Edge Function invite-user.
3. Supabase Auth: La Edge Function ejecuta la creacion del usuario en el esquema interno auth.users e inyecta plantel_id, nombre y apellido en la metadata del usuario (raw_user_meta_data).
4. Trigger en PostgreSQL: Al insertarse la fila en auth.users, el trigger on_auth_user_created ejecuta la funcion public.handle_new_user(). Esta funcion inserta el perfil correspondiente en public.usuarios con:
   - rol = 'pendiente'
   - activo = false
   - plantel_id obtenido de la metadata de Auth (validado mediante una expresion regular en PostgreSQL para evitar errores de parseo de UUID).

### Proceso de Aprobacion y Activacion
- Pantalla de Espera: Cuando un usuario invitado acepta la invitacion e inicia sesion por primera vez, su sesion de Auth se valida, pero al consultar public.usuarios el sistema detecta que activo es false o que su rol es 'pendiente'. El AuthContext de React detecta este estado y fuerza su rol a 'pendiente', obligando a la aplicacion a redirigirlo a la ruta publica protegida /pendiente-activacion.
- Panel de Aprobacion: El directivo del plantel visualiza al nuevo usuario en la tabla de Gestion de Usuarios con el estatus "Pendiente". El directivo puede:
   - Cambiar el rol asignado.
   - Activar el usuario (estableciendo activo = true). En ese instante, el usuario puede refrescar su sesion y acceder al panel que le corresponde segun su rol.
   - Suspender o desactivar la cuenta (estableciendo activo = false), lo cual redirige al usuario inmediatamente de vuelta a la pantalla de espera de activacion.

---

## 5. Especificacion de Edge Functions

### Funcion invite-user
- Endpoint: POST /functions/v1/invite-user
- Seguridad:
  - Lee el header Authorization del solicitante para validar su JWT.
  - Verifica que el usuario que llama a la funcion sea un 'directivo' autenticado.
  - Valida que el directivo y el invitado correspondan al mismo plantel_id, evitando que directivos de otros planteles creen cuentas fuera de su demarcacion.
  - CORS: Restringido al origen del frontend provisto por la variable de entorno SITE_URL para evitar ataques de Cross-Origin Resource Sharing.
  - Sanitizacion: Remueve el UUID del usuario invitado de la respuesta JSON exitosa para minimizar la exposicion de identificadores.

### Funcion sai-sync (Stub)
- Endpoint: POST /functions/v1/sai-sync
- Proposito: Servira como puente para la sincronizacion de datos provenientes del Sistema de Administracion Institucional (SAI) de CONALEP tras el periodo piloto.
- Estatus: Retorna 501 (Not Implemented) describiendo el contrato de integracion, mapeo de carreras, semestres, alumnos y docentes.

---

## 6. Auditoria de Seguridad y Cumplimiento OWASP Top 10

Se realizo una auditoria de seguridad a nivel de base de datos e inspeccion estatica de codigo fuente.

### OWASP A01: Broken Access Control
- Aislamiento RLS: Se confirmo que las 23 tablas de la base de datos publica tienen Row Level Security habilitado. El acceso de lectura/escritura anónimo devuelve 0 registros en todas las tablas.
- Politicas de Ownership: Se crearon politicas RLS explicitas para asegurar que:
  - Cada usuario autenticado solo pueda ver o modificar sus propios registros en public.refresh_tokens.
  - Solo los directivos del mismo plantel puedan leer el historico en public.audit_log, bloqueando cualquier escritura directa de clientes externos.
  - Los alumnos y padres solo tengan visibilidad de sus propios datos conductuales.
  - Los docentes solo puedan ver a los alumnos y registros disciplinarios de los grupos donde imparten materias.
  - Los directivos y orientadores esten restringidos a consultar unicamente datos de su propio plantel.
- Prevencion de Condiciones de Carrera (Asignacionestatus.tsx): En el proceso de guardado de pase de lista de asistencia y participacion, se clona el arreglo de estados en un snapshot local antes de ejecutar el bucle asincrono. Esto asegura que si el docente presiona el boton "Deshacer" mientras el guardado esta en progreso, no se alteren los datos en transmision.

### OWASP A02: Cryptographic Failures
- Cifrado en Transito: Supabase fuerza HTTPS para todas las consultas.
- Exposicion del Hash: Se aplico un comando REVOKE SELECT sobre la columna password_hash en la tabla public.usuarios para los roles publicos de PostgREST, garantizando que el hash no viaje al frontend en ninguna peticion de lectura.
- Variables de Entorno: Se configuro el archivo .gitignore en la raiz del proyecto para excluir .env, .env_Sup y archivos .env locales del control de versiones.

### OWASP A07: Identification and Authentication Failures
- Verificacion de Captcha: Se forzo la evaluacion del checkbox de verificacion humana en el Login.tsx antes de realizar la llamada de autenticacion a Supabase.
- Cuentas Bloqueadas: La consulta en AuthContext valida la columna bloqueado_hasta de public.usuarios para bloquear el inicio de sesion a cuentas bloqueadas temporalmente por intentos fallidos de contraseña.

---

## 7. Instrucciones de Despliegue y Pruebas

### Despliegue de Base de Datos
Ejecutar los archivos de migracion en el SQL Editor de Supabase en el siguiente orden:
1. supabase/migrations/20260712000000_init_ssc.sql (Creacion de tablas y periodos escolares)
2. supabase/migrations/20260712010000_user_profile_trigger.sql (Trigger de auto-perfil y politicas de actualizacion)
3. supabase/migrations/20260712020000_security_fixes.sql (Politicas RLS de seguridad, ocultamiento de hash y regexp del trigger)

### Semillado de Prueba
Ejecutar el contenido de supabase/seed.sql en el SQL Editor para inyectar datos de prueba consistentes y compatibles con todas las restricciones de integridad referencial.

### Ejecucion del Frontend
1. Instalar dependencias en la carpeta frontend:
   ```bash
   pnpm install
   ```
2. Compilar el proyecto para verificar que no existan errores de TypeScript o configuracion:
   ```bash
   pnpm build
   ```
3. Ejecutar el servidor de desarrollo:
   ```bash
   pnpm dev
   ```
