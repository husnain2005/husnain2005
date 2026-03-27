const db = require('../config/database');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * Extract text from PDF and parse maintenance data
 * Optimized for "Registro non conformità" form from Giuseppe Giana
 */
const extractMaintenanceData = async (text) => {
  const extracted = {
    numero_commessa: null,
    date: null,
    author: null,
    machine_type: null,
    model: null,
    customer: null,
    issue_group: null,
    issue_type: null,
    title: null,
    description: null,
    resolution_notes: null,
    defect_types: [],
    confidence: {}
  };

  // Clean text - normalize whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // ========================================
  // NUMERO COMMESSA - Pattern: "Commessa N°" followed by number
  // Format examples: 25_0052, 24_0033
  // ========================================
  const commessaPatterns = [
    /Commessa\s*N[°º]?\s*[:\s]*([0-9]{2}[_\-][0-9]{4})/i,
    /Commessa\s*N[°º]?\s*[:\s]*([A-Z0-9][A-Z0-9_\-]+)/i,
    /N[°º]?\s*Commessa\s*[:\s]*([0-9]{2}[_\-][0-9]{4})/i,
    /([0-9]{2}[_][0-9]{4})/  // Standalone pattern like 25_0052
  ];

  for (const pattern of commessaPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted.numero_commessa = match[1].trim();
      extracted.confidence.numero_commessa = 0.95;
      break;
    }
  }

  // ========================================
  // DATA COMPILAZIONE - Pattern: "Data Compilazione" followed by date
  // Format: DD/MM/YYYY
  // ========================================
  const datePatterns = [
    /Data\s*Compilazione\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /Data\s*[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted.date = match[1].trim();
      extracted.confidence.date = 0.9;
      break;
    }
  }

  // ========================================
  // AUTORE - Pattern: "Autore" followed by name
  // ========================================
  const authorPatterns = [
    /Autore\s*[:\s]*([A-Za-zÀ-ÿ\s]+?)(?=\s*Tipologia|\s*$|\s*\n)/i,
    /Autore\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/i
  ];

  for (const pattern of authorPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      extracted.author = match[1].trim();
      extracted.confidence.author = 0.85;
      break;
    }
  }

  // ========================================
  // TIPOLOGIA DIFETTO - Detect checked defect types
  // Map defect types to issue types and groups
  // ========================================
  const defectTypeMapping = {
    // Defect text => { issueType, issueGroup }
    'disegno non corretto': { type: 'MECCANICO', group: 'ALTRO' },
    'pezzo non conforme al disegno': { type: 'MECCANICO', group: 'ALTRO' },
    'difficoltà di montaggio': { type: 'MECCANICO', group: 'ALTRO' },
    'difficoltà nella lavorazione meccanica': { type: 'MECCANICO', group: 'CARRO' },
    'schema elettrico non corretto': { type: 'ELETTRICO', group: 'ELETTRONICA' },
    'problema plc': { type: 'ELETTRICO', group: 'ELETTRONICA' },
    'problema cnc': { type: 'ELETTRICO', group: 'PULSANTIERA_CN' },
    'plc/cnc': { type: 'ELETTRICO', group: 'ELETTRONICA' },
    'strumenti per montaggio non adeguati': { type: 'MECCANICO', group: 'ALTRO' },
    'problemi di sicurezza': { type: 'MECCANICO', group: 'ALTRO' },
    'idraulica': { type: 'MECCANICO', group: 'SISTEMA_IDRAULICO' },
    'centralina idraulica': { type: 'MECCANICO', group: 'SISTEMA_IDRAULICO' },
    'carpenterie': { type: 'MECCANICO', group: 'ALTRO' },
    'lamiere': { type: 'MECCANICO', group: 'ALTRO' },
    'non conformità della merce': { type: 'MECCANICO', group: 'ALTRO' },
    'manuali': { type: 'MECCANICO', group: 'ALTRO' },
    'libri istruzioni': { type: 'MECCANICO', group: 'ALTRO' },
    'refrigerazione': { type: 'MECCANICO', group: 'SISTEMA_LUBRIFICAZIONE' },
    'lubrificazione': { type: 'MECCANICO', group: 'SISTEMA_LUBRIFICAZIONE' }
  };

  // Check which defect types are mentioned (likely checked in the form)
  const detectedDefects = [];
  for (const [defectText, mapping] of Object.entries(defectTypeMapping)) {
    if (cleanText.toLowerCase().includes(defectText)) {
      detectedDefects.push({ text: defectText, ...mapping });
    }
  }

  if (detectedDefects.length > 0) {
    extracted.defect_types = detectedDefects.map(d => d.text);
    // Use the first detected defect for issue type and group
    extracted.issue_type = detectedDefects[0].type;
    extracted.issue_group = detectedDefects[0].group;
    extracted.confidence.issue_type = 0.8;
    extracted.confidence.issue_group = 0.7;
  }

  // ========================================
  // DESCRIZIONE NON CONFORMITÀ - Main description
  // ========================================
  const descPatterns = [
    /Descrizione\s*non\s*conformit[àa]\s*[:\s]*([\s\S]*?)(?=Suggerimenti|Migliorie|$)/i,
    /Descrizione\s*[:\s]*([\s\S]*?)(?=Suggerimenti|$)/i
  ];

  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const desc = match[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/Suggerimenti.*$/i, '')
        .trim();
      if (desc.length > 5) {
        extracted.description = desc.substring(0, 2000);
        extracted.confidence.description = 0.9;

        // Use first part of description as title if no title yet
        if (!extracted.title) {
          extracted.title = desc.substring(0, 150);
          if (extracted.title.length === 150) {
            extracted.title = extracted.title.substring(0, extracted.title.lastIndexOf(' ')) + '...';
          }
          extracted.confidence.title = 0.85;
        }
        break;
      }
    }
  }

  // ========================================
  // SUGGERIMENTI/MIGLIORIE - Resolution notes
  // ========================================
  const suggPatterns = [
    /Suggerimenti\s*[\/]?\s*Migliorie\s*[:\s]*([\s\S]*?)$/i,
    /Suggerimenti\s*[:\s]*([\s\S]*?)$/i,
    /Migliorie\s*[:\s]*([\s\S]*?)$/i
  ];

  for (const pattern of suggPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const suggestion = match[1].trim().replace(/\s+/g, ' ');
      if (suggestion.length > 3) {
        extracted.resolution_notes = suggestion.substring(0, 2000);
        extracted.confidence.resolution_notes = 0.85;
        break;
      }
    }
  }

  // ========================================
  // FALLBACK: If no description, use full text
  // ========================================
  if (!extracted.description && text.length > 50) {
    // Remove header/form labels and use remaining content
    let cleanedText = text
      .replace(/Registro\s*non\s*conformit[àa]/gi, '')
      .replace(/Commessa\s*N[°º]?/gi, '')
      .replace(/Data\s*Compilazione/gi, '')
      .replace(/Tipologia\s*difetto/gi, '')
      .replace(/Autore/gi, '')
      .replace(/Descrizione\s*non\s*conformit[àa]/gi, '')
      .replace(/Suggerimenti\s*[\/]?\s*Migliorie/gi, '')
      .trim();

    if (cleanedText.length > 20) {
      extracted.description = cleanedText.substring(0, 2000);
      extracted.confidence.description = 0.4;
    }
  }

  // ========================================
  // DEFAULT ISSUE TYPE if not detected
  // ========================================
  if (!extracted.issue_type) {
    // Check for electrical keywords in description
    const electricalKeywords = /elettric|plc|cnc|encoder|inverter|azionamento|cablaggio|tensione|corrente/i;
    if (extracted.description && electricalKeywords.test(extracted.description)) {
      extracted.issue_type = 'ELETTRICO';
      extracted.confidence.issue_type = 0.6;
    } else {
      extracted.issue_type = 'MECCANICO';
      extracted.confidence.issue_type = 0.5;
    }
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
