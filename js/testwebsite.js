/**
 * JetLagPro prototype (testwebsite.html) — interactive trip strip, timeline, micro-try, live stats.
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

  /** Meridian sequence starting 3 AM Lung (classical organ clock). */
  const MERIDIANS = [
    { name: 'Lung', window: '3–5 AM', hint: 'Deep rest and breath; early shift toward destination rhythm.' },
    { name: 'Large Intestine', window: '5–7 AM', hint: 'Transition window; good time to start point work on a travel day.' },
    { name: 'Stomach', window: '7–9 AM', hint: 'Digestion peak; align meals with destination morning when you can.' },
    { name: 'Spleen', window: '9–11 AM', hint: 'Focus and grounding; common active window after landing.' },
    { name: 'Heart', window: '11 AM–1 PM', hint: 'Midday alertness; a frequent first point after eastbound flights.' },
    { name: 'Small Intestine', window: '1–3 PM', hint: 'Sorting and absorption; afternoon adjustment phase.' },
    { name: 'Bladder', window: '3–5 PM', hint: 'Energy dip window; light and movement help alongside points.' },
    { name: 'Kidney', window: '5–7 PM', hint: 'Foundation meridian; evening wind-down at destination.' },
    { name: 'Pericardium', window: '7–9 PM', hint: 'Calm and circulation; useful before destination bedtime.' },
    { name: 'San Jiao', window: '9–11 PM', hint: 'Metabolism and hormones; late evening on destination time.' },
    { name: 'Gallbladder', window: '11 PM–1 AM', hint: 'Planning and decision meridian; red-eye travel window.' },
    { name: 'Liver', window: '1–3 AM', hint: 'Rest and repair; body clock conflict often feels strongest here.' },
  ];

  const SECTION_BY_PERSONA = {
    traveler: 'proto-trip',
    curious: 'proto-learn',
    clinician: 'proto-learn',
    reviewer: 'proto-research',
  };

  function formatInZone(date, timeZone) {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  let timerInterval = null;
  let timerRemaining = 30;

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
    const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
    const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
    return { hour, minute };
  }

  function meridianIndexForHour(hour24) {
    // 3–5 Lung → index 0; each meridian spans 2 hours
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

  function populateAirportSelects() {
    const origin = $('proto-origin');
    const dest = $('proto-destination');
    if (!origin || !dest) return;

    AIRPORTS.forEach(a => {
      const opt1 = document.createElement('option');
      opt1.value = a.code;
      opt1.textContent = a.label;
      origin.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = a.code;
      opt2.textContent = a.label;
      dest.appendChild(opt2);
    });

    origin.value = 'JFK';
    dest.value = 'LHR';
  }

  function updateClockPanel() {
    const now = new Date();
    const origin = findAirport($('proto-origin')?.value || 'JFK');
    const dest = findAirport($('proto-destination')?.value || 'LHR');

    $('proto-body-time').textContent = formatInZone(now, origin.tz);
    $('proto-body-city').textContent = origin.label;

    $('proto-dest-time').textContent = formatInZone(now, dest.tz);
    $('proto-dest-city').textContent = dest.label;

    const diff = offsetHoursBetweenZones(now, origin.tz, dest.tz);
    const abs = Math.abs(diff);
    const hours = Math.floor(abs);
    const mins = Math.round((abs - hours) * 60);
    const sign = diff >= 0 ? '+' : '−';
    $('proto-offset').textContent =
      `${sign}${hours}h${mins ? ` ${mins}m` : ''} at destination`;

    const active = activeMeridian(now, dest.tz);
    $('proto-insight').textContent =
      `At your destination it is the ${active.name} window (${active.window}). JetLagPro schedules the active horary point every two hours on destination time.`;

    updateTimeline(origin, dest, now);
    updateMicroTry(dest, now);
    updateOrganDial(now, dest.tz);
  }

  function updateTimeline(origin, dest, startDate) {
    const container = $('proto-timeline');
    const detail = $('proto-timeline-detail');
    if (!container) return;

    container.innerHTML = '';
    let cursor = new Date(startDate);
    const destTz = dest.tz;

    for (let i = 0; i < 8; i += 1) {
      const mer = activeMeridian(cursor, destTz);
      const timeLabel = formatInZone(cursor, destTz);
      const step = document.createElement('button');
      step.type = 'button';
      step.className = 'proto-timeline-step' + (i === 0 ? ' is-active' : '');
      step.innerHTML =
        `<div class="step-time">${timeLabel} · dest.</div>` +
        `<div class="step-meridian">${mer.name}</div>` +
        `<div class="step-hint">${mer.hint.split('.')[0]}.</div>`;
      step.addEventListener('click', () => {
        container.querySelectorAll('.proto-timeline-step').forEach(el => {
          el.classList.remove('is-active');
        });
        step.classList.add('is-active');
        if (detail) {
          detail.textContent =
            `${timeLabel} (destination): ${mer.name} meridian — ${mer.hint}`;
        }
      });
      container.appendChild(step);
      cursor = new Date(cursor.getTime() + 2 * 60 * 60 * 1000);
    }

    if (detail && container.firstChild) {
      const first = activeMeridian(startDate, destTz);
      detail.textContent =
        `First reminder window: ${first.name} meridian — ${first.hint}`;
    }
  }

  function updateMicroTry(dest, now) {
    const mer = activeMeridian(now, dest.tz);
    $('proto-try-point').textContent = `Sample: ${mer.name} meridian point`;
    $('proto-try-meridian').textContent =
      `Active now at ${dest.label} (${mer.window})`;
  }

  function updateOrganDial(now, timeZone) {
    const dial = $('proto-organ-dial');
    if (!dial) return;
    dial.innerHTML = '';
    const activeIdx = meridianIndexForHour(localParts(now, timeZone).hour);

    MERIDIANS.forEach((mer, idx) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'proto-organ-slot' + (idx === activeIdx ? ' is-active' : '');
      slot.innerHTML = `<strong>${mer.window}</strong>${mer.name}`;
      slot.addEventListener('click', () => {
        dial.querySelectorAll('.proto-organ-slot').forEach(el => {
          el.classList.remove('is-active');
        });
        slot.classList.add('is-active');
        $('proto-organ-detail').textContent = mer.hint;
      });
      dial.appendChild(slot);
    });

    $('proto-organ-detail').textContent = MERIDIANS[activeIdx].hint;
  }

  function resetTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerRemaining = 30;
    const ring = $('proto-timer');
    ring.textContent = '30';
    ring.classList.remove('is-running');
    $('proto-timer-start').textContent = 'Start 30-second practice';
    $('proto-timer-start').disabled = false;
  }

  function startTimer() {
    if (timerInterval) return;
    const ring = $('proto-timer');
    ring.classList.add('is-running');
    $('proto-timer-start').textContent = 'Running…';
    $('proto-timer-start').disabled = true;

    timerInterval = setInterval(() => {
      timerRemaining -= 1;
      ring.textContent = String(timerRemaining);
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        ring.classList.remove('is-running');
        ring.textContent = '✓';
        $('proto-timer-start').textContent = 'Try again';
        $('proto-timer-start').disabled = false;
        $('proto-try-done').classList.remove('proto-hidden');
      }
    }, 1000);
  }

  async function loadResearchStats() {
    const tripsEl = $('proto-stat-trips');
    const surveysEl = $('proto-stat-surveys');
    const consentEl = $('proto-stat-consent');
    if (!tripsEl) return;

    try {
      const url =
        'https://firestore.googleapis.com/v1/projects/jetlagpro-research/databases/(default)/documents/tripCompletions?pageSize=300';
      const response = await fetch(url);
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      const docs = data.documents || [];
      let surveys = 0;
      let consent = 0;

      docs.forEach(doc => {
        const fields = doc.fields || {};
        const surveyDone =
          fields.surveyCompleted?.booleanValue === true ||
          fields.surveyData?.mapValue?.fields?.surveyCompleted?.booleanValue === true;
        if (surveyDone) surveys += 1;
        const shared =
          fields.researchConsent?.booleanValue === true ||
          fields.tripData?.mapValue?.fields?.researchConsent?.booleanValue === true;
        if (shared) consent += 1;
      });

      tripsEl.textContent = String(docs.length);
      surveysEl.textContent = String(surveys);
      consentEl.textContent = String(consent);
    } catch (err) {
      console.warn('[proto] Research stats unavailable:', err);
      tripsEl.textContent = '—';
      surveysEl.textContent = '—';
      consentEl.textContent = '—';
    }
  }

  function initPersonas() {
    document.querySelectorAll('.proto-persona-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.proto-persona-card').forEach(c => {
          c.classList.remove('is-active');
        });
        card.classList.add('is-active');
        const key = card.dataset.persona;
        const sectionId = SECTION_BY_PERSONA[key] || 'proto-trip';
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function initNavScroll() {
    document.querySelectorAll('[data-proto-scroll]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const id = link.getAttribute('data-proto-scroll');
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function init() {
    populateAirportSelects();
    updateClockPanel();

    $('proto-origin')?.addEventListener('change', updateClockPanel);
    $('proto-destination')?.addEventListener('change', updateClockPanel);
    $('proto-timer-start')?.addEventListener('click', () => {
      if (timerRemaining <= 0 || $('proto-timer').textContent === '✓') {
        $('proto-try-done').classList.add('proto-hidden');
        resetTimer();
      } else {
        startTimer();
      }
    });

    initPersonas();
    initNavScroll();
    loadResearchStats();

    setInterval(updateClockPanel, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
