const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { formLimiter } = require('../middleware/rateLimiter');
const playerController = require('../controllers/playerController');
const requestController = require('../controllers/requestController');
const contactController = require('../controllers/contactController');
const sponsorController = require('../controllers/sponsorController');
const pushController = require('../controllers/pushController');
const env = require('../config/env');

// Base API status
router.get('/', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    station: env.STATION_NAME,
    timezone: env.STATION_TIMEZONE
  });
});

// Now Playing & Audio Player Endpoints
router.get('/now-playing', playerController.getNowPlaying);
router.get('/recent', playerController.getRecentTracks);
router.get('/now-playing/stream', playerController.streamNowPlaying);
router.get('/stream.m3u', playerController.getM3uPlaylist);

// Song Requests & Contact Forms
router.post('/requests', formLimiter, requestController.submitSongRequest);
router.post('/contact', formLimiter, contactController.submitContactMessage);

// Web Push Registration (PRD 5.5 & Phase 5)
router.get('/push/public-key', pushController.getPublicKey);
router.post('/push/subscribe', pushController.subscribe);

// Sponsor tracking (non-blocking)
router.get('/sponsors/:id/click', sponsorController.handleSponsorClick);
router.post('/api/sponsors/:id/impression', sponsorController.recordImpression);
router.post('/sponsors/:id/impression', sponsorController.recordImpression);

// Analytics in-house event endpoint
router.post('/analytics/event', (req, res) => {
  res.status(204).end();
});

// Test validation endpoint
const testValidationSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address')
  })
};

router.post('/test-validation', validate(testValidationSchema), (req, res) => {
  res.status(200).json({
    success: true,
    data: req.body
  });
});

module.exports = router;
