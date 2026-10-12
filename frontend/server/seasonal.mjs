// A narrow narrative alternative while eBird histogram export needs account access.
// Official common names are mapped only where species identity is unambiguous.
export function localSeasonalContext(scientificName, region, now = Date.now()) {
  if (!['Anas acuta', 'Mareca strepera'].includes(scientificName) || !/^(IN-DL|IN-UP)(-|$)/.test(region)) return null;
  const checkedAt = '2026-10-13';
  if (now - Date.parse(`${checkedAt}T00:00:00+05:30`) > 90 * 86400000) return null;
  return {
    checkedAt, location: 'Okhla Bird Sanctuary, Delhi–Uttar Pradesh border',
    text: 'UP Ecotourism lists this species among migratory visitors during October–March at Okhla. Its separate destination advice recommends November–March for visiting. These are site-scoped narrative statements, not weekly frequencies, a regional peak calculation or a current sighting guarantee.',
    sourceUrl: 'https://upecotourism.in/Okhla.aspx', sourceLabel: 'UP Ecotourism seasonal context',
  };
}
