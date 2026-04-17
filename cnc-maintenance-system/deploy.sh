#!/bin/bash
# =============================================================================
# deploy.sh — Aggiorna il gestionale sul VPS dopo un git push
# Uso:
#   ./deploy.sh          → aggiorna backend + frontend
#   ./deploy.sh --back   → solo backend
#   ./deploy.sh --front  → solo frontend
# =============================================================================

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_URL="https://github.com/husnain2005/husnain2005.git"
REPO_BRANCH="main"
TMP_DIR="/tmp/cnc_deploy_$$"
COMPOSE="docker compose -f $APP_DIR/docker-compose.prod.yml"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${CYAN}[>>]${NC} $1"; }
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[!!]${NC} $1"; exit 1; }

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

if ! docker info &>/dev/null; then
  err "Docker non disponibile"
fi

MODE="full"
for arg in "$@"; do
  case $arg in
    --back)  MODE="backend"  ;;
    --front) MODE="frontend" ;;
  esac
done

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   gestionalegiana.com — Deploy       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

log "Download aggiornamenti da GitHub..."
git clone --depth 1 -b "$REPO_BRANCH" "$REPO_URL" "$TMP_DIR" --quiet
ok "Codice scaricato"

log "Sincronizzazione file (escluso .env, certbot, uploads, backups)..."
rsync -a --delete \
  --exclude='.env' \
  --exclude='certbot/' \
  --exclude='uploads/' \
  --exclude='backups/' \
  "$TMP_DIR/cnc-maintenance-system/" "$APP_DIR/"
ok "File aggiornati"

if [ "$MODE" = "backend" ] || [ "$MODE" = "full" ]; then
  log "Build backend..."
  $COMPOSE build backend
  $COMPOSE up -d --force-recreate backend
  ok "Backend aggiornato"
fi

if [ "$MODE" = "frontend" ] || [ "$MODE" = "full" ]; then
  log "Build frontend..."
  $COMPOSE build frontend
  $COMPOSE up -d --force-recreate frontend nginx
  ok "Frontend aggiornato"
fi

echo ""
log "Stato container:"
$COMPOSE ps
echo ""
ok "Deploy completato! → https://gestionalegiana.com"
echo ""
