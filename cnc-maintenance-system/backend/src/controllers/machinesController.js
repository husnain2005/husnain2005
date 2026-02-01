const db = require('../config/database');

/**
 * Get all machines with filtering
 * GET /api/machines
 */
const getMachines = async (req, res) => {
  try {
    const {
      numero_commessa,
      machine_type,
      model_id,
      customer_id,
      customer_name,
      axis_type,
      control_type,
      size,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        m.id,
        m.numero_commessa,
        m.serial_number,
        m.manufacturing_year,
        m.installation_date,
        m.warranty_expiry,
        m.latitude,
        m.longitude,
        m.address,
        m.notes,
        m.axis_type,
        m.control_type,
        m.is_active,
        m.created_at,
        mm.machine_type,
        mm.category,
        mm.model_name,
        ms.size_value,
        c.id as customer_id,
        c.code as customer_code,
        c.name as customer_name,
        c.city as customer_city,
        (SELECT COUNT(*) FROM issues i WHERE i.machine_id = m.id AND i.status IN ('aperta', 'in_lavorazione')) as open_issues_count
      FROM machines m
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN machine_sizes ms ON m.size_id = ms.id
      LEFT JOIN customers c ON m.customer_id = c.id
      WHERE m.is_active = true
    `;

    const params = [];
    let paramIndex = 1;

    // Apply filters
    if (numero_commessa) {
      query += ` AND m.numero_commessa ILIKE $${paramIndex++}`;
      params.push(`%${numero_commessa}%`);
    }

    if (machine_type) {
      query += ` AND mm.machine_type = $${paramIndex++}`;
      params.push(machine_type);
    }

    if (model_id) {
      query += ` AND m.model_id = $${paramIndex++}`;
      params.push(model_id);
    }

    if (customer_id) {
      query += ` AND m.customer_id = $${paramIndex++}`;
      params.push(customer_id);
    }

    if (customer_name) {
      query += ` AND c.name ILIKE $${paramIndex++}`;
      params.push(`%${customer_name}%`);
    }

    if (axis_type) {
      query += ` AND m.axis_type = $${paramIndex++}`;
      params.push(axis_type);
    }

    if (control_type) {
      query += ` AND m.control_type = $${paramIndex++}`;
      params.push(control_type);
    }

    if (size) {
      query += ` AND ms.size_value = $${paramIndex++}`;
      params.push(parseInt(size));
    }

    if (search) {
      query += ` AND (
        m.numero_commessa ILIKE $${paramIndex} OR
        m.serial_number ILIKE $${paramIndex} OR
        c.name ILIKE $${paramIndex} OR
        m.address ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM machines m
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN customers c ON m.customer_id = c.id
      WHERE m.is_active = true
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (numero_commessa) {
      countQuery += ` AND m.numero_commessa ILIKE $${countParamIndex++}`;
      countParams.push(`%${numero_commessa}%`);
    }
    if (machine_type) {
      countQuery += ` AND mm.machine_type = $${countParamIndex++}`;
      countParams.push(machine_type);
    }
    if (customer_name) {
      countQuery += ` AND c.name ILIKE $${countParamIndex++}`;
      countParams.push(`%${customer_name}%`);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      machines: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get machines error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero delle macchine'
    });
  }
};

/**
 * Get single machine by ID or numero_commessa
 * GET /api/machines/:id
 */
const getMachine = async (req, res) => {
  try {
    const { id } = req.params;

    // Allow lookup by ID or numero_commessa
    const isNumeric = /^\d+$/.test(id);
    const whereClause = isNumeric ? 'm.id = $1' : 'm.numero_commessa = $1';

    const result = await db.query(`
      SELECT
        m.*,
        mm.machine_type,
        mm.category,
        mm.model_name,
        ms.size_value,
        c.id as customer_id,
        c.code as customer_code,
        c.name as customer_name,
        c.address as customer_address,
        c.city as customer_city,
        c.phone as customer_phone,
        c.email as customer_email,
        u.username as created_by_username,
        u.full_name as created_by_name
      FROM machines m
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN machine_sizes ms ON m.size_id = ms.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON m.created_by = u.id
      WHERE ${whereClause}
    `, [isNumeric ? parseInt(id) : id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Macchina non trovata'
      });
    }

    // Get issues for this machine
    const issuesResult = await db.query(`
      SELECT
        i.*,
        ig.name as issue_group_name,
        u.full_name as created_by_name,
        ua.full_name as assigned_to_name
      FROM issues i
      LEFT JOIN issue_groups ig ON i.issue_group_id = ig.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users ua ON i.assigned_to = ua.id
      WHERE i.machine_id = $1
      ORDER BY i.created_at DESC
    `, [result.rows[0].id]);

    res.json({
      machine: result.rows[0],
      issues: issuesResult.rows
    });

  } catch (error) {
    console.error('Get machine error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero della macchina'
    });
  }
};

/**
 * Create new machine
 * POST /api/machines
 */
const createMachine = async (req, res) => {
  try {
    const {
      numero_commessa,
      model_id,
      size_id,
      customer_id,
      axis_type,
      control_type,
      serial_number,
      manufacturing_year,
      installation_date,
      warranty_expiry,
      latitude,
      longitude,
      address,
      notes
    } = req.body;

    if (!numero_commessa) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Il numero commessa è obbligatorio'
      });
    }

    // Check for duplicate numero_commessa
    const existing = await db.query(
      'SELECT id FROM machines WHERE numero_commessa = $1',
      [numero_commessa]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Duplicato',
        message: 'Una macchina con questo numero commessa esiste già'
      });
    }

    const result = await db.query(`
      INSERT INTO machines (
        numero_commessa, model_id, size_id, customer_id, axis_type, control_type,
        serial_number, manufacturing_year, installation_date, warranty_expiry,
        latitude, longitude, address, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      numero_commessa, model_id, size_id, customer_id, axis_type, control_type,
      serial_number, manufacturing_year, installation_date, warranty_expiry,
      latitude, longitude, address, notes, req.user.id
    ]);

    // Audit log
    await req.audit('machines', result.rows[0].id, 'INSERT', null, result.rows[0]);

    res.status(201).json({
      message: 'Macchina creata con successo',
      machine: result.rows[0]
    });

  } catch (error) {
    console.error('Create machine error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione della macchina'
    });
  }
};

/**
 * Update machine
 * PUT /api/machines/:id
 */
const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      model_id,
      size_id,
      customer_id,
      axis_type,
      control_type,
      serial_number,
      manufacturing_year,
      installation_date,
      warranty_expiry,
      latitude,
      longitude,
      address,
      notes
    } = req.body;

    // Get current values
    const current = await db.query('SELECT * FROM machines WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Macchina non trovata'
      });
    }

    const oldValues = current.rows[0];

    const result = await db.query(`
      UPDATE machines SET
        model_id = COALESCE($1, model_id),
        size_id = COALESCE($2, size_id),
        customer_id = COALESCE($3, customer_id),
        axis_type = COALESCE($4, axis_type),
        control_type = COALESCE($5, control_type),
        serial_number = COALESCE($6, serial_number),
        manufacturing_year = COALESCE($7, manufacturing_year),
        installation_date = COALESCE($8, installation_date),
        warranty_expiry = COALESCE($9, warranty_expiry),
        latitude = COALESCE($10, latitude),
        longitude = COALESCE($11, longitude),
        address = COALESCE($12, address),
        notes = COALESCE($13, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      model_id, size_id, customer_id, axis_type, control_type,
      serial_number, manufacturing_year, installation_date, warranty_expiry,
      latitude, longitude, address, notes, id
    ]);

    // Audit log
    await req.audit('machines', parseInt(id), 'UPDATE', oldValues, result.rows[0]);

    res.json({
      message: 'Macchina aggiornata con successo',
      machine: result.rows[0]
    });

  } catch (error) {
    console.error('Update machine error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento della macchina'
    });
  }
};

/**
 * Delete machine (soft delete)
 * DELETE /api/machines/:id
 */
const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await db.query('SELECT * FROM machines WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Macchina non trovata'
      });
    }

    await db.query(
      'UPDATE machines SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    // Audit log
    await req.audit('machines', parseInt(id), 'DELETE', current.rows[0], { is_active: false });

    res.json({
      message: 'Macchina eliminata con successo'
    });

  } catch (error) {
    console.error('Delete machine error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione della macchina'
    });
  }
};

/**
 * Get machines for map view
 * GET /api/machines/map
 */
const getMachinesForMap = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        m.id,
        m.numero_commessa,
        m.latitude,
        m.longitude,
        m.address,
        mm.machine_type,
        mm.model_name,
        c.name as customer_name,
        (SELECT COUNT(*) FROM issues i WHERE i.machine_id = m.id AND i.status IN ('aperta', 'in_lavorazione')) as open_issues_count
      FROM machines m
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN customers c ON m.customer_id = c.id
      WHERE m.is_active = true
        AND m.latitude IS NOT NULL
        AND m.longitude IS NOT NULL
    `);

    res.json({ machines: result.rows });

  } catch (error) {
    console.error('Get machines for map error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero delle macchine per la mappa'
    });
  }
};

/**
 * Get machine models and sizes
 * GET /api/machines/models
 */
const getModels = async (req, res) => {
  try {
    const modelsResult = await db.query(`
      SELECT id, machine_type, category, model_name, description
      FROM machine_models
      WHERE is_active = true
      ORDER BY machine_type, category, model_name
    `);

    const sizesResult = await db.query(`
      SELECT id, model_id, size_value, description
      FROM machine_sizes
      WHERE is_active = true
      ORDER BY model_id, size_value
    `);

    // Group sizes by model
    const sizesByModel = {};
    sizesResult.rows.forEach(size => {
      if (!sizesByModel[size.model_id]) {
        sizesByModel[size.model_id] = [];
      }
      sizesByModel[size.model_id].push(size);
    });

    const models = modelsResult.rows.map(model => ({
      ...model,
      sizes: sizesByModel[model.id] || []
    }));

    res.json({ models });

  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dei modelli'
    });
  }
};

/**
 * Get sizes for a specific model
 * GET /api/machines/models/:modelId/sizes
 */
const getSizesByModel = async (req, res) => {
  try {
    const { modelId } = req.params;

    const result = await db.query(`
      SELECT id, model_id, size_value, description
      FROM machine_sizes
      WHERE model_id = $1 AND is_active = true
      ORDER BY size_value
    `, [modelId]);

    res.json({ sizes: result.rows });

  } catch (error) {
    console.error('Get sizes error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero delle taglie'
    });
  }
};

module.exports = {
  getMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachinesForMap,
  getModels,
  getSizesByModel
};
