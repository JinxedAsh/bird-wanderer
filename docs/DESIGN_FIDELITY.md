# Design comparison and acceptance

Updated 3 November 2026. This is a presentation-only increment on `ui-design-fidelity`, based on main `b861d59`. It preserves the existing React/Express/SQLite architecture and all delivered features. The reference mapping is in [design-reference/README.md](design-reference/README.md).

## Method and evidence

All 16 original PNGs were opened and visually compared with 15 running screen types. Baseline production asset: `index-BrIlWYvM.js`. Each baseline was captured at 390 CSS pixels wide with the reference image's proportional height; actual JPEG dimensions were checked. Settings was captured with its privacy sheet open; upload has top and continuation views. Screenshots with an accidental default crop were corrected before comparison.

Baseline and side-by-side images are private QA artifacts, outside Git. Repository documentation records findings rather than publishing synthetic accounts or personal screenshots. Source and automated checks alone do not establish visual acceptance.

## Screen checklist

| Screen | Reference | Implemented presentation change | Final browser status |
| --- | --- | --- | --- |
| Authentication | image5 | Earlier brand/form placement; simpler form radius/shadow | Pending latest-build comparison |
| Explore | image13 | Compact weather/source details; first-name greeting; compact photo credits; real recent report card | Source-owner screenshot reviewed; independent 320/390 pending |
| Species detail | image3 | Hero credits/EXIF in info; title before technical detail; compact facts; expandable guide with working section jumps | Source-owner screenshot and Plan Shot checked; remaining final QA pending |
| Community | image1 | Refresh moved beside filter pills, restoring search width | Pending latest-build comparison and refresh checks |
| Upload | image16, image4 | Photo, identification, field notes, metadata, conditions, privacy, visibility, submit order; editable species/location panels; compact EXIF/weather cells | Pending manual-edit/upload/weather/post regression |
| Hotspots | image8 | Source and map explanation accessible without expanded default paragraphs | Pending latest-build map/filter check |
| Hotspot detail | image10 | Hero first; report information/alerts expandable; report list independently scrollable; accordions initially closed | Pending report scrolling/access/weather/map checks |
| Journal | image12 | Short displayed entry ID; full ID remains available in title | Pending selection/edit/latest-build comparison |
| Life List | image11 | Uses the owner's actual logged image when available instead of catalogue placeholder | Pending image/filter/drawer check |
| Quiz | image7 | Source/licence disclosure on photograph instead of extra row | Pending question/answer/credit check |
| Messages | image6 | Compact timestamp with full value in title; footer radius/padding | Pending conversation/send check |
| Profile | image18 | Rounded-square avatar; Field Chats retained as utility icon instead of extra full row | Pending actions/edit/gallery check |
| Search | image22 | Compact credits; advanced options and history help in info; horizontally scrollable recent chips | Pending query/filter/history/privacy check |
| Notifications | image17 | Inbox heading first; alert settings/subscriptions collapsed; errors remain visible | Pending tabs/read/settings checks |
| Settings | image21 | Verification inside Email disclosure; existing privacy controls retained | Pending email/privacy/password-sheet checks |

## Deliberate differences and unclosed criteria

- Real species, photos, accounts, counts, dates and observations differ from the examples. Missing EXIF, measured difficulty, seasonality, opening hours and best times remain unknown. No sample photograph, statistic, badge or entrance is presented as verified real evidence.
- Page headings retain their meaningful names (for example Global Search and Field Chats) rather than copying the reference's repeated Species Detail title onto unrelated pages.
- Private remains the default upload visibility. Extra delivered actions (Followers filter, alerts, verification, refresh, Android connection, manual location and EXIF reset) remain accessible even when absent from the original drawings.
- Maps retain all filtered real hotspots, live tiles and required attribution; marker density differs from a static drawing. A bounded report region retains every returned report.
- Physical Oppo, native keyboard, text scaling, genuine provider outages and current public tunnel are not accepted by desktop viewport simulation.
- Pixel-perfect parity is NOT established. Final independent screenshots, disclosure clipping/touch/keyboard checks and functional checks are pending. Exact design sign-off remains open until these are reviewed.

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

- Intermediate full suite: 170/170 passed; TypeScript and production build passed.
- Latest production asset: `index-CMTzcjX1.js`; final full-suite rerun and independent QA are in progress.
- No backend/API/schema/environment/dependency changes. Unrelated local documentation and domain/test scripts are preserved outside this increment's commits.
