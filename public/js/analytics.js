// KWIZZ Radio Privacy-Friendly Analytics & Consent Engine
// Compliant with Canadian PIPEDA, CASL and GDPR guidelines

(function () {
  const CONSENT_KEY = 'kwizz_cookie_consent';

  class AnalyticsManager {
    constructor() {
      this.hasConsent = this.checkConsent();
      this.initConsentBanner();
      window.kwizzAnalytics = this;
    }

    checkConsent() {
      const saved = localStorage.getItem(CONSENT_KEY);
      return saved === 'all';
    }

    setConsent(level) {
      localStorage.setItem(CONSENT_KEY, level);
      this.hasConsent = level === 'all';
      const banner = document.getElementById('cookie-consent-banner');
      if (banner) banner.classList.add('hidden');
    }

    initConsentBanner() {
      const banner = document.getElementById('cookie-consent-banner');
      if (!banner) return;

      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) {
        banner.classList.remove('hidden');
      }

      const acceptAllBtn = document.getElementById('cookie-accept-all');
      const essentialBtn = document.getElementById('cookie-essential-only');

      if (acceptAllBtn) {
        acceptAllBtn.addEventListener('click', () => this.setConsent('all'));
      }
      if (essentialBtn) {
        essentialBtn.addEventListener('click', () => this.setConsent('essential'));
      }
    }

    /**
     * Track station events (play, pause, stream_error, request_submitted, share_click)
     */
    track(eventName, metadata = {}) {
      if (!this.hasConsent && eventName !== 'stream_error') {
        // Essential diagnostic events like stream errors are logged anonymously without tracking IDs
        return;
      }

      const payload = {
        event: eventName,
        metadata,
        path: window.location.pathname,
        timestamp: new Date().toISOString()
      };

      // Send to server in-house analytics endpoint via Beacon or Fetch
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify(payload));
      } else {
        fetch('/api/analytics/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {});
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsManager();
  });
})();

