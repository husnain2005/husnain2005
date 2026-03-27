const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Upload attachments to an issue
 * POST /api/issues/:id/attachments
 */
const uploadAttachments = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if issue exists
    const issueCheck = await db.query('SELECT id FROM issues WHERE id = $1', [id]);
    if (issueCheck.rows.length === 0) {
      // Clean up uploaded files
      if (req.files) {
        req.files.forEach(file => {
          fs.unlink(file.path, () => {});
        });
      }
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Problematica non trovata'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Nessun file',
        message: 'Nessun file caricato'
      });
    }

    const attachments = [];

    for (const file of req.files) {
      let thumbnailPath = null;

      // Create thumbnail for images
      if (file.mimetype.startsWith('image/')) {
        try {
          const thumbnailName = `thumb_${path.basename(file.filename)}`;
          thumbnailPath = path.join('thumbnails', thumbnailName);
          const fullThumbnailPath = path.join(UPLOAD_DIR, thumbnailPath);

          await sharp(file.path)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(fullThumbnailPath);
        } catch (err) {
          console.error('Thumbnail creation error:', err);
          // Continue without thumbnail
        }
      }

      const result = await db.query(`
        INSERT INTO attachments (
          issue_id, filename, original_filename, file_path,
          file_size, mime_type, thumbnail_path, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        id,
        file.filename,
        file.originalname,
        path.join('attachments', file.filename),
        file.size,
        file.mimetype,
        thumbnailPath,
        req.user.id
      ]);

      attachments.push(result.rows[0]);
    }

    res.status(201).json({
      message: `${attachments.length} file caricati con successo`,
      attachments
    });

  } catch (error) {
    console.error('Upload attachments error:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, () => {});
      });
    }
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il caricamento dei file'
    });
  }
};

/**
 * Get attachment file
 * GET /api/attachments/:id
 */
const getAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const { thumbnail } = req.query;

    const result = await db.query(
      'SELECT * FROM attachments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'File non trovato'
      });
    }

    const attachment = result.rows[0];
    let filePath;

    if (thumbnail === 'true' && attachment.thumbnail_path) {
      filePath = path.join(UPLOAD_DIR, attachment.thumbnail_path);
    } else {
      filePath = path.join(UPLOAD_DIR, attachment.file_path);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File non trovato',
        message: 'Il file non esiste più sul server'
      });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.original_filename}"`);
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('Get attachment error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero del file'
    });
  }
};

/**
 * Download attachment
 * GET /api/attachments/:id/download
 */
const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM attachments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'File non trovato'
      });
    }

    const attachment = result.rows[0];
    const filePath = path.join(UPLOAD_DIR, attachment.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File non trovato',
        message: 'Il file non esiste più sul server'
      });
    }

    res.download(path.resolve(filePath), attachment.original_filename);

  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il download del file'
    });
  }
};

/**
 * Delete attachment
 * DELETE /api/attachments/:id
 */
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM attachments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'File non trovato'
      });
    }

    const attachment = result.rows[0];

    // Check permissions (only uploader or admin can delete)
    if (req.user.role !== 'admin' && attachment.uploaded_by !== req.user.id) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non hai i permessi per eliminare questo file'
      });
    }

    // Delete from database
    await db.query('DELETE FROM attachments WHERE id = $1', [id]);

    // Delete files from disk
    const filePath = path.join(UPLOAD_DIR, attachment.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (attachment.thumbnail_path) {
      const thumbnailPath = path.join(UPLOAD_DIR, attachment.thumbnail_path);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    res.json({
      message: 'File eliminato con successo'
    });

  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione del file'
    });
  }
};

module.exports = {
  uploadAttachments,
  getAttachment,
  downloadAttachment,
  deleteAttachment
};
