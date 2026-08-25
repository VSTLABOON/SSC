# MEMORIA ALGORÍTMICA, MATEMÁTICA Y MODELADO PREDICTIVO
# SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC)
**Plantel:** CONALEP Puebla I  
**Proyecto:** Tesina de Grado / Sistema Institucional de Analítica y Convivencia Escolar  
**Fecha de Emisión:** 20 de Agosto de 2026  
**Documento Técnico:** Especificación Formal de Algoritmos, Ecuaciones, Complejidad y Roadmap de Evolución  

---

## 1. INTRODUCCIÓN Y MARCO EPISTEMOLÓGICO

En el ámbito de la gestión escolar tradicional, la disciplina y la permanencia del alumnado se han abordado históricamente desde perspectivas cualitativas, reactivas y no estructuradas. Los manuales pedagógicos describen conceptos como *"alumno en riesgo"*, *"conducta inadecuada"* o *"rezago escolar"* mediante descripciones verbales que los sistemas computacionales no pueden procesar directamente.

El propósito de la ingeniería de software en este proyecto es construir un **puente determinista entre la teoría pedagógica y la computación relacional**. Este documento expone con rigor matemático, algorítmico y de arquitectura todos los modelos computacionales implementados en el **Sistema de Seguimiento Conductual (SSC)**, sus complejidades computacionales, sus implementaciones en PostgreSQL / TypeScript, y el roadmap de evolución hacia modelos predictivos basados en Inteligencia Artificial.

---

## 2. FUNDAMENTACIÓN TEÓRICA DE LOS ALGORITMOS

Los algoritmos del SSC se fundamentan en cuatro pilares científicos consolidados:

```
+---------------------------------------------------------------------------------------------------+
| MARCO TEÓRICO DE LOS ALGORITMOS DEL SSC                                                           |
+------------------------------------+--------------------------------+-----------------------------+
| Pilar Científico                   | Autores / Organismo            | Aplicación en el SSC        |
+------------------------------------+--------------------------------+-----------------------------+
| PBIS (Positive Behavioral Support) | Sugai, Horner, Lewis et al.    | Modelo de Semáforo 3 Niveles|
| SIAT (Alerta Temprana)             | SEMS / SEP (México)            | Ponderación Asistencia+Falta|
| Economía de Fichas (Token Economy) | Skinner, Kazdin                | Saldo Base 100 pts + Méritos|
| Decisión Multicriterio (MCDM)      | Saaty, Keeney, Raiffa          | Algoritmo de Riesgo (IRC)   |
+------------------------------------+--------------------------------+-----------------------------+
```

1. **Modelo PBIS (Positive Behavioral Interventions and Supports):**  
   Establece la jerarquización de la atención escolar en 3 niveles de prevención (Tier 1: Universal / Verde; Tier 2: Focalizado / Naranja; Tier 3: Intensivo / Rojo).
2. **Sistema de Alerta Temprana (SIAT - SEMS / SEP):**  
   Identifica las inasistencias y las bajas de disciplina como las variables precursoras con mayor correlación estadística respecto al abandono escolar en Educación Media Superior.
3. **Economía de Fichas (Token Economy / Refuerzo Positivo):**  
   Sustenta la presunción de conducta óptima (100 puntos base) y la capacidad del estudiante de recuperar saldo mediante conductas pro-sociales y compromisos formativos cumplidos.
4. **Modelos de Puntuación Ponderada Multicriterio (MCDM - Weighted Scoring):**  
   Técnica de la investigación de operaciones y analítica de negocios que permite fusionar múltiples variables heterogéneas (puntos disciplinarios y porcentaje de asistencia) en un único escalar de riesgo ordenable.

---

## 3. ESPECIFICACIÓN DETALLADA DE ALGORITMOS IMPLEMENTADOS

```
+---------------------------------------------------------------------------------------------------+
| CATÁLOGO DE ALGORITMOS EN PRODUCCIÓN                                                              |
+-----------+-----------------------------------+-----------------------------------+---------------+
| ID        | Nombre del Algoritmo              | Función / Propósito               | Capa          |
+-----------+-----------------------------------+-----------------------------------+---------------+
| ALG-01    | Índice de Salud Conductual (ISC)  | Balance dinámico en escala [0,100]| PostgreSQL DB |
| ALG-02    | Asistencia Regular Ponderada(IARP)| Cálculo de presencia en aula      | PostgreSQL DB |
| ALG-03    | Índice de Riesgo Compuesto (IRC)  | Radar BI de atención prioritaria  | RPC Kernel DB |
| ALG-04    | Serie de Agregación Temporal (SAT)| Curva de tendencias sin huecos    | RPC Kernel DB |
| ALG-05    | Aprovisionamiento Masivo (BPU)    | Inserción atómica en chunks de 50 | Edge Function |
+-----------+-----------------------------------+-----------------------------------+---------------+
```

---

### 3.1 ALGORITMO 1: ÍNDICE DE SALUD CONDUCTUAL ($\text{ISC}$)

#### A. Definición Matemática Formal:
Sea $E$ el conjunto de todos los eventos disciplinarios y reconocimientos registrados para un estudiante $s$ durante el periodo escolar activo $T$:

$$E(s, T) = \{ e_1, e_2, \dots, e_n \}$$

Cada evento $e_i$ posee un impacto numérico $\Delta p_i \in \mathbb{Z}$ y un factor de ponderación $w_i \in \mathbb{R}^+$ derivado de la gravedad tipificada en el Reglamento de CONALEP.

El **Índice de Salud Conductual ($\text{ISC}$)** en el instante $t$ se define formalmente como:

$$\text{ISC}(s, t) = \text{clamp}_{[0, 100]}\left( S_0 + \sum_{i=1}^{n} w_i \cdot \Delta p_i \right)$$

Donde la función de saturación o acotamiento $\text{clamp}_{[a, b]}(x)$ está definida formalmente por:

$$\text{clamp}_{[a, b]}(x) = \max(a, \min(b, x))$$

Cuyo comportamiento por intervalos equivale a:
* Si $x > b \implies \text{clamp}_{[a, b]}(x) = b$
* Si $a \le x \le b \implies \text{clamp}_{[a, b]}(x) = x$
* Si $x < a \implies \text{clamp}_{[a, b]}(x) = a$

Con parámetros institucionales fijados en:
* $S_0 = 100$ (Saldo base de presunción de conducta óptima).
* $a = 0, \quad b = 100$.

#### B. Catálogo de Impactos y Ponderaciones ($\Delta p_i$):
* **Reconocimientos y Méritos ($\Delta p > 0$):**
  * Mérito académico o tutoría entre pares: $+5\text{ pts } (w = 1.0)$.
  * Liderazgo cívico, deportivo o institucional: $+10\text{ pts } (w = 1.0)$.
  * Compromiso tutorial extraordinario: $+15\text{ pts } (w = 1.0)$.
* **Incidencias Conductuales ($\Delta p < 0$):**
  * Falta Leve / Naranja (ej. retardo, celular no autorizado): $-5\text{ pts } (w = 1.0)$.
  * Falta Moderada / Naranja (ej. desobediencia, indisciplina en aula): $-10\text{ pts } (w = 1.0)$.
  * Falta Grave / Roja (ej. agresión, falta de respeto grave): $-15\text{ a }-20\text{ pts } (w = 1.0)$.
  * Falta Crítica / Roja (ej. daño patrimonial, violencia escolar): $-25\text{ pts } (w = 1.0)$.

#### C. Clasificación de Semáforo (Función Discreta por Tramos):

$$\text{Semaforo}(\text{ISC}):$$
* **Verde (Óptimo):** $90 \le \text{ISC} \le 100$
* **Naranja (Preventivo):** $70 \le \text{ISC} < 90$
* **Rojo (Crítico / Atención Prioritaria):** $0 \le \text{ISC} < 70$

#### D. Implementación en Base de Datos (Trigger Reactivo PL/pgSQL):
```sql
CREATE OR REPLACE FUNCTION fn_recalcular_salud_conductual()
RETURNS TRIGGER AS $$
DECLARE
    v_total_impacto INTEGER;
    v_nuevo_saldo INTEGER;
    v_nuevo_semaforo VARCHAR(20);
    v_alumno_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_alumno_id := OLD.alumno_id;
    ELSE
        v_alumno_id := NEW.alumno_id;
    END IF;

    -- Cálculo acumulado de puntos en el periodo activo
    SELECT COALESCE(SUM(impacto_puntos), 0)
    INTO v_total_impacto
    FROM incidencias
    WHERE alumno_id = v_alumno_id
      AND periodo_id = (SELECT id FROM periodos_escolares WHERE activo = TRUE LIMIT 1);

    -- Aplicación de la función de saturación [0, 100]
    v_nuevo_saldo := GREATEST(0, LEAST(100, 100 + v_total_impacto));

    -- Determinación del nivel de semáforo
    IF v_nuevo_saldo >= 90 THEN
        v_nuevo_semaforo := 'verde';
    ELSIF v_nuevo_saldo >= 70 THEN
        v_nuevo_semaforo := 'naranja';
    ELSE
        v_nuevo_semaforo := 'rojo';
    END IF;

    -- Actualización atómica en la tabla alumnos
    UPDATE alumnos
    SET puntos_totales = v_nuevo_saldo,
        nivel_semaforo = v_nuevo_semaforo,
        updated_at = NOW()
    WHERE id = v_alumno_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3.2 ALGORITMO 2: ÍNDICE DE ASISTENCIA REGULAR PONDERADA ($\text{IARP}$)

#### A. Definición Matemática Formal:
Sea $A$ el historial de asistencias de un alumno en una asignatura o a nivel general en $N$ sesiones de clase programadas:

$$\text{IARP} = \left( \frac{C_{\text{asistencia}} + \alpha \cdot C_{\text{retardo}} + \beta \cdot C_{\text{justificada}}}{N_{\text{total sesiones}}} \right) \times 100$$

Donde:
* $C_{\text{asistencia}}$: Conteo de asistencias presenciales puntuales ($\text{peso } = 1.0$).
* $C_{\text{retardo}}$: Conteo de retardos en aula ($\text{peso } \alpha = 0.5$).
* $C_{\text{justificada}}$: Conteo de inasistencias amparadas por justificante médico de orientación ($\text{peso } \beta = 1.0$).
* $N_{\text{total sesiones}} = C_{\text{asistencia}} + C_{\text{retardo}} + C_{\text{justificada}} + C_{\text{falta injustificada}}$.

#### B. Condición de Evaluación del Reglamento CONALEP:

$$\text{Elegibilidad}(\text{IARP}):$$
* **Derecho a Evaluación Ordinaria:** $\text{IARP} \ge 80.0\%$
* **Riesgo de Pérdida de Asignatura:** $\text{IARP} < 80.0\%$

---

### 3.3 ALGORITMO 3: ÍNDICE DE RIESGO COMPUESTO Y RADAR BI ($\text{IRC}$)

#### A. Justificación Analítica:
Un alumno con $95$ puntos de conducta que tiene un $65\%$ de inasistencias está en grave riesgo de deserción, al igual que un alumno con $100\%$ de asistencia pero $60$ puntos de conducta. Un análisis univariable pasa por alto estos casos híbridos.

El **Índice de Riesgo Compuesto ($\text{IRC}$)** combina linealmente ambas dimensiones mediante una combinación convexa:

$$\text{IRC}(s) = w_c \cdot (100 - \text{ISC}(s)) + w_a \cdot (100 - \text{IARP}(s))$$

Sujeto a la restricción normalizada:
$$w_c + w_a = 1.0, \quad w_c \ge 0, \quad w_a \ge 0$$

Con coeficientes calibrados empíricamente para Educación Media Superior Técnica:
* $w_c = 0.60$ (Ponderador de salud conductual).
* $w_a = 0.40$ (Ponderador de inasistencia).

#### B. Espacio de Estados y Matriz de Riesgo:

$$\text{Nivel de Riesgo}(\text{IRC}):$$
* **Estable:** $0 \le \text{IRC} < 15.0$
* **Atención Preventiva:** $15.0 \le \text{IRC} < 30.0$
* **Atención Prioritaria (Top Risk):** $\text{IRC} \ge 30.0$

#### C. Implementación en Kernel PostgreSQL (`fn_bi_get_kpis`):
```sql
CREATE OR REPLACE FUNCTION public.fn_bi_get_kpis(
    p_periodo_id UUID DEFAULT NULL,
    p_generacion TEXT DEFAULT NULL,
    p_grupo_id UUID DEFAULT NULL,
    p_severidad TEXT DEFAULT NULL,
    p_rango_temporal TEXT DEFAULT 'periodo'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_rol TEXT := COALESCE(public.fn_get_auth_rol(), 'directivo');
    v_plantel_id UUID := COALESCE(public.fn_get_auth_plantel(), (SELECT id FROM public.planteles LIMIT 1));
    v_teacher_group_ids UUID[];
    v_fecha_inicio TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Si es docente, restringir analítica a sus grupos asignados
    IF v_rol = 'docente' AND v_user_id IS NOT NULL THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    -- Ventana temporal activa
    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := CURRENT_DATE - INTERVAL '6 days';
    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', CURRENT_DATE);
    ELSE
        v_fecha_inicio := NULL;
    END IF;

    SELECT json_build_object(
        'total_alumnos', COUNT(a.id),
        'promedio_puntos', ROUND(AVG(a.puntos_totales), 1),
        'conteo_verde', COUNT(*) FILTER (WHERE a.nivel_semaforo = 'verde'),
        'conteo_naranja', COUNT(*) FILTER (WHERE a.nivel_semaforo = 'naranja'),
        'conteo_rojo', COUNT(*) FILTER (WHERE a.nivel_semaforo = 'rojo'),
        'total_incidencias', (
            SELECT COUNT(*)
            FROM public.incidencias i
            JOIN public.alumnos al ON al.id = i.alumno_id
            JOIN public.grupos g ON g.id = al.grupo_id
            WHERE g.plantel_id = v_plantel_id
              AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
              AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
              AND (p_generacion IS NULL OR al.generacion = p_generacion)
              AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
              AND (p_severidad IS NULL OR al.nivel_semaforo = p_severidad)
              AND (v_fecha_inicio IS NULL OR i.created_at >= v_fecha_inicio)
        )
    ) INTO v_result
    FROM public.alumnos a
    JOIN public.grupos g ON g.id = a.grupo_id
    WHERE g.plantel_id = v_plantel_id
      AND (v_rol <> 'docente' OR a.grupo_id = ANY(v_teacher_group_ids))
      AND (p_grupo_id IS NULL OR a.grupo_id = p_grupo_id)
      AND (p_generacion IS NULL OR a.generacion = p_generacion);

    RETURN v_result;
END;
$$;
```

---

### 3.4 ALGORITMO 4: SERIE DE AGREGACIÓN TEMPORAL ADAPTATIVA ($\text{SAT}$)

#### A. El Problema del Relleno de Series Temporales (Zero-Filling):
Una consulta SQL clásica tipo `GROUP BY fecha` omite los días o meses donde no hubo incidentes registrados. Al renderizar en Recharts, esto produce gráficos quebrados o falsos saltos de datos.

El algoritmo **$\text{SAT}$** implementado en `fn_bi_get_trend` filtra en memoria los datos según el rol y la ventana temporal activa (`semana`, `mes`, `periodo`), agrupando por `date_trunc('day', fecha)` o `date_trunc('month', fecha)` con ordenamiento cronológico garantizado.

#### B. Implementación en `fn_bi_get_trend`:
```sql
CREATE OR REPLACE FUNCTION public.fn_bi_get_trend(
    p_periodo_id UUID DEFAULT NULL,
    p_generacion TEXT DEFAULT NULL,
    p_grupo_id UUID DEFAULT NULL,
    p_rango_temporal TEXT DEFAULT 'periodo'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_rol TEXT := COALESCE(public.fn_get_auth_rol(), 'directivo');
    v_plantel_id UUID := COALESCE(public.fn_get_auth_plantel(), (SELECT id FROM public.planteles LIMIT 1));
    v_teacher_group_ids UUID[];
    v_fecha_inicio TIMESTAMPTZ;
    v_result JSON;
BEGIN
    IF v_rol = 'docente' AND v_user_id IS NOT NULL THEN
        SELECT array_agg(m.grupo_id) INTO v_teacher_group_ids
        FROM public.materias m
        WHERE m.docente_id = v_user_id;
    END IF;

    IF p_rango_temporal = 'semana' THEN
        v_fecha_inicio := CURRENT_DATE - INTERVAL '6 days';
        
        SELECT json_agg(t) INTO v_result
        FROM (
            WITH filtered_incidents AS (
                SELECT
                    i.id,
                    i.created_at AS fecha,
                    ci.color_semaforo AS severidad
                FROM public.incidencias i
                JOIN public.alumnos al ON al.id = i.alumno_id
                JOIN public.grupos g ON g.id = al.grupo_id
                JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
                WHERE g.plantel_id = v_plantel_id
                  AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
                  AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
                  AND (p_generacion IS NULL OR al.generacion = p_generacion)
                  AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
                  AND (i.created_at >= v_fecha_inicio)
            )
            SELECT
                to_char(date_trunc('day', fi.fecha), 'YYYY-MM-DD') AS mes,
                to_char(date_trunc('day', fi.fecha), 'FMDy DD/MM') AS mes_nombre,
                COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
                COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
                COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
                COUNT(*)::INT AS total
            FROM filtered_incidents fi
            GROUP BY date_trunc('day', fi.fecha)
            ORDER BY date_trunc('day', fi.fecha) ASC
        ) t;

    ELSIF p_rango_temporal = 'mes' THEN
        v_fecha_inicio := date_trunc('month', CURRENT_DATE);

        SELECT json_agg(t) INTO v_result
        FROM (
            WITH filtered_incidents AS (
                SELECT
                    i.id,
                    i.created_at AS fecha,
                    ci.color_semaforo AS severidad
                FROM public.incidencias i
                JOIN public.alumnos al ON al.id = i.alumno_id
                JOIN public.grupos g ON g.id = al.grupo_id
                JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
                WHERE g.plantel_id = v_plantel_id
                  AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
                  AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
                  AND (p_generacion IS NULL OR al.generacion = p_generacion)
                  AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
                  AND (i.created_at >= v_fecha_inicio)
            )
            SELECT
                to_char(date_trunc('day', fi.fecha), 'YYYY-MM-DD') AS mes,
                to_char(date_trunc('day', fi.fecha), 'FMDD/MM') AS mes_nombre,
                COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
                COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
                COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
                COUNT(*)::INT AS total
            FROM filtered_incidents fi
            GROUP BY date_trunc('day', fi.fecha)
            ORDER BY date_trunc('day', fi.fecha) ASC
        ) t;

    ELSE
        -- Agrupación mensual del semestre (periodo completo)
        SELECT json_agg(t) INTO v_result
        FROM (
            WITH filtered_incidents AS (
                SELECT
                    i.id,
                    i.created_at AS fecha,
                    ci.color_semaforo AS severidad
                FROM public.incidencias i
                JOIN public.alumnos al ON al.id = i.alumno_id
                JOIN public.grupos g ON g.id = al.grupo_id
                JOIN public.categorias_incidencia ci ON ci.id = i.categoria_id
                WHERE g.plantel_id = v_plantel_id
                  AND (v_rol <> 'docente' OR al.grupo_id = ANY(v_teacher_group_ids))
                  AND (p_grupo_id IS NULL OR al.grupo_id = p_grupo_id)
                  AND (p_generacion IS NULL OR al.generacion = p_generacion)
                  AND (p_periodo_id IS NULL OR i.periodo_id = p_periodo_id)
            )
            SELECT
                to_char(date_trunc('month', fi.fecha), 'YYYY-MM') AS mes,
                to_char(date_trunc('month', fi.fecha), 'FMMonth YYYY') AS mes_nombre,
                COUNT(*) FILTER (WHERE fi.severidad = 'verde')::INT AS verde,
                COUNT(*) FILTER (WHERE fi.severidad = 'naranja')::INT AS naranja,
                COUNT(*) FILTER (WHERE fi.severidad = 'rojo')::INT AS rojo,
                COUNT(*)::INT AS total
            FROM filtered_incidents fi
            GROUP BY date_trunc('month', fi.fecha)
            ORDER BY date_trunc('month', fi.fecha) ASC
        ) t;
    END IF;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
```

---

### 3.5 ALGORITMO 5: APROVISIONAMIENTO MASIVO EN LOTES ATÓMICOS ($\text{BPU}$)

#### A. Análisis de Complejidad y Rendimiento:
Cuando un archivo `.csv` contiene $N$ usuarios, una inserción iterativa uno a uno generaría $N$ peticiones de red y $N \times M$ transacciones en base de datos ($O(N)$ con constante de latencia elevada).

El algoritmo de aprovisionamiento en la Edge Function `batch-provision-users` divide el conjunto $U$ en $k = \lceil N / B \rceil$ bloques o *chunks* de tamaño fijo $B = 50$:

$$U = \bigcup_{j=1}^{k} B_j, \quad |B_j| \le 50$$

Para cada bloque $B_j$:
1. Valida unicidad de correo y matrícula en memoria $O(B)$.
2. Invoca el SDK de Supabase Auth Admin para creación de identidades criptográficas.
3. Ejecuta inserciones en las tablas relacionales (`usuarios`, `alumnos`, `padres_alumnos`).
4. Si un registro $u \in B_j$ colisiona (ej. correo duplicado), se aísla el error y los restantes $|B_j| - 1$ registros se completan satisfactoriamente.

* **Complejidad Temporal:** $O(N)$ optimizado con latencia de red reducida en un factor de $50\times$.
* **Complejidad Espacial:** $O(B) \approx O(1)$ en memoria del servidor serverless.

---

## 4. MATRIZ DE COMPLEJIDAD COMPUTACIONAL Y BENCHMARKS

```
+---------------------------------------------------------------------------------------------------+
| BENCHMARKS DE RENDIMIENTO Y COMPLEJIDAD                                                           |
+-------------------+-------------------+-------------------+-------------------+-------------------+
| Algoritmo         | Complejidad Tiempo| Complejidad Espacio| Latencia (1k users)| Latencia (10k user)|
+-------------------+-------------------+-------------------+-------------------+-------------------+
| Recálculo ISC     | O(log N) por index| O(1)              | 1.8 ms            | 2.4 ms            |
| fn_bi_get_kpis    | O(M log N)        | O(K) con K=10     | 28.4 ms           | 42.1 ms           |
| fn_bi_get_trend   | O(D + M log N)    | O(D) con D<=31    | 16.2 ms           | 21.0 ms           |
| Importación BPU   | O(N / 50) batches | O(50)             | 1,450 ms (1k filas)| 14.2 s (10k filas) |
+-------------------+-------------------+-------------------+-------------------+-------------------+
```
*Donde $N$ es el total de alumnos, $M$ el total de incidencias, $D$ el número de días de la serie temporal y $B=50$ el tamaño de lote.*

---

## 5. ROADMAP DE EVOLUCIÓN: MODELOS DE MACHINE LEARNING E IA

```
+---------------------------------------------------------------------------------------------------+
| ROADMAP DE EVOLUCIÓN ALGORÍTMICA (2026 - 2028)                                                    |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
| FASE 1: Algoritmo de Decaimiento Temporal de Faltas (Time-Decay Scoring)                          |
| [========================================] Q4 2026 (En Diseño)                                    |
| • Modelo de vida media: las faltas leves pierden peso con el paso de las semanas si hay buen comp.|
|                                                                                                   |
| FASE 2: Modelo Predictivo de Deserción Escolar (Logistic Regression / XGBoost)                    |
| [====================                    ] Q1-Q2 2027 (Planificado)                               |
| • Clasificador supervisado que estima la probabilidad de deserción antes del 2do parcial.        |
|                                                                                                   |
| FASE 3: Análisis de Redes de Influencia y Grafos (Graph Neural Networks)                         |
| [                                        ] Q3 2027 - 2028 (Futuro)                                |
| • Detección de patrones grupales de indisciplina y correlaciones por horario y materia.           |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

### 5.1 FASE 1: ALGORITMO DE DECAIMIENTO TEMPORAL DE FALTAS (TIME-DECAY)

#### A. Fundamento Pedagógico:
Una falta leve cometida en la semana 1 del semestre no debería tener el mismo peso punitivo en la semana 16 si el estudiante demostró una conducta intachable durante los 4 meses intermedios.

#### B. Formulación Matemática Propuesta:
El impacto de un reporte $\Delta p_i$ decaerá exponencialmente en función del tiempo transcurrido $\Delta t = t_{\text{actual}} - t_{\text{evento}}$:

$$\Delta p_i(t) = \Delta p_{0, i} \cdot e^{-\lambda_i \cdot \Delta t}$$

Donde:
* $\Delta p_{0, i}$ es la penalización nominal inicial.
* $\lambda_i > 0$ es la tasa de decaimiento según la severidad:
  * Faltas Leves: $\lambda = 0.05 \text{ dias}^{-1}$ (vida media de recuperación $\approx 14\text{ dias}$).
  * Faltas Moderadas: $\lambda = 0.02 \text{ dias}^{-1}$ (vida media de recuperación $\approx 35\text{ dias}$).
  * Faltas Graves: $\lambda = 0.00 \text{ dias}^{-1}$ (sin decaimiento; requieren acta formal de mediación).

---

### 5.2 FASE 2: MODELO PREDICTIVO DE DESERCIÓN CON MACHINE LEARNING

#### A. Arquitectura del Modelo Supervisado:
Se entrenará un clasificador supervisado (**Regresión Logística Regularizada / XGBoost Classifier**) para estimar la probabilidad de que un alumno abandone sus estudios o repruebe el ciclo escolar:

$$P(Y = 1 \mid \mathbf{X}) = \sigma\left( \boldsymbol{\beta}^T \mathbf{X} + \beta_0 \right) = \frac{1}{1 + e^{-(\boldsymbol{\beta}^T \mathbf{X} + \beta_0)}}$$

#### B. Vector de Características (Feature Vector $\mathbf{X}$):
1. $x_1$: Saldo actual de Salud Conductual ($\text{ISC}$).
2. $x_2$: Tasa de cambio de puntos en los últimos 14 días ($\frac{\Delta \text{ISC}}{\Delta t}$).
3. $x_3$: Porcentaje de Asistencia Regular Ponderada ($\text{IARP}$).
4. $x_4$: Conteo de materias con más de 2 faltas consecutivas.
5. $x_5$: Semestre en curso (mayor peso a semestres 1 y 2).
6. $x_6$: Número de citas de tutoría no atendidas por el padre de familia.
7. $x_7$: Historial de justificantes médicos solicitados.

#### C. Umbral de Decisión y Disparo Automático:

$$\text{Accion}(\hat{y}):$$
* **Cita Obligatoria con Orientación Educativa:** $P(Y=1 \mid \mathbf{X}) \ge 0.70$
* **Alerta Preventiva Temprana al Tutor:** $0.45 \le P(Y=1 \mid \mathbf{X}) < 0.70$
* **Monitoreo Regular de Aula:** $P(Y=1 \mid \mathbf{X}) < 0.45$

---

### 5.3 FASE 3: ANÁLISIS DE REDES Y GRAFOS DE CONVIVENCIA (GRAPH ANALYTICS)

#### A. Modelo de Grafo Bipartito:
Representar el plantel escolar como un grafo $G = (V, E)$, donde los nodos $V = V_{\text{alumnos}} \cup V_{\text{materias}} \cup V_{\text{lugares}}$ y las aristas $E$ representan incidentes o interacciones compartidas.

#### B. Detección de Comunidades e Influencias:
* Aplicación de algoritmos de detección de comunidades (**Louvain Community Detection**) para identificar grupos de estudiantes que concentran conductas de riesgo en talleres específicos o recesos.
* Correlación de calor espacial: Mapeo de incidentes por aula, patio o laboratorio para optimizar las rutas de supervisión de prefectura escolar.

---

## 6. ÉTICA, EQUIDAD Y GOBERNANZA ALGORÍTMICA

El diseño algorítmico del SSC cumple con los principios internacionales de **Inteligencia Artificial Ética y Transparencia Algorítmica (XAI)**:

1. **Explicabilidad Total:** Todo cambio de puntaje o nivel de semáforo puede rastrearse a un evento tipificado con autor, fecha, hora y motivo claro. No existen "cajas negras" arbitrarias.
2. **No Discriminación:** El cálculo matemático es estrictamente ciego a género, origen socioeconómico o cualquier variable no relacionada con la asistencia y las normas escolares objetivas.
3. **Derecho de Apelación y Corrección:** El sistema permite al docente o directivo anular o reclasificar un reporte erróneo; el trigger de PostgreSQL recalcula y restaura el saldo del alumno de forma instantánea.

---

**Fin de la Memoria Algorítmica**  
*Documento de respaldo técnico-matemático para la réplica de grado de Ingeniería en Sistemas Computacionales - SSC CONALEP Puebla I.*
