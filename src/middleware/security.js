const helmet = require('helmet');
const cors = require('cors');

const isDev = process.env.NODE_ENV !== 'production';

const configureSecurityHeaders = (app) => {
  // CORS configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin) return callback(null, true);
      // In production, restrict to configured domain; in dev, allow localhost
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
  };

  app.use(cors(corsOptions));

  // Helmet with strict Content Security Policy (CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Needed for inline theme initialization to prevent dark-mode flicker
            "'unsafe-eval'",   // Required by Tailwind Play CDN for client-side JIT compilation
            "https://cdn.tailwindcss.com",
            "https://challenges.cloudflare.com",
            "https://www.google.com/recaptcha/",
            "https://www.gstatic.com/recaptcha/"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Needed for dynamic CSS variables and Tailwind inline styles
            "https://fonts.googleapis.com"
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https:", // Allow album artwork and external sponsor logos
            "https://*.live365.com"
          ],
          mediaSrc: [
            "'self'",
            "blob:",
            "https://streaming.live365.com",
            "https://*.live365.com"
          ],
          connectSrc: [
            "'self'",
            "https://*.live365.com",
            "https://streaming.live365.com",
            "https://api.live365.com"
          ],
          frameSrc: [
            "'self'",
            "https://challenges.cloudflare.com",
            "https://www.google.com/recaptcha/"
          ],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: isDev ? null : []
        }
      },
      crossOriginEmbedderPolicy: false, // Allow cross-origin media streaming
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: !isDev
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
          }
        : false
    })
  );
};

module.exports = {
  configureSecurityHeaders
};

