import React, { useEffect, useRef, useState } from 'react';
import { observations, type Observation } from '../lib/observations';
import { SessionExpiredError } from '../lib/auth';
import { useDialogFocus } from '../lib/useDialogFocus';
import type { BirdSpecies, Hotspot } from '../types';

type Draft = Pick<
  Observation,
  'speciesId' | 'observedAt' | 'notes' | 'visibility'
> & { hotspotId: string };
const fields = [
  'speciesId',
  'hotspotId',
  'observedAt',
  'notes',
  'visibility',
] as const;

export function EditObservationSheet({
  id,
  speciesList,
  hotspots,
  onClose,
  onSaved,
  onSessionExpired,
  showToast,
}: {
  id: string;
  speciesList: BirdSpecies[];
  hotspots: Hotspot[];
  onClose: () => void;
  onSaved: () => void;
  onSessionExpired?: () => void;
  showToast: (message: string) => void;
}) {
  const [record, setRecord] = useState<Observation | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [speciesQuery, setSpeciesQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const request = useRef<AbortController | null>(null),
    pending = useRef(false);
  const close = () => {
    if (!pending.current) onClose();
  };
  const dialog = useDialogFocus(true, close);
  const fail = (failure: unknown, signal: AbortSignal) => {
    if (signal.aborted) return;
    if (failure instanceof SessionExpiredError) onSessionExpired?.();
    else
      setError(
        failure instanceof Error
          ? failure.message
          : 'The record could not be saved. Your draft is kept.',
      );
  };
  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    void observations
      .get(id, controller.signal)
      .then((row) => {
        if (controller.signal.aborted) return;
        if (!row.isOwner)
          throw new Error('Only your own observations can be edited.');
        setRecord(row);
        setDraft({
          speciesId: row.speciesId,
          hotspotId: row.hotspotId || '',
          observedAt: row.observedAt,
          notes: row.notes,
          visibility: row.visibility,
        });
        setSpeciesQuery(row.speciesName);
      })
      .catch((failure) => fail(failure, controller.signal))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);
  const matches = speciesList
    .filter((bird) =>
      [bird.name, bird.scientificName].some((value) =>
        value.toLowerCase().includes(speciesQuery.toLowerCase().trim()),
      ),
    )
    .slice(0, 60);
  const dirty =
    !!draft && !!record && fields.some((key) => draft[key] !== record[key]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const controller = request.current;
    if (
      !controller ||
      controller.signal.aborted ||
      !record ||
      !draft ||
      pending.current ||
      !dirty
    )
      return;
    const changes: Record<string, unknown> = {};
    for (const key of fields)
      if (draft[key] !== record[key]) changes[key] = draft[key];
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await observations.update(id, changes, controller.signal);
      if (controller.signal.aborted) return;
      showToast('Observation changes saved');
      onSaved();
      onClose();
    } catch (failure) {
      fail(failure, controller.signal);
    } finally {
      pending.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-2 sm:p-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Edit observation"
        tabIndex={-1}
        className="w-full max-w-md max-h-[88dvh] overflow-y-auto rounded-2xl bg-white p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Edit observation</h2>
          <button
            type="button"
            disabled={busy}
            onClick={close}
            aria-label="Close observation editor"
            className="min-h-11 min-w-11"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-[#42493e]">
          Change your reported details and privacy. The photograph, extracted
          EXIF and original publication date are preserved. Identification and
          capture timezone remain unverified.
        </p>
        {loading && <p role="status">Loading your record…</p>}
        {error && (
          <div role="alert" className="rounded-xl bg-orange-50 p-3 text-sm">
            {error}
            {!record && (
              <button
                type="button"
                className="block min-h-11 underline"
                onClick={() => setAttempt((n) => n + 1)}
              >
                Retry loading record
              </button>
            )}
          </div>
        )}
        {record && draft && (
          <form onSubmit={save} className="space-y-3">
            <fieldset disabled={busy} className="space-y-3">
              <label className="block text-sm">
                Find species
                <input
                  aria-label="Find replacement species"
                  value={speciesQuery}
                  onChange={(event) => {
                    setSpeciesQuery(event.target.value);
                    setDraft({ ...draft, speciesId: '' });
                  }}
                  className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2"
                />
              </label>
              <label className="block text-sm">
                Species
                <select
                  aria-label="Edited observation species"
                  required
                  value={draft.speciesId}
                  onChange={(event) =>
                    setDraft({ ...draft, speciesId: event.target.value })
                  }
                  className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2"
                >
                  <option value="">Choose a matching species</option>
                  {!matches.some((bird) => bird.id === record.speciesId) && (
                    <option value={record.speciesId}>
                      Current: {record.speciesName}
                    </option>
                  )}
                  {matches.map((bird) => (
                    <option key={bird.id} value={bird.id}>
                      {bird.name} — {bird.scientificName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Hotspot
                <select
                  aria-label="Edited observation hotspot"
                  required
                  value={draft.hotspotId}
                  onChange={(event) =>
                    setDraft({ ...draft, hotspotId: event.target.value })
                  }
                  className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2"
                >
                  {!hotspots.some((site) => site.id === record.hotspotId) && (
                    <option value={record.hotspotId || ''}>
                      Current: {record.location}
                    </option>
                  )}
                  {hotspots.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Reported local date/time
                <input
                  aria-label="Edited observation date and time"
                  type="datetime-local"
                  required
                  value={draft.observedAt}
                  onChange={(event) =>
                    setDraft({ ...draft, observedAt: event.target.value })
                  }
                  className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2"
                />
              </label>
              <label className="block text-sm">
                Visibility
                <select
                  aria-label="Edited observation visibility"
                  value={draft.visibility}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      visibility: event.target.value as Draft['visibility'],
                    })
                  }
                  className="block w-full min-h-11 rounded-lg bg-[#f1f4f9] p-2"
                >
                  <option value="private">Private</option>
                  <option value="followers">Followers</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <p className="text-xs text-[#42493e]">
                Your profile privacy can further restrict visibility. Exact
                embedded coordinates are never published. Avoid typing private
                coordinates in shared notes.
              </p>
              <label className="block text-sm">
                Field notes
                <textarea
                  aria-label="Edited observation notes"
                  maxLength={3000}
                  rows={4}
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                  className="block w-full rounded-lg bg-[#f1f4f9] p-2"
                />
              </label>
            </fieldset>
            <div className="flex gap-2">
              <button
                disabled={
                  busy || !dirty || !draft.speciesId || !draft.hotspotId
                }
                className="min-h-11 flex-1 rounded-xl bg-[#154212] px-3 text-white disabled:opacity-50"
                type="submit"
              >
                {busy ? 'Saving…' : 'Save observation changes'}
              </button>
              <button
                disabled={busy}
                className="min-h-11 rounded-xl bg-[#ebeef3] px-3"
                type="button"
                onClick={close}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
