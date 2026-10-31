const prisma = require('../config/prisma');
const logger = require('../utils/logger');

const recordImpression = async (req, res) => {
  const { id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.sponsorStat.upsert({
        where: {
          sponsorId_date: {
            sponsorId: id,
            date: today
          }
        },
        update: { impressions: { increment: 1 } },
        create: {
          sponsorId: id,
          date: today,
          impressions: 1,
          clicks: 0
        }
      });
    }
  } catch (e) {
    logger.debug(`Could not record impression for sponsor ${id}: ${e.message}`);
  }

  res.status(204).end();
};

const handleSponsorClick = async (req, res) => {
  const { id } = req.params;
  const target = req.query.target || 'https://kwizzradio.ca/sponsors';
  const today = new Date().toISOString().split('T')[0];

  try {
    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.sponsorStat.upsert({
        where: {
          sponsorId_date: {
            sponsorId: id,
            date: today
          }
        },
        update: { clicks: { increment: 1 } },
        create: {
          sponsorId: id,
          date: today,
          impressions: 1,
          clicks: 1
        }
      });
    }
  } catch (e) {
    logger.debug(`Could not record click for sponsor ${id}: ${e.message}`);
  }

  // Safe redirect
  res.redirect(target);
};

module.exports = {
  recordImpression,
  handleSponsorClick
};

