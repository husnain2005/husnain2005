const db = require('../config/database');

/**
 * Audit Logger Service
 * Tracks all changes to database records
 */
const auditLogger = {
  /**
   * Log an audit event
   * @param {Object} params - Audit parameters
   * @param {number} params.userId - User performing the action
   * @param {string} params.tableName - Table being modified
   * @param {number} params.recordId - ID of the record being modified
   * @param {string} params.action - INSERT, UPDATE, or DELETE
   * @param {Object} params.oldValues - Previous values (for UPDATE/DELETE)
   * @param {Object} params.newValues - New values (for INSERT/UPDATE)
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client user agent
   */
  async log({ userId, tableName, recordId, action, oldValues, newValues, ipAddress, userAgent }) {
    try {
      await db.query(
        `INSERT INTO audit_log (user_id, table_name, record_id, action, old_values, new_values, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          tableName,
          recordId,
          action,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent
        ]
      );
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging should not break main operations
    }
  },

  /**
   * Get audit logs for a specific record
   */
  async getRecordHistory(tableName, recordId) {
    const result = await db.query(
      `SELECT al.*, u.username, u.full_name
       FROM audit_log al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.table_name = $1 AND al.record_id = $2
       ORDER BY al.created_at DESC`,
      [tableName, recordId]
    );
    return result.rows;
  },

  /**
   * Get all audit logs with filtering
   */
  async getLogs({ tableName, userId, action, startDate, endDate, limit = 100, offset = 0 }) {
    let query = `
      SELECT al.*, u.username, u.full_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (tableName) {
      query += ` AND al.table_name = $${paramIndex++}`;
      params.push(tableName);
    }
    if (userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }
    if (startDate) {
      query += ` AND al.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND al.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }
};

/**
 * Middleware to attach audit helper to request
 */
const auditMiddleware = (req, res, next) => {
  req.audit = async (tableName, recordId, action, oldValues, newValues) => {
    await auditLogger.log({
      userId: req.user?.id,
      tableName,
      recordId,
      action,
      oldValues,
      newValues,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    });
  };
  next();
};

module.exports = {
  auditLogger,
  auditMiddleware
};
