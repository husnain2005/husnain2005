const crypto = require('crypto');

/**
 * CSRF Protection Middleware using Double Submit Cookie pattern.
 *
 * How it works:
 * 1. On login, a csrf_token cookie is set (httpOnly: false so JS can read it).
 * 2. The frontend reads the cookie and sends its value as the X-CSRF-Token header.
 * 3. This middleware verifies that the header matches the cookie on state-changing
 *    requests (POST, PUT, DELETE) when the request is authenticated via cookies.
 *
 * Routes that should be excluded (e.g. /api/auth/login) are skipped automatically
 * because they do not carry a jwt_token cookie yet.
 */

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} Hex-encoded random token
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Set the CSRF token cookie (readable by JavaScript, NOT httpOnly)
 */
const setCsrfCookie = (res, token) => {
  res.cookie('csrf_token', token, {
    httpOnly: false,        // Must be readable by frontend JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });
};

/**
 * Middleware that verifies CSRF token on state-changing requests.
 * Only enforced when the request carries a jwt_token cookie (cookie-based auth).
 * Skipped for the login endpoint since the user has no cookie yet.
 */
const verifyCsrf = (req, res, next) => {
  // Only check state-changing methods
  const stateMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!stateMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF check if the request is NOT authenticated via cookie.
  // This allows API clients using Bearer tokens to work without CSRF.
  if (!req.cookies || !req.cookies.jwt_token) {
    return next();
  }

  // Skip CSRF check for the login endpoint (no cookie exists yet)
  if (req.path === '/login' && req.baseUrl === '/api/auth') {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies.csrf_token;

  if (!csrfHeader || !csrfCookie) {
    return res.status(403).json({
      error: 'Token CSRF mancante',
      message: 'Richiesta rifiutata: token CSRF non presente'
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (csrfHeader.length !== csrfCookie.length) {
    return res.status(403).json({
      error: 'Token CSRF non valido',
      message: 'Richiesta rifiutata: token CSRF non corrispondente'
    });
  }

  const headerBuf = Buffer.from(csrfHeader);
  const cookieBuf = Buffer.from(csrfCookie);

  if (!crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return res.status(403).json({
      error: 'Token CSRF non valido',
      message: 'Richiesta rifiutata: token CSRF non corrispondente'
    });
  }

  next();
};

module.exports = {
  generateCsrfToken,
  setCsrfCookie,
  verifyCsrf
};
