import type { BirdSpecies, Hotspot } from '../types';
import { SessionExpiredError } from './auth';

export interface DiscoveryCatalogue {
  species: BirdSpecies[];
  hotspots: Hotspot[];
  region: string;
  source: 'eBird';
  fetchedAt: string;
  cached: boolean;
  observationDays: number;
}

export interface SpeciesLocations {
  speciesId: string;
  locations: Array<{ hotspotId: string; name: string; coordinates: string; observedAt: string; count: number | null }>;
  fetchedAt: string;
  cached: boolean;
}

export interface HotspotDetails {
  hotspotId: string;
  recentSightings: Hotspot['recentSightings'];
  speciesList: Hotspot['speciesList'];
  unmatchedTaxa: number;
  fetchedAt: string;
  cached: boolean;
}

async function request(path: string, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`/api/discovery/${path}`, { signal, credentials: 'same-origin' });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Cannot reach discovery. Check your connection and try again.');
  }
  if (response.status === 401) throw new SessionExpiredError();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Discovery is unavailable. Please try again.');
  return data;
}

export async function loadDiscovery(signal: AbortSignal): Promise<DiscoveryCatalogue> {
  const data = await request('catalogue', signal);
  if (!Array.isArray(data?.species) || !Array.isArray(data?.hotspots)) throw new Error('Unexpected discovery response.');
  return data;
}

export async function loadSpeciesLocations(id: string, signal: AbortSignal): Promise<SpeciesLocations> {
  const data = await request(`species/${encodeURIComponent(id)}/locations`, signal);
  if (data?.speciesId !== id || !Array.isArray(data?.locations)) throw new Error('Unexpected species location response.');
  return data;
}

export async function loadHotspotDetails(id: string, signal: AbortSignal): Promise<HotspotDetails> {
  const data = await request(`hotspots/${encodeURIComponent(id)}`, signal);
  if (data?.hotspotId !== id || !Array.isArray(data?.recentSightings) || !Array.isArray(data?.speciesList)) throw new Error('Unexpected hotspot detail response.');
  return data;
}
