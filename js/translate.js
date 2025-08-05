// Google Translate Initialization
// Centralized script to avoid duplication across pages

function initializeGoogleTranslate() {
  // Only initialize if the translate element exists and hasn't been initialized
  const translateElement = document.getElementById('google_translate_element');
  if (translateElement && !translateElement.hasChildNodes()) {
    window.googleTranslateElementInit = function() {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'es,fr,de,ja,ko,zh-CN,zh-TW,pt,it,ru,ar',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
    };

    // Load the Google Translate script
    if (!document.querySelector('script[src*="translate.google.com"]')) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.head.appendChild(script);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGoogleTranslate);

// Also initialize after header is loaded (for pages that fetch header.html)
document.addEventListener('headerLoaded', initializeGoogleTranslate);