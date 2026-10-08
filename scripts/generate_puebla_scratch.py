import os
import json
import zipfile
import hashlib

def get_asset_hash(content: bytes):
    m = hashlib.md5()
    m.update(content)
    asset_id = m.hexdigest()
    return asset_id, f"{asset_id}.svg"

# SVG definitions for Puebla historical facades
SVG_FONDO = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="60%" stop-color="#bae6fd"/>
      <stop offset="100%" stop-color="#e0f2fe"/>
    </linearGradient>
    <linearGradient id="cobble" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="480" height="270" fill="url(#sky)"/>
  <rect y="270" width="480" height="90" fill="url(#cobble)"/>
  <!-- Silueta de campanario y edificios históricos de fondo -->
  <path d="M 40 270 L 40 180 L 70 180 L 70 140 L 85 110 L 100 140 L 100 180 L 130 180 L 130 270 Z" fill="#94a3b8" opacity="0.45"/>
  <path d="M 350 270 L 350 190 L 410 190 L 410 270 Z" fill="#94a3b8" opacity="0.35"/>
  <text x="240" y="330" font-family="sans-serif" font-size="14" font-weight="bold" fill="#f8fafc" text-anchor="middle">Centro Historico de Puebla - Modulo de Conservacion</text>
</svg>"""

SVG_FACHADA_LIMPIA = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="320" height="280">
  <defs>
    <linearGradient id="cantera" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="ladrillo" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
  </defs>
  <!-- Muro estilo barroco poblano (Ladrillo y Cantera) -->
  <rect x="20" y="20" width="280" height="250" fill="url(#ladrillo)" rx="4"/>
  <!-- Zocalo de cantera gris -->
  <rect x="20" y="220" width="280" height="50" fill="url(#cantera)"/>
  <!-- Cornisa superior -->
  <rect x="10" y="10" width="300" height="18" fill="url(#cantera)" rx="2"/>
  <!-- Porton virreinal de madera -->
  <rect x="110" y="110" width="100" height="160" fill="#451a03" rx="40 40 0 0"/>
  <line x1="160" y1="110" x2="160" y2="270" stroke="#78350f" stroke-width="3"/>
  <!-- Marco de cantera del porton -->
  <path d="M 100 270 L 100 110 C 100 70, 220 70, 220 110 L 220 270" fill="none" stroke="url(#cantera)" stroke-width="12"/>
  <!-- Azulejos de talavera decorativos -->
  <rect x="50" y="50" width="30" height="30" fill="#1e3a8a" stroke="#ffffff" stroke-width="2"/>
  <circle cx="65" cy="65" r="8" fill="#fbbf24"/>
  <rect x="240" y="50" width="30" height="30" fill="#1e3a8a" stroke="#ffffff" stroke-width="2"/>
  <circle cx="255" cy="65" r="8" fill="#fbbf24"/>
  <!-- Cartela de estado -->
  <rect x="35" y="235" width="250" height="24" fill="#15803d" rx="6"/>
  <text x="160" y="252" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Muestra 1: Sin Deterioro Aparente</text>
</svg>"""

SVG_FACHADA_GRIETA = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="320" height="280">
  <defs>
    <linearGradient id="cantera_g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="ladrillo_g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="280" height="250" fill="url(#ladrillo_g)" rx="4"/>
  <rect x="20" y="220" width="280" height="50" fill="url(#cantera_g)"/>
  <rect x="10" y="10" width="300" height="18" fill="url(#cantera_g)" rx="2"/>
  <rect x="110" y="110" width="100" height="160" fill="#451a03" rx="40 40 0 0"/>
  <line x1="160" y1="110" x2="160" y2="270" stroke="#78350f" stroke-width="3"/>
  <path d="M 100 270 L 100 110 C 100 70, 220 70, 220 110 L 220 270" fill="none" stroke="url(#cantera_g)" stroke-width="12"/>
  <!-- GRIETA DIAGONAL PRONUNCIADA -->
  <path d="M 50 25 L 75 70 L 65 110 L 85 155 L 70 200 L 95 245" fill="none" stroke="#18181b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 75 70 L 95 90" fill="none" stroke="#18181b" stroke-width="3"/>
  <path d="M 85 155 L 110 170" fill="none" stroke="#18181b" stroke-width="3"/>
  <!-- Cartela de estado -->
  <rect x="35" y="235" width="250" height="24" fill="#b91c1c" rx="6"/>
  <text x="160" y="252" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Muestra 2: Grieta Estructural Visible</text>
</svg>"""

SVG_FACHADA_HUMEDAD = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="320" height="280">
  <defs>
    <linearGradient id="cantera_h" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="ladrillo_h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
    <radialGradient id="mancha" cx="30%" cy="80%" r="50%">
      <stop offset="0%" stop-color="#1e293b" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="#334155" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#475569" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="20" y="20" width="280" height="250" fill="url(#ladrillo_h)" rx="4"/>
  <rect x="20" y="220" width="280" height="50" fill="url(#cantera_h)"/>
  <rect x="10" y="10" width="300" height="18" fill="url(#cantera_h)" rx="2"/>
  <rect x="110" y="110" width="100" height="160" fill="#451a03" rx="40 40 0 0"/>
  <line x1="160" y1="110" x2="160" y2="270" stroke="#78350f" stroke-width="3"/>
  <path d="M 100 270 L 100 110 C 100 70, 220 70, 220 110 L 220 270" fill="none" stroke="url(#cantera_h)" stroke-width="12"/>
  <!-- MANCHAS DE HUMEDAD Y SALITRE POR CAPILARIDAD -->
  <path d="M 20 270 C 20 180, 80 160, 100 270 Z" fill="url(#mancha)"/>
  <path d="M 220 270 C 230 190, 290 170, 300 270 Z" fill="url(#mancha)"/>
  <!-- Salitre blanco visible -->
  <ellipse cx="60" cy="225" rx="25" ry="10" fill="#f8fafc" opacity="0.65"/>
  <ellipse cx="260" cy="220" rx="20" ry="8" fill="#f8fafc" opacity="0.65"/>
  <!-- Cartela de estado -->
  <rect x="35" y="235" width="250" height="24" fill="#b45309" rx="6"/>
  <text x="160" y="252" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Muestra 3: Humedad y Eflorescencia</text>
</svg>"""

SVG_FACHADA_GRAFITI = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="320" height="280">
  <defs>
    <linearGradient id="cantera_gr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="ladrillo_gr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
  </defs>
  <rect x="20" y="20" width="280" height="250" fill="url(#ladrillo_gr)" rx="4"/>
  <rect x="20" y="220" width="280" height="50" fill="url(#cantera_gr)"/>
  <rect x="10" y="10" width="300" height="18" fill="url(#cantera_gr)" rx="2"/>
  <rect x="110" y="110" width="100" height="160" fill="#451a03" rx="40 40 0 0"/>
  <line x1="160" y1="110" x2="160" y2="270" stroke="#78350f" stroke-width="3"/>
  <path d="M 100 270 L 100 110 C 100 70, 220 70, 220 110 L 220 270" fill="none" stroke="url(#cantera_gr)" stroke-width="12"/>
  <!-- GRAFITI / PINTA CON AEROSOL -->
  <path d="M 35 150 Q 55 120 75 160 T 110 140 T 140 180" fill="none" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
  <path d="M 45 170 Q 75 195 120 165" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/>
  <path d="M 215 155 Q 245 130 280 170" fill="none" stroke="#7c3aed" stroke-width="8" stroke-linecap="round"/>
  <!-- Cartela de estado -->
  <rect x="35" y="235" width="250" height="24" fill="#c026d3" rx="6"/>
  <text x="160" y="252" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Muestra 4: Alteracion por Grafiti</text>
</svg>"""

SVG_FACHADA_OTRO = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="320" height="280">
  <!-- Elemento moderno no patrimonial / fotografia no clasificada -->
  <rect x="20" y="20" width="280" height="250" fill="#334155" rx="8"/>
  <circle cx="160" cy="120" r="45" fill="#64748b"/>
  <rect x="130" y="105" width="60" height="30" fill="#94a3b8" rx="6"/>
  <text x="160" y="185" font-family="sans-serif" font-size="14" font-weight="bold" fill="#e2e8f0" text-anchor="middle">Objeto No Patrimonial</text>
  <text x="160" y="205" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">(Toma borrosa o elemento fuera de catalogo)</text>
  <rect x="35" y="235" width="250" height="24" fill="#475569" rx="6"/>
  <text x="160" y="252" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">Muestra 5: Categoria OTRO</text>
</svg>"""

def create_sb3():
    # Asset contents and IDs
    assets = {
        "fondo": SVG_FONDO.encode("utf-8"),
        "limpia": SVG_FACHADA_LIMPIA.encode("utf-8"),
        "grieta": SVG_FACHADA_GRIETA.encode("utf-8"),
        "humedad": SVG_FACHADA_HUMEDAD.encode("utf-8"),
        "grafiti": SVG_FACHADA_GRAFITI.encode("utf-8"),
        "otro": SVG_FACHADA_OTRO.encode("utf-8"),
    }
    
    asset_ids = {}
    for key, data in assets.items():
        aid, md5ext = get_asset_hash(data)
        asset_ids[key] = (aid, md5ext)

    # Scratch project.json definition
    project_json = {
        "targets": [
            {
                "isStage": True,
                "name": "Stage",
                "variables": {
                    "var_folio": ["folio_reporte", 0],
                    "var_etiqueta": ["etiqueta_detectada", "Esperando inicio"],
                    "var_confianza": ["confianza_detectada", 0],
                    "var_estado": ["estado_reporte", "Esperando analisis"],
                    "var_inmueble": ["inmueble_nombre", "Casona 6 Oriente #204, Centro Historico"]
                },
                "lists": {},
                "broadcasts": {
                    "bc_analizar": "analizar_fachada",
                    "bc_ticket": "generar_ticket_mantenimiento"
                },
                "customs": [],
                "currentCostume": 0,
                "costumes": [
                    {
                        "name": "Fondo_Zocalo",
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
                "name": "Fachada",
                "variables": {},
                "lists": {},
                "broadcasts": {},
                "customs": [],
                "currentCostume": 0,
                "costumes": [
                    {
                        "name": "SIN_DETERIORO_APARENTE",
                        "dataFormat": "svg",
                        "assetId": asset_ids["limpia"][0],
                        "md5ext": asset_ids["limpia"][1],
                        "rotationCenterX": 160,
                        "rotationCenterY": 140
                    },
                    {
                        "name": "GRIETA",
                        "dataFormat": "svg",
                        "assetId": asset_ids["grieta"][0],
                        "md5ext": asset_ids["grieta"][1],
                        "rotationCenterX": 160,
                        "rotationCenterY": 140
                    },
                    {
                        "name": "HUMEDAD",
                        "dataFormat": "svg",
                        "assetId": asset_ids["humedad"][0],
                        "md5ext": asset_ids["humedad"][1],
                        "rotationCenterX": 160,
                        "rotationCenterY": 140
                    },
                    {
                        "name": "GRAFITI",
                        "dataFormat": "svg",
                        "assetId": asset_ids["grafiti"][0],
                        "md5ext": asset_ids["grafiti"][1],
                        "rotationCenterX": 160,
                        "rotationCenterY": 140
                    },
                    {
                        "name": "OTRO",
                        "dataFormat": "svg",
                        "assetId": asset_ids["otro"][0],
                        "md5ext": asset_ids["otro"][1],
                        "rotationCenterX": 160,
                        "rotationCenterY": 140
                    }
                ],
                "sounds": [],
                "volume": 100,
                "visible": True,
                "x": 0,
                "y": 10,
                "size": 100,
                "direction": 90,
                "draggable": False,
                "rotationStyle": "all around",
                "layerOrder": 1,
                "blocks": {
                    # ── Script 1: Al presionar Bandera Verde (Inicialización) ──
                    "b_green_flag": {
                        "opcode": "event_whenflagclicked",
                        "next": "b_set_folio_init",
                        "parent": None,
                        "inputs": {},
                        "fields": {},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 30
                    },
                    "b_set_folio_init": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_estado_init",
                        "parent": "b_green_flag",
                        "inputs": {"VALUE": [1, [10, "0"]]},
                        "fields": {"VARIABLE": ["folio_reporte", "var_folio"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_estado_init": {
                        "opcode": "data_setvariableto",
                        "next": "b_costume_init",
                        "parent": "b_set_folio_init",
                        "inputs": {"VALUE": [1, [10, "Esperando analisis"]]},
                        "fields": {"VARIABLE": ["estado_reporte", "var_estado"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_costume_init": {
                        "opcode": "looks_switchcostumeto",
                        "next": "b_welcome_msg",
                        "parent": "b_set_estado_init",
                        "inputs": {"COSTUME": [1, "b_menu_costume1"]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_menu_costume1": {
                        "opcode": "looks_costume",
                        "next": None,
                        "parent": "b_costume_init",
                        "inputs": {},
                        "fields": {"COSTUME": ["SIN_DETERIORO_APARENTE", None]},
                        "shadow": True,
                        "topLevel": False
                    },
                    "b_welcome_msg": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_costume_init",
                        "inputs": {
                            "MESSAGE": [1, [10, "Puebla de Raiz - Conservacion Inteligente. Presiona [Espacio] para analizar fotografia."]],
                            "SECS": [1, [4, "4"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 2: Al presionar Tecla Espacio (Cambiar foto y analizar) ──
                    "b_key_space": {
                        "opcode": "event_whenkeypressed",
                        "next": "b_next_costume",
                        "parent": None,
                        "inputs": {},
                        "fields": {"KEY_OPTION": ["space", None]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 260
                    },
                    "b_next_costume": {
                        "opcode": "looks_nextcostume",
                        "next": "b_set_eval_wait",
                        "parent": "b_key_space",
                        "inputs": {},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_eval_wait": {
                        "opcode": "data_setvariableto",
                        "next": "b_broadcast_analizar",
                        "parent": "b_next_costume",
                        "inputs": {"VALUE": [1, [10, "Analizando imagen..."]]},
                        "fields": {"VARIABLE": ["etiqueta_detectada", "var_etiqueta"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_broadcast_analizar": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_set_eval_wait",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "analizar_fachada", "bc_analizar"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 3: Al recibir analizar_fachada (Clasificación e Inferencia) ──
                    "b_recv_analizar": {
                        "opcode": "event_whenbroadcastreceived",
                        "next": "b_say_scanning",
                        "parent": None,
                        "inputs": {},
                        "fields": {"BROADCAST_OPTION": ["analizar_fachada", "bc_analizar"]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 360,
                        "y": 30
                    },
                    "b_say_scanning": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_set_etiqueta_from_costume",
                        "parent": "b_recv_analizar",
                        "inputs": {
                            "MESSAGE": [1, [10, "Enviando imagen a Machine Learning for Kids..."]],
                            "SECS": [1, [4, "1"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    # En modo estándar simulado toma el nombre del disfraz actual para demo.
                    # En ML for Kids este bloque se enlaza con <reconocer imagen (imagen del disfraz)>
                    "b_set_etiqueta_from_costume": {
                        "opcode": "data_setvariableto",
                        "next": "b_set_confianza_val",
                        "parent": "b_say_scanning",
                        "inputs": {
                            "VALUE": [3, "b_costume_name_block", [10, ""]]
                        },
                        "fields": {"VARIABLE": ["etiqueta_detectada", "var_etiqueta"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_costume_name_block": {
                        "opcode": "looks_costumenumbername",
                        "next": None,
                        "parent": "b_set_etiqueta_from_costume",
                        "inputs": {},
                        "fields": {"NUMBER_NAME": ["name", None]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_confianza_val": {
                        "opcode": "data_setvariableto",
                        "next": "b_if_sin_deterioro",
                        "parent": "b_set_etiqueta_from_costume",
                        "inputs": {"VALUE": [1, [10, "92"]]},
                        "fields": {"VARIABLE": ["confianza_detectada", "var_confianza"]},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Estructura de Condicionales Anidados ──
                    "b_if_sin_deterioro": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_set_confianza_val",
                        "inputs": {
                            "CONDITION": [2, "b_cond_sin_deterioro"],
                            "SUBSTACK": [2, "b_say_sin_deterioro"],
                            "SUBSTACK2": [2, "b_if_grieta"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_sin_deterioro": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_if_sin_deterioro",
                        "inputs": {
                            "OPERAND1": [3, [12, "etiqueta_detectada", "var_etiqueta"], [10, ""]],
                            "OPERAND2": [1, [10, "SIN_DETERIORO_APARENTE"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_sin_deterioro": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_set_optimo",
                        "parent": "b_if_sin_deterioro",
                        "inputs": {
                            "MESSAGE": [1, [10, "No se detecta deterioro visible."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_optimo": {
                        "opcode": "data_setvariableto",
                        "next": None,
                        "parent": "b_say_sin_deterioro",
                        "inputs": {"VALUE": [1, [10, "Optimo"]]},
                        "fields": {"VARIABLE": ["estado_reporte", "var_estado"]},
                        "shadow": False,
                        "topLevel": False
                    },

                    # Condicional 2: GRIETA
                    "b_if_grieta": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_if_sin_deterioro",
                        "inputs": {
                            "CONDITION": [2, "b_cond_grieta"],
                            "SUBSTACK": [2, "b_say_grieta"],
                            "SUBSTACK2": [2, "b_if_humedad"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_grieta": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_if_grieta",
                        "inputs": {
                            "OPERAND1": [3, [12, "etiqueta_detectada", "var_etiqueta"], [10, ""]],
                            "OPERAND2": [1, [10, "GRIETA"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_grieta": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_bc_ticket_grieta",
                        "parent": "b_if_grieta",
                        "inputs": {
                            "MESSAGE": [1, [10, "Posible grieta detectada. Se recomienda revision."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_bc_ticket_grieta": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_say_grieta",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "generar_ticket_mantenimiento", "bc_ticket"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # Condicional 3: HUMEDAD
                    "b_if_humedad": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_if_grieta",
                        "inputs": {
                            "CONDITION": [2, "b_cond_humedad"],
                            "SUBSTACK": [2, "b_say_humedad"],
                            "SUBSTACK2": [2, "b_if_grafiti"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_humedad": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_if_humedad",
                        "inputs": {
                            "OPERAND1": [3, [12, "etiqueta_detectada", "var_etiqueta"], [10, ""]],
                            "OPERAND2": [1, [10, "HUMEDAD"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_humedad": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_bc_ticket_humedad",
                        "parent": "b_if_humedad",
                        "inputs": {
                            "MESSAGE": [1, [10, "Posible humedad o mancha detectada."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_bc_ticket_humedad": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_say_humedad",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "generar_ticket_mantenimiento", "bc_ticket"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # Condicional 4: GRAFITI
                    "b_if_grafiti": {
                        "opcode": "control_if_else",
                        "next": None,
                        "parent": "b_if_humedad",
                        "inputs": {
                            "CONDITION": [2, "b_cond_grafiti"],
                            "SUBSTACK": [2, "b_say_grafiti"],
                            "SUBSTACK2": [2, "b_say_otro"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_grafiti": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_if_grafiti",
                        "inputs": {
                            "OPERAND1": [3, [12, "etiqueta_detectada", "var_etiqueta"], [10, ""]],
                            "OPERAND2": [1, [10, "GRAFITI"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_grafiti": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_bc_ticket_grafiti",
                        "parent": "b_if_grafiti",
                        "inputs": {
                            "MESSAGE": [1, [10, "Alteracion superficial detectada."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_bc_ticket_grafiti": {
                        "opcode": "event_broadcast",
                        "next": None,
                        "parent": "b_say_grafiti",
                        "inputs": {"BROADCAST_INPUT": [1, [11, "generar_ticket_mantenimiento", "bc_ticket"]]},
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # Condicional 5: OTRO (Fallback)
                    "b_say_otro": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_set_revision_manual",
                        "parent": "b_if_grafiti",
                        "inputs": {
                            "MESSAGE": [1, [10, "No fue posible identificar una condicion conocida."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_revision_manual": {
                        "opcode": "data_setvariableto",
                        "next": None,
                        "parent": "b_say_otro",
                        "inputs": {"VALUE": [1, [10, "Revision Manual"]]},
                        "fields": {"VARIABLE": ["estado_reporte", "var_estado"]},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 4: Al recibir generar_ticket_mantenimiento ──
                    "b_recv_ticket": {
                        "opcode": "event_whenbroadcastreceived",
                        "next": "b_inc_folio",
                        "parent": None,
                        "inputs": {},
                        "fields": {"BROADCAST_OPTION": ["generar_ticket_mantenimiento", "bc_ticket"]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 650
                    },
                    "b_inc_folio": {
                        "opcode": "data_changevariableby",
                        "next": "b_set_estado_pendiente",
                        "parent": "b_recv_ticket",
                        "inputs": {"VALUE": [1, [4, "1"]]},
                        "fields": {"VARIABLE": ["folio_reporte", "var_folio"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_set_estado_pendiente": {
                        "opcode": "data_setvariableto",
                        "next": "b_say_ticket_confirm",
                        "parent": "b_inc_folio",
                        "inputs": {"VALUE": [1, [10, "Pendiente Intervencion"]]},
                        "fields": {"VARIABLE": ["estado_reporte", "var_estado"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_ticket_confirm": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_set_estado_pendiente",
                        "inputs": {
                            "MESSAGE": [1, [10, "Puebla de Raiz: Generado reporte ciudadano para intervencion."]],
                            "SECS": [1, [4, "3"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },

                    # ── Script 5: Al presionar Tecla V (Verificación y Cierre de Folio) ──
                    "b_key_v": {
                        "opcode": "event_whenkeypressed",
                        "next": "b_if_verificar",
                        "parent": None,
                        "inputs": {},
                        "fields": {"KEY_OPTION": ["v", None]},
                        "shadow": False,
                        "topLevel": True,
                        "x": 30,
                        "y": 460
                    },
                    "b_if_verificar": {
                        "opcode": "control_if",
                        "next": None,
                        "parent": "b_key_v",
                        "inputs": {
                            "CONDITION": [2, "b_cond_is_pendiente"],
                            "SUBSTACK": [2, "b_say_verificando"]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_cond_is_pendiente": {
                        "opcode": "operator_equals",
                        "next": None,
                        "parent": "b_if_verificar",
                        "inputs": {
                            "OPERAND1": [3, [12, "estado_reporte", "var_estado"], [10, ""]],
                            "OPERAND2": [1, [10, "Pendiente Intervencion"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_verificando": {
                        "opcode": "looks_sayforsecs",
                        "next": "b_close_ticket",
                        "parent": "b_if_verificar",
                        "inputs": {
                            "MESSAGE": [1, [10, "Verificando restauracion de fachada..."]],
                            "SECS": [1, [4, "2"]]
                        },
                        "fields": {},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_close_ticket": {
                        "opcode": "data_setvariableto",
                        "next": "b_say_ticket_closed",
                        "parent": "b_say_verificando",
                        "inputs": {"VALUE": [1, [10, "Resuelto / Cerrado"]]},
                        "fields": {"VARIABLE": ["estado_reporte", "var_estado"]},
                        "shadow": False,
                        "topLevel": False
                    },
                    "b_say_ticket_closed": {
                        "opcode": "looks_sayforsecs",
                        "next": None,
                        "parent": "b_close_ticket",
                        "inputs": {
                            "MESSAGE": [1, [10, "Conservacion concluida con exito. Reporte cerrado."]],
                            "SECS": [1, [4, "3"]]
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
                "id": "var_inmueble",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "inmueble_nombre"},
                "spriteName": None,
                "value": "Casona 6 Oriente #204, Centro Historico",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 10,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "var_folio",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "folio_reporte"},
                "spriteName": None,
                "value": 0,
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 40,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "var_etiqueta",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "etiqueta_detectada"},
                "spriteName": None,
                "value": "Esperando inicio",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 70,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            },
            {
                "id": "var_estado",
                "mode": "default",
                "opcode": "data_variable",
                "params": {"VARIABLE": "estado_reporte"},
                "spriteName": None,
                "value": "Esperando analisis",
                "width": 0,
                "height": 0,
                "x": 10,
                "y": 100,
                "visible": True,
                "sliderMin": 0,
                "sliderMax": 100,
                "isDiscrete": True
            }
        ],
        "extensions": [],
        "meta": {
            "semver": "3.0.0",
            "vm": "0.2.0",
            "agent": "PueblaDeRaiz-Scratch"
        }
    }

    output_path = r"c:\Users\AlexanderSc\SSC\Patrimonio_Puebla_ML.sb3"
    
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Write project.json
        zipf.writestr("project.json", json.dumps(project_json, indent=2))
        # Write asset files
        for key, data in assets.items():
            _, filename = asset_ids[key]
            zipf.writestr(filename, data)
            
    print(f"Proyecto Scratch 3.0 generado con exito en: {output_path}")

if __name__ == "__main__":
    create_sb3()
