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
| Maps and logistics | Interactive hotspot maps and coordinate-based external directions are implemented; map gestures, tile loading and phone acceptance remain unverified. Weather and data-derived photography guidance remain incomplete. |
| Journal, profiles and social activity | Many interactions work temporarily within the running app. Most changes are not stored for later use. |
| Alerts and quizzes | Demonstration screens exist. Automated alerts, complete quiz progress and challenges are not delivered. |
| Android delivery | The requirement is recorded. No Android package has been produced or device-certified. |
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
| Phase 1 — core | Complete species enrichment and sourced photography logistics/weather/open-photo metadata; complete design/manual acceptance including maps. External catalogue/search and detail journeys are connected in Entries 12–13; maps/directions are implemented in Entry 14. |
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
