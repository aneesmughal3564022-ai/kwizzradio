const http = require('http');
const request = require('supertest');
const app = require('../../src/app');
const live365Service = require('../../src/services/live365Service');

describe('Phase 2: Live Player & Now Playing Service', () => {
  afterAll(() => {
    live365Service.pausePolling();
  });

  describe('REST Endpoints', () => {
    it('GET /api/now-playing should return current track metadata and station stream configuration', async () => {
      const res = await request(app).get('/api/now-playing');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('title');
      expect(res.body.data).toHaveProperty('artist');
      expect(res.body.data).toHaveProperty('artwork');
      expect(res.body.streamUrl).toBeDefined();
      expect(res.body.streamUrl).toContain('.mp3');
      expect(res.body.station).toBe('KWIZZ Radio');
    });

    it('GET /api/recent should return a list of recent tracks with limit <= 10', async () => {
      const res = await request(app).get('/api/recent');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Server-Sent Events (SSE) Endpoint', () => {
    it('GET /api/now-playing/stream should establish SSE connection with proper event-stream headers', (done) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const req = http.get(`http://127.0.0.1:${port}/api/now-playing/stream`, (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toMatch(/text\/event-stream/);
          expect(res.headers['cache-control']).toMatch(/no-cache/);
          expect(res.headers['connection']).toMatch(/keep-alive/);
          
          req.destroy();
          server.close(done);
        });

        req.on('error', (err) => {
          server.close(() => done(err));
        });
      });
    });
  });

  describe('Live365Service Logic', () => {
    it('should always guarantee fallback artwork when artwork is omitted', async () => {
      const track = await live365Service.pollLive365();
      expect(track.artwork).toBeTruthy();
      expect(track.artwork.length).toBeGreaterThan(0);
    });

    it('should manage SSE clients and track active listener count', () => {
      const initialCount = live365Service.sseClients.size;
      const fakeClient = {
        write: jest.fn(),
        on: jest.fn()
      };

      live365Service.addSSEClient(fakeClient);
      expect(live365Service.sseClients.size).toBe(initialCount + 1);

      live365Service.sseClients.delete(fakeClient);
      expect(live365Service.sseClients.size).toBe(initialCount);
    });
  });
});
