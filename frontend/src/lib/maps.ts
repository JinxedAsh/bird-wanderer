import type { Hotspot } from '../types';

export function hotspotCoordinates(hotspot: Pick<Hotspot, 'latitude' | 'longitude'>): [number, number] | null {
  const { latitude, longitude } = hotspot;
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return [latitude, longitude];
}

export function hotspotDirectionsUrl(hotspot: Pick<Hotspot, 'latitude' | 'longitude'>): string | null {
  const coordinates = hotspotCoordinates(hotspot);
  if (!coordinates) return null;
  const url = new URL('https://www.google.com/maps/dir/');
  url.search = new URLSearchParams({ api: '1', destination: coordinates.join(',') }).toString();
  return url.toString();
}
