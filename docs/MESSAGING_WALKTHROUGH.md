# Field messaging — walkthrough and Viva Notes

Updated 24 October 2026. This increment replaces the chat prototype while retaining its conversation cards, filters, context strip and composer.

## What changes for a user

Open Profile → Field Chats → new-chat icon and choose a real registered birder. Search matches participant names and any stored message or attached public hotspot, including older messages. Gear and Okhla filters intersect those results. No sample participants, automatic replies, fabricated online presence or copied GPS coordinates are produced.

A foreground chat refreshes every five seconds, pauses while hidden and refreshes on return. This is near-real-time polling, not an instant WebSocket delivery guarantee. Messages survive refresh and server restart. “Stored on server” confirms the API stored a message; it does not claim the recipient read it. The unread marker uses the last displayed message acknowledged by that account.

Photograph attachment selects one of your existing observations already visible to the recipient. It never silently changes privacy. The recipient's current access is checked again when rendering each message and serving its photograph. Revocation/deletion produces an unavailable attachment; sending a message does not copy precise EXIF/GPS or permanently grant photo access. Public hotspot attachments are validated against discovery and open the actual hotspot ID. Free text is user-supplied and can itself contain personal information; privacy settings cannot recall text already sent/read.

## How the code works

- `server/messages.mjs` creates ordered participant-pair conversations, stored messages, per-person read watermarks and a mutation rate limit. The observation router mounts it after authentication and reuses the single observation visibility function.
- `src/lib/messages.ts` handles API requests and session expiry. A cryptographically random UUID identifies one intended send, including on a local-network HTTP demo where `crypto.randomUUID()` is unavailable.
- `FieldChatScreen.tsx` loads real conversations, polls visible screens, handles loading/errors, preserves failed-send drafts and opens focus-trapped birder/photo/hotspot/profile pickers. Requests abort on unmount; the account key prevents state leaking between sessions.
- `App.tsx` opens shared observations/hotspots by source ID. `ProfileScreen.tsx` provides an entry point even for a new account with no posts.

Each sender/request UUID is unique in SQLite. A repeated identical send returns the existing message; a changed payload with the same UUID returns conflict. This prevents a network retry creating duplicate messages. Membership is checked on every thread/read/send/attachment request, and a followers-only profile requires a current follow for new contact. Existing messages remain available to their participants.

Lists use bounded pages (100 conversations, 200 messages). “Load more/older” fetches additional pages; subsequent polls refresh all loaded pages, including attachment permission checks. Searches are parameterized SQL with a 100-character bound; messages allow at most 2,000 characters. Mutation rate limiting is 60 changes/minute/account. Contact permission is rechecked after an awaited catalogue lookup.

## Verification and limitations

The local suite has 107 passing tests after this increment, plus TypeScript and production build checks. New HTTP tests exercise ownership, three-account isolation, retries/conflicts, malformed input, older-message search, read watermarks, persistence/restart, pagination, follower contact, rate limiting, eligible photo attachments, follow revocation, unavailable/deleted attachments and validated public hotspots. Initial-render regression rejects demo content. Browser QA is in progress; this file does not yet claim browser acceptance.

Firebase is unconfigured: the user has no project yet. No push delivery, end-to-end encryption, physical-phone acceptance or provider-outage guarantee is claimed. Messages are authenticated, participant-restricted server records; use HTTPS for public hosting. Exact supplied-design approval remains pending.

## Viva Notes

1. **Why polling instead of a new messaging framework?** Five-second foreground polling fits the existing Express/React project, avoids a second connection stack and is easy to explain. It has a stated latency/network cost.
2. **How do you prevent duplicate sends?** The client reuses one UUID for the same attempted message; SQLite enforces uniqueness and the server returns the saved result on an identical retry.
3. **Can someone guess a conversation URL?** Every request verifies that the authenticated account is one of its two participants; others receive not found.
4. **Why share an observation reference rather than duplicate its photo?** References reuse existing privacy checks. Revoking access or deleting an observation makes the attachment unavailable without maintaining a second photo copy.
5. **How does unread state work?** Each participant stores a read-through timestamp belonging to a displayed message. Newer messages from the other person are unread; acknowledging an older message cannot move that watermark backwards.
6. **Does “stored” mean delivered to a phone?** No. It confirms database storage. Real Firebase/device delivery is a separate, currently unconfigured acceptance item.
