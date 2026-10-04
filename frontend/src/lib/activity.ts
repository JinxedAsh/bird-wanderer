import { SessionExpiredError } from './auth';

export type SaveKind = 'species' | 'hotspot';
export interface DiscoveryActivity {
  saves: Array<{ kind: SaveKind; id: string }>;
  searches: string[];
}

async function request(path: string, signal: AbortSignal, method = 'GET', body?: object): Promise<DiscoveryActivity> {
  let response: Response;
  try {
    response = await fetch(`/api/activity${path}`, {
      signal, method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Cannot reach Bird Wanderer. Check your connection and try again.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Could not update your saved items or searches. Please try again.');
  if (!data || typeof data !== 'object' || !Array.isArray(data.saves) || data.saves.length > 500 || !data.saves.every((item: { kind?: unknown; id?: unknown } | null) => item && typeof item.id === 'string' && (item.kind === 'species' ? /^[a-z0-9]{3,16}$/.test(item.id) : item.kind === 'hotspot' && /^L\d{1,20}$/.test(item.id))) || !Array.isArray(data.searches) || data.searches.length > 10 || !data.searches.every((text: unknown) => typeof text === 'string' && text.length > 0 && text.length <= 100 && !/[\x00-\x1f\x7f]/.test(text))) {
    throw new Error('Unexpected saved-items response. Please try again.');
  }
  return data;
}

export const activity = {
  load: (signal: AbortSignal) => request('', signal),
  save: (kind: SaveKind, id: string, saved: boolean, signal: AbortSignal) => request(`/saves/${kind}/${encodeURIComponent(id)}`, signal, 'PUT', { saved }),
  search: (term: string, signal: AbortSignal) => request('/searches', signal, 'POST', { term }),
  removeSearch: (term: string | undefined, signal: AbortSignal) => request('/searches', signal, 'DELETE', term === undefined ? {} : { term }),
};
