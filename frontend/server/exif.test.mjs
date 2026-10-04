import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExif } from './exif.mjs';

const tags = (values) => Object.entries(values).map(([name, value]) => ({ name, value }));

test('EXIF normalizes original exposure rationals and keeps the camera clock without assuming a timezone', () => {
  const result = normalizeExif(tags({ Make: ' NIKON CORPORATION ', Model: 'NIKON D300', Lens: '170.0-420.0 mm f/4.0', ExposureTime: '1/500', FNumber: '8/1', ISOSpeedRatings: 400, FocalLength: '3900/10', DateTimeOriginal: '2011:10:11 09:27:38' }));
  assert.deepEqual(result, { status: 'available', cameraMake: 'NIKON CORPORATION', cameraModel: 'NIKON D300', lens: '170.0-420.0 mm f/4.0', exposureSeconds: 0.002, aperture: 8, iso: 400, focalLengthMm: 390, capturedAt: '2011-10-11 09:27:38', utcOffset: null });
  assert.equal(normalizeExif(tags({ ExposureTime: 2.5, FNumber: '2.8', ISOSpeedRatings: [200], LensModel: 'EF100-400mm', Lens: 'fallback', DateTimeOriginal: '2024:02:29 23:59:59', OffsetTimeOriginal: '+05:30' })).utcOffset, '+05:30');
  assert.equal(normalizeExif(tags({ LensModel: 'Model lens', Lens: 'fallback' })).lens, 'Model lens');
});

test('EXIF missing/malformed input has an explicit unavailable state and no invented settings', () => {
  for (const input of [undefined, null, {}, [], [{ name: 'MEDIAWIKI_EXIF_VERSION', value: 2 }], tags({ ShutterSpeedValue: '9/1', ApertureValue: '6/1', DateTime: '2020:01:01 00:00:00' })]) {
    const result = normalizeExif(input);
    assert.equal(result.status, 'unavailable');
    assert.ok(Object.entries(result).filter(([key]) => key !== 'status').every(([, value]) => value === null));
  }
});

test('EXIF rejects corrupt numbers, invalid calendars, ambiguous ISO and duplicate tags', () => {
  for (const invalid of ['1/0', '-1', 'Infinity', 'NaN', '1 s', {}, [], [100, 200], 0, -1, Infinity, 1e20]) {
    assert.equal(normalizeExif(tags({ ExposureTime: invalid, FNumber: invalid, ISOSpeedRatings: invalid, FocalLength: invalid })).status, 'unavailable');
  }
  for (const date of ['2023:02:29 12:00:00', '2024:04:31 12:00:00', '2024:01:01 24:00:00', '2024:01:01 12:60:00', '2024:01:01 12:00:60', '0000:01:01 00:00:00', '2024-01-01T12:00:00Z']) {
    assert.equal(normalizeExif(tags({ DateTimeOriginal: date, OffsetTimeOriginal: '+05:30' })).capturedAt, null);
    assert.equal(normalizeExif(tags({ DateTimeOriginal: date, OffsetTimeOriginal: '+05:30' })).utcOffset, null);
  }
  for (const offset of ['+14:01', '+24:00', 'Asia/Kolkata', '+05:99']) assert.equal(normalizeExif(tags({ DateTimeOriginal: '2024:01:01 12:00:00', OffsetTimeOriginal: offset })).utcOffset, null);
  assert.equal(normalizeExif([{ name: 'ExposureTime', value: '1/500' }, { name: 'ExposureTime', value: '1/400' }]).exposureSeconds, null);
});

test('EXIF exposes a strict whitelist and excludes sensitive location, ownership and serial information', () => {
  const result = normalizeExif(tags({ Model: '<img onerror=steal()>', Lens: 'x'.repeat(201), Make: 'Canon', GPSLatitude: '28/1', GPSLongitude: '77/1', CameraOwnerName: 'Private person', SerialNumber: 'secret-serial', BodySerialNumber: 'body-secret', UserComment: 'private note', Artist: 'owner' }));
  assert.equal(result.cameraMake, 'Canon');
  assert.equal(result.cameraModel, null);
  assert.equal(result.lens, null);
  const json = JSON.stringify(result);
  assert.doesNotMatch(json, /GPS|Private person|secret|private note|owner|onerror/);
  assert.equal(Object.keys(result).length, 10);
});
