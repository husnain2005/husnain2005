const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../config/database');
const crypto = require('crypto');

/**
 * Genera un segreto MFA per l'utente
 * POST /api/auth/mfa/setup
 */
const setupMFA = async (req, res) => {
  try {
    // Check if already enabled
    const user = await db.query('SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1', [req.user.id]);

    if (user.rows[0].mfa_enabled) {
      return res.status(400).json({
        error: 'MFA già attivo',
        message: 'L\'autenticazione a due fattori è già attiva'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `CNC Maintenance (${req.user.username})`,
      issuer: 'CNC Maintenance System'
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret temporarily (not enabled yet until verified)
    await db.query(
      'UPDATE users SET mfa_secret = $1, mfa_backup_codes = $2 WHERE id = $3',
      [secret.base32, backupCodes, req.user.id]
    );

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
      message: 'Scansiona il QR code con Google Authenticator, poi verifica con un codice'
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Errore interno', message: 'Errore durante la configurazione MFA' });
  }
};

/**
 * Verifica e attiva MFA
 * POST /api/auth/mfa/verify
 */
const verifyAndEnableMFA = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Codice mancante', message: 'Inserisci il codice dall\'app authenticator' });
    }

    const user = await db.query('SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1', [req.user.id]);

    if (!user.rows[0].mfa_secret) {
      return res.status(400).json({ error: 'Setup necessario', message: 'Prima configura MFA con /api/auth/mfa/setup' });
    }

    if (user.rows[0].mfa_enabled) {
      return res.status(400).json({ error: 'Già attivo', message: 'MFA è già attivo' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.rows[0].mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ error: 'Codice non valido', message: 'Il codice inserito non è corretto. Riprova.' });
    }

    await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [req.user.id]);

    res.json({ message: 'Autenticazione a due fattori attivata con successo!' });
  } catch (error) {
    console.error('MFA verify error:', error);
    res.status(500).json({ error: 'Errore interno', message: 'Errore durante la verifica MFA' });
  }
};

/**
 * Valida codice MFA durante il login
 * POST /api/auth/mfa/validate
 */
const validateMFA = async (req, res) => {
  try {
    const { userId, token, backupCode } = req.body;

    if (!userId || (!token && !backupCode)) {
      return res.status(400).json({ error: 'Dati mancanti', message: 'UserId e codice sono obbligatori' });
    }

    const user = await db.query(
      'SELECT id, mfa_secret, mfa_backup_codes, user_id, username, email, full_name, role FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    const userData = user.rows[0];
    let valid = false;

    if (token) {
      // Verify TOTP token
      valid = speakeasy.totp.verify({
        secret: userData.mfa_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
    } else if (backupCode) {
      // Verify backup code
      const codes = userData.mfa_backup_codes || [];
      const codeIndex = codes.indexOf(backupCode.toUpperCase());
      if (codeIndex !== -1) {
        valid = true;
        // Remove used backup code
        codes.splice(codeIndex, 1);
        await db.query('UPDATE users SET mfa_backup_codes = $1 WHERE id = $2', [codes, userId]);
      }
    }

    if (!valid) {
      return res.status(401).json({ error: 'Codice non valido', message: 'Il codice MFA non è corretto' });
    }

    // Generate JWT (same as login)
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

    const jwtToken = jwt.sign(
      { userId: userData.id, userIdCode: userData.user_id, username: userData.username, role: userData.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Set HTTPOnly cookie
    res.cookie('jwt_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Set CSRF token cookie
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      message: 'Login completato con successo',
      token: jwtToken,
      csrfToken,
      user: {
        id: userData.id,
        user_id: userData.user_id,
        username: userData.username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('MFA validate error:', error);
    res.status(500).json({ error: 'Errore interno', message: 'Errore durante la validazione MFA' });
  }
};

/**
 * Disabilita MFA
 * POST /api/auth/mfa/disable
 */
const disableMFA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password richiesta', message: 'Inserisci la password per disabilitare MFA' });
    }

    const bcrypt = require('bcryptjs');
    const user = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(password, user.rows[0].password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Password errata', message: 'La password non è corretta' });
    }

    await db.query(
      'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Autenticazione a due fattori disabilitata' });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'Errore interno', message: 'Errore durante la disabilitazione MFA' });
  }
};

/**
 * Get MFA status
 * GET /api/auth/mfa/status
 */
const getMFAStatus = async (req, res) => {
  try {
    const user = await db.query('SELECT mfa_enabled FROM users WHERE id = $1', [req.user.id]);
    res.json({ mfa_enabled: user.rows[0].mfa_enabled || false });
  } catch (error) {
    console.error('MFA status error:', error);
    res.status(500).json({ error: 'Errore interno' });
  }
};

module.exports = { setupMFA, verifyAndEnableMFA, validateMFA, disableMFA, getMFAStatus };
