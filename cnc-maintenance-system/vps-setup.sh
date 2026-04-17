#!/bin/bash
# =============================================================================
# vps-setup.sh — Setup iniziale VPS per gestionalegiana.com
# Esegui UNA SOLA VOLTA sul VPS Hetzner come root:
#   bash vps-setup.sh
# =============================================================================

set -e

DOMAIN="gestionalegiana.com"
EMAIL_CERTBOT="mukhtarhusnain59@gmail.com"
REPO="https://github.com/husnain2005/husnain2005.git"
APP_DIR="/opt/cnc-maintenance"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'
ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log() { echo -e "${CYAN}[>>]${NC} $1"; }

# ---------------------------------------------------------------------------
log "1/8 — Aggiornamento sistema..."
apt-get update -qq && apt-get upgrade -y -qq
ok "Sistema aggiornato"

# ---------------------------------------------------------------------------
log "2/8 — Installazione Docker..."
apt-get install -y -qq curl git ufw
curl -fsSL https://get.docker.com | sh
systemctl enable docker
ok "Docker installato"

# ---------------------------------------------------------------------------
log "3/8 — Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall configurato"

# ---------------------------------------------------------------------------
log "4/8 — Clone repository..."
mkdir -p "$APP_DIR"
git clone "$REPO" /tmp/repo_clone
cp -r /tmp/repo_clone/cnc-maintenance-system/. "$APP_DIR/"
rm -rf /tmp/repo_clone
ok "Repository clonato in $APP_DIR"

# ---------------------------------------------------------------------------
log "5/8 — File .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.production.example" "$APP_DIR/.env"
  echo ""
  echo "⚠  ATTENZIONE: modifica il file $APP_DIR/.env con le tue password!"
  echo "   nano $APP_DIR/.env"
  echo ""
  read -p "Premi INVIO dopo aver modificato il .env per continuare..."
fi
ok ".env configurato"

# ---------------------------------------------------------------------------
log "6/8 — Certificato SSL Let's Encrypt (prima emissione)..."
cd "$APP_DIR"

# Avvia nginx temporaneo solo su porta 80 per la verifica ACME
docker run --rm -d --name nginx_tmp \
  -p 80:80 \
  -v "$APP_DIR/certbot/www:/var/www/certbot" \
  nginx:alpine \
  sh -c "mkdir -p /var/www/certbot && nginx -g 'daemon off;'" 2>/dev/null || true

mkdir -p "$APP_DIR/certbot/conf" "$APP_DIR/certbot/www"

docker run --rm \
  -v "$APP_DIR/certbot/conf:/etc/letsencrypt" \
  -v "$APP_DIR/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL_CERTBOT" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

docker stop nginx_tmp 2>/dev/null || true
ok "Certificato SSL ottenuto"

# ---------------------------------------------------------------------------
log "7/8 — Build e avvio container produzione..."
cd "$APP_DIR"
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
ok "Container avviati"

# ---------------------------------------------------------------------------
log "8/8 — Cron per backup PostgreSQL su file (extra)..."
(crontab -l 2>/dev/null; echo "0 3 * * * docker exec cnc_maintenance_db pg_dumpall -U postgres | gzip > $APP_DIR/pg_dump_\$(date +\%Y\%m\%d).sql.gz && find $APP_DIR -name 'pg_dump_*.sql.gz' -mtime +7 -delete") | crontab -
ok "Cron backup PostgreSQL configurato (ogni notte alle 03:00)"

# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  Setup completato!                         ${NC}"
echo -e "${GREEN}  Il gestionale è disponibile su:           ${NC}"
echo -e "${GREEN}  https://$DOMAIN                ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Comandi utili:"
echo "  docker-compose -f $APP_DIR/docker-compose.prod.yml ps      # stato container"
echo "  docker-compose -f $APP_DIR/docker-compose.prod.yml logs -f  # log live"
echo "  bash $APP_DIR/deploy.sh --full                             # aggiorna dopo git push"
echo ""
