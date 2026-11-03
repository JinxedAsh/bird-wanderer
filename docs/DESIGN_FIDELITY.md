# Design comparison and acceptance

Updated 3 November 2026. PR [#45](https://github.com/JinxedAsh/bird-wanderer/pull/45) delivered the initial layout pass at main `63fe074`. PR [#46](https://github.com/JinxedAsh/bird-wanderer/pull/46) is merged at main7968821 after4 exact-head checks and2 passing main workflows. The remaining density work is in progress on `ui-reference-density` (Development Record Entry62). The original mapping is in [design-reference/README.md](design-reference/README.md).

## Scope and evidence

All 16 original PNGs were opened and compared with 15 running screen types. Capture widths are 390 and 320 CSS pixels; reference heights are proportionally normalized. Upload has two reference views. Screenshots and disposable accounts stay outside Git. Real source data, unknown values, privacy defaults and working actions are preserved. This pass adds no backend, API, schema, environment or dependency changes.

Independent QA captured a consistent 32-view matrix on `index-CgVTSSnf.js`, then recaptured changed screens on dated later assets. PR46 final production candidate was `index-Cp5Fm5PR.js`; the current density candidate is `index-CfVareHe.js`. These are mixed-build observations, not one atomic final-build end-to-end acceptance run. Independent latest-asset keyboard checks passed for all3 strips; source-owner narrow-layout/history checks are attributed separately below.

## Current screen checklist

| Screen / reference | Presentation implemented | Evidence and remaining difference |
| --- | --- | --- |
| Authentication / image5 | Measured text placement, 26px title, 18px tagline, 48px inputs, compact corners | Form top312px at390; heading painted row151 versus reference150. Font rasterization differs slightly. |
| Explore / image13 | Compact weather/source information, greeting and credits, real recent report | 390/320 captures reviewed. Real data and available imagery differ from examples. |
| Species / image3 | Compact hero credits; 20px facts; whole-phrase wrapping; expandable guide and section jumps | 390/320 captured; guide/call/habitat controls exercised. Missing measured difficulty, EXIF and gallery evidence remain unavailable. |
| Community / image1 | Reference card corners/type; search width restored;32px filter pills; top132px/first-card184px; refresh retained after filters | Latest keyboard filters/refresh passed independently. Source-owner320/390 bounds passed; camera metadata allocation still needs review at320. |
| Upload / images16,4 | Reference section order, editable metadata, compact conditions;44x24 switch and segmented visibility | Keyboard toggles and all3 visibility modes passed on dated candidate; private restored and manual draft retained. |
| Hotspots / image8 | Full-width map, compact pills/cards; help overlay; attribution retained | Search/filter/map/first-card tops72/128/168/416px at390. Edge-hit filtering, map zoom/popup, info bounds passed. Real marker density differs. |
| Hotspot detail / image10 | Hero first; closed access/report disclosures; compact report rows in192px scroll region | Every returned report retained; keyboard scrolling and source access passed. Operator fees/access facts remain evidence-dependent. |
| Journal / image12 | Compact tiles/corners and short display ID; full ID available | 390/320 captured; saved private observation survived reload. Actual records/counts differ. |
| Life List / image11 | Owner photograph when available; reference name/corner sizing | 390/320 captures and empty state checked. Uses actual logged species/counts. |
| Quiz / image7 | Compact photo/answer/feedback shapes; Check Answer stays visible but disabled after grading | Latest quiz check confirmed disabled action, enabled Next, question2 and unchanged50XP. Real question/answer state differs. |
| Messages / image6 |18px contact names; compact timestamps/search/footer; narrow-input bounds | 390/320 captures and composer flow checked. Actual conversations differ. |
| Profile / image18 | Square avatar, lighter tabs/counts/gallery; collapsed Quick Edit preview | Both edit triggers open existing dialog and regain focus after Escape. At320, keyboard scroll exposes rig fully above preview. Actual profile/rig differs. |
| Search / image22 | Compact result names/credits; advanced help disclosure;28px category pills | Prior search/history flows captured. Latest categories passed independently; owner checked320px history selection/removal/restoration and wrapping. Final independent320 screenshot was invalid, not counted. |
| Notifications / image17 | Compact inbox/cards/icons; settings disclosed;28px filter buttons | Latest keyboard filters passed independently; owner320/390 bounds passed. Working Followers category retained in addition to reference's3 categories. |
| Settings / image21 | Unblurred privacy sheet; reference title/option/button sizes and spacing | Independent390x1256 sheet top780.45/height475.55 versus780/476 target. Save x16,y1184,w358.4,h48. At320x740 Tab/Enter saved unchanged preferences without overflow. |

## Retained behaviour and failure evidence

Independent dated browser checks include Plan a Shot opening its guide; habitat and recordings; Community refresh; Profile navigation; species/hotspot subscriptions restored after testing; keyboard scrolling all hotspot reports; source/licence access; and missing-date validation retaining a private custom-location upload, followed by persistence in Journal. Earlier320px source-panel and long-note overflow defects were reproduced, fixed and retested.

A separate source-owner desktop browser check used a temporary isolated proxy to return503 before the first observation write. Photo, species, site, date, notes and private visibility remained. One retry succeeded; Journal reload and authenticated API read confirmed exactly one private disposable record. The proxy is stopped. This does not establish browser request blocking, genuine provider outage, physical-phone behaviour or recovery after a committed write whose response was lost.

## Deliberate differences and unclosed acceptance

- Real accounts, counts, dates, photographs and records differ from screenshot examples. Unsupported EXIF, difficulty, seasonal statistics, permissions, fees and best times stay unavailable; no fake values or verification badges are added.
- Headings retain meaningful screen names rather than copying the repeated Species Detail label onto unrelated screens.
- Private remains the upload default. Extra delivered controls, including followers, alerts, verification, refresh, manual location and Android connection, remain accessible.
- Live maps keep all filtered hotspots and attribution. Missing external hotspot/gallery photography is not replaced with fabricated evidence.
- Search history now wraps; its16px row gaps preserve separate44px hit areas around28px chips. The reference uses tighter rows, so touch spacing remains an explicit visual difference.
- Physical Oppo, native keyboard/orientation/text scaling, genuine provider outages and the current public tunnel have not been accepted by desktop viewport checks.
- Exact one-to-one visual sign-off is open. Measured targets and retained flows listed above are accepted within their stated evidence; the specific remaining presentation corrections below remain open.

## Verification and delivery checkpoint

Latest candidate `index-Cp5Fm5PR.js`:171/171 tests passed, TypeScript checking passed, production build passed; main bundle488.06kB. PR46 final heade51042c passed all4 checks, merged at7968821, and both main workflows passed. Current density assetCfVareHe passes171 tests/type/build; independent affected-screen review and its own PR delivery are pending.

Independent review accepted latest-strip keyboard activation and dated Settings/Hotspots/Upload/Quiz/Profile flows. Its final files labelled320 for the3 strips were actually390px and are excluded from independent narrow acceptance. Source-owner DOM checks establish320px bounds separately. Native supplemental screenshots have their actual dimensions recorded rather than assuming requested viewport height. The upload continuation comparison was incorrectly scrolled; its screenshot does not prove lower-form parity. Accepted switch/segment interaction measurements remain valid.

Unrelated Development Record, Final Acceptance, native-push documentation, domain scripts and test-case work remain outside these commits. Do not reset or stash them to simplify delivery.

## Beginner explanation and Viva Notes

React still holds the same draft, profile and quiz state and calls the existing handlers. JSX and CSS now arrange it closer to the designs. Profile's two entry points reuse `handleOpenProfile`, which copies current values into the existing editor. Keeping the collapsed trigger mounted lets `useDialogFocus` restore focus after closing. Quiz grading remains unchanged; its already-used action stays visible but disabled to prevent grading twice.

CSS layers decide precedence before selector specificity. The font provider's unlayered24px default overrode intended14/18/20px utilities. Moving local defaults into the base layer and applying `font-size: revert-layer` restores the component sizes. Independent checks confirmed1,083 explicitly sized icons matched their intended size.

Compact pills use a transparent `::before` extension within row padding so visible28/32px controls retain44px hit areas. The extension changes the clickable area without changing the layout. Upload's switch remains a native button with `role="switch"` and `aria-checked`; visibility buttons retain `aria-pressed` and keyboard activation. No new UI framework is needed.

Likely viva questions:

1. **Why did icon sizes ignore the utility classes?** Unlayered provider CSS won over layered utilities; restoring layer precedence fixed the existing declarations.
2. **How can a compact filter remain usable on a phone?** A transparent pseudo-element extends its hit area into reserved padding without making the visible pill taller.
3. **How are edits kept consistent between Profile entry points?** Both call the same initializer and open the same existing editor and save handler.
4. **Why keep unknown data instead of copying example values?** A design example is not evidence; inventing metadata or access claims would mislead users.
5. **Do passing tests prove the design matches?** No. Tests check behaviour and types; reference-width browser captures and measurements check appearance, and physical-phone checks remain separate.

## Demo and continuation

Start the usual application with `pnpm dev` from frontend and use its existing local/LAN/HTTPS address with your own account. Show discovery, source disclosure, species guide, hotspot map/access/weather, then a private upload and its Journal record. The isolated QA port and synthetic fixtures are not the demo deployment.

PR46 is delivered. Entry62 implements the following measured corrections; final affected-screen verification and delivery remain pending. Implemented does not mean independently accepted:

| Screen | Next correction / limit |
| --- | --- |
| Explore | Implemented compact weather/caption/actions. Root390px first-card233.5 and quick-actions601.5 measured; independent320/390 review pending. |
| Species | Implemented responsive inline Unknown badge and guide/title sizes. Root320px one-row title/status and guide verified; independent review pending. |
| Community | Implemented camera/lens wrapping and accessible unavailable exposure labels; final320px review pending. |
| Upload | Implemented18px medium Photo Details/Conditions headings; correctly framed top/lower captures remain required. |
| Hotspots | Card vertical padding reduced2px total, pending final measurement. Real markers retained; static4-pin density is not real-data acceptance. |
| Hotspot detail | Implemented18px medium heading hierarchy; final review pending. |
| Journal | Implemented14px medium card names, lighter Recent photographs and subtle selected border; final review pending. |
| Life List | Reduced intro/list spacing16px; final measurement/filter/drawer check pending. |
| Quiz | Reduced meta/prompt/photo spacing;22px medium prompt. Final image offset and grading/Next check pending. |
| Messages | Actual updatedAt date displayed compactly; full timestamp accessible and privacy statement preserved. Final bounds/composer check pending. |
| Profile | Compacted identity/action/statistic offsets; preview/focus/rig access must be checked after spacing changes. |
| Search / Notifications | Search retained PR46 behavior. Notifications now has inline compact date/full accessible timestamp and unclamped body; final narrow review pending. |
| Settings | Sheet matches measured target; review behind-sheet account/privacy row density. |

Authentication has only raster-sensitive1–3px text residuals; avoid arbitrary per-glyph positioning. Missing source images/maps/statistics, real names/counts and extra delivered controls remain the explicit data/state boundaries above. Physical acceptance and exact visual sign-off remain open.
