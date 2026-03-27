#!/bin/bash
# =============================================================
# deploy.sh — Sincronizza backend e/o frontend nel container
# =============================================================
# Uso:
#   ./deploy.sh          → solo backend
#   ./deploy.sh --full   → backend + frontend build + deploy
#   ./deploy.sh --front  → solo frontend
# =============================================================

set -e

BACKEND_CONTAINER="cnc_maintenance_backend"
FRONTEND_CONTAINER="cnc_maintenance_frontend"
BACKEND_SRC="/home/usnainukhtar/husnain2005/cnc-maintenance-system/backend/src"
FRONTEND_DIR="/home/usnainukhtar/husnain2005/cnc-maintenance-system/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[  OK  ]${NC} $1"; }
warn() { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
err()  { echo -e "${RED}[ERROR ]${NC} $1"; exit 1; }

# Verifica che Docker sia disponibile
if ! docker info &>/dev/null; then
  err "Docker non è disponibile. Assicurati che Docker Desktop sia in esecuzione."
fi

deploy_backend() {
  log "Sincronizzazione backend → $BACKEND_CONTAINER ..."

  # Copia tutte le cartelle src/ nel container
  docker cp "$BACKEND_SRC/controllers/." "$BACKEND_CONTAINER:/app/src/controllers/"
  docker cp "$BACKEND_SRC/routes/."      "$BACKEND_CONTAINER:/app/src/routes/"
  docker cp "$BACKEND_SRC/middleware/."  "$BACKEND_CONTAINER:/app/src/middleware/"
  docker cp "$BACKEND_SRC/config/."      "$BACKEND_CONTAINER:/app/src/config/"

  ok "File backend copiati"

  log "Riavvio $BACKEND_CONTAINER ..."
  docker restart "$BACKEND_CONTAINER" > /dev/null

  # Aspetta che il backend sia pronto (max 20s)
  for i in $(seq 1 20); do
    if docker exec "$FRONTEND_CONTAINER" wget -q --spider "http://backend:3001/api/auth/me" 2>/dev/null; then
      ok "Backend pronto (${i}s)"
      break
    fi
    # 401 = server risponde, anche se non autenticato
    STATUS=$(docker exec "$FRONTEND_CONTAINER" wget -S --spider "http://backend:3001/api/auth/me" 2>&1 | grep "HTTP/" | awk '{print $2}')
    if [ "$STATUS" = "401" ] || [ "$STATUS" = "200" ]; then
      ok "Backend pronto (${i}s)"
      break
    fi
    sleep 1
  done
}

deploy_frontend() {
  log "Build frontend ..."
  cd "$FRONTEND_DIR"
  npm run build 2>&1 | grep -E "built in|error|Error" || true

  log "Deploy frontend → $FRONTEND_CONTAINER ..."
  docker cp "$FRONTEND_DIR/dist/." "$FRONTEND_CONTAINER:/usr/share/nginx/html/"
  docker exec "$FRONTEND_CONTAINER" nginx -s reload
  ok "Frontend deployato"
  warn "Premi Ctrl+Shift+R nel browser per aggiornare il cache"
}

# ── Parsing argomenti ──
MODE="backend"
for arg in "$@"; do
  case $arg in
    --full)  MODE="full"    ;;
    --front) MODE="frontend" ;;
    --back)  MODE="backend"  ;;
  esac
done

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      CNC Maintenance — Deploy        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

case $MODE in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  full)
    deploy_backend
    echo ""
    deploy_frontend
    ;;
esac

echo ""
ok "Deploy completato!"
echo ""
