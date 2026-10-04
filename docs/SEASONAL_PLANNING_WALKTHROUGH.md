# Seasonal references and exposure comparison

Phase 1 increment, 4 October 2026. This extends the existing guide; it does not establish a species-wide optimal preset or finish every photography requirement.

## What a teammate can see

On a real species page, **Best Time** stays Unverified. Its new link and **Plan a Shot** focus the existing Field Guide & Technique card. Two disclosures add seasonal context and preparation for a chosen kind of shot. Existing photos, credits, EXIF, location links and hotspot forecasts remain available.

**Check regional seasonal patterns** opens the configured region's eBird bar chart and tells the user which species to find. The link is regional, not a guaranteed species-filtered chart. The chart's date/location controls matter. The app explains checklist frequency and distinguishes historical reporting from current 14-day reports. It neither downloads seasonal values nor computes a best month. Delhi's page was independently opened in Test chat without sign-in; browser bot checks/provider availability may vary.

**Prepare for subject motion** offers perched/mostly stationary versus flight/fast movement. Guidance changes for the selected shot. This is labelled general technique, not a measured species difficulty rating. A shutter selector compares five test speeds with the current reference exposure and ISO. There is no proposed target until the user chooses one.

## The exposure calculation

At unchanged scene light and aperture:

`comparison ISO = reference ISO × reference exposure seconds ÷ target exposure seconds`

For example, ISO 400 at 1/500 s becomes approximately ISO 1600 at 1/2000 s; 1/250 s becomes ISO 200. A faster shutter admits less light, so raising ISO preserves the comparison's exposure under its assumptions. Actual light, camera limits, noise and subject movement still require test shots. No camera setting is changed by the app.

The result is withheld without successful current-species exposure and ISO, or for nonpositive/nonfinite inputs or results outside the broad numerical guard of 1–1,000,000. That guard prevents nonsensical display; it is not an assertion that any camera supports that ISO. The source aperture need not be known to compare the ratio, but the same-aperture assumption is essential. No weather similarity is inferred from source metadata.

## Code and state

| File | Responsibility |
| --- | --- |
| frontend/src/components/PhotoPlanning.tsx | Existing EXIF guards, two local selection states, exposure ratio, validated regional chart URL and progressive disclosures. |
| frontend/src/components/SpeciesDetailScreen.tsx | Supplies name/region, keys planning by species ID and connects the existing Best Time tile to guide focus. |
| frontend/src/components/HotspotMap.tsx | Disable delayed animated-zoom callbacks after navigation; guard cancelled resize notifications. |
| frontend/server/frontend.test.mjs | Exposure calculations/invalid values, safe region links and rendering regressions. |

`equivalentIso` is a small pure function: the same inputs yield the same result without a request or database. `seasonalChartUrl` accepts only the provider region-code shape and constructs a fixed eBird URL. React state controls selections; a planning-prefixed species key resets them on navigation and remains unique beside the species-information panel. Loading/errors/wrong-species states continue to withhold photo-derived evidence. No new API route, dependency, persistent table or duplicated photo request was added.

## Sources and requirement boundaries

- [eBird chart documentation](https://support.ebird.org/en/support/solutions/articles/48001255130-ebird-bar-charts-and-graphs): frequency and historical chart interpretation.
- [Nikon technique reference](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/best-bird-photos-the-keys-are-patience-practice-and-a-great-camera-lens-combo): motion, autofocus and exposure preparation; advice is paraphrased separately from EXIF evidence.
- The selected Commons image remains the source for its actual settings.

The living specification was re-read through Google Drive on 4 October. It requires seasonal activity, difficulty and settings in comparable environments. This increment supplies a useful external seasonal reference and a transparent exposure comparison; imported regional seasonal statistics, measured species difficulty, multiple-photo analysis and verified similar-environment recommendations remain incomplete. A source link alone does not complete those requirements. Opening hours and permissions use the separately reviewed hotspot snapshots where supported.

## Verification

All 77 tests, TypeScript and production build passed. New tests cover faster/slower/unchanged shutter ratios, missing/invalid/extreme input, valid/invalid region codes and separation of frequency, recent reports and preset claims. Existing missing-photo tests were adjusted to distinguish selectable test speeds from displayed source-photo evidence. Initial browser acceptance confirmed controls and arithmetic but caught a duplicate sibling key introduced by this change. It was corrected to a planning-prefixed key, and all checks were rerun successfully. Fresh browser acceptance and the map lifecycle correction are recorded in Development Record Entry 25.

Manual checks: keyboard disclosure/select operation, clearing/resetting choices, correct live arithmetic after species switching, regional/source links, 390-pixel layout and existing photo/hotspot/weather/access/saved-state behavior. A physical phone, genuine provider failures and full design comparison remain pending. Missing/partial EXIF and invalid regions have automated coverage, not forced browser-outage coverage.

## Browser-discovered fixes

The initial browser check caught a duplicate React sibling key: planning and species information both used the bare species ID. Planning now prefixes its key, preserving per-species reset without collisions.

A separate map error reproduced three times in a fresh tab when the user pressed Enter on Zoom in and immediately activated Go back. Leaflet's delayed zoom-transition handler then accessed a removed map pane. The installed source and stack matched this lifecycle race. The embedded map now uses the public [zoomAnimation option](https://leafletjs.com/reference.html#map-zoomanimation) set to false, preserving interactive zoom without the delayed transition. Resize notifications check the cancellation flag before touching the map. No library internals or dependency version were changed. See Entry 25 for final rapid-navigation browser results; rendering tests alone do not prove this timing fix.

## Viva Notes

We extended the same planning component with two small local interactions. We preserved evidence from the current photograph and clearly distinguished the calculation's assumptions from field conditions. Historical chart context helps the user plan a season without inventing statistics from recent reports.

Important concepts: exposure tradeoffs, pure functions, input validation, React state, keyed component reset, progressive disclosure and data provenance.

1. **Why multiply ISO by an exposure ratio?** Less exposure time admits less light; under unchanged aperture and lighting, the ratio gives the corresponding ISO comparison.
2. **Does the calculated ISO guarantee a good picture?** No. Noise, camera capability, subject motion and real light still need a test shot.
3. **Why keep Best Time Unverified?** Neither a single photo nor a 14-day report set establishes optimal annual or daily activity.
4. **What do seasonal chart bars measure?** Reporting frequency on complete checklists for the chosen region/date range, rather than individual bird counts.
5. **How do selections avoid leaking across birds?** The component is keyed by species ID and checks photo identity before using EXIF.
