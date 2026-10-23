import React, { useEffect, useRef, useState } from 'react';
import type { BirdSpecies, Hotspot, ScreenType, UserProfile } from '../types';
import { observations, type UploadedPhoto, type ObservationInput } from '../lib/observations';
import { SessionExpiredError } from '../lib/auth';
import { PhotoMetadata } from './PhotoMetadata';

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
  const [notes, setNotes] = useState('');
  const [visibility, setVisibility] = useState<ObservationInput['visibility']>('private');
  const [hideExactLocation, setHideExactLocation] = useState(true);
  const [uploaded, setUploaded] = useState<UploadedPhoto | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const pending = useRef<AbortController | null>(null),
    staged = useRef<string | null>(null),
    objectUrl = useRef('');
  const fileInput = useRef<HTMLInputElement>(null);
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
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof SessionExpiredError) onSessionExpired?.();
        else setError(failure instanceof Error ? failure.message : 'Photo upload failed.');
      }
    } finally {
      if (pending.current === controller) setBusy(false);
    }
  };
  const publish = async () => {
    if (!uploaded || !speciesId || !hotspotId || !observedAt) {
      setError('Choose a photograph, catalogue species, hotspot and observation date/time.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError('');
    try {
      await observations.publish(
        { mediaId: uploaded.id, speciesId, hotspotId, observedAt, notes, visibility, hideExactLocation },
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
      if (pending.current === controller) setBusy(false);
    }
  };
  const matches = speciesList
    .filter((bird) =>
      [bird.name, bird.scientificName].some((value) =>
        value.toLowerCase().includes(speciesQuery.toLowerCase().trim()),
      ),
    )
    .slice(0, 50);
  const selected = speciesList.find((bird) => bird.id === speciesId);
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
            disabled={published}
            onChange={(event) => {
              setSpeciesQuery(event.target.value);
              setSpeciesId('');
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
            disabled={published}
            onChange={(event) => setSpeciesId(event.target.value)}
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
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="bg-[#f1f4f9] p-3 rounded-xl text-[12px] font-bold">
            Location
            <select
              aria-label="Observation hotspot"
              value={hotspotId}
              disabled={published}
              onChange={(event) => setHotspotId(event.target.value)}
              className="block mt-2 w-full min-h-11 rounded-lg bg-white p-2 text-[13px] font-normal"
            >
              <option value="">Choose a hotspot</option>
              {hotspots.map((hotspot) => (
                <option key={hotspot.id} value={hotspot.id}>
                  {hotspot.name}
                </option>
              ))}
            </select>
          </label>
          <label className="bg-[#f1f4f9] p-3 rounded-xl text-[12px] font-bold">
            Date &amp; Time
            <input
              aria-label="Observation date and time"
              type="datetime-local"
              value={observedAt}
              disabled={published}
              onChange={(event) => setObservedAt(event.target.value)}
              className="block mt-2 w-full min-h-11 min-w-0 rounded-lg bg-white p-2 text-[13px] font-normal"
            />
          </label>
        </div>
        <p className="text-[11px] text-[#42493e]">
          Enter local observation time. A camera clock/timezone is not independently verified. The selected
          hotspot is not proof of where the photo was captured.
        </p>
      </section>
      <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <h3 className="text-[13px] font-bold mb-2">Camera &amp; Lens — source metadata</h3>
        {uploaded ? (
          <>
            <PhotoMetadata exif={uploaded.exif} />
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
      <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4">
        <h3 className="text-[13px] font-bold">Conditions</h3>
        <p className="text-[12px] mt-2">
          Historical weather is unverified. Current forecasts are not attached to your past photograph.
        </p>
      </section>
      <label className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4 text-[13px] font-bold">
        Field Notes
        <textarea
          aria-label="Field notes"
          value={notes}
          maxLength={3000}
          disabled={published}
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
            disabled={published}
            onClick={() => setHideExactLocation((value) => !value)}
            className={`min-h-11 px-3 rounded-xl text-[12px] font-semibold ${hideExactLocation ? 'bg-[#2d5a27] text-white' : 'bg-white'}`}
          >
            {hideExactLocation ? 'Hidden' : 'Generalized'}
          </button>
        </div>
        <p className="text-[11px] mt-2">
          Exact EXIF coordinates are private to you. Shared records use only the selected hotspot; image
          metadata is removed. This protection currently applies to every species, without claiming a reviewed
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
              disabled={published}
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
          disabled={busy || !uploaded}
          onClick={() => void publish()}
          className="w-full min-h-12 rounded-xl bg-[#154212] text-white font-bold disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'POST OBSERVATION'}
        </button>
      )}
    </div>
  );
};
