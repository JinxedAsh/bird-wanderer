import { alerts } from './alerts';
import { isNativeAndroid, nativePushRequest, type NativePushResult } from './native-push';

let stopForeground: (() => void) | undefined;
export async function enablePush(signal: AbortSignal, permissionRequest: Promise<NotificationPermission>, nativeToken?: Promise<NativePushResult>, userId?: string) {
  if(isNativeAndroid()) {
    if(!nativeToken||!userId)throw new Error('Tap Enable push in the Android app.');
    const result=await nativeToken;
    if(result.error)throw new Error(result.error);
    if(!result.token||!result.ticket||!result.binding)throw new Error('Android returned an incomplete push registration.');
    let attempted=false;
    try {
      const config=await alerts.pushConfig(signal);
      if(!config.configured||result.projectId!==config.webConfig?.projectId)
        throw new Error('Android and server Firebase configurations must match. In-app alerts still work.');
      if(signal.aborted)throw new DOMException('Aborted','AbortError');
      attempted=true;
      await alerts.registerDevice(result.token,signal,result.binding,userId);
      const confirmed=await nativePushRequest('confirm',userId,signal,result.ticket);
      if(confirmed.active!==true)throw new Error('Android did not confirm push registration. Please retry.');
    } catch(error) {
      // A provider token is not active locally until server acknowledgement and
      // session-bound native confirmation. Remove a partially registered token.
      if(attempted)await alerts.removeDevice(new AbortController().signal,result.binding,userId).catch(()=>{});
      await nativePushRequest('clear',userId,new AbortController().signal,result.ticket).catch(()=>{});
      throw error;
    }
    return;
  }
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
export async function disablePush(signal: AbortSignal,userId?:string) {
  if(isNativeAndroid()){
    if(!userId)throw new Error('Sign in before updating push.');
    const state=await nativePushRequest('status',userId,signal);
    if(!state.binding)throw new Error('Android could not verify the current session. Please retry.');
    await alerts.removeDevice(signal,state.binding,userId);
    if(signal.aborted)throw new DOMException('Aborted','AbortError');
    await nativePushRequest('clear',userId,signal,undefined,state.binding);
    return;
  }
  // Server removal takes effect even if the browser cannot contact Firebase to delete its token.
  await alerts.removeDevice(signal);
  stopForeground?.();
  stopForeground = undefined;
  const [appSdk, messagingSdk] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  const app = appSdk.getApps().find((app) => app.name === 'bird-wanderer-web');
  if (app) await messagingSdk.deleteToken(messagingSdk.getMessaging(app)).catch(() => false);
}
