# Bird Wanderer — Development Record

- **Last updated:** 4 October 2026, India Standard Time (Asia/Kolkata).
- **Current project phase:** Phase 1 — core discovery and photography logistics.
- **Required final deliverable:** an Android application/APK.
- **Audience:** team members, evaluators and the developer; no code knowledge is required for the main sections.

## 1. Purpose and how to use this record

This is the main chronological record of development: what existed, what we changed, why we changed it, how it was checked and what remains unfinished. It brings together implementation history, verification evidence and team handover information.

Use this file as the factual basis for progress reports and additions to the team's original documentation. The [living project specification](https://docs.google.com/document/d/1_KcOFYP8ELQf6WegrDuPw5uNlLqqlc90Gf2x46mSUvc/edit?usp=sharing) remains the source of requirements and final designs. This record explains implementation progress; it does not replace or silently amend those requirements. The shared Google Doc has not been edited as part of creating this file.

Read the current-state summary first, then the dated entries for context. Technical filenames and evidence are provided separately so that a team member can understand the story without opening source code.

### Status labels

| Label | Meaning |
| --- | --- |
| Implemented | The behavior exists in the code; its verification limits are stated separately. |
| Automated checks passed | Programmatic checks passed for the recorded version. This does not imply successful manual or device testing. |
| Prototype | A demonstration using sample information or temporary memory rather than a complete real service. |
| Manual verification pending | A person still needs to check the running interface, design or device behavior. |
| Work in progress | Present locally but not yet recorded as a delivered, committed increment. |
| Planned | Agreed future work that has not been implemented. |

## 2. Project scope and current state

Bird Wanderer helps birdwatchers and wildlife photographers discover species and locations, plan photography opportunities, maintain observations and interact with other users.

### Agreed constraints

- All four specification phases are mandatory.
- The supplied screen designs are final and must be followed. A source review does not establish visual conformity.
- The first checkpoint is Tuesday, **6 October 2026**. A refined frontend and working login backend are the checkpoint minimum; full Phase 1 also requires discovery, maps and externally derived logistics.
- The overall development deadline is **20 October 2026**. A possible extension is unconfirmed.
- No technology stack was mandated. Preserve working code and avoid unnecessary rewrites or complex infrastructure.
- The final submission requires an **Android app/APK**, confirmed on 4 October. A browser-only or installable web application does not, by itself, satisfy that delivery requirement.
- Keep the private GitHub repository updated with tested, focused commits. Do not publish secrets, personal account data, databases or build output.

### What the team can accurately claim today

| Area | Actual state |
| --- | --- |
| Interface | Fifteen screen components exist. Frontend corrections and accessibility improvements have been implemented. Exact visual acceptance remains pending. |
| Accounts | Real registration, login, session restoration and logout are implemented. Accounts and sessions survive a server restart. |
| Discovery | eBird taxonomy, regional hotspots and latest regional reports are connected; search and existing detail screens use source IDs. Live API checks passed. Species-to-hotspot links, hotspot-specific recent reports and catalogue-matched all-time species lists are connected. Manual device acceptance remains pending. |
| Species photographs and planning | Credited Commons photos and same-file camera EXIF are connected. Plan a Shot opens the existing guide card with the selected photo's settings, conditional preparation, general technique and a hotspot/weather/directions path. Guidance uses one photo; verified environmental matching and multi-photo recommendations remain unfinished. |
| Maps and logistics | Interactive hotspot maps, coordinate-based directions and hotspot forecasts are implemented. Desktop browser checks passed pins/filtering/detail navigation, weather, coordinate directions and a 390-pixel layout. Physical-phone/outage acceptance remains pending. General photography planning tips are labelled as heuristics; open-photo metadata and verified access information remain incomplete. |
| Journal, profiles and social activity | Many interactions work temporarily within the running app. Most changes are not stored for later use. |
| Alerts and quizzes | Demonstration screens exist. Automated alerts, complete quiz progress and challenges are not delivered. |
| Android delivery | The final APK remains required. The user deferred packaging/deployment for this Phase 1 increment; mobile web and phone-browser acceptance are the current target. No Android package has been produced or device-certified. |
| Hosting | Local development and configurable same-network phone preview are supported. There is no public production website URL recorded. |

Phase 1 is **not complete**. Track acceptance criteria and demonstrated behavior rather than an estimated completion percentage.

## 3. Chronological development history

Entries are recorded in the order of work and decisions. Dates identify the known day of work; unknown times are not invented. The pre-existing frontend is credited as a starting point rather than presented as newly built during these increments.

### Entry 01 — Starting point and initial review

- **Date:** before/at the review on 3 October 2026.
- **Group:** baseline assessment.
- **Phase:** Phase 1 preparation.

**Starting point:** the project already had a React frontend with fifteen screens and a substantial amount of styling and sample content. Navigation and several interactions were implemented in the browser. Much of the apparent functionality was a demonstration rather than a stored, live service.

**Work performed:** inspected the source and the shared specification, identified the initial architecture and distinguished real functionality from sample behavior. Noted gaps in backend implementation, validation, persistent records, external data, privacy and complete user flows.

**Why this mattered:** the presence of a screen could otherwise be mistaken for a completed feature. The review established a baseline and helped prevent an unnecessary rewrite.

**Outcome and limits:** the initial review was source-level. Its statements about missing dependencies, untracked files and absent authentication describe that earlier snapshot and are now historical. They must not be quoted as the current project status.

### Entry 02 — Scope, designs and development approach confirmed

- **Date:** 3 October 2026.
- **Group:** requirements and planning.
- **Phase:** applies to all four phases.

**Decisions recorded:** all four phases are required; the supplied designs must be preserved; the checkpoint and overall deadline were confirmed; no particular stack is required. The living specification is linked in this record.

**Approach selected:** build on the existing frontend, deliver small understandable increments and prioritize the early checkpoint. Keep implementation explanations suitable for evaluation/viva. Do not assume that login alone fulfills the formal Phase 1 acceptance criteria.

**Design evidence:** original screen images and architecture/data-flow diagrams were extracted into docs/design-reference on 3 October, with a screen-to-image index. These are references, not a substitute for viewing the running application. The authentication reference was inspected during the first increment.

### Entry 03 — Application setup and real authentication

- **Date:** 3 October 2026.
- **Group:** development foundation and accounts.
- **Phase:** Phase 1 checkpoint foundation.
- **Status:** implemented; automated checks passed.

**Problem:** the interface alone could not securely register users, verify passwords or retain a signed-in session after refresh.

**Work performed:** installed dependencies and recorded their versions in a lockfile; added a small Express backend and a SQLite database; connected the existing account screen to real registration/login requests; implemented session restoration and logout; added the combined development launcher and startup instructions.

**What the user can do:** create an account, log in, refresh while remaining signed in, log out and use the account again after restarting the server. Incorrect credentials and server failures produce error messages.

**How it works in plain language:** the screen sends account information to the backend. The backend validates it and stores the account in a private database. It stores a password hash, not the original password. After a successful login, it gives the browser a session cookie, which identifies the session on later requests. Logout invalidates that session.

**Important safeguards implemented:** normalized and unique email addresses; name/email/password validation; scrypt password hashing with random salts; random session tokens stored as hashes; seven-day session expiry; HttpOnly and SameSite cookie settings; Secure cookies in production; request-origin checks; authentication rate limits; prepared database queries. Registration requires a password of at least twelve characters.

**Verification:** TypeScript checking, production build and five authentication test groups passed. Coverage included invalid credentials, duplicate accounts, input errors, token rotation, expiry, logout invalidation, origin checks, rate limiting, persistence after restart and separate user sessions.

**Limitations:** password recovery, verification emails and password changes are not connected. Account persistence does not mean that journals, profiles, uploads or social interactions are persistent. Browser/device and complete visual verification were not performed.

**Detailed explanation:** [Authentication walkthrough](AUTH_WALKTHROUGH.md).

### Entry 04 — Repository, reproducible checks and ongoing updates

- **Date:** 3 October 2026.
- **Group:** version control and collaboration.
- **Status:** repository initialized and pushed.

**Work performed:** put the application in the private [bird-wanderer repository](https://github.com/JinxedAsh/bird-wanderer), established startup/verification documentation, added contribution guidance and issue/PR templates, and configured GitHub Actions to check types, run tests and build the frontend. Generated output, dependencies, databases and secrets were excluded from version control.

**Correction made:** an ignore rule intended for the runtime database also excluded frontend fixtures. It was corrected so that sample source data is tracked while private runtime data remains excluded. This prevents a fresh checkout from losing required application files.

**Standing workflow:** check completed changes before pushing, keep commits focused, and inspect CI results. The repository remains private.

**Evidence:** initial setup commit `56cb81e`; fixture-tracking correction `41ec052`; ongoing repository-sync documentation `b5b9b7d`.

### Entry 05 — Complete repository assessment and implementation plan

- **Date:** 4 October 2026.
- **Group:** review and planning.
- **Status:** review completed without editing application files.

**Work performed:** reviewed the repository structure, important source/configuration/documentation files and tests; read the live specification; traced how screens share data and how authentication reaches SQLite. TypeScript and the five existing authentication test groups passed again. A fresh build and browser audit were not performed during that read-only review.

**Findings grouped by impact:**

- Discovery screens were sample-driven and lacked live species/hotspot/weather integrations.
- Separate local values caused inconsistent bookmarks, comments and statistics across screens.
- Search skipped some valid results and displayed unrelated demonstration results.
- Hardcoded identity and fallback values could show incorrect authors or counts.
- Observation metadata, privacy choices, chat replies, alerts and quiz progress were incomplete or simulated.
- The database stored only accounts, sessions and authentication limits; other user-owned records were absent.
- Exact design fidelity, accessibility interactions, deployment and complete end-to-end flows still needed verification.

**Plan prepared:** incremental stages for frontend stabilization, persistent records, real discovery/maps/logistics, observations/uploads, community, alerts, retention and submission checks. Dependencies and risks were explained. Stage 1 was the first implementation increment.

**Terminology:** specification **Phase 1** is the larger discovery/logistics MVP. Implementation **Stage 1** is the smaller frontend stabilization step. Completing Stage 1 does not complete Phase 1. The Android delivery decision below requires future packaging work to be added to the implementation plan.

**Plan baseline recorded at this point:**

| Implementation stage | Purpose and dependency | Original target window |
| --- | --- | --- |
| 1 | Stabilize frontend behavior, accessibility and startup; preserve authentication. | 4–6 October |
| 2 | Add persistent user-owned records, profiles and protected APIs, building on authentication. | 6–7 October |
| 3 | Connect real discovery data, maps and photography logistics, building on normalized species/hotspot records. | 7–10 October |
| 4 | Add validated uploads/EXIF, privacy, journal relationships and consistent counts. | 10–12 October |
| 5 | Persist community interactions and complete the specified navigation/utility flows. | 12–14 October |
| 6 | Match subscriptions against qualified sightings and deliver privacy-filtered alerts. | 14–16 October |
| 7 | Complete quizzes, progress and photography challenges after core flows work. | 16–17 October |
| 8 | Perform end-to-end acceptance, deployment/backup checks and submission documentation. | 18–20 October |

These are planning windows, not completion promises. The later Android APK clarification requires revising the plan to allocate packaging and device testing. Each stage should preserve previous behavior, use small commits, include relevant tests and explain its changes to the developer.

### Entry 06 — Stage 1 frontend stabilization

- **Date:** 4 October 2026.
- **Group:** frontend corrections, accessibility and development configuration.
- **Phase:** Phase 1 preparation; some existing later-phase prototype screens also received bug fixes.
- **Status:** implemented and pushed; manual visual acceptance pending.

The existing stack, screens and working authentication were preserved. No later-stage database schema, external integration, upload service or Android packaging was introduced.

| Area | Problem before the change | Result after the change |
| --- | --- | --- |
| Global search | Only the first bird and the second hotspot result were considered; people/posts could appear regardless of the query. | All matching records render. People/posts are filtered from available community records, and no-match searches show an empty state. |
| Hotspot bookmarks | Detail and list screens kept separate saved values. | Both read the shared hotspot record, so saving/un-saving is reflected in the Saved list. |
| Hotspot filters | A search could bypass Saved or Popular. | Search and the selected filter are both applied. An empty-result message is shown. |
| Community comments | The open panel kept an old copy of a post. | It keeps the post ID and reads the latest post, allowing new comments to appear immediately. Blank comments are rejected. |
| Following | The default Pro-author behavior could override an explicit unfollow. | An explicit follow/unfollow value takes precedence. Temporary prototype defaults are preserved. |
| Photographer identity | Unrecognized authors could receive Maya's biography. | Unknown authors use their own available identity, with unavailable profile information described honestly. |
| Signed-in identity | Settings and new sample posts used hardcoded identity information. | Settings, header labels/avatar source and new sample posts use the current account/profile. |
| Species information | Zero sightings became twelve; missing species could open a different bird. | Zero remains zero. An unavailable species produces an explanation. |
| Profile edits | Names lacked basic validation; canceled drafts could reappear. | Names are trimmed and validated. Reopening canceled edits reloads the saved session values. Privacy-choice drafts are also reset on reopening. |
| Keyboard accessibility | Several controls and sheets depended on mouse/touch interaction. | Labels and keyboard controls were added; five sheets manage focus, Escape, Tab navigation and focus restoration. |
| Small viewports/zoom | Zoom was disabled and sheets could exceed the viewport. | Browser zoom is enabled; sheets can scroll at short viewport heights. Focus indicators are visible. |
| Timers and state updates | Timers lacked cleanup; some updater functions also displayed toasts. | Timer IDs use refs and are cleaned up. Updaters calculate state without toast side effects. |
| Prototype feedback | Some actions claimed real GPS, audio, clipboard or saved-trip work had occurred. | Messages describe unsupported or simulated behavior accurately; controls remain available. |
| Development/preview | The proxy assumed API port 3001; preview lacked the API proxy. | Both modes use the configured API port. Preview can authenticate when the API runs separately. Invalid API ports fail clearly. |

**Verification:** `pnpm lint`, all **eleven** tests and `pnpm build` passed. The suite contained five authentication groups, four frontend-rendering regressions and two HTTP proxy tests. GitHub Actions passed for the final Stage 1 commit and pull request. The search, community and hotspot reference images were inspected, but the running interface was not visually certified.

**Delivery evidence:** branch `codex/stage-1-frontend`; implementation commit `ad347e3`; Android-requirement documentation commit `21f7631`; [draft PR #1](https://github.com/JinxedAsh/bird-wanderer/pull/1). At the end of Stage 1, the branch was pushed and the working tree was clean. PR #1 was left unmerged pending manual acceptance.

**Boundaries:** these fixes do not make journal/profile/social changes persistent, reconcile all statistics, implement real uploads or enforce conservation privacy. They also do not deliver complete alerts, messaging or quizzes.

**Detailed explanation and manual checklist:** [Stage 1 walkthrough](STAGE_1_WALKTHROUGH.md).

### Entry 07 — Android deliverable clarified

- **Date:** 4 October 2026, during Stage 1 delivery.
- **Group:** requirement clarification.
- **Status:** requirement recorded; implementation planned.

The user clarified that the intended product is a mobile app and selected **Android app/APK** as the evaluation deliverable. The current repository implements its interface as a mobile web application, which can run in a browser. That is a useful development foundation, but it is not yet an Android installation package.

The requirement was added to README.md and the Stage 1 walkthrough. Future work must select an appropriate packaging approach, provide working backend connectivity from the installed application and verify physical-device behavior. No native framework or packaging tool was selected or installed in Stage 1. Preserve the existing implementation where practical; do not assume a rewrite is necessary.

### Entry 08 — Phase 1 progress explained and phone preview guidance

- **Date:** 4 October 2026, after Stage 1 delivery.
- **Group:** demonstration guidance and status reporting.

**Progress explained:** authentication and frontend stabilization are implemented; live discovery, interactive maps, externally derived logistics, design acceptance and Android packaging remain.

**Local access explained:** the development address is `http://localhost:3000` on the computer running the server. No public deployment URL was provided. Instructions were given for starting the backend and frontend separately and accessing the interface from a phone on the same Wi-Fi, using the computer's local-network address and a matching allowed request origin.

The computer's local-network address can change; it is not a permanent project URL. The phone cannot use its own localhost address to reach the computer's server.

**Verification limit:** instructions were provided; no successful physical-phone test, installed Android build or visual acceptance was reported.

### Entry 09 — Phone-access configuration present in the working folder

- **Date observed:** 4 October 2026, while compiling this record.
- **Group:** local-network development access.
- **Status:** work in progress; uncommitted at this documentation snapshot.

Newer changes were found in eight existing files: frontend/.env.example, frontend/README.md, frontend/package.json, frontend/scripts/dev.mjs, frontend/server/auth.mjs, frontend/server/auth.test.mjs, frontend/server/index.mjs and frontend/vite.config.ts. Their authorship and completion are not inferred from this inspection.

**Behavior present in the local code:** `FRONTEND_HOST` makes the frontend's network binding configurable. `ADDITIONAL_APP_ORIGINS` allows explicitly configured phone origins while retaining desktop localhost login. The API compares origins against an exact allowlist; extra origins are validated, and production extras require HTTPS. The API can remain accessible only on the computer because Vite forwards phone requests to it.

**Why it matters:** it avoids repeatedly replacing the desktop origin just to test the interface on a phone, while continuing to reject unknown origins.

**Checks performed for this snapshot:** TypeScript checking and all **twelve** tests passed. The additional authentication test covers permitted phone login/session/logout and rejection of unknown or lookalike origins. The Stage 1 build result above belongs to the committed Stage 1 version; no new production-build or CI success is asserted for these uncommitted changes. Physical-device and browser interaction checks remain pending.

**Recording rule:** these files were inspected, not edited or included in this documentation commit. A later completed phone-access increment must record its actual commit, verification and delivery before being treated as delivered.

### Entry 10 — Consolidated documentation and maintenance rule

- **Date:** 4 October 2026.
- **Group:** team handover and project reporting.

**Request:** provide one proper, chronological and clearly grouped file that team members can understand without working with the source, and that can support the original documentation.

**Work performed:** consolidated the baseline, requirements, account implementation, repository setup, review/plan, Stage 1 changes, Android clarification, phone guidance, verification evidence and remaining limitations into this record. Linked it from the README. Added a maintenance rule to the contribution guide.

**Scope:** documentation only. Existing application work in progress is left intact. The detailed walkthroughs remain available as supporting references rather than being deleted or rewritten.

**Repository status verified during handover:** Stage 1 PR #1 has subsequently been merged into main (`27c259c`). The draft/unmerged status in Entry 06 describes the end of that earlier implementation session. This record was introduced in documentation commit `cdae702`, whose push checks passed. The documentation changes are proposed separately from the already merged application increment.

### Entry 11 - Phone preview and shared-documentation publication

- **Date:** 4 October 2026.
- **Group:** local-network testing and repository documentation.
- **Status:** implemented; local automated checks passed; manual phone testing pending.

**What changed:** prepared the eight phone-access files listed in Entry 09 for publication. Desktop localhost login remains supported while explicitly configured phone origins can sign in through the frontend proxy. Unknown origins remain blocked. Setup instructions explain the frontend network binding and origin allowlist.

**Documentation policy:** the Development Record, README, contribution guide, design references and implementation walkthroughs remain shared project documentation. Personal review/context notes are retained locally, removed from the current tracked contents and ignored for future commits. Shared documents no longer depend on those local notes or reproduce private working discussions. Earlier committed versions remain in Git history; this update does not rewrite history.

**Affected files:** the eight files in Entry 09, root .gitignore, README.md, CONTRIBUTING.md and this record. Two personal working-note files are untracked without deleting their local copies.

**Verification:** TypeScript checking, all twelve tests and the production build passed for this increment. Physical-phone login, mobile layout and Android packaging remain unverified. This increment does not implement later project stages.

**Delivery:** proposed in [PR #2](https://github.com/JinxedAsh/bird-wanderer/pull/2), alongside the shared development history. Publication and merge are separate steps; GitHub check results will be verified after pushing.

### Entry 12 - External discovery connected to eBird

- **Date:** 4 October 2026.
- **Group:** Phase 1 external datasets and discovery.
- **Status:** implemented; automated and live API checks passed; phone/browser acceptance pending.

**Problem:** discovery depended on sample birds and locations, which did not meet the external-data requirement.

**What changed:** added a session-protected discovery route to the existing Express application. The server uses a private eBird key to fetch the worldwide species taxonomy, configured regional hotspots and latest regional observations from the past 14 days. Stable provider IDs connect the records to the existing search/detail screens. Explore uses species with recent regional reports. A 15-minute memory cache shares successful results and concurrent requests. Loading, error/retry and empty states explain what is happening.

**User-visible result:** search now finds externally sourced species and regional hotspots, with real coordinates and source links. All-time hotspot species totals are distinguished from daily activity. Missing photos, weather, conservation information and photography metadata are explicitly unavailable. External records do not reuse prototype facts. Later-phase demonstrations remain separate and people/posts search results are labelled accordingly. The default region is Delhi; it is not a GPS-derived nearby radius.

**Verification:** TypeScript checking, all 19 tests and the production build passed. Discovery regressions cover normalization, caching, credentials, session protection, provider/setup failures and retries; rendering regressions reject invented external metadata; both proxies exercise discovery. Live eBird calls returned 11,167 species, 191 Delhi hotspots and 161 species with recent regional reports. A separate isolated HTTP check rejected anonymous access, accepted authenticated discovery and found Indian Roller and Okhla. No credentials or existing account data were included in output or source control.

**Affected files/modules:** discovery server/service tests and client helper; auth route mounting and server startup; App.tsx and existing Explore/search/species/hotspot screens; shared types; placeholder image; environment example/test script; rendering/proxy tests; README and discovery walkthrough. No new schema or framework was introduced.

**Limits:** latest regional reports are not complete hotspot history or sightings totals. Habitat/species enrichment, complete hotspot species inventory, maps, weather, photo metadata, persistent bookmarks and Android delivery still require later increments. Browser clicks, design fidelity and physical-phone behavior require manual testing. The cache is not a persistent offline fallback.

**Delivery:** implementation commit `ddb8b83`, published on `codex/external-discovery` in [PR #3](https://github.com/JinxedAsh/bird-wanderer/pull/3). The PR records the GitHub check and merge results; merging follows passing checks. Details and the manual checklist are in [Discovery walkthrough](DISCOVERY_WALKTHROUGH.md).

### Entry 13 - Species and hotspot discovery journey

- **Date:** 4 October 2026.
- **Group:** Phase 1 navigation and external detail datasets.
- **Status:** implemented; automated/live data checks passed; phone/browser acceptance pending.

**Problem:** a species report did not open its location, and hotspot details only showed the regional summary. That summary can omit species recently seen at a particular hotspot. Name-based links and screen-only history could also select or restore the wrong record.

**What changed:** added protected routes for species-specific regional locations and hotspot-specific recent reports/all-time taxon lists. Results are joined using stable eBird IDs and checked against the configured catalogue. Unknown taxa remain unmatched; explicitly private observations are excluded. Detail responses use a bounded 100-entry cache with a 15-minute lifetime, shared concurrent loads and retryable failures.

**User-visible result:** a species page lists matching hotspots that can be opened. A hotspot displays its own recent reported species and a catalogue-matched all-time list, with links back to species pages. Loading/error/empty states are explicit. Keyboard controls are available, and app history stores the selected record so Back restores the original species or hotspot. Existing account behavior, shared temporary bookmarks and later-phase prototypes remain intact.

**Verification:** TypeScript checking, all 26 tests and the production build passed. New regressions cover ID validation, public regional membership, multiple locations, private/unknown filtering, taxon joins, dedicated hotspot reports, cache/retry behavior, authenticated HTTP routes and rendering states. Live Lesser Whistling-Duck data led to Kanjhawala wetlands, which returned 69 recently reported species and 164 catalogue-matched all-time species; all recent species IDs were navigable. Separate empty recent responses were also observed and remained distinct from all-time records. An isolated live HTTP check returned 200 from both detail routes and 401 for signed-out access, without touching existing accounts.

**Affected files:** frontend/server/discovery.mjs, discovery.test.mjs and frontend.test.mjs; frontend/src/App.tsx, lib/discovery.ts and types.ts; SpeciesDetailScreen.tsx and HotspotDetailScreen.tsx; README/setup instructions, this record and the discovery walkthrough.

**Limits:** reports are the latest per location/species in a 14-day window, not a full observation history or a sighting guarantee. The all-time list may contain unmatched non-species taxa. In-app Back is implemented; browser URLs/deep links are not. Physical-phone interaction and visual/back-navigation acceptance are still manual. Maps, photography logistics, photo metadata, persistence and Android delivery remain separate work.

**Delivery:** implementation commit `1c3a4a9`, published on `codex/discovery-journey` in [PR #4](https://github.com/JinxedAsh/bird-wanderer/pull/4). The PR records check/merge results; merging follows passing checks. The [Discovery walkthrough](DISCOVERY_WALKTHROUGH.md) includes the current flow and manual checklist.

### Entry 14 - Interactive hotspot maps and directions

- **Date:** 4 October 2026, India Standard Time.
- **Group:** discovery and trip planning.
- **Phase:** Phase 1 core MVP.
- **Status:** implemented; automated checks passed; manual browser/phone verification pending.

**Requirement:** let a user see real discovery locations geographically and get directions to the selected hotspot, preserving the supplied screen structure.

**What changed:** the external Hotspots screen now has an interactive Leaflet map with OpenStreetMap imagery. Pins follow the same search, All, Popular and Saved filters as the cards. Selecting a pin highlights it and displays its name; its popup opens the corresponding hotspot by stable ID. The hotspot detail screen shows a map of that record and an Open directions link to Google Maps. Existing prototype map behavior is preserved on sample screens.

**How it works:** eBird supplies location coordinates, Leaflet provides map interaction, and OpenStreetMap supplies map tiles. A shared helper accepts only finite numeric latitude/longitude within valid ranges, preserving genuine zero values. Invalid locations have no map pin or directions link. Google Maps receives the destination coordinates through its documented URL format, without a maps API key. Popup names are inserted as text, not interpreted as HTML. Map resources are released when the screen closes, and resize handling keeps the map aligned with its container.

**Design and failure handling:** the Hotspots and Hotspot Detail reference images were reviewed. Rounded map areas and green pins remain within the existing screen layout; exact visual conformity is not yet certified. Loading, missing-coordinate and map-error states are explicit. Failed tiles offer Retry map; the hotspot list and external directions remain usable. OpenStreetMap attribution stays visible. No bulk tile downloads, offline map storage or GPS collection were added.

**Affected files:** new `frontend/src/components/HotspotMap.tsx` and `frontend/src/lib/maps.ts`; existing HotspotsScreen.tsx, HotspotDetailScreen.tsx, main.tsx, index.css, package.json, pnpm-lock.yaml and server/frontend.test.mjs; README.md, frontend/README.md and the discovery walkthrough/documentation record.

**Verification:** TypeScript checking, all **29 automated tests** and the production build passed. Three additional tests cover invalid/missing/zero/boundary coordinates, the exact Google Maps destination URL, and external map/directions/empty rendering. Existing account, discovery and proxy tests continue to pass. Leaflet is loaded as a separate browser module; server-rendering tests do not initialize a map.

**Manual checks and limits:** browser interaction verification was unavailable for this increment. Map tile loading, pan/zoom, touch, keyboard selection, pin popups, layout and opening Google Maps on a phone still need manual checks. Directions target the hotspot point, not a confirmed entry gate. GPS/distance sorting, weather, photo metadata, persistent bookmarks and Android packaging are separate work. This web build is not an APK.

**Delivery:** implementation commit `855dc55`, published on `codex/hotspot-maps` in [PR #5](https://github.com/JinxedAsh/bird-wanderer/pull/5). The PR records check/merge results; merging follows passing checks. See the [Discovery walkthrough](DISCOVERY_WALKTHROUGH.md) for manual checks and viva explanations.

### Entry 15 - Browser acceptance evidence and session/header fixes

- **Date:** 4 October 2026, India Standard Time.
- **Group:** Phase 1 reliability and presentation.
- **Status:** implemented; 30 automated tests, TypeScript checking and build passed; browser recheck of the fixes pending.

**Browser evidence before these fixes:** a separate project chat tested the running application in the built-in browser. Both localhost and the computer's Wi-Fi address were accessible in that testing session; the latest flow used the Wi-Fi address. Login, incorrect-password feedback, refresh persistence after fresh login, logout, discovery, search/empty results, hotspot filtering, map-pin selection and opening its matching hotspot passed. This was a desktop browser check, not a physical-phone certification or full feature audit. Opening Google Maps directions, all touch gestures and complete design matching were not established by those actions.

**Bugs identified:** an invalid session left the interface looking signed in until refresh; the externally hosted header logo appeared broken. Missing bird photos/weather/travel details are pending Phase 1 functionality, while Journal/Community demonstration data belongs to later increments.

**Fixes:** protected discovery requests now raise a distinct session-expired error for the app server's HTTP 401 response. Catalogue, species-location and hotspot-detail requests clear the signed-in interface on that error. Logout reuses the same reset function, which clears user identity, discovery/detail state, temporary bookmarks and navigation. Returning to the page checks the current session through the existing `/api/auth/me` endpoint; obsolete checks cannot update a replaced session. Network/provider failures do not force logout. This does not continuously poll idle sessions: expiry is detected on a protected request or return to the page.

The header logo now uses a bundled SVG following the supplied green bird emblem, removing its dependency on the unavailable external image. Header dimensions/navigation remain unchanged. Exact visual acceptance of the local asset remains pending.

**Files changed:** App.tsx, lib/auth.ts, lib/discovery.ts, components/Header.tsx, public/bird-wanderer-logo.svg and server/frontend.test.mjs, plus this record and the discovery walkthrough.

**Checks:** all 30 tests passed, including a new test exercising all three protected discovery clients on HTTP 401, provider HTTP 503 and network failure. Incorrect-password errors remain ordinary login errors, and `/api/auth/me` returns null for an invalid session. Existing map/authentication/discovery/proxy checks pass. TypeScript and the production build passed. The React transition and focus listener still require a browser recheck; client tests alone do not establish their interaction behavior.

**Manual recheck:** end a test session in another tab, then return to the original page or trigger a discovery request; confirm login appears without refresh and old records/bookmarks disappear. Check that an isolated eBird outage does not sign the account out, fresh login still restores discovery and the header logo loads. Avoid changing real account data for this test.

**Browser follow-up during Entry 16:** the local logo displayed, authentication regressions passed, and logging out in a second tab followed by opening a hotspot in the original tab returned to login without refresh. Pure window-focus recovery was not confirmed: closing a browser tab/sending keyboard input did not establish a genuine window-focus event through the testing tool. This remains an acceptance limit, not a demonstrated focus-listener pass. Provider-outage behavior is covered by client tests but was not checked in the browser.

**Delivery:** implementation commit `29312fc`, published on `codex/session-and-brand-fixes` in [PR #6](https://github.com/JinxedAsh/bird-wanderer/pull/6). The PR records check/merge results; merging follows passing checks. Next increment: weather and sourced trip-planning information. No test-account credentials or browser screenshots are included in the repository.

### Entry 16 - Hotspot forecasts and photography planning

- **Date:** 4 October 2026, India Standard Time.
- **Group:** discovery and trip planning.
- **Phase:** Phase 1 core MVP.
- **Status:** implemented; automated, live-provider and scoped desktop browser checks passed; remaining acceptance limits below.

**Requirement:** replace unavailable hotspot weather with externally sourced, location-specific information that helps plan a photography visit, preserving the existing detail screen.

**What changed:** a signed-in user can open a real hotspot and expand its existing Detailed Micro-Weather section to see model temperature, wind, humidity, precipitation, cloud cover and conditions; sunrise/sunset for two dates; and up to six upcoming hourly forecasts. The summary temperature chip uses the same response. Open-Meteo source/licence, model time, local timezone and UTC retrieval time are visible. No paid weather key, device GPS, database migration or new framework was introduced.

**How it works:** `/api/discovery/hotspots/:hotspotId/weather` validates the ID against the configured eBird catalogue before using its coordinates. Arbitrary locations cannot be requested through this route. The new weather service fetches Open-Meteo, checks units/timezone/array structure, normalizes missing measurements to null and preserves zero. Successful forecasts are cached for 15 minutes, limited to 100 coordinate pairs; concurrent loads are shared and failures remain retryable. Client requests are cancelled when navigation changes, and responses are matched to the selected hotspot ID. Weather failure does not block the map or species reports. App-session rejection follows Entry 15's login reset; provider failures do not sign out the user.

**Photography guidance:** first hour after sunrise/last hour before sunset are presented as approximate planning windows, not calculated golden-hour boundaries. Wind, precipitation and heavy-cloud tips depend on reported conditions but are explicitly general rules, not predictions of bird activity, measured exposure settings or photo-derived recommendations. Verified fees, access hours, camera passes, entrance information and photo metadata remain unavailable. Explore has no selected/verified location, so its weather placeholder is not filled with an arbitrary hotspot forecast.

**Files changed:** new server/weather.mjs, server/weather.test.mjs and components/HotspotWeatherPanel.tsx; discovery.mjs/discovery.test.mjs/frontend.test.mjs, lib/discovery.ts, App.tsx, HotspotDetailScreen.tsx and package.json; shared setup/README files, this record and WEATHER_WALKTHROUGH.md.

**Verification:** TypeScript, all **35 tests** and production build passed. New weather tests cover coordinates, units, zero/missing values, timezone/local timestamps, sunrise/sunset nulls, upcoming hours, concurrent sharing, cache separation/expiry, invalid structure, HTTP/provider/network failures and retry. Protected-route checks verify signed-out rejection and ID membership before querying weather. Rendering checks cover loading/error, attribution, heuristics and sourced values. Existing account/discovery/map/proxy checks pass.

**Live service evidence:** Lodhi Gardens (`L2265071`) successfully returned an Open-Meteo forecast using the exact eBird coordinates. At model time 4 October 2026, 11:00 in Asia/Kolkata, it reported 32°C, wind 7.8 km/h, humidity 39%, zero precipitation and clear conditions. Sunrise/sunset were 06:15/18:03 for 4 October and 06:16/18:02 for 5 October; 24 upcoming hourly rows were normalized, and a second request used the cache. These are a recorded forecast snapshot, not permanent values or on-site measurements.

**Browser results:** the designated project testing chat reloaded the current app at the computer's Wi-Fi address. The header logo, wrong-password rejection, login, refresh persistence and logout passed. A protected request from an invalidated session returned to login without refresh. Lodhi Gardens showed 32°C, wind 7.8 km/h, humidity 39%, zero precipitation/cloud cover, local model time, two dated sunrise/sunset pairs, six hourly rows, attribution and approximate tips. Rapid navigation from Asola to Lodhi retained the correct final weather; reopening Asola showed its distinct readings. The weather table and map zoom controls were usable at 390 × 844 pixels. Google Maps opened the exact destination coordinates, 28.59253,77.22044, but labelled a nearby business rather than Lodhi Gardens; the coordinate link is not a verified entrance or named-place guarantee. Closely spaced pins overlapped for a broad Lodhi search; filtering to the exact name resolved selection. No source files, server processes or account records were changed by testing, only temporary login sessions.

**Acceptance limits:** pure focus-based session recovery was not confirmed because the tool could not establish a genuine window-focus event. Provider-outage/retry UI, physical-phone gestures, independent weather accuracy, verified entrances and complete design fidelity remain unverified. Rendered phone-width layout is not physical Android certification.

**Delivery:** implementation commit `f2f69fe`, published on `codex/hotspot-weather` in [PR #7](https://github.com/JinxedAsh/bird-wanderer/pull/7). The PR records check/merge results; merging follows passing checks. The [Weather walkthrough](WEATHER_WALKTHROUGH.md) gives the flow, acceptance checklist and viva notes. Next Phase 1 increment: source-attributed species photographs and open-photo metadata; remaining site-access data requires verifiable sources.

### Entry 17 — Real species reference photographs and attribution

- **Date:** 4 October 2026, India Standard Time.
- **Group:** external discovery and photography evidence.
- **Phase:** Phase 1 core MVP, remaining itinerary item 1.
- **Status:** implemented; automated, live-provider and scoped browser checks passed. Delivery evidence below.

**Requirement:** replace disconnected species imagery with identifiable external reference photos while preserving working discovery, account handling and the existing screen structure. The living specification was reread for this increment. External-photo EXIF belongs to Phase 1 but is the next increment; this delivery does not implement it.

**What changed:** Explore, Search and species details reuse one photo component. Creator, licence and Commons links accompany each accepted photograph. Details include full source credit, required attribution, usage terms, restrictions and a Wikidata match link. Cropping is disclosed. Existing image frames and controls remain; credit rows wrap underneath. Search cards now use a native species-selection button inside an article so attribution links are not nested inside a button. Credit clicks do not accidentally navigate to a bird.

**How it works:** the signed-in photo endpoint validates the existing eBird species ID. A separate server module finds an exact scientific-name claim and species rank on Wikidata, then retrieves the associated Commons file metadata. It accepts only supported raster formats, fixed HTTPS source hosts, eligible CC licences and mandatory author/source information. Metadata HTML becomes inert text rendered safely by React. No image binary is downloaded. Original file URLs are retained for future work, but neither EXIF nor location/camera settings are extracted.

**Reliability:** photo queries run separately from catalogue loading. Cards load near the viewport; changing species cancels stale client requests. Same-name requests share work; the server allows three active species lookups and 30 distinct pending lookups. Successful/no-match results are cached for 24 hours with a 300-entry limit; failures are not cached. Missing matches and broken/provider images keep the species page usable with a fallback; detail failures offer retry. App-session rejection reuses the existing reset-to-login behavior. No new dependency, database migration or framework was introduced.

**Source limits:** exact structured claims are not image recognition or independent biological verification. Taxonomy differences and unsupported licences can leave a species without a photo. A source photo may be old or captive, and is labelled a reference rather than a recent hotspot sighting. Supported licences are CC BY/CC BY-SA unported versions 1.0–4.0 as enumerated in the walkthrough, and CC0 1.0; other licences are skipped conservatively. Hotspot report thumbnails and later-phase prototype imagery are outside this increment.

**Files changed:** new `server/photos.mjs`, `server/photos.test.mjs`, `components/SpeciesPhoto.tsx` and `docs/PHOTOS_WALKTHROUGH.md`; updated `server/discovery.mjs`, `server/discovery.test.mjs`, `server/frontend.test.mjs`, `src/lib/discovery.ts`, `src/App.tsx`, ExploreScreen, GlobalSearchScreen, SpeciesDetailScreen, `frontend/package.json`, both READMEs and this record.

**Automated verification:** TypeScript checking, all **42 tests** and the production build passed. Added tests cover exact scientific-name/rank matching, rejected subspecies/deprecated claims, unsupported files/licences/URLs, safe credit rendering, cache expiry/concurrent sharing, malformed provider responses, protected endpoint membership and expired-session propagation. Existing account, discovery, maps, weather and proxy tests still pass.

**Live metadata evidence:** Indian Roller (`Coracias benghalensis`, Wikidata Q477133) resolved to Koshyk's CC BY 2.0 Commons photo; Common Kingfisher (`Alcedo atthis`, Q79915) to Artemy Voikhansky's CC BY-SA 4.0 photo; Lesser Whistling-Duck (`Dendrocygna javanica`, Q244284) to Olaf Oliviero Riemer's CC BY-SA 3.0 photo. The duck file names a German bird park in 2012, illustrating why a reference image must not be represented as a current Indian hotspot observation. These are source snapshots, not permanent provider guarantees.

**Browser verification:** the user-designated Test chat reloaded the running app. All four visible Explore photos rendered. Indian Roller and Common Kingfisher common/scientific searches and details passed; Roller, Kingfisher and Lesser Whistling-Duck hero images visibly rendered. Commons, licence and Wikidata links opened; search credit links did not select the card. Image clicks, species-button clicks and Enter selected the correct species. Rapid switching/leaving a loading species retained the final Kingfisher photo/credit. At 390 pixels, photos, wrapped credits, links and scrolling were usable. Logout, wrong-password rejection, login, refresh persistence and Lodhi weather navigation passed. The metadata-unavailable badge remained and no invented EXIF appeared on tested details. Testing changed temporary sessions only, not source, settings, branches, server processes or account records.

**Acceptance limits:** initial uncached cards briefly showed a placeholder before loading, whose loading wording could be clearer. No genuine provider outage occurred in browser testing, so forced failure/retry UI remains a manual check despite automated failure coverage. Physical Android testing, exhaustive races, all-species coverage and exact design acceptance remain pending. Photos do not complete Phase 1 logistics or Android packaging.

**Delivery:** implementation commit `837b7cd`, published on `codex/species-photographs` in [PR #8](https://github.com/JinxedAsh/bird-wanderer/pull/8). Local checks and the configured-key scan passed; the PR records final GitHub check/merge status. Automatic merge follows passing checks under the developer's standing authorization. Private review/context files, environment secrets, databases and browser screenshots were excluded. The [Photos walkthrough](PHOTOS_WALKTHROUGH.md) contains setup, source policy, manual checks and Viva Notes. Next: extract genuine metadata from eligible external photos, explicitly handling absent EXIF.

### Entry 18 — External reference-photo EXIF extraction

- **Date:** 4 October 2026, India Standard Time.
- **Group:** external-photo evidence and photography logistics.
- **Phase:** Phase 1, remaining itinerary item 2.
- **Status:** implemented; automated and live-provider checks passed; browser evidence below.

**Scope decision:** the developer explicitly deferred APK packaging/deployment for this phase to focus the remaining allowance on the Core MVP. Mobile web and phone-browser checks remain relevant, and the final Android deliverable is still required. No claim of Android completion is made.

**Requirement:** extract genuine camera metadata from externally sourced photographs instead of leaving the species photo metadata badge disconnected. User uploads and their binary processing are later-phase work; photography recommendations are the next separate increment.

**What changed:** the existing signed-in photo response now includes normalized EXIF from its exact selected Commons file. Species details display Reference Photo EXIF: camera make/model, lens, shutter, aperture, ISO, focal length and original capture time. Each missing field is unavailable; no supported fields produces an explicit absent/stripped/unreadable state. The hero badge follows loading/available/unavailable state. Existing photo credit, navigation, image retry, audio controls and discovery remain. Loading image alternative text now distinguishes loading from a failed photo.

**How it works:** the existing Commons image-information request adds decoded file `metadata` with its latest version. `normalizeExif` extracts a strict whitelist, converts exposure rationals to numbers and validates strings, finite positive values, duplicate/ambiguous entries, calendar dates and offsets. Formatted description-page `extmetadata` is used only for credit, never camera settings. GPS, owners, serials and comments are not returned. No full-size image is downloaded, no parser dependency/database table is added and no extra provider round trip is required. This is provider-decoded EXIF normalization, not local JPEG-byte parsing.

**Meaning of the evidence:** EXIF records can be edited. Settings describe one reference photo, not verified field conditions or recommended camera settings. Camera time remains as recorded, and an absent explicit offset means timezone unknown. Upload/editing/digitization dates do not substitute for capture time. The app does not calculate a best birding time or species-wide exposure recommendation from this single sample.

**Files changed:** new `frontend/server/exif.mjs`, `frontend/server/exif.test.mjs`, `frontend/src/components/PhotoMetadata.tsx` and `docs/EXIF_WALKTHROUGH.md`; updated `server/photos.mjs`, `server/photos.test.mjs`, `server/frontend.test.mjs`, `src/lib/discovery.ts`, `SpeciesPhoto.tsx`, `SpeciesDetailScreen.tsx`, `frontend/package.json`, both READMEs, `PHOTOS_WALKTHROUGH.md` and this record.

**Automated checks:** TypeScript, all **49 tests** and production build passed. New coverage verifies rational conversion, partial/missing EXIF, malformed numbers, leap dates/calendar/offsets, ambiguous ISO, duplicate tags, sensitive-field omission, same-file provenance rather than description claims, client response validation, decimal exposure accuracy and escaped rendering. Existing authentication, discovery, map, weather and proxy tests remain passing.

**Live source snapshots:** Indian Roller returned NIKON D300, 1/500 s, f/8, ISO 400, 390 mm and camera time 2011-10-11 09:27:38; Common Kingfisher returned Canon EOS-1Ds Mark III, 1/400 s, f/9, ISO 200, 400 mm and 2014-10-25 11:02:12; Lesser Whistling-Duck returned NIKON D7000, 1/400 s, f/2.8, ISO 640, 145 mm and 2012-03-27 17:54:50. All three lacked an explicit timezone offset. Their existing photos/creator/licence provenance from Entry 17 was preserved. These are recorded provider responses, not permanent values or proof of image authenticity.

**Browser verification:** Test chat reloaded the current app and confirmed the exact Roller and Kingfisher fields above, both labelled camera clock/timezone unknown. Loading/available badges behaved correctly on Roller-to-Kingfisher switching, with the photo, credits and EXIF staying together. Source, creator/licence and the not-independently-verified-or-recommended disclaimer remained visible. Explore, Search and detail photos rendered; the EXIF panel wrapped/scrolled at 390 pixels; Lodhi Gardens weather loaded after species navigation. No stale-server error occurred. The test made no source, server, settings or account changes and restored the viewport. None of the three inspected photos naturally had missing/partial EXIF, so those states remain automated-only coverage rather than a browser-confirmed pass.

**Remaining limits:** no guarantee of EXIF for every photo; malformed/unsupported metadata is conservatively unavailable. Genuine browser provider-outage/retry, independent EXIF authenticity, physical phone and complete design acceptance remain pending. Neither a reference photograph nor its clock provides live sighting/GPS evidence. Later-phase prototype field-shot badges remain outside this increment.

**Delivery:** implementation commit `151d79e`, published on `codex/external-photo-exif` in [PR #9](https://github.com/JinxedAsh/bird-wanderer/pull/9). Local checks and the configured-key scan passed; the PR records final GitHub check/merge status, with automatic merge following passing checks under standing authorization. Private context/reviews, environment secrets and databases remain excluded. The [EXIF walkthrough](EXIF_WALKTHROUGH.md) explains supported fields, privacy/timezone rules, acceptance checks and Viva Notes. Next: evidence-based photography logistics, keeping source-photo examples distinct from general guidance.

### Entry 19 — Source-aware photography planning and a usable Plan a Shot action

- **Date:** 4 October 2026, India Standard Time.
- **Group:** photography preparation and trip planning.
- **Phase:** Phase 1, remaining itinerary item 3 (initial planning increment).
- **Status:** implemented; automated checks passed; scoped browser results below.

**Requirement and scope:** reread the living specification's external-data photography logistics, camera equipment and progressive-disclosure requirements, and inspected the original species-detail design. The existing Field Guide & Technique card and Plan a Shot button were reused. This delivers initial source-aware preparation and navigation; a single photo cannot establish optimal or similar-environment settings, so those stronger requirements are not silently declared complete.

**What changed:** Plan a Shot now scrolls to and focuses the guide card instead of reporting disconnected logistics. The card shows the current reference photo's supported shutter, aperture, ISO and focal length, links to its source and describes exposure/lens comparisons. Separately labelled general technique links to Nikon's guidance. Choose a reported hotspot moves to the existing recent-location section; selecting a location opens the existing map, forecast/daylight and directions. The old description saying maps were disconnected was corrected. The guide and location sections accept programmatic keyboard focus, and scrolling respects reduced-motion preference. Prototype species keep their prior behavior.

**How it works:** SpeciesPhoto reports loading/success/error through an optional callback from the same photo request. SpeciesDetailScreen holds this state. PhotoPlanning checks species ID and successful completion before using photo values. Existing metadata formatters are reused so the example and EXIF panel agree. No duplicated request, backend/database change, package dependency or new screen was introduced. Existing abort/session handling remains.

**Evidence versus advice:** examples describe one photo, not a typical range, optimal preset or equipment requirement. A simple rule flags exposures longer than 0.001 seconds for a fast-flight blur check; shorter exposures still require testing. The threshold is an app rule of thumb, not a source-derived freeze-motion guarantee. Recorded focal length/lens and aperture are comparisons. General motion/ISO/autofocus advice is editorial and source-linked, not extracted EXIF. Capture dates do not infer visit time, season or current environment. Site access and actual entrance remain unverified; the guide asks the user to confirm them. Trip saving is explicitly unavailable.

**Files changed:** new `frontend/src/components/PhotoPlanning.tsx` and `docs/PHOTO_PLANNING_WALKTHROUGH.md`; updated `SpeciesPhoto.tsx`, `SpeciesDetailScreen.tsx`, `PhotoMetadata.tsx`, `server/frontend.test.mjs`, both READMEs and this record.

**Automated verification:** TypeScript, all **51 tests** and production build passed. Two new planning checks cover current-photo units/provenance, slow/short exposure guidance, partial/missing/loading/error evidence, mismatched species and no inferred photo timing or invented presets. One initial loading-state test failed because a supplied photo could contribute guidance during loading; source values are now withheld until successful completion, and the rerun passed. Existing authentication, discovery, photo/EXIF, map, weather and proxy tests remain passing.

**Browser verification:** Test chat confirmed Enter on Plan a Shot scrolls/focuses the guide, and Choose a reported hotspot scrolls/focuses the recent-location section. Kingfisher showed 1/400 s, f/9, ISO 200, 400 mm; Roller showed 1/500 s, f/8, ISO 400, 390 mm. Switching updated the correct example; planning source matched the photo's Commons source. Photos, EXIF and credits stayed intact. Single-photo, conditional, general Nikon technique and travel-check sections remained distinct, without optimal-preset, verified-environment, best-time or saved-trip claims. Graylag Goose's missing lens remained unavailable and was not invented in guidance. Its Lodhi Gardens report opened the correct hotspot, forecast and coordinate directions. At 390 pixels, cards wrapped/scrolled correctly. An initially stale server-unavailable screen recovered on reload without restarting or shared-file edits; the viewport was restored.

**Limitations:** no multi-photo statistics or verified matching of environmental conditions; no sourced best-time/season/difficulty inference; no saved itinerary. Fully absent EXIF/provider outages, physical-phone behavior and full design acceptance still need manual verification; one missing-lens case passed in the browser. Source-photo settings remain unverified records, and reports are not sighting guarantees. APK packaging remains deferred for this phase.

**Delivery:** implementation commit `dc5f7ea`, published on `codex/photo-planning` in [PR #10](https://github.com/JinxedAsh/bird-wanderer/pull/10). Local checks and the configured-key scan passed; the PR records final GitHub check/merge status. Automatic merge follows passing final-commit checks under standing authorization. Private context/reviews, secrets and databases remain excluded. The [Photography planning walkthrough](PHOTO_PLANNING_WALKTHROUGH.md) contains the rules, source boundaries, manual checks and Viva Notes. Next: sourced detailed species enrichment, retaining the current discovery and planning flow.

## 4. How the current application fits together

The interface is what the user sees and interacts with. The backend is the program that receives requests and checks account information. The database is where persistent account information is saved.

```text
User's screen -> React interface -> account request -> Express backend -> SQLite
                                      |
                           session cookie returned

Other current screens -> sample information and temporary React memory
```

In development, Vite serves the interface and forwards account requests to Express. SQLite currently stores users, sessions and authentication rate-limit records. There are no persistent sighting, journal, media, follow or alert tables. External discovery uses server-side eBird requests and a 15-minute memory cache; it does not add database tables.

React, TypeScript, Tailwind CSS, Vite, Express, Node.js 24 and SQLite remain the chosen implementation. Keeping one frontend/backend package is intentional for a manageable university project. The specification mentions microservices, but the current backend is a single Express application; that architectural wording still needs reconciliation against evaluator expectations. No microservice conversion has been implemented.

## 5. Verification and demonstration boundaries

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| TypeScript check | Type consistency in the checked frontend code. | Every runtime case or full JavaScript-backend type checking. |
| Authentication HTTP tests | Account/session behavior and tested server safeguards. | Real-browser cookie behavior or physical-device operation. |
| Frontend rendering tests | Correct HTML for tested search, identity and count cases. | Clicks, keyboard events, CSS layout or screenshot fidelity. |
| Proxy HTTP tests | Requests can reach the configured API through development and preview. | Every deployment or Android networking configuration. |
| Production build | The recorded version bundles successfully. | A public deployment, Android package or completed feature set. |
| GitHub Actions | The checked committed version passes configured checks. | Uncommitted local changes or every requirement in the specification. |

For demonstration, use disposable test accounts/passwords. Identify sample content honestly. An observation privacy switch is not proof that privacy is enforced by a server. A displayed photo is not proof of upload/EXIF processing. A notification card is not proof of automated delivery.

Manual checks still include design comparison for all screens, mobile layout/touch behavior, the five sheets' keyboard/zoom behavior, bookmark/comment consistency, account refresh/logout in an actual browser and physical Android testing. See the Stage 1 walkthrough for the steps.

## 6. Remaining work grouped by specification phase

| Phase | Remaining implementation and acceptance |
| --- | --- |
| Phase 1 — core | Complete species enrichment, stronger source/environment-supported logistics, persistent saves/search history, GPS/Explore weather, verified access information and design/manual/device acceptance. Discovery: Entries 12–13; maps/directions: Entry 14; weather: Entry 16; photos/EXIF: Entries 17–18; initial source-aware planning: Entry 19. APK delivery is deferred for this phase, not cancelled. |
| Phase 2 — community | Persistent profiles and sightings; validated photograph upload/storage; EXIF extraction; journal/life-list relationships and reconciled statistics; real feed/follows/likes/comments/reporting; server ownership/visibility checks. |
| Phase 3 — alerts | Subscriptions/preferences; qualifying-sighting matching; automated delivery; protected-species coordinate handling and privacy checks. Privacy must also be applied earlier wherever location data becomes accessible. |
| Phase 4 — retention | Complete identification quiz sessions, persistent progress and photography challenges without disrupting discovery. |
| Android/submission | Android packaging and backend connectivity, physical-device verification, appropriate deployment/persistence/backup checks and complete acceptance documentation. |

Other incomplete existing controls include password recovery, sourced audio, entity-specific sharing/navigation and simulated messaging. Their final scope and priority should follow the specification. No additional feature should be assumed complete from its appearance in the interface.

The next implementation step requires a plan that explicitly includes Android delivery.

### Known issues still requiring follow-up

- Journal membership, life-list flags and profile totals can disagree; several displayed totals remain sample values.
- Observation photographs/species IDs can be inconsistent, and camera metadata/verification labels are still fabricated in the prototype.
- Private/follower-only observation choices and sensitive-species settings are not enforced through persistent server records.
- Notifications use approximate title-based destinations rather than reliable target IDs.
- Several community filters lack complete real behavior; messaging replies are simulated and searches can bypass chat filters.
- The quiz has two sample questions, a preselected answer, no proper completion flow and no persistent streak/progress.
- Navigation has no entity-specific URLs; refresh/share cannot reliably return to a particular bird or hotspot.
- Frontend type checking does not fully check the JavaScript backend; unused dependencies and old metadata remain cleanup work.
- Protected-species coordinates, third-party data/image attribution, weak-network behavior and production backup/hosting requirements still require acceptance work.

These are review findings, not new implementations. Stage 1 resolved the issues listed in Entry 06; it did not silently classify the remaining items as complete.

## 7. Source files and evidence index

These paths help the developer find implementation details; teammates can understand the preceding sections without reading them.

| Group | Important files |
| --- | --- |
| External discovery | frontend/server/discovery.mjs; frontend/server/discovery.test.mjs; frontend/src/lib/discovery.ts; docs/DISCOVERY_WALKTHROUGH.md |
| Maps and directions | frontend/src/components/HotspotMap.tsx; frontend/src/lib/maps.ts; HotspotsScreen.tsx; HotspotDetailScreen.tsx; frontend/src/index.css |
| Weather and planning | frontend/server/weather.mjs; frontend/server/weather.test.mjs; frontend/src/components/HotspotWeatherPanel.tsx; docs/WEATHER_WALKTHROUGH.md |
| Species photographs | frontend/server/photos.mjs; frontend/server/photos.test.mjs; frontend/src/components/SpeciesPhoto.tsx; docs/PHOTOS_WALKTHROUGH.md |
| External-photo EXIF | frontend/server/exif.mjs; frontend/server/exif.test.mjs; frontend/src/components/PhotoMetadata.tsx; docs/EXIF_WALKTHROUGH.md |
| Photography planning | frontend/src/components/PhotoPlanning.tsx; SpeciesDetailScreen.tsx; SpeciesPhoto.tsx; docs/PHOTO_PLANNING_WALKTHROUGH.md |
| Accounts | frontend/src/components/AuthScreen.tsx; frontend/src/lib/auth.ts; frontend/server/auth.mjs; frontend/server/index.mjs; frontend/server/auth.test.mjs |
| Shared frontend state | frontend/src/App.tsx; frontend/src/types.ts; frontend/src/data/mockData.ts |
| Stage 1 components | BottomNav.tsx, CommunityScreen.tsx, ExploreScreen.tsx, GlobalSearchScreen.tsx, Header.tsx, HotspotDetailScreen.tsx, HotspotsScreen.tsx, LifeListScreen.tsx, LogObservationScreen.tsx, ProfileScreen.tsx, SettingsScreen.tsx, SpeciesDetailScreen.tsx, all under frontend/src/components |
| Accessibility | frontend/src/lib/useDialogFocus.ts; frontend/src/index.css; frontend/index.html |
| Runtime and checks | Start-Dev.ps1; frontend/scripts/dev.mjs; frontend/vite.config.ts; frontend/package.json; frontend/pnpm-lock.yaml; frontend/pnpm-workspace.yaml; frontend/.env.example; .github/workflows/ci.yml |
| Stage 1 regression tests | frontend/server/frontend.test.mjs; frontend/server/proxy.test.mjs |
| Repository hygiene | .gitignore; frontend/.gitignore; .gitattributes; CONTRIBUTING.md; .github/pull_request_template.md; .github/ISSUE_TEMPLATE/bug_report.md |
| Supporting documentation | README.md; frontend/README.md; AUTH_WALKTHROUGH.md; STAGE_1_WALKTHROUGH.md; design-reference/README.md and original images |

The Stage 1 delivery changed 26 files: twelve components, App.tsx, index.css, the focus hook, index.html, package.json, dev.mjs, vite.config.ts, two new test files and five documentation files. Its walkthrough/PR provide the detailed delivery context. Entry 09 describes the initial uncommitted phone-access snapshot; Entry 11 records its publication checks.

## 8. Updating this record after future work

Append a numbered, dated entry after each completed increment or material requirement change. Group related changes inside the entry. Preserve prior entries as history; if an earlier claim was wrong, add a correction explaining the change. Update the current-state summary separately so new readers see the latest state.

Use this template:

```text
Entry number and descriptive title
Date (India Standard Time)
Group and specification phase
Status: implemented / prototype / work in progress / planned
Problem or requirement
What changed, and why
User-visible result
Simple explanation of how it works
Affected files/modules
Checks performed and exact results
Manual checks and known limitations
Commit/PR evidence and whether merged
Remaining dependencies or next work
```

Only record tests actually run for that version. Keep local changes, pushed branches and merged delivery distinct. Update this file before pushing completed work; link to supporting walkthroughs rather than scattering the only explanation across conversations. Never copy passwords, tokens, device codes, private uploads or database contents into the record.

### Short glossary for teammates

- **Frontend:** the visible screens and interactions.
- **Backend/API:** the server that receives requests and performs operations.
- **Database/persistence:** saved information that survives refresh or restart.
- **Sample data/fixture:** demonstration information, not live observations.
- **Session/cookie:** how a signed-in browser is recognized on subsequent requests.
- **Origin:** the protocol, host and port of a request, such as http://localhost:3000; it is used when deciding which interface may perform an account action.
- **Rate limit:** a restriction on repeated requests, such as too many login attempts in a short period.
- **Password hash:** a one-way stored representation used to check a password.
- **EXIF:** metadata that may be embedded in a photograph, such as camera settings, time or location.
- **Commit/branch/PR:** a recorded change, a separate line of work, and a proposed review/merge respectively.
- **CI:** automated checks that run on GitHub.
- **APK:** an Android installation package; the current web build is not an APK.
