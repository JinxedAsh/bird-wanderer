# Photography forecast alerts

Updated 24 October 2026. These are optional preparation reminders from Open-Meteo forecasts. They do not predict a bird's presence, promise good photographs or establish a species' best weather.

## User flow

Subscribe to a hotspot, enable Sighting alerts and opt into Photography forecast alerts in Notifications. The backend checks opted-in hotspot subscriptions at most hourly per site, processing up to 20 due sites per cycle. One site's provider failure does not stop others. Notifications show pending/check/unavailable status.

A candidate needs a future local forecast hour, valid sunrise/sunset, rain probability at most 20% and wind at most 15 km/h. It must fall in the first hour after sunrise or last hour before sunset. These are the same explicit general preparation rules already displayed on hotspot weather. Missing values, unsupported zones, polar/missing sun times, stale forecast retrievals, excessive rain/wind and passed windows cannot qualify. Zero rain/wind is valid data, not missing.

At most one alert is saved for each account/hotspot/local day. It records the chosen forecast hour, IANA timezone, rain/wind, retrieval timestamp and public hotspot name. The card labels the evidence as an Open-Meteo forecast and a general rule. Opening it uses the exact hotspot ID and its current weather/access screen. Users must still confirm opening hours and conditions; a light window does not prove that the venue is open.

Unsubscribing, opting out or passing the selected window removes the opportunity from the current inbox. Read state persists. A later forecast update does not issue repeated same-day reminders; the saved card remains a dated snapshot, and its target provides the latest forecast. There is no claimed optimal-weather model or automatic interpretation of photograph conditions.

## Implementation

`server/opportunities.mjs` contains `localClock`, `forecastWindows` and `createOpportunities`. The first converts server time to a named location clock; the second applies documented rules without treating a timezone-free string as UTC; the service stores preferences, checks and deduplicated opportunities. It calls the existing `discovery.hotspotWeather` provider/cache rather than adding another weather API.

The existing alert router merges both notification sources, handles ownership/read state and stores opt-in. The server's timer runs eligible forecast checks before dispatching queued push jobs. Browser polling stays 15seconds while visible. Both sources use the existing optional Firebase adapter and generic privacy-preserving lock-screen message; real Firebase/device delivery is still unverified.

The outbox migration preserves old sighting attempts/status/schedules while adding a nullable opportunity reference. A database constraint requires exactly one source per delivery; separate unique indexes prevent duplicate source/device jobs. Foreign keys remove queued jobs when their source or session-bound device is deleted. The migration runs as a transaction, so a failure does not leave half a schema. This keeps one small delivery mechanism rather than duplicating the push service.

## Evidence and limits

101 local tests pass at implementation time, including the existing 98 regressions. New tests cover local clocks including a DST clock, thresholds/zero/missing/stale data, opt-in, failed-site isolation, hourly bounds, deduplication, read ownership, unsubscribe/expiry, generic simulated push and preservation/cascades of the old outbox schema. TypeScript and production build pass. Test chat browser QA passed exact hotspot/readstate, opt-out/unsubscribe/expiry, deduplication and320/390px wrapping. Favorable/failure/stale/missing weather paths used an isolated labelled fixture; its process/data were cleaned. Exact delivery is recorded in Development Record Entry34.

Controlled forecasts/outages are synthetic test evidence. A real provider may return no qualifying window; absence is displayed rather than replaced with a sample. Exact golden-hour astronomy, species activity inference, venue access confirmation and actual push receipt remain outside what this feature proves.

## Viva Notes

1. **Why opt in separately?** A weather reminder is different consent from a report about a subscribed bird or site.
2. **Why compare local clocks?** Sunrise and hourly forecasts belong to the provider's IANA timezone; parsing them as server UTC would shift the window.
3. **Why keep zero values?** Zero rain probability or wind is a legitimate measurement. Only absent/invalid values fail validation.
4. **Why deduplicate by local day?** Hourly checks should not notify the same account repeatedly about one site's daily preparation window.
5. **Why migrate the outbox?** One queue can safely handle either sighting or forecast reminders while preserving existing pending deliveries.
6. **What is still uncertain?** Forecast accuracy, actual light, bird presence and venue access. The interface labels these limits instead of promising success.
