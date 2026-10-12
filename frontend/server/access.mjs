// Dated official-source snapshots, bound to reviewed IDs/names/coordinates.
const source = (label, url) => ({ label, url });
const ndmc = source('NDMC garden hours', 'https://ndmc.gov.in/services/ndmc_gardens.aspx');
const lodhi = source('Delhi Tourism approach', 'https://www.delhitourism.gov.in/entertainment/lodhi_garden.html');
const timing = source('Operator timing page', 'https://www.sundernursery.org/timing.php');
const visit = source('Operator visitor FAQ', 'https://www.sundernursery.org/visit-the-park.php');
const tickets = source('Operator ticket page', 'https://www.sundernursery.org/book-tickets.php');
const rules = source('Operator photography rules', 'https://www.sundernursery.org/dos-and-donts.php');
const yamunaTourism = source('Delhi Tourism Yamuna park', 'https://delhitourism.gov.in/dt/biodiversity_parks/yamuna_biodiversity_park.html');
const yamunaOperator = source('Delhi Biodiversity Foundation visitor information', 'https://www.delhibiodiversityparks.org/');
const okhlaOperator = source('Okhla sanctuary operator hours', 'https://obs-up.com/');
const okhlaFees = source('Published Okhla fee schedule', 'https://obs-up.com/fee-structure.php');
const okhlaTourism = source('UP Ecotourism Okhla', 'https://upecotourism.in/Okhla.aspx');
const fact = (text, ...sources) => ({ text, sources });
const records = [
  {
    ids: ['L2362886', 'L56880958', 'L12795901'], names: ['Okhla Bird Sanctuary', 'Okhla Bird Sanctuary (Tar Road)', 'Okhla Bird Sanctuary Gate'], bounds: [28.55, 28.575, 77.30, 77.325], checkedAt: '2026-10-13',
    openingHours: fact('Operator publishes winter 07:30–17:00 and summer 07:00–17:30; closed Mondays. Exact seasonal changeover and current closures are not specified. Confirm before travel.', okhlaOperator),
    entryFee: fact('Published schedule cites a 2010 government order: Indian admission ₹30/day; foreign admission ₹350/day. This is the published historical schedule, not independently confirmed current pricing.', okhlaFees),
    cameraPass: fact('Published 2010 schedule groups non-digital/digital/small movie/handy cameras at ₹500 Indian / ₹1,000 foreign per visit; film categories differ. Confirm current rates and your equipment category. Tripod/drone/commercial permissions are not established.', okhlaFees),
    approach: fact('UP Ecotourism lists Botanical Garden Metro with onward road travel; confirm the actual sanctuary entrance with the operator. No vehicles are allowed inside according to the published fee page. These eBird points, including one named Gate, are not independently verified entrances.', okhlaTourism, okhlaFees),
    seasonalActivity: fact('UP Ecotourism describes migratory visitors October–March and separately recommends November–March for visits. Site-level narrative, not current counts or a species-specific optimum.', okhlaTourism),
  },
  {
    ids: ['L3444554', 'L3315869'], names: ['Yamuna Biodiversity Park--Phase I', 'Yamuna Biodiversity Park--Phase 2'], bounds: [28.73, 28.75, 77.20, 77.23], checkedAt: '2026-10-13',
    openingHours: fact('Official pages conflict: the Foundation lists Mon–Sat 10:30–16:30; Delhi Tourism lists 10:30–17:00 for Phase I plus ambiguous phase-labelled morning/evening windows. Do not assume dawn access. Confirm the applicable phase, day and booking with the operator.', yamunaOperator, yamunaTourism),
    entryFee: null, cameraPass: null,
    approach: fact('Foundation address: Jharoda Majra (Jagatpur), Wazirabad, Delhi 110084; YBP contact +91-9899055001. Delhi Tourism lists Model Town (Yellow Line) / Majlis Park (Pink Line). Confirm which phase/entrance your visit uses; map points are not verified gates.', yamunaOperator, yamunaTourism),
    seasonalActivity: fact('Delhi Tourism describes winter migratory birds at the wetlands. This is site-level narrative context, not a species-specific frequency, month-by-month dataset or guarantee.', yamunaTourism),
  },
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
  const checkedAt = record.checkedAt || '2026-10-04';
  const reviewOverdue = now - Date.parse(`${checkedAt}T00:00:00+05:30`) > 90 * 24 * 60 * 60 * 1000;
  return { checkedAt, reviewOverdue, openingHours: record.openingHours, entryFee: record.entryFee, cameraPass: record.cameraPass, approach: record.approach, seasonalActivity: record.seasonalActivity || null };
}
