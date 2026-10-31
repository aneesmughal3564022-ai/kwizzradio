const Redis = require('ioredis');
const logger = require('../utils/logger');
const env = require('./env');

let redisClient = null;
let isConnected = false;

// Fallback in-memory store if Redis is unavailable or during testing
const memoryStore = new Map();
const memoryTimeouts = new Map();

const memoryCache = {
  isInMemory: true,
  async get(key) {
    return memoryStore.has(key) ? memoryStore.get(key) : null;
  },
  async set(key, value, ...args) {
    memoryStore.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    
    // Support EX seconds (e.g. set(key, val, 'EX', 60))
    if (args.length >= 2 && String(args[0]).toUpperCase() === 'EX') {
      const seconds = parseInt(args[1], 10);
      if (memoryTimeouts.has(key)) clearTimeout(memoryTimeouts.get(key));
      const t = setTimeout(() => {
        memoryStore.delete(key);
        memoryTimeouts.delete(key);
      }, seconds * 1000);
      if (typeof t.unref === 'function') t.unref(); // Avoid holding test runners open
      memoryTimeouts.set(key, t);
    }
    return 'OK';
  },
  async del(key) {
    if (memoryTimeouts.has(key)) {
      clearTimeout(memoryTimeouts.get(key));
      memoryTimeouts.delete(key);
    }
    const existed = memoryStore.delete(key);
    return existed ? 1 : 0;
  },
  async incr(key) {
    const cur = parseInt(memoryStore.get(key) || '0', 10);
    const next = cur + 1;
    memoryStore.set(key, String(next));
    return next;
  },
  async expire(key, seconds) {
    if (!memoryStore.has(key)) return 0;
    if (memoryTimeouts.has(key)) clearTimeout(memoryTimeouts.get(key));
    const t = setTimeout(() => {
      memoryStore.delete(key);
      memoryTimeouts.delete(key);
    }, seconds * 1000);
    if (typeof t.unref === 'function') t.unref();
    memoryTimeouts.set(key, t);
    return 1;
  },
  on() {
    return this;
  }
};

// In test environment, default directly to fast in-memory store
if (process.env.NODE_ENV !== 'test') {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) {
          return null;
        }
        return Math.min(times * 100, 1000);
      },
      enableOfflineQueue: false,
      lazyConnect: true
    });

    redisClient.connect().then(() => {
      isConnected = true;
      logger.info('Connected to Redis service');
    }).catch(() => {
      logger.info('In-memory cache active for Now Playing & rate-limiting (Standalone mode)');
    });

    redisClient.on('error', (err) => {
      if (isConnected) {
        logger.warn({ msg: 'Redis error, falling back to memory cache', error: err.message });
        isConnected = false;
      }
    });

    redisClient.on('connect', () => {
      isConnected = true;
    });
  } catch (err) {
    logger.warn({ msg: 'Unable to initialize Redis client, using in-memory fallback', error: err.message });
  }
}

// Proxy wrapper that routes to Redis if connected, else memory cache
const cacheProxy = new Proxy({}, {
  get(target, prop) {
    if (isConnected && redisClient && typeof redisClient[prop] === 'function') {
      return (...args) => redisClient[prop](...args);
    }
    if (typeof memoryCache[prop] === 'function') {
      return (...args) => memoryCache[prop](...args);
    }
    return undefined;
  }
});

module.exports = {
  cache: cacheProxy,
  get isRedisConnected() {
    return isConnected;
  },
  rawClient: redisClient
};
