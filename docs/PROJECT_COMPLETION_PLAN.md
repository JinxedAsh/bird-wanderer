# Bird Wanderer — full-project completion plan

Updated 24 October 2026. The user authorized the full development cycle in Continue Project Build 2; this supersedes the previous Phase-1-only increment and Android deferral. Live SRS re-read through Drive on 23 October; last modified 5 October. Preserve final designs and React/Express/SQLite architecture. No paid services or invented evidence. Original 20 October deadline is historical; no new deadline is assumed.

## Current delivery

PR #22 merged at a990239 with passing merged CI, confirmed 23 October; its Phase 1 evidence remains dated 13 October. Documentation refresh #23/bef622e is merged. First persistent slice #24/28218af is now merged: actual photo upload/EXIF, metadata-free images, owned observations, journal/life-list/profile/settings storage and server media privacy. Its 93 tests/type/build and scoped browser/live HTTP checks passed; native file-picker, positive follow UI and physical device acceptance remain pending. Community interactions, alerts, quiz/challenges/messaging and Android are not yet delivered. No APK exists.

## Acceptance matrix and execution order

| Order / vertical slice | Starting state | Completion criteria / dependencies |
| --- | --- | --- |
| 0. Phase 1 closure | Delivered core; evidence/manual gaps | Correct documentation; controlled missing/error/retry browser checks; tunnel logout/recovery. Seasonal export needs legitimate authenticated data; difficulty/historical conditions stay unsupported unless proven. |
| 1. Profiles and observation/media foundation | Delivered #24/28218af; native chooser/device manual | Validated bounded upload/EXIF; source IDs; private disk and authorized metadata-free derivatives; profile/privacy and ownership. 93-test suite and live two-account HTTP checks passed. |
| 2. Journal/life list/profile statistics | Delivered #24/28218af; newest-500 pagination outstanding | Owned records replace samples, survive reload/restart, support owner deletion/life-list changes and computed totals; user-reported rather than fabricated verification. |
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

Community slice is active on community-persistence after #24 delivery. Backend social tables/routes are being added using the existing observation visibility policy; frontend controls and multi-account social tests are implemented; 94 tests, TypeScript and production build pass locally. Browser QA and GitHub delivery remain pending. See the exact continuation below. Browser file selection remains manual because the documented chooser timed out; seeded-follower server evidence is separate from a future real follow UI. No speculative seasonal importer without a supported export.

## Exact continuation checkpoint — 24 October

- Current branch community-persistence, base merged #24/28218af. Do not redo #24. Unrelated deleted Start-Dev.ps1/untracked Test.ps1 remain preserved.
- Uncommitted: new frontend/server/community.mjs and observations.mjs integration, plus current documentation update. Also uncommitted: community.test.mjs, package test command, client Observation/API mapping, App state and CommunityScreen controls. New social tables: post_likes, post_saves, comments, reports, community_limits; existing follows reused. /api/observations/social routes cover people, follows, likes/saves, comments/deletion and reports. Visibility helpers are shared; 94 local tests/type/build pass, including rate-limit window recovery; exact-head CI has not run and this must not be called delivered.
- Next: finish Test chat browser checks (resumed after quota reset), fix verified defects, append Entry 32/community walkthrough, secret/diff check, focused PR/exact-head CI/merge. Real follow/like/save/comment/report UI is connected; profile sample biographies and fabricated post weather were removed. Test chat ID below.
- Latest verified source baseline #24: 93 tests, TypeScript, production build; browser empty journal/profile/settings/account switch and 320/390px; live HTTP uploads/privacy/reversal. Native chooser timed out twice; no false browser-upload claim. Publication PR #24 already merged.
- Test chat: 01a103be-0001-7ef1-9a60-60deff2537e5, host local; authorized testing only, no shared-file writes. Parent supervisor Continue Project Build 2 is read-only and has an active 15-minute recovery heartbeat for the full scope and five-hour reset. The old Phase1 worker automation was deleted; do not recreate/duplicate it. If execution is interrupted, inspect actual quota/Git state and resume this queue rather than mark completion or pause.
- After community: real subscriptions/in-app and configured push/conservation policy, retention quiz/challenges, necessary messaging, Android toolchain/build/backend connectivity and release checks. No Java/adb/Gradle/sdkmanager found on PATH in the first probe; do not claim all filesystem locations were searched or an APK built.

## External/manual inputs

Legitimate eBird histogram export with metadata/denominators; reliable measured difficulty/environment evidence; current operator/entrance confirmation; final user design approval; Android physical device and any unavailable SDK/provider/hosting credentials. Investigate once, record exact blockers and continue independent work. Never request passwords in chat.
