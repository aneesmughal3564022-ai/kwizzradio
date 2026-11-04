const live365Service = require('../services/live365Service');
const env = require('../config/env');

/**
 * GET /api/now-playing
 * Returns current track, artwork, station status and stream URL
 */
const getNowPlaying = async (req, res, next) => {
  try {
    const track = await live365Service.getNowPlaying();
    res.status(200).json({
      success: true,
      data: track,
      streamUrl: env.DEFAULT_STREAM_URL,
      embedUrl: env.LIVE365_EMBED_URL,
      stationMetadata: live365Service.getStationMetadata(),
      station: env.STATION_NAME
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/recent
 * Returns list of last 10 tracks played
 */
const getRecentTracks = async (req, res, next) => {
  try {
    const tracks = await live365Service.getRecentTracks();
    res.status(200).json({
      success: true,
      data: tracks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/stream.m3u
 * Downloadable M3U playlist file for VLC, Winamp, iTunes, and internet radio players
 */
const getM3uPlaylist = (req, res) => {
  res.setHeader('Content-Type', 'audio/x-mpegurl');
  res.setHeader('Content-Disposition', 'attachment; filename="kwizzradio.m3u"');
  res.send(`#EXTM3U\n#EXTINF:-1,KWIZZ Radio - 24/7 Internet Radio\n${env.DEFAULT_STREAM_URL}\n`);
};

/**
 * GET /api/now-playing/stream
 * Server-Sent Events endpoint for real-time track updates
 */
const streamNowPlaying = (req, res) => {
  // Required SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disables Nginx buffering for SSE
  });

  // Send an initial comment to establish connection and keep-alive ping
  res.write(': connected\n\n');

  // Heartbeat ping every 15 seconds to prevent network timeouts / proxy disconnection
  const keepAliveTimer = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clearInterval(keepAliveTimer);
    }
  }, 15000);

  // Register client in Live365 service
  live365Service.addSSEClient(res);

  req.on('close', () => {
    clearInterval(keepAliveTimer);
  });
};

module.exports = {
  getNowPlaying,
  getRecentTracks,
  getM3uPlaylist,
  streamNowPlaying
};
