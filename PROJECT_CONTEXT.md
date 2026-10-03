# Bird Wanderer: agreed project context

Updated 3 October 2026 (Asia/Kolkata).

## Living source of truth

Documentation: https://docs.google.com/document/d/1_KcOFYP8ELQf6WegrDuPw5uNlLqqlc90Gf2x46mSUvc/edit?usp=sharing

The team updates this document during development. When the user asks to check documentation, read the current linked document rather than relying on the initial review or an old export. Record material requirement changes and their implementation impact. The link is a reference, not authorization to edit the shared document.

## Confirmed constraints

- Keep https://github.com/JinxedAsh/bird-wanderer updated as work proceeds. The user authorizes committing and pushing completed work increments without asking again. Run relevant checks before pushing, inspect GitHub CI afterward, and report any failure or blocker. Keep commits focused; exclude secrets, databases, dependencies and generated output. This does not authorize making the private repository public or force-pushing history.
- All four documented phases are required.
- Tuesday 6 October 2026: demonstrate Phase 1. A fully refined frontend and working login backend are the stated bare minimum; this does not remove the document's Phase 1 discovery, species, hotspot and photography-logistics requirements.
- Full development deadline: 20 October 2026. A possible extension is unconfirmed and must not be assumed in planning.
- The embedded screen designs are final and must be followed exactly. Inspect the original images and compare the running application against them before claiming design fidelity. Do not redesign or silently substitute layouts.
- No mandated technology stack.
- One developer, available for most of each day. Teach implementation decisions and flows as work proceeds so the developer can explain the application.

## Delivery approach

Prioritize the 6 October checkpoint first while choosing foundations that support every required phase. Preserve the existing frontend as the baseline. Verify the actual design images, establish a runnable build, refine the frontend and implement real authentication. Track remaining Phase 1 requirements explicitly; do not equate login alone with completed Phase 1.

Plan remaining implementation through 20 October, reserving time for integration, privacy and authorization checks, deployment, regression fixes and the demonstration. Replan using observed progress rather than counting on the possible extension.

## Implementation progress

First increment, 3 October: installed frontend dependencies and generated a lockfile; added Express/SQLite registration, login, persisted sessions and logout; connected the authentication UI and current user's greeting/email. TypeScript, production build and five authentication integration test groups pass. Start locally with Start-Dev.ps1. See docs/AUTH_WALKTHROUGH.md.

Original design images were extracted into docs/design-reference. The auth reference was inspected, but exact UI fidelity and browser interaction remain unverified because local browser access was denied by browser security policy. Next: complete visual screen comparison/refinement, password recovery, and Phase 1 live discovery/data integration. Other application screens still use prototype data.

Stage 1 increment, 4 October: corrected local search rendering and empty states, shared hotspot bookmark state, open comment-panel updates, account identity display, zero sightings, follow/unfollow behavior and missing-species handling. Added keyboard focus/Escape handling to existing sheets, visible focus indicators, browser zoom support and accurate messages for unsupported prototype actions. Development and preview proxy authentication to the configured API port. TypeScript, eleven automated tests and the production build pass. No authentication schema or backend business functionality was changed. Runtime visual comparison remains pending; reference images were inspected without claiming exact fidelity. See docs/STAGE_1_WALKTHROUGH.md. Stop after Stage 1 until the user requests further implementation.
