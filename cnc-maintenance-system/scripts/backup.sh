#!/bin/bash
# =============================================================================
# CNC Maintenance System - Script di Backup
# =============================================================================
# Questo script esegue un backup completo del sistema CNC Maintenance:
#   - Database PostgreSQL (dump SQL)
#   - File caricati (uploads)
#   - File di configurazione
#
# I backup vengono salvati come archivi .tar.gz con data nel nome.
# I backup piu' vecchi di 7 giorni vengono eliminati automaticamente.
#
# Utilizzo:
#   sudo bash scripts/backup.sh
#
# Programmazione automatica (aggiungere a crontab):
#   0 2 * * * /percorso/scripts/backup.sh >> /var/log/cnc-backup.log 2>&1
# =============================================================================

set -euo pipefail

# Colori per l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --------------------------------------------------------------------------
# Configurazione
# --------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_BASE_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR_CURRENT="$BACKUP_BASE_DIR/$DATE"
BACKUP_ARCHIVE="$BACKUP_BASE_DIR/cnc_maintenance_backup_${DATE}.tar.gz"
DAYS_TO_KEEP=7

# Nome dei container Docker
DB_CONTAINER="cnc_maintenance_db"
COMPOSE_FILE="docker-compose.prod.yml"

# --------------------------------------------------------------------------
# Funzioni di utilita'
# --------------------------------------------------------------------------
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

log_warn() {
    echo -e "${YELLOW}[AVVISO]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

log_error() {
    echo -e "${RED}[ERRORE]${NC} $(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# Funzione di pulizia in caso di errore
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Il backup e' fallito con codice di errore: $exit_code"
        # Rimuovi la directory di backup parziale se esiste
        if [[ -d "$BACKUP_DIR_CURRENT" ]]; then
            rm -rf "$BACKUP_DIR_CURRENT"
            log_info "Directory di backup parziale rimossa"
        fi
    fi

    # Riavvia i container se erano stati fermati
    if [[ "${CONTAINERS_STOPPED:-false}" == "true" ]]; then
        log_info "Riavvio dei container Docker..."
        cd "$PROJECT_DIR"
        if [[ -f "$COMPOSE_FILE" ]]; then
            docker compose -f "$COMPOSE_FILE" up -d 2>/dev/null || \
            docker-compose -f "$COMPOSE_FILE" up -d 2>/dev/null || true
        else
            docker compose up -d 2>/dev/null || \
            docker-compose up -d 2>/dev/null || true
        fi
        log_success "Container riavviati"
    fi
}

trap cleanup EXIT

# --------------------------------------------------------------------------
# Inizio del backup
# --------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Backup CNC Maintenance System"
echo " Data: $(date +"%Y-%m-%d %H:%M:%S")"
echo "============================================"
echo ""

# --------------------------------------------------------------------------
# Passo 1: Verifica prerequisiti
# --------------------------------------------------------------------------
log_info "Passo 1/7: Verifica dei prerequisiti..."

if ! command -v docker &> /dev/null; then
    log_error "Docker non e' installato"
    exit 1
fi

# Verifica che i container siano in esecuzione
if ! docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
    log_warn "Il container del database ($DB_CONTAINER) non e' in esecuzione"
    log_warn "Il backup del database verra' saltato"
    DB_RUNNING=false
else
    DB_RUNNING=true
fi

log_success "Prerequisiti verificati"

# --------------------------------------------------------------------------
# Passo 2: Crea la directory di backup
# --------------------------------------------------------------------------
log_info "Passo 2/7: Creazione della directory di backup..."

mkdir -p "$BACKUP_DIR_CURRENT"
log_success "Directory creata: $BACKUP_DIR_CURRENT"

# --------------------------------------------------------------------------
# Passo 3: Backup del database PostgreSQL
# --------------------------------------------------------------------------
log_info "Passo 3/7: Backup del database PostgreSQL..."

if [[ "$DB_RUNNING" == "true" ]]; then
    # Esegui pg_dump all'interno del container
    DB_DUMP_FILE="$BACKUP_DIR_CURRENT/database.sql"

    # Leggi le credenziali dal file .env se disponibile
    DB_USER="postgres"
    DB_NAME="cnc_maintenance"

    if [[ -f "$PROJECT_DIR/.env" ]]; then
        # Carica le variabili dal file .env
        DB_USER=$(grep -E "^(DB_USER|POSTGRES_USER)=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2 || echo "postgres")
        DB_NAME=$(grep -E "^(DB_NAME|POSTGRES_DB)=" "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2 || echo "cnc_maintenance")
        DB_USER="${DB_USER:-postgres}"
        DB_NAME="${DB_NAME:-cnc_maintenance}"
    fi

    # Esegui il dump del database
    docker exec "$DB_CONTAINER" pg_dump \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --verbose \
        > "$BACKUP_DIR_CURRENT/database.dump" 2>/dev/null

    if [[ $? -eq 0 ]]; then
        # Esegui anche un dump SQL leggibile (per emergenze)
        docker exec "$DB_CONTAINER" pg_dump \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --format=plain \
            > "$DB_DUMP_FILE" 2>/dev/null

        DB_SIZE=$(du -sh "$BACKUP_DIR_CURRENT/database.dump" | cut -f1)
        log_success "Database esportato ($DB_SIZE)"
    else
        log_error "Errore durante l'esportazione del database"
    fi
else
    log_warn "Backup del database saltato (container non in esecuzione)"
fi

# --------------------------------------------------------------------------
# Passo 4: Ferma i container per un backup consistente dei volumi
# --------------------------------------------------------------------------
log_info "Passo 4/7: Arresto dei container per backup consistente..."

CONTAINERS_STOPPED=true
cd "$PROJECT_DIR"

if [[ -f "$COMPOSE_FILE" ]]; then
    docker compose -f "$COMPOSE_FILE" stop 2>/dev/null || \
    docker-compose -f "$COMPOSE_FILE" stop 2>/dev/null || true
else
    docker compose stop 2>/dev/null || \
    docker-compose stop 2>/dev/null || true
fi

log_success "Container fermati"

# --------------------------------------------------------------------------
# Passo 5: Backup dei file caricati (uploads)
# --------------------------------------------------------------------------
log_info "Passo 5/7: Backup dei file caricati..."

# Trova il volume degli uploads
UPLOADS_VOLUME=$(docker volume ls --format '{{.Name}}' | grep -E "uploads" | head -1)

if [[ -n "$UPLOADS_VOLUME" ]]; then
    # Copia i file dal volume Docker
    docker run --rm \
        -v "$UPLOADS_VOLUME":/source:ro \
        -v "$BACKUP_DIR_CURRENT":/backup \
        alpine \
        sh -c "cp -a /source /backup/uploads" 2>/dev/null

    if [[ -d "$BACKUP_DIR_CURRENT/uploads" ]]; then
        UPLOADS_SIZE=$(du -sh "$BACKUP_DIR_CURRENT/uploads" | cut -f1)
        UPLOADS_COUNT=$(find "$BACKUP_DIR_CURRENT/uploads" -type f | wc -l)
        log_success "File caricati esportati ($UPLOADS_COUNT file, $UPLOADS_SIZE)"
    else
        log_warn "Nessun file caricato trovato"
    fi
else
    log_warn "Volume degli uploads non trovato"
    # Prova a copiare dalla directory locale
    if [[ -d "$PROJECT_DIR/uploads" ]]; then
        cp -a "$PROJECT_DIR/uploads" "$BACKUP_DIR_CURRENT/uploads"
        log_success "File caricati copiati dalla directory locale"
    fi
fi

# --------------------------------------------------------------------------
# Passo 6: Backup dei file di configurazione
# --------------------------------------------------------------------------
log_info "Passo 6/7: Backup dei file di configurazione..."

CONFIG_DIR="$BACKUP_DIR_CURRENT/config"
mkdir -p "$CONFIG_DIR"

# Lista dei file di configurazione da salvare
CONFIG_FILES=(
    ".env"
    "docker-compose.yml"
    "docker-compose.prod.yml"
    "nginx-ssl.conf"
    "backend/.env"
    "backend/package.json"
    "frontend/package.json"
)

CONFIG_COUNT=0
for config_file in "${CONFIG_FILES[@]}"; do
    if [[ -f "$PROJECT_DIR/$config_file" ]]; then
        # Crea la struttura delle directory necessaria
        config_subdir=$(dirname "$config_file")
        if [[ "$config_subdir" != "." ]]; then
            mkdir -p "$CONFIG_DIR/$config_subdir"
        fi
        cp "$PROJECT_DIR/$config_file" "$CONFIG_DIR/$config_file"
        ((CONFIG_COUNT++))
    fi
done

# Backup della directory certbot se esiste
if [[ -d "$PROJECT_DIR/certbot" ]]; then
    cp -a "$PROJECT_DIR/certbot" "$CONFIG_DIR/certbot"
    log_success "Certificati SSL salvati"
fi

# Backup degli script
if [[ -d "$PROJECT_DIR/scripts" ]]; then
    cp -a "$PROJECT_DIR/scripts" "$CONFIG_DIR/scripts"
fi

log_success "File di configurazione salvati ($CONFIG_COUNT file)"

# --------------------------------------------------------------------------
# Passo 7: Crea l'archivio compresso
# --------------------------------------------------------------------------
log_info "Passo 7/7: Creazione dell'archivio compresso..."

cd "$BACKUP_BASE_DIR"
tar -czf "$BACKUP_ARCHIVE" "$DATE/"

if [[ -f "$BACKUP_ARCHIVE" ]]; then
    ARCHIVE_SIZE=$(du -sh "$BACKUP_ARCHIVE" | cut -f1)
    log_success "Archivio creato: $BACKUP_ARCHIVE ($ARCHIVE_SIZE)"

    # Rimuovi la directory temporanea (mantieni solo l'archivio)
    rm -rf "$BACKUP_DIR_CURRENT"
    log_success "Directory temporanea rimossa"
else
    log_error "Errore nella creazione dell'archivio"
    exit 1
fi

# --------------------------------------------------------------------------
# Pulizia dei backup vecchi
# --------------------------------------------------------------------------
log_info "Pulizia dei backup piu' vecchi di $DAYS_TO_KEEP giorni..."

OLD_BACKUPS=$(find "$BACKUP_BASE_DIR" -name "cnc_maintenance_backup_*.tar.gz" -mtime +${DAYS_TO_KEEP} -type f 2>/dev/null)

if [[ -n "$OLD_BACKUPS" ]]; then
    OLD_COUNT=$(echo "$OLD_BACKUPS" | wc -l)
    echo "$OLD_BACKUPS" | xargs rm -f
    log_success "Rimossi $OLD_COUNT backup vecchi"
else
    log_info "Nessun backup vecchio da rimuovere"
fi

# Mostra i backup esistenti
echo ""
log_info "Backup disponibili:"
ls -lh "$BACKUP_BASE_DIR"/cnc_maintenance_backup_*.tar.gz 2>/dev/null | while read -r line; do
    echo "  $line"
done

# --------------------------------------------------------------------------
# I container verranno riavviati dalla funzione cleanup (trap EXIT)
# --------------------------------------------------------------------------

echo ""
echo "============================================"
echo " Backup Completato con Successo!"
echo "============================================"
echo ""
log_success "Archivio: $BACKUP_ARCHIVE"
log_success "Dimensione: $ARCHIVE_SIZE"
echo ""
log_info "Per ripristinare il backup:"
echo "  1. Estrarre l'archivio:"
echo "     tar -xzf $BACKUP_ARCHIVE -C /tmp/"
echo ""
echo "  2. Ripristinare il database:"
echo "     docker exec -i $DB_CONTAINER pg_restore -U postgres -d cnc_maintenance < /tmp/$DATE/database.dump"
echo ""
echo "  3. Ripristinare i file caricati:"
echo "     docker cp /tmp/$DATE/uploads/. cnc_maintenance_backend:/app/uploads/"
echo ""
log_info "Per automatizzare il backup (ogni notte alle 2:00):"
echo "     echo '0 2 * * * $SCRIPT_DIR/backup.sh >> /var/log/cnc-backup.log 2>&1' | crontab -"
echo ""
