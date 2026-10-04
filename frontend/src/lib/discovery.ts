import type { BirdSpecies, Hotspot } from '../types';

export interface DiscoveryCatalogue {
  species: BirdSpecies[];
  hotspots: Hotspot[];
  region: string;
  source: 'eBird';
  fetchedAt: string;
  cached: boolean;
  observationDays: number;
}

export async function loadDiscovery(signal: AbortSignal): Promise<DiscoveryCatalogue> {
  let response: Response;
  try {
    response = await fetch('/api/discovery/catalogue', { signal, credentials: 'same-origin' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Cannot reach discovery. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Discovery is unavailable. Please try again.');
  if (!Array.isArray(data?.species) || !Array.isArray(data?.hotspots)) throw new Error('Unexpected discovery response.');
  return data;
}
