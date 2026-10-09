#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del Manual Técnico de Instalación On-Premise y Auditoría de Seguridad
Sistema de Seguimiento Conductual (SSC) - CONALEP Plantel Puebla I
Autor: Equipo de Ingeniería de Software SSC
Versión: 3.0.0 (Producción Limpia)
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Portada: no dibujar encabezado ni pie de página estándar
            return

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#4B5563"))

        # Encabezado
        self.drawString(54, 752, "SSC — CONALEP PLANTEL PUEBLA I")
        self.drawRightString(612 - 54, 752, "MANUAL DE INSTALACIÓN Y AUDITORÍA")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 744, 612 - 54, 744)

        # Pie de página
        self.line(54, 45, 612 - 54, 45)
        self.drawString(54, 32, "DOCUMENTO TÉCNICO INSTITUCIONAL — CUMPLIMIENTO LGPDPPSO (MÉXICO)")
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(612 - 54, 32, page_text)
        self.restoreState()


def create_manual(output_filename):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Paleta de colores institucional
    c_primary = colors.HexColor("#1E3A8A")    # Azul institucional oscuro
    c_conalep = colors.HexColor("#065F46")    # Verde CONALEP
    c_dark = colors.HexColor("#1F2937")       # Texto principal
    c_code_bg = colors.HexColor("#0F172A")    # Fondo de consola oscuro
    c_code_txt = colors.HexColor("#38BDF8")   # Texto de código cian
    c_alert_bg = colors.HexColor("#FEF3C7")   # Alerta fondo amarillo
    c_danger_bg = colors.HexColor("#FEE2E2")  # Alerta peligro
    c_table_hdr = colors.HexColor("#1E3A8A")

    # Estilos tipográficos
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=1, # Centro
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_conalep,
        alignment=1,
        spaceAfter=25
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_conalep,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_dark,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'Body_Bold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    cmd_style = ParagraphStyle(
        'Code_Cmd',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#F8FAFC"),
        spaceBefore=2,
        spaceAfter=2
    )

    alert_text = ParagraphStyle(
        'Alert_Text',
        parent=body_style,
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#92400E")
    )

    danger_text = ParagraphStyle(
        'Danger_Text',
        parent=body_style,
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#991B1B")
    )

    story = []

    def code_box(code_str):
        p = Paragraph(code_str.replace("\n", "<br/>").replace(" ", "&nbsp;"), cmd_style)
        t = Table([[p]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_code_bg),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#334155")),
        ]))
        return t

    def alert_box(title, text):
        content = [
            Paragraph(f"<b>{title}</b>", ParagraphStyle('ABH', parent=alert_text, fontName='Helvetica-Bold')),
            Spacer(1, 2),
            Paragraph(text, alert_text)
        ]
        t = Table([[content]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_alert_bg),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    def danger_box(title, text):
        content = [
            Paragraph(f"<b>{title}</b>", ParagraphStyle('DBH', parent=danger_text, fontName='Helvetica-Bold')),
            Spacer(1, 2),
            Paragraph(text, danger_text)
        ]
        t = Table([[content]], colWidths=[504])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_danger_bg),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#EF4444")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        return t

    # ---------------------------------------------------------
    # PORTADA
    # ---------------------------------------------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("COLEGIO DE EDUCACIÓN PROFESIONAL TÉCNICA DEL ESTADO DE PUEBLA", ParagraphStyle('Inst', parent=body_style, fontName='Helvetica-Bold', fontSize=11, alignment=1, textColor=c_conalep)))
    story.append(Paragraph("PLANTEL PUEBLA I «PROFESOR JOSÉ MARÍA MORELOS Y PAVÓN»", ParagraphStyle('SubInst', parent=body_style, fontName='Helvetica', fontSize=10, alignment=1, textColor=c_dark)))
    story.append(Spacer(1, 25))

    story.append(Paragraph("SISTEMA DE SEGUIMIENTO CONDUCTUAL (SSC)", title_style))
    story.append(Paragraph("MANUAL MAESTRO DE INSTALACIÓN EN SERVIDOR FÍSICO LOCAL, AUDITORÍA DE FUGAS Y DESPLIEGUE DE IA ON-PREMISE", subtitle_style))
    
    # Línea decorativa
    story.append(HRFlowable(width="100%", thickness=3, color=c_primary, spaceBefore=5, spaceAfter=25))

    # Ficha técnica de portada
    meta_data = [
        [Paragraph("<b>Versión del Documento:</b>", body_style), Paragraph("3.0.0 (Producción Limpia - Piloto Institucional)", body_style)],
        [Paragraph("<b>Marco Normativo:</b>", body_style), Paragraph("LGPDPPSO (Ley de Protección de Datos Personales en Posesión de Sujetos Obligados)", body_style)],
        [Paragraph("<b>Infraestructura Destino:</b>", body_style), Paragraph("Servidor Físico On-Premise (Linux Ubuntu Server 22.04/24.04 LTS)", body_style)],
        [Paragraph("<b>Base de Datos y Backend:</b>", body_style), Paragraph("PostgreSQL 15 + Supabase Self-Hosted (Kong, PostgREST, Auth, Functions, Realtime)", body_style)],
        [Paragraph("<b>Frontend Web:</b>", body_style), Paragraph("React 19 + TypeScript + Vite + Tailwind CSS + Servidor Web Nginx", body_style)],
        [Paragraph("<b>Motor de Inteligencia Artificial:</b>", body_style), Paragraph("Ollama Local On-Premise (Llama 3.2 3B / Llama 3.1 8B) o Groq API Híbrido", body_style)],
        [Paragraph("<b>Fecha de Emisión:</b>", body_style), Paragraph("Octubre 2026", body_style)],
        [Paragraph("<b>Área Responsable:</b>", body_style), Paragraph("Departamento de Informática y Servicios Escolares CONALEP Puebla I", body_style)],
    ]
    t_meta = Table(meta_data, colWidths=[160, 344])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_meta)

    story.append(Spacer(1, 35))
    story.append(alert_box(
        "DECLARACIÓN DE CUMPLIMIENTO Y CONFIDENCIALIDAD",
        "Este documento técnico describe los procedimientos de instalación y operación del sistema SSC bajo estricto cumplimiento de la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados (LGPDPPSO). Toda la información de alumnos menores de edad, actas conductuales y reportes psicopedagógicos reside de forma 100% aislada en las instalaciones físicas del plantel, sin transmisión externa no autorizada."
    ))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECCIÓN 1: AUDITORÍA Y PREVENCIÓN DE FUGAS
    # ---------------------------------------------------------
    story.append(Paragraph("1. Auditoría Técnica de Fugas y Estrategia de Blindaje", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "Durante el despliegue de un sistema informático en un servidor físico escolar para una prueba piloto, existen 6 vectores críticos de fuga (fugas de datos, espacio en disco, conexiones y puertos). A continuación se audita cada vector y se establece la contramedida implementada en el SSC:",
        body_style
    ))

    leaks_table_data = [
        [
            Paragraph("<b>Vector de Riesgo / Fuga</b>", ParagraphStyle('TH1', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
            Paragraph("<b>Consecuencia Potencial</b>", ParagraphStyle('TH2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
            Paragraph("<b>Contramedida Aplicada en SSC v3.0</b>", ParagraphStyle('TH3', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))
        ],
        [
            Paragraph("<b>1. Fuga de Datos Personales (LGPDPPSO)</b>", body_style),
            Paragraph("Sanciones legales severas del INAI si nombres, CURP o historiales de menores se envían a nubes extranjeras.", body_style),
            Paragraph("<b>Base de datos 100% limpia</b> sin datos ficticios en producción. Se ejecutó <code>init_produccion_limpia.sql</code>. Se habilitó motor IA Local <b>Ollama</b> para que las inferencias no salgan del plantel.", body_style)
        ],
        [
            Paragraph("<b>2. Fuga de Espacio en Disco (Docker Logs)</b>", body_style),
            Paragraph("Docker genera logs JSON sin límite por defecto. En 2 semanas de uso continuo, los logs llenan el disco y congelan PostgreSQL.", body_style),
            Paragraph("Configuración obligatoria de <code>/etc/docker/daemon.json</code> limitando logs a <b>máximo 50 MB y 3 archivos rotativos</b> por contenedor.", body_style)
        ],
        [
            Paragraph("<b>3. Fuga de Puertos y Bypass de Firewall UFW</b>", body_style),
            Paragraph("Docker inyecta reglas NAT en <code>iptables</code> saltándose UFW, exponiendo puertos 5432 o 8000 a la red si no se controla.", body_style),
            Paragraph("Amarre estricto de puertos a <code>127.0.0.1:8000</code> y <code>127.0.0.1:5432</code>. Solo Nginx expone 80/443 a la intranet mediante UFW.", body_style)
        ],
        [
            Paragraph("<b>4. Fuga de Conexiones de BD (Pool Exhaustion)</b>", body_style),
            Paragraph("Múltiples asesores y consultas simultáneas saturan el límite de conexiones de PostgreSQL.", body_style),
            Paragraph("Supavisor Connection Pooler activado en modo Transaccional con timeouts de inactividad de 60 segundos.", body_style)
        ],
        [
            Paragraph("<b>5. Fuga por Rechazo de Cargas Masivas (Nginx 413)</b>", body_style),
            Paragraph("La plantilla de Excel con listas completas de alumnos de 6 carreras es rechazada por Nginx con error HTTP 413.", body_style),
            Paragraph("Ajuste en bloque <code>nginx.conf</code> con <code>client_max_body_size 50M;</code> para permitir subida fluida de plantillas.", body_style)
        ],
        [
            Paragraph("<b>6. Fuga de Memoria en Respaldos (TTY Bug)</b>", body_style),
            Paragraph("El comando <code>docker exec -t</code> falla en crontab sin terminal TTY interactiva, corrompiendo respaldos.", body_style),
            Paragraph("Script de respaldo automatizado usando <code>docker exec</code> (sin -t), compresión gzip directa y purga a 14 días.", body_style)
        ]
    ]

    t_leaks = Table(leaks_table_data, colWidths=[120, 160, 224])
    t_leaks.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_table_hdr),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(t_leaks)

    story.append(Spacer(1, 12))
    story.append(Paragraph("Configuración Obligatoria del Daemon de Docker (Anti-Desbordamiento de Disco):", h2_style))
    story.append(code_box(
"""sudo nano /etc/docker/daemon.json
# Contenido a guardar:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
sudo systemctl restart docker"""
    ))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECCIÓN 2: INSTALACIÓN DEL AGENTE DE IA LOCAL (OLLAMA)
    # ---------------------------------------------------------
    story.append(Paragraph("2. Instalación y Despliegue de la IA Local (Ollama On-Premise)", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "Para garantizar <b>privacidad absoluta</b> bajo la LGPDPPSO y cero costos recurrentes por consumo de tokens de APIs externas, el SSC integra un motor de inferencia local mediante <b>Ollama</b>. El agente directivo de IA se ejecuta directamente en la CPU o GPU del servidor físico de CONALEP Puebla I.",
        body_style
    ))

    story.append(Paragraph("Paso 2.1: Instalación de Ollama en Linux Ubuntu Server", h2_style))
    story.append(code_box(
"""# 1. Instalar Ollama en el servidor con el script oficial
curl -fsSL https://ollama.com/install.sh | sh

# 2. Configurar Ollama para escuchar peticiones de la red de contenedores Docker
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
EOF

# 3. Recargar el servicio systemd
sudo systemctl daemon-reload
sudo systemctl restart ollama
sudo systemctl status ollama"""
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Paso 2.2: Descarga del Modelo Neuronal Recomendado", h2_style))
    story.append(Paragraph(
        "Seleccione el modelo adecuado según el hardware instalado en el servidor físico:",
        body_style
    ))

    ai_models_data = [
        [
            Paragraph("<b>Hardware del Servidor</b>", ParagraphStyle('MTH1', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
            Paragraph("<b>Modelo Recomendado</b>", ParagraphStyle('MTH2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
            Paragraph("<b>Comando de Descarga</b>", ParagraphStyle('MTH3', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
            Paragraph("<b>Rendimiento Estimado</b>", ParagraphStyle('MTH4', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
        ],
        [
            Paragraph("Servidor Estándar (CPU 8-16 GB RAM)", body_style),
            Paragraph("<b>Llama 3.2 (3B)</b>", body_style),
            Paragraph("<code>ollama pull llama3.2:3b</code>", body_style),
            Paragraph("Excelente velocidad (1 a 2 seg). Respuestas directas y precisas.", body_style)
        ],
        [
            Paragraph("Servidor Avanzado (GPU NVIDIA 8+ GB VRAM)", body_style),
            Paragraph("<b>Llama 3.1 (8B)</b>", body_style),
            Paragraph("<code>ollama pull llama3.1:8b</code>", body_style),
            Paragraph("Máxima profundidad de análisis y alta retención contextual.", body_style)
        ]
    ]

    t_ai = Table(ai_models_data, colWidths=[110, 100, 150, 144])
    t_ai.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_conalep),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_ai)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Paso 2.3: Vinculación con Supabase Edge Functions", h2_style))
    story.append(Paragraph(
        "En el archivo <code>supabase/docker/.env</code> (o en los secretos de Edge Functions), declare las siguientes variables:",
        body_style
    ))
    story.append(code_box(
"""# Dirección de Ollama visible desde los contenedores Docker
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:3b

# Si desea usar IA Local exclusivamente, puede dejar GROQ_API_KEY vacío:
GROQ_API_KEY=""

# Reiniciar edge-functions para cargar la configuración
docker compose restart edge-functions"""
    ))

    story.append(Spacer(1, 6))
    story.append(alert_box(
        "CERO BYTES SALIENDO DEL PLANTEL",
        "Con esta arquitectura, cuando un directivo u orientador consulta al Agente IA en la pantalla del sistema, la petición viaja de la pantalla a Nginx -> Kong -> Edge Function -> Ollama -> Base de Datos. <b>Ningún dato escolar sale jamás a internet</b>, cumpliendo al 100% las normativas mexicanas de protección a menores."
    ))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECCIÓN 3: CICLO DE VIDA DE ACTUALIZACIONES (PUSH A GITHUB)
    # ---------------------------------------------------------
    story.append(Paragraph("3. Ciclo de Vida: ¿Qué pasa cuando hacemos Push a GitHub?", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("Respuesta Clara y Fundamento Técnico:", h2_style))
    story.append(Paragraph(
        "Cuando el equipo de desarrollo realiza un <code>git push</code> al repositorio en GitHub (por ejemplo a la rama <code>main</code> o <code>frontend-alex</code>), el servidor físico instalado en CONALEP <b>NO se actualiza de manera mágica ni automática al instante</b>. La razón técnica es de seguridad perimetral:",
        body_style
    ))
    story.append(Paragraph("• El servidor físico se encuentra dentro de la red privada local (LAN/Intranet) de CONALEP Puebla I, protegido detrás de un módem/firewall con NAT.", bullet_style))
    story.append(Paragraph("• GitHub no tiene una IP pública ni permisos para acceder 'hacia adentro' del servidor escolar para empujar cambios.", bullet_style))
    story.append(Paragraph("• Por tanto, el servidor de CONALEP es quien debe realizar una operación de <b>Pull (extracción)</b> hacia GitHub cuando se autorice una actualización.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Actualización del Servidor en 1 Solo Comando:", h2_style))
    story.append(Paragraph(
        "Para que el administrador de TI de CONALEP o el desarrollador pueda actualizar todo el sistema en producción en menos de 60 segundos sin errores, se ha provisto el script automatizado <code>scripts/actualizar_ssc.sh</code>:",
        body_style
    ))
    story.append(code_box(
"""# Ejecutar actualización automática desde la terminal del servidor:
cd /opt/ssc
sudo ./scripts/actualizar_ssc.sh frontend-alex"""
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("¿Qué ejecuta este script internamente de forma automática?", h2_style))

    workflow_steps = [
        [Paragraph("<b>Paso</b>", ParagraphStyle('W1', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Acción Ejecutada</b>", ParagraphStyle('W2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Impacto / Resultado</b>", ParagraphStyle('W3', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))],
        [Paragraph("<b>1. Git Sync</b>", body_style), Paragraph("<code>git fetch && git pull origin [rama]</code>", body_style), Paragraph("Descarga los commits confirmados en GitHub. Preserva archivos locales mediante stash de seguridad.", body_style)],
        [Paragraph("<b>2. Frontend Build</b>", body_style), Paragraph("<code>pnpm install && pnpm run build</code>", body_style), Paragraph("Compila el bundle optimizado de React 19 + Vite en la carpeta <code>dist/</code>.", body_style)],
        [Paragraph("<b>3. Nginx Deploy</b>", body_style), Paragraph("<code>cp -r dist/* /var/www/ssc/</code>", body_style), Paragraph("Reemplaza los archivos estáticos en producción y asigna permisos a <code>www-data</code>.", body_style)],
        [Paragraph("<b>4. Edge Functions</b>", body_style), Paragraph("<code>docker compose restart edge-functions</code>", body_style), Paragraph("Recarga los cambios de lógica en Deno (como el agente IA o registro de usuarios).", body_style)],
        [Paragraph("<b>5. Nginx Reload</b>", body_style), Paragraph("<code>nginx -t && systemctl reload nginx</code>", body_style), Paragraph("Aplica la nueva versión en milisegundos con <b>cero segundos de inactividad</b> para los usuarios.", body_style)]
    ]
    t_wf = Table(workflow_steps, colWidths=[80, 200, 224])
    t_wf.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_wf)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Automatización Opcional Nocturna (Cron):", h2_style))
    story.append(Paragraph(
        "Si el plantel desea que el servidor consulte automáticamente actualizaciones cada madrugada a las 03:00 AM, basta programar un trabajo en el crontab del sistema:",
        body_style
    ))
    story.append(code_box(
"""# Abrir crontab de root
sudo crontab -e

# Agregar línea para actualización nocturna automática a las 3:00 AM:
0 3 * * * /opt/ssc/scripts/actualizar_ssc.sh frontend-alex >> /var/log/ssc_update.log 2>&1"""
    ))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECCIÓN 4: INSTALACIÓN EXHAUSTIVA PASO A PASO EN UBUNTU
    # ---------------------------------------------------------
    story.append(Paragraph("4. Manual de Instalación Paso a Paso en Linux Ubuntu Server", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("Requisitos de Hardware Recomendados:", h2_style))
    story.append(Paragraph("• <b>Procesador:</b> Intel Core i5 / i7 / Xeon o AMD Ryzen (mínimo 4 núcleos, 8 recomendado).", bullet_style))
    story.append(Paragraph("• <b>Memoria RAM:</b> 16 GB DDR4 (mínimo 8 GB si se usa Ollama Llama 3.2 3B).", bullet_style))
    story.append(Paragraph("• <b>Almacenamiento:</b> 256 GB SSD NVMe / SATA (mínimo 100 GB libres).", bullet_style))
    story.append(Paragraph("• <b>Sistema Operativo:</b> Ubuntu Server 22.04 LTS o 24.04 LTS (64-bit).", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Paso 4.1: Actualización del Sistema Operativo y Paquetes Base", h2_style))
    story.append(code_box(
"""sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw nginx jq unzip ca-certificates gnupg lsb-release"""
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Paso 4.2: Instalación Oficial de Docker Engine y Docker Compose", h2_style))
    story.append(code_box(
"""# Configurar repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER"""
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Paso 4.3: Instalación de Node.js 22 LTS y Gestor pnpm", h2_style))
    story.append(code_box(
"""# Instalar Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm globalmente
sudo npm install -g pnpm@latest"""
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Paso 4.4: Clonación del Repositorio del SSC", h2_style))
    story.append(code_box(
"""sudo mkdir -p /opt/ssc
sudo chown -R $USER:$USER /opt/ssc
cd /opt/ssc

# Clonar repositorio
git clone -b frontend-alex https://github.com/vstlaboon/SSC.git .
chmod +x scripts/*.sh"""
    ))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Paso 4.5: Configuración de Supabase On-Premise y Docker Compose", h2_style))
    story.append(code_box(
"""cd /opt/ssc/supabase/docker
cp .env.example .env

# Generar claves criptográficas seguras (JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY)
# Asegurar que en .env los puertos de BD y Kong tengan amarre seguro:
# KONG_HTTP_PORT=127.0.0.1:8000
# POSTGRES_PORT=127.0.0.1:5432

# Iniciar la plataforma de Supabase en segundo plano:
docker compose up -d"""
    ))

    story.append(Spacer(1, 8))

    # ---------------------------------------------------------
    # SECCIÓN 4 (CONTINUACIÓN): BD LIMPIA Y DESPLIEGUE
    # ---------------------------------------------------------
    story.append(Paragraph("Paso 4.6: Carga de Base de Datos Limpia (init_produccion_limpia.sql)", h2_style))
    story.append(Paragraph(
        "Para dar cumplimiento estricto a la LGPDPPSO y dejar el sistema listo para el personal de CONALEP, se debe inyectar el script DDL maestro limpio. Este script crea las 24 tablas institucionales en orden estricto de llaves foráneas, habilita políticas RLS, catálogos escolares y la cuenta del Administrador:",
        body_style
    ))
    story.append(code_box(
"""# Ejecutar DDL maestro limpio en PostgreSQL:
docker exec -i supabase-db psql -U postgres -d postgres < /opt/ssc/supabase/init_produccion_limpia.sql

# Verificar que las 24 tablas fueron creadas exitosamente:
docker exec -i supabase-db psql -U postgres -d postgres -c "
SELECT count(*) AS total_tablas FROM information_schema.tables WHERE table_schema = 'public';
"
# (Debe retornar 24 tablas)"""
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Credenciales Iniciales de Administración Institucional:", h2_style))
    cred_data = [
        [Paragraph("<b>Parámetro</b>", ParagraphStyle('CP1', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Valor Inicial por Defecto</b>", ParagraphStyle('CP2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Acción Obligatoria en Primer Acceso</b>", ParagraphStyle('CP3', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))],
        [Paragraph("<b>Usuario Administrador:</b>", body_style), Paragraph("<code>admin@conalep.edu.mx</code>", body_style), Paragraph("Acceder al sistema e iniciar sesión", body_style)],
        [Paragraph("<b>Contraseña Inicial:</b>", body_style), Paragraph("<code>AdminConalep.2026!</code>", body_style), Paragraph("Cambiar inmediatamente en el perfil por una contraseña secreta", body_style)],
        [Paragraph("<b>Rol Asignado:</b>", body_style), Paragraph("<code>admin</code> (Superadministrador)", body_style), Paragraph("Acceso a alta de usuarios, catálogos y auditoría", body_style)]
    ]
    t_cred = Table(cred_data, colWidths=[130, 160, 214])
    t_cred.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_conalep),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_cred)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Paso 4.7: Compilación del Frontend y Configuración de Nginx", h2_style))
    story.append(code_box(
"""cd /opt/ssc/frontend
pnpm install
pnpm run build

sudo mkdir -p /var/www/ssc
sudo cp -r dist/* /var/www/ssc/
sudo chown -R www-data:www-data /var/www/ssc
sudo chmod -R 755 /var/www/ssc"""
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Paso 4.8: Configuración del Bloque de Servidor Nginx (/etc/nginx/sites-available/ssc)", h2_style))
    story.append(code_box(
"""server {
    listen 80;
    server_name 192.168.1.100 ssc.conalep.edu.mx; # Ajustar a la IP fija del servidor

    root /var/www/ssc;
    index index.html;
    client_max_body_size 50M; # Permite cargas de Excel sin error 413

    # Frontend SPA React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy hacia API Gateway Kong de Supabase
    location ~ ^/(rest|auth|storage|functions|realtime)/v1/(.*) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}"""
    ))

    story.append(Spacer(1, 6))
    story.append(Paragraph("Paso 4.9: Activación de Nginx y Reglas de Firewall UFW", h2_style))
    story.append(code_box(
"""sudo ln -s /etc/nginx/sites-available/ssc /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Configuración perimetral de Firewall UFW:
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH Administracion'
sudo ufw allow 80/tcp comment 'HTTP Intranet Escolar'
sudo ufw allow 443/tcp comment 'HTTPS Seguro'
sudo ufw enable
sudo ufw status verbose"""
    ))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECCIÓN 5: GESTIÓN DE USUARIOS POR EL ADMINISTRADOR
    # ---------------------------------------------------------
    story.append(Paragraph("5. Procedimiento de Alta de Personal por el Administrador", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "Para que la institución no dependa de desarrolladores externos, el módulo de <b>Gestión de Usuarios</b> permite al Administrador dar de alta y controlar los accesos de todo el personal del plantel mediante la interfaz gráfica del sistema:",
        body_style
    ))

    story.append(Paragraph("Paso a Paso en la Interfaz Web (/directivos/usuarios):", h2_style))
    story.append(Paragraph("<b>1. Acceso:</b> Iniciar sesión con <code>admin@conalep.edu.mx</code> y navegar a la sección <i>Gestión de Usuarios</i> en el menú lateral.", bullet_style))
    story.append(Paragraph("<b>2. Nuevo Usuario:</b> Hacer clic en el botón azul <b>«+ Nuevo Usuario»</b>.", bullet_style))
    story.append(Paragraph("<b>3. Datos Requeridos:</b> Llenar Nombre Completo, Correo Institucional (ej. <code>profesor@conalep.edu.mx</code>) y Rol correspondiente.", bullet_style))
    story.append(Paragraph("<b>4. Contraseña Inicial Directa (Soporte Offline):</b> En servidores de intranet sin servidor de correo SMTP saliente configurado, el Administrador puede ingresar directamente una <i>Contraseña Inicial</i> para el usuario en el modal. El sistema crea la cuenta activa al instante sin necesidad de correo de confirmación.", bullet_style))
    story.append(Paragraph("<b>5. Asignación de Permisos:</b> Asignar carrera (Electromecánica Industrial, Informática, Mantenimiento Automotriz, etc.) o rol transversal según el organigrama escolar.", bullet_style))

    story.append(Spacer(1, 8))
    roles_table_data = [
        [Paragraph("<b>Rol del Sistema</b>", ParagraphStyle('R1', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Alcance de Permisos</b>", ParagraphStyle('R2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Acceso a IA / Alumnos</b>", ParagraphStyle('R3', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))],
        [Paragraph("<b>admin</b>", body_style), Paragraph("Control total del sistema, gestión de usuarios, auditoría, catálogos.", body_style), Paragraph("Acceso completo administrativo.", body_style)],
        [Paragraph("<b>directivo</b>", body_style), Paragraph("Visualización de KPIs de retención, deserción, semáforos de riesgo y actas.", body_style), Paragraph("Acceso completo al Agente IA Directivo.", body_style)],
        [Paragraph("<b>orientador</b>", body_style), Paragraph("Gestión de citatorios, actas de compromiso, canalizaciones psicopedagógicas.", body_style), Paragraph("Acceso a expedientes e IA orientadora.", body_style)],
        [Paragraph("<b>docente / asesor</b>", body_style), Paragraph("Registro de faltas, incidentes en aula y notas de observación conductual.", body_style), Paragraph("Acceso limitado a sus grupos asignados.", body_style)]
    ]
    t_roles = Table(roles_table_data, colWidths=[100, 240, 164])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_roles)

    story.append(Spacer(1, 14))
    # ---------------------------------------------------------
    # SECCIÓN 6: RESPALDOS AUTOMÁTICOS
    # ---------------------------------------------------------
    story.append(Paragraph("6. Política y Script de Respaldo Diario Automatizado", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "Para prevenir pérdida de información ante fallas eléctricas en el plantel, se establece un script de respaldo diario sin interacción TTY:",
        body_style
    ))
    story.append(code_box(
"""# Crear script de respaldo
sudo nano /opt/ssc/scripts/backup_diario.sh

# Contenido del script:
#!/usr/bin/env bash
FECHA=$(date +'%Y%m%d_%H%M%S')
DESTINO="/var/backups/ssc"
mkdir -p "$DESTINO"
docker exec supabase-db pg_dump -U postgres postgres | gzip > "$DESTINO/ssc_backup_$FECHA.sql.gz"
find "$DESTINO" -type f -name "ssc_backup_*.sql.gz" -mtime +14 -delete

# Dar permisos y programar en cron a las 02:00 AM:
sudo chmod +x /opt/ssc/scripts/backup_diario.sh
# Agregar a crontab:
# 0 2 * * * /opt/ssc/scripts/backup_diario.sh"""
    ))

    story.append(PageBreak())

    # ---------------------------------------------------------
    # SECCIÓN 7: CHECKLIST Y ACTA DE ENTREGA
    # ---------------------------------------------------------
    story.append(Paragraph("7. Lista de Verificación (Go-Live Checklist) y Acta de Entrega", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=c_primary, spaceBefore=2, spaceAfter=8))
    story.append(Paragraph(
        "Antes de declarar el sistema en operación oficial ante las autoridades de CONALEP Puebla I, verifique que cada uno de los siguientes puntos ha sido validado:",
        body_style
    ))

    chk_data = [
        [Paragraph("<b>Elemento a Validar</b>", ParagraphStyle('CK1', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Criterio de Aceptación</b>", ParagraphStyle('CK2', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white)),
         Paragraph("<b>Estado</b>", ParagraphStyle('CK3', parent=body_style, fontName='Helvetica-Bold', textColor=colors.white))],
        [Paragraph("Cumplimiento LGPDPPSO", body_style), Paragraph("Base de datos limpia sin alumnos ficticios. Aislamiento físico en plantel.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Rotación de Logs de Docker", body_style), Paragraph("<code>/etc/docker/daemon.json</code> con max-size: 50m activo.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Firewall UFW y Puertos", body_style), Paragraph("Puertos 5432 y 8000 en 127.0.0.1. Solo 80/443 expuestos a la LAN.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Motor IA Local (Ollama)", body_style), Paragraph("Ollama corriendo en el servidor con modelo <code>llama3.2:3b</code> descargado.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Acceso de Administrador", body_style), Paragraph("Inicio de sesión exitoso con <code>admin@conalep.edu.mx</code>.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Alta de Usuarios", body_style), Paragraph("Prueba de alta de un docente con contraseña inicial exitosa.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Respaldo Automatizado", body_style), Paragraph("Script de respaldo generado y programado en crontab.", body_style), Paragraph("[  ] APROBADO", body_bold)],
        [Paragraph("Script de Actualización", body_style), Paragraph("<code>actualizar_ssc.sh</code> listo con permisos de ejecución.", body_style), Paragraph("[  ] APROBADO", body_bold)],
    ]
    t_chk = Table(chk_data, colWidths=[150, 260, 94])
    t_chk.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_conalep),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('ALIGN', (2,0), (2,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_chk)

    story.append(Spacer(1, 40))
    story.append(Paragraph("ACTA FORMAL DE ENTREGA Y RECEPCIÓN TÉCNICA", ParagraphStyle('ActaTitle', parent=body_style, fontName='Helvetica-Bold', fontSize=11, alignment=1, textColor=c_primary)))
    story.append(Spacer(1, 25))

    sig_data = [
        [
            Paragraph("____________________________________________<br/><b>Ing. Responsable de Desarrollo SSC</b><br/>Implementación y Despliegue de Software", ParagraphStyle('S1', parent=body_style, alignment=1)),
            Paragraph("____________________________________________<br/><b>Responsable de Informática / Dirección</b><br/>CONALEP Plantel Puebla I", ParagraphStyle('S2', parent=body_style, alignment=1))
        ]
    ]
    t_sig = Table(sig_data, colWidths=[252, 252])
    t_sig.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_sig)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF generado con exito: {output_filename}")

if __name__ == "__main__":
    out_path = os.path.join(os.path.dirname(__file__), "..", "Manual_Instalacion_Fisica_CONALEP_Puebla_I.pdf")
    out_path = os.path.abspath(out_path)
    create_manual(out_path)
