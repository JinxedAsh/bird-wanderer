import React from 'react';
import type { PhotoExif } from '../lib/discovery';

export const formatExifNumber = (value: number) => Number(value.toPrecision(6)).toString();
export const formatShutter = (seconds: number | null) => {
  if (seconds === null) return 'Unavailable';
  const denominator = 1 / seconds;
  // Use a reciprocal only when it faithfully represents the recorded value.
  return seconds < 1 && Math.abs(denominator - Math.round(denominator)) < 0.000001
    ? `1/${Math.round(denominator)} s` : `${formatExifNumber(seconds)} s`;
};

export const PhotoMetadata: React.FC<{ exif: PhotoExif }> = ({ exif }) => {
  const rows = [
    ['Camera make', exif.cameraMake || 'Unavailable'],
    ['Camera model', exif.cameraModel || 'Unavailable'],
    ['Lens', exif.lens || 'Unavailable'],
    ['Shutter speed', formatShutter(exif.exposureSeconds)],
    ['Aperture', exif.aperture === null ? 'Unavailable' : `f/${formatExifNumber(exif.aperture)}`],
    ['ISO', exif.iso === null ? 'Unavailable' : formatExifNumber(exif.iso)],
    ['Focal length', exif.focalLengthMm === null ? 'Unavailable' : `${formatExifNumber(exif.focalLengthMm)} mm`],
    ['Capture time', exif.capturedAt ? `${exif.capturedAt} (camera clock; ${exif.utcOffset ? `UTC${exif.utcOffset}` : 'timezone unknown'})` : 'Unavailable'],
  ];
  return (
    <section aria-label="Reference photo camera metadata" className="mt-3 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">
      <h3 className="text-[14px] font-bold text-[#181c20]">Reference Photo EXIF</h3>
      {exif.status === 'available' ? <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">{rows.map(([label, value]) => <React.Fragment key={label}><dt className="font-semibold">{label}</dt><dd className="break-words">{value}</dd></React.Fragment>)}</dl> : <p className="mt-1">No supported camera EXIF is available for this source photo. It may be absent, stripped or unreadable.</p>}
      <p className="mt-2">Source: Wikimedia Commons file metadata. Recorded settings for this photo; not independently verified or recommended settings. Capture time does not establish current bird activity or this hotspot's conditions.</p>
    </section>
  );
};
