// A fragment is not sent in the HTTP URL. main.tsx removes it from history
// immediately and keeps the one-time token only in component memory.
export function recoveryTokenFromHash(hash: string): string | null | undefined {
  if (!hash.startsWith('#reset-password')) return undefined;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('reset-password');
  return [...params.keys()].length === 1 && token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

async function request(path: string, body: object, signal: AbortSignal) {
  let response: Response;
  try { response = await fetch(`/api/auth/recovery/${path}`, { method: 'POST', credentials: 'same-origin', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
  catch { throw new Error('Cannot reach Bird Wanderer. Check your connection and try again.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Recovery is unavailable. Please try again.');
  return data;
}
export const recovery = {
  async request(email: string, signal: AbortSignal): Promise<string> {
    const data = await request('request', { email }, signal);
    if (typeof data.message !== 'string') throw new Error('Unexpected recovery response. Please try again.');
    return data.message;
  },
  async reset(token: string, password: string, signal: AbortSignal): Promise<void> {
    const data = await request('reset', { token, password }, signal);
    if (data.reset !== true) throw new Error('Unexpected recovery response. Please try again.');
  },
};
