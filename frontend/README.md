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

```sh
pnpm lint
pnpm test
pnpm build
```

The lint command currently checks TypeScript types. Tests use temporary isolated databases and do not change your development accounts.

## Current status

Implemented: registration, password hashing, login, session restoration, logout, origin checks and authentication rate limiting. Most other screens still display prototype fixtures. Password recovery does not send email yet; the interface reports this honestly.

See `../docs/AUTH_WALKTHROUGH.md` for the request/data flow and `../PROJECT_CONTEXT.md` for deadlines and the living documentation link. Original screen designs are in `../docs/design-reference`.

## Deployment prerequisites

Build the frontend, set `NODE_ENV=production`, `APP_ORIGIN` to the exact HTTPS origin, and `DATABASE_PATH` to a persistent private disk location, then run `pnpm start`. Configure the host and port for the chosen platform and serve HTTPS through its reverse proxy. The Express server serves the built frontend in production. Hosting, backups and a mail provider are not configured yet.
