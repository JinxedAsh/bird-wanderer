# Optional email verification and free sender setup

29 October 2026. Verification is an additional account status, not a new authentication system. Existing accounts, passwords, observations and login stay usable. Legacy accounts begin **not verified**; we never infer mailbox ownership from an existing email field. Password recovery remains a separate operation.

## What the user sees

After registration, the app requests a verification email only when SMTP is configured and dispatch has capacity. Account creation still succeeds when email is unavailable. In Settings → Account, users can check their status or send another link. The request message means delivery was requested, not that an inbox received it. Disabled email gives an explicit error; no pretend success.

Opening the email displays a confirmation page. The user must press **Verify email**. Merely opening a link, including an automated email scanner's GET request, does not verify anything. Confirmation affects the account named by the emailed token, even if another account is signed in. It does not sign in, sign out, change passwords, or replace cookies. Return to the app and reopen Settings or check status to see the result.

## How it works

1. `auth.mjs` creates the account and session using the existing code, then attempts optional dispatch. Registration errors from the email queue do not invalidate an otherwise created account.
2. `verification.mjs` generates 32 random bytes, emails the hexadecimal token and stores only its SHA-256 hash in SQLite. Each account has at most one pending link, bound to its current email and expiring after 15 minutes. A resend replaces the previous link.
3. The shared `recovery-mail.mjs` transport sends a separate plain-text verification template over certificate-checked TLS. Password reset keeps its original template and behavior. Neither adapter logs credentials, token URLs or request bodies.
4. The root `#verify-email=...` fragment is removed immediately from browser history and retained in page memory. It is absent from the initial HTTP URL. The dedicated page uses no-referrer policy and never renders the token. Refresh requires reopening the original email.
5. `main.tsx` captures fragment/history events before normal routing, and `navigation.ts` leaves a pending account-link fragment alone until captured. This preserves the prior signed-in password-reset routing fix.
6. A POST confirms the unexpired token. A transaction records the verified email/time and deletes the pending link. Replay fails; a failed database transaction rolls back and remains retryable. Verified status is bound to the current email, so a future email change cannot inherit the old proof.

Two additive tables, `email_verifications` and `verified_emails`, avoid changing existing user rows or password schema. Tokens/status survive restart. Resend requires a valid session and is limited to five attempts per account/IP per 15 minutes; confirmation is limited to 30 per token/IP, capped by the existing auth limit. Registration retains its existing auth limits. Verification has at most three simultaneous in-process dispatches. Recovery retains its independent three-send bound. These are bounded sends, not a durable queue: request again after interruption or delivery failure. Failed older delivery can delete only its own token, never a newer link.

Email possession is not identity, field-observation validation or protection against an already compromised mailbox. Optional verification does not prevent someone registering a mistyped address; login is intentionally not gated in this increment. Password reset does **not** mark email verified, consume a verification token, or change verified status. It retains revocation of all target-account sessions/push bindings and isolation from unrelated signed-in accounts.

## Free Brevo configuration — human/provider action pending

Brevo currently lists 300 daily sends on its Free plan; verification and reset share that allowance. Confirm current limits and sender approval before enabling. [Official Free-plan limits](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)

1. Create or use a Free account. Authenticate `birdwanderer.in` using the exact DNS records Brevo supplies and approve a sender you control. Preserve unrelated DNS records; don't invent DKIM/SPF values or duplicate DMARC records.
2. In Brevo's SMTP page, use the displayed **SMTP login** and an **SMTP key**. These can differ from the account login and API key. The relay host is `smtp-relay.brevo.com`. [Official SMTP setup](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
3. Fill the existing server-only `frontend/.env` fields locally. The following is a template, not working credentials:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=replace-with-displayed-smtp-login
SMTP_PASSWORD=replace-with-smtp-key-locally
SMTP_FROM=replace-with-approved-sender-address
RECOVERY_ORIGIN=https://birdwanderer.in
```

The approved sender must be one plain email address. All five SMTP fields must be present together, or all empty to disable email. Port 587 requires STARTTLS; 465 uses TLS from connection start. Ten-second transport timeouts bound provider stalls. `RECOVERY_ORIGIN` is shared by both email purposes and must match the app origin or an exact additional/tunnel origin. Never put credentials in `VITE_` variables, chat, screenshots, a commit or a public template. No Brevo-hosted template or marketing automation is needed: Nodemailer supplies each plain-text body.

Coordinate a server restart after configuration; do not interrupt a demonstration. Keep the laptop and named tunnel running for links to work. A stable domain alone does not provide permanent hosting, an email inbox or proof of delivery. No provider account, DNS change, private `.env` edit or real email send was performed for this source increment.

## Acceptance and testing

Automated fixture tests cover optional SMTP, registration continuity, origin/session enforcement, hashed tokens, latest/expiry/replay, email binding, two-account isolation, transaction rollback/concurrency, failure cleanup/capacity, additive legacy schema/restarts, and reset independence. Frontend tests cover fragment parsing, malformed/duplicate/mixed links, route-write guards, explicit submit markup, no rendered token, network/server/session errors and response validation. These tests do not prove an external inbox received a message.

Manual/provider checklist after configuration:

- Use your own controlled mailbox: registration email arrives, its link uses the stable HTTPS domain, and explicit confirmation changes Settings status after refresh.
- Resend: old link fails; newest works once; expired link fails. Check inbox/spam and provider accepted/delivered/bounced status separately.
- Request password reset from sign-in; verify real receipt, new-password confirmation, old-password rejection and target-session revocation. Existing browser credential-entry restrictions mean a human must enter new passwords during interactive QA.
- Confirm account A's link while account B is signed in: A verifies, B stays B. No auto-login occurs. Check actual Oppo/browser link handling and keyboard/navigation.
- Exercise provider rejection/quota/TLS/network failure only in a controlled test; confirm honest response/retry and normal login. API fixture failure injection is not real provider-outage acceptance.

See the chronological Development Record entry for exact test/build/browser/delivery results of this increment.

## Viva Notes

**What changed and why:** we added proof that someone can receive mail at an account's address, while preserving the working authentication system. Reusing SQLite, routing, SMTP and component styles keeps the change understandable.

**Important modules:** `verification.mjs` owns tokens/status/rate limits; `recovery-mail.mjs` owns TLS sending and purpose-specific messages; `verification.ts` handles frontend API calls; `EmailVerification` shows Settings status/resend; `VerifyEmailScreen` requires deliberate confirmation; `main.tsx` and `navigation.ts` safely handle links.

1. **Why hash the token?** A database read alone should not reveal a usable emailed bearer token. The server compares the hash of the submitted value.
2. **Why expiry and single use?** They limit the useful lifetime and prevent a captured old link being reused. Resend invalidates the earlier link.
3. **Why POST rather than GET?** Email scanners may open links automatically. A deliberate button performs the state-changing POST.
4. **Does verification log the user in?** No. It updates only the account bound to the token and preserves any existing session.
5. **Why is password reset separate?** Reset changes credentials and revokes sessions; verification records mailbox proof. Keeping their tokens and operations separate avoids accidental side effects.
