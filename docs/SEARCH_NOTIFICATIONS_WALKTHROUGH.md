# Global search, social notifications and paging — walkthrough and Viva Notes

Updated 24 October 2026. This increment builds on the existing screens and observation privacy rules.

## What users can do

Global Search searches the loaded external bird/hotspot catalogue and independently queries registered birders and stored accessible observations. A birder no longer needs a post to be discoverable. People results open that exact profile; post results open that exact observation and its discussion. The existing per-account search-history controls remain. Server lookup has a short typing delay, loading/error/retry states and separate Load more controls for people/posts.

A new follow creates one Followers notification. A comment notifies the observation owner; tagging a stable `@birder-…` handle notifies that person only if they can currently read the post. Duplicate tags count once; at most ten distinct tagged people are considered per comment. A tagged owner receives one mention rather than both a comment and mention alert. Your own actions never notify you. These are in-app social events independent of the sighting-alert opt-in; they do not claim real push delivery.

Opening a notification saves its read state and opens its real source. Mark all read updates sighting, forecast and social events together. Unfollowing removes the corresponding follower event. Deleted comments/observations remove dependent notifications. A mention grants no photo/post access: the server rechecks current visibility when listing or opening it. Notification previews contain generic action text rather than copying comments, photographs or coordinates.

Own journal/profile/life-list records and community lists can load additional pages instead of silently stopping at the first 500 records. Birder lists use 50-person pages. Public profile counts use all currently visible records, rather than the first 500. A post opened from search outside the loaded feed remains available after a reaction/comment refresh and is revalidated against current privacy.

## Modules and request flow

- `community.mjs`: parameterized global people/post search, page validation, real profile totals and existing social actions. A shared SQL visibility prefilter prevents inaccessible rows from using up a search page; the observation module's `canRead` remains the final authorization check.
- `social-notifications.mjs`: stored action references, deduplicated follow/comment/mention creation and current-source serialization. No second copy of private source content is stored in notification text.
- `alerts.mjs`: combines the existing sighting/forecast inbox with social events, preserving account-scoped individual/all-read behavior.
- `observations.mjs`: bounded own/feed pages and notification service wiring. The same observation serializer/media access rules remain in use.
- `GlobalSearchScreen.tsx` and `observations.ts`: server query, cancellation when a query/account changes, loading/failure recovery and separate result pagination. Bird/hotspot searches retain existing behavior.
- `App.tsx` and `CommunityScreen.tsx`: exact source-ID destinations, profile sheets and refreshed loaded pages. `NotificationsScreen.tsx` adds the required Followers filter.

Follow/comment and corresponding notification writes use one SQLite transaction: both succeed or both roll back. Message/alert storage remains separate but shares the authenticated account and privacy policy. A withheld hotspot is excluded from the searchable location field for other viewers, preventing search counts/results from revealing it indirectly. User-written public notes remain user-supplied text and can themselves include location information.

## Verification boundaries

110 automated tests, TypeScript and the production build pass locally. New integration coverage includes a registered person with zero posts, matching observations older than 500 records, 502-record profile totals, page separation, withheld-location search, owner/private/follower boundaries, malformed search/page parameters, social deduplication/read/restart, deleted source cascades and injected transaction failures. Initial rendering describes real server lookup rather than demo data. The existing sighting self-alert assertion now checks sighting events specifically because a genuine follower event can coexist in that account's inbox.

Scoped browser checks are in progress. Physical-phone/LAN, public deployment, real Firebase delivery and complete design approval remain pending. No Firebase project exists yet. Social notifications are in-app only in this increment; the optional push queue currently handles sighting/forecast sources. Search reflects current database state per request, not an offline search index or a promise of unlimited hosted uptime.

## Viva Notes

1. **Why does people search no longer depend on posts?** It queries the users table directly and returns only public directory/profile fields; an empty journal does not erase someone's account identity.
2. **Why filter privacy before pagination?** Otherwise inaccessible records could occupy a page and hide legitimate matching results. We also keep the final authorization check before serialization.
3. **How can search leak a location without returning coordinates?** A query matching a hidden hotspot could confirm where a record belongs. The server excludes withheld hotspot names from that viewer's searchable fields.
4. **Why use transactions for social alerts?** A failed notification write must not leave half of the intended action saved. SQLite commits both the action and event together or rolls both back.
5. **What happens if a tagged post becomes private?** The stored event is only a reference. Read-time access checks hide it, direct opening is denied, and media access is checked separately.
6. **Does a notification prove push was delivered?** No. This is a persistent in-app inbox. Firebase setup and real device receipt require separate evidence.
