# Bird Wanderer — full-project completion plan

Updated 24 October 2026. The user authorized the full development cycle in Continue Project Build 2; this supersedes the previous Phase-1-only increment and Android deferral. Live SRS re-read through Drive on 23 October; last modified 5 October. Preserve final designs and React/Express/SQLite architecture. No paid services or invented evidence. Original 20 October deadline is historical; no new deadline is assumed.

## Current delivery

PR #22 merged at a990239 with passing merged CI, confirmed 23 October. Its 89-test/type/build and scoped browser evidence is dated 13 October; verification is being refreshed, not silently re-dated. Accounts, external discovery, maps, forecast preparation, source photos/EXIF and per-account saves/searches work. Later-phase profiles/uploads/journal/social/alerts/quiz remain mostly prototypes. No APK exists.

## Acceptance matrix and execution order

| Order / vertical slice | Starting state | Completion criteria / dependencies |
| --- | --- | --- |
| 0. Phase 1 closure | Delivered core; evidence/manual gaps | Correct documentation; controlled missing/error/retry browser checks; tunnel logout/recovery. Seasonal export needs legitimate authenticated data; difficulty/historical conditions stay unsupported unless proven. |
| 1. Profiles and observation/media foundation | Prototype, missing persistence | Real profile/settings storage; validated bounded photo upload; actual EXIF, correct species/hotspot IDs; private storage; metadata-free shared derivatives; persisted observation ownership/visibility. Auth and discovery reused. |
| 2. Journal/life list/profile statistics | Prototype/sample totals | Own observations populate journal/life list/photos and computed totals, survive reload/restart; delete/update enforced by owner; no fabricated verification badge. Depends on 1. |
| 3. Community | Prototype | Real visibility-filtered feed, follows, likes/comments/tips, reports and saved posts; two-account authorization; private/follower/sensitive media not bypassable by URL. Depends on 1. |
| 4. Alerts/conservation | Prototype | Persist species/hotspot subscriptions and preferences; sighting-triggered matching; deduplicated in-app alerts/read state; protected location generalization; actual push integration where provider configuration permits. Distinguish in-app/push/device evidence. Depends on 1/3. |
| 5. Quiz/challenges | Sample interface | Complete question sessions/scoring/progress/streak; documented photography challenge completion/progress without disrupting discovery. Depends on species/media and account state. |
| 6. Remaining documented interactions | Prototype | Review messaging, profile/search/filter and notification target behavior against supplied screens; persist necessary interactions and reliable ID-based navigation. No fake replies or success. |
| 7. Android and release | Missing | Inspect local Java/SDK/emulator; package actual Android project/APK, backend connection configuration and permissions; install/device or emulator evidence when available. Public hosting/provider secrets and physical acceptance remain explicit prerequisites. |
| 8. Integrated acceptance | Partial historical checks | Full regressions, two-account access/privacy, restart persistence, upload failure/limits, alerts/quiz and mobile flows; exact-head CI before merge; current setup/demo/Viva docs and honest unresolved input list. |

## Working rules and verification

One writer updates code/docs; Test chat performs authorized independent browser checks. Focused branches/PRs, no assistant-name prefix. Preserve unrelated launcher rename. Do not commit .env, user data/media, credentials, databases or generated builds. Each delivered slice appends a dated Development Record entry and updates this matrix without rewriting historical evidence.

Screen -> request -> backend -> storage -> result examples will accompany each slice. Test missing/bad inputs and account ownership before happy-path screenshots. Real provider outage, push dispatch and physical-device claims require actual evidence; controlled fixtures are labelled.

## Immediate slice in progress

Documentation refresh delivered in PR #23. Profile/media/observation persistence and journal integration are implemented on observations-persistence, with 93 tests/type/build and scoped live API/browser checks passing before final refinements. See [upload/ownership walkthrough](OBSERVATIONS_WALKTHROUGH.md) and Development Record Entry 31. Browser file selection is manual because the documented chooser tool timed out; seeded-follower HTTP evidence is separate from the future follow UI. Next after delivery: real community interactions/follows/reports and alerts. No speculative seasonal importer without a supported export.

## External/manual inputs

Legitimate eBird histogram export with metadata/denominators; reliable measured difficulty/environment evidence; current operator/entrance confirmation; final user design approval; Android physical device and any unavailable SDK/provider/hosting credentials. Investigate once, record exact blockers and continue independent work. Never request passwords in chat.
