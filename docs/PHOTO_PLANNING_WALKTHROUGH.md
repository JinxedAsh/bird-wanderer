# Photography planning — Phase 1 walkthrough

Implemented 4 October 2026, Development Record Entry 19. This increment makes the existing Plan a Shot action useful and connects source-photo evidence to practical preparation. It does not create a saved itinerary or an environment-matched recommendation engine.

## User journey

1. Search for a species and open its detail page.
2. Choose **Plan a Shot**. The page scrolls to and focuses its existing **Field Guide & Technique** card, preserving the screen's design structure.
3. Review the selected Commons photo's shutter, aperture, ISO and focal length where available. Open the source link to inspect the example and its provenance.
4. Read conditional exposure/lens comparisons and separately labelled general technique guidance. Missing fields are not guessed.
5. Choose **Choose a reported hotspot**. The existing recent-sighting section receives focus. Select a reported location to view its map, forecast, sunrise/sunset and coordinate directions.
6. Confirm actual entrance, opening hours, fees and camera permissions with the site. These are still unverified; a recent report does not guarantee seeing the bird.

The action does not save a trip, and says so. Persistent records remain a later Phase 1 increment. Prototype species retain their previous behavior.

## Evidence and rules

The photo's normalized EXIF is reused from Entry 18. No additional provider request is made. The source example consists only of supported values for the current species. It is one observation, not an aggregate, typical range, optimum or recommended preset. Photo date/time does not establish a useful visit time or season. A old/captive source image is not proof of current hotspot conditions.

The app applies simple visible guidance:

- If recorded exposure exceeds 0.001 seconds (slower than 1/1000 s), suggest checking whether a faster shutter is needed for fast flight. Otherwise describe a short exposure while still asking the user to check motion/light. This threshold is an app rule of thumb, not a source-derived guarantee that 1/1000 s freezes motion.
- If focal length is present, show it and the recorded lens if available, then suggest comparing reach with the user's own telephoto/zoom. Sensor, crop and distance are unknown; it is not a minimum purchase requirement.
- If aperture is present, show it as a comparison and advise checking focus/depth of field, without prescribing that f-number.
- General shutter/motion, ISO/Auto ISO and autofocus advice is separately labelled and linked to [Nikon's bird-photography technique reference](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/best-bird-photos-the-keys-are-patience-practice-and-a-great-camera-lens-combo). This is editorial guidance, not EXIF extracted from a species photo.

If source loading fails or contains no usable settings, the app still offers general preparation and the location path. It directs provider errors to the existing photo retry control. Loading, failed and mismatched-species states never reuse previous photo evidence.

## Code and architecture

| File | Responsibility |
| --- | --- |
| `frontend/src/components/SpeciesPhoto.tsx` | Emits photo loading/success/error state from its existing request through an optional callback; existing card users need no callback |
| `frontend/src/components/SpeciesDetailScreen.tsx` | Holds the selected photo state and puts planning inside the existing guide card; buttons scroll/focus existing sections |
| `frontend/src/components/PhotoPlanning.tsx` | Checks species/loading/error state, formats supported example values and renders conditional/general guidance and the location action |
| `frontend/src/components/PhotoMetadata.tsx` | Exports its existing number/shutter formatters so EXIF and planning display the same units without duplicated conversion logic |
| `frontend/server/frontend.test.mjs` | Covers example provenance, rule branches, partial/missing/error/loading states and rejection of previous-species evidence |

The callback reports species ID, photo, loading and error. A ref holds the latest callback so changing a parent callback does not refetch metadata. The existing AbortController still prevents an old response from updating state after navigation. App already keys detail screens by species ID, and planning also explicitly checks the ID. Source values are usable only after a successful load.

The Plan action uses `scrollIntoView` and focuses a section with `tabIndex=-1`, so keyboard users land at the content. It respects reduced-motion preference. The hotspot action reuses the same navigation records and existing weather/directions implementation. There is no new backend module, database, dependency or duplicated photo request.

## Checks and remaining acceptance

TypeScript checking, all **51 tests** and the production build passed. New rendering checks exercise reference units/source link, slow/short exposure branches, partial evidence, loading/errors, wrong-species state and absence of inferred timing or invented presets. One initial loading test failed because a supplied photo could still contribute tips while loading; the component now withholds source evidence until a successful current-species state, and the rerun passed. Existing account, discovery, photo/EXIF, maps, weather and proxy tests pass.

Browser evidence is recorded in Development Record Entry 19. Manual acceptance includes Plan action/keyboard focus, reported-location navigation, source/technique links, photo switching, 390-pixel wrapping and a physical phone. Genuine provider outages and naturally missing EXIF are not implied by automated coverage.

Still unfinished: multiple-photo statistics, verified similar-environment comparisons, source-backed best time/season/subject difficulty, confirmed access rules, persistent trip saving and complete design/device acceptance. This delivery supplies initial source-aware planning, not all photography requirements.

## Viva Notes

We replaced a disconnected action with a useful path from species evidence to preparation and location conditions. We reused one request and the existing guide card, rather than introducing a new screen or backend service.

Important modules are `SpeciesPhoto` (fetch/callback/cancellation), `PhotoPlanning` (guards and guidance), `SpeciesDetailScreen` (state and section navigation) and the shared formatters in `PhotoMetadata`. Key concepts are React state, callback props, refs, conditional rendering, provenance, asynchronous race prevention and keyboard focus.

1. **Where do the example values come from?** The same selected Commons photograph's normalized EXIF, not a second request or sample fixture.
2. **Why distinguish examples from recommendations?** A single photo does not prove ideal settings for different motion, light, distance or equipment.
3. **How do we prevent old settings showing during navigation?** Abort stale requests, check species IDs and withhold source values during loading/errors.
4. **What does Plan a Shot actually do?** Opens the existing guide card, then connects to real reported hotspots, weather and directions; it does not save a trip yet.
5. **Why not derive best time from capture time?** One camera clock may be old or lack timezone, and it does not establish a species' activity pattern or today's site access.

## Subsequent planning extension — 4 October 2026

The [Seasonal/exposure walkthrough](SEASONAL_PLANNING_WALKTHROUGH.md) records the later regional chart references, selectable motion guidance and same-light/aperture shutter-to-ISO comparison. This initial walkthrough remains historical evidence for Entry 19. Reviewed access coverage is separately recorded in Entry 23.
