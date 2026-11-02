# Design comparison and acceptance

Updated 3 November 2026. This is a presentation-only increment on `ui-design-fidelity`, based on main `b861d59`. It preserves the existing React/Express/SQLite architecture and all delivered features. The reference mapping is in [design-reference/README.md](design-reference/README.md).

## Method and evidence

All 16 original PNGs were opened and visually compared with 15 running screen types. Baseline production asset: `index-BrIlWYvM.js`. Each baseline was captured at 390 CSS pixels wide with the reference image's proportional height; actual JPEG dimensions were checked. Settings was captured with its privacy sheet open; upload has top and continuation views. Screenshots with an accidental default crop were corrected before comparison.

Baseline and side-by-side images are private QA artifacts, outside Git. Repository documentation records findings rather than publishing synthetic accounts or personal screenshots. Source and automated checks alone do not establish visual acceptance.

## Screen checklist

| Screen | Reference | Implemented presentation change | Final browser status |
| --- | --- | --- | --- |
| Authentication | image5 | Earlier brand/form placement; simpler form radius/shadow | 390/320 screenshots captured and reviewed; exact parity open |
| Explore | image13 | Compact weather/source details; first-name greeting; compact photo credits; real recent report card | 390/320 screenshots captured and reviewed; exact parity open |
| Species detail | image3 | Hero credits/EXIF in info; title before technical detail; compact facts; expandable guide with working section jumps | 390/320 screenshots captured and reviewed; exact parity open |
| Community | image1 | Refresh moved beside filter pills, restoring search width | 390/320 screenshots captured and reviewed; exact parity open |
| Upload | image16, image4 | Photo, identification, field notes, metadata, conditions, privacy, visibility, submit order; editable species/location panels; compact EXIF/weather cells | 390/320 screenshots captured and reviewed; exact parity open |
| Hotspots | image8 | Source and map explanation accessible without expanded default paragraphs | 390/320 screenshots captured and reviewed; exact parity open |
| Hotspot detail | image10 | Hero first; report information/alerts expandable; report list independently scrollable; accordions initially closed | 390/320 screenshots captured and reviewed; exact parity open |
| Journal | image12 | Short displayed entry ID; full ID remains available in title | 390/320 screenshots captured and reviewed; exact parity open |
| Life List | image11 | Uses the owner's actual logged image when available instead of catalogue placeholder | 390/320 screenshots captured and reviewed; exact parity open |
| Quiz | image7 | Source/licence disclosure on photograph instead of extra row | 390/320 screenshots captured and reviewed; exact parity open |
| Messages | image6 | Compact timestamp with full value in title; footer radius/padding | 390/320 screenshots captured and reviewed; exact parity open |
| Profile | image18 | Rounded-square avatar; Field Chats retained as utility icon instead of extra full row | 390/320 screenshots captured and reviewed; exact parity open |
| Search | image22 | Compact credits; advanced options and history help in info; horizontally scrollable recent chips | 390/320 screenshots captured and reviewed; exact parity open |
| Notifications | image17 | Inbox heading first; alert settings/subscriptions collapsed; errors remain visible | 390/320 screenshots captured and reviewed; exact parity open |
| Settings | image21 | Verification inside Email disclosure; existing privacy controls retained | 390/320 screenshots captured and reviewed; exact parity open |

## Deliberate differences and unclosed criteria

- Real species, photos, accounts, counts, dates and observations differ from the examples. Missing EXIF, measured difficulty, seasonality, opening hours and best times remain unknown. No sample photograph, statistic, badge or entrance is presented as verified real evidence.
- Page headings retain their meaningful names (for example Global Search and Field Chats) rather than copying the reference's repeated Species Detail title onto unrelated pages.
- Private remains the default upload visibility. Extra delivered actions (Followers filter, alerts, verification, refresh, Android connection, manual location and EXIF reset) remain accessible even when absent from the original drawings.
- Maps retain all filtered real hotspots, live tiles and required attribution; marker density differs from a static drawing. A bounded report region retains every returned report.
- Physical Oppo, native keyboard, text scaling, genuine provider outages and current public tunnel are not accepted by desktop viewport simulation.
- Pixel-perfect parity is NOT established. All 15 screen types have independent 390/320 captures with validated dimensions. The scoped flows and exceptions below are recorded separately. Exact design sign-off remains open; the implementation is closer, not identical.

## Beginner explanation and Viva Notes

The change is primarily JSX and CSS: it changes how existing information is arranged, not how the database or APIs work. HTML `details` and `summary` provide expandable information with native keyboard behaviour. `InformationDisclosure` gives these controls a consistent information icon and a bounded, scrollable panel. Attribution, provenance and unknown-data explanations are retained inside the panels.

The upload component keeps its existing state and callbacks. Its inputs remain mounted inside editable panels, so closing a panel does not intentionally discard a draft. EXIF parsing, manual-entry precedence, historical-weather cancellation, publish validation and private-location handling are unchanged. Section navigation opens every enclosing disclosure before scrolling/focusing its target.

Likely viva questions:

1. **Why collapse source information?** The design prioritizes the bird or photograph; supporting evidence is still available beside it without occupying the default page.
2. **Why native details instead of a new UI framework?** It provides a small, understandable expandable control using the browser's existing semantics.
3. **Did this change authentication or storage?** No. Existing endpoints, sessions and SQLite tables are retained.
4. **Why not fill the design's missing values?** Example values are not evidence; unsupported facts must remain unavailable.
5. **How is regression risk controlled?** Existing tests, type checking, production builds and real browser flows complement reference screenshots. Desktop checks do not prove physical-phone acceptance.

## Verification checkpoint

- Final full suite: 171/171 passed; TypeScript and production build passed.
- Latest production asset: `index-BKdAOXPE.js` (486.93 kB main bundle). PR [#45](https://github.com/JinxedAsh/bird-wanderer/pull/45) tracks delivery; merge requires passing checks for its exact latest commit.
- No backend/API/schema/environment/dependency changes. Unrelated local documentation and domain/test scripts are preserved outside this increment's commits.


## Scoped browser outcomes (3 November)

Independent Test chat captured all 15 screen types / 16 reference views at 390 and 320 CSS pixels, with dimension validation and paired original/final review. These were real browser screenshots of the isolated app, real discovery data and disposable account records. Early captures intentionally record intermediate assets; changed screens were recaptured after fixes. They are not claimed as one atomic end-to-end run on the final bundle.

Observed passes include Plan a Shot opening its guide; habitat and recorded-call controls; Community refresh; Profile navigation; species/hotspot subscription toggles (restored afterwards); keyboard scrolling of all hotspot reports; source/photo-credit access; and a private custom-location observation saved after a missing-date validation failure, preserving its draft and persisted Journal result. The 320px offscreen source panel and long-note overflow were reproduced, fixed and independently retested. Source-owner checks additionally confirmed final notification thresholds and 320px panel bounds.

The custom-location validation recovery is NOT the blocked-network POST retry test. Fresh browser network blocking, genuine provider outages, every authentication/recovery flow, new-password entry, native keyboard/orientation/text scaling and physical Oppo acceptance remain unverified in this increment. Existing automated tests cover the delivered API/auth/data behaviour; earlier dated browser evidence remains earlier evidence.

## Remaining visual work

The design's density and sections are restored, but exact one-to-one approval remains open. Remaining visible differences include control radii/weights/spacing, additional accessible information icons, long real titles/badges, missing real hotspot/gallery imagery, map marker density and different question/record states. Meaningful page headings and privacy/verification wording intentionally stay truthful. Do not mark these as pixel-perfect or fill gaps with fake data. Continue by comparing the final paired screenshots per screen, adjusting only verified presentation differences, and repeating affected flow checks.

## Files changed

- App shell and shared presentation: `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/components/Header.tsx`, `InformationDisclosure.tsx`, `SpeciesPhoto.tsx`.
- Screens: `AuthScreen.tsx`, `ExploreScreen.tsx`, `SpeciesDetailScreen.tsx`, `CommunityScreen.tsx`, `LogObservationScreen.tsx`, `ObservationConditionsPanel.tsx`, `HotspotsScreen.tsx`, `HotspotDetailScreen.tsx`, `JournalScreen.tsx`, `BirdQuizScreen.tsx`, `FieldChatScreen.tsx`, `ProfileScreen.tsx`, `GlobalSearchScreen.tsx`, `NotificationsScreen.tsx`, `SettingsScreen.tsx`. Life List presentation receives an owner's image through App; its own component is unchanged.
- Tests/documentation: `frontend/server/frontend.test.mjs`, `README.md`, `docs/DEVELOPMENT_RECORD.md`, `docs/FINAL_ACCEPTANCE.md`, this checklist.

## Demo route

Start the usual application with `pnpm dev` from frontend; open its existing local/LAN/HTTPS address and sign in with your own demo account. Explore shows main discovery content first. Use an information icon to show provenance, open a species and Plan a Shot, follow reported hotspots to weather/access/maps, then demonstrate one private upload and its Journal record. Missing source evidence stays unavailable. Do not use the isolated QA port or synthetic accounts as the normal demo deployment.

Final markup-only correction: the quiz photo and its figcaption now share a semantic figure wrapper. Source-owner latest-build browser check confirmed the credit disclosure opens, its parent is FIGURE and page width fits390. Independent all-screen screenshots remain dated mixed-build evidence.


## Active geometry pass after PR #45 (3 November)

Base main `63fe074`; branch `ui-reference-geometry`. Owned source changes currently: AuthScreen, SettingsScreen, BirdQuizScreen, CommunityScreen, FieldChatScreen, GlobalSearchScreen, HotspotsScreen, HotspotDetailScreen, JournalScreen, LifeListScreen, NotificationsScreen, ProfileScreen, SpeciesDetailScreen and index.css. No backend/logic changes. The previous isolated database is reused by `%TEMP%/bird-geometry-preview.mjs` on4384; normal demo services remain untouched. Latest build `index-CJfN-vuz.js` (source frozen for independent final comparison).

Measured defect: all declared 14/18/20/etc icon sizes previously computed24px. Both the local rule and the external Google font sheet supplied unlayered defaults. The local icon definition is now in the base layer, with an unlayered font-size:revert-layer correction to restore component utility sizes. Actual browser verification now shows14px eco/nature and18px email/key/visibility/arrow icons.

Authentication work adjusts badge height, heading/tagline/body sizes, casing, form/tab/input/button radii and weights to image5. Settings work removes background blur and selected-option outlines and refines sheet/icon/option radii to image21. Type/build pass. The 171-test suite passed after the main geometry edits; final rerun after the last Auth/species/hotspot adjustments and independent latest-asset screenshot/interaction acceptance remain PENDING. Do not claim these changes accepted or merged.

Authentication text-row evidence at390: baseline heading157/tagline197/paragraph234 versus reference150/186/218. A targeted gap/line-height correction follows these measurements. Other components now match reference-specific 4/8/12px corners, larger list/contact names, lighter weights and compact report rows. No interaction handlers were edited.

Next actions: compare revised Auth/Settings screenshots against normalized references; finish measurable spacing/type/radius differences screen-by-screen, recapture all affected screens after the icon cascade fix, test their retained interactions, document measured remaining deviations, then focused PR/exact-head/main checks. Preserve the unrelated local Development Record/Final Acceptance/native push/domain/test files. No files are to be reset/stashed/deleted to simplify checkout.
