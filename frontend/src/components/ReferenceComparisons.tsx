import React, { useEffect, useRef, useState } from 'react';
import { loadSpeciesReferences, type SpeciesPhoto } from '../lib/discovery';
import { SessionExpiredError } from '../lib/auth';
import { PhotoCredit } from './SpeciesPhoto';
import { PhotoMetadata, formatExifNumber, formatShutter } from './PhotoMetadata';

export function referenceRanges(photos: SpeciesPhoto[]) {
  return (['iso', 'aperture', 'focalLengthMm', 'exposureSeconds'] as const).map((field) => {
    const values = photos.map((photo) => photo.exif[field]).filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
    return { field, count: values.length, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null };
  });
}

export const ReferenceComparisons: React.FC<{ speciesId: string; onSessionExpired?: () => void; gallery?: boolean }> = ({ speciesId, onSessionExpired, gallery = false }) => {
  const frame = useRef<HTMLElement>(null);
  const expired = useRef(onSessionExpired);
  expired.current = onSessionExpired;
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ speciesId: string; references: SpeciesPhoto[]; fetchedAt: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!gallery || open || !frame.current) return;
    if (typeof IntersectionObserver === 'undefined') { setOpen(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setOpen(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [gallery, open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setResult(null);
    loadSpeciesReferences(speciesId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((failure) => {
      if (controller.signal.aborted) return;
      if (failure instanceof SessionExpiredError) expired.current?.();
      else setError(failure.message || 'Reference photos could not load.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, speciesId, attempt]);
  const photos = result?.speciesId === speciesId ? result.references : [];
  const imageUnavailable = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!event.currentTarget.src.endsWith('/discovery-placeholder.svg')) {
      event.currentTarget.src = '/discovery-placeholder.svg';
      event.currentTarget.alt = 'Reference image unavailable. Source and credits remain available.';
    }
  };
  if (gallery) return <section ref={frame} aria-label="Reference field captures" className="px-4 pb-5 text-[12px] text-[#42493e]">
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
      <h3 className="text-[17px] min-[360px]:text-[18px] font-medium text-[#181c20]">Reference Field Captures</h3>
      {result?.speciesId === speciesId && !loading && !error && <span className="text-[11px]">{photos.length} reference{photos.length === 1 ? '' : 's'}</span>}
    </div>
    <p className="mb-2">Wikimedia Commons references, not community uploads or recent sightings.</p>
    {(!open || loading || (!result && !error)) && <p role="status">Loading reference photographs...</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-11 font-semibold text-[#154212] underline">Retry references</button></div>}
    {!loading && !error && result?.speciesId === speciesId && <>
      {photos.length === 0 && <p>No matching photographs with supported licence and attribution are available.</p>}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => <figure key={photo.sourceUrl} className="relative min-w-0">
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View reference photograph: ${photo.title}`} className="block aspect-square rounded-xl overflow-hidden bg-[#ebeef3]">
            <img src={photo.thumbnailUrl} alt={`Reference: ${photo.scientificName}`} loading="lazy" onError={imageUnavailable} className="h-full w-full object-cover" />
          </a>
          <PhotoCredit photo={photo} overlay full />
        </figure>)}
      </div>
    </>}
  </section>;
  return <details className="rounded-xl bg-[#f1f4f9] p-3" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer font-semibold text-[#181c20]">Compare reference photographs &amp; gear</summary>
    <div className="mt-2 space-y-3">
      <p>Up to three exact-species references: Wikidata images or Commons structured depicts matches. Metadata is source evidence, not independently verified field settings.</p>
      {loading && <p role="status">Loading reference comparisons...</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-11 underline">Retry references</button></div>}
      {!loading && !error && result && <>
        <p>{photos.length} reference{photos.length === 1 ? '' : 's'} available. {photos.length < 2 ? 'Insufficient photographs for a multi-photo comparison.' : 'A small convenience sample, not typical settings or a statistical recommendation.'}</p>
        <ul className="space-y-1 break-words">{referenceRanges(photos).map(({ field, count, min, max }) => <li key={field}>
          {({ iso: 'ISO', aperture: 'Aperture (f-number)', focalLengthMm: 'Focal length (mm)', exposureSeconds: 'Exposure' })[field]}: {count === 0 ? 'Unavailable' : `${field === 'exposureSeconds' ? formatShutter(min!) : formatExifNumber(min!)}–${field === 'exposureSeconds' ? formatShutter(max!) : formatExifNumber(max!)} (${count} photo${count === 1 ? '' : 's'} with this field)`}
        </li>)}</ul>
        <p>Compare recorded lens/reach and exposure examples with your equipment. Subject distance, sensor/crop and historical light/weather are not established; these ranges are not minimum gear requirements or matched-environment presets. No personal/photo GPS is exposed.</p>
        {photos.map((photo) => <figure key={photo.sourceUrl} className="rounded-xl bg-white p-2 break-words">
          <img src={photo.thumbnailUrl} alt={`Reference: ${photo.scientificName}`} loading="lazy" onError={imageUnavailable} className="h-40 w-full rounded-lg object-cover" />
          <PhotoCredit photo={photo} full />
          <PhotoMetadata exif={photo.exif} />
        </figure>)}
        <p className="text-[11px]">Retrieved {result.fetchedAt} (UTC). Each field uses only photographs that actually supply it.</p>
      </>}
    </div>
  </details>;
};
