# Sighting alerts and optional Firebase push

Updated 24 October 2026. This increment implements future user-sighting subscriptions. It does not claim seasonal monitoring, a verified sensitive-species classification or actual device delivery. The separate forecast scheduler is explained in FORECAST_OPPORTUNITIES_WALKTHROUGH.md.

## What changed

Subscribe on an external species or hotspot detail page. Enable Sighting alerts in Notifications. A future visible user upload matching either subscription creates one stored alert; matching both creates one, not two. Notifications refresh every 15 seconds while the page is visible, and when it becomes visible again. Read and Mark all read persist. Opening an alert fetches and opens its exact observation rather than guessing a destination from a person's name.

Disabling the master preference suppresses future alerts; old visible alerts remain in the inbox. Subscriptions can be removed even when the external catalogue is unavailable. New accounts have no fabricated sample notifications. Lists show the latest 200 stored sighting alerts; pagination is not implemented.

## How it works

Screen → authenticated request → server validates the catalogue ID → SQLite stores an account/kind/item subscription. When an observation is published, one transaction inserts the observation and all eligible, deduplicated alert references. A failed alert insert rolls back the observation, leaving its staged photo retryable. Identical publication retries do not send another alert; a concurrent already-used photo returns a readable conflict.

An alert stores the observation ID, not a copy of its caption, coordinates or image metadata. Every inbox read and alert-open action rechecks the current observation/profile/follow policy. Keep Private or unfollowing can therefore remove an old alert and revoke its image access. All species' exact coordinates remain protected, since a reliable classification dataset has not been integrated. This is conservative protection, not a claim that every bird is endangered.

## Optional push setup

The specification names Firebase Cloud Messaging. The official `firebase` browser SDK and `firebase-admin` server SDK implement its registration and authenticated sending; existing SQLite/session authentication remains unchanged. The browser imports the messaging SDK only when push is requested. The separately bundled service worker is generated during dev/build and excluded from Git.

Leave these environment values unset for working in-app alerts without push:

- `FIREBASE_SERVICE_ACCOUNT_PATH`: absolute path to a Firebase service-account JSON **outside this repository**. Never paste it into chat or put it in a VITE variable.
- `FIREBASE_WEB_CONFIG`: a single JSON line containing public `apiKey`, `authDomain`, `projectId`, `messagingSenderId`, `appId` fields. Only this allowlist reaches the browser.
- `FIREBASE_VAPID_PUBLIC_KEY`: the project's public Web Push certificate key.

The web and service-account projects must match. Restart the server after configuration. On HTTPS or localhost, an explicit Enable push button requests permission and registers that browser. An ordinary HTTP LAN page may use in-app alerts but cannot establish browser push. This is a platform requirement, not a reason to disable browser security. No Firebase project/account is created automatically.

Devices belong to the current server session. Logout/session replacement cascades deletion of that session's registrations; expired sessions are rejected before sending. At most five devices per account are registered. Disabling push removes server registration even if Firebase token deletion fails. Browser permission can separately be revoked in browser settings.

The SQLite outbox is committed with the alert. A server timer checks up to 50 pending deliveries every 15 seconds, preventing overlapping dispatches in this single-process app. It rechecks visibility, current master preference, session validity, read status and a 24-hour age limit. Errors retry with exponential delays, up to five attempts; invalid tokens are removed. `sent/provider-accepted` means Firebase accepted the request, **not** that a phone displayed it. A crash after provider acceptance but before database acknowledgement may cause a duplicate retry; this is not exactly-once delivery or a multi-worker claim.

Lock-screen text is deliberately generic and contains no species, location, photo or exact coordinates. Such a displayed copy cannot be recalled after a later privacy change. Opening the app retrieves current authorized details. Background notifications open Notifications; foreground messages trigger a refresh. Permission, token creation, actual Firebase dispatch/background handling and physical-device receipt still need a configured-project test.

Official setup references: [Firebase Admin](https://firebase.google.com/docs/admin/setup), [Web client setup](https://firebase.google.com/docs/cloud-messaging/web/get-started), [Web receive handling](https://firebase.google.com/docs/cloud-messaging/web/receive-messages).

## Relevant modules

`server/alerts.mjs` owns subscriptions/inbox and transaction queue; `server/push.mjs` owns provider setup/outbox; `server/observations.mjs` triggers matching and shares visibility; `auth.mjs` supplies the session identity; `index.mjs` owns the dispatcher timer. `src/lib/alerts.ts` and `push.ts` make browser requests; `worker/push-worker.mjs` handles background events. Existing detail, notification, community and settings screens receive actual state through App.

The existing database column/client name `push_enabled`/`pushAlertsEnabled` is retained as the master **sighting alert** preference. It is not proof of push registration; that is separately queried from `push_devices`. No authentication or database was replaced with Firebase. Dependency install hooks for Firebase util/protobuf are explicitly disabled; frozen installation and tests check that the shipped modules work without them.

## Verification and remaining work

98 local tests pass, including HTTP subscription/read persistence, duplicate matching, publication rollback, private/follower revocation, provider-unavailable unsubscription, simulated retry/failure cap, preference/session denial, invalid-token cleanup and logout revocation. TypeScript/production build pass; browser checks are recorded in Development Record Entry 33. Synthetic provider responses do not establish a real provider outage or delivery.

Forecast-opportunity scheduling is implemented in the next source increment; see its separate walkthrough/Entry34 for verification and delivery. Remaining: reviewed sensitivity classification, real Firebase configuration/permission/foreground/background/device evidence, pagination, production monitoring/backups and Android push acceptance. These remain incomplete rather than being hidden by a success badge.

## Viva Notes

1. **Why a subscription table?** It records which account wants which species or hotspot without treating every bookmark as alert consent.
2. **Why a transaction?** Observation and matching alert rows either commit together or both roll back; the app cannot silently lose alerts after confirming a sighting.
3. **Why store references?** A stored copy could remain readable after privacy changes; references allow current access checks.
4. **What is an outbox?** A database queue saved with the business event; delivery can retry after temporary failures or restart.
5. **Polling versus push?** Polling fetches the inbox while the app is visible. Firebase may wake a permitted client in the background; this needs provider/device verification.
6. **What does provider accepted prove?** Only server acceptance of the send request. Notification display needs device-side evidence.
