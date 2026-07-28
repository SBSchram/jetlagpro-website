/**
 * Platform-aware store CTAs.
 * Android browsers: Google Play is primary. Research flyer / call-for-research stay App Store only.
 */
(function () {
  const PLAY_STORE_URL =
    'https://play.google.com/store/apps/details?id=com.jetlagpro.android';
  const APP_STORE_URL = 'https://apps.apple.com/us/app/jetlagpro/id6748569048';

  function isAndroidClient() {
    const ua = navigator.userAgent || '';
    return /Android/i.test(ua) && !/iPad|iPhone|iPod/.test(ua);
  }

  // Mark ASAP so CSS can hide App Store cards before paint finishes
  if (isAndroidClient()) {
    document.documentElement.classList.add('platform-android');
  }

  function playUrl(source) {
    const url = new URL(PLAY_STORE_URL);
    if (source) {
      url.searchParams.set('utm_source', 'jetlagpro_web');
      url.searchParams.set('utm_medium', source);
    }
    return url.toString();
  }

  function enhanceNavCta() {
    if (!isAndroidClient()) {
      return;
    }
    document.querySelectorAll('a.nav-cta').forEach((link) => {
      link.href = playUrl('nav');
      link.setAttribute('rel', 'noopener');
      link.textContent = 'Get on Google Play';
    });
  }

  function enhanceDownloadSection() {
    const grid = document.querySelector('#download .download-grid');
    if (!grid) {
      return;
    }

    const androidCard = grid.querySelector('[data-store="android"]');
    const iosCard = grid.querySelector('[data-store="ios"]');
    if (!androidCard || !iosCard) {
      return;
    }

    if (isAndroidClient()) {
      document.documentElement.classList.add('platform-android');
      document.body.classList.add('platform-android');
      androidCard.classList.add('download-card--primary');
      iosCard.classList.remove('download-card--primary');
      iosCard.hidden = true;
      iosCard.setAttribute('aria-hidden', 'true');
      if (androidCard !== grid.firstElementChild) {
        grid.insertBefore(androidCard, grid.firstElementChild);
      }
      const playLink = androidCard.querySelector('a.store-badge-link');
      if (playLink) {
        playLink.href = playUrl('download');
      }
    } else {
      iosCard.hidden = false;
      iosCard.removeAttribute('aria-hidden');
      iosCard.classList.add('download-card--primary');
      androidCard.classList.remove('download-card--primary');
    }
  }

  function enhanceGenericDownloadLinks() {
    if (!isAndroidClient()) {
      return;
    }

    document.querySelectorAll('a[data-store-cta="app"]').forEach((link) => {
      link.href = playUrl(link.getAttribute('data-store-source') || 'cta');
      link.setAttribute('rel', 'noopener');
      if (link.dataset.androidLabel) {
        link.textContent = link.dataset.androidLabel;
      }
    });
  }

  function showAndroidStickyPlayCta() {
    if (!isAndroidClient()) {
      return;
    }
    // Homepage only: sticky Play CTA replaces the old PWA install chip
    if (!document.getElementById('download')) {
      return;
    }
    if (document.getElementById('play-store-sticky-cta')) {
      return;
    }

    const playCta = document.createElement('a');
    playCta.id = 'play-store-sticky-cta';
    playCta.href = playUrl('sticky');
    playCta.rel = 'noopener';
    playCta.textContent = 'Get it on Google Play';
    playCta.className = 'play-store-sticky-cta';
    document.body.appendChild(playCta);
  }

  function applyStoreCtas() {
    enhanceNavCta();
    enhanceDownloadSection();
    enhanceGenericDownloadLinks();
    showAndroidStickyPlayCta();
  }

  window.JetLagProStoreCta = {
    PLAY_STORE_URL,
    APP_STORE_URL,
    isAndroidClient,
    playUrl,
    applyStoreCtas,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyStoreCtas);
  } else {
    applyStoreCtas();
  }

  document.addEventListener('headerLoaded', enhanceNavCta);
})();
