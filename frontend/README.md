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

After signing in, Explore shows species with recent regional reports. Global Search searches the worldwide eBird species taxonomy by common/scientific name and the configured region's hotspots by name. Results retain eBird species codes and location IDs. Hotspots shows the configured region, not a GPS-derived nearby radius. Use Saved to check bookmarks within the current session; bookmarks are not yet persistent.

The backend requests the taxonomy, regional hotspots and latest regional observations from the past 14 days. It caches the combined catalogue in memory for 15 minutes and shares concurrent loads. The retrieval timestamp stays unchanged when cached data is served. Cache is lost on server restart, and expired data is not silently used after a failed refresh.

Discovery requires a valid signed-in session. Missing/rejected keys, timeouts, provider failures and malformed responses produce an error with a retry control; the app does not substitute sample discovery results. Species results are limited to 60 displayed matches per query; refine broad searches to find more. Community/journal/quiz screens remain separate prototypes.

Latest observation reports are not total sightings counts. Hotspot species counts mean species recorded all time; missing counts and distances are unavailable. Observation times are shown as supplied by eBird in observation-local time. Regional latest-per-species reports do not provide a complete hotspot history. Opening a species now loads its matching regional hotspots, and opening a hotspot fetches its own recent reports and catalogue-matched all-time species list. Species/location links use stable IDs. The app Back button restores the selected record; browser deep links remain pending. Detail data is cached for 15 minutes with a 100-entry storage limit. Unmatched taxa are disclosed separately. Habitat, conservation status, photos, EXIF, weather, recommended gear, fees, opening hours and interactive maps are not supplied by this integration. Their placeholder states are explicit.

See [Discovery walkthrough](../docs/DISCOVERY_WALKTHROUGH.md) for the request flow, tests and manual acceptance checklist.

## Deployment prerequisites

Build the frontend, set `NODE_ENV=production`, `APP_ORIGIN` to the exact HTTPS origin, and `DATABASE_PATH` to a persistent private disk location, then run `pnpm start`. Configure the host and port for the chosen platform and serve HTTPS through its reverse proxy. The Express server serves the built frontend in production. Hosting, backups and a mail provider are not configured yet.
