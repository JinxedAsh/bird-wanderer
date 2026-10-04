# External-photo EXIF — Phase 1 walkthrough

Implemented 4 October 2026, Development Record Entry 18. This increment extracts selected camera metadata for the existing external reference photograph. It does not implement user uploads, photography recommendations or Android packaging.

## What changed for the user

Open a real species detail page. Its photo badge reports loading, source EXIF available or source EXIF unavailable. Beneath the photo attribution, **Reference Photo EXIF** shows camera make/model, lens, shutter speed, aperture, ISO, focal length and capture time when the source file has valid fields. Partial records display **Unavailable** for each missing field. A file without supported fields explains that metadata may be absent, stripped or unreadable.

The panel describes settings recorded for that photograph. It does not claim they are optimal, independently verified, from a recent observation or from the selected hotspot. EXIF can be edited. Older/captive reference photos remain valid illustrations, but their metadata is not current bird-activity evidence.

## Simple data flow

```text
Selected eBird species
  -> existing signed-in photo endpoint
  -> exact Wikidata species match
  -> Commons information for its reference file (photo, credit and decoded EXIF)
  -> normalizeExif: validated camera fields only
  -> SpeciesPhoto: same image and metadata response
  -> PhotoMetadata: readable values, units and missing-field messages
```

Commons has already decoded the original file's embedded metadata. The app requests `imageinfo.metadata` with the latest metadata version, then extracts and normalizes the supported fields. It does not parse JPEG bytes locally. This meets the external-data increment without adding a binary library or downloading large images. It is separate from the future upload-processing implementation.

The provider's formatted `extmetadata` still supplies attribution. It is not used as a source of exposure settings, since it combines multiple sources. EXIF comes exclusively from `imageinfo.metadata` belonging to the exact selected file. A test gives the description metadata a contradictory shutter value and verifies that it is ignored.

## Modules and concepts

| Module | Job |
| --- | --- |
| `frontend/server/exif.mjs` | `normalizeExif` reads a small whitelist, validates it and returns nullable fields plus availability status |
| `frontend/server/photos.mjs` | Requests decoded metadata alongside the existing image information; attaches the normalized result to that photo |
| `frontend/src/lib/discovery.ts` | Defines `PhotoExif` and validates the response shape before returning it |
| `frontend/src/components/PhotoMetadata.tsx` | Renders units, partial/unavailable states and source/timezone caveats |
| `frontend/src/components/SpeciesPhoto.tsx` | Owns loading, image/metadata state, cancellation, retry and the external-photo badge |
| `frontend/src/components/SpeciesDetailScreen.tsx` | Keeps the existing hero/audio controls; the shared component now handles its external-photo badge |

The existing protected route, cookies, scientific-name matching, photo licences, 24-hour/300-entry memory cache, three-active/30-pending lookup limits and navigation cancellation remain in use. No extra provider call, dependency, database table or environment key was added. A Node-watch development server reloads imported-module changes; otherwise restart the API after updating code.

## Normalization rules

- Rationals such as `1/500`, `8/1` and `3900/10` become numeric seconds, f-number and millimetres. Positive finite values within broad validity bounds are accepted; invalid denominators, zero, negative, non-finite and unreasonable values become null.
- ISO may be a scalar or one-element array. Multiple ISO entries are ambiguous and become null. Conflicting duplicate tags are rejected conservatively.
- LensModel is preferred; Lens is the fallback. Strings are bounded and reject HTML/control characters. React also escapes text during rendering.
- ExposureTime and FNumber are used directly. APEX ShutterSpeedValue/ApertureValue are not treated as seconds/f-numbers; missing direct fields are not guessed from them.
- Only DateTimeOriginal is used for capture time. Upload, editing and digitization dates are not substitutes. The calendar/time is validated, including leap days. The camera clock is preserved; without OffsetTimeOriginal the timezone is explicitly unknown. No UTC or hotspot-local timezone is inferred.
- GPS, owner names, serial numbers, comments and all non-whitelisted tags are omitted from the API response. No source coordinates are displayed or persisted by this increment.
- The UI uses reciprocal shutter notation only if it matches the numeric exposure. Other exposures display decimal seconds; a 0.3-second exposure is not incorrectly rounded to 1/3 second.

Availability means at least one supported field exists, not that every field is present or authentic. Metadata failure does not invalidate a correctly attributed photo. A complete provider failure retains the existing photo fallback and retry behavior.

## Verification

TypeScript checking, all **49 tests** and the production build passed. New checks cover rational conversion, real units, partial/missing EXIF, malformed fields, invalid calendars/offsets, ambiguous ISO, duplicate tags, sensitive-field exclusion, same-file provenance, client validation, decimal shutter display and escaped text. Existing account/discovery/map/weather tests remain passing.

Live normalized results on 4 October:

| Species reference | Camera | Shutter | Aperture | ISO | Focal length | Camera clock (timezone unknown) |
| --- | --- | --- | --- | --- | --- | --- |
| Indian Roller | NIKON D300 | 1/500 s | f/8 | 400 | 390 mm | 2011-10-11 09:27:38 |
| Common Kingfisher | Canon EOS-1Ds Mark III | 1/400 s | f/9 | 200 | 400 mm | 2014-10-25 11:02:12 |
| Lesser Whistling-Duck | NIKON D7000 | 1/400 s | f/2.8 | 640 | 145 mm | 2012-03-27 17:54:50 |

These are provider snapshots for individual photos. See Development Record Entry 18 for browser results and remaining limits. Manual checks include missing/partial source EXIF, rapid switching, retry during a genuine outage, long metadata wrapping, physical-phone behavior and exact design acceptance. Do not edit external files or local configuration simply to fabricate a test result.

## Viva Notes

We connected the existing credited photo to its genuine source-file camera metadata. We used the provider's decoded EXIF to keep the implementation small and avoid downloading large binary files. One normalizer turns inconsistent metadata into a predictable object; one presentation component formats it.

Important functions are `normalizeExif` (validation and whitelisting), `createPhotoService` (same-file retrieval/cache), `loadSpeciesPhoto` (typed, authenticated client), `SpeciesPhoto` (loading/cancellation) and `PhotoMetadata` (units and caveats). Key concepts are EXIF, rational numbers, nullable fields, provenance, timezones, whitelisting and asynchronous requests.

1. **What is EXIF?** Metadata attached to an image that can describe the camera, exposure and capture time; it may be absent or edited.
2. **Are we parsing image bytes?** No. Commons decodes the original file; our app requests and normalizes its EXIF through the official API.
3. **How is shutter speed converted?** A source rational like 1/500 becomes 0.002 seconds, displayed as 1/500 s when the reciprocal is accurate.
4. **Why show timezone unknown?** Most capture clocks lack an offset. Assuming UTC or the hotspot timezone could turn a valid clock into false timing evidence.
5. **Can these settings become recommendations directly?** No. They describe one photograph. Evidence-based guidance is a separate increment and must explain sample size and limitations.

Provider reference: [MediaWiki Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo) distinguishes file EXIF (`metadata`) from formatted multi-source description metadata (`extmetadata`).
