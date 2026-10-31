import React, { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type { ObservationPoint } from '../lib/observation-form';

export function ObservationPinMap({ point, onChoose }: { point: ObservationPoint | null; onChoose: (point: ObservationPoint) => void }) {
  const container = useRef<HTMLDivElement>(null), map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null), leaflet = useRef<typeof Leaflet | null>(null);
  const callback = useRef(onChoose); callback.current = onChoose;
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false; let resize: ResizeObserver | undefined; let instance: Leaflet.Map | undefined;
    setError(''); setReady(false);
    import('leaflet').then(L => {
      if (cancelled || !container.current) return;
      leaflet.current = L;
      instance = L.map(container.current, { scrollWheelZoom: false, zoomAnimation: false }).setView(point ? [point.latitude, point.longitude] : [20, 0], point ? 10 : 2);
      map.current = instance;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' })
        .on('tileerror', () => { if (!cancelled) setError('Map tiles are unavailable. Manual coordinates still work.'); }).addTo(instance);
      instance.on('click', event => callback.current({ latitude: event.latlng.lat, longitude: event.latlng.lng, label: '', source: 'map' }));
      if (typeof ResizeObserver !== 'undefined') { resize = new ResizeObserver(() => instance?.invalidateSize()); resize.observe(container.current); }
      setReady(true);
    }).catch(() => { if (!cancelled) setError('Map could not start. Use manual coordinates or retry.'); });
    return () => { cancelled = true; resize?.disconnect(); instance?.remove(); map.current = null; marker.current = null; };
  }, [attempt]);
  useEffect(() => {
    marker.current?.remove(); marker.current = null;
    if (!ready || !point || !map.current || !leaflet.current) return;
    const icon = leaflet.current.divIcon({ className: 'hotspot-map-pin', html: '<span aria-hidden="true"></span>', iconSize: [28, 28], iconAnchor: [14, 14] });
    marker.current = leaflet.current.marker([point.latitude, point.longitude], { icon, title: 'Chosen observation point', keyboard: true }).addTo(map.current);
  }, [point?.latitude, point?.longitude, ready]);
  return <div className="space-y-2">
    <div ref={container} role="region" aria-label="Choose observation point on map. Arrow keys pan the map." className="hotspot-map h-60 w-full rounded-xl overflow-hidden" />
    {!ready && !error && <p role="status">Loading map…</p>}
    <button type="button" disabled={!ready} className="min-h-11 underline" onClick={() => { const center = map.current?.getCenter(); if (center) callback.current({ latitude: center.lat, longitude: center.lng, label: '', source: 'map' }); }}>Use map center</button>
    {point && <button type="button" disabled={!ready} className="min-h-11 underline ml-3" onClick={() => map.current?.setView([point.latitude, point.longitude], 10)}>Center on chosen point</button>}
    {error && <div role="alert">{error} <button type="button" className="min-h-11 underline" onClick={() => setAttempt(value => value + 1)}>Retry map</button></div>}
  </div>;
}
