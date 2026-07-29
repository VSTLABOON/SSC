# Sistema Conductual CONALEP Plantel Puebla I - Documentación Técnica e Integración

Este documento contiene la especificación completa de la arquitectura, base de datos, políticas de seguridad RLS, módulo de Business Intelligence (BI), matriz de roles y funciones, motor analítico preventivo en SQL, agente IA de Inteligencia Directiva aislado en Edge Function y flujos de navegación aplicados al **Sistema Conductual de CONALEP Plantel Puebla I (EduTrack 360)**.

---

## 1. Descripción General del Sistema

El Sistema Conductual está diseñado para la gestión de la disciplina, la asistencia y la convivencia escolar en el plantel CONALEP Puebla I. Permite a los docentes registrar pases de lista diarios con esquema granular (3+3), participaciones e incidencias de conducta. Los directivos y orientadores supervisan el estado general del plantel, gestionan la permanencia escolar y analizan la trayectoria conductual en tiempo real a través del **Centro de BI & KPIs**, suscripciones **Supabase Realtime (WebSockets)** y el **Agente IA de Inteligencia Directiva**.

El sistema se basa en una arquitectura cliente-servidor desacoplada utilizando React + TypeScript en el frontend y Supabase (PostgreSQL, Auth, RPCs PostgREST y Edge Functions Deno) en el backend.

---

## 2. Matriz de Roles y Funciones del Sistema

La plataforma implementa un control de acceso basado en roles (RBAC) estricto con redirecciones inteligentes por rol en `RequireAuth`:

| Rol de Usuario | Vista Inicial / Inicio | Funciones y Capacidades Principales |
| :--- | :--- | :--- |
| **`directivo`** *(Director / Subdirector de Plantel)* | **Centro BI & KPIs** (`InicioDA.tsx`) | • Visión ejecutiva global del plantel en tiempo real.<br>• Generación del **Reporte Ejecutivo Directivo de Plantel** en PDF.<br>• Consulta del **Agente IA de Inteligencia Directiva** (Groq Llama 3.3 70B grounded en BD) al dar clic en cualquier KPI o gráfica.<br>• Gestión de Usuarios: Invitación y activación de cuentas (`invite-user` Edge Function), desbloqueo y cambio de estados.<br>• Configuración y apertura de Periodos Escolares (`services/periodos.ts`).<br>• Envío masivo de avisos institucionales a tutores y alumnos. |
| **`orientador`** *(Orientador / Psicopedagógico)* | **Centro BI & KPIs y Radar de Riesgo** (`InicioDA.tsx`) | • Monitoreo continuo del **Radar de Alumnos en Atención Prioritaria** ordenado por Risk Score SQL.<br>• Diagnóstico narrativo automático de caídas bruscas y riesgo de deserción escolar.<br>• Evaluación de trayectoria granular (Semanal, Mensual, Bimestral, Semestral) en Recharts `<AreaChart>`.<br>• Generación e impresión del Expediente Disciplinario por estudiante.<br>• Coordinación de tutorías presenciales y alertas preventivas a tutores legales. *(Restricción: No accede a Gestión de Usuarios)*. |
| **`docente`** / **`maestro`** *(Profesor de Asignatura / Tutor)* | **Asignación & Pase de Lista Granular** (`InicioMaestro.tsx`) | • **Pase de Lista Granular 3+3**: Asistencia (Asistió, Retardo, Falta, Falta Justificada) + Desempeño (Participó, Neutral, No Participó).<br>• Registro de incidencias conductuales leves, moderadas y críticas.<br>• Consulta del **Centro BI & KPIs** filtrado por RLS exclusivamente para sus grupos asignados (`v_teacher_group_ids`).<br>• Consulta del historial por materia. |
| **`alumno`** / **`estudiante`** | **Mi Expediente Conductual** (`Home.tsx`) | • Consulta del saldo acumulado de Puntos Conductuales (Base 100 pts) e Índice de Salud Conductual.<br>• Visualización de la trayectoria y nivel de semáforo (Verde, Naranja, Rojo).<br>• Consulta del historial personal segmentado por pastillas de observaciones.<br>• Notificaciones preventivas recibidas. |
| **`padre`** / **`tutor`** *(Tutor Legal)* | **Expediente Conductual del Hijo(a)** (`Home.tsx`) | • Recepción de alertas preventivas push en tiempo real ante variaciones a Semáforo Naranja o Rojo.<br>• Visualización de la asistencia e incidencias registradas. |

---

## 3. Módulo de Business Intelligence (BI) y Realtime WebSockets

El módulo de BI proporciona tableros analíticos en tiempo real respaldados por funciones RPC en PostgreSQL con seguridad RLS e índices compuestos de alto rendimiento (`idx_incidencias_alumno_created`, `idx_incidencias_alumno_categoria`):

### Funciones RPC en PostgreSQL (Fuente Única de Verdad)
1. `fn_bi_get_kpis(p_periodo_id, p_generacion, p_grupo_id, p_severidad, p_rango_temporal)`:
   - Devuelve el Índice de Salud Conductual (ISC promedio), distribución semafórica (verde, naranja, rojo), total de incidencias y alumnos en riesgo prioritario.
2. `fn_bi_get_trend(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`:
   - Agrupa incidencias por periodo temporal para renderizar gráficas de evolución conductual en Recharts.
3. `fn_bi_get_categories(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`:
   - Retorna el desglose de categorías más recurrentes y su severidad.
4. `fn_bi_get_risk_students(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`:
   - Retorna la lista prioritaria de estudiantes en riesgo evaluados y ordenados mediante la función SQL de Risk Score.
5. **Suscripción Supabase Realtime (WebSockets)**:
   - Las tablas `public.incidencias` y `public.notificaciones` están agregadas a la publicación `supabase_realtime`.
   - `BIAnalyticsDashboard.tsx` y `NotificationCenter.tsx` escuchan eventos `postgres_changes` vía WebSocket para actualizar KPIs y alertas al instante sin recargar la página.

---

## 4. Motor Analítico de Riesgo en SQL (PostgreSQL Engine)

El motor de riesgo de deserción corre **100% en SQL dentro de PostgreSQL** para garantizar consistencia absoluta entre clientes:

1. **Función SQL `fn_calcular_ewma(p_alumno_id)`**:
   - Calcula el promedio móvil ponderado exponencialmente ($\alpha = 0.3$) sobre las incidencias cronológicas del alumno.
   - Determina la aceleración de caída reciente de puntaje conductual.
2. **Función SQL `fn_calcular_risk_score(p_alumno_id)` / `fn_bi_get_risk_score_alumno`**:
   - Evalúa 4 dimensiones ponderadas directamente en PostgreSQL: $40\%$ ISC Actual + $30\%$ Incidencias Críticas + $20\%$ Velocidad de Caída (EWMA Delta) + $10\%$ Volumen de Incidencias.
   - Retorna la puntuación ordinal (0-100%) y la categoría de riesgo (`bajo`, `moderado`, `alto`, `critico`).

---

## 5. Agente IA de Inteligencia Directiva (Supabase Edge Function `groq-agent`)

- **Ubicación de la llamada a la API de Groq**: **Supabase Edge Function en servidor Deno aislado** (`supabase/functions/groq-agent/index.ts`). El frontend NUNCA realiza llamadas directas a la API de Groq ni almacena claves en el cliente.
- **Seguridad**: Validación obligatoria de token JWT (`auth.getUser()`) y Rate Limiting por `user.id`.
- **Modelo**: `llama-3.3-70b-versatile` alimentado con un contexto multi-dimensional estructurado (4 secciones: KPIs, Tendencia, Categorías y Alumnos en Riesgo) inyectado directamente desde PostgreSQL.
- **Protocolo Anti-Sesgo**: Prompt de sistema de 5 pasos que exige cruces multi-dimensionales, detección de vacíos de información / sub-registro y cero alucinaciones.

---

## 6. Rendimiento y Diseño UX/UI

- **Code-Splitting Dinámico con `React.lazy()`**: Reducción del paquete principal de JavaScript de **1,030 kB a 464 kB** (fragmentación por rutas en `App.tsx`).
- **Modales Fluidos y Portales React**: Modales (`ExecutiveChartAgentModal`, `StudentExpedienteModal`, `ExecutiveReportModal`) renderizados en `document.body` con animaciones `cubic-bezier`, bloqueo de scroll de fondo (`no-scroll`) y cierre con tecla `Escape`.
- **Navegación Móvil Flotante (`BottomNav.tsx`)**: Barra inferior flotante estilo ClickUp con área segura para iOS (`env(safe-area-inset-bottom)`), vibración háptica al toque (`navigator.vibrate`) y conmutador de tema Claro / Oscuro (`ThemeToggle`).

---

## 7. Instrucciones de Compilación y Verificación

```bash
# 1. Instalar dependencias del proyecto
pnpm install

# 2. Compilar TypeScript y validar bundle de producción con Vite
pnpm build

# 3. Ejecutar servidor local de desarrollo
pnpm dev
```
