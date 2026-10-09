#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN AUTOMÁTICA EN PRODUCCIÓN ON-PREMISE
# Sistema de Seguimiento Conductual (SSC) - CONALEP Plantel Puebla I
# ==============================================================================
# Uso:
#   chmod +x scripts/actualizar_ssc.sh
#   ./scripts/actualizar_ssc.sh [rama_opcional]
# Ejemplo:
#   ./scripts/actualizar_ssc.sh frontend-alex
# ==============================================================================

set -euo pipefail

# Colores de salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # Sin color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}   SSC CONALEP Puebla I - Actualizador de Servidor Físico On-Premise  ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 1. Determinar directorio raíz del repositorio
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
TARGET_BRANCH="${1:-$CURRENT_BRANCH}"

echo -e "${YELLOW}--> Directorio del repositorio:${NC} $REPO_DIR"
echo -e "${YELLOW}--> Rama actual:${NC} $CURRENT_BRANCH"
echo -e "${YELLOW}--> Rama objetivo para pull:${NC} $TARGET_BRANCH"

# 2. Verificar estado de git y sincronizar
echo -e "\n${BLUE}[1/5] Descargando últimos cambios desde GitHub...${NC}"
git fetch origin

if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}[!] Se detectaron cambios locales sin confirmar. Creando stash preventivo...${NC}"
  git stash save "Auto-stash antes de actualizar $(date +'%Y-%m-%d %H:%M:%S')"
fi

git checkout "$TARGET_BRANCH"
git pull origin "$TARGET_BRANCH"

NEW_COMMIT=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
echo -e "${GREEN}[OK] Repositorio actualizado al commit: ${NEW_COMMIT} ('${COMMIT_MSG}')${NC}"

# 3. Compilación del Frontend Vite + React + Tailwind
echo -e "\n${BLUE}[2/5] Compilando frontend para producción con pnpm...${NC}"
cd "$REPO_DIR/frontend"

# Instalar dependencias si hubo cambios en package.json o pnpm-lock.yaml
pnpm install --prefer-offline

# Generar bundle de producción optimizado
pnpm run build

echo -e "${GREEN}[OK] Frontend compilado con éxito.${NC}"

# 4. Despliegue de archivos estáticos a Nginx
echo -e "\n${BLUE}[3/5] Sincronizando artefactos estáticos con Nginx (/var/www/ssc)...${NC}"
TARGET_WEB_DIR="/var/www/ssc"

if [ -d "$TARGET_WEB_DIR" ]; then
  sudo rm -rf "$TARGET_WEB_DIR"/*
  sudo cp -r "$REPO_DIR/frontend/dist"/* "$TARGET_WEB_DIR"/
  sudo chown -R www-data:www-data "$TARGET_WEB_DIR"
  sudo chmod -R 755 "$TARGET_WEB_DIR"
  echo -e "${GREEN}[OK] Archivos web copiados y permisos asignados a www-data.${NC}"
else
  echo -e "${YELLOW}[!] $TARGET_WEB_DIR no existe. Verifique si Nginx sirve directamente desde dist.${NC}"
fi

# 5. Reinicio de Edge Functions y Contenedores Supabase si existen
echo -e "\n${BLUE}[4/5] Verificando contenedores y Edge Functions de Supabase...${NC}"
if [ -d "$REPO_DIR/supabase/docker" ]; then
  cd "$REPO_DIR/supabase/docker"
  if command -v docker &> /dev/null; then
    # Reiniciar edge-functions para cargar nuevo código de groq-agent e invite-user
    if docker compose ps edge-functions &> /dev/null; then
      docker compose restart edge-functions || true
      echo -e "${GREEN}[OK] Contenedor edge-functions reiniciado.${NC}"
    else
      echo -e "${YELLOW}[!] Contenedor edge-functions no detectado en ejecución.${NC}"
    fi
  fi
fi

# 6. Recarga de Nginx
echo -e "\n${BLUE}[5/5] Probando configuración y recargando Nginx...${NC}"
if command -v nginx &> /dev/null; then
  sudo nginx -t
  sudo systemctl reload nginx
  echo -e "${GREEN}[OK] Nginx recargado sin interrupción de servicio.${NC}"
fi

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}   ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!                                ${NC}"
echo -e "${GREEN}   Commit activo: $NEW_COMMIT                                         ${NC}"
echo -e "${GREEN}   Fecha/Hora: $(date +'%Y-%m-%d %H:%M:%S')                           ${NC}"
echo -e "${GREEN}======================================================================${NC}"
