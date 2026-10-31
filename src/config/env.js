const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const booleanPreprocessor = z.preprocess(
  (val) => val === 'true' || val === true || val === '1' || val === 1,
  z.boolean()
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().default('http://localhost:3000'),

  STATION_NAME: z.string().default('KWIZZ Radio'),
  STATION_TAGLINE: z.string().default("Ottawa's Premier Reggae & Dancehall Station"),
  STATION_TIMEZONE: z.string().default('America/Toronto'),
  DEFAULT_STREAM_URL: z.string().default('https://streaming.live365.com/b72076_128k.mp3'),
  LIVE365_STATION_ID: z.string().default('a72076'),

  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/kwizz_radio?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Firebase Configuration
  DATABASE_DRIVER: z.enum(['firebase', 'prisma']).default('firebase'),
  FIREBASE_PROJECT_ID: z.string().optional().default('kwizz-radio-ottawa'),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  SESSION_SECRET: z.string().min(16).default('default_session_secret_32_chars_minimum!'),
  CSRF_SECRET: z.string().min(16).default('default_csrf_secret_32_chars_minimum!'),
  COOKIE_SECURE: booleanPreprocessor.default(false),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:admin@kwizzradio.ca'),

  SMTP_HOST: z.string().optional().default('smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  CONTACT_EMAIL: z.string().email().default('info@kwizzradio.ca'),
  STAFF_ALERT_EMAIL: z.string().email().default('djs@kwizzradio.ca'),

  CAPTCHA_SECRET_KEY: z.string().optional(),
  CAPTCHA_SITE_KEY: z.string().optional(),

  APP_BADGES_ENABLED: booleanPreprocessor.default(false),
  APP_STORE_URL: z.string().optional().default('https://apps.apple.com'),
  GOOGLE_PLAY_URL: z.string().optional().default('https://play.google.com')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Environment configuration validation failed.');
}

module.exports = parsed.data;
