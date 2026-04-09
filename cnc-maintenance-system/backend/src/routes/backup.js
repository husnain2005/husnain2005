const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  getBackupSettings,
  updateBackupSettings,
  restoreBackup,
} = require('../controllers/backupController');

// Multer: salva il file ZIP in una cartella temporanea
const uploadZip = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 500 * 1024 * 1024 }, // max 500 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Solo file ZIP sono accettati'));
    }
  },
});

// Tutte le route backup sono solo per admin
router.use(authenticate, authorize('admin'));

router.post('/create', createBackup);
router.get('/list', listBackups);
router.get('/download/:filename', downloadBackup);
router.delete('/:filename', deleteBackup);
router.get('/settings', getBackupSettings);
router.put('/settings', updateBackupSettings);
router.post('/restore', uploadZip.single('backup'), restoreBackup);

module.exports = router;
