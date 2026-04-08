# 🔄 Sincronizzazione Multi-PC con Git e Claude Code

## Il Problema
- Copi i file manualmente → versioni vecchie
- Mancano funzioni e modifiche nel frontend
- Database Postgres non sincronizzato
- I PC rimangono out-of-sync

## La Soluzione: Git + Flusso di Lavoro Strutturato

---

## PARTE 1: Setup Iniziale (Esegui una volta)

### 1.1 Sul PC Principale - Configura Git Correttamente

```bash
# Vai nella cartella del progetto
cd /path/to/your/project

# Inizializza Git (se non lo è già)
git init

# Configura le credenziali globali
git config --global user.name "Il Tuo Nome"
git config --global user.email "tua.email@example.com"

# Aggiungi il remote (GitHub/GitLab)
git remote add origin https://github.com/tuousername/tuoprogetto.git
# oppure SSH (più sicuro):
# git remote add origin git@github.com:tuousername/tuoprogetto.git

# Crea il branch principale
git branch -M main

# Carica la prima versione
git add .
git commit -m "Initial commit: setup progetto"
git push -u origin main
```

### 1.2 Crea un file `.gitignore` (Importante!)

```bash
# Nella root del progetto, crea .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.venv/
venv/
env/
__pycache__/

# Environment variables (NO mai commitare!)
.env
.env.local
.env.*.local
.env.production.local

# Build outputs
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
logs/

# Local database files (IMPORTANTE per Postgres)
*.db
*.sqlite
local_db/

# Temporary files
tmp/
temp/
*.tmp

# Claude Code specific
.claude-code/
node_modules/
EOF

git add .gitignore
git commit -m "Add .gitignore"
git push
```

---

## PARTE 2: Sincronizzazione Quotidiana - Flusso Corretto

### 2.1 Sul PC Principale - Dopo ogni sessione di lavoro

```bash
# 1. Vedi cosa è cambiato
git status

# 2. Aggiungi TUTTI i file modificati
git add .

# 3. Fai un commit con messaggio chiaro
git commit -m "feat: aggiunto nuovo componente React - modifica_descrittiva"
# Esempi:
# git commit -m "feat: nuova funzione di login"
# git commit -m "fix: corretto bug nel calcolo"
# git commit -m "refactor: pulito il codice del backend"
# git commit -m "docs: aggiornato README"

# 4. Carica sul remote (GitHub/GitLab)
git push origin main
```

### 2.2 Sugli altri PC - Prima di iniziare a lavorare

**METODO A - Se è la prima volta che sincronizzi il progetto su questo PC:**

```bash
# Clona il repository (scarica tutto)
git clone https://github.com/tuousername/tuoprogetto.git
cd tuoprogetto

# Se usi Postgres, ricrea il database
# Importa il dump dal PC principale:
psql -U postgres -d nomedeltuodb < backup.sql
```

**METODO B - Se il progetto è già presente su questo PC:**

```bash
# Entra nella cartella del progetto
cd /path/to/your/project

# Scarica gli ultimi cambiamenti dal remote
git fetch origin

# Aggiorna il tuo branch locale con main
git pull origin main

# Se hai modifiche locali non committate, crea un backup:
git stash  # Salva le modifiche temporaneamente
git pull origin main
git stash pop  # Ripristina le tue modifiche
```

---

## PARTE 3: Gestire il Database Postgres Sincronizzato

### 3.1 Backup del Database (sul PC principale dopo modifiche)

```bash
# Esporta il database
pg_dump -U postgres -d nomedeltuodb > database_backup.sql

# Aggiungi al Git
git add database_backup.sql
git commit -m "chore: backup database"
git push
```

### 3.2 Ripristino su altri PC

```bash
# Scarica la versione più recente
git pull origin main

# Ripristina il database
psql -U postgres -d nomedeltuodb < database_backup.sql

# Se il database non esiste, crealo:
createdb -U postgres nomedeltuodb
psql -U postgres -d nomedeltuodb < database_backup.sql
```

---

## PARTE 4: Evitare Conflitti e Problemi

### 4.1 Controlla lo Status Prima di Lavorare

```bash
# SEMPRE fai questo prima di aprire Claude Code:
git status
git pull origin main
```

### 4.2 Se Hai Conflitti

```bash
# Vedi i conflitti
git status

# Apri gli editor e risolvi manualmente
# Poi:
git add .
git commit -m "Risolti conflitti"
git push origin main
```

### 4.3 Se Hai Fatto Commit Sbagliati

```bash
# Annulla l'ultimo commit (mantieni i file)
git reset --soft HEAD~1

# Annulla l'ultimo commit (scarta i file)
git reset --hard HEAD~1

# Annulla l'ultimo push
git push origin main --force-with-lease
```

---

## PARTE 5: Flusso di Lavoro Ideale (Multi-PC)

### Timeline: Come lavorare senza scontri

```
PC PRINCIPALE (Lavoro):
├─ 09:00 - git pull origin main (scarica novità)
├─ 09:00-12:00 - Sviluppo
├─ 12:00 - git add . && git commit && git push
│
├─ 14:00 - git pull (scarica da altri PC)
├─ 14:00-17:00 - Sviluppo
├─ 17:00 - git add . && git commit && git push
│
PC SECONDARIO (Test/Altro):
├─ 09:00 - git pull origin main
├─ 09:00-12:00 - Test/Bug fixes
├─ 12:00 - git add . && git commit && git push
│
├─ 14:00 - git pull origin main (scarica dal principale)
│
PC TERZIARIO:
├─ Simile al secondario
```

---

## PARTE 6: Automazione (Opzionale ma Consigliata)

### 6.1 Script Bash per Auto-Push (Linux/Mac)

Crea un file `auto_push.sh` nella root del progetto:

```bash
#!/bin/bash

# Ascolta i cambiamenti ai file
while inotifywait -r -e modify,create,delete . ; do
    echo "Cambiamenti rilevati..."
    sleep 5  # Attendi che l'editor finisca di scrivere
    
    if [ -n "$(git status -s)" ]; then
        git add .
        git commit -m "auto: salvataggio automatico"
        git push origin main
        echo "Push automatico completato!"
    fi
done
```

Esegui:
```bash
chmod +x auto_push.sh
./auto_push.sh
```

### 6.2 Cron Job - Pull automatico (ogni 5 minuti)

```bash
# Apri crontab
crontab -e

# Aggiungi questa riga:
*/5 * * * * cd /path/to/project && git pull origin main >> /tmp/git_pull.log 2>&1
```

### 6.3 Script Python per Sincronizzazione Intelligente

```python
import os
import subprocess
import time
from datetime import datetime

PROJECT_PATH = "/path/to/your/project"
SYNC_INTERVAL = 300  # 5 minuti

def run_command(cmd):
    return subprocess.run(cmd, shell=True, cwd=PROJECT_PATH, capture_output=True, text=True)

def sync_repo():
    print(f"[{datetime.now()}] Sincronizzazione in corso...")
    
    # Pull
    result = run_command("git pull origin main")
    if result.returncode == 0:
        print("✓ Pull completato")
    else:
        print(f"✗ Errore pull: {result.stderr}")
    
    # Commit e push se ci sono cambiamenti
    status = run_command("git status -s")
    if status.stdout.strip():
        run_command("git add .")
        run_command('git commit -m "auto: sync changes"')
        result = run_command("git push origin main")
        if result.returncode == 0:
            print("✓ Push completato")
        else:
            print(f"✗ Errore push: {result.stderr}")
    else:
        print("Nessun cambiamento")

if __name__ == "__main__":
    while True:
        sync_repo()
        time.sleep(SYNC_INTERVAL)
```

Salva come `sync_daemon.py` e esegui:
```bash
python sync_daemon.py &
```

---

## PARTE 7: Checklist Giornaliera

```
[ ] Prima di iniziare sul PC:
    - git status
    - git pull origin main
    - Verifica che i file siano aggiornati

[ ] Dopo ogni sessione di lavoro:
    - Verifica gli output di Claude Code
    - git add .
    - git commit con messaggio chiaro
    - git push origin main

[ ] Su PC secondari:
    - Esegui git pull prima di lavorare
    - Se lavori, commita e pusha regolarmente

[ ] Una volta a settimana:
    - Controlla i log: git log --oneline
    - Sincronizza il database Postgres
    - Backup: pg_dump > weekly_backup.sql
```

---

## PARTE 8: Comandi Utili da Ricordare

```bash
# Stato attuale
git status

# Vedi i cambiamenti
git diff

# Vedi la storia
git log --oneline -10

# Vedi branch
git branch -a

# Crea un nuovo branch (per feature grandi)
git checkout -b feature/nuova-funzione
git push origin feature/nuova-funzione

# Merge di un branch
git checkout main
git pull origin main
git merge feature/nuova-funzione
git push origin main

# Sincronizza branch locale con remote
git fetch origin
git rebase origin/main

# Cancella file commessi per sbaglio
git rm --cached file.txt
git commit -m "Rimosso file errato"
```

---

## PROBLEMI COMUNI E SOLUZIONI

### Problema: "fatal: refusing to merge unrelated histories"
```bash
git pull origin main --allow-unrelated-histories
```

### Problema: "Permission denied (publickey)"
Configura SSH:
```bash
ssh-keygen -t ed25519 -C "tua.email@example.com"
cat ~/.ssh/id_ed25519.pub  # Copia su GitHub
```

### Problema: Troppi file aggiunti per sbaglio
```bash
git reset HEAD~1  # Annulla ultimo commit
git reset  # Rimuovi tutto da staging
git checkout -- .  # Scarta tutti i cambiamenti
```

### Problema: "LFS is required"
Installa Git LFS per file grandi:
```bash
git lfs install
```

---

## SETUP FINALE CONSIGLIATO

Per sincronizzazione perfetta su 3+ PC:

1. **Repository remoto** (GitHub/GitLab) → versione source of truth
2. **PC Principale** → commit ogni 1-2 ore
3. **PC Secondari** → pull ogni 5 minuti (cron job)
4. **Database** → backup settimanale in Git
5. **Ambiente** → `.env.example` in Git, `.env` in `.gitignore`

Con questo setup, tutti i PC avranno sempre l'ultima versione! 🚀

