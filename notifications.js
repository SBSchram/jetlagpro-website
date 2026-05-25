// JetLagPro PWA Notification Manager
// Handles push notifications, scheduling, and user permissions

class NotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.permission = Notification.permission;
    
    console.log('🔔 NotificationManager initialized', {
      supported: this.isSupported,
      permission: this.permission
    });
  }

  // Check if notifications are supported
  isNotificationSupported() {
    return this.isSupported;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported) {
      throw new Error('Push notifications not supported');
    }

    console.log('🔔 Requesting notification permission...');
    
    const permission = await Notification.requestPermission();
    this.permission = permission;
    
    console.log('🎯 Permission result:', permission);
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.log('❌ Notification permission denied');
      return false;
    }
  }

  // Initialize push subscription
  async initializePushSubscription() {
    if (!this.isSupported || this.permission !== 'granted') {
      throw new Error('Notifications not available');
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      console.log('📱 Service Worker ready for notifications');

      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('✅ Existing push subscription found');
        return this.subscription;
      } else {
        console.log('🔄 Creating new push subscription...');
        return await this.createPushSubscription();
      }
    } catch (error) {
      console.error('❌ Failed to initialize push subscription:', error);
      throw error;
    }
  }

  // Create new push subscription
  async createPushSubscription() {
    try {
      // TODO: Replace with your actual Firebase VAPID key when ready
      // For now, we'll skip push subscription and use local notifications only
      console.log('⚠️ VAPID key not configured - using local notifications only');
      
      // For local notifications, we don't need a push subscription
      // The service worker and notification permission are sufficient
      return null;
    } catch (error) {
      console.error('❌ Failed to create push subscription:', error);
      // Don't throw - we can still use local notifications
      return null;
    }
  }

  // Send subscription to Firebase/server
  async sendSubscriptionToServer(subscription) {
    try {
      console.log('📤 Sending subscription to server...');
      
      // Store subscription in Firebase Firestore
      if (window.firebaseDB && window.firebaseCollection && window.firebaseAddDoc) {
        await window.firebaseAddDoc(
          window.firebaseCollection(window.firebaseDB, 'push_subscriptions'),
          {
            subscription: subscription,
            timestamp: window.firebaseServerTimestamp(),
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        );
        console.log('✅ Subscription saved to Firebase');
      }
    } catch (error) {
      console.error('❌ Failed to save subscription:', error);
      // Don't throw - notifications can still work locally
    }
  }

  // Schedule local notifications for jet lag reminders
  // travelData should include: { destinationCode: 'LAX', destinationTimezone: 'America/Los_Angeles' }
  scheduleJetLagReminders(travelData) {
    if (!this.registration || this.permission !== 'granted') {
      console.warn('⚠️ Cannot schedule notifications - permission not granted');
      return;
    }

    // Validate required travel data
    if (!travelData.destinationTimezone) {
      console.error('❌ Missing destinationTimezone in travel data');
      return;
    }

    console.log('⏰ Scheduling jet lag reminders for destination:', travelData);

    // Calculate notification times based on destination timezone
    const notificationTimes = this.calculateNotificationTimes(travelData);
    
    // Schedule each notification
    notificationTimes.forEach((notif, index) => {
      this.scheduleNotification(notif, index);
    });

    console.log(`✅ Scheduled ${notificationTimes.length} notifications for ${travelData.destinationCode}`);
  }

  // Calculate when notifications should fire (matches iOS app logic)
  calculateNotificationTimes(travelData) {
    const notifications = [];
    
    // Get destination timezone (this should be passed in travelData)
    const destinationTimezone = travelData.destinationTimezone || 'UTC';
    const destinationCode = travelData.destinationCode || 'DEST';
    
    // Get current time in destination timezone
    const now = new Date();
    const destinationTime = new Date(now.toLocaleString("en-US", {timeZone: destinationTimezone}));
    const currentDestinationHour = destinationTime.getHours();
    
    // Calculate next 11 transition times (every 2 hours in destination time)
    const points = ['LU-8', 'LI-1', 'ST-36', 'SP-3', 'HT-8', 'SI-5', 'BL-66', 'KI-10', 'PC-8', 'SJ-6', 'GB-41', 'LIV-1'];
    
    for (let i = 0; i < 11; i++) {
      // Calculate next notification time in destination timezone
      const hoursFromNow = (i + 1) * 2;
      const destinationNotificationTime = new Date(destinationTime.getTime() + (hoursFromNow * 60 * 60 * 1000));
      
      // Convert back to local time for scheduling
      const localNotificationTime = new Date(now.getTime() + (hoursFromNow * 60 * 60 * 1000));
      
      // Format destination time for display
      const destTimeString = destinationNotificationTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
        timeZone: destinationTimezone
      });
      
      const pointIndex = i % 12;
      const pointName = points[pointIndex];
      
      notifications.push({
        time: localNotificationTime, // When to trigger (local time)
        destinationTime: destinationNotificationTime, // What time it is at destination
        pointName: pointName,
        title: `It's ${destTimeString} at ${destinationCode}`, // Matches iOS format
        body: `Time to stimulate the ${pointName} acupressure point.`,
        tag: `jetlag-${pointIndex}`,
        url: `./demo/index.html?point=${pointName}`,
        transitionNumber: i + 1,
        destinationCode: destinationCode,
        destinationTimezone: destinationTimezone
      });
    }
    
    console.log(`📋 Calculated ${notifications.length} notifications for ${destinationCode} (${destinationTimezone})`);
    return notifications;
  }

  // Schedule individual notification
  scheduleNotification(notificationData, index) {
    const delay = notificationData.time.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(() => {
        this.showLocalNotification(notificationData);
      }, delay);
      
      console.log(`⏰ Notification ${index + 1} scheduled for ${notificationData.time.toLocaleString()}`);
    }
  }

  // Show local notification
  async showLocalNotification(data) {
    if (this.registration && this.permission === 'granted') {
      try {
        await this.registration.showNotification(data.title, {
          body: data.body,
          icon: './assets/images/Wheel.png',
          badge: './assets/images/Wheel.png',
          tag: data.tag,
          requireInteraction: true,
          actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
          data: {
            url: data.url,
            pointName: data.pointName,
            timestamp: Date.now()
          }
        });
        
        console.log(`✅ Local notification shown: ${data.title}`);
      } catch (error) {
        console.error('❌ Failed to show notification:', error);
      }
    }
  }

  // Test notification (shows format similar to actual notifications)
  async testNotification() {
    if (this.permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Show test notification in the same format as real notifications
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true
    });

    await this.showLocalNotification({
      title: `It's ${timeString} at TEST`,
      body: 'Notifications are working! You\'ll receive reminders every 2 hours based on your destination timezone.',
      tag: 'test-notification',
      pointName: 'TEST',
      url: './'
    });
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Initialize global notification manager
window.NotificationManager = NotificationManager;

console.log('🔔 Notification Manager loaded and ready');