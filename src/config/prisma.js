const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const env = require('./env');
const firebaseDb = require('../services/firebaseDbService');
const { memoryDb: firebaseMemoryDb, isFirebaseConnected } = require('./firebase');

let prismaClientInstance = null;
let isPrismaConnected = false;

// If explicitly configured for Prisma/PostgreSQL, attempt Prisma connection
if (env.DATABASE_DRIVER === 'prisma') {
  if (process.env.NODE_ENV === 'production') {
    prismaClientInstance = new PrismaClient();
  } else {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
      });
    }
    prismaClientInstance = global.__prisma;
  }

  prismaClientInstance.$connect()
    .then(() => {
      isPrismaConnected = true;
      logger.info('Database connection established via Prisma (PostgreSQL)');
    })
    .catch((err) => {
      logger.warn({ msg: 'Postgres not reachable. Using fallback data layer.', error: err.message });
    });
} else {
  logger.info({
    msg: 'Active Database Backend: Firebase Firestore',
    projectId: env.FIREBASE_PROJECT_ID,
    connected: isFirebaseConnected()
  });
}

/**
 * Proxy target to map Prisma model calls to Firebase Firestore when in Firebase mode
 */
const dbHandler = {
  get(target, prop) {
    if (prop === 'isDbConnected') {
      return () => {
        if (env.DATABASE_DRIVER === 'firebase') {
          return true; // Firebase is active
        }
        return isPrismaConnected;
      };
    }

    if (prop === 'memoryDb') {
      return firebaseMemoryDb;
    }

    if (prop === '$connect') {
      return async () => {};
    }

    if (prop === '$disconnect') {
      return async () => {};
    }

    // If configured to use Prisma and Prisma is actively connected, delegate to PrismaClient
    if (env.DATABASE_DRIVER === 'prisma' && isPrismaConnected && prismaClientInstance) {
      return prismaClientInstance[prop];
    }

    // Default to Firebase Firestore adapter
    const modelName = prop;
    return {
      findMany: async (options) => await firebaseDb.findMany(modelName, options),
      findUnique: async (options) => await firebaseDb.findOne(modelName, options),
      findFirst: async (options) => await firebaseDb.findOne(modelName, options),
      create: async (options) => await firebaseDb.create(modelName, options),
      update: async (options) => await firebaseDb.update(modelName, options),
      upsert: async (options) => await firebaseDb.upsert(modelName, options),
      delete: async (options) => await firebaseDb.delete(modelName, options),
      count: async (options) => await firebaseDb.count(modelName, options),
      deleteMany: async (options) => await firebaseDb.delete(modelName, options)
    };
  }
};

const dbProxy = new Proxy({}, dbHandler);

module.exports = dbProxy;
module.exports.memoryDb = firebaseMemoryDb;
module.exports.isDbConnected = () => (env.DATABASE_DRIVER === 'firebase' ? true : isPrismaConnected);
