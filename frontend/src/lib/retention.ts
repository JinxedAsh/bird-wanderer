import { SessionExpiredError } from './auth';
import type { PhotoAttribution } from '../components/SpeciesPhoto';

export interface PracticeState {
  stats: {
    xp: number;
    streak: number;
    completedSessions: number;
    timezone: string;
    challenges: Array<{ id: string; title: string; progress: number; target: number }>;
  };
  session: null | {
    id: string;
    status: 'active' | 'completed' | 'abandoned';
    currentIndex: number;
    totalQuestions: number;
    score: number;
    question: null | {
      id: string;
      questionNumber: number;
      totalQuestions: number;
      prompt: string;
      subPrompt: string;
      imageUrl: string;
      photoCredit: PhotoAttribution;
      options: Array<{ id: string; label: string; text: string }>;
    };
    feedback: null | {
      selectedOptionId: string;
      correct: boolean;
      correctOptionId: string;
      factTitle: string;
      factSpecies: string;
      factText: string;
    };
  };
}
async function request(path: string, signal: AbortSignal, body?: object): Promise<PracticeState> {
  let response: Response;
  try {
    response = await fetch(`/api/retention${path}`, {
      method: body ? 'POST' : 'GET',
      signal,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Practice is unreachable. Check your connection and retry.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Practice could not be saved. Please retry.');
  if (!data.stats || !Object.hasOwn(data, 'session'))
    throw new Error('Practice response is unreadable. Please retry.');
  return data;
}
export const retention = {
  load: (signal: AbortSignal) => request('', signal),
  start: (restart: boolean, signal: AbortSignal) => request('/quiz', signal, { restart }),
  answer: (id: string, index: number, optionId: string, signal: AbortSignal) =>
    request(`/quiz/${encodeURIComponent(id)}/answer`, signal, { index, optionId }),
  next: (id: string, index: number, signal: AbortSignal) =>
    request(`/quiz/${encodeURIComponent(id)}/next`, signal, { index }),
};
