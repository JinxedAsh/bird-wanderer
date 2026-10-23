import { SessionExpiredError } from './auth';
import type { AppNotification } from '../types';

export interface AlertSubscription {
  kind: 'species' | 'hotspot';
  id: string;
  label: string;
}
export interface AlertState {
  subscriptions: AlertSubscription[];
  notifications: AppNotification[];
  push: { configured: boolean; message: string; deviceRegistered?: boolean };
}
async function request(path: string, signal: AbortSignal, method = 'GET', body?: object) {
  let response: Response;
  try {
    response = await fetch(`/api/observations/alerts${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Cannot reach your alerts. Check your connection and retry.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 204) return;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not update alerts. Please retry.');
  return data;
}
export const alerts = {
  pushConfig: (
    signal: AbortSignal,
  ): Promise<{ configured: boolean; webConfig?: Record<string, string>; vapidKey?: string }> =>
    request('/push/config', signal),
  registerDevice: (token: string, signal: AbortSignal) => request('/push/device', signal, 'PUT', { token }),
  removeDevice: (signal: AbortSignal) => request('/push/device', signal, 'DELETE'),
  load: async (signal: AbortSignal): Promise<AlertState> => {
    const data = await request('', signal);
    if (
      !Array.isArray(data?.subscriptions) ||
      !Array.isArray(data?.notifications) ||
      typeof data?.push?.configured !== 'boolean' ||
      typeof data?.push?.message !== 'string'
    )
      throw new Error('Alert response is unreadable. Please retry.');
    return data;
  },
  subscribe: (kind: AlertSubscription['kind'], id: string, enabled: boolean, signal: AbortSignal) =>
    request(`/subscriptions/${kind}/${encodeURIComponent(id)}`, signal, 'PUT', { enabled }),
  read: (id: string | null, signal: AbortSignal) =>
    request(id ? `/${encodeURIComponent(id)}/read` : '/read', signal, 'POST'),
};
