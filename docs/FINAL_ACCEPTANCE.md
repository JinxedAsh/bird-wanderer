# Final acceptance — requirements and remaining controls

Updated 26 October 2026. This is a shared implementation/verification checklist for the team. It is not a claim that the application is fully complete. The living specification and supplied designs remain authoritative. It was reread on26 October; its textual screen accounting does not mention password recovery or audio, but those visible controls are tracked below rather than silently called functional.

## Delivered and currently implemented

| Screen/requirement | Current state | Verification / remaining acceptance |
| --- | --- | --- |
| Registration/login/session/logout | Persistent authenticated accounts, salted passwords, origin checks and server-managed sessions | HTTP/browser and Android preview checks passed; external password recovery is separate |
| Explore/name/location discovery | External eBird catalogue, real searches/saves, device/manual nearby filtering and attributed forecasts | Scoped success/empty/error/mobile checks; Android manual point works, successful Android GPS remains unverified |
| Species profile | Exact-taxonomy credited identification/habitat/behaviour, source photos/EXIF, multi-reference comparison | Source/identity/failure tests and scoped browser checks; no seasonal statistics or measured difficulty fabricated |
| Hotspots/map/planning | Source-ID maps/directions/reports/species links, forecast daylight/preparation, reviewed access snapshots | Four-venue coverage is partial; operator-current entrances/fees/permissions require evidence |
| Upload/profile/privacy | Real bounded JPEG/PNG processing, extracted EXIF, metadata-free derivatives, owned records, computed profiles and privacy | HTTP/privacy/restart checks; actual Android JPEG/PNG selection/publication and independent-reader checks passed on recorded APK |
| Community | Stored feed/follows/likes/saves/comments/reports and current source authorization | Browser/HTTP checks; reports are stored pending review, not proof moderation occurred. Comments show latest100 with explicit limit/total; older history is not loaded |
| Journal/life list | Persistent owned records/membership/progress and older-page access | Core delivered. Real record editor and confirmed delete/life-list feedback passed115 automated tests and scoped browser success/error/privacy/retry/focus/320–390px checks in Entry39; PR #32 merged at564ce92 after four passing checks for exact headb1aca78; merged-main web/Android checks passed; full totals stay separate from loaded-page detail |
| Search/profile targets | Real registered people, including zero-post accounts; all accessible matching post pages; exact profile/post destinations | #30 scoped browser paging/error/privacy checks and HTTP boundaries passed |
| Messages | Participant-only stored threads, retry-safe sends, read watermarks, search/filter intersection and privacy-aware attachments | #29 browser/HTTP checks; five-second foreground polling, not a zero-latency transport promise |
| Notifications | Sighting/forecast matching, social follow/comment/mention events, individual/all-read state and ID targets | In-app delivery passed; actual Firebase browser/native receipt has not been established |
| Quiz/challenges | Complete credited-photo practice, server grading/XP/streak, weekly progress from reported records | #28 automated/scoped browser checks; learning tools do not verify field identification/visits/photo quality |
| Settings | Profile/location privacy, conservation preference and alert preferences persist; authenticated password change, actual ABA guidance link and package-version About are delivered in #33/Entry40 | Conservative coordinate protection applies to all species; no verified species sensitivity catalogue is claimed |
| Android | Java/WebView project, trusted-server policy, native document picker/location/back/insets, debug/unsigned-release assembly | #31 installable preview delivered. Five native policy tests, lint0errors1warning and scoped API35 emulator flows passed. Granted GPS timed out; physical Oppo and HTTPS release acceptance pending |

| Destination links/history/sharing | Canonical source-ID URLs, login/refresh restoration and browser Back/Forward; privacy-aware native/browser sharing | #34 scoped browser and fresh-debug-emulator chooser/cancel passed; browser-share/physical/release/OS-launch limits explicit |
| Backup/restore | Offline SQLite/media snapshot, checksum verification and actual-app restore rehearsal | Local Entry42 with124 tests/type/build; no live/off-host/production recovery claim |

## Closed engineering controls

- Journal editing/confirmed action feedback and comment-boundary disclosure: #32/564ce92 with exact-head/main CI and scoped browser/mobile checks.
- Authenticated password changes, real guidelines and version information: #33/bf3910a with exact-head/main CI,124-current-suite coverage and scoped browser/API checks. Interactive credential entry remains manual.
- Source-ID links/history/canonical browser/native sharing: #34/328582f with exact-head/main CI, scoped browser/privacy/retry checks and fresh-debug-emulator chooser/cancel. Desktop-browser share completion and external OS app-link launch remain unverified.

## Remaining finite engineering/control queue

1. **Native push source integration:** Native adapter/session binding, permission/opt-in/disable, token-refresh handling and generic notification processing are implemented locally in Entry43 with132 web tests/type/build and preceding native-policy/build checks. Final native/emulator QA and focused delivery remain pending. Source work is distinct from unavailable project/app configuration and actual device/provider receipt. No project/account/paid service is created automatically.
2. **Integrated release checks:** offline backup/verify, actual-app synthetic restore and production loopback-proxy trust are implemented locally in Entry42 with124 tests/type/build; independent integrated rehearsal passed26 October: discovery/record/privacy/feed/second-account sighting/comment/message persistence, with prior quiz/native evidence reused. PR #35 merged atbec99cb after exact-head/main web/Android checks passed. Complete remaining secret/dependency/build review and checks affected by later changes. Actual production uptime/off-host backup and physical/provider checks require their own evidence.

## Unavailable evidence / external or manual inputs

- Legitimate regional eBird historical export with checklist denominators and provenance, reliable measured difficulty and historical environmental context. Raw sightings, Commons timestamps or forecasts must not be substituted as proven seasonal activity/optimal settings.
- Firebase project and appropriate web/Android app configuration, server credential outside Git and actual notification receipt. The user confirmed no project exists. Social events currently remain in-app; optional push queues cover sighting/forecast sources.
- A trusted production backend/HTTPS endpoint, signing/distribution decisions, production uptime/backups and physical-device checks. A debug emulator is not a physical phone or release deployment.
- Operator-current access/entrance information, exact final-design approval, native date/time widget, source/maps external-app handoff and full physical keyboard/orientation/text-scale/permissions flows.
- **Forgot password:** the visible login control explicitly says no reset email was sent. A secure email recovery flow and real delivery configuration are absent. This must be recorded as incomplete, never as successful email delivery.
- **Recorded calls:** live external species do not pretend to play a recording. Exact-species licensed audio is not connected; sample-only simulated code must not count as live functionality. Its inclusion in final acceptance requires requirement/design reconciliation or real sourced implementation.

## Acceptance rule

A merged slice is a delivery record, not proof every related requirement is complete. For each remaining criterion record source evidence, automated checks, browser/emulator evidence, external/manual gaps and exact commit separately. Continue independent engineering when one provider/manual input is unavailable. Keep credentials, private recovery notes, databases, builds and QA fixtures out of Git.
