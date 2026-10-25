# Password recovery

Forgot password opens an email-request sheet. If SMTP is configured, an eligible account can receive a single-use link valid for15 minutes. If mail is unconfigured, the app explicitly says no reset email was sent. A generic accepted-request response never proves that an account exists or an email arrived.

## Setup and flow

Use an existing SMTP provider and sender you control. Put SMTP_HOST, SMTP_PORT (465 for implicit TLS or587 for STARTTLS), SMTP_USER, SMTP_PASSWORD and SMTP_FROM in the private frontend/.env, then restart. Keep credentials out of Git/chat. There is no automatic mail-provider account creation. Use one plain mailbox address rather than a display name or recipient list. All fields must be present together; partial/invalid settings fail startup. TLS is required, with certificate verification left enabled and bounded connection/greeting/socket timeouts. File/URL attachments and mail debug logging are disabled.

Emailed links use APP_ORIGIN by default. For a phone/public preview, set RECOVERY_ORIGIN to the exact reachable application origin, also included in APP_ORIGIN, ADDITIONAL_APP_ORIGINS or the current trusted tunnel origin. A changing temporary tunnel makes earlier links unreachable; request a new link after updating/restarting. Production requires HTTPS. Never construct recovery links from arbitrary Host headers.

The request sheet sends an email to /api/auth/recovery/request. The server generates32 random bytes, stores only the SHA-256 token hash plus account/credential version and expiry, and invalidates any older link for that account. Mail is dispatched separately from the generic HTTP response, so SMTP latency does not become the normal existing-account response path. Both existing and unknown accounts receive the same accepted-request message. Separate rate limits apply to IP and hashed email/token values.

The email contains a root URL with the token in a fragment. The fragment is not part of the HTTP request URL. The bootstrap removes it from browser history immediately and keeps it in component memory; the reset page uses no-referrer policy without changing normal map-page referral behavior. Refreshing loses that in-memory link: reopen the original email while it is valid. A malformed link shows an error, not a normal signed-in screen. No token is placed in an input value, log or local storage.

After password/confirmation validation, /api/auth/recovery/reset verifies the token, expiry and original credential version, hashes the new password using existing scrypt settings with a fresh salt, then rechecks after that asynchronous calculation. One SQLite transaction updates the password, revokes all target-account sessions/session-bound push registrations and deletes all its recovery links. A concurrent or reused reset cannot apply twice. Failure rolls back and leaves the old credentials/session/link retryable. Normal authenticated password changes also invalidate pending links.

There is no automatic login. The reset does not overwrite or clear a cookie belonging to a different signed-in account. Existing records, images, profile and social data are preserved. The user returns to sign-in and supplies the new password.

## Delivery and acceptance limits

Dispatch is bounded to three in-process sends. It is not a durable mail queue: a server stop after HTTP acceptance can prevent sending; request another link if none arrives. SMTP rejection removes only that failed request's token, preserving any newer link. Logs contain a generic failure without recipient, credentials or token. Provider acceptance is not inbox receipt. Request and confirmation limits are separate (five and30 attempts respectively per15 minutes, capped by the existing configured auth rate limit); shared-network users can hit the same IP limit.

Tests use synthetic accounts and an injected transport/capture mailer, not a real mailbox. They cover generic/unconfigured responses, origin/rate/input validation, token hashing, expiry/latest/single-use, concurrent consumption, session isolation, rollback/retry, restart persistence, bounded delivery and safe SMTP options. This is not a penetration test or measured proof against every timing side channel. Real provider credentials, TLS delivery, spam/inbox receipt and physical-device link handling remain manual acceptance inputs. Browser entry of a new password is also manual; automated API checks do not substitute for that interaction.

## Viva Notes

- **Why use a random token rather than email plus a new password?** The emailed token proves control of the recovery channel; knowing an address alone is insufficient.
- **Why store its hash?** A database reader cannot directly use the stored token value as a reset link. It is random with256 bits of entropy, rather than a human password needing slow hashing.
- **Why expire it and allow one use?** This limits how long a leaked link can work and prevents replay. Only the latest account link remains valid.
- **Why recheck after scrypt?** Other requests can run while hashing. The token may expire or another password change/reset may finish during that time.
- **Why revoke sessions and use a transaction?** Old sessions must lose access after recovery. Updating credentials and revoking access together prevents partial success; an error rolls all of it back.
