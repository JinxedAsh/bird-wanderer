import type { Hotspot } from '../types';
import { hotspotCoordinates } from './maps';

export interface LocationPoint { latitude: number; longitude: number; source: 'GPS' | 'Manual'; accuracyM?: number }
export const nearbyRadiusKm = 50;

export function distanceKm(from: LocationPoint, hotspot: Hotspot): number | null {
  const to = hotspotCoordinates(hotspot);
  if (!to || !hotspotCoordinates(from)) return null;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(to[0] - from.latitude);
  const longitude = radians(to[1] - from.longitude);
  const a = Math.sin(latitude / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to[0])) * Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, a))));
}

export function getDeviceLocation(geolocation: Geolocation | null | undefined = typeof navigator === 'undefined' ? undefined : navigator.geolocation, secureContext = typeof window !== 'undefined' && window.isSecureContext): Promise<LocationPoint> {
  if (!secureContext) return Promise.reject(new Error('GPS requires HTTPS or localhost. On the phone LAN preview, enter coordinates below.'));
  if (!geolocation) return Promise.reject(new Error('This browser does not support GPS. Enter coordinates below.'));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition((position) => {
      const point: LocationPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'GPS' };
      if (!hotspotCoordinates(point)) { reject(new Error('The device returned invalid coordinates. Try again or enter them below.')); return; }
      if (Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0) point.accuracyM = position.coords.accuracy;
      resolve(point);
    }, (error) => reject(new Error(error.code === 1 ? 'Location permission was denied. You can enter coordinates below.' : error.code === 3 ? 'Location request timed out. Try again or enter coordinates below.' : 'Device location is unavailable. Try again or enter coordinates below.')),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  });
}
