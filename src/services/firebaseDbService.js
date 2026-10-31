const { db, isFirebaseConnected, memoryDb } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Universal Firebase Firestore Data Service
 * Supports live Firestore collections with fallback to in-memory store
 */
class FirebaseDbService {
  /**
   * Map Prisma model names to Firestore collection names
   */
  getCollectionName(model) {
    const map = {
      user: 'users',
      users: 'users',
      dj: 'djs',
      djs: 'djs',
      show: 'shows',
      shows: 'shows',
      scheduleSlot: 'scheduleSlots',
      scheduleSlots: 'scheduleSlots',
      announcement: 'announcements',
      announcements: 'announcements',
      event: 'events',
      events: 'events',
      sponsor: 'sponsors',
      sponsors: 'sponsors',
      sponsorStat: 'sponsorStats',
      sponsorStats: 'sponsorStats',
      songRequest: 'songRequests',
      songRequests: 'songRequests',
      contactMessage: 'contactMessages',
      contactMessages: 'contactMessages',
      pushSubscription: 'pushSubscriptions',
      pushSubscriptions: 'pushSubscriptions',
      setting: 'settings',
      settings: 'settings',
      auditLog: 'auditLogs',
      auditLogs: 'auditLogs'
    };
    return map[model] || model;
  }

  /**
   * Find all documents matching filter
   */
  async findMany(model, options = {}) {
    const collName = this.getCollectionName(model);
    const filter = options.where || {};

    if (isFirebaseConnected() && db) {
      try {
        let query = db.collection(collName);
        for (const [key, value] of Object.entries(filter)) {
          if (value !== undefined) {
            query = query.where(key, '==', value);
          }
        }
        if (options.take) {
          query = query.limit(options.take);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        logger.warn({ msg: `Firestore findMany error on ${collName}, using local store`, error: err.message });
      }
    }

    // Fallback in-memory
    let list = memoryDb[collName] || [];
    if (Object.keys(filter).length > 0) {
      list = list.filter(item => {
        return Object.entries(filter).every(([k, v]) => item[k] === v);
      });
    }
    if (options.take) {
      list = list.slice(0, options.take);
    }
    return list;
  }

  /**
   * Find a single document
   */
  async findOne(model, options = {}) {
    const results = await this.findMany(model, { ...options, take: 1 });
    return results[0] || null;
  }

  /**
   * Find by ID
   */
  async findById(model, id) {
    const collName = this.getCollectionName(model);

    if (isFirebaseConnected() && db) {
      try {
        const doc = await db.collection(collName).doc(id).get();
        if (doc.exists) {
          return { id: doc.id, ...doc.data() };
        }
      } catch (err) {
        logger.warn({ msg: `Firestore findById error on ${collName}`, error: err.message });
      }
    }

    const list = memoryDb[collName] || [];
    return list.find(item => item.id === id) || null;
  }

  /**
   * Create document
   */
  async create(model, options = {}) {
    const collName = this.getCollectionName(model);
    const data = options.data || options;
    const docId = data.id || `${collName.slice(0, -1)}-${Date.now()}`;
    const newDoc = {
      ...data,
      id: docId,
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (isFirebaseConnected() && db) {
      try {
        await db.collection(collName).doc(docId).set(newDoc);
        return newDoc;
      } catch (err) {
        logger.warn({ msg: `Firestore create error on ${collName}`, error: err.message });
      }
    }

    if (!memoryDb[collName]) memoryDb[collName] = [];
    memoryDb[collName].unshift(newDoc);
    return newDoc;
  }

  /**
   * Update document
   */
  async update(model, options = {}) {
    const collName = this.getCollectionName(model);
    const where = options.where || {};
    const data = options.data || {};
    const docId = where.id;

    if (isFirebaseConnected() && db && docId) {
      try {
        await db.collection(collName).doc(docId).update({ ...data, updatedAt: new Date() });
        const updated = await db.collection(collName).doc(docId).get();
        return { id: updated.id, ...updated.data() };
      } catch (err) {
        logger.warn({ msg: `Firestore update error on ${collName}`, error: err.message });
      }
    }

    if (memoryDb[collName]) {
      const idx = memoryDb[collName].findIndex(item => item.id === docId);
      if (idx !== -1) {
        memoryDb[collName][idx] = { ...memoryDb[collName][idx], ...data, updatedAt: new Date() };
        return memoryDb[collName][idx];
      }
    }
    return null;
  }

  /**
   * Upsert document
   */
  async upsert(model, options = {}) {
    const collName = this.getCollectionName(model);
    const where = options.where || {};
    const updateData = options.update || {};
    const createData = options.create || {};

    const existing = await this.findOne(model, { where });
    if (existing) {
      return await this.update(model, { where: { id: existing.id }, data: updateData });
    } else {
      return await this.create(model, { data: createData });
    }
  }

  /**
   * Delete document
   */
  async delete(model, options = {}) {
    const collName = this.getCollectionName(model);
    const docId = options.where?.id;

    if (isFirebaseConnected() && db && docId) {
      try {
        await db.collection(collName).doc(docId).delete();
      } catch (err) {
        logger.warn({ msg: `Firestore delete error on ${collName}`, error: err.message });
      }
    }

    if (memoryDb[collName] && docId) {
      memoryDb[collName] = memoryDb[collName].filter(item => item.id !== docId);
    }
    return { id: docId };
  }

  /**
   * Count documents
   */
  async count(model, options = {}) {
    const results = await this.findMany(model, options);
    return results.length;
  }
}

const firebaseDb = new FirebaseDbService();

module.exports = firebaseDb;

