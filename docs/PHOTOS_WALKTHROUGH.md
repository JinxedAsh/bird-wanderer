# Species photographs — Phase 1 walkthrough

Implemented 4 October 2026. This describes Entry 17: real species reference photographs. Camera metadata was added in the subsequent Entry 18; see [EXIF walkthrough](EXIF_WALKTHROUGH.md) for current metadata behavior. Statements below about pending EXIF describe the original photograph increment.

## What teammates will see

Explore, Search and species details now show a real reference photograph where an eligible source is available. Each photo identifies the creator and links to its licence and Wikimedia Commons file page. Details also show the file title, credit, attribution, usage terms, restrictions and Wikidata match. Images are cropped to fit the existing design frames; that change is disclosed.

A photograph illustrates the species. It is not evidence that somebody recently photographed that bird at the displayed hotspot. Sources may be older or depict captive birds. The camera-metadata badge still says metadata is not connected; the app does not invent camera settings.

## How the code works

1. eBird supplies the species ID and scientific name through the existing catalogue.
2. `SpeciesPhoto.tsx` requests the signed-in photo endpoint when a card approaches the viewport, or immediately for a detail hero.
3. `discovery.mjs` validates the ID against the catalogue before calling `photos.mjs`. An arbitrary browser query cannot supply a source URL.
4. The photo service searches Wikidata, then requires an exact scientific name (`P225`) and species rank (`P105`, `Q7432`). It reads up to three associated image filenames (`P18`). It never accepts the first fuzzy result merely because its name looks similar.
5. Commons image information supplies the thumbnail, original file URL, author, licence and credit fields. Only supported raster formats, approved HTTPS source hosts and supported licences with attribution are accepted.
6. React displays the thumbnail and plain-text credit. The original file URL is retained for provenance and future metadata work; this code does not download or parse the photograph.

This is a structured-data association, not image recognition or independent biological identification. Different taxonomies, missing Wikidata claims or an unsupported licence can legitimately produce no photo. Coverage of all eBird species is not promised.

## Main files

| File | Responsibility |
| --- | --- |
| `frontend/server/photos.mjs` | Provider requests, exact species matching, source validation, attribution normalization and cache |
| `frontend/server/discovery.mjs` | Existing protected API; validates catalogue IDs and exposes the photo route |
| `frontend/src/lib/discovery.ts` | Typed browser request and expired-session handling |
| `frontend/src/components/SpeciesPhoto.tsx` | Shared lazy image, safe credit links, fallback, cancellation and retry |
| `ExploreScreen.tsx`, `GlobalSearchScreen.tsx`, `SpeciesDetailScreen.tsx` | Reuse the photo component in existing screens |
| `frontend/src/App.tsx` | Passes the existing session-reset callback |
| `frontend/server/photos.test.mjs`, `discovery.test.mjs`, `frontend.test.mjs` | Provider fixtures, protected route and rendering/client regression checks |

## Reliability and safety

Provider calls have an eight-second timeout each. At most three species are looked up simultaneously; the pending limit is 30 distinct names. Requests for the same name share a promise. Successful and no-match results remain in a 300-entry memory cache for 24 hours. A server restart clears the cache; provider failures are not cached. No automatic repeated retries are issued.

Only CC BY/CC BY-SA unported versions 1.0, 2.0, 2.5, 3.0 and 4.0, or CC0 1.0, are accepted by this implementation. Other licences are conservatively skipped. Author and valid source/licence links are mandatory. Commons HTML is converted into plain text, and React escapes that text; it is never inserted as executable HTML. Required attribution and restrictions are retained. Source restrictions still need review before relying on a photograph for another purpose.

Photo requests do not delay the species catalogue. Cards initially show the existing placeholder; details show loading, no-match or error messages. A broken image uses a local fallback, and the detail screen offers retry. Aborted requests cannot update a screen after navigation. HTTP 401 uses the existing account reset; an unavailable external provider does not sign the user out.

## Checks and remaining manual acceptance

TypeScript checking, all 42 automated tests and the production build passed for this increment. Tests cover exact matching, rejected subspecies/deprecated claims, unsupported files/licences/URLs, inert attribution text, cache/concurrent behavior, malformed responses, signed-in route validation and expired-session propagation. Existing authentication, discovery, map and weather checks remain in the suite.

Live metadata lookups succeeded for Indian Roller, Common Kingfisher and Lesser Whistling-Duck. These checks prove provider integration, not visual identification. Browser evidence is recorded in Development Record Entry 17.

Manual checklist:

- Sign in; verify Explore and Search photos load without preventing search or navigation.
- Search by common and scientific name; open a result and confirm the matching reference and creator/licence/source links.
- Open a credit link; verify it does not select the enclosing species card. Select the species using the keyboard.
- Switch species quickly; verify an old response never replaces the new species photo.
- Check a 390-pixel layout and a physical Android phone, including long creator/title text.
- Check missing photos, broken images and provider outages; details must keep the species usable and offer retry for failures.
- Verify the unchanged metadata-unavailable badge and absence of invented camera settings.

Physical-device testing, forced browser provider outages and exact design acceptance remain pending. Hotspot report thumbnails and later-phase sample screens are outside this increment.

## Viva Notes

We added external reference photos without changing the existing eBird catalogue or account architecture. One backend module handles sources; one shared React component presents them consistently across three screens.

The important concepts are an authenticated API, structured-data matching, promises, bounded concurrency, caching, lazy loading, request cancellation and safe text rendering. `createPhotoService` keeps provider and cache state. `PhotoError` carries a safe status/message. `SpeciesPhoto` owns image loading and fallback state; `PhotoCredit` renders provenance. `AbortController` prevents stale screen updates, and `SessionExpiredError` reuses the existing login recovery.

1. **Why use the scientific name?** Common names vary; matching the catalogue's scientific name plus species rank avoids accepting a similarly named or subspecies result.
2. **Why a separate photo request?** Slow image providers should not stop the bird list or search from working.
3. **What does the cache do?** It reuses successful/no-match metadata for 24 hours, reducing repeated provider calls. Errors remain retryable.
4. **How do we avoid unsafe attribution HTML?** The server converts source markup into plain text; React escapes it when rendering.
5. **Does the photo prove location or camera settings?** No. It is a credited species reference. EXIF extraction and evidence-based photography logistics are separate upcoming work.

## Provider references

- [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access)
- [MediaWiki image information API](https://www.mediawiki.org/wiki/API:Imageinfo)
- [Commons metadata fields](https://www.mediawiki.org/wiki/Extension:CommonsMetadata/en)
- [Reusing Commons content](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- [Interactive request and maxlag guidance](https://www.mediawiki.org/wiki/Manual:Maxlag_parameter)
