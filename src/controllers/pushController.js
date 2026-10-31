const { z } = require('zod');
const pushService = require('../services/pushService');
const { recordAuditLog } = require('../services/auditService');

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

const getPublicKey = (req, res) => {
  res.json({
    publicKey: pushService.getPublicKey()
  });
};

const subscribe = async (req, res, next) => {
  try {
    const data = subscriptionSchema.parse(req.body);

    const sub = await pushService.saveSubscription({
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to KWIZZ Radio notifications',
      data: sub
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid push subscription schema' });
    }
    next(err);
  }
};

const sendBroadcast = async (req, res, next) => {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'Title and body are required' });
    }

    const results = await pushService.sendNotificationToAll({
      title,
      body,
      url: url || '/'
    });

    await recordAuditLog({
      userId: req.session?.user?.id,
      action: 'DISPATCH_PUSH_NOTIFICATION',
      targetType: 'PushNotification',
      targetId: 'all',
      details: { title, body, results },
      ipAddress: req.ip
    });

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(200).json({ success: true, results });
    }

    res.redirect('/admin/notifications');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPublicKey,
  subscribe,
  sendBroadcast
};

