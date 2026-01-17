const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Extract text from PDF and parse maintenance data
 * Uses pattern matching and optional AI for complex extraction
 */
const extractMaintenanceData = async (text) => {
  const extracted = {
    numero_commessa: null,
    date: null,
    machine_type: null,
    model: null,
    customer: null,
    issue_group: null,
    issue_type: null,
    title: null,
    description: null,
    confidence: {}
  };

  // Pattern matching for comune fields
  // Numero commessa patterns
  const commessaPatterns = [
    /(?:n[°.]?\s*commessa|commessa\s*n[°.]?|order\s*n[°.]?)\s*:?\s*([A-Z0-9-]+)/i,
    /(?:COM[-\s]?\d{4}[-\s]?\d{3})/i,
    /(?:numero\s+commessa)\s*:?\s*([A-Z0-9-]+)/i
  ];

  for (const pattern of commessaPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.numero_commessa = match[1] || match[0];
      extracted.confidence.numero_commessa = 0.9;
      break;
    }
  }

  // Date patterns
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.date = match[1];
      extracted.confidence.date = 0.8;
      break;
    }
  }

  // Machine type
  if (/tornio/i.test(text)) {
    extracted.machine_type = 'TORNIO';
    extracted.confidence.machine_type = 0.9;
  } else if (/foratr/i.test(text)) {
    extracted.machine_type = 'FORATRICE';
    extracted.confidence.machine_type = 0.9;
  } else if (/pico/i.test(text)) {
    extracted.machine_type = 'PICO';
    extracted.confidence.machine_type = 0.9;
  }

  // Model patterns
  const modelPatterns = [
    /(?:modello|model)\s*:?\s*(GGL|GGTRONIC|GGB|PICO|TORNIO.VERTICALE)/i,
    /(GGTRONIC|GGL|GGB)/i
  ];

  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.model = match[1].toUpperCase();
      extracted.confidence.model = 0.85;
      break;
    }
  }

  // Issue type
  if (/elettric/i.test(text)) {
    extracted.issue_type = 'ELETTRICO';
    extracted.confidence.issue_type = 0.8;
  } else if (/meccanic/i.test(text)) {
    extracted.issue_type = 'MECCANICO';
    extracted.confidence.issue_type = 0.8;
  }

  // Issue group detection
  const groupMappings = {
    'TESTA_PORTA_PEZZO': /testa\s*porta\s*pezzo|mandrino\s*principale/i,
    'CONTROPUNTA': /contropunta/i,
    'CARRO': /carro|carrello|slitte/i,
    'CONVOGLIATORI': /convogliator|trucioli/i,
    'PULSANTIERA_CN': /pulsantiera|pannello\s*operatore/i,
    'LUNETTE': /lunett/i,
    'MANDRINO': /mandrino/i,
    'SISTEMA_IDRAULICO': /idraulic/i,
    'SISTEMA_LUBRIFICAZIONE': /lubrific/i,
    'ELETTRONICA': /elettronic|cnc|plc|inverter/i
  };

  for (const [group, pattern] of Object.entries(groupMappings)) {
    if (pattern.test(text)) {
      extracted.issue_group = group;
      extracted.confidence.issue_group = 0.7;
      break;
    }
  }

  // Customer - look for common patterns
  const customerPatterns = [
    /(?:cliente|customer|ditta)\s*:?\s*([A-Za-z\s]+(?:S\.?[rp]\.?[la]\.?|S\.?A\.?|GmbH|Inc\.?)?)/i
  ];

  for (const pattern of customerPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.customer = match[1].trim();
      extracted.confidence.customer = 0.6;
      break;
    }
  }

  // Try to extract title and description
  const titlePatterns = [
    /(?:oggetto|subject|titolo)\s*:?\s*(.+?)(?:\n|$)/i,
    /(?:problema|guasto|fault)\s*:?\s*(.+?)(?:\n|$)/i
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.title = match[1].trim().substring(0, 200);
      extracted.confidence.title = 0.7;
      break;
    }
  }

  // Use remaining text as description (truncated)
  if (!extracted.title && text.length > 50) {
    // First meaningful line as title
    const lines = text.split('\n').filter(l => l.trim().length > 10);
    if (lines.length > 0) {
      extracted.title = lines[0].substring(0, 200);
      extracted.confidence.title = 0.4;
    }
  }

  // Description - look for description section or use text body
  const descPatterns = [
    /(?:descrizione|description)\s*:?\s*([\s\S]+?)(?:(?=\n[A-Z])|$)/i
  ];

  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match) {
      extracted.description = match[1].trim().substring(0, 2000);
      extracted.confidence.description = 0.7;
      break;
    }
  }

  if (!extracted.description) {
    extracted.description = text.substring(0, 2000);
    extracted.confidence.description = 0.3;
  }

  return extracted;
};

/**
 * Upload and process PDF for data extraction
 * POST /api/pdf/upload
 */
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Nessun file',
        message: 'Nessun file PDF caricato'
      });
    }

    // Read and parse PDF
    const filePath = req.file.path;
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    // Extract structured data
    const extractedData = await extractMaintenanceData(text);

    // Save to database
    const result = await db.query(`
      INSERT INTO pdf_imports (
        original_filename, file_path, file_size, extracted_data,
        processed_at, status, uploaded_by
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'processed', $5)
      RETURNING *
    `, [
      req.file.originalname,
      path.join('pdfs', req.file.filename),
      req.file.size,
      JSON.stringify({
        ...extractedData,
        raw_text: text.substring(0, 5000), // Store truncated raw text
        pages: pdfData.numpages
      }),
      req.user.id
    ]);

    res.status(201).json({
      message: 'PDF elaborato con successo',
      import: result.rows[0],
      extracted: extractedData,
      raw_text_preview: text.substring(0, 500)
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    // Clean up file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'elaborazione del PDF'
    });
  }
};

/**
 * Get all PDF imports
 * GET /api/pdf/imports
 */
const getImports = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT pi.*, u.full_name as uploaded_by_name, ur.full_name as reviewed_by_name
      FROM pdf_imports pi
      LEFT JOIN users u ON pi.uploaded_by = u.id
      LEFT JOIN users ur ON pi.reviewed_by = ur.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND pi.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY pi.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({ imports: result.rows });

  } catch (error) {
    console.error('Get imports error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero delle importazioni'
    });
  }
};

/**
 * Get single PDF import
 * GET /api/pdf/imports/:id
 */
const getImport = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT pi.*, u.full_name as uploaded_by_name, ur.full_name as reviewed_by_name
      FROM pdf_imports pi
      LEFT JOIN users u ON pi.uploaded_by = u.id
      LEFT JOIN users ur ON pi.reviewed_by = ur.id
      WHERE pi.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Importazione non trovata'
      });
    }

    res.json({ import: result.rows[0] });

  } catch (error) {
    console.error('Get import error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dell\'importazione'
    });
  }
};

/**
 * Update extracted data (for review/correction)
 * PUT /api/pdf/imports/:id
 */
const updateImport = async (req, res) => {
  try {
    const { id } = req.params;
    const { extracted_data } = req.body;

    const result = await db.query(`
      UPDATE pdf_imports
      SET extracted_data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(extracted_data), id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Importazione non trovata'
      });
    }

    res.json({
      message: 'Dati aggiornati con successo',
      import: result.rows[0]
    });

  } catch (error) {
    console.error('Update import error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento'
    });
  }
};

/**
 * Confirm and create issue from PDF import
 * POST /api/pdf/imports/:id/confirm
 */
const confirmImport = async (req, res) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { data } = req.body; // Corrected/confirmed data

    // Get the import
    const importResult = await client.query(
      'SELECT * FROM pdf_imports WHERE id = $1',
      [id]
    );

    if (importResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Importazione non trovata'
      });
    }

    const pdfImport = importResult.rows[0];

    // Try to find or use the machine
    let machineId = null;
    if (data.numero_commessa) {
      const machineResult = await client.query(
        'SELECT id FROM machines WHERE numero_commessa = $1',
        [data.numero_commessa]
      );
      if (machineResult.rows.length > 0) {
        machineId = machineResult.rows[0].id;
      }
    }

    // Get issue group if specified
    let issueGroupId = null;
    if (data.issue_group) {
      const groupResult = await client.query(
        'SELECT id FROM issue_groups WHERE code = $1',
        [data.issue_group]
      );
      if (groupResult.rows.length > 0) {
        issueGroupId = groupResult.rows[0].id;
      }
    }

    // Create the issue
    const issueResult = await client.query(`
      INSERT INTO issues (
        machine_id, numero_commessa, machine_type_fallback, model_fallback,
        customer_fallback, issue_group_id, issue_type, title, description,
        status, priority, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'aperta', 'media', $10)
      RETURNING *
    `, [
      machineId,
      data.numero_commessa,
      data.machine_type,
      data.model,
      data.customer,
      issueGroupId,
      data.issue_type || 'MECCANICO',
      data.title || 'Problema importato da PDF',
      data.description,
      req.user.id
    ]);

    // Update PDF import status
    await client.query(`
      UPDATE pdf_imports
      SET status = 'completed',
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          created_issues = array_append(created_issues, $2)
      WHERE id = $3
    `, [req.user.id, issueResult.rows[0].id, id]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Problematica creata con successo dall\'importazione PDF',
      issue: issueResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Confirm import error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione della problematica'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete PDF import
 * DELETE /api/pdf/imports/:id
 */
const deleteImport = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM pdf_imports WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Importazione non trovata'
      });
    }

    const pdfImport = result.rows[0];

    // Delete from database
    await db.query('DELETE FROM pdf_imports WHERE id = $1', [id]);

    // Delete file
    const filePath = path.join(UPLOAD_DIR, pdfImport.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      message: 'Importazione eliminata con successo'
    });

  } catch (error) {
    console.error('Delete import error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione'
    });
  }
};

module.exports = {
  uploadPdf,
  getImports,
  getImport,
  updateImport,
  confirmImport,
  deleteImport
};
