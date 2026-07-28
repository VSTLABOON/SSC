# Sistema Conductual CONALEP Plantel Puebla I - Documentación Técnica e Integración

Este documento contiene la especificación completa de la arquitectura, base de datos, políticas de seguridad RLS, módulo de Business Intelligence (BI), matriz de roles y funciones, motor analítico preventivo anti-deserción, agente IA resumidor directivo y flujos de navegación aplicados al **Sistema Conductual de CONALEP Plantel Puebla I (EduTrack 360)**.

---

## 1. Descripción General del Sistema

El Sistema Conductual está diseñado para facilitar la gestión de la disciplina, la asistencia y la convivencia escolar en el plantel CONALEP Puebla I. Permite a los docentes registrar pases de lista diarios con esquema granular ($3+3$), participaciones e incidencias de conducta. Los directivos y orientadores supervisan el estado general del plantel, gestionan la permanencia escolar y analizan la trayectoria conductual en tiempo real a través del **Centro de BI & KPIs** y el **Agente IA de Inteligencia Directiva**.

El sistema se basa en una arquitectura cliente-servidor desacoplada utilizando React en el frontend y Supabase (PostgreSQL, Auth, RPCs PostgREST y Edge Functions) en el backend.

---

## 2. Matriz de Roles y Funciones del Sistema

La plataforma implementa un control de acceso basado en roles (RBAC) estricto, donde cada perfil dispone de una vista inicial predeterminada y herramientas especializadas:

| Rol de Usuario | Vista Inicial / Inicio | Funciones y Capacidades Principales |
| :--- | :--- | :--- |
| **`directivo`** *(Director / Subdirector de Plantel)* | **Centro BI & KPIs** (`InicioDA.tsx`) | • Visión ejecutiva global del plantel en tiempo real.<br>• Generación del **Reporte Ejecutivo Directivo de Plantel** en PDF.<br>• Consulta del **Agente IA de Inteligencia Directiva** (Groq Llama 3.3 70B grounded en BD) al dar clic en cualquier KPI o gráfica.<br>• Gestión y activación de cuentas de usuario (`invite-user` Edge Function).<br>• Configuración y apertura de Periodos Escolares (`services/periodos.ts`).<br>• Envío masivo de avisos institucionales a tutores y alumnos. |
| **`orientador`** *(Orientador / Psicopedagógico)* | **Centro BI & KPIs y Radar de Riesgo** (`InicioDA.tsx`) | • Monitoreo continuo del **Radar de Alumnos en Atención Prioritaria**.<br>• Diagnóstico narrativo automático de caídas bruscas y riesgo de deserción escolar.<br>• Evaluación de trayectoria granular (Semanal, Mensual, Bimestral, Semestral) en Recharts `<AreaChart>`.<br>• Generación e impresión de la **Ficha Narrativa de Salud Conductual** por estudiante en PDF.<br>• Coordinación de tutorías presenciales con padres de familia. |
| **`docente`** / **`maestro`** *(Profesor de Asignatura / Tutor)* | **Asignación & Pase de Lista Granular** (`InicioMaestro.tsx`) | • **Pase de Lista Granular 3+3**: Asistencia (Asistió, Retardo, Falta, Falta Justificada con Evidencia) + Desempeño en Aula (Participó, Neutral, No Participó).<br>• Registro inmediato de reportes de conducta leves, moderados y críticos.<br>• Consulta de **Centro BI & KPIs** filtrado exclusivamente para sus grupos asignados.<br>• Consulta del historial por materia estructurado en pastillas (`[Todos]`, `[Positivos]`, `[Leves]`, `[Críticos]`). |
| **`alumno`** / **`estudiante`** | **Mi Expediente Conductual** (`InicioAlumno.tsx`) | • Consulta del saldo acumulado de Puntos Conductuales (Base 100 pts).<br>• Visualización de la gráfica de evolución y nivel de semáforo (Verde, Naranja, Rojo).<br>• Consulta del historial personal segmentado por pastillas de méritos y observaciones.<br>• Insignias de reconocimiento conductual y puntualidad. |
| **`padre`** / **`tutor`** *(Tutor Legal)* | **Expediente Conductual del Hijo(a)** (`PortalPadres.tsx`) | • Recepción de avisos e instantáneas de alertamiento ante variaciones a Semáforo Naranja o Rojo.<br>• Visualización de la asistencia diaria registrada por clase.<br>• Descarga de la Ficha Narrativa de Salud Conductual y firma de compromisos de tutoría. |

---

## 3. Módulo de Business Intelligence (BI) y Analítica Conductual

El módulo de BI proporciona tableros analíticos en tiempo real para directivos, orientadores y docentes, basándose en la ejecución de RPCs con seguridad RLS estricta:

### Funciones RPC en PostgreSQL (Fuente Única de Verdad)
1. `fn_bi_get_kpis(p_periodo_id, p_generacion, p_grupo_id, p_severidad, p_rango_temporal)`:
   - Devuelve el Índice de Salud Conductual (ISC promedio), distribución semafórica (verde, naranja, rojo), total de incidencias y alumnos en riesgo prioritario.
   - Aplica filtrado estricto `WHERE g.plantel_id = v_plantel_id` asegurando aislamiento multi-tenant por plantel.
2. `fn_bi_get_trend(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`:
   - Agrupa incidencias por periodo temporal para renderizar gráficas de evolución conductual en Recharts.
3. `fn_bi_get_categories(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`:
   - Retorna el desglose de categorías más recurrentes (asistencia, uniformes, disciplina).
4. `fn_bi_get_risk_students(p_periodo_id, p_generacion, p_grupo_id, p_rango_temporal)`:
   - Retorna la lista prioritaria de estudiantes con mayor acumulación de incidencias y permite notificar a los tutores.

---

## 4. Motor Analítico Preventivo Anti-Deserción Escolar (`bi_analytics_engine.ts`)

Para evitar que el estudiante sea tratado como un "número frío" u obsoleto, se implementaron algoritmos preventivos de salud conductual:

1. **Algoritmo EWMA (*Exponentially Weighted Moving Average*)**:
   - Pondera exponencialmente ($\alpha = 0.3$) las incidencias recientes sobre los eventos pasados.
   - Detecta caídas bruscas ($\ge 15$ pts) semanas antes de que afecten el promedio acumulado.
2. **Algoritmo Multivariable de Riesgo de Deserción (*Composite Risk Score*)**:
   - Evalúa 4 dimensiones: $40\%$ ISC Actual + $30\%$ Incidencias Críticas + $20\%$ Velocidad de Caída (EWMA Delta) + $10\%$ Volumen de Observaciones.
   - Clasifica en 4 categorías: `Bajo` ($0-25\%$), `Moderado` ($26-49\%$), `Alto` ($50-69\%$) y `Crítico` ($\ge 70\%$).
3. **Generador de Reportes Narrativos Automatizados**:
   - Transforma los datos tabulares de PostgreSQL en síntesis ejecutivas en lenguaje natural a nivel **Alumno**, **Grupo** y **Plantel Completo**.

---

## 5. Agente IA de Inteligencia Directiva (`ExecutiveChartAgentModal.tsx` & `groq_agent_service.ts`)

- **Modelo**: Conectado con la API de **Groq** (`llama-3.3-70b-versatile`).
- **Garantía de Cero Alucinaciones (PostgreSQL Grounding)**:
  - Al dar clic sobre cualquier tarjeta KPI o gráfica del tablero de BI, la aplicación primero ejecuta las funciones RPC de PostgreSQL.
  - El resultado real de la base de datos se inyecta en el System Prompt del modelo con baja temperatura (`0.2`).
  - El agente **únicamente sintetiza y redacta en español fluido lo que la base de datos acaba de calcular**. Si la BD devuelve 0 registros, el agente reporta 0 registros sin inventar estadísticas.
- **Chat Interactivo**: Permite a los directivos realizar preguntas de seguimiento sobre recomendaciones pedagógicas o estrategias de permanencia.

---

## 6. Rediseño UX/UI e Iconografía Nítida

- **Restricción Estricta de Emojis**: La interfaz completa está libre de emojis y utiliza exclusivamente íconos vectoriales oficiales de **Material Symbols Outlined** (`font-variation-settings: 'FILL' 0, 'wght' 400`).
- **Navegación Móvil Flotante (`BottomNav.tsx`)**: Barra de navegación inferior flotante tipo ClickUp en dispositivos móviles ($< 768\text{px}$) con exclusión mutua por viewport respecto al sidebar de escritorio.
- **Modales en Portal React (`ReactDOM.createPortal`)**: Todos los modales del sistema se renderizan directo en `document.body` a `z-index: 9999`, garantizando un centrado instantáneo en pantalla independientemente del scroll o jerarquía del DOM.
- **Sistema de Pastillas de Organización (`Pill Tabs`)**: Bitácora conductual segmentada enpastillas limpias (`[list_alt] Todos`, `[check_circle] Positivos`, `[warning] Leves`, `[error] Críticos`).

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
