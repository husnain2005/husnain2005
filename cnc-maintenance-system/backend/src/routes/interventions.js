const express = require('express');
const router = express.Router();
const interventionsController = require('../controllers/interventionsController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload, handleUpload } = require('../middleware/upload');

// All routes require authentication
router.use(authenticateToken);

// Get all interventions (with filtering)
router.get('/', interventionsController.getInterventions);

// Get calendar data
router.get('/calendar', interventionsController.getCalendar);

// Get single intervention
router.get('/:id', interventionsController.getIntervention);

// Create new intervention (admin or tecnico)
router.post('/', requireRole(['admin', 'tecnico']), interventionsController.createIntervention);

// Update intervention
router.put('/:id', requireRole(['admin', 'tecnico']), interventionsController.updateIntervention);

// Delete intervention (admin only)
router.delete('/:id', requireRole(['admin']), interventionsController.deleteIntervention);

// Add day to intervention
router.post('/:id/days', requireRole(['admin', 'tecnico']), interventionsController.addInterventionDay);

// Add material to intervention
router.post('/:id/materials', requireRole(['admin', 'tecnico']), interventionsController.addInterventionMaterial);

// Add daily report
router.post('/:id/reports', requireRole(['admin', 'tecnico']), interventionsController.addInterventionReport);

// Complete intervention
router.put('/:id/complete', requireRole(['admin', 'tecnico']), interventionsController.completeIntervention);

// Upload document to intervention
router.post('/:id/documents', requireRole(['admin', 'tecnico']), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, description } = req.body;
    const db = require('../config/database');

    if (!req.file) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Nessun file caricato'
      });
    }

    const result = await db.query(`
      INSERT INTO intervention_documents (
        intervention_id, filename, original_filename, file_path,
        file_size, mime_type, document_type, description, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      document_type || 'altro',
      description || null,
      req.user.id
    ]);

    res.status(201).json({
      message: 'Documento caricato con successo',
      document: result.rows[0]
    });

  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il caricamento del documento'
    });
  }
});

// Delete document
router.delete('/:id/documents/:docId', requireRole(['admin', 'tecnico']), async (req, res) => {
  try {
    const { id, docId } = req.params;
    const db = require('../config/database');
    const fs = require('fs').promises;

    const docResult = await db.query(
      'SELECT * FROM intervention_documents WHERE id = $1 AND intervention_id = $2',
      [docId, id]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Documento non trovato'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(docResult.rows[0].file_path);
    } catch (fileError) {
      console.warn('Could not delete file:', fileError);
    }

    await db.query('DELETE FROM intervention_documents WHERE id = $1', [docId]);

    res.json({
      message: 'Documento eliminato con successo'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione del documento'
    });
  }
});

// Delete material
router.delete('/:id/materials/:materialId', requireRole(['admin', 'tecnico']), async (req, res) => {
  try {
    const { id, materialId } = req.params;
    const db = require('../config/database');

    const result = await db.query(
      'DELETE FROM intervention_materials WHERE id = $1 AND intervention_id = $2 RETURNING *',
      [materialId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Materiale non trovato'
      });
    }

    res.json({
      message: 'Materiale eliminato con successo'
    });

  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione del materiale'
    });
  }
});

// Update day
router.put('/:id/days/:dayId', requireRole(['admin', 'tecnico']), async (req, res) => {
  try {
    const { id, dayId } = req.params;
    const { start_time, end_time, hours_worked, travel_hours, work_description, notes } = req.body;
    const db = require('../config/database');

    const result = await db.query(`
      UPDATE intervention_days SET
        start_time = COALESCE($1, start_time),
        end_time = COALESCE($2, end_time),
        hours_worked = COALESCE($3, hours_worked),
        travel_hours = COALESCE($4, travel_hours),
        work_description = COALESCE($5, work_description),
        notes = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND intervention_id = $8
      RETURNING *
    `, [start_time, end_time, hours_worked, travel_hours, work_description, notes, dayId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Giornata non trovata'
      });
    }

    res.json({
      message: 'Giornata aggiornata con successo',
      day: result.rows[0]
    });

  } catch (error) {
    console.error('Update day error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento della giornata'
    });
  }
});

// Delete day
router.delete('/:id/days/:dayId', requireRole(['admin', 'tecnico']), async (req, res) => {
  try {
    const { id, dayId } = req.params;
    const db = require('../config/database');

    const result = await db.query(
      'DELETE FROM intervention_days WHERE id = $1 AND intervention_id = $2 RETURNING *',
      [dayId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Giornata non trovata'
      });
    }

    res.json({
      message: 'Giornata eliminata con successo'
    });

  } catch (error) {
    console.error('Delete day error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione della giornata'
    });
  }
});

module.exports = router;
