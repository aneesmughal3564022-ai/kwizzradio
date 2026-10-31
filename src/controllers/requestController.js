const { z } = require('zod');
const prisma = require('../config/prisma');
const { sendMail } = require('../services/emailService');
const env = require('../config/env');
const logger = require('../utils/logger');

const requestSchema = z.object({
  artist: z.string().min(1, 'Artist name is required').max(100),
  songTitle: z.string().min(1, 'Song title is required').max(120),
  requestedBy: z.string().min(1, 'Your name is required').max(60),
  dedication: z.string().max(300).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  newsletterConsent: z.preprocess((val) => val === 'true' || val === true || val === 'on', z.boolean().optional()),
  // Anti-spam fields
  hp_website: z.string().optional(), // Honeypot field (must remain empty)
  rendered_at: z.coerce.number().optional() // Form timestamp
});

const submitSongRequest = async (req, res, next) => {
  try {
    const data = requestSchema.parse(req.body);

    // 1. Honeypot Anti-Spam Check
    if (data.hp_website && data.hp_website.trim().length > 0) {
      logger.warn({ msg: 'Bot spam detected via honeypot field', ip: req.ip });
      // Silently return success to bot without saving
      return res.status(200).json({
        success: true,
        message: 'Your song request has been submitted to the DJ.'
      });
    }

    // 2. Submission Timing Check (reject submissions faster than 1.5 seconds)
    if (data.rendered_at) {
      const now = Date.now();
      const elapsed = now - data.rendered_at;
      if (elapsed < 1500) {
        logger.warn({ msg: 'Bot spam detected via rapid submission', elapsed, ip: req.ip });
        return res.status(400).json({
          success: false,
          error: 'Submission was too fast. Please take your time and submit again.'
        });
      }
    }

    // 3. Save to database
    let savedRequest;
    try {
      if (prisma.isDbConnected && prisma.isDbConnected()) {
        savedRequest = await prisma.songRequest.create({
          data: {
            artist: data.artist,
            songTitle: data.songTitle,
            requestedBy: data.requestedBy,
            dedication: data.dedication || null,
            email: data.email || null,
            status: 'NEW',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
      } else {
        // Fallback memory DB
        savedRequest = {
          id: `req-${Date.now()}`,
          artist: data.artist,
          songTitle: data.songTitle,
          requestedBy: data.requestedBy,
          dedication: data.dedication,
          email: data.email,
          status: 'NEW',
          createdAt: new Date()
        };
        if (prisma.memoryDb) {
          prisma.memoryDb.songRequests.unshift(savedRequest);
        }
      }
    } catch (dbErr) {
      logger.warn({ msg: 'Failed to save song request to DB, using memory fallback', error: dbErr.message });
      savedRequest = {
        id: `req-${Date.now()}`,
        artist: data.artist,
        songTitle: data.songTitle,
        requestedBy: data.requestedBy,
        dedication: data.dedication,
        email: data.email,
        status: 'NEW',
        createdAt: new Date()
      };
      if (prisma.memoryDb) prisma.memoryDb.songRequests.unshift(savedRequest);
    }

    // 4. Send Email Notification to DJ / Station Staff (PRD 5.4)
    sendMail({
      to: env.STAFF_ALERT_EMAIL,
      subject: `[Song Request] "${data.songTitle}" by ${data.artist} (From: ${data.requestedBy})`,
      text: `New song request on KWIZZ Radio:
Artist: ${data.artist}
Song: ${data.songTitle}
Requested By: ${data.requestedBy}
Dedication: ${data.dedication || 'None'}
Email: ${data.email || 'None provided'}
IP: ${req.ip}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}`
    });

    return res.status(200).json({
      success: true,
      message: 'Big up! Your song request has been sent to our live DJs.',
      data: savedRequest
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    next(err);
  }
};

module.exports = {
  submitSongRequest,
  requestSchema
};

