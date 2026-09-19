# MANUAL TÉCNICO Y MEMORIA DE INSTALACIÓN EN SERVIDOR FÍSICO
# SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC / EduTrack 360)
**Plantel:** Colegio de Educación Profesional Técnica del Estado de Puebla — Plantel Puebla I  
**Proyecto:** Estadía Profesional / Memoria de Titulación Técnica y Entrega-Recepción Institucional  
**Destinatarios:** Jefatura de Proyecto de Informática, Administradores de Red y Laboratorios de Cómputo  
**Fecha de Publicación:** Septiembre de 2026  
**Versión del Sistema:** 3.0 Master Release (Producción On-Premise)  

---

## RESUMEN EJECUTIVO DE INFRAESTRUCTURA

El presente documento constituye el **Manual Oficial de Instalación, Despliegue y Puesta en Marcha en Servidor Físico (On-Premise)** del **Sistema de Seguimiento Conductual (SSC)**, desarrollado durante la Estadía Profesional en el Plantel CONALEP Puebla I.

La arquitectura de la plataforma ha sido diseñada bajo un principio de **soberanía tecnológica, costo recurrente cero y privacidad estricta de datos (LGPDPPSO)**. A diferencia de las soluciones convencionales en la nube que generan costos mensuales en moneda extranjera y dependencia de proveedores externos, este manual capacita al personal de Tecnologías de la Información (TI) del plantel para instalar, operar, respaldar y mantener la totalidad de la plataforma (Base de Datos PostgreSQL 15 con Row Level Security, Servicios de Autenticación, Motor de Tiempo Real, APIs REST y Frontend React 19) en un servidor de hardware ubicado físicamente en las instalaciones escolares.

---

## ÍNDICE GENERAL DEL MANUAL

1. [Capítulo 1: Justificación Técnica del Despliegue Físico On-Premise](#capítulo-1-justificación-técnica-del-despliegue-físico-on-premise)
2. [Capítulo 2: Especificaciones y Requisitos de Instalación (QUÉ SE NECESITA)](#capítulo-2-especificaciones-y-requisitos-de-instalación-qué-se-necesita)
   - 2.1 Requisitos de Hardware Físico
   - 2.2 Requisitos de Infraestructura de Red y Eléctrica
   - 2.3 Requisitos de Software Base y Sistema Operativo
3. [Capítulo 3: Acondicionamiento y Preparación del Servidor](#capítulo-3-acondicionamiento-y-preparación-del-servidor)
   - 3.1 Instalación y Particionado de Ubuntu Server 24.04 LTS
   - 3.2 Asignación de Dirección IP Estática (Netplan)
   - 3.3 Endurecimiento de Seguridad y Configuración de Firewall (UFW)
   - 3.4 Instalación del Motor Docker y Docker Compose
4. [Capítulo 4: Despliegue de la Pila de Backend (Supabase Self-Hosted)](#capítulo-4-despliegue-de-la-pila-de-backend-supabase-self-hosted)
   - 4.1 Estructura del Ecosistema Docker
   - 4.2 Generación Criptográfica de Secretos y Configuración del `.env`
   - 4.3 Levantamiento y Orquestación de Contenedores
5. [Capítulo 5: Migraciones de Base de Datos y Catálogos Iniciales](#capítulo-5-migraciones-de-base-de-datos-y-catálogos-iniciales)
   - 5.1 Secuencia Cronológica de Migraciones SQL
   - 5.2 Script Automatizado de Ejecución en Lote
   - 5.3 Carga de Semillas Institucionales (Seed Data)
   - 5.4 Validación Forense de Índices, Triggers y RPCs
6. [Capítulo 6: Compilación y Despliegue del Frontend con Nginx](#capítulo-6-compilación-y-despliegue-del-frontend-con-nginx)
   - 6.1 Compilación de Producción de React 19 + TypeScript con Vite
   - 6.2 Configuración Óptima de Nginx (Reverse Proxy, SPA Routing, Gzip)
   - 6.3 Encabezados de Seguridad Institucionales
7. [Capítulo 7: Configuración de Edge Functions y Agente IA](#capítulo-7-configuración-de-edge-functions-y-agente-ia)
   - 7.1 Aprovisionamiento de Usuarios (`invite-user` y `batch-provision-users`)
   - 7.2 Agente IA Groq Llama 3.3 con Seudonimización LGPDPPSO
   - 7.3 Modo Desconectado / Alternativa Offline con Ollama
8. [Capítulo 8: Topologías de Red y Estrategias de Publicación](#capítulo-8-topologías-de-red-y-estrategias-de-publicación)
   - 8.1 Escenario A: Operación Pura en Red Local Escolar (LAN / Intranet)
   - 8.2 Escenario B: Publicación Externa Segura para Padres vía Cloudflare Tunnel (Recomendada)
   - 8.3 Escenario C: Reenvío de Puertos Clásico (Port Forwarding + DDNS)
9. [Capítulo 9: Plan de Respaldos Automáticos y Recuperación ante Desastres](#capítulo-9-plan-de-respaldos-automáticos-y-recuperación-ante-desastres)
   - 9.1 Script Bash Automatizado de Respaldo Diario (`backup_ssc.sh`)
   - 9.2 Programación en Crontab del Sistema
   - 9.3 Procedimiento de Restauración Paso a Paso
10. [Capítulo 10: Manual de Operación, Monitoreo y Solución de Problemas](#capítulo-10-manual-de-operación-monitoreo-y-solución-de-problemas)
    - 10.1 Protocolo de Encendido, Apagado y Contingencia Eléctrica
    - 10.2 Comandos de Diagnóstico Rápido
    - 10.3 Matriz de Resolución de Fallas (Troubleshooting)
11. [Capítulo 11: Formato de Entrega-Recepción Institucional](#capítulo-11-formato-de-entrega-recepción-institucional)

---

## CAPÍTULO 1: JUSTIFICACIÓN TÉCNICA DEL DESPLIEGUE FÍSICO ON-PREMISE

El despliegue en un servidor físico propio (On-Premise) dentro del Plantel CONALEP Puebla I responde a tres factores determinantes de viabilidad institucional, económica y jurídica:

```
+---------------------------------------------------------------------------------------------------------+
|                                    JUSTIFICACIÓN DEL MODELO ON-PREMISE                                  |
+-----------------------------------+-------------------------------------+-------------------------------+
| CRITERIO                          | NUBE COMERCIAL (AWS/Supabase Cloud) | SERVIDOR FÍSICO EN PLANTEL    |
+-----------------------------------+-------------------------------------+-------------------------------+
| Costo Financiero Recurrente       | $25 - $100 USD/mes ($6,000 - $24,000| $0.00 MXN mensuales en licencias|
|                                   | MXN anuales sujeto a tipo de cambio)| y hosting.                    |
| Marco Legal (LGPDPPSO)            | Datos de menores residiendo en      | Custodia física total dentro del|
|                                   | centros de datos en el extranjero.  | plantel; cumple 100% la ley.  |
| Resiliencia ante Cortes de ISP    | Inaccesible si se interrumpe el     | Continúa operando en la red LAN|
|                                   | servicio del proveedor de internet. | local para pase de lista.     |
| Control del Hardware e Historial  | Almacenamiento limitado por cuota   | Capacidad escalable a terabytes|
|                                   | del plan contratado.                | sin costo adicional.          |
+-----------------------------------+-------------------------------------+-------------------------------+
```

1. **Soberanía y Presupuesto Escolar:** Las instituciones públicas de nivel medio superior enfrentan restricciones para suscribir compromisos de pago en dólares con tarjeta de crédito corporativa. El servidor físico aprovecha la infraestructura de cómputo preexistente en el plantel.
2. **Cumplimiento de la LGPDPPSO:** La Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados prohíbe transferir información sensible de estudiantes menores de edad (datos médicos, actas disciplinarias, reportes psicopedagógicos) a servidores fuera del territorio nacional sin consentimiento expreso. El servidor físico garantiza la custodia directa del plantel.
3. **Continuidad Operativa Escolar:** Si el plantel sufre intermitencias en su conexión a internet, los docentes en las aulas y laboratorios pueden continuar registrando el pase de lista y las incidencias conectándose a la dirección IP local de la Intranet.

---

## CAPÍTULO 2: ESPECIFICACIONES Y REQUISITOS DE INSTALACIÓN (QUÉ SE NECESITA)

### 2.1 Requisitos de Hardware Físico

El sistema no requiere servidores de gama de centros de datos de última generación. Puede ejecutarse en servidores en rack (Dell PowerEdge, HPE ProLiant, Lenovo ThinkSystem) o en estaciones de trabajo dedicadas de escritorio que cumplan con los siguientes umbrales:

| Componente | Perfil Mínimo (Pruebas / 500 Alumnos) | Perfil Recomendado (Producción / 1,500+ Alumnos) |
| :--- | :--- | :--- |
| **Procesador (CPU)** | Intel Core i5 (8va Gen) o AMD Ryzen 5 (4 núcleos, 8 hilos @ 3.0 GHz) | Intel Xeon E / Core i7 o AMD Ryzen 7 (8 núcleos, 16 hilos @ 3.5 GHz) |
| **Memoria RAM** | 8 GB DDR4 (2400 MHz) | 16 GB o 32 GB DDR4/DDR5 con corrección ECC |
| **Almacenamiento** | 256 GB SSD SATA III | 512 GB o 1 TB NVMe M.2 (Esquema RAID 1 recomendado) |
| **Interfaz de Red (NIC)** | 1x Puerto Gigabit Ethernet RJ-45 (10/100/1000 Mbps) | 2x Puertos Gigabit Ethernet (Soporte LACP / Redundancia) |
| **Respaldo de Energía** | No-Break básico de 600 VA | **UPS Interactivo / On-Line de 1200 VA a 1500 VA** con comunicación USB |

> [!CAUTION]
> **REQUERIMIENTO OBLIGATORIO DE RESPALDO ELÉCTRICO (UPS):**  
> En planteles escolares son frecuentes las caídas imprevistas de tensión y tormentas eléctricas. Un apagón abrupto durante una transacción pesada de PostgreSQL puede corromper las tablas de datos (`WAL corruption`). Es **estrictamente obligatorio** conectar el servidor a un UPS de calidad con batería funcional.

### 2.2 Requisitos de Infraestructura de Red y Eléctrica

1. **Ubicación Física:** Site de Servidores, Sala de Redes o Laboratorio de Cómputo Principal, en un ambiente libre de polvo excesivo y con temperatura controlada (preferentemente entre 18 °C y 24 °C).
2. **Cableado Estructurado:** Conexión directa mediante cable de red UTP/STP Categoría 6 al Switch troncal del plantel. **Queda estrictamente prohibido enlazar el servidor a través de Wi-Fi**.
3. **Plan de Direccionamiento IP (Ejemplo Estándar Institucional):**
   - **Dirección IP del Servidor:** `192.168.1.200` (Estática fuera del rango DHCP)
   - **Máscara de Subred:** `255.255.255.0` (`/24`)
   - **Puerta de Enlace (Gateway):** `192.168.1.1`
   - **Servidores DNS Primario/Secundario:** `1.1.1.1` (Cloudflare) y `8.8.8.8` (Google)

### 2.3 Requisitos de Software Base

1. **Sistema Operativo:** **Ubuntu Server 24.04 LTS (Noble Numbat)** de 64 bits (Arquitectura `x86_64`). No se recomienda versión de escritorio (Desktop GUI) para evitar el desperdicio innecesario de 1.5 GB de memoria RAM en interfaces gráficas.
2. **Herramientas de Virtualización y Orquestación:**
   - Docker Engine v26.0 o superior.
   - Docker Compose Plugin v2.26 o superior.
3. **Servidor Web y Proxy Inverso:** Nginx v1.24 o superior.
4. **Entorno de Compilación Local:**
   - Node.js versión 20.x LTS o 22.x LTS.
   - Administrador de paquetes `pnpm` (versión 9 o 10).
   - Git para control de versiones y despliegues.
5. **Utilidades del Sistema:** `curl`, `wget`, `htop`, `ufw`, `fail2ban`, `openssl`, `jq`, `unzip`, `postgresql-client-15`.

---

## CAPÍTULO 3: ACONDICIONAMIENTO Y PREPARACIÓN DEL SERVIDOR

### 3.1 Instalación y Particionado de Ubuntu Server

Durante la instalación de Ubuntu Server mediante USB booteable:
- Idioma: Español / Teclado: Latinoamericano.
- Tipo de instalación: Ubuntu Server (Minimizada o Estándar, sin paquetes de terceros).
- **Esquema de Particionado sugerido para disco de 512 GB:**
  - `/boot/efi`: 1 GB (Formato FAT32)
  - `/boot`: 2 GB (Formato EXT4)
  - `/` (Raíz del Sistema): 80 GB (Formato EXT4)
  - `/var/lib/docker`: 250 GB (Partición dedicada donde residirán los volúmenes de PostgreSQL y contenedores)
  - `/backups`: 150 GB (Partición aislada para copias de seguridad locales)
  - `swap`: 8 GB (Área de intercambio)

### 3.2 Asignación de Dirección IP Estática (Netplan)

Para garantizar que el servidor siempre conserve la misma dirección accesible por las computadoras de los docentes y directivos, se configura Netplan:

1. Identificar el nombre de la tarjeta de red:
```bash
ip link show
# Ejemplo de salida: 2: enp3s0: <BROADCAST,MULTICAST,UP,LOWER_UP> ...
```

2. Editar el archivo de configuración de red:
```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

3. Modificar con la estructura del plantel (respetando estrictamente la indentación de dos espacios):
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: no
      addresses:
        - 192.168.1.200/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

4. Aplicar los cambios de red:
```bash
sudo netplan apply
ip addr show enp3s0
```

### 3.3 Endurecimiento de Seguridad y Configuración de Firewall (UFW)

Para evitar accesos no autorizados en la red escolar, se activa el firewall Uncomplicated Firewall (UFW) permitiendo exclusivamente los puertos indispensables:

```bash
# 1. Actualizar el índice de paquetes del sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar herramientas esenciales
sudo apt install -y curl wget git ufw fail2ban htop iotop net-tools openssl ca-certificates gnupg

# 3. Configurar políticas de tráfico por defecto
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 4. Permitir puerto SSH para administración remota (Puerto 22)
sudo ufw allow 22/tcp comment 'SSH Administracion'

# 5. Permitir tráfico web para el sistema (Puertos 80 y 443)
sudo ufw allow 80/tcp comment 'HTTP Nginx Web'
sudo ufw allow 443/tcp comment 'HTTPS Nginx Seguro'

# 6. Habilitar el Firewall
sudo ufw enable
sudo ufw status verbose
```

> [!NOTE]
> Los puertos de PostgreSQL (`5432`), Kong (`8000`) y servicios internos de Supabase **NO** se abren al exterior en el firewall. Operan aislados en la red interna de Docker (`bridge network`) y sólo son accesibles localmente a través del Proxy Inverso de Nginx.

### 3.4 Instalación del Motor Docker y Docker Compose

Se procede a la instalación oficial del motor de contenedores Docker Engine:

```bash
# 1. Agregar la clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 2. Agregar el repositorio a las fuentes de APT
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar paquetes de Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Habilitar servicio para arranque automático con el servidor
sudo systemctl enable docker
sudo systemctl start docker

# 5. Agregar el usuario administrador al grupo docker (para no requerir sudo en cada comando)
sudo usermod -aG docker $USER
```

---

## CAPÍTULO 4: DESPLIEGUE DE LA PILA DE BACKEND (SUPABASE SELF-HOSTED)

### 4.1 Estructura del Ecosistema Docker

El backend del SSC utiliza la distribución oficial autónoma de Supabase. Crearemos el directorio de despliegue en `/opt/ssc`:

```bash
# Crear directorio principal del sistema
sudo mkdir -p /opt/ssc/backend
sudo chown -R $USER:$USER /opt/ssc
cd /opt/ssc/backend
```

El stack de Supabase On-Premise está compuesto por los siguientes contenedores interconectados:

```
+------------------------------------------------------------------------------------+
|                      PILA DE CONTENEDORES SUPABASE ON-PREMISE                      |
+------------------------------------------------------------------------------------+
|  1. supabase-db         -> PostgreSQL 15 con pg_trgm, uuid-ossp, RLS y triggers    |
|  2. supabase-kong       -> API Gateway central (Enrutador de peticiones y CORS)    |
|  3. supabase-auth       -> GoTrue Auth Engine (Generación y validación de JWT)     |
|  4. supabase-rest       -> PostgREST (Generación instantánea de API sobre Postgres)|
|  5. supabase-realtime   -> Servidor Elixir WebSockets para suscripciones en vivo   |
|  6. supabase-storage    -> Almacenamiento S3 de justificantes y fotos de alumnos   |
|  7. supabase-meta       -> Gestión de metadatos PostgreSQL                         |
|  8. edge-runtime        -> Entorno Deno para Edge Functions (Agente IA y Usuarios) |
+------------------------------------------------------------------------------------+
```

Descargamos el repositorio oficial de despliegue Docker de Supabase:

```bash
cd /opt/ssc/backend
git clone --depth 1 https://github.com/supabase/supabase
cp -r supabase/docker/* .
rm -rf supabase
cp .env.example .env
```

### 4.2 Generación Criptográfica de Secretos y Configuración del `.env`

Por estrictos motivos de seguridad institucional, **jamás se deben utilizar las contraseñas de ejemplo**. Deben generarse cadenas criptográficas únicas para el plantel:

```bash
# Generar contraseñas seguras aleatorias
POSTGRES_PASS=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
```

Para generar las claves `ANON_KEY` y `SERVICE_ROLE_KEY` asociadas al `JWT_SECRET` generado, se ejecuta el siguiente script en Node.js o Python:

```bash
# Guardar script generador temporal de tokens JWT
cat << 'EOF' > generate_keys.cjs
const crypto = require('crypto');

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(header, payload, secret) {
  const encHeader = base64UrlEncode(header);
  const encPayload = base64UrlEncode(payload);
  const data = `${encHeader}.${encPayload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${signature}`;
}

const secret = process.argv[2];
if (!secret) {
  console.error("Proporciona el JWT_SECRET como argumento");
  process.exit(1);
}

const header = { alg: "HS256", typ: "JWT" };
const now = Math.floor(Date.now() / 1000);
const exp = now + (10 * 365 * 24 * 60 * 60); // Válido por 10 años

const anonPayload = {
  role: "anon",
  iss: "supabase",
  iat: now,
  exp: exp
};

const servicePayload = {
  role: "service_role",
  iss: "supabase",
  iat: now,
  exp: exp
};

console.log("ANON_KEY=" + sign(header, anonPayload, secret));
console.log("SERVICE_ROLE_KEY=" + sign(header, servicePayload, secret));
EOF

# Ejecutar generador con el JWT_SECRET generado
node generate_keys.cjs "$JWT_SECRET"
```

A continuación, editar el archivo `/opt/ssc/backend/.env` e ingresar las claves generadas:

```bash
nano /opt/ssc/backend/.env
```

Variables clave que deben configurarse:
```env
############
# SECRETOS CRÍTICOS
############
POSTGRES_PASSWORD=<Contraseña_Postgres_Generada>
JWT_SECRET=<JWT_Secret_Generado>
ANON_KEY=<Anon_Key_Generada>
SERVICE_ROLE_KEY=<Service_Role_Key_Generada>

############
# PARÁMETROS DEL SITIO Y CONEXIÓN
############
API_EXTERNAL_URL=http://192.168.1.200:8000
SITE_URL=http://192.168.1.200
ADDITIONAL_REDIRECT_URLS=http://192.168.1.200,http://localhost:5173

############
# PUERTOS DEL SISTEMA
############
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443
```

### 4.3 Levantamiento y Orquestación de Contenedores

Una vez configurado el archivo `.env`, se procede al despliegue:

```bash
cd /opt/ssc/backend
docker compose pull
docker compose up -d
```

Verificar que todos los servicios se encuentren en estado `Up` o `healthy`:

```bash
docker compose ps
```

Ejemplo de salida esperada:
```
NAME                      IMAGE                              STATUS
backend-db-1              supabase/postgres:15.1.1.78        Up (healthy)
backend-kong-1            kong:2.8.1                         Up (healthy)
backend-auth-1            supabase/gotrue:v2.158.0           Up (healthy)
backend-rest-1            postgrest/postgrest:v12.0.1        Up
backend-realtime-1        supabase/realtime:v2.28.32         Up (healthy)
backend-storage-1         supabase/storage-api:v1.0.6        Up
```

---

## CAPÍTULO 5: MIGRACIONES DE BASE DE DATOS Y CATÁLOGOS INICIALES

### 5.1 Secuencia Cronológica de Migraciones SQL

El sistema conductual cuenta con 14 archivos de migración que deben aplicarse rigurosamente en orden para conformar las 24 tablas, triggers, funciones analíticas y políticas RLS:

1. `20260712000000_init_ssc.sql`: Tablas maestras (`planteles`, `carreras`, `grupos`, `usuarios`, `alumnos`, `incidencias`, `asistencias`).
2. `20260712010000_user_profile_trigger.sql`: Triggers de sincronización entre `auth.users` y `public.usuarios`.
3. `20260712020000_security_fixes.sql`: Restricciones de integridad referencial.
4. `20260712030000_security_and_semaphore_mitigations.sql`: Triggers de cálculo del semáforo conductual.
5. `20260713010000_rls_policies.sql`: Matriz de seguridad Row Level Security por rol.
6. `20260721013300_add_observaciones_to_asistencias.sql`: Campos de notas docentes.
7. `20260721025400_attendance_redesign.sql`: Pase de lista granular (3+3: Asistencia + Desempeño).
8. `20260721200000_bi_module_rpcs.sql`: Funciones almacenadas del Centro BI (`fn_bi_get_kpis`, `fn_bi_get_trend`).
9. `20260728210000_bi_granularity_and_periodos.sql`: Filtros por periodo y generación.
10. `20260728220000_risk_engine_sql.sql`: Motor analítico de riesgo (`fn_calcular_ewma`, `fn_calcular_risk_score`).
11. `20260728230000_enable_realtime.sql`: Publicación de incidencias y notificaciones en `supabase_realtime`.
12. `20260728240000_performance_indexes.sql`: Índices compuestos para optimización de consultas masivas.
13. `20260820010000_add_administrador_role_and_permissions.sql`: Integración del rol Administrador de TI / Control Escolar.
14. `20260820020000_temporal_windows_and_avisos_schema.sql`: Módulo de avisos institucionales y ventanas temporales.

### 5.2 Script Automatizado de Ejecución en Lote

Para facilitar la ejecución al personal de CONALEP sin necesidad de comandos manuales propensos a error, se provee este script en Bash:

```bash
# Crear script de migración automática
cat << 'EOF' > /opt/ssc/backend/ejecutar_migraciones.sh
#!/bin/bash
set -e

echo "=== INICIANDO APLICACIÓN DE MIGRACIONES SSC CONALEP ==="

MIGRATIONS_DIR="/opt/ssc/supabase/migrations"
CONTAINER_NAME="backend-db-1"
DB_USER="postgres"
DB_NAME="postgres"

# Obtener lista ordenada de migraciones
for file in $(ls -v $MIGRATIONS_DIR/*.sql); do
    echo ">> Aplicando: $(basename $file)..."
    docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$file"
done

echo "=== MIGRACIONES APLICADAS EXITOSAMENTE ==="
EOF

chmod +x /opt/ssc/backend/ejecutar_migraciones.sh
```

### 5.3 Carga de Semillas Institucionales (Seed Data)

Una vez estructurada la base de datos, se inyectan los datos de configuración inicial del Plantel CONALEP Puebla I, las carreras técnicas de informática y administración, el catálogo normativo de faltas y el ciclo escolar activo:

```bash
# Inyectar datos semilla al contenedor de base de datos
docker exec -i backend-db-1 psql -U postgres -d postgres < /opt/ssc/supabase/seed_extenso.sql
```

### 5.4 Validación Forense de la Base de Datos

Para verificar que las funciones analíticas y el cálculo de semáforos funcionan correctamente:

```bash
# Probar la función de riesgo EWMA en PostgreSQL
docker exec -i backend-db-1 psql -U postgres -d postgres -c "SELECT public.fn_calcular_ewma(ARRAY[100, 95, 80, 70]::numeric[], 0.3);"
```
*Salida esperada:* Un valor numérico calculado correctamente (ej. `77.8`).

---

## CAPÍTULO 6: COMPILACIÓN Y DESPLIEGUE DEL FRONTEND CON NGINX

### 6.1 Compilación de Producción de React 19 + Vite

El código fuente del frontend se clona y compila localmente en el servidor para generar los activos estáticos ultraligeros optimizados:

```bash
# 1. Instalar Node.js 20 LTS si no estuviera instalado
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# 2. Navegar al directorio de frontend
cd /opt/ssc/frontend

# 3. Crear el archivo .env de producción del Frontend
cat << EOF > .env
VITE_SUPABASE_URL=http://192.168.1.200:8000
VITE_SUPABASE_ANON_KEY=<Anon_Key_Generada_En_Capitulo_4>
EOF

# 4. Instalar dependencias del proyecto
pnpm install

# 5. Compilar la aplicación para producción
pnpm build
```

La compilación generará el directorio `/opt/ssc/frontend/dist` conteniendo los archivos HTML, CSS divididos por componentes y los paquetes JavaScript particionados (`Code-Splitting Chunk 464 kB`).

### 6.2 Configuración Óptima de Nginx

Nginx actuará como servidor web de alto rendimiento para el frontend y como Proxy Inverso hacia Supabase, unificando todo bajo el puerto 80 (o 443 en HTTPS) sin exponer puertos alternos a los usuarios:

```bash
sudo nano /etc/nginx/sites-available/ssc-conalep
```

Pegar la siguiente configuración de grado de producción:

```nginx
server {
    listen 80;
    server_name 192.168.1.200 ssc.conalep.local;

    # Directorio de los archivos compilados del Frontend
    root /opt/ssc/frontend/dist;
    index index.html;

    # Compresión Gzip para optimizar carga en computadoras y celulares del plantel
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Encabezados de Seguridad y Protección Institucional
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 1. Enrutamiento de la Aplicación SPA (Single Page Application - React Router DOM)
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
    }

    # 2. Caché para recursos estáticos inmutables (JS, CSS, Imágenes, Fuentes)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }

    # 3. Proxy Inverso a la API de Supabase (Kong Gateway interno)
    location /rest/v1/ {
        proxy_pass http://127.0.0.1:8000/rest/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 4. Proxy Inverso para Autenticación (GoTrue)
    location /auth/v1/ {
        proxy_pass http://127.0.0.1:8000/auth/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 5. Proxy Inverso para Suscripciones en Vivo WebSockets (Realtime)
    location /realtime/v1/ {
        proxy_pass http://127.0.0.1:8000/realtime/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 6. Proxy Inverso para Edge Functions
    location /functions/v1/ {
        proxy_pass http://127.0.0.1:8000/functions/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Habilitar el sitio y reiniciar Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/ssc-conalep /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## CAPÍTULO 7: CONFIGURACIÓN DE EDGE FUNCTIONS Y AGENTE IA

### 7.1 Microservicios del Sistema
El sistema cuenta con funciones serverless desplegadas en Deno:
1. `invite-user`: Creación criptográfica de credenciales institucionales ejecutada exclusivamente por directivos.
2. `batch-provision-users`: Carga masiva e importación atómica desde plantillas CSV/Excel para el inicio de ciclo escolar.
3. `groq-agent`: Asistente de analítica conductual y diagnóstico ejecutivo directivo.

### 7.2 Agente IA Groq con Cumplimiento LGPDPPSO

Para activar el Agente IA de Inteligencia Directiva, se requiere una clave de API gratuita de Groq (`gsk_...`):

1. Registrar una cuenta institucional gratuita en [console.groq.com](https://console.groq.com).
2. Generar una API Key con acceso al modelo **Llama 3.3 70B Versatile** (`llama-3.3-70b-versatile`).
3. Registrar la variable en el entorno de Edge Functions en `/opt/ssc/backend/.env`:
   ```env
   GROQ_API_KEY=gsk_tu_clave_de_groq_aqui
   ```

**Garantía de Privacidad de Datos de Estudiantes:**  
El personal de CONALEP puede tener la certeza jurídica de que el uso de la IA no vulnera la confidencialidad escolar. Como se detalla en el código de `groq-agent/index.ts`, la función ejecuta un proceso previo de seudonimización antes de transmitir datos a la API:
- Los nombres, apellidos y matrículas son purgados del contexto analítico.
- Cada estudiante es representado exclusivamente mediante tokens sintéticos (`Estudiante #1`, `Estudiante #2`).
- Únicamente se evalúan puntuaciones numéricas (ISC, incidencias y tendencias).

### 7.3 Modo Desconectado / Alternativa Offline con Ollama (Plan de Respaldo)

Si el Plantel CONALEP Puebla I se encuentra en una contingencia sin conexión a internet y requiere analítica por IA 100% local, el servidor puede ejecutar **Ollama** con un modelo cuantizado en su propia CPU:

```bash
# 1. Instalar Ollama en el servidor Ubuntu
curl -fsSL https://ollama.com/install.sh | sh

# 2. Descargar modelo ligero de alto rendimiento
ollama run llama3.2:3b

# 3. La Edge Function puede redirigir la llamada al endpoint local:
# http://127.0.0.1:11434/v1/chat/completions
```

---

## CAPÍTULO 8: TOPOLOGÍAS DE RED Y ESTRATEGIAS DE PUBLICACIÓN

El Plantel CONALEP Puebla I puede optar por cualquiera de las siguientes tres topologías según sus necesidades de conectividad:

```
+--------------------------------------------------------------------------------------------------+
|                                    TOPOLOGÍAS DE DESPLIEGUE EN CONALEP                           |
+--------------------------------------------------------------------------------------------------+
| Topología A: Intranet Pura (LAN)     | Topología B: Cloudflare Tunnel       | Topología C: Port Forwarding |
| • Solo accesible dentro del plantel | • Acceso desde cualquier celular    | • Requiere IP fija pública   |
| • 100% inmune a ataques de internet | • No abre puertos en el módem       | • Apertura de puertos 80/443 |
| • Requiere estar conectado al Wi-Fi | • Certificado SSL/HTTPS automático  | • Exposición a escaneos web  |
|   del plantel para pase de lista.   | • Ideal para padres de familia.     | • Configuración en router.   |
+--------------------------------------------------------------------------------------------------+
```

### 8.1 Topología A: Operación Pura en Red Local Escolar (LAN)

Es la configuración inmediata resultante de los Capítulos 3 al 6. Los equipos de cómputo del plantel acceden escribiendo en el navegador:
`http://192.168.1.200`

Para mayor comodidad del personal docente, el administrador de red puede agregar una entrada en el servidor DNS local del plantel o en el archivo `hosts` del router:
`192.168.1.200  ->  conductual.conalep`

### 8.2 Topología B: Publicación Externa Segura vía Cloudflare Tunnel (RECOMENDADA)

Para que los **padres de familia y tutores** puedan consultar el estatus de sus hijos desde su teléfono móvil fuera del plantel sin comprometer la seguridad de la red institucional, se recomienda utilizar **Cloudflare Tunnel (Zero Trust)**.

**Ventajas clave para CONALEP:**
- Costo: **$0.00 MXN**.
- **No requiere IP pública estática** (funciona en enlaces de Totalplay, Telmex, Megacable o enlaces gubernamentales de la SEP).
- **No requiere abrir ningún puerto en el módem/router escolar** (previene ataques de fuerza bruta y ransomware).
- Provee cifrado **HTTPS automático** con certificado válido reconocido por Android e iOS.

**Procedimiento de configuración:**

1. Instalar el conector `cloudflared` en el servidor:
```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
```

2. Autenticar con la cuenta institucional de Cloudflare:
```bash
cloudflared tunnel login
```

3. Crear el túnel seguro hacia el servidor:
```bash
cloudflared tunnel create ssc-conalep
```

4. Crear el archivo de configuración `/home/$USER/.cloudflared/config.yml`:
```yaml
tunnel: <UUID_DEL_TUNEL>
credentials-file: /home/usuario/.cloudflared/<UUID_DEL_TUNEL>.json

ingress:
  - hostname: conductual.conaleppuebla1.edu.mx
    service: http://localhost:80
  - service: http_status:404
```

5. Asociar la ruta DNS y habilitar el servicio persistente:
```bash
cloudflared tunnel route dns ssc-conalep conductual.conaleppuebla1.edu.mx
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```
A partir de este momento, el sistema se encuentra publicado de forma segura con candado SSL institucional en `https://conductual.conaleppuebla1.edu.mx`.

---

## CAPÍTULO 9: PLAN DE RESPALDOS AUTOMÁTICOS Y RECUPERACIÓN ANTE DESASTRES

La preservación de los datos disciplinarios y registros de asistencia requiere un plan de contingencia automatizado.

### 9.1 Script Bash Automatizado de Respaldo Diario (`backup_ssc.sh`)

Creamos un script robusto que extrae una copia completa de PostgreSQL, la comprime con compresión Gzip de máxima eficiencia, registra la bitácora y depura automáticamente respaldos de más de 15 días:

```bash
sudo mkdir -p /opt/ssc/scripts
sudo nano /opt/ssc/scripts/backup_ssc.sh
```

Pegar el siguiente código:

```bash
#!/bin/bash
# ==============================================================================
# SCRIPT DE RESPALDO AUTOMÁTICO DE BASE DE DATOS - SSC CONALEP PUEBLA I
# ==============================================================================

BACKUP_DIR="/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ssc_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/ssc_backups.log"
CONTAINER_DB="backend-db-1"
RETENTION_DAYS=15

# Asegurar que el directorio de respaldo existe
mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo de base de datos..." >> "$LOG_FILE"

# Ejecutar volcado lógico con pg_dump dentro del contenedor y comprimir al vuelo
if docker exec -t "$CONTAINER_DB" pg_dump -U postgres -d postgres --clean --if-exists | gzip -9 > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo completado con éxito: ${BACKUP_FILE} (Tamaño: ${FILE_SIZE})" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR CRÍTICO: Falló la generación del respaldo." >> "$LOG_FILE"
    exit 1
fi

# Purgar respaldos con antigüedad mayor al periodo de retención
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Depurando respaldos con más de ${RETENTION_DAYS} días..." >> "$LOG_FILE"
find "$BACKUP_DIR" -type f -name "ssc_backup_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tarea de respaldo finalizada correctamente." >> "$LOG_FILE"
```

Otorgar permisos de ejecución al script:
```bash
sudo chmod +x /opt/ssc/scripts/backup_ssc.sh
```

### 9.2 Programación en Crontab del Sistema

Configurar la ejecución automática todos los días de la semana a las 02:00 horas (madrugada, hora de nula actividad en el plantel):

```bash
sudo crontab -e
```

Agregar la siguiente línea al final del archivo:
```cron
0 2 * * * /opt/ssc/scripts/backup_ssc.sh > /dev/null 2>&1
```

### 9.3 Procedimiento de Restauración Paso a Paso

En caso de fallo humano, daño de disco o necesidad de migrar el sistema a un nuevo servidor físico, la base de datos se restaura íntegramente con un solo comando:

```bash
# 1. Identificar el archivo de respaldo más reciente
ls -lh /backups/postgresql/

# 2. Restaurar la base de datos completa
gunzip -c /backups/postgresql/ssc_backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i backend-db-1 psql -U postgres -d postgres
```

---

## CAPÍTULO 10: MANUAL DE OPERACIÓN, MONITOREO Y SOLUCIÓN DE PROBLEMAS

### 10.1 Protocolo de Encendido, Apagado y Contingencia Eléctrica

**Procedimiento de Apagado Programado (Mantenimiento del Site o Vacaciones Escolares):**
1. Detener Nginx para no recibir nuevas peticiones web: `sudo systemctl stop nginx`
2. Detener ordenadamente la pila de Supabase: `cd /opt/ssc/backend && docker compose stop`
3. Ejecutar apagado del sistema operativo: `sudo shutdown -h now`

**Procedimiento de Arranque tras Corte de Energía Eléctrica:**
El sistema está configurado para que al restaurarse el suministro eléctrico y encender el servidor físico:
- Docker y los contenedores inicien automáticamente (`restart: unless-stopped`).
- Nginx levante de forma inmediata.
- En caso de que algún servicio no responda, ejecutar:
  ```bash
  cd /opt/ssc/backend && docker compose up -d
  sudo systemctl restart nginx
  ```

### 10.2 Comandos de Diagnóstico Rápido para el Encargado de TI

```bash
# 1. Ver estado general de contenedores y consumo de RAM/CPU en vivo
docker stats

# 2. Ver logs en tiempo real de la base de datos
docker logs -f --tail 100 backend-db-1

# 3. Ver espacio libre en discos duros
df -h

# 4. Ver memoria RAM disponible
free -h

# 5. Probar conectividad interna de Nginx
sudo nginx -t
```

### 10.3 Matriz de Solución de Problemas Frecuentes (Troubleshooting)

| Síntoma / Problema | Causa Probable | Procedimiento de Solución |
| :--- | :--- | :--- |
| **La página web no carga (Error 502 Bad Gateway)** | El backend de Supabase o Kong se encuentra apagado. | Ejecutar `docker compose -f /opt/ssc/backend/docker-compose.yml up -d` y validar con `docker ps`. |
| **La página abre pero no permite iniciar sesión** | La variable `VITE_SUPABASE_URL` o `ANON_KEY` en el frontend no coincide con el backend. | Verificar claves en `/opt/ssc/frontend/.env` y reconstruir el frontend con `pnpm build`. |
| **Las notificaciones y cambios de semáforo no son en vivo** | El servicio WebSocket Realtime está desconectado o bloqueado en Nginx. | Asegurarse de que en `nginx.conf` la directiva `proxy_set_header Connection "Upgrade";` esté activa en `/realtime/v1/`. |
| **El Agente IA directivo no responde (Error 500)** | Falta configurar la clave `GROQ_API_KEY` o el servidor no tiene salida a internet. | Revisar `docker logs backend-functions-1` e ingresar la clave en `/opt/ssc/backend/.env`. |
| **El disco duro se está llenando rápidamente** | Los registros de logs de Docker están acumulando espacio sin rotación. | Configurar el daemon de Docker (`/etc/docker/daemon.json`) con `"log-driver": "json-file"`, `"log-opts": {"max-size": "50m", "max-file": "3"}`. |

---

## CAPÍTULO 11: FORMATO DE ENTREGA-RECEPCIÓN INSTITUCIONAL

Para formalizar la culminación de la **Estadía Profesional** y la entrega definitiva del sistema al **Plantel CONALEP Puebla I**, se incluye el acta modelo de entrega-recepción de bienes informáticos y software:

```
====================================================================================================
                        ACTA DE ENTREGA - RECEPCIÓN TÉCNICA DE SOFTWARE
                 SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC)
====================================================================================================

FECHA DE EMISIÓN: _____ de _____________________ de 2026
LUGAR: Instalaciones del Plantel CONALEP Puebla I, Heroica Puebla de Zaragoza, Pue.

I. DECLARACIÓN DE LAS PARTES:
Por una parte, el/la C. ____________________________________________________________________, 
estudiante prestador de Estadía Profesional.
Y por la otra parte, el/la C. _______________________________________________________________, 
en su calidad de Jefe(a) de Proyecto de Informática / Administrador(a) de Tecnologías del Plantel.

II. BIENES Y ENTREGABLES CEDIDOS AL PLANTEL:
1. [X] Código Fuente Completo del Frontend (React 19 + TypeScript + Vite) con licencia institucional.
2. [X] Repositorio de Base de Datos PostgreSQL 15 con 14 migraciones SQL versionadas y datos semilla.
3. [X] Contenedores y orquestación Docker de Supabase Self-Hosted configurados en el Servidor Físico.
4. [X] Manual Técnico y Memoria de Instalación en Servidor Físico (este documento impreso y digital).
5. [X] Script de respaldos automáticos programado en Crontab con retención a 15 días.
6. [X] Sobre cerrado con credenciales maestras (PostgreSQL Superuser, JWT Secret, Token de IA y SSH).

III. ACEPTACIÓN TÉCNICA:
Se hace constar que el sistema se encuentra instalado, configurado y operando de conformidad en el
servidor asignado en el Site de Cómputo del Plantel, habiéndose verificado las pruebas de pase de lista,
registro de incidencias, semaforización en tiempo real y módulo de Business Intelligence.

--------------------------------------------        --------------------------------------------
       FIRMA DEL ESTUDIANTE DE ESTADÍA                       FIRMA DE JEFE(A) DE INFORMÁTICA
                                                                   CONALEP PLANTEL PUEBLA I

--------------------------------------------        --------------------------------------------
      ASESOR ACADÉMICO DE ESTADÍA                         DIRECTOR(A) DEL PLANTEL CONALEP
====================================================================================================
```
