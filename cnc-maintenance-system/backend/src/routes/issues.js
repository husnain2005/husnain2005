const express = require('express');
const router = express.Router();
const issuesController = require('../controllers/issuesController');
const attachmentsController = require('../controllers/attachmentsController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { uploadAttachment, handleUploadError } = require('../middleware/upload');

// Get issue groups (for dropdowns)
router.get('/groups', authenticate, issuesController.getIssueGroups);

// Get dashboard statistics
router.get('/stats', authenticate, issuesController.getStats);

// Standard CRUD routes
router.get('/', authenticate, issuesController.getIssues);
router.get('/:id', authenticate, issuesController.getIssue);
router.post('/', authenticate, authorize('admin', 'tecnico'), auditMiddleware, issuesController.createIssue);
router.put('/:id', authenticate, authorize('admin', 'tecnico'), auditMiddleware, issuesController.updateIssue);
router.delete('/:id', authenticate, authorize('admin', 'tecnico'), auditMiddleware, issuesController.deleteIssue);

// Comments
router.post('/:id/comments', authenticate, issuesController.addComment);

// Attachments
router.post(
  '/:id/attachments',
  authenticate,
  authorize('admin', 'tecnico'),
  uploadAttachment.array('files', 10),
  handleUploadError,
  attachmentsController.uploadAttachments
);

module.exports = router;
