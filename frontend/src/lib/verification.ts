import { SessionExpiredError } from './auth';

export function verificationTokenFromHash(hash: string): string | null | undefined {
  if (!hash.startsWith('#verify-email')) return undefined;
  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('verify-email');
  return [...params.keys()].length === 1 && token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

async function request(path: string, body?: object, signal?: AbortSignal) {
  let response: Response;
  try { response = await fetch(`/api/auth/verification/${path}`, { method: body ? 'POST' : 'GET', credentials: 'same-origin', signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error('Cannot reach Bird Wanderer. Check your connection and try again.'); }
  if (response.status === 401) throw new SessionExpiredError();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Email verification is unavailable. Please try again.');
  return data;
}
export const verification = {
  async status(signal: AbortSignal): Promise<boolean> {
    const data = await request('status', undefined, signal);
    if (typeof data.emailVerified !== 'boolean') throw new Error('Unexpected verification response. Please try again.');
    return data.emailVerified;
  },
  async resend(signal: AbortSignal): Promise<string> {
    const data = await request('resend', {}, signal);
    if (typeof data.message !== 'string') throw new Error('Unexpected verification response. Please try again.');
    return data.message;
  },
  async confirm(token: string, signal: AbortSignal): Promise<void> {
    const data = await request('confirm', { token }, signal);
    if (data.verified !== true) throw new Error('Unexpected verification response. Please try again.');
  },
};
