const request = require('supertest');
const app = require('../../src/app');

describe('Phase 1: Base Layout & Theme Verification', () => {
  it('should render the homepage with true-black reggae base layout', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('KWIZZ Radio');
    expect(res.text).toContain('Ottawa Reggae &amp; Dancehall');
    
    // WCAG 2.1 AA Skip to Content
    expect(res.text).toContain('Skip to main content');

    // Theme configuration
    expect(res.text).toContain('data-theme="dark"');
    expect(res.text).toContain('kwizz_radio_theme');

    // Persistent player container
    expect(res.text).toContain('id="global-player"');
    expect(res.text).toContain('id="kwizz-audio-element"');
    expect(res.text).toContain('id="player-play-btn"');

    // Full screen mobile player modal
    expect(res.text).toContain('id="mobile-player-modal"');

    // Cookie consent banner
    expect(res.text).toContain('id="cookie-consent-banner"');
    expect(res.text).toContain('Your Privacy Choices');
  });

  it('should support PJAX partial rendering without reloading full layout', async () => {
    const res = await request(app)
      .get('/')
      .set('X-PJAX', 'true');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Ottawa\'s Premier');
    // Does NOT contain full HTML document tags when requesting PJAX partial
    expect(res.text).not.toContain('<!DOCTYPE html>');
  });
});

