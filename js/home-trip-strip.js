/**
 * Homepage trip strip — body clock vs destination (index.html only).
 */
(function () {
  'use strict';

  const AIRPORTS = [
    { code: 'JFK', label: 'New York (JFK)', tz: 'America/New_York' },
    { code: 'LAX', label: 'Los Angeles (LAX)', tz: 'America/Los_Angeles' },
    { code: 'ORD', label: 'Chicago (ORD)', tz: 'America/Chicago' },
    { code: 'LHR', label: 'London (LHR)', tz: 'Europe/London' },
    { code: 'CDG', label: 'Paris (CDG)', tz: 'Europe/Paris' },
    { code: 'FRA', label: 'Frankfurt (FRA)', tz: 'Europe/Berlin' },
    { code: 'DXB', label: 'Dubai (DXB)', tz: 'Asia/Dubai' },
    { code: 'NRT', label: 'Tokyo (NRT)', tz: 'Asia/Tokyo' },
    { code: 'SIN', label: 'Singapore (SIN)', tz: 'Asia/Singapore' },
    { code: 'SYD', label: 'Sydney (SYD)', tz: 'Australia/Sydney' },
  ];

  const MERIDIANS = [
    { name: 'Lung', window: '3–5 AM' },
    { name: 'Large Intestine', window: '5–7 AM' },
    { name: 'Stomach', window: '7–9 AM' },
    { name: 'Spleen', window: '9–11 AM' },
    { name: 'Heart', window: '11 AM–1 PM' },
    { name: 'Small Intestine', window: '1–3 PM' },
    { name: 'Bladder', window: '3–5 PM' },
    { name: 'Kidney', window: '5–7 PM' },
    { name: 'Pericardium', window: '7–9 PM' },
    { name: 'San Jiao', window: '9–11 PM' },
    { name: 'Gallbladder', window: '11 PM–1 AM' },
    { name: 'Liver', window: '1–3 AM' },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function findAirport(code) {
    return AIRPORTS.find(a => a.code === code) || AIRPORTS[0];
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

  function meridianIndexForHour(hour24) {
    const adjusted = (hour24 + 24 - 3) % 24;
    return Math.floor(adjusted / 2) % 12;
  }

  function activeMeridian(date, timeZone) {
    const { hour } = localParts(date, timeZone);
    return MERIDIANS[meridianIndexForHour(hour)];
  }

  function offsetHoursBetweenZones(date, fromTz, toTz) {
    const from = localParts(date, fromTz);
    const to = localParts(date, toTz);
    let diff = to.hour + to.minute / 60 - (from.hour + from.minute / 60);
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    return diff;
  }

  function populateSelects() {
    const origin = $('home-origin');
    const dest = $('home-destination');
    if (!origin || !dest) return;

    AIRPORTS.forEach(a => {
      const o1 = document.createElement('option');
      o1.value = a.code;
      o1.textContent = a.label;
      origin.appendChild(o1);

      const o2 = document.createElement('option');
      o2.value = a.code;
      o2.textContent = a.label;
      dest.appendChild(o2);
    });

    origin.value = 'JFK';
    dest.value = 'LHR';
  }

  function update() {
    const now = new Date();
    const origin = findAirport($('home-origin')?.value || 'JFK');
    const dest = findAirport($('home-destination')?.value || 'LHR');

    $('home-body-time').textContent = formatInZone(now, origin.tz);
    $('home-body-city').textContent = origin.label;
    $('home-dest-time').textContent = formatInZone(now, dest.tz);
    $('home-dest-city').textContent = dest.label;

    const diff = offsetHoursBetweenZones(now, origin.tz, dest.tz);
    const abs = Math.abs(diff);
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    const sign = diff >= 0 ? '+' : '−';
    $('home-offset').textContent =
      `${sign}${hours}h${mins ? ` ${mins}m` : ''} at destination`;

    const clockPhrase = diff >= 0
      ? `${abs} hour${abs === 1 ? '' : 's'} behind destination time`
      : `${abs} hour${abs === 1 ? '' : 's'} ahead of destination time`;
    $('home-trip-insight').textContent =
      `Your body clock is ${clockPhrase}. ` +
      'The full schedule runs 24 hours on destination time. On a short flight you may only complete a few steps before landing.';
  }

  function init() {
    if (!$('home-origin')) return;
    populateSelects();
    update();
    $('home-origin').addEventListener('change', update);
    $('home-destination').addEventListener('change', update);
    setInterval(update, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
