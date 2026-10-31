import type { Hotspot } from '../types';
import { hotspotCoordinates } from './maps';

export interface LocationPoint { latitude: number; longitude: number; source: 'GPS' | 'Manual'; accuracyM?: number }
export const nearbyRadiusKm = 50;

export function distanceKm(from: LocationPoint, hotspot: Pick<Hotspot, 'latitude' | 'longitude'>): number | null {
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
    let settled = false;
    // Some WebViews never settle a denied/pending permission request, so their
    // geolocation timeout alone cannot guarantee that the controls recover.
    const watchdog = setTimeout(() => fail(new Error('Location request did not return in time. Try again or enter coordinates below.')), 12000);
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      reject(error);
    };
    try {
      geolocation.getCurrentPosition((position) => {
        if (settled) return;
        const point: LocationPoint = { latitude: position.coords.latitude, longitude: position.coords.longitude, source: 'GPS' };
        if (!hotspotCoordinates(point)) { fail(new Error('The device returned invalid coordinates. Try again or enter them below.')); return; }
        if (Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0) point.accuracyM = position.coords.accuracy;
        settled = true;
        clearTimeout(watchdog);
        resolve(point);
      }, (error) => fail(new Error(error.code === 1 ? 'Location permission was denied. You can enter coordinates below.' : error.code === 3 ? 'Location request timed out. Try again or enter coordinates below.' : 'Device location is unavailable. Try again or enter coordinates below.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    } catch {
      fail(new Error('Device location is unavailable. Try again or enter coordinates below.'));
    }
  });
}
