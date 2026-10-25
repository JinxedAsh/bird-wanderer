# Species recordings

The species screen's speaker button opens **Recorded calls**. The app no longer animates simulated playback. A real recording appears only when an exact species-rank Wikidata entity links a Commons audio file with accepted attribution and licence metadata. Coverage is intentionally incomplete.

## How it works

1. Open a catalogue species and tap the speaker or expand Recorded calls.
2. The authenticated API resolves the source ID through the existing eBird catalogue. A caller cannot provide an arbitrary media URL.
3. `recordings.mjs` reuses the scientific-name/rank resolver, follows P51 and checks the corresponding Commons file. Fixed HTTPS hosts, supported audio MIME/media types, a reported size of1–20MiB and recorder/licence metadata are required. Accepted licences are CC BY/CC BY-SA1.0–4.0 and CC0; other or missing licences are rejected.
4. The browser receives the source, licence and credit alongside a direct Commons audio URL. Native HTML audio controls handle play/pause/seek/volume. Nothing autoplays or preloads the media. Closing the disclosure or hiding the page pauses playback.
5. Missing matches, failed providers and browser codec errors have distinct visible messages. Provider and playback retry controls are separate. Discovery and photographs remain usable.

Three provider lookups run at once; at most20 distinct names may be pending. Simultaneous same-species requests share work. Up to200 successful/no-match responses are cached for24hours; provider failures are not cached. This is an in-memory cache, not new stored user data.

The reported size is checked before returning a link; the app does not proxy/download/enforce a streaming byte limit. Browser playback transfers data directly from Wikimedia. A source statement is evidence of an association, not independent acoustic verification. Different browsers may support different codecs. Avoid playback near wild birds.

## Source evidence and limitations

The [P51 property documentation](https://www.wikidata.org/wiki/Property:P51) defines a Commons sound association; the [MediaWiki imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo) supplies MIME, media type, size, URL and formatted attribution metadata. Attribution is stripped to text and rendered as text, not executable HTML.

A live26October lookup resolved Cuculus canorus/Q18845 to [Cuculus canorus.ogg](https://commons.wikimedia.org/wiki/File:Cuculus_canorus.ogg), Vladimir Yu. Arkhipov, Arkhivov, CC BY-SA3.0. Alcedo atthis, Coracias benghalensis, Fratercula arctica and Passer domesticus returned no supported match. This does not establish that no recording exists elsewhere. No alternative recording is silently substituted.

## Verification and demo

Focused automated checks cover exact species/rank, file identity, attribution sanitization, disallowed hosts/licences/media/size, empty data, retryable provider errors, cache expiry, request sharing and queue limits. HTTP tests check authentication, source-ID validation and catalogue-name mapping; client checks cover malformed responses, no-match and session/network/provider failures. Browser and final delivery results are recorded in Development Record Entry45.

For a demo, open a species, tap the speaker and inspect the real player or honest unavailable message. If a recording is available, verify source/recorder/licence, then play quietly with headphones. Collapse the disclosure and confirm it stops. Do not describe a synthetic test tone as a live bird call. Physical Android/codec testing remains separate from desktop browser checks.

## Viva Notes

- **Why use Wikidata and Commons?** They provide a species-to-file association and published attribution/licence metadata without adding an audio hosting service.
- **How do you avoid playing the wrong species?** Scientific name and species rank must match exactly; the file must be explicitly linked by that entity. This verifies the data association, not the sound independently.
- **Why might no recording appear?** The exact species may lack a P51 link, or its file/licence/metadata may fail validation. The app does not guess a substitute.
- **Why use native audio controls?** The browser already implements playback, accessibility and seeking; we avoid an unnecessary player library and simulated progress.
- **What is a cache versus a concurrency limit?** A cache reuses completed results. The concurrency limit bounds active provider work; the pending map shares duplicate requests and bounds waiting names.
