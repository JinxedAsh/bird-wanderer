import { alerts } from './alerts';

let stopForeground: (() => void) | undefined;
export async function enablePush(signal: AbortSignal, permissionRequest: Promise<NotificationPermission>) {
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('Notification' in window))
    throw new Error(
      'Push requires HTTPS (or localhost) and a browser with notification support. In-app alerts still work.',
    );
  const config = await alerts.pushConfig(signal);
  if (!config.configured || !config.webConfig || !config.vapidKey)
    throw new Error('Firebase push is not configured.');
  const [appSdk, messagingSdk] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!(await messagingSdk.isSupported()))
    throw new Error('This browser does not support Firebase push. In-app alerts still work.');
  if (signal.aborted) return;
  const permission = await permissionRequest;
  if (permission !== 'granted')
    throw new Error('Notification permission was not granted. In-app alerts still work.');
  if (signal.aborted) return;
  const registration = await navigator.serviceWorker.register(
    `/push-worker.js?config=${encodeURIComponent(JSON.stringify(config.webConfig))}`,
    { scope: '/' },
  );
  await navigator.serviceWorker.ready;
  if (signal.aborted) return;
  const app =
    appSdk.getApps().find((app) => app.name === 'bird-wanderer-web') ||
    appSdk.initializeApp(config.webConfig, 'bird-wanderer-web');
  const messaging = messagingSdk.getMessaging(app);
  const token = await messagingSdk.getToken(messaging, {
    vapidKey: config.vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (signal.aborted) return;
  if (!token) throw new Error('This browser did not return a push registration. Please retry.');
  await alerts.registerDevice(token, signal);
  stopForeground?.();
  stopForeground = messagingSdk.onMessage(messaging, () => window.dispatchEvent(new Event('bird-push')));
}
export async function disablePush(signal: AbortSignal) {
  // Server removal takes effect even if the browser cannot contact Firebase to delete its token.
  await alerts.removeDevice(signal);
  stopForeground?.();
  stopForeground = undefined;
  const [appSdk, messagingSdk] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const app = appSdk.getApps().find((app) => app.name === 'bird-wanderer-web');
  if (app) await messagingSdk.deleteToken(messagingSdk.getMessaging(app)).catch(() => false);
}
