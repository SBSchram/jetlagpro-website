// Firebase Analytics for JetLagPro Website
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID',
  measurementId: 'YOUR_MEASUREMENT_ID'
};
// Initialize Firebase Analytics
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Log page view automatically
// Make analytics available globally for custom events
window.JetLagProAnalytics = {
  logEvent: (eventName, parameters) => logEvent(analytics, eventName, parameters)
};
console.log('? Firebase Analytics initialized successfully');
