require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const machinesRoutes = require('./routes/machines');
const issuesRoutes = require('./routes/issues');
const customersRoutes = require('./routes/customers');
const attachmentsRoutes = require('./routes/attachments');
const pdfRoutes = require('./routes/pdf');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/issues', issuesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/audit', auditRoutes);

// Serve uploaded files (in production, use nginx)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message
  });
});

// Start server
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
