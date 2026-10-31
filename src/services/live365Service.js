const https = require('https');
const http = require('http');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const env = require('../config/env');

const CACHE_KEY_NOW_PLAYING = 'kwizz:now_playing';
const CACHE_KEY_RECENT = 'kwizz:recent_tracks';
const POLL_INTERVAL_MS = 12000; // 12 seconds (PRD: every 10-15 seconds)

// Curated realistic reggae & dancehall track library for mock/fallback
const MOCK_REGGAE_TRACKS = [
  {
    title: 'Could You Be Loved',
    artist: 'Bob Marley & The Wailers',
    album: 'Uprising',
    artwork: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    duration: 237
  },
  {
    title: 'Here Comes Trouble',
    artist: 'Chronixx',
    album: 'Dread & Cultural',
    artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
    duration: 243
  },
  {
    title: 'Toast',
    artist: 'Koffee',
    album: 'Rapture',
    artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    duration: 191
  },
  {
    title: 'Who Knows (feat. Chronixx)',
    artist: 'Protoje',
    album: 'Ancient Future',
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    duration: 206
  },
  {
    title: 'Rockaway',
    artist: 'Beres Hammond',
    album: 'Music Is Life',
    artwork: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80',
    duration: 228
  },
  {
    title: 'Temperature',
    artist: 'Sean Paul',
    album: 'The Trinity',
    artwork: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
    duration: 216
  },
  {
    title: 'Welcome to Jamrock',
    artist: 'Damian "Jr. Gong" Marley',
    album: 'Welcome to Jamrock',
    artwork: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
    duration: 213
  },
  {
    title: 'Destiny',
    artist: 'Buju Banton',
    album: 'Inna Heights',
    artwork: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=400&q=80',
    duration: 238
  }
];

class Live365Service {
  constructor() {
    this.pollTimer = null;
    this.sseClients = new Set();
    this.currentTrackIndex = 0;
    this.lastTrack = null;
    this.recentTracks = [];
    this.isPolling = false;
  }

  /**
   * Initialize service & polling if active clients exist
   */
  start() {
    logger.info('Live365 Now Playing service initialized.');
    // Populate initial track immediately
    this.pollLive365();
  }

  /**
   * Register a new SSE listener client
   */
  addSSEClient(res) {
    this.sseClients.add(res);
    logger.debug(`SSE Client connected. Total active clients: ${this.sseClients.size}`);

    // If polling was paused, resume it immediately
    if (!this.pollTimer) {
      this.startPolling();
    }

    // Send immediate Now Playing payload to the newly connected client
    this.getNowPlaying().then((track) => {
      this.sendEventToClient(res, 'now_playing', track);
    });

    // Cleanup on disconnect
    res.on('close', () => {
      this.sseClients.delete(res);
      logger.debug(`SSE Client disconnected. Remaining: ${this.sseClients.size}`);
      if (this.sseClients.size === 0) {
        this.pausePolling();
      }
    });
  }

  startPolling() {
    if (this.pollTimer) return;
    logger.info('Resuming Live365 polling (active clients connected).');
    this.pollTimer = setInterval(() => this.pollLive365(), POLL_INTERVAL_MS);
    this.pollLive365();
  }

  pausePolling() {
    if (this.pollTimer) {
      logger.info('Pausing Live365 polling (no active SSE clients).');
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Poll Live365 or generate realistic fallback track
   */
  async pollLive365() {
    try {
      let track = null;

      // In production with a valid station ID, attempt live API query
      if (env.LIVE365_STATION_ID && env.NODE_ENV === 'production') {
        track = await this.fetchFromLive365Api(env.LIVE365_STATION_ID);
      }

      // If live API is not configured or returned empty, rotate fallback track
      if (!track) {
        track = this.getNextMockTrack();
      }

      // Ensure fallback artwork is applied if track has no image
      if (!track.artwork || track.artwork.trim() === '') {
        track.artwork = '/images/fallback-album.svg';
      }

      track.timestamp = new Date().toISOString();
      track.streamUrl = env.DEFAULT_STREAM_URL;
      track.station = env.STATION_NAME;

      // Check if track changed
      const trackChanged = !this.lastTrack || this.lastTrack.title !== track.title || this.lastTrack.artist !== track.artist;

      if (trackChanged) {
        this.lastTrack = track;
        
        // Push to recent tracks (limit 10)
        this.recentTracks.unshift({
          title: track.title,
          artist: track.artist,
          album: track.album || 'Reggae Vibes',
          artwork: track.artwork,
          playedAt: new Date().toISOString()
        });
        if (this.recentTracks.length > 10) {
          this.recentTracks = this.recentTracks.slice(0, 10);
        }

        // Cache in Redis / Memory store
        await cache.set(CACHE_KEY_NOW_PLAYING, JSON.stringify(track), 'EX', 30);
        await cache.set(CACHE_KEY_RECENT, JSON.stringify(this.recentTracks), 'EX', 120);

        // Broadcast to all connected SSE clients
        this.broadcastSSE('now_playing', track);
      }

      return track;
    } catch (err) {
      logger.warn({ msg: 'Error polling Live365 track data', error: err.message });
      return this.lastTrack;
    }
  }

  /**
   * Fetch live metadata from Live365 API
   */
  fetchFromLive365Api(stationId) {
    return new Promise((resolve) => {
      const url = `https://api.live365.com/station/${stationId}`;
      const req = https.get(url, { timeout: 4000 }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const current = json['current-track'] || json.current_track;
            if (current && (current.title || current.artist)) {
              return resolve({
                title: current.title || 'KWIZZ Reggae Selection',
                artist: current.artist || 'KWIZZ Radio DJ',
                album: current.album || 'Ottawa Waves',
                artwork: current.art || '/images/fallback-album.svg'
              });
            }
            resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  getNextMockTrack() {
    const track = MOCK_REGGAE_TRACKS[this.currentTrackIndex % MOCK_REGGAE_TRACKS.length];
    // Rotate to next track after some cycles or when queried
    this.currentTrackIndex++;
    return { ...track };
  }

  /**
   * Retrieve cached Now Playing
   */
  async getNowPlaying() {
    try {
      const cached = await cache.get(CACHE_KEY_NOW_PLAYING);
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    } catch (e) {}

    if (this.lastTrack) return this.lastTrack;
    return this.pollLive365();
  }

  /**
   * Retrieve cached Recent Tracks (last 10)
   */
  async getRecentTracks() {
    try {
      const cached = await cache.get(CACHE_KEY_RECENT);
      if (cached) {
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
      }
    } catch (e) {}

    return this.recentTracks;
  }

  /**
   * Broadcast an event to all connected SSE clients
   */
  broadcastSSE(event, data) {
    for (const client of this.sseClients) {
      this.sendEventToClient(client, event, data);
    }
  }

  sendEventToClient(client, event, data) {
    try {
      client.write(`event: ${event}\n`);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      this.sseClients.delete(client);
    }
  }
}

const live365Service = new Live365Service();
live365Service.start();

module.exports = live365Service;

