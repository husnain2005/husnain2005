const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

/**
 * Extract JWT token from the request.
 * Priority:
 *   1. HttpOnly cookie "jwt_token" (browser sessions)
 *   2. Authorization: Bearer <token> header (API clients / backwards compat)
 *
 * Returns { token, source } where source is 'cookie' | 'header' | null.
 */
const extractToken = (req) => {
  // 1. Try cookie first
  if (req.cookies && req.cookies.jwt_token) {
    return { token: req.cookies.jwt_token, source: 'cookie' };
  }

  // 2. Fallback to Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return { token: authHeader.split(' ')[1], source: 'header' };
  }

  return { token: null, source: null };
};

/**
 * Authentication middleware
 * Verifies JWT token from cookie or header, and attaches user to request.
 */
const authenticate = async (req, res, next) => {
  try {
    const { token, source } = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Accesso non autorizzato',
        message: 'Token di autenticazione mancante'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from database
    const result = await db.query(
      'SELECT id, user_id, username, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Utente non trovato',
        message: 'L\'utente associato al token non esiste'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabilitato',
        message: 'Il tuo account è stato disabilitato'
      });
    }

    req.user = user;
    req.authSource = source; // 'cookie' or 'header'
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token scaduto',
        message: 'Il token di autenticazione è scaduto'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token non valido',
        message: 'Il token di autenticazione non è valido'
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'autenticazione'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Non autenticato',
        message: 'Autenticazione richiesta'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Accesso negato',
        message: 'Non hai i permessi necessari per questa operazione'
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token.
 * Tries cookie first, then Authorization header.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const { token, source } = extractToken(req);

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      'SELECT id, user_id, username, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = result.rows[0];
      req.authSource = source;
    }

    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};
