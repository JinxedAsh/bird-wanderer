# Phase 1 evidence and trip preparation

Updated 13 October 2026. No upload/community/alert/quiz implementation or Android package is included.

## What changed and why

The app previously displayed one source photograph and separate forecasts. The existing planning disclosures now compare up to three licensed exact-species references and provide concrete, dated light-preparation windows at hotspots. Each reference retains its full creator/licence/source and its own EXIF. Ranges show how many photographs actually supply each field; they do not imply a typical value or an optimal preset.

The backend starts with Wikidata P18 image claims and supplements them with Commons structured-data search requiring P180 (depicts) for the same exact scientific-name/species-rank entity. It checks supported bitmap formats, source hosts, licences and attribution as before, deduplicates files, and limits the result to three. The existing hero endpoint is preserved. The new /api/discovery/species/:id/references route requires the same session and catalogue membership. Requests share bounded cache/concurrency; failed requests are retryable. The interface loads only when the comparison disclosure opens and cancels obsolete requests on species changes.

EXIF ranges exclude missing/invalid values independently for each field. Readable formatting reuses the existing shutter/number functions. A source image failing to load shows the local placeholder while credits remain available. These are a small convenience sample, not an independently verified photography dataset. Sensor/crop, distance and historical conditions are unknown. Current weather cannot be declared a match for historical photos.

## Local timing, conditions and difficulty

Hotspot forecasts now show the first hour after sunrise and last hour before sunset on the forecast's local date/timezone, clamped to daylight length. These are approximate light-preparation windows, not astronomical golden-hour boundaries or bird activity peaks. Missing/reversed times produce no window. Site opening hours are checked separately; the app does not assert dawn access.

Upcoming daylight forecast rows with rain probability <=20% and wind <=15 km/h are listed as preparation candidates, at most six. Both measurements and daylight bounds must exist. The thresholds are explicit general heuristics, not a learned success model; no matching row does not mean photography is impossible. Current wind/rain/cloud preparation tips remain available.

Photography difficulty remains Unrated for external species: no measured, transferable ordinal difficulty dataset was found in the connected sources. The tile links to existing motion/light/gear preparation. Perched/flight choices and EXIF examples explain demands but cannot establish species difficulty. This is an unresolved requirement, not a renamed completed rating.

## Seasonal evidence and exact limitation

The official [eBird chart guide](https://support.ebird.org/en/support/solutions/articles/48001255130-ebird-bar-charts-and-graphs) explains reporting frequency and histogram downloads. On 13 October the normal browser displayed Delhi's 2021–2025 chart, but Download Histogram Data required Cornell Lab sign-in. Direct server access received a bot-verification page; no protection was bypassed. API recent reports do not provide the complete-checklist denominator needed for annual frequency estimates. Imported weekly statistics remain blocked pending a legitimately obtained export, its metadata and data-use review. No parser was guessed against an unseen file format.

As a narrow alternative, [UP Ecotourism](https://upecotourism.in/Okhla.aspx) names Northern Pintail and Gadwall among October–March migratory visitors at Okhla, with separate November–March destination advice. Their scientific names are mapped explicitly; this narrative appears only for Delhi/UP coverage and expires after 90 days. Other species get an honest missing-evidence message. It is a nearby site narrative, not a regional numerical season or species peak. Yamuna's site-level winter narrative is separately attributed to Delhi Tourism.

## Coverage and access

Delhi's runtime also loads Gautam Buddha Nagar (IN-UP-GB) because the design's Okhla sanctuary is across the state boundary. Catalogue/report coverage is labelled IN-DL + IN-UP-GB; individual hotspot regions remain correct and seasonal chart links retain primary-region scope. Lists/reports are deduplicated. EBIRD_ADDITIONAL_REGIONS accepts at most three validated codes; setting it empty preserves primary-only coverage. Any required-region failure fails discovery honestly instead of claiming complete combined coverage.

Reviewed access now covers Lodhi Gardens, Sunder Nursery, Yamuna Phase I/II and three Okhla sanctuary records. Identity/name/coordinate bounds prevent unrelated similarly named locations inheriting rules. Each record has its own review date and 90-day withholding policy.

- [Yamuna operator](https://www.delhibiodiversityparks.org/) and [Delhi Tourism](https://delhitourism.gov.in/dt/biodiversity_parks/yamuna_biodiversity_park.html) disagree on hours/phase windows. The app shows the conflict, contact and metro approach; fees/camera permissions remain unknown.
- [Okhla operator](https://obs-up.com/) publishes seasonal hours/Monday closure. Its [fee schedule](https://obs-up.com/fee-structure.php) cites a 2010 order: published amounts are labelled historical, not confirmed current pricing. Tripod/drone/commercial permissions and actual entrances remain unverified, even for an eBird point named Gate.

## Demo flow

Sign in; search Indian Roller or Common Kingfisher; open Plan a Shot and Compare reference photographs & gear. Compare field sample counts and credits. Open Northern Pintail or Gadwall's seasonal disclosure to see the scoped alternative. Choose Okhla or Yamuna from Hotspots; inspect reports, map, forecast light windows and access. Save a reference and refresh to show persistence. Explain missing data rather than substituting mock figures.

Use the standard server or Start-Tunnel.ps1 for a temporary public link. Do not publish .env, credentials, SQLite databases or build output. Public tunnels are temporary demo access, not a 24/7 deployment.

## Viva Notes

The architecture is still React/TypeScript, Express/Node and SQLite. No new dependency, schema, microservice or paid service was introduced. photos.mjs handles bounded evidence retrieval; discovery.mjs validates IDs/coverage; ReferenceComparisons renders independent samples; HotspotWeatherPanel computes simple local-clock planning windows; access.mjs/seasonal.mjs retain dated source snapshots.

1. **Why multiple photos?** They provide more than one example while exposing the small sample and missing fields; they still do not prove optimal settings.
2. **How do you prevent the wrong species?** Exact scientific-name/species-rank Wikidata matching and P18 or exact P180 depicts references, plus catalogue validation.
3. **Why count samples separately per setting?** A photo may contain ISO but no focal length. Using the same denominator would hide missing evidence.
4. **Are these best-time predictions?** No. Forecast daylight windows and explicit weather thresholds support preparation; bird activity and access need separate evidence.
5. **Why no difficulty score or annual percentage?** Connected data does not justify a measured rating, and histogram export requires authenticated access. Missing evidence remains an explicit requirement gap.

See PHASE_1_ACCEPTANCE.md for verification, manual checks and continuation status, and Development Record Entries 28–29 for chronology.
