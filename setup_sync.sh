#!/bin/bash

###############################################################################
# 🚀 SETUP RAPIDO - Sincronizzazione Multi-PC su nuovo PC
#
# Uso:
#   chmod +x setup_sync.sh
#   ./setup_sync.sh
#
# Questo script configura tutto automaticamente su un nuovo PC
###############################################################################

# Colori
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ========== SETUP ==========

print_header "SETUP SINCRONIZZAZIONE GIT"

# Step 1: Verifica se Git è installato
print_info "Passo 1: Verifico che Git sia installato..."
if ! command -v git &> /dev/null; then
    print_error "Git non è installato!"
    echo "Installa con: sudo apt install git (Ubuntu/Debian)"
    echo "             brew install git (macOS)"
    exit 1
fi
print_success "Git è installato: $(git --version)"

# Step 2: Chiedi i dati dell'utente
echo ""
print_info "Passo 2: Configura le credenziali Git"
read -p "Nome utente (lascia vuoto se già configurato): " git_name
read -p "Email (lascia vuoto se già configurato): " git_email

if [ ! -z "$git_name" ]; then
    git config --global user.name "$git_name"
    print_success "Nome utente configurato: $git_name"
fi

if [ ! -z "$git_email" ]; then
    git config --global user.email "$git_email"
    print_success "Email configurata: $git_email"
fi

# Step 3: Chiedi il path del repository
echo ""
print_info "Passo 3: Dove si trova il progetto?"
read -p "Inserisci il path (es: /home/user/mio-progetto): " project_path

# Verifica se la cartella esiste
if [ ! -d "$project_path" ]; then
    print_error "Cartella non trovata: $project_path"
    read -p "Vuoi clonarla da un repository remoto? (s/n): " clone_choice
    
    if [ "$clone_choice" = "s" ]; then
        read -p "Inserisci l'URL del repository: " repo_url
        read -p "In quale cartella clonare? (es: /home/user/mio-progetto): " clone_path
        
        print_info "Clono il repository..."
        git clone "$repo_url" "$clone_path"
        
        if [ $? -eq 0 ]; then
            print_success "Repository clonato con successo"
            project_path="$clone_path"
        else
            print_error "Errore durante il clone"
            exit 1
        fi
    else
        print_error "Operazione annullata"
        exit 1
    fi
fi

cd "$project_path" || exit 1

# Step 4: Verifica che sia un repository Git
print_info "Passo 4: Verifico il repository Git..."
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Questa cartella non è un repository Git!"
    read -p "Vuoi inizializzare Git qui? (s/n): " init_choice
    
    if [ "$init_choice" = "s" ]; then
        git init
        read -p "URL del repository remoto (origin): " remote_url
        git remote add origin "$remote_url"
        print_success "Repository Git inizializzato"
    else
        print_error "Operazione annullata"
        exit 1
    fi
fi

print_success "Repository Git verificato"
git log -1 --oneline

# Step 5: Pull dei cambiamenti
echo ""
print_info "Passo 5: Scarico gli ultimi cambiamenti..."
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || print_warning "Non riesco a fare pull (potrebbe essere il primo clone)"
print_success "Pull completato"

# Step 6: Imposta il .gitignore
echo ""
print_info "Passo 6: Configuro il .gitignore..."

if [ ! -f ".gitignore" ]; then
    print_warning "File .gitignore non trovato, lo creo..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.venv/
venv/
env/
__pycache__/

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
*.o
*.pyc

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Logs
*.log

# Database
*.db
*.sqlite

# Temp
tmp/
temp/
*.tmp
EOF
    
    git add .gitignore
    git commit -m "Add .gitignore"
    print_success ".gitignore creato e committato"
else
    print_success ".gitignore già presente"
fi

# Step 7: Scarica lo script di sincronizzazione
echo ""
print_info "Passo 7: Scarico lo script di sincronizzazione..."

if [ -f "../sync_project.sh" ]; then
    cp ../sync_project.sh .
    chmod +x sync_project.sh
    print_success "Script di sincronizzazione copiato"
elif [ -f "$HOME/sync_project.sh" ]; then
    cp "$HOME/sync_project.sh" .
    chmod +x sync_project.sh
    print_success "Script di sincronizzazione copiato da home"
else
    print_warning "Script di sincronizzazione non trovato"
    echo "Scaricalo manualmente da: https://your-repo/sync_project.sh"
fi

# Step 8: Configura il database Postgres (opzionale)
echo ""
read -p "Usi Postgres? (s/n): " use_postgres

if [ "$use_postgres" = "s" ]; then
    print_info "Passo 8: Configurazione Postgres"
    
    # Verifica se Postgres è installato
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL non è installato!"
        echo "Installa con: sudo apt install postgresql postgresql-contrib (Ubuntu)"
        echo "             brew install postgresql (macOS)"
    else
        read -p "Nome del database: " db_name
        read -p "Nome utente PostgreSQL (default: postgres): " db_user
        db_user="${db_user:-postgres}"
        
        # Cerca il file di backup
        if [ -f "database_backup.sql" ]; then
            print_info "Ripristino il database da backup..."
            
            # Crea il database se non esiste
            psql -U "$db_user" -c "CREATE DATABASE $db_name;" 2>/dev/null || true
            
            # Importa il backup
            psql -U "$db_user" -d "$db_name" < database_backup.sql
            
            if [ $? -eq 0 ]; then
                print_success "Database ripristinato da database_backup.sql"
            else
                print_warning "Errore nel ripristino del database"
            fi
        else
            print_warning "File database_backup.sql non trovato"
            echo "Scaricalo dal repository o crea il database manualmente"
        fi
    fi
fi

# Step 9: Installa le dipendenze
echo ""
read -p "Installo le dipendenze del progetto? (s/n): " install_deps

if [ "$install_deps" = "s" ]; then
    print_info "Passo 9: Installazione dipendenze"
    
    # Node.js
    if [ -f "package.json" ]; then
        print_info "Rilevato progetto Node.js..."
        if command -v npm &> /dev/null; then
            npm install
            print_success "Dipendenze Node.js installate"
        else
            print_warning "npm non è installato"
        fi
    fi
    
    # Python
    if [ -f "requirements.txt" ]; then
        print_info "Rilevato progetto Python..."
        if command -v pip &> /dev/null; then
            pip install -r requirements.txt
            print_success "Dipendenze Python installate"
        else
            print_warning "pip non è installato"
        fi
    fi
    
    if [ -f "poetry.lock" ]; then
        print_info "Rilevato Poetry..."
        if command -v poetry &> /dev/null; then
            poetry install
            print_success "Dipendenze Poetry installate"
        else
            print_warning "Poetry non è installato"
        fi
    fi
fi

# Step 10: Avvia lo script di sincronizzazione
echo ""
print_header "SETUP COMPLETATO ✓"
echo ""

print_success "Configurazione terminata!"
echo ""
echo "Il progetto è pronto per la sincronizzazione multi-PC"
echo ""
echo "Per avviare la sincronizzazione automatica, esegui:"
echo -e "${YELLOW}./sync_project.sh${NC}"
echo ""
echo "Opzioni disponibili:"
echo "  ./sync_project.sh          → Sincronizzazione continua"
echo "  ./sync_project.sh -s       → Una sola sincronizzazione"
echo "  ./sync_project.sh -status  → Vedi lo stato"
echo "  ./sync_project.sh -help    → Aiuto"
echo ""

read -p "Vuoi avviare la sincronizzazione adesso? (s/n): " start_sync

if [ "$start_sync" = "s" ]; then
    if [ -f "sync_project.sh" ]; then
        ./sync_project.sh
    else
        print_warning "Script sync_project.sh non trovato"
        echo "Crealo copiandolo da un altro PC o dal repository"
    fi
else
    print_success "Potrai avviare la sincronizzazione in qualsiasi momento con:"
    echo -e "${YELLOW}cd $project_path && ./sync_project.sh${NC}"
fi
