const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.post('/change-password', authenticate, auditMiddleware, authController.changePassword);

// Admin only routes
router.get('/users', authenticate, authorize('admin'), authController.getUsers);
router.post('/users', authenticate, authorize('admin'), auditMiddleware, authController.createUser);
router.put('/users/:id', authenticate, authorize('admin'), auditMiddleware, authController.updateUser);

module.exports = router;
