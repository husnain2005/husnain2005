const db = require('../config/database');

/**
 * Get all interventions with filtering
 * GET /api/interventions
 */
const getInterventions = async (req, res) => {
  try {
    const {
      status,
      assigned_to,
      machine_id,
      numero_commessa,
      customer_id,
      from_date,
      to_date,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        i.*,
        m.numero_commessa,
        mm.machine_type,
        mm.model_name,
        ms.size_value,
        c.id as customer_id,
        c.name as customer_name,
        c.city as customer_city,
        c.address as customer_address,
        u.full_name as assigned_to_name,
        u.username as assigned_to_username,
        uc.full_name as created_by_name,
        iss.title as issue_title,
        iss.status as issue_status,
        (SELECT COUNT(*) FROM intervention_days id WHERE id.intervention_id = i.id) as total_days,
        (SELECT SUM(hours_worked) FROM intervention_days id WHERE id.intervention_id = i.id) as total_hours,
        (SELECT COUNT(*) FROM intervention_materials im WHERE im.intervention_id = i.id) as materials_count,
        (SELECT COUNT(*) FROM intervention_documents doc WHERE doc.intervention_id = i.id) as documents_count
      FROM interventions i
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN machine_sizes ms ON m.size_id = ms.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users uc ON i.created_by = uc.id
      LEFT JOIN issues iss ON i.issue_id = iss.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    if (assigned_to) {
      query += ` AND i.assigned_to = $${paramIndex++}`;
      params.push(assigned_to);
    }

    if (machine_id) {
      query += ` AND i.machine_id = $${paramIndex++}`;
      params.push(machine_id);
    }

    if (numero_commessa) {
      query += ` AND m.numero_commessa ILIKE $${paramIndex++}`;
      params.push(`%${numero_commessa}%`);
    }

    if (customer_id) {
      query += ` AND c.id = $${paramIndex++}`;
      params.push(customer_id);
    }

    if (from_date) {
      query += ` AND i.scheduled_date >= $${paramIndex++}`;
      params.push(from_date);
    }

    if (to_date) {
      query += ` AND i.scheduled_date <= $${paramIndex++}`;
      params.push(to_date);
    }

    if (search) {
      query += ` AND (
        m.numero_commessa ILIKE $${paramIndex} OR
        c.name ILIKE $${paramIndex} OR
        i.description ILIKE $${paramIndex} OR
        u.full_name ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const limitParam = paramIndex++;
    const offsetParam = paramIndex++;
    query += ` ORDER BY i.scheduled_date DESC, i.created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count — reuse same filter params (strip LIMIT/OFFSET)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM interventions i
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE 1=1
    `;
    const countParams = params.slice(0, params.length - 2); // Remove LIMIT and OFFSET
    let countIndex = 1;

    if (status) {
      countQuery += ` AND i.status = $${countIndex++}`;
    }
    if (assigned_to) {
      countQuery += ` AND i.assigned_to = $${countIndex++}`;
    }
    if (machine_id) {
      countQuery += ` AND i.machine_id = $${countIndex++}`;
    }
    if (numero_commessa) {
      countQuery += ` AND m.numero_commessa ILIKE $${countIndex++}`;
    }
    if (customer_id) {
      countQuery += ` AND c.id = $${countIndex++}`;
    }
    if (from_date) {
      countQuery += ` AND i.scheduled_date >= $${countIndex++}`;
    }
    if (to_date) {
      countQuery += ` AND i.scheduled_date <= $${countIndex++}`;
    }
    if (search) {
      countQuery += ` AND (
        m.numero_commessa ILIKE $${countIndex} OR
        c.name ILIKE $${countIndex} OR
        i.description ILIKE $${countIndex} OR
        u.full_name ILIKE $${countIndex}
      )`;
      countIndex++;
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      interventions: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get interventions error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero degli interventi'
    });
  }
};

/**
 * Get single intervention by ID
 * GET /api/interventions/:id
 */
const getIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    // Get intervention with all details
    const result = await db.query(`
      SELECT
        i.*,
        m.numero_commessa,
        m.serial_number,
        m.address as machine_address,
        m.latitude,
        m.longitude,
        mm.machine_type,
        mm.model_name,
        mm.category,
        ms.size_value,
        c.id as customer_id,
        c.code as customer_code,
        c.name as customer_name,
        c.address as customer_address,
        c.city as customer_city,
        c.phone as customer_phone,
        c.email as customer_email,
        u.full_name as assigned_to_name,
        u.username as assigned_to_username,
        u.email as assigned_to_email,
        uc.full_name as created_by_name,
        iss.id as issue_id,
        iss.title as issue_title,
        iss.description as issue_description,
        iss.status as issue_status,
        iss.priority as issue_priority,
        iss.issue_type
      FROM interventions i
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN machine_sizes ms ON m.size_id = ms.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON i.assigned_to = u.id
      LEFT JOIN users uc ON i.created_by = uc.id
      LEFT JOIN issues iss ON i.issue_id = iss.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Intervento non trovato'
      });
    }

    // Get technicians
    const techniciansResult = await db.query(`
      SELECT it.*, u.full_name, u.username, u.email
      FROM intervention_technicians it
      LEFT JOIN users u ON it.user_id = u.id
      WHERE it.intervention_id = $1
    `, [id]);

    // Get days
    const daysResult = await db.query(`
      SELECT * FROM intervention_days
      WHERE intervention_id = $1
      ORDER BY work_date ASC
    `, [id]);

    // Get materials
    const materialsResult = await db.query(`
      SELECT im.*, u.full_name as created_by_name
      FROM intervention_materials im
      LEFT JOIN users u ON im.created_by = u.id
      WHERE im.intervention_id = $1
      ORDER BY im.created_at DESC
    `, [id]);

    // Get documents
    const documentsResult = await db.query(`
      SELECT doc.*, u.full_name as uploaded_by_name
      FROM intervention_documents doc
      LEFT JOIN users u ON doc.uploaded_by = u.id
      WHERE doc.intervention_id = $1
      ORDER BY doc.created_at DESC
    `, [id]);

    // Get daily reports
    const reportsResult = await db.query(`
      SELECT r.*, u.full_name as created_by_name
      FROM intervention_reports r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.intervention_id = $1
      ORDER BY r.report_date DESC
    `, [id]);

    res.json({
      intervention: result.rows[0],
      technicians: techniciansResult.rows,
      days: daysResult.rows,
      materials: materialsResult.rows,
      documents: documentsResult.rows,
      reports: reportsResult.rows
    });

  } catch (error) {
    console.error('Get intervention error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dell\'intervento'
    });
  }
};

/**
 * Create new intervention
 * POST /api/interventions
 */
const createIntervention = async (req, res) => {
  try {
    const {
      machine_id,
      issue_id,
      assigned_to,
      scheduled_date,
      scheduled_end_date,
      description,
      problem_description,
      is_billable,
      technicians
    } = req.body;

    if (!machine_id || !scheduled_date) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Macchina e data programmata sono obbligatorie'
      });
    }

    const result = await db.query(`
      INSERT INTO interventions (
        machine_id, issue_id, assigned_to, scheduled_date, scheduled_end_date,
        description, problem_description, is_billable, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      machine_id, issue_id || null, assigned_to || null, scheduled_date,
      scheduled_end_date || null, description || null, problem_description || null,
      is_billable !== false, req.user.id
    ]);

    const interventionId = result.rows[0].id;

    // Add technicians if provided
    if (technicians && technicians.length > 0) {
      for (const techId of technicians) {
        await db.query(`
          INSERT INTO intervention_technicians (intervention_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (intervention_id, user_id) DO NOTHING
        `, [interventionId, techId]);
      }
    }

    // If assigned_to is set, add them as primary technician
    if (assigned_to) {
      await db.query(`
        INSERT INTO intervention_technicians (intervention_id, user_id, role)
        VALUES ($1, $2, 'responsabile')
        ON CONFLICT (intervention_id, user_id) DO UPDATE SET role = 'responsabile'
      `, [interventionId, assigned_to]);
    }

    // Audit log
    await req.audit('interventions', interventionId, 'INSERT', null, result.rows[0]);

    res.status(201).json({
      message: 'Intervento creato con successo',
      intervention: result.rows[0]
    });

  } catch (error) {
    console.error('Create intervention error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione dell\'intervento'
    });
  }
};

/**
 * Update intervention
 * PUT /api/interventions/:id
 */
const updateIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      machine_id,
      issue_id,
      assigned_to,
      status,
      scheduled_date,
      scheduled_end_date,
      actual_start_date,
      actual_end_date,
      description,
      problem_description,
      resolution_summary,
      travel_notes,
      is_billable
    } = req.body;

    const current = await db.query('SELECT * FROM interventions WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Intervento non trovato'
      });
    }

    const oldValues = current.rows[0];

    const result = await db.query(`
      UPDATE interventions SET
        machine_id = COALESCE($1, machine_id),
        issue_id = $2,
        assigned_to = $3,
        status = COALESCE($4, status),
        scheduled_date = COALESCE($5, scheduled_date),
        scheduled_end_date = $6,
        actual_start_date = $7,
        actual_end_date = $8,
        description = $9,
        problem_description = $10,
        resolution_summary = $11,
        travel_notes = $12,
        is_billable = COALESCE($13, is_billable),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      machine_id, issue_id, assigned_to, status, scheduled_date,
      scheduled_end_date, actual_start_date, actual_end_date,
      description, problem_description, resolution_summary, travel_notes,
      is_billable, id
    ]);

    // Audit log
    await req.audit('interventions', parseInt(id), 'UPDATE', oldValues, result.rows[0]);

    res.json({
      message: 'Intervento aggiornato con successo',
      intervention: result.rows[0]
    });

  } catch (error) {
    console.error('Update intervention error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento dell\'intervento'
    });
  }
};

/**
 * Delete intervention
 * DELETE /api/interventions/:id
 */
const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await db.query('SELECT * FROM interventions WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Intervento non trovato'
      });
    }

    await db.query('DELETE FROM interventions WHERE id = $1', [id]);

    // Audit log
    await req.audit('interventions', parseInt(id), 'DELETE', current.rows[0], null);

    res.json({
      message: 'Intervento eliminato con successo'
    });

  } catch (error) {
    console.error('Delete intervention error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione dell\'intervento'
    });
  }
};

/**
 * Add day to intervention
 * POST /api/interventions/:id/days
 */
const addInterventionDay = async (req, res) => {
  try {
    const { id } = req.params;
    const { work_date, start_time, end_time, hours_worked, travel_hours, work_description, notes } = req.body;

    if (!work_date) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'La data è obbligatoria'
      });
    }

    const result = await db.query(`
      INSERT INTO intervention_days (
        intervention_id, work_date, start_time, end_time, hours_worked,
        travel_hours, work_description, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, work_date, start_time, end_time, hours_worked, travel_hours, work_description, notes, req.user.id]);

    // Update intervention status if this is the first day
    await db.query(`
      UPDATE interventions SET
        status = 'in_corso',
        actual_start_date = COALESCE(actual_start_date, $2),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'programmato'
    `, [id, work_date]);

    res.status(201).json({
      message: 'Giornata aggiunta con successo',
      day: result.rows[0]
    });

  } catch (error) {
    console.error('Add intervention day error:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Duplicato',
        message: 'Esiste già una giornata per questa data'
      });
    }
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiunta della giornata'
    });
  }
};

/**
 * Add material to intervention
 * POST /api/interventions/:id/materials
 */
const addInterventionMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { material_name, part_number, quantity, unit, unit_cost, notes } = req.body;

    if (!material_name) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Il nome del materiale è obbligatorio'
      });
    }

    const total_cost = unit_cost && quantity ? unit_cost * quantity : null;

    const result = await db.query(`
      INSERT INTO intervention_materials (
        intervention_id, material_name, part_number, quantity, unit,
        unit_cost, total_cost, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, material_name, part_number, quantity || 1, unit || 'pz', unit_cost, total_cost, notes, req.user.id]);

    res.status(201).json({
      message: 'Materiale aggiunto con successo',
      material: result.rows[0]
    });

  } catch (error) {
    console.error('Add intervention material error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiunta del materiale'
    });
  }
};

/**
 * Add daily report to intervention
 * POST /api/interventions/:id/reports
 */
const addInterventionReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      day_id,
      report_date,
      activities_performed,
      problems_encountered,
      solutions_applied,
      pending_tasks,
      customer_feedback,
      photos_taken
    } = req.body;

    if (!report_date) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'La data del report è obbligatoria'
      });
    }

    const result = await db.query(`
      INSERT INTO intervention_reports (
        intervention_id, day_id, report_date, activities_performed,
        problems_encountered, solutions_applied, pending_tasks,
        customer_feedback, photos_taken, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id, day_id, report_date, activities_performed,
      problems_encountered, solutions_applied, pending_tasks,
      customer_feedback, photos_taken || 0, req.user.id
    ]);

    res.status(201).json({
      message: 'Report aggiunto con successo',
      report: result.rows[0]
    });

  } catch (error) {
    console.error('Add intervention report error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiunta del report'
    });
  }
};

/**
 * Complete intervention
 * PUT /api/interventions/:id/complete
 */
const completeIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_summary, actual_end_date } = req.body;

    const result = await db.query(`
      UPDATE interventions SET
        status = 'completato',
        actual_end_date = COALESCE($2, CURRENT_DATE),
        resolution_summary = COALESCE($3, resolution_summary),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, actual_end_date, resolution_summary]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Intervento non trovato'
      });
    }

    res.json({
      message: 'Intervento completato con successo',
      intervention: result.rows[0]
    });

  } catch (error) {
    console.error('Complete intervention error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il completamento dell\'intervento'
    });
  }
};

/**
 * Get calendar data (interventions by date range)
 * GET /api/interventions/calendar
 */
const getCalendar = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Date di inizio e fine sono obbligatorie'
      });
    }

    const result = await db.query(`
      SELECT
        i.id,
        i.scheduled_date,
        i.scheduled_end_date,
        i.status,
        m.numero_commessa,
        c.name as customer_name,
        u.full_name as assigned_to_name
      FROM interventions i
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.scheduled_date BETWEEN $1 AND $2
      ORDER BY i.scheduled_date
    `, [start_date, end_date]);

    res.json({ interventions: result.rows });

  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero del calendario'
    });
  }
};

module.exports = {
  getInterventions,
  getIntervention,
  createIntervention,
  updateIntervention,
  deleteIntervention,
  addInterventionDay,
  addInterventionMaterial,
  addInterventionReport,
  completeIntervention,
  getCalendar
};
