# Bird Wanderer — full-project completion plan

Updated 26 October 2026. The user authorized the full development cycle on23 October 2026; this supersedes the previous Phase-1-only increment and Android deferral. Live SRS re-read through Drive on 23 October; last modified 5 October. Preserve final designs and React/Express/SQLite architecture. No paid services or invented evidence. Original 20 October deadline is historical; no new deadline is assumed.

## Current delivery

Persistent four-phase cores and the installable Android preview are delivered through #34/328582f. Observation upload/privacy, community, sighting/forecast/social in-app alerts, quizzes/challenges, messaging/search, owned-record editing, authenticated password changes and ID-based navigation/sharing have exact-head/main CI evidence recorded in Entries31–41. Android debug/unsigned-release builds and scoped emulator flows pass; physical/release/push acceptance remains separate.

Release reliability #35 is delivered: offline database/media backup/verify, actual-app restore rehearsal and production loopback-proxy client-IP trust pass124 tests/type/build. Independent integrated rehearsal completed26 October: source-ID discovery, generated photos, persisted private journal edit, public-only feed, second-account sighting target/read, comment and message persistence, and private404. Fixtures are explicitly synthetic; prior quiz/native evidence is reused rather than claimed rerun. PR #35/bec99cb is merged after exact-head and main web/Android checks passed.

## Acceptance matrix and execution order

| Order / vertical slice | Starting state | Completion criteria / dependencies |
| --- | --- | --- |
| 0. Phase 1 closure | Delivered core; evidence/manual gaps | Correct documentation; controlled missing/error/retry browser checks; tunnel logout/recovery. Seasonal export needs legitimate authenticated data; difficulty/historical conditions stay unsupported unless proven. |
| 1. Profiles and observation/media foundation | Delivered #24/28218af; native chooser/device manual | Validated bounded upload/EXIF; source IDs; private disk and authorized metadata-free derivatives; profile/privacy and ownership. 93-test suite and live two-account HTTP checks passed. |
| 2. Journal/life list/profile statistics | Delivered #24/28218af; older-record pagination delivered #30 | Owned records replace samples, survive reload/restart, support owner deletion/life-list changes and computed totals; user-reported rather than fabricated verification. |
| 3. Community | Delivered #25/50d6d7d;44px followup passed | Real visibility-filtered feed, follows, likes/comments/tips, reports and saved posts; two-account authorization; private/follower/sensitive media not bypassable by URL. Depends on 1. |
| 4. Alerts/conservation | Sighting/Firebase core delivered #26; forecast opportunities delivered #27; real push unconfigured | Persist species/hotspot subscriptions and preferences; sighting-triggered matching; deduplicated in-app alerts/read state; protected location generalization; actual push integration where provider configuration permits. Distinguish in-app/push/device evidence. Depends on 1/3. |
| 5. Quiz/challenges | Delivered #28/089edcd; scoped browser checks passed | Complete question sessions/scoring/progress/streak; documented photography challenge completion/progress without disrupting discovery. Depends on species/media and account state. |
| 6. Remaining documented interactions | Messaging delivered #29; search/social inbox/paging delivered #30 | Review messaging, profile/search/filter and notification target behavior against supplied screens; persist necessary interactions and reliable ID-based navigation. No fake replies or success. |
| 7. Android and release | Native host source/build in progress | Inspect local Java/SDK/emulator; package actual Android project/APK, backend connection configuration and permissions; install/device or emulator evidence when available. Public hosting/provider secrets and physical acceptance remain explicit prerequisites. |
| 8. Integrated acceptance | Partial historical checks | Full regressions, two-account access/privacy, restart persistence, upload failure/limits, alerts/quiz and mobile flows; exact-head CI before merge; current setup/demo/Viva docs and honest unresolved input list. |

## Working rules and verification

One writer updates code/docs; Test chat performs authorized independent browser checks. Focused branches/PRs, no assistant-name prefix. Preserve unrelated launcher rename. Do not commit .env, user data/media, credentials, databases or generated builds. Each delivered slice appends a dated Development Record entry and updates this matrix without rewriting historical evidence.

Screen -> request -> backend -> storage -> result examples will accompany each slice. Test missing/bad inputs and account ownership before happy-path screenshots. Real provider outage, push dispatch and physical-device claims require actual evidence; controlled fixtures are labelled.

## Immediate slice and next priorities

1. Native Firebase source adapter and dependency remediation are delivered in #36/137bc5a after all four exact-head and merged-main web/Android checks passed. Final133 web tests/type/build, nine native tests/lint0errors2warnings/both builds and targeted unconfigured-emulator QA passed. No Firebase project exists; actual provider/device delivery is not established.
2. Exact-species sourced recording integration is implemented in Entry45; 139 tests/type/build and scoped real-audio browser acceptance passed; PR #37/e7abb0f merged after exact-head/main web/Android checks passed. Missing linked/licensed audio remains unavailable rather than simulated.
3. Optional email recovery source is implemented in Entry 46 with 148 tests/type/build, frozen install and zero full-audit findings. Scoped browser verification passed including the signed-in recovery-fragment fix; PR #38/4cc3507 is delivered after four exact-head and merged-main web/Android checks passed. SMTP/provider receipt remains unavailable; never silently consider actual delivery complete.
4. Actual hosting/off-host operation, physical-device/HTTPS release, provider receipt and scientific evidence require their own inputs; do not fabricate them.

One integrated rehearsal has passed with the stated fixture limits. Do not repeat broad unchanged checks merely to increase a test count. Private coordination/recovery details do not belong in this document.

## External/manual inputs

Legitimate eBird histogram export with metadata/denominators; reliable measured difficulty/environment evidence; current operator/entrance confirmation; final user design approval; Android physical device and any unavailable SDK/provider/hosting credentials. Investigate once, record exact blockers and continue independent work. Never request passwords in chat.

See FINAL_ACCEPTANCE.md for current delivered controls, remaining source work and manual/provider gaps; RELEASE_RUNBOOK.md for tested backup/restore and setup/Viva explanations.

## 26 October source handover

Entries 45–47 close sourced audio, optional recovery and the genuine HTTPS logout regression. No confirmed defect remains in those completed checks. Current 148-test/type/build, exact-head/main CI and native build evidence is recorded separately from external/manual acceptance. Remaining prerequisites are the scientific/operator data and provider/hosting/physical acceptance listed in FINAL_ACCEPTANCE.md; do not invent data, create provider accounts or treat an ephemeral preview as production uptime.
