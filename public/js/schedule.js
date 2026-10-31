// KWIZZ Radio Schedule Controller
// Supports day filtering and visitor local timezone translation

(function () {
  function initSchedule() {
    const tabs = document.querySelectorAll('.day-tab');
    const cards = document.querySelectorAll('.schedule-slot-card');
    const tzSelect = document.getElementById('schedule-tz-select');

    if (!tabs.length || !cards.length) return;

    // Day Tab Switcher
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const selectedDay = tab.getAttribute('data-day');

        tabs.forEach(t => {
          t.classList.remove('day-tab-active', 'bg-yellow-400', 'text-black', 'scale-105', 'shadow-lg');
          t.classList.add('day-tab-inactive');
        });
        tab.classList.remove('day-tab-inactive', 'bg-zinc-900', 'text-zinc-400');
        tab.classList.add('day-tab-active');

        cards.forEach(card => {
          if (card.getAttribute('data-day') === selectedDay) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Timezone Converter
    function updateScheduleTimes() {
      const mode = tzSelect ? tzSelect.value : 'local';
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';

      cards.forEach(card => {
        const startStr = card.getAttribute('data-start'); // "HH:mm"
        const endStr = card.getAttribute('data-end');     // "HH:mm"
        const timeDisplay = card.querySelector('.slot-time-display');
        const tzLabel = card.querySelector('.slot-tz-label');

        if (!timeDisplay || !startStr || !endStr) return;

        if (mode === 'America/Toronto' || userTz === 'America/Toronto') {
          timeDisplay.textContent = `${startStr} - ${endStr}`;
          if (tzLabel) tzLabel.textContent = 'Ottawa Time (ET)';
        } else {
          // Convert Ottawa time to user's local timezone
          try {
            const [sH, sM] = startStr.split(':').map(Number);
            const [eH, eM] = endStr.split(':').map(Number);

            const now = new Date();
            // Build an Ottawa reference date
            const ottawaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' }); // "YYYY-MM-DD"
            
            const startDate = new Date(`${ottawaDateStr}T${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}:00-04:00`);
            const endDate = new Date(`${ottawaDateStr}T${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}:00-04:00`);

            const localStart = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const localEnd = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            timeDisplay.textContent = `${localStart} - ${localEnd}`;
            if (tzLabel) tzLabel.textContent = `Local Time (${userTz.split('/')[1] || userTz})`;
          } catch (e) {
            timeDisplay.textContent = `${startStr} - ${endStr}`;
            if (tzLabel) tzLabel.textContent = 'Ottawa Time (ET)';
          }
        }
      });
    }

    if (tzSelect) {
      tzSelect.addEventListener('change', updateScheduleTimes);
    }

    updateScheduleTimes();
  }

  document.addEventListener('DOMContentLoaded', initSchedule);
  document.addEventListener('kwizz:navigated', initSchedule);
})();

