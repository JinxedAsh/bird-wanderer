# Discovery saves and search history

Implemented 4 October 2026. This Phase 1 increment keeps personal discovery activity after refresh, logout/login and API restart. It builds on the existing React/Express/SQLite application; no new framework or dependency is required.

## What teammates can use

1. Sign in and open an eBird bird. Its bookmark adds/removes a field target. Go to Search, select Birds and enable **Saved birds only**; clear the query to browse saved birds.
2. Open an eBird hotspot. Its header bookmark and SAVE button represent the same account record. The existing Hotspots **Saved** filter shows bookmarked locations.
3. Search starts empty, without fabricated history. Type a query and press Enter, or open a bird/hotspot result. The latest ten actual queries appear as Recent Searches. A chip reuses/promotes a term; its close button removes it; Clear All removes history.
4. Refresh or sign out/in. Bookmarks/history return for that account. A different account has its own records.

Typing alone does not store queries. A failed operation does not claim success or alter the visible bookmark/history. Controls wait until initial activity has loaded and while an update is running. A failed initial load has a Try again control; discovery can still function independently.

## How it works

The server adds two tables to the existing private SQLite database using `CREATE TABLE IF NOT EXISTS`. Existing users, password hashes and sessions are preserved. `discovery_saves` stores `(user_id, kind, item_id, created_at)` with a composite primary key. `kind` distinguishes an eBird species code from a hotspot ID. `search_history` stores `(user_id, term_key, term, searched_at)`; normalized lowercase keys deduplicate searches while the displayed term retains the latest casing.

The shared session middleware sets `req.userId` from the valid session cookie. Every query includes that user ID. A browser-submitted user ID has no effect. Prepared SQL parameters prevent search text from becoming SQL code. Foreign keys link activity to its owner; deleting a user also deletes these rows.

| Endpoint | Purpose |
| --- | --- |
| GET `/api/activity` | Load your saved IDs and ordered searches without calling eBird |
| PUT `/api/activity/saves/:kind/:id` with `{saved: boolean}` | Set an explicit saved state; repeated identical requests do not create duplicates |
| POST `/api/activity/searches` with `{term}` | Normalize, insert/promote and prune history to ten entries |
| DELETE `/api/activity/searches` with `{term}` or `{}` | Remove one term, or clear your history |

New bookmarks must match the trusted eBird catalogue and valid source-ID syntax. Maximum 500 references per user. Removal remains possible through the API when the provider fails or the configured region changes. History accepts 1–100 characters after whitespace normalization, rejects control characters and deduplicates case-insensitively. Upsert/pruning runs in one transaction; monotonically ordered timestamps preserve recency even when requests share a clock value.

`activity.ts` sends cookie-authenticated requests, checks response shapes and distinguishes HTTP 401 from connection/provider failures. `App.tsx` owns one activity state and applies saved hotspot flags to loaded provider records. Species details receive a controlled saved flag rather than owning an independent external bookmark. One pending-mutation guard prevents conflicting whole-state responses within the app. AbortController and account/controller identity checks prevent responses from a departed session updating the next account.

## Files and responsibilities

| File | Change |
| --- | --- |
| `frontend/server/activity.mjs` | Tables, per-user activity routes, validation, bounds and history transaction |
| `frontend/server/auth.mjs` | Reuse session middleware and mount protected activity routes |
| `frontend/server/activity.test.mjs` | HTTP ownership, validation, provider dependency, bounds and database-reopen tests |
| `frontend/src/lib/activity.ts` | Typed client and session/error handling |
| `frontend/src/App.tsx` | Load/reset shared account state, confirmed updates and request guards |
| `frontend/src/components/SpeciesDetailScreen.tsx` | Controlled external bird bookmark; existing sample behavior remains |
| `frontend/src/components/HotspotDetailScreen.tsx` | Both save controls wait for the same confirmed state |
| `frontend/src/components/GlobalSearchScreen.tsx` | Real history controls, explicit recording and saved-bird filtering |
| `frontend/server/frontend.test.mjs` | History/controlled bookmark rendering and client response/request validation |
| `frontend/package.json` | Include activity integration tests in the existing runner |
| Both READMEs and `docs/DEVELOPMENT_RECORD.md` | Setup, current-state and chronological delivery evidence |

## Verification and limits

TypeScript, all **64 tests**, and the production build passed. Tests verify signed-out rejection, origin restrictions, ID/source validation, account isolation, idempotent saves, provider-failure handling, removal without provider calls, case-insensitive deduplication, ten-entry pruning, ordering with a fixed clock, validation, SQL-like inert text, removal/clear, 500-save bounds and database-reopen persistence. Frontend tests check escaped supplied history, controlled bookmark/disabled state, request methods, response validation and session/network/provider distinctions. Existing authentication/discovery/photos/EXIF/species-information/weather/proxy checks continue to pass. Browser evidence is recorded in Development Record Entry 21.

This persists source references, not complete offline datasets, downloaded photos or saved trip plans. Browsing still uses the current eBird catalogue. A saved hotspot from another configured region or a removed taxon is retained in storage but not shown in the current catalogue. Cross-tab realtime updates are not implemented; refresh reloads saved state. Community bookmarks, prototype journal/life-list statistics and actual observed-species records are separate later-phase work. A saved target does not count as a logged sighting. Physical-phone/design acceptance and genuine outage presentation remain manual checks.

## Viva Notes

We replaced temporary discovery bookmarks and example history with account-owned database records. React still renders the same screens; Express validates requests and SQLite keeps the records when the application restarts. The session determines ownership, so one person cannot select another person's records by changing a request body.

Important modules/functions: `activityRouter` defines storage and routes; `requireSession` obtains the owner; the client `activity.load/save/search/removeSearch` sends requests; `updateActivity` confirms changes and handles failures; `isDiscoverySaved` joins source IDs to account preferences. Concepts include persistence, authentication versus authorization, composite keys, idempotent operations, transactions, validation and request cancellation.

1. **Why use IDs rather than names?** eBird source IDs identify the intended record even when names change or collide. Species and hotspots also have separate kinds.
2. **How are two users separated?** The server reads identity from the session and scopes every activity query by `user_id`; it ignores submitted user IDs.
3. **Why PUT with a boolean instead of a toggle endpoint?** Repeating a request should set the same state. A retry cannot accidentally reverse the choice.
4. **Why a transaction for searches?** Updating a query and pruning old entries must complete together, maintaining the ten-entry limit consistently.
5. **What happens when saving fails?** The UI keeps its last confirmed state and explains the error. HTTP 401 resets the session; provider/network errors allow another attempt.
