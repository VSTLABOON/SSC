# Sistema Conductual CONALEP Puebla I - Documentación Técnica e Integración

Este documento contiene la especificación completa de la arquitectura, base de datos, políticas de seguridad RLS, módulo de Business Intelligence (BI), control de accesos, flujos de navegación y auditorías técnicas de seguridad aplicadas al proyecto del Sistema Conductual de CONALEP Puebla I (EduTrack 360).

---

## 1. Descripción General del Sistema

El Sistema Conductual está diseñado para facilitar la gestión de la disciplina, asistencia y participación de los alumnos en el plantel CONALEP Puebla I. Permite a los docentes registrar pases de lista diarios, participaciones e incidencias de conducta. Los directivos y orientadores supervisan el estado general del plantel, gestionan las cuentas de acceso y analizan tendencias de conducta en tiempo real.

El sistema se basa en una arquitectura cliente-servidor desacoplada utilizando React en el frontend y Supabase (PostgreSQL, Auth, RPCs PostgREST y Edge Functions) en el backend.

---

## 2. Arquitectura de Componentes y Flujos de Datos

### Frontend (React, TypeScript, Vite)
- Estructura modular organizada en componentes, vistas, layouts por rol y servicios para la comunicación con el backend.
- **Ruteador**: React Router DOM con protección por roles mediante el componente `RequireAuth`.
- **Contexto de Autenticación (`AuthContext.tsx`)**: Gestiona el estado de la sesión de Supabase Auth y recupera la información del perfil en tiempo real.
- **Iconografía Nítida**: Sistema 100% basado en íconos vectoriales oficiales de Material Symbols Outlined (sin uso de emojis), garantizando neutralidad visual e integración corporativa.

### Backend (Supabase)
- **PostgreSQL**: Motor de base de datos relacional con Row Level Security (RLS) habilitado de forma estricta.
- **Procedimientos Almacenados (RPCs)**: Cálculo autoritativo de métricas de BI directamente en PostgreSQL para prevenir fallbacks manipulables en el cliente.
- **Supabase Auth**: Manejo de autenticación de usuarios mediante JWT y envío de invitaciones por correo electrónico.
- **Edge Functions**: Funciones escritas en TypeScript sobre el entorno Deno para operaciones administrativas seguras (`invite-user`).

---

## 3. Módulo de Business Intelligence (BI) y Analítica Conductual

El módulo de BI proporciona tableros analíticos en tiempo real para directivos, orientadores y docentes, basándose en la ejecución de RPCs con seguridad RLS estricta:

### Funciones RPC en PostgreSQL
1. `fn_bi_get_kpis(p_rango, p_generacion, p_grupo_id, p_severidad)`:
   - Devuelve el Índice de Salud Conductual (ISC promedio), distribución semafórica (verde, naranja, rojo), total de incidencias y alumnos en riesgo prioritario.
   - Aplica filtrado estricto `WHERE g.plantel_id = v_plantel_id` asegurando que ningún usuario acceda a planteles ajenos.
2. `fn_bi_get_trend(p_rango, p_generacion, p_grupo_id, p_severidad)`:
   - Agrupa incidencias por periodo temporal para renderizar gráficas de evolución conductual en Recharts.
3. `fn_bi_get_categories(p_rango, p_generacion, p_grupo_id, p_severidad)`:
   - Retorna el desglose de categorías más recurrentes (asistencia, uniformes, disciplina).
4. `fn_bi_get_risk_students(p_rango, p_generacion, p_grupo_id, p_severidad)`:
   - Retorna la lista prioritaria de estudiantes con mayor acumulación de incidencias y permite a directivos y orientadores notificar a los tutores.

### Componentes de BI
- `BIAnalyticsDashboard.tsx`: Contenedor principal del módulo.
- `BIFilterBar.tsx`: Barra de filtrado dinámico (Ventana temporal, Generación, Grupo y Severidad).
- `BIKpiCard.tsx`: Tarjetas de indicadores clave (ISC, Semáforos, Total Incidencias, Atención Prioritaria).
- `BITrendChart.tsx` & `BICategoryChart.tsx`: Visualizaciones gráficas en tiempo real.
- `BIRiskTable.tsx`: Radar de alumnos en atención prioritaria con modal interactivo de **Expediente Disciplinario Completo**.

---

## 4. Rediseño de Navegación UX/UI (ClickUp BottomNav & Pestañas Dedicadas)

### Pantalla Inicial Predeterminada (`Centro BI & KPIs`)
Al iniciar sesión en los portales de **Directivos (`InicioDA.tsx`)** y **Maestros (`InicioMaestro.tsx`)**, la vista predeterminada es automáticamente la pestaña **`[ Centro BI & KPIs ]`**. Toda la información crítica se presenta en el primer pliegue de la pantalla, reduciendo el desplazamiento vertical.

### Barra de Navegación Inferior Flotante Móvil (`BottomNav.tsx`)
Inspirada en la aplicación móvil de ClickUp, proporciona acceso rápido en pantallas pequeñas:
- **Exclusión Mutua por Viewport**:
  - **Escritorio ($\ge 768\text{px}$)**: `BottomNav` se oculta automáticamente (`display: none !important`) operando el sidebar lateral.
  - **Móvil ($< 768\text{px}$)**: El sidebar lateral y el menú hamburguesa se ocultan, pasando la responsabilidad de navegación a la `BottomNav`.
- **Jerarquía de Capas (`z-index: 150`)**: Posicionada por encima del canvas principal (`1`) y del topbar (`30`), pero por debajo de modales (`200`) y alertas (`250`).
- **Botón Central Elevado (+)**: Despliega un menú flotante de acciones rápidas filtradas por el rol real del usuario (`useAuth()`).
- **Reserva de Espacio**: Aplica `padding-bottom: 88px` en los contenedores principales para evitar que la barra flotante tape contenido.

### Sistema de Pastillas de Organización del Historial (`Pill Tabs`)
En todas las vistas de expediente e historial conductual (`BIRiskTable.tsx`, `Historialreporteda.tsx`, `HistorialReportesM.tsx`, `History.tsx`), la bitácora se organiza mediante **pastillas o fichas segmentadas con íconos vectoriales de Material Symbols (sin emojis)**:
- `[list_alt] Todos`: Bitácora cronológica completa.
- `[check_circle] Positivos / Méritos`: Reconocimientos y puntos a favor.
- `[warning] Faltas Leves`: Advertencias o faltas de menor severidad.
- `[error] Faltas Críticas`: Reportes graves y sanciones de atención prioritaria.

---

## 5. Diseño y Posicionamiento de Pantalla de Login (`Login.css`)

Se aplicó un rediseño responsivo simétrico en **[Login.css](file:///c:/Users/User/Documents/SSC/frontend/src/pages/Login.css)**:
- **Centrado Vertical Simétrico**: Utiliza `margin: auto` en `.login-intro-content` (panel institucional izquierdo) y en `.login-form-wrapper` (panel de acceso derecho). Ambas tarjetas se ubican exactamente al centro vertical del viewport.
- **Protección de Modo Oscuro**: Se estableció `color-scheme: light;` en `.login-page` para impedir que preferencias del sistema operativo inviertan los colores de los inputs, garantizando legibilidad en todo momento.
- **Proporciones en Escritorio**: Distribución 50% / 50% en pantallas $\ge 768\text{px}$ con padding adaptativo que evita la compresión del formulario en pantallas medianas.

---

## 6. Estructura de la Base de Datos

### Tabla `public.planteles`
- Llave primaria: `id` (UUID).
- Columna `clave_centro` (`text` NOT NULL): Código oficial del centro escolar.

### Tabla `public.usuarios`
- Llave primaria: `id` (UUID), relación 1:1 con `auth.users`.
- Restricción `chk_usuarios_rol`: `'docente'`, `'orientador'`, `'directivo'`, `'padre'`, `'alumno'` y `'pendiente'`.
- Ocultamiento de Hash: Se revocó el permiso `SELECT` sobre `password_hash` para roles públicos.
- Estado: Columnas `activo` (boolean) e `intentos_fallidos` (integer).

### Tabla `public.alumnos`
- Relación vinculada a `public.usuarios` vía `usuario_id`.
- Columna `nivel_semaforo`: Columna generada de solo lectura (`GENERATED ALWAYS AS`).

### Tabla `public.categorias_incidencia`
- Restricción `chk_cat_color`: Acepta únicamente `'verde'`, `'naranja'` y `'rojo'`.

---

## 7. Ciclo de Vida de Usuarios y Control de Roles

1. **Invitación**: Un directivo ingresa el correo y rol desde el panel administrativo.
2. **Edge Function `invite-user`**: Vía API administrativa de Supabase Auth, crea la cuenta en `auth.users` e inyecta la metadata.
3. **Trigger PostgreSQL (`handle_new_user`)**: Crea el registro en `public.usuarios` con `rol = 'pendiente'` y `activo = false`.
4. **Validación en Frontend**: Usuarios inactivos son redirigidos a `/pendiente-activacion` hasta que un directivo los active desde la interfaz.

---

## 8. Instrucciones de Despliegue y Pruebas

### Despliegue de Base de Datos
Ejecutar las migraciones en el SQL Editor de Supabase en el siguiente orden:
1. `supabase/migrations/20260712000000_init_ssc.sql`
2. `supabase/migrations/20260712010000_user_profile_trigger.sql`
3. `supabase/migrations/20260712020000_security_fixes.sql`
4. `supabase/migrations/20260721200000_bi_module_rpcs.sql` (RPCs de BI y RLS)

### Compilación y Ejecución del Frontend
```bash
# 1. Instalar dependencias
pnpm install

# 2. Verificar compilación TypeScript y bundle de Vite
pnpm build

# 3. Ejecutar servidor de desarrollo
pnpm dev
```
