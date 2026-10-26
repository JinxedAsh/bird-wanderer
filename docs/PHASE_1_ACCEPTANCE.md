# Phase 1 acceptance and continuation checklist

Requirements re-read 23 October 2026; live specification still modified 5 October. Implementation/browser evidence below is from 13 October unless explicitly dated otherwise. This file tracks Phase 1; the user's 23 October full-development instruction now covers all phases and Android delivery in PROJECT_COMPLETION_PLAN.md.

## Historical starting checklist

| Criterion | Starting status | Acceptance evidence needed |
| --- | --- | --- |
| Species/name/location discovery and maps | Implemented | Fresh browser success/empty/error checks |
| Identification, habitat and behaviour | Implemented | Correct source identity, missing-section/error states |
| Regional seasonal activity | Missing imported evidence | Investigate official histogram download; preserve scope/denominator/date provenance or record exact access blocker |
| Local time planning | Partial: forecasts/daylight heuristics | Concrete dated daylight windows with timezone; distinguish light from bird-activity optimum |
| Justified difficulty | Missing measured rating | Evidence-backed challenge factors where supported; no fabricated ordinal rating |
| Multiple reference settings | Missing: one photo | Bounded exact-species references, individual attribution/EXIF, per-field samples and transparent comparison |
| Relevant environmental context | Partial: separate weather | Integrate forecast context into planning; never infer historical weather/location from missing EXIF |
| Hotspot logistics | Partial: two venues | Investigate reference-design venues; per-fact official sources, expiry, unknown permissions/entrances explicit |
| Responsive layout and failures | Prior scoped pass | Fresh 320/390 browser checks, meaningful fixture failures and regressions |
| Personal saves/auth | Implemented | Preserve per-account persistence and invalid-session behavior |
| Physical-phone/GPS/provider-outage/tunnel acceptance | Awaiting manual verification | Actual evidence; simulations must be labelled |

Implementation order: investigate seasonal-source access and site coverage; extend existing photo evidence to multiple references; add transparent photography challenge/context and dated light windows inside existing disclosures; complete supported access facts; browser regression and failure checks; final documentation, CI and merge. Independent tasks continue when evidence is blocked.

Baseline: main d00be49, 80 tests/type/build passed 13 October. Unrelated deleted Start-Dev.ps1 and untracked Test.ps1 are preserved. No new dependency, architecture or later-phase feature is intended.

## Verified delivery status, 13 October

| Criterion | Latest status and evidence |
| --- | --- |
| Species discovery/maps/details/saves | Implemented; existing flows passed fresh browser checks. Final 320px family search returned 18 Rollers (saved-only Indian Roller); Yamuna matched a loaded Pied Avocet report and saved-only correctly emptied results; nonsense showed No wanderings found. No overflow/console errors. |
| Multiple reference comparisons | Implemented: up to 3 exact P18/depicts files, credits/EXIF, individual sample denominators and readable ranges; live Roller 3/2, Kingfisher 3/3, Cassowary 2/1. Empty/single/provider failure have fixture checks only. |
| Local timing/weather preparation | Implemented dated timezone-aware approximate light windows and explicit daylight/rain/wind preparation candidates. No bird-activity or optimal-weather claim. |
| Seasonal activity | Partial: official Okhla narratives for Pintail/Gadwall plus Yamuna site winter context. Numerical weekly frequency blocked by Cornell authentication/export availability; normal browser confirmed sign-in required. |
| Measured difficulty | Unsupported: connected sources lack a defensible measured rating. Unrated links to motion/light/gear preparation; no fabricated score. |
| Historical environmental matching | Unsupported: reference GPS, reliable timezone, historical conditions, distance and sensor/crop are not established. Future forecasts and photo ranges are kept separate. |
| Access/logistics | Partial verified coverage: 4 venues, 8 eBird records (Lodhi 1, Sunder 2, Yamuna 2, Okhla 3). Published conflicts/historical tariffs/unknown permission and gates are explicit; broader/current operator confirmation remains manual. |
| Region coverage | Implemented Delhi + adjacent Gautam Buddha Nagar runtime; exact scope labels/dedup, chart primary scope preserved. Okhla search/pins/reports/weather/access passed. |
| Responsive/error handling | 320/390px browser checks passed for implemented changes; expired-session reset observed. Final 89 automated tests/type/build passed. Genuine provider outage not tested. |
| Latest designs | Six core image hashes from current live document equal repository references. Exact user visual approval remains pending. |
| Public tunnel | Actual HTTPS page/login/refresh/references/manual-location weather passed; DNS failure blocked final fresh-tab logout confirmation. No uptime/device-GPS claim. |
| Physical phone | Previous user-reported opening/login only. Fresh touch/orientation/text scale/permissions/network acceptance still needed. |

Full Phase 1 is **not certified complete** against all detailed requirements. Core search/detail/maps/external-data logistics are implemented, but the blocked evidence and manual criteria above are not silently waived. No Phases 2–4 or APK work had been done in that13October increment; later full-cycle delivery is recorded separately.

## Continuation and exact dependencies

The most useful next input is a legitimately downloaded eBird histogram export for the configured region/date range, preserving its headers, checklist denominators and attribution/data-use terms. Do not send account passwords; export access requires the user to sign in normally. Inspect the actual format before adding an importer and test weighted aggregation/zero-vs-missing semantics. Recent API reports must never substitute for denominators.

Measured difficulty and verified environment matching require new trustworthy evidence or explicit requirement reconciliation. Investigate published evidence when available; do not convert general advice into an ordinal rating or attach a future forecast to historical EXIF. Remaining manual checks: full Oppo flow, genuine weak-network/provider failure, tunnel logout/recovery, operator-currentness/entrance confirmation and final design approval. Android was deferred for that Phase 1 increment; the full-cycle authorization on23 October supersedes it. Android source/build/device work is now in progress under PROJECT_COMPLETION_PLAN.md.

Delivered: [PR #22](https://github.com/JinxedAsh/bird-wanderer/pull/22) is merged at a9902396a9f932b9192c22d15765c232ac156336, confirmed against GitHub on 23 October. Merged-commit CI passed; the merge occurred on 13 October IST (12 October UTC). No new test/browser result is implied by this status refresh. User's Start-Dev.ps1 deletion/Test.ps1 rename remains untouched/unpublished. Read Git status before resumed work; do not duplicate delivery or use stale LAN/tunnel addresses.

## Finite Phase 1 closure queue, 23 October

1. Correct stale delivery/current-state documentation (in progress; no new feature claim).
2. Exercise empty/single/missing/provider-error/retry through a controlled browser fixture and fix verified defects. Label fixtures separately from real outages.
3. Fresh managed tunnel: login, refresh, logout verification and reconnect/recovery. Do not reuse old URLs or claim physical-device acceptance.
4. One bounded check of legitimate seasonal/difficulty/historical-environment alternatives; record minimum missing input once. Do not repeat speculative searches or guess import formats.
5. Deliver focused fixes with exact-head CI; retain irreducible evidence/manual gaps. Continue the full-project queue independently rather than treating Phase 1 data access as a blocker for all development.

## Files in this increment (25)

| Group | Files |
| --- | --- |
| Documentation | README.md; docs/DEVELOPMENT_RECORD.md; docs/PHASE_1_ACCEPTANCE.md (new); docs/PHASE_1_EVIDENCE_WALKTHROUGH.md (new); docs/PHASE_1_PRESENTATION.md; frontend/README.md |
| Configuration | frontend/.env.example |
| Backend | frontend/server/access.mjs; discovery.mjs; index.mjs; photos.mjs; seasonal.mjs (new) |
| Tests | frontend/server/access.test.mjs; discovery.test.mjs; frontend.test.mjs; photos.test.mjs |
| Shared frontend | frontend/src/App.tsx; frontend/src/types.ts; frontend/src/lib/discovery.ts |
| Components | frontend/src/components/GlobalSearchScreen.tsx; HotspotAccess.tsx; HotspotWeatherPanel.tsx; PhotoPlanning.tsx; ReferenceComparisons.tsx (new); SpeciesDetailScreen.tsx |

Private notes, .env credentials, databases and generated files are excluded. The final configured-key scan covered 126 shared/build files and found zero leaks. Last source verification: 89 tests, TypeScript and build passed. Browser-only and fixture-only evidence remain distinguished above.

## Current checkpoint —26 October 2026

The detailed rows above retain their original dates rather than silently turning old evidence into a new test run. Current project-wide source/delivery and exact verification limits are in [Final acceptance](FINAL_ACCEPTANCE.md) and Development Record Entries42–46.

- Existing external discovery, exact-species references/EXIF, source information, dated local forecast/daylight planning and reviewed access remain implemented. No annual frequency, measured difficulty or historical-condition evidence has been manufactured.
- Sourced species audio is delivered in PR #37/e7abb0f; real Commons decoding, credits, retry/no-match,320/390px and navigation pause passed. True page-hide and physical-phone codec behavior remain manual.
- Optional hashed-link email recovery is implemented with 148 web tests/type/build and scoped browser acceptance, including the already-signed-in same-document link regression. Real SMTP/mailbox receipt and interactive new-password submission remain manual/unconfigured.
- Other phases and Android preview are now implemented under the later full-cycle authorization; they do not certify the unresolved scientific/access/physical/provider requirements of Phase 1.

**Phase 1 is still not certified complete against every detailed requirement.** Minimum unresolved inputs are legitimate historical exports/denominators, reliable difficulty/historical-condition evidence, operator-current access confirmation, final design/physical-device acceptance. The genuine-tunnel login/refresh/logout/fresh-tab 401 criterion passed 26 October in Entry 47; permanent hosting and provider outage are separate. Use labelled missing evidence in the demo, not sample replacements.
