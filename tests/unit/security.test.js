const request = require('supertest');
const app = require('../../src/app');

describe('Phase 1: Foundation & Security Middleware', () => {
  it('should serve health check with 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.station).toBe('KWIZZ Radio');
  });

  it('should include strict Helmet security headers and CSP', async () => {
    const res = await request(app).get('/health');
    expect(res.headers).toHaveProperty('content-security-policy');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain('streaming.live365.com');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should include CORS headers', async () => {
    const res = await request(app)
      .get('/api')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should validate inputs using Zod middleware and reject invalid schemas with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/test-validation')
      .send({ name: 'A', email: 'not-an-email' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveLength(2);
  });

  it('should pass Zod validation when inputs are valid', async () => {
    const res = await request(app)
      .post('/api/test-validation')
      .send({ name: 'Reggae Fan', email: 'fan@kwizzradio.ca' })
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Reggae Fan');
    expect(res.body.data.email).toBe('fan@kwizzradio.ca');
  });

  it('should return structured 404 for non-existent API routes', async () => {
    const res = await request(app)
      .get('/api/does-not-exist')
      .set('Accept', 'application/json');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Endpoint not found');
  });

  it('should render HTML 404 page for non-existent web routes', async () => {
    const res = await request(app)
      .get('/does-not-exist-page')
      .set('Accept', 'text/html');

    expect(res.status).toBe(404);
    expect(res.text).toContain('Lost in the Rhythm?');
  });
});

