import React, { useEffect, useRef, useState } from 'react';
import type { BirdSpecies } from '../types';
import { loadSpeciesPhoto, type SpeciesPhoto as Photo } from '../lib/discovery';
import { SessionExpiredError } from '../lib/auth';
import { PhotoMetadata } from './PhotoMetadata';

interface SpeciesPhotoProps {
  species: BirdSpecies;
  frameClassName: string;
  hero?: boolean;
  onSessionExpired?: () => void;
  children?: React.ReactNode;
}

export const PhotoCredit: React.FC<{ photo: Photo; full?: boolean }> = ({ photo, full = false }) => (
  <figcaption onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className="col-span-3 row-start-2 mt-1 text-[10px] leading-relaxed text-[#42493e] break-words">
    <span>Photo: {photo.author} • </span>
    <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="underline">{photo.license}</a>
    <span> • </span><a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline">Wikimedia Commons</a>
    {!full && <span> • cropped to fit</span>}
    {full && <><p>{photo.title} • Cropped to fit the display.</p>{photo.credit && <p>Credit: {photo.credit}</p>}{photo.attribution && <p>Attribution: {photo.attribution}</p>}{photo.usageTerms && <p>Usage terms: {photo.usageTerms}</p>}{photo.restrictions && <p>Source restrictions: {photo.restrictions}</p>}<a href={photo.matchUrl} target="_blank" rel="noreferrer" className="underline">Scientific-name match on Wikidata</a><p>Reference photograph; not evidence of a recent sighting or verified camera settings.</p></>}
    {!full && photo.attribution && <span> • {photo.attribution}</span>}
    {!full && photo.restrictions && <span> • {photo.restrictions}</span>}
  </figcaption>
);

export const SpeciesPhoto: React.FC<SpeciesPhotoProps> = ({ species, frameClassName, hero = false, onSessionExpired, children }) => {
  const frame = useRef<HTMLDivElement>(null);
  const expired = useRef(onSessionExpired);
  expired.current = onSessionExpired;
  const [visible, setVisible] = useState(hero);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (visible || !species.source || !frame.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [visible, species.source]);
  useEffect(() => {
    if (!species.source || !visible) return;
    const controller = new AbortController();
    setPhoto(null); setLoaded(false); setError(''); setBroken(false);
    loadSpeciesPhoto(species.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setPhoto(result.photo); setLoaded(true); }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) expired.current?.();
        else { setError(error.message || 'Photo unavailable.'); setLoaded(true); }
      }
    });
    return () => controller.abort();
  }, [species.id, species.source, visible, attempt]);
  const src = broken ? '/discovery-placeholder.svg' : photo?.thumbnailUrl || species.image;
  return (
    <figure className={hero ? '' : 'contents'}>
      <div ref={frame} className={frameClassName}>
        <img src={src} alt={species.source && (!photo || broken) ? `${!loaded && !broken ? 'Loading photo' : 'Photo unavailable'}: ${species.name}` : species.name} loading={hero ? 'eager' : 'lazy'} decoding="async" onError={() => setBroken(true)} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {children}
        {hero && species.source && <div className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium shadow-sm"><span className="w-2 h-2 shrink-0 rounded-full bg-[#fe932c]"></span><span>{photo?.exif?.status === 'available' ? 'Source EXIF available' : photo ? 'Source EXIF unavailable' : loaded ? 'Photo metadata unavailable' : 'Loading photo metadata...'}</span></div>}
      </div>
      {photo && <PhotoCredit photo={photo} full={hero} />}
      {hero && photo?.exif && <PhotoMetadata exif={photo.exif} />}
      {hero && species.source && !photo && <p role={error ? 'alert' : 'status'} className="mt-1 text-[12px] text-[#42493e]">{error || (loaded ? 'No matching photograph with supported licence and attribution is available.' : 'Loading species photograph...')}</p>}
      {broken && species.source && <p role="status" className="col-span-3 row-start-3 text-[11px] text-[#42493e]">Photo could not load. Reference and credit remain available.</p>}
      {hero && (error || broken) && <button type="button" onClick={() => { setBroken(false); setAttempt((prev) => prev + 1); }} className="mt-1 text-[12px] font-semibold text-[#154212] underline">Retry photo</button>}
    </figure>
  );
};
