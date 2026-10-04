# External Discovery - Implementation Walkthrough

Date: 4 October 2026. Scope: the first external-data increment in Phase 1.

## What now works

After login, the application loads the worldwide eBird species catalogue and hotspots for the configured region. Search matches common/scientific species names and hotspot names. Explore shows species with recent regional reports. Opening a result preserves the source's species code or location ID, and details link to its eBird page. Hotspot bookmarks still update the Saved filter during the running session.

The default region is Delhi (`IN-DL`). A live check on 4 October returned 11,167 species, 191 hotspots and 161 species with recent regional reports. These are recorded test results, not permanent counts.

## How the code works

1. `src/App.tsx` starts a discovery request after a session is accepted. An AbortController cancels obsolete requests after logout, account changes or retry. Loading and error messages appear on the discovery screens. A failure does not replace real records with demonstration records.
2. `src/lib/discovery.ts` calls `GET /api/discovery/catalogue` through the existing Vite proxy and checks the response. It never receives the API key.
3. `server/auth.mjs` checks the existing session cookie before allowing the discovery route. Account creation, login, session storage and logout continue using the same database and cookie behavior.
4. `server/discovery.mjs` requests eBird taxonomy, regional hotspots and recent observations. `server/index.mjs` supplies the key and region from server environment variables. The key travels in the upstream request header, never in a browser URL.
5. The service groups observations by species and location, then converts provider fields into the types already used by the screens. Stable eBird codes become record IDs. Unsupported fields stay unavailable, while a neutral image fills the existing photo space.
6. A shared in-memory cache lasts 15 minutes. Concurrent loads share one pending request. The original retrieval timestamp is retained on cache hits. Cache disappears on restart; expired data is not silently served after a provider failure.

The backend remains one Express application with the existing SQLite authentication database. This increment adds no database tables, mobile framework or background worker.

## Interpreting the information correctly

- Taxonomy covers worldwide species. Hotspots and recent reports cover the configured region. Explore does not claim these locations are near the phone's GPS position.
- Recent observations cover the past 14 days and return the latest regional report per species. They are not a complete history or a count of sightings. No report does not prove absence.
- A hotspot's species total is the provider's all-time total. It does not mean species active today. Missing values are distinct from genuine zero values.
- Observation timestamps are displayed as supplied, in observation-local time; they are not converted into invented relative times.
- Only hotspot observations are requested, and provisional observations are excluded. No private account/checklist data is queried.
- Regional results can leave a hotspot with no displayed reports even when it has other recent activity. A complete hotspot species inventory is a future step.
- eBird does not supply this integration's photos, EXIF, conservation status, habitat, weather, entry fees, opening hours or camera advice. External detail screens do not show prototype evidence as real information.
- Community, journal, life-list and quiz prototypes are preserved separately. People/posts in global search are explicitly labelled demonstration data.

## Configuration

Follow the [frontend setup guide](../frontend/README.md#external-discovery-setup). Put `EBIRD_API_KEY` and optional `EBIRD_REGION` in the ignored `frontend/.env`, then restart the API. Never prefix secrets with `VITE_` or commit the environment file. Authentication continues to work if discovery is unconfigured.

Provider references: [eBird API documentation](https://documenter.getpostman.com/view/664302/S1ENwy59), [eBird data guidance](https://support.ebird.org/en/support/solutions/articles/48000838205-download-ebird-data).

## Verification

- TypeScript checking, 19 automated tests and the production frontend build passed for this increment.
- Discovery tests cover stable IDs, report joins, unknown metadata, secret exclusion, request parameters, cache lifetime, concurrent loads, missing/rejected keys, malformed responses, provider errors, retries, empty data and session protection.
- Rendering tests check that external species/hotspots do not inherit invented photo verification, locations, conservation status, weather or activity counts, and that empty Explore results render safely.
- Existing authentication regressions continue to pass. Both development and preview proxy tests now exercise discovery as well as accounts.
- A real eBird service check verified the counts above and the cache. An isolated HTTP check verified signed-out rejection, registration, authenticated discovery, and Indian Roller/Okhla results. Existing local accounts and databases were not changed.
- Browser interactions, exact design matching and physical-phone behavior remain unverified. A successful web build is not an Android APK.

## Manual presentation checklist

1. Start the application with the local eBird key configured. Log in and wait for the eBird source/region/retrieval message.
2. Search `Indian Roller` and `Coracias benghalensis`. Open the correct species and check its name, recent report and source link.
3. Search `Okhla`. Open a matching hotspot and check its real coordinates and all-time species total.
4. Save a hotspot, open Saved, then remove it. Confirm the same record changes in both places. Reloading currently loses bookmarks; persistence is later work.
5. Try an impossible search and verify the empty state. On an isolated test configuration, remove the key or interrupt the provider connection, then check the error/retry state and that login still works.
6. Test touch, small-screen scrolling and source links on the phone. Confirm missing photo/logistics fields look unavailable, not factual.

Maps/directions, weather and photography logistics, open-photo metadata, persistent bookmarks and Android delivery are not completed by this increment.

## Viva notes

- **Why fetch through Express?** The API key stays on the server, and the server can validate responses and share cached data.
- **What is normalization?** Converting eBird fields such as `speciesCode`, `comName` and `locId` into the app's existing `id`, `name` and hotspot fields.
- **Why keep provider IDs?** Names can change or be ambiguous. Stable IDs keep navigation and bookmarks associated with the right record.
- **How does caching work?** A successful catalogue and its retrieval time stay in server memory for 15 minutes. Concurrent requests reuse the same pending operation.
- **Why show unavailable instead of zero?** Zero is an actual measured value. Missing data cannot honestly be presented as zero or as a made-up recommendation.
