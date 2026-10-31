const { z } = require('zod');
const prisma = require('../config/prisma');
const { sendMail } = require('../services/emailService');
const env = require('../config/env');
const logger = require('../utils/logger');

const contactSchema = z.object({
  name: z.string().min(2, 'Your name is required').max(80),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(2, 'Subject is required').max(150).optional().or(z.literal('')),
  message: z.string().min(5, 'Message must be at least 5 characters').max(2000),
  caslConsent: z.preprocess((val) => val === 'true' || val === true || val === 'on', z.boolean().optional()),
  // Anti-spam fields
  hp_phone: z.string().optional(), // Honeypot
  rendered_at: z.coerce.number().optional()
});

const submitContactMessage = async (req, res, next) => {
  try {
    const data = contactSchema.parse(req.body);

    // 1. Honeypot check
    if (data.hp_phone && data.hp_phone.trim().length > 0) {
      logger.warn({ msg: 'Bot spam detected via contact honeypot', ip: req.ip });
      return res.status(200).json({
        success: true,
        message: 'Thank you for your message. We have received it.'
      });
    }

    // 2. Timing check
    if (data.rendered_at) {
      const elapsed = Date.now() - data.rendered_at;
      if (elapsed < 1500) {
        logger.warn({ msg: 'Bot spam detected via rapid contact submission', elapsed, ip: req.ip });
        return res.status(400).json({
          success: false,
          error: 'Please take your time before sending the message.'
        });
      }
    }

    // 3. Save to DB
    let savedMsg;
    try {
      if (prisma.isDbConnected && prisma.isDbConnected()) {
        savedMsg = await prisma.contactMessage.create({
          data: {
            name: data.name,
            email: data.email,
            subject: data.subject || 'KWIZZ Radio General Inquiry',
            message: data.message,
            status: 'NEW',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
      } else {
        savedMsg = {
          id: `msg-${Date.now()}`,
          name: data.name,
          email: data.email,
          subject: data.subject || 'KWIZZ Radio General Inquiry',
          message: data.message,
          status: 'NEW',
          createdAt: new Date()
        };
        if (prisma.memoryDb) prisma.memoryDb.contactMessages.unshift(savedMsg);
      }
    } catch (dbErr) {
      logger.warn({ msg: 'Error saving contact message to DB, using memory fallback', error: dbErr.message });
      savedMsg = {
        id: `msg-${Date.now()}`,
        name: data.name,
        email: data.email,
        subject: data.subject || 'KWIZZ Radio General Inquiry',
        message: data.message,
        status: 'NEW',
        createdAt: new Date()
      };
      if (prisma.memoryDb) prisma.memoryDb.contactMessages.unshift(savedMsg);
    }

    // 4. Send email notification to Station Staff
    sendMail({
      to: env.CONTACT_EMAIL,
      subject: `[Contact Inquiry] ${data.subject || 'Message from listener'} (${data.name})`,
      text: `New contact message received on KWIZZ Radio:
Name: ${data.name}
Email: ${data.email}
Subject: ${data.subject || 'N/A'}
Message:
${data.message}

IP: ${req.ip}
Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}`
    });

    return res.status(200).json({
      success: true,
      message: 'Thank you for reaching out! Station management will get back to you shortly.',
      data: savedMsg
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
  submitContactMessage,
  contactSchema
};

