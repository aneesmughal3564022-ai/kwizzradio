const prisma = require('../config/prisma');
const env = require('../config/env');
const live365Service = require('../services/live365Service');
const { findOnNowAndUpNext } = require('../utils/time');

/**
 * Helper to retrieve data safely from Prisma with fallback to memoryDb
 */
async function getModelData(modelName, filter = {}) {
  try {
    if (prisma.isDbConnected && prisma.isDbConnected() && prisma[modelName]) {
      return await prisma[modelName].findMany({ where: filter });
    }
  } catch (e) { }

  // Fallback memory data
  if (prisma.memoryDb && prisma.memoryDb[modelName]) {
    return prisma.memoryDb[modelName];
  }
  return [];
}

/**
 * Universal Page Renderer with PJAX partial support
 */
const renderPage = (req, res, pageName, viewPath, pageLocals = {}) => {
  const isPjax = req.headers['x-pjax'] === 'true' || req.query.partial === 'true';

  const defaultLocals = {
    page: pageName,
    stationName: env.STATION_NAME,
    stationTagline: env.STATION_TAGLINE,
    streamUrl: env.DEFAULT_STREAM_URL,
    live365StationId: env.LIVE365_STATION_ID,
    embedUrl: env.LIVE365_EMBED_URL,
    appBadgesEnabled: env.APP_BADGES_ENABLED,
    appStoreUrl: env.APP_STORE_URL,
    googlePlayUrl: env.GOOGLE_PLAY_URL,
    announcement: prisma.memoryDb?.announcements?.[0] || null,
    sponsor: prisma.memoryDb?.sponsors?.[0] || null,
    canonicalUrl: `${env.APP_URL}${req.path}`,
    ...pageLocals
  };

  if (isPjax) {
    return res.render(viewPath, defaultLocals);
  }

  res.render(viewPath, defaultLocals, (err, html) => {
    if (err) return res.status(500).send(err.message);
    res.render('layouts/main', {
      ...defaultLocals,
      body: html
    });
  });
};

// 1. Home Page
const getHomePage = async (req, res, next) => {
  try {
    const slots = await getModelData('scheduleSlots');
    const events = await getModelData('events');
    const { onNow, upNext } = findOnNowAndUpNext(slots);
    const liveTrack = await live365Service.getNowPlaying();

    const recentTracks = await live365Service.getRecentTracks();
    const stationMetadata = live365Service.getStationMetadata();

    renderPage(req, res, 'home', 'pages/home', {
      title: 'KWIZZ Radio | Ottawa Reggae & Dancehall 24/7',
      description: 'Stream Ottawa premier Caribbean radio station live. Reggae, dancehall, rocksteady, and live DJ sets streaming 24/7 worldwide.',
      onNow,
      upNext,
      liveTrack,
      recentTracks,
      stationMetadata,
      upcomingEvents: events.slice(0, 3)
    });
  } catch (err) {
    next(err);
  }
};

// 2. Listen Live Page
const getListenPage = async (req, res, next) => {
  try {
    const liveTrack = await live365Service.getNowPlaying();

    const recentTracks = await live365Service.getRecentTracks();
    const stationMetadata = live365Service.getStationMetadata();

    renderPage(req, res, 'listen', 'pages/listen', {
      title: 'Listen Live | KWIZZ Radio Ottawa',
      description: 'Tune in to the high quality 128kbps live reggae and dancehall stream from KWIZZ Radio Ottawa.',
      liveTrack,
      recentTracks,
      stationMetadata
    });
  } catch (err) {
    next(err);
  }
};

// 3. Weekly Schedule Page
const getSchedulePage = async (req, res, next) => {
  try {
    const slots = await getModelData('scheduleSlots');
    const djs = await getModelData('djs');
    const shows = await getModelData('shows');

    // Enrich slots with Show and DJ data if in memory fallback
    const enrichedSlots = slots.map(slot => {
      const show = shows.find(s => s.id === slot.showId) || { title: 'KWIZZ Reggae Rotation', genre: 'Reggae / Dancehall' };
      const dj = djs.find(d => d.id === slot.djId) || { name: 'KWIZZ Selector' };
      return { ...slot, show, dj };
    });

    renderPage(req, res, 'schedule', 'pages/schedule', {
      title: 'Weekly Radio Schedule | KWIZZ Radio Ottawa',
      description: 'View the complete 7-day radio broadcast schedule for KWIZZ Radio in Ottawa time or your local timezone.',
      slots: enrichedSlots
    });
  } catch (err) {
    next(err);
  }
};

// 4. DJs Roster Page
const getDjsPage = async (req, res, next) => {
  try {
    const djs = await getModelData('djs');
    renderPage(req, res, 'djs', 'pages/djs', {
      title: 'DJs & Presenters | KWIZZ Radio Ottawa',
      description: 'Meet the selectors, sound systems, and presenters bringing Caribbean energy to Ottawa airwaves.',
      djs
    });
  } catch (err) {
    next(err);
  }
};

// 5. Individual DJ Detail Page
const getDjDetailPage = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const djs = await getModelData('djs');
    const dj = djs.find(d => d.slug === slug);

    if (!dj) {
      return res.status(404).render('pages/404', {
        title: 'DJ Not Found | KWIZZ Radio',
        page: '404',
        errorMessage: 'The DJ or presenter you are looking for is not currently in our roster.'
      });
    }

    const shows = await getModelData('shows');
    const djShows = shows.filter(s => s.djId === dj.id);

    renderPage(req, res, 'djs', 'pages/dj-detail', {
      title: `${dj.name} | KWIZZ Radio Ottawa`,
      description: dj.bio,
      dj,
      shows: djShows
    });
  } catch (err) {
    next(err);
  }
};

// 6. Events Page
const getEventsPage = async (req, res, next) => {
  try {
    const events = await getModelData('events');
    renderPage(req, res, 'events', 'pages/events', {
      title: 'Events & Live Broadcasts | KWIZZ Radio Ottawa',
      description: 'Upcoming Caribbean festivals, reggae concerts, sound clashes, and live KWIZZ Radio station appearances in Ottawa.',
      events
    });
  } catch (err) {
    next(err);
  }
};

// 7. Request a Song Page
const getRequestPage = (req, res) => {
  renderPage(req, res, 'request', 'pages/request', {
    title: 'Request a Song | KWIZZ Radio Ottawa',
    description: 'Submit your favorite reggae, dub, or dancehall song request directly to the KWIZZ Radio DJs.'
  });
};

// 8. Contact Page
const getContactPage = (req, res) => {
  renderPage(req, res, 'contact', 'pages/contact', {
    title: 'Contact Station | KWIZZ Radio Ottawa',
    description: 'Get in touch with the KWIZZ Radio management, sales team, and presenters in Ottawa, Ontario.'
  });
};

// 9. About Page
const getAboutPage = (req, res) => {
  renderPage(req, res, 'about', 'pages/about', {
    title: 'About KWIZZ Radio | Ottawa Reggae Heritage & Culture',
    description: 'The story behind KWIZZ Radio Ottawa, our community roots, music licensing, and mission to preserve Caribbean sound system culture.'
  });
};

// 10. Sponsors Page
const getSponsorsPage = async (req, res, next) => {
  try {
    const sponsors = await getModelData('sponsors');
    renderPage(req, res, 'sponsors', 'pages/sponsors', {
      title: 'Our Sponsors & Community Partners | KWIZZ Radio',
      description: 'Support the local Ottawa businesses and organizations that sponsor authentic Caribbean radio.',
      sponsors
    });
  } catch (err) {
    next(err);
  }
};

// 11. Privacy Policy Page
const getPrivacyPage = (req, res) => {
  renderPage(req, res, 'privacy', 'pages/privacy', {
    title: 'Privacy Policy | KWIZZ Radio (PIPEDA & GDPR Compliant)',
    description: 'KWIZZ Radio privacy commitment, cookie policies, listener data protections under PIPEDA, CASL, and GDPR.'
  });
};

// 12. Terms of Use Page
const getTermsPage = (req, res) => {
  renderPage(req, res, 'terms', 'pages/terms', {
    title: 'Terms of Service | KWIZZ Radio',
    description: 'Terms of service and stream usage agreement for KWIZZ Radio Ottawa.'
  });
};

// 13. Dynamic Sitemap.xml (PRD 10: SEO)
const getSitemap = (req, res) => {
  const baseUrl = env.APP_URL;
  const pages = [
    '',
    '/listen',
    '/schedule',
    '/djs',
    '/events',
    '/request',
    '/sponsors',
    '/contact',
    '/about',
    '/privacy',
    '/terms'
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
      .map(
        path => `  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>${path === '' || path === '/listen' ? 'hourly' : 'daily'}</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`
      )
      .join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.send(xml);
};

// 14. Robots.txt
const getRobotsTxt = (req, res) => {
  const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: ${env.APP_URL}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(txt);
};

module.exports = {
  renderPage,
  getHomePage,
  getListenPage,
  getSchedulePage,
  getDjsPage,
  getDjDetailPage,
  getEventsPage,
  getRequestPage,
  getContactPage,
  getAboutPage,
  getSponsorsPage,
  getPrivacyPage,
  getTermsPage,
  getSitemap,
  getRobotsTxt
};
