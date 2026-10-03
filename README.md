# Bird Wanderer

A mobile-first birdwatching and wildlife photography application built for a semester-long Software Engineering project.

Bird Wanderer brings species discovery, hotspots, photography logistics, personal observations and community activity into one interface. Development follows four increments, with the documented screen designs serving as the visual specification.

> **In development:** account registration, login, persistent sessions and logout are implemented. Most other screens currently use sample data. This repository is not a finished production service.

**Required delivery:** an Android app/APK. The current runtime is a React mobile web interface; Android packaging and device testing are still pending. Stage 1 frontend stabilization does not produce an APK.

## Current functionality

- Fifteen frontend screens for discovery, species, hotspots, community, observations, journal, life list, quiz, messages, profile, search, notifications, settings and authentication.
- Express authentication API with SQLite persistence, salted password hashes and server-managed sessions.
- Input validation, authentication rate limiting, origin checks and session invalidation on logout.
- Automated authentication integration tests, TypeScript checks and a production build.
- Stage 1 frontend fixes: complete local search results, shared hotspot bookmarks, live comment-panel updates, account identity, keyboard-accessible sheets and configurable API proxying.

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| API | Node.js 24, Express |
| Database | SQLite through Node's built-in SQLite module |
| Authentication | scrypt password hashing, hashed session tokens, HttpOnly cookies |
| Tests | Node.js test runner and HTTP integration tests |
| Package manager | pnpm 11.25.0 with a committed lockfile |

## Getting started

Install Node.js **24.15 or later in the 24.x line** and pnpm **11.25.0**. From the repository root:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://localhost:3000**. The development command starts the frontend and API together. Use `localhost`, which matches the configured allowed origin. Stop with Ctrl+C.

Create an account through the login screen. There are no preconfigured credentials and no cloud API key is required for authentication. Account data is stored in `frontend/data/bird-wanderer.sqlite`; it is intentionally excluded from Git.

For optional overrides, copy `frontend/.env.example` to `frontend/.env`. Never commit credentials or local databases.

On Windows, after installing dependencies, `./Start-Dev.ps1` from the repository root can start the application using Node on PATH or the available Codex runtime.

## Verification

Run from `frontend`:

```sh
pnpm lint
pnpm test
pnpm build
```

`lint` currently performs TypeScript checking. Tests use temporary databases and cover registration, invalid credentials, duplicate accounts, session rotation and expiry, logout, origin checks, rate limiting, restart persistence and user isolation. Frontend rendering tests cover search results, empty states, zero sightings and account identity; HTTP tests cover development and preview API proxying. These do not replace browser interaction or visual checks. GitHub Actions runs these checks on pushes and pull requests.

## Repository layout

```text
frontend/
  src/components/       Screen components
  src/lib/auth.ts       Browser authentication client
  src/data/mockData.ts  Prototype fixtures
  server/               API, database setup and integration tests
  scripts/dev.mjs       Frontend/API development launcher
docs/
  AUTH_WALKTHROUGH.md    Authentication implementation guide
  design-reference/     Original screen and architecture images
.github/                CI and contribution templates
```

The frontend and backend currently share one package under `frontend/`. Keeping them together makes the initial increment easy to run; backend code is isolated in `server/`.

## Delivery roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 — Core | Refined UI, authentication, species discovery, hotspots, photography logistics | In progress; checkpoint 6 October 2026 |
| 2 — Community | Persistent profiles, photo uploads, EXIF extraction, community interactions | Planned |
| 3 — Alerts | Subscriptions, sighting notifications, conservation privacy filters | Planned |
| 4 — Retention | Quiz and engagement features, remaining required interactions | Planned |

All four phases are required by **20 October 2026**. Password recovery, live external data, production hosting and complete visual acceptance are not implemented yet. Prototype content and statistics must not be mistaken for live observations.

## Documentation

- [Living project specification](https://docs.google.com/document/d/1_KcOFYP8ELQf6WegrDuPw5uNlLqqlc90Gf2x46mSUvc/edit?usp=sharing)
- [Agreed scope and deadlines](PROJECT_CONTEXT.md)
- [Initial source review](PROJECT_REVIEW.md)
- [Authentication walkthrough](docs/AUTH_WALKTHROUGH.md)
- [Stage 1 walkthrough and manual checks](docs/STAGE_1_WALKTHROUGH.md)
- [Design reference index](docs/design-reference/README.md)
- [Development and contribution guide](CONTRIBUTING.md)
- [Runtime and deployment notes](frontend/README.md)

Design references come from the team's specification. Runtime prototype imagery uses external URLs and still needs a source/attribution review before public release. No project-wide open-source license has been selected; existing file-level notices are preserved.
