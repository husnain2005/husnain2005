#!/bin/bash
# =============================================================================
# CNC Maintenance System - Aggiunta Client WireGuard VPN
# =============================================================================
# Questo script aggiunge un nuovo client alla VPN WireGuard.
# Genera automaticamente le chiavi, aggiorna la configurazione del server
# e crea il file di configurazione del client.
#
# Utilizzo:
#   sudo bash scripts/add-vpn-client.sh <nome_client>
#
# Esempio:
#   sudo bash scripts/add-vpn-client.sh laptop_marco
#   sudo bash scripts/add-vpn-client.sh telefono_paolo
#
# Output:
#   - File di configurazione: /etc/wireguard/clients/<nome>.conf
#   - Codice QR (se qrencode e' installato) per configurazione mobile
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
WG_INTERFACE="wg0"
WG_CONFIG_DIR="/etc/wireguard"
WG_CLIENTS_DIR="/etc/wireguard/clients"
WG_SERVER_CONFIG="$WG_CONFIG_DIR/$WG_INTERFACE.conf"

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
# Verifica argomenti
# --------------------------------------------------------------------------
if [[ $# -lt 1 ]]; then
    log_error "Nome del client non specificato"
    echo ""
    echo "Utilizzo: $0 <nome_client>"
    echo ""
    echo "Esempio:"
    echo "  $0 laptop_marco"
    echo "  $0 telefono_paolo"
    echo "  $0 workstation_officina"
    echo ""
    exit 1
fi

CLIENT_NAME="$1"

# Valida il nome del client (solo lettere, numeri, trattini e underscore)
if [[ ! "$CLIENT_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    log_error "Il nome del client puo' contenere solo lettere, numeri, trattini e underscore"
    exit 1
fi

# --------------------------------------------------------------------------
# Verifica prerequisiti
# --------------------------------------------------------------------------
if [[ ! -f "$WG_SERVER_CONFIG" ]]; then
    log_error "Configurazione del server WireGuard non trovata: $WG_SERVER_CONFIG"
    log_error "Esegui prima setup-wireguard.sh"
    exit 1
fi

if [[ ! -d "$WG_CLIENTS_DIR" ]]; then
    log_error "Directory dei client non trovata: $WG_CLIENTS_DIR"
    log_error "Esegui prima setup-wireguard.sh"
    exit 1
fi

# Verifica che il client non esista gia'
CLIENT_CONFIG="$WG_CLIENTS_DIR/${CLIENT_NAME}.conf"
if [[ -f "$CLIENT_CONFIG" ]]; then
    log_error "Un client con il nome '$CLIENT_NAME' esiste gia'"
    log_error "File: $CLIENT_CONFIG"
    exit 1
fi

echo ""
echo "============================================"
echo " Aggiunta Client VPN: $CLIENT_NAME"
echo " CNC Maintenance System"
echo "============================================"
echo ""

# --------------------------------------------------------------------------
# Passo 1: Determina il prossimo indirizzo IP disponibile
# --------------------------------------------------------------------------
log_info "Passo 1/4: Assegnazione dell'indirizzo IP..."

NEXT_IP_FILE="$WG_CLIENTS_DIR/next_ip"

if [[ -f "$NEXT_IP_FILE" ]]; then
    NEXT_IP=$(cat "$NEXT_IP_FILE")
else
    # Se il file non esiste, conta i peer esistenti e calcola il prossimo IP
    PEER_COUNT=$(grep -c "^\[Peer\]" "$WG_SERVER_CONFIG" 2>/dev/null || echo "0")
    NEXT_IP=$((PEER_COUNT + 2))
fi

# Verifica che l'IP sia nel range valido (2-254)
if [[ "$NEXT_IP" -gt 254 ]]; then
    log_error "Numero massimo di client raggiunto (253). Non e' possibile aggiungere altri client."
    exit 1
fi

CLIENT_IP="10.0.0.${NEXT_IP}"
log_success "IP assegnato al client: $CLIENT_IP"

# Aggiorna il contatore per il prossimo client
echo $((NEXT_IP + 1)) > "$NEXT_IP_FILE"

# --------------------------------------------------------------------------
# Passo 2: Genera le chiavi del client
# --------------------------------------------------------------------------
log_info "Passo 2/4: Generazione delle chiavi crittografiche..."

CLIENT_PRIVATE_KEY=$(wg genkey)
CLIENT_PUBLIC_KEY=$(echo "$CLIENT_PRIVATE_KEY" | wg pubkey)
CLIENT_PRESHARED_KEY=$(wg genpsk)

# Salva le chiavi del client
echo "$CLIENT_PRIVATE_KEY" > "$WG_CLIENTS_DIR/${CLIENT_NAME}_private.key"
echo "$CLIENT_PUBLIC_KEY" > "$WG_CLIENTS_DIR/${CLIENT_NAME}_public.key"
echo "$CLIENT_PRESHARED_KEY" > "$WG_CLIENTS_DIR/${CLIENT_NAME}_preshared.key"
chmod 600 "$WG_CLIENTS_DIR/${CLIENT_NAME}_private.key"
chmod 600 "$WG_CLIENTS_DIR/${CLIENT_NAME}_preshared.key"

log_success "Chiavi generate per: $CLIENT_NAME"

# --------------------------------------------------------------------------
# Passo 3: Aggiungi il peer alla configurazione del server
# --------------------------------------------------------------------------
log_info "Passo 3/4: Aggiunta del peer alla configurazione del server..."

# Leggi la chiave pubblica del server e l'endpoint dalla configurazione
SERVER_PUBLIC_KEY=$(cat "$WG_CONFIG_DIR/server_public.key")
SERVER_PORT=$(grep "^ListenPort" "$WG_SERVER_CONFIG" | awk '{print $3}')
SERVER_ENDPOINT=$(grep "^Endpoint" "$WG_CLIENTS_DIR/client_template.conf" 2>/dev/null | awk '{print $3}' | cut -d: -f1)

# Se non riesce a trovare l'endpoint dal template, prova a rilevarlo
if [[ -z "$SERVER_ENDPOINT" ]]; then
    SERVER_ENDPOINT=$(curl -s -4 https://ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
fi

# Aggiungi il peer alla configurazione del server
cat >> "$WG_SERVER_CONFIG" << EOF

# Client: $CLIENT_NAME (aggiunto il $(date +"%Y-%m-%d %H:%M:%S"))
[Peer]
PublicKey = $CLIENT_PUBLIC_KEY
PresharedKey = $CLIENT_PRESHARED_KEY
AllowedIPs = ${CLIENT_IP}/32
EOF

log_success "Peer aggiunto alla configurazione del server"

# --------------------------------------------------------------------------
# Passo 4: Crea il file di configurazione del client
# --------------------------------------------------------------------------
log_info "Passo 4/4: Creazione del file di configurazione del client..."

cat > "$CLIENT_CONFIG" << EOF
# =============================================================================
# WireGuard Client: $CLIENT_NAME
# CNC Maintenance System
# =============================================================================
# Generato il: $(date +"%Y-%m-%d %H:%M:%S")
# Indirizzo VPN: $CLIENT_IP
# =============================================================================

[Interface]
# Chiave privata del client (NON condividere!)
PrivateKey = $CLIENT_PRIVATE_KEY

# Indirizzo IP del client nella rete VPN
Address = ${CLIENT_IP}/24

# Server DNS
DNS = 1.1.1.1, 8.8.8.8

[Peer]
# Chiave pubblica del server
PublicKey = $SERVER_PUBLIC_KEY

# Chiave pre-condivisa per sicurezza aggiuntiva
PresharedKey = $CLIENT_PRESHARED_KEY

# Endpoint del server
Endpoint = ${SERVER_ENDPOINT}:${SERVER_PORT}

# Instradare tutto il traffico attraverso la VPN
# Per accedere solo alla rete VPN, cambiare in: AllowedIPs = 10.0.0.0/24
AllowedIPs = 0.0.0.0/0

# Keepalive per mantenere la connessione attiva (utile dietro NAT)
PersistentKeepalive = 25
EOF

chmod 600 "$CLIENT_CONFIG"
log_success "File di configurazione creato: $CLIENT_CONFIG"

# --------------------------------------------------------------------------
# Applica la configurazione al server WireGuard (se in esecuzione)
# --------------------------------------------------------------------------
log_info "Applicazione della configurazione..."

if ip link show "$WG_INTERFACE" &>/dev/null; then
    # WireGuard e' in esecuzione, aggiungi il peer a caldo
    wg set "$WG_INTERFACE" \
        peer "$CLIENT_PUBLIC_KEY" \
        preshared-key <(echo "$CLIENT_PRESHARED_KEY") \
        allowed-ips "${CLIENT_IP}/32"

    log_success "Peer aggiunto al server WireGuard in esecuzione"
else
    log_warn "WireGuard non e' in esecuzione. Il peer sara' attivo al prossimo avvio."
    log_warn "Avvia con: wg-quick up $WG_INTERFACE"
fi

# --------------------------------------------------------------------------
# Genera il codice QR (se qrencode e' installato)
# --------------------------------------------------------------------------
echo ""
if command -v qrencode &> /dev/null; then
    log_info "Codice QR per la configurazione mobile:"
    echo ""
    qrencode -t ansiutf8 < "$CLIENT_CONFIG"
    echo ""

    # Salva anche come immagine PNG
    QR_IMAGE="$WG_CLIENTS_DIR/${CLIENT_NAME}_qr.png"
    qrencode -o "$QR_IMAGE" -t png -s 6 < "$CLIENT_CONFIG"
    log_success "Codice QR salvato come: $QR_IMAGE"
else
    log_warn "qrencode non e' installato. Per generare il codice QR:"
    echo "  apt-get install qrencode"
    echo "  qrencode -t ansiutf8 < $CLIENT_CONFIG"
fi

# --------------------------------------------------------------------------
# Riepilogo
# --------------------------------------------------------------------------
echo ""
echo "============================================"
echo " Client VPN Aggiunto con Successo!"
echo "============================================"
echo ""
log_success "Nome client:         $CLIENT_NAME"
log_success "Indirizzo IP VPN:    $CLIENT_IP"
log_success "File configurazione: $CLIENT_CONFIG"
echo ""
log_info "Come usare la configurazione:"
echo ""
echo "  Su Linux/macOS:"
echo "    1. Copia il file $CLIENT_CONFIG sul dispositivo client"
echo "    2. Importa con: wg-quick up /percorso/${CLIENT_NAME}.conf"
echo ""
echo "  Su Windows:"
echo "    1. Installa WireGuard da https://www.wireguard.com/install/"
echo "    2. Apri l'applicazione WireGuard"
echo "    3. Importa il file di configurazione"
echo ""
echo "  Su iOS/Android:"
echo "    1. Installa l'app WireGuard dallo store"
echo "    2. Scansiona il codice QR sopra (se visualizzato)"
echo "    3. Oppure importa il file di configurazione"
echo ""
log_warn "SICUREZZA: Il file di configurazione contiene la chiave privata."
log_warn "Trasferiscilo in modo sicuro e NON inviarlo via email non cifrata."
echo ""
