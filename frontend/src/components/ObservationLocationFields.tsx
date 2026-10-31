import React, { useEffect, useState } from 'react';
import type { Hotspot } from '../types';
import { nearestHotspot, type ObservationPoint } from '../lib/observation-form';
import { ObservationPinMap } from './ObservationPinMap';

export function ObservationLocationFields({ hotspots, hotspotId, point, disabled, onChange, resetKey = 0 }: {
  hotspots: Hotspot[]; hotspotId: string; point: ObservationPoint | null; disabled?: boolean; resetKey?: number;
  onChange: (hotspotId: string, point: ObservationPoint | null) => void;
}) {
  const [custom, setCustom] = useState(!!point), [showMap, setShowMap] = useState(false);
  const [latitude, setLatitude] = useState(point ? String(point.latitude) : ''), [longitude, setLongitude] = useState(point ? String(point.longitude) : ''), [label, setLabel] = useState(point?.label || '');
  useEffect(() => { if (resetKey) { setLatitude(''); setLongitude(''); setLabel(''); setCustom(false); setShowMap(false); } }, [resetKey]);
  useEffect(() => { if (point) { setCustom(true); if (point.source !== 'manual' || Number(latitude) !== point.latitude || Number(longitude) !== point.longitude || label !== point.label) { setLatitude(String(point.latitude)); setLongitude(String(point.longitude)); setLabel(point.label); } } else if (hotspotId) setCustom(false); }, [point, hotspotId]);
  const choose = (value: ObservationPoint) => { setLatitude(String(value.latitude)); setLongitude(String(value.longitude)); onChange('', { ...value, label }); };
  const manual = (lat: string, lon: string, name: string) => {
    setLatitude(lat); setLongitude(lon); setLabel(name);
    const a = Number(lat), b = Number(lon);
    onChange('', lat.trim() && lon.trim() && Number.isFinite(a) && Math.abs(a) <= 90 && Number.isFinite(b) && Math.abs(b) <= 180 ? { latitude: a, longitude: b, label: name, source: 'manual' } : null);
  };
  const nearest = nearestHotspot(point, hotspots);
  return <fieldset disabled={disabled} className="bg-[#f1f4f9] p-3 rounded-xl space-y-2 min-w-0 text-[12px]">
    <legend className="font-bold">Observation location</legend>
    <label className="block">Location type<select aria-label="Observation location type" value={custom ? 'custom' : 'hotspot'} onChange={event => { const next = event.target.value === 'custom'; setCustom(next); if (next) manual(latitude, longitude, label); else onChange('', null); }} className="block w-full min-h-11 bg-white rounded-lg p-2"><option value="hotspot">eBird hotspot</option><option value="custom">Map pin or manual coordinates</option></select></label>
    {!custom ? <label className="block">Hotspot<select aria-label="Observation hotspot" value={hotspotId} onChange={event => onChange(event.target.value, null)} className="block w-full min-h-11 bg-white rounded-lg p-2"><option value="">Choose a hotspot</option>{hotspotId && !hotspots.some(site => site.id === hotspotId) && <option value={hotspotId}>Current saved hotspot</option>}{hotspots.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label> : <>
      <label className="block">Private location label (optional)<input aria-label="Custom location label" value={label} maxLength={120} onChange={event => manual(latitude, longitude, event.target.value)} className="block w-full min-h-11 rounded-lg bg-white p-2" /></label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label>Latitude<input aria-label="Observation latitude" inputMode="decimal" value={latitude} onChange={event => manual(event.target.value, longitude, label)} className="block w-full min-h-11 rounded-lg bg-white p-2" /></label>
        <label>Longitude<input aria-label="Observation longitude" inputMode="decimal" value={longitude} onChange={event => manual(latitude, event.target.value, label)} className="block w-full min-h-11 rounded-lg bg-white p-2" /></label>
      </div>
      <p>{point ? `Point source: ${point.source === 'exif' ? 'photo EXIF GPS (not independently verified)' : point.source}. Exact coordinates and label are owner-only.` : 'Enter both coordinates or choose a map pin. No GPS is inferred when the photograph has none.'}</p>
      <p>Opening the map requests visible tiles from OpenStreetMap; its provider can see the viewed area. Manual coordinates work without map tiles.</p>
      <button type="button" className="min-h-11 underline" onClick={() => setShowMap(value => !value)}>{showMap ? 'Close location map' : 'Open location map'}</button>
      {showMap && !disabled && <ObservationPinMap point={point} onChoose={choose} />}
      {nearest && <p>Nearest loaded hotspot: {nearest.site.name}, approximately {nearest.distanceKm.toFixed(1)} km away. A suggestion, not proof of capture location. <button type="button" className="min-h-11 underline" onClick={() => { setCustom(false); onChange(nearest.site.id, null); }}>Use this hotspot instead</button></p>}
    </>}
  </fieldset>;
}
