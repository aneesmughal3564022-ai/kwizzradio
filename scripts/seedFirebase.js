const { admin, db, isFirebaseConnected, memoryDb } = require('../src/config/firebase');
const logger = require('../src/utils/logger');
const env = require('../src/config/env');

async function seedFirebase() {
  logger.info(`Starting Firebase Firestore seed for project: ${env.FIREBASE_PROJECT_ID}...`);

  if (!isFirebaseConnected() || !db) {
    logger.warn('No active Firebase connection found (firebase-service-account.json not detected).');
    logger.info('Please download your Service Account JSON from Firebase Console > Project Settings > Service Accounts,');
    logger.info('save it as firebase-service-account.json in the project root, and run npm run firebase:seed again.');
    return;
  }

  try {
    const collections = [
      'users',
      'djs',
      'shows',
      'scheduleSlots',
      'announcements',
      'events',
      'sponsors',
      'settings'
    ];

    for (const collName of collections) {
      const items = memoryDb[collName] || [];
      logger.info(`Seeding ${items.length} records into Firestore collection '${collName}'...`);
      const batch = db.batch();

      for (const item of items) {
        const docRef = db.collection(collName).doc(item.id);
        batch.set(docRef, {
          ...item,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      logger.info(`✓ Successfully seeded '${collName}'.`);
    }

    logger.info('🎉 Firebase Firestore seed completed successfully!');
  } catch (err) {
    logger.error({ msg: 'Failed to seed Firebase Firestore', error: err.message });
  }
}

seedFirebase().then(() => {
  process.exit(0);
});

