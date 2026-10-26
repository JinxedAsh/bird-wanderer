# Account Settings — password changes and working reference controls

Updated 25 October 2026. Source implementation is separate from final browser/CI delivery evidence recorded in the Development Record.

## What changed

Settings previously displayed an unavailable email-recovery message when someone selected Change password. A signed-in person can now open a focused sheet, provide their current password and enter/confirm a different 12–128-character password. Wrong credentials and failed requests show their actual error; success appears only after the API confirms. Cancel/Escape close the idle sheet; controls stay disabled during submission.

The current device receives a fresh session. Other sessions and all session-bound push registrations are revoked, including this device's previous registration. Enable push again if configured and wanted. Saved observations, profile, messages and other account data are preserved. This is an authenticated password change, not email recovery. Optional login recovery is now implemented separately in [Password recovery](PASSWORD_RECOVERY_WALKTHROUGH.md); without SMTP configuration it explicitly reports no email was sent.

Help & Field Guidelines now opens the [American Birding Association Code of Birding Ethics](https://www.aba.org/aba-code-of-birding-ethics/), reviewed 25 October. This provides guidance on disturbance, responsible photography and respecting access; it does not establish a particular venue's permission or current local rules. About displays the actual frontend package version, now 0.1.0, matching the Android preview's base version rather than the old invented 1.0.4 label. It identifies the app as a development preview.

## Request and storage flow

Settings → ChangePasswordSheet → existing auth client → POST /api/auth/change-password → session/origin/rate checks → current-password verification → new salted scrypt hash → one SQLite transaction updating credentials and replacing sessions → new HttpOnly cookie → acknowledged result.

`auth.mjs` reuses the existing password hashing parameters and account/session machinery. It never stores the password itself. Hashing is asynchronous, so the endpoint rechecks session expiry/logout and the original stored hash after hashing. A concurrent change cannot silently overwrite the first successful change. Login also rechecks that its verified hash is still current before issuing a session.

Deleting old sessions cascades to their push registrations and queued deliveries through existing foreign keys. The transaction means a storage failure does not leave the password updated while sessions remain partially revoked. Unrelated users keep their sessions. The frontend treats an expired session differently from an incorrect current password, and aborts pending UI work on unmount. Passwords are kept only in the sheet's component state and disappear when it closes.

## Verification and limits

Local full suite: 118 tests passed; TypeScript and production build passed (main 493.89 kB). Focused auth tests cover validation, wrong current password, foreign origin, unauthenticated requests, fresh salted hash, old-password rejection/new-password acceptance, session/push revocation, unrelated-account isolation, injected rollback, concurrent requests, rate limits, expiry during hashing and password/session persistence after restart. An expected SQLite diagnostic comes from a deliberate rollback test.

The frontend render harness targets Node24 so JSON import attributes survive transformation; the production frontend still uses Vite's normal JSON bundling. Existing account-identity tests check the real ethics URL and package version. Independent browser checks passed opening the real sheet, required-field feedback,320/390px layout/no overflow, password input/autocomplete attributes, focus wrapping, Escape/Cancel restoration, actual ABA page opening, About version and truthful unavailable recovery. Independent actual-API checks with an existing photograph passed validation/wrong current password, rollback/retry, old/new sessions and login, preserved record fields/EXIF and identical media SHA-256.55 focused auth/frontend tests also passed. Browser policy requires human entry of new credentials: interactive mismatch/wrong-password/success submission and network-failure draft/retry remain manual acceptance, not claimed from API checks. Final exact-head CI is required before merge. No Firebase project, recovery-email provider, physical-device delivery or production deployment is implied.

## Viva Notes

1. **Why ask for the current password?** A session alone should not let someone replace an account credential without reauthentication.
2. **What is scrypt?** A deliberately expensive password-hashing function. A fresh random salt ensures equal passwords do not produce equal stored hashes.
3. **Why replace sessions?** Devices holding old session cookies should not retain account access after a credential change. The current device gets a new random cookie.
4. **Why recheck after hashing?** Other requests can run while hashing is awaited. A logout, expiry or concurrent credential change must still take effect.
5. **Why use a database transaction?** Credential replacement and session revocation must succeed or roll back together.
6. **Is Forgot password implemented too?** No. Email recovery needs a separate expiring-token flow and configured real email delivery; the interface does not claim an email was sent.
