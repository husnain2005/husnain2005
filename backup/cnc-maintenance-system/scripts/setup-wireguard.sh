#!/bin/bash
# =============================================================================
# CNC Maintenance System - Script di Configurazione WireGuard VPN
# =============================================================================
# Questo script installa e configura WireGuard come server VPN.
# La VPN permette l'accesso sicuro al server e ai servizi interni.
#
# Rete VPN:
#   - Subnet:  10.0.0.0/24
#   - Server:  10.0.0.1
#   - Client:  10.0.0.2 in poi
#
# Utilizzo:
#   sudo bash scripts/setup-wireguard.sh
#
# Dopo l'installazione, usa add-vpn-client.sh per aggiungere client:
#   sudo bash scripts/add-vpn-client.sh nome_client
# =============================================================================

set -euo pipefail

# Colori per l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --------------------------------------------------------------------------
# Configurazione della rete VPN
# --------------------------------------------------------------------------
WG_INTERFACE="wg0"
WG_PORT="51820"
WG_SUBNET="10.0.0.0/24"
WG_SERVER_IP="10.0.0.1"
WG_CONFIG_DIR="/etc/wireguard"
WG_CLIENTS_DIR="/etc/wireguard/clients"

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
echo " Configurazione WireGuard VPN"
echo " CNC Maintenance System"
echo "============================================"
echo ""

# --------------------------------------------------------------------------
# Rileva l'interfaccia di rete principale e l'IP pubblico
# --------------------------------------------------------------------------
log_info "Rilevamento dell'interfaccia di rete e IP pubblico..."

# Trova l'interfaccia di rete principale (quella con la rotta di default)
SERVER_INTERFACE=$(ip -4 route show default | awk '{print $5}' | head -n1)

if [[ -z "$SERVER_INTERFACE" ]]; then
    log_error "Impossibile rilevare l'interfaccia di rete principale"
    exit 1
fi

log_success "Interfaccia di rete: $SERVER_INTERFACE"

# Rileva l'IP pubblico del server
SERVER_PUBLIC_IP=$(curl -s -4 https://ifconfig.me 2>/dev/null || curl -s -4 https://api.ipify.org 2>/dev/null || echo "")

if [[ -z "$SERVER_PUBLIC_IP" ]]; then
    log_warn "Impossibile rilevare automaticamente l'IP pubblico"
    read -rp "Inserisci l'IP pubblico del server: " SERVER_PUBLIC_IP
fi

log_success "IP pubblico del server: $SERVER_PUBLIC_IP"
echo ""

read -rp "Confermi la configurazione? (s/n): " CONFIRM
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "S" && "$CONFIRM" != "si" && "$CONFIRM" != "SI" ]]; then
    log_warn "Operazione annullata dall'utente"
    exit 0
fi

# --------------------------------------------------------------------------
# Passo 1: Installa WireGuard
# --------------------------------------------------------------------------
log_info "Passo 1/6: Installazione di WireGuard..."

if command -v wg &> /dev/null; then
    log_success "WireGuard e' gia' installato: $(wg --version 2>&1 || echo 'versione sconosciuta')"
else
    if command -v apt-get &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq wireguard wireguard-tools qrencode
    elif command -v dnf &> /dev/null; then
        dnf install -y -q wireguard-tools qrencode
    elif command -v yum &> /dev/null; then
        yum install -y -q epel-release
        yum install -y -q wireguard-tools qrencode
    elif command -v pacman &> /dev/null; then
        pacman -S --noconfirm wireguard-tools qrencode
    else
        log_error "Gestore pacchetti non supportato. Installa WireGuard manualmente."
        exit 1
    fi
    log_success "WireGuard installato con successo"
fi

# Installa qrencode per generare codici QR (opzionale)
if ! command -v qrencode &> /dev/null; then
    log_info "Installazione di qrencode (per codici QR dei client)..."
    if command -v apt-get &> /dev/null; then
        apt-get install -y -qq qrencode 2>/dev/null || log_warn "qrencode non disponibile"
    fi
fi

# --------------------------------------------------------------------------
# Passo 2: Genera le chiavi del server
# --------------------------------------------------------------------------
log_info "Passo 2/6: Generazione delle chiavi crittografiche del server..."

mkdir -p "$WG_CONFIG_DIR"
mkdir -p "$WG_CLIENTS_DIR"
chmod 700 "$WG_CONFIG_DIR"

# Genera la coppia di chiavi del server
SERVER_PRIVATE_KEY=$(wg genkey)
SERVER_PUBLIC_KEY=$(echo "$SERVER_PRIVATE_KEY" | wg pubkey)

# Salva le chiavi in file separati (per riferimento futuro)
echo "$SERVER_PRIVATE_KEY" > "$WG_CONFIG_DIR/server_private.key"
echo "$SERVER_PUBLIC_KEY" > "$WG_CONFIG_DIR/server_public.key"
chmod 600 "$WG_CONFIG_DIR/server_private.key"
chmod 644 "$WG_CONFIG_DIR/server_public.key"

log_success "Chiavi del server generate"
log_info "Chiave pubblica del server: $SERVER_PUBLIC_KEY"

# --------------------------------------------------------------------------
# Passo 3: Configura IP Forwarding
# --------------------------------------------------------------------------
log_info "Passo 3/6: Configurazione dell'IP forwarding..."

# Abilita l'inoltro dei pacchetti IP (necessario per la VPN)
if ! grep -q "^net.ipv4.ip_forward = 1" /etc/sysctl.conf 2>/dev/null; then
    echo "" >> /etc/sysctl.conf
    echo "# WireGuard VPN - Abilitazione IP forwarding" >> /etc/sysctl.conf
    echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
fi

if ! grep -q "^net.ipv6.conf.all.forwarding = 1" /etc/sysctl.conf 2>/dev/null; then
    echo "net.ipv6.conf.all.forwarding = 1" >> /etc/sysctl.conf
fi

# Applica le modifiche immediatamente
sysctl -p > /dev/null 2>&1

log_success "IP forwarding abilitato"

# --------------------------------------------------------------------------
# Passo 4: Crea la configurazione del server WireGuard
# --------------------------------------------------------------------------
log_info "Passo 4/6: Creazione della configurazione del server..."

cat > "$WG_CONFIG_DIR/$WG_INTERFACE.conf" << EOF
# =============================================================================
# WireGuard Server - CNC Maintenance System
# =============================================================================
# Configurazione generata automaticamente il $(date +"%Y-%m-%d %H:%M:%S")
#
# Rete VPN: $WG_SUBNET
# Server:   $WG_SERVER_IP
# Porta:    $WG_PORT
# =============================================================================

[Interface]
# Chiave privata del server (NON condividere mai!)
PrivateKey = $SERVER_PRIVATE_KEY

# Indirizzo IP del server nella rete VPN
Address = ${WG_SERVER_IP}/24

# Porta di ascolto per le connessioni VPN
ListenPort = $WG_PORT

# Regole iptables per il NAT (permettono ai client VPN di accedere a Internet)
PostUp = iptables -t nat -A POSTROUTING -o $SERVER_INTERFACE -j MASQUERADE
PostUp = iptables -A FORWARD -i %i -j ACCEPT
PostUp = iptables -A FORWARD -o %i -j ACCEPT

PostDown = iptables -t nat -D POSTROUTING -o $SERVER_INTERFACE -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT
PostDown = iptables -D FORWARD -o %i -j ACCEPT

# Comando di salvataggio automatico della configurazione
SaveConfig = false

# --------------------------------------------------------------------------
# I peer (client) vengono aggiunti sotto questa riga
# Usa lo script add-vpn-client.sh per aggiungere nuovi client
# --------------------------------------------------------------------------
EOF

chmod 600 "$WG_CONFIG_DIR/$WG_INTERFACE.conf"
log_success "Configurazione del server creata: $WG_CONFIG_DIR/$WG_INTERFACE.conf"

# --------------------------------------------------------------------------
# Passo 5: Crea il template per la configurazione dei client
# --------------------------------------------------------------------------
log_info "Passo 5/6: Creazione del template per i client..."

cat > "$WG_CLIENTS_DIR/client_template.conf" << EOF
# =============================================================================
# WireGuard Client - CNC Maintenance System
# =============================================================================
# Template di configurazione per i client VPN
# NON usare direttamente! Usa lo script add-vpn-client.sh
# =============================================================================

[Interface]
# Chiave privata del client (generata automaticamente)
PrivateKey = CLIENT_PRIVATE_KEY

# Indirizzo IP del client nella rete VPN
Address = CLIENT_IP/24

# Server DNS da usare quando connessi alla VPN
DNS = 1.1.1.1, 8.8.8.8

[Peer]
# Chiave pubblica del server
PublicKey = $SERVER_PUBLIC_KEY

# Endpoint del server (IP:porta)
Endpoint = ${SERVER_PUBLIC_IP}:${WG_PORT}

# Indirizzare tutto il traffico attraverso la VPN (tunnel completo)
# Per accedere solo alla rete VPN, usare: AllowedIPs = $WG_SUBNET
AllowedIPs = 0.0.0.0/0

# Invia un pacchetto keepalive ogni 25 secondi (mantiene la connessione attiva)
PersistentKeepalive = 25
EOF

log_success "Template client creato: $WG_CLIENTS_DIR/client_template.conf"

# Salva il contatore dei client (inizia da 2, perche' 1 e' il server)
echo "2" > "$WG_CLIENTS_DIR/next_ip"
chmod 600 "$WG_CLIENTS_DIR/next_ip"

# --------------------------------------------------------------------------
# Passo 6: Avvia il servizio WireGuard
# --------------------------------------------------------------------------
log_info "Passo 6/6: Avvio del servizio WireGuard..."

# Abilita il servizio all'avvio del sistema
systemctl enable wg-quick@${WG_INTERFACE} 2>/dev/null || true

# Avvia il servizio
wg-quick up ${WG_INTERFACE} 2>/dev/null || {
    log_warn "Impossibile avviare WireGuard ora (potrebbe essere necessario il modulo kernel)"
    log_warn "Prova a riavviare il server e poi esegui: wg-quick up ${WG_INTERFACE}"
}

# Verifica lo stato
if ip link show ${WG_INTERFACE} &>/dev/null; then
    log_success "WireGuard in esecuzione sull'interfaccia ${WG_INTERFACE}"
else
    log_warn "L'interfaccia ${WG_INTERFACE} non e' ancora attiva"
fi

# --------------------------------------------------------------------------
# Riepilogo finale
# --------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Configurazione WireGuard Completata!"
echo "============================================"
echo ""
log_success "Server VPN configurato con successo"
echo ""
log_info "Dettagli della configurazione:"
echo "  - Interfaccia:     $WG_INTERFACE"
echo "  - IP server VPN:   $WG_SERVER_IP"
echo "  - Subnet VPN:      $WG_SUBNET"
echo "  - Porta:           $WG_PORT/udp"
echo "  - IP pubblico:     $SERVER_PUBLIC_IP"
echo "  - Chiave pubblica: $SERVER_PUBLIC_KEY"
echo ""
log_info "Per aggiungere un nuovo client VPN:"
echo "  sudo bash scripts/add-vpn-client.sh <nome_client>"
echo ""
log_info "Comandi utili:"
echo "  wg show                    - Mostra lo stato di WireGuard"
echo "  wg-quick down $WG_INTERFACE         - Ferma WireGuard"
echo "  wg-quick up $WG_INTERFACE           - Avvia WireGuard"
echo "  systemctl status wg-quick@$WG_INTERFACE - Stato del servizio"
echo ""
log_warn "IMPORTANTE: Assicurati che la porta $WG_PORT/udp sia aperta nel firewall!"
log_warn "Esegui setup-firewall.sh se non l'hai gia' fatto."
echo ""
