import os
import json
import zipfile
import hashlib

def get_asset_hash(content: bytes):
    m = hashlib.md5()
    m.update(content)
    asset_id = m.hexdigest()
    return asset_id, f"{asset_id}.svg"

# ==========================================
# RECURSOS GRAFICOS VECTORIALES (SVG)
# ==========================================

SVG_FONDO_UTP = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <defs>
    <linearGradient id="wall_utp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
    <linearGradient id="utp_banner" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#005a36"/>
      <stop offset="50%" stop-color="#007a48"/>
      <stop offset="100%" stop-color="#005a36"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <!-- Muro de fondo institucional -->
  <rect width="480" height="280" fill="url(#wall_utp)"/>
  <rect y="280" width="480" height="80" fill="url(#floor)"/>
  <line x1="0" y1="280" x2="480" y2="280" stroke="#007a48" stroke-width="3"/>
  
  <!-- Franja superior UTP -->
  <rect width="480" height="45" fill="url(#utp_banner)"/>
  <line x1="0" y1="45" x2="480" y2="45" stroke="#22c55e" stroke-width="2"/>
  
  <!-- Logotipo y membrete UTP -->
  <circle cx="28" cy="22" r="14" fill="#ffffff"/>
  <text x="28" y="27" font-family="sans-serif" font-size="11" font-weight="900" fill="#005a36" text-anchor="middle">UTP</text>
  <text x="52" y="20" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff">UNIVERSIDAD TECNOLOGICA DE PUEBLA</text>
  <text x="52" y="34" font-family="sans-serif" font-size="9" font-weight="bold" fill="#86efac">CONTROL BIOMETRICO DOCENTE Y NOMINA INTELIGENTE</text>
  
  <!-- Reloj de pared institucional checador -->
  <rect x="360" y="55" width="105" height="32" rx="4" fill="#020617" stroke="#007a48" stroke-width="1.5"/>
  <text x="412" y="76" font-family="monospace" font-size="14" font-weight="bold" fill="#22c55e" text-anchor="middle">08:00:00 AM</text>
  
  <!-- Silueta de pedestal del lector biometrico en lobby -->
  <path d="M 60 280 L 75 140 L 165 140 L 180 280 Z" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <rect x="70" y="130" width="100" height="15" rx="3" fill="#007a48"/>
  <text x="120" y="141" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">TERMINAL BIOMETRICA</text>
  
  <!-- Leyenda informativa inferior -->
  <text x="240" y="340" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">Modulo de Acceso y Compensaciones - Edificio de Docencia UTP</text>
</svg>"""

# Funcion generadora de huellas dactilares esteticas
def build_fingerprint_svg(prof_id, nombre_docente, depto, color_hex, ridges_path, is_alert=False):
    alert_tag = ""
    if is_alert:
        alert_tag = """
        <circle cx="120" cy="115" r="45" fill="none" stroke="#ef4444" stroke-width="4" stroke-dasharray="8 4"/>
        <line x1="85" y1="80" x2="155" y2="150" stroke="#ef4444" stroke-width="6"/>
        <line x1="155" y1="80" x2="85" y2="150" stroke="#ef4444" stroke-width="6"/>
        """
    
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 230" width="240" height="230">
  <defs>
    <radialGradient id="sensor_glow_{prof_id}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="{color_hex}" stop-opacity="0.35"/>
      <stop offset="70%" stop-color="#0f172a" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
  </defs>
  <!-- Cristal del escaner biometrico -->
  <rect x="15" y="10" width="210" height="210" rx="20" fill="#090d16" stroke="#1e293b" stroke-width="3"/>
  <circle cx="120" cy="115" r="75" fill="url(#sensor_glow_{prof_id})" stroke="{color_hex}" stroke-width="2"/>
  <circle cx="120" cy="115" r="85" fill="none" stroke="{color_hex}" stroke-width="1" stroke-dasharray="4 6" opacity="0.6"/>
  
  <!-- Lineas de escaneo biometrico -->
  <line x1="35" y1="115" x2="205" y2="115" stroke="{color_hex}" stroke-width="1" opacity="0.4"/>
  
  <!-- Patrones de crestas papilares de la huella -->
  <g fill="none" stroke="{color_hex}" stroke-linecap="round" stroke-linejoin="round">
    {ridges_path}
  </g>
  
  {alert_tag}
  
  <!-- Placa identificadora del docente -->
  <rect x="25" y="195" width="190" height="20" rx="5" fill="#005a36" opacity="0.95"/>
  <text x="120" y="209" font-family="sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">{nombre_docente}</text>
</svg>"""

# Patrones diferenciados de huellas dactilares
RIDGES_JUAN = """
    <!-- Whorl / Espiral central -->
    <path d="M 120 75 C 100 75, 85 95, 85 115 C 85 140, 100 155, 120 155 C 145 155, 155 135, 155 115 C 155 90, 135 75, 120 75" stroke-width="3"/>
    <path d="M 120 85 C 108 85, 95 98, 95 115 C 95 130, 108 145, 120 145 C 135 145, 145 130, 145 115 C 145 100, 132 85, 120 85" stroke-width="3"/>
    <path d="M 120 95 C 112 95, 105 105, 105 115 C 105 125, 112 135, 120 135 C 128 135, 135 125, 135 115" stroke-width="2.5"/>
    <circle cx="120" cy="115" r="4" fill="#10b981"/>
    <!-- Crestas externas -->
    <path d="M 75 115 C 75 75, 100 60, 120 60 C 145 60, 165 75, 165 115 C 165 145, 150 168, 120 168" stroke-width="3"/>
    <path d="M 65 120 C 65 65, 95 48, 120 48 C 152 48, 175 68, 175 120" stroke-width="2.5"/>
"""

RIDGES_MARIA = """
    <!-- Left Loop / Presilla Izquierda -->
    <path d="M 145 160 C 145 120, 135 85, 115 85 C 98 85, 95 105, 95 135 L 95 165" stroke-width="3"/>
    <path d="M 155 160 C 155 110, 142 75, 115 75 C 88 75, 85 100, 85 135 L 85 170" stroke-width="3"/>
    <path d="M 135 160 C 135 125, 128 95, 115 95 C 105 95, 105 110, 105 135 L 105 160" stroke-width="2.5"/>
    <path d="M 165 160 C 165 100, 150 62, 115 62 C 78 62, 75 95, 75 135 L 75 172" stroke-width="2.5"/>
    <!-- Delta a la derecha -->
    <path d="M 150 140 L 175 160" stroke-width="3"/>
    <path d="M 150 140 L 175 125" stroke-width="2.5"/>
"""

RIDGES_CARLOS = """
    <!-- Right Loop / Presilla Derecha -->
    <path d="M 95 160 C 95 120, 105 85, 125 85 C 142 85, 145 105, 145 135 L 145 165" stroke-width="3"/>
    <path d="M 85 160 C 85 110, 98 75, 125 75 C 152 75, 155 100, 155 135 L 155 170" stroke-width="3"/>
    <path d="M 105 160 C 105 125, 112 95, 125 95 C 135 95, 135 110, 135 135 L 135 160" stroke-width="2.5"/>
    <path d="M 75 160 C 75 100, 90 62, 125 62 C 162 62, 165 95, 165 135 L 165 172" stroke-width="2.5"/>
    <!-- Delta a la izquierda -->
    <path d="M 90 140 L 65 160" stroke-width="3"/>
    <path d="M 90 140 L 65 125" stroke-width="2.5"/>
"""

RIDGES_ANA = """
    <!-- Arch / Arco tipo carpa -->
    <path d="M 70 160 C 70 120, 95 85, 120 75 C 145 85, 170 120, 170 160" stroke-width="3"/>
    <path d="M 78 160 C 78 128, 98 95, 120 88 C 142 95, 162 128, 162 160" stroke-width="3"/>
    <path d="M 88 160 C 88 135, 102 108, 120 102 C 138 108, 152 135, 152 160" stroke-width="2.5"/>
    <path d="M 98 160 C 98 142, 108 120, 120 118 C 132 120, 142 142, 142 160" stroke-width="2.5"/>
    <line x1="120" y1="118" x2="120" y2="160" stroke-width="3"/>
"""

RIDGES_DESCONOCIDO = """
    <!-- Huella borrosa / danada / sin autorizacion -->
    <path d="M 85 90 C 100 85, 135 88, 150 95" stroke-width="3" stroke-dasharray="6 8"/>
    <path d="M 80 115 C 95 110, 110 112, 125 125" stroke-width="3"/>
    <path d="M 130 135 C 145 140, 160 138, 170 145" stroke-width="2.5" stroke-dasharray="4 6"/>
    <circle cx="100" cy="140" r="15" fill="#64748b" opacity="0.4"/>
"""

SVG_HUELLA_JUAN = build_fingerprint_svg("juan", "Muestra 1: Prof. Juan Perez", "Sistemas", "#10b981", RIDGES_JUAN)
SVG_HUELLA_MARIA = build_fingerprint_svg("maria", "Muestra 2: Prof. Maria Lopez", "Mecatronica", "#06b6d4", RIDGES_MARIA)
SVG_HUELLA_CARLOS = build_fingerprint_svg("carlos", "Muestra 3: Prof. Carlos Rodriguez", "Industrial", "#f59e0b", RIDGES_CARLOS)
SVG_HUELLA_ANA = build_fingerprint_svg("ana", "Muestra 4: Prof. Ana Hernandez", "Negocios", "#a855f7", RIDGES_ANA)
SVG_HUELLA_DESCONOCIDO = build_fingerprint_svg("desc", "Muestra 5: Huella No Registrada", "Desconocido", "#ef4444", RIDGES_DESCONOCIDO, is_alert=True)

# ==========================================
# CONSTRUCCION DE LA ESTRUCTURA DEL PROYECTO (.sb3)
# ==========================================

def create_utp_sb3():
    assets = {
        "fondo": SVG_FONDO_UTP.encode("utf-8"),
        "juan": SVG_HUELLA_JUAN.encode("utf-8"),
        "maria": SVG_HUELLA_MARIA.encode("utf-8"),
        "carlos": SVG_HUELLA_CARLOS.encode("utf-8"),
        "ana": SVG_HUELLA_ANA.encode("utf-8"),
        "desc": SVG_HUELLA_DESCONOCIDO.encode("utf-8"),
    }

    asset_ids = {}
    for key, data in assets.items():
        aid, md5ext = get_asset_hash(data)
        asset_ids[key] = (aid, md5ext)

    project_json = {
        "targets": [
            {
                "isStage": True,
                "name": "Stage",
                "variables": {
                    "v_profesor": ["profesor_identificado", "Sin registro"],
                    "v_depto": ["departamento_docente", "--"],
                    "v_horario": ["horario_oficial", "--"],
                    "v_checada": ["hora_checada", "--"],
                    "v_retraso": ["minutos_retraso", 0],
                    "v_tolerancia": ["tolerancia_minutos", 10],
                    "v_estatus": ["estatus_asistencia", "Esperando huella"],
                    "v_sueldo_base": ["sueldo_base", 0],
                    "v_descuento": ["descuento_aplicado", 0],
                    "v_sueldo_neto": ["sueldo_neto", 0],
                    "v_total_checadas": ["total_checadas", 0]
                },
                "lists": {
                    "l_historial": ["historial_asistencia", []]
                },
                "broadcasts": {
                    "bc_escanear": "escanear_huella",
                    "bc_calcular": "calcular_remuneracion",
                    "bc_registrar": "guardar_en_historial"
                },
                "customs": [],
                "currentCostume": 0,
                "costumes": [
                    {
                        "name": "Lobby_UTP",
                        "dataFormat": "svg",
                        "assetId": asset_ids["fondo"][0],
                        "md5ext": asset_ids["fondo"][1],
                        "rotationCenterX": 240,
                        "rotationCenterY": 180
                    }
                ],
                "sounds": [],
                "volume": 100,
                "layerOrder": 0,
                "blocks": {}
            },
            {
                "isStage": False,
                "name": "LectorBiometrico",
                "variables": {},
                "lists": {},
                "broadcasts": {},
                "customs": [],
                "currentCostume": 0,
                "costumes": [
                    {
                        "name": "PROF_JUAN_PEREZ",
                        "dataFormat": "svg",
                        "assetId": asset_ids["juan"][0],
                        "md5ext": asset_ids["juan"][1],
                        "rotationCenterX": 120,
                        "rotationCenterY": 115
                    },
                    {
                        "name": "PROF_MARIA_LOPEZ",
                        "dataFormat": "svg",
                        "assetId": asset_ids["maria"][0],
                        "md5ext": asset_ids["maria"][1],
                        "rotationCenterX": 120,
                        "rotationCenterY": 115
                    },
                    {
                        "name": "PROF_CARLOS_RODRIGUEZ",
                        "dataFormat": "svg",
                        "assetId": asset_ids["carlos"][0],
                        "md5ext": asset_ids["carlos"][1],
                        "rotationCenterX": 120,
                        "rotationCenterY": 115
                    },
                    {
                        "name": "PROF_ANA_HERNANDEZ",
                        "dataFormat": "svg",
                        "assetId": asset_ids["ana"][0],
                        "md5ext": asset_ids["ana"][1],
                        "rotationCenterX": 120,
                        "rotationCenterY": 115
                    },
                    {
                        "name": "HUELLA_NO_RECONOCIDA",
                        "dataFormat": "svg",
                        "assetId": asset_ids["desc"][0],
                        "md5ext": asset_ids["desc"][1],
                        "rotationCenterX": 120,
                        "rotationCenterY": 115
                    }
                ],
                "sounds": [],
                "volume": 100,
                "visible": True,
                "x": -115,
                "y": 15,
                "size": 85,
                "direction": 90,
                "draggable": False,
                "rotationStyle": "all around",
                "layerOrder": 1,
                "blocks": {
                    # ── Script 1: Bandera Verde (Inicializacion del Sistema UTP) ──
                    "b_flag": {
                        "opcode": "event_whenflagclicked",
                        "next": "b_init_tol",
                        "parent": None,
                        "inputs": {},
                        "fields": {},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 30
                    },
                    "b_init_tol": {
                        "opcode": "data_setvariableto",
                        "next": "b_init_total",
                        "parent": "b_flag",
                        "inputs": {"VALUE": [1, [10, "10"]]},
                        "fields": {"VARIABLE": ["tolerancia_minutos", "v_tolerancia"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_init_total": {
                        "opcode": "data_setvariableto",
                        "next": "b_init_status",
                        "parent": "b_init_tol",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["total_checadas", "v_total_checadas"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_init_status": {
                        "opcode": "data_setvariableto",
                        "next": "b_init_costume",
                        "parent": "b_init_total",
                        "inputs": {"VALUE": [1, [10, "Coloque su huella en el sensor"]]},
                        "fields": {"VARIABLE": ["estatus_asistencia", "v_estatus"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_init_costume": {
                        "opcode": "looks_switchcostumeto",
                        "next": "b_say_welcome",
                        "parent": "b_init_status",
                        "inputs": {"COSTUME": [1, "b_menu_c1"]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_menu_c1": {
                        "opcode": "looks_costume",
                        "next": None,
                        "parent": "b_init_costume",
                        "inputs": {},
                        "fields": {"COSTUME": ["PROF_JUAN_PEREZ", None]},
                        "shadow": True,
                        "topLevel": False
                    },
                    "b_say_welcome": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_init_costume",
                        "inputs": {
                            "MESSAGE": [1, [10, "UTP Checador Biometrico Activo. Presiona [Espacio] para colocar huella."]],
                            "SECS": [1, [4, "4"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 2: Al presionar Tecla Espacio (Colocar huella y disparar escaneo) ──
                    "b_key_space": {
                        "opcode": "event_whenkeypressed",
                        "next": "b_next_c",
                        "parent": None,
                        "inputs": {},
                        "fields": {"KEY_OPTION": ["space", None]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 260
                    },
                    "b_next_c": {
                        "opcode": "looks_nextcostume",
                        "next": "b_set_scanning",
                        "parent": "b_key_space",
                        "inputs": {},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_scanning": {
                        "opcode": "data_setvariableto",
                        "next": "b_bc_escanear_call",
                        "parent": "b_next_c",
                        "inputs": {"VALUE": [1, [10, "Escaneando minucias biometricas..."]]},
                        "fields": {"VARIABLE": ["estatus_asistencia", "v_estatus"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_bc_escanear_call": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_set_scanning",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "escanear_huella", "bc_escanear"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 3: Al recibir escanear_huella (Inferencia con Machine Learning) ──
                    "b_recv_scan": {
                        "opcode": "event_whenbroadcastreceived",
                        "next": "b_say_reading",
                        "parent": None,
                        "inputs": {},
                        "fields": {"BROADCAST_OPTION": ["escanear_huella", "bc_escanear"]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 360,
                        "y": 30
                    },
                    "b_say_reading": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_set_prof_from_c",
                        "parent": "b_recv_scan",
                        "inputs": {
                            "MESSAGE": [1, [10, "Verificando patron papilar en base de datos UTP..."]],
                            "SECS": [1, [4, "1"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    # Aqui se toma el disfraz (en ML for Kids se sustituye por <reconocer imagen>)
                    "b_set_prof_from_c": {
                        "opcode": "data_setvariableto",
                        "next": "b_eval_prof1",
                        "parent": "b_say_reading",
                        "inputs": {
                            "VALUE": [3, "b_cname_node", [10, ""]]
                        },
                        "fields": {"VARIABLE": ["profesor_identificado", "v_profesor"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cname_node": {
                        "opcode": "looks_costumenumbername",
                        "next": None,
                        "parent": "b_set_prof_from_c",
                        "inputs": {},
                        "fields": {"NUMBER_NAME": ["name", None]},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Rama de Decision 1: PROF_JUAN_PEREZ ──
                    "b_eval_prof1": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_set_prof_from_c",
                        "inputs": {
                            "CONDITION": [2, "b_cond_juan"],
                            "SUBSTACK": [2, "b_set_depto_juan"],
                            "SUBSTACK2": [2, "b_eval_prof2"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_juan": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_eval_prof1",
                        "inputs": {
                            "OPERAND1": [3, [12, "profesor_identificado", "v_profesor"], [10, ""]],
                            "OPERAND2": [1, [10, "PROF_JUAN_PEREZ"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_depto_juan": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_h_juan",
                        "parent": "b_eval_prof1",
                        "inputs": {"VALUE": [1, [10, "Tecnologias de la Informacion"]]},
                        "fields": {"VARIABLE": ["departamento_docente", "v_depto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_h_juan": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ch_juan",
                        "parent": "b_set_depto_juan",
                        "inputs": {"VALUE": [1, [10, "07:00 AM"]]},
                        "fields": {"VARIABLE": ["horario_oficial", "v_horario"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ch_juan": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ret_juan",
                        "parent": "b_set_h_juan",
                        "inputs": {"VALUE": [1, [10, "07:08 AM"]]},
                        "fields": {"VARIABLE": ["hora_checada", "v_checada"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ret_juan": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_s_juan",
                        "parent": "b_set_ch_juan",
                        "inputs": {"VALUE": [1, [10, "8"]]},
                        "fields": {"VARIABLE": ["minutos_retraso", "v_retraso"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_s_juan": {
                        "opcode": "data_setvariableto",
                        "next": "b_call_calc_juan",
                        "parent": "b_set_ret_juan",
                        "inputs": {"VALUE": [1, [10, "12500"]]},
                        "fields": {"VARIABLE": ["sueldo_base", "v_sueldo_base"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_call_calc_juan": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_set_s_juan",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "calcular_remuneracion", "bc_calcular"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Rama de Decision 2: PROF_MARIA_LOPEZ ──
                    "b_eval_prof2": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_eval_prof1",
                        "inputs": {
                            "CONDITION": [2, "b_cond_maria"],
                            "SUBSTACK": [2, "b_set_depto_maria"],
                            "SUBSTACK2": [2, "b_eval_prof3"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_maria": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_eval_prof2",
                        "inputs": {
                            "OPERAND1": [3, [12, "profesor_identificado", "v_profesor"], [10, ""]],
                            "OPERAND2": [1, [10, "PROF_MARIA_LOPEZ"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_depto_maria": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_h_maria",
                        "parent": "b_eval_prof2",
                        "inputs": {"VALUE": [1, [10, "Mecatronica y Automatizacion"]]},
                        "fields": {"VARIABLE": ["departamento_docente", "v_depto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_h_maria": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ch_maria",
                        "parent": "b_set_depto_maria",
                        "inputs": {"VALUE": [1, [10, "08:00 AM"]]},
                        "fields": {"VARIABLE": ["horario_oficial", "v_horario"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ch_maria": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ret_maria",
                        "parent": "b_set_h_maria",
                        "inputs": {"VALUE": [1, [10, "08:25 AM"]]},
                        "fields": {"VARIABLE": ["hora_checada", "v_checada"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ret_maria": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_s_maria",
                        "parent": "b_set_ch_maria",
                        "inputs": {"VALUE": [1, [10, "25"]]},
                        "fields": {"VARIABLE": ["minutos_retraso", "v_retraso"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_s_maria": {
                        "opcode": "data_setvariableto",
                        "next": "b_call_calc_maria",
                        "parent": "b_set_ret_maria",
                        "inputs": {"VALUE": [1, [10, "14000"]]},
                        "fields": {"VARIABLE": ["sueldo_base", "v_sueldo_base"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_call_calc_maria": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_set_s_maria",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "calcular_remuneracion", "bc_calcular"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Rama de Decision 3: PROF_CARLOS_RODRIGUEZ ──
                    "b_eval_prof3": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_eval_prof2",
                        "inputs": {
                            "CONDITION": [2, "b_cond_carlos"],
                            "SUBSTACK": [2, "b_set_depto_carlos"],
                            "SUBSTACK2": [2, "b_eval_prof4"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_carlos": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_eval_prof3",
                        "inputs": {
                            "OPERAND1": [3, [12, "profesor_identificado", "v_profesor"], [10, ""]],
                            "OPERAND2": [1, [10, "PROF_CARLOS_RODRIGUEZ"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_depto_carlos": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_h_carlos",
                        "parent": "b_eval_prof3",
                        "inputs": {"VALUE": [1, [10, "Procesos Industriales"]]},
                        "fields": {"VARIABLE": ["departamento_docente", "v_depto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_h_carlos": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ch_carlos",
                        "parent": "b_set_depto_carlos",
                        "inputs": {"VALUE": [1, [10, "07:30 AM"]]},
                        "fields": {"VARIABLE": ["horario_oficial", "v_horario"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ch_carlos": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ret_carlos",
                        "parent": "b_set_h_carlos",
                        "inputs": {"VALUE": [1, [10, "07:50 AM"]]},
                        "fields": {"VARIABLE": ["hora_checada", "v_checada"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ret_carlos": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_s_carlos",
                        "parent": "b_set_ch_carlos",
                        "inputs": {"VALUE": [1, [10, "20"]]},
                        "fields": {"VARIABLE": ["minutos_retraso", "v_retraso"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_s_carlos": {
                        "opcode": "data_setvariableto",
                        "next": "b_call_calc_carlos",
                        "parent": "b_set_ret_carlos",
                        "inputs": {"VALUE": [1, [10, "11800"]]},
                        "fields": {"VARIABLE": ["sueldo_base", "v_sueldo_base"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_call_calc_carlos": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_set_s_carlos",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "calcular_remuneracion", "bc_calcular"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Rama de Decision 4: PROF_ANA_HERNANDEZ ──
                    "b_eval_prof4": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_eval_prof3",
                        "inputs": {
                            "CONDITION": [2, "b_cond_ana"],
                            "SUBSTACK": [2, "b_set_depto_ana"],
                            "SUBSTACK2": [2, "b_sub_desconocido"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_ana": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_eval_prof4",
                        "inputs": {
                            "OPERAND1": [3, [12, "profesor_identificado", "v_profesor"], [10, ""]],
                            "OPERAND2": [1, [10, "PROF_ANA_HERNANDEZ"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_depto_ana": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_h_ana",
                        "parent": "b_eval_prof4",
                        "inputs": {"VALUE": [1, [10, "Administracion y Gestion"]]},
                        "fields": {"VARIABLE": ["departamento_docente", "v_depto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_h_ana": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ch_ana",
                        "parent": "b_set_depto_ana",
                        "inputs": {"VALUE": [1, [10, "09:00 AM"]]},
                        "fields": {"VARIABLE": ["horario_oficial", "v_horario"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ch_ana": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_ret_ana",
                        "parent": "b_set_h_ana",
                        "inputs": {"VALUE": [1, [10, "08:55 AM"]]},
                        "fields": {"VARIABLE": ["hora_checada", "v_checada"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_ret_ana": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_s_ana",
                        "parent": "b_set_ch_ana",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["minutos_retraso", "v_retraso"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_s_ana": {
                        "opcode": "data_setvariableto",
                        "next": "b_call_calc_ana",
                        "parent": "b_set_ret_ana",
                        "inputs": {"VALUE": [1, [10, "13200"]]},
                        "fields": {"VARIABLE": ["sueldo_base", "v_sueldo_base"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_call_calc_ana": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_set_s_ana",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "calcular_remuneracion", "bc_calcular"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Rama de Decision 5: HUELLA NO RECONOCIDA ──
                    "b_sub_desconocido": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_depto_desc",
                        "parent": "b_eval_prof4",
                        "inputs": {"VALUE": [1, [10, "NO AUTORIZADO"]]},
                        "fields": {"VARIABLE": ["profesor_identificado", "v_profesor"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_depto_desc": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_est_denegado",
                        "parent": "b_sub_desconocido",
                        "inputs": {"VALUE": [1, [10, "Personal No Registrado"]]},
                        "fields": {"VARIABLE": ["departamento_docente", "v_depto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_est_denegado": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_desc_zero",
                        "parent": "b_set_depto_desc",
                        "inputs": {"VALUE": [1, [10, "Acceso Denegado"]]},
                        "fields": {"VARIABLE": ["estatus_asistencia", "v_estatus"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_desc_zero": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_net_zero",
                        "parent": "b_set_est_denegado",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["descuento_aplicado", "v_descuento"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_net_zero": {
                        "opcode": "data_setvariableto",
                        "next": "b_say_denegado",
                        "parent": "b_set_desc_zero",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["sueldo_neto", "v_sueldo_neto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_denegado": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_add_denied_list",
                        "parent": "b_set_net_zero",
                        "inputs": {
                            "MESSAGE": [1, [10, "ALERTA UTP: Huella dactilar desconocida. Acceso no permitido."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_add_denied_list": {
                        "opcode": "data_addtolist",
                        "next": None,
                        "parent": "b_say_denegado",
                        "inputs": {
                            "ITEM": [1, [10, "[ALERTA] Intento no autorizado detectado por el sensor biométrico"]]
                        },
                        "fields": {"LIST": ["historial_asistencia", "l_historial"]},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 4: Calculo de Retardo y Descuento en Remuneracion ──
                    "b_recv_calc": {
                        "opcode": "event_whenbroadcastreceived",
                        "next": "b_if_tol_check",
                        "parent": None,
                        "inputs": {},
                        "fields": {"BROADCAST_OPTION": ["calcular_remuneracion", "bc_calcular"]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 360,
                        "y": 920
                    },
                    "b_if_tol_check": {
                        "opcode": "control_if_else",
                        "next": "b_bc_reg_call",
                        "parent": "b_recv_calc",
                        "inputs": {
                            "CONDITION": [2, "b_cond_retraso_gt_tol"],
                            "SUBSTACK": [2, "b_calc_descuento"],
                            "SUBSTACK2": [2, "b_no_descuento"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_retraso_gt_tol": {
                        "opcode": "operator_gt",
                        "next": None,
                        "parent": "b_if_tol_check",
                        "inputs": {
                            "OPERAND1": [3, [12, "minutos_retraso", "v_retraso"], [10, ""]],
                            "OPERAND2": [3, [12, "tolerancia_minutos", "v_tolerancia"], [10, "10"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    # Caso: Retardo con descuento ($15 por minuto excedente a los 10 min de tolerancia)
                    "b_calc_descuento": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_est_retardo",
                        "parent": "b_if_tol_check",
                        "inputs": {
                            "VALUE": [3, "b_mult_sancion", [10, "0"]]
                        },
                        "fields": {"VARIABLE": ["descuento_aplicado", "v_descuento"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_mult_sancion": {
                        "opcode": "operator_multiply",
                        "next": None,
                        "parent": "b_calc_descuento",
                        "inputs": {
                            "NUM1": [3, "b_sub_excedente", [4, "1"]],
                            "NUM2": [1, [4, "15"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_sub_excedente": {
                        "opcode": "operator_subtract",
                        "next": None,
                        "parent": "b_mult_sancion",
                        "inputs": {
                            "NUM1": [3, [12, "minutos_retraso", "v_retraso"], [4, "0"]],
                            "NUM2": [3, [12, "tolerancia_minutos", "v_tolerancia"], [4, "10"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_est_retardo": {
                        "opcode": "data_setvariableto",
                        "next": "b_calc_neto_retardo",
                        "parent": "b_calc_descuento",
                        "inputs": {"VALUE": [1, [10, "Retardo con Sancion"]]},
                        "fields": {"VARIABLE": ["estatus_asistencia", "v_estatus"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_calc_neto_retardo": {
                        "opcode": "data_setvariableto",
                        "next": "b_say_retardo_msg",
                        "parent": "b_set_est_retardo",
                        "inputs": {
                            "VALUE": [3, "b_sub_neto_val", [10, "0"]]
                        },
                        "fields": {"VARIABLE": ["sueldo_neto", "v_sueldo_neto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_sub_neto_val": {
                        "opcode": "operator_subtract",
                        "next": None,
                        "parent": "b_calc_neto_retardo",
                        "inputs": {
                            "NUM1": [3, [12, "sueldo_base", "v_sueldo_base"], [4, "0"]],
                            "NUM2": [3, [12, "descuento_aplicado", "v_descuento"], [4, "0"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_retardo_msg": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_calc_neto_retardo",
                        "inputs": {
                            "MESSAGE": [1, [10, "Retardo registrado fuera de tolerancia. Descuento aplicado a nómina."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # Caso: Dentro de tolerancia o puntual
                    "b_no_descuento": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_est_puntual",
                        "parent": "b_if_tol_check",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["descuento_aplicado", "v_descuento"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_est_puntual": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_neto_puntual",
                        "parent": "b_no_descuento",
                        "inputs": {"VALUE": [1, [10, "Puntual (En Tolerancia)"]]},
                        "fields": {"VARIABLE": ["estatus_asistencia", "v_estatus"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_neto_puntual": {
                        "opcode": "data_setvariableto",
                        "next": "b_say_puntual_msg",
                        "parent": "b_set_est_puntual",
                        "inputs": {
                            "VALUE": [3, [12, "sueldo_base", "v_sueldo_base"], [10, "0"]]
                        },
                        "fields": {"VARIABLE": ["sueldo_neto", "v_sueldo_neto"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_puntual_msg": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_set_neto_puntual",
                        "inputs": {
                            "MESSAGE": [1, [10, "Asistencia correcta UTP. Sin penalizacion en nómina."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_bc_reg_call": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_if_tol_check",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "guardar_en_historial", "bc_registrar"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 5: Guardar en Historial y Generar Folio ──
                    "b_recv_reg": {
                        "opcode": "event_whenbroadcastreceived",
                        "next": "b_inc_total_checadas",
                        "parent": None,
                        "inputs": {},
                        "fields": {"BROADCAST_OPTION": ["guardar_en_historial", "bc_registrar"]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 760
                    },
                    "b_inc_total_checadas": {
                        "opcode": "data_changevariableby",
                        "next": "b_add_history_entry",
                        "parent": "b_recv_reg",
                        "inputs": {"VALUE": [1, [4, "1"]]},
                        "fields": {"VARIABLE": ["total_checadas", "v_total_checadas"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_add_history_entry": {
                        "opcode": "data_addtolist",
                        "next": None,
                        "parent": "b_inc_total_checadas",
                        "inputs": {
                            "ITEM": [3, "b_join_h1", [10, "Registro"]]
                        },
                        "fields": {"LIST": ["historial_asistencia", "l_historial"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_join_h1": {
                        "opcode": "operator_join",
                        "next": None,
                        "parent": "b_add_history_entry",
                        "inputs": {
                            "STRING1": [3, [12, "profesor_identificado", "v_profesor"], [10, "Docente"]],
                            "STRING2": [3, "b_join_h2", [10, ""]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_join_h2": {
                        "opcode": "operator_join",
                        "next": None,
                        "parent": "b_join_h1",
                        "inputs": {
                            "STRING1": [1, [10, " | Entrada: "]],
                            "STRING2": [3, "b_join_h3", [10, ""]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_join_h3": {
                        "opcode": "operator_join",
                        "next": None,
                        "parent": "b_join_h2",
                        "inputs": {
                            "STRING1": [3, [12, "hora_checada", "v_checada"], [10, "--"]],
                            "STRING2": [3, "b_join_h4", [10, ""]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_join_h4": {
                        "opcode": "operator_join",
                        "next": None,
                        "parent": "b_join_h3",
                        "inputs": {
                            "STRING1": [1, [10, " | Desc: $"]],
                            "STRING2": [3, [12, "descuento_aplicado", "v_descuento"], [10, "0"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 6: Tecla C (Consultar Total e Historial) ──
                    "b_key_c": {
                        "opcode": "event_whenkeypressed",
                        "next": "b_say_total_c",
                        "parent": None,
                        "inputs": {},
                        "fields": {"KEY_OPTION": ["c", None]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 440
                    },
                    "b_say_total_c": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_key_c",
                        "inputs": {
                            "MESSAGE": [3, "b_join_c_msg", [10, "Consultando..."]],
                            "SECS": [1, [4, "4"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_join_c_msg": {
                        "opcode": "operator_join",
                        "next": None,
                        "parent": "b_say_total_c",
                        "inputs": {
                            "STRING1": [1, [10, "Auditoria UTP: Total de registros procesados = "]],
                            "STRING2": [3, [12, "total_checadas", "v_total_checadas"], [10, "0"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 7: Tecla L (Limpiar Historial) ──
                    "b_key_l": {
                        "opcode": "event_whenkeypressed",
                        "next": "b_clear_history",
                        "parent": None,
                        "inputs": {},
                        "fields": {"KEY_OPTION": ["l", None]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 600
                    },
                    "b_clear_history": {
                        "opcode": "data_deletealloflist",
                        "next": "b_reset_counter",
                        "parent": "b_key_l",
                        "inputs": {},
                        "fields": {"LIST": ["historial_asistencia", "l_historial"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_reset_counter": {
                        "opcode": "data_setvariableto",
                        "next": "b_say_cleared",
                        "parent": "b_clear_history",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["total_checadas", "v_total_checadas"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_cleared": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_reset_counter",
                        "inputs": {
                            "MESSAGE": [1, [10, "Historial de asistencia UTP reiniciado."]],
                            "SECS": [1, [4, "2"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    }
                }
            }
        ],
        "monitors": [
            {
                "id": "v_profesor",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "profesor_identificado"},
                "spriteName": None,
                "value": "Sin registro",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 50,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "v_horario",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "horario_oficial"},
                "spriteName": None,
                "value": "--",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 78,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "v_checada",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "hora_checada"},
                "spriteName": None,
                "value": "--",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 106,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "v_retraso",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "minutos_retraso"},
                "spriteName": None,
                "value": 0,
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 134,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "v_estatus",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "estatus_asistencia"},
                "spriteName": None,
                "value": "Esperando huella",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 162,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "v_descuento",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "descuento_aplicado"},
                "spriteName": None,
                "value": 0,
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 190,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "v_sueldo_neto",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "sueldo_neto"},
                "spriteName": None,
                "value": 0,
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 218,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "l_historial",
                "mode": "list",
                "opcode": "data_listcontents",
                "params": {"LIST": "historial_asistencia"},
                "spriteName": None,
                "value": [],
                "width": 250,
                "height": 180,
                "x": 220,
                "y": 50,
                "visible": True
            }
        ],
        "extensions": [],
        "meta": {
            "semver": "3.0.0",
            "vm": "0.2.0",
            "agent": "UTP-BiometricoDocente-Scratch"
        }
    }

    output_path = r"c:\Users\AlexanderSc\SSC\UTP_Biometrico_Docente.sb3"

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        zipf.writestr("project.json", json.dumps(project_json, indent=2))
        for key, data in assets.items():
            _, filename = asset_ids[key]
            zipf.writestr(filename, data)

    print(f"Proyecto Scratch 3.0 UTP generado con exito en: {output_path}")

if __name__ == "__main__":
    create_utp_sb3()
