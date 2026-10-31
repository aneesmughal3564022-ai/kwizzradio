// KWIZZ Radio Web Push Client (Opt-in only)

(function () {
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch (err) {
      console.warn('Service worker registration failed:', err);
      return null;
    }
  }

  async function subscribeToPush(registration) {
    if (!('PushManager' in window) || !registration) return;

    try {
      // Check existing permission
      if (Notification.permission === 'denied') return;

      // Fetch VAPID public key
      const keyRes = await fetch('/api/push/public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) return;

      const convertedKey = urlBase64ToUint8Array(publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      // Send subscription to backend
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    } catch (err) {
      // User dismissed prompt or browser declined
      console.debug('Push subscription skipped:', err.message);
    }
  }

  // Register on window load
  window.addEventListener('load', async () => {
    const reg = await registerServiceWorker();
    // Expose prompt function for opt-in UI buttons
    window.kwizzRequestPush = () => {
      if (reg) subscribeToPush(reg);
    };
  });
})();

