import type { ScreenType } from '../types';
import { recoveryTokenFromHash } from './recovery';
import { verificationTokenFromHash } from './verification';

export interface AppRoute {
  screen: Exclude<ScreenType, 'auth'>;
  species?: string;
  hotspot?: string;
  post?: string;
  person?: string;
}
const screens = ['explore', 'community', 'hotspots', 'journal', 'profile', 'species-detail', 'hotspot-detail', 'log-observation', 'life-list', 'quiz', 'messages', 'search', 'notifications', 'settings'];
const validId = (value: string | null) => !!value && /^[A-Za-z0-9_-]{1,80}$/.test(value);

export function readRoute(search: string): AppRoute {
  const params = new URLSearchParams(search);
  const screen = params.get('screen') || (params.has('notifications') ? 'notifications' : 'explore');
  if(params.getAll('screen').length>1)throw new Error('This app link names more than one screen.');
  if (!screens.includes(screen)) throw new Error('This app link names an unavailable screen.');
  const route = { screen } as AppRoute;
  const keys: Array<'species'|'hotspot'|'post'|'person'> = screen === 'species-detail' ? ['species'] : screen === 'hotspot-detail' ? ['hotspot'] : screen === 'community' ? ['post', 'person'] : [];
  for (const key of keys) {
    const value = params.get(key);
    if (value !== null) {
      if (params.getAll(key).length !== 1 || !validId(value)) throw new Error('This app link has an invalid identifier.');
      route[key] = value;
    }
  }
  if ((screen === 'species-detail' && !route.species) || (screen === 'hotspot-detail' && !route.hotspot) || (route.post && route.person))
    throw new Error('This app link needs one valid destination.');
  return route;
}

export function routeQuery(route: AppRoute): string {
  const params = new URLSearchParams({ screen: route.screen });
  for (const key of ['species', 'hotspot', 'post', 'person'] as const) if (route[key]) params.set(key, route[key]);
  // Reject malformed generated links as well as links arriving from elsewhere.
  readRoute(params.toString());
  return `?${params}`;
}

export function writeRoute(route: AppRoute, replace = false) {
  // Account links own their fragments until bootstrap/event handling consumes them.
  // Ordinary route refreshes must not erase a newly opened email link first.
  if (recoveryTokenFromHash(window.location.hash || '') !== undefined || verificationTokenFromHash(window.location.hash || '') !== undefined) return;
  const state = window.history.state;
  const previous = Number.isSafeInteger(state?.birdWandererIndex) ? state.birdWandererIndex : 0;
  const index = replace ? previous : previous + 1;
  window.history[replace ? 'replaceState' : 'pushState']({ birdWandererIndex: index }, '', `${window.location.pathname}${routeQuery(route)}`);
}

export async function shareAppLink(url: string, showToast: (message: string) => void) {
  try {
    const candidate=new URL(url);
    if(candidate.origin!==window.location.origin||candidate.pathname!==window.location.pathname||candidate.username||candidate.password)
      throw new Error('Invalid app link.');
    url=`${candidate.origin}${candidate.pathname}${routeQuery(readRoute(candidate.search))}`;
    // Share only the canonical ID link, never a private caption, image URL or GPS.
    if (navigator.userAgent.includes('BirdWandererAndroid/')) {
      window.location.href = `birdwanderer://share?url=${encodeURIComponent(url)}`;
    } else if (navigator.share) {
      await navigator.share({ title: 'Bird Wanderer', url });
    } else if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      showToast('App link copied. The recipient still needs permission to view private records.');
    } else {
      window.prompt('Copy this app link. Private records still require permission.', url);
    }
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) showToast('Could not share this link. Please retry.');
  }
}
