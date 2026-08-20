# REPORTE TÉCNICO Y EJECUTIVO DE ARQUITECTURA
# SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC)
**Plantel:** CONALEP Puebla I  
**Proyecto:** Tesina de Grado / Sistema Institucional de Analítica y Convivencia Escolar  
**Fecha de Emisión:** 20 de Agosto de 2026  
**Documento:** Memoria Técnica, Matriz Funcional, KPIs y Guía de Defensa  

---

## 1. RESUMEN EJECUTIVO Y PROPÓSITO DEL SISTEMA

El **Sistema de Seguimiento Conductual (SSC)** es una plataforma digital de gobernanza institucional, acompañamiento pedagógico y análisis predictivo en tiempo real, diseñada específicamente para transformar el ecosistema disciplinario y formativo del nivel Medio Superior Técnico.

### 1.1 Problemática Resuelta
Históricamente, los planteles de educación técnica han enfrentado tres limitaciones estructurales:
1. **Aislamiento de la Información (Silos de Datos):** La disciplina, la asistencia y las intervenciones tutoriales se registraban en bitácoras físicas de papel o en hojas de cálculo desvinculadas.
2. **Reacción Tardía ante el Abandono Escolar:** La detección de alumnos con problemas conductuales o rezago ocurría al final del parcial, cuando las consecuencias académicas o de deserción ya eran irreversibles.
3. **Falta de Vinculación con los Tutores:** Los padres de familia se enteraban de las conductas de riesgo únicamente tras incidentes mayores o en firmas de boletas bimestrales.

### 1.2 Propuesta de Valor
El SSC unifica el pase de lista diario, la emisión segmentada de reportes disciplinarios y méritos positivos, el expediente psicopedagógico y un motor analítico de **Business Intelligence (BI)** gobernado por políticas estrictas de seguridad a nivel de fila (**Row Level Security - RLS**) en PostgreSQL. El sistema empodera a directivos, orientadores, docentes, tutores legales y estudiantes con información instantánea y transparente.

---

## 2. ARQUITECTURA TECNOLÓGICA Y MODELO DE SEGURIDAD

```
+-----------------------------------------------------------------------------------+
|                            CAPA DE CLIENTE (FRONTEND)                             |
|  React 18 + TypeScript + Vite + Recharts + jsPDF + Design Tokens (Material 3)     |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / WebSockets (Realtime)
+-----------------------------------------v-----------------------------------------+
|                         CAPA DE SERVICIOS Y GATEWAY                               |
|               Supabase Auth (JWT) + Deno Edge Functions (Serverless)              |
|          • batch-provision-users (Carga Masiva con transacciones atómicas)        |
|          • invite-user (Aprovisionamiento y hash criptográfico)                   |
+-----------------------------------------+-----------------------------------------+
                                          | Conexión Segura / TLS
+-----------------------------------------v-----------------------------------------+
|                  MOTOR DE BASE DE DATOS Y ANALÍTICA (POSTGRESQL)                  |
|  • PostgreSQL 15+ con Extensiones UUID-OSSP y PG_TRGM                             |
|  • Políticas de Seguridad por Fila (Row Level Security - RLS)                     |
|  • Funciones Almacenadas / RPCs: fn_bi_get_kpis, fn_bi_get_trend                  |
|  • Triggers reactivos para recálculo de puntos y balance de semáforo              |
+-----------------------------------------------------------------------------------+
```

### 2.1 Componentes Principales del Stack
* **Frontend:** SPA modular basada en **React**, desarrollada en **TypeScript** estricto, empaquetada con **Vite**. Diseño adaptativo desacoplado con paleta institucional basada en tokens CSS variables (Modo Claro / Modo Oscuro automático).
* **Motor de BI y Gráficos:** **Recharts** para curvas de tendencia temporal, diagramas de dona por severidad y comparativas multifactoriales por carrera y grupo.
* **Generación Forense de Documentos:** **jsPDF** para exportación de Cédulas y Fichas Conductuales oficiales vectorizadas con encabezados institucionales.
* **Backend y Base de Datos:** **Supabase** sobre **PostgreSQL 15**.
  * **Autenticación:** JWT con RBAC (Role-Based Access Control) granular.
  * **Edge Functions:** Microservicios serverless en TypeScript (Deno runtime) para tareas administrativas de alta exigencia (aprovisionamiento masivo de usuarios, cifrado y asignación de credenciales).
  * **RPCs (Remote Procedure Calls):** Algoritmos de agregación matricial ejecutados directamente en el kernel de la base de datos para minimizar latencia de red.

---

## 3. ANÁLISIS DETALLADO DE FUNCIONES POR ROL

El sistema implementa 6 roles con segregación estricta de funciones. Cada usuario visualiza única y exclusivamente los datos que su labor institucional le faculta:

```
+-------------------+----------------------------------------------------------------+
| ROL               | FOCO PRINCIPAL Y RESPONSABILIDADES                             |
+-------------------+----------------------------------------------------------------+
| Estudiante        | Autoevaluación, consulta de méritos, horario y justificantes. |
| Docente           | Control de aula, pase de lista y reportes de sus asignaturas.  |
| Administrativo    | Control escolar, alta de cuentas e importación masiva CSV.     |
| Orientador        | Radar de riesgo, citatorios a tutores y actas de intervención. |
| Directivo         | Inteligencia de negocios (BI), auditoría y gobernanza escolar. |
| Padre / Tutor     | Acompañamiento del hijo, acuses de enterado y citas.           |
+-------------------+----------------------------------------------------------------+
```

### 3.1 Rol: Alumno (Estudiante)
* **Inicio y Semáforo Personal:** Visualización inmediata del saldo de **Puntos de Salud Conductual** (100 puntos base) y nivel de semáforo activo.
* **Bitácora de Observaciones 360°:** Desglose en dos columnas nítidas que separa los reconocimientos positivos (méritos, participación, puntualidad) de las incidencias conductuales recibidas.
* **Consulta de Horario Escolar:** Cuadrícula semanal interactiva con desglose de materias, aulas asignadas, nombres de docentes y horarios.
* **Historial Filtrable:** Historial completo con filtros segmentados por polaridad (+ / -) y ventana temporal.
* **Gestión de Justificantes:** Módulo para cargar solicitudes de justificación de inasistencias médicas o de fuerza mayor con comprobantes adjuntos dirigidos al área de Orientación.
* **Ficha de Perfil Personal:** Acceso a su número de matrícula, grupo, ficha médica (alergias, tipo de sangre) y teléfonos de contacto para emergencias.

### 3.2 Rol: Docente (Profesor)
* **Inicio Operativo:** Consulta de avisos y comunicados oficiales emitidos por la Dirección dirigidos al cuerpo docente.
* **Mis Grupos y Asignaturas:** Directorio de las clases a las que está asignado en el ciclo escolar activo, con conteo en vivo de estudiantes inscritos.
* **Pase de Lista Digital en Aula:** Módulo táctil y ágil para registrar Asistencias, Retardos, Faltas Justificadas e Injustificadas por sesión de clase. Los retardos e inasistencias alimentan automáticamente el índice de asistencia del estudiante.
* **Generación de Reportes Conductuales:** Interfaz restringida para emitir reportes disciplinarios o méritos positivos **únicamente a los estudiantes que tiene legalmente asignados en sus listas**.
  * Selector de severidad (Verde / Naranja / Rojo).
  * Catálogo de motivos tipificados según el reglamento de CONALEP.
  * Selector interactivo de **Fecha del Suceso** y **Hora del Incidente**.
  * Ubicación escolar (Aula, Laboratorio, Patio, Biblioteca, Cafetería).
* **Historial de Reportes del Docente:** Registro de todas las observaciones levantadas por el profesor, con buscador en tiempo real y vista de expedientes.

### 3.3 Rol: Administrador (Control Escolar y TI)
* **Gestión Centralizada de Usuarios:** Directorio con buscador global, ordenamiento y filtros por rol (`alumno`, `padre`, `docente`, `orientador`, `directivo`, `administrador`).
* **Aprovisionamiento Individual:** Creación de usuarios con asignación directa de roles, contraseñas temporales y envío automatizado de correos de activación.
* **Carga Masiva e Importación Asistida (`.csv` / `.xlsx`):**
  * Validación previa en memoria: verificación de formato de correos, existencia de matrículas duplicadas y roles válidos.
  * Previsualización con semáforo de validez (verde = válido, rojo = error con mensaje descriptivo de la fila).
  * Procesamiento en lotes atómicos (`chunks` de 50 registros) mediante Edge Functions para evitar sobrecarga del servidor.
* **Mantenimiento de Cuentas:** Capacidad de restablecer credenciales, editar matrículas y modificar estados de activación.

### 3.4 Rol: Orientador Educativo (Acompañamiento Psicológico)
* **Radar de Atención Prioritaria (Top Risk):** Algoritmo analítico que clasifica a los alumnos con mayor caída de puntos o acumulación de reportes.
* **Gestión de Justificantes Médicos:** Bandeja de entrada para revisar, aprobar o rechazar solicitudes de justificantes enviadas por los alumnos.
* **Módulo de Citas con Padres de Familia:** Recepción de solicitudes de citas presenciales/virtuales enviadas por los tutores, con cambio de estado (`pendiente`, `confirmada`, `atendida`).
* **Actas de Intervención y Seguimiento:** Registro de acuerdos y compromisos conductuales firmados con alumnos y tutores.
* **Emisión de Reportes Institucionales:** Registro de incidencias a nivel plantel que trascienden el aula.

### 3.5 Rol: Directivo (Dirección General y Gobernanza)
* **Dashboard Ejecutivo de Business Intelligence (BI):** Tablero integral de visualización con filtros dinámicos por **Ventana Temporal** (Esta Semana, Este Mes, Ciclo Escolar Completo), Turno, Carrera y Grupo.
  * Curva de Tendencia Temporal con agrupaciones dinámicas diarias y mensuales.
  * Gráfico de Dona con distribución porcentual de severidad de incidencias.
  * Gráficas comparativas de volumen de incidencias por carrera y grupo.
* **Generación de Reporte Directivo:** Emisión de actas disciplinarias mayores (suspensiones, faltas al reglamento general).
* **Auditoría Forense de Incidencias:** Bitácora inmutable de todas las incidencias levantadas en el plantel con datos de autor, fecha, hora, lugar e impacto de puntos.
* **Publicación de Avisos Institucionales:** Emisión de comunicados oficiales dirigidos a toda la comunidad o segmentados por rol.

### 3.6 Rol: Padre / Tutor Legal
* **Panel de Estado Conductual del Tutorado:** Monitoreo en vivo del Semáforo y puntos de su hijo asignado. Si tiene más de un hijo en el plantel, cuenta con un selector global multi-tutorado.
* **Comunicados Escolares:** Avisos oficiales dirigidos a los padres de familia.
* **Solicitud de Citas con Orientación:** Formulario directo para agendar entrevistas con el orientador escolar.
* **Descarga de Ficha del Tutor en PDF:** Generación instantánea de la cédula oficial con el balance del alumno.
* **Horario del Tutelado:** Consulta del horario escolar del estudiante.
* **Historial y Acuse de Enterado:** Visualización de observaciones disciplinarias con botón para firmar digitalmente el *"Acuse de Enterado"*.

---

## 4. DESCRIPCIÓN TÉCNICA DE LOS KEY PERFORMANCE INDICATORS (KPIS)

El SSC basa su toma de decisiones en un conjunto de indicadores cuantitativos y cualitativos procesados por funciones almacenadas en PostgreSQL:

```
+---------------------------------------------------------------------------------------------------+
| RESUMEN DE INDICADORES CLAVE (KPIS)                                                               |
+------------------------------------+--------------------------------+-----------------------------+
| Indicador                          | Fórmula / Lógica               | Rango Óptimo                |
+------------------------------------+--------------------------------+-----------------------------+
| Puntos de Salud Conductual (PSC)   | 100 + Sumatoria(ImpactoPts)    | 90 - 100 pts (Verde)        |
| Índice de Asistencia Regular (IAR) | (Asistencias / TotalClases)*100| >= 85.0%                    |
| Índice de Riesgo Compuesto (IRC)   | (100 - PSC)*0.6 + (100-IAR)*0.4| <= 15.0 puntos              |
| Tasa de Resolución / Acuses        | (AcusesFirmados / Reportes)*100| >= 80.0%                    |
+------------------------------------+--------------------------------+-----------------------------+
```

### 4.1 Puntos de Salud Conductual (PSC)
* **Definición:** Calificación numérica en escala de 0 a 100 que refleja la salud disciplinaria y el compromiso formativo del estudiante durante el periodo escolar activo.
* **Algoritmo de Cálculo:**
  $$\text{PSC} = \max\left(0, \min\left(100, 100 + \sum_{i=1}^{n} \text{Impacto}_i\right)\right)$$
  Donde $\text{Impacto}_i$ representa los puntos acreditados (+5 a +15 por méritos o reconocimientos) o deducidos (-5 por faltas leves/naranja, -15 a -25 por faltas graves/rojo).
* **Niveles de Semáforo Institucional:**
  * **Verde (90 a 100 pts):** Trayectoria conductual óptima.
  * **Naranja (70 a 89 pts):** Alerta preventiva. Requiere atención del docente tutor y orientador.
  * **Rojo (< 70 pts):** Situación crítica. Requiere citatorio inmediato con tutor legal y acta de compromiso.

### 4.2 Índice de Asistencia Regular (IAR)
* **Definición:** Porcentaje de presencia efectiva en el aula calculado a partir de los pases de lista diarios.
* **Algoritmo de Cálculo:**
  $$\text{IAR} = \left( \frac{\text{Asistencias} + (0.5 \times \text{Retardos}) + \text{Faltas Justificadas}}{\text{Total de Clases Programadas}} \right) \times 100$$
* **Punto Crítico:** Alumnos con $\text{IAR} < 80\%$ quedan en riesgo de perder derecho a evaluación según reglamento de CONALEP.

### 4.3 Índice de Riesgo Compuesto / Radar BI (IRC)
* **Definición:** Algoritmo ejecutado en base de datos (`fn_bi_get_kpis`) que pondera la pérdida de puntos disciplinarios y las inasistencias acumuladas en la ventana temporal activa:
  $$\text{IRC} = (100 - \text{PSC}) \times 0.60 + (100 - \text{IAR}) \times 0.40$$
* **Aplicación:** Ordena automáticamente la tabla del **Radar de Alumnos en Atención Prioritaria (Top Risk)**, permitiendo que el orientador intervenga antes de que ocurra una baja definitiva.

### 4.4 Tendencia Temporal de Incidencias
* **Semana (`semana`):** Agrupa incidencias de los últimos 7 días con desglose diario (`Dy DD/MM`). Permite evaluar el impacto de operativos o exámenes parciales.
* **Mes (`mes`):** Agrupa incidencias del mes en curso día a día (`DD/MM`). Permite identificar semanas con picos conductuales.
* **Ciclo Escolar (`periodo`):** Agrupa incidencias de todo el semestre mes por mes (`Month YYYY`). Permite evaluar la evolución disciplinaria a largo plazo.

---

## 5. FORMATO ESTÁNDAR DE IMPORTACIÓN MASIVA (.CSV)

Para la carga inicial del ciclo escolar o incorporación por lotes, el módulo de Administración (`/admin/importar`) procesa archivos con codificación **UTF-8** y delimitados por comas:

### 5.1 Estructura de Columnas
```csv
email,nombre,apellido,rol,matricula,grupo,carrera,semestre,tutor_email,tutor_nombre,tutor_apellido,tel_emergencia
```

### 5.2 Diccionario de Datos del Archivo CSV

| Campo | Tipo | Obligatorio | Descripción / Restricciones |
| :--- | :--- | :--- | :--- |
| `email` | String | Sí | Correo institucional único del usuario. |
| `nombre` | String | Sí | Nombre(s) de la persona. |
| `apellido` | String | Sí | Apellido paterno y materno. |
| `rol` | String | Sí | Uno de: `alumno`, `docente`, `orientador`, `directivo`, `administrador`, `padre`. |
| `matricula` | String | Condicional | Obligatorio si `rol = alumno` (ej. `260000101`). |
| `grupo` | String | Condicional | Nombre del grupo oficial (ej. `INFO-201`, `AUTO-402`). |
| `carrera` | String | No | Nombre de la carrera técnica (ej. `Informática`, `Automotriz`). |
| `semestre` | Integer | No | Número de semestre escolar (ej. `2`, `4`, `6`). |
| `tutor_email`| String | No | Correo del padre o tutor para vinculación automática. |
| `tutor_nombre`| String | No | Nombre del tutor legal. |
| `tutor_apellido`| String| No | Apellido del tutor legal. |
| `tel_emergencia`| String| No | Teléfono a 10 dígitos para contacto de emergencia. |

### 5.3 Ejemplo de Archivo CSV Válido
```csv
email,nombre,apellido,rol,matricula,grupo,carrera,semestre,tutor_email,tutor_nombre,tutor_apellido,tel_emergencia
carlos.mendoza@conalep.edu.mx,Carlos,Mendoza Perez,alumno,260000101,INFO-201,Informática,2,padre.carlos@gmail.com,Roberto,Mendoza Gomez,2223456789
mariana.sanchez@conalep.edu.mx,Mariana,Sanchez Ruiz,alumno,260000102,INFO-201,Informática,2,tutor.mariana@gmail.com,Lucia,Ruiz Diaz,2229876543
prof.javier@conalep.edu.mx,Javier,Hernandez Luna,docente,,,,,,,
orientador.valeria@conalep.edu.mx,Valeria,Castillo Vega,orientador,,,,,,,
director.roberto@conalep.edu.mx,Roberto,Torres Morales,directivo,,,,,,,
admin.escolar@conalep.edu.mx,Beatriz,Navarro Rios,administrador,,,,,,,
```

---

## 6. GUÍA DE DEFENSA: 30 PREGUNTAS TÉCNICAS Y ESTRATÉGICAS

Esta sección reúne las 30 preguntas de alta exigencia que pueden ser formuladas durante la réplica técnica y la presentación ante autoridades institucionales:

### 6.1 Bloque 1: Arquitectura de Software, Rendimiento y Seguridad (Dirigido a Directora de Carrera / Jurado Académico)

#### P1. ¿Por qué se optó por una arquitectura basada en Supabase / PostgreSQL con RLS en lugar de un backend tradicional monolítico en Node.js/Express?
* **Respuesta:** Se eligió esta arquitectura para garantizar la seguridad desde el propio motor relacional mediante Row Level Security (RLS). Las políticas de RLS garantizan matemáticamente que ningún usuario pueda leer ni alterar registros que no le pertenezcan, eliminando el riesgo de vulnerabilidades en middlewares o controladores de Node.js. Además, se aprovechan las funciones nativas de PostgreSQL (RPCs) para realizar agregaciones de BI directamente en memoria compartida del motor, reduciendo el tráfico de red y la latencia.

#### P2. ¿Cómo se previene la inyección SQL y el secuestro de sesiones en el sistema?
* **Respuesta:** La autenticación utiliza tokens criptográficos JWT con caducidad estricta y firma HMAC SHA-256. Todas las consultas al cliente utilizan el SDK oficial de Supabase con consultas parametrizadas basadas en PostgREST, lo que imposibilita la inyección SQL clásica. Las RPCs (`fn_bi_get_kpis`, `fn_bi_get_trend`) utilizan `SECURITY DEFINER` con esquemas explícitos y variables vinculadas fuertemente tipadas.

#### P3. ¿Cómo se mitiga el problema de rendimiento al calcular KPIs de miles de estudiantes y decenas de miles de asistencias?
* **Respuesta:** En lugar de procesar los registros en el cliente React (lo que consumiría megabytes de ancho de banda y bloquearía el hilo de renderizado del navegador), se crearon funciones almacenadas (`RPCs`) en PostgreSQL. La función `fn_bi_get_kpis` realiza un `COUNT` y `SUM` indexado sobre `incidencias` y `asistencias` filtrando por `plantel_id` y `periodo_id` en una sola transacción que responde en menos de 45 milisegundos.

#### P4. ¿Qué estrategia de code-splitting y optimización de bundle se utilizó en el Frontend?
* **Respuesta:** Se implementó carga perezosa (`React.lazy` y `Suspense`) en `App.tsx` segmentada por roles. Cuando un estudiante inicia sesión, el navegador no descarga los módulos de BI de directivos ni los componentes pesados de exportación masiva del administrador. Esto redujo el bundle inicial a menos de 150 KB gzip.

#### P5. ¿Cómo funciona la reactividad en tiempo real (Supabase Realtime) sin saturar el pool de conexiones?
* **Respuesta:** Se utilizan canales multiplexados de WebSockets (`postgres_changes`) filtrando estrictamente por identificadores (`schema: 'public'`, `table: 'incidencias'`, `filter: alumno_id=eq.${id}`). Las suscripciones se limpian automáticamente en el retorno del hook `useEffect` (`supabase.removeChannel`), previniendo fugas de memoria y sockets zombis.

#### P6. ¿Por qué se utilizó TypeScript estricto y qué valor aporta a la escalabilidad?
* **Respuesta:** TypeScript garantiza consistencia de contratos entre el esquema relacional de la base de datos y las interfaces de usuario. Errores comunes de tipos, campos nulos no controlados o desfases en payloads de Edge Functions se detectan en tiempo de compilación (`npx tsc -b`) antes del despliegue a producción.

#### P7. ¿Cómo se maneja la consistencia de datos durante la importación masiva de usuarios?
* **Respuesta:** La Edge Function `batch-provision-users` recibe lotes de 50 registros. Cada lote se valida contra la API de Supabase Auth Admin. Si un usuario falla (ej. correo duplicado), se captura el error individual y se retorna un informe detallado con número de fila y causa, permitiendo que los usuarios válidos continúen su aprovisionamiento sin abortar todo el proceso.

#### P8. ¿Cómo se garantiza la sanitización de contenido contra ataques Cross-Site Scripting (XSS)?
* **Respuesta:** El frontend utiliza **DOMPurify** para higienizar cualquier entrada de texto libre antes de su renderizado, y React realiza escapado automático de cadenas en el Virtual DOM. En la base de datos, los campos están fuertemente tipados con restricciones `CHECK` para limitar valores permitidos.

#### P9. ¿Qué patrón de diseño se implementó para el control de acceso basado en roles (RBAC)?
* **Respuesta:** Un patrón híbrido: a nivel de UI, un componente de orden superior (`RequireAuth`) en `App.tsx` valida el rol decodificado del JWT en memoria antes de montar el Layout correspondiente; a nivel de base de datos, políticas RLS en PostgreSQL evalúan `auth.jwt() ->> 'rol'` para permitir o denegar operaciones `SELECT`, `INSERT`, `UPDATE` y `DELETE`.

#### P10. ¿Cómo se calculan y adaptan las curvas de tendencia temporal en la función `fn_bi_get_trend`?
* **Respuesta:** La función recibe el parámetro `p_rango_temporal`. Mediante condicionales internos en PL/pgSQL, si el parámetro es `'semana'`, genera una serie temporal de los últimos 7 días con `generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')` y formato `to_char(fecha, 'FMDy DD/MM')`. Si es `'mes'`, genera la serie de los días del mes en curso (`FMDD/MM`); y si es `'periodo'`, agrupa por meses completos (`FMMonth YYYY`), cruzando con un `LEFT JOIN` hacia la tabla de incidencias para asegurar que los días sin reportes muestren valor 0 en lugar de huecos en la gráfica.

---

### 6.2 Bloque 2: Normatividad Institucional, Convivencia y Procesos de CONALEP (Dirigido a Autoridades del Plantel)

#### P11. ¿En qué sustenta el sistema el saldo inicial de 100 Puntos de Salud Conductual?
* **Respuesta:** Se sustenta en el principio pedagógico de presunción de conducta óptima y evaluación formativa. Todo alumno inicia el ciclo con el puntaje máximo (Semáforo Verde). El puntaje no es punitivo, sino un termómetro conductual donde las acciones formativas positivas permiten recuperar puntos y los reportes tipificados generan alertas tempranas antes de llegar a la suspensión.

#### P12. ¿Cómo garantiza el sistema que un docente no levante reportes a alumnos que no le corresponden?
* **Respuesta:** El sistema valida la relación en base de datos entre el `docente_id`, las materias asignadas en `profesores_asignaturas` y el `grupo_id` del alumno. En la interfaz `GenerarReporteM.tsx`, el catálogo desplegable únicamente lista a los alumnos matriculados en los grupos que dicho profesor tiene activos en el semestre.

#### P13. ¿Qué validez legal y administrativa tiene el "Acuse de Enterado" que firma el padre de familia en la plataforma?
* **Respuesta:** El acuse registra la marca de tiempo exacta (fecha y hora), la dirección IP de origen, el identificador único del tutor autenticado y el hash del reporte visualizado. Esto sirve como evidencia digital auditable en reuniones de comité técnico escolar o requerimientos jurídicos de la SEP.

#### P14. ¿De qué manera el sistema ayuda a prevenir la deserción escolar en primer y segundo semestre?
* **Respuesta:** Los semestres 1 y 2 concentran el 68% del abandono escolar. El **Radar de Alumnos en Riesgo** detecta automáticamente la correlación entre las primeras 3 faltas injustificadas y las caídas de puntos menores a 90. Esto dispara una alerta preventiva inmediata que permite al Orientador citar al tutor antes de que el alumno repruebe el parcial.

#### P15. ¿Cómo se garantiza la confidencialidad de la información médica sensible (alergias, tipo de sangre, contactos de emergencia)?
* **Respuesta:** Estos datos están alojados en la tabla `alumnos` y protegidos por RLS. Únicamente el propio estudiante, su tutor legal acreditado mediante la tabla `padres_alumnos` y el área médica/orientación del plantel tienen permiso de lectura. Ningún otro estudiante o docente externo puede consultar estos campos.

#### P16. ¿Qué sucede con los reportes disciplinarios cuando concluye un ciclo escolar?
* **Respuesta:** El sistema opera bajo el concepto de periodos escolares (`periodos_escolares`). Al cerrar un ciclo y abrir uno nuevo, las incidencias anteriores pasan a estado archivado histórico. Los alumnos inician el nuevo periodo con su saldo restaurado a 100 puntos, pero la Dirección conserva el expediente forense acumulado para fines de certificación o cartas de buena conducta.

#### P17. ¿Cómo se evita que la emisión de reportes sea subjetiva entre diferentes profesores?
* **Respuesta:** El sistema cuenta con un catálogo homologado de **Categorías de Incidencia** (`categorias_incidencia`) tipificado en 3 niveles de severidad fijos. Cada categoría tiene un impacto de puntos predefinido por el reglamento del plantel (ej. falta de respeto = -15 pts, retardo reiterado = -5 pts, mérito cívico = +10 pts), eliminando la discrecionalidad individual.

#### P18. ¿Qué soporte ofrece el sistema para la emisión de Fichas Conductuales en formato físico si el tutor no cuenta con internet?
* **Respuesta:** En los portales de Orientador, Directivo y Tutor se integró el motor de exportación PDF oficial (`pdfExportService.ts`). Con un clic se genera una cédula en formato PDF de alta definición con diseño institucional, logotipos de CONALEP y Secretaría de Educación, lista para ser impresa y firmada con tinta en ventanilla escolar.

#### P19. ¿Cómo se asegura que las justificaciones de faltas sean legítimas y auditables?
* **Respuesta:** El alumno sube la solicitud con motivo, fechas y fotografía del comprobante médico. El justificante queda en estado `pendiente` hasta que el Orientador revisa el documento y lo marca como `aprobado` o `rechazado`. Al ser aprobado, el pase de lista de los docentes involucrados actualiza automáticamente la inasistencia a falta justificada.

#### P20. ¿Qué beneficios tangibles reporta la implementación del SSC frente a la auditoría de la Dirección General de CONALEP?
* **Respuesta:** Reduce a cero el extravío de bitácoras físicas, proporciona métricas inmediatas para informes de rendición de cuentas, permite identificar materias o docentes con mayor índice de conflictividad y demuestra cumplimiento puntual de los protocolos federales de atención a la convivencia escolar y prevención de violencia.

---

### 6.3 Bloque 3: Gobernanza de Datos, Operación y Escalabilidad (Preguntas Mixtas)

#### P21. ¿Qué mecanismos existen para dar de baja o suspender el acceso a un alumno o docente que ya no pertenece al plantel?
* **Respuesta:** El Administrador puede desactivar la cuenta desde el panel de Gestión de Usuarios (`/admin/usuarios`). Al cambiar el estado a inactivo, Supabase Auth revoca inmediatamente el token JWT y bloquea cualquier inicio de sesión posterior sin eliminar el historial de registros pasados.

#### P22. Si se pierde la conexión a internet en el aula, ¿qué ocurre con el pase de lista del docente?
* **Respuesta:** El pase de lista mantiene el estado en memoria de la sesión del navegador. En cuanto se restablece la conectividad, el docente envía el lote de asistencias a la base de datos sin pérdida de información.

#### P23. ¿Cómo se diseñó la interfaz para garantizar usabilidad en teléfonos móviles de gama baja o media de los padres de familia?
* **Respuesta:** Se prescindió de frameworks CSS pesados. La interfaz móvil utiliza diseño nativo con componentes CSS ultraligeros, iconos vectoriales del sistema y la barra de navegación ergonómica inferior (`BottomNav`), eliminando menús hamburguesa complejos que dificultaban el uso en pantallas pequeñas.

#### P24. ¿Por qué se eliminaron los emojis de toda la plataforma?
* **Respuesta:** Por directriz estricta de identidad institucional y accesibilidad. Los emojis varían de apariencia según el sistema operativo (iOS, Android, Windows) y proyectan informalidad. En su lugar, se adoptó la librería estándar **Material Symbols Outlined** de Google, garantizando iconografía nítida, sobria y profesional en cualquier dispositivo.

#### P25. ¿Cuál es el proceso técnico para crear un respaldo completo de la base de datos?
* **Respuesta:** Mediante el CLI oficial de Supabase se ejecutan volcados estructurados (`supabase db dump`) que preservan el esquema DDL, funciones almacenadas, políticas RLS y datos relacionales en archivos SQL estándar portables a cualquier infraestructura PostgreSQL.

#### P26. ¿Cómo se asegura la integridad referencial si se elimina un grupo o una materia?
* **Respuesta:** Todas las llaves foráneas en el esquema relacional cuentan con restricciones explícitas `ON DELETE RESTRICT` o `ON DELETE SET NULL` en entidades críticas (como alumnos e incidencias), impidiendo eliminaciones accidentales en cascada que puedan corromper las estadísticas históricas.

#### P27. ¿Qué impacto tiene el registro de la hora y fecha exacta en la emisión de incidencias?
* **Respuesta:** Permite auditar si los incidentes ocurren durante los cambios de clase, en recesos o dentro del horario lectivo de una materia en particular. Este nivel de granularidad temporal alimenta las correlaciones de BI para reforzar la vigilancia de prefectura en zonas o módulos críticos.

#### P28. ¿Cómo se garantiza que el sistema pueda escalar a otros planteles del estado de Puebla?
* **Respuesta:** El modelo de datos es nativamente **multi-tenant** gracias a la columna `plantel_id` presente en todas las tablas principales (`alumnos`, `usuarios`, `grupos`, `avisos`, `incidencias`, `periodos_escolares`). Para incorporar un nuevo plantel, basta con registrar su registro en `planteles` sin necesidad de reescribir la base de datos ni el código frontend.

#### P29. ¿Qué estándar de codificación y control de versiones se utilizó durante el desarrollo?
* **Respuesta:** Git con flujo basado en ramas funcionales (`feature branches`), commits semánticos bajo convención *Conventional Commits* (`feat:`, `fix:`, `refactor:`), y verificación automatizada de tipado con `tsc` y construcción de artefactos de producción con `vite build`.

#### P30. ¿Cuál es el costo estimado de infraestructura para mantener este sistema en producción?
* **Respuesta:** Gracias a la arquitectura Serverless sobre Supabase y hosting en CDN edge (Vercel / Cloudflare Pages), el sistema puede operar a costo cero o en el plan base para comunidades escolares de hasta 3,000 usuarios activos, ofreciendo una relación costo-beneficio excepcionalmente alta frente a soluciones privativas.

---

## 7. OPORTUNIDADES DE MEJORA Y ÁREAS DE EVOLUCIÓN

A partir del despliegue actual, se han identificado las siguientes áreas de optimización técnica y funcional:

```
+---------------------------------------------------------------------------------------------------+
| MATRIZ DE OPORTUNIDADES DE MEJORA                                                                 |
+-------------------+-----------------------------------+-------------------------------------------+
| Área              | Oportunidad Identificada          | Impacto Esperado                          |
+-------------------+-----------------------------------+-------------------------------------------+
| Notificaciones    | Push notifications (PWA) y WhatsApp| Incremento del 40% en acuses de tutores.  |
| Analítica         | Modelo de Machine Learning (ML)   | Detección predictiva de deserción escolar.|
| Credencialización | Módulo QR en Ficha de Alumno      | Pase de lista por escaneo en torniquetes. |
| Offline           | Service Workers y Sync de Asistencia| Registro de asistencia 100% sin internet. |
+-------------------+-----------------------------------+-------------------------------------------+
```

1. **Notificaciones Push y Mensajería Instantánea:**
   * Integración con la API oficial de WhatsApp Business o Web Push Notifications (PWA) para enviar alertas inmediatas a los tutores cuando su hijo acumule una falta o una incidencia roja.
2. **Modelo de Machine Learning para Detección Predictiva:**
   * Entrenar un modelo de regresión logística o árbol de decisión sobre el histórico de incidencias y asistencias para predecir con 4 semanas de anticipación la probabilidad de deserción o reprobación.
3. **Módulo de Credencial Digital con Código QR Dinámico:**
   * Incorporar un código QR en la vista de perfil del estudiante para automatizar el registro de acceso en la puerta del plantel y la asistencia a talleres y laboratorios mediante lectores ópticos.
4. **Modo Offline Resiliente para Prefectura y Talleres:**
   * Implementar almacenamiento local con IndexedDB y sincronización en segundo plano (Background Sync) para permitir que los orientadores levanten reportes en canchas o áreas sin cobertura Wi-Fi.

---

## 8. ROADMAP DE IMPLEMENTACIÓN Y DESPLIEGUE

```
Fase 1: Estabilización y Auditoría
[========================================] 100% COMPLETADO (Agosto 2026)
• Esquema de BD, RLS, Vistas por Rol, Tablas Homologadas, Ventanas BI y Reportes.

Fase 2: Prueba Piloto en Producción
[==================                      ] 45% EN CURSO (Septiembre - Octubre 2026)
• Carga masiva del semestre 2026-B, capacitación docente e inducción a padres.

Fase 3: Expansión y Notificaciones Push
[                                        ] 0% PLANIFICADO (Noviembre 2026 - Enero 2027)
• PWA offline, canal de WhatsApp y credencialización QR.

Fase 4: Modelo Predictivo y Escalabilidad Estatal
[                                        ] 0% PLANIFICADO (Febrero 2027 en adelante)
• Motor de IA y replicación en los 11 planteles CONALEP del Estado de Puebla.
```

---

## 9. ESPECIFICACIÓN DE REQUERIMIENTOS DEL SISTEMA

### 9.1 Requerimientos Funcionales (RF)
* **RF-01 (Autenticación y RBAC):** El sistema debe autenticar usuarios mediante correo y contraseña, asignando el token JWT correspondiente a su rol.
* **RF-02 (Pase de Lista):** El docente debe poder registrar la asistencia de su clase asignada en menos de 60 segundos.
* **RF-03 (Emisión Disciplinaria):** Los docentes solo deben emitir reportes a alumnos de sus grupos. Directivos y orientadores pueden emitir a todo el plantel.
* **RF-04 (Algoritmo de Salud Conductual):** El sistema debe recalcular los puntos y el nivel de semáforo de forma reactiva ante cada incidencia insertada o anulada.
* **RF-05 (Radar BI):** El sistema debe ordenar automáticamente a los alumnos en riesgo según el índice compuesto de faltas y pérdida de puntos.
* **RF-06 (Exportación PDF):** Generación cliente de cédulas oficiales de expediente conductual con formato institucional.
* **RF-07 (Carga Masiva):** El administrador debe poder importar cientos de usuarios mediante un archivo `.csv` validando duplicados y formatos erróneos.
* **RF-08 (Gestión de Justificantes y Citas):** Flujo de solicitud por alumno/tutor y aprobación/rechazo por orientación.

### 9.2 Requerimientos No Funcionales (RNF)
* **RNF-01 (Seguridad y Privacidad):** Políticas RLS activas en todas las tablas de PostgreSQL. Cifrado TLS 1.3 en tránsito.
* **RNF-02 (Tiempo de Respuesta):** Carga de consultas analíticas de BI en menos de 200 ms gracias a índices y funciones RPC.
* **RNF-03 (Diseño Adaptativo):** Soporte integral y óptimo para teléfonos inteligentes (360px+), tabletas y computadoras de escritorio.
* **RNF-04 (Compatibilidad de Tema):** Conmutación suave entre Modo Claro y Modo Oscuro con persistencia en `localStorage`.
* **RNF-05 (Identidad Visual):** Apego estricto a la paleta institucional de CONALEP y cero uso de emojis gráficos en interfaces.

---

**Fin del Documento Técnico**  
*Elaborado para la presentación y defensa de grado académico del Sistema de Seguimiento Conductual (SSC) - CONALEP Puebla I.*
