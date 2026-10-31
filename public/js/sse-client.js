// KWIZZ Radio SSE Client for Real-Time Now Playing
// Handles Server-Sent Events & Visibility Battery Saving

(function () {
  let eventSource = null;
  let isTabVisible = !document.hidden;

  function connectSSE() {
    if (eventSource) return;

    try {
      eventSource = new EventSource('/api/now-playing/stream');

      eventSource.addEventListener('now_playing', (e) => {
        // If tab is hidden and stream is paused, skip updating DOM to save battery
        if (document.hidden && (!window.player || window.player.state !== 'LIVE')) {
          return;
        }

        try {
          const track = JSON.parse(e.data);
          if (window.player) {
            window.player.updateMetadata(track);
          }
          updateRecentList(track);
        } catch (err) {
          console.warn('Error parsing Now Playing SSE payload:', err);
        }
      });

      eventSource.onerror = () => {
        // Close and let browser retry automatically with backoff
        if (eventSource) {
          eventSource.close();
          eventSource = null;
          // Reconnect after 5 seconds if visible
          if (!document.hidden) {
            setTimeout(connectSSE, 5000);
          }
        }
      };
    } catch (e) {
      console.warn('SSE not supported or connection error:', e);
      // Fallback: poll every 15s
      setInterval(pollNowPlaying, 15000);
    }
  }

  function disconnectSSE() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function pollNowPlaying() {
    if (document.hidden && (!window.player || window.player.state !== 'LIVE')) return;

    fetch('/api/now-playing')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data && window.player) {
          window.player.updateMetadata(res.data);
        }
      })
      .catch(() => {});
  }

  function updateRecentList(track) {
    const list = document.getElementById('recent-tracks-list');
    if (!list || !track) return;

    // Check if track is already top of list
    const topItem = list.querySelector('.recent-track-item');
    if (topItem && topItem.getAttribute('data-title') === track.title) return;

    const item = document.createElement('li');
    item.className = 'recent-track-item flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 transition-all';
    item.setAttribute('data-title', track.title);
    item.innerHTML = `
      <img src="${track.artwork || '/images/fallback-album.svg'}" alt="${track.title}" class="w-10 h-10 rounded-lg object-cover bg-zinc-800">
      <div class="min-w-0 flex-1">
        <h4 class="text-xs font-bold text-white truncate">${track.title}</h4>
        <p class="text-[11px] text-zinc-400 truncate">${track.artist}</p>
      </div>
      <span class="text-[10px] text-amber-400 font-semibold shrink-0">Just Now</span>
    `;

    list.insertBefore(item, list.firstChild);
    while (list.children.length > 10) {
      list.removeChild(list.lastChild);
    }
  }

  // Handle Tab Visibility (PRD 5.2 & 7.5: Pause when tab is hidden and stream is not playing)
  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;

    if (document.hidden) {
      // If audio is NOT actively playing, disconnect SSE to save power and network
      if (!window.player || window.player.state !== 'LIVE') {
        disconnectSSE();
      }
    } else {
      // Tab became visible again: reconnect and immediately sync current track
      connectSSE();
      pollNowPlaying();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    connectSSE();
    pollNowPlaying();
  });
})();

