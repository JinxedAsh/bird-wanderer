import React, { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type { Hotspot } from '../types';
import { hotspotCoordinates } from '../lib/maps';

interface HotspotMapProps {
  hotspots: Hotspot[];
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onOpen?: (id: string) => void;
}

export const HotspotMap: React.FC<HotspotMapProps> = ({ hotspots, label, selectedId, onSelect, onOpen }) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const markers = useRef(new Map<string, Leaflet.Marker>());
  const callbacks = useRef({ onSelect, onOpen });
  callbacks.current = { onSelect, onOpen };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const points = useMemo(() => hotspots.flatMap((hotspot) => {
    const coordinates = hotspotCoordinates(hotspot);
    return coordinates ? [{ hotspot, coordinates }] : [];
  }), [hotspots]);

  useEffect(() => {
    if (!container.current || points.length === 0) return;
    let cancelled = false;
    let map: Leaflet.Map | undefined;
    let resizeObserver: ResizeObserver | undefined;
    setReady(false);
    setError('');
    // Loading only in the browser also keeps server rendering safe: Leaflet uses window.
    import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      leafletRef.current = L;
      // Avoid delayed zoom-transition callbacks after rapid navigation removes this map.
      map = L.map(container.current, { scrollWheelZoom: false, zoomAnimation: false });
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).on('tileerror', () => {
        if (!cancelled) setError('Map imagery could not load. Hotspot lists and directions remain available.');
      }).addTo(map);
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (!cancelled) map?.invalidateSize();
        });
        resizeObserver.observe(container.current);
      }
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError('The interactive map could not start. Please try again.');
    });
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markers.current.clear();
    };
  }, [attempt, points.length > 0]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer || points.length === 0) return;
    layer.clearLayers();
    markers.current.clear();
    const icon = L.divIcon({ className: 'hotspot-map-pin', html: '<span aria-hidden="true"></span>', iconSize: [28, 28], iconAnchor: [14, 14] });
    for (const { hotspot, coordinates } of points) {
      const content = document.createElement('div');
      const name = document.createElement('p');
      name.textContent = hotspot.name;
      name.className = 'font-semibold';
      content.append(name);
      if (callbacks.current.onOpen) {
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Open hotspot';
        open.className = 'mt-2 font-semibold text-[#154212] underline';
        open.onclick = () => callbacks.current.onOpen?.(hotspot.id);
        content.append(open);
      }
      const marker = L.marker(coordinates, { icon, title: hotspot.name, alt: `Select hotspot ${hotspot.name}`, keyboard: true })
        .bindPopup(content)
        .on('click', () => callbacks.current.onSelect?.(hotspot.id))
        .addTo(layer);
      markers.current.set(hotspot.id, marker);
    }
    if (points.length === 1) map.setView(points[0].coordinates, 13);
    else map.fitBounds(L.latLngBounds(points.map((point) => point.coordinates)), { padding: [24, 24], maxZoom: 13 });
  }, [ready, points]);

  useEffect(() => {
    for (const [id, marker] of markers.current) marker.getElement()?.classList.toggle('is-selected', id === selectedId);
  }, [ready, selectedId, points]);

  if (points.length === 0) return <div role="status" className="flex h-60 items-center justify-center rounded-2xl bg-[#ebeef3] p-4 text-center text-[13px] text-[#42493e]">No valid hotspot coordinates to show for this filter.</div>;
  return (
    <div>
      <div ref={container} role="region" aria-label={label} className="hotspot-map h-60 w-full overflow-hidden rounded-2xl border border-[#e0e3e8] bg-[#ebeef3] shadow-sm" />
      {!ready && !error && <p role="status" className="mt-1 text-[12px] text-[#42493e]">Loading interactive map...</p>}
      {error && <div role="alert" className="mt-2 text-[12px] text-[#42493e]"><p>{error}</p><button type="button" onClick={() => setAttempt((prev) => prev + 1)} className="mt-1 font-semibold text-[#154212] underline">Retry map</button></div>}
    </div>
  );
};
