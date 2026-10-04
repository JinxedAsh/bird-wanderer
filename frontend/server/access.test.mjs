import test from 'node:test';
import assert from 'node:assert/strict';
import { hotspotAccess } from './access.mjs';
import { createDiscoveryService } from './discovery.mjs';

const lodhi = { id: 'L2265071', name: 'Lodhi Gardens', latitude: 28.59253, longitude: 77.22044, source: 'eBird' };
const date = Date.parse('2026-10-04T12:00:00+05:30');
test('access matches reviewed identity and coordinates, never similar names or prototype records', () => {
  const result = hotspotAccess(lodhi, date);
  assert.match(result.openingHours.text, /06:00–20:00/);
  assert.equal(result.entryFee, null);
  assert.equal(result.cameraPass, null);
  for (const override of [{ id: 'L999' }, { name: 'Lodhi Road Campus' }, { latitude: 0 }, { longitude: NaN }, { source: undefined }]) assert.equal(hotspotAccess({ ...lodhi, ...override }, date), null);
  assert.equal(result.reviewOverdue, false);
  assert.equal(hotspotAccess(lodhi, date + 91 * 86400000).reviewOverdue, true);
});
test('both reviewed Sunder records retain conflict and fee/camera scope with official per-field sources', () => {
  for (const [id, name] of [['L2900901', 'Sunder Nursery, Nizamuddin'], ['L77838756', 'Sundar Nursery']]) {
    const result = hotspotAccess({ id, name, source: 'eBird', latitude: 28.5959, longitude: 77.245 }, date);
    assert.match(result.openingHours.text, /conflicts/);
    assert.match(result.openingHours.text, /21:00.*21:30/);
    assert.equal(result.openingHours.sources.length, 2);
    assert.match(result.entryFee.text, /₹50.*₹200/);
    assert.match(result.cameraPass.text, /drone permission.*not established/);
    for (const field of ['openingHours', 'entryFee', 'cameraPass', 'approach']) {
      for (const source of result[field].sources) assert.equal(new URL(source.url).hostname, 'www.sundernursery.org');
    }
  }
});
test('catalogue delivers reviewed access separately from eBird unavailable fields', async () => {
  const service = createDiscoveryService({ apiKey: 'test-key', now: () => date, fetchImpl: async (url) => Response.json(url.pathname.includes('/ref/hotspot/') ? [{ locId: lodhi.id, locName: lodhi.name, lat: lodhi.latitude, lng: lodhi.longitude }] : []) });
  const data = await service.catalogue();
  assert.equal(data.hotspots[0].access.checkedAt, '2026-10-04');
  assert.equal(data.hotspots[0].openingHours, 'Not available from eBird');
  assert.match(data.hotspots[0].access.openingHours.sources[0].url, /ndmc.gov.in/);
});
