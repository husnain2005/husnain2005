const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    UPLOAD_DIR,
    path.join(UPLOAD_DIR, 'attachments'),
    path.join(UPLOAD_DIR, 'thumbnails'),
    path.join(UPLOAD_DIR, 'pdfs')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectories();

// Configure storage for attachments
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'attachments'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Configure storage for PDFs
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'pdfs'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}.pdf`;
    cb(null, uniqueName);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo immagini (JPEG, PNG, GIF, WebP) sono permesse'), false);
  }
};

// File filter for attachments (images + documents + videos)
const attachmentFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'video/mp4', 'video/webm', 'video/ogg',
    'video/quicktime', 'video/x-msvideo', 'video/x-matroska'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo file non permesso'), false);
  }
};

// File filter for PDFs only
const pdfFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Solo file PDF sono permessi'), false);
  }
};

const MAX_VIDEO_SIZE = parseInt(process.env.MAX_VIDEO_SIZE) || 500 * 1024 * 1024; // 500MB

// Upload middleware for attachments (no video — 10MB limit)
const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10
  },
  fileFilter: attachmentFilter
});

// Upload middleware for attachments including videos (500MB limit)
const uploadAttachmentWithVideo = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 10
  },
  fileFilter: attachmentFilter
});

// Upload middleware for PDFs
const uploadPdf = multer({
  storage: pdfStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for PDFs
    files: 1
  },
  fileFilter: pdfFilter
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File troppo grande',
        message: `La dimensione massima è ${MAX_FILE_SIZE / 1024 / 1024}MB per documenti e ${MAX_VIDEO_SIZE / 1024 / 1024}MB per video`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Troppi file',
        message: 'Puoi caricare massimo 10 file alla volta'
      });
    }
    return res.status(400).json({
      error: 'Errore upload',
      message: err.message
    });
  }
  if (err) {
    return res.status(400).json({
      error: 'Errore upload',
      message: err.message
    });
  }
  next();
};

module.exports = {
  uploadAttachment,
  uploadAttachmentWithVideo,
  uploadPdf,
  handleUploadError,
  UPLOAD_DIR
};
