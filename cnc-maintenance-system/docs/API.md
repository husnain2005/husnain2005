# API Reference

Documentazione completa delle API REST del sistema CNC Maintenance.

**Base URL:** `http://localhost:3001/api`

---

## Indice

1. [Autenticazione](#autenticazione)
2. [Macchine](#macchine)
3. [Problematiche](#problematiche)
4. [Clienti](#clienti)
5. [Allegati](#allegati)
6. [Import PDF](#import-pdf)
7. [Audit Log](#audit-log)
8. [Codici Errore](#codici-errore)

---

## Convenzioni

### Headers Richiesti

```
Content-Type: application/json
Authorization: Bearer <token>  (per endpoint protetti)
```

### Formato Response

**Successo:**
```json
{
    "message": "Descrizione operazione",
    "data": { ... }
}
```

**Errore:**
```json
{
    "error": "Codice errore",
    "message": "Descrizione dettagliata"
}
```

### Paginazione

Query parameters per liste:
- `limit` (default: 50) - Numero elementi per pagina
- `offset` (default: 0) - Elementi da saltare

Response:
```json
{
    "items": [...],
    "total": 150,
    "limit": 50,
    "offset": 0
}
```

---

## Autenticazione

### Login

Autentica un utente e restituisce un token JWT.

```http
POST /api/auth/login
```

**Body:**
```json
{
    "username": "admin",
    "password": "password123"
}
```

> Il campo `username` accetta: username, email, o user_id

**Response 200:**
```json
{
    "message": "Login effettuato con successo",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "user_id": "USR001",
        "username": "admin",
        "email": "admin@cncmaint.com",
        "full_name": "Amministratore Sistema",
        "role": "admin"
    }
}
```

**Response 401:**
```json
{
    "error": "Credenziali non valide",
    "message": "Username o password errati"
}
```

---

### Profilo Utente

Restituisce i dati dell'utente autenticato.

```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "user": {
        "id": 1,
        "user_id": "USR001",
        "username": "admin",
        "email": "admin@cncmaint.com",
        "full_name": "Amministratore Sistema",
        "role": "admin"
    }
}
```

---

### Cambio Password

Modifica la password dell'utente autenticato.

```http
POST /api/auth/change-password
Authorization: Bearer <token>
```

**Body:**
```json
{
    "currentPassword": "password123",
    "newPassword": "nuovaPassword456"
}
```

**Response 200:**
```json
{
    "message": "Password modificata con successo"
}
```

---

### Lista Utenti (Admin)

Restituisce tutti gli utenti del sistema.

```http
GET /api/auth/users
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Response 200:**
```json
{
    "users": [
        {
            "id": 1,
            "user_id": "USR001",
            "username": "admin",
            "email": "admin@cncmaint.com",
            "full_name": "Amministratore Sistema",
            "role": "admin",
            "is_active": true,
            "last_login": "2026-01-17T10:30:00Z",
            "created_at": "2026-01-01T00:00:00Z"
        }
    ]
}
```

---

### Crea Utente (Admin)

Crea un nuovo utente.

```http
POST /api/auth/users
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Body:**
```json
{
    "user_id": "USR011",
    "username": "nuovo.utente",
    "email": "nuovo@cncmaint.com",
    "password": "password123",
    "full_name": "Nuovo Utente",
    "role": "tecnico"
}
```

**Response 201:**
```json
{
    "message": "Utente creato con successo",
    "user": {
        "id": 11,
        "user_id": "USR011",
        "username": "nuovo.utente",
        "email": "nuovo@cncmaint.com",
        "full_name": "Nuovo Utente",
        "role": "tecnico",
        "is_active": true,
        "created_at": "2026-01-17T12:00:00Z"
    }
}
```

---

### Modifica Utente (Admin)

Modifica un utente esistente.

```http
PUT /api/auth/users/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Body:**
```json
{
    "full_name": "Nome Aggiornato",
    "role": "admin",
    "is_active": true
}
```

**Response 200:**
```json
{
    "message": "Utente aggiornato con successo",
    "user": { ... }
}
```

---

## Macchine

### Lista Macchine

Restituisce le macchine con filtri opzionali.

```http
GET /api/machines
Authorization: Bearer <token>
```

**Query Parameters:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `numero_commessa` | string | Cerca per numero commessa (parziale) |
| `machine_type` | enum | TORNIO, FORATRICE, PICO |
| `model_id` | integer | ID modello |
| `customer_id` | integer | ID cliente |
| `customer_name` | string | Nome cliente (parziale) |
| `axis_type` | enum | SINGOLA_XZ, DOPPIA_XZ |
| `control_type` | enum | FANUC, SINUMERIK_ONE, CSE, FAGOR |
| `size` | integer | Taglia macchina |
| `search` | string | Ricerca libera |
| `limit` | integer | Risultati per pagina (default: 50) |
| `offset` | integer | Offset paginazione |

**Esempio:**
```http
GET /api/machines?numero_commessa=COM-2024&machine_type=TORNIO&limit=20
```

**Response 200:**
```json
{
    "machines": [
        {
            "id": 1,
            "numero_commessa": "COM-2024-001",
            "serial_number": "SN-GGT-001",
            "manufacturing_year": 2024,
            "installation_date": "2024-03-15",
            "warranty_expiry": "2026-03-15",
            "latitude": 45.5416,
            "longitude": 10.2118,
            "address": "Via Industriale 45, Brescia",
            "notes": "Installazione nuova",
            "axis_type": "SINGOLA_XZ",
            "control_type": "FANUC",
            "is_active": true,
            "created_at": "2024-01-15T10:00:00Z",
            "machine_type": "TORNIO",
            "category": "TRADIZIONALE",
            "model_name": "GGTRONIC",
            "size_value": 2000,
            "customer_id": 1,
            "customer_code": "CLI001",
            "customer_name": "Acciaierie Riunite SpA",
            "customer_city": "Brescia",
            "open_issues_count": 2
        }
    ],
    "total": 15,
    "limit": 50,
    "offset": 0
}
```

---

### Dettaglio Macchina

Restituisce una macchina con le sue problematiche.

```http
GET /api/machines/:id
Authorization: Bearer <token>
```

> `:id` può essere l'ID numerico o il numero_commessa

**Esempi:**
```http
GET /api/machines/1
GET /api/machines/COM-2024-001
```

**Response 200:**
```json
{
    "machine": {
        "id": 1,
        "numero_commessa": "COM-2024-001",
        "serial_number": "SN-GGT-001",
        "manufacturing_year": 2024,
        "machine_type": "TORNIO",
        "category": "TRADIZIONALE",
        "model_name": "GGTRONIC",
        "size_value": 2000,
        "axis_type": "SINGOLA_XZ",
        "control_type": "FANUC",
        "customer_id": 1,
        "customer_name": "Acciaierie Riunite SpA",
        "customer_address": "Via Industriale 45",
        "customer_city": "Brescia",
        "customer_phone": "+39 030 1234567",
        "customer_email": "info@acciaierie.it",
        "latitude": 45.5416,
        "longitude": 10.2118,
        "address": "Via Industriale 45, Brescia",
        "notes": "Installazione nuova",
        "created_by_name": "Amministratore Sistema",
        "created_at": "2024-01-15T10:00:00Z"
    },
    "issues": [
        {
            "id": 1,
            "title": "Vibrazione anomala durante rotazione",
            "issue_type": "MECCANICO",
            "status": "in_lavorazione",
            "priority": "alta",
            "issue_group_name": "Testa Porta Pezzo",
            "created_by_name": "Mario Rossi",
            "assigned_to_name": "Luigi Bianchi",
            "created_at": "2024-06-10T08:00:00Z"
        }
    ]
}
```

---

### Crea Macchina

Registra una nuova macchina.

```http
POST /api/machines
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:**
```json
{
    "numero_commessa": "COM-2026-001",
    "model_id": 2,
    "size_id": 5,
    "customer_id": 1,
    "axis_type": "DOPPIA_XZ",
    "control_type": "SINUMERIK_ONE",
    "serial_number": "SN-NEW-001",
    "manufacturing_year": 2026,
    "installation_date": "2026-02-01",
    "warranty_expiry": "2028-02-01",
    "latitude": 45.4642,
    "longitude": 9.1900,
    "address": "Via Milano 100, Milano",
    "notes": "Prima installazione anno 2026"
}
```

**Response 201:**
```json
{
    "message": "Macchina creata con successo",
    "machine": {
        "id": 16,
        "numero_commessa": "COM-2026-001",
        ...
    }
}
```

**Response 409 (Duplicato):**
```json
{
    "error": "Duplicato",
    "message": "Una macchina con questo numero commessa esiste già"
}
```

---

### Modifica Macchina

Aggiorna una macchina esistente.

```http
PUT /api/machines/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:** (tutti i campi opzionali)
```json
{
    "customer_id": 2,
    "notes": "Note aggiornate",
    "warranty_expiry": "2029-02-01"
}
```

**Response 200:**
```json
{
    "message": "Macchina aggiornata con successo",
    "machine": { ... }
}
```

---

### Elimina Macchina

Elimina (soft delete) una macchina.

```http
DELETE /api/machines/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Response 200:**
```json
{
    "message": "Macchina eliminata con successo"
}
```

---

### Macchine per Mappa

Restituisce macchine con coordinate per visualizzazione mappa.

```http
GET /api/machines/map
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "machines": [
        {
            "id": 1,
            "numero_commessa": "COM-2024-001",
            "latitude": 45.5416,
            "longitude": 10.2118,
            "address": "Via Industriale 45, Brescia",
            "machine_type": "TORNIO",
            "model_name": "GGTRONIC",
            "customer_name": "Acciaierie Riunite SpA",
            "open_issues_count": 2
        }
    ]
}
```

---

### Modelli e Taglie

Restituisce i modelli macchina disponibili con relative taglie.

```http
GET /api/machines/models
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "models": [
        {
            "id": 1,
            "machine_type": "TORNIO",
            "category": "TRADIZIONALE",
            "model_name": "GGL",
            "description": "Tornio tradizionale modello GGL",
            "sizes": [
                {"id": 1, "model_id": 1, "size_value": 800},
                {"id": 2, "model_id": 1, "size_value": 1000},
                {"id": 3, "model_id": 1, "size_value": 1500},
                {"id": 4, "model_id": 1, "size_value": 2000}
            ]
        },
        {
            "id": 2,
            "machine_type": "TORNIO",
            "category": "TRADIZIONALE",
            "model_name": "GGTRONIC",
            "description": "Tornio tradizionale modello GGTRONIC",
            "sizes": [
                {"id": 5, "model_id": 2, "size_value": 1000},
                {"id": 6, "model_id": 2, "size_value": 1800},
                {"id": 7, "model_id": 2, "size_value": 2000},
                {"id": 8, "model_id": 2, "size_value": 2500},
                {"id": 9, "model_id": 2, "size_value": 3000},
                {"id": 10, "model_id": 2, "size_value": 4000},
                {"id": 11, "model_id": 2, "size_value": 5000}
            ]
        }
    ]
}
```

---

## Problematiche

### Lista Problematiche

Restituisce le problematiche con filtri opzionali.

```http
GET /api/issues
Authorization: Bearer <token>
```

**Query Parameters:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `numero_commessa` | string | Cerca per numero commessa |
| `machine_id` | integer | ID macchina |
| `machine_type` | enum | TORNIO, FORATRICE, PICO |
| `customer_name` | string | Nome cliente |
| `issue_group_id` | integer | ID gruppo macchina |
| `issue_type` | enum | ELETTRICO, MECCANICO |
| `status` | enum | aperta, in_lavorazione, risolta, chiusa |
| `priority` | enum | bassa, media, alta, critica |
| `assigned_to` | integer | ID utente assegnato |
| `search` | string | Ricerca libera |
| `limit` | integer | Risultati per pagina |
| `offset` | integer | Offset paginazione |

**Response 200:**
```json
{
    "issues": [
        {
            "id": 1,
            "machine_id": 1,
            "numero_commessa": "COM-2024-001",
            "issue_type": "MECCANICO",
            "title": "Vibrazione anomala durante rotazione",
            "description": "Si rileva una vibrazione anomala...",
            "status": "in_lavorazione",
            "priority": "alta",
            "issue_group_name": "Testa Porta Pezzo",
            "issue_group_code": "TESTA_PORTA_PEZZO",
            "machine_type": "TORNIO",
            "model_name": "GGTRONIC",
            "customer_name": "Acciaierie Riunite SpA",
            "created_by_name": "Amministratore Sistema",
            "assigned_to_name": "Mario Rossi",
            "attachments_count": 3,
            "created_at": "2024-06-10T08:00:00Z",
            "updated_at": "2024-06-12T14:30:00Z"
        }
    ],
    "total": 12,
    "limit": 50,
    "offset": 0
}
```

---

### Dettaglio Problematica

Restituisce una problematica con commenti e allegati.

```http
GET /api/issues/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "issue": {
        "id": 1,
        "machine_id": 1,
        "numero_commessa": "COM-2024-001",
        "issue_type": "MECCANICO",
        "title": "Vibrazione anomala durante rotazione",
        "description": "Si rileva una vibrazione anomala del mandrino...",
        "status": "in_lavorazione",
        "priority": "alta",
        "resolution_notes": null,
        "issue_group_id": 1,
        "issue_group_name": "Testa Porta Pezzo",
        "issue_group_code": "TESTA_PORTA_PEZZO",
        "machine_numero_commessa": "COM-2024-001",
        "serial_number": "SN-GGT-001",
        "machine_type": "TORNIO",
        "category": "TRADIZIONALE",
        "model_name": "GGTRONIC",
        "size_value": 2000,
        "customer_id": 1,
        "customer_name": "Acciaierie Riunite SpA",
        "customer_city": "Brescia",
        "created_by_name": "Amministratore Sistema",
        "assigned_to_name": "Mario Rossi",
        "created_at": "2024-06-10T08:00:00Z",
        "updated_at": "2024-06-12T14:30:00Z",
        "closed_at": null
    },
    "comments": [
        {
            "id": 1,
            "issue_id": 1,
            "user_id": 2,
            "user_name": "Mario Rossi",
            "username": "mario.rossi",
            "comment": "Ho verificato la macchina. La vibrazione sembra provenire dal cuscinetto anteriore del mandrino.",
            "created_at": "2024-06-10T10:00:00Z"
        }
    ],
    "attachments": [
        {
            "id": 1,
            "issue_id": 1,
            "filename": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
            "original_filename": "foto_vibrazione.jpg",
            "file_path": "attachments/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
            "file_size": 245760,
            "mime_type": "image/jpeg",
            "thumbnail_path": "thumbnails/thumb_a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
            "uploaded_by_name": "Mario Rossi",
            "created_at": "2024-06-10T10:05:00Z"
        }
    ]
}
```

---

### Crea Problematica

Registra una nuova problematica.

```http
POST /api/issues
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:**
```json
{
    "numero_commessa": "COM-2024-001",
    "machine_id": 1,
    "issue_group_id": 1,
    "issue_type": "MECCANICO",
    "title": "Rumore anomalo asse Z",
    "description": "Durante la movimentazione dell'asse Z si avverte un rumore metallico...",
    "priority": "alta",
    "assigned_to": 2
}
```

**Campi obbligatori:**
- `issue_type`: ELETTRICO o MECCANICO
- `title`: Titolo della problematica

**Campi fallback (almeno uno richiesto se machine_id non presente):**
- `numero_commessa`
- `machine_type_fallback`
- `model_fallback`
- `customer_fallback`

**Response 201:**
```json
{
    "message": "Problematica creata con successo",
    "issue": {
        "id": 13,
        "machine_id": 1,
        "numero_commessa": "COM-2024-001",
        "issue_type": "MECCANICO",
        "title": "Rumore anomalo asse Z",
        "status": "aperta",
        "priority": "alta",
        "created_by": 1,
        "created_at": "2026-01-17T12:00:00Z"
    }
}
```

---

### Modifica Problematica

Aggiorna una problematica esistente.

```http
PUT /api/issues/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`
> L'utente deve essere il creatore, l'assegnatario, o un admin

**Body:**
```json
{
    "status": "risolta",
    "resolution_notes": "Sostituito cuscinetto asse Z. Test OK.",
    "priority": "media"
}
```

> Se `status` diventa `risolta` o `chiusa`, `closed_at` viene impostato automaticamente

**Response 200:**
```json
{
    "message": "Problematica aggiornata con successo",
    "issue": { ... }
}
```

---

### Elimina Problematica

Elimina una problematica.

```http
DELETE /api/issues/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o creatore della problematica

**Response 200:**
```json
{
    "message": "Problematica eliminata con successo"
}
```

---

### Aggiungi Commento

Aggiunge un commento a una problematica.

```http
POST /api/issues/:id/comments
Authorization: Bearer <token>
```

**Body:**
```json
{
    "comment": "Ho ordinato il ricambio. Consegna prevista in 2 giorni."
}
```

**Response 201:**
```json
{
    "message": "Commento aggiunto con successo",
    "comment": {
        "id": 8,
        "issue_id": 1,
        "user_id": 2,
        "user_name": "Mario Rossi",
        "username": "mario.rossi",
        "comment": "Ho ordinato il ricambio. Consegna prevista in 2 giorni.",
        "created_at": "2026-01-17T12:30:00Z"
    }
}
```

---

### Gruppi Macchina

Restituisce i gruppi macchina disponibili.

```http
GET /api/issues/groups
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "groups": [
        {"id": 1, "code": "TESTA_PORTA_PEZZO", "name": "Testa Porta Pezzo", "display_order": 1},
        {"id": 2, "code": "CONTROPUNTA", "name": "Contropunta", "display_order": 2},
        {"id": 3, "code": "CARRO", "name": "Carro", "display_order": 3},
        {"id": 4, "code": "CONVOGLIATORI", "name": "Convogliatori", "display_order": 4},
        {"id": 5, "code": "PULSANTIERA_CN", "name": "Pulsantiera CN", "display_order": 5},
        {"id": 6, "code": "LUNETTE", "name": "Lunette", "display_order": 6},
        {"id": 7, "code": "MANDRINO", "name": "Mandrino", "display_order": 7},
        {"id": 8, "code": "SISTEMA_IDRAULICO", "name": "Sistema Idraulico", "display_order": 8},
        {"id": 9, "code": "SISTEMA_LUBRIFICAZIONE", "name": "Sistema Lubrificazione", "display_order": 9},
        {"id": 10, "code": "ELETTRONICA", "name": "Elettronica", "display_order": 10},
        {"id": 11, "code": "ALTRO", "name": "Altro", "display_order": 99}
    ]
}
```

---

### Statistiche Dashboard

Restituisce statistiche per la dashboard.

```http
GET /api/issues/stats
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "statusStats": [
        {"status": "aperta", "count": "5"},
        {"status": "in_lavorazione", "count": "3"},
        {"status": "risolta", "count": "2"},
        {"status": "chiusa", "count": "2"}
    ],
    "typeStats": [
        {"issue_type": "MECCANICO", "count": "8"},
        {"issue_type": "ELETTRICO", "count": "4"}
    ],
    "priorityStats": [
        {"priority": "bassa", "count": "2"},
        {"priority": "media", "count": "5"},
        {"priority": "alta", "count": "4"},
        {"priority": "critica", "count": "1"}
    ],
    "recentIssues": [
        {
            "id": 12,
            "title": "Precisione carro compromessa",
            "status": "aperta",
            "priority": "alta",
            "numero_commessa": "COM-2024-003",
            "customer_name": "Lavorazioni Industriali Emilia",
            "created_at": "2026-01-15T09:00:00Z"
        }
    ],
    "totals": {
        "total_machines": "15",
        "total_issues": "12",
        "open_issues": "8",
        "total_customers": "10"
    }
}
```

---

## Clienti

### Lista Clienti

Restituisce i clienti con ricerca opzionale.

```http
GET /api/customers
Authorization: Bearer <token>
```

**Query Parameters:**
- `search` - Cerca in nome, codice, città
- `limit` - Risultati per pagina (default: 100)
- `offset` - Offset paginazione

**Response 200:**
```json
{
    "customers": [
        {
            "id": 1,
            "code": "CLI001",
            "name": "Acciaierie Riunite SpA",
            "address": "Via Industriale 45",
            "city": "Brescia",
            "province": "BS",
            "country": "Italia",
            "postal_code": "25100",
            "phone": "+39 030 1234567",
            "email": "info@acciaierie.it",
            "vat_number": "IT12345678901",
            "latitude": 45.5416,
            "longitude": 10.2118,
            "notes": null,
            "is_active": true,
            "machines_count": 3,
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]
}
```

---

### Dettaglio Cliente

Restituisce un cliente con le sue macchine.

```http
GET /api/customers/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "customer": {
        "id": 1,
        "code": "CLI001",
        "name": "Acciaierie Riunite SpA",
        "address": "Via Industriale 45",
        "city": "Brescia",
        ...
        "created_by_name": "Amministratore Sistema"
    },
    "machines": [
        {
            "id": 1,
            "numero_commessa": "COM-2024-001",
            "machine_type": "TORNIO",
            "model_name": "GGTRONIC",
            "size_value": 2000,
            ...
        }
    ]
}
```

---

### Crea Cliente

Registra un nuovo cliente.

```http
POST /api/customers
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:**
```json
{
    "code": "CLI011",
    "name": "Nuova Azienda Srl",
    "address": "Via Roma 1",
    "city": "Roma",
    "province": "RM",
    "country": "Italia",
    "postal_code": "00100",
    "phone": "+39 06 1234567",
    "email": "info@nuovaazienda.it",
    "vat_number": "IT98765432101",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "notes": "Nuovo cliente 2026"
}
```

**Response 201:**
```json
{
    "message": "Cliente creato con successo",
    "customer": { ... }
}
```

---

### Modifica Cliente

Aggiorna un cliente esistente.

```http
PUT /api/customers/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:** (tutti i campi opzionali)
```json
{
    "phone": "+39 06 9876543",
    "notes": "Contatto aggiornato"
}
```

**Response 200:**
```json
{
    "message": "Cliente aggiornato con successo",
    "customer": { ... }
}
```

---

### Elimina Cliente

Elimina (soft delete) un cliente.

```http
DELETE /api/customers/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`
> Non è possibile eliminare clienti con macchine attive associate

**Response 200:**
```json
{
    "message": "Cliente eliminato con successo"
}
```

**Response 400:**
```json
{
    "error": "Operazione non permessa",
    "message": "Non è possibile eliminare un cliente con macchine associate"
}
```

---

## Allegati

### Upload Allegati

Carica uno o più file per una problematica.

```http
POST /api/issues/:id/attachments
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

> Richiede ruolo: `admin` o `tecnico`

**Form Data:**
- `files` - File da caricare (max 10 file, max 10MB ciascuno)

**Tipi file accettati:**
- Immagini: JPEG, PNG, GIF, WebP
- Documenti: PDF, DOC, DOCX, XLS, XLSX, TXT

**cURL Esempio:**
```bash
curl -X POST "http://localhost:3001/api/issues/1/attachments" \
  -H "Authorization: Bearer <token>" \
  -F "files=@foto1.jpg" \
  -F "files=@documento.pdf"
```

**Response 201:**
```json
{
    "message": "2 file caricati con successo",
    "attachments": [
        {
            "id": 5,
            "issue_id": 1,
            "filename": "uuid-1234.jpg",
            "original_filename": "foto1.jpg",
            "file_path": "attachments/uuid-1234.jpg",
            "file_size": 245760,
            "mime_type": "image/jpeg",
            "thumbnail_path": "thumbnails/thumb_uuid-1234.jpg",
            "uploaded_by": 2,
            "created_at": "2026-01-17T12:00:00Z"
        }
    ]
}
```

---

### Visualizza Allegato

Restituisce il file allegato.

```http
GET /api/attachments/:id
Authorization: Bearer <token>
```

**Query Parameters:**
- `thumbnail=true` - Restituisce la miniatura (solo immagini)

**Response:**
- Content-Type: tipo MIME del file
- Body: contenuto binario del file

---

### Download Allegato

Scarica il file allegato.

```http
GET /api/attachments/:id/download
Authorization: Bearer <token>
```

**Response:**
- Content-Disposition: attachment; filename="nome_originale.ext"
- Body: contenuto binario del file

---

### Elimina Allegato

Elimina un allegato.

```http
DELETE /api/attachments/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o essere chi ha caricato il file

**Response 200:**
```json
{
    "message": "File eliminato con successo"
}
```

---

## Import PDF

### Carica PDF

Carica un PDF e ne estrae automaticamente i dati.

```http
POST /api/pdf/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

> Richiede ruolo: `admin` o `tecnico`
> Max file size: 50MB

**Form Data:**
- `file` - File PDF da elaborare

**Response 201:**
```json
{
    "message": "PDF elaborato con successo",
    "import": {
        "id": 1,
        "original_filename": "manutenzione_2024.pdf",
        "file_path": "pdfs/uuid-5678.pdf",
        "file_size": 1245678,
        "extracted_data": { ... },
        "status": "processed",
        "uploaded_by": 1,
        "created_at": "2026-01-17T12:00:00Z"
    },
    "extracted": {
        "numero_commessa": "COM-2023-015",
        "date": "15/03/2023",
        "machine_type": "TORNIO",
        "model": "GGTRONIC",
        "customer": "Acciaierie Riunite",
        "issue_type": "MECCANICO",
        "issue_group": "CONTROPUNTA",
        "title": "Perdita olio contropunta",
        "description": "Rilevata perdita di olio idraulico...",
        "confidence": {
            "numero_commessa": 0.9,
            "machine_type": 0.9,
            "issue_type": 0.8
        }
    },
    "raw_text_preview": "RAPPORTO MANUTENZIONE\nData: 15/03/2023..."
}
```

---

### Lista Importazioni

Restituisce le importazioni PDF.

```http
GET /api/pdf/imports
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - pending, processed, completed
- `limit` - Risultati per pagina
- `offset` - Offset paginazione

**Response 200:**
```json
{
    "imports": [
        {
            "id": 1,
            "original_filename": "manutenzione_2024.pdf",
            "file_path": "pdfs/uuid-5678.pdf",
            "file_size": 1245678,
            "extracted_data": { ... },
            "status": "processed",
            "uploaded_by_name": "Amministratore Sistema",
            "reviewed_by_name": null,
            "created_at": "2026-01-17T12:00:00Z",
            "reviewed_at": null
        }
    ]
}
```

---

### Dettaglio Importazione

Restituisce i dettagli di un'importazione.

```http
GET /api/pdf/imports/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
    "import": {
        "id": 1,
        "original_filename": "manutenzione_2024.pdf",
        "extracted_data": {
            "numero_commessa": "COM-2023-015",
            "date": "15/03/2023",
            "machine_type": "TORNIO",
            "model": "GGTRONIC",
            "customer": "Acciaierie Riunite",
            "issue_type": "MECCANICO",
            "title": "Perdita olio contropunta",
            "description": "Rilevata perdita di olio idraulico nella zona della contropunta...",
            "raw_text": "RAPPORTO MANUTENZIONE\n...",
            "pages": 2,
            "confidence": { ... }
        },
        "status": "processed",
        ...
    }
}
```

---

### Modifica Dati Estratti

Aggiorna i dati estratti (fase revisione).

```http
PUT /api/pdf/imports/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:**
```json
{
    "extracted_data": {
        "numero_commessa": "COM-2023-015",
        "machine_type": "TORNIO",
        "model": "GGTRONIC",
        "customer": "Acciaierie Riunite SpA",
        "issue_type": "MECCANICO",
        "issue_group": "CONTROPUNTA",
        "title": "Perdita olio contropunta (corretto)",
        "description": "Descrizione corretta manualmente..."
    }
}
```

**Response 200:**
```json
{
    "message": "Dati aggiornati con successo",
    "import": { ... }
}
```

---

### Conferma Importazione

Conferma i dati e crea la problematica.

```http
POST /api/pdf/imports/:id/confirm
Authorization: Bearer <token>
```

> Richiede ruolo: `admin` o `tecnico`

**Body:**
```json
{
    "data": {
        "numero_commessa": "COM-2023-015",
        "machine_type": "TORNIO",
        "model": "GGTRONIC",
        "customer": "Acciaierie Riunite SpA",
        "issue_type": "MECCANICO",
        "issue_group": "CONTROPUNTA",
        "title": "Perdita olio contropunta",
        "description": "Rilevata perdita di olio idraulico..."
    }
}
```

**Response 201:**
```json
{
    "message": "Problematica creata con successo dall'importazione PDF",
    "issue": {
        "id": 13,
        "numero_commessa": "COM-2023-015",
        "issue_type": "MECCANICO",
        "title": "Perdita olio contropunta",
        "status": "aperta",
        ...
    }
}
```

---

### Elimina Importazione

Elimina un'importazione PDF.

```http
DELETE /api/pdf/imports/:id
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Response 200:**
```json
{
    "message": "Importazione eliminata con successo"
}
```

---

## Audit Log

### Lista Log Audit

Restituisce i log di audit con filtri opzionali.

```http
GET /api/audit
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Query Parameters:**
- `table_name` - Filtra per tabella (machines, issues, etc.)
- `user_id` - Filtra per utente
- `action` - INSERT, UPDATE, DELETE
- `start_date` - Data inizio (ISO 8601)
- `end_date` - Data fine (ISO 8601)
- `limit` - Risultati per pagina (default: 100)
- `offset` - Offset paginazione

**Esempio:**
```http
GET /api/audit?table_name=issues&action=UPDATE&limit=50
```

**Response 200:**
```json
{
    "logs": [
        {
            "id": 125,
            "user_id": 2,
            "username": "mario.rossi",
            "full_name": "Mario Rossi",
            "table_name": "issues",
            "record_id": 1,
            "action": "UPDATE",
            "old_values": {
                "status": "aperta",
                "priority": "media"
            },
            "new_values": {
                "status": "in_lavorazione",
                "priority": "alta"
            },
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0...",
            "created_at": "2026-01-17T10:30:00Z"
        }
    ]
}
```

---

### Storico Record

Restituisce lo storico modifiche di un singolo record.

```http
GET /api/audit/:tableName/:recordId
Authorization: Bearer <token>
```

> Richiede ruolo: `admin`

**Esempio:**
```http
GET /api/audit/issues/1
```

**Response 200:**
```json
{
    "history": [
        {
            "id": 125,
            "user_id": 2,
            "username": "mario.rossi",
            "full_name": "Mario Rossi",
            "table_name": "issues",
            "record_id": 1,
            "action": "UPDATE",
            "old_values": { ... },
            "new_values": { ... },
            "created_at": "2026-01-17T10:30:00Z"
        },
        {
            "id": 100,
            "action": "INSERT",
            "old_values": null,
            "new_values": { ... },
            "created_at": "2026-01-15T08:00:00Z"
        }
    ]
}
```

---

## Codici Errore

### Codici HTTP

| Codice | Nome | Descrizione |
|--------|------|-------------|
| 200 | OK | Richiesta completata con successo |
| 201 | Created | Risorsa creata con successo |
| 400 | Bad Request | Dati richiesta non validi |
| 401 | Unauthorized | Autenticazione richiesta o fallita |
| 403 | Forbidden | Permessi insufficienti |
| 404 | Not Found | Risorsa non trovata |
| 409 | Conflict | Conflitto (es. duplicato) |
| 500 | Internal Server Error | Errore server |

### Messaggi Errore Comuni

```json
// 400 - Dati mancanti
{
    "error": "Dati mancanti",
    "message": "Il numero commessa è obbligatorio"
}

// 401 - Token scaduto
{
    "error": "Token scaduto",
    "message": "Il token di autenticazione è scaduto"
}

// 403 - Permessi insufficienti
{
    "error": "Accesso negato",
    "message": "Non hai i permessi necessari per questa operazione"
}

// 404 - Non trovato
{
    "error": "Non trovato",
    "message": "Macchina non trovata"
}

// 409 - Duplicato
{
    "error": "Duplicato",
    "message": "Una macchina con questo numero commessa esiste già"
}

// 500 - Errore server
{
    "error": "Errore interno",
    "message": "Errore durante l'elaborazione della richiesta"
}
```

---

## Esempi cURL

### Login
```bash
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```

### Cerca Macchina
```bash
curl -X GET "http://localhost:3001/api/machines?numero_commessa=COM-2024" \
  -H "Authorization: Bearer <token>"
```

### Crea Problematica
```bash
curl -X POST "http://localhost:3001/api/issues" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "numero_commessa": "COM-2024-001",
    "issue_type": "MECCANICO",
    "title": "Problema test",
    "description": "Descrizione del problema",
    "priority": "alta"
  }'
```

### Upload Foto
```bash
curl -X POST "http://localhost:3001/api/issues/1/attachments" \
  -H "Authorization: Bearer <token>" \
  -F "files=@foto.jpg"
```
