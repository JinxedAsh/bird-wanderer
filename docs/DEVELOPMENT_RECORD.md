# Bird Wanderer — Development Record

- **Last updated:** 26 October 2026, India Standard Time (Asia/Kolkata).
- **Current project phase:** Phase 1 delivered foundation; full-project completion now authorized across Phases 1–4 and Android.
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
| Interface | Fifteen screen components exist. Six core screens passed scoped 320/390px browser checks. Live-document image hashes match repository references on 13 October; exact design approval and full physical-device acceptance remain pending. |
| Accounts | Real registration, login, session restoration and logout are implemented. Accounts and sessions survive a server restart. |
| Discovery | eBird taxonomy, regional hotspots and latest regional reports are connected; search and existing detail screens use source IDs. Live API checks passed. Species-to-hotspot links, hotspot-specific recent reports and catalogue-matched all-time species lists are connected. Manual device acceptance remains pending. |
| Personal discovery activity | eBird bird/hotspot saved IDs and the latest ten real searches persist per account in SQLite. Existing Saved hotspot filtering and Search saved-bird filtering use the same confirmed records. See Entry 21. |
| Species information | Credited identification, habitat and behaviour excerpts load on demand with exact taxonomy/article identity checks. Missing sections remain unavailable; local seasonal timing and difficulty are unverified. See Entry 20. |
| Species photographs and planning | Credited Commons photos and same-file EXIF are connected. The hero example remains; an on-demand disclosure compares up to three exact-species references with independent sample counts/ranges/credits. Forecast light windows and explicit condition heuristics support preparation. Imported annual statistics, measured difficulty and verified historical environment matching remain unsupported; limited seasonal narratives are scoped/cited. See Entries 28–29. |
| Nearby discovery and Explore weather | Optional one-time GPS/manual point enables 50-km filtering and nearest-first straight-line hotspot distances within the configured region. Explore uses the rounded selected point for attributed forecasts; no account location is persisted. See Entry 22. |
| Maps and logistics | Maps/directions/forecasts are implemented. Delhi also covers Gautam Buddha Nagar, explicitly labelled. Reviewed access covers four venues (Lodhi, Sunder, Yamuna I/II and three Okhla records). Conflicting hours, historical fees and unknown entrances/permissions are explicit. 320/390px browser checks passed; phone/outage acceptance remains pending. |
| Journal, profiles and social activity | First persistent slice delivered in PR #24/28218af: real uploads/EXIF, owned observations, profile/privacy preferences, journal/life-list membership and computed statistics. Private/follower/profile media access is server-enforced. Community likes/comments/follows/report UI is delivered in PR #25/50d6d7d with 94 passing tests, exact-head/main CI and scoped browser checks. Its 44px post controls/dismiss handle passed the followup browser check in Entry33. Sighting/forecast alerts and field messaging (#29/e085f4e) are delivered; global search/social notifications/pagination (#30/da676b7) are delivered. Journal editing/action acknowledgement and latest100 comments are implemented on PR #32, delivered in #32/564ce92 after scoped browser acceptance and four passing exact-head checks; merged-main CI passed; see Entry39 and FINAL_ACCEPTANCE.md. |
| Alerts and quizzes | Sighting subscriptions/readstate and optional Firebase core delivered in PR #26/e8aab1e (98 tests/type/build/CI and scoped browser QA). Forecast opportunities delivered in PR #27/196f251 after 101-test/type/build/CI and scoped browser QA. Retention practice/challenges delivered in PR #28/089edcd with 104 tests/type/build, scoped browser QA and exact-head/main CI passing. Real Firebase configuration/device receipt remain unavailable; native preview acceptance is recorded separately below. |
| Android delivery | Packaging is now in scope under the 23 October full-cycle instruction. Android preview #31/47cbef4 is merged with4 unit tests, lint0errors2warnings, debug/unsigned-release assembly and exact-head/main CI passing. Scoped API35 emulator picker/privacy/back/connection/guard checks passed; successful GPS, physical Oppo and HTTPS release acceptance remain pending. The backend still runs on a reachable server. Historical Phase 1 deferrals are preserved in old entries. |
| Hosting | Local/LAN and managed temporary Cloudflare previews are supported. Real HTTPS loading/login/refresh/photos/manual-location checks passed; DNS failed before final logout confirmation. No permanent production deployment or uptime guarantee exists. |
| Backup/release reliability | Offline SQLite/media backup verification, actual-app restore and production loopback proxy trust implemented in Entry42;124 tests/type/build and independent integrated rehearsal passed. PR #35 final delivery pending; no live/off-host/production-uptime claim. |

Phase 1 is **not certified complete** against every detailed evidence/manual criterion. PR #22 is verified merged at a990239 with passing merged CI; its tests/browser checks remain dated 13 October. On 23 October the user expanded execution to the full development cycle including Android. The persistent cores of all four phases are delivered, with specific remaining controls and external/manual dependencies tracked in FINAL_ACCEPTANCE.md. See PROJECT_COMPLETION_PLAN.md for the finite queue.

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

**Delivery evidence:** branch `stage-1-frontend`; implementation commit `ad347e3`; Android-requirement documentation commit `21f7631`; [draft PR #1](https://github.com/JinxedAsh/bird-wanderer/pull/1). At the end of Stage 1, the branch was pushed and the working tree was clean. PR #1 was left unmerged pending manual acceptance.

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

**Delivery:** implementation commit `ddb8b83`, published on `external-discovery` in [PR #3](https://github.com/JinxedAsh/bird-wanderer/pull/3). The PR records the GitHub check and merge results; merging follows passing checks. Details and the manual checklist are in [Discovery walkthrough](DISCOVERY_WALKTHROUGH.md).

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

**Delivery:** implementation commit `1c3a4a9`, published on `discovery-journey` in [PR #4](https://github.com/JinxedAsh/bird-wanderer/pull/4). The PR records check/merge results; merging follows passing checks. The [Discovery walkthrough](DISCOVERY_WALKTHROUGH.md) includes the current flow and manual checklist.

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

**Delivery:** implementation commit `855dc55`, published on `hotspot-maps` in [PR #5](https://github.com/JinxedAsh/bird-wanderer/pull/5). The PR records check/merge results; merging follows passing checks. See the [Discovery walkthrough](DISCOVERY_WALKTHROUGH.md) for manual checks and viva explanations.

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

**Delivery:** implementation commit `29312fc`, published on `session-and-brand-fixes` in [PR #6](https://github.com/JinxedAsh/bird-wanderer/pull/6). The PR records check/merge results; merging follows passing checks. Next increment: weather and sourced trip-planning information. No test-account credentials or browser screenshots are included in the repository.

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

**Delivery:** implementation commit `f2f69fe`, published on `hotspot-weather` in [PR #7](https://github.com/JinxedAsh/bird-wanderer/pull/7). The PR records check/merge results; merging follows passing checks. The [Weather walkthrough](WEATHER_WALKTHROUGH.md) gives the flow, acceptance checklist and viva notes. Next Phase 1 increment: source-attributed species photographs and open-photo metadata; remaining site-access data requires verifiable sources.

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

**Delivery:** implementation commit `837b7cd`, published on `species-photographs` in [PR #8](https://github.com/JinxedAsh/bird-wanderer/pull/8). Local checks and the configured-key scan passed; the PR records final GitHub check/merge status. Automatic merge follows passing checks under the developer's standing authorization. Private review/context files, environment secrets, databases and browser screenshots were excluded. The [Photos walkthrough](PHOTOS_WALKTHROUGH.md) contains setup, source policy, manual checks and Viva Notes. Next: extract genuine metadata from eligible external photos, explicitly handling absent EXIF.

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

**Delivery:** implementation commit `151d79e`, published on `external-photo-exif` in [PR #9](https://github.com/JinxedAsh/bird-wanderer/pull/9). Local checks and the configured-key scan passed; the PR records final GitHub check/merge status, with automatic merge following passing checks under standing authorization. Private context/reviews, environment secrets and databases remain excluded. The [EXIF walkthrough](EXIF_WALKTHROUGH.md) explains supported fields, privacy/timezone rules, acceptance checks and Viva Notes. Next: evidence-based photography logistics, keeping source-photo examples distinct from general guidance.

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

**Delivery:** implementation commit `dc5f7ea`, published on `photo-planning` in [PR #10](https://github.com/JinxedAsh/bird-wanderer/pull/10). Local checks and the configured-key scan passed; the PR records final GitHub check/merge status. Automatic merge follows passing final-commit checks under standing authorization. Private context/reviews, secrets and databases remain excluded. The [Photography planning walkthrough](PHOTO_PLANNING_WALKTHROUGH.md) contains the rules, source boundaries, manual checks and Viva Notes. Next: sourced detailed species enrichment, retaining the current discovery and planning flow.

### Entry 20 — Credited species identification, habitat and behaviour

**Date:** 4 October 2026 (India Standard Time). **Group:** Phase 1, sourced species information. **Status:** implemented; verified local seasonal timing and photography difficulty remain incomplete.

**Requirement and result:** species details needed readable external information rather than unsupported prototype labels. Opening the existing Habitat control now focuses a collapsible Identification, Habitat & Behaviour panel. It shows bounded Wikipedia excerpts with source-section headings, revision, contributor history, Wikidata identity and CC BY-SA 4.0 attribution. Missing categories stay unavailable. Best Time remains Unverified and external species no longer imply a prototype difficulty rating.

**How it works:** a shared Wikidata helper checks the exact scientific name and species rank for both photographs and articles. The information service follows the matched English Wikipedia sitelink and verifies the article's Wikidata ID, namespace and revision. It extracts explicitly named description, habitat, behaviour and seasonal-movement sections; it does not infer seasons from unrelated text. The existing protected API/client handles authentication, cancellation and retry. The disclosure loads on first opening, retains data when reopened and resets correctly when switching species. Photos, EXIF and hotspot requests remain independent.

**Reliability and boundaries:** eight-second provider timeouts; 24-hour successful/no-match memory cache bounded to 200 names; shared concurrent requests; three active and 20 pending distinct lookups. Errors are retryable. Excerpts are shortened, escaped plain text and labelled as general species-range context. Source text adaptations retain the same licence. No database tables, framework, package dependency or later-stage persistence/GPS functionality were added.

**Files changed:** README.md; frontend/README.md; frontend/package.json; docs/DEVELOPMENT_RECORD.md; new docs/SPECIES_INFORMATION_WALKTHROUGH.md; frontend/server/discovery.mjs, discovery.test.mjs, frontend.test.mjs and photos.mjs; new server/wikidata.mjs, species-info.mjs and species-info.test.mjs; frontend/src/lib/discovery.ts; components/SpeciesDetailScreen.tsx and new SpeciesInfoPanel.tsx.

**Checks:** TypeScript, all 58 tests and production build passed. Tests cover identity, missing sections, bounds, provider errors, cache/concurrency, authentication, safe rendering and client response validation. Existing photo/authentication/EXIF/planning/weather/proxy checks passed. Live lookups matched Indian Roller (Q477133, revision 1349000643), Common Kingfisher (Q79915, revision 1366322834) and Lesser Whistling-Duck (Q244284, revision 1350730211). All three supplied identification, habitat and behaviour; seasonal movement remained unavailable.

**Browser verification:** Test chat checked all three species, correct source links, Habitat focus, Enter/Space disclosure operation, retained reopening data, correct replacement after species switching, 390-pixel wrapping, honest timing/difficulty labels, photo/EXIF/planning and a reported Lodhi Gardens hotspot with weather. No confirmed failures. Genuine outages, missing-article browser cases, exact network counts and physical-phone behavior were not tested; relevant error/no-match logic has automated coverage. Full design acceptance remains pending.

**Delivery:** implementation commit `b4f9e07`, published on `species-information` in [PR #11](https://github.com/JinxedAsh/bird-wanderer/pull/11). Local checks and the configured-key scan passed (zero leaks across 107 files); the PR records final GitHub check/merge status. Automatic merge follows passing final-commit checks under standing authorization. Private reviews/context, secrets and databases remain excluded. The [Species information walkthrough](SPECIES_INFORMATION_WALKTHROUGH.md) explains the implementation, source limits, manual checks and Viva Notes. Next: persistent saves/search history, followed by GPS/Explore weather and remaining Phase 1 acceptance. Android packaging remains deferred for this checkpoint.

### Entry 21 — Persistent eBird bookmarks and real search history

**Date:** 4 October 2026 (India Standard Time). **Group:** Phase 1, personal discovery activity. **Status:** implemented; browser checks passed, with physical-device/outage acceptance still pending.

**Problem and user-visible result:** bird bookmarks lived inside a detail screen, hotspot bookmarks reset after refresh and Recent Searches showed fixed examples. Both eBird bird targets and hotspot saves now belong to the signed-in account and survive refresh, logout/login and server restart. The existing hotspot Saved filter uses confirmed records. Search adds a Saved birds only control so targets can be found; it starts empty and records actual queries on Enter or opening a bird/hotspot result. Recent chips replay/promote searches; individual removal and Clear All persist.

**Simple implementation:** two tables are added to the existing SQLite database without changing users/sessions. Saves use the owner, item kind and source ID as a composite key. Search terms are normalized and case-insensitively deduplicated; transactional upsert/pruning retains the ten newest entries. Maximum 500 saved references per user. The shared session middleware sets the owner, and every query is scoped by that owner. Browser-supplied user IDs cannot select another account's records. Prepared SQL parameters keep input inert.

**Validation and reliability:** new saves check source ID syntax and current eBird catalogue membership. Loading/removing existing references and managing history do not depend on the provider. The UI changes only after server confirmation, with loading/update guards, retry for failed initial loading and error feedback. Logout clears visible account activity and aborts old requests; account/controller checks reject stale responses. Community/journal/trip persistence, GPS and APK work were not added.

**Files changed:** README.md; frontend/README.md; docs/DEVELOPMENT_RECORD.md; docs/DISCOVERY_WALKTHROUGH.md; new docs/DISCOVERY_ACTIVITY_WALKTHROUGH.md; frontend/package.json; frontend/server/auth.mjs and frontend.test.mjs; new server/activity.mjs and activity.test.mjs; frontend/src/App.tsx; new src/lib/activity.ts; components/GlobalSearchScreen.tsx, SpeciesDetailScreen.tsx and HotspotDetailScreen.tsx.

**Automated checks:** TypeScript, all 64 tests and production build passed. New coverage checks session/origin protection, account separation, trusted source validation, idempotent saves, malformed inputs, provider error handling, provider-independent removal/history, normalized deduplication and ordering, ten-search/500-save bounds, removal/clear, SQL-like search text, database reopen, safe history rendering, controlled bookmark state and typed client/session errors. Existing authentication, discovery, photos, EXIF, species information, planning, weather and proxy checks remain passing.

**Browser verification:** Test chat used two disposable accounts on its permitted LAN URL. Fresh history was empty; Enter/result selection, case-insensitive deduplication, newest-first order, chip replay, single removal and Clear All worked. History and bird/hotspot saves survived refresh and logout/login. Pending save controls stayed disabled until confirmation. Saved-only birds with an empty query, hotspot Saved filtering, both hotspot controls, and persistent unsaving passed. The second account remained separate and returning to the first restored its activity. Keyboard/quick interactions and 390-pixel layout passed, as did common/scientific search, species references, photos, EXIF, planning and hotspot weather. No console warnings/errors were observed. Browser-control timeouts recovered with fresh observations; physical-phone behavior and forced outages were not tested. No shared files were changed by Test chat.

**Limits:** this stores source references, not a complete offline catalogue or saved trips. Hotspots outside the configured region and removed taxa remain stored but are not listed without matching loaded provider records. Cross-tab realtime synchronization is not implemented; refresh reloads activity. Prototype community bookmarks and journal/life-list statistics remain separate, and a saved target does not mean a logged sighting. Physical-phone/design and genuine outage presentation still need manual acceptance.

**Delivery:** implementation commit `1d1734f`, published on `discovery-saves` in [PR #12](https://github.com/JinxedAsh/bird-wanderer/pull/12). The configured-key scan found zero leaks across 111 files; private reviews/context, secrets, databases and build output remain excluded. The PR records final GitHub checks/merge status; automatic merge follows passing final-commit checks under standing authorization. The [Discovery activity walkthrough](DISCOVERY_ACTIVITY_WALKTHROUGH.md) contains the implementation, checks, limits and five Viva questions. Next: GPS/Explore weather and remaining Phase 1 access/design/acceptance work; Android packaging remains deferred for this checkpoint.

### Entry 22 — Optional nearby discovery and selected-point Explore weather

**Date:** 4 October 2026 (India Standard Time). **Group:** Phase 1, location and environmental context. **Status:** implemented; browser checks passed with actual GPS/physical-device acceptance still pending.

**Problem and result:** Current location only showed a prototype explanation, distances were unavailable and Explore weather was not connected. The existing Explore location label and Hotspots icon now open a small inline picker for one-time device GPS, manual coordinates or clearing location. A selected point enables 50-km nearby hotspot/report filtering and nearest-first straight-line distance display within the loaded eBird region. Popular/Saved retain whole-region coverage. Explore displays an attributed rounded-point Open-Meteo forecast with honest prompt/loading/error/retry states.

**How it works:** the browser validates coordinates and calculates Haversine distances. Filtering uses full precision; display uses one decimal. The same filtered records feed map pins and cards. Explore joins reported hotspot IDs to the nearby set, without inventing activity or abundance. The protected POST weather endpoint validates and rounds coordinates to two decimals, then reuses the existing forecast service. This does not require eBird to be available and does not replace existing hotspot weather.

**Privacy and reliability:** no background tracking, automatic permission request or stored account location. GPS requires a secure context and browser permission; HTTP phone-LAN testing has a manual fallback. GPS has a ten-second timeout and permission/unavailable/invalid-position errors. Closed/replaced picker results are ignored. Location clears on refresh/logout; pending forecast requests abort on navigation/location changes. Rounded coordinates travel in the browser POST body, not browser API URLs; the server uses them in the provider forecast URL. Only anonymous forecast keys occupy the bounded server memory cache. Forecasts retain 15-minute/100-entry caching; at most 20 distinct coordinate loads can be in flight. No new tables, dependencies, device wrapper or GPS-region API was added.

**Files changed:** README.md; frontend/README.md; docs/DEVELOPMENT_RECORD.md; new docs/NEARBY_WEATHER_WALKTHROUGH.md; frontend/server/discovery.mjs, discovery.test.mjs, weather.mjs, weather.test.mjs and frontend.test.mjs; frontend/src/App.tsx and lib/discovery.ts; new src/lib/location.ts and components/LocationPicker.tsx; components/ExploreScreen.tsx, HotspotsScreen.tsx and GlobalSearchScreen.tsx.

**Automated checks:** TypeScript, all 71 tests and production build passed. New tests cover distance zero/date-line/invalid points, single GPS request/options and secure-context/denial/timeout failures, weather/nearby rendering, exact radius boundary and nearest-first order, rounded POST request/response identity, session/origin protection, malformed coordinates, independence from eBird and bounded in-flight/shared weather requests. An existing partial-record rendering test caught an undefined distance; it was fixed to show unavailable rather than throw. Frontend tests/typecheck/build were repeated after final one-decimal Search formatting. Existing authentication, persistence, discovery, photos/EXIF/species information/planning/weather/proxy checks remain passing.

**Browser verification:** Test chat used its permitted LAN URL with a manual Delhi point (28.59, 77.22). Explore showed 30.8°C, 1.5 km/h, Asia/Kolkata, provider model time and source credit. Nearby defaulted to 50 km; 191 cards/pins matched with nearest-first one-decimal distances, and Search showed Lodhi Gardens at 0.3 km. Changing to 0,0 removed Delhi weather and loaded a different Etc/GMT forecast with honest empty nearby reports/hotspots. Popular/Saved retained regional coverage. Invalid coordinates were blocked; closing discarded unsubmitted edits; clear restored regional browsing. Refresh/logout cleared location while saved activity persisted. The LAN GPS button displayed the HTTPS/localhost explanation and manual input remained usable. Keyboard, 390-pixel layout and species/photo/EXIF/planning/hotspot-weather/save regression passed; no console warnings/errors observed. Actual GPS, pending GPS cancellation, payload rounding and database storage were not browser-verified; coordinate request/validation behavior has automated coverage and storage boundaries were inspected in source. No shared files or server processes were changed by Test chat.

**Limits and next work:** geographic coverage is the configured eBird region, not automatic worldwide GPS discovery. Nearby uses a 50-km straight-line estimate; GPS accuracy is disclosed and no verified access gate or road distance is implied. GPS hardware, physical-phone/secure-host permission and genuine outage acceptance remain pending. Verified access logistics, stronger evidence-supported recommendations and design/manual acceptance remain Phase 1 work. Android packaging remains deferred for this checkpoint.

**Delivery:** implementation commit `d583532`, published on `nearby-weather` in [PR #13](https://github.com/JinxedAsh/bird-wanderer/pull/13). The configured-key scan found zero leaks across 114 files; private context/reviews, secrets, databases and build output remain excluded. The PR records final check/merge status; automatic merge follows passing final-commit checks under standing authorization. The [Nearby/weather walkthrough](NEARBY_WEATHER_WALKTHROUGH.md) contains the flow, modules, limits, manual checks and five Viva questions. Next: verified access logistics and remaining Phase 1 demonstration/design acceptance.

### Entry 23 — Reviewed official-source hotspot access

**Date/group:** 4 October 2026 IST; Phase 1 access and photography logistics.

**Status:** implemented; automated and desktop-browser checks passed. Publication evidence follows below.

**Requirement and result:** maps previously offered only hotspot coordinates. The existing Plan Visit & Entry Gates disclosure now presents dated, field-specific official evidence for Lodhi Gardens and two reviewed Sunder Nursery records. This covers two venues, not every hotspot. Missing facts remain unavailable, and directions remain hotspot points rather than confirmed entrances.

**Sources and scope:** NDMC supplies Lodhi seasonal hours; Delhi Tourism supplies its road approach. Tomb-specific free-entry information was not extrapolated to the entire park. Sunder's operator supplies hours, ticket categories, photography scope and transit approach; conflicting last-entry times are displayed with a request to confirm the applicable season. Standard camera-pass pricing, tripod/drone permission, exact gates and current closures remain unverified. All linked official pages were checked on 4 October. The [Access walkthrough](HOTSPOT_ACCESS_WALKTHROUGH.md) lists the sources and coverage.

**How it works:** the discovery service attaches a reviewed snapshot only when provider, exact ID, approved name and coordinate bounds match. Unknown sites receive no snapshot. Four nullable facts carry their own sources and a review date. After more than 90 days the UI withholds historical text while retaining links; the API still returns the flagged historical snapshot. Existing sample rendering, weather, maps and saves are preserved. No endpoint, key, dependency or database migration was added.

**Files:** frontend/server/access.mjs; access.test.mjs; discovery.mjs; frontend.test.mjs; frontend/src/types.ts; frontend/src/components/HotspotAccess.tsx; HotspotDetailScreen.tsx; frontend/package.json; README.md; frontend/README.md; docs/HOTSPOT_ACCESS_WALKTHROUGH.md; this record.

**Checks:** all 75 tests, TypeScript and production build passed. New checks cover identity/coordinate rejection, both Sunder IDs, unknown sites, expiry, integration, safe rendering and overdue withholding. Live eBird IDs/names/coordinates confirmed L2265071, L2900901 and L77838756. Official-page review does not constitute on-site verification.

**Browser acceptance:** Test chat directly checked Lodhi, both Nursery records and unmatched Yamuna Phase I. Source links, review date, unavailable fields, operator conflict, entrance caveats, keyboard collapse/reopen, navigation and 390-pixel wrapping passed. Nearby/maps/weather and existing saved-state regression passed; no console warnings/errors were reported. Prior saves were preserved and the viewport restored. Expiry/identity guards were tested automatically, not by changing the browser clock. Physical-phone/on-site/outage checks remain pending.

**Delivery:** implementation commit `225b106`, published on `hotspot-access` in [PR #14](https://github.com/JinxedAsh/bird-wanderer/pull/14). The configured-key scan found zero leaks across 118 files; private context/reviews, secrets, databases and build output remain excluded. The PR records final checks and merge status; automatic merge follows passing final-commit checks under standing authorization.

**Remaining:** broader access coverage, current operator/on-site confirmation, local seasonal/difficulty evidence, stronger environmental recommendations and design/physical-phone/failure acceptance. APK remains deferred for this checkpoint.

### Entry 24 — Repository naming cleanup

**Date/group:** 4 October 2026 IST; repository presentation and maintenance.

**Change:** existing remote feature branches and their local counterparts use plain feature names. Contribution examples and delivery references were updated to the same convention, and the README describes the startup fallback as a local runtime. Future branches use plain descriptive names.

**Checks and boundaries:** no open pull requests existed before renaming. Remote branch commit IDs are checked before/after; local tracking is updated. This changes names and documentation, not application behavior or historical commits. The launcher's internal runtime installation path is retained to preserve startup. Private notes and dependency/source attribution are unaffected.

### Entry 25 — Seasonal reference and practical exposure comparison

**Date/group:** 4 October 2026 IST; Phase 1 photography planning. **Status:** implemented; automated and scoped desktop-browser acceptance passed.

**Requirement and decision:** the living specification was re-read through Google Drive. It requires seasonal activity, difficulty and similar-environment settings. Current 14-day reports and one photo cannot establish those statistics. The existing guide now links the configured region's historical eBird chart, names the selected species to find and explains frequency versus bird counts/recent reports. This is an external reference, not imported seasonal statistics or a completed best-season calculation.

**Practical result:** two disclosures preserve the existing guide and add perched/flight preparation plus a user-selected shutter comparison. Equivalent ISO is reference ISO multiplied by reference exposure duration divided by target duration, assuming unchanged light and aperture. Valid current EXIF is required; missing/invalid/excessive results are unavailable. This is a transparent exposure tradeoff, not an optimal preset, measured species rating or matched-weather recommendation. Best Time stays Unverified; its link focuses the guide. Selections reset when the species changes. Access wording now reflects the reviewed coverage from Entry 23.

**Files:** frontend/src/components/PhotoPlanning.tsx; SpeciesDetailScreen.tsx; HotspotMap.tsx; frontend/server/frontend.test.mjs; README.md; frontend/README.md; docs/PHOTO_PLANNING_WALKTHROUGH.md; docs/SEASONAL_PLANNING_WALKTHROUGH.md; this record. No API, dependency, database or second photo request was added.

**Checks:** TypeScript, all 77 tests and production build passed. New tests cover exposure ratios, missing/invalid/extreme values, region URL validation and honest rendering; existing photo/auth/discovery/weather/access/persistence checks pass. Old missing-photo assertions were refined to distinguish selectable test shutters from actual source evidence. Test chat independently opened Delhi's eBird historical chart without sign-in and verified month/year controls and species rows; no best season was inferred or data downloaded.

**Browser findings and corrections:** initial planning acceptance passed Roller/Kingfisher arithmetic, motion/clear/reset interactions, guide focus, seasonal links, 390-pixel keyboard/layout and photo/hotspot/weather/access/saved-state regression. It caught a duplicate sibling key introduced here; the planning-prefixed key eliminated warnings on Roller → Kingfisher → Graylag switching in a fresh tab. A separate Leaflet positioning error reproduced three times after keyboard zoom followed immediately by Go back. The stack led through the delayed zoom-transition callback into a removed map pane. HotspotMap now disables animated zoom through its public option and guards cancelled resize notifications; zoom/dragging remain available. TypeScript, all 77 tests and build were rerun successfully after both fixes. Final fresh-tab verification passed eight rapid keyboard trials (four zoom-in/back, four zoom-out/back, including two at 390 pixels). Delayed console checks had no positioning, duplicate-key or other errors/warnings. Zoom, dragging, pin popup, back/reopen and map resizing passed. Roller/Kingfisher comparisons and keyed reset were rechecked with matching photos/source/EXIF. Viewport and original tab were restored; saves preserved.

**Delivery:** implementation commit `980fc82` and browser-discovered fixes `f1a8ce0`, published on `seasonal-photo-planning` in [PR #19](https://github.com/JinxedAsh/bird-wanderer/pull/19). The configured-key scan found zero leaks across 119 files; private notes, secrets, database and build output remain excluded. The PR records final CI and merge status; merge follows passing final-head checks under standing authorization.

**Remaining:** imported seasonal evidence and justified local timing, measured species difficulty, multi-photo/verified-environment comparisons, broader site access and full design/phone/failure acceptance. Android packaging remains deferred for this checkpoint. The [Planning extension walkthrough](SEASONAL_PLANNING_WALKTHROUGH.md) explains the calculation, scope and five Viva questions.

### Entry 26 — Phase 1 presentation acceptance and mobile polish

**Date/group:** 4 October 2026 IST; Phase 1 checkpoint preparation. **Status:** implemented; automated and scoped browser checks passed; publication tracked in [PR #20](https://github.com/JinxedAsh/bird-wanderer/pull/20).

**Review scope:** inspected the six original authentication, Explore, Search, species, hotspots and hotspot-detail images under design-reference, and requested direct running-browser comparison in Test chat. Compared layout structure and mobile usability, distinguishing actual provider records and necessary attribution/disclosures from mock values. This does not establish pixel-perfect design conformity or complete all fifteen screens' acceptance.

**Fixes:** authentication now reuses the local header logo in the reference's rounded-square frame and replaces an unsupported weekly sightings total with descriptive text in the same badge. Visible labels focus their inputs. Primary auth, Search, Explore, header/navigation, bookmark and hotspot-location controls gain 44-pixel touch targets. Search input/history items can shrink/wrap so long terms remain usable at narrow widths. Explore's report-scope label sits below its heading to prevent awkward wrapping of All sights. The header logo retains its image size inside a native button. Missing hotspot summary values now use smaller wrapping text after overlap was observed at 320 pixels; numeric values keep their original size. Existing callbacks, authentication/session/persistence and screen order are preserved.

**Photo evidence:** a real Indian Spot-billed Duck reference supplied a long author/contact/rights paragraph. Compact cards now place long author metadata in a Full photo credit & rights disclosure; the complete source text and associated credit/attribution/terms/restrictions remain available, with licence/source/crop notice visible. Short captions and full species-page credits retain their previous behavior. No provider metadata was truncated or rewritten.

**Shared deliverable:** [Phase 1 presentation guide](PHASE_1_PRESENTATION.md) contains a seven-minute demo script, preflight, scope/data/design distinctions, device checklist and five Viva questions. The developer identified Oppo K13 as the probable phone and Zen as preferred browser. Zen's official FAQ has no Android version; Chrome/Firefox phone acceptance was proposed. On 4 October the developer reported that the LAN app opens and login works on the Oppo K13. This is user-reported physical evidence; exact browser/version, keyboard/touch/layout, refresh/logout, orientation and connectivity acceptance remain pending. The current LAN setup was inspected; no configuration or server restart was required.

**Files:** frontend/src/components/AuthScreen.tsx; GlobalSearchScreen.tsx; SpeciesPhoto.tsx; ExploreScreen.tsx; Header.tsx; SpeciesDetailScreen.tsx; HotspotsScreen.tsx; HotspotDetailScreen.tsx; frontend/server/frontend.test.mjs; README.md; frontend/README.md; docs/PHASE_1_PRESENTATION.md; this record. No backend, schema, dependency or later-phase feature was added.

**Automated checks:** TypeScript, all 79 tests and production build passed after final source changes. Added regression checks cover local branding, truthful copy, label associations and complete long-credit disclosure; existing account/discovery/EXIF/planning/map/weather/access/persistence/proxy checks remain passing. Programmatic rendering does not measure hit areas or demonstrate real touch.

**Browser acceptance:** Test chat directly compared the six core reference screens and checked the running app at 390px and 320px. Registration, wrong-password rejection, login, refreshed session, logout, search/filter/history controls, bird photo/EXIF/guide, hotspot maps/navigation/weather/access disclosures and saved-item refresh passed. Long history wrapped without horizontal page overflow; patched primary controls measured 44px. Full long photo credits opened by keyboard without navigating the card and preserved the author/credit/terms; native logo/back keyboard navigation passed. A final fresh recheck confirmed missing hotspot summary values remain inside their cards during loading and after weather arrives at both widths. Final console checks reported no warnings or errors; no remaining blockers were found in this scoped browser review. This establishes responsive browser usability, not exact visual approval, provider outage recovery or physical-device acceptance.

**Remaining:** physical-phone/permission/orientation/network acceptance, exact visual fidelity and later-screen comparison, imported seasonal/local timing evidence, measured difficulty, verified-environment/multi-photo recommendations and broader access coverage. APK remains deferred for this checkpoint. No full Phase 1 completion claim is made.

### Entry 27 — Automatic temporary tunnel configuration

**Date/group:** 6 October 2026 IST; Phase 1 appraisal connectivity. **Status:** implemented and automated checks passed; real public-tunnel browser acceptance pending.

**Problem:** a manually started Cloudflare quick tunnel generated a hostname rejected by Vite. Allowing only the page hostname would still leave login's exact-origin check unresolved.

**Change:** Start-Tunnel.ps1 / pnpm dev:tunnel starts cloudflared, reads its generated HTTPS URL and starts the existing frontend/backend with TUNNEL_ORIGIN supplied for that session. Vite development and preview accept the exact hostname; Express adds the exact HTTPS origin alongside existing localhost/LAN settings. URLs are not persisted or committed. For separately managed/named tunnels, an explicit TUNNEL_ORIGIN remains available. Normal startup without this setting keeps existing defaults. The user's renamed Test.ps1 launcher/deleted Start-Dev.ps1 are left untouched and excluded from this increment.

**How it works:** the tunnel launcher captures output across chunks, waits up to 60 seconds for a quick-tunnel URL, then passes it through child-process environment variables. Exact-origin validation rejects HTTP, paths, credentials and trailing slashes. Startup/child failures stop managed processes; Ctrl+C performs cleanup, including owned child process trees on Windows. No broad allowed-host/origin wildcard or authentication bypass was added.

**Files:** Start-Tunnel.ps1; frontend/scripts/tunnel.mjs; frontend/scripts/tunnel-config.mjs; frontend/vite.config.ts; frontend/server/index.mjs; frontend/server/proxy.test.mjs; frontend/package.json; frontend/.env.example; frontend/README.md; this record.

**Checks:** TypeScript, all 80 automated tests and production build passed. Development/preview integration checks exercise localhost registration, exact tunnel login, accepted Host, rejected other tunnel Host and rejected other tunnel Origin. URL parsing/validation checks cover missing values and invalid origins. Actual cloudflared startup/public URL, browser cookies and shutdown still require a real tunnel rehearsal; no live tunnel-browser pass is claimed. This changes connectivity only and does not complete remaining Phase 1 requirements.

### Entry 28 — Multiple reference evidence and concrete forecast preparation

**Date/group:** 13 October 2026 IST; Phase 1 only. **Status:** implemented; automated/scoped browser checks passed; publication tracked in PHASE_1_ACCEPTANCE.md.

**Review:** fetched live specification through Drive (modified 5 October); Phase 1 is external discovery/logistics, personal uploads Phase 2. Downloaded current six core embedded images; their hashes match repository originals. Reference freshness is confirmed, not exact application fidelity.

**Changes:** hero lookup preserved; new session/catalogue-protected references endpoint loads up to three deduplicated licensed bitmaps via exact Wikidata P18 or Commons P180 identity. Bounded cache/concurrency/retry remains. On-demand ReferenceComparisons shows independent EXIF, complete credits, per-field counts/ranges and placeholders for failed images. Existing number/shutter formatting fixes decimal tails found in browser QA. Missing values never become zero or optimal presets.

**Preparation:** dated local first/last daylight-hour windows are clamped to daylight; missing/invalid times give no window. Daylight forecasts with rain <=20% and wind <=15 km/h are explicit heuristic candidates, not activity predictions. Access remains separate. Difficulty stays Unrated and links to motion/light/gear demands; no reliable measured rating or historical photo-weather match is established.

**Files:** server/photos.mjs/photos.test.mjs/discovery.mjs; src/lib/discovery.ts; new ReferenceComparisons.tsx; PhotoPlanning.tsx, SpeciesDetailScreen.tsx, HotspotWeatherPanel.tsx; frontend.test.mjs; shared docs. No dependency/schema/later-phase feature added.

**Checks:** final TypeScript, 89 tests and build passed. Tests cover exact depicts/dedup/EXIF, cache/retry, empty/single samples, malformed metadata/session errors, daylight boundaries and sample denominators. Test chat checked Indian Roller 3 references (2 supplying comparison EXIF), Kingfisher 3/3, Dwarf Cassowary 2/1; full attribution, keyboard, species reset, rounded ranges and no overflow at 320/390px. Auth/saves/refresh/expired sessions passed; console clean. Empty/single and provider errors have fixture evidence only, not a genuine browser outage test.

**Public preview:** managed tunnel on isolated ports 3300/3301 (no .env edits) passed real HTTPS page/login/refresh/search/three Kingfisher references/manual-location weather. Logout submitted; DNS failed before fresh-tab confirmation. Final public logout/GPS/device acceptance remains unverified. No production-hosting claim.

### Entry 29 — Regional coverage, seasonal alternatives and reviewed access

**Date/group:** 13 October 2026 IST; Phase 1 evidence/logistics. **Status:** implemented with explicit blocked criteria.

**Seasonal investigation:** normal browser loaded Delhi 2021–2025 chart; official histogram export required Cornell Lab authentication. Direct HTTP received a bot check; no bypass or invented denominator. Annual statistics remain blocked pending a legitimately obtained export/source-format/data-use review. Dated UP Ecotourism narrative supports Northern Pintail/Gadwall at Okhla Oct–Mar with separate Nov–Mar destination advice, restricted by scientific name/Delhi-UP scope/90-day expiry. Other species remain unsupported. Narrative is not numerical frequency or a guarantee.

**Search:** existing name/scientific-name matching now also uses taxonomy family and loaded recent-report locations; saved filters remain. Unsupported habitats and missing-value text are not treated as searchable evidence. GlobalSearchScreen.tsx and its regression checks are included.

**Coverage:** live eBird lookup confirmed IN-UP-GB. Delhi runtime adds this adjacent district so design-reference Okhla is reachable; chart scope stays IN-DL, report/discovery coverage is explicitly combined, hotspot regions remain correct. Additional codes are bounded/validated; duplicate records removed. Required-region failure cannot quietly claim complete coverage.

**Access:** live IDs/names/coordinates validated Yamuna I/II and three Okhla records. Conflicting official Yamuna hours plus operator contact are displayed without assumed dawn access/free entry/permissions. Okhla hours/Monday closure and published 2010-order tariffs are cited, with prices explicitly historical. Gate-labelled points remain unverified entrances. Per-record review dates/90-day withholding preserve Lodhi/Sunder history. Hospital entry does not inherit sanctuary access.

**Files:** new server/seasonal.mjs; access.mjs/access.test.mjs, discovery.mjs/discovery.test.mjs, index.mjs; src/types.ts, App.tsx, lib/discovery.ts, HotspotAccess.tsx, PhotoPlanning.tsx, SpeciesDetailScreen.tsx; .env.example; shared docs.

**Checks/limits:** 89 tests/type/build passed; scoped expiry, identity/bounds and region/dedup checks included. Browser seasonal/Yamuna/Okhla search/pins/details/reports/weather/three IDs/hospital separation passed at 320/390px; console clean. Full Phase 1 remains incomplete: imported annual data, measured difficulty, verified environment matching, operator-currentness/wider access, exact design approval and physical-phone/failure acceptance. APK remains deferred. Beginner explanations and Viva questions: PHASE_1_EVIDENCE_WALKTHROUGH.md.

### Entry 30 — Delivery status refresh and full-cycle scope

**Date/group:** 23 October 2026 IST; requirements/documentation. **Status:** delivered in PR #23 (bef622e). Verified PR #22 merge and its exact merged-commit passing CI; corrected stale merge gating and README entry points without re-dating October 13 evidence. Re-fetched the live SRS (still modified October 5). User broadened work to all four phases plus Android, superseding the prior Phase-1-only increment. PROJECT_COMPLETION_PLAN.md records the finite acceptance/dependency queue. No runtime change or unrelated launcher rename was included.

### Entry 31 — Real photo upload, owned observations and persistent journal

**Date/group:** 23–24 October 2026 IST; first Phase 2 vertical slice. **Status:** delivered in [PR #24](https://github.com/JinxedAsh/bird-wanderer/pull/24), merged 28218af after exact-head checks passed. This is not a completed community/alerts/retention/Android claim.

**What changed:** replaced sample-photo cycling/fabricated EXIF with actual JPEG/PNG input, source metadata and validated catalogue selections. Added authenticated staged media and observations, profile/privacy storage, owner journal/life-list changes/deletion and real profile photos/statistics. New accounts start empty; account changes abort requests and clear the previous account's records. Images are validated/decoded, re-encoded without metadata and stored privately; originals are not retained. Limits/format/4096px conversion are shown in the upload flow.

**Security/data:** private/follower/profile visibility is checked for feed/detail/media, not merely hidden by React. Keep private globally makes records/media owner-only, corrected after a live two-account review found a mismatch. Exact GPS is owner-only; shared locations are hotspot-level/withheld for all species pending a reviewed classification policy. Fake 5km-grid/verification claims are removed. Disconnects retain processing slots until decoding finishes; parser errors release slots. Same-media identical retries are safe and altered privacy conflicts. Failed persistence removes new files; unused staged files expire on next owner's upload after 24 hours. SQLite tables preserve existing accounts/sessions/discovery activity.

**Implementation:** server/observations.mjs + observations.test.mjs, auth/index registration, src/lib/observations.ts, existing upload/App/journal/life-list/profile/settings components, package/lockfile and env example. sharp validates/sanitizes images; exifr reads real metadata. No service split or replacement frontend. See OBSERVATIONS_WALKTHROUGH.md for APIs, storage, limits and Viva Notes.

**Verification so far:** Final 93 automated tests/type/build passed, including actual EXIF/GPS, metadata removal, malformed/type/size rejection, two-account privacy, seeded positive follower access, database restart, failure cleanup and controlled disconnect concurrency. Test chat's live HTTP upload/privacy/reversal tests passed; browser empty records/profile/settings refresh/account switching and 320/390px layout passed with clean console. Native browser file chooser timed out twice, so file-picker end-to-end acceptance remains manual; HTTP uploads are not misrepresented as browser uploads. Final source refinement checks and exact delivery are recorded with the PR.

**Remaining:** positive follow UI, real social/alert/retention/messaging slices, upload chooser/device acceptance, newest-500 list pagination and production backup/storage. No Java/SDK build tool was found in the first read-only Android probe. Android stays in scope; no build/device pass is claimed.

### Entry 32 — Persistent community interactions and shared visibility

**Date/group:** 24 October 2026 IST; Phase 2 community. **Status:** delivered in PR #25, merged 50d6d7d after both exact-head checks passed for 01ea3ea; merged-main CI also passed.

**What changed and why:** connected the existing feed, Following/People/Near You filters, photographer sheet, likes/bookmarks, field-note comments and reports to SQLite. Refresh no longer resets these actions. Real profile information replaces sample photographer biographies/counts. Unsupported post weather defaults now say Unverified. Follow/unfollow uses the same authorization policy as media and records, so it grants/revokes follower-only access rather than just changing a button.

**How it works:** screen sends the intended action with the existing session cookie → server checks visibility and validates input → database saves a unique account/post or follower relationship → account-owned frontend requests reload the confirmed result. Comments render as plain text. Only their author or the post owner may delete them. Reports remain open review records; no moderation is claimed. Exact GPS stays private and all post routes recheck current profile privacy.

**Files/concepts:** community.mjs/community.test.mjs, observations router/client mapping, App, CommunityScreen, shared types and package test command. No new runtime dependency. See COMMUNITY_WALKTHROUGH.md for endpoints, beginner explanations and six Viva questions on persistence, idempotency, composite keys, authorization and evidence.

**Verification:** 94/94 local tests pass; TypeScript and production build pass. Three-account HTTP test covers follow grants/revocation, private media denial, retry-safe likes/saves, validation/deletion/reporting, database restart, cascade cleanup, 60-write rate limit and next-window recovery. Test chat confirmed browser People follow/unfollow, persisted likes/bookmarks/comments, both commenter/post-owner deletion, unrelated delete rejection, report state and Keep Private. HTTP checks separately confirmed media grant/revocation and third-account denial. Nearby inclusion/exclusion passed with manual points. It found 24–32px social touch targets; a scoped 44px minimum and comment input spacing fix were applied, with partial responsive recheck passed (filters, clear, upload, profile close); post-specific recheck initially hit normal authentication 429 cooldown. After it naturally expired, all post controls and the native dismiss handle passed44px verification in Entry33. No rate limit was bypassed.

**Limits:** bounded lists (50 people, 500 profile records/100 displayed records, 100 comment rows); no pagination/live sockets/moderator console yet. Native file-picker, physical-phone and real provider-outage acceptance are not proven by these tests. Alerts, retention, messages and Android remain separate upcoming work.

### Entry 33 — Sighting subscriptions, conserved alert access and optional Firebase

**Date/group:** 24 October 2026 IST; Phase 3 sighting-alert foundation. **Status:** delivered in PR#26, merged e8aab1e after exact-head 912cabd checks passed; merged-main CI passed. This does not complete all Phase 3 criteria.

**What changed:** species/hotspot pages have actual subscription actions. Notifications use stored matching alerts and readstate instead of examples, with a master preference and subscription management. Matching either species or hotspot creates one alert per recipient/observation; the publish transaction saves both together. Current profile/follow access is rechecked when listing/opening an alert or image. Account changes abort requests and clear alert data; polling runs every 15 seconds only while visible. Alerts open their exact post by ID, replacing title/name guesses. Settings no longer claims push or weekly digests that do not exist.

**Optional push:** added the specification's Firebase browser/Admin SDKs, public-config allowlist, explicit permission/device registration, generated background service worker and session-bound device revocation. SQLite outbox retries at most 5times with backoff; dispatch checks current privacy/preferences/session/readstate first. Generic lock-screen text contains no species/photo/location; full details require current access. Firebase keys are not configured and actual token/permission/foreground/background/device delivery is unverified. No account was created or paid service activated. Service-account JSON must remain outside Git.

**How to explain it:** a subscription is a saved request for future matching events. A transaction prevents a saved sighting losing its alert rows. An outbox lets delivery retry without discarding the event. Server acceptance is distinct from a phone displaying a notification. Details and six Viva questions are in ALERTS_WALKTHROUGH.md.

**Checks:** 98 local tests pass; TypeScript/production build and frozen install pass. Firebase Admin modules import without install hooks. Tests cover duplicate subscriptions/matches, private/follower revocation, readstate/restart, failed insert rollback, removal during a controlled provider failure, simulated push retry/five-failure cap, preference/session expiry, token cleanup and logout revocation. These are synthetic provider tests, not live outage/delivery evidence. Test chat browser QA passed: species/hotspot matches generated one alert through visible polling; disabled/nonmatching/private/unfollowed follower-only uploads generated none; exact-post opening, read/all-read persistence and subscription removal worked. Revocation removed alerts and returned404 for protected media. Controlled provider-failure unsubscription passed separately. Social controls/dismiss handle measured44px, notification titles wrapped at320/390px and console was clean; six synthetic records were removed and QA preferences restored. Two verified mobile defects (26px role-based dismiss handle and timestamp squeezing the title) were fixed and retested. Real Firebase/device delivery remains unverified.

**Remaining:** forecast-opportunity scheduler, reviewed sensitivity classification/data, real Firebase configuration/device test, pagination/production storage/reliability and Android acceptance. Conservative protection of all exact coordinates remains in force. Quizzes/challenges/messaging remain upcoming slices. Native chooser and physical phone are manual, not implied by API tests.

### Entry 34 — Explicit forecast-opportunity reminders

**Date/group:** 24 October 2026 IST; Phase 3 opportunity-alert development. **Status:** delivered in PR #27, merged 196f251 after exact-head ba0d0c2 checks passed; merged-main CI passed. 101 tests/type/build and scoped browser QA passed.

**What changed and why:** added separate opt-in for photography forecasts at subscribed hotspots. An hourly per-site scheduler uses existing Open-Meteo data and the already-labelled preparation rules: rain≤20%, wind≤15km/h, first hour after sunrise/last hour before sunset. It records one qualifying future slot per hotspot/local day with source timezone and retrieval time. These are general forecast reminders, not species activity, actual light, site-access permission or photographic-success claims. Missing/stale/failed evidence cannot qualify; a failed site does not stop independent sites.

**Flow:** opt-in + master alerts + hotspot subscription → bounded weather checks → validated future local window → one stored opportunity + optional push job in a transaction → inbox/read state → exact hotspot's current weather/access page. Unsubscribe/opt-out/expiry hides the old opportunity. Generic Firebase push reuses the same permission/session/eligibility checks. The preserving outbox migration supports exactly one sighting or forecast source; tests verify existing attempts/status and cascades survive.

**Verification:** 101 local tests, TypeScript and production build pass after calendar/horizon validation and atomic all-read refinements. New tests cover DST/local clocks, threshold/zero/missing/stale cases, opt-in, failure isolation, hourly bounds, duplicate suppression, read ownership, unsubscribe/expiry, generic simulated push and schema preservation. Test chat's browser QA passed: exact hotspot target, readstate after reload, opt-out/unsubscribe visibility, restoration of the same read alert, hourly deduplication, expiry and 320/390px wrapping without overflow. Controlled qualifying/failed/stale/missing forecast paths passed; opt-in and master preference were required. Its isolated server/data were cleaned; the shared server remained running. Synthetic favorable weather/provider failure must not be presented as real weather or outage evidence. See FORECAST_OPPORTUNITIES_WALKTHROUGH.md for the beginner flow and six Viva questions.

**Remaining at delivery:** real Firebase configuration/device receipt; reliable species sensitivity evidence, retention, messaging/search/pagination, Android and integrated/manual acceptance. User confirmed on 24 October that no Firebase project exists. Real push stays unconfigured; independent work continues.

### Entry 35 — Persistent identification practice and weekly challenges

**Date/group:** 24 October 2026 IST; Phase 4 retention. **Status:** delivered in PR #28/089edcd; 104 tests/type/build, scoped browser checks and exact-head/main CI pass.

**What changed and why:** replaced the quiz's two sample questions, preselected option, fabricated XP/streak and endless loop with a complete ten-question practice. Credited exact-species references come from the existing external-photo pipeline; an incomplete provider bank returns a retryable error. The server grades answers, saves feedback/progress and computes XP and completion-day streaks. Refresh/server restart resumes the session. Identical retries award no duplicate points, including the final Next response. Explicit restart abandons only the unfinished session and retains earned answer XP.

**Challenges:** added a collapsible weekly panel using the owner's currently stored journal records: three reported species, two reported hotspots and one photograph with parsed ISO/aperture. Publication timestamps define the week in Asia/Kolkata. Deleting a record updates progress. The panel explicitly says user-reported, not verified visits/identification or photo quality; no extra challenge XP or sensitive-coordinate incentive exists.

**How it works:** start → bounded source-photo bank → server-owned question/answer-key snapshot → selected answer validated against account/current question → one saved answer → saved feedback/Next → ten-question completion. XP derives from correct answers; streak derives from consecutive completed local days. Only the server can award stored progress. Existing photo attribution and question/feedback styling are reused. React lazy-loads the quiz to keep discovery's initial download small. See RETENTION_WALKTHROUGH.md for schema/endpoints, evidence limits and six Viva questions.

**Verification:** 104 local tests, TypeScript and production build pass. Tests cover account/order/option validation, hidden pre-answer key, duplicate answer/Next/final retries, restart/resume, score/XP/streak break, failed-bank recovery, photo-request bound, explicit restart, real uploaded EXIF/challenge progress, deletion and week rollover. Initial frontend render has no fake XP/streak or preselection. Test chat has confirmed a live-source ten-question completion, single-award double-click, refresh feedback, completion-day recording and clean quiz console; API challenge/deletion/account-isolation and controlled failed-photo-bank503 checks passed. The native Startover prompt stalled browser control; replaced with an in-app focus-trapped confirmation sheet. Targeted recheck passed: restart cancel/confirm, Escape/focus handling,320/390px layouts, image retry, provider-error recovery and challenge deletion updates. The isolated server is stopped and test observations deleted; automatic approval review blocked removal of its remaining temporary folder, so full folder cleanup is not claimed. No physical-phone or real provider-outage evidence is implied.

**Delivery/manual limits:** retention merged in PR #28 at 089edcd; both exact-head checks and merged-main CI passed. Actual phone/native chooser and Firebase delivery remain unverified. Android tools were independently prepared under the expanded scope: checksummed portable JDK 17, SDK 36/buildtools 35/platform-tools and Gradle 8.13 run locally; adb lists no connected device. No Android project/APK exists yet. Messaging/search/pagination and integrated/manual acceptance follow this slice.

### Entry 36 — Stored field conversations and privacy-aware attachments

**Date/group:** 24 October 2026 IST; remaining community interaction. **Status:** implemented locally on field-messaging; 107 tests, TypeScript and production build pass; scoped browser QA passed; PR #29/e085f4e merged after exact-head checks; merged-main CI passed.

**What changed and why:** replaced sample chat people, simulated replies, fabricated online/PRO labels, fake GPS sharing and pretend photo success with account-owned conversations and messages. Profile now provides a direct Field Chats entry even for an empty account. The supplied cards, filters and composer remain. A real birder picker starts a conversation; five-second foreground polling updates it. Search checks names and any stored text/public-hotspot attachment, including older messages, while topic filters still apply. Server timestamps/read watermarks replace temporary unread markers.

**Privacy and reliability:** every endpoint checks conversation membership. Followers-only contact requires a current follow; existing history remains participant-owned. An identical retry returns the stored message instead of duplicating it; changed payloads with the same request ID conflict. Failed-send drafts survive Retry loading. Paginated history is refreshed with current attachment access. Only owned observations already visible to the recipient may be attached; revocation/deletion makes them unavailable. Public hotspot references use validated catalogue IDs; no exact photo/GPS is copied automatically. Messages are server-access-controlled, not end-to-end encrypted; user text cannot be recalled by changing photo privacy.

**Verification:** 107 local automated tests, TypeScript and production build pass. New tests cover three-account isolation, malformed inputs, retries/conflicts, unread watermark monotonicity, older-message search, restart persistence, message pagination, follower contact restrictions, mutation rate limit, photo permission/revocation/deletion and public-hotspot validation. Initial rendering has no demo conversations. Browser QA passed the new entry point for zero-post accounts, failed-send/retry once/persistence, unread, current-photo revocation/media404, real public-hotspot/observation destinations, older-message/name search with intersecting filters, real recipient polling within 4.4 seconds without simulated replies, 320/390px layouts and picker focus/Escape. This used one browser switched between accounts plus HTTP sender/recipient actions. Browser offline transport/200+ history and physical-phone/LAN checks remain pending; HTTP history pagination passes. PR #29 carries the increment. No physical-device or real Firebase claim is made. User confirmed no Firebase project exists; actual push remains blocked on configuration.

**Files/explanation:** messages server/client, existing observation router, chat screen, Profile entry point, App ID-based destinations, shared types, people-query client, HTTP/frontend tests and package test script. See MESSAGING_WALKTHROUGH.md for a beginner-friendly flow, schema, limitations and six Viva questions. README/current-state/completion plan corrected stale claims about earlier delivered phases and Android tooling. Private recovery notes remain excluded from Git.

### Entry 37 — Real global search, categorized social notifications and accessible older records

**Date/group:** 24 October 2026 IST; cross-screen community/search/notification completion. **Status:** local implementation on search-notification-targets; 110 tests, TypeScript and production build pass; scoped browser verification passed; PR #30/da676b7 merged after exact-head checks; merged-main CI passed.

**What changed:** Global Search queries real registered people, including people without posts, and all matching accessible observations using server pages. People/post results open the exact profile/observation. Existing bird/hotspot/history behavior remains. Added loading/errors/retry and Load more people/posts. Own/feed lists can load beyond the first 500 records; real profile totals no longer truncate there. Search-opened posts are retained and revalidated when reactions/comments refresh the feed.

**Social notifications:** real follows, comments and stable-handle mentions generate deduplicated in-app events. Followers has its own filter; source-ID navigation and individual/all-read persistence are connected. Current observation privacy is rechecked, a mention never grants access, and deleted comments/observations remove their events. Unfollow removes the related follower event. Action/event writes are transactional; injected failures roll both back. Social previews contain generic action text, not copies of private comments/locations. Exact GPS remains unpublished. These new social events are in-app only; sighting/forecast optional push and its unconfigured Firebase boundary remain unchanged.

**Verification:** 110 local tests/type/build pass. New HTTP tests cover no-post accounts, older-than-500 matching records, 502-record profile counts, page separation, private/follower/owner policy, search-inference prevention for withheld hotspots, malformed parameters, deduplicated mentions/follows/read/restart/cascades and transaction rollback. Existing sighting self-alert test now filters sighting events because real follower notifications can coexist. Browser QA passed zero-post person search, exact profile/post destinations, follow/comment/mention events and duplicate tags, persisted reads/all-read, current privacy/stale-target denial and deletion/unfollow cleanup. A 320px long-name/timestamp overlap was fixed with separate wrapping lines and rechecked at 320/390px, including focus/Escape. Isolated-browser search-outage/retry and 50-to-60 distinct people/post pagination passed. Its server stopped; automatic approval review blocked removing the temporary fixture folder, so full cleanup is not claimed. Physical-phone/LAN, public hosting and actual Firebase delivery are not claimed.

**Files/Viva:** observation/community/alerts source, new social-notifications module and search-social HTTP tests, observation client, App, Global Search, Community, Notifications, shared types, test script/frontend tests and documentation. SEARCH_NOTIFICATIONS_WALKTHROUGH.md explains the request flow, privacy-before-pagination, transactions, source references and six likely Viva questions. Messaging #29 was independently confirmed merged at e085f4e with passing main CI before this branch started. Android toolchain work continues independently; no APK exists yet.

### Entry 38 — Android host project and installable preview

**Date/group:** 24 October 2026 IST; final Android delivery track. **Status:** native source local on android-app-package;4 native unit tests, lint0errors2warnings, debug and unsigned release builds pass. Debug preview installed/launched in an owned Android15/API35 emulator; scoped native QA passed with explicit GPS/physical limits; final guard recheck/GitHub delivery are in progress.

**What changed and why:** added a small Java Activity/WebView host for the existing React frontend and same-origin Express API. This preserves the supplied interface and server architecture rather than rewriting it. First-run native setup selects a trusted server; release requires HTTPS, while debug also allows bounded localhost/private IPv4 HTTP demos. Settings exposes Android server connection. The APK still needs a running reachable server; Express/SQLite are not installed on the phone.

**Native integration:** selected JPEG/PNG document picker, explicit foreground location permission, first-party sessions, Android back/dialog handling, system-bar/keyboard insets, certificate/connection failure handling and explicit external-browser navigation. Exact origin validation, disabled file access/third-party cookies, no native JavaScript object bridge and excluded session/setup backups constrain the host. Original logo paths are reused. Debug/release policies are separate; source/signing tests reject public HTTP, credential/path/query addresses and misleading host prefixes. Native push is not implemented/configured in this preview; that gap is explicit.

**Build and verification:** pinned Gradle8.13 checksum/AGP8.13.2/Java17/SDK36, minimum Android8/API26. Four meaningful origin/security unit tests passed; lint passed with zero errors and two documented warnings (pinned compatible toolchain and JavaScript needed by React). Debug APK signing verified; unsigned release APK also assembled. Initial manifest merge and API-level/back lint defects were fixed. Debug installed successfully in an owned accelerated Android15/API35 emulator. Public HTTP was rejected in native setup; allowed localhost through a scoped adb reverse opened the actual login screen. Scoped emulator QA passed disposable login, actual native JPEG-private/PNG-public picker/publication plus independent-reader404/200, cancellation/reopen, keyboard entry, force-stop/relaunch session, rotated journal/no overflow, Android Back/dialog, invalid/unreachable-server recovery and logout. Forms used a debug WebView harness; native date/time widget acceptance is not claimed. A transient registration502 recovered without intervention, cause unknown. Location permission denial/missing callback could trap Waiting; added independent12-second frontend deadline with late-result/synchronous-error regression. Manual location recovery passed; a granted request timed out, so successful GPS remains unverified. A possible queued prompt after earlier retries was not established as an endless loop. Added one-pending-request/window-focus native guards and rebuilt/reinstalled for a targeted check. Auth now also exposes connection setup before login, with a native-UA render regression. Web tests now112/type/build pass; native4tests/lint/bothAPKs pass. Physical Oppo, HTTPS release, actual provider outage/public tunnel and Firebase delivery are not claimed.

**Files/Viva:** android Gradle/wrapper/build configuration, manifest/debug policy/resources, MainActivity/OriginPolicy/unit tests, Android CI workflow, Android-only Settings row and shared documentation. android/README.md explains build/install/server setup, native behavior/tradeoffs, signing/privacy boundaries and six Viva questions. Build output, SDK/AVD/JDK, private local settings/signing keys and QA files remain outside Git. Search/social #30 merged at da676b7 after exact-head/main CI passed before this branch.

**Delivery follow-up, 25 October:** PR #31 merged at47cbef4 after all four checks passed for exact head03f5941; merged-main web and Android checks also passed. The rebuilt native guard passed a targeted single-denial/picker-cancel recheck: one location prompt, no repeat prompt during the recorded14-second observation, deadline/manual recovery and normal picker cancellation. Earlier full JPEG/PNG flows were not repeated on that guard rebuild. Physical-device, successful GPS, native push and HTTPS release acceptance remain open.

### Entry 39 — Owned-record editing and truthful action feedback

**Date/group:** 24–25 October2026 IST; Journal/community reliability. **Status:** implemented locally on journal-record-editing;115 automated tests, TypeScript and production build pass. Scoped browser editing/privacy/error/recovery passed; 320/390px/focus/toast rechecks passed; PR #32 merged at564ce92 after four checks passed for exact headb1aca78; merged-main web/Android checks passed.

**Problem and result:** Journal Edit previously showed a placeholder. It now loads the actual owned record and saves reported species, hotspot, local date/time, notes and visibility. The photograph, original EXIF/private coordinates and publication time remain unchanged. Delete/life-list controls wait for server acknowledgement and show a failure if the change was not confirmed. All-record summary totals remain distinct from loaded-page details.

**How it works:** the existing observation client sends only changed fields to the authenticated PATCH endpoint. The server validates ownership, allowed fields, calendar values and source IDs. Notes/privacy do not need a provider lookup. After an awaited source lookup it rereads the record, preserving unrelated concurrent changes. Species/site corrections and removal of stale sighting alerts/outbox references share a database transaction; corrections are not new sighting events. Failed saves keep the form draft.

**Related fixes:** long discussions now show latest100 comments in chronological order with their true total and an explicit history limit. Journal code loads on demand; a small React error boundary offers reload recovery when rendering/code download fails. Ordinary API failures stay inside the editable form.

**Verification/files:**115 tests passed, zero TypeScript errors and production build passed on25 October; main JavaScript488.84kB and Journal17.15kB. Tests cover invalid/foreign updates, unavailable discovery, preserved bytes/EXIF/privacy/restart, transactional rollback, concurrent changes/deletion and comments beyond100. Modified observation/community server modules and tests, frontend test harness, App/Journal/Community/main; added EditObservationSheet/AppErrorBoundary and shared acceptance/walkthrough documents. See OBSERVATION_EDITING_WALKTHROUGH.md for request flow and six Viva questions. FINAL_ACCEPTANCE.md tracks the finite remaining controls and unavailable scientific/provider/manual evidence. No Firebase project exists; real push delivery remains unconfigured. Browser checks passed real partial saves without discovery, preserved media/EXIF/publication, private404/public200 and ownership denial, invalid-date draft retention, PATCH503 retry, Escape/focus, failed/retried life-list/delete and isolated chunk503/reload recovery. A misleading shared success checkmark on error messages was replaced by a neutral info icon; fresh320/390px layout/scroll/focus checks passed and failed-action toast was confirmed neutral. Automatic approval review blocked removal of one temporary QA folder with “blocked by policy”; its process was stopped and the folder left untouched.

### Entry 40 — Authenticated password changes and working Settings references

**Date/group:**25 October2026 IST; account reliability/control completion. **Status:** implemented on account-settings-controls;118 tests, TypeScript and production build pass. Scoped browser layout/control and independent API checks passed; PR #33 merged atbf3910a after all four checks passed for exact head2e84f1a; merged-main web/Android checks passed. Interactive new-password submission/draft retry remains manual acceptance.

**What changed and why:** Change password now asks a signed-in person for their current password and a different confirmed12–128-character password instead of displaying an email-recovery placeholder. Failed requests retain the form and show the actual error. The backend verifies the existing salted scrypt hash, computes a fresh salted hash, rechecks session expiry/logout and concurrent credential changes after asynchronous hashing, and transactionally replaces credentials/sessions. Other sessions and all push registrations are revoked; this device receives a new session. Saved account records remain. Login checks its verified hash is still current before issuing a session.

**Other controls:** Help & Field Guidelines now opens the actual American Birding Association ethics page, reviewed25 October. About reads frontend package version0.1.0 and identifies a development preview, matching the Android base version instead of the hardcoded1.0.4. Email-based Forgot password remains explicitly unconfigured; no email is claimed sent. No Firebase project exists.

**Verification/files:**118 tests pass, TypeScript passes and build passes (main493.89kB). Auth tests cover invalid/current credentials, origin/session boundaries, rate limits, new hash and old/new password behavior, unrelated accounts, session/push revocation, injected transaction rollback, simultaneous changes, expiry during hashing and restart persistence. Changed auth server/client/tests, Settings/App, package version and frontend render harness; added ChangePasswordSheet and ACCOUNT_SETTINGS_WALKTHROUGH.md with request flow, concepts and six Viva questions. The harness preserves JSON import attributes for the project's Node24 runtime. Browser checks passed actual sheet/required feedback,320/390px no-overflow/focus/Escape/Cancel, correct About version and real ABA tab opening. Independent API checks confirmed existing record/EXIF and exact image bytes survive password change;55 focused tests passed. Browser policy requires human entry of new credentials, so interactive mismatch/wrong-password/save and network-failure draft retry remain manual, rather than inferred from API results. Provider receipt, email recovery and physical-device acceptance are not implied.

### Entry 41 — Source-ID links, browser history and safe sharing

**Date/group:**25 October2026 IST; cross-screen navigation and Android integration. **Status:** source implemented locally on entity-navigation-sharing;121 web tests, TypeScript and production build pass. Five native policy tests, lint0errors/1warning and both APK builds pass; scoped browser/history/privacy/retry and fresh-debug-emulator chooser/cancel acceptance passed; PR #34 merged at328582f after all four checks passed for exact head0899fc4; merged-main web/Android checks passed.

**What changed and why:** detail screens previously lost their selection on refresh and shared the root page. The app now records validated screen/source IDs in canonical query links, restores after login/refresh, and uses browser history for Back/Forward. It waits for the actual discovery catalogue, reports unavailable IDs and checks linked observations through the authenticated API. Community sheets record their post/person IDs. Legacy notification links remain supported.

**Privacy/native behavior:** sharing exports only a canonical app link, never captions, notes, photo coordinates, media URLs, cookies or unrelated query fields. Private destinations still require viewer authorization. Browser chooser/copy/manual-copy fallbacks reuse platform functions. Android adds a narrow trusted-user-gesture share action and validates configured-origin root URLs, allowed screen/ID fields and bounded identifiers before opening the native text chooser. No JavaScript object bridge is introduced.

**Verification/files:**121 web tests/type/build passed (main497.76kB), including malformed/ambiguous routes, exact destination round trips, legacy alerts, history-state privacy, canonical sharing and fallback. Changed App/Header/Community and frontend tests; added lib/navigation.ts; changed Android MainActivity/OriginPolicy and its unit tests. Five native policy tests, lint0errors/1required-JavaScript warning and debug/unsigned-release assembly passed; independent browser exact-destination/login/reload/history, invalid/out-of-region IDs/provider503 retry, post/person sheets/privacy404 and unknown-query removal passed. Fresh debug APK native UI taps in an API35 emulator opened species/post choosers containing only canonical ID URLs; Back cancelled and preserved page/connection, with no external send. Desktop-browser share completion, hotspot fresh-sign-in and malformed person/post browser cases remain unverified; no physical/release/OS app-link or recipient claim. PR #34 merged at328582f after exact-head and merged-main web/Android checks passed. NAVIGATION_SHARING_WALKTHROUGH.md explains the request/history flow and six Viva questions. Final public deployment, source evidence, Firebase and physical-device limits remain unchanged.

### Entry 42 — Verified backups, restore rehearsal and local HTTPS-proxy deployment

**Date/group:**25–26 October2026 IST; reliability/release preparation. **Status:** implemented locally on release-backup-readiness;124 tests, TypeScript and production build pass. Independent integrated QA passed; PR #35 merged atbec99cb after four passing checks for exact headb621e5d; merged-main web/Android checks passed; no live server/backup/deployment was changed.

**What changed and why:** a database copy alone cannot restore private photo files and may miss SQLite write-ahead-log changes. Added an offline backup/verify command using SQLite's backup API, every referenced media file, a versioned manifest, integrity/foreign-key/count checks and SHA-256/size verification. It requires explicit operator confirmation that all app writers are stopped, rejects existing/project destinations and unsafe/missing files, and marks incomplete output instead of recursively deleting it. Secrets/configuration are not copied. Snapshots are private data, not encrypted or authenticated signatures; filesystem/storage protection remains necessary.

**Deployment fix:** production now trusts only loopback proxy hops for client IPs, while development keeps forwarded headers untrusted. Otherwise every person behind a local HTTPS proxy shared one IP rate-limit bucket. The documented proxy overwrites forwarded headers; tests prove separate real client buckets and that changing spoofed earlier hops cannot evade limits.

**Verification/files:**124 tests/type/build pass (main497.82kB). An actual-app fixture uploaded a generated photo and private record, stopped HTTP writes, backed up WAL-only committed state, exercised CLI create/verify, copied to fresh restore paths and reopened through the real app. Session/record/EXIF persisted, media bytes matched, private anonymous access remained denied. Corrupt/missing media, incomplete archives, unconfirmed copying and project/existing destinations were rejected. Modified auth/index/package/test files; added scripts/backup.mjs, backup.test.mjs and RELEASE_RUNBOOK.md with setup/demo/shutdown/backup/restore steps and six Viva questions. Independent integrated QA completed26 October with source-ID discovery, generated images, persisted private journal edit/public-only feed, second-account sighting target/read, comment/message reload persistence and private404. Controlled catalogue/provider fixtures were labelled; the paused fixture was recreated and prior quiz/native evidence reused, not claimed rerun. Focused backup2tests and proxy1test also passed independently. No live personal backup, off-host transfer, physical device, provider outage or24/7 hosting claim is made.

### Entry 43 — Native Firebase source adapter and guarded device lifecycle

**Date/group:**26 October2026 IST; Android/Phase3 integration. **Status:** implemented locally on native-push-integration;132 web tests and focused client/server checks pass. Latest nine native policy tests/lint0errors2warnings/debug+release builds pass; targeted SDK-unconfigured emulator checks passed with the stated initial/final APK boundaries; GitHub delivery pending. No Firebase project exists; actual registration/receipt is unverified.

**What changed and why:** WebView needs the native Firebase messaging SDK rather than the browser service-worker client. Added optional ignored public Android configuration, Firebase SDK/AndroidX support, permission/token/confirmation tickets, session/origin/user/project-bound local opt-in, token-refresh re-enable, lifecycle cleanup, generic notification channel and inbox launch. SDK automatic initialization is off by default/pending/paused/disabled and enabled only for confirmed/restored opt-in; analytics/delegation remain off. Unconfigured builds do not request tokens. New capability detection protects older APKs and preserves the in-app inbox if native status fails.

**Authorization/privacy:** native device mutations carry expected user and opaque session binding; stale registration/removal cannot affect a newly signed-in account. Provider data contains generic text, public project and a double-hash session fingerprint, with no private species/photo/notes/GPS or direct cookie digest. Native code rechecks project/current cookie/local consent/permission before composing a generic preview. Token refresh pauses delivery until explicit re-enable; disabling removes server binding/local consent, while the SDK may retain installation metadata. The tested protocol is the app's data-only sender, not arbitrary Firebase Console notification payloads. Android priority is high with one-hour TTL, not a latency guarantee.

**Files/checks:** Android build/config/manifest/MainActivity plus new NativePush/PushPolicy/Application/Service/policy tests and monochrome existing-logo notification icon; backend alerts/push and tests; frontend native bridge/push/alerts/App/notification/settings/password integration and tests.132 web tests/type/build passed; focused59 client/server tests cover old-host fallback, request correlation/abort, token rotation, unchanged in-app inbox, project mismatch, confirmation rollback, guarded cleanup and stale account/session requests. Latest nine native policy tests/lint0errors2warnings/debug+unsigned-release builds pass; targeted unconfigured native/UI checks passed. Initial web bundle was478.40kB after lazy Settings, before the subsequent dependency fixes in Entry44. Settings is split on demand after the initial bundle exceeded500kB; existing error-boundary recovery is reused. Returning to the app now accepts a changed authenticated account rather than leaving the previous identity displayed. NATIVE_PUSH_WALKTHROUGH.md explains setup, flow, limitations and seven Viva questions.

**Native QA follow-up,26 October:** existing login/in-app alerts and lazy Settings worked with Firebase absent; notification permission stayed denied without unsolicited prompts. An owned visible probe rejected non-gesture token navigation and a native UI tap returned the missing-configuration error before the source permission/token/init gates. Picker-open/cancel, location denial/timeout/manual fallback, synthetic cold/warm notification Intent and a labelled synthetic account-identity reconciliation passed. No new JPEG upload or GPS fix was claimed. Final consent-refinement APK SHA256 FAF5BCE14CD4F7C941A679EC2425E426096D2A97AF8F4D009CC1E46D23059BF6 passed cold Intent/inbox/Settings/unconfigured smoke; detailed probe/picker/location/focus checks used the preceding recorded APK. Actual Firebase grant/token/send/receipt/refresh and physical/release acceptance remain unverified. Test resources stopped; restoredlocalhost server was unavailable, so no successful shared-server restore claim is made.

### Entry 44 — Dependency remediation and compressed-input failure handling

**Date/group:**26 October2026 IST; release security/reliability. **Status:** compatible fixes implemented locally; full pnpm audit zero advisories, peer check clear, frozen install and final133 tests/type/build pass; GitHub delivery pending.

**What changed:** initial production audit reported9 advisories (3high/4moderate/2low). Vite8.3.2→8.3.5, body-parser→1.20.9 and grpc-js→1.13.6 remove those findings. A subsequent full audit identified a low development-server issue in the interim esbuild peer, so esbuild is aligned to0.28.2. Narrow workspace overrides and the lockfile preserve fixed transitive versions; existing build permissions and app frameworks remain. CI adds a high/critical production-audit gate. Firestore/gRPC remain unused application features, not a new database/API architecture.

**Validation and explanation:** the full installed-package audit now reports0 for every severity, with no peer conflicts. A new actual HTTP test confirmed valid gzip login and exposed malformed compressed input returning500; the handler now returns generic400, followed by a successful normal login. All11 focused auth tests pass. Frozen install and the final133-test suite/type/build pass; initial web JavaScript478.39kB. Exact-head CI is required before merge. DEPENDENCY_SECURITY_WALKTHROUGH.md links primary advisories and explains lockfiles, transitive dependencies/overrides and six Viva questions. No real provider outage, live-server restart or universal security certification is claimed.

## 4. How the current application fits together

The interface is what the user sees and interacts with. The backend is the program that receives requests and checks account information. The database is where persistent account information is saved.

```text
User's screen -> React interface -> account request -> Express backend -> SQLite
                                      |
                           session cookie returned

Discovery/planning screens -> Express source modules -> eBird / Wikimedia / Open-Meteo
Observation/media, community, alerts, retention and messaging routers -> account-scoped SQLite records and private media
```

In development, Vite serves the interface and forwards account requests to Express. SQLite stores users/sessions, discovery saves/history, profiles/follows, media/observations, social reactions/comments/reports, subscriptions/sighting/forecast alerts, optional push queues/devices, quiz progress and messaging records. Journal/life-list/challenges are derived from owned observations; media files are private and served through authorization checks. External discovery uses server-side eBird requests and a 15-minute memory cache; it does not add database tables.

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

Further acceptance includes exact final-design approval, full physical-phone touch/keyboard/orientation/permissions, genuine provider-outage recovery and production operation. Scoped core browser auth/refresh/logout, saves, maps and 320/390px checks have passed; these do not certify later-phase prototype screens or physical Android delivery.

## 6. Remaining work grouped by specification phase

| Phase | Remaining implementation and acceptance |
| --- | --- |
| Phase 1 — core | Verify local seasonal timing/difficulty, stronger source/environment-supported logistics, wider geographic/access coverage if required and design/manual/device acceptance. Discovery: Entries 12–13; maps/directions: Entry 14; weather: Entry 16; photos/EXIF: Entries 17–18; initial source-aware planning: Entry 19; sourced species information: Entry 20; persistent personal discovery activity: Entry 21; location/Explore weather: Entry 22; initial reviewed access: Entry 23; seasonal/exposure preparation: Entry 25. APK delivery is deferred for this phase, not cancelled. |
| Phase 2 — community | Core delivered across #24–25 and #29–30. Remaining integrated/native/physical acceptance, moderation operations and production backup/hosting evidence are separate from implemented persistence. |
| Phase 3 — alerts | Sighting/forecast in-app processing delivered #26–27; categorized social inbox #30. Actual Firebase configuration/device receipt and native push adaptation remain incomplete. All shared exact coordinates stay withheld; a verified species sensitivity catalogue is not claimed. |
| Phase 4 — retention | Quiz sessions/progress/XP/streak and reported-observation photography challenges delivered #28. Integrated/physical acceptance remains; no verified identification/visit/quality award is claimed. |
| Android/submission | Android packaging and backend connectivity, physical-device verification, appropriate deployment/persistence/backup checks and complete acceptance documentation. |

Other incomplete existing controls include password recovery, sourced audio and entity-specific sharing/navigation. Simulated messaging has been replaced by persistent conversations (#29). Their final scope and priority should follow the specification. No additional feature should be assumed complete from its appearance in the interface.

Android delivery is now in scope for full-project completion. Follow PROJECT_COMPLETION_PLAN.md for all phases and PHASE_1_ACCEPTANCE.md for the unresolved Phase 1 evidence/manual criteria. Historical deferrals describe their original increments only.

### Current issues still requiring follow-up

- Seasonal statistics require legitimate regional historical exports with denominators. Measured photography difficulty and historical environmental matching lack reliable evidence; general heuristics must stay labelled.
- Firebase project/configuration and actual browser/native-device push receipt are unavailable. Social notifications are currently in-app only; Android WebView needs a native push adapter before device delivery can be accepted.
- Android preview is delivered in #31 with passing exact-head/main CI and scoped native photo/privacy/back/connection checks; successful GPS, physical Oppo and HTTPS release acceptance remain pending.
- Global search/social-notification/pagination changes are delivered in #30/da676b7 with exact-head/main CI and scoped browser acceptance; integrated weak-network/device acceptance remains open.
- Source-ID links/history/native chooser are delivered in #34; desktop-browser share completion/OS app-link/manual acceptance remain open. Offline backup/restore is implemented in Entry42 with actual-app synthetic rehearsal; production hosting/off-host operation and genuine outage/public-tunnel acceptance remain open.
- Operator-current access/entrance confirmation and final design approval still require external/manual evidence. Scientific/provider gaps must not be replaced by sample values.
- Frontend type checking does not fully check JavaScript server code; server behavior is covered by HTTP/unit tests rather than a JavaScript type-check claim.

Historical prototype defects in journal counts, fabricated metadata, unenforced record privacy, title-based alert routing, simulated chat and the two-question quiz were replaced by the delivered increments in Entries31–36. Entry37 covers remaining global source-ID and social-inbox work. Their old review findings are not current implementation claims.

## 7. Source files and evidence index

These paths help the developer find implementation details; teammates can understand the preceding sections without reading them.

| Group | Important files |
| --- | --- |
| External discovery | frontend/server/discovery.mjs; frontend/server/discovery.test.mjs; frontend/src/lib/discovery.ts; docs/DISCOVERY_WALKTHROUGH.md |
| Reviewed access | frontend/server/access.mjs; frontend/server/access.test.mjs; frontend/src/components/HotspotAccess.tsx; docs/HOTSPOT_ACCESS_WALKTHROUGH.md |
| Maps and directions | frontend/src/components/HotspotMap.tsx; frontend/src/lib/maps.ts; HotspotsScreen.tsx; HotspotDetailScreen.tsx; frontend/src/index.css |
| Location and nearby discovery | frontend/src/lib/location.ts; frontend/src/components/LocationPicker.tsx; frontend/src/App.tsx; frontend/src/components/ExploreScreen.tsx; frontend/src/components/HotspotsScreen.tsx; docs/NEARBY_WEATHER_WALKTHROUGH.md |
| Weather and planning | frontend/server/weather.mjs; frontend/server/weather.test.mjs; frontend/src/components/HotspotWeatherPanel.tsx; docs/WEATHER_WALKTHROUGH.md |
| Personal discovery activity | frontend/server/activity.mjs; frontend/server/activity.test.mjs; frontend/src/lib/activity.ts; frontend/src/App.tsx; docs/DISCOVERY_ACTIVITY_WALKTHROUGH.md |
| Species information | frontend/server/wikidata.mjs; frontend/server/species-info.mjs; frontend/server/species-info.test.mjs; frontend/src/components/SpeciesInfoPanel.tsx; docs/SPECIES_INFORMATION_WALKTHROUGH.md |
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
| Presentation acceptance | docs/PHASE_1_PRESENTATION.md; six core design-reference images; Entry 26 browser/device evidence |
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
- **APK:** an Android installation package. The Android host builds an installable preview; the web bundle alone is not an APK.
