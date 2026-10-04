import React, { useEffect, useRef, useState } from 'react';
import { getDeviceLocation, type LocationPoint } from '../lib/location';
import { hotspotCoordinates } from '../lib/maps';

interface LocationPickerProps { location: LocationPoint | null; onSelect: (point: LocationPoint | null) => void; onClose: () => void }

export function LocationPicker({ location, onSelect, onClose }: LocationPickerProps) {
  const [latitude, setLatitude] = useState(location ? String(location.latitude) : '');
  const [longitude, setLongitude] = useState(location ? String(location.longitude) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current++; }, []);
  const useGps = async () => {
    const id = ++requestId.current;
    setBusy(true); setError('');
    try {
      const point = await getDeviceLocation();
      if (requestId.current === id) { onSelect(point); onClose(); }
    } catch (failure) {
      if (requestId.current === id) setError(failure instanceof Error ? failure.message : 'Location is unavailable.');
    } finally { if (requestId.current === id) setBusy(false); }
  };
  return <section aria-label="Choose discovery location" className="mx-4 mt-3 rounded-xl bg-white p-3 text-[12px] text-[#42493e] border border-[#e0e3e8]">
    <div className="flex items-center justify-between"><h3 className="font-bold">Discovery location</h3><button type="button" onClick={onClose} className="underline">Close</button></div>
    <p className="mt-2">Optional: distances use your selected point. Weather sends rounded coordinates to Open-Meteo through our server. The location is not saved to your account.</p>
    <button type="button" disabled={busy} onClick={useGps} className="my-2 rounded-lg bg-[#154212] px-3 py-2 text-white disabled:opacity-50">{busy ? 'Waiting for location…' : 'Use device location'}</button>
    <form onSubmit={(event) => {
      event.preventDefault();
      const point: LocationPoint = { latitude: Number(latitude), longitude: Number(longitude), source: 'Manual' };
      if (!latitude.trim() || !longitude.trim() || !hotspotCoordinates(point)) { setError('Enter latitude from −90 to 90 and longitude from −180 to 180.'); return; }
      requestId.current++; onSelect(point); onClose();
    }}>
      <div className="grid grid-cols-2 gap-2">
        <label>Latitude<input aria-label="Location latitude" type="number" step="any" min="-90" max="90" required value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-1 w-full rounded-lg bg-[#f1f4f9] p-2" /></label>
        <label>Longitude<input aria-label="Location longitude" type="number" step="any" min="-180" max="180" required value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-1 w-full rounded-lg bg-[#f1f4f9] p-2" /></label>
      </div>
      <button type="submit" className="mt-2 font-semibold underline">Use coordinates</button>
    </form>
    {error && <p role="alert" className="mt-2 text-[#904d00]">{error}</p>}
    {location && <button type="button" onClick={() => { requestId.current++; onSelect(null); onClose(); }} className="mt-2 underline">Clear location and return to region</button>}
  </section>;
}
