# Hotspot access walkthrough

Reviewed 4 October 2026. Phase 1: practical access information inside the existing **Plan Visit & Entry Gates** disclosure.

## What changed and why

Maps previously provided a hotspot point but could not establish opening hours, charges or photography permissions. A small, dated set of official-source facts now supplements eBird records. This is deliberately limited coverage: two venues, three reviewed eBird records. It is not a live operator booking system or a verified entrance map.

| Venue | Reviewed eBird IDs | Coverage |
| --- | --- | --- |
| Lodhi Gardens | L2265071 | Seasonal garden hours and road approach; fee and camera rules remain unavailable. |
| Sunder Nursery | L2900901, L77838756 | Operator hours with conflicting last-entry information, ticket categories, photography scope and public-transport approach. |

Sources checked on 4 October 2026:

- [NDMC garden hours](https://ndmc.gov.in/services/ndmc_gardens.aspx): Lodhi seasonal hours.
- [Delhi Tourism approach](https://www.delhitourism.gov.in/entertainment/lodhi_garden.html): Lodi Road/near Khan Market. Separate tomb-specific free-entry information was not applied to the entire garden.
- [Operator timing](https://www.sundernursery.org/timing.php) and [visitor FAQ](https://www.sundernursery.org/visit-the-park.php): Sunder operating hours and approach. Summer timing and FAQ disagree on last entry (21:00/21:30); the app displays the conflict and asks the visitor to confirm season and current arrangements.
- [Operator tickets](https://www.sundernursery.org/book-tickets.php): visitor categories, concessions and separate event-ticket scope.
- [Operator photography rules](https://www.sundernursery.org/dos-and-donts.php): visitor DSLR allowance and potentially chargeable organised/props shoots. No standard camera-pass price, tripod or drone permission is inferred.

Each supported field links to its own evidence. Exact entrances, current closures and on-site charges have not been verified. Directions continue to target the eBird point.

## How the code works

1. The existing discovery service builds regional eBird hotspot records.
2. `hotspotAccess` checks provider, exact reviewed ID, approved name and coordinate bounds. Similar names or unrelated nearby locations receive null.
3. A matching record receives four nullable facts, source links, review date and an overdue flag. Discovery's existing 15-minute cache carries these fields.
4. `HotspotAccess` renders the facts in the existing detail disclosure. Missing fields remain unavailable. Sample records retain their previous rendering.
5. After more than 90 days, the UI withholds historical text and retains source links pending review. The API still contains the historical snapshot with its overdue flag; it must not be treated as fresh data.

There is no new endpoint, API key, database table or dependency. React escapes the text rather than rendering provider HTML. The snapshot is manually maintained; it is not refreshed by scraping pages on every visit.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| frontend/server/access.mjs | Reviewed facts, identity guards and freshness calculation. |
| frontend/server/access.test.mjs | Matching, stale data and discovery integration checks. |
| frontend/server/discovery.mjs | Attach access information to existing hotspot records. |
| frontend/src/types.ts | Describe nullable facts and source links for the frontend. |
| frontend/src/components/HotspotAccess.tsx | Dated, sourced, unavailable and overdue presentation. |
| frontend/src/components/HotspotDetailScreen.tsx | Reuse the existing access disclosure. |
| frontend/server/frontend.test.mjs | Rendering, safe text, missing values and overdue withholding. |
| frontend/package.json | Include the access tests in the normal test command. |

README.md, frontend/README.md, this walkthrough and DEVELOPMENT_RECORD.md explain the delivery and its limits.

## Verification and maintenance

All 75 automated tests, TypeScript checking and production build passed. Tests include exact provider/ID/name/coordinate matching, both Sunder records, unknown sites, review expiry, discovery attachment, escaped text and retained source links. Live eBird IDs/names/coordinates and the official pages were read directly. Browser evidence is recorded in Entry 23 of the development record.

Before adding a venue, inspect the official operator source and the actual eBird identity/coordinates, record only supported facts and attach evidence to each field. Do not resolve contradictory pages by guessing. The current review date applies to all curated records: changing it requires rechecking all existing sources; if records later have different review dates, give each record its own date before extending coverage.

Manual acceptance still requires a physical phone, current operator/on-site confirmation, exact design comparison and genuine outage checks. Browser checks do not establish the truth of a gate location or permission. Other hotspots remain unverified.

## Viva Notes

We enriched existing discovery records with a small reviewed dataset because eBird supplies bird-location information rather than admission rules. The backend chooses an exact trusted match; the frontend explains the evidence and what is missing. This preserves maps, weather, saves and sample-screen behavior without adding another service.

Important concepts: data provenance (where a fact came from), nullable fields (unknown is different from free), identity validation (avoid assigning facts to the wrong place), cache lifetime versus source age, and safe text rendering.

1. **Why not get fees from eBird?** Its discovery records do not provide reliable admission or photography rules.
2. **Why check ID, name and coordinates?** To avoid attaching one venue's rules to a similarly named or changed record.
3. **Does null mean free entry?** No. It means no supported fact was recorded.
4. **What happens when a snapshot gets old?** After 90 days the UI hides historical values while leaving evidence links available for review.
5. **Why show conflicting last-entry times?** Both come from operator pages; guessing would turn uncertain evidence into a false promise.
