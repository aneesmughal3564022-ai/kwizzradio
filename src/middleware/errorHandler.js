const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  const isApi = req.xhr || req.path.startsWith('/api') || req.headers.accept?.includes('application/json');

  if (isApi) {
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.originalUrl
    });
  }

  res.status(404).render('pages/404', {
    title: '404 - Page Not Found | KWIZZ Radio',
    page: '404'
  });
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error({
    msg: 'Unhandled request error',
    error: err.message,
    stack: isProduction ? undefined : err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  const isApi = req.xhr || req.path.startsWith('/api') || req.headers.accept?.includes('application/json');

  if (isApi) {
    return res.status(status).json({
      success: false,
      error: status === 500 && isProduction ? 'Internal Server Error' : err.message,
      ...(isProduction ? {} : { stack: err.stack })
    });
  }

  res.status(status).render('pages/404', {
    title: `${status} - Error | KWIZZ Radio`,
    page: 'error',
    errorMessage: isProduction ? 'An unexpected error occurred. Please try again later.' : err.message
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};

