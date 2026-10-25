import { alerts, type AlertState } from './alerts';
import { SessionExpiredError } from './auth';

export interface NativePushResult {
  configured?: boolean;
  projectId?: string;
  active?: boolean;
  needsRegistration?: boolean;
  token?: string;
  ticket?: string;
  binding?: string;
  error?: string;
}
export const isNativeAndroid = () => typeof navigator !== 'undefined' && navigator.userAgent.includes('BirdWandererAndroid/');
export const supportsNativePush = () => isNativeAndroid() && navigator.userAgent.includes('BirdWandererPush/1');
const requestId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');

// A narrow URL action and one response event; no native JavaScript object bridge.
// Call token synchronously from the click, before imports/network lose its gesture.
export function nativePushRequest(action: 'status' | 'token' | 'confirm' | 'clear', user: string, signal: AbortSignal, ticket?: string, binding?: string): Promise<NativePushResult> {
  if (!supportsNativePush()) return Promise.reject(new Error('Update the Android app to use native push. In-app alerts still work.'));
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const id = requestId();
  return new Promise((resolve, reject) => {
    let finished = false;
    const cancelTicket = () => {
      if (action === 'token') {
        try { window.location.href = `birdwanderer://push?${new URLSearchParams({ action: 'cancel', id: requestId(), ticket: id })}`; } catch { /* The WebView may already be gone. */ }
      }
    };
    const done = (value?: NativePushResult, failure?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      signal.removeEventListener('abort', aborted);
      window.removeEventListener('bird-native-push', received);
      if (failure) { cancelTicket(); reject(failure); } else resolve(value!);
    };
    const aborted = () => done(undefined, new DOMException('Aborted', 'AbortError'));
    const received = (event: Event) => {
      const value = (event as CustomEvent).detail;
      if (!value || value.requestId !== id) return;
      if (typeof value.error === 'string') done(undefined, new Error(value.error));
      else done(value);
    };
    const timer = window.setTimeout(() => done(undefined, new Error('Android push did not respond. Finish any permission prompt and retry.')), 60000);
    signal.addEventListener('abort', aborted, { once: true });
    window.addEventListener('bird-native-push', received);
    try { window.location.href = `birdwanderer://push?${new URLSearchParams({ action, id, user, ...(ticket ? { ticket } : {}), ...(binding?{binding}:{}) })}`; }
    catch { done(undefined,new Error('Android push could not open its native action. Please retry.')); }
  });
}

export function clearNativePush(user?:string) {
  if (!supportsNativePush()) return;
  const signal=new AbortController().signal;
  if(!user)void nativePushRequest('clear','',signal).catch(()=>{});
  else void nativePushRequest('status',user,signal).then(state=>{
    if(state.binding)return nativePushRequest('clear',user,signal,undefined,state.binding);
  }).catch(()=>{});
}

export async function reconcileNativePush(state: AlertState, user: string, signal: AbortSignal): Promise<AlertState> {
  if (!isNativeAndroid()) return state;
  const push = { ...state.push };
  if (!supportsNativePush()) return { ...state, push: { ...push, configured: false, message: 'Native push requires an updated Android APK and Firebase configuration. In-app alerts still work.' } };
  try {
    const native = await nativePushRequest('status', user, signal);
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!native.binding || !/^[a-f0-9]{64}$/.test(native.binding)) throw new Error('Android could not verify the current push session.');
    if(typeof native.configured!=='boolean'||typeof native.active!=='boolean'||typeof native.needsRegistration!=='boolean')throw new Error('Android returned an unreadable push status.');
    const eligible = push.configured && native.configured && native.projectId === push.webConfig?.projectId;
    const registered = !!push.deviceRegistered;
    if ((native.active || native.needsRegistration || registered) && (!eligible || !native.active || !registered || native.needsRegistration)) {
      if (registered) await alerts.removeDevice(signal, native.binding, user);
      await nativePushRequest('clear', user, signal, undefined, native.binding);
      push.deviceRegistered = false;
      push.message = 'Push registration changed. Enable push again if wanted; in-app alerts still work.';
    }
    if (push.configured && !eligible) push.message = 'This Android build needs Firebase configuration matching the server. In-app alerts still work.';
    push.configured = !!eligible;
  } catch (error) {
    if (signal.aborted || error instanceof SessionExpiredError) throw error;
    // Native support failure must never hide the authenticated in-app inbox.
    push.configured = false;
    push.message = `${error instanceof Error ? error.message : 'Android push status is unavailable.'} In-app alerts still work.`;
  }
  return { ...state, push };
}
