# Phase 1 acceptance and continuation checklist

Reviewed 13 October 2026 against the live specification (Drive modified 5 October): search species, detailed pages, hotspot maps and externally derived photography logistics. Phase 2 uploads/community, alerts, gamification and APK packaging are outside this increment.

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

Full Phase 1 is **not certified complete** against all detailed requirements. Core search/detail/maps/external-data logistics are implemented, but the blocked evidence and manual criteria above are not silently waived. No Phase 2–4 or APK work was done.

## Continuation and exact dependencies

The most useful next input is a legitimately downloaded eBird histogram export for the configured region/date range, preserving its headers, checklist denominators and attribution/data-use terms. Do not send account passwords; export access requires the user to sign in normally. Inspect the actual format before adding an importer and test weighted aggregation/zero-vs-missing semantics. Recent API reports must never substitute for denominators.

Measured difficulty and verified environment matching require new trustworthy evidence or explicit requirement reconciliation. Investigate published evidence when available; do not convert general advice into an ordinal rating or attach a future forecast to historical EXIF. Remaining manual checks: full Oppo flow, genuine weak-network/provider failure, tunnel logout/recovery, operator-currentness/entrance confirmation and final design approval. Android stays deferred.

Git branch: phase1-evidence-planning. Delivery: [PR #22](https://github.com/JinxedAsh/bird-wanderer/pull/22); browser checks passed and merge is gated on exact final-head CI. The PR provides authoritative merge/commit status. User's Start-Dev.ps1 deletion/Test.ps1 rename stays untouched/unpublished. Read Git status and this checklist before resumed work; do not duplicate delivered work or use stale LAN/tunnel addresses.

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

Scheduled follow-up: Resume Bird Wanderer Phase 1, every two hours. It resumes unfinished autonomous work after limits permit, and stays quiet while only unchanged evidence/manual blockers remain. Scheduler availability and the exact usage-reset moment are not guaranteed.
