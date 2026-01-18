# Documentazione Tecnica Completa

## CNC Maintenance Management System

Sistema gestionale web per la gestione di problematiche e manutenzioni di macchine CNC industriali.

**Versione:** 1.0.0
**Data:** Gennaio 2026
**Tecnologie:** Node.js, PostgreSQL, React, Docker

---

## Indice

1. [Panoramica del Sistema](#1-panoramica-del-sistema)
2. [Architettura](#2-architettura)
3. [Modello di Dominio](#3-modello-di-dominio)
4. [Schema Database](#4-schema-database)
5. [Backend API](#5-backend-api)
6. [Frontend](#6-frontend)
7. [Sicurezza](#7-sicurezza)
8. [Deployment](#8-deployment)
9. [Configurazione](#9-configurazione)
10. [Manutenzione](#10-manutenzione)

---

## 1. Panoramica del Sistema

### 1.1 Obiettivo

Il sistema CNC Maintenance è progettato per:
- Gestire l'anagrafica delle macchine CNC (TORNI, FORATRICI, PICO)
- Tracciare problematiche e manutenzioni
- Permettere ricerche rapide tramite numero commessa
- Visualizzare la posizione geografica delle macchine
- Importare dati storici da documenti PDF
- Mantenere un audit log completo di tutte le modifiche

### 1.2 Utenti Target

| Ruolo | Descrizione | Permessi |
|-------|-------------|----------|
| **Admin** | Amministratore sistema | Accesso completo, gestione utenti |
| **Tecnico** | Tecnico manutentore | CRUD macchine/problematiche, upload |
| **Lettura** | Utente consultazione | Solo visualizzazione |

### 1.3 Funzionalità Principali

```
┌─────────────────────────────────────────────────────────────┐
│                    CNC MAINTENANCE SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Dashboard  │  │  Macchine   │  │   Problematiche     │  │
│  │  - Stats    │  │  - Ricerca  │  │   - CRUD            │  │
│  │  - Recent   │  │  - Dettagli │  │   - Commenti        │  │
│  │  - Quick    │  │  - Filtri   │  │   - Allegati        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Clienti   │  │    Mappa    │  │    Import PDF       │  │
│  │  - Lista    │  │  - Leaflet  │  │   - Upload          │  │
│  │  - Dettagli │  │  - Markers  │  │   - Estrazione      │  │
│  │             │  │  - Popup    │  │   - Revisione       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    Audit & Sicurezza                     ││
│  │  - Autenticazione JWT  - Ruoli  - Log modifiche         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architettura

### 2.1 Architettura Generale

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Frontend                         │  │
│  │  - Vite Build Tool                                       │  │
│  │  - Tailwind CSS                                          │  │
│  │  - React Router                                          │  │
│  │  - Leaflet Maps                                          │  │
│  │  - Axios HTTP Client                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Node.js + Express                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │  │
│  │  │   Routes   │  │Controllers │  │    Middleware      │  │  │
│  │  │  - auth    │  │  - auth    │  │  - authenticate    │  │  │
│  │  │  - machines│  │  - machines│  │  - authorize       │  │  │
│  │  │  - issues  │  │  - issues  │  │  - audit           │  │  │
│  │  │  - ...     │  │  - ...     │  │  - upload          │  │  │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    PostgreSQL 15                          │  │
│  │  - Users, Customers, Machines                            │  │
│  │  - Issues, Comments, Attachments                         │  │
│  │  - Audit Log, PDF Imports                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    File Storage                           │  │
│  │  - uploads/attachments (immagini, documenti)             │  │
│  │  - uploads/thumbnails (miniature)                        │  │
│  │  - uploads/pdfs (PDF importati)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnologico

| Layer | Tecnologia | Versione | Scopo |
|-------|------------|----------|-------|
| **Frontend** | React | 18.2 | UI Framework |
| | Vite | 5.0 | Build Tool |
| | Tailwind CSS | 3.4 | Styling |
| | React Router | 6.21 | Routing |
| | Leaflet | 1.9 | Mappe |
| | Axios | 1.6 | HTTP Client |
| | date-fns | 3.2 | Date formatting |
| | lucide-react | 0.303 | Icone |
| **Backend** | Node.js | 20 | Runtime |
| | Express.js | 4.18 | Web Framework |
| | pg | 8.11 | PostgreSQL Driver |
| | jsonwebtoken | 9.0 | JWT Auth |
| | bcryptjs | 2.4 | Password Hashing |
| | multer | 1.4 | File Upload |
| | sharp | 0.33 | Image Processing |
| | pdf-parse | 1.1 | PDF Parsing |
| **Database** | PostgreSQL | 15 | RDBMS |
| **Infrastructure** | Docker | 24+ | Containerization |
| | Docker Compose | 2.0+ | Orchestration |
| | Nginx | Alpine | Reverse Proxy |

### 2.3 Struttura Directory

```
cnc-maintenance-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js        # Connessione PostgreSQL
│   │   │   ├── initDb.js          # Schema database
│   │   │   └── seedData.js        # Dati demo
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── machinesController.js
│   │   │   ├── issuesController.js
│   │   │   ├── customersController.js
│   │   │   ├── attachmentsController.js
│   │   │   ├── pdfController.js
│   │   │   └── auditController.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT authentication
│   │   │   ├── audit.js           # Audit logging
│   │   │   └── upload.js          # File upload
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── machines.js
│   │   │   ├── issues.js
│   │   │   ├── customers.js
│   │   │   ├── attachments.js
│   │   │   ├── pdf.js
│   │   │   └── audit.js
│   │   └── index.js               # Entry point
│   ├── uploads/                    # File storage
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx         # Main layout
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Machines.jsx
│   │   │   ├── MachineDetail.jsx
│   │   │   ├── Issues.jsx
│   │   │   ├── IssueDetail.jsx
│   │   │   ├── IssueCreate.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── MapView.jsx
│   │   │   ├── PdfImport.jsx
│   │   │   └── Users.jsx
│   │   ├── services/
│   │   │   └── api.js             # API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── nginx.conf
│   └── Dockerfile
├── docs/
│   ├── QUICK_START.md
│   ├── DOCUMENTATION.md
│   ├── API.md
│   ├── USER_GUIDE.md
│   └── DEVELOPER_GUIDE.md
├── docker-compose.yml
└── README.md
```

---

## 3. Modello di Dominio

### 3.1 Entità Principali

#### Macchine CNC

Il sistema gestisce tre tipi di macchinari:

**TORNI**
```
Categorie:
├── TRADIZIONALI
│   ├── GGL (taglie: 800, 1000, 1500, 2000)
│   └── GGTRONIC (taglie: 1000, 1800, 2000, 2500, 3000, 4000, 5000)
└── VERTICALI
    └── TORNIO_VERTICALE (taglie: come GGTRONIC)

Caratteristiche comuni:
- Assi: SINGOLA_XZ o DOPPIA_XZ
- Controllo: FANUC, SINUMERIK_ONE, CSE, FAGOR
```

**FORATRICI**
```
Modello: GGB
Taglie: 1000, 1500, 2000, 2500, 3000
Caratteristiche: come TORNI
```

**PICO**
```
Modello: PICO
Taglie: 500, 750, 1000
Differenziazione: solo per taglia
```

#### Numero Commessa

Il **numero commessa** è l'identificatore univoco fondamentale:
- Formato tipico: `COM-YYYY-NNN` (es. COM-2024-001)
- Permette di risalire a: tipo, modello, taglia, assi, controllo, cliente

### 3.2 Gruppi Macchina

Le problematiche possono riguardare diversi gruppi/componenti:

| Codice | Nome | Descrizione |
|--------|------|-------------|
| TESTA_PORTA_PEZZO | Testa Porta Pezzo | Mandrino principale |
| CONTROPUNTA | Contropunta | Supporto pezzo |
| CARRO | Carro | Sistema movimentazione |
| CONVOGLIATORI | Convogliatori | Evacuazione trucioli |
| PULSANTIERA_CN | Pulsantiera CN | Pannello operatore |
| LUNETTE | Lunette | Supporti intermedi |
| MANDRINO | Mandrino | Componente rotazione |
| SISTEMA_IDRAULICO | Sistema Idraulico | Circuito idraulico |
| SISTEMA_LUBRIFICAZIONE | Sistema Lubrificazione | Circuito olio |
| ELETTRONICA | Elettronica | CNC, PLC, inverter |
| ALTRO | Altro | Generico |

### 3.3 Stati Problematica

```
┌─────────┐     ┌───────────────┐     ┌──────────┐     ┌─────────┐
│ APERTA  │────▶│ IN_LAVORAZIONE│────▶│ RISOLTA  │────▶│ CHIUSA  │
└─────────┘     └───────────────┘     └──────────┘     └─────────┘
     │                 │                    │
     │                 │                    │
     └─────────────────┴────────────────────┘
              (può tornare indietro)
```

### 3.4 Priorità

| Livello | Colore | Descrizione |
|---------|--------|-------------|
| `bassa` | Grigio | Può attendere |
| `media` | Blu | Priorità normale |
| `alta` | Arancione | Da gestire presto |
| `critica` | Rosso | Urgente, blocca produzione |

---

## 4. Schema Database

### 4.1 Diagramma ER

```
                    ┌─────────────┐
                    │   users     │
                    ├─────────────┤
                    │ id (PK)     │
                    │ user_id     │
                    │ username    │
                    │ email       │
                    │ password    │
                    │ role        │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  customers  │ │  machines   │ │  audit_log  │
    ├─────────────┤ ├─────────────┤ ├─────────────┤
    │ id (PK)     │ │ id (PK)     │ │ id (PK)     │
    │ code        │ │ numero_     │ │ user_id(FK) │
    │ name        │ │   commessa  │ │ table_name  │
    │ address     │ │ model_id(FK)│ │ action      │
    │ lat/lng     │ │ size_id(FK) │ │ old_values  │
    └──────┬──────┘ │ customer_id │ │ new_values  │
           │        │ (FK)        │ └─────────────┘
           │        │ axis_type   │
           │        │ control_type│
           │        │ lat/lng     │
           │        └──────┬──────┘
           │               │
           └───────┬───────┘
                   │
                   ▼
            ┌─────────────┐
            │   issues    │
            ├─────────────┤
            │ id (PK)     │
            │ machine_id  │
            │ (FK)        │
            │ issue_group │
            │ _id (FK)    │
            │ issue_type  │
            │ title       │
            │ description │
            │ status      │
            │ priority    │
            │ created_by  │
            │ assigned_to │
            └──────┬──────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌─────────────┐ ┌─────────┐ ┌─────────────┐
│ attachments │ │comments │ │issue_groups │
├─────────────┤ ├─────────┤ ├─────────────┤
│ id (PK)     │ │ id (PK) │ │ id (PK)     │
│ issue_id(FK)│ │issue_id │ │ code        │
│ filename    │ │ (FK)    │ │ name        │
│ file_path   │ │ user_id │ └─────────────┘
│ mime_type   │ │ (FK)    │
│ thumbnail   │ │ comment │
└─────────────┘ └─────────┘

┌───────────────┐      ┌───────────────┐
│machine_models │      │ machine_sizes │
├───────────────┤      ├───────────────┤
│ id (PK)       │◀────▶│ id (PK)       │
│ machine_type  │      │ model_id (FK) │
│ category      │      │ size_value    │
│ model_name    │      └───────────────┘
└───────────────┘

┌───────────────┐
│  pdf_imports  │
├───────────────┤
│ id (PK)       │
│ filename      │
│ file_path     │
│ extracted_data│ (JSONB)
│ status        │
│ created_issues│ (INTEGER[])
└───────────────┘
```

### 4.2 Definizione Tabelle

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,      -- Codice visibile (USR001)
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    role user_role DEFAULT 'tecnico',          -- admin, tecnico, lettura
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### customers
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,          -- Codice cliente (CLI001)
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(50),
    country VARCHAR(100) DEFAULT 'Italia',
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    vat_number VARCHAR(50),
    latitude DECIMAL(10, 8),                   -- Geolocalizzazione
    longitude DECIMAL(11, 8),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);
```

#### machines
```sql
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    numero_commessa VARCHAR(100) UNIQUE NOT NULL,  -- Chiave principale ricerca
    model_id INTEGER REFERENCES machine_models(id),
    size_id INTEGER REFERENCES machine_sizes(id),
    customer_id INTEGER REFERENCES customers(id),
    axis_type axis_type,                           -- SINGOLA_XZ, DOPPIA_XZ
    control_type control_type,                     -- FANUC, SINUMERIK_ONE, etc.
    serial_number VARCHAR(100),
    manufacturing_year INTEGER,
    installation_date DATE,
    warranty_expiry DATE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);
```

#### issues
```sql
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    machine_id INTEGER REFERENCES machines(id),
    numero_commessa VARCHAR(100),                  -- Per ricerca/fallback
    machine_type_fallback machine_type,           -- Se macchina non in DB
    model_fallback VARCHAR(100),
    customer_fallback VARCHAR(255),
    issue_group_id INTEGER REFERENCES issue_groups(id),
    issue_type issue_type NOT NULL,               -- ELETTRICO, MECCANICO
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status issue_status DEFAULT 'aperta',
    priority issue_priority DEFAULT 'media',
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),

    -- Almeno un identificativo macchina deve essere presente
    CONSTRAINT chk_machine_or_fallback CHECK (
        machine_id IS NOT NULL OR
        numero_commessa IS NOT NULL OR
        machine_type_fallback IS NOT NULL OR
        customer_fallback IS NOT NULL
    )
);
```

#### audit_log
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER,
    action audit_action NOT NULL,                 -- INSERT, UPDATE, DELETE
    old_values JSONB,                            -- Valori precedenti
    new_values JSONB,                            -- Nuovi valori
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 Indici

```sql
-- Ricerca per numero commessa (principale)
CREATE INDEX idx_machines_numero_commessa ON machines(numero_commessa);
CREATE INDEX idx_issues_numero_commessa ON issues(numero_commessa);

-- Ricerca per cliente
CREATE INDEX idx_machines_customer ON machines(customer_id);
CREATE INDEX idx_customers_name ON customers(name);

-- Performance query frequenti
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_created_at ON issues(created_at DESC);
CREATE INDEX idx_machines_location ON machines(latitude, longitude);

-- Audit
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

### 4.4 Enum Types

```sql
CREATE TYPE user_role AS ENUM ('admin', 'tecnico', 'lettura');
CREATE TYPE machine_type AS ENUM ('TORNIO', 'FORATRICE', 'PICO');
CREATE TYPE tornio_category AS ENUM ('TRADIZIONALE', 'VERTICALE');
CREATE TYPE axis_type AS ENUM ('SINGOLA_XZ', 'DOPPIA_XZ');
CREATE TYPE control_type AS ENUM ('FANUC', 'SINUMERIK_ONE', 'CSE', 'FAGOR');
CREATE TYPE issue_type AS ENUM ('ELETTRICO', 'MECCANICO');
CREATE TYPE issue_status AS ENUM ('aperta', 'in_lavorazione', 'risolta', 'chiusa');
CREATE TYPE issue_priority AS ENUM ('bassa', 'media', 'alta', 'critica');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
```

---

## 5. Backend API

### 5.1 Architettura API

L'API segue il pattern REST con:
- Autenticazione JWT
- Validazione input
- Gestione errori centralizzata
- Audit logging automatico

### 5.2 Flusso Autenticazione

```
┌─────────┐     POST /api/auth/login      ┌─────────┐
│ Client  │──────────────────────────────▶│ Backend │
│         │  {username, password}         │         │
│         │                               │         │
│         │◀──────────────────────────────│         │
│         │  {token, user}                │         │
└────┬────┘                               └─────────┘
     │
     │  Richieste successive
     │  Authorization: Bearer <token>
     │
     ▼
┌─────────┐     GET /api/machines         ┌─────────┐
│ Client  │──────────────────────────────▶│ Backend │
│         │  + JWT Token                  │         │
│         │                               │  ┌───┐  │
│         │                               │  │JWT│  │
│         │                               │  │ ? │  │
│         │◀──────────────────────────────│  └───┘  │
│         │  {machines: [...]}            │         │
└─────────┘                               └─────────┘
```

### 5.3 Middleware Chain

```javascript
// Ordine middleware per route protette
app.use('/api/machines',
    authenticate,           // 1. Verifica JWT
    authorize('admin','tecnico'),  // 2. Verifica ruolo
    auditMiddleware,        // 3. Prepara audit logging
    machinesRoutes          // 4. Handler route
);
```

### 5.4 Struttura Response

**Successo:**
```json
{
    "message": "Operazione completata",
    "data": { ... }
}
```

**Errore:**
```json
{
    "error": "Codice errore",
    "message": "Descrizione per l'utente"
}
```

**Paginazione:**
```json
{
    "items": [...],
    "total": 100,
    "limit": 20,
    "offset": 0
}
```

---

## 6. Frontend

### 6.1 Struttura Componenti

```
App
├── AuthProvider (Context)
│   └── Routes
│       ├── /login → Login (public)
│       └── / → Layout (protected)
│           ├── Dashboard
│           ├── Machines
│           │   └── MachineDetail
│           ├── Issues
│           │   ├── IssueDetail
│           │   └── IssueCreate
│           ├── Customers
│           ├── MapView
│           ├── PdfImport
│           └── Users (admin only)
```

### 6.2 State Management

Il sistema usa React Context per l'autenticazione:

```javascript
const AuthContext = {
    user: Object | null,
    loading: boolean,
    error: string | null,
    login: (username, password) => Promise<boolean>,
    logout: () => void,
    isAuthenticated: boolean,
    isAdmin: boolean,
    isTecnico: boolean
}
```

### 6.3 API Client

Axios configurato con:
- Base URL automatico
- Interceptor per JWT token
- Gestione errori 401 (redirect login)
- Timeout 30 secondi

---

## 7. Sicurezza

### 7.1 Autenticazione

- **Password hashing:** bcrypt con 12 rounds
- **Token:** JWT con scadenza configurabile (default 24h)
- **Storage:** Token in localStorage (lato client)

### 7.2 Autorizzazione

| Endpoint | Lettura | Tecnico | Admin |
|----------|---------|---------|-------|
| GET /machines | ✓ | ✓ | ✓ |
| POST /machines | ✗ | ✓ | ✓ |
| DELETE /machines | ✗ | ✗ | ✓ |
| GET /issues | ✓ | ✓ | ✓ |
| POST /issues | ✗ | ✓ | ✓ |
| POST /issues/:id/attachments | ✗ | ✓ | ✓ |
| GET /audit | ✗ | ✗ | ✓ |
| POST /auth/users | ✗ | ✗ | ✓ |

### 7.3 Protezione Upload

- Whitelist MIME types
- Limite dimensione file (10MB default, 50MB PDF)
- Nomi file randomizzati (UUID)
- Storage separato dal codice

### 7.4 Audit Trail

Ogni modifica registra:
- Chi (user_id)
- Quando (timestamp)
- Cosa (table, record_id, action)
- Valori prima/dopo (JSONB)
- IP e User Agent

---

## 8. Deployment

### 8.1 Docker Compose

```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: cnc_maintenance
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ****
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]

  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      DB_HOST: db
      JWT_SECRET: ****
    volumes:
      - uploads_data:/app/uploads

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "3000:80"
```

### 8.2 Requisiti Produzione

| Risorsa | Minimo | Raccomandato |
|---------|--------|--------------|
| CPU | 2 core | 4 core |
| RAM | 4 GB | 8 GB |
| Disco | 20 GB | 100 GB |
| Network | 100 Mbps | 1 Gbps |

### 8.3 Scaling

Per ambienti ad alto traffico:
1. Load balancer davanti ai backend
2. PostgreSQL replica per letture
3. Redis per caching sessioni
4. S3/MinIO per file storage

---

## 9. Configurazione

### 9.1 Variabili d'Ambiente

| Variabile | Descrizione | Default | Obbligatoria |
|-----------|-------------|---------|--------------|
| `DB_HOST` | Host PostgreSQL | localhost | Sì |
| `DB_PORT` | Porta PostgreSQL | 5432 | No |
| `DB_NAME` | Nome database | cnc_maintenance | Sì |
| `DB_USER` | Utente database | postgres | Sì |
| `DB_PASSWORD` | Password database | - | Sì |
| `JWT_SECRET` | Chiave segreta JWT | - | Sì (prod) |
| `JWT_EXPIRES_IN` | Durata token | 24h | No |
| `PORT` | Porta backend | 3001 | No |
| `NODE_ENV` | Ambiente | development | No |
| `UPLOAD_DIR` | Directory upload | ./uploads | No |
| `MAX_FILE_SIZE` | Max file (bytes) | 10485760 | No |
| `CORS_ORIGIN` | Origin CORS | http://localhost:3000 | No |

### 9.2 File .env Esempio

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cnc_maintenance
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your-very-long-and-secure-secret-key-at-least-32-chars
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=production

# Files
UPLOAD_DIR=/data/uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=https://cnc.yourdomain.com
```

---

## 10. Manutenzione

### 10.1 Backup

**Database:**
```bash
# Backup completo
docker-compose exec db pg_dump -U postgres cnc_maintenance > backup_$(date +%Y%m%d).sql

# Backup compresso
docker-compose exec db pg_dump -U postgres cnc_maintenance | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
gunzip -c backup_20260117.sql.gz | docker-compose exec -T db psql -U postgres -d cnc_maintenance
```

**Files:**
```bash
# Backup uploads
tar -czvf uploads_backup_$(date +%Y%m%d).tar.gz ./uploads/
```

### 10.2 Monitoraggio

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Log Analysis:**
```bash
# Tutti i log
docker-compose logs -f

# Solo errori backend
docker-compose logs backend | grep -i error

# Ultimi 100 log
docker-compose logs --tail=100 backend
```

### 10.3 Aggiornamenti

```bash
# Pull nuove immagini
docker-compose pull

# Rebuild e restart
docker-compose up -d --build

# Solo un servizio
docker-compose up -d --build backend
```

### 10.4 Pulizia

```bash
# Rimuovi container fermati
docker-compose down

# Rimuovi anche i volumi (ATTENZIONE: cancella dati!)
docker-compose down -v

# Pulizia immagini non usate
docker system prune -a
```

---

## Appendici

### A. Codici Errore HTTP

| Codice | Significato | Azione |
|--------|-------------|--------|
| 200 | OK | Operazione completata |
| 201 | Created | Risorsa creata |
| 400 | Bad Request | Verificare dati inviati |
| 401 | Unauthorized | Login necessario |
| 403 | Forbidden | Permessi insufficienti |
| 404 | Not Found | Risorsa non esistente |
| 409 | Conflict | Duplicato (es. numero commessa) |
| 500 | Server Error | Contattare supporto |

### B. Glossario

| Termine | Definizione |
|---------|-------------|
| **Numero Commessa** | Identificativo univoco macchina |
| **Issue** | Problematica/manutenzione registrata |
| **Issue Group** | Componente macchina interessato |
| **Audit Log** | Registro modifiche |
| **JWT** | JSON Web Token per autenticazione |
| **CRUD** | Create, Read, Update, Delete |

### C. Riferimenti

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)
- [Leaflet Documentation](https://leafletjs.com/)
- [Docker Documentation](https://docs.docker.com/)
