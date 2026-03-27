#!/bin/bash
# =============================================================================
# CNC Maintenance System - Script di Configurazione Firewall (UFW)
# =============================================================================
# Questo script configura il firewall UFW per proteggere il server.
# Apre solo le porte necessarie per il funzionamento del sistema:
#   - SSH (22)       : Accesso remoto al server
#   - HTTP (80)      : Reindirizzamento a HTTPS e verifica Let's Encrypt
#   - HTTPS (443)    : Traffico web cifrato
#   - WireGuard (51820/udp) : VPN per accesso sicuro alla rete interna
#
# Utilizzo:
#   sudo bash scripts/setup-firewall.sh
#
# ATTENZIONE: Assicurati di avere un accesso alternativo al server
# (es. console KVM) nel caso in cui la connessione SSH venga interrotta.
# =============================================================================

set -euo pipefail

# Colori per l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo ""
echo "============================================"
echo " Configurazione Firewall UFW"
echo " CNC Maintenance System"
echo "============================================"
echo ""

log_warn "ATTENZIONE: La configurazione del firewall potrebbe interrompere"
log_warn "la connessione SSH se non configurata correttamente."
log_warn "Assicurati di avere un accesso alternativo al server (console KVM)."
echo ""

read -rp "Vuoi procedere con la configurazione del firewall? (s/n): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" && "$CONFIRM" != "si" && "$CONFIRM" != "SI" ]]; then
    log_warn "Operazione annullata dall'utente"
    exit 0
fi

# --------------------------------------------------------------------------
# Passo 1: Installa UFW se non presente
# --------------------------------------------------------------------------
log_info "Passo 1/7: Verifica installazione UFW..."

if command -v ufw &> /dev/null; then
    log_success "UFW e' gia' installato"
else
    log_info "Installazione di UFW in corso..."
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq ufw
    elif command -v dnf &> /dev/null; then
        dnf install -y -q ufw
    elif command -v yum &> /dev/null; then
        yum install -y -q ufw
    else
        log_error "Gestore pacchetti non supportato. Installa UFW manualmente."
        exit 1
    fi
    log_success "UFW installato con successo"
fi

# --------------------------------------------------------------------------
# Passo 2: Resetta le regole esistenti
# --------------------------------------------------------------------------
log_info "Passo 2/7: Reset delle regole firewall esistenti..."

# Disabilita temporaneamente UFW per evitare problemi durante la configurazione
ufw --force disable > /dev/null 2>&1 || true

# Resetta tutte le regole precedenti
ufw --force reset > /dev/null 2>&1

log_success "Regole firewall resettate"

# --------------------------------------------------------------------------
# Passo 3: Configura le politiche predefinite
# --------------------------------------------------------------------------
log_info "Passo 3/7: Configurazione delle politiche predefinite..."

# Blocca tutto il traffico in entrata per impostazione predefinita
ufw default deny incoming
log_success "Traffico in entrata: BLOCCATO per default"

# Consenti tutto il traffico in uscita
ufw default allow outgoing
log_success "Traffico in uscita: CONSENTITO per default"

# Blocca il traffico di routing/forwarding per default
ufw default deny routed
log_success "Traffico di routing: BLOCCATO per default"

# --------------------------------------------------------------------------
# Passo 4: Consenti SSH (porta 22)
# --------------------------------------------------------------------------
log_info "Passo 4/7: Apertura porta SSH (22/tcp)..."

# Consenti SSH con limite di connessioni (protezione brute-force)
# UFW limita automaticamente a 6 connessioni in 30 secondi dallo stesso IP
ufw limit ssh comment "SSH - Accesso remoto con protezione brute-force"
log_success "SSH (porta 22) consentito con rate limiting"

# --------------------------------------------------------------------------
# Passo 5: Consenti HTTP e HTTPS (porte 80 e 443)
# --------------------------------------------------------------------------
log_info "Passo 5/7: Apertura porte HTTP (80) e HTTPS (443)..."

ufw allow 80/tcp comment "HTTP - Reindirizzamento a HTTPS e verifica Let's Encrypt"
log_success "HTTP (porta 80) consentito"

ufw allow 443/tcp comment "HTTPS - Traffico web cifrato"
log_success "HTTPS (porta 443) consentito"

# --------------------------------------------------------------------------
# Passo 6: Consenti WireGuard VPN (porta 51820)
# --------------------------------------------------------------------------
log_info "Passo 6/7: Apertura porta WireGuard VPN (51820/udp)..."

ufw allow 51820/udp comment "WireGuard VPN - Accesso sicuro alla rete interna"
log_success "WireGuard (porta 51820/udp) consentito"

# --------------------------------------------------------------------------
# Passo 7: Abilita UFW
# --------------------------------------------------------------------------
log_info "Passo 7/7: Attivazione del firewall..."

# Abilita UFW (la flag --force evita la richiesta di conferma interattiva)
ufw --force enable
log_success "Firewall UFW attivato!"

# --------------------------------------------------------------------------
# Configura il logging
# --------------------------------------------------------------------------
log_info "Configurazione del logging del firewall..."
ufw logging on
ufw logging low
log_success "Logging del firewall attivato (livello: low)"

# --------------------------------------------------------------------------
# Riepilogo delle regole
# --------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Configurazione Firewall Completata!"
echo "============================================"
echo ""
log_info "Regole attive:"
echo ""
ufw status verbose
echo ""

# --------------------------------------------------------------------------
# Verifica delle porte
# --------------------------------------------------------------------------
log_info "Riepilogo porte aperte:"
echo "  - SSH        : 22/tcp   (con rate limiting)"
echo "  - HTTP       : 80/tcp   (reindirizzamento a HTTPS)"
echo "  - HTTPS      : 443/tcp  (traffico cifrato)"
echo "  - WireGuard  : 51820/udp (VPN)"
echo ""
log_info "Tutto il resto del traffico in entrata e' BLOCCATO."
log_info "Tutto il traffico in uscita e' CONSENTITO."
echo ""

# --------------------------------------------------------------------------
# Suggerimenti aggiuntivi
# --------------------------------------------------------------------------
log_info "Comandi utili per la gestione del firewall:"
echo "  ufw status verbose       - Mostra lo stato dettagliato"
echo "  ufw status numbered      - Mostra le regole con numeri"
echo "  ufw delete <numero>      - Elimina una regola specifica"
echo "  ufw allow from <IP>      - Consenti traffico da un IP specifico"
echo "  ufw deny from <IP>       - Blocca traffico da un IP specifico"
echo "  ufw reload               - Ricarica le regole"
echo "  ufw disable              - Disabilita il firewall"
echo ""
log_warn "NOTA: Se perdi l'accesso SSH, usa la console KVM del provider"
log_warn "per accedere al server e correggere la configurazione."
echo ""
