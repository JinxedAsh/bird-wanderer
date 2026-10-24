# Destination links, browser history and sharing

Updated25 October2026. Implementation and verification are recorded separately; this is not a production deployment claim.

## User-visible behavior

A species, hotspot, community observation or photographer now has an ID-based app address. For example, `/?screen=species-detail&species=comkin1` identifies a particular species. Refreshing or signing in from that address restores its destination. The original `?notifications` push link remains supported. Browser Back/Forward and the app's Back control use browser history rather than an unrelated memory-only stack.

Detail selections wait for the actual external catalogue; they do not display an unrelated sample when an ID is missing. Unknown/invalid/out-of-region IDs show an honest error. Retry can reload discovery. Observation links retrieve the actual record through its authenticated endpoint, including current privacy checks; a URL never grants access to a private record. Community post/profile sheets update their ID address when opened or closed.

Header and post sharing generate a canonical app link. They do not copy observation captions, private notes, camera GPS, media URLs, session cookies or unrelated query parameters. A recipient must sign in and have permission to view the destination. A temporary tunnel link remains dependent on that particular tunnel/server being reachable; it does not become a permanent hosted service.

On supported browsers the Web Share API opens the platform chooser. Otherwise a secure browser can copy the link; a basic copy prompt remains available on LAN HTTP. Cancelling sharing is not reported as an error. The Android host receives a user-gesture navigation to its narrow share action, validates the trusted page and exact configured-server app URL, then opens Android's native text chooser. It sends only the URL. No native JavaScript bridge or new app framework is added.

## Modules and flow

- `lib/navigation.ts` parses and validates screen/ID query parameters, creates canonical links, writes small history indexes and chooses browser/native sharing. Unknown private query data is omitted from generated links.
- `App.tsx` restores routes after login and popstate, waits for discovery where needed, validates linked posts through the API and restores selected entities. Revalidating a linked record does not bypass media privacy.
- `CommunityScreen` synchronizes sheet destinations and shares the exact post ID. `Header` shares a canonical destination instead of the generic root address.
- Android `OriginPolicy.shareable` accepts only bounded root-app screen/ID links on the configured origin. Duplicate/extra parameters, credentials, foreign servers, fragments and API paths are rejected. `MainActivity` also requires a current trusted page and user gesture before opening the chooser.

## Verification

Local web suite121 tests passed; TypeScript and production build passed (main497.81kB). New checks cover round-trip species/site/post/person routes, legacy alerts, invalid/missing/duplicate IDs, history-state privacy, canonical sharing and browser fallback. Native policy tests, lint/assembly and independent browser/native acceptance are pending at this checkpoint; the Development Record will record their actual results.

Manual acceptance must distinguish real browser history/restoration, provider failures, private-record authorization, copy/chooser cancellation, native chooser evidence, physical-phone behavior and public deployment. A compiled handler does not prove a chooser opened or a recipient received anything.

## Viva Notes

1. **Why put IDs in the address?** Names may change or be duplicated. Stable source/record IDs allow refresh, bookmarks and sharing to resolve the intended entity.
2. **Why use browser history?** It makes browser Back/Forward and the app's navigation agree without adding a routing framework.
3. **What is popstate?** A browser event fired when navigating through history entries; the app reads that entry's URL and restores its view.
4. **Does sharing a private post reveal it?** No. The URL is a reference; the backend independently checks the signed-in viewer's current access.
5. **Why remove captions and unknown query fields?** A share action should not accidentally export private notes, coordinates or unrelated state.
6. **Why validate sharing again in Android?** Native actions must not trust arbitrary page input. The host checks the gesture, current page, origin, path and allowed screen/ID parameters before launching another app.
