const CACHE_NAME = 'jointright-v1.0.0';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/dashboard',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for API calls, WebRTC, and Socket.IO
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.origin.includes('localhost:5000') // Backend server
  ) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream
        const fetchRequest = request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it's a stream
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });

          return response;
        }).catch((error) => {
          console.error('Fetch failed:', error);
          
          // Return offline page or cached version if available
          return caches.match('/offline.html') || caches.match('/');
        });
      })
  );
});

// Background Sync for offline meeting creation
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-meetings') {
    event.waitUntil(syncMeetings());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);
  
  const options = {
    body: event.data ? event.data.text() : 'You have a new notification from JointRight',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Meeting',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close notification',
        icon: '/logo192.png'
      },
    ]
  };

  event.waitUntil(
    self.registration.showNotification('JointRight', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'close') {
    // Do nothing, notification is already closed
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message event for communication with the main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Utility function to sync meetings when back online
async function syncMeetings() {
  try {
    // Get stored offline data
    const cache = await caches.open(CACHE_NAME);
    const offlineData = await cache.match('/offline-data');
    
    if (offlineData) {
      const data = await offlineData.json();
      
      // Attempt to sync meetings
      for (const meeting of data.meetings || []) {
        try {
          await fetch('/api/meetings/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(meeting)
          });
        } catch (error) {
          console.error('Failed to sync meeting:', error);
        }
      }
      
      // Clear offline data after sync
      await cache.delete('/offline-data');
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Periodic background sync for meeting reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'meeting-reminders') {
    event.waitUntil(checkMeetingReminders());
  }
});

async function checkMeetingReminders() {
  try {
    const response = await fetch('/api/meetings/upcoming');
    const meetings = await response.json();
    
    const now = new Date();
    const reminderTime = 5 * 60 * 1000; // 5 minutes before meeting
    
    for (const meeting of meetings) {
      const meetingTime = new Date(meeting.scheduledAt);
      const timeDiff = meetingTime.getTime() - now.getTime();
      
      if (timeDiff > 0 && timeDiff <= reminderTime) {
        // Show reminder notification
        await self.registration.showNotification('Meeting Reminder', {
          body: `Your meeting "${meeting.title}" starts in 5 minutes`,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: `meeting-${meeting._id}`,
          data: {
            meetingId: meeting._id,
            meetingLink: meeting.link
          },
          actions: [
            {
              action: 'join',
              title: 'Join Now',
              icon: '/logo192.png'
            }
          ]
        });
      }
    }
  } catch (error) {
    console.error('Failed to check meeting reminders:', error);
  }
}