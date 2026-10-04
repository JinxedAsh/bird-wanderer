import React from 'react';
import type { PhotoLoadState } from './SpeciesPhoto';
import { formatExifNumber, formatShutter } from './PhotoMetadata';

interface PhotoPlanningProps {
  speciesId: string;
  state: PhotoLoadState;
  onChooseHotspot: () => void;
}

export const PhotoPlanning: React.FC<PhotoPlanningProps> = ({ speciesId, state, onChooseHotspot }) => {
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
      <div>
        <p className="font-semibold text-[#181c20]">General technique guidance</p>
        <p>Match shutter speed to subject motion. If exposure becomes too dark at your chosen shutter and aperture, consider raising ISO or using Auto ISO; review exposure and noise on test shots. Use continuous autofocus for moving birds if your camera supports it.</p>
        <a href="https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/best-bird-photos-the-keys-are-patience-practice-and-a-great-camera-lens-combo" target="_blank" rel="noreferrer" className="text-[11px] underline">Technique reference: Nikon Learn &amp; Explore</a>
      </div>
      <div>
        <p className="font-semibold text-[#181c20]">Before travelling</p>
        <p>Choose a reported hotspot below, then check its forecast, sunrise/sunset and directions. Photo capture time cannot establish the best time or season for this species. Reports do not guarantee a sighting.</p>
        <p>Confirm opening hours, entry fees, camera permissions and the actual entrance with the site. These access details are not verified in the app yet.</p>
        <button type="button" onClick={onChooseHotspot} className="mt-2 rounded-xl bg-[#ebeef3] px-3 py-2 font-semibold text-[#154212] hover:bg-[#e0e3e8]">Choose a reported hotspot</button>
        <p className="mt-1 text-[11px]">Planning guidance only. Trip saving is not connected yet.</p>
      </div>
    </div>
  );
};
