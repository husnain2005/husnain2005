# 📋 QUICK REFERENCE - Sincronizzazione Multi-PC

## 🚀 SETUP INIZIALE (UNA VOLTA SOLA)

### Sul PC PRINCIPALE:

```bash
# 1. Configura identità Git
git config --global user.name "Il Tuo Nome"
git config --global user.email "tua@email.com"

# 2. Vai nella cartella del progetto
cd /path/to/your/project

# 3. Se non è ancora un repo Git, inizializza
git init
git remote add origin https://github.com/username/progetto.git

# 4. Aggiungi e commenta tutto
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main

# 5. Copia lo script di sincronizzazione nella cartella del progetto
cp sync_project.sh /path/to/your/project/
chmod +x sync_project.sh
```

---

## 📱 SETUP SU ALTRI PC (RAPIDO)

```bash
# 1. Scarica il setup script
wget https://your-repo/setup_sync.sh
chmod +x setup_sync.sh

# 2. Esegui il setup automatico
./setup_sync.sh

# ✓ FATTO! Il PC è sincronizzato
```

---

## 🔄 FLUSSO QUOTIDIANO

### PRIMA di aprire Claude Code su QUALSIASI PC:

```bash
cd /path/to/your/project
git pull origin main
```

### DOPO ogni sessione di lavoro (su qualsiasi PC):

```bash
git add .
git commit -m "feat: descrizione di quello che hai fatto"
git push origin main
```

### OPPURE: Usa lo script automatico (consigliato)

```bash
cd /path/to/your/project
./sync_project.sh -s    # Sincronizza una volta
# oppure
./sync_project.sh       # Sincronizza automaticamente ogni 5 minuti
```

---

## 📊 COMANDI ESSENZIALI

| Comando | Cosa fa |
|---------|---------|
| `git status` | Vedi cosa è cambiato |
| `git pull origin main` | Scarica gli ultimi cambiamenti |
| `git add .` | Aggiungi i file modificati |
| `git commit -m "messaggio"` | Crea un checkpoint |
| `git push origin main` | Carica i tuoi cambiamenti |
| `git log --oneline` | Vedi la storia |
| `git diff` | Vedi cosa è esattamente cambiato |
| `git stash` | Salva temporaneamente i cambiamenti |
| `git stash pop` | Ripristina i cambiamenti salvati |

---

## ✅ CHECKLIST GIORNALIERA

```
⬜ Inizio giornata (PRIMA di lavorare):
   [ ] cd /path/to/project
   [ ] git pull origin main
   [ ] Verifica che i file siano aggiornati
   
⬜ Durante il lavoro:
   [ ] Sviluppo tranquillo con Claude Code
   [ ] Non toccare i file manualmente
   
⬜ Fine sessione di lavoro:
   [ ] git add .
   [ ] git commit -m "descrizione"
   [ ] git push origin main
   [ ] Verifica che il push sia riuscito
   
⬜ Prima di andare su un altro PC:
   [ ] Fai il push su questo PC
   [ ] Accendi l'altro PC
   [ ] git pull origin main su quell'altro PC
   
⬜ Settimanalmente:
   [ ] Controlla git log --oneline
   [ ] Fai un backup del database: pg_dump > backup.sql
   [ ] git add database_backup.sql && git commit && git push
```

---

## 🔴 PROBLEMI COMUNI

### Problema: "Working directory is not clean"
```bash
# Soluzione: Salva il lavoro temporaneamente
git stash
git pull origin main
git stash pop  # Ripristina il tuo lavoro
```

### Problema: Conflitti di merge
```bash
# Soluzione: Accetta la versione remota (PC principale)
git checkout --theirs .
git add .
git commit -m "Resolved conflicts"
git push
```

### Problema: Ho fatto un push sbagliato
```bash
# Soluzione: Annulla l'ultimo commit (prima di fare git push)
git reset --soft HEAD~1

# Se hai già fatto push, è più complicato (chiedi aiuto)
```

### Problema: File vecchio non viene aggiornato
```bash
# Soluzione: Forza l'aggiornamento
git fetch origin
git checkout origin/main -- /path/to/file
git commit -m "Update file"
git push
```

### Problema: Troppe versioni vecchie sul PC
```bash
# Soluzione: Ripristina completamente da remoto
git fetch origin
git reset --hard origin/main
```

---

## 📦 GESTIONE DATABASE POSTGRES

### Sul PC PRINCIPALE - Dopo modifiche:

```bash
# Esporta il database
pg_dump -U postgres -d nomedeltuodb > database_backup.sql

# Aggiungi a Git
git add database_backup.sql
git commit -m "chore: backup database"
git push
```

### Su altri PC - Per sincronizzare:

```bash
# Scarica la versione più recente
git pull origin main

# Importa il backup (opzionale, solo se serve resettar il DB)
psql -U postgres -d nomedeltuodb < database_backup.sql
```

---

## 🎯 SETUP AUTOMATICO CONSIGLIATO

Per sincronizzazione perfetta senza pensare:

### Su TUTTI i PC, esegui:

```bash
chmod +x sync_project.sh

# Crea uno script di avvio automatico
cat > ~/start_sync.sh << 'EOF'
#!/bin/bash
cd /path/to/your/project
./sync_project.sh
EOF

chmod +x ~/start_sync.sh

# Aggiungi al startup di Ubuntu:
# - Vai a Impostazioni > Applicazioni > Avvio
# - Aggiungi: ~/start_sync.sh
```

Oppure, per macOS:

```bash
# Crea un LaunchAgent
mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/com.sync.project.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sync.project</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/project/sync_project.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>300</integer>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.sync.project.plist
```

---

## 🚨 IMPORTANTE: COSA NON FARE MAI

```
❌ NON copiare i file manualmente da un PC all'altro
   → Usi Git per questo!

❌ NON fare git add -A senza verificare cosa aggiungi
   → git status prima sempre

❌ NON committare password, token, API keys
   → Usa .env con .gitignore

❌ NON usare git push --force a meno che non sai cosa fai
   → Usa git push --force-with-lease se devi

❌ NON ignorare i messaggi di errore di Git
   → Leggili! Di solito dicono la soluzione

❌ NON lavorare sullo stesso file da 2 PC contemporaneamente
   → Causa conflitti! Coordina il lavoro
```

---

## 📞 GUIDA RAPIDA PER PC SECONDARI

```bash
# PC Secondario - Prima sessione:
1. chmod +x setup_sync.sh
2. ./setup_sync.sh
3. Rispondi alle domande
4. ✓ FATTO!

# PC Secondario - Ogni volta prima di lavorare:
cd /path/to/project
./sync_project.sh -s    # Sincronizza una volta
# oppure
./sync_project.sh       # Sincronizza continuamente
```

---

## 📈 METRICHE: Come verificare che funziona

```bash
# Accedi a GitHub/GitLab
# Vai al repository
# Verifica:
✓ Ultimo commit è recente (ultimi 5 minuti)
✓ Branch main è aggiornato
✓ Numero di commit aumenta
✓ Autore dei commit è il PC su cui stai lavorando

# Nel terminale:
git log --oneline -5
# Dovresti vedere commit recenti dall'ultimo push
```

---

## 🆘 SOS: Qualcosa è andato storto

```bash
# Reset completo (ATTENZIONE: perdi i cambiamenti locali!)
git fetch origin
git reset --hard origin/main
git pull

# Vedi cosa è successo
git log --oneline -10
git reflog

# Se hai bisogno di aiuto
git log -1 --stat  # Mostra l'ultimo commit
git status         # Mostra lo stato attuale
git diff origin/main  # Mostra le differenze
```

---

## 💾 BACKUP SETTIMANALE

```bash
# Una volta a settimana, fai un backup completo

# Backup del database
pg_dump -U postgres -d nomedeltuodb > weekly_backup_$(date +%Y%m%d).sql
git add .
git commit -m "chore: weekly backup"
git push

# Backup del repository
tar -czf progetto_backup_$(date +%Y%m%d).tar.gz /path/to/project
# Salva il file in un luogo sicuro
```

---

## 📚 RIFERIMENTI RAPIDI

- **Documentazione ufficiale Git**: https://git-scm.com/doc
- **GitHub Help**: https://docs.github.com
- **GitLab Docs**: https://docs.gitlab.com
- **Git Branching Model**: https://nvie.com/posts/a-successful-git-branching-model/

---

**ULTIMO CONSIGLIO**: La chiave per non avere problemi è:
1. **SEMPRE** fare `git pull` prima di iniziare
2. **SEMPRE** fare `git push` quando finisci
3. **MAI** copiare file manualmente
4. **SEMPRE** usare Git per sincronizzazione

Seguendo queste 4 regole, non avrai mai problemi! 🎉
