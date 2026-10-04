# Bird Wanderer

Mobile web application for bird discovery and photography logistics.

## Requirements

Node.js 24.15 or later within the 24.x release line, and pnpm 11. This project includes a pnpm lockfile for reproducible installs.

## Run locally

On this Windows workspace, dependencies are already installed. From the project root, run `./Start-Dev.ps1` in PowerShell. It finds Node on PATH or uses the bundled runtime available on this computer.

From `frontend`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://localhost:3000** (use this hostname because it matches the allowed request origin). The command starts both Vite and the Express API. Stop both with Ctrl+C. No API keys or cloud setup are required for account creation and login.

An optional `.env` can be copied from `.env.example`. Accounts and sessions persist in `data/bird-wanderer.sqlite`, which is excluded from Git. Keep the database private and back it up before important changes.

## Verify

To preview the production frontend locally, first run `pnpm build`. Start `pnpm dev:server` in one terminal and `pnpm preview` in another, then open **http://localhost:3000**. Preview needs the API running separately; it is not a production deployment command. Stop the development frontend before previewing because both use the same port.

Development and preview read the frontend port from `APP_ORIGIN` and the API port from `PORT` in `.env`. Keep `APP_ORIGIN` equal to the URL you open (including the port). For example, `APP_ORIGIN=http://localhost:3100` and `PORT=3101` move both servers without changing source files. No environment secrets are exposed by this proxy configuration.

For phone access on the same local network, set `FRONTEND_HOST=0.0.0.0` and add the computer's Wi-Fi origin to `ADDITIONAL_APP_ORIGINS`, for example `http://192.168.1.3:3000`. Leave `APP_ORIGIN=http://localhost:3000` to keep desktop login working. Extra origins are comma-separated, with no trailing slash or path; update them if your network address changes. Restart both servers after changing `.env`, then open that Wi-Fi URL on the phone. The API can stay bound to `127.0.0.1` because Vite proxies its requests. Production extra origins must use HTTPS.

```sh
pnpm lint
pnpm test
pnpm build
```

The lint command currently checks TypeScript types. Tests use temporary isolated databases and do not change your development accounts.
The suite also includes server-rendered frontend regression checks and HTTP checks for both Vite proxies. See `../docs/STAGE_1_WALKTHROUGH.md` for browser checks still required.

## Current status

Implemented: registration, password hashing, login, session restoration, logout, origin checks and authentication rate limiting. External species/hotspot discovery now uses eBird when configured; later-phase screens still display prototype fixtures. Password recovery does not send email yet; the interface reports this honestly.

See `../docs/AUTH_WALKTHROUGH.md` for the request/data flow and `../docs/DEVELOPMENT_RECORD.md` for deadlines and the living documentation link. Original screen designs are in `../docs/design-reference`.

## External discovery setup

Authentication works without an external API key. Real discovery requires a personal [eBird API key](https://ebird.org/api/keygen).

Add these values to the ignored `frontend/.env` file (not the repository root):

```dotenv
EBIRD_API_KEY=your-personal-key
EBIRD_REGION=IN-DL
```

Do not put the key in chat, source code, screenshots or any `VITE_` variable. It is used only by the Express server. Restart the API after configuration changes. The default region is Delhi; change `EBIRD_REGION` to another valid eBird region code to load its hotspots and recent reports.

After signing in, Explore shows species with recent regional reports. Global Search searches the worldwide eBird species taxonomy by common/scientific name and the configured region's hotspots by name. Results retain eBird species codes and location IDs. Hotspots starts with the configured region; selecting a device/manual point enables a 50-km nearby filter within that region. Use Saved to check persistent bookmarks for your signed-in account.

The backend requests the taxonomy, regional hotspots and latest regional observations from the past 14 days. It caches the combined catalogue in memory for 15 minutes and shares concurrent loads. The retrieval timestamp stays unchanged when cached data is served. Cache is lost on server restart, and expired data is not silently used after a failed refresh.

Discovery requires a valid signed-in session. Missing/rejected keys, timeouts, provider failures and malformed responses produce an error with a retry control; the app does not substitute sample discovery results. Species results are limited to 60 displayed matches per query; refine broad searches to find more. Community/journal/quiz screens remain separate prototypes.

Latest observation reports are not total sightings counts. Hotspot species counts mean species recorded all time; missing counts and distances are unavailable. Observation times are shown as supplied by eBird in observation-local time. Regional latest-per-species reports do not provide a complete hotspot history. Opening a species now loads its matching regional hotspots, and opening a hotspot fetches its own recent reports and catalogue-matched all-time species list. Species/location links use stable IDs. The app Back button restores the selected record; browser deep links remain pending. Detail data is cached for 15 minutes with a 100-entry storage limit. Unmatched taxa are disclosed separately. Habitat, conservation status, photos, EXIF, weather, recommended gear, fees and opening hours are not supplied by this integration. Their placeholder states are explicit.

### Hotspot maps and directions

Leaflet displays interactive OpenStreetMap tiles with pins at validated eBird coordinates. Search, All, Popular and Saved use the same filtered records for the list and map. Select a pin, then choose **Open hotspot** in its popup. The detail map shows that hotspot and **Open directions** opens Google Maps at its coordinates. No extra maps API key is needed for these links. The destination is the reported hotspot point, not a verified entrance. Optional device/manual location now enables nearby filtering and nearest-first distance sorting within the loaded region.

Internet access to `tile.openstreetmap.org` is needed for map imagery. Attribution remains visible; normal browser caching is used, with no offline tile downloads or prefetching. Keep normal browser Referer behavior for tile requests. A tile failure shows an error/retry message while lists and directions remain available. Invalid coordinates are excluded from maps and cannot produce a directions link. Manual phone checks are in the discovery walkthrough; automated rendering checks do not verify map gestures or tile loading.

See [Discovery walkthrough](../docs/DISCOVERY_WALKTHROUGH.md) for the request flow, tests and manual acceptance checklist.

### Hotspot weather

Open a real hotspot and expand **Detailed Micro-Weather**. Open-Meteo forecasts use that hotspot's eBird coordinates, not the phone's GPS. No additional API key or environment setting is needed for this university project. The existing signed-in session is required. Restart the API if it was already running before this route was added.

Current model conditions, two days of sunrise/sunset and upcoming hourly forecasts load independently of species reports/maps. Times are shown in the provider's location timezone; retrieval time is explicitly UTC. Celsius, km/h, percent and millimetres are checked before normalizing the response. Unknown values display as unavailable; zero is preserved. A failed forecast has its own retry control and does not hide hotspot reports. HTTP 401 from the app returns to login; provider/network failures do not.

The server caches successful forecasts for 15 minutes, shares concurrent requests and limits storage to 100 coordinate pairs. Failed or expired data is not silently reused. Visible Open-Meteo/CC BY 4.0 attribution is included. The free endpoint is for non-commercial use; review provider terms before changing the project's deployment purpose. Weather does not establish opening hours, fees, camera passes or gates; the displayed light/wind/rain tips are explicitly general planning guidance. Explore's weather placeholder remains unavailable because there is no selected hotspot or verified device location there.

See [Weather walkthrough](../docs/WEATHER_WALKTHROUGH.md) for design boundaries, tests and viva notes.

### Species reference photographs

Explore, Search and species details request photographs independently of eBird discovery. The signed-in endpoint `GET /api/discovery/species/:speciesId/photo` checks the eBird catalogue, matches its scientific name and species rank on Wikidata, then reads the associated Commons image information. No additional key is required. Server access to `www.wikidata.org` and `commons.wikimedia.org`, and browser access to `upload.wikimedia.org`/`thumb.wikimedia.org`, are needed. Restart an already-running API after adding this route.

Creator, licence and Commons links accompany each photo; details retain full credit, required attribution, usage terms and source restrictions. Images are cropped to fit existing frames. Supported sources require an author and a CC BY/CC BY-SA unported licence or CC0 URL. Unsupported licences, absent photos or taxonomy mismatches give an explicit detail-page unavailable state. Provider/image failures show a fallback and details offer retry. A reference photo can be old or captive and does not prove a recent hotspot sighting.

Successful matches and no-match results are cached in memory for 24 hours (300 entries); failures are not cached. Concurrent requests for the same name share work, at most three species load simultaneously, and at most 30 distinct lookups can be pending. Cards load near the viewport; changing screens aborts stale browser requests. Catalogue search remains usable while photos load. Original file URLs are retained as provenance. See [Photos walkthrough](../docs/PHOTOS_WALKTHROUGH.md).

The same Commons response now requests decoded file EXIF with `iiprop=metadata` and `iimetadataversion=latest`. No image download, upload parser or additional environment key is needed. Details display validated make/model/lens, exposure seconds, f-number, ISO, focal length and original capture time. Missing or malformed fields are null; unsupported/absent EXIF is explicit. Camera clocks are not converted into a hotspot timezone; only an explicit `OffsetTimeOriginal` provides an offset. GPS, owner and serial fields are never returned. Photography recommendations remain a separate next step. Restart a server without Node watch to clear the previous in-memory response shape. See [EXIF walkthrough](../docs/EXIF_WALKTHROUGH.md).

### Photography planning

On an external species detail, **Plan a Shot** scrolls to and focuses the existing Field Guide & Technique card. It reuses the same photo/EXIF request, displaying available exposure/focal-length examples and conditional preparation tips. General camera advice is separately labelled and linked to Nikon's technique reference. **Choose a reported hotspot** focuses the existing recent-location list; selecting a location opens its map, forecast/daylight and directions. No trip record is saved. No new API, dependency or environment setting is needed.

Photo-derived tips are withheld during loading/errors, for a different species ID or without supported settings. Missing values are not estimated. The example's shutter, lens and aperture are comparisons, not universal prescriptions. Capture timestamps are not used to infer activity, season or visit timing. Reviewed access snapshots are available for selected venues; unsupported fields and exact entrances remain unverified. See [Photography planning walkthrough](../docs/PHOTO_PLANNING_WALKTHROUGH.md).

### Sourced species information

On a real species detail, open **Identification, Habitat & Behaviour**, or choose the Habitat tile's **Identification & habitat details** link. Its first opening requests `GET /api/discovery/species/:speciesId/info` through the existing signed-in API. The server checks catalogue membership, matches scientific name/species rank on Wikidata and follows its English Wikipedia sitelink. The article must identify that same Wikidata entity and be a normal, non-disambiguation page. No extra key is needed; server internet access to `www.wikidata.org` and `en.wikipedia.org` is required.

Plain-text article excerpts provide supported description, habitat/range, behaviour and explicit migration-section information. Missing article/sections remain unavailable. Revision, contributor history, licence and identity links accompany shortened/reformatted text. Text is attributed to Wikipedia contributors under CC BY-SA 4.0; that does not assign a licence to the application code. Source descriptions can cover different sexes, ages, subspecies and regions, and do not establish local abundance, optimal visit times or difficulty ratings.

Successful/no-match results are cached in memory for 24 hours, limited to 200 names. Same-name loads share work; at most three active and 20 distinct pending lookups are allowed. Failed lookups are not cached. Requests cancel on navigation; HTTP 401 reuses the session reset, while provider errors have their own retry. Closing/reopening the disclosure retains its loaded result. Photos and reports load independently. A server without Node watch needs restarting after the new route is added. See [Species information walkthrough](../docs/SPECIES_INFORMATION_WALKTHROUGH.md).

### Persistent discovery saves and search history

Bird bookmarks and hotspot SAVE/header controls now use per-account SQLite records. In Search, choose Birds and **Saved birds only**, then clear the query to browse targets. Hotspots retains its existing **Saved** filter. Search starts empty; press Enter or open a bird/hotspot result to record a nonempty query. Recent chips replay/promote a search; their remove control and Clear All update the database. Typing alone does not write history. At most ten normalized, case-insensitively deduplicated searches (1–100 characters) and 500 saved references are retained per user.

The existing database gains `discovery_saves` and `search_history` automatically at startup; accounts/sessions are preserved. `GET /api/activity` returns your saves/history; `PUT /api/activity/saves/:kind/:id` takes `{saved: boolean}`; `POST /api/activity/searches` takes `{term}`; `DELETE /api/activity/searches` takes `{term}` or `{}` for Clear All. All routes require the existing session and mutations require an allowed Origin. User identity comes from the session, never a submitted user ID. New saves validate against the current eBird catalogue; existing references/history can be loaded and removed without provider access.

The client waits for the server before changing state or confirming success. Mutations are serialized within this app session; controls wait while loading/updating, and failed initial loads have Try again. Logout clears local state and aborts old requests. Persistent records store source IDs, not a copied offline catalogue: saved hotspots outside the configured region and removed taxa are retained but not shown until present in the loaded catalogue. Discovery/provider availability is still required to browse their details. Other tabs see changes after refresh; realtime synchronization is not implemented. Community saves, journal records and trip persistence remain later work. See [Discovery activity walkthrough](../docs/DISCOVERY_ACTIVITY_WALKTHROUGH.md).

### Nearby discovery and Explore weather

Choose the location label on Explore or the existing Current location icon in Hotspots. The inline picker offers **Use device location**, manual latitude/longitude and **Clear location and return to region**. Device GPS is requested only after a click, once with a ten-second timeout. It needs a secure browser context and permission; plain HTTP LAN previews usually require the manual fallback. The location stays in React memory and clears on refresh/logout; saved bookmarks/history remain persistent.

Distances use the Haversine formula in the browser, with unrounded values for filtering and one decimal for display. Nearby includes hotspots within 50 km of the selected point, sorted nearest first. Maps and cards share the filter. Popular and Saved cover the entire loaded configured region, sorted by distance when selected. Explore joins recent reports to these nearby hotspot IDs. An empty nearby set is an honest empty state, not a substitute region or assumed local abundance. This does not query worldwide eBird geographic endpoints or calculate road distances.

`POST /api/discovery/weather` accepts numeric `{latitude, longitude}` under the existing session/origin protection. Both browser and server round to two decimal places before the existing Open-Meteo forecast service is used. Coordinates stay out of browser API URLs and are not stored in SQLite; the provider request uses the rounded coordinates in its normal forecast URL. The server holds anonymous bounded forecast cache keys. Forecasts retain 15-minute/100-entry caching and at most 20 distinct in-flight coordinate requests, sharing duplicates. This endpoint works independently of the eBird key/catalogue. Explore displays temperature/wind/condition, timezone, source time, retrieval/cache information, source/licence and separate retry state. Existing hotspot forecasts stay independent. No new API key or dependency is needed. See [Nearby/weather walkthrough](../docs/NEARBY_WEATHER_WALKTHROUGH.md).

### Reviewed hotspot access

The existing **Plan Visit & Entry Gates** disclosure supplements eBird with manually reviewed official-source snapshots for Lodhi Gardens and two Sunder Nursery records. Each fact has source links; unknown fields stay unavailable, conflicting operator last-entry times are disclosed and values older than 90 days are withheld in the UI. Directions still use the hotspot point, not a confirmed gate. No new key, endpoint, database or dependency is required. Other hotspots remain unverified. See [Access walkthrough](../docs/HOTSPOT_ACCESS_WALKTHROUGH.md).

## Deployment prerequisites

Build the frontend, set `NODE_ENV=production`, `APP_ORIGIN` to the exact HTTPS origin, and `DATABASE_PATH` to a persistent private disk location, then run `pnpm start`. Configure the host and port for the chosen platform and serve HTTPS through its reverse proxy. The Express server serves the built frontend in production. Hosting, backups and a mail provider are not configured yet.
