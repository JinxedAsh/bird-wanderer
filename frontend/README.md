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

Implemented: registration, password hashing, login, session restoration, logout, origin checks and authentication rate limiting. Most other screens still display prototype fixtures. Password recovery does not send email yet; the interface reports this honestly.

See `../docs/AUTH_WALKTHROUGH.md` for the request/data flow and `../docs/DEVELOPMENT_RECORD.md` for deadlines and the living documentation link. Original screen designs are in `../docs/design-reference`.

## Deployment prerequisites

Build the frontend, set `NODE_ENV=production`, `APP_ORIGIN` to the exact HTTPS origin, and `DATABASE_PATH` to a persistent private disk location, then run `pnpm start`. Configure the host and port for the chosen platform and serve HTTPS through its reverse proxy. The Express server serves the built frontend in production. Hosting, backups and a mail provider are not configured yet.
