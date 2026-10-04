import React from 'react';
import type { HotspotWeather } from '../lib/discovery';

interface HotspotWeatherPanelProps {
  weather?: HotspotWeather;
  error?: string;
  onRetry?: () => void;
}

const measurement = (value: number | null, unit: string) => value === null ? 'Unavailable' : `${value}${unit}`;
const clock = (time: string | null) => time ? time.slice(11, 16) : 'Unavailable';

export const HotspotWeatherPanel: React.FC<HotspotWeatherPanelProps> = ({ weather, error, onRetry }) => {
  if (error) return <div role="alert" className="text-[12px] text-[#42493e]"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold text-[#154212] underline">Retry weather</button></div>;
  if (!weather) return <p role="status" className="text-[12px] text-[#42493e]">Loading hotspot weather...</p>;
  const { current } = weather;
  return (
    <div className="space-y-3 text-[12px] text-[#42493e]">
      <p>Forecast for this hotspot • {weather.timezone}. Model time: {current.time.replace('T', ' ')}. Not a reading from an on-site weather station.</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['Temperature', measurement(current.temperatureC, '°C')], ['Wind speed', measurement(current.windKmh, ' km/h')],
          ['Humidity', measurement(current.humidityPercent, '%')], ['Precipitation', measurement(current.precipitationMm, ' mm')],
          ['Cloud cover', measurement(current.cloudCoverPercent, '%')], ['Conditions', current.condition],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f1f4f9] p-2.5"><p className="text-[10px] font-semibold">{label}</p><p className="text-[14px] font-bold text-[#181c20]">{value}</p></div>)}
      </div>
      {weather.days.map((day) => <div key={day.date} className="rounded-xl bg-[#f1f4f9] p-2.5"><p className="font-semibold text-[#181c20]">{day.date}</p><p>Sunrise: {clock(day.sunrise)} • Sunset: {clock(day.sunset)}</p></div>)}
      <div className="overflow-x-auto">
        <p className="mb-1 font-semibold text-[#181c20]">Next hourly forecasts (up to 6 hours)</p>
        {weather.hourly.length ? <table className="w-full text-left text-[11px]"><thead><tr><th className="py-1">Local time</th><th>Temp</th><th>Rain chance</th><th>Wind</th></tr></thead><tbody>{weather.hourly.slice(0, 6).map((row) => <tr key={row.time} className="border-t border-[#e0e3e8]"><td className="py-1.5">{row.time.slice(5).replace('T', ' ')}</td><td>{measurement(row.temperatureC, '°C')}</td><td>{measurement(row.rainProbability, '%')}</td><td>{measurement(row.windKmh, ' km/h')}</td></tr>)}</tbody></table> : <p>No upcoming hourly forecast available.</p>}
      </div>
      <div className="rounded-xl bg-[#f1f4f9] p-2.5 space-y-1">
        <p className="font-semibold text-[#181c20]">Photography planning tips</p>
        <p>Use the first hour after sunrise or last hour before sunset as approximate light windows. Cloud, terrain and site access can change the light; these are general planning rules, not calculated golden-hour boundaries.</p>
        {(current.windKmh !== null && current.windKmh >= 20) && <p>Wind is elevated: stabilize long lenses and allow for moving branches.</p>}
        {(current.precipitationMm !== null && current.precipitationMm > 0) && <p>Precipitation is forecast for the current interval: pack a rain cover and check upcoming rain chances.</p>}
        {(current.cloudCoverPercent !== null && current.cloudCoverPercent >= 80) && <p>Heavy cloud may soften light; be ready to raise ISO if shutter speed drops.</p>}
        <p>These tips do not predict bird activity or prescribe camera settings. Confirm opening hours and access locally before travelling.</p>
      </div>
      <p><a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo</a> • <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Display adapted for trip planning. Retrieved {weather.fetchedAt} (UTC){weather.cached ? ' • cached' : ''}.</p>
    </div>
  );
};
