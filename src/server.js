const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const prisma = require('./config/prisma');
const { rawClient } = require('./config/redis');

const server = app.listen(env.PORT, () => {
  logger.info(`KWIZZ Radio server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  logger.info(`Audio Stream configured: ${env.DEFAULT_STREAM_URL}`);
  logger.info(`Live365 Station: ${env.LIVE365_STATION_ID}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      if (rawClient && typeof rawClient.quit === 'function') {
        await rawClient.quit();
        logger.info('Redis connection closed.');
      }
    } catch (e) {
      logger.warn('Error closing Redis connection:', e.message);
    }

    try {
      if (prisma && typeof prisma.$disconnect === 'function') {
        await prisma.$disconnect();
        logger.info('Prisma disconnected.');
      }
    } catch (e) {
      logger.warn('Error disconnecting Prisma:', e.message);
    }

    logger.info('Graceful shutdown completed.');
    process.exit(0);
  });

  // Force close if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Shutdown timeout reached. Forcing exit.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;

