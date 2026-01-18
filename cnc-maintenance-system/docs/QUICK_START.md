# Guida Rapida all'Avviamento

Questa guida ti permette di avere il sistema CNC Maintenance funzionante in meno di 10 minuti.

---

## Prerequisiti

Prima di iniziare, assicurati di avere installato:

| Software | Versione Minima | Verifica Installazione |
|----------|-----------------|------------------------|
| Docker | 20.10+ | `docker --version` |
| Docker Compose | 2.0+ | `docker-compose --version` |
| Git | 2.0+ | `git --version` |

### Installazione Docker (se non presente)

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Logout e login per applicare le modifiche
```

**Windows/Mac:**
Scarica e installa [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Avvio Rapido (5 minuti)

### Step 1: Clona o Accedi al Repository

```bash
cd cnc-maintenance-system
```

### Step 2: Avvia i Container Docker

```bash
# Avvia tutti i servizi in background
docker-compose up -d

# Verifica che i container siano attivi
docker-compose ps
```

Output atteso:
```
NAME                        STATUS              PORTS
cnc_maintenance_db          Up (healthy)        0.0.0.0:5432->5432/tcp
cnc_maintenance_backend     Up (healthy)        0.0.0.0:3001->3001/tcp
cnc_maintenance_frontend    Up                  0.0.0.0:3000->80/tcp
```

### Step 3: Inizializza il Database

```bash
# Crea le tabelle del database
docker-compose exec backend npm run db:init

# Popola con dati demo
docker-compose exec backend npm run db:seed
```

Output atteso:
```
Creating enum types...
Creating users table...
Creating customers table...
...
Database initialization completed successfully!

Seeding database with demo data...
Creating demo users...
Creating demo customers...
Creating demo machines...
Creating demo issues...
...
Database seeding completed successfully!

=== Demo Credentials ===
Admin: admin / password123
Tecnico: mario.rossi / password123
Lettura: paolo.neri / password123
```

### Step 4: Accedi all'Applicazione

Apri il browser e vai a:

| URL | Descrizione |
|-----|-------------|
| http://localhost:3000 | Frontend Web |
| http://localhost:3001/health | Health Check API |
| http://localhost:3001/api | Base URL API |

---

## Primo Accesso

### Login

1. Apri http://localhost:3000
2. Inserisci le credenziali demo:
   - **Username:** `admin`
   - **Password:** `password123`
3. Clicca "Accedi"

### Dashboard

Dopo il login vedrai la dashboard con:
- Statistiche macchine e problematiche
- Problematiche recenti
- Link rapidi alle funzioni principali

---

## Operazioni Comuni

### Cercare una Macchina

1. Vai a **Macchine** dal menu
2. Inserisci il **numero commessa** (es. `COM-2024-001`)
3. Clicca sul risultato per vedere i dettagli

### Creare una Nuova Problematica

1. Vai a **Problematiche** > **Nuova Problematica**
2. Compila i campi:
   - Numero commessa (se disponibile)
   - Tipo problema (Elettrico/Meccanico)
   - Titolo e descrizione
3. Clicca **Crea Problematica**

### Visualizzare la Mappa

1. Vai a **Mappa** dal menu
2. Visualizza le macchine geolocalizzate
3. Clicca su un marker per dettagli
4. I marker rossi indicano macchine con problemi attivi

### Importare un PDF

1. Vai a **Import PDF**
2. Trascina o seleziona un file PDF
3. Rivedi i dati estratti automaticamente
4. Correggi se necessario
5. Clicca **Conferma e Crea**

---

## Comandi Utili

### Gestione Container

```bash
# Avvia i servizi
docker-compose up -d

# Ferma i servizi
docker-compose down

# Visualizza log
docker-compose logs -f

# Log di un servizio specifico
docker-compose logs -f backend

# Riavvia un servizio
docker-compose restart backend

# Stato dei servizi
docker-compose ps
```

### Database

```bash
# Accedi al database PostgreSQL
docker-compose exec db psql -U postgres -d cnc_maintenance

# Esegui query
docker-compose exec db psql -U postgres -d cnc_maintenance -c "SELECT * FROM users;"

# Backup database
docker-compose exec db pg_dump -U postgres cnc_maintenance > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U postgres -d cnc_maintenance

# Reset completo database
docker-compose down -v
docker-compose up -d
docker-compose exec backend npm run db:init
docker-compose exec backend npm run db:seed
```

### Backend

```bash
# Accedi al container backend
docker-compose exec backend sh

# Visualizza log in tempo reale
docker-compose logs -f backend

# Reinstalla dipendenze
docker-compose exec backend npm install
```

---

## Risoluzione Problemi Comuni

### Il database non si avvia

**Sintomo:** Il container `cnc_maintenance_db` non parte o si riavvia continuamente.

**Soluzione:**
```bash
# Rimuovi volumi e riavvia
docker-compose down -v
docker-compose up -d
```

### Errore "Connection refused" all'API

**Sintomo:** Il frontend non riesce a connettersi al backend.

**Soluzione:**
```bash
# Verifica che il backend sia attivo
docker-compose ps
docker-compose logs backend

# Riavvia il backend
docker-compose restart backend
```

### La pagina non si carica

**Sintomo:** Browser mostra errore o pagina bianca.

**Soluzione:**
```bash
# Verifica i log del frontend
docker-compose logs frontend

# Ricostruisci i container
docker-compose down
docker-compose up -d --build
```

### Database vuoto dopo riavvio

**Sintomo:** Non ci sono dati nel sistema.

**Soluzione:**
```bash
# Riesegui il seed
docker-compose exec backend npm run db:seed
```

### Porta già in uso

**Sintomo:** Errore "port is already allocated".

**Soluzione:**
```bash
# Trova il processo che usa la porta
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Termina il processo o cambia le porte nel docker-compose.yml
```

---

## Prossimi Passi

1. **Leggi la documentazione completa:** [DOCUMENTATION.md](DOCUMENTATION.md)
2. **Esplora l'API:** [API.md](API.md)
3. **Guida utente dettagliata:** [USER_GUIDE.md](USER_GUIDE.md)
4. **Per sviluppatori:** [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)

---

## Supporto

Per problemi o domande:
1. Consulta la documentazione completa
2. Verifica i log con `docker-compose logs -f`
3. Controlla la sezione Troubleshooting
