const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const mfaController = require('../controllers/mfaController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

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
  router.post('/mfa/validate', mfaController.validateMFA);  // No auth needed - this IS the auth
  router.post('/mfa/disable', authenticate, mfaController.disableMFA);
  router.get('/mfa/status', authenticate, mfaController.getMFAStatus);

  // Protected routes
  router.get('/me', authenticate, authController.getProfile);
  router.post('/change-password', authenticate, auditMiddleware, authController.changePassword);

  // Admin only routes
  router.get('/users', authenticate, authorize('admin'), authController.getUsers);
  router.post('/users', authenticate, authorize('admin'), auditMiddleware, authController.createUser);
  router.put('/users/:id', authenticate, authorize('admin'), auditMiddleware, authController.updateUser);
  router.post('/users/:id/reset-password', authenticate, authorize('admin'), auditMiddleware, authController.resetUserPassword);

  return router;
};
