const express = require('express');
const router = express.Router();
const attachmentsController = require('../controllers/attachmentsController');
const { authenticate, authorize } = require('../middleware/auth');

// Get/download attachment
router.get('/:id', authenticate, attachmentsController.getAttachment);
router.get('/:id/download', authenticate, attachmentsController.downloadAttachment);

// Delete attachment
router.delete('/:id', authenticate, authorize('admin', 'tecnico'), attachmentsController.deleteAttachment);

module.exports = router;
