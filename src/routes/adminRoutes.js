const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth, requireRole } = require('../middleware/auth');
const authAdminController = require('../controllers/admin/authAdminController');
const dashboardAdminController = require('../controllers/admin/dashboardAdminController');
const contentAdminController = require('../controllers/admin/contentAdminController');
const pushController = require('../controllers/pushController');
const prisma = require('../config/prisma');

// Admin layout wrapper helper
router.use((req, res, next) => {
  res.renderAdmin = (view, locals = {}) => {
    const mergedLocals = {
      user: req.session?.user,
      csrfToken: res.locals.csrfToken,
      ...locals
    };
    req.app.render(view, mergedLocals, (err, html) => {
      if (err) return next(err);
      req.app.render('layouts/admin', {
        ...mergedLocals,
        body: html
      }, (err2, fullHtml) => {
        if (err2) return next(err2);
        res.send(fullHtml);
      });
    });
  };
  next();
});

// Authentication routes
router.get('/login', authAdminController.getLogin);
router.post('/login', authLimiter, authAdminController.postLogin);
router.post('/logout', authAdminController.postLogout);

// Protected Admin Dashboard
router.get('/', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  dashboardAdminController.getDashboard(req, res, next);
});

// Schedule
router.get('/schedule', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getSchedule(req, res, next);
});
router.post('/schedule/create', requireAuth, requireRole(['ADMIN', 'EDITOR', 'DJ']), contentAdminController.createScheduleSlot);
router.post('/schedule/:id/delete', requireAuth, requireRole(['ADMIN', 'EDITOR']), contentAdminController.deleteScheduleSlot);

// DJs
router.get('/djs', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getDjs(req, res, next);
});
router.post('/djs/create', requireAuth, requireRole(['ADMIN', 'EDITOR']), contentAdminController.createDj);
router.post('/djs/:id/delete', requireAuth, requireRole(['ADMIN']), contentAdminController.deleteDj);

// Shows
router.get('/shows', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getShows(req, res, next);
});
router.post('/shows/create', requireAuth, requireRole(['ADMIN', 'EDITOR']), contentAdminController.createShow);

// Announcements
router.get('/announcements', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getAnnouncements(req, res, next);
});
router.post('/announcements/create', requireAuth, requireRole(['ADMIN', 'EDITOR']), contentAdminController.createAnnouncement);

// Sponsors
router.get('/sponsors', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getSponsors(req, res, next);
});
router.post('/sponsors/create', requireAuth, requireRole(['ADMIN', 'EDITOR']), contentAdminController.createSponsor);

// Song Requests
router.get('/requests', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getRequests(req, res, next);
});
router.post('/requests/:id/status', requireAuth, contentAdminController.updateRequestStatus);

// Contact Messages
router.get('/messages', requireAuth, (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getMessages(req, res, next);
});
router.post('/messages/:id/status', requireAuth, requireRole(['ADMIN', 'EDITOR']), contentAdminController.updateMessageStatus);

// Web Push Notifications Composer (PRD 5.5 & 5.10)
router.get('/notifications', requireAuth, requireRole(['ADMIN', 'EDITOR']), async (req, res) => {
  const subscribersCount = (prisma.isDbConnected && prisma.isDbConnected())
    ? await prisma.pushSubscription.count({ where: { active: true } })
    : (prisma.memoryDb?.pushSubscriptions?.filter(s => s.active).length || 0);

  res.renderAdmin('admin/push', {
    title: 'Web Push Composer | KWIZZ Admin',
    user: req.session.user,
    subscribersCount,
    csrfToken: res.locals.csrfToken
  });
});
router.post('/notifications/send', requireAuth, requireRole(['ADMIN', 'EDITOR']), pushController.sendBroadcast);

// Settings (Admin role only)
router.get('/settings', requireAuth, requireRole(['ADMIN']), (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getSettings(req, res, next);
});
router.post('/settings/update', requireAuth, requireRole(['ADMIN']), contentAdminController.updateSettings);

// Audit Logs (Admin role only)
router.get('/audit', requireAuth, requireRole(['ADMIN']), (req, res, next) => {
  res.render = (v, l) => res.renderAdmin(v, l);
  contentAdminController.getAuditLogs(req, res, next);
});

module.exports = router;
