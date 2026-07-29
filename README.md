# Sistema Conductual CONALEP Plantel Puebla I (EduTrack 360)
## Especificación Técnica, Arquitectura del Sistema y Documentación de Integración

Este documento constituye la especificación técnica oficial, exhaustiva y actualizada del **Sistema Conductual de CONALEP Plantel Puebla I (EduTrack 360)**. Describe la arquitectura de software, el esquema de base de datos en PostgreSQL, las políticas de seguridad RLS, el motor analítico de riesgo conductual en SQL, la integración del Agente IA de Inteligencia Directiva en Edge Functions con seudonimización LGPDPPSO, el módulo de Business Intelligence (BI), la matriz de roles y permisos (RBAC), y las pautas de compilación y despliegue.

---

## 1. Descripción General del Sistema

El Sistema Conductual está diseñado para la gestión integral de la disciplina, la asistencia y la convivencia escolar en el plantel CONALEP Puebla I. Permite a los docentes registrar pases de lista diarios con esquema granular (3+3), participaciones e incidencias de conducta. Los directivos y orientadores supervisan el estado general del plantel, gestionan la permanencia escolar y analizan la trayectoria conductual en tiempo real a través del **Centro de BI & KPIs**, suscripciones **Supabase Realtime (WebSockets)** y el **Agente IA de Inteligencia Directiva**.

### Principios de Diseño
1. **Desacoplamiento Estricto**: Separación limpia entre la capa de presentación (React + TypeScript) y la lógica de negocio persistida en PostgreSQL (RPCs, triggers y funciones inmutables).
2. **Cero Confianza en el Cliente (Zero Trust)**: La seguridad se garantiza en la base de datos mediante Row Level Security (RLS) y en las Edge Functions mediante validación de JWT y roles RBAC en servidor.
3. **Privacidad por Diseño (LGPDPPSO)**: Los datos personales identificables (PII) de los estudiantes menores de edad jamás se transmiten a modelos de lenguaje o servicios externos.
4. **Diseño Visual Institucional**: Interfaz limpia libre de emojis, utilizando exclusivamente íconos vectoriales oficiales de Material Symbols Outlined (`font-variation-settings: 'FILL' 0, 'wght' 400`).

---

## 2. Arquitectura Tecnológica del Sistema

La plataforma se basa en una arquitectura desacoplada cliente-servidor nativa en la nube:

```
                        +-------------------------------------------------+
                        |            Navegador Web / Cliente              |
                        |      React 19 + TypeScript 5.8 + Vite 8         |
                        |         (Code-Splitting Chunk 464 kB)           |
                        +------------------------+------------------------+
                                                 |
                       +-------------------------+-------------------------+
                       |                                                   |
           HTTPS / PostgREST RPCs                                WebSocket / Push Realtime
                       |                                                   |
                       v                                                   v
+----------------------------------------------+        +------------------------------------+
|            Supabase PostgreSQL 15            |        |         Supabase Realtime          |
|  - RLS Multi-Tenant por Plantel/Docente      |        |  - Tablas: incidencias             |
|  - Motor de Riesgo SQL (fn_calcular_ewma)    |        |          notificaciones            |
|  - Índices Compuestos de Rendimiento         |        +------------------------------------+
+----------------------+-----------------------+
                       |
                       | Invocación JWT Autenticada
                       v
+----------------------------------------------+
|     Supabase Edge Function: groq-agent       |
|  - Servidor Deno Aislado (Service Role Key)  |
|  - Verificación Estricta RBAC (directivo)    |
|  - Contexto Seudonimizado por LGPDPPSO       |
|  - Rate Limit en Memoria (10 req/min)        |
+----------------------+-----------------------+
                       |
                       | GROQ_API_KEY (Secret Servidor)
                       v
+----------------------------------------------+
|     Groq API (Llama 3.3 70B Versatile)       |
+----------------------------------------------+
```

### Componentes Principales

- **Frontend**: React 19, TypeScript 5.8, Vite 8, React Router DOM 7, Recharts 3.
- **Base de Datos & Auth**: Supabase PostgreSQL 15, Supabase Auth con tokens JWT, Row Level Security (RLS) y RPCs en PL/pgSQL.
- **Realtime**: Motor de suscripciones WebSockets nativo de Supabase sobre la publicación `supabase_realtime`.
- **Edge Compute**: Supabase Edge Functions ejecutadas en runtime Deno (`groq-agent` para inteligencia IA, `invite-user` para gestión de usuarios).

---

## 3. Matriz de Roles y Control de Acceso (RBAC)

La plataforma implementa un control de acceso basado en roles estricto en la base de datos (RLS) y en la capa de enrutamiento del cliente:

| Rol de Usuario | Alcance de Datos (RLS) | Vista Inicial / Inicio | Capacidades y Funciones Principales |
| :--- | :--- | :--- | :--- |
| **`directivo`** *(Director / Subdirector)* | Todo el plantel correspondiente al `plantel_id` del usuario. | `/director/inicio` (`InicioDA.tsx`) | • Visión ejecutiva global del plantel en tiempo real.<br>• Generación e impresión del **Reporte Ejecutivo Directivo de Plantel** en PDF.<br>• Consulta del **Agente IA de Inteligencia Directiva** (Groq Llama 3.3 70B con datos seudonimizados).<br>• **Gestión de Usuarios** (`/director/usuarios`): Invitación y activación de cuentas mediante Edge Function `invite-user`, reseteo de contraseñas y desbloqueos.<br>• Configuración y apertura de Periodos Escolares.<br>• Envío masivo de avisos institucionales. |
| **`orientador`** *(Orientador / Psicopedagógico)* | Todo el plantel correspondiente al `plantel_id` del usuario. | `/director/inicio` (`InicioDA.tsx`) | • Monitoreo continuo del **Radar de Alumnos en Atención Prioritaria** ordenado por Risk Score SQL.<br>• Consulta del Expediente Conductual del Alumno con gráfica Recharts y diagnóstico narrativo.<br>• Consulta del Agente IA de Inteligencia Directiva.<br>• *(Restricción Probada: Acceso a `/director/usuarios` bloqueado por RLS y enrutamiento)*. |
| **`docente`** / **`maestro`** | Exclusivamente a los grupos donde imparte asignatura (`v_teacher_group_ids`). | `/maestro/inicio` (`InicioMaestro.tsx`) | • **Pase de Lista Granular 3+3**: Asistencia (Asistió, Retardo, Falta, Falta Justificada) + Desempeño (Participó, Neutral, No Participó).<br>• Registro inmediato de incidencias conductuales (leves, moderadas, críticas).<br>• Consulta del Centro BI & KPIs filtrado por RLS únicamente para sus asignaturas. |
| **`alumno`** / **`estudiante`** | Exclusivamente sus propios registros (`usuario_id = auth.uid()`). | `/alumno/inicio` (`Home.tsx`) | • Consulta del saldo acumulado de Puntos Conductuales (Base 100 pts) y nivel de semáforo (Verde, Naranja, Rojo).<br>• Visualización de la gráfica de trayectoria personal.<br>• Consulta del historial personal segmentado por pastillas de observaciones.<br>• Consulta de horario de clases (`/alumno/horario`). |
| **`padre`** / **`tutor`** | Exclusivamente a los alumnos vinculados en `padres_alumnos`. | `/alumno/inicio` (`Home.tsx`) | • Recepción de alertas preventivas en tiempo real ante cambios a Semáforo Naranja o Rojo.<br>• Visualización de la asistencia e incidencias del estudiante tutelado. |
| **`pendiente`** | Ningún acceso a datos institucionales. | `/pendiente-activacion` (`PendienteActivacion.tsx`) | • Pantalla institucional de espera hasta que un directivo active la cuenta. Evita bucles de redirección con el login. |

---

## 4. Motor Analítico de Riesgo en SQL (PostgreSQL Risk Engine)

El cálculo del riesgo conductual y la aceleración de faltas corre **100% en SQL dentro de PostgreSQL** ([`20260728220000_risk_engine_sql.sql`](file:///c:/Users/User/Documents/SSC/supabase/migrations/20260728220000_risk_engine_sql.sql)), garantizando que la base de datos sea la fuente única e inmutable de verdad:

### 1. Función Inmutable `fn_calcular_ewma`
Calcula el promedio móvil ponderado exponencialmente ($\alpha = 0.3$) sobre la serie cronológica de puntos conductuales del alumno:
$$\text{EWMA}_i = \alpha \cdot X_i + (1 - \alpha) \cdot \text{EWMA}_{i-1}$$

```sql
CREATE OR REPLACE FUNCTION public.fn_calcular_ewma(
    p_valores numeric[],
    p_alpha numeric DEFAULT 0.3
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_resultado numeric;
    v_valor numeric;
    v_len integer;
BEGIN
    v_len := array_length(p_valores, 1);
    IF p_valores IS NULL OR v_len IS NULL OR v_len = 0 THEN
        RETURN 100;
    END IF;

    v_resultado := p_valores[1];
    FOR i IN 2..v_len LOOP
        v_valor := p_valores[i];
        v_resultado := p_alpha * v_valor + (1 - p_alpha) * v_resultado;
    END LOOP;

    RETURN ROUND(v_resultado, 1);
END;
$$;
```

### 2. Función Inmutable `fn_calcular_risk_score`
Evalúa el riesgo multivariable de deserción escolar ponderando 4 dimensiones conductuales:
- **Factor ISC (40%)**: Pérdida del Índice de Salud Conductual actual.
- **Factor Incidencias Críticas (30%)**: Faltas graves con semáforo rojo ($\min(100, \text{críticas} \times 25) \times 0.3$).
- **Factor Caída EWMA (20%)**: Caída reciente acelerada ($\min(100, \text{caída} \times 2.5) \times 0.2$).
- **Factor Volumen (10%)**: Total de incidencias acumuladas ($\min(100, \text{total} \times 10) \times 0.1$).

Clasificación resultante:
- **`critico`**: Score $\ge 70\%$ o ISC $< 70$ pts.
- **`alto`**: Score $\ge 40\%$ o ISC $< 90$ pts.
- **`moderado`**: Score $\ge 20\%$.
- **`bajo`**: Score $< 20\%$.

### 3. RPC `fn_bi_get_risk_score_alumno`
Función `SECURITY DEFINER` que consulta la base de datos con RLS, construye el historial cronológico `ARRAY[100] || puntos` y ejecuta la evaluación multivariable para un estudiante.

### 4. RPC `fn_bi_get_risk_students`
Consulta el listado prioritario de los 10 alumnos con mayor riesgo del plantel, ordenados por `risk_score DESC, puntos_totales ASC`.

---

## 5. Agente IA de Inteligencia Directiva y Protección de Datos (LGPDPPSO)

El Agente IA sintetiza en lenguaje natural la situación del plantel utilizando el modelo **Llama 3.3 70B Versatile** en Groq:

### Ubicación y Seguridad del Servidor
- **Ubicación de la llamada a Groq**: Supabase Edge Function aislada (`supabase/functions/groq-agent/index.ts`). El frontend jamás invoca la API de Groq directamente.
- **Verificación Estricta de Rol (RBAC en Edge Function)**:
  Una vez verificado el token JWT (`auth.getUser()`), la Edge Function consulta PostgreSQL utilizando `SUPABASE_SERVICE_ROLE_KEY` para validar que el rol del usuario pertenezca explícitamente a `['directivo', 'orientador']` y que la cuenta esté activa (`activo = true`). De lo contrario, responde inmediatamente con **HTTP 403 Forbidden**.

### Seudonimización Obligatoria (Cumplimiento LGPDPPSO)
Para cumplir con la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO) respecto a los datos de estudiantes menores de edad:
- La función `buildFullDbContext()` en `BIAnalyticsDashboard.tsx` **elimina por completo `nombre_completo` y `matricula`** de la sección `_seccion_alumnos_riesgo` antes de enviar el contexto a Groq.
- Se inyecta un identificador secuencial seudonimizado (`Estudiante #1`, `Estudiante #2`...):

```typescript
_seccion_alumnos_riesgo: {
  _descripcion: 'Alumnos en atención prioritaria ordenados por Risk Score SQL - Datos Seudonimizados por LGPDPPSO',
  total_en_riesgo: (riskStudents || []).length,
  top_15: (riskStudents || []).slice(0, 15).map((s, idx) => ({
    identificador: `Estudiante #${idx + 1}`,
    grupo: s.grupo_nombre,
    semaforo: s.nivel_semaforo,
    puntos_isc: s.puntos_totales,
    incidencias: s.total_incidencias,
    risk_score: s.risk_score ?? null,
    risk_categoria: s.risk_categoria ?? null,
  })),
}
```

- Las demás secciones (`_seccion_KPIs`, `_seccion_tendencia_temporal`, `_seccion_categorias_frecuentes`) contienen únicamente métricas agregadas globales.
- La tabla de la interfaz (`BIRiskTable.tsx`) muestra nombres y matrículas reales directamente desde PostgreSQL vía RLS sin pasar por el LLM.

---

## 6. Módulo de Business Intelligence (BI) y Realtime WebSockets

El módulo de BI proporciona tableros analíticos en tiempo real mediante RPCs de PostgreSQL y suscripciones WebSockets:

### Funciones RPC en PostgreSQL
1. `fn_bi_get_kpis(p_periodo_id, p_generacion, p_grupo_id, p_severidad, p_rango_temporal)`: Devuelve el ISC promedio, distribución semafórica (verde, naranja, rojo), total de incidencias y alumnos evaluados.
2. `fn_bi_get_trend(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`: Agrupa incidencias por periodo temporal para renderizar gráficas de evolución conductual en Recharts.
3. `fn_bi_get_categories(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`: Desglose de categorías más frecuentes y su severidad.
4. `fn_bi_get_risk_students(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`: Retorna la lista prioritaria de estudiantes en riesgo.

### Suscripción Realtime WebSockets
- Las tablas `public.incidencias` y `public.notificaciones` pertenecen a la publicación `supabase_realtime` ([`20260728230000_enable_realtime.sql`](file:///c:/Users/User/Documents/SSC/supabase/migrations/20260728230000_enable_realtime.sql)).
- `BIAnalyticsDashboard.tsx` y `NotificationCenter.tsx` escuchan eventos `postgres_changes` vía WebSocket para actualizar las métricas y las alertas al instante sin recargar la página.

### Índices de Rendimiento Compuestos
- `idx_incidencias_alumno_created`: `public.incidencias(alumno_id, created_at ASC)`.
- `idx_incidencias_alumno_categoria`: `public.incidencias(alumno_id, categoria_id)`.

---

## 7. Consolidación de Navegación y Hooks Personalizados

### 1. Resolución de Rutas Centralizada (`src/constants/routes.ts`)
Para evitar discrepancias entre componentes, la asignación de rutas por rol se consolida en un único helper:

```typescript
export const RUTA_INICIO_POR_ROL: Record<string, string> = {
  alumno: '/alumno/inicio',
  docente: '/maestro/inicio',
  directivo: '/director/inicio',
  orientador: '/director/inicio',
  padre: '/alumno/inicio',
  pendiente: '/pendiente-activacion',
};

export function resolverRutaInicio(rol: string | null | undefined): string {
  if (!rol) return '/login';
  return RUTA_INICIO_POR_ROL[rol] ?? '/login';
}
```

Consumido unificadamente por `App.tsx` (`RequireAuth` y `DefaultRouteRedirect`) y `Login.tsx`.

### 2. Custom Hook `useEscapeToClose` (`src/hooks/useEscapeToClose.ts`)
Gestiona el cierre de modales mediante la tecla `Escape`. Incluye un guard que inspecciona `document.activeElement`; si el foco está sobre un elemento editable (`<input>`, `<textarea>`, `<select>` o `contenteditable`), ignora la tecla `Escape` para evitar cierres accidentales durante la edición de campos.

---

## 8. Optimización de Rendimiento y Experiencia de Usuario (UI/UX)

- **Code-Splitting por Rutas con `React.lazy()`**: Reducción del paquete principal de JavaScript de **1,030 kB a 464 kB** (-55% de peso).
- **Modales en Portales React (`ReactDOM.createPortal`)**: Renderizado directo en `document.body` a `z-index: 9999` o `2000`, con transiciones `cubic-bezier(0.16, 1, 0.3, 1)` y bloqueo de scroll de fondo (`document.body.classList.add('no-scroll')`).
- **Navegación Móvil Flotante (`BottomNav.tsx`)**: Barra inferior flotante tipo ClickUp con soporte para iOS Safe Area (`bottom: max(14px, env(safe-area-inset-bottom, 14px))`), respuesta háptica (`navigator.vibrate`) y conmutador de tema **Modo Claro / Modo Oscuro (`ThemeToggle.tsx`)**.

---

## 9. Instrucciones de Compilación y Verificación

### Requisitos Previos
- Node.js 20 o superior
- pnpm (v9 o v10)
- Supabase CLI

### Pasos de Instalación y Ejecución Local

```bash
# 1. Instalar dependencias del proyecto
pnpm install

# 2. Ejecutar servidor local de desarrollo
pnpm dev

# 3. Verificación de tipos estricta de TypeScript (tsc -b)
npx tsc -b

# 4. Compilación de producción con Vite
pnpm build
```

---

## 10. Estructura de Directorios del Proyecto

```
SSC/
├── frontend/
│   ├── src/
│   │   ├── assets/              # Logos e imágenes institucionales
│   │   ├── components/          # Componentes reutilizables UI y BI
│   │   │   ├── bi/              # Dashboard BI, Tablas de Riesgo y Modales IA
│   │   │   ├── navigation/      # BottomNav flotante para móviles
│   │   │   ├── Modal.tsx        # Componente Modal genérico
│   │   │   ├── NotificationCenter.tsx # Centro de notificaciones Realtime
│   │   │   └── ThemeToggle.tsx  # Conmutador de Modo Claro / Oscuro
│   │   ├── constants/           # Constantes globales (routes.ts)
│   │   ├── context/             # AuthContext (Estado global de sesión y rol)
│   │   ├── hooks/               # Custom hooks (useEscapeToClose.ts)
│   │   ├── layouts/             # Layouts por rol (Director, Teacher, Student)
│   │   ├── lib/                 # Cliente Supabase
│   │   ├── pages/               # Vistas principales divididas por rol
│   │   ├── services/            # Servicios de datos, RPCs y Edge Function Groq
│   │   ├── App.tsx              # Rutas principales con React.lazy y RequireAuth
│   │   ├── index.css            # Sistema de diseño CSS global y variables
│   │   └── main.tsx             # Punto de entrada de la aplicación React
│   ├── package.json
│   └── vite.config.ts
├── supabase/
│   ├── functions/               # Edge Functions (groq-agent, invite-user)
│   │   └── groq-agent/index.ts  # Servidor Deno del Agente IA con RBAC 403
│   └── migrations/              # 12 migraciones SQL versionadas
└── README.md                    # Documentación técnica oficial
```
