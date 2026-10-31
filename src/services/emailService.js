const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const env = require('../config/env');

let transporter = null;

try {
  if (env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
    logger.info(`SMTP Mailer initialized with host: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
  } else {
    logger.info('SMTP credentials not configured. Using development console email logger.');
  }
} catch (err) {
  logger.warn({ msg: 'Failed to initialize SMTP transporter', error: err.message });
}

/**
 * Send email notification
 */
async function sendMail({ to, subject, text, html }) {
  const mailOptions = {
    from: `"KWIZZ Radio" <${env.CONTACT_EMAIL}>`,
    to,
    subject,
    text,
    html
  };

  if (transporter) {
    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info({ msg: 'Email dispatched successfully', messageId: info.messageId, to, subject });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error({ msg: 'Failed to dispatch email via SMTP', error: err.message, to, subject });
      return { success: false, error: err.message };
    }
  } else {
    // In dev / test or when SMTP is unconfigured, log email cleanly
    logger.info(`[DEV EMAIL SIMULATOR] To: ${to} | Subject: "${subject}" | Content: ${text || html?.substring(0, 100)}`);
    return { success: true, simulated: true };
  }
}

module.exports = {
  sendMail
};

