# Dependency audit and compatible fixes

Updated 26 October 2026. This records package-audit findings and regression checks, not a penetration test or a guarantee that the application has no security defects.

The production pnpm (JavaScript) dependency audit initially reported nine advisories: three high, four moderate and two low. Updated Vite from8.3.2 to8.3.5, body-parser to1.20.9 and @grpc/grpc-js to1.13.6. Vite's compatible esbuild peer was aligned to0.28.2, also avoiding a low-severity development-server advisory found by the broader audit. The final full pnpm installed-dependency audit reports zero advisories and the peer check reports no conflicts.

Vite remains on8.3; Express/React/SQLite architecture and the interface are preserved. Two narrow pnpm overrides prevent vulnerable transitive versions. Firestore's old gRPC range required an override within major1. Firestore is installed through the Firebase package but is not used as Bird Wanderer's database or application API; this is not a migration from SQLite or HTTP.

The lockfile records exact resolved versions for repeatable installs. Existing package build permissions remain unchanged. CI now also rejects high/critical production audit findings before its existing type/test/build checks. Audit availability and future findings depend on the package registry; a successful audit is dated evidence, not permanent certification.

A related HTTP regression found malformed gzip input returning500. It now returns a neutral400 error, valid compressed authentication still works, and subsequent requests remain usable. This bounded negative test does not claim to reproduce every denial-of-service condition. The final133-test suite, TypeScript and production build pass; the initial web bundle is478.39kB. Native inputs were unchanged by the package remediation; their nine policy tests/lint/two APK builds and targeted unconfigured-emulator evidence remain separately recorded in Entry43.

Any already-running development server must restart to load updated package code. The patch does not prove a live or public service was restarted. Real hosting, TLS, secrets, provider delivery and physical-device checks remain separate acceptance criteria.

Primary advisory references: [Vite](https://github.com/advisories/GHSA-587h-7wmj-h5pm), [body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828), [gRPC](https://github.com/advisories/GHSA-m9gg-hp2v-232j), [esbuild](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr). Override mechanism: [pnpm documentation](https://pnpm.io/settings/dependency-resolution#overrides).

## Viva Notes

1. **Why audit transitive dependencies?** A library can install other libraries with known vulnerabilities even when our own code never imports them directly.
2. **Why is gRPC installed if the API uses Express?** It comes from Firebase's unused Firestore module. Our app still uses HTTP/JSON and SQLite.
3. **What is a lockfile?** A record of exact package versions/integrity values, used by frozen installs to reproduce the tested dependency graph.
4. **Why an override?** It selects a fixed transitive release when an upstream package retains an older range; it should be reviewed when that upstream dependency is updated.
5. **Why400 instead of500?** Malformed compression is bad client input, not proof the server's application logic failed. The response avoids leaking parser internals.
6. **Does zero audit findings mean secure?** No. Authentication, authorization, privacy and failure-handling tests remain necessary, and new advisories may appear later.
