/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 * Roles: ADMIN, EDITOR, DJ
 */

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    return res.redirect('/admin/login');
  }
  next();
};

const requireRole = (allowedRoles = ['ADMIN']) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      return res.redirect('/admin/login');
    }

    const userRole = req.session.user.role;
    if (!allowedRoles.includes(userRole)) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      }
      return res.status(403).render('pages/404', {
        title: '403 Forbidden | KWIZZ Radio',
        page: '403',
        errorMessage: 'You do not have the required permissions to access this administrative resource.'
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};

