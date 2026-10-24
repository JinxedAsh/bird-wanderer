import { SessionExpiredError } from './auth';
import type { ChatConversation, ChatMessage } from '../types';

async function request(path: string, signal: AbortSignal, body?: object) {
  let response: Response;
  try {
    response = await fetch(`/api/observations/chat${path}`, {
      method: body ? 'POST' : 'GET',
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Chat is unreachable. Check your connection and retry.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  if (response.status === 204) return;
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || 'Chat could not be updated. Please retry.');
  return data;
}
export const messages = {
  list: (
    signal: AbortSignal,
    offset = 0,
    q = '',
  ): Promise<{
    conversations: ChatConversation[];
    nextOffset: number | null;
  }> => request(`?offset=${offset}&q=${encodeURIComponent(q)}`, signal),
  open: (
    personId: string,
    signal: AbortSignal,
  ): Promise<{ conversation: ChatConversation }> =>
    request('', signal, { personId }),
  thread: (
    id: string,
    signal: AbortSignal,
    before?: number,
  ): Promise<{ conversation: ChatConversation; nextBefore: number | null }> =>
    request(
      `/${encodeURIComponent(id)}${before === undefined ? '' : `?before=${before}`}`,
      signal,
    ),
  send: (
    id: string,
    body: {
      clientId: string;
      text: string;
      observationId?: string;
      hotspotId?: string;
    },
    signal: AbortSignal,
  ): Promise<{ message: ChatMessage }> =>
    request(`/${encodeURIComponent(id)}/messages`, signal, body),
  read: (id: string, throughId: string, signal: AbortSignal) =>
    request(`/${encodeURIComponent(id)}/read`, signal, { throughId }),
  shareable: (
    id: string,
    signal: AbortSignal,
  ): Promise<{
    observations: Array<{ id: string; label: string; imageUrl: string }>;
  }> => request(`/${encodeURIComponent(id)}/shareable`, signal),
};

// getRandomValues also works on a local-network HTTP demo; randomUUID requires HTTPS.
export function messageRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
