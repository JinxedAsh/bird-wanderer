# Real photographs, observations and account records

Implemented 23–24 October 2026; first full-cycle vertical slice. Delivery/check status is tracked in PROJECT_COMPLETION_PLAN.md and the Development Record. This replaces the upload/journal/profile sample records, not the rest of the application at once.

## The user flow

Add photograph opens the existing upload screen. Choose your own JPEG/PNG, select a catalogue species and hotspot, enter local observation time/notes and choose visibility. The default is private. The server reads actual EXIF; unavailable camera fields stay unavailable. It does not identify or verify the bird and does not attach today's weather to a historical photo. Successful save enables View Journal. Journal, life list and profile photos use the stored records after refresh.

Screen -> request -> backend -> storage -> result:

1. File input -> POST /api/observations/media (binary, session/origin protected) -> magic/type/size/decode checks, sharp sanitization and exifr metadata -> private media directory plus media table -> staged media ID and normalized EXIF.
2. Publish -> POST /api/observations -> validate media ownership, exact catalogue IDs, date, notes and visibility -> observations row -> saved record. The media ID makes a repeated identical publish safe; a changed privacy/payload conflicts rather than duplicating or silently changing it.
3. Journal/profile -> GET /api/observations and /profile -> owner-scoped SQL -> saved photographs, metadata, life-list membership and computed totals. Trips means distinct observation-date/hotspot groups, not tracked travel itineraries.
4. Delete/life-list change -> owner-only DELETE/PATCH -> SQLite update (and media deletion for an observation delete) -> refresh confirmed records. Failed requests show errors; stale responses from another account are ignored and requests are aborted on account changes.

## Validation and privacy

- JPEG/PNG only, up to 10 MB input/40 megapixels; actual decoding required, single-frame images only. Stored copy is re-encoded JPEG up to 4096px. Original file is not retained; this limitation is visible before posting.
- exifr parses bytes, never a user-supplied path. sharp strips embedded metadata; shared image URLs cannot leak original EXIF GPS. Only camera/exposure fields are exposed as public metadata; exact GPS is owner-only data.
- UUID storage names, private disk outside public assets, authenticated media route with private/no-store responses; no static public media directory.
- Private observations stay in the owner's journal. Followers-only needs a stored follow relationship (the follow UI is a later slice). Public records also respect profile visibility. Keep private globally prevents nonowner reads, including previously public records/media; reversal is explicit.
- Shared locations are hotspot-level or withheld. Conservative exact-location protection applies to every species; no unverified protected-species classification is claimed. Do not type private coordinates into public free-text notes.
- Two uploads may process simultaneously; disconnects retain a slot until the work finishes. Body-parser errors release admission slots. 500 MB/account and 25 staged-photo limits are rechecked before database insertion. Unattached uploads older than 24 hours are pruned on the owner's next upload; linked photographs are not pruned. Database insertion failure removes the new file.
- Current list endpoints return the newest 500 rows; pagination is still required for larger collections. High-resolution originals, backups, production storage and device acceptance are not certified by local tests.

## Data and setup

New tables: profiles, media, observations and follows (relationship foundation). All retain user foreign keys. Existing users/sessions/discovery saves/history are preserved. Node creates missing tables at startup. MEDIA_PATH defaults to frontend/data/media; back up SQLite and the media directory together. Both remain private/ignored by Git. Do not move media into public or dist.

New libraries have specific purposes: sharp validates/decodes/re-encodes images; exifr reads actual EXIF. No framework or service split was introduced. Node 24 and pnpm install remain the setup; CI verifies dependency installation/build on Linux too.

## Verification and limits

Final source verification: all 93 automated tests, TypeScript and production build passed after the quota, disconnect and privacy/copy fixes. Tests cover real metadata/GPS, missing EXIF, corrupt/mislabeled/oversized input, sanitized output, two-account ownership/media privacy, global Keep private, restart persistence, same-media retry/privacy conflicts, failure cleanup and disconnected-worker concurrency. The worker test uses a controlled decoder barrier; it is not a real provider-outage test.

Test chat's live HTTP tests passed invalid/oversized input, supplied/missing EXIF, metadata stripping, private/followers denial, public reads, owner changes/deletion and Keep private reversal. Browser checks passed empty account journal/life-list, profile/settings refresh and account switching at 320/390px, with clean console. Browser file selection remains manual: both documented chooser attempts timed out, so API upload evidence is not presented as an end-to-end file-picker pass. Positive follower access has a seeded-relationship server test; the UI follow path remains future work.

## Viva Notes

1. **Why stage the upload first?** It provides actual validated metadata before posting; ownership and single-use media linking prevent attaching someone else's file.
2. **Why re-encode images?** Public copies must not retain private GPS or other embedded metadata. The original is not served or retained.
3. **Why both frontend and backend validation?** The frontend helps users; direct requests can bypass it, so the server validates all important inputs and permissions.
4. **How does privacy apply to image URLs?** The media route checks the linked observation and current profile/follow visibility on every request, with no-store caching.
5. **What happens if the response is lost?** Retrying an identical publish with the same media ID returns the same observation; differing privacy/data returns a conflict.

Remaining next slices: real community interactions/follows/comments/reports, alert subscriptions/delivery, complete quizzes/challenges/messaging and Android. Existing discovery and its evidence limitations remain unchanged.
