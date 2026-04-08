#!/bin/bash

###############################################################################
# 🔄 AUTO-SYNC Git Script per Claude Code Multi-PC
# 
# Uso:
#   chmod +x sync_project.sh
#   ./sync_project.sh
#
# Questo script:
# - Sincronizza automaticamente il progetto ogni X minuti
# - Rileva cambiamenti e fa push automatico
# - Tira le ultime versioni dagli altri PC
# - Previene conflitti
###############################################################################

# ========== CONFIGURAZIONE ==========
PROJECT_PATH="$(pwd)"  # Usa la cartella corrente, modifica se necessario
SYNC_INTERVAL=300      # Sincronizza ogni 5 minuti (300 secondi)
BRANCH="main"          # Branch principale
LOG_FILE="/tmp/git_sync_$(date +%Y%m%d).log"

# ========== COLORI ==========
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========== FUNZIONI ==========

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}" | tee -a "$LOG_FILE"
}

# Verifica se siamo in un repo Git
verify_git_repo() {
    if ! git -C "$PROJECT_PATH" rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Non siamo in una cartella Git!"
        exit 1
    fi
    print_success "Repository Git trovato"
}

# Verifica la connessione a Internet
check_internet() {
    if ! ping -c 1 8.8.8.8 &> /dev/null; then
        print_warning "Nessuna connessione Internet"
        return 1
    fi
    return 0
}

# Controlla se ci sono stash non committati
check_uncommitted() {
    cd "$PROJECT_PATH"
    if [ -n "$(git status -s)" ]; then
        return 0  # Ci sono cambiamenti
    fi
    return 1  # Nessun cambiamento
}

# Pull dei cambiamenti remoti
do_pull() {
    cd "$PROJECT_PATH"
    
    print_info "Pull da origin/$BRANCH..."
    
    if git pull origin "$BRANCH" --no-edit > /tmp/git_pull_output.txt 2>&1; then
        # Controlla se è stato fatto un pull effettivo
        if grep -q "Already up to date" /tmp/git_pull_output.txt; then
            print_info "Repository già aggiornato"
        else
            print_success "Pull completato con successo"
        fi
        return 0
    else
        print_error "Errore durante il pull:"
        cat /tmp/git_pull_output.txt | tail -5
        return 1
    fi
}

# Commit e push dei cambiamenti locali
do_push() {
    cd "$PROJECT_PATH"
    
    print_info "Rilevati cambiamenti locali"
    
    # Aggiungi tutti i file
    git add . > /dev/null 2>&1
    
    # Crea un commit
    local commit_msg="auto: sync changes at $(date +'%Y-%m-%d %H:%M:%S')"
    
    if git commit -m "$commit_msg" > /tmp/git_commit_output.txt 2>&1; then
        print_success "Commit creato: $commit_msg"
    else
        # Potrebbe essere che non ci sono cambiamenti da committare
        if grep -q "nothing to commit" /tmp/git_commit_output.txt; then
            print_info "Niente da committare"
            return 0
        else
            print_warning "Problema nel commit (potrebbe essere normale)"
        fi
    fi
    
    # Push
    print_info "Push in corso..."
    if git push origin "$BRANCH" > /tmp/git_push_output.txt 2>&1; then
        print_success "Push completato"
        return 0
    else
        print_error "Errore durante il push:"
        cat /tmp/git_push_output.txt | tail -5
        
        # Prova a risolvere conflitti comuni
        if grep -q "rejected" /tmp/git_push_output.txt; then
            print_warning "Conflitto rilevato, provo a risolvere..."
            git pull origin "$BRANCH" --rebase > /dev/null 2>&1
            if git push origin "$BRANCH" > /dev/null 2>&1; then
                print_success "Conflitto risolto!"
                return 0
            fi
        fi
        return 1
    fi
}

# Sincronizzazione completa
do_sync() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    print_header "SINCRONIZZAZIONE INIZIO - $timestamp"
    
    # Verifica connessione
    if ! check_internet; then
        print_warning "Connessione Internet non disponibile - salto sincronizzazione"
        echo "---" >> "$LOG_FILE"
        return 1
    fi
    
    # Verifica repo
    verify_git_repo
    
    # Pull prima
    do_pull || {
        print_warning "Pull fallito"
        echo "---" >> "$LOG_FILE"
        return 1
    }
    
    # Controlla se ci sono cambiamenti
    if check_uncommitted; then
        do_push || {
            print_warning "Push fallito"
        }
    else
        print_info "Nessun cambiamento locale"
    fi
    
    # Status finale
    print_info "Status attuale:"
    cd "$PROJECT_PATH"
    git log -1 --oneline | tee -a "$LOG_FILE"
    
    echo "---" >> "$LOG_FILE"
    print_success "Sincronizzazione completata"
}

# Mode continuo (esegui ogni X secondi)
continuous_sync() {
    print_header "MODO CONTINUO - Sincronizzazione ogni $SYNC_INTERVAL secondi"
    print_info "Premi Ctrl+C per fermare"
    echo ""
    
    while true; do
        do_sync
        echo ""
        print_info "Prossima sincronizzazione tra $SYNC_INTERVAL secondi..."
        sleep "$SYNC_INTERVAL"
    done
}

# Mode una volta (esegui solo una volta)
single_sync() {
    print_header "MODO SINGOLO - Una sincronizzazione"
    do_sync
}

# Mostra status e informazioni
show_status() {
    print_header "STATUS REPOSITORY"
    
    cd "$PROJECT_PATH"
    
    echo ""
    print_info "Branch attuale:"
    git branch --show-current
    
    echo ""
    print_info "Ultimi 5 commit:"
    git log --oneline -5
    
    echo ""
    print_info "Status:"
    git status
    
    echo ""
    print_info "Remote:"
    git remote -v
}

# Mostra aiuto
show_help() {
    cat << EOF
${BLUE}🔄 AUTO-SYNC Script per Git${NC}

UTILIZZO:
    ./sync_project.sh [OPZIONE]

OPZIONI:
    (nessuna)    → Sincronizzazione continua (ogni 5 min)
    -c           → Sincronizzazione continua
    -s           → Sincronizzazione singola (una volta)
    -status      → Mostra lo stato del repository
    -log         → Mostra il log di sincronizzazione
    -help        → Mostra questo aiuto

ESEMPI:
    ./sync_project.sh           # Sincronizzazione continua
    ./sync_project.sh -s        # Una sola volta
    ./sync_project.sh -status   # Vedi lo stato

FILE LOG:
    $LOG_FILE

CONFIGURAZIONE:
    Modifica le variabili in cima al file per cambiare:
    - PROJECT_PATH (cartella progetto)
    - SYNC_INTERVAL (intervallo di sincronizzazione)
    - BRANCH (branch da sincronizzare)

EOF
}

# ========== MAIN ==========

case "${1:-}" in
    -h|--help|help)
        show_help
        ;;
    -status|status)
        show_status
        ;;
    -log|log)
        print_info "Ultimi log di sincronizzazione:"
        tail -100 "$LOG_FILE"
        ;;
    -s|--single|single)
        single_sync
        ;;
    -c|--continuous|continuous)
        continuous_sync
        ;;
    *)
        # Default: sincronizzazione continua
        continuous_sync
        ;;
esac
