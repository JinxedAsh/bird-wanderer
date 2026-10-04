// Commons imageinfo.metadata is decoded file EXIF, not description-page text.
// Return only camera/exposure fields; never forward GPS, serials or owner data.
export function normalizeExif(metadata) {
  const tags = new Map();
  if (Array.isArray(metadata) && metadata.length <= 1000) {
    for (const tag of metadata) {
      if (typeof tag?.name !== 'string') continue;
      // Conflicting duplicate tags cannot safely describe a single setting.
      tags.set(tag.name, tags.has(tag.name) ? null : tag.value);
    }
  }
  const cleanText = (value) => typeof value === 'string' && value.trim().length <= 200 && !/[<>\x00-\x1f\x7f]/.test(value) ? value.trim() || null : null;
  const number = (value, max) => {
    if (Array.isArray(value)) value = value.length === 1 ? value[0] : null;
    if (typeof value === 'string') {
      const match = /^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/.exec(value.trim());
      if (!match) return null;
      value = Number(match[1]) / (match[2] === undefined ? 1 : Number(match[2]));
    }
    return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max ? value : null;
  };
  const rawDate = tags.get('DateTimeOriginal');
  let capturedAt = null;
  // Keep the camera's clock as recorded. Do not assume UTC or the hotspot zone.
  if (typeof rawDate === 'string') {
    const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(rawDate);
    if (match) {
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      if (year >= 1900 && year <= 9999 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && hour < 24 && minute < 60 && second < 60) {
        capturedAt = `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`;
      }
    }
  }
  const offset = tags.get('OffsetTimeOriginal');
  const utcOffset = capturedAt && typeof offset === 'string' && /^[+-](?:0\d|1[0-3]):[0-5]\d$|^[+-]14:00$/.test(offset) ? offset : null;
  const fields = {
    cameraMake: cleanText(tags.get('Make')),
    cameraModel: cleanText(tags.get('Model')),
    lens: cleanText(tags.get('LensModel')) || cleanText(tags.get('Lens')),
    exposureSeconds: number(tags.get('ExposureTime'), 86400),
    aperture: number(tags.get('FNumber'), 256),
    iso: number(tags.get('ISOSpeedRatings'), 10000000),
    focalLengthMm: number(tags.get('FocalLength'), 100000),
    capturedAt,
    utcOffset,
  };
  return { status: Object.values(fields).some((value) => value !== null) ? 'available' : 'unavailable', ...fields };
}
