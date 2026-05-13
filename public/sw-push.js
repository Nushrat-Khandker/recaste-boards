// Push notification handler for service worker
self.addEventListener('push', (event) => {
  let data = { title: 'New Notification', body: 'You have a new notification', url: '/' };
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  // WhatsApp-style: group notifications per chat context using `tag`,
  // replace previous unread for that chat with `renotify`, and vibrate.
  const url = data.url || data.link || '/';
  const tag = data.tag || `chat:${url}`;

  const options = {
    body: data.body || data.message || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag,
    renotify: true,
    timestamp: Date.now(),
    data: { url },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
