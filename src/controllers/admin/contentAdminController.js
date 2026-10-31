const prisma = require('../../config/prisma');
const { recordAuditLog } = require('../../services/auditService');
const env = require('../../config/env');

// Helper to get or fallback
async function getItems(model) {
  if (prisma.isDbConnected && prisma.isDbConnected() && prisma[model]) {
    return await prisma[model].findMany({ orderBy: { createdAt: 'desc' } });
  }
  return prisma.memoryDb?.[model] || [];
}

// ==========================================
// 1. SCHEDULE SLOTS
// ==========================================
const getSchedule = async (req, res, next) => {
  try {
    const slots = await getItems('scheduleSlots');
    const shows = await getItems('shows');
    const djs = await getItems('djs');
    res.render('admin/schedule', {
      title: 'Manage Schedule | KWIZZ Admin',
      user: req.session.user,
      slots,
      shows,
      djs,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const createScheduleSlot = async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime, showId, djId } = req.body;
    const newSlot = {
      id: `slot-${Date.now()}`,
      dayOfWeek: parseInt(dayOfWeek, 10),
      startTime,
      endTime,
      timezone: 'America/Toronto',
      showId,
      djId: djId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.scheduleSlot.create({ data: newSlot });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.scheduleSlots.push(newSlot);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_SCHEDULE_SLOT',
      targetType: 'ScheduleSlot',
      targetId: newSlot.id,
      details: newSlot,
      ipAddress: req.ip
    });

    res.redirect('/admin/schedule');
  } catch (err) { next(err); }
};

const deleteScheduleSlot = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.scheduleSlot.delete({ where: { id } });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.scheduleSlots = prisma.memoryDb.scheduleSlots.filter(s => s.id !== id);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'DELETE_SCHEDULE_SLOT',
      targetType: 'ScheduleSlot',
      targetId: id,
      details: { deletedId: id },
      ipAddress: req.ip
    });

    res.redirect('/admin/schedule');
  } catch (err) { next(err); }
};

// ==========================================
// 2. DJS
// ==========================================
const getDjs = async (req, res, next) => {
  try {
    const djs = await getItems('djs');
    res.render('admin/djs', {
      title: 'Manage DJs | KWIZZ Admin',
      user: req.session.user,
      djs,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const createDj = async (req, res, next) => {
  try {
    const { name, bio, photoUrl, socialTwitter, socialInstagram } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newDj = {
      id: `dj-${Date.now()}`,
      name,
      slug,
      bio,
      photoUrl: photoUrl || '/images/fallback-album.svg',
      socialTwitter: socialTwitter || null,
      socialInstagram: socialInstagram || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.dJ.create({ data: newDj });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.djs.push(newDj);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_DJ',
      targetType: 'DJ',
      targetId: newDj.id,
      details: newDj,
      ipAddress: req.ip
    });

    res.redirect('/admin/djs');
  } catch (err) { next(err); }
};

const deleteDj = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.dJ.delete({ where: { id } });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.djs = prisma.memoryDb.djs.filter(d => d.id !== id);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'DELETE_DJ',
      targetType: 'DJ',
      targetId: id,
      details: { deletedId: id },
      ipAddress: req.ip
    });

    res.redirect('/admin/djs');
  } catch (err) { next(err); }
};

// ==========================================
// 3. SHOWS
// ==========================================
const getShows = async (req, res, next) => {
  try {
    const shows = await getItems('shows');
    const djs = await getItems('djs');
    res.render('admin/shows', {
      title: 'Manage Shows | KWIZZ Admin',
      user: req.session.user,
      shows,
      djs,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const createShow = async (req, res, next) => {
  try {
    const { title, genre, description, djId } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newShow = {
      id: `show-${Date.now()}`,
      title,
      slug,
      genre: genre || 'Reggae',
      description,
      djId: djId || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.show.create({ data: newShow });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.shows.push(newShow);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_SHOW',
      targetType: 'Show',
      targetId: newShow.id,
      details: newShow,
      ipAddress: req.ip
    });

    res.redirect('/admin/shows');
  } catch (err) { next(err); }
};

// ==========================================
// 4. ANNOUNCEMENTS
// ==========================================
const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await getItems('announcements');
    res.render('admin/announcements', {
      title: 'Manage Announcements | KWIZZ Admin',
      user: req.session.user,
      announcements,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { title, message, linkText, linkUrl, isActive } = req.body;
    const item = {
      id: `ann-${Date.now()}`,
      title,
      message,
      linkText: linkText || 'Learn More',
      linkUrl: linkUrl || '/events',
      isActive: isActive === 'true' || isActive === 'on' || isActive === true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.announcement.create({ data: item });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.announcements.unshift(item);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'Announcement',
      targetId: item.id,
      details: item,
      ipAddress: req.ip
    });

    res.redirect('/admin/announcements');
  } catch (err) { next(err); }
};

// ==========================================
// 5. SPONSORS
// ==========================================
const getSponsors = async (req, res, next) => {
  try {
    const sponsors = await getItems('sponsors');
    res.render('admin/sponsors', {
      title: 'Manage Sponsors | KWIZZ Admin',
      user: req.session.user,
      sponsors,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const createSponsor = async (req, res, next) => {
  try {
    const { name, logoUrl, targetUrl, placement } = req.body;
    const newSponsor = {
      id: `sp-${Date.now()}`,
      name,
      logoUrl: logoUrl || '/images/fallback-album.svg',
      targetUrl,
      placement: placement || 'HEADER',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.sponsor.create({ data: newSponsor });
    } else if (prisma.memoryDb) {
      prisma.memoryDb.sponsors.push(newSponsor);
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'CREATE_SPONSOR',
      targetType: 'Sponsor',
      targetId: newSponsor.id,
      details: newSponsor,
      ipAddress: req.ip
    });

    res.redirect('/admin/sponsors');
  } catch (err) { next(err); }
};

// ==========================================
// 6. SONG REQUESTS INBOX
// ==========================================
const getRequests = async (req, res, next) => {
  try {
    const requests = await getItems('songRequests');
    res.render('admin/requests', {
      title: 'Song Requests Inbox | KWIZZ Admin',
      user: req.session.user,
      requests,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const updateRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // NEW, PLAYED, REJECTED

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.songRequest.update({ where: { id }, data: { status } });
    } else if (prisma.memoryDb) {
      const item = prisma.memoryDb.songRequests.find(r => r.id === id);
      if (item) item.status = status;
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_REQUEST_STATUS',
      targetType: 'SongRequest',
      targetId: id,
      details: { newStatus: status },
      ipAddress: req.ip
    });

    res.redirect('/admin/requests');
  } catch (err) { next(err); }
};

// ==========================================
// 7. CONTACT MESSAGES INBOX
// ==========================================
const getMessages = async (req, res, next) => {
  try {
    const messages = await getItems('contactMessages');
    res.render('admin/messages', {
      title: 'Contact Messages Inbox | KWIZZ Admin',
      user: req.session.user,
      messages,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const updateMessageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // NEW, REPLIED, ARCHIVED

    if (prisma.isDbConnected && prisma.isDbConnected()) {
      await prisma.contactMessage.update({ where: { id }, data: { status } });
    } else if (prisma.memoryDb) {
      const item = prisma.memoryDb.contactMessages.find(m => m.id === id);
      if (item) item.status = status;
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_MESSAGE_STATUS',
      targetType: 'ContactMessage',
      targetId: id,
      details: { newStatus: status },
      ipAddress: req.ip
    });

    res.redirect('/admin/messages');
  } catch (err) { next(err); }
};

// ==========================================
// 8. SITE SETTINGS & STREAM URL
// ==========================================
const getSettings = async (req, res, next) => {
  try {
    const settings = await getItems('settings');
    res.render('admin/settings', {
      title: 'Site Settings & Stream URL | KWIZZ Admin',
      user: req.session.user,
      settings,
      env,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body; // { stream_url, station_name, app_badges_enabled, ... }

    for (const [key, val] of Object.entries(updates)) {
      if (key === '_csrf') continue;

      if (prisma.isDbConnected && prisma.isDbConnected()) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(val) },
          create: { key, value: String(val), isPublic: true }
        });
      } else if (prisma.memoryDb) {
        const existing = prisma.memoryDb.settings.find(s => s.key === key);
        if (existing) existing.value = String(val);
        else prisma.memoryDb.settings.push({ id: `set-${Date.now()}`, key, value: String(val), isPublic: true });
      }
    }

    await recordAuditLog({
      userId: req.session.user.id,
      action: 'UPDATE_SETTINGS',
      targetType: 'Setting',
      targetId: 'all',
      details: updates,
      ipAddress: req.ip
    });

    res.redirect('/admin/settings');
  } catch (err) { next(err); }
};

// ==========================================
// 9. AUDIT LOGS
// ==========================================
const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await getItems('auditLogs');
    res.render('admin/audit', {
      title: 'Audit Logs | KWIZZ Admin',
      user: req.session.user,
      logs,
      csrfToken: res.locals.csrfToken
    });
  } catch (err) { next(err); }
};

module.exports = {
  getSchedule,
  createScheduleSlot,
  deleteScheduleSlot,
  getDjs,
  createDj,
  deleteDj,
  getShows,
  createShow,
  getAnnouncements,
  createAnnouncement,
  getSponsors,
  createSponsor,
  getRequests,
  updateRequestStatus,
  getMessages,
  updateMessageStatus,
  getSettings,
  updateSettings,
  getAuditLogs
};

