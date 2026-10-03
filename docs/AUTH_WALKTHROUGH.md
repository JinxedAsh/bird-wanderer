# First increment: real accounts and sessions

## What runs where

The React interface runs on localhost:3000. Vite forwards /api requests to Express on 127.0.0.1:3001. Express owns account validation and database access. The browser cannot open the SQLite file directly.

This first increment uses Node 24 and its built-in SQLite support. The database is local and persistent, with no external account needed. Production deployment must use persistent disk and HTTPS; this is a single-server foundation, not a horizontally scaled database setup. Evaluate PostgreSQL before the geospatial feature implementation if database-side geographic queries are needed.

## Follow registration through the code

1. AuthScreen.tsx collects a name, email and password. It starts empty rather than preloading example credentials. It displays server errors and disables repeat submission while waiting.
2. src/lib/auth.ts sends JSON to POST /api/auth/register using a same-origin request.
3. server/auth.mjs validates the origin and input and rate-limits authentication attempts by IP and normalized email.
4. The server uses scrypt with a random salt. The users table stores the resulting hash, never the plain password. A unique email constraint prevents duplicate registrations, including concurrent requests.
5. The server generates a random session token. It stores only a SHA-256 digest of that token in the sessions table and gives the browser the token in an HttpOnly, SameSite=Lax cookie. Production also marks it Secure.
6. The response contains only the user's ID, name and email. App.tsx uses that identity in the greeting and settings email.

## Login, refresh and logout

- Login verifies the password hash and issues a fresh session. Wrong credentials return a generic error.
- Refresh calls GET /api/auth/me. The browser automatically includes the session cookie; the server checks it against stored, unexpired sessions.
- Sessions expire after seven days. Logout removes the server session and clears the cookie. Replaying the old token then returns 401.
- An unavailable API produces a retry message rather than silently treating a failed request as a successful login.
- Each future protected API must perform its own authorization checks. Hiding a frontend screen is not backend security.

## What is still unfinished

Password recovery has no mail provider yet and explicitly says that no email was sent. Email verification, password change and recovery are follow-up tasks. Most non-auth screens still use fixtures; journal entries, community posts, profile edits and settings are not yet persisted or authorized through APIs. Fixture metrics must not be presented as live activity in the final demonstration.

The original design images are saved in docs/design-reference. No complete visual acceptance has been claimed: local browser testing was denied by browser policy during this increment.

## Checks performed

- TypeScript check and production frontend build.
- HTTP integration tests: account creation, public response shape, password hashing, hashed session storage, wrong passwords, unknown accounts, case-normalized email, token rotation, logout invalidation, duplicate registration, invalid input, foreign-origin rejection, malformed cookies, expiry, production cookie flags, rate limiting, persistence after restart and isolation between two user sessions.

## Manual demonstration

Start the app using the README instructions. Open http://localhost:3000, create a test account, confirm the greeting, refresh, and confirm the account remains signed in. Open Settings, check the email, log out, then confirm a wrong password fails and the correct password succeeds. Restart the API and verify that the account still exists. Use only a disposable test password during demonstrations.
