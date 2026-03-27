# CNC Maintenance Management System

Sistema gestionale web per la gestione di problematiche e manutenzioni di macchine CNC (TORNI, FORATRICI, PICO).

## Funzionalità

- **Gestione Macchine CNC**: Registrazione e ricerca macchine per numero commessa, tipo, modello, cliente
- **Problematiche/Manutenzioni**: Tracciamento completo con stati, priorità, commenti e allegati
- **Upload Foto**: Gallery di immagini con miniature automatiche
- **Mappa Geografica**: Visualizzazione geografica delle macchine con Leaflet
- **Import PDF**: Estrazione automatica dati da documenti PDF con revisione
- **Audit Log**: Tracciamento completo di tutte le modifiche
- **Autenticazione**: Sistema multi-utente con ruoli (admin, tecnico, lettura)

## Tipi di Macchine

### TORNI
- **Tradizionali**: GGL, GGTRONIC
- **Verticali**: TORNIO_VERTICALE (caratteristiche GGTRONIC)
- Taglie: 1000, 1800, 2000, 2500, 3000, 4000, 5000

### FORATRICI
- Modello: GGB
- Taglie: 1000, 1500, 2000, 2500, 3000

### PICO
- Modello unico
- Taglie: 500, 750, 1000

## Tecnologie

- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL 15
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Mappa**: Leaflet + React-Leaflet
- **Containerizzazione**: Docker + Docker Compose

## Installazione su un nuovo PC

Segui questi passi per installare l'applicazione su qualsiasi PC da zero.

### 1. Installa i prerequisiti

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** — include Docker e Docker Compose
- **[Git](https://git-scm.com/downloads)** — per scaricare il codice

### 2. Scarica il progetto

```bash
git clone git@github.com:husnain2005/husnain2005.git
cd husnain2005/cnc-maintenance-system
```

### 3. Crea il file `.env`

Copia il file `.env` dal vecchio PC nella cartella `cnc-maintenance-system/`.

Oppure creane uno nuovo copiando il template:

```bash
cp .env.example .env
```

Poi apri `.env` con un editor di testo e inserisci le tue password.

> Il file `.env` non è su GitHub per sicurezza — va copiato manualmente.

### 4. Avvia l'applicazione

```bash
docker-compose up -d
```

Docker scarica tutto automaticamente (database, backend, frontend). Al primo avvio impiega qualche minuto.

### 5. Inizializza il database (solo al primo avvio)

```bash
docker-compose exec backend npm run db:init
docker-compose exec backend npm run db:seed
```

L'applicazione è pronta su:
- **Frontend:** http://localhost
- **API:** http://localhost:3001

---

## Aggiornare l'applicazione (su tutti i PC)

Quando fai modifiche su un PC, esegui:

```bash
# Sul PC dove hai fatto le modifiche
git add .
git commit -m "descrizione modifiche"
git push origin main
```

Sull'altro PC per ricevere gli aggiornamenti:

```bash
git pull origin main
docker-compose up -d --build
```

---

## Quick Start

### Credenziali Demo

| Username | Password | Ruolo |
|----------|----------|-------|
| admin | password123 | admin |
| mario.rossi | password123 | tecnico |
| paolo.neri | password123 | lettura |

### Sviluppo Locale

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (in altro terminale)
cd frontend
npm install
npm run dev
```

## Struttura Database

### Tabelle Principali

```
users           - Utenti del sistema
customers       - Anagrafica clienti
machine_models  - Modelli macchine (GGTRONIC, GGL, GGB, PICO)
machine_sizes   - Taglie disponibili per modello
machines        - Macchine installate (numero_commessa univoco)
issue_groups    - Gruppi macchina (Testa, Contropunta, Carro, etc.)
issues          - Problematiche/manutenzioni
issue_comments  - Commenti alle problematiche
attachments     - File allegati
pdf_imports     - Importazioni da PDF
audit_log       - Log di tutte le modifiche
```

### Diagramma ER Semplificato

```
customers 1--N machines
machine_models 1--N machines
machine_sizes N--1 machine_models
machines 1--N issues
issue_groups 1--N issues
issues 1--N attachments
issues 1--N issue_comments
users 1--N issues (created_by, assigned_to)
users 1--N audit_log
```

## API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Profilo utente
- `POST /api/auth/change-password` - Cambio password
- `GET /api/auth/users` - Lista utenti (admin)
- `POST /api/auth/users` - Crea utente (admin)

### Macchine
- `GET /api/machines` - Lista macchine con filtri
- `GET /api/machines/:id` - Dettaglio macchina
- `POST /api/machines` - Crea macchina
- `PUT /api/machines/:id` - Modifica macchina
- `GET /api/machines/map` - Macchine per mappa
- `GET /api/machines/models` - Modelli e taglie

### Problematiche
- `GET /api/issues` - Lista problematiche
- `GET /api/issues/:id` - Dettaglio con commenti e allegati
- `POST /api/issues` - Crea problematica
- `PUT /api/issues/:id` - Modifica problematica
- `POST /api/issues/:id/comments` - Aggiungi commento
- `POST /api/issues/:id/attachments` - Upload allegati
- `GET /api/issues/groups` - Gruppi macchina
- `GET /api/issues/stats` - Statistiche dashboard

### PDF Import
- `POST /api/pdf/upload` - Carica e processa PDF
- `GET /api/pdf/imports` - Lista importazioni
- `PUT /api/pdf/imports/:id` - Modifica dati estratti
- `POST /api/pdf/imports/:id/confirm` - Conferma e crea problematica

### Audit
- `GET /api/audit` - Log audit (admin)
- `GET /api/audit/:table/:id` - Storico record

## Estensione

### Aggiungere un nuovo tipo di macchina

1. Modificare l'enum `machine_type` in PostgreSQL
2. Inserire il nuovo modello in `machine_models`
3. Inserire le taglie in `machine_sizes`

```sql
INSERT INTO machine_models (machine_type, category, model_name, description)
VALUES ('NUOVO_TIPO', NULL, 'NUOVO_MODELLO', 'Descrizione');
```

### Aggiungere un nuovo gruppo macchina

```sql
INSERT INTO issue_groups (code, name, display_order)
VALUES ('NUOVO_GRUPPO', 'Nome Gruppo', 12);
```

### Aggiungere campi personalizzati

1. Aggiungere colonna alla tabella appropriata
2. Modificare il controller backend
3. Aggiornare il form frontend

## Configurazione

### Variabili d'Ambiente Backend

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| DB_HOST | Host PostgreSQL | localhost |
| DB_PORT | Porta PostgreSQL | 5432 |
| DB_NAME | Nome database | cnc_maintenance |
| DB_USER | Utente database | postgres |
| DB_PASSWORD | Password database | - |
| JWT_SECRET | Chiave segreta JWT | - |
| JWT_EXPIRES_IN | Durata token | 24h |
| UPLOAD_DIR | Directory upload | ./uploads |
| MAX_FILE_SIZE | Dimensione max file | 10MB |

## Sicurezza

- Password hashate con bcrypt (12 rounds)
- Autenticazione JWT
- Ruoli utente (admin, tecnico, lettura)
- Validazione input
- Protezione upload file
- CORS configurato
- Audit log completo

## Licenza

MIT
