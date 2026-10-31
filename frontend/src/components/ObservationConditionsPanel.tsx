import React, { useEffect, useRef, useState } from 'react';
import { observations, type ObservationConditions } from '../lib/observations';
import { SessionExpiredError } from '../lib/auth';

export interface ConditionsSelection { key: string; conditionsId: string; conditions: ObservationConditions }
export const conditionsKey = (point: { latitude: number; longitude: number } | null, observedAt: string, utcOffset: string) => point && observedAt ? JSON.stringify([Math.round(point.latitude * 10) / 10, Math.round(point.longitude * 10) / 10, observedAt, utcOffset]) : '';
export function ObservationConditionsPanel({ point, observedAt, utcOffset, disabled, onChange, onSessionExpired }: {
  point: { latitude: number; longitude: number } | null; observedAt: string; utcOffset: string; disabled?: boolean;
  onChange: (value: ConditionsSelection | null) => void; onSessionExpired?: () => void;
}) {
  const key = conditionsKey(point, observedAt, utcOffset);
  const [result, setResult] = useState<ConditionsSelection | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [attempt, setAttempt] = useState(0), [skipped, setSkipped] = useState(false);
  const callbacks = useRef({ onChange, onSessionExpired }); callbacks.current = { onChange, onSessionExpired };
  useEffect(() => {
    const controller = new AbortController();
    if (disabled) return () => controller.abort();
    setResult(null); setError(''); setLoading(false); callbacks.current.onChange(null);
    if (!key || !point || skipped) return () => controller.abort();
    setLoading(true);
    const timer = setTimeout(() => {
      void observations.conditions(point, observedAt, utcOffset, controller.signal).then(data => {
        if (!controller.signal.aborted) { const value = { ...data, key }; setResult(value); callbacks.current.onChange(value); }
      }).catch(failure => { if (!controller.signal.aborted) { if (failure instanceof SessionExpiredError) callbacks.current.onSessionExpired?.(); setError(failure instanceof Error ? failure.message : 'Conditions unavailable.'); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, attempt, skipped, disabled]);
  const data = result?.key === key ? result.conditions : null;
  return <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4 space-y-2 text-[12px]">
    <h3 className="text-[13px] font-bold">Conditions — historical estimate</h3>
    <p>Only coordinates rounded to 0.1° (roughly 11 km latitude), date and time are sent to Open-Meteo. No photograph or account identity is sent. Weather models are not verified measurements at your camera.</p>
    {!key && <p>Choose a location and observation date/time to look up conditions.</p>}
    {key && loading && <p role="status">Loading conditions for the selected place and time… You can save without them.</p>}
    {error && <p role="alert">{error}</p>}
    {data && <div role="status" className="space-y-1"><p>{data.temperatureC ?? 'Unavailable'}°C · wind {data.windKmh ?? 'Unavailable'} km/h · rain {data.precipitationMm ?? 'Unavailable'} mm · cloud {data.cloudCoverPercent ?? 'Unavailable'}% · humidity {data.humidityPercent ?? 'Unavailable'}%</p><p>{data.model} · hour {data.matchedTime} ({data.timezone}). {data.timeBasis}. Retrieved {data.fetchedAt}.</p><a href={data.sourceUrl} target="_blank" rel="noreferrer" className="underline">Open-Meteo · CC BY 4.0 · source and methodology</a></div>}
    {skipped && <p role="status">Conditions omitted. You can save the observation without weather.</p>}
    {key && !disabled && <div className="flex flex-wrap gap-x-4"><button type="button" className="min-h-11 underline" onClick={() => { setSkipped(false); setAttempt(value => value + 1); }}>Retry conditions</button><button type="button" className="min-h-11 underline" onClick={() => { setSkipped(true); callbacks.current.onChange(null); }}>Save without conditions</button></div>}
  </section>;
}
