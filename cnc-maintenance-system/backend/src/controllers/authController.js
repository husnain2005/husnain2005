const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * User login
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Username e password sono obbligatori'
      });
    }

    // Find user by username, email, or user_id
    const result = await db.query(
      `SELECT id, user_id, username, email, password_hash, full_name, role, is_active
       FROM users
       WHERE username = $1 OR email = $1 OR user_id = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Username o password errati'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabilitato',
        message: 'Il tuo account è stato disabilitato'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Username o password errati'
      });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        userIdCode: user.user_id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login effettuato con successo',
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il login'
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getProfile = async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        user_id: req.user.user_id,
        username: req.user.username,
        email: req.user.email,
        full_name: req.user.full_name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero del profilo'
    });
  }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'Password attuale e nuova password sono obbligatorie'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password non valida',
        message: 'La nuova password deve essere di almeno 8 caratteri'
      });
    }

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Password errata',
        message: 'La password attuale non è corretta'
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, req.user.id]
    );

    // Audit log
    await req.audit('users', req.user.id, 'UPDATE', null, { password_changed: true });

    res.json({
      message: 'Password modificata con successo'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il cambio password'
    });
  }
};

/**
 * Get all users (admin only)
 * GET /api/auth/users
 */
const getUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, username, email, full_name, role, is_active, last_login, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({ users: result.rows });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante il recupero degli utenti'
    });
  }
};

/**
 * Create new user (admin only)
 * POST /api/auth/users
 */
const createUser = async (req, res) => {
  try {
    const { user_id, username, email, password, full_name, role } = req.body;

    if (!user_id || !username || !email || !password) {
      return res.status(400).json({
        error: 'Dati mancanti',
        message: 'user_id, username, email e password sono obbligatori'
      });
    }

    // Check for existing user
    const existing = await db.query(
      'SELECT id FROM users WHERE user_id = $1 OR username = $2 OR email = $3',
      [user_id, username, email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Utente esistente',
        message: 'Un utente con questo user_id, username o email esiste già'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (user_id, username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, username, email, full_name, role, is_active, created_at`,
      [user_id, username, email, password_hash, full_name, role || 'tecnico']
    );

    // Audit log
    await req.audit('users', result.rows[0].id, 'INSERT', null, {
      user_id, username, email, full_name, role: role || 'tecnico'
    });

    res.status(201).json({
      message: 'Utente creato con successo',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante la creazione dell\'utente'
    });
  }
};

/**
 * Update user (admin only)
 * PUT /api/auth/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, is_active } = req.body;

    // Get current values
    const current = await db.query(
      'SELECT full_name, role, is_active FROM users WHERE id = $1',
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({
        error: 'Non trovato',
        message: 'Utente non trovato'
      });
    }

    const oldValues = current.rows[0];

    // Update user
    const result = await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           role = COALESCE($2, role),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, user_id, username, email, full_name, role, is_active`,
      [full_name, role, is_active, id]
    );

    // Audit log
    await req.audit('users', parseInt(id), 'UPDATE', oldValues, {
      full_name: result.rows[0].full_name,
      role: result.rows[0].role,
      is_active: result.rows[0].is_active
    });

    res.json({
      message: 'Utente aggiornato con successo',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Errore interno',
      message: 'Errore durante l\'aggiornamento dell\'utente'
    });
  }
};

module.exports = {
  login,
  getProfile,
  changePassword,
  getUsers,
  createUser,
  updateUser
};
