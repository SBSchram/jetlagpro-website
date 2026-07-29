/**
 * Homepage trip strip — fixed New York → Tokyo example (index.html only).
 * Offset is a fixed “about 11 hours” (DST ignored by design).
 */
(function () {
  'use strict';

  const ORIGIN = { code: 'JFK', label: 'New York (JFK)', tz: 'America/New_York' };
  const DEST = { code: 'NRT', label: 'Tokyo (NRT)', tz: 'Asia/Tokyo' };

  function $(id) {
    return document.getElementById(id);
  }

  function formatInZone(date, timeZone) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  function update() {
    if (!$('home-body-time')) return;

    const now = new Date();
    const narrow = window.matchMedia('(max-width: 768px)').matches;

    $('home-body-time').textContent = formatInZone(now, ORIGIN.tz);
    $('home-dest-time').textContent = formatInZone(now, DEST.tz);
    $('home-body-city').textContent = narrow ? ORIGIN.code : ORIGIN.label;
    $('home-dest-city').textContent = narrow ? DEST.code : DEST.label;

    if ($('home-offset')) {
      $('home-offset').textContent = 'about 11 hours';
    }
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
