# Community persistence

Updated 24 October 2026. This increment connects the existing community design to stored account actions. It does not claim automated moderation, verified sightings or accurate historical weather.

## What a teammate sees

The feed contains visible user observations rather than sample photographers. Following a birder adds their eligible posts to Following. Likes, saved posts and comments survive refresh and server restart. People lists actual accounts; its biography sheet uses the person's saved profile and visible observation counts. Near You requires a selected point and matches public hotspot names in the loaded catalogue within 50 km; withheld locations cannot match.

An observation note is also the simple field-tip/comment mechanism. Its author or the post owner can delete it. A report stores a reason and optional detail for later review; the confirmation explicitly says that review has not occurred. There is no moderator dashboard or automatic enforcement in this increment.

## Screen → server → database → result

1. A signed-in reader presses Follow. App sends a PUT with the intended true/false state and the existing session cookie.
2. The Express router validates the account and rejects self-following. SQLite stores a unique follower/followed pair.
3. The app reloads its feed and people. The same server visibility rule determines whether follower-only records and image URLs are now readable. Unfollowing revokes access immediately on the next request.
4. Likes and bookmarks similarly store the intended boolean state. Repeating an identical request cannot add duplicate likes because the database key includes both post and account.

Every post action first checks observation visibility. Knowing an ID does not permit liking, saving, commenting on or reporting another person's private record. Global Keep Private continues to override public/follower observation settings. Images use the same policy; originals and exact EXIF coordinates are not exposed.

## Important files and API

- `frontend/server/community.mjs`: SQLite social tables, people lookup, follows, interactions, validation and a 60-mutations-per-minute account limit.
- `frontend/server/observations.mjs`: one shared visibility/serialization policy, now including stored social statistics.
- `frontend/src/lib/observations.ts`: typed browser requests and conversion to existing screen models.
- `frontend/src/App.tsx`: account-scoped reloads, aborted stale requests and serialized mutations.
- `frontend/src/components/CommunityScreen.tsx`: existing filters/sheets connected to the actual service; report and authorized comment removal controls.
- `frontend/server/community.test.mjs`: real HTTP requests across three accounts and a database restart.

All following routes sit below `/api/observations/social` and require a session: GET `/people` and `/people/:id`; PUT `/follows/:id`; PUT `/posts/:id/like` and `/save`; POST `/posts/:id/comments`; DELETE `/comments/:id`; POST `/posts/:id/reports`. Requests are origin-checked by the existing app middleware. Parameterized SQL handles user input; React renders comments as text.

## Verification and practical limits

Local suite: **94/94 passing**, TypeScript and production build passing. The social test checks follow grant/revocation, third-account denial, idempotent actions, report/comment validation, owner-only deletion, persistence after reopening SQLite, private-profile denial, cascading cleanup, rate limiting and recovery. Browser results are recorded in Development Record Entry 32 when available.

The people list currently returns the first 50 accounts, public profiles inspect up to 500 records and show up to 100 visible observations, and comment responses return the first 100 comments in chronological order. These are bounded MVP lists, not pagination or unlimited totals. Counts on public profiles describe the records visible to the viewer. Direct follow is immediate, not an approval-request system. Feed and profile data refresh after this user's actions or page reload; there is no live socket stream. Saved posts are bookmarks, not copies: loss of viewing permission also removes access to the original.

Native browser file selection and physical-phone acceptance remain separate manual checks. No actual provider outage or push delivery is proven here.

## Viva Notes

**Why SQLite tables instead of local state?** Local state disappears on refresh; account-related database rows survive restart and work across devices using the same backend.

**Why send the desired like state?** A retried `liked: true` request should still mean one like. A blind toggle could undo itself on retry.

**What protects a follower-only image?** The image endpoint checks the current session, profile policy, observation visibility and stored follow relation on every request.

**What is a composite primary key?** A key made from two columns; `(observation_id, user_id)` prevents duplicate likes/bookmarks per person.

**What does a report do?** It creates or updates an open review record. It does not prove that a moderator acted or that an identification is wrong.

**Why no weather value on the post?** An upload's unverified capture time/location cannot justify a historical forecast claim. Missing environmental evidence stays labelled unverified.
