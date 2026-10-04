# Nearby discovery and Explore weather

Implemented 4 October 2026. This increment connects the existing location and weather areas with a small optional location picker. It preserves regional browsing, persistent bookmarks/history and hotspot forecasts.

## Using it

1. Sign in. Choose the location label on Explore or Current location in Hotspots.
2. Choose **Use device location**, or enter latitude/longitude. Device permission is requested only after that button; a denied/unavailable request has an explanation and the manual form remains usable. For the HTTP LAN demonstration, use a public sample coordinate such as Delhi 28.59, 77.22 rather than disclosing someone's private location.
3. Explore shows GPS/Manual context, nearby recent reports and temperature/wind/condition for the approximate selected point, with timezone/source/retrieval/licence information. Forecast error/retry does not sign out the user or replace valid discovery data.
4. Hotspots defaults to Nearby (50 km). Cards and pins share the nearby filter and closest-first order. Popular/Saved retain the whole loaded region; distances are still shown. Search distances use the same point.
5. Open the picker and clear location to restore regional browsing and a weather prompt. Refresh/logout also clears the point; personal bookmarks/history stay in SQLite.

## Simple architecture

`location.ts` validates the selected/device point through the existing coordinate helper. `distanceKm` uses the Haversine formula with Earth radius 6,371 km. Full-precision distances drive filtering; one decimal is displayed. Latitude/longitude zero are valid. A 50-km radius is deliberately fixed for this increment. Distance is straight-line, so existing Google directions remain the route-planning path.

`getDeviceLocation` calls browser `getCurrentPosition` once, with low-accuracy preference, ten-second timeout and at most one-minute cached-position age. It checks secure-context support and translates denial/timeout/unavailable errors. A device's accuracy estimate is displayed. It is not continuous tracking or proof of a precise current position.

`LocationPicker` is a simple inline React form, not a new screen/framework. Numeric range/blank validation handles manual points. A request counter prevents a late GPS result after closing the form or choosing a different point. `App.tsx` holds the point in memory, joins nearby hotspot IDs to recent reports, guards forecast identity and aborts obsolete weather requests. The existing screens receive optional location/weather props.

`loadLocationWeather` sends rounded numeric coordinates through POST `/api/discovery/weather`. The existing session and allowed-Origin checks apply. `locationWeather` validates/rerounds the point and calls the existing `createWeatherService` without needing the eBird catalogue. It retains provider/timezone/unit validation and 15-minute caching bounded to 100 coordinate entries; 20 distinct requests can be in flight and duplicate keys share work. The point is never stored in the account database. Anonymous rounded forecast keys remain temporarily in server memory. Source attribution/licence are retained.

## Files changed

| File | Purpose |
| --- | --- |
| `frontend/src/lib/location.ts` | Device request, point type and Haversine distance |
| `frontend/src/components/LocationPicker.tsx` | Optional GPS/manual/clear form and stale-result guard |
| `frontend/src/App.tsx` | Location lifecycle, report/distance joins and independent Explore weather |
| `frontend/src/components/ExploreScreen.tsx` | Location control, nearby reports and attributed forecast states |
| `frontend/src/components/HotspotsScreen.tsx` | Location control, radius/order and consistent filtered map/list |
| `frontend/src/components/GlobalSearchScreen.tsx` | Readable one-decimal distances |
| `frontend/src/lib/discovery.ts` | Protected rounded-point POST and response identity check |
| `frontend/server/discovery.mjs` | Validated coordinate forecast route/service |
| `frontend/server/weather.mjs` | Bound distinct in-flight requests |
| `frontend/server/discovery.test.mjs` | HTTP protection, rounding, coordinate validation and eBird independence |
| `frontend/server/weather.test.mjs` | Busy bound and same-key sharing |
| `frontend/server/frontend.test.mjs` | Device/distance/nearby/weather/client/rendering checks |
| Both READMEs, this walkthrough, `docs/DEVELOPMENT_RECORD.md` | Setup, limitations and chronological evidence |

## Verification and practical limits

All 71 automated tests, TypeScript and the build passed. Existing tests caught missing-distance rendering, which now displays unavailable safely. Frontend checks/build were repeated after final Search formatting. Browser evidence is recorded in Development Record Entry 22.

Manual acceptance includes both picker entry points, denied/insecure GPS with manual fallback, invalid ranges/blank/zero points, Delhi versus 0,0 filtering, nearest-first pins/cards, clear/refresh/logout, switching before weather resolves, keyboard and 390-pixel layout. Real GPS success and physical-phone HTTPS/permission behavior require device testing; mocked success is not hardware evidence. Forced provider outages and full design fidelity remain unverified.

Coverage stays within the configured eBird region. A location elsewhere can legitimately return no nearby loaded hotspots/reports; the app does not automatically change region or query worldwide geo endpoints. Recent reports are past-14-day latest reports, not live bird positions or guaranteed photographic opportunities. Coordinates rounded to two decimals make weather approximate; forecasts also have provider grid resolution. No road distances, gates, access fees, logged sightings or saved trips are inferred.

## Viva Notes

We connected optional location selection to existing discovery records and reused the existing forecast provider. The browser computes proximity, while the backend validates weather requests. Authentication, persistence and GPS have separate responsibilities: account choices persist, but this selected point is intentionally temporary.

1. **Why Haversine?** Latitude/longitude are on a sphere. Haversine estimates great-circle distance in kilometres; subtracting degrees would not give a meaningful physical distance.
2. **Why keep unrounded distances?** A point just outside 50 km must not become nearby because display rounding makes it look like 50.0 km.
3. **Why does GPS fail on HTTP LAN?** Browser geolocation requires a secure context and permission. Manual input lets the demo remain usable without changing browser security.
4. **Why reuse the weather service?** It already validates provider units/timezone, caches results and handles failures. The new endpoint supplies a rounded point instead of a hotspot ID.
5. **Is this worldwide nearby discovery?** No. It filters the loaded configured region. Wider geographic provider queries and physical-device acceptance are separate work.

Reference: [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).
