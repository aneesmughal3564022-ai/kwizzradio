const webPush = require('web-push');
const prisma = require('../config/prisma');
const env = require('../config/env');
const logger = require('../utils/logger');

// Generate fallback VAPID keys if not provided in environment
let publicKey = env.VAPID_PUBLIC_KEY;
let privateKey = env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey || publicKey.startsWith('BExample')) {
  try {
    const generated = webPush.generateVAPIDKeys();
    publicKey = generated.publicKey;
    privateKey = generated.privateKey;
    logger.info('Generated development VAPID keys for Web Push');
  } catch (e) {
    logger.warn('Failed to generate VAPID keys:', e.message);
  }
}

if (publicKey && privateKey) {
  try {
    webPush.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:admin@kwizzradio.ca',
      publicKey,
      privateKey
    );
  } catch (e) {
    logger.warn('Failed to set VAPID details:', e.message);
  }
}

/**
 * Save or update subscription
 */
async function saveSubscription({ endpoint, p256dh, auth, userAgent }) {
  try {
    if (prisma.isDbConnected && prisma.isDbConnected()) {
      return await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: { p256dh, auth, userAgent, active: true },
        create: { endpoint, p256dh, auth, userAgent, active: true }
      });
    }

    if (prisma.memoryDb) {
      const existing = prisma.memoryDb.pushSubscriptions.find(s => s.endpoint === endpoint);
      if (existing) {
        existing.p256dh = p256dh;
        existing.auth = auth;
        existing.active = true;
        return existing;
      }
      const newSub = {
        id: `sub-${Date.now()}`,
        endpoint,
        p256dh,
        auth,
        userAgent,
        active: true,
        createdAt: new Date()
      };
      prisma.memoryDb.pushSubscriptions.push(newSub);
      return newSub;
    }
  } catch (err) {
    logger.error('Error saving push subscription:', err.message);
    throw err;
  }
}

/**
 * Send notification to all active subscribers
 */
async function sendNotificationToAll({ title, body, icon = '/images/fallback-album.svg', url = '/' }) {
  let subscriptions = [];

  if (prisma.isDbConnected && prisma.isDbConnected()) {
    subscriptions = await prisma.pushSubscription.findMany({ where: { active: true } });
  } else if (prisma.memoryDb) {
    subscriptions = prisma.memoryDb.pushSubscriptions.filter(s => s.active);
  }

  const payload = JSON.stringify({
    title,
    body,
    icon,
    url
  });

  const results = { sent: 0, failed: 0 };

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webPush.sendNotification(pushSubscription, payload);
      results.sent++;
    } catch (err) {
      results.failed++;
      // Unsubscribe invalid/expired endpoints (HTTP 410 or 404)
      if (err.statusCode === 410 || err.statusCode === 404) {
        if (prisma.isDbConnected && prisma.isDbConnected()) {
          await prisma.pushSubscription.update({
            where: { endpoint: sub.endpoint },
            data: { active: false }
          });
        } else if (prisma.memoryDb) {
          sub.active = false;
        }
      }
    }
  }

  logger.info({ msg: 'Push notification broadcast completed', results, title });
  return results;
}

module.exports = {
  getPublicKey: () => publicKey,
  saveSubscription,
  sendNotificationToAll
};

