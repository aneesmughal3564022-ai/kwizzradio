const request = require('supertest');
const app = require('../../src/app');

describe('Phase 5: Extras (Push, PWA, Sponsors & Analytics)', () => {
  describe('Web Push (VAPID) Integration', () => {
    it('GET /api/push/public-key should return a valid VAPID public key', async () => {
      const res = await request(app).get('/api/push/public-key');
      expect(res.status).toBe(200);
      expect(res.body.publicKey).toBeDefined();
      expect(typeof res.body.publicKey).toBe('string');
    });

    it('POST /api/push/subscribe should store opt-in push subscription', async () => {
      const fakeSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/fake-test-endpoint-uuid-1234',
        keys: {
          p256dh: 'BNcRdreALRF8FsEJKZVoVZ0',
          auth: 'tBHItDaA7mNW3jP'
        }
      };

      const res = await request(app)
        .post('/api/push/subscribe')
        .send(fakeSubscription);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.endpoint).toBe(fakeSubscription.endpoint);
    });
  });

  describe('PWA & Service Worker (PRD 7.4)', () => {
    it('GET /manifest.json should return valid PWA manifest with true-black theme', async () => {
      const res = await request(app).get('/manifest.json');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('KWIZZ Radio Ottawa');
      expect(res.body.theme_color).toBe('#000000');
      expect(res.body.display).toBe('standalone');
    });

    it('GET /sw.js should serve the Service Worker and forbid caching the live stream', async () => {
      const res = await request(app).get('/sw.js');
      expect(res.status).toBe(200);
      expect(res.text).toContain('NEVER caches the live stream');
      expect(res.text).toContain('.mp3');
    });
  });

  describe('Privacy-Friendly Analytics (PRD 5.11)', () => {
    it('POST /api/analytics/event should record in-house anonymous event with 204 No Content', async () => {
      const res = await request(app)
        .post('/api/analytics/event')
        .send({
          event: 'play',
          metadata: { duration: 120 },
          path: '/listen'
        });

      expect(res.status).toBe(204);
    });
  });
});
