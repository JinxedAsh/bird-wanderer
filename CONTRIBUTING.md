# Development workflow

Use the living project specification and the images in `docs/design-reference` as the requirements. Do not redesign screens or silently replace required functionality with sample behavior.

1. Create a focused branch from the default branch, such as `codex/species-discovery` or `fix/journal-count`.
2. Build a complete user flow with input validation, loading, error and empty states. Enforce ownership and privacy in the backend, not only in the interface.
3. Add meaningful tests for backend behavior and cross-screen data consistency. Keep test accounts and databases separate from personal data.
4. Run `pnpm lint`, `pnpm test` and `pnpm build` inside `frontend`.
5. Compare UI changes against the original design at mobile widths. State explicitly if visual verification was not performed.
6. Commit with a concise description of the change. Open a pull request explaining the behavior and verification.

Never commit `.env` files, tokens, passwords, local databases, uploaded personal photos, dependencies or build output. `.env.example` should contain only placeholders and non-secret defaults.

Do not include confidential account data in issues, pull requests or screenshots. Follow third-party media attribution requirements before replacing prototype assets or making a public release.

Keep changes small enough to explain during project evaluation. Update the walkthrough and status documentation when behavior materially changes.

Before pushing each completed increment, append a dated, grouped entry to `docs/DEVELOPMENT_RECORD.md` and update its current-state summary. Explain the problem, change, user-visible result, affected files, actual verification, remaining limitations and delivery evidence in language teammates can understand without reading code. Preserve earlier entries chronologically. Mark uncommitted work and unverified behavior explicitly; do not claim a browser test, Android build, CI result or completed feature without evidence. This record is the basis for updates to the team's original documentation.

Keep shared implementation history, setup instructions and walkthroughs in version control. Personal working notes (`PROJECT_REVIEW.md` and `PROJECT_CONTEXT.md`) stay local and are ignored. Do not link shared documentation to these local files or copy private discussions into team-facing records.
