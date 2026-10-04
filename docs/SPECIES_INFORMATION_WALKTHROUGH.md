# Sourced species information — Phase 1 walkthrough

Implemented 4 October 2026, Development Record Entry 20. This adds general species reference information to the existing detail page. It does not complete verified local seasonality, best-time recommendations or photography difficulty ratings.

## What a teammate can see

The Habitat tile opens **Identification, Habitat & Behaviour** inside the existing Field Guide & Technique card. The disclosure can also be opened by mouse or keyboard. It loads on its first opening, then retains the result when closed/reopened. A short overview and supported source sections provide identification, habitat/range and behaviour. Explicit migration/movement sections are shown where present; missing categories state that a supported source section is unavailable.

The reference is general across the species' range. It can describe a particular sex, age or subspecies, and is labelled accordingly. It is not a local sighting forecast or proof of a good visit month. A paragraph mentioning winter in the overview is not automatically converted into a seasonal recommendation. Best Time remains unverified; difficulty remains unavailable and its prototype Medium bars are hidden for external species.

## Request flow and source identity

1. `SpeciesInfoPanel.tsx` calls the authenticated browser client when opened.
2. `discovery.mjs` validates the existing eBird ID and retrieves its scientific name from the catalogue.
3. `wikidata.mjs` matches exact scientific-name and species-rank claims. This small helper was extracted from the existing photo code so photographs and reference articles use the same matching rules.
4. `species-info.mjs` follows the matched entity's English Wikipedia sitelink. It does not search Wikipedia by an ambiguous common name.
5. The returned page must be in the article namespace, have the same Wikidata ID, avoid disambiguation and supply a valid revision and readable extract. Taxonomy mismatches, no sitelink or missing articles give no-match rather than another bird.
6. Supported heading groups are selected from the plain-text extract. Nested subsections remain with their parent until the next same/higher-level heading. The overview is limited to 90 words and section excerpts to 120 words, each also bounded to 1,200 characters, with shortening disclosed.
7. The panel renders escaped text, source headings, revision/contributor-history/licence/match links and retrieval time.

There is no AI-generated biological description, fuzzy taxonomy substitution or HTML injection. General text is not turned into an IUCN rating, local seasonal abundance or difficulty score.

## Attribution and boundaries

Adapted/shortened article text is attributed to **Wikipedia contributors**, linked to the recorded article revision and author history, with CC BY-SA 4.0 and the adaptation notice. This licence applies to the adapted article text; it does not select a project-wide code licence. The current article and exact Wikidata match are linked separately.

Wikipedia is a community-maintained reference. The app's structured identity check does not independently verify biological accuracy. Source references and region/subspecies context still matter. Article headings differ between species, and the normalizer deliberately supports only clear heading names. Some information may exist in the original article while its category remains unavailable in this app.

## Reliability and important files

| File | Role |
| --- | --- |
| `frontend/server/wikidata.mjs` | Shared exact taxonomy matching and claim-value helpers |
| `frontend/server/photos.mjs` | Reuses those helpers while retaining existing photo/EXIF behavior |
| `frontend/server/species-info.mjs` | Article identity, section extraction, safe failures, concurrency and cache |
| `frontend/server/discovery.mjs` | Existing protected route and eBird ID validation |
| `frontend/src/lib/discovery.ts` | Typed response and client validation/session recovery |
| `frontend/src/components/SpeciesInfoPanel.tsx` | Lazy disclosure, independent loading/no-match/error states, retry and credit rendering |
| `frontend/src/components/SpeciesDetailScreen.tsx` | Existing card/tile integration and focus; honest timing/difficulty presentation |

Each provider call times out after eight seconds. Successful/no-match results are cached for 24 hours, bounded to 200 names. Concurrent requests for the same name share work, with three active and 20 pending distinct lookups maximum. Provider failures remain retryable and are not cached. A server restart clears the cache. Photo and location requests remain independent of article availability. AbortController and selected-ID checks prevent stale article text after navigation. A protected-route 401 resets the existing session; provider failures do not.

## Verification

TypeScript checking, all **58 tests** and production build passed. Coverage includes exact species/article identity, wrong rank/species, namespace/disambiguation rejection, nested headings, missing sections, excerpt limits, cache/concurrent/expiry behavior, malformed providers, signed-in ID protection, safe credit rendering, client shape validation and session-expiry distinction. Existing photo tests passed after extracting the shared matching helper; account, EXIF, planning, maps, weather and proxy checks still pass.

Live lookups matched Indian Roller/Q477133/revision1349000643, Common Kingfisher/Q79915/revision1366322834 and Lesser Whistling-Duck/Q244284/revision1350730211. All supplied description, habitat and behaviour sections; none supplied a supported explicit seasonal-movement heading. These are provider snapshots rather than permanent coverage guarantees. Browser results are recorded in Development Record Entry 20.

Manual acceptance includes opening through the Habitat tile, native keyboard disclosure, revision/history/licence links, correct text after switching, retained reopening data, wrapped excerpts at 390 pixels, genuine outages/no-match and a physical phone. Exact design acceptance and verified local seasonality/difficulty remain pending.

## Viva Notes

We enriched the detail page with source-linked species information without changing the catalogue or adding a new framework. A shared exact-match helper prevents photos and descriptions from applying different taxonomy rules. The information request runs independently and only after opening the panel.

Important functions/modules are `findSpeciesEntities` (identity), `articleSections` (bounded source excerpts), `createSpeciesInfoService` (provider/cache), `loadSpeciesInformation` (typed protected client) and `SpeciesInfoPanel`/`SpeciesInformationContent` (interaction and presentation). Concepts include provenance, nullable fields, caching, request cancellation, progressive disclosure, safe text rendering and attribution.

1. **Why not search by common name?** Common names can be ambiguous. Scientific-name/rank matching plus the article's Wikidata ID identifies the intended species.
2. **What if a category is missing?** It stays null/unavailable; the app does not invent habitat, migration timing or difficulty.
3. **Why retain revision and author links?** They show which source was retrieved and attribute the contributors of adapted text.
4. **How are photos preserved?** Their existing matching logic moved into a shared helper; existing photo tests and request behavior remain covered.
5. **Does migration text tell us the best local month?** No. It is general species-range context; verified regional patterns require separate evidence.

Provider references: [MediaWiki TextExtracts API](https://www.mediawiki.org/wiki/Extension:TextExtracts/en), [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access), [Wikimedia reuse terms](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use).
