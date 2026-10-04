import React, { useState } from 'react';
import type { PhotoLoadState } from './SpeciesPhoto';
import { formatExifNumber, formatShutter } from './PhotoMetadata';

interface PhotoPlanningProps {
  speciesId: string;
  region?: string;
  speciesName?: string;
  state: PhotoLoadState;
  onChooseHotspot: () => void;
}

export function seasonalChartUrl(region?: string) {
  return region && /^[A-Z]{2}(?:-[A-Z0-9]{1,8}){0,2}$/.test(region) ? `https://ebird.org/barchart?r=${encodeURIComponent(region)}` : null;
}

// Exposure comparison only: same scene light and aperture, no field prediction.
export function equivalentIso(iso: number | null, referenceSeconds: number | null, targetSeconds: number) {
  if (iso === null || referenceSeconds === null || !Number.isFinite(iso) || !Number.isFinite(referenceSeconds) || !Number.isFinite(targetSeconds) || iso <= 0 || referenceSeconds <= 0 || targetSeconds <= 0) return null;
  const value = iso * referenceSeconds / targetSeconds;
  return Number.isFinite(value) && value >= 1 && value <= 1000000 ? Math.round(value) : null;
}

export const PhotoPlanning: React.FC<PhotoPlanningProps> = ({ speciesId, region, speciesName, state, onChooseHotspot }) => {
  const [motion, setMotion] = useState<'perched' | 'flight'>('perched');
  const [target, setTarget] = useState('');
  const chartUrl = seasonalChartUrl(region);
  // Never use a previous species' reference while the current photo is loading.
  const current = state.speciesId === speciesId ? state : null;
  const photo = current && !current.loading && !current.error ? current.photo : null;
  const exif = photo?.exif;
  const settings = exif ? [
    exif.exposureSeconds === null ? null : formatShutter(exif.exposureSeconds),
    exif.aperture === null ? null : `f/${formatExifNumber(exif.aperture)}`,
    exif.iso === null ? null : `ISO ${formatExifNumber(exif.iso)}`,
    exif.focalLengthMm === null ? null : `${formatExifNumber(exif.focalLengthMm)} mm`,
  ].filter(Boolean) : [];
  const comparison = exif && target ? equivalentIso(exif.iso, exif.exposureSeconds, 1 / Number(target)) : null;
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-[#42493e]">
      <div>
        <p className="font-semibold text-[#181c20]">Source-photo example</p>
        {!current || current.loading ? <p role="status">Loading this species' photo evidence...</p>
          : current.error ? <p>Photo evidence could not load. Use Retry photo above; general planning remains available.</p>
          : settings.length ? <>
            <p>{settings.join(' • ')}</p>
            <p className="text-[11px]">One reference photo, not a typical range or recommended preset. Missing settings are not estimated. Current light, subject motion, distance and sensor/crop may differ.</p>
            <a href={photo!.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#154212] underline">Check this example on Wikimedia Commons</a>
          </> : <p>No exposure or focal-length evidence is available for this reference. No species-specific settings or equipment requirement can be inferred.</p>}
      </div>
      {settings.length > 0 && exif && <div>
        <p className="font-semibold text-[#181c20]">Use the example to prepare</p>
        {exif.exposureSeconds !== null && <p>{exif.exposureSeconds > 0.001 ? 'The reference exposure may be too slow for fast flight. For moving birds, test a faster shutter and check motion blur.' : 'The reference uses a short exposure. Still test your shutter against the bird’s motion and the available light.'}</p>}
        {exif.focalLengthMm !== null && <p>The reference used {formatExifNumber(exif.focalLengthMm)} mm{exif.lens ? ` with ${exif.lens}` : ''}. Compare reach with your own telephoto or zoom; distance and sensor/crop are unknown, so this is not a minimum lens requirement.</p>}
        {exif.aperture !== null && <p>The recorded f/{formatExifNumber(exif.aperture)} is an example to compare, not a fixed target. Check focus and depth of field in your test shots.</p>}
      </div>}
      <details className="rounded-xl bg-[#f1f4f9] p-3">
        <summary className="cursor-pointer font-semibold text-[#181c20]">Prepare for subject motion</summary>
        <div className="mt-2 space-y-2">
          <label className="block">Planned shot
            <select value={motion} onChange={(event) => setMotion(event.target.value as 'perched' | 'flight')} className="mt-1 block w-full rounded-lg border border-[#c1c9be] bg-white p-2 text-[#181c20]">
              <option value="perched">Perched / mostly stationary</option><option value="flight">Flight / fast movement</option>
            </select>
          </label>
          <p aria-live="polite">{motion === 'flight' ? 'More tracking practice: use continuous autofocus or subject tracking if available; test a faster shutter and short bursts, then inspect motion blur and focus.' : 'Start with precise focus on the eye and a stable camera. Test a slower shutter only while the subject stays still; sudden movement may need a faster exposure.'}</p>
          <p className="text-[11px]">General technique for your chosen shot, not a measured species difficulty rating. Distance, cover, motion and light affect the challenge.</p>
          <label className="block">Try a shutter-speed comparison
            <select value={target} onChange={(event) => setTarget(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#c1c9be] bg-white p-2 text-[#181c20]">
              <option value="">Choose a test shutter</option>
              {[250, 500, 1000, 2000, 4000].map((denominator) => <option key={denominator} value={denominator}>1/{denominator} s</option>)}
            </select>
          </label>
          <p aria-live="polite">{!target ? 'Choose a shutter to compare against this photo’s exposure and ISO.' : comparison === null ? 'Comparison unavailable: a successfully loaded current photo needs valid exposure and ISO.' : `At 1/${target} s, equivalent ISO is approximately ${comparison}, assuming the reference light and aperture stay the same.`}</p>
          <p className="text-[11px]">Calculated exposure tradeoff, not an optimal preset or a matched-weather recommendation. Camera ISO limits, noise and real light differ; check a test shot. Aperture and shutter are not set on your camera.</p>
        </div>
      </details>
      <details className="rounded-xl bg-[#f1f4f9] p-3">
        <summary className="cursor-pointer font-semibold text-[#181c20]">Check regional seasonal patterns</summary>
        <div className="mt-2 space-y-2">
          {chartUrl ? <p><a href={chartUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#154212] underline">Open eBird seasonal chart for {region}</a>. Find {speciesName || 'this species'} and check the chart’s location and date range.</p> : <p>No valid eBird region is available for a seasonal chart.</p>}
          <p>Compare the weekly bars across months. They describe the share of complete checklists reporting a species, not bird counts, photography quality or a sighting guarantee. An empty bar means no reports in that dataset.</p>
          <p>Recent 14-day reports are separate evidence; they do not establish an annual season or best time of day. Historical seasonal values are not imported or scored in this app.</p>
          <a href="https://support.ebird.org/en/support/solutions/articles/48001255130-ebird-bar-charts-and-graphs" target="_blank" rel="noreferrer" className="text-[11px] underline">How eBird seasonal charts work</a>
        </div>
      </details>
      <div>
        <p className="font-semibold text-[#181c20]">General technique guidance</p>
        <p>Match shutter speed to subject motion. If exposure becomes too dark at your chosen shutter and aperture, consider raising ISO or using Auto ISO; review exposure and noise on test shots. Use continuous autofocus for moving birds if your camera supports it.</p>
        <a href="https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/best-bird-photos-the-keys-are-patience-practice-and-a-great-camera-lens-combo" target="_blank" rel="noreferrer" className="text-[11px] underline">Technique reference: Nikon Learn &amp; Explore</a>
      </div>
      <div>
        <p className="font-semibold text-[#181c20]">Before travelling</p>
        <p>Choose a reported hotspot below, then check its forecast, sunrise/sunset and directions. Photo capture time cannot establish the best time or season for this species. Reports do not guarantee a sighting.</p>
        <p>Confirm opening hours, entry fees, camera permissions and the actual entrance with the site. Selected hotspots have dated official-source access snapshots; unsupported details and exact entrances remain unverified.</p>
        <button type="button" onClick={onChooseHotspot} className="mt-2 rounded-xl bg-[#ebeef3] px-3 py-2 font-semibold text-[#154212] hover:bg-[#e0e3e8]">Choose a reported hotspot</button>
        <p className="mt-1 text-[11px]">Planning guidance only. Trip saving is not connected yet.</p>
      </div>
    </div>
  );
};
