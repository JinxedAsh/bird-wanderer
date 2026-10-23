import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Registered only after an explicit user action. The URL contains public config, never a server key.
const config = JSON.parse(new URL(self.location.href).searchParams.get('config') || '{}');
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('/?notifications=1', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const current = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (current) {
        await current.navigate(target);
        return current.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
const messaging = getMessaging(initializeApp(config));
onBackgroundMessage(messaging, () =>
  self.registration.showNotification('Bird Wanderer', {
    body: 'New subscribed activity. Open the app to check current access.',
    icon: '/bird-wanderer-logo.svg',
    tag: 'bird-wanderer-activity',
  }),
);
