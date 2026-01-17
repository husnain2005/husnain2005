const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

// Get audit logs (admin only)
router.get('/', authenticate, authorize('admin'), auditController.getAuditLogs);

// Get history for a specific record
router.get('/:tableName/:recordId', authenticate, authorize('admin'), auditController.getRecordHistory);

module.exports = router;
