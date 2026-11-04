// KWIZZ Radio Persistent Player Engine
// Features: Exponential backoff reconnect, MediaSession API, Status UI, Volume memory, Live365 Metadata Sync, Live Song Progress & Auto-Transition
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

      // Track metadata & progress state
      this.serverClockOffset = 0; // Difference between server time and client time
      this.isFetchingNextTrack = false;
      this.nextTrackPollCount = 0;
      this.progressTimer = null;

      this.currentTrack = {
        title: 'KWIZZ Radio Live',
        artist: 'Ottawa Reggae & Dancehall',
        artwork: '/images/fallback-album.svg',
        duration: 180,
        startTime: Date.now()
      };

      // Check if server injected initial track into audio element
      const initialTrackAttr = this.audio.getAttribute('data-initial-track');
      if (initialTrackAttr) {
        try {
          const parsed = JSON.parse(decodeURIComponent(initialTrackAttr));
          if (parsed && (parsed.title || parsed.artist)) {
            this.currentTrack = Object.assign(this.currentTrack, parsed);
          }
        } catch (e) {}
      }

      this.initDomElements();
      this.initAudioEvents();
      this.initMediaSession();
      this.restoreVolume();
      this.bindUserControls();

      // Start live song elapsed / remaining timer loop
      this.startProgressLoop();

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

      // Live Song Progress Elements (Bottom Player Bar)
      this.timeElapsedEl = document.getElementById('player-time-elapsed');
      this.timeRemainingEl = document.getElementById('player-time-remaining');
      this.progressFillEl = document.getElementById('player-progress-fill');
      this.topProgressBarEl = document.getElementById('player-top-progress-bar');

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
      this.mobileTimeElapsedEl = document.getElementById('mobile-time-elapsed');
      this.mobileTimeRemainingEl = document.getElementById('mobile-time-remaining');
      this.mobileProgressFillEl = document.getElementById('mobile-progress-fill');
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
      this.audio.addEventListener('error', () => {
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
        this.statusBadge.className = 'inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider ';
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
        this.modalStatus.textContent = newState === 'LIVE' ? 'Now Broadcasting Live' : (newState === 'CONNECTING' ? 'Connecting to Stream...' : 'Stream Ready');
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
          if (err && err.name === 'NotAllowedError') {
            this.setStatus('IDLE', 'Click play to start');
          } else {
            this.handleConnectionDrop();
          }
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
        this.setStatus('OFFLINE', 'Stream unavailable. Tap to reconnect.');
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

    /**
     * Starts continuous progress timer (1 second interval)
     */
    startProgressLoop() {
      if (this.progressTimer) clearInterval(this.progressTimer);
      this.progressTimer = setInterval(() => {
        this.tickProgress();
      }, 1000);
      this.tickProgress();
    }

    /**
     * Ticks song progress: computes elapsed seconds, remaining seconds, and progress percentage
     */
    tickProgress() {
      if (!this.currentTrack) return;

      const duration = Math.max(1, Math.round(Number(this.currentTrack.duration) || 180));
      
      let startTime = this.currentTrack.startTime;
      if (!startTime && this.currentTrack.start) {
        startTime = new Date(this.currentTrack.start).getTime();
      }
      if (!startTime || isNaN(startTime)) {
        startTime = Date.now();
        this.currentTrack.startTime = startTime;
      }

      // Compute elapsed using clock-offset corrected time
      const correctedNow = Date.now() + (this.serverClockOffset || 0);
      let elapsed = Math.max(0, Math.floor((correctedNow - startTime) / 1000));

      // Cap elapsed at duration
      if (elapsed > duration) {
        elapsed = duration;
      }

      const remaining = Math.max(0, duration - elapsed);
      const percent = Math.min(100, Math.max(0, (elapsed / duration) * 100));

      const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
      };

      const elapsedStr = formatTime(elapsed);
      const remainingStr = `-${formatTime(remaining)}`;

      // Update Bottom Sticky Player Bar
      if (this.timeElapsedEl) this.timeElapsedEl.textContent = elapsedStr;
      if (this.timeRemainingEl) this.timeRemainingEl.textContent = remainingStr;
      if (this.progressFillEl) this.progressFillEl.style.width = `${percent}%`;
      if (this.topProgressBarEl) this.topProgressBarEl.style.width = `${percent}%`;

      // Update Mobile Modal
      if (this.mobileTimeElapsedEl) this.mobileTimeElapsedEl.textContent = elapsedStr;
      if (this.mobileTimeRemainingEl) this.mobileTimeRemainingEl.textContent = remainingStr;
      if (this.mobileProgressFillEl) this.mobileProgressFillEl.style.width = `${percent}%`;

      // Update Hero Card (Home Page)
      const heroElapsed = document.getElementById('hero-time-elapsed');
      const heroRemaining = document.getElementById('hero-time-remaining');
      const heroBar = document.getElementById('hero-progress-bar');
      if (heroElapsed) heroElapsed.textContent = elapsedStr;
      if (heroRemaining) heroRemaining.textContent = remainingStr;
      if (heroBar) heroBar.style.width = `${percent}%`;

      // Update Listen Lounge
      const listenElapsed = document.getElementById('listen-time-elapsed');
      const listenRemaining = document.getElementById('listen-time-remaining');
      const listenBar = document.getElementById('listen-progress-bar');
      if (listenElapsed) listenElapsed.textContent = elapsedStr;
      if (listenRemaining) listenRemaining.textContent = remainingStr;
      if (listenBar) listenBar.style.width = `${percent}%`;

      // Check if song has completed: automatically fetch and transition to new song
      if (elapsed >= duration && !this.isFetchingNextTrack) {
        this.handleTrackEnded();
      }
    }

    /**
     * Triggered when song ends: polls for the new song and transitions metadata
     */
    handleTrackEnded() {
      this.isFetchingNextTrack = true;
      this.nextTrackPollCount = 0;
      this.pollForNextTrack();
    }

    pollForNextTrack() {
      fetch(`/api/now-playing?_cb=${Date.now()}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            const nextTrack = res.data;
            const currentTitle = (this.currentTrack.title || '').trim().toLowerCase();
            const nextTitle = (nextTrack.title || '').trim().toLowerCase();
            const isDifferentTrack = nextTitle !== currentTitle || (nextTrack.start && nextTrack.start !== this.currentTrack.start);

            if (isDifferentTrack) {
              // New track has begun on air!
              this.isFetchingNextTrack = false;
              this.updateMetadata(nextTrack);
              return;
            }
          }

          // In case Live365 has a 1-3 second delay between audio track finish and API update
          this.nextTrackPollCount++;
          if (this.nextTrackPollCount < 7) {
            setTimeout(() => this.pollForNextTrack(), 2000);
          } else {
            // Reset lock after max retries so future ticks can poll
            setTimeout(() => {
              this.isFetchingNextTrack = false;
            }, 4000);
          }
        })
        .catch(() => {
          this.isFetchingNextTrack = false;
        });
    }

    updateMetadata(track) {
      if (!track) return;
      this.currentTrack = Object.assign(this.currentTrack || {}, track);

      // Synchronize server clock offset
      if (track.serverTime) {
        this.serverClockOffset = track.serverTime - Date.now();
      }

      // Parse start and duration
      const durationSec = Math.max(1, Math.round(Number(track.duration) || 180));
      let startTimeMs = track.startTime;
      if (!startTimeMs && track.start) {
        startTimeMs = new Date(track.start).getTime();
      }
      if (!startTimeMs || isNaN(startTimeMs)) {
        startTimeMs = Date.now();
      }

      this.currentTrack.duration = durationSec;
      this.currentTrack.startTime = startTimeMs;
      this.currentTrack.start = track.start || new Date(startTimeMs).toISOString();
      this.currentTrack.end = track.end || new Date(startTimeMs + durationSec * 1000).toISOString();
      this.isFetchingNextTrack = false;
      this.nextTrackPollCount = 0;

      const title = track.title || 'KWIZZ Radio Live';
      const artist = track.artist || 'Ottawa Reggae & Dancehall';
      const artwork = (track.artwork && typeof track.artwork === 'string' && track.artwork.trim().length > 0)
        ? track.artwork
        : '/images/fallback-album.svg';

      // Update sticky player DOM
      if (this.trackTitle) this.trackTitle.textContent = title;
      if (this.trackArtist) this.trackArtist.textContent = artist;
      if (this.trackArtwork) {
        this.trackArtwork.src = artwork;
        this.trackArtwork.onerror = () => {
          this.trackArtwork.onerror = null;
          this.trackArtwork.src = '/images/fallback-album.svg';
        };
      }

      // Update mobile modal DOM
      if (this.modalTitle) this.modalTitle.textContent = title;
      if (this.modalArtist) this.modalArtist.textContent = artist;
      if (this.modalArtwork) {
        this.modalArtwork.src = artwork;
        this.modalArtwork.onerror = () => {
          this.modalArtwork.onerror = null;
          this.modalArtwork.src = '/images/fallback-album.svg';
        };
      }

      // Update Hero card if present on current page
      const heroTitle = document.getElementById('hero-track-title');
      const heroArtist = document.getElementById('hero-track-artist');
      const heroArt = document.getElementById('hero-track-art');
      if (heroTitle) heroTitle.textContent = title;
      if (heroArtist) heroArtist.textContent = artist;
      if (heroArt) {
        heroArt.src = artwork;
        heroArt.onerror = () => {
          heroArt.onerror = null;
          heroArt.src = '/images/fallback-album.svg';
        };
      }

      // Update Listen Lounge page elements if present
      const listenTitle = document.getElementById('listen-page-title');
      const listenArtist = document.getElementById('listen-page-artist');
      const listenArt = document.getElementById('listen-page-art');
      if (listenTitle) listenTitle.textContent = title;
      if (listenArtist) listenArtist.textContent = artist;
      if (listenArt) {
        listenArt.src = artwork;
        listenArt.onerror = () => {
          listenArt.onerror = null;
          listenArt.src = '/images/fallback-album.svg';
        };
      }

      // Update music purchase & stream links
      const appleLinks = document.querySelectorAll('#hero-apple-music, #listen-apple-music');
      appleLinks.forEach((link) => {
        if (track.appleMusicUrl) {
          link.href = track.appleMusicUrl;
          link.classList.remove('hidden');
        } else {
          link.classList.add('hidden');
        }
      });
      const amazonLinks = document.querySelectorAll('#hero-amazon-music, #listen-amazon-music');
      amazonLinks.forEach((link) => {
        if (track.amazonStoreUrl) {
          link.href = track.amazonStoreUrl;
          link.classList.remove('hidden');
        } else {
          link.classList.add('hidden');
        }
      });

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

      // Immediately tick progress to update the progress bar without waiting 1s
      this.tickProgress();
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
      const isMutedOrZero = this.audio.muted || this.audio.volume === 0;

      if (this.volumeIconHigh && this.volumeIconMuted) {
        if (isMutedOrZero) {
          this.volumeIconHigh.classList.add('hidden');
          this.volumeIconMuted.classList.remove('hidden');
        } else {
          this.volumeIconHigh.classList.remove('hidden');
          this.volumeIconMuted.classList.add('hidden');
        }
      }

      if (this.volumeSlider && !this.audio.muted) {
        this.volumeSlider.value = this.audio.volume;
      }
    }

    showToast(message) {
      let toast = document.getElementById('player-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'player-toast';
        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-950/95 border border-amber-400 shadow-2xl transition-all duration-300 opacity-0 pointer-events-none';
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.remove('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 3000);
    }

    bindUserControls() {
      // Bottom sticky play button
      if (this.playBtn) {
        this.playBtn.addEventListener('click', () => this.toggle());
      }

      // Mobile modal play button
      if (this.modalPlayBtn) {
        this.modalPlayBtn.addEventListener('click', () => this.toggle());
      }

      // Reconnect button
      if (this.reconnectBtn) {
        this.reconnectBtn.addEventListener('click', () => {
          this.retryCount = 0;
          this.play();
        });
      }

      // Volume slider
      if (this.volumeSlider) {
        this.volumeSlider.addEventListener('input', (e) => {
          this.setVolume(parseFloat(e.target.value));
        });
      }

      // Mute toggle button
      if (this.muteBtn) {
        this.muteBtn.addEventListener('click', () => this.toggleMute());
      }

      // Expand mobile modal
      if (this.expandBtn && this.modal) {
        this.expandBtn.addEventListener('click', () => {
          this.modal.classList.remove('hidden');
        });
      }

      // Close mobile modal
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
              this.showToast('KWIZZ Radio stream link copied to clipboard!');
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
