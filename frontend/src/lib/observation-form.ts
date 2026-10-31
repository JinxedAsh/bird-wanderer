import type { BirdSpecies, Hotspot } from '../types';
import type { PhotoExif } from './discovery';

export interface ObservationPoint { latitude: number; longitude: number; label: string; source: 'manual' | 'map' | 'exif' }
export const normalizedBirdName = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function speciesMatches(birds: BirdSpecies[], query: string, selectedId = '') {
  const needle = normalizedBirdName(query);
  const matches = birds.filter(bird => [bird.name, bird.scientificName].some(value => {
    const name = normalizedBirdName(value);
    return needle.split(' ').every(word => name.includes(word)) || name.replaceAll(' ', '').includes(needle.replaceAll(' ', ''));
  }));
  const exact = (bird: BirdSpecies) => [bird.name, bird.scientificName].some(value => normalizedBirdName(value) === needle);
  matches.sort((a, b) => Number(exact(b)) - Number(exact(a)));
  const selected = birds.find(bird => bird.id === selectedId);
  return { total: matches.length, choices: [...(selected ? [selected] : []), ...matches.filter(bird => bird.id !== selectedId)].slice(0, 50), exactId: needle && matches.filter(exact).length === 1 ? matches.find(exact)!.id : '' };
}
export function exifObservationTime(exif: PhotoExif) {
  const value = exif.capturedAt?.replace(' ', 'T').slice(0, 16);
  return value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? value : '';
}
export const validObservationPoint = (point: unknown): point is { latitude: number; longitude: number } => {
  const value = point as ObservationPoint | null;
  return !!value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
};
export function nearestHotspot(point: ObservationPoint | null, hotspots: Hotspot[]) {
  if (!point) return null;
  const radians = (n: number) => n * Math.PI / 180;
  return hotspots.filter(site => validObservationPoint(site)).map(site => {
    const lat = radians(site.latitude! - point.latitude), lon = radians(site.longitude! - point.longitude);
    const a = Math.sin(lat / 2) ** 2 + Math.cos(radians(point.latitude)) * Math.cos(radians(site.latitude!)) * Math.sin(lon / 2) ** 2;
    return { site, distanceKm: 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a))) };
  }).sort((a, b) => a.distanceKm - b.distanceKm)[0] || null;
}
