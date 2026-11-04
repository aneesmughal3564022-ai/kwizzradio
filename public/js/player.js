// KWIZZ Radio Persistent Player Engine
// Features: Exponential backoff reconnect, MediaSession API, Status UI, Volume memory

(function () {
  const BACKOFF_DELAYS = [1000, 2000, 5000, 10000]; // 1s, 2s, 5s, 10s
  const VOLUME_KEY = 'kwizz_player_volume';
  const MUTED_KEY = 'kwizz_player_muted';

  class RadioPlayer {
    constructor() {
      this.audio = document.getElementById('kwizz-audio-element');
      if (!this.audio) return;

      this.streamUrl = this.audio.getAttribute('data-stream-url') || 'https://streaming.live365.com/a77724';
      this.state = 'IDLE'; // IDLE, CONNECTING, LIVE, RECONNECTING, OFFLINE, PAUSED
      this.retryCount = 0;
      this.retryTimer = null;
      this.isManualPause = false;
      this.currentTrack = {
        title: 'KWIZZ Radio Live',
        artist: 'Ottawa Reggae & Dancehall',
        artwork: '/images/fallback-album.svg'
      };

      this.initDomElements();
      this.initAudioEvents();
      this.initMediaSession();
      this.restoreVolume();
      this.bindUserControls();

      // Expose globally for page scripts
      window.player = this;
    }

    initDomElements() {
      this.playBtn = document.getElementById('player-play-btn');
      this.playIcon = document.getElementById('player-play-icon');
      this.pauseIcon = document.getElementById('player-pause-icon');
      this.spinner = document.getElementById('player-spinner');
      this.statusBadge = document.getElementById('player-status-badge');
      this.statusText = document.getElementById('player-status-text');
      this.statusDetail = document.getElementById('player-status-detail');
      this.reconnectBtn = document.getElementById('player-reconnect-btn');
      this.equalizer = document.getElementById('player-equalizer');

      this.trackTitle = document.getElementById('player-title');
      this.trackArtist = document.getElementById('player-artist');
      this.trackArtwork = document.getElementById('player-artwork');

      this.volumeSlider = document.getElementById('player-volume-slider');
      this.muteBtn = document.getElementById('player-mute-btn');
      this.volumeIconHigh = document.getElementById('volume-icon-high');
      this.volumeIconMuted = document.getElementById('volume-icon-muted');

      // Mobile Modal Elements
      this.modal = document.getElementById('mobile-player-modal');
      this.expandBtn = document.getElementById('player-expand-btn');
      this.closeModalBtn = document.getElementById('mobile-player-close-btn');
      this.modalPlayBtn = document.getElementById('mobile-modal-play-btn');
      this.modalTitle = document.getElementById('mobile-modal-title');
      this.modalArtist = document.getElementById('mobile-modal-artist');
      this.modalArtwork = document.getElementById('mobile-modal-artwork');
      this.modalStatus = document.getElementById('mobile-modal-status');
    }

    initAudioEvents() {
      // Audio buffering / connecting
      this.audio.addEventListener('loadstart', () => {
        if (!this.isManualPause) this.setStatus('CONNECTING');
      });

      this.audio.addEventListener('waiting', () => {
        if (!this.isManualPause) this.setStatus('CONNECTING');
      });

      // Stream successfully started playing
      this.audio.addEventListener('playing', () => {
        this.retryCount = 0;
        this.setStatus('LIVE');
      });

      // Stream ended or interrupted unexpectedly
      this.audio.addEventListener('ended', () => {
        if (!this.isManualPause) {
          this.handleConnectionDrop();
        }
      });

      // Stream error encountered
      this.audio.addEventListener('error', (e) => {
        if (!this.isManualPause) {
          this.handleConnectionDrop();
        }
      });
    }

    setStatus(newState, detail = '') {
      this.state = newState;

      // Update Play/Pause UI Button state
      if (newState === 'CONNECTING' || newState === 'RECONNECTING') {
        if (this.spinner) this.spinner.classList.remove('hidden');
        if (this.playIcon) this.playIcon.classList.add('hidden');
        if (this.pauseIcon) this.pauseIcon.classList.add('hidden');
      } else if (newState === 'LIVE') {
        if (this.spinner) this.spinner.classList.add('hidden');
        if (this.playIcon) this.playIcon.classList.add('hidden');
        if (this.pauseIcon) this.pauseIcon.classList.remove('hidden');
        if (this.equalizer) this.equalizer.classList.remove('hidden');
        if (this.reconnectBtn) this.reconnectBtn.classList.add('hidden');
      } else {
        // IDLE, PAUSED, OFFLINE
        if (this.spinner) this.spinner.classList.add('hidden');
        if (this.playIcon) this.playIcon.classList.remove('hidden');
        if (this.pauseIcon) this.pauseIcon.classList.add('hidden');
        if (this.equalizer) this.equalizer.classList.add('hidden');
      }

      // Update Status Badge UI
      if (this.statusBadge && this.statusText) {
        this.statusBadge.className = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ';
        const dot = this.statusBadge.querySelector('span:first-child');

        switch (newState) {
          case 'LIVE':
            this.statusBadge.classList.add('bg-emerald-950/80', 'text-emerald-400', 'border', 'border-emerald-500/30');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse';
            this.statusText.textContent = 'Live';
            break;
          case 'CONNECTING':
            this.statusBadge.classList.add('bg-amber-950/80', 'text-amber-400', 'border', 'border-amber-500/30');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';
            this.statusText.textContent = 'Connecting...';
            break;
          case 'RECONNECTING':
            this.statusBadge.classList.add('bg-amber-950/80', 'text-amber-400', 'border', 'border-amber-500/30');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping';
            this.statusText.textContent = `Reconnecting (${this.retryCount}/${BACKOFF_DELAYS.length})`;
            break;
          case 'OFFLINE':
            this.statusBadge.classList.add('bg-rose-950/80', 'text-rose-400', 'border', 'border-rose-500/30');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-rose-400';
            this.statusText.textContent = 'Offline';
            break;
          default:
            this.statusBadge.classList.add('bg-zinc-800', 'text-zinc-400');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-zinc-500';
            this.statusText.textContent = 'Ready';
        }
      }

      if (this.statusDetail) {
        if (detail) {
          this.statusDetail.textContent = detail;
          this.statusDetail.classList.remove('hidden');
        } else {
          this.statusDetail.classList.add('hidden');
        }
      }

      // Sync Mobile Modal Status
      if (this.modalStatus) {
        this.modalStatus.textContent = newState === 'LIVE' ? 'Now Broadcasting' : (newState === 'CONNECTING' ? 'Connecting to Stream...' : 'Stream Ready');
      }

      // Dispatch analytics event
      if (window.kwizzAnalytics) {
        if (newState === 'LIVE') window.kwizzAnalytics.track('play');
        if (newState === 'PAUSED') window.kwizzAnalytics.track('pause');
        if (newState === 'OFFLINE') window.kwizzAnalytics.track('stream_error');
      }
    }

    play() {
      this.isManualPause = false;
      this.setStatus('CONNECTING');

      // Append cache-buster timestamp to avoid stale streaming buffers
      const streamSrc = this.streamUrl.includes('?')
        ? `${this.streamUrl}&_cb=${Date.now()}`
        : `${this.streamUrl}?_cb=${Date.now()}`;

      this.audio.src = streamSrc;
      this.audio.load();

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Playback initiation blocked or failed:', err);
          this.handleConnectionDrop();
        });
      }
    }

    pause() {
      this.isManualPause = true;
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.audio.pause();
      this.audio.removeAttribute('src'); // Stop streaming bandwidth
      this.audio.load();
      this.setStatus('PAUSED');
    }

    toggle() {
      if (this.state === 'LIVE' || this.state === 'CONNECTING' || this.state === 'RECONNECTING') {
        this.pause();
      } else {
        this.play();
      }
    }

    /**
     * Auto-reconnect with exponential backoff: 1s, 2s, 5s, 10s
     */
    handleConnectionDrop() {
      if (this.isManualPause) return;

      if (this.retryCount < BACKOFF_DELAYS.length) {
        const delay = BACKOFF_DELAYS[this.retryCount];
        this.retryCount++;
        this.setStatus('RECONNECTING', `Retrying stream in ${delay / 1000}s...`);

        this.retryTimer = setTimeout(() => {
          this.play();
        }, delay);
      } else {
        // Max retries reached: show offline message and Reconnect button
        this.setStatus('OFFLINE', 'Connection lost. Tap Reconnect to try again.');
        if (this.reconnectBtn) this.reconnectBtn.classList.remove('hidden');
      }
    }

    /**
     * Media Session API for lock-screen, Bluetooth, and headphone controls
     */
    initMediaSession() {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('stop', () => this.pause());
      }
    }

    updateMetadata(track) {
      if (!track) return;
      this.currentTrack = track;

      const title = track.title || 'KWIZZ Radio Live';
      const artist = track.artist || 'Ottawa Reggae & Dancehall';
      const artwork = track.artwork || '/images/fallback-album.svg';

      // Update sticky player DOM
      if (this.trackTitle) this.trackTitle.textContent = title;
      if (this.trackArtist) this.trackArtist.textContent = artist;
      if (this.trackArtwork) this.trackArtwork.src = artwork;

      // Update mobile modal DOM
      if (this.modalTitle) this.modalTitle.textContent = title;
      if (this.modalArtist) this.modalArtist.textContent = artist;
      if (this.modalArtwork) this.modalArtwork.src = artwork;

      // Update Hero card if present on current page
      const heroTitle = document.getElementById('hero-track-title');
      const heroArtist = document.getElementById('hero-track-artist');
      const heroArt = document.getElementById('hero-track-art');
      if (heroTitle) heroTitle.textContent = title;
      if (heroArtist) heroArtist.textContent = artist;
      if (heroArt) heroArt.src = artwork;

      // Update Media Session API
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title,
          artist: artist,
          album: 'KWIZZ Radio Ottawa (24/7)',
          artwork: [
            { src: artwork, sizes: '96x96', type: 'image/png' },
            { src: artwork, sizes: '128x128', type: 'image/png' },
            { src: artwork, sizes: '256x256', type: 'image/png' },
            { src: artwork, sizes: '512x512', type: 'image/png' }
          ]
        });
      }
    }

    restoreVolume() {
      const savedVol = localStorage.getItem(VOLUME_KEY);
      const isMuted = localStorage.getItem(MUTED_KEY) === 'true';

      if (savedVol !== null) {
        this.audio.volume = parseFloat(savedVol);
        if (this.volumeSlider) this.volumeSlider.value = savedVol;
      } else {
        this.audio.volume = 0.9;
      }

      this.audio.muted = isMuted;
      this.updateVolumeUI();
    }

    setVolume(value) {
      this.audio.volume = value;
      this.audio.muted = false;
      localStorage.setItem(VOLUME_KEY, value);
      localStorage.setItem(MUTED_KEY, 'false');
      this.updateVolumeUI();
    }

    toggleMute() {
      this.audio.muted = !this.audio.muted;
      localStorage.setItem(MUTED_KEY, this.audio.muted ? 'true' : 'false');
      this.updateVolumeUI();
    }

    updateVolumeUI() {
      const isMuted = this.audio.muted || this.audio.volume === 0;
      if (this.volumeIconHigh && this.volumeIconMuted) {
        if (isMuted) {
          this.volumeIconHigh.classList.add('hidden');
          this.volumeIconMuted.classList.remove('hidden');
        } else {
          this.volumeIconHigh.classList.remove('hidden');
          this.volumeIconMuted.classList.add('hidden');
        }
      }
    }

    bindUserControls() {
      if (this.playBtn) {
        this.playBtn.addEventListener('click', () => this.toggle());
      }
      if (this.modalPlayBtn) {
        this.modalPlayBtn.addEventListener('click', () => this.toggle());
      }
      if (this.reconnectBtn) {
        this.reconnectBtn.addEventListener('click', () => {
          this.retryCount = 0;
          this.play();
        });
      }
      if (this.volumeSlider) {
        this.volumeSlider.addEventListener('input', (e) => {
          this.setVolume(parseFloat(e.target.value));
        });
      }
      if (this.muteBtn) {
        this.muteBtn.addEventListener('click', () => this.toggleMute());
      }
      if (this.expandBtn && this.modal) {
        this.expandBtn.addEventListener('click', () => {
          this.modal.classList.remove('hidden');
        });
      }
      if (this.closeModalBtn && this.modal) {
        this.closeModalBtn.addEventListener('click', () => {
          this.modal.classList.add('hidden');
        });
      }

      // Share button handler
      const shareBtn = document.getElementById('player-share-btn');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          const shareData = {
            title: 'KWIZZ Radio Ottawa',
            text: `Listening to ${this.currentTrack.title} - ${this.currentTrack.artist} on KWIZZ Radio Ottawa!`,
            url: window.location.origin
          };

          if (navigator.share) {
            try {
              await navigator.share(shareData);
              if (window.kwizzAnalytics) window.kwizzAnalytics.track('share_click', { method: 'web_share' });
            } catch (err) {}
          } else {
            // Fallback: Copy link to clipboard
            try {
              await navigator.clipboard.writeText(window.location.origin);
              alert('KWIZZ Radio stream link copied to clipboard!');
              if (window.kwizzAnalytics) window.kwizzAnalytics.track('share_click', { method: 'clipboard' });
            } catch (e) {}
          }
        });
      }
    }
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', () => {
    new RadioPlayer();
  });
})();

