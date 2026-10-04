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
- Regional catalogue results can leave a hotspot with no displayed reports even when it has other recent activity. Detail pages now request that hotspot separately and load its all-time species list; see the journey increment below.
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

## 4 October 2026 - Species-to-hotspot journey increment

The first increment above connected the catalogue. This increment completes internal links and fetches detail data on demand:

- `GET /api/discovery/species/:speciesId/locations` requests recent reports of that species across the configured region. It joins returned location IDs to known regional hotspots. The species page lists selectable locations with coordinates, observation-local timestamps and reported individual counts.
- `GET /api/discovery/hotspots/:hotspotId` fetches that hotspot's latest reports per species and its all-time recorded taxon codes. It joins those codes to the worldwide species catalogue and returns stable species IDs for navigation. Taxa outside the catalogue are reported as unmatched, rather than assigned another species or an invented name.
- Both routes use the existing session protection. IDs are checked for valid syntax and catalogue membership before detail requests; an arbitrary or private location ID cannot be queried through these routes. Reports explicitly marked private are filtered out of catalogue/detail responses.
- App.tsx loads details when their screen opens. AbortController cancels obsolete requests on navigation, logout or selection changes. Response IDs are checked before accepting data, and each displayed response is matched to the selected record. Retry, loading and empty states do not reuse regional summaries as hotspot-specific evidence.
- Species location cards open hotspots by location ID. Hotspot recent-report and all-time species rows open species by species code, with keyboard controls. Prototype name-based navigation remains available for existing sample screens.
- Navigation history now stores the selected record with each detail screen. The app's Back button restores the original species/hotspot, even after visiting a different species. This remains in-app history; URLs/deep links and browser Back support are separate work.
- Detail results use the same 15-minute TTL, separate from the catalogue cache. Concurrent requests share loads, failures remain retryable, and detail cache storage is bounded to 100 entries. Bookmarks continue to use the shared hotspot state and remain temporary.

**Verification:** TypeScript checking, all 26 tests and the production build passed. New tests cover multiple species locations, private/unknown location filtering, hotspot-specific rather than regional reports, all-time taxonomy joins, unknown taxa, invalid/out-of-region IDs, cache sharing/expiry, retry after failure, session-protected HTTP endpoints, and loading/error/empty rendering.

**Live evidence:** Lesser Whistling-Duck (`lewduc1`) returned one matching hotspot, Kanjhawala wetlands. Its detail response returned 69 species with recent reports and 164 matched all-time species, with no unmatched taxa in that response. Every displayed recent species ID existed in the catalogue; the detail cache also passed a live check. Common Kingfisher returned no recent hotspot matches, and a separate Okhla location returned no recent reports but 92 all-time species. These results illustrate why an empty recent response must not be treated as species absence or as an empty all-time list. Counts may change with provider updates.

**Manual acceptance:** search Lesser Whistling-Duck, open its location, open a species from Recent Sightings or the all-time species accordion, then use the app's Back button twice. Confirm the original hotspot and original species return. Also try an empty species result, keyboard navigation, rapidly switching selections and an isolated provider failure/retry. Physical-phone clicks, back navigation and exact visual matching remain unverified.

**Viva concepts:** a stable ID joins records reliably; names are display labels. Recent reports and all-time records answer different questions. Request cancellation prevents old responses overwriting the current selection. History stores the selected entity so returning to a screen restores its context. A bounded cache reduces repeat provider requests without indefinitely growing server memory.

Maps/directions, weather, photo metadata, persistent bookmarks and Android packaging remain separate increments.

## 4 October 2026 - Interactive maps and directions increment

Maps/directions are now implemented, superseding the earlier entries' map gap. Weather, photo metadata, persistent bookmarks and Android packaging remain incomplete.

### How the map works

`HotspotsScreen.tsx` passes its filtered hotspot records to `HotspotMap.tsx`. The map and list therefore show the same search/Saved/Popular results. Leaflet handles movement, zoom, markers and popups; OpenStreetMap provides the background imagery. Pin selection highlights the location, and **Open hotspot** uses its stable ID to open the existing detail page. That page reuses the component with a single location.

`lib/maps.ts` validates coordinates before either displaying pins or building directions. It rejects missing values, strings, infinity and out-of-range values, while allowing genuine zero coordinates. The directions helper builds a [Google Maps URL](https://developers.google.com/maps/documentation/urls/get-started) with `api=1` and a latitude/longitude destination; no paid maps key or assumed starting point is added. The location is the provider's hotspot point, not a verified entrance.

Leaflet loads only when a browser map is needed. Effect cleanup removes the map and resize observer when navigation closes it, preventing duplicate map instances. Popup names use DOM text rather than HTML. Empty filters show a clear fallback; failed imagery shows an error and retry while discovery cards/directions remain available. Visible attribution, ordinary browser caching and no tile prefetching follow the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/). API keys remain on the server.

### Verification and manual checks

TypeScript checking, all **29 tests** and the production build passed. Three new tests cover coordinate validation, precise directions URLs and map/directions/empty server-rendered output. Existing account/discovery/proxy checks passed. These checks do not exercise Leaflet interaction or fetch map tiles; browser interaction testing was unavailable, and physical-phone acceptance remains pending.

1. Sign in on the phone and open Hotspots. Confirm tiles load, attribution is visible and pins match the configured region. Pan, pinch and use zoom controls; check the header/navigation still work.
2. Search a hotspot name. Confirm cards and pins filter together. Try an impossible name and check the empty message. Save a location and repeat with Saved; test Popular too.
3. Tap a pin, read its name and select **Open hotspot**. Confirm the correct name/coordinates/detail map. Return using the app Back control.
4. Open directions. Confirm Google Maps opens with that hotspot as destination and handles the starting point. Return to the app. Do not assume the pin identifies an entrance.
5. Navigate repeatedly between locations; check for blank/duplicate maps. Test landscape, a narrow screen and keyboard marker/popup navigation on desktop.
6. Interrupt internet access after discovery loads. Check map failure feedback, remaining cards and Retry map after reconnecting. If a browser blocks tiles without producing an error event, note that outcome for follow-up.

### Viva notes

- **What changed?** Real coordinates now appear as interactive pins, and each hotspot can open directions. Existing discovery and login flows remain intact.
- **Why one map component?** List and detail screens need the same tile/marker/error behavior. Reusing it avoids maintaining two separate map implementations.
- **Why validate coordinates?** Missing or malformed numbers should not create misleading locations. Latitude is between -90 and 90, longitude between -180 and 180, and zero is valid.
- **What does effect cleanup do?** It removes the map and resize observer when the component closes, avoiding leftover listeners and duplicate initialization.
- **Are directions computed by our backend?** No. The app builds a destination URL; Google Maps handles routing. eBird provides location data, OpenStreetMap provides imagery, and Leaflet provides interaction.
