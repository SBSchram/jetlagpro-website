// JetLagPro Service Worker
// Enables offline functionality, PWA features, and push notifications

const CACHE_NAME = 'jetlagpro-v1';
const OFFLINE_URL = './offline.html';

// Assets to cache for offline functionality
const CACHE_URLS = [
  './',
  './index.html',
  './survey.html',
  './science.html',
  './travel-tips.html',
  './research-paper.html',
  './privacy.html',
  './styles.css',
  './survey.css',
  './survey.js',
  './js/translate.js',
  './manifest.json',
  './assets/images/app-icon.png',
  './assets/point-images/BL-66.jpg',
  './assets/point-images/GB-41.jpg',
  './assets/point-images/HT-8.jpg',
  './assets/point-images/KI-10.jpg',
  './assets/point-images/LI-1.jpg',
  './assets/point-images/LIV-1.jpg',
  './assets/point-images/LU-8.jpg',
  './assets/point-images/PC-8.jpg',
  './assets/point-images/SI-5.jpg',
  './assets/point-images/SJ-6.jpg',
  './assets/point-images/SP-3.jpg',
  './assets/point-images/ST-36.jpg',
  './assets/videos/BL-66.mp4',
  './assets/videos/GB-41.mp4',
  './assets/videos/HT-8.mp4',
  './assets/videos/KI-10.mp4',
  './assets/videos/LI-1.mp4',
  './assets/videos/LIV-1.mp4',
  './assets/videos/LU-8.mp4',
  './assets/videos/PC-8.mp4',
  './assets/videos/SI-5.mp4',
  './assets/videos/SJ-6.mp4',
  './assets/videos/SP-3.mp4',
  './assets/videos/ST-36.mp4',
  OFFLINE_URL
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell and content...');
        // Cache files individually to avoid 206 partial response issues
        return Promise.allSettled(
          CACHE_URLS.map(url => {
            return cache.add(url).catch(error => {
              console.warn('⚠️ Failed to cache:', url, error);
              return null; // Continue with other files
            });
          })
        );
      })
      .then((results) => {
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;
        console.log(`✅ Service Worker: Cached ${successful} files, ${failed} failed`);
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          console.log('📱 Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache successful responses
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails and no cache, show offline page
            console.log('📵 Network failed, showing offline page');
            return caches.match(OFFLINE_URL);
          });
      })
  );
});

// Background sync for survey submissions when back online
self.addEventListener('sync', event => {
  if (event.tag === 'survey-sync') {
    console.log('🔄 Background sync: Attempting to sync survey data...');
    event.waitUntil(syncSurveyData());
  }
});

// Sync survey data when connection restored
async function syncSurveyData() {
  try {
    // This would handle any pending survey submissions
    // Implementation depends on how survey data is stored locally
    console.log('✅ Survey data sync completed');
  } catch (error) {
    console.error('❌ Survey data sync failed:', error);
    throw error; // Retry on next sync opportunity
  }
}

// Push notification handling (for future implementation)
self.addEventListener('push', event => {
  if (!event.data) return;

  const options = {
    body: event.data.text(),
    icon: '/assets/images/app-icon.png',
    badge: '/assets/images/app-icon.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open JetLagPro',
        icon: '/assets/images/app-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/assets/images/app-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('JetLagPro', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Push notification event handlers
self.addEventListener('push', event => {
  console.log('📬 Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('📋 Push data:', data);
    
    const options = {
      body: data.body || 'Time for your next acupressure point!',
      icon: './assets/images/app-icon.png',
      badge: './assets/images/app-icon.png',
      tag: 'jetlagpro-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: './assets/images/app-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      data: {
        url: data.url || './',
        pointName: data.pointName || '',
        timestamp: Date.now()
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'JetLagPro Reminder', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('jetlagpro.com') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || './');
        }
      })
    );
  }
  
  // Log interaction for analytics
  console.log('🎯 Notification interaction:', {
    action: event.action,
    pointName: event.notification.data.pointName,
    timestamp: event.notification.data.timestamp
  });
});

console.log('🔥 JetLagPro Service Worker loaded');