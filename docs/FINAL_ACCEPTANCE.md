# Final acceptance — requirements and remaining controls

Updated 26 October 2026. This is a shared implementation/verification checklist for the team. It is not a claim that the application is fully complete. The living specification and supplied designs remain authoritative. It was reread on 26 October; its textual screen accounting does not mention password recovery or audio, but those visible controls are tracked below rather than silently called functional.

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
| Android | Java/WebView project, trusted-server policy, native document picker/location/back/insets, debug/unsigned-release assembly | #31 installable preview delivered. Latest #36 validation: nine native policy tests, lint0errors2warnings, debug/unsigned-release builds and scoped unconfigured API35 emulator flows passed. Granted GPS timed out; physical Oppo and HTTPS release acceptance pending |

| Destination links/history/sharing | Canonical source-ID URLs, login/refresh restoration and browser Back/Forward; privacy-aware native/browser sharing | #34 scoped browser and fresh-debug-emulator chooser/cancel passed; browser-share/physical/release/OS-launch limits explicit |
| Backup/restore | Offline SQLite/media snapshot, checksum verification and actual-app restore rehearsal | Local Entry42 with124 tests/type/build; no live/off-host/production recovery claim |

## Closed engineering controls

- Journal editing/confirmed action feedback and comment-boundary disclosure: #32/564ce92 with exact-head/main CI and scoped browser/mobile checks.
- Authenticated password changes, real guidelines and version information: #33/bf3910a with exact-head/main CI,124-current-suite coverage and scoped browser/API checks. Interactive credential entry remains manual.
- Source-ID links/history/canonical browser/native sharing: #34/328582f with exact-head/main CI, scoped browser/privacy/retry checks and fresh-debug-emulator chooser/cancel. Desktop-browser share completion and external OS app-link launch remain unverified.

## Engineering delivery and evidence

1. **Native push source integration:** delivered in PR #36/137bc5a with final133 web tests/type/build, nine native policy tests/lint0errors2warnings/both APK builds and targeted unconfigured-emulator QA. Four exact-head checks and merged-main web/Android checks passed. Configuration and actual provider/device receipt remain unavailable; no project/account/paid service was created.
2. **Integrated release checks:** backup/verify, actual-app synthetic restore and loopback-proxy trust delivered #35/bec99cb, with scoped independent integrated rehearsal. Dependency remediation delivered #36/137bc5a: zero full pnpm audit findings, no peer conflicts, frozen install and133 tests/type/build pass. This is JavaScript dependency evidence, not a Maven vulnerability scan or penetration test. Production uptime/off-host backup and physical/provider acceptance remain separate.
3. **Email recovery:** optional source is implemented in Entry 46;148 tests/type/build and frozen install/full-audit checks pass. Scoped browser verification, including the signed-in fragment regression fix, passed; delivered #38/4cc3507 after four exact-head d8009e6 checks and merged-main web/Android checks passed; actual email/provider/device acceptance is separate.
4. **Recorded calls:** exact-species Wikidata P51/Commons licensed audio service and real controls implemented in Entry45. 139 automated tests/type/build and scoped independent real-audio browser acceptance passed; PR #37/e7abb0f delivered after four exact-head and merged-main web/Android checks passed. No-match, unsupported codec and missing evidence are explicit; true page-hide/physical codec checks remain manual.

## Unavailable evidence / external or manual inputs

- Legitimate regional eBird historical export with checklist denominators and provenance, reliable measured difficulty and historical environmental context. Raw sightings, Commons timestamps or forecasts must not be substituted as proven seasonal activity/optimal settings.
- Firebase project and appropriate web/Android app configuration, server credential outside Git and actual notification receipt. The user confirmed no project exists. Social events currently remain in-app; optional push queues cover sighting/forecast sources.
- A trusted production backend/HTTPS endpoint, signing/distribution decisions, production uptime/backups and physical-device checks. A debug emulator is not a physical phone or release deployment.
- Operator-current access/entrance information, exact final-design approval, native date/time widget, source/maps external-app handoff and full physical keyboard/orientation/text-scale/permissions flows.
- **Forgot password:** optional hashed-link recovery is implemented in Entry 46 with 148 web tests/type/build and scoped browser acceptance; delivered #38/4cc3507 with exact-head/main CI. SMTP remains unconfigured, so the app explicitly reports no email was sent. Actual TLS provider acceptance, mailbox receipt and interactive new-password entry remain unverified.
- **Recorded calls:** source integration is implemented in Entry45; coverage depends on exact-species P51 claims and accepted Commons metadata. No supported recording is reported honestly; browser/physical/codec acceptance is tracked separately.

## Acceptance rule

A merged slice is a delivery record, not proof every related requirement is complete. For each remaining criterion record source evidence, automated checks, browser/emulator evidence, external/manual gaps and exact commit separately. Continue independent engineering when one provider/manual input is unavailable. Keep credentials, private recovery notes, databases, builds and QA fixtures out of Git.

## Genuine HTTPS preview and release boundary

Entry 47 closes the previously interrupted public-tunnel logout check: real HTTPS login, refresh, live discovery/species/photo/EXIF/source information, logout/fresh-tab signed-out state,401 and second login/final logout passed 26 October with isolated synthetic storage. No manual origin/host setting was added. The owned preview is stopped; no lasting availability guarantee is implied.

No confirmed defect remains in the completed recording/recovery/tunnel checks. This does not certify all requirements: historical seasonal denominators, measured difficulty and comparable historical conditions remain unsupported; access coverage is partial. Actual mail/push receipt, physical design/device/GPS/share/codec flows, signed HTTPS release, production backup operation/capacity and24/7 uptime require external/manual evidence. Local fault/restore tests do not prove zero possible data loss. Images are bounded processed JPEG derivatives; lossless original archival is not provided. The modular Express/SQLite implementation deliberately preserves the authorized simple architecture rather than implementing the estimation text's cloud/microservice terminology.
