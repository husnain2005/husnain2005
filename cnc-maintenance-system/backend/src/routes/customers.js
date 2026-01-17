const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

// Standard CRUD routes
router.get('/', authenticate, customersController.getCustomers);
router.get('/:id', authenticate, customersController.getCustomer);
router.post('/', authenticate, authorize('admin', 'tecnico'), auditMiddleware, customersController.createCustomer);
router.put('/:id', authenticate, authorize('admin', 'tecnico'), auditMiddleware, customersController.updateCustomer);
router.delete('/:id', authenticate, authorize('admin'), auditMiddleware, customersController.deleteCustomer);

module.exports = router;
