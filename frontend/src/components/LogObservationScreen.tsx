import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BirdSpecies, Hotspot, ScreenType, UserProfile } from '../types';
import { observations, type UploadedPhoto, type ObservationInput } from '../lib/observations';
import { SessionExpiredError } from '../lib/auth';
import { PhotoMetadata } from './PhotoMetadata';
import { speciesMatches, exifObservationTime, type ObservationPoint } from '../lib/observation-form';
import { ObservationLocationFields } from './ObservationLocationFields';
import { ObservationConditionsPanel, conditionsKey, type ConditionsSelection } from './ObservationConditionsPanel';

interface LogObservationScreenProps {
  initialSpecies?: BirdSpecies;
  speciesList: BirdSpecies[];
  hotspots: Hotspot[];
  userProfile: UserProfile;
  onPostObservation: () => void;
  onSessionExpired?: () => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}
export const LogObservationScreen: React.FC<LogObservationScreenProps> = ({
  initialSpecies,
  speciesList,
  hotspots,
  onPostObservation,
  onSessionExpired,
  onNavigate,
  showToast,
}) => {
  const [speciesQuery, setSpeciesQuery] = useState(initialSpecies?.source ? initialSpecies.name : '');
  const [speciesId, setSpeciesId] = useState(initialSpecies?.source ? initialSpecies.id : '');
  const [hotspotId, setHotspotId] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [point, setPoint] = useState<ObservationPoint | null>(null);
  const [utcOffset, setUtcOffset] = useState('');
  const [dateSource, setDateSource] = useState('Enter the observation time or use photo EXIF when present.');
  const [conditions, setConditions] = useState<ConditionsSelection | null>(null);
  const dateEdited = useRef(false), locationEdited = useRef(false);
  const [locationReset, setLocationReset] = useState(0);
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<ObservationInput['visibility']>('private');
  const [hideExactLocation, setHideExactLocation] = useState(true);
  const [uploaded, setUploaded] = useState<UploadedPhoto | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const pending = useRef<AbortController | null>(null),
    staged = useRef<string | null>(null),
    objectUrl = useRef('');
  const fileInput = useRef<HTMLInputElement>(null);
  const applyExif = (media: UploadedPhoto, force = false) => {
    const time = exifObservationTime(media.exif);
    if (force || !dateEdited.current) {
      setObservedAt(time); setUtcOffset(time ? media.exif.utcOffset || '' : ''); dateEdited.current = false;
      setDateSource(time ? 'Autofilled from the photo EXIF camera clock; confirm or edit it.' : 'No valid capture date in this photo. Enter it manually.');
    }
    if (force || !locationEdited.current) {
      setHotspotId(''); setPoint(media.privateLocation ? { ...media.privateLocation, label: '', source: 'exif' } : null); locationEdited.current = false;
      if (force) setLocationReset(value => value + 1);
    }

  };
  const removeStaged = (id: string | null) => {
    if (id) void observations.removeUpload(id, new AbortController().signal).catch(() => {});
  };
  useEffect(
    () => () => {
      pending.current?.abort();
      removeStaged(staged.current);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  const choosePhoto = async (file?: File) => {
    if (!file) return;
    pending.current?.abort();
    removeStaged(staged.current);
    staged.current = null;
    setUploaded(null);
    setConditions(null);

    if (!dateEdited.current) { setObservedAt(''); setUtcOffset(''); }
    if (!locationEdited.current) { setPoint(null); setHotspotId(''); setLocationReset(value => value + 1); }
    setError('');
    setBusy(false);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
    setPreview('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024 || file.size === 0) {
      setError('Choose a JPEG/PNG photograph up to 10 MB.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    objectUrl.current = URL.createObjectURL(file);
    setPreview(objectUrl.current);
    try {
      const media = await observations.upload(file, controller.signal);
      if (controller.signal.aborted) return;
      staged.current = media.id;
      setUploaded(media);
      applyExif(media);
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof SessionExpiredError) onSessionExpired?.();
        else setError(failure instanceof Error ? failure.message : 'Photo upload failed.');
      }
    } finally {
      if (pending.current === controller) setBusy(false);
    }
  };
  // Conditions are reusable only for the same rounded point, date and offset.
  // Label-only edits must not discard a still-visible matching snapshot.
  const publish = async () => {
    if (saving || published) return;
    if (!uploaded || !speciesId || (!hotspotId && !point) || !observedAt) {
      setError('Choose a photograph, catalogue species, location and observation date/time.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setSaving(true);
    setBusy(true);
    setError('');
    try {
      await observations.publish(
        { mediaId: uploaded.id, speciesId, hotspotId, customLocation: point, observedAt, utcOffset: utcOffset || null, conditionsId: conditions?.key === conditionsKey(weatherPoint, observedAt, utcOffset) ? conditions.conditionsId : null, notes, visibility, hideExactLocation },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      staged.current = null;
      setPublished(true);
      onPostObservation();
      showToast('Observation saved to your journal. Visibility rules apply.');
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof SessionExpiredError) onSessionExpired?.();
        else setError(failure instanceof Error ? failure.message : 'Could not save the observation.');
      }
    } finally {
      setSaving(false);
      if (pending.current === controller) setBusy(false);
    }
  };
  const search = useMemo(() => speciesMatches(speciesList, speciesQuery, speciesId), [speciesList, speciesQuery, speciesId]);
  const matches = search.choices;
  const selected = speciesList.find((bird) => bird.id === speciesId);
  const site = hotspots.find(hotspot => hotspot.id === hotspotId);
  const weatherPoint = point || (typeof site?.latitude === 'number' && typeof site.longitude === 'number' ? { latitude: site.latitude, longitude: site.longitude } : null);
  return (
    <div className="flex flex-col w-full px-4 pb-28 pt-2">
      <div className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-[#ebeef3] aspect-[4/3] mb-4">
        <img
          src={preview || '/discovery-placeholder.svg'}
          alt={preview ? 'Your selected photograph' : 'Choose your photograph'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 max-w-[80%] px-2.5 py-1.5 rounded-full bg-white/90 text-[#154212] text-[12px] font-semibold">
          {busy
            ? 'Processing…'
            : uploaded
              ? uploaded.exif.status === 'available'
                ? 'Source EXIF read'
                : 'EXIF unavailable'
              : 'Choose a photograph'}
        </span>
        <button
          type="button"
          disabled={busy || published}
          onClick={() => fileInput.current?.click()}
          className="absolute bottom-3 right-3 min-h-11 px-3 rounded-xl bg-white text-[#181c20] text-[12px] font-semibold"
        >
          {preview ? 'Change photo' : 'Add photograph'}
        </button>
        <input
          ref={fileInput}
          aria-label="Choose photograph"
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          onChange={(event) => {
            void choosePhoto(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <span className="absolute bottom-3 left-3 max-w-[55%] text-white text-[16px] font-bold">
          {selected?.name || 'Select species below'}
        </span>
      </div>
      <p className="text-[11px] text-[#42493e] mb-4">
        JPEG/PNG, up to 10 MB and 40 megapixels. Stored copy is metadata-free JPEG, up to 4096px. Original
        file is not retained. Species identification is your selection, not automatic verification.
      </p>
      <section className="space-y-3 mb-4">
        <h2 className="text-[18px] font-bold text-[#181c20]">Field Identification</h2>
        <div className="bg-[#f1f4f9] p-3 rounded-xl space-y-2">
          <label className="block text-[12px] font-bold" htmlFor="observation-species-search">
            Find bird species
          </label>
          <input
            id="observation-species-search"
            value={speciesQuery}
            disabled={published || saving}
            onChange={(event) => {
              setSpeciesQuery(event.target.value);
              setSpeciesId(speciesMatches(speciesList, event.target.value).exactId);
            }}
            placeholder="Common or scientific name"
            className="w-full min-h-11 rounded-lg bg-white p-3 text-[13px]"
          />
          <label className="block text-[12px] font-bold" htmlFor="observation-species">
            Bird Species
          </label>
          <select
            id="observation-species"
            value={speciesId}
            disabled={published || saving}
            onChange={(event) => { setSpeciesId(event.target.value); const bird = speciesList.find(value => value.id === event.target.value); if (bird) setSpeciesQuery(bird.name); }}
            className="w-full min-h-11 rounded-lg bg-white p-2 text-[13px]"
          >
            <option value="">Choose a matching species</option>
            {matches.map((bird) => (
              <option key={bird.id} value={bird.id}>
                {bird.name} — {bird.scientificName}
              </option>
            ))}
          </select>
          {!matches.length && <p className="text-[12px]">No matching species in the loaded catalogue.</p>}
          <p className="text-[11px]">{selected ? `Selected: ${selected.name} (${selected.scientificName})` : `${search.total} catalogue matches. Type a common or scientific name, then choose a result. Only the first 50 matches are listed.`}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ObservationLocationFields resetKey={locationReset} hotspots={hotspots} hotspotId={hotspotId} point={point} disabled={published || saving} onChange={(id, next) => { locationEdited.current = true; setHotspotId(id); setPoint(next);  }} />
          <label className="bg-[#f1f4f9] p-3 rounded-xl text-[12px] font-bold">
            Date &amp; Time
            <input
              aria-label="Observation date and time"
              type="datetime-local"
              value={observedAt}
              disabled={published || saving}
              onChange={(event) => { dateEdited.current = true; setObservedAt(event.target.value); setUtcOffset(''); setDateSource('Manually entered local clock; timezone unverified.');  }}
              className="block mt-2 w-full min-h-11 min-w-0 rounded-lg bg-white p-2 text-[13px] font-normal"
            />
          </label>
        </div>
        <p className="text-[11px] text-[#42493e]">
          {dateSource} A camera clock/timezone is not independently verified. A selected hotspot is not proof of where the photo was captured.
        </p>
        <label className="block text-[12px]">UTC offset (optional, such as +05:30)<input aria-label="Observation UTC offset" value={utcOffset} disabled={published || saving} maxLength={6} onChange={event => { dateEdited.current = true; setUtcOffset(event.target.value);  }} className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2" /></label>
        {uploaded && !published && <button type="button" className="min-h-11 underline text-[12px]" disabled={saving} onClick={() => applyExif(uploaded, true)}>Use photo EXIF date and GPS again (replaces manual entries)</button>}
      </section>
      <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <h3 className="text-[13px] font-bold mb-2">Camera &amp; Lens — source metadata</h3>
        {uploaded ? (
          <>
            <PhotoMetadata exif={uploaded.exif} source="upload" />
            {uploaded.metadataError && (
              <p role="status" className="text-[12px]">
                Image is valid, but camera metadata could not be read.
              </p>
            )}
          </>
        ) : (
          <p className="text-[12px]">
            Choose a photograph to read its actual EXIF. Missing settings will not be filled in.
          </p>
        )}
      </section>
      <ObservationConditionsPanel key={uploaded?.id || 'draft'} point={weatherPoint} observedAt={observedAt} utcOffset={utcOffset} disabled={published || saving} onChange={setConditions} onSessionExpired={onSessionExpired} />
      <label className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4 text-[13px] font-bold">
        Field Notes
        <textarea
          aria-label="Field notes"
          value={notes}
          maxLength={3000}
          disabled={published || saving}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Describe what you observed. Avoid private coordinates in public notes."
          rows={4}
          className="block w-full mt-2 rounded-lg bg-white p-3 text-[13px] font-normal"
        />
      </label>
      <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold">Location Privacy</h3>
          <button
            type="button"
            role="switch"
            aria-label="Hide exact location"
            aria-checked={hideExactLocation}
            disabled={published || saving}
            onClick={() => setHideExactLocation((value) => !value)}
            className={`min-h-11 px-3 rounded-xl text-[12px] font-semibold ${hideExactLocation ? 'bg-[#2d5a27] text-white' : 'bg-white'}`}
          >
            {hideExactLocation ? 'Hidden' : 'Generalized'}
          </button>
        </div>
        <p className="text-[11px] mt-2">
          Exact EXIF and chosen coordinates are private to you. Hidden custom locations also withhold conditions; generalized custom areas use 0.1-degree rounding. Custom labels stay private. Image metadata is removed. This protection currently applies to every species, without claiming a reviewed
          endangered-species classification.
        </p>
      </section>
      <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <h3 className="text-[15px] font-bold mb-2">Post visibility</h3>
        <div className="flex gap-2">
          {(['public', 'followers', 'private'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={published || saving}
              aria-pressed={visibility === mode}
              onClick={() => setVisibility(mode)}
              className={`flex-1 min-h-11 rounded-xl text-[12px] font-semibold capitalize ${visibility === mode ? 'bg-[#2d5a27] text-white' : 'bg-white'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-[11px] mt-2">
          Private stays in your journal. Followers requires a stored follow relationship. Public follows your
          profile visibility too.
        </p>
      </section>
      {error && (
        <p role="alert" className="mb-3 text-[13px] text-red-700">
          {error}
        </p>
      )}
      {published ? (
        <div role="status" className="rounded-xl p-4 bg-[#2d5a27] text-white">
          <p>Observation saved with {visibility} visibility.</p>
          <button type="button" onClick={() => onNavigate('journal')} className="min-h-11 underline">
            View Journal
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !uploaded || saving}
          onClick={() => void publish()}
          className="w-full min-h-12 rounded-xl bg-[#154212] text-white font-bold disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'POST OBSERVATION'}
        </button>
      )}
    </div>
  );
};
