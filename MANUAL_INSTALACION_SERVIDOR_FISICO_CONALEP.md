# MANUAL TÉCNICO INTEGRAL DE INSTALACIÓN, HARDENING Y TROUBLESHOOTING EN SERVIDOR LINUX NATIVO
# SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC / EduTrack 360)
**Plantel:** Colegio de Educación Profesional Técnica del Estado de Puebla — Plantel Puebla I  
**Destinatarios:** Jefatura de Proyecto de Informática, Administradores de Red y Laboratorios de Cómputo  
**Cumplimiento Normativo:** Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO) · INAI  
**Versión del Documento:** 3.0.0 Master Production Release — Octubre 2026  
**Entorno de Ejecución:** Servidor Físico On-Premise (Ubuntu Server 22.04 / 24.04 LTS x86_64)

---

## RESUMEN EJECUTIVO Y SOBERANÍA TECNOLÓGICA (LGPDPPSO)

El **Sistema de Seguimiento Conductual (SSC)** resguarda información de alta confidencialidad perteneciente a la comunidad estudiantil de CONALEP: bitácoras de conducta, asistencias, canalizaciones psicológicas de orientación educativa, justificantes médicos y datos de contacto de padres y tutores.

### Justificación Legal del Despliegue On-Premise
La **LGPDPPSO (Artículos 68 al 71)** prohíbe a los Sujetos Obligados transferir datos personales sensibles a infraestructuras en el extranjero sin salvaguardas explícitas y consentimiento fundamentado. Los servicios comerciales en la nube (como Supabase Cloud alojado por defecto en AWS Oregón, EE. UU.) implican la salida transfronteriza de datos de menores de edad y representan costos recurrentes en moneda extranjera incompatibles con los presupuestos escolares.

El despliegue en un **servidor físico propio dentro del Plantel CONALEP Puebla I**:
1. **Garantiza la Soberanía de Datos:** Ningún dato personal de alumnos o tutores sale de las instalaciones del plantel.
2. **Costo Recurrente Cero ($0.00 MXN):** Aprovecha la infraestructura preexistente sin pago de licencias ni suscripciones mensuales.
3. **Resiliencia Operativa:** Si el proveedor de internet del plantel sufre intermitencias, el pase de lista y el registro de incidencias continúan operando al 100% en la Intranet escolar (LAN).

---

## ÍNDICE GENERAL DEL MANUAL

1. [Capítulo 1: Requerimientos de Infraestructura y Topología de Red](#capítulo-1-requerimientos-de-infraestructura-y-topología-de-red)
2. [Capítulo 2: Preparación del Sistema Operativo Linux (Paso a Paso)](#capítulo-2-preparación-del-sistema-operativo-linux-paso-a-paso)
3. [Capítulo 3: Despliegue del Stack Supabase Self-Hosted](#capítulo-3-despliegue-del-stack-supabase-self-hosted)
4. [Capítulo 4: Despliegue de Edge Functions (Deno Runtime)](#capítulo-4-despliegue-de-edge-functions-deno-runtime)
5. [Capítulo 5: Inicialización Limpia de la Base de Datos para Producción](#capítulo-5-inicialización-limpia-de-la-base-de-datos-para-producción)
6. [Capítulo 6: Servidor Web y Proxy Inverso Nginx](#capítulo-6-servidor-web-y-proxy-inverso-nginx)
7. [Capítulo 7: Compilación y Publicación del Frontend (React 19 + Vite)](#capítulo-7-compilación-y-publicación-del-frontend-react-19--vite)
8. [Capítulo 8: Estrategias de Conectividad y Publicación Externa](#capítulo-8-estrategias-de-conectividad-y-publicación-externa)
9. [Capítulo 9: Política de Respaldos Diarios y Recuperación ante Desastres](#capítulo-9-política-de-respaldos-diarios-y-recuperación-ante-desastres)
10. [Capítulo 10: Manual de Operación para el Administrador (Alta de Usuarios)](#capítulo-10-manual-de-operación-para-el-administrador-alta-de-usuarios)
11. [Capítulo 11: Guía Maestra de Troubleshooting y Solución de Fallos](#capítulo-11-guía-maestra-de-troubleshooting-y-solución-de-fallos)
12. [Capítulo 12: Acta de Entrega-Recepción Institucional](#capítulo-12-acta-de-entrega-recepción-institucional)

---

## CAPÍTULO 1: REQUERIMIENTOS DE INFRAESTRUCTURA Y TOPOLOGÍA DE RED

### 1.1 Especificaciones de Hardware Recomendadas

| Componente | Perfil Mínimo (1 Plantel / ~1,500 Alumnos) | Perfil Recomendado (Producción / Alta Disponibilidad) |
| :--- | :--- | :--- |
| **Procesador (CPU)** | Intel Core i5/i7 (8va gen+) o AMD Ryzen 5 Pro (4 núcleos / 8 hilos) | Intel Xeon E/Silver o AMD EPYC (8 a 16 núcleos) |
| **Memoria RAM** | 8 GB a 16 GB DDR4 | 16 GB a 32 GB DDR4/DDR5 con corrección ECC |
| **Almacenamiento** | 256 GB SSD SATA III / NVMe Enterprise | 512 GB+ SSD NVMe en arreglo RAID 1 (Espejo por tolerancia a fallos) |
| **Cifrado en Reposo** | Partición formateada con LUKS (`dm-crypt`) | LUKS a nivel volumen raíz o partición dedicada de Docker |
| **Interfaz de Red** | 1x Puerto Gigabit Ethernet RJ-45 (1000 Mbps) | 2x Puertos Gigabit Ethernet (Soporte LACP / Redundancia) |
| **Respaldo Eléctrico** | No-Break básico de 600 VA | **UPS Interactivo / On-Line de 1200 VA a 1500 VA** (Obligatorio) |

> [!CAUTION]
> **REQUERIMIENTO OBLIGATORIO DE RESPALDO ELÉCTRICO (UPS):**  
> Un apagón abrupto durante escrituras de PostgreSQL puede corromper los registros WAL (`Write-Ahead Logging`). El servidor debe estar conectado permanentemente a un UPS funcional.

### 1.2 Arquitectura de Puertos y Aislamiento Perimetral

| Servicio / Contenedor | Puerto Interno | Puerto Expuesto | Política de Aislamiento |
| :--- | :--- | :--- | :--- |
| **Nginx (Reverse Proxy)** | 80 / 443 | 80 / 443 | **PÚBLICO:** Tráfico web y llamadas de API unificadas. |
| **SSH Server (Administración)**| 22 | 22 | **RESTRINGIDO:** Solo personal de TI mediante llave pública o VPN. |
| **Supabase Gateway (Kong)** | 8000 | 127.0.0.1:8000 | **AISLADO LOCALHOST:** Nginx redirige el tráfico. Jamás exponer a `0.0.0.0`. |
| **PostgreSQL Database** | 5432 | 127.0.0.1:5432 | **AISLADO LOCALHOST:** Solo accesible por Docker interno o psql local. |
| **Supabase Studio (Dashboard)**| 8000/dashboard | Interno | **PRIVADO:** Bloqueado en Nginx con regla 403 Forbidden. |

---

## CAPÍTULO 2: PREPARACIÓN DEL SISTEMA OPERATIVO LINUX (PASO A PASO)

### 2.1 Actualización y Creación de Usuario Institucional
Acceder a la consola como superusuario y configurar el usuario gestor:

```bash
# 1. Actualizar el índice de paquetes y el sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar utilidades esenciales de administración
sudo apt install -y curl wget git ufw htop ca-certificates gnupg lsb-release net-tools

# 3. Crear usuario administrativo para el proyecto
sudo adduser conalep-admin
sudo usermod -aG sudo conalep-admin

# 4. Cambiar a la sesión del nuevo usuario
su - conalep-admin
```

### 2.2 Instalación Nativa de Docker Engine (Evitar Snap)
> [!WARNING]
> **NO instalar Docker mediante `snap install docker`**: Los paquetes Snap confinan Docker en AppArmor, generando bloqueos en volúmenes montados y resolución DNS interna.

```bash
# 1. Instalar certificados y agregar la clave GPG oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 2. Agregar el repositorio oficial de Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar Docker Engine y Docker Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Habilitar el servicio Docker para arranque automático
sudo systemctl enable --now docker
```

### 2.3 Solución Crítica al Permiso de Socket Unix
Para evitar el error `permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`:

```bash
# 1. Agregar el usuario actual al grupo docker
sudo usermod -aG docker $USER

# 2. Refrescar credenciales de grupo en la terminal activa
newgrp docker

# 3. Verificar funcionamiento sin sudo
docker ps
docker compose version
```

### 2.4 Configuración del Firewall Perimetral Estricto (UFW)
```bash
# 1. Políticas por defecto: denegar entrada, permitir salida
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Permitir puertos indispensables
sudo ufw allow 22/tcp comment 'SSH Administracion'
sudo ufw allow 80/tcp comment 'HTTP Nginx Web'
sudo ufw allow 443/tcp comment 'HTTPS Nginx Seguro'

# 3. Activar el Firewall
sudo ufw enable
sudo ufw status verbose
```

---

## CAPÍTULO 3: DESPLIEGUE DEL STACK SUPABASE SELF-HOSTED

Crearemos la infraestructura en `/opt/ssc/backend`:

```bash
# Crear directorio institucional
sudo mkdir -p /opt/ssc/backend
sudo chown -R $USER:$USER /opt/ssc
cd /opt/ssc/backend

# Clonar el stack oficial contenerizado de Supabase
git clone --depth 1 https://github.com/supabase/supabase.git
cp -r supabase/docker/* .
rm -rf supabase
cp .env.example .env
```

### 3.1 Generación de Secretos Criptográficos de Alta Entropía
Jamás utilice contraseñas por defecto en producción:

```bash
# Generar claves criptográficas seguras
POSTGRES_PASS=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
DASHBOARD_PASS=$(openssl rand -hex 16)

echo "DB Password: $POSTGRES_PASS"
echo "JWT Secret:  $JWT_SECRET"
```

Generar las llaves `ANON_KEY` y `SERVICE_ROLE_KEY` asociadas al `JWT_SECRET` ejecutando el siguiente comando en Node.js:

```bash
node -e '
const crypto = require("crypto");
const secret = process.argv[1];
function sign(role, exp) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role: role, iss: "supabase", iat: Math.floor(Date.now()/1000), exp: exp })).toString("base64url");
  const data = header + "." + payload;
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return data + "." + signature;
}
const exp = Math.floor(Date.now()/1000) + (10 * 365 * 24 * 3600); // 10 años
console.log("ANON_KEY=" + sign("anon", exp));
console.log("SERVICE_ROLE_KEY=" + sign("service_role", exp));
' "$JWT_SECRET"
```

### 3.2 Ajustes Clave en el Archivo `/opt/ssc/backend/.env`
Editar con `nano /opt/ssc/backend/.env` y configurar:

```env
# --- BASE DE DATOS ---
POSTGRES_PASSWORD=<TU_POSTGRES_PASS_GENERADA>

# --- SEGURIDAD JWT ---
JWT_SECRET=<TU_JWT_SECRET_GENERADO>
ANON_KEY=<TU_NUEVA_ANON_KEY>
SERVICE_ROLE_KEY=<TU_NUEVA_SERVICE_ROLE_KEY>

# --- RUTAS PÚBLICAS (¡IMPORTANTE: SIN /api!) ---
SITE_URL=http://192.168.1.200
API_EXTERNAL_URL=http://192.168.1.200
# Si se utiliza dominio público/túnel:
# SITE_URL=https://conductual.conaleppuebla1.edu.mx
# API_EXTERNAL_URL=https://conductual.conaleppuebla1.edu.mx

# --- PANEL SUPABASE STUDIO ---
DASHBOARD_USERNAME=admin_conalep
DASHBOARD_PASSWORD=<TU_DASHBOARD_PASS>

# --- AMARRE DE PUERTOS A LOCALHOST (PROTECCIÓN IPTABLES/UFW) ---
# Evita que Docker publique puertos en interfaces públicas 0.0.0.0
KONG_HTTP_PORT=127.0.0.1:8000
KONG_HTTPS_PORT=127.0.0.1:8443
POSTGRES_PORT=127.0.0.1:5432
```

### 3.3 Levantamiento del Stack
```bash
cd /opt/ssc/backend
docker compose pull
docker compose up -d
docker compose ps
```

---

## CAPÍTULO 4: DESPLIEGUE DE EDGE FUNCTIONS (DENO RUNTIME)

El SSC incluye **cuatro Edge Functions críticas** que deben montarse en el volumen de Docker:

1. `groq-agent`: Asistente de analítica conductual directiva con rate limiting en Postgres y seudonimización LGPDPPSO.
2. `record-failed-login`: Registro seguro de intentos fallidos sin exponer la base de datos a clientes anónimos.
3. `invite-user`: Alta individual de docentes, orientadores y directivos con soporte para contraseñas locales sin requerir SMTP.
4. `batch-provision-users`: Asistente de importación masiva escolar desde plantillas Excel (.xlsx) y CSV.

```bash
# 1. Crear directorio del volumen de Edge Functions
mkdir -p /opt/ssc/backend/volumes/functions

# 2. Copiar las cuatro funciones desde el repositorio
cp -r /ruta/al/proyecto/SSC/supabase/functions/groq-agent /opt/ssc/backend/volumes/functions/
cp -r /ruta/al/proyecto/SSC/supabase/functions/record-failed-login /opt/ssc/backend/volumes/functions/
cp -r /ruta/al/proyecto/SSC/supabase/functions/invite-user /opt/ssc/backend/volumes/functions/
cp -r /ruta/al/proyecto/SSC/supabase/functions/batch-provision-users /opt/ssc/backend/volumes/functions/

# 3. Otorgar permisos de lectura y ejecución
chmod -R 755 /opt/ssc/backend/volumes/functions
```

### Inyección de Secretos para Edge Functions
En `/opt/ssc/backend/.env`, verificar que existan:
```env
GROQ_API_KEY=<TU_CLAVE_GROQ_API>
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=<TU_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<TU_SERVICE_ROLE_KEY>
```

Reiniciar el contenedor de funciones:
```bash
docker compose restart edge-functions
```

---

## CAPÍTULO 5: INICIALIZACIÓN LIMPIA DE LA BASE DE DATOS PARA PRODUCCIÓN

> [!IMPORTANT]
> **CUMPLIMIENTO ESTRICTO LGPDPPSO (SOBERANÍA Y PRIVACIDAD):**  
> Para instalar el sistema en el plantel sin acarrear datos de pruebas o identidades simuladas, se ejecuta el script maestro [`init_produccion_limpia.sql`](file:///c:/Users/User/Documents/SSC/supabase/init_produccion_limpia.sql).  
> Este script:
> - Resuelve en una sola transacción la creación de las 24 tablas en orden estricto de llaves foráneas (eliminando de raíz el error `relation "public.planteles" does not exist`).
> - Incluye la columna `email` en `usuarios_rls_bypass` para el correcto funcionamiento de `record-failed-login`.
> - Establece todos los triggers, RLS y funciones analíticas de BI.
> - Carga únicamente los catálogos institucionales del Plantel Puebla I (carreras técnicas, periodos y faltas normativas).
> - Da de alta la cuenta de **Super Administrador de TI** inicial.
> - **Mantiene las tablas de alumnos, incidencias y tutores 100% vacías.**

### Ejecución de Inicialización Limpia (Un Solo Comando):

```bash
# Copiar el script maestro al servidor y ejecutar dentro del contenedor de PostgreSQL:
docker exec -i supabase-db psql -U postgres -d postgres < /ruta/al/proyecto/SSC/supabase/init_produccion_limpia.sql
```

### Credenciales Maestras Iniciales del Administrador:
* **Correo Electrónico:** `admin@conalep.edu.mx`
* **Contraseña Inicial:** `AdminConalep.2026!`
* **Rol:** `administrador` (Acceso total al Centro de Control Escolar)

---

## CAPÍTULO 6: SERVIDOR WEB Y PROXY INVERSO NGINX

Instalar Nginx:
```bash
sudo apt install -y nginx
```

Configurar el sitio en `/etc/nginx/sites-available/ssc-conalep`:
```bash
sudo nano /etc/nginx/sites-available/ssc-conalep
```

Pegar la siguiente configuración de producción:

```nginx
server {
    listen 80;
    server_name 192.168.1.200 conductual.conaleppuebla1.edu.mx;

    # Directorio de los archivos compilados del Frontend
    root /opt/ssc/frontend/dist;
    index index.html;

    # LÍMITE DE CARGA: Vital para la importación masiva en Excel (500+ alumnos) y Justificantes
    client_max_body_size 50M;

    # Compresión Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Cabeceras de Seguridad Institucionales LGPDPPSO
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 1. Enrutamiento de la Aplicación SPA (React Router DOM)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 2. Caché para recursos estáticos inmutables
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }

    # 3. API Gateway de Supabase (Auth, Rest, Storage, Functions)
    location ~ ^/(auth|rest|storage|functions)/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }

    # 4. WebSockets en Tiempo Real (Realtime)
    location /realtime/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 5. Protección: Bloquear acceso público a Supabase Studio
    location /dashboard {
        deny all;
        return 403;
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

## CAPÍTULO 7: COMPILACIÓN Y PUBLICACIÓN DEL FRONTEND (REACT 19 + VITE)

El frontend está desarrollado en React 19 + TypeScript y utiliza `pnpm` como gestor oficial de dependencias:

```bash
# 1. Instalar Node.js 20 LTS y pnpm si no estuvieran presentes
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# 2. Navegar al código fuente del frontend
cd /opt/ssc/frontend

# 3. Configurar variables de entorno de producción
cat << 'EOF' > .env
VITE_SUPABASE_URL=http://192.168.1.200
VITE_SUPABASE_ANON_KEY=<TU_ANON_KEY_GENERADA_EN_CAPITULO_3>
EOF

# 4. Instalar dependencias respetando el lockfile
pnpm install

# 5. Compilar la aplicación estática optimizada
pnpm run build

# 6. Otorgar permisos al servidor web
sudo chown -R www-data:www-data /opt/ssc/frontend/dist
sudo chmod -R 755 /opt/ssc/frontend/dist
```

---

## CAPÍTULO 8: ESTRATEGIAS DE CONECTIVIDAD Y PUBLICACIÓN EXTERNA

### Escenario A: Operación en Red Local Escolar (Intranet / LAN)
Los equipos del plantel acceden directamente mediante:
`http://192.168.1.200`

Se recomienda agregar una entrada en el DNS interno o router del plantel:
`192.168.1.200  ->  conductual.conalep`

### Escenario B: Publicación Externa Segura para Padres (Cloudflare Tunnel - Zero Trust)
Para que los tutores consulten a sus hijos desde celulares fuera del plantel:
* **Costo:** $0.00 MXN.
* **No requiere IP pública estática.**
* **No abre puertos en el módem escolar** (inmune a escaneos y ataques web).
* **HTTPS automático y certificado.**

```bash
# 1. Instalar cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# 2. Iniciar sesión y crear el túnel
cloudflared tunnel login
cloudflared tunnel create ssc-conalep

# 3. Configurar ~/.cloudflared/config.yml apuntando a http://localhost:80
# 4. Iniciar servicio continuo
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

---

## CAPÍTULO 9: POLÍTICA DE RESPALDOS DIARIOS Y RECUPERACIÓN ANTE DESASTRES

Creamos `/opt/ssc/scripts/backup_ssc.sh`:

```bash
sudo mkdir -p /opt/ssc/scripts /backups/postgresql
sudo nano /opt/ssc/scripts/backup_ssc.sh
```

Pegar el siguiente código corregido (sin la bandera `-t` para evitar fallos en `cron`):

```bash
#!/bin/bash
# ==============================================================================
# SCRIPT DE RESPALDO AUTOMÁTICO DE BASE DE DATOS - SSC CONALEP PUEBLA I
# ==============================================================================
BACKUP_DIR="/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/ssc_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="/var/log/ssc_backups.log"
CONTAINER_DB="supabase-db"
RETENTION_DAYS=15

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo de base de datos..." >> "$LOG_FILE"

# Ejecutar pg_dump SIN el flag -t (garantiza compatibilidad con crontab)
if docker exec "$CONTAINER_DB" pg_dump -U postgres -d postgres --clean --if-exists | gzip -9 > "$BACKUP_FILE"; then
    chmod 600 "$BACKUP_FILE"
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo completado con éxito: ${BACKUP_FILE} (Tamaño: ${FILE_SIZE})" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR CRÍTICO: Falló la generación del respaldo." >> "$LOG_FILE"
    exit 1
fi

# Depurar respaldos antiguos
find "$BACKUP_DIR" -type f -name "ssc_backup_*.sql.gz" -mtime +$RETENTION_DAYS -exec rm -f {} \;
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tarea de respaldo finalizada correctamente." >> "$LOG_FILE"
```

Dar permisos de ejecución:
```bash
sudo chmod +x /opt/ssc/scripts/backup_ssc.sh
```

Programar en `cron` a las 02:00 AM diariamente:
```bash
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /opt/ssc/scripts/backup_ssc.sh >/dev/null 2>&1") | sudo crontab -
```

---

## CAPÍTULO 10: MANUAL DE OPERACIÓN PARA EL ADMINISTRADOR (ALTA DE USUARIOS)

Una vez desplegado el sistema e inicializada la base de datos limpia:

### 10.1 Primer Inicio de Sesión
1. Abrir el navegador e ingresar a la URL del sistema (`http://192.168.1.200` o la URL configurada).
2. Iniciar sesión con:
   * **Correo:** `admin@conalep.edu.mx`
   * **Contraseña:** `AdminConalep.2026!`
3. Se desplegará el panel exclusivo de **Administración de TI y Control Escolar**.

### 10.2 Alta de Personal Docente, Directivo y Orientadores
1. Ingresar a la sección **Gestión de Usuarios** (`/admin/usuarios`).
2. Hacer clic en **"Invitar Nuevo Usuario"**.
3. Llenar los datos del profesor o administrativo:
   * Nombre, Apellidos, Correo institucional y Rol asignado.
   * **Contraseña Inicial (Opcional):** Si el servidor se encuentra en red local sin SMTP, ingresar una contraseña temporal (ej. `Conalep.2026!`). La cuenta quedará creada y activada al instante.
4. Entregar las credenciales al docente para su acceso.

### 10.3 Carga Masiva de Alumnos y Tutores por Lote (Inicio de Semestre)
1. Ingresar a **Importación Masiva** (`/admin/importar-usuarios`).
2. Descargar la plantilla oficial de Excel (`.xlsx`) provista en el asistente.
3. Pegar las columnas de los estudiantes: Matrícula, Nombre, Apellidos, Correo, Grupo y Datos del Tutor.
4. Cargar el archivo en el sistema y presionar **"Iniciar Importación"**.
5. El motor procesará los bloques de alumnos, creará automáticamente las cuentas de los estudiantes (con su matrícula como contraseña inicial), generará las cuentas de sus tutores legales y creará el vínculo familiar en la base de datos de forma atómica.

---

## CAPÍTULO 11: GUÍA MAESTRA DE TROUBLESHOOTING Y SOLUCIÓN DE FALLOS

### Caso 1: Rebote instantáneo al Login tras escribir credenciales correctas
* **Causa:** El usuario existe en `auth.users`, pero no se encuentra en `public.usuarios_rls_bypass`, o las funciones de seguridad de RLS no tienen permisos de ejecución.
* **Solución Inmediata:**
  Ejecutar el bloque de autoreparación dentro del contenedor:
  ```bash
  docker exec -i supabase-db psql -U postgres -d postgres << 'EOF'
  GRANT EXECUTE ON FUNCTION public.fn_get_auth_rol() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_get_auth_plantel() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_check_auth_user_valid() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_user(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_padre(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_plantel(UUID) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.fn_alumnos_ids_for_docente_grupos(UUID) TO authenticated;

  INSERT INTO public.usuarios_rls_bypass (id, rol, plantel_id, email, activo, bloqueado_hasta, intentos_fallidos)
  SELECT id, rol, plantel_id, email, activo, bloqueado_hasta, intentos_fallidos
  FROM public.usuarios
  ON CONFLICT (id) DO UPDATE SET
    rol = EXCLUDED.rol,
    plantel_id = EXCLUDED.plantel_id,
    email = EXCLUDED.email,
    activo = EXCLUDED.activo;
  EOF
  ```

### Caso 2: Error 413 "Request Entity Too Large" al importar Excel
* **Causa:** Falta la directiva `client_max_body_size` en `/etc/nginx/sites-available/ssc-conalep`.
* **Solución:** Agregar `client_max_body_size 50M;` dentro del bloque `server` de Nginx y recargar con `sudo systemctl reload nginx`.

### Caso 3: Falsos positivos del Database Linter (`0029_authenticated_security_definer_function_executable`)
* **Advertencia:** El linter de Supabase sugerirá revocar `EXECUTE` a `authenticated` en `fn_get_auth_rol()`.
* **Solución:** **¡NO REVOCAR ESTE PERMISO!** Esta función es un pilar del diseño anti-recursión. Si se revoca, ningún usuario autenticado podrá resolver su rol y el sistema rebotará todas las sesiones al login.

---

## CAPÍTULO 12: FORMATO DE ENTREGA-RECEPCIÓN INSTITUCIONAL

```
====================================================================================================
                        ACTA DE ENTREGA - RECEPCIÓN TÉCNICA DE SOFTWARE
                 SISTEMA DE SEGUIMIENTO CONDUCTUAL Y BUSINESS INTELLIGENCE (SSC)
====================================================================================================

FECHA DE EMISIÓN: _____ de _____________________ de 2026
LUGAR: Instalaciones del Plantel CONALEP Puebla I, Heroica Puebla de Zaragoza, Pue.

I. DECLARACIÓN DE LAS PARTES:
Por una parte, el/la prestador(a) de Estadía Profesional.
Y por la otra parte, la Jefatura de Proyecto de Informática del Plantel CONALEP Puebla I.

II. BIENES Y ENTREGABLES CEDIDOS AL PLANTEL:
1. [X] Código Fuente Completo del Frontend (React 19 + TypeScript + Vite) con licencia institucional.
2. [X] Base de Datos PostgreSQL 15 limpia, normalizada y configurada bajo la normativa LGPDPPSO.
3. [X] Pila de Microservicios Supabase Self-Hosted desplegada y aislada en Servidor Físico Linux.
4. [X] 4 Edge Functions operativas (groq-agent, record-failed-login, invite-user, batch-provision-users).
5. [X] Servidor Nginx configurado con Reverse Proxy, WebSockets Realtime y cabeceras de seguridad.
6. [X] Script de respaldos automatizados programado en Crontab con retención a 15 días.
7. [X] Credencial Maestra inicial de Super Administrador de TI entregada en sobre cerrado.

III. ACEPTACIÓN TÉCNICA Y SOBERANÍA DE DATOS:
Se hace constar que el sistema se encuentra instalado, configurado y validado en el servidor físico asignado
en el Site de Cómputo del Plantel, habiéndose comprobado el inicio de sesión del Administrador, el alta de
usuarios, el registro de incidencias, el pase de lista y el módulo analítico de Business Intelligence,
garantizando que ninguna información conductual o dato de menor de edad sale de la custodia del plantel.

--------------------------------------------        --------------------------------------------
       FIRMA DEL PRESTADOR DE ESTADÍA                      FIRMA DE JEFATURA DE INFORMÁTICA
                                                                CONALEP PLANTEL PUEBLA I

--------------------------------------------        --------------------------------------------
       ASESOR ACADÉMICO DE ESTADÍA                         DIRECTOR(A) DEL PLANTEL CONALEP
====================================================================================================
```
