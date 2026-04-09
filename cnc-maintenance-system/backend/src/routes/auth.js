const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const mfaController = require('../controllers/mfaController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

// Rate limiter per cambio password: max 5 tentativi ogni 15 minuti
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Troppi tentativi', message: 'Troppi tentativi di cambio password. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

// Rate limiter per MFA validate: max 10 tentativi ogni 15 minuti
const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Troppi tentativi', message: 'Troppi tentativi MFA. Riprova tra 15 minuti.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development',
});

/**
 * Auth routes factory.
 * Accepts loginLimiter from index.js to apply rate limiting on the login endpoint.
 */
module.exports = (loginLimiter) => {
  // Public routes
  router.post('/login', loginLimiter, authController.login);
  router.post('/logout', authController.logout);

  // MFA routes
  router.post('/mfa/setup', authenticate, mfaController.setupMFA);
  router.post('/mfa/verify', authenticate, mfaController.verifyAndEnableMFA);
  router.post('/mfa/validate', mfaLimiter, mfaController.validateMFA);
  router.post('/mfa/disable', authenticate, passwordLimiter, mfaController.disableMFA);
  router.get('/mfa/status', authenticate, mfaController.getMFAStatus);

  // Protected routes
  router.get('/me', authenticate, authController.getProfile);
  router.post('/change-password', authenticate, passwordLimiter, auditMiddleware, authController.changePassword);

  // Admin only routes
  router.get('/users', authenticate, authorize('admin'), authController.getUsers);
  router.post('/users', authenticate, authorize('admin'), auditMiddleware, authController.createUser);
  router.put('/users/:id', authenticate, authorize('admin'), auditMiddleware, authController.updateUser);
  router.post('/users/:id/reset-password', authenticate, authorize('admin'), auditMiddleware, authController.resetUserPassword);

  return router;
};
