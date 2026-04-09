require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { verifyCsrf } = require('./middleware/csrf');
const { auditMiddleware } = require('./middleware/audit');

// Import routes
const authRoutes = require('./routes/auth');
const machinesRoutes = require('./routes/machines');
const issuesRoutes = require('./routes/issues');
const customersRoutes = require('./routes/customers');
const attachmentsRoutes = require('./routes/attachments');
const pdfRoutes = require('./routes/pdf');
const auditRoutes = require('./routes/audit');
const interventionsRoutes = require('./routes/interventions');
const backupRoutes = require('./routes/backup');
const presenceRoutes = require('./routes/presence');
const { initBackupScheduler } = require('./controllers/backupController');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Trust Proxy (nginx / Vite dev proxy) ────────────────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// ─── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Cookie Parser ───────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Audit Middleware ────────────────────────────────────────────────────────
app.use(auditMiddleware);

// ─── CSRF Protection ─────────────────────────────────────────────────────────
// Applied globally; the middleware itself skips safe methods (GET/HEAD/OPTIONS)
// and requests that are not cookie-authenticated.
app.use(verifyCsrf);

// ─── Rate Limiting for Login ─────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: { error: 'Troppi tentativi', message: 'Troppi tentativi di login. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// ─── Request Logging (dev only) ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── CSRF Token Endpoint ─────────────────────────────────────────────────────
// Frontend can call GET /api/csrf-token to obtain a fresh CSRF token cookie.
const { generateCsrfToken, setCsrfCookie } = require('./middleware/csrf');
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  res.json({ csrfToken: token });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes(loginLimiter));
app.use('/api/machines', machinesRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/interventions', interventionsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/presence', presenceRoutes);

// Serve uploaded files (in production, use nginx)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
initBackupScheduler();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        CNC Maintenance Management System - Backend         ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(42)}║
║  API Base URL: http://localhost:${PORT}/api                  ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
