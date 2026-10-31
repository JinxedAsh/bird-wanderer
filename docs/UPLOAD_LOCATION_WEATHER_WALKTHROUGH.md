# Upload: bird names, photo autofill, chosen locations and past conditions

31 October 2026. This increment addresses team feedback on the existing observation form. It preserves the React/Express/SQLite architecture, source catalogue and existing screen hierarchy. Email-provider onboarding is deferred; authentication and verification remain unchanged.

## What changed

- **Species:** search the real loaded eBird common or scientific names. Case, accents, spaces, hyphens and punctuation are normalized. A unique exact name selects its catalogue ID; partial names require choosing a result. The chosen option remains present beyond the first50-result limit. No bird is inferred from the uploaded image.
- **Photo autofill:** server-extracted EXIF capture time/offset and GPS fill the form when present. Missing GPS never becomes a guessed hotspot or the phone's current location. Manual changes, including edits while uploading, take precedence. Replacing a photo clears earlier automatic values while keeping manual entries. An explicit EXIF reset replaces manual entries and clears stale coordinate text when the new file has no GPS.
- **Places outside eBird:** choose a map point or enter latitude/longitude and an optional private label. A zero coordinate is valid. A nearby loaded hotspot is only a distance-labelled suggestion; using it requires a separate choice. No custom point receives an invented eBird ID.
- **Past conditions:** the selected point, observation clock and optional UTC offset drive an Open-Meteo hourly lookup. The saved estimate survives reload and appears in Journal and Community where privacy permits. Weather can be omitted; failed or delayed data does not block saving an otherwise valid observation.
- **Editing:** existing records can change location/date/offset and refresh historical conditions. Changing the weather context clears the old snapshot unless a matching new one is supplied. Notes/privacy-only changes keep existing weather and work without fetching the catalogue. The editor can switch a custom location between Hidden and Generalized.

## A complete journey

1. The photograph goes to the existing authenticated upload endpoint. Sharp creates the bounded metadata-free shared JPEG; exifr reads metadata before it is stripped. Only the uploading owner receives the original GPS pair in the upload response.
2. `LogObservationScreen` uses the actual returned EXIF and guards manual fields against late upload responses. `PhotoMetadata` now identifies uploaded metadata correctly, while external reference photos retain their Commons attribution.
3. `observation-form.ts` normalizes names and searches the supplied eBird catalogue. The saved species ID remains the authoritative reference. `ObservationLocationFields` offers either an existing hotspot or a custom point.
4. `ObservationPinMap` reuses Leaflet and normal OpenStreetMap raster tiles. Open the map deliberately, tap a point, or pan with arrow keys and press **Use map center**. Manual fields remain available if tiles fail. Tiles identify the viewed area to the provider; no map is opened automatically for EXIF GPS.
5. `ObservationConditionsPanel` waits briefly for edits to settle, then posts coordinates rounded to0.1 degrees, the clock and optional offset to the authenticated API. It aborts obsolete client requests and ignores late results. A query key prevents a snapshot for one place/time being saved for another. Label-only edits or an EXIF reset that leaves the same query must keep the still-visible matching snapshot.
6. `observation-weather.mjs` requests the chosen historical hour from Open-Meteo. `observation-details.mjs` stores a bounded, account-bound preview ID. Publishing accepts only a server-created snapshot matching that account, rounded point, clock and offset; arbitrary client-supplied weather values are never trusted.
7. The observation and supplemental details commit together in SQLite. The existing serializer applies privacy before any response. Journal/Community format the saved values with model, hour, timezone and attribution; they do not replace them with the current forecast.

## What the weather means

Dates from1940 are supported subject to provider coverage. Older dates use the archive Best Match reanalysis/model dataset. The previous six days use the Forecast API's explicit past date range and requested hourly arrays, labelled **recent past model estimate**. No current-weather fields or future-hour substitution are used. Provider delay, missing values, unsupported units, wrong location identity, future times and network errors remain explicit.

With a UTC offset, the camera/user clock is converted to UTC before selecting the containing UTC hour. Without one, the clock is assumed to be local in the provider's location timezone and the exact instant remains unverified. The selected hour, timezone, time basis and retrieval time are displayed. Precipitation represents the provider's hourly quantity; it is not a rain sensor reading at the camera. Cloud cover is not a verified lighting measurement.

Only coordinates rounded to0.1 degrees (about11km in latitude), date and clock are sent to the weather provider. The provider receives no photo, account ID, name or email. Cache lifetime is15 minutes, with at most100 entries and10 distinct in-flight loads; failed loads are retryable. Each account has20 attempts/minute, including provider failures, and at most20 persisted previews, retained for at most24 hours. These limits do not guarantee provider availability or quota capacity for a large deployment.

The current public endpoint is appropriate for this noncommercial university use, subject to Open-Meteo's terms/limits. Estimates are credited **Open-Meteo, CC BY4.0**. [Official historical API](https://open-meteo.com/en/docs/historical-weather-api). Real requests on31 October returned estimates for22 March and30 October2026 at the requested Delhi-area point/hour; these establish provider connectivity, not weather accuracy at a photograph.

## Location privacy and persistence

| Data | Owner | Other permitted reader |
| --- | --- | --- |
| Original extracted photo GPS | Exact pair, separate from chosen location | Never returned; image metadata removed |
| Chosen custom point and private label | Exact pair/label/source | Rounded0.1-degree area and generic label only when Generalized |
| Hidden custom location | Owner still sees it | No point, private label or conditions |
| Profile location privacy Hide | Owner sees details | Location and conditions withheld |
| Private record/profile restriction | Owner sees record | Existing access rules deny record/media |
| Historical weather source URL | Static methodology link | No coordinate-bearing provider query URL |

Rounding is a location disclosure reduction, not an anonymity guarantee. Free-text notes/profile fields remain user-authored; never put private coordinates there. The map tile provider can see the viewed map area after the user opens it. Normal browser caching/HTTPS attribution are preserved; no geocoding autocomplete, tile proxy, prefetch or offline bulk download was added. [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

The additive `observation_details` table stores the chosen point, optional clock offset and validated conditions, keyed to the existing observation with delete cascading. `observation_conditions` holds short-lived previews. Existing user/media/observation rows are preserved; legacy records simply have no supplemental details. The app also tolerates the intermediate supplemental-table shape by adding the optional offset column when absent. Backup/restore uses the whole SQLite database and processed-media archive; the test now proves the custom point and weather snapshot survive an actual restore.

Internally custom records leave the old non-null hotspot field empty; the API returns `hotspotId:null`. No custom point can create a hotspot-specific alert or hotspot route. Species alerts can still refer to an accessible user report, but their text withholds custom labels. Community search cannot discover another user's private custom label. Nearby filtering uses only the point already permitted by serialization. Trip totals for custom records group reported day and chosen point rounded to0.001 degrees; these are reported location groups, not independently verified visits.

## Verification and remaining manual checks

Automated tests cover common/scientific normalization, selected options beyond the result limit, actual EXIF response/date/GPS, zero and invalid points, account/session/origin enforcement, custom-point publication/edits/restart, owner versus public/hidden privacy, search-label isolation, account-bound snapshot mismatch, stale date invalidation, offset bounds, future/unavailable/delayed weather, correct units/hour/date selection, provider retry, bounded calls, failed-attempt rate limiting and backup/restore. Existing authentication, recovery, alerts and social regressions remain part of the full suite.

Browser testing uses isolated storage, pre-created synthetic accounts and generated JPEGs; its exact builds, fixes and results are in Development Record Entry59. It is separate from physical Android evidence. Still manually check the Oppo file chooser/keyboard, map taps and permission behavior, actual user-photo EXIF variants, and provider outages/quotas on the intended network. An arbitrary custom pin is not an audited entrance, travel route or permission to photograph there.

## Viva Notes

**Why these changes:** the existing form already had real species and photo metadata, but required too much manual repetition and a limited hotspot choice. We reused those sources, added location flexibility and preserved evidence boundaries.

**Important modules:** `observation-form` handles names/autofill helpers; `LogObservationScreen` owns the draft; `ObservationLocationFields`/`ObservationPinMap` handle location entry; `ObservationConditionsPanel` owns asynchronous lookup; server `observation-weather` validates provider data; `observation-details` binds/persists it; `observations.mjs` keeps ownership, transaction and privacy enforcement centralized.

1. **Why not infer the bird from EXIF?** EXIF describes the file/camera, not a reliable species identification. The user selects a real eBird species.
2. **Why keep original GPS and chosen point separately?** One is file metadata; the other is the user's reported location. Manual corrections must not rewrite the photograph's evidence.
3. **How do late requests avoid overwriting a new draft?** Abort obsolete requests, check their signal and match the returned snapshot to the current query key before saving. Manual edits take precedence over late EXIF.
4. **Why save the weather snapshot?** Reload should show the same attributed estimate that was attached to the observation, rather than today's forecast. Only server-validated matching snapshots can be saved.
5. **How is privacy enforced?** The server checks access and removes exact/custom-sensitive fields before serialization; hiding a browser control alone would be insufficient.
