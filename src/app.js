const path = require('path');
const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const pinoHttp = require('pino-http');

const logger = require('./utils/logger');
const env = require('./config/env');
const { configureSecurityHeaders } = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimiter');
const { csrfProtection } = require('./middleware/csrf');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// 1. Trust proxy for rate limiting / secure cookies behind reverse proxy (Nginx / Cloudflare)
app.set('trust proxy', 1);

// 2. Security Headers (Helmet, CSP, CORS)
configureSecurityHeaders(app);

// 3. Compression (gzip/brotli)
app.use(compression());

// 4. Request Logging with Pino
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) =>
        req.url.startsWith('/css/') ||
        req.url.startsWith('/js/') ||
        req.url.startsWith('/images/') ||
        req.url === '/health' ||
        process.env.NODE_ENV === 'test'
    }
  })
);

// 5. Body Parsers & Cookie Parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 6. Secure Session Cookies (HttpOnly, SameSite)
app.use(
  cookieSession({
    name: 'kwizz_session',
    keys: [env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE
  })
);

// 7. CSRF Protection
app.use(csrfProtection);

// 8. View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// 9. Static Assets with Cache Headers
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
  })
);

// 10. Global Rate Limiter
app.use(globalLimiter);

// 11. Mount Application Routes
app.use(routes);

// 12. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
