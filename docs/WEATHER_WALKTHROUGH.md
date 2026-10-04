# Hotspot weather and photography planning

Implemented on 4 October 2026 for Phase 1. This extends the existing hotspot detail screen; it does not complete all photography logistics or Android delivery.

## What a teammate can explain

After finding a hotspot, a user can check its forecast and daylight times before travelling. The temperature chip and Detailed Micro-Weather accordion use the same location-specific response. Weather and bird reports load separately, so a forecast outage does not remove the hotspot's map or recorded species.

The displayed weather is model output from [Open-Meteo](https://open-meteo.com/en/docs), not a sensor at the exact hotspot. Times are in the hotspot's resolved timezone. Missing measurements remain unavailable, while real zero rain/wind/temperature values are preserved. Forecasts can change; retrieval time and caching are disclosed.

## Request flow and important files

```text
Selected hotspot -> App.tsx -> loadHotspotWeather(id, signal)
  -> signed-in discovery endpoint -> validate ID against eBird catalogue
  -> weather.forecast(latitude, longitude) -> Open-Meteo
  -> validate/normalize/cache -> HotspotWeatherPanel + summary temperature
```

- `server/discovery.mjs`: the weather route and hotspot-ID membership check. It derives coordinates from known regional hotspots rather than accepting an arbitrary client location.
- `server/weather.mjs`: `createWeatherService()` fetches model data and returns `forecast()`. It checks coordinates, units, timezone and aligned forecast arrays. `WeatherError` carries safe provider errors for the API. Current conditions and upcoming forecasts are normalized without guessing missing measurements.
- `src/lib/discovery.ts`: `loadHotspotWeather()` uses the existing browser discovery client. App-server HTTP 401 becomes a session-expired error; weather/provider errors remain retryable.
- `src/App.tsx`: keeps weather state associated with its hotspot ID, cancels obsolete requests with AbortController and offers weather retry separately from species-report retry.
- `src/components/HotspotWeatherPanel.tsx`: displays six current fields, two days of sunrise/sunset, up to six upcoming hours, attribution and planning tips within the existing weather accordion.
- `server/weather.test.mjs`, `server/discovery.test.mjs`, `server/frontend.test.mjs`: isolated provider, access-protection/client and rendering checks.

## Data and limits

The provider request asks for Celsius, km/h and millimetres explicitly, resolves timezone automatically and fetches two days. It includes model current conditions, hourly temperature/rain probability/wind, and daily sunrise/sunset. The server returns up to 24 upcoming hours; the interface shows six to keep the section readable.

Successful forecasts are shared for 15 minutes and cached by exact coordinate pair. Storage is bounded to 100 pairs, concurrent requests share one operation, and failed loads are not cached. A failed refresh does not silently display expired weather as current. The network request has a ten-second timeout.

The [free API terms](https://open-meteo.com/en/terms) permit non-commercial educational use subject to request limits. Visible attribution and a CC BY 4.0 link are included; normalization/planning adaptation is disclosed. The existing eBird key remains server-only; weather adds no new credentials. Check provider terms again before any commercial deployment.

Photography tips are transparent rules: consider approximately the first hour after sunrise or last hour before sunset, stabilize a long lens when wind is elevated, carry rain protection when precipitation is forecast, and watch exposure under heavy cloud. These are not astronomical golden-hour calculations, bird-activity predictions, safety advisories or measured camera settings. Site access, entry fees, camera passes and gates require separate verified sources. Explore's weather remains unavailable until it has a meaningful selected/verified location. No photo/EXIF pipeline or GPS collection was added here.

## Verification

TypeScript checking, all 35 tests and the production build passed. Weather tests use injected provider responses rather than internet access, covering units, coordinates, timezones, upcoming rows, null/zero values, cache sharing/expiry, malformed data and retryable failures. HTTP tests check session protection and prevent unknown/invalid hotspot queries reaching the weather provider. Rendering tests verify source labels, loading/retry and general-guidance wording.

A separate real-provider check confirmed Lodhi Gardens coordinates, an Asia/Kolkata forecast, two days of sunrise/sunset, 24 upcoming rows and cache reuse. The recorded values are in Entry 16 of DEVELOPMENT_RECORD.md and may change. No automated rendering test proves actual clicks, touch or layout.

**Desktop browser acceptance:** the designated testing chat verified Lodhi Gardens weather fields, location timezone, two sunrise/sunset dates, six hourly rows, attribution and approximate tips. A rapid Asola-to-Lodhi sequence retained the correct forecast; reopening Asola showed distinct values. The table/map controls were usable at 390 × 844 pixels. The local logo and login/refresh/logout regressions passed, and a protected request after cross-tab logout returned to login. Directions opened Google Maps at the exact eBird coordinates, although Google displayed a nearby business name. Pins can overlap in broad searches; zoom or exact-name filtering helps select the intended location.

Physical-phone interaction, provider-outage UI, exact design acceptance and pure window-focus recovery remain unverified. The testing tool could not establish a genuine window-focus event; recovery on a protected request passed. The check confirms displayed behavior, not independent weather accuracy or entrance suitability.

## Manual acceptance checklist

1. Sign in, search Lodhi Gardens, open its map pin and detail. Expand Detailed Micro-Weather; check the hotspot name, summary temperature, model timestamp, timezone, units, sunrise/sunset dates and source link.
2. Open another hotspot, navigate back and switch rapidly; confirm no previous location's weather is displayed under the new record.
3. Check narrow/landscape layout and the forecast table. Compare against the supplied design and verify ordinary map/navigation controls still work.
4. On an isolated provider-failure test, check Retry weather and that map/species reports remain usable. An app-session 401 should return to login; a weather outage should not.
5. Verify null readings stay unavailable and zero readings are shown. Do not assume a real day's forecast will contain every test condition.
6. Recheck expired-session focus handling, logout/login and the local header logo. Opening directions and physical Android interaction are separate acceptance checks.

## Viva Notes

**What changed and why:** real hotspot forecasts replace weather placeholders so a user can plan daylight and weather-dependent photography. The existing components/navigation remain intact, with a small server module and reusable display component.

**How it works:** an authenticated request sends the hotspot ID, the server finds trusted coordinates, retrieves/caches provider output, then the interface displays normalized values. Weather failures are separated from account failures and bird-report loading.

Five likely questions:

1. **Why fetch weather on the backend?** It centralizes validation, caching and access checks and keeps provider handling out of screen components.
2. **Why validate units?** A value of 10 means different things in km/h and mph. The screen must not attach a unit that the provider did not return.
3. **Why keep zero separate from null?** Zero is meaningful weather data; null means no usable measurement was supplied.
4. **How do we prevent the wrong hotspot's forecast appearing?** Requests are cancelled on selection changes, and both response and displayed state are matched to the hotspot ID.
5. **Are the photography tips extracted from photos?** No. They are labelled general rules using weather/daylight context. Open-photo metadata and source-based camera advice remain a separate Phase 1 increment.
