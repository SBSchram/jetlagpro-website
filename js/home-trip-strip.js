/**
 * Homepage trip strip — fixed JFK → NRT example (index.html only).
 */
(function () {
  'use strict';

  const ORIGIN = { code: 'JFK', label: 'New York (JFK)', tz: 'America/New_York' };
  const DEST = { code: 'NRT', label: 'Tokyo (NRT)', tz: 'Asia/Tokyo' };

  function $(id) {
    return document.getElementById(id);
  }

  function localParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date);
    return {
      hour: Number(parts.find(p => p.type === 'hour')?.value || 0),
      minute: Number(parts.find(p => p.type === 'minute')?.value || 0),
    };
  }

  function formatInZone(date, timeZone) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  function offsetHoursBetweenZones(date, fromTz, toTz) {
    const from = localParts(date, fromTz);
    const to = localParts(date, toTz);
    let diff = to.hour + to.minute / 60 - (from.hour + from.minute / 60);
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    return diff;
  }

  function update() {
    if (!$('home-body-time') || !$('home-offset')) return;

    const now = new Date();
    const narrow = window.matchMedia('(max-width: 768px)').matches;

    $('home-body-time').textContent = formatInZone(now, ORIGIN.tz);
    $('home-dest-time').textContent = formatInZone(now, DEST.tz);
    $('home-body-city').textContent = narrow ? ORIGIN.code : ORIGIN.label;
    $('home-dest-city').textContent = narrow ? DEST.code : DEST.label;

    const diff = offsetHoursBetweenZones(now, ORIGIN.tz, DEST.tz);
    const abs = Math.abs(diff);
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    const sign = diff >= 0 ? '+' : '−';
    const offsetCore = `${sign}${hours}h${mins ? ` ${mins}m` : ''}`;
    $('home-offset').textContent = `${offsetCore} at destination`;
  }

  function init() {
    if (!$('home-body-time')) return;
    update();
    setInterval(update, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
