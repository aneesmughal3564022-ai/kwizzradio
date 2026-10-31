const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const env = require('./env');

let isConnected = false;
let firestoreDb = null;
let firebaseAuth = null;

// Initial in-memory data store matching Prisma/Firebase models
const memoryDb = {
  users: [
    {
      id: 'admin-uuid',
      email: 'admin@kwizzradio.ca',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakeHashForDevOnlyKwizzPass2026',
      name: 'KWIZZ Station Manager',
      role: 'ADMIN',
      twoFactorEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  djs: [
    {
      id: 'dj-roots-uuid',
      name: 'DJ Roots',
      slug: 'dj-roots',
      bio: 'Veteran selector spinning consciousness reggae, dub, and rocksteady vibes across Ottawa and internationally.',
      photoUrl: '/images/djs/dj-roots.jpg',
      socialTwitter: 'https://twitter.com/djroots',
      socialInstagram: 'https://instagram.com/djroots',
      socialFacebook: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'empress-tanya-uuid',
      name: 'Empress Tanya',
      slug: 'empress-tanya',
      bio: 'Bringing fiery dancehall riddims, female empowerment, and Caribbean culture straight to Ottawa.',
      photoUrl: '/images/djs/empress-tanya.jpg',
      socialTwitter: null,
      socialInstagram: 'https://instagram.com/empresstanya',
      socialFacebook: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  shows: [
    {
      id: 'show-reggae-morning',
      title: 'Ottawa Reggae Morning',
      slug: 'ottawa-reggae-morning',
      description: 'Start your weekday with smooth conscious reggae, uplifting roots, Ottawa community news, and good morning vibrations.',
      genre: 'Roots & Conscious Reggae',
      bannerUrl: '/images/shows/reggae-morning.jpg',
      active: true,
      djId: 'dj-roots-uuid',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'show-dancehall-fever',
      title: 'Dancehall Fever',
      slug: 'dancehall-fever',
      description: 'High energy dancehall tracks, newest riddims from Kingston to Toronto, and hot club party mixes.',
      genre: 'Dancehall',
      bannerUrl: '/images/shows/dancehall-fever.jpg',
      active: true,
      djId: 'empress-tanya-uuid',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  scheduleSlots: [
    {
      id: 'slot-1',
      dayOfWeek: new Date().getDay(),
      startTime: '00:00',
      endTime: '23:59',
      timezone: 'America/Toronto',
      showId: 'show-reggae-morning',
      djId: 'dj-roots-uuid',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  announcements: [
    {
      id: 'announcement-1',
      title: 'Ottawa Reggae Festival Live Broadcast',
      message: 'Catch KWIZZ Radio broadcasting live on-location from Lebreton Flats all weekend long! Tune in online or join us in person.',
      linkText: 'View Details',
      linkUrl: '/events',
      isActive: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  events: [
    {
      id: 'event-1',
      title: 'Ottawa Jerk & Reggae Fest 2026',
      slug: 'ottawa-jerk-and-reggae-fest-2026',
      description: 'Annual outdoor Caribbean festival featuring top Jamaican artists, authentic jerk food, and KWIZZ Radio soundstage.',
      location: 'Lebreton Flats Park, Ottawa, ON',
      eventDate: new Date(Date.now() + 86400000 * 14),
      bannerUrl: '/images/events/jerk-fest.jpg',
      ticketUrl: 'https://eventbrite.com/example-jerk-fest',
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  sponsors: [
    {
      id: 'sponsor-1',
      name: 'Island Flavours Ottawa',
      logoUrl: '/images/sponsors/island-flavours.svg',
      targetUrl: 'https://islandflavoursottawa.example.com',
      placement: 'HEADER',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'sponsor-2',
      name: 'Roots Record Shop',
      logoUrl: '/images/sponsors/roots-records.svg',
      targetUrl: 'https://rootsrecords.example.com',
      placement: 'FOOTER',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  songRequests: [],
  contactMessages: [],
  pushSubscriptions: [],
  settings: [
    { id: 'set-1', key: 'stream_url', value: env.DEFAULT_STREAM_URL, description: 'Stream URL', isPublic: true },
    { id: 'set-2', key: 'station_name', value: env.STATION_NAME, description: 'Station Name', isPublic: true },
    { id: 'set-3', key: 'station_tagline', value: env.STATION_TAGLINE, description: 'Station Tagline', isPublic: true },
    { id: 'set-4', key: 'live365_station_id', value: env.LIVE365_STATION_ID, description: 'Station ID', isPublic: true },
    { id: 'set-5', key: 'app_badges_enabled', value: 'false', description: 'App Badges', isPublic: true }
  ],
  sponsorStats: [],
  auditLogs: []
};

// Check for service account configuration
function initFirebase() {
  const apps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);
  if (apps.length > 0) {
    isConnected = true;
    firestoreDb = admin.firestore();
    firebaseAuth = admin.auth();
    return;
  }

  try {
    const serviceAccountFile = env.FIREBASE_SERVICE_ACCOUNT_PATH 
      ? path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.resolve(process.cwd(), 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountFile)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || env.FIREBASE_PROJECT_ID
      });
      isConnected = true;
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      logger.info({ msg: 'Firebase Admin initialized from service account JSON', project: serviceAccount.project_id });
      return;
    }

    if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      isConnected = true;
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      logger.info({ msg: 'Firebase Admin initialized from environment variables', project: env.FIREBASE_PROJECT_ID });
      return;
    }

    // Default application credentials / mock mode
    logger.info({
      msg: 'Firebase initialized in local cloud mode (ready for live credentials)',
      project: env.FIREBASE_PROJECT_ID,
      hint: 'Place firebase-service-account.json in project root to connect live Firebase Cloud project.'
    });
  } catch (err) {
    logger.warn({ msg: 'Firebase initialization notice', error: err.message });
  }
}

initFirebase();

module.exports = {
  admin,
  db: firestoreDb,
  auth: firebaseAuth,
  isFirebaseConnected: () => isConnected,
  memoryDb
};
