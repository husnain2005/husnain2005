const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadPdf, handleUploadError } = require('../middleware/upload');

// Upload and process PDF
router.post(
  '/upload',
  authenticate,
  authorize('admin', 'tecnico'),
  uploadPdf.single('file'),
  handleUploadError,
  pdfController.uploadPdf
);

// Get all PDF imports
router.get('/imports', authenticate, pdfController.getImports);

// Get single PDF import
router.get('/imports/:id', authenticate, pdfController.getImport);

// Update extracted data (review/correction)
router.put('/imports/:id', authenticate, authorize('admin', 'tecnico'), pdfController.updateImport);

// Confirm import and create issue
router.post('/imports/:id/confirm', authenticate, authorize('admin', 'tecnico'), pdfController.confirmImport);

// Delete PDF import
router.delete('/imports/:id', authenticate, authorize('admin'), pdfController.deleteImport);

module.exports = router;
