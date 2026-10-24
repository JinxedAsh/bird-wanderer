# Bird Wanderer — full-project completion plan

Updated 25 October 2026. The user authorized the full development cycle on23 October2026; this supersedes the previous Phase-1-only increment and Android deferral. Live SRS re-read through Drive on 23 October; last modified 5 October. Preserve final designs and React/Express/SQLite architecture. No paid services or invented evidence. Original 20 October deadline is historical; no new deadline is assumed.

## Current delivery

PR #22 merged at a990239 with passing merged CI, confirmed 23 October; its Phase 1 evidence remains dated 13 October. Documentation refresh #23/bef622e is merged. First persistent slice #24/28218af is now merged: actual photo upload/EXIF, metadata-free images, owned observations, journal/life-list/profile/settings storage and server media privacy. Its 93 tests/type/build and scoped browser/live HTTP checks passed; native file-picker and physical device acceptance remain pending; positive follow UI was subsequently verified in #25. Community PR #25/50d6d7d is now merged with passing exact-head and merged-main CI. Sighting alerts and optional Firebase integration are delivered in PR #26/e8aab1e after exact-head and merged-main CI passed (98 tests/type/build and scoped browser QA). Forecast opportunities are delivered in PR #27/196f251 after exact-head ba0d0c2 and merged-main CI passed;101 tests/type/build and scoped live-controls/controlled-forecast browser QA passed. Retention quiz/challenges are delivered in PR #28/089edcd after passing exact-head and merged-main CI, 104 tests/type/build and scoped browser QA. Messaging is delivered in PR #29/e085f4e after 107 tests/type/build, scoped browser QA and exact-head/main CI passed. Global search/social notifications/pagination are local with 110 tests/type/build and scoped browser QA passed; PR #30/da676b7 delivered after exact-head/main CI passed. Android native host source is local:4 unit tests, lint0errors2warnings and debug/unsigned-release assembly pass; debug APK installed/launched in owned API35 emulator. PR #31/47cbef4 is merged after exact-head and main web/Android checks passed. Scoped native picker/privacy/back/connection and targeted permission-guard checks passed; successful GPS/physical/HTTPS release acceptance remains pending.

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

## Immediate slice in progress

Journal record editing on PR #32: validated owned partial updates, preserved media/EXIF, stale sighting retraction, confirmed action feedback, latest100-comment disclosure and lazy-code recovery.115 tests/type/build and scoped browser editing/privacy/failure/retry/recovery/mobile acceptance pass; PR #32 merged at564ce92 after four exact-head checks passed; merged-main web/Android checks passed. Android preview #31 is delivered. Authenticated password changes and Settings guideline/version fixes are implemented locally with118 tests/type/build passing; scoped browser/control and independent API checks passed; PR #33 merged atbf3910a after exact-head/main checks passed, with interactive password submission manually unverified (Entry40). Native push adaptation and actual provider/device receipt remain incomplete.

## Next implementation priorities

1. Finish Journal browser verification, documentation and exact-head delivery; see FINAL_ACCEPTANCE.md for the finite control checklist.
2. Preserve delivered messaging/quiz/community behavior during integrated checks.
3. Complete remaining native push adaptation, shareable entity navigation and release/deployment preparation; distinguish available source/build evidence from provider/physical acceptance.
4. Run integrated regressions and the remaining Phase1 responsive/failure/tunnel/manual acceptance checks. Keep blocked scientific/provider requirements explicit.

Internal coordination, runtime paths and recovery checkpoints belong in the ignored private context file, not shared documentation.

## External/manual inputs

Legitimate eBird histogram export with metadata/denominators; reliable measured difficulty/environment evidence; current operator/entrance confirmation; final user design approval; Android physical device and any unavailable SDK/provider/hosting credentials. Investigate once, record exact blockers and continue independent work. Never request passwords in chat.

Source-ID route/history/sharing work is implemented locally in Entry41 with121 web tests/type/build; native5tests/lint0errors1warning/bothAPK builds and scoped browser/history/privacy/retry plus fresh-debug-emulator chooser/cancel passed; PR #34 merged at328582f after exact-head/main web/Android checks passed. Desktop-browser share completion, physical/release/OS app-link and recipient acceptance remain unverified. See FINAL_ACCEPTANCE.md and NAVIGATION_SHARING_WALKTHROUGH.md.

Release reliability Entry42: offline backup/verify, actual-app restore and loopback HTTPS-proxy client-IP trust implemented locally with124 tests/type/build. Independent integrated QA and focused delivery pending. Native Firebase source/configuration/receipt remain incomplete.
