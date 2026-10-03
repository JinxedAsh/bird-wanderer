# Bird Wanderer: initial development review

Reviewed 3 October 2026. Source: the shared Group 13 Google Doc and the existing frontend source.

**Historical snapshot:** statements below about missing dependencies, untracked files and absent authentication describe the initial repository only. Authentication and repository setup are now implemented. See README.md, PROJECT_CONTEXT.md and docs/STAGE_1_WALKTHROUGH.md for current progress and remaining verification.

Follow-up: the user confirmed that all four phases are mandatory, the final designs must be followed exactly, and the full deadline is 20 October 2026. The first checkpoint is Tuesday 6 October. See PROJECT_CONTEXT.md for the current agreed constraints and living documentation link. The initial questions and two-week sequence below are historical proposals, not the current confirmed schedule.

## Review limits

This is a source-level review, not a completed runtime or visual audit. Dependencies and a lockfile are absent. Node, npm, and Git are not on the default shell PATH; bundled Node and Git were located. No installation, build, or browser test has been performed. The document text was accessible, but its exported Markdown omitted embedded diagram and screen images. Exact design fidelity still needs visual verification.

The frontend directory is currently untracked in Git. Preserve a baseline before implementation. No application code was changed during this review.

## What already exists

React and TypeScript components cover all 15 named screens. Tailwind handles styling. App.tsx holds shared sample data in React state; components implement navigation, filtering, and some temporary interactions. No backend implementation, persistent data store, API requests, real geolocation, or push service integration was found in src.

## Requirements mapped to implementation

| Screen | Current implementation | Work needed |
| --- | --- | --- |
| Authentication | Timed success response; reset only shows a toast | Real accounts, sessions, validation, reset, logout and authorization |
| Explore | Sample species, fixed greeting/location/weather | Location selection, sourced discovery, weather and freshness |
| Species detail | Sample fields; temporary bookmark and simulated audio | Sourced profiles, sightings, logistics, persistent bookmarks; real audio if required |
| Community | In-memory posts, likes and comments | Stored posts, user relationships, access rules, pagination and reporting |
| Upload/log observation | Cycles sample images and constructs sample metadata | File input, validation, storage, EXIF extraction, metadata review and visibility enforcement |
| Hotspots | Static map image with positioned buttons | Geographic map, location-based queries and consistent saved filters |
| Hotspot detail | Sample logistics and local save toggle | Sourced sightings/weather and shared persistent saved state |
| Journal | In-memory entries and deletion | User-owned records, edit/delete rules and derived statistics |
| Life list | Species fixture flags and hardcoded count | Unique species derived from the user's journal, plus a separate wishlist |
| Quiz | Fixture questions and temporary score | Agreed quiz scope, results persistence and valid image sources |
| Messages | Fixture conversations and simulated reply | Real participants, stored messages, authorization and delivery behavior |
| Profile | Temporary edits and sample statistics | Stored profile and statistics derived from actual records |
| Search | Local birds/hotspots filtering; fixture people/posts | Search across actual records with correct empty results |
| Notifications | Fixture list; title-based navigation | Subscriptions, event generation, read state, structured targets and push delivery |
| Settings | Temporary UI preferences | Persisted preferences enforced by backend and media responses |

## Concrete defects to address

1. **Authentication is simulated.** AuthScreen.tsx accepts submission through a timer without verifying credentials. Password reset reports success without sending anything. App.tsx starts in Explore and has no session model.
2. **Changes disappear on reload.** App.tsx initializes from mockData and stores edits only in component state.
3. **Privacy controls do not govern publication.** LogObservationScreen.tsx holds visibility and hideExactLocation state but does not include or enforce them when constructing a post. Every observation is inserted into the community list. Sensitive-species protection must be enforced by the server, including public media metadata, not merely by a switch or hidden label.
4. **Upload and EXIF claims are simulated.** Change photo cycles fixtures; camera parameters are constant; EXIF Synced and Verified are displayed without extraction or verification.
5. **Selected species and image can disagree.** Logging initializes the species from initialSpecies but always initializes the displayed image to samplePhotoOptions[0]. Posting also maps all species other than kingfisher/parakeet to roller.
6. **Observation identity is hardcoded.** New posts use Sourabh rather than the current profile.
7. **Life list does not follow the journal.** App passes speciesList to LifeListScreen, while journal toggles update only journalEntries. The displayed 47 species count is literal text.
8. **Saving a hotspot does not update the saved list.** HotspotDetailScreen keeps its save flag locally; HotspotsScreen filters the separate parent data. Search also returns before applying the active saved/popular filter.
9. **Notifications can open the wrong entity.** App.tsx routes by words in the title and opens the existing selectedSpecies rather than a notification's explicit species ID.
10. **Global search empty-state logic is incorrect.** showPeople/showPosts make hasAnyResult true regardless of whether the query matches a record.
11. **Navigation is memory-only.** Screen history is separate from browser history and carries no entity IDs. Refresh/deep links/back behavior need a defined route model.

## Design and requirements decisions needed

- Which of the document's four phases must be demonstrated within two weeks? Screens include messaging and quiz functionality while the early scope prioritizes discovery and logistics. Do not silently drop these screens.
- Confirm final design reference, exact submission date, team responsibilities, available daily hours and mandated technologies.
- Confirm initial geography, required species coverage and existing API accounts. Never paste secret keys into chat.
- Decide whether trip planning means viewing actionable logistics or saving an itinerary. The problem statement promises planning, while the screen list lacks a dedicated itinerary flow.
- Confirm whether automatic species recognition is required. The upload UI says Detected Specimen, but EXIF extraction by itself does not identify a bird.
- Establish sources and attribution for species descriptions, images, audio, camera examples and sensitive-species classifications. Validate source/API capabilities before treating them as supplied data.
- Handle images without EXIF as a normal case. Permit reviewed manual metadata, mark provenance, and never invent extracted values.
- Replace absolute quality claims such as zero data loss/24-hour availability with agreed, measurable demo and deployment acceptance tests.

## Provisional two-week sequence

This is a sequencing proposal, not a promise that all phases fit. Adjust after the scope discussion. Target completion within 14 days of 3 October, with the final submission date to be confirmed.

| Days | Outcome and acceptance check |
| --- | --- |
| 1–2 | Agree scope and data sources; install and validate the existing frontend; preserve baseline; define schema, routes and API contracts |
| 3–4 | Deliver search → species → hotspot with sourced records, a real map, weather/freshness and honest unavailable-data states |
| 5–6 | Add accounts and durable journal/profile/bookmarks; demonstrate persistence after reload and isolation between two users |
| 7–8 | Deliver validated photo upload, actual EXIF extraction, missing-EXIF handling and privacy-safe public media |
| 9–10 | Connect community interactions and subscriptions; demonstrate authorized access and notifications from a real sighting event |
| 11–12 | Complete remaining required screens, including messages/quiz/push if in scope; compare mobile UI against original design images |
| 13–14 | Deployment checks, failure cases, mobile usability, regression fixes, demo data, setup documentation and viva walkthrough |

If the scope exceeds this capacity, revise the plan explicitly with the developer/evaluator rather than presenting mock behavior as completed functionality.

## How we will work through implementation

For each feature, explain the user action, the relevant UI component, the request sent, the server validation, the records changed and the visible result. Then implement and run a concrete acceptance test. Maintain a requirement → screen → API → data → test mapping so the developer can explain the complete application during assessment.

First end-to-end learning flow: search for a species, inspect its sourced profile, find a hotspot, log an observation, reload and find that same record in the journal. Add community and alert effects only after ownership and visibility rules work.
