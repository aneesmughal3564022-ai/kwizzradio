const { test, expect } = require('@playwright/test');

test.describe('KWIZZ Radio End-to-End User Journeys', () => {
  
  test('1. Persistent Player & PJAX navigation: Audio player remains mounted across pages', async ({ page }) => {
    await page.goto('/');

    // Check station title and branding
    await expect(page).toHaveTitle(/KWIZZ Radio/);
    const player = page.locator('#global-player');
    await expect(player).toBeVisible();

    // Verify audio element exists
    const audio = page.locator('#kwizz-audio-element');
    await expect(audio).toBeAttached();

    // Tap Listen Live navigation link
    await page.click('nav >> text=Listen Live');
    await page.waitForURL('**/listen');

    // Confirm that player element is still intact and mounted
    await expect(player).toBeVisible();
    await expect(page.locator('h1')).toContainText('KWIZZ Listening Lounge');

    // Tap Schedule
    await page.click('nav >> text=Schedule');
    await page.waitForURL('**/schedule');
    await expect(player).toBeVisible();
    await expect(page.locator('h1')).toContainText('Weekly Schedule');
  });

  test('2. Player Controls & Status: Play button initiates stream connection', async ({ page }) => {
    await page.goto('/listen');

    const playBtn = page.locator('#player-play-btn');
    await expect(playBtn).toBeVisible();

    // Click play button
    await playBtn.click();

    // Verify status changes to connecting / live
    const statusText = page.locator('#player-status-text');
    await expect(statusText).not.toHaveText('Ready');
  });

  test('3. Song Request Flow: User submits song request and receives confirmation', async ({ page }) => {
    await page.goto('/request');

    await page.fill('#req-artist', 'Chronixx');
    await page.fill('#req-title', 'Smile Jamaica');
    await page.fill('#req-name', 'Ras Marcus');
    await page.fill('#req-dedication', 'Blessings to Ottawa Caribbean community');

    // Wait 2 seconds to satisfy the human timing protection (>1.5s)
    await page.waitForTimeout(2000);

    // Submit form
    await page.click('#request-submit-btn');

    // Expect success toast message
    const feedback = page.locator('#request-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Big up! Your song request has been sent');
  });

  test('4. Contact Form Flow: Listener sends inquiry to station staff', async ({ page }) => {
    await page.goto('/contact');

    await page.fill('#contact-name', 'Elena Laurent');
    await page.fill('#contact-email', 'elena@ottawamail.ca');
    await page.fill('#contact-subject', 'Community Festival Partnership');
    await page.fill('#contact-message', 'Hello KWIZZ team, we would love to have your DJs broadcast at our event.');

    await page.waitForTimeout(2000);

    await page.click('#contact-submit-btn');

    const feedback = page.locator('#contact-feedback');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Thank you for reaching out');
  });

  test('5. Admin Login & Dashboard Flow: Staff logs in and accesses control panel', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('#login-email', 'admin@kwizzradio.ca');
    await page.fill('#login-pass', 'KwizzPass2026!');

    await page.click('button[type="submit"]');

    // Redirects to /admin
    await page.waitForURL('**/admin');
    await expect(page.locator('h1')).toContainText('Station Control & Analytics');
    await expect(page.locator('text=Current Listeners')).toBeVisible();
  });

});

