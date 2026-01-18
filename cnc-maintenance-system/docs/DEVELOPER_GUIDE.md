# Guida per Sviluppatori

Guida tecnica per sviluppatori che vogliono estendere, modificare o contribuire al sistema CNC Maintenance.

---

## Indice

1. [Setup Ambiente di Sviluppo](#1-setup-ambiente-di-sviluppo)
2. [Architettura del Codice](#2-architettura-del-codice)
3. [Backend Development](#3-backend-development)
4. [Frontend Development](#4-frontend-development)
5. [Database Migrations](#5-database-migrations)
6. [Testing](#6-testing)
7. [Estensioni Comuni](#7-estensioni-comuni)
8. [Best Practices](#8-best-practices)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Setup Ambiente di Sviluppo

### 1.1 Prerequisiti

```bash
# Versioni richieste
node --version   # >= 20.0.0
npm --version    # >= 10.0.0
docker --version # >= 24.0.0
git --version    # >= 2.0.0
```

### 1.2 Clone e Setup Iniziale

```bash
# Entra nella directory
cd cnc-maintenance-system

# Installa dipendenze backend
cd backend
cp .env.example .env
npm install

# Installa dipendenze frontend
cd ../frontend
npm install
```

### 1.3 Avviare Solo il Database

```bash
# Dalla root del progetto
docker-compose up -d db

# Verifica che sia attivo
docker-compose ps
docker-compose logs db
```

### 1.4 Inizializzare il Database

```bash
cd backend

# Crea tabelle
npm run db:init

# Popola dati demo
npm run db:seed
```

### 1.5 Avviare in Modalità Sviluppo

**Backend (terminale 1):**
```bash
cd backend
npm run dev

# Output:
# Server running on port 3001
# Environment: development
```

**Frontend (terminale 2):**
```bash
cd frontend
npm run dev

# Output:
# VITE v5.0.10  ready in 500 ms
# ➜  Local:   http://localhost:3000/
```

### 1.6 Variabili d'Ambiente Sviluppo

**backend/.env:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cnc_maintenance
DB_USER=postgres
DB_PASSWORD=postgres_password

JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=24h

PORT=3001
NODE_ENV=development

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

---

## 2. Architettura del Codice

### 2.1 Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Pool connessioni PostgreSQL
│   │   ├── initDb.js        # Schema DDL
│   │   └── seedData.js      # Dati demo
│   │
│   ├── controllers/         # Business logic
│   │   ├── authController.js
│   │   ├── machinesController.js
│   │   ├── issuesController.js
│   │   ├── customersController.js
│   │   ├── attachmentsController.js
│   │   ├── pdfController.js
│   │   └── auditController.js
│   │
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   ├── audit.js         # Audit logging
│   │   └── upload.js        # Multer config
│   │
│   ├── routes/              # Route definitions
│   │   ├── auth.js
│   │   ├── machines.js
│   │   ├── issues.js
│   │   ├── customers.js
│   │   ├── attachments.js
│   │   ├── pdf.js
│   │   └── audit.js
│   │
│   └── index.js             # Entry point, Express setup
│
├── uploads/                  # File storage
│   ├── attachments/
│   ├── thumbnails/
│   └── pdfs/
│
├── package.json
├── Dockerfile
└── .env.example
```

### 2.2 Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Layout.jsx       # Main layout with sidebar
│   │
│   ├── context/
│   │   └── AuthContext.jsx  # Authentication state
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Machines.jsx
│   │   ├── MachineDetail.jsx
│   │   ├── Issues.jsx
│   │   ├── IssueDetail.jsx
│   │   ├── IssueCreate.jsx
│   │   ├── Customers.jsx
│   │   ├── MapView.jsx
│   │   ├── PdfImport.jsx
│   │   └── Users.jsx
│   │
│   ├── services/
│   │   └── api.js           # Axios client & API helpers
│   │
│   ├── App.jsx              # Routes definition
│   ├── main.jsx             # Entry point
│   └── index.css            # Tailwind + custom styles
│
├── public/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── nginx.conf
└── Dockerfile
```

### 2.3 Pattern Architetturali

**Backend - Layered Architecture:**
```
Request → Route → Middleware → Controller → Database
                     ↓
                  Response
```

**Frontend - Component-Based:**
```
App (Router)
  └── Layout (Protected)
        └── Page (Feature)
              └── Components (UI)
```

---

## 3. Backend Development

### 3.1 Creare un Nuovo Endpoint

**Step 1: Definire il Controller**

```javascript
// src/controllers/newFeatureController.js
const db = require('../config/database');

const getAll = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM my_table');
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'operazione'
    });
  }
};

const create = async (req, res) => {
  try {
    const { name, value } = req.body;

    // Validazione
    if (!name) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Il campo name è obbligatorio'
      });
    }

    const result = await db.query(
      'INSERT INTO my_table (name, value, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, value, req.user.id]
    );

    // Audit log
    await req.audit('my_table', result.rows[0].id, 'INSERT', null, result.rows[0]);

    res.status(201).json({
      message: 'Creato con successo',
      item: result.rows[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione'
    });
  }
};

module.exports = { getAll, create };
```

**Step 2: Definire le Route**

```javascript
// src/routes/newFeature.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/newFeatureController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

router.get('/', authenticate, controller.getAll);
router.post('/', authenticate, authorize('admin', 'tecnico'), auditMiddleware, controller.create);

module.exports = router;
```

**Step 3: Registrare in index.js**

```javascript
// src/index.js
const newFeatureRoutes = require('./routes/newFeature');

// ...

app.use('/api/new-feature', newFeatureRoutes);
```

### 3.2 Middleware Personalizzato

```javascript
// src/middleware/customMiddleware.js
const customMiddleware = (options = {}) => {
  return (req, res, next) => {
    // Logica pre-request
    console.log(`Request: ${req.method} ${req.path}`);

    // Modificare request
    req.customData = 'some value';

    // Continuare
    next();

    // Oppure bloccare
    // return res.status(403).json({ error: 'Blocked' });
  };
};

module.exports = customMiddleware;
```

### 3.3 Query Database Patterns

**Query semplice:**
```javascript
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
const user = result.rows[0];
```

**Query con paginazione:**
```javascript
const { limit = 50, offset = 0 } = req.query;

const result = await db.query(`
  SELECT * FROM machines
  ORDER BY created_at DESC
  LIMIT $1 OFFSET $2
`, [parseInt(limit), parseInt(offset)]);

const countResult = await db.query('SELECT COUNT(*) FROM machines');

res.json({
  machines: result.rows,
  total: parseInt(countResult.rows[0].count),
  limit: parseInt(limit),
  offset: parseInt(offset)
});
```

**Transazione:**
```javascript
const client = await db.getClient();
try {
  await client.query('BEGIN');

  await client.query('INSERT INTO table1 ...');
  await client.query('UPDATE table2 ...');

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### 3.4 Error Handling Pattern

```javascript
const handleDatabaseError = (error, res) => {
  console.error('Database error:', error);

  // Violazione unique constraint
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Duplicato',
      message: 'Un record con questi dati esiste già'
    });
  }

  // Foreign key violation
  if (error.code === '23503') {
    return res.status(400).json({
      error: 'Riferimento non valido',
      message: 'Il record referenziato non esiste'
    });
  }

  // Generic error
  return res.status(500).json({
    error: 'Errore database',
    message: 'Errore durante l\'operazione'
  });
};
```

---

## 4. Frontend Development

### 4.1 Creare una Nuova Pagina

**Step 1: Creare il componente**

```jsx
// src/pages/NewPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Plus, Search } from 'lucide-react';

function NewPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await api.get('/new-feature');
      setItems(response.data.items);
    } catch (err) {
      setError('Errore durante il caricamento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Titolo Pagina</h1>
          <p className="text-gray-500">Descrizione della pagina</p>
        </div>
        <Link
          to="/new-page/create"
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
        >
          <Plus size={18} />
          Nuovo
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nessun elemento trovato
          </div>
        ) : (
          <div className="divide-y">
            {items.map(item => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <Link to={`/new-page/${item.id}`}>
                  {item.name}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewPage;
```

**Step 2: Aggiungere la route**

```jsx
// src/App.jsx
import NewPage from './pages/NewPage';

// Nel componente Routes:
<Route path="new-page" element={<NewPage />} />
```

**Step 3: Aggiungere al menu (opzionale)**

```jsx
// src/components/Layout.jsx
const navItems = [
  // ...existing items
  { path: '/new-page', icon: SomeIcon, label: 'Nuova Pagina' },
];
```

### 4.2 Gestione Stato con Context

**Creare un nuovo Context:**

```jsx
// src/context/NewContext.jsx
import React, { createContext, useContext, useState } from 'react';

const NewContext = createContext(null);

export const useNew = () => {
  const context = useContext(NewContext);
  if (!context) {
    throw new Error('useNew must be used within NewProvider');
  }
  return context;
};

export const NewProvider = ({ children }) => {
  const [state, setState] = useState(initialState);

  const actions = {
    doSomething: () => setState(prev => ({ ...prev, changed: true })),
  };

  return (
    <NewContext.Provider value={{ ...state, ...actions }}>
      {children}
    </NewContext.Provider>
  );
};
```

### 4.3 API Service Pattern

```javascript
// src/services/api.js

// Aggiungere nuove API helpers
export const newFeatureApi = {
  getAll: (params) => api.get('/new-feature', { params }),
  getById: (id) => api.get(`/new-feature/${id}`),
  create: (data) => api.post('/new-feature', data),
  update: (id, data) => api.put(`/new-feature/${id}`, data),
  delete: (id) => api.delete(`/new-feature/${id}`),
};
```

### 4.4 Form con Validazione

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { newFeatureApi } from '../services/api';

function CreateForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    value: '',
  });

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Il nome è obbligatorio';
    }

    if (formData.value && isNaN(formData.value)) {
      newErrors.value = 'Deve essere un numero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await newFeatureApi.create(formData);
      navigate(`/new-page/${response.data.item.id}`);
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || 'Errore durante il salvataggio'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="bg-red-50 text-red-600 p-3 rounded">
          {errors.submit}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Nome *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-lg ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Salvataggio...' : 'Salva'}
      </button>
    </form>
  );
}
```

### 4.5 Custom Hooks

```jsx
// src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';

export function useApi(apiFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFn(...args);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Errore');
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// Uso:
const { data, loading, error, refetch } = useApi(
  () => machinesApi.getAll({ limit: 10 }),
  []
);
```

---

## 5. Database Migrations

### 5.1 Aggiungere una Nuova Tabella

```sql
-- In initDb.js o in un file migration separato

-- 1. Creare la tabella
CREATE TABLE IF NOT EXISTS new_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- 2. Creare indici
CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

-- 3. Inserire dati default (se necessario)
INSERT INTO new_table (name, value) VALUES
    ('Default 1', 100),
    ('Default 2', 200)
ON CONFLICT DO NOTHING;
```

### 5.2 Modificare una Tabella Esistente

```sql
-- Aggiungere colonna
ALTER TABLE machines ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);

-- Aggiungere constraint
ALTER TABLE machines ADD CONSTRAINT chk_year
    CHECK (manufacturing_year >= 1900 AND manufacturing_year <= 2100);

-- Modificare tipo colonna
ALTER TABLE machines ALTER COLUMN notes TYPE TEXT;

-- Aggiungere indice
CREATE INDEX IF NOT EXISTS idx_machines_new_field ON machines(new_field);
```

### 5.3 Aggiungere Enum Value

```sql
-- PostgreSQL richiede questo pattern per aggiungere valori a enum
ALTER TYPE machine_type ADD VALUE IF NOT EXISTS 'NUOVO_TIPO';
```

### 5.4 Seed Data Pattern

```javascript
// In seedData.js

const seedNewData = async (client) => {
  // Prima verifica se i dati esistono già
  const existing = await client.query(
    'SELECT COUNT(*) FROM new_table'
  );

  if (parseInt(existing.rows[0].count) > 0) {
    console.log('New table already has data, skipping...');
    return;
  }

  await client.query(`
    INSERT INTO new_table (name, value, created_by) VALUES
      ('Item 1', 100, $1),
      ('Item 2', 200, $1)
  `, [adminUserId]);

  console.log('New table seeded');
};
```

---

## 6. Testing

### 6.1 Setup Test Environment

```bash
# Installa dipendenze test
cd backend
npm install --save-dev jest supertest

# package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### 6.2 Test API Endpoint

```javascript
// __tests__/machines.test.js
const request = require('supertest');
const app = require('../src/index');

describe('Machines API', () => {
  let authToken;

  beforeAll(async () => {
    // Login per ottenere token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' });
    authToken = res.body.token;
  });

  describe('GET /api/machines', () => {
    it('should return machines list', async () => {
      const res = await request(app)
        .get('/api/machines')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('machines');
      expect(Array.isArray(res.body.machines)).toBe(true);
    });

    it('should filter by numero_commessa', async () => {
      const res = await request(app)
        .get('/api/machines?numero_commessa=COM-2024')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.machines.forEach(m => {
        expect(m.numero_commessa).toContain('COM-2024');
      });
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/machines');
      expect(res.status).toBe(401);
    });
  });
});
```

### 6.3 Frontend Testing

```jsx
// __tests__/Dashboard.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../src/pages/Dashboard';
import { AuthProvider } from '../src/context/AuthContext';

// Mock API
jest.mock('../src/services/api', () => ({
  issuesApi: {
    getStats: jest.fn().mockResolvedValue({
      data: {
        totals: { total_machines: 10, open_issues: 5 },
        statusStats: [],
        typeStats: [],
        recentIssues: []
      }
    })
  }
}));

describe('Dashboard', () => {
  it('renders stats cards', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Macchine Totali')).toBeInTheDocument();
    });
  });
});
```

---

## 7. Estensioni Comuni

### 7.1 Aggiungere un Nuovo Tipo di Macchina

**1. Modificare il database:**
```sql
-- Aggiungere al type enum
ALTER TYPE machine_type ADD VALUE 'NUOVO_TIPO';

-- Aggiungere modello
INSERT INTO machine_models (machine_type, category, model_name, description)
VALUES ('NUOVO_TIPO', NULL, 'MODELLO_X', 'Descrizione nuovo tipo');

-- Aggiungere taglie
INSERT INTO machine_sizes (model_id, size_value) VALUES
  ((SELECT id FROM machine_models WHERE model_name = 'MODELLO_X'), 500),
  ((SELECT id FROM machine_models WHERE model_name = 'MODELLO_X'), 1000);
```

**2. Aggiornare frontend (dropdowns):**
Il frontend carica dinamicamente da `/api/machines/models`, quindi si aggiorna automaticamente.

### 7.2 Aggiungere un Nuovo Gruppo Problematica

```sql
INSERT INTO issue_groups (code, name, description, display_order)
VALUES ('NUOVO_GRUPPO', 'Nome Nuovo Gruppo', 'Descrizione', 15);
```

### 7.3 Aggiungere Campo a Issue

**1. Database:**
```sql
ALTER TABLE issues ADD COLUMN custom_field VARCHAR(100);
```

**2. Controller (aggiornare create/update):**
```javascript
// issuesController.js - create
const { custom_field } = req.body;
// Aggiungere alla query INSERT
```

**3. Frontend (aggiornare form):**
```jsx
// IssueCreate.jsx
<div>
  <label>Custom Field</label>
  <input
    value={formData.custom_field}
    onChange={(e) => handleChange('custom_field', e.target.value)}
  />
</div>
```

### 7.4 Export CSV

```javascript
// controllers/exportController.js
const exportMachinesToCsv = async (req, res) => {
  const result = await db.query(`
    SELECT m.numero_commessa, m.serial_number, mm.machine_type, mm.model_name,
           c.name as customer_name, m.manufacturing_year
    FROM machines m
    LEFT JOIN machine_models mm ON m.model_id = mm.id
    LEFT JOIN customers c ON m.customer_id = c.id
    WHERE m.is_active = true
  `);

  const headers = ['Numero Commessa', 'Seriale', 'Tipo', 'Modello', 'Cliente', 'Anno'];
  const rows = result.rows.map(r => [
    r.numero_commessa,
    r.serial_number,
    r.machine_type,
    r.model_name,
    r.customer_name,
    r.manufacturing_year
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=machines.csv');
  res.send(csv);
};
```

---

## 8. Best Practices

### 8.1 Codice Backend

```javascript
// ✅ DO: Validazione input
if (!numero_commessa || typeof numero_commessa !== 'string') {
  return res.status(400).json({ error: 'Invalid input' });
}

// ✅ DO: Parametri query prepared
await db.query('SELECT * FROM machines WHERE id = $1', [id]);

// ❌ DON'T: String interpolation
await db.query(`SELECT * FROM machines WHERE id = ${id}`); // SQL Injection!

// ✅ DO: Error handling specifico
try {
  // ...
} catch (error) {
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Duplicate' });
  }
  throw error;
}

// ✅ DO: Audit logging
await req.audit('machines', id, 'UPDATE', oldValues, newValues);

// ✅ DO: Soft delete
await db.query('UPDATE machines SET is_active = false WHERE id = $1', [id]);

// ❌ DON'T: Hard delete (perde storia)
await db.query('DELETE FROM machines WHERE id = $1', [id]);
```

### 8.2 Codice Frontend

```jsx
// ✅ DO: Loading states
if (loading) return <Spinner />;

// ✅ DO: Error handling UI
{error && <ErrorMessage message={error} />}

// ✅ DO: Keys univoche nelle liste
{items.map(item => <Item key={item.id} {...item} />)}

// ❌ DON'T: Key con index
{items.map((item, i) => <Item key={i} {...item} />)}

// ✅ DO: Memoization per performance
const expensiveValue = useMemo(() => computeExpensive(data), [data]);

// ✅ DO: Cleanup in useEffect
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, []);
```

### 8.3 Sicurezza

```javascript
// ✅ DO: Hash password
const hash = await bcrypt.hash(password, 12);

// ✅ DO: Validare file upload
if (!allowedMimes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// ✅ DO: Rate limiting (aggiungere)
const rateLimit = require('express-rate-limit');
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }));

// ✅ DO: Sanitizzare output
const sanitizedHtml = DOMPurify.sanitize(userInput);
```

### 8.4 Performance

```sql
-- ✅ DO: Indici su campi cercati frequentemente
CREATE INDEX idx_machines_numero_commessa ON machines(numero_commessa);

-- ✅ DO: LIMIT nelle query
SELECT * FROM issues ORDER BY created_at DESC LIMIT 50;

-- ✅ DO: Solo colonne necessarie
SELECT id, title, status FROM issues;

-- ❌ DON'T: SELECT * in produzione con molti dati
SELECT * FROM audit_log;
```

---

## 9. Troubleshooting

### 9.1 Database Connection Issues

```bash
# Verifica che PostgreSQL sia attivo
docker-compose ps db

# Verifica logs
docker-compose logs db

# Test connessione
docker-compose exec db psql -U postgres -d cnc_maintenance -c "SELECT 1;"

# Reset completo
docker-compose down -v
docker-compose up -d db
npm run db:init
npm run db:seed
```

### 9.2 Backend Issues

```bash
# Verifica variabili ambiente
node -e "console.log(process.env.DB_HOST)"

# Debug mode
DEBUG=* npm run dev

# Verifica porta in uso
lsof -i :3001
```

### 9.3 Frontend Issues

```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verifica proxy
# vite.config.js deve avere proxy configurato correttamente
```

### 9.4 Docker Issues

```bash
# Rebuild senza cache
docker-compose build --no-cache

# Logs dettagliati
docker-compose logs -f --tail=100

# Accesso container
docker-compose exec backend sh
docker-compose exec db psql -U postgres

# Pulizia completa
docker system prune -a --volumes
```

### 9.5 Common Errors

**"ECONNREFUSED":**
- Database non avviato
- Porta sbagliata in .env

**"JWT malformed":**
- Token corrotto
- Chiave JWT diversa tra generazione e verifica

**"relation does not exist":**
- Database non inizializzato
- Eseguire `npm run db:init`

**"permission denied":**
- File upload directory non scrivibile
- `chmod 755 uploads/`

---

## Appendice: Comandi Utili

```bash
# Development
npm run dev                    # Start dev server
npm run db:init               # Initialize database
npm run db:seed               # Seed demo data

# Docker
docker-compose up -d          # Start all
docker-compose down           # Stop all
docker-compose logs -f        # View logs
docker-compose exec backend sh # Shell into backend

# Database
docker-compose exec db psql -U postgres -d cnc_maintenance

# Git
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```
