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

    fetch('/api/now-playing?_cb=' + Date.now())
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
    item.className = 'recent-track-item flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all hover:scale-[1.005]';
    item.style.backgroundColor = 'var(--bg-card)';
    item.style.borderColor = 'var(--border-color)';
    item.setAttribute('data-title', track.title);
    item.innerHTML = `
      <div class="flex items-center gap-3.5 min-w-0 flex-1">
        <div class="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border shadow-sm" style="background-color: var(--button-secondary-bg); border-color: var(--border-color);">
          <img src="${track.artwork || '/images/fallback-album.svg'}" alt="${track.title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='/images/fallback-album.svg';" referrerpolicy="no-referrer">
        </div>
        <div class="min-w-0 flex-1">
          <h4 class="text-xs sm:text-sm font-black truncate" style="color: var(--text-primary);">${track.title}</h4>
          <p class="text-[11px] sm:text-xs truncate font-medium" style="color: var(--text-secondary);">${track.artist}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${track.appleMusicUrl ? `
          <a href="${track.appleMusicUrl}" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors hover:border-amber-400" style="background-color: var(--button-secondary-bg); border-color: var(--border-color); color: var(--text-primary);">
            <span>Apple Music</span>
          </a>
        ` : ''}
        <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-amber-500" style="background-color: var(--button-secondary-bg);">
          Just Now
        </span>
      </div>
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
