# Bird Wanderer — full-project completion plan

Updated 24 October 2026. The user authorized the full development cycle in Continue Project Build 2; this supersedes the previous Phase-1-only increment and Android deferral. Live SRS re-read through Drive on 23 October; last modified 5 October. Preserve final designs and React/Express/SQLite architecture. No paid services or invented evidence. Original 20 October deadline is historical; no new deadline is assumed.

## Current delivery

PR #22 merged at a990239 with passing merged CI, confirmed 23 October; its Phase 1 evidence remains dated 13 October. Documentation refresh #23/bef622e is merged. First persistent slice #24/28218af is now merged: actual photo upload/EXIF, metadata-free images, owned observations, journal/life-list/profile/settings storage and server media privacy. Its 93 tests/type/build and scoped browser/live HTTP checks passed; native file-picker, positive follow UI and physical device acceptance remain pending. Community PR #25/50d6d7d is now merged with passing exact-head and merged-main CI. Sighting alerts and optional Firebase integration are delivered in PR #26/e8aab1e after exact-head and merged-main CI passed (98 tests/type/build and scoped browser QA). Forecast-opportunity alerts are now implemented locally with 101 tests; QA/delivery pending. Quiz/challenges/messaging and Android are not delivered. No APK exists.

## Acceptance matrix and execution order

| Order / vertical slice | Starting state | Completion criteria / dependencies |
| --- | --- | --- |
| 0. Phase 1 closure | Delivered core; evidence/manual gaps | Correct documentation; controlled missing/error/retry browser checks; tunnel logout/recovery. Seasonal export needs legitimate authenticated data; difficulty/historical conditions stay unsupported unless proven. |
| 1. Profiles and observation/media foundation | Delivered #24/28218af; native chooser/device manual | Validated bounded upload/EXIF; source IDs; private disk and authorized metadata-free derivatives; profile/privacy and ownership. 93-test suite and live two-account HTTP checks passed. |
| 2. Journal/life list/profile statistics | Delivered #24/28218af; newest-500 pagination outstanding | Owned records replace samples, survive reload/restart, support owner deletion/life-list changes and computed totals; user-reported rather than fabricated verification. |
| 3. Community | Delivered #25/50d6d7d; post-target followup partly pending | Real visibility-filtered feed, follows, likes/comments/tips, reports and saved posts; two-account authorization; private/follower/sensitive media not bypassable by URL. Depends on 1. |
| 4. Alerts/conservation | Sighting/Firebase core delivered #26; forecast opportunity source local; real push unverified | Persist species/hotspot subscriptions and preferences; sighting-triggered matching; deduplicated in-app alerts/read state; protected location generalization; actual push integration where provider configuration permits. Distinguish in-app/push/device evidence. Depends on 1/3. |
| 5. Quiz/challenges | Sample interface | Complete question sessions/scoring/progress/streak; documented photography challenge completion/progress without disrupting discovery. Depends on species/media and account state. |
| 6. Remaining documented interactions | Prototype | Review messaging, profile/search/filter and notification target behavior against supplied screens; persist necessary interactions and reliable ID-based navigation. No fake replies or success. |
| 7. Android and release | Missing | Inspect local Java/SDK/emulator; package actual Android project/APK, backend connection configuration and permissions; install/device or emulator evidence when available. Public hosting/provider secrets and physical acceptance remain explicit prerequisites. |
| 8. Integrated acceptance | Partial historical checks | Full regressions, two-account access/privacy, restart persistence, upload failure/limits, alerts/quiz and mobile flows; exact-head CI before merge; current setup/demo/Viva docs and honest unresolved input list. |

## Working rules and verification

One writer updates code/docs; Test chat performs authorized independent browser checks. Focused branches/PRs, no assistant-name prefix. Preserve unrelated launcher rename. Do not commit .env, user data/media, credentials, databases or generated builds. Each delivered slice appends a dated Development Record entry and updates this matrix without rewriting historical evidence.

Screen -> request -> backend -> storage -> result examples will accompany each slice. Test missing/bad inputs and account ownership before happy-path screenshots. Real provider outage, push dispatch and physical-device claims require actual evidence; controlled fixtures are labelled.

## Immediate slice in progress

Forecast-opportunity alerts on forecast-opportunity-alerts after #26 delivery. 101 tests/type/build pass locally. Opt-in, hourly per-site checks and explicit existing rain/wind/light heuristics; no species-success claim. Optional generic Firebase outbox supports both sources via a tested preserving schema migration. Real Firebase configuration/device evidence is still absent.

## Exact continuation checkpoint — 24 October

- Branch forecast-opportunity-alerts, base #26/e8aab1e. PR26 exact head 912cabdab04ad60be1cfe82e6b8b73839dd5d3d3 passed both checks before squash merge; merged main CI success verified. Do not redo community #25/50d6d7d or sighting slice #26. Preserve unrelated deleted Start-Dev.ps1/untracked Test.ps1.
- Community post controls/dismiss handle now 44px, tested after auth cooldown. Notifications title/timestamp stack/wrap at 320/390; clean console. Sighting browser matches/dedup/read targets/persistence, suppressed cases, revocation 404 and controlled outage unsubscribe passed. Six synthetic records cleaned and prefs restored. Native chooser/physical device/Firebase remain manual/unverified.
- Current increment includes new opportunities.mjs/opportunities.test.mjs and FORECAST_OPPORTUNITIES_WALKTHROUGH.md, plus alerts/push/auth/index/observations/client/App/Notifications/types/package integration. New tables opportunity_preferences/opportunity_alerts/opportunity_checks. Push-delivery migration preserves old attempts/status, allows exactly one sighting/opportunity source with unique source/device indexes and cascade FKs. 101 tests passing; final calendar/horizon and atomic all-read refinements pass the101-test suite/type/build. Next command: wait_threads QA chat at cursor33; inspect actual branch/PR status, then inspect sanitized QA results/fix defects; finish Entry34, secret scan/git diff --check, explicit staging/commit/PR/exact-head CI/merge.
- Behavior: explicit opportunity opt-in + master sighting alerts + hotspot subscription -> at most hourly site forecast checks (20 due sites/cycle), one future light/rain/wind candidate per hotspot/local day; source timezone and retrieval recorded. Missing/stale/failing data never creates a favorable alert. One site failure does not stop others. Read/open exact hotspot; unsubscribe/opt-out/expiry removes opportunity visibility. Generic optional push rechecks consent/expiry/session. No real provider/device claim.
- Next: complete Test chat fixture/live responsive/browser QA, fix defects, append Entry34/update current docs/README and public walkthrough; final101-test/type/build/secret/diff checks; focused PR, exact-head CI before merge and merged-main verification. A single async question for Firebase config remains unanswered; continue independent work.
- QA chat 01a103be-0001-7ef1-9a60-60deff2537e5, local. Opportunity testing dispatched; may start own temporary isolated fixture server/currentbuiltfrontend on a verified free alternateport, but must not restart/edit shared server/source. Label synthetic favorable/outage checks separately from real forecasts. Parent remains sole source writer.
- After this slice: retention quiz/challenges, messaging and remaining global people/post/ID navigation flows; fix bounded 50-people local search/pagination before calling complete; Android toolchain/project/APK/backend connection and integrated/Phase1 closure queue. No SDK/JDK/adb/Gradle found on PATH/common paths; 28 GB disk free; no APK yet. No actual phone/provider-outage/final tunnel logout acceptance.
- Supervisor Continue Project Build2 is read-only and owns active 15min full-scope quota-reset recovery heartbeat. Do not duplicate it. Resume under existing human full-cycle authority after reset; do not mark incomplete criteria complete or voluntarily pause.

## External/manual inputs

Legitimate eBird histogram export with metadata/denominators; reliable measured difficulty/environment evidence; current operator/entrance confirmation; final user design approval; Android physical device and any unavailable SDK/provider/hosting credentials. Investigate once, record exact blockers and continue independent work. Never request passwords in chat.
