export const normalizeScientificName = (name) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const claimValues = (entity, property) => (Array.isArray(entity.claims?.[property]) ? entity.claims[property] : [])
  .filter((claim) => claim && claim.rank !== 'deprecated' && claim.mainsnak?.snaktype === 'value')
  .sort((a, b) => Number(b.rank === 'preferred') - Number(a.rank === 'preferred'))
  .map((claim) => claim.mainsnak.datavalue?.value);

// Both photographs and information must refer to the same exact species rank.
export async function findSpeciesEntities(scientificName, request) {
  const search = await request('www.wikidata.org', { action: 'wbsearchentities', search: scientificName, language: 'en', limit: '5' });
  if (!Array.isArray(search.search)) throw new Error('Unsupported species matches.');
  const ids = search.search.map((item) => item?.id).filter((id) => typeof id === 'string' && /^Q\d+$/.test(id)).slice(0, 5);
  if (!ids.length) return [];
  const data = await request('www.wikidata.org', { action: 'wbgetentities', ids: ids.join('|'), props: 'claims|sitelinks' });
  if (!data.entities || typeof data.entities !== 'object' || Array.isArray(data.entities)) throw new Error('Unsupported species details.');
  return ids.map((id) => ({ id, entity: data.entities[id] })).filter(({ entity }) => entity
    && claimValues(entity, 'P225').some((name) => typeof name === 'string' && normalizeScientificName(name) === normalizeScientificName(scientificName))
    && claimValues(entity, 'P105').some((rank) => rank?.id === 'Q7432'));
}
