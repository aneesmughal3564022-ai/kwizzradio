const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Public Station Pages
router.get('/', pageController.getHomePage);
router.get('/listen', pageController.getListenPage);
router.get('/schedule', pageController.getSchedulePage);
router.get('/djs', pageController.getDjsPage);
router.get('/djs/:slug', pageController.getDjDetailPage);
router.get('/events', pageController.getEventsPage);
router.get('/request', pageController.getRequestPage);
router.get('/contact', pageController.getContactPage);
router.get('/about', pageController.getAboutPage);
router.get('/sponsors', pageController.getSponsorsPage);
router.get('/privacy', pageController.getPrivacyPage);
router.get('/terms', pageController.getTermsPage);

// SEO & Crawlers
router.get('/sitemap.xml', pageController.getSitemap);
router.get('/robots.txt', pageController.getRobotsTxt);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    station: 'KWIZZ Radio',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
