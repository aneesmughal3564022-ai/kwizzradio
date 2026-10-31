const crypto = require('crypto');

/**
 * Robust Session-based CSRF Middleware
 */
function csrfProtection(req, res, next) {
  if (!req.session) {
    return next();
  }

  // Generate session CSRF token if missing
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }

  // Expose token to response locals for EJS templates
  res.locals.csrfToken = req.session.csrfToken;
  req.csrfToken = () => req.session.csrfToken;

  // Safe HTTP methods do not require CSRF token validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF check for public API endpoints (e.g. song requests or webhook)
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/admin/')) {
    return next();
  }

  // In test mode, allow if not explicitly testing CSRF
  if (process.env.NODE_ENV === 'test' && !req.headers['x-test-csrf']) {
    return next();
  }

  const clientToken = req.body?._csrf || req.headers['x-csrf-token'] || req.query?._csrf;

  if (!clientToken || clientToken !== req.session.csrfToken) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or missing CSRF token'
      });
    }
    return res.status(403).send('Forbidden: Invalid CSRF Token');
  }

  next();
}

module.exports = {
  csrfProtection
};

