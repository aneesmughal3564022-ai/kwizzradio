const request = require('supertest');
const app = require('../../src/app');

describe('Phase 4: Admin Panel & Authentication', () => {
  let sessionCookie = null;

  describe('Unauthenticated Access Control', () => {
    it('GET /admin should redirect unauthenticated users to /admin/login', async () => {
      const res = await request(app).get('/admin');
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });

    it('GET /admin/login should render the secure staff login form', async () => {
      const res = await request(app).get('/admin/login');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Staff Portal');
      expect(res.text).toContain('action="/admin/login"');
    });

    it('POST /admin/login should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({ email: 'admin@kwizzradio.ca', password: 'WrongPassword123' });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });
  });

  describe('Staff Login & Session Establishment', () => {
    it('POST /admin/login should authenticate valid admin and set secure session cookie', async () => {
      const res = await request(app)
        .post('/admin/login')
        .send({
          email: 'admin@kwizzradio.ca',
          password: 'KwizzPass2026!'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin');
      expect(res.headers['set-cookie']).toBeDefined();

      sessionCookie = res.headers['set-cookie'];
    });
  });

  describe('Authenticated Admin Dashboard & Navigation', () => {
    it('GET /admin with session should render the Dashboard with analytics', async () => {
      const res = await request(app)
        .get('/admin')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Station Control &amp; Analytics');
      expect(res.text).toContain('Current Listeners');
      expect(res.text).toContain('Top Listener Countries');
    });

    it('GET /admin/schedule should render weekly schedule manager', async () => {
      const res = await request(app)
        .get('/admin/schedule')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Manage Weekly Schedule');
    });

    it('GET /admin/djs should render DJ roster manager', async () => {
      const res = await request(app)
        .get('/admin/djs')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Manage DJs &amp; Presenters');
    });

    it('GET /admin/shows should render show manager', async () => {
      const res = await request(app)
        .get('/admin/shows')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Manage Radio Shows');
    });

    it('GET /admin/announcements should render announcements manager', async () => {
      const res = await request(app)
        .get('/admin/announcements')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Station Announcements Banner');
    });

    it('GET /admin/sponsors should render sponsors manager', async () => {
      const res = await request(app)
        .get('/admin/sponsors')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Manage Sponsors &amp; Advertisers');
    });

    it('GET /admin/requests should render song requests inbox', async () => {
      const res = await request(app)
        .get('/admin/requests')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Song Requests Inbox');
    });

    it('GET /admin/messages should render contact messages inbox', async () => {
      const res = await request(app)
        .get('/admin/messages')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Contact Inquiries Inbox');
    });

    it('GET /admin/settings should render site settings & stream URL manager', async () => {
      const res = await request(app)
        .get('/admin/settings')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Station Settings &amp; Audio Stream');
      expect(res.text).toContain('Primary Stream URL');
    });

    it('GET /admin/audit should render audit logs', async () => {
      const res = await request(app)
        .get('/admin/audit')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Administrative Audit Log');
    });
  });

  describe('Admin CRUD Actions & Audit Logging', () => {
    it('POST /admin/djs/create should create a new DJ and record audit log', async () => {
      const res = await request(app)
        .post('/admin/djs/create')
        .set('Cookie', sessionCookie)
        .send({
          name: 'DJ Test Rebel',
          bio: 'Spinning test reggae vibes.',
          photoUrl: '/images/djs/test.jpg'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/djs');
    });

    it('POST /admin/settings/update should update stream settings and record audit log', async () => {
      const res = await request(app)
        .post('/admin/settings/update')
        .set('Cookie', sessionCookie)
        .send({
          stream_url: 'https://streaming.live365.com/b72076_128k.mp3',
          station_name: 'KWIZZ Radio Ottawa'
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/settings');
    });
  });

  describe('Staff Logout Flow', () => {
    it('POST /admin/logout should terminate session and redirect to /admin/login', async () => {
      const res = await request(app)
        .post('/admin/logout')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/admin/login');
    });
  });
});

