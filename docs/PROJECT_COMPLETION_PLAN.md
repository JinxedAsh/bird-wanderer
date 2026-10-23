# Bird Wanderer — full-project completion plan

Updated 24 October 2026. The user authorized the full development cycle in Continue Project Build 2; this supersedes the previous Phase-1-only increment and Android deferral. Live SRS re-read through Drive on 23 October; last modified 5 October. Preserve final designs and React/Express/SQLite architecture. No paid services or invented evidence. Original 20 October deadline is historical; no new deadline is assumed.

## Current delivery

PR #22 merged at a990239 with passing merged CI, confirmed 23 October; its Phase 1 evidence remains dated 13 October. Documentation refresh #23/bef622e is merged. First persistent slice #24/28218af is now merged: actual photo upload/EXIF, metadata-free images, owned observations, journal/life-list/profile/settings storage and server media privacy. Its 93 tests/type/build and scoped browser/live HTTP checks passed; native file-picker, positive follow UI and physical device acceptance remain pending. Community PR #25/50d6d7d is now merged with passing exact-head and merged-main CI. Sighting alerts and optional Firebase integration are implemented locally (98 tests/type/build); browser QA passed; GitHub delivery is pending. Quiz/challenges/messaging and Android are not delivered. No APK exists.

## Acceptance matrix and execution order

| Order / vertical slice | Starting state | Completion criteria / dependencies |
| --- | --- | --- |
| 0. Phase 1 closure | Delivered core; evidence/manual gaps | Correct documentation; controlled missing/error/retry browser checks; tunnel logout/recovery. Seasonal export needs legitimate authenticated data; difficulty/historical conditions stay unsupported unless proven. |
| 1. Profiles and observation/media foundation | Delivered #24/28218af; native chooser/device manual | Validated bounded upload/EXIF; source IDs; private disk and authorized metadata-free derivatives; profile/privacy and ownership. 93-test suite and live two-account HTTP checks passed. |
| 2. Journal/life list/profile statistics | Delivered #24/28218af; newest-500 pagination outstanding | Owned records replace samples, survive reload/restart, support owner deletion/life-list changes and computed totals; user-reported rather than fabricated verification. |
| 3. Community | Delivered #25/50d6d7d; post-target followup partly pending | Real visibility-filtered feed, follows, likes/comments/tips, reports and saved posts; two-account authorization; private/follower/sensitive media not bypassable by URL. Depends on 1. |
| 4. Alerts/conservation | Sighting/in-app/Firebase source local; opportunity scheduler missing | Persist species/hotspot subscriptions and preferences; sighting-triggered matching; deduplicated in-app alerts/read state; protected location generalization; actual push integration where provider configuration permits. Distinguish in-app/push/device evidence. Depends on 1/3. |
| 5. Quiz/challenges | Sample interface | Complete question sessions/scoring/progress/streak; documented photography challenge completion/progress without disrupting discovery. Depends on species/media and account state. |
| 6. Remaining documented interactions | Prototype | Review messaging, profile/search/filter and notification target behavior against supplied screens; persist necessary interactions and reliable ID-based navigation. No fake replies or success. |
| 7. Android and release | Missing | Inspect local Java/SDK/emulator; package actual Android project/APK, backend connection configuration and permissions; install/device or emulator evidence when available. Public hosting/provider secrets and physical acceptance remain explicit prerequisites. |
| 8. Integrated acceptance | Partial historical checks | Full regressions, two-account access/privacy, restart persistence, upload failure/limits, alerts/quiz and mobile flows; exact-head CI before merge; current setup/demo/Viva docs and honest unresolved input list. |

## Working rules and verification

One writer updates code/docs; Test chat performs authorized independent browser checks. Focused branches/PRs, no assistant-name prefix. Preserve unrelated launcher rename. Do not commit .env, user data/media, credentials, databases or generated builds. Each delivered slice appends a dated Development Record entry and updates this matrix without rewriting historical evidence.

Screen -> request -> backend -> storage -> result examples will accompany each slice. Test missing/bad inputs and account ownership before happy-path screenshots. Real provider outage, push dispatch and physical-device claims require actual evidence; controlled fixtures are labelled.

## Immediate slice in progress

Sighting alerts and optional Firebase push are active on sighting-alerts after #25 delivery. 98 tests/type/build, frozen install and Firebase Admin import smoke check pass. Real Firebase configuration and device evidence are absent. Forecast-opportunity scheduling remains a required separate task, not complete.

## Exact continuation checkpoint — 24 October

- Branch sighting-alerts, base merged community #25/50d6d7d. Community exact head 01ea3ea passed both checks before squash merge; merged main CI passed. Preserve unrelated deleted Start-Dev.ps1/untracked Test.ps1.
- Community browser positive follow/unfollow, media grant/revocation, persisted actions, comment ownership, reporting, real profiles, nearby include/exclude and 320/390 no-overflow/clean console passed. Initial 24–32px targets were fixed to 44px. Followup filters/clear/upload/profile-close passed; post-action/details-close/comment-submit followup passed after the normal auth cooldown; the remaining dismisshandle was made native44px and retested.
- Uncommitted alerts files: server/alerts.mjs + tests, push.mjs + tests; existing observation/auth/index integration; src/lib/alerts.ts and push.ts; worker/push-worker.mjs plus build script/dev/package wiring; App/detail/community/notifications/settings/type/client changes; Firebase packages/lockfile/allowBuilds; env/ignore/docs. Inspect actual Git state for full file list. Generated public/push-worker.js is ignored.
- Source behavior: future explicit species/hotspot subscription + enabled master preference -> deduplicated transactionally stored sighting alert; polling15sec while visible; persisted readstate; exact observation opening; current privacy/follow/media checks. Optional configured Firebase adapter, explicit browser registration, session-bound devices/revocation, generic no-location payload, SQLite outbox/retry cap/invalid-token cleanup. No live provider token/receipt claim.
- Next: alert/mobile QA passed with two responsive fixes; finish update Entry33/current state/walkthrough/README; secret/diff checks; focused PR and exact-head checks before merge, then verify merged main. Missing Firebase config was asked once via async question; no answer yet. Continue independent work without waiting on it.
- Test chat 01a103be-0001-7ef1-9a60-60deff2537e5, host local; authorized QA only, no shared source/server changes. Latest QA cursor df8ae948-216b-4d57-a40d-ad3caa1afd1e:31. Live matching/readstate/revocation and320/390px checks passed; controlled subscription/provider-failure test passed separately. Six synthetic records were cleaned and settings restored. Do not bypass rate limit or native chooser.
- After delivery: explicit forecast-opportunity scheduling and reliable conservation-evidence limits, real retention quiz/challenges, required messaging/search/navigation, Android project/toolchain/build/backend connectivity, integrated acceptance and Phase 1 browser/tunnel queue. No Java/SDK/adb/Gradle found on PATH or common Java/Android dirs; approx28GB free disk, no APK yet.
- Supervisor Continue Project Build2 is read-only and owns the active15min full-scope reset-recovery heartbeat. Do not create a duplicate. Continue after quota reset under the same human full-cycle authorization; do not mark unfinished work complete or voluntarily pause.

## External/manual inputs

Legitimate eBird histogram export with metadata/denominators; reliable measured difficulty/environment evidence; current operator/entrance confirmation; final user design approval; Android physical device and any unavailable SDK/provider/hosting credentials. Investigate once, record exact blockers and continue independent work. Never request passwords in chat.
