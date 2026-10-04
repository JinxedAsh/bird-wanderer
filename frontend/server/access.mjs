// Dated official-source snapshots, bound to reviewed IDs/names/coordinates.
const source = (label, url) => ({ label, url });
const ndmc = source('NDMC garden hours', 'https://ndmc.gov.in/services/ndmc_gardens.aspx');
const lodhi = source('Delhi Tourism approach', 'https://www.delhitourism.gov.in/entertainment/lodhi_garden.html');
const timing = source('Operator timing page', 'https://www.sundernursery.org/timing.php');
const visit = source('Operator visitor FAQ', 'https://www.sundernursery.org/visit-the-park.php');
const tickets = source('Operator ticket page', 'https://www.sundernursery.org/book-tickets.php');
const rules = source('Operator photography rules', 'https://www.sundernursery.org/dos-and-donts.php');
const fact = (text, ...sources) => ({ text, sources });
const records = [
  {
    ids: ['L2265071'], names: ['Lodhi Gardens'], bounds: [28.588, 28.598, 77.215, 77.225],
    openingHours: fact('Apr–Sep: 05:00–20:00; Oct–Mar: 06:00–20:00.', ndmc),
    entryFee: null, cameraPass: null,
    approach: fact('Access from Lodi Road, near Khan Market. Specific entrance coordinates are unverified.', lodhi),
  },
  {
    ids: ['L2900901', 'L77838756'], names: ['Sunder Nursery, Nizamuddin', 'Sundar Nursery'], bounds: [28.59, 28.60, 77.24, 77.25],
    openingHours: fact('Operator pages list 07:00–22:00. Last entry conflicts: 21:00 on the summer timing page versus 21:30 in the FAQ. Confirm the applicable season and last entry with the operator.', timing, visit),
    entryFee: fact('Indian/SAARC adults: ₹50; foreign tourists: ₹200; eligible Indian children aged 5–12: ₹25. Under-5s and differently-abled visitors: free. Event tickets may be separate; confirm current rates and eligibility.', tickets),
    cameraPass: fact('Visitor DSLR photography is allowed. Organised/props shoots can be chargeable; contact the operator. A standard camera-pass price, tripod permission and drone permission are not established here.', rules),
    approach: fact('Operator lists JLN Stadium, Jangpura and Khan Market on the Violet Line, with onward autorickshaw travel. Specific entrance coordinates are unverified.', visit),
  },
];

export function hotspotAccess(hotspot, now = Date.now()) {
  if (hotspot.source !== 'eBird' || !Number.isFinite(hotspot.latitude) || !Number.isFinite(hotspot.longitude)) return null;
  const record = records.find((item) => item.ids.includes(hotspot.id) && item.names.includes(hotspot.name));
  if (!record) return null;
  const [minLat, maxLat, minLon, maxLon] = record.bounds;
  if (hotspot.latitude < minLat || hotspot.latitude > maxLat || hotspot.longitude < minLon || hotspot.longitude > maxLon) return null;
  const checkedAt = '2026-10-04';
  const reviewOverdue = now - Date.parse(`${checkedAt}T00:00:00+05:30`) > 90 * 24 * 60 * 60 * 1000;
  return { checkedAt, reviewOverdue, openingHours: record.openingHours, entryFee: record.entryFee, cameraPass: record.cameraPass, approach: record.approach };
}
