const express = require('express');
const router = express.Router();
const machinesController = require('../controllers/machinesController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

// Get machine models and sizes (public for forms)
router.get('/models', authenticate, machinesController.getModels);
router.get('/models/:modelId/sizes', authenticate, machinesController.getSizesByModel);

// Get machines for map view
router.get('/map', authenticate, machinesController.getMachinesForMap);

// Standard CRUD routes
router.get('/', authenticate, machinesController.getMachines);
router.get('/:id', authenticate, machinesController.getMachine);
router.post('/', authenticate, authorize('admin', 'tecnico'), auditMiddleware, machinesController.createMachine);
router.put('/:id', authenticate, authorize('admin', 'tecnico'), auditMiddleware, machinesController.updateMachine);
router.delete('/:id', authenticate, authorize('admin'), auditMiddleware, machinesController.deleteMachine);

module.exports = router;
