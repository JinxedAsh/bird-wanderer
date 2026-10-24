# Identification practice and photography challenges

Updated 24 October 2026. This replaces the sample quiz's preselected answer, artificial 1,240 XP/seven-day streak and two-question loop. The existing question/photo/options/feedback design remains; start, resume and completion states make it usable as a complete practice flow.

## What the learner does

Open Bird quiz and start a ten-question practice. Questions require ten credited, exact-species Commons references from the existing eBird/Wikidata/photo pipeline. A short candidate list selects provider records; it does not substitute fictional taxonomy or generic images. Missing references are skipped; if ten cannot be loaded, the app shows a retryable error and creates no half-built session. Up to three photo requests run together; successful reference banks are shared for an hour. Starting may take longer on a cold provider cache.

Choose one option; none is preselected. Check Answer saves that answer and reveals the source-matched identification. Next advances only after the answer is stored. The tenth answer leads to a completion score and another-practice action. Refresh/restart resumes the current question and its saved feedback. Start over asks confirmation, marks the unfinished session abandoned and keeps legitimately earned answer XP; it does not create a completed practice day.

Each correct answer earns 50 XP once within that session. Repeating a saved request cannot award it twice; an altered answer conflicts. A new practice may earn further XP: this is personal learning, not a competitive or closed-book examination. Photo filenames/source links can reveal the species, so attribution is retained and this limitation is explicit. A quiz response does not verify the user's real bird identification or observation.

## Persistence and scoring

`server/retention.mjs` stores quiz sessions and answers in SQLite. A partial unique index permits only one active session per account. The session stores a question/photo/credit snapshot and its server-side answer key. Before submission, the browser receives the question and options, not the correct-option field. A composite answer key `(session_id, question_index)` prevents repeat credit. The API checks account ownership, current index and valid options; changing client XP cannot change database totals.

A practice day counts only when the server completes all ten questions. Streaks use consecutive completion dates in Asia/Kolkata, calculated from server timestamps; completing again on the same day does not add another day. A missed day breaks the active streak. Streaks do not use the device clock or an uploaded photograph's unverified EXIF time. XP is computed from stored correct answers, including partial sessions.

The browser client aborts requests when leaving the screen/account, handles session expiry and reload/retry, and prevents duplicate UI submissions. The quiz is a separate lazy-loaded React chunk so discovery does not download it on first load. The existing photo-credit component is reused through a narrower attribution type; author, licence, source, credit/usage/restriction information remain available.

Authenticated API: GET `/api/retention`; POST `/api/retention/quiz` with optional boolean restart; POST `/quiz/:id/answer` with index/optionId; POST `/quiz/:id/next` with index. Answer/next retries are idempotent for the immediately current/advanced question, including the final completion response. Older stale actions return a recoverable conflict. The router limits account mutations to 40/minute.

## Weekly photography challenges

The quiz's collapsible challenge panel uses current account-owned journal records **published** since Monday midnight in Asia/Kolkata:

- Three distinct reported species.
- Two distinct reported hotspots.
- One photograph with actually parsed ISO and aperture metadata.

The server computes progress from observations/media each time. These are user-reported activity goals, not independent bird/visit verification, measured photographic quality or ethics certification. Historical captures published this week can count; missing capture-time zones do not become a false weekly capture claim. Deleting a record reduces its contribution, and a new week starts from that week's records. Challenge progress awards no additional XP in this increment. Open journal provides the existing logging route; there is no incentive to approach nests or disclose sensitive coordinates.

## Verification and limits

104 local tests pass, TypeScript/production build pass. Retention HTTP tests cover ten-question completion, server-only key exposure, invalid/out-of-order/foreign-account actions, duplicate answer/final-next retries, database restart/resume, score/XP/streak break, provider-bank failure/recovery, explicit restart, bounded request concurrency, actual uploaded metadata, challenge deletion and week rollover. Frontend regression verifies that the initial screen has no sample XP/streak or selected answer. Test chat also passed live ten-question completion/scoring/double-click/resume, in-app restart cancel/confirm/Escape/focus,320/390px layout, image retry and controlled provider-error recovery; challenge/deletion/account tests passed separately. Exact GitHub delivery and the temporary-folder cleanup restriction are recorded in Development Record Entry35.

Live photo availability, image failure recovery, all mobile interactions and actual physical-phone acceptance require their own evidence; unit fixtures are not live-provider proof. This is a fixed starter practice bank, not a broad adaptive curriculum. No machine-learning identification or automated sighting verification was added.

## Viva Notes

1. **Why grade on the server?** Browser state can be changed or retried; the server validates ownership/question order and calculates XP from saved answers.
2. **How are duplicate points prevented?** One database answer per session/question; identical retries return the stored result and changed answers conflict.
3. **What counts toward the streak?** A completed ten-question practice on a server-recorded local day; partial sessions do not count.
4. **Why show a photo-provider error?** Inventing a replacement image could teach an incorrect identification. The app preserves attribution and lets the user retry.
5. **Are challenges verified visits?** No. They measure the owner's current reported records and parsed metadata, which the interface explicitly states.
6. **Why lazy loading?** It keeps the quiz out of the initial discovery download while using the same React architecture and no new framework.
