# Phase 1 presentation and acceptance

Checkpoint: Tuesday, 6 October 2026. Updated 4 October 2026. Use this as a presentation script and a repeatable acceptance checklist, alongside the chronological Development Record.

## What this checkpoint demonstrates

Real accounts, external eBird search/species/hotspots, maps and coordinate directions, Commons photos and camera EXIF, credited species information, forecasts, optional nearby discovery, persistent account saves/search history and reviewed access for two venues. The existing guide explains its photo examples and exposure calculations.

This is not a claim that every Phase 1 specification item is complete. Imported seasonal statistics, measured species difficulty, multi-photo/similar-environment recommendations, wider access coverage and full device/design/failure acceptance remain unfinished. Historical seasonal charts open externally. Exact entrances and current operator arrangements are not established by the map.

Community, journal, uploads, alerts, messaging and quiz screens contain later-phase prototypes. Avoid presenting sample counts, privacy switches or simulated controls as persistent real services. The final Android APK remains mandatory; packaging is deferred for this checkpoint.

## Before presenting

1. Start from the latest passing main commit. Start the existing development server with Start-Dev.ps1 or pnpm dev from frontend. Keep the computer powered and connected to the internet.
2. Confirm the server-side eBird key is configured privately. Never show .env, personal records or passwords on screen. Use a disposable presentation account and confirm login beforehand.
3. Open the app and allow external photographs to finish loading. Check one species, Lodhi Gardens weather and maps immediately before the demonstration; independent providers can fail separately.
4. For a phone, put it on the same Wi-Fi, use the computer's current Wi-Fi IP on port 3000, and verify that exact origin is in ADDITIONAL_APP_ORIGINS. FRONTEND_HOST must be 0.0.0.0. Existing API loopback binding can remain unchanged because Vite proxies requests. Restart only if configuration changed. Consult frontend/README.md for setup.
5. Keep this file and the Development Record available for questions. A screenshots-only fallback must be described as recorded evidence, not a live successful provider request.

## A seven-minute demo flow

| Step | Show | Explain |
| --- | --- | --- |
| 1. Account | Local logo, sign in, current user identity | Server sessions recognize the account; credentials are hashed, not stored as plaintext. |
| 2. Explore | Region, optional manual location and forecast | Nearby means 50 km within the loaded region; distances are straight-line estimates. |
| 3. Search | Indian Roller or Common Kingfisher; an unmatched query | Search uses eBird IDs. Empty matches are an honest state; recent searches persist after submission/opening. |
| 4. Species | Photo, creator/licence, same-file EXIF, information disclosure | References identify the species; EXIF describes one photograph. Missing data is unavailable. |
| 5. Plan | Flight/perched advice, shutter comparison, seasonal reference | At unchanged light/aperture a faster shutter requires a corresponding ISO increase. This is not a weather-matched optimal preset. |
| 6. Hotspot | Reported location, map, daylight/weather, access disclosure and directions | Forecasts and admission evidence have separate sources; the eBird point is not a verified gate. |
| 7. Persistence | Save a bird/hotspot, refresh, inspect Saved and search history; logout | Personal records persist per account. Refresh returns to the app's initial view rather than a deep-linked detail. |

Use a species with current provider evidence rather than promising a fixed report count. If a lookup fails, show its own retry and explain the limitation; don't replace it with invented values. The app Back button restores navigation. Browser/entity URLs and Android back integration remain separate work.

## Design comparison scope

Compare the running interface against docs/design-reference originals: image5(auth), image13(Explore), image3(species), image8(hotspots), image10(hotspot detail), image22(Search). The images were extracted on 3 October. Compare layout order, hierarchy, cards, colours, navigation and responsive readability; their different image widths and sample data do not establish an exact pixel comparison at 390px.

Necessary data differences: current account names/provider records replace mock names/counts; unsupported timings/difficulty/fees remain unverified; actual photographs carry credits and EXIF; source-aware planning uses progressive disclosures; Leaflet/OSM replaces a static illustrated map. This acceptance pass does not assert pixel-perfect fidelity or approve the final design on the user's behalf. Later-phase screens are outside this pass.

Browser findings and fixes in this increment:

- Authentication reuses the local logo, with the rounded-square background from the reference. The unsupported weekly total is replaced with descriptive text in the same badge.
- Labels are associated with inputs; mode/password-visibility targets are 44px high.
- Primary header/back/profile/bookmark/location and Explore controls have larger touch targets. The Explore report-scope label sits below its heading so All sights remains readable. The logo uses a native button with its existing image size.
- Search clear/filter/history controls gain 44px targets, retaining the existing bar/cards. Inputs and long search chips can shrink/wrap at narrow widths.
- Long compact author metadata appears under Full photo credit & rights. Licence/source/crop notice remain visible and full source text remains available without truncation. Short captions and full detail credits retain their prior behavior.

Fresh per-screen browser acceptance is recorded in Development Record Entry26. Automated rendering tests do not measure CSS or replace direct browser comparison.

## Oppo K13 physical-phone checklist

Proposed device: Oppo K13, supplied by the developer. Phone browser and Android version are not yet confirmed. [Zen's official FAQ](https://docs.zen-browser.app/faq) states that its browser has no Android version; use an installed Chrome or Firefox for phone acceptance, and keep Zen for desktop if preferred.

Record the date, Android/browser version and actual result beside each item. Until the developer reports results, all physical-device items are pending.

| Check | Pass condition | Result |
| --- | --- | --- |
| Same-Wi-Fi access | App opens using the computer's Wi-Fi URL, with readable logo and no horizontal page scrolling | Pending |
| Authentication and keyboard | Signup/login/errors work; labels focus fields, password toggle works, keyboard does not prevent submit | Pending |
| Session | Refresh remains signed in; logout returns to authentication | Pending |
| Search and touch | Type/select/clear; filters/history work; nonsense query gives empty state; controls are reachable | Pending |
| Nearby/weather | Manual 28.59, 77.22 point produces distances and attributed forecast, or an honest retry state | Pending |
| Photo and guide | Photo/EXIF/credits wrap, disclosures and shutter comparison work without accidental card navigation | Pending |
| Hotspot and map | Pins, dragging, pinch/control zoom, open/back, access/weather and source links remain usable | Pending |
| Saves | Disposable account save survives refresh and matches Saved filter | Pending |
| Orientation/text scale | Portrait, landscape and larger system text keep primary actions/content accessible | Pending |
| Connection interruption | Temporary phone network loss yields an honest state; reconnect/retry recovers where supported; no false save success | Pending |

On an HTTP LAN preview, device GPS deliberately reports that a secure context is required; manual coordinates are the expected fallback. That result does not establish GPS hardware acceptance. Do not disable browser security. Offline catalogue/media availability is not implemented; do not promise offline browsing.

If the LAN page does not open, verify the computer is still running, IP has not changed, both devices share the network and existing firewall/network rules allow access. Only troubleshoot the specific failure; don't broadly disable firewall protection.

## Viva Notes

This increment improves delivery quality while preserving architecture: local assets avoid a brittle logo dependency, associated labels improve form usability, adequate hit areas help touch interaction, and native details preserve long evidence without overwhelming cards.

Modules: AuthScreen(form state and existing auth client); GlobalSearchScreen(existing callbacks and persisted history); SpeciesPhoto/PhotoCredit(source metadata and native disclosure); frontend rendering tests(regressions), plus existing server/session tests. No backend schema, dependency or new framework was added.

1. **Why replace the login logo URL?** The project already has the matching local asset; it loads without relying on that remote image host.
2. **What does htmlFor do?** It connects a visible label to an input ID so selecting the label focuses the input.
3. **Did we remove long photo credits?** No. They remain complete in an expandable disclosure with visible licence/source links.
4. **Does a 390px browser pass prove Android acceptance?** No. Real touch, keyboard, permissions, orientation and connectivity still need a device.
5. **Why isn't this full Phase1 completion?** Discovery works, but the remaining seasonal/difficulty/environment and device/design acceptance requirements are explicitly recorded.
