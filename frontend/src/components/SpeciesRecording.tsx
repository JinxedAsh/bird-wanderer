import React, { useEffect, useRef, useState } from 'react';
import { loadSpeciesRecording, type SpeciesRecordingData } from '../lib/discovery';
import { SessionExpiredError } from '../lib/auth';

export const SpeciesRecording: React.FC<{ speciesId?: string; onSessionExpired?: () => void }> = ({ speciesId, onSessionExpired }) => {
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<SpeciesRecordingData>();
  const [error, setError] = useState('');
  const [playbackError, setPlaybackError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const expired = useRef(onSessionExpired);
  expired.current = onSessionExpired;
  useEffect(() => {
    if (!requested || !speciesId) return;
    const controller = new AbortController();
    setData(undefined); setError(''); setPlaybackError(false);
    loadSpeciesRecording(speciesId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (error instanceof SessionExpiredError) expired.current?.();
      else setError(error.message || 'Recording unavailable.');
    });
    return () => controller.abort();
  }, [requested, speciesId, attempt]);
  useEffect(() => {
    const pauseHidden = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => document.removeEventListener('visibilitychange', pauseHidden);
  }, []);
  const recording = data && data.speciesId === speciesId ? data.recording : undefined;
  useEffect(() => {
    const player = audio.current;
    return () => { player?.pause(); };
  }, [recording?.audioUrl, attempt]);
  return <details id="species-recording" tabIndex={-1} onToggle={(event) => {
    if (event.currentTarget.open) setRequested(true);
    else audio.current?.pause();
  }} className="mt-3.5 scroll-mt-20 rounded-xl bg-[#f1f4f9] p-3 text-[13px] leading-relaxed text-[#42493e] break-words">
    <summary className="cursor-pointer font-semibold text-[#181c20]">Recorded calls</summary>
    <div className="mt-3 space-y-3">
      <p>Reference listening only. Avoid playback near wild birds; it can disturb them. A linked recording is not a guarantee of field identification.</p>
      {!speciesId ? <p>Recordings require an external catalogue species.</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="min-h-11 font-semibold underline">Retry recording</button></div>
        : !data ? <p role="status">Loading sourced recording...</p> : !recording ? <p>No supported licensed recording is linked to this exact species.</p> : <>
          <audio key={`${speciesId}-${attempt}`} ref={audio} controls preload="none" src={recording.audioUrl} className="w-full max-w-full" aria-label="Species reference recording" onError={() => setPlaybackError(true)} />
          {playbackError && <div role="alert"><p>This recording could not be played. Your browser may not support its format, or the media provider may be unavailable.</p><button type="button" onClick={() => { setPlaybackError(false); audio.current?.load(); }} className="min-h-11 underline">Retry playback</button></div>}
          <p>{recording.title} — {recording.author}. {recording.credit} {recording.attribution} {recording.restrictions}</p>
          <p><a href={recording.sourceUrl} target="_blank" rel="noreferrer" className="underline">Commons source</a> • <a href={recording.licenseUrl} target="_blank" rel="noreferrer" className="underline">{recording.license}</a> • <a href={recording.matchUrl} target="_blank" rel="noreferrer" className="underline">Exact-species link</a></p>
          <p className="text-[11px]">Retrieved {data.fetchedAt} (UTC){data.cached ? ' • cached' : ''}. Audio streams from Wikimedia when you play it. No simulated waveform or estimated call length is shown.</p>
        </>}
    </div>
  </details>;
};
