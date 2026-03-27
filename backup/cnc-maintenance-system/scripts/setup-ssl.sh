#!/bin/bash
# =============================================================================
# CNC Maintenance System - Script di Configurazione SSL/TLS
# =============================================================================
# Questo script installa Certbot, ottiene un certificato SSL da Let's Encrypt,
# configura il rinnovo automatico e prepara Nginx per la produzione.
#
# Utilizzo:
#   sudo bash scripts/setup-ssl.sh
#
# Prerequisiti:
#   - Server con accesso root
#   - Dominio configurato con DNS che punta al server
#   - Porte 80 e 443 aperte nel firewall
# =============================================================================

set -euo pipefail

# Colori per l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Nessun colore

# --------------------------------------------------------------------------
# Funzioni di utilita'
# --------------------------------------------------------------------------
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[AVVISO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERRORE]${NC} $1"
}

# --------------------------------------------------------------------------
# Verifica che lo script venga eseguito come root
# --------------------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
    log_error "Questo script deve essere eseguito come root (sudo)"
    exit 1
fi

# --------------------------------------------------------------------------
# Directory del progetto
# --------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_info "Directory del progetto: $PROJECT_DIR"

# --------------------------------------------------------------------------
# Richiedi il dominio all'utente
# --------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Configurazione SSL per CNC Maintenance"
echo "============================================"
echo ""

read -rp "Inserisci il nome del dominio (es. cnc.tuodominio.com): " DOMAIN

if [[ -z "$DOMAIN" ]]; then
    log_error "Il nome del dominio non puo' essere vuoto"
    exit 1
fi

read -rp "Inserisci l'indirizzo email per le notifiche SSL (es. admin@tuodominio.com): " EMAIL

if [[ -z "$EMAIL" ]]; then
    log_error "L'indirizzo email non puo' essere vuoto"
    exit 1
fi

echo ""
log_info "Dominio: $DOMAIN"
log_info "Email: $EMAIL"
echo ""

read -rp "Confermi i dati? (s/n): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" && "$CONFIRM" != "si" && "$CONFIRM" != "SI" ]]; then
    log_warn "Operazione annullata dall'utente"
    exit 0
fi

# --------------------------------------------------------------------------
# Passo 1: Installa Certbot
# --------------------------------------------------------------------------
log_info "Passo 1/5: Installazione di Certbot..."

if command -v certbot &> /dev/null; then
    log_success "Certbot e' gia' installato: $(certbot --version 2>&1)"
else
    # Rileva il gestore pacchetti
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq certbot python3-certbot-nginx
    elif command -v dnf &> /dev/null; then
        dnf install -y -q certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        yum install -y -q certbot python3-certbot-nginx
    else
        log_error "Gestore pacchetti non supportato. Installa Certbot manualmente."
        exit 1
    fi
    log_success "Certbot installato con successo"
fi

# --------------------------------------------------------------------------
# Passo 2: Crea le directory necessarie per Certbot
# --------------------------------------------------------------------------
log_info "Passo 2/5: Creazione delle directory per i certificati..."

mkdir -p "$PROJECT_DIR/certbot/conf"
mkdir -p "$PROJECT_DIR/certbot/www"

log_success "Directory create"

# --------------------------------------------------------------------------
# Passo 3: Aggiorna la configurazione Nginx con il dominio corretto
# --------------------------------------------------------------------------
log_info "Passo 3/5: Aggiornamento della configurazione Nginx..."

if [[ -f "$PROJECT_DIR/nginx-ssl.conf" ]]; then
    # Sostituisci il placeholder ${DOMAIN} con il dominio reale
    sed -i "s/\${DOMAIN}/$DOMAIN/g" "$PROJECT_DIR/nginx-ssl.conf"
    log_success "Configurazione Nginx aggiornata con il dominio: $DOMAIN"
else
    log_error "File nginx-ssl.conf non trovato in $PROJECT_DIR"
    exit 1
fi

# --------------------------------------------------------------------------
# Passo 4: Ottieni il certificato SSL iniziale
# --------------------------------------------------------------------------
log_info "Passo 4/5: Ottenimento del certificato SSL da Let's Encrypt..."

# Verifica se Docker e' in esecuzione e ferma i container che usano la porta 80
if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "cnc_maintenance_nginx"; then
        log_warn "Fermo temporaneamente il container Nginx per ottenere il certificato..."
        docker stop cnc_maintenance_nginx 2>/dev/null || true
    fi
fi

# Ottieni il certificato usando la modalita' standalone
# (Certbot avvia il proprio server web temporaneo sulla porta 80)
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    --preferred-challenges http \
    --rsa-key-size 4096

if [[ $? -eq 0 ]]; then
    log_success "Certificato SSL ottenuto con successo!"
else
    log_error "Errore nell'ottenimento del certificato. Verifica che:"
    log_error "  - Il dominio $DOMAIN punti a questo server"
    log_error "  - La porta 80 sia aperta nel firewall"
    log_error "  - Non ci siano altri servizi sulla porta 80"
    exit 1
fi

# Copia i certificati nella directory del progetto per Docker
log_info "Copia dei certificati nella directory del progetto..."
cp -rL /etc/letsencrypt/live "$PROJECT_DIR/certbot/conf/" 2>/dev/null || true
cp -rL /etc/letsencrypt/archive "$PROJECT_DIR/certbot/conf/" 2>/dev/null || true
cp -r /etc/letsencrypt/renewal "$PROJECT_DIR/certbot/conf/" 2>/dev/null || true

# Imposta i permessi corretti
chmod -R 755 "$PROJECT_DIR/certbot/conf"

log_success "Certificati copiati nella directory del progetto"

# --------------------------------------------------------------------------
# Passo 5: Configura il rinnovo automatico con cron
# --------------------------------------------------------------------------
log_info "Passo 5/5: Configurazione del rinnovo automatico..."

# Crea uno script di rinnovo che ricarica anche Nginx
RENEW_SCRIPT="/usr/local/bin/cnc-ssl-renew.sh"
cat > "$RENEW_SCRIPT" << 'RENEW_EOF'
#!/bin/bash
# Script di rinnovo automatico SSL per CNC Maintenance System
# Eseguito automaticamente da cron ogni 12 ore

LOG_FILE="/var/log/cnc-ssl-renew.log"

echo "$(date): Avvio rinnovo certificati SSL..." >> "$LOG_FILE"

# Rinnova il certificato
certbot renew --quiet --deploy-hook "docker exec cnc_maintenance_nginx nginx -s reload" 2>> "$LOG_FILE"

if [[ $? -eq 0 ]]; then
    echo "$(date): Rinnovo completato con successo" >> "$LOG_FILE"
else
    echo "$(date): ERRORE durante il rinnovo" >> "$LOG_FILE"
fi
RENEW_EOF

chmod +x "$RENEW_SCRIPT"

# Aggiungi il cron job (controlla ogni 12 ore)
CRON_JOB="0 */12 * * * $RENEW_SCRIPT"

# Verifica se il cron job esiste gia'
if crontab -l 2>/dev/null | grep -q "cnc-ssl-renew"; then
    log_warn "Il cron job di rinnovo SSL esiste gia'"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log_success "Cron job di rinnovo automatico configurato (ogni 12 ore)"
fi

# --------------------------------------------------------------------------
# Riepilogo finale
# --------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Configurazione SSL Completata!"
echo "============================================"
echo ""
log_success "Dominio: $DOMAIN"
log_success "Certificato: /etc/letsencrypt/live/$DOMAIN/"
log_success "Rinnovo automatico: ogni 12 ore tramite cron"
echo ""
log_info "Prossimi passi:"
echo "  1. Aggiorna il file .env con CORS_ORIGIN=https://$DOMAIN"
echo "  2. Avvia i container di produzione:"
echo "     cd $PROJECT_DIR"
echo "     docker compose -f docker-compose.prod.yml up -d"
echo ""
log_info "Per verificare lo stato SSL:"
echo "     curl -vI https://$DOMAIN 2>&1 | grep -E 'SSL|certificate|subject'"
echo ""
log_info "Per verificare il rinnovo:"
echo "     certbot renew --dry-run"
echo ""
