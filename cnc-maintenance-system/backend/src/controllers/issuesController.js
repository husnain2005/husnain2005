const db = require('../config/database');

/**
 * Get all issues with filtering
 * GET /api/issues
 */
const getIssues = async (req, res) => {
  try {
    const {
      numero_commessa,
      machine_id,
      machine_type,
      customer_name,
      issue_group_id,
      issue_type,
      status,
      priority,
      assigned_to,
      search,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        i.*,
        ig.name as issue_group_name,
        ig.code as issue_group_code,
        m.numero_commessa,
        mm.machine_type,
        mm.model_name,
        c.name as customer_name,
        u.full_name as created_by_name,
        ua.full_name as assigned_to_name,
        (SELECT COUNT(*) FROM attachments a WHERE a.issue_id = i.id) as attachments_count
      FROM issues i
      LEFT JOIN issue_groups ig ON i.issue_group_id = ig.id
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users ua ON i.assigned_to = ua.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (numero_commessa) {
      query += ` AND (m.numero_commessa ILIKE $${paramIndex} OR i.numero_commessa ILIKE $${paramIndex})`;
      params.push(`%${numero_commessa}%`);
      paramIndex++;
    }

    if (machine_id) {
      query += ` AND i.machine_id = $${paramIndex++}`;
      params.push(machine_id);
    }

    if (machine_type) {
      query += ` AND (mm.machine_type = $${paramIndex} OR i.machine_type_fallback = $${paramIndex})`;
      params.push(machine_type);
      paramIndex++;
    }

    if (customer_name) {
      query += ` AND (c.name ILIKE $${paramIndex} OR i.customer_fallback ILIKE $${paramIndex})`;
      params.push(`%${customer_name}%`);
      paramIndex++;
    }

    if (issue_group_id) {
      query += ` AND i.issue_group_id = $${paramIndex++}`;
      params.push(issue_group_id);
    }

    if (issue_type) {
      query += ` AND i.issue_type = $${paramIndex++}`;
      params.push(issue_type);
    }

    if (status) {
      query += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND i.priority = $${paramIndex++}`;
      params.push(priority);
    }

    if (assigned_to) {
      query += ` AND i.assigned_to = $${paramIndex++}`;
      params.push(assigned_to);
    }

    if (search) {
      query += ` AND (
        i.title ILIKE $${paramIndex} OR
        i.description ILIKE $${paramIndex} OR
        m.numero_commessa ILIKE $${paramIndex} OR
        i.numero_commessa ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM issues i
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN customers c ON m.customer_id = c.id
      WHERE 1=1
    `;

    const countResult = await db.query(countQuery);

    res.json({
      issues: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero delle problematiche'
    });
  }
};

/**
 * Get single issue
 * GET /api/issues/:id
 */
const getIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT
        i.*,
        ig.name as issue_group_name,
        ig.code as issue_group_code,
        m.numero_commessa as machine_numero_commessa,
        m.serial_number,
        mm.machine_type,
        mm.category,
        mm.model_name,
        ms.size_value,
        c.id as customer_id,
        c.name as customer_name,
        c.city as customer_city,
        u.full_name as created_by_name,
        ua.full_name as assigned_to_name
      FROM issues i
      LEFT JOIN issue_groups ig ON i.issue_group_id = ig.id
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN machine_models mm ON m.model_id = mm.id
      LEFT JOIN machine_sizes ms ON m.size_id = ms.id
      LEFT JOIN customers c ON m.customer_id = c.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN users ua ON i.assigned_to = ua.id
      WHERE i.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Problematica non trovata'
      });
    }

    // Get comments
    const commentsResult = await db.query(`
      SELECT ic.*, u.full_name as user_name, u.username
      FROM issue_comments ic
      LEFT JOIN users u ON ic.user_id = u.id
      WHERE ic.issue_id = $1
      ORDER BY ic.created_at ASC
    `, [id]);

    // Get attachments
    const attachmentsResult = await db.query(`
      SELECT a.*, u.full_name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.issue_id = $1
      ORDER BY a.created_at DESC
    `, [id]);

    res.json({
      issue: result.rows[0],
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows
    });

  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero della problematica'
    });
  }
};

/**
 * Create new issue
 * POST /api/issues
 */
const createIssue = async (req, res) => {
  try {
    const {
      machine_id,
      numero_commessa,
      machine_type_fallback,
      model_fallback,
      customer_fallback,
      issue_group_id,
      issue_type,
      title,
      description,
      priority,
      assigned_to
    } = req.body;

    // Validation
    if (!issue_type || !title) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Tipo problema e titolo sono obbligatori'
      });
    }

    if (!machine_id && !numero_commessa && !machine_type_fallback && !customer_fallback) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Specificare almeno uno tra: macchina, numero commessa, tipo macchina o cliente'
      });
    }

    // If numero_commessa provided, try to find the machine
    let resolvedMachineId = machine_id;
    if (!resolvedMachineId && numero_commessa) {
      const machineResult = await db.query(
        'SELECT id FROM machines WHERE numero_commessa = $1',
        [numero_commessa]
      );
      if (machineResult.rows.length > 0) {
        resolvedMachineId = machineResult.rows[0].id;
      }
    }

    const result = await db.query(`
      INSERT INTO issues (
        machine_id, numero_commessa, machine_type_fallback, model_fallback,
        customer_fallback, issue_group_id, issue_type, title, description,
        priority, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      resolvedMachineId, numero_commessa, machine_type_fallback, model_fallback,
      customer_fallback, issue_group_id, issue_type, title, description,
      priority || 'media', assigned_to, req.user.id
    ]);

    // Audit log
    await req.audit('issues', result.rows[0].id, 'INSERT', null, result.rows[0]);

    res.status(201).json({
      message: 'Problematica creata con successo',
      issue: result.rows[0]
    });

  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione della problematica'
    });
  }
};

/**
 * Update issue
 * PUT /api/issues/:id
 */
const updateIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      issue_group_id,
      issue_type,
      title,
      description,
      status,
      priority,
      resolution_notes,
      assigned_to
    } = req.body;

    // Get current values
    const current = await db.query('SELECT * FROM issues WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Problematica non trovata'
      });
    }

    const oldValues = current.rows[0];

    // Check permissions (creator, assignee, or admin can edit)
    if (req.user.role !== 'admin' &&
        oldValues.created_by !== req.user.id &&
        oldValues.assigned_to !== req.user.id) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non hai i permessi per modificare questa problematica'
      });
    }

    // Set closed_at if status is being changed to closed or resolved
    let closedAt = oldValues.closed_at;
    if ((status === 'chiusa' || status === 'risolta') && oldValues.status !== status) {
      closedAt = new Date().toISOString();
    }

    const result = await db.query(`
      UPDATE issues SET
        issue_group_id = COALESCE($1, issue_group_id),
        issue_type = COALESCE($2, issue_type),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        status = COALESCE($5, status),
        priority = COALESCE($6, priority),
        resolution_notes = COALESCE($7, resolution_notes),
        assigned_to = $8,
        closed_at = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [
      issue_group_id, issue_type, title, description, status,
      priority, resolution_notes, assigned_to, closedAt, id
    ]);

    // Audit log
    await req.audit('issues', parseInt(id), 'UPDATE', oldValues, result.rows[0]);

    res.json({
      message: 'Problematica aggiornata con successo',
      issue: result.rows[0]
    });

  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento della problematica'
    });
  }
};

/**
 * Delete issue
 * DELETE /api/issues/:id
 */
const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await db.query('SELECT * FROM issues WHERE id = $1', [id]);

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Problematica non trovata'
      });
    }

    // Only admin or creator can delete
    if (req.user.role !== 'admin' && current.rows[0].created_by !== req.user.id) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non hai i permessi per eliminare questa problematica'
      });
    }

    await db.query('DELETE FROM issues WHERE id = $1', [id]);

    // Audit log
    await req.audit('issues', parseInt(id), 'DELETE', current.rows[0], null);

    res.json({
      message: 'Problematica eliminata con successo'
    });

  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'eliminazione della problematica'
    });
  }
};

/**
 * Add comment to issue
 * POST /api/issues/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Il commento è obbligatorio'
      });
    }

    // Check if issue exists
    const issueCheck = await db.query('SELECT id FROM issues WHERE id = $1', [id]);
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Problematica non trovata'
      });
    }

    const result = await db.query(`
      INSERT INTO issue_comments (issue_id, user_id, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, req.user.id, comment]);

    // Get user info
    const commentWithUser = await db.query(`
      SELECT ic.*, u.full_name as user_name, u.username
      FROM issue_comments ic
      LEFT JOIN users u ON ic.user_id = u.id
      WHERE ic.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      message: 'Commento aggiunto con successo',
      comment: commentWithUser.rows[0]
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiunta del commento'
    });
  }
};

/**
 * Get issue groups
 * GET /api/issues/groups
 */
const getIssueGroups = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM issue_groups
      WHERE is_active = true
      ORDER BY display_order, name
    `);

    res.json({ groups: result.rows });

  } catch (error) {
    console.error('Get issue groups error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dei gruppi'
    });
  }
};

/**
 * Get dashboard statistics
 * GET /api/issues/stats
 */
const getStats = async (req, res) => {
  try {
    // Issues by status
    const statusStats = await db.query(`
      SELECT status, COUNT(*) as count
      FROM issues
      GROUP BY status
    `);

    // Issues by type
    const typeStats = await db.query(`
      SELECT issue_type, COUNT(*) as count
      FROM issues
      GROUP BY issue_type
    `);

    // Issues by priority
    const priorityStats = await db.query(`
      SELECT priority, COUNT(*) as count
      FROM issues
      GROUP BY priority
    `);

    // Recent issues
    const recentIssues = await db.query(`
      SELECT i.id, i.title, i.status, i.priority, i.created_at,
             m.numero_commessa, c.name as customer_name
      FROM issues i
      LEFT JOIN machines m ON i.machine_id = m.id
      LEFT JOIN customers c ON m.customer_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 10
    `);

    // Total counts
    const totals = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM machines WHERE is_active = true) as total_machines,
        (SELECT COUNT(*) FROM issues) as total_issues,
        (SELECT COUNT(*) FROM issues WHERE status IN ('aperta', 'in_lavorazione')) as open_issues,
        (SELECT COUNT(*) FROM customers WHERE is_active = true) as total_customers
    `);

    res.json({
      statusStats: statusStats.rows,
      typeStats: typeStats.rows,
      priorityStats: priorityStats.rows,
      recentIssues: recentIssues.rows,
      totals: totals.rows[0]
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero delle statistiche'
    });
  }
};

module.exports = {
  getIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  addComment,
  getIssueGroups,
  getStats
};
