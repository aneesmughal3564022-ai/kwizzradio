const prisma = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * Record administrative action into AuditLog
 */
async function recordAuditLog({ userId, action, targetType, targetId, details, ipAddress }) {
  try {
    const serializedDetails = typeof details === 'object' ? JSON.stringify(details) : details;

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action,
          targetType,
          targetId: targetId ? String(targetId) : null,
          details: serializedDetails || null,
          ipAddress: ipAddress || null
        }
      });
    } else {
      // Memory DB fallback
      if (prisma.memoryDb) {
        prisma.memoryDb.auditLogs.unshift({
          id: `audit-${Date.now()}`,
          userId,
          action,
          targetType,
          targetId,
          details: serializedDetails,
          ipAddress,
          createdAt: new Date()
        });
      }
    }

    logger.info({ msg: `[AUDIT] ${action} on ${targetType} by User ${userId || 'anonymous'}`, targetId });
  } catch (err) {
    logger.warn({ msg: 'Failed to record audit log', error: err.message });
  }
}

module.exports = {
  recordAuditLog
};

