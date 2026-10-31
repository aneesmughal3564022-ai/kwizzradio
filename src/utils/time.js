// Time utilities for KWIZZ Radio (Ottawa ET base)

const STATION_TIMEZONE = 'America/Toronto';

/**
 * Get current day of week and current time in Ottawa Eastern Time
 */
function getOttawaCurrentTime() {
  const now = new Date();
  const ottawaDateStr = now.toLocaleString('en-US', { timeZone: STATION_TIMEZONE });
  const ottawaDate = new Date(ottawaDateStr);
  
  const dayOfWeek = ottawaDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hours = String(ottawaDate.getHours()).padStart(2, '0');
  const minutes = String(ottawaDate.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  return {
    dayOfWeek,
    currentTime,
    ottawaDate
  };
}

/**
 * Compare two 24h format times "HH:mm"
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Find On Now and Up Next slots from a list of weekly schedule slots
 */
function findOnNowAndUpNext(slots) {
  if (!slots || slots.length === 0) {
    return { onNow: null, upNext: null };
  }

  const { dayOfWeek, currentTime } = getOttawaCurrentTime();
  const currentMins = timeToMinutes(currentTime);

  // Filter slots for today
  const todaySlots = slots
    .filter(s => s.dayOfWeek === dayOfWeek)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  let onNow = null;
  let upNext = null;

  for (let i = 0; i < todaySlots.length; i++) {
    const slot = todaySlots[i];
    const startMins = timeToMinutes(slot.startTime);
    const endMins = timeToMinutes(slot.endTime);

    if (currentMins >= startMins && currentMins < endMins) {
      onNow = slot;
      upNext = todaySlots[i + 1] || null;
      break;
    } else if (currentMins < startMins && !upNext) {
      upNext = slot;
    }
  }

  // If no upcoming slot today, pick first slot tomorrow
  if (!upNext) {
    const tomorrowDay = (dayOfWeek + 1) % 7;
    const tomorrowSlots = slots
      .filter(s => s.dayOfWeek === tomorrowDay)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    upNext = tomorrowSlots[0] || null;
  }

  return { onNow, upNext };
}

module.exports = {
  STATION_TIMEZONE,
  getOttawaCurrentTime,
  timeToMinutes,
  findOnNowAndUpNext
};

