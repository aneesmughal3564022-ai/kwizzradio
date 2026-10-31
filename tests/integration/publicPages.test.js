const request = require('supertest');
const app = require('../../src/app');

describe('Phase 3: Public Pages, Forms & SEO', () => {
  describe('All Public Pages Routing & Rendering', () => {
    const publicRoutes = [
      ['/', 'Ottawa Reggae &amp; Dancehall'],
      ['/listen', 'KWIZZ Listening Lounge'],
      ['/schedule', 'Weekly Schedule'],
      ['/djs', 'DJs &amp; Presenters'],
      ['/djs/dj-roots', 'Official KWIZZ Presenter'],
      ['/events', 'Events &amp; Appearances'],
      ['/request', 'Request a Song'],
      ['/contact', 'Contact KWIZZ Radio'],
      ['/about', 'About KWIZZ Radio'],
      ['/sponsors', 'Sponsors &amp; Advertisers'],
      ['/privacy', 'Privacy Policy'],
      ['/terms', 'Terms of Service']
    ];

    test.each(publicRoutes)('GET %s should return 200 and contain expected heading text', async (path, expectedText) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.text).toContain(expectedText);
    });
  });

  describe('SEO & Crawler Endpoints', () => {
    it('GET /sitemap.xml should return valid XML sitemap with station URLs', async () => {
      const res = await request(app).get('/sitemap.xml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/xml/);
      expect(res.text).toContain('<urlset');
      expect(res.text).toContain('/listen</loc>');
      expect(res.text).toContain('/schedule</loc>');
    });

    it('GET /robots.txt should return crawler directives and sitemap reference', async () => {
      const res = await request(app).get('/robots.txt');
      expect(res.status).toBe(200);
      expect(res.text).toContain('User-agent: *');
      expect(res.text).toContain('Disallow: /admin');
      expect(res.text).toContain('Sitemap:');
    });
  });

  describe('Song Request Form API (POST /api/requests)', () => {
    it('should accept a valid song request and store/alert staff', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          artist: 'Beres Hammond',
          songTitle: 'Rockaway',
          requestedBy: 'Ras Dave',
          dedication: 'Big up Ottawa crew!',
          email: 'dave@example.com',
          rendered_at: Date.now() - 3000 // 3 seconds ago
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('song request has been sent');
    });

    it('should reject song request with missing required fields (artist / title / name)', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          artist: '',
          songTitle: '',
          requestedBy: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should silently handle honeypot spam bot submissions without error', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          artist: 'Spam Artist',
          songTitle: 'Spam Track',
          requestedBy: 'Bot',
          hp_website: 'http://spambot.evil' // Honeypot filled by bot
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject rapid submissions (< 1.5 seconds) to prevent automated bot scripts', async () => {
      const res = await request(app)
        .post('/api/requests')
        .send({
          artist: 'Fast Bot Artist',
          songTitle: 'Fast Track',
          requestedBy: 'Fast Bot',
          rendered_at: Date.now() - 200 // 200ms ago -> too fast!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('too fast');
    });
  });

  describe('Contact Form API (POST /api/contact)', () => {
    it('should accept a valid contact message and notify station staff', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Sarah Listener',
          email: 'sarah@example.ca',
          subject: 'Love the Saturday dancehall show!',
          message: 'Just wanted to say the station sounds incredible in Ottawa West.',
          caslConsent: true,
          rendered_at: Date.now() - 4000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Station management will get back to you');
    });

    it('should reject contact message with invalid email format', async () => {
      const res = await request(app)
        .post('/api/contact')
        .send({
          name: 'Sarah',
          email: 'not-an-email',
          message: 'Short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Sponsor Impressions & Clicks (PRD 5.8)', () => {
    it('POST /api/sponsors/:id/impression should record impression without blocking audio', async () => {
      const res = await request(app).post('/api/sponsors/sponsor-1/impression');
      expect(res.status).toBe(204);
    });

    it('GET /api/sponsors/:id/click should record click and redirect to target URL', async () => {
      const targetUrl = 'https://islandflavoursottawa.example.com';
      const res = await request(app)
        .get(`/api/sponsors/sponsor-1/click?target=${encodeURIComponent(targetUrl)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(targetUrl);
    });
  });
});

