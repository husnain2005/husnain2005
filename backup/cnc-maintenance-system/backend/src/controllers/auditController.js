const { auditLogger } = require('../middleware/audit');

/**
 * Get audit logs
 * GET /api/audit
 */
const getAuditLogs = async (req, res) => {
  try {
    const {
      table_name,
      user_id,
      action,
      start_date,
      end_date,
      limit = 100,
      offset = 0
    } = req.query;

    const logs = await auditLogger.getLogs({
      tableName: table_name,
      userId: user_id ? parseInt(user_id) : null,
      action,
      startDate: start_date,
      endDate: end_date,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ logs });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dei log'
    });
  }
};

/**
 * Get audit history for a specific record
 * GET /api/audit/:tableName/:recordId
 */
const getRecordHistory = async (req, res) => {
  try {
    const { tableName, recordId } = req.params;

    const history = await auditLogger.getRecordHistory(tableName, parseInt(recordId));

    res.json({ history });

  } catch (error) {
    console.error('Get record history error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero dello storico'
    });
  }
};

module.exports = {
  getAuditLogs,
  getRecordHistory
};
