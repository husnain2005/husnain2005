#!/bin/bash
# =============================================================================
# Setup nuovo PC — CNC Maintenance System
# Esegui questo script dopo aver clonato il repo su un nuovo PC.
# Uso: bash setup-new-pc.sh
# =============================================================================

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_PATH="$(echo "$REPO_DIR/cnc-maintenance-system" | sed 's|/|-|g' | sed 's|^-||')"
MEMORY_DEST="$HOME/.claude/projects/$PROJECT_PATH/memory"

echo ""
echo "=== Setup nuovo PC - CNC Maintenance System ==="
echo ""

# 1. Installa Claude Code (latest)
echo "[1/5] Installazione Claude Code (latest)..."
if command -v claude &>/dev/null; then
  echo "  Claude Code già installato. Aggiornamento..."
fi
npm install -g @anthropic-ai/claude-code 2>/dev/null || true
claude install latest || true

# Aggiungi ~/.local/bin al PATH se non presente
if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  export PATH="$HOME/.local/bin:$PATH"
  echo "  PATH aggiornato con ~/.local/bin"
fi

# 2. Ripristina memoria Claude
echo ""
echo "[2/5] Ripristino memoria Claude..."
mkdir -p "$MEMORY_DEST"
cp "$REPO_DIR/.claude-memory/"* "$MEMORY_DEST/"
echo "  Memoria copiata in: $MEMORY_DEST"

# 3. Installa dipendenze backend
echo ""
echo "[3/5] Installazione dipendenze backend..."
cd "$REPO_DIR/cnc-maintenance-system/backend"
npm install

# 4. Installa dipendenze frontend
echo ""
echo "[4/5] Installazione dipendenze frontend..."
cd "$REPO_DIR/cnc-maintenance-system/frontend"
npm install

# 5. Crea .env se non esiste
echo ""
echo "[5/5] Controllo file .env..."
cd "$REPO_DIR/cnc-maintenance-system"
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "  ATTENZIONE: .env creato da .env.example — modifica le variabili prima di avviare!"
  else
    echo "  ATTENZIONE: nessun .env trovato. Crealo manualmente prima di avviare Docker."
  fi
else
  echo "  .env già presente."
fi

echo ""
echo "=== Setup completato! ==="
echo ""
echo "Prossimi passi:"
echo "  1. Modifica .env con le tue credenziali"
echo "  2. Avvia l'app: cd cnc-maintenance-system && bash deploy.sh"
echo "  3. Ricarica la shell: source ~/.bashrc"
echo ""
