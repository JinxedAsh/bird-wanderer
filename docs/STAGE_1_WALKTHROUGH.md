# Stage 1: frontend stabilization

Implemented 4 October 2026. This increment preserves React, Express, SQLite, the existing screen layouts and working authentication. It does not implement later-stage persistence, external discovery, maps, uploads/EXIF, privacy enforcement, messaging, alerts or gamification.

The user confirmed that the final deliverable must be an Android app/APK. The current runtime remains a mobile web interface. Android packaging and physical-device verification remain required future work; this stage does not claim to deliver an Android installation package.

## Changes and how they work

- Search filters every available bird, hotspot, community author and post, then renders all matches with `map`. The previous hotspot index of 1 skipped single-result searches. People are deduplicated by their handle with a `Map`; their displayed counts describe available community posts rather than invented profile statistics. The original search card layout remains.
- `handleToggleSaveHotspot` in App.tsx updates `hotspotsList`. The list and detail screen read the same record, so their bookmark values agree. Search and Saved/Popular filters are both applied. Bookmarks still reset on reload or login because persistence is outside Stage 1.
- Community keeps `selectedPostId`, then finds the current post in its props each render. Adding a comment updates the shared posts array, and the open panel receives the new comments immediately. Empty comments are rejected; UUID creation and toast calls occur outside state updater functions.
- Following defaults preserve the prototype's existing Pro-author behavior, but an explicit unfollow now overrides that default. Unknown authors display their actual name/handle instead of Maya's biography.
- Settings, the header and newly created sample posts use the current account/profile identity. Profile editing trims and validates the display name. Reopening canceled edits reloads the saved session values.
- `sightingsThisWeek ?? 0` preserves zero. Unlike `||`, the nullish-coalescing operator falls back only for null or undefined. Missing species show an explanatory message rather than opening a different bird.
- `useDialogFocus` is a small shared hook for the five existing sheets: community details, photographer profile, profile edit, life-list detail and privacy settings. It focuses the sheet, handles Escape, keeps Tab/Shift+Tab inside, prevents background scrolling, and restores focus when closed. Its effects remove listeners and restore scrolling during cleanup. Sheet labels, icon labels and keyboard controls improve accessibility without adding screens. Short screens and browser zoom can scroll sheets.
- Toast and simulated-audio timer IDs live in refs. A ref stores a value without triggering a render, and effect cleanup cancels timers when their owner unmounts. React state updaters now calculate state without showing toasts inside them.
- GPS/audio/planning/share messages accurately describe unsupported behavior. Existing controls remain available. Sharing through the browser's native share API still works where supported; unsupported browsers no longer claim a clipboard write occurred. Entity-specific URLs and clipboard sharing remain later work.
- Vite loads the existing `.env` configuration. Its frontend port follows APP_ORIGIN; the API proxy follows PORT/HOST. Development and preview both proxy `/api`, preserving the existing origin check and cookies. Invalid API port configuration fails with an explanatory error. Preview requires an independently running API.

## Automated verification

From frontend: `pnpm lint`, `pnpm test`, `pnpm build`.

Eleven tests pass: five existing authentication groups, four frontend-rendering regressions and two HTTP proxy tests. Rendering tests compile only the relevant existing TSX files with the already-installed esbuild, then use React's server renderer; no new testing framework is installed. Proxy tests use isolated in-memory accounts and temporary preview files. No personal development accounts are touched.

Rendering tests do not exercise clicks, keyboard events, CSS layout or browser cookies. The build confirms the application can be bundled, not that it matches the designs pixel for pixel.

## Manual acceptance checklist

1. Start with `pnpm dev`; open http://localhost:3000. Register/login/logout and verify session restoration after refresh. Check the signed-in name/email and header profile image.
2. Search Okhla: its single hotspot must appear. Clear search: every available bird/hotspot should appear in the appropriate category. Search nonsense in All/People/Posts: show the empty state. Search Maya: only matching author/post content should appear. Test recent-search buttons and category pills.
3. Save a hotspot in its detail screen; return to Hotspots > Saved and confirm it appears. Unsave and confirm it disappears. Search inside Saved and Popular; both search and selected filter must apply.
4. Open community comments and submit a nonempty note. Confirm it appears immediately with the signed-in name and updated reply count. Whitespace-only comments must not submit. Like/unlike and bookmark/unbookmark; check counts/messages and repeated clicks.
5. Open Sourabh's biography, unfollow, then choose Following; the post must be excluded. Follow again and verify it returns. This follows the existing prototype defaults and remains temporary state.
6. Open each of the five sheets with the keyboard. Tab and Shift+Tab must stay inside, Escape must close, and focus must return to the trigger. Try close buttons, backdrop clicks, short screens and 200% zoom. Verify normal-page scrolling resumes afterward.
7. Edit a profile name: spaces should be trimmed, fewer than two characters rejected. Cancel edits, reopen and confirm canceled drafts were discarded. Repeat with privacy choices. These values remain session-only.
8. Open Great Indian Bustard: zero sightings should remain zero. Open an unavailable species from a sample checklist/photo: show the explanation rather than another species.
9. Test share cancellation/errors and unsupported-browser messaging. Verify simulated GPS/audio/planning actions do not falsely claim a real operation occurred.
10. Compare all 15 screens against docs/design-reference at mobile and desktop widths. Verify images, header/footer positioning, text overflow, touch controls and keyboards. Source inspection and reference-image viewing alone do not establish fidelity.
11. For preview: build, run `pnpm dev:server` in one terminal and `pnpm preview` in another. Stop the development frontend first. Verify login and session restoration through preview. Optionally test APP_ORIGIN=http://localhost:3100 and PORT=3101 in local .env; revert afterward.

## Remaining boundaries

Exact visual fidelity and browser interaction have not been certified because agent browser access was previously denied. Layouts/styles were preserved except functionality/accessibility adjustments. The search, community and hotspot reference images were inspected.

Journal/life-list/profile aggregate reconciliation, observation photograph/species consistency, fabricated metadata, privacy settings enforcement, notification destinations, simulated chat, quiz completion and persistent records remain for later stages. Those known limitations are not solved by this increment. Real registration/login and persistent sessions remain implemented.

## Viva reminders

The main concepts are shared state (one source of truth), props/callbacks, derived state, immutable array updates, pure updater functions, refs, effect cleanup, accessibility and development API proxying. There are no new application classes or backend services in this increment.
