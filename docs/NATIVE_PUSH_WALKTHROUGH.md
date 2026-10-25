# Android Firebase adapter — source, privacy and configuration

Updated 26 October 2026. The user has no Firebase project yet. This increment adds the native integration source and guarded client/server flow; it does not prove Firebase token creation, provider acceptance or device receipt.

## What changes for the user

The Android host can request notification permission and an FCM token through the Android Firebase SDK. It uses the existing Notifications screen, subscriptions, account session and server outbox. The web app continues using its existing browser Firebase client. Older APKs retain in-app alerts and show an update requirement instead of receiving unsupported native commands.

An unconfigured APK works normally without requesting a Firebase token. The native SDK is not initialized by this adapter until a configured, permitted opt-in or restoration of an already opted-in matching session. Firebase automatic messaging initialization is disabled by default and during pending/paused/disabled registration; it is enabled only for a confirmed or restored matching opt-in. Analytics collection and notification delegation are disabled. No analytics SDK is added.

The native flow is: deliberate tap → trusted origin/focus checks → Android permission → SDK token → matching-project check → authenticated device registration → native confirmation. The native side remains inactive until the app confirms the acknowledged server request. Failed/expired requests show an error and clean up only their own account/session/ticket. No JavaScript object bridge is exposed.

Disabling push removes the current session's server registration and clears local opt-in/notifications. Logout, session changes, changing servers, password changes and explicit master-alert opt-out also clear local consent as appropriate. The SDK may retain its installation token; automatic token work is disabled and removal of the server binding/local gates stops app delivery. It is not a claim that all Firebase installation data was deleted.

If the SDK rotates its token, local delivery pauses and the next foreground reconciliation removes the old registration. The user explicitly enables push again. This simple strategy avoids silently binding a refreshed token to the wrong account. In-app alerts remain available.

## Privacy and account boundaries

Native consent is bound to the exact server origin, user ID, current cookie digest and Firebase project. No raw session cookie is stored in push preferences. A random short-lived ticket correlates token and confirmation requests. Device registration/removal also carries an expected account ID and opaque session fingerprint; the server rejects stale actions rather than mutating a new account after a login change.

The application sender produces **data-only** FCM messages with generic text, a public project ID and an opaque double hash of the session. No species, photo/media URL, caption, notes, coordinates or direct session hash leaves in that payload. Android checks project, fingerprint, current cookie, local opt-in and notification permission before composing its generic preview. Old in-flight messages from another session/server are discarded. Foreground messages refresh the authenticated inbox; background previews open Notifications, which fetches current authorized content.

The app uses Android high-priority delivery and a one-hour TTL, but actual latency is unverified and depends on Firebase, network, Android/OEM power policies and permission. An already provider-accepted message cannot generally be recalled. The privacy contract above covers the application's tested data-only sender; do not use Firebase Console notification-composer payloads to send private information. SDK-composed notification payloads are outside this adapter's tested data-message path.

## Configuration when a project becomes available

No project, credential, account or paid service is created automatically.

1. Configure the existing server Firebase setup from `.env.example`: service-account JSON **outside the repository**, Firebase web configuration and VAPID public key. The current shared sender uses that configuration as its project identity. Existing tests and in-app alerts do not need it.
2. In that same Firebase project, register Android apps with the exact package names `org.birdwanderer.app.debug` and `org.birdwanderer.app`. Their Android application IDs differ from the web app ID.
3. Copy `android/firebase.properties.example` to ignored `android/firebase.properties`. Fill the **public client values** `projectId`, `senderId`, `apiKey`, `debugAppId` and `releaseAppId` from the corresponding Firebase Android configuration. Never put a service-account key in this file or an APK. Blank/invalid values keep that build unconfigured.
4. Rebuild/install the appropriate APK. A changed compile-time client configuration requires a new APK. The Android project, sender ID and application-ID format are validated; the runtime project must match the server.
5. Enable master sighting alerts, subscribe to a source, then enable push on that device and allow the OS permission. Validate foreground, background, cold notification launch, denial/retry, opt-out/logout, account/session change and token refresh using actual devices/provider evidence. A debug emulator is not physical-phone acceptance. Release still needs HTTPS and a proper private signing key.

## Important modules

- `NativePush`: Android permissions/token ticket, consent binding, lifecycle reconciliation and generic notification composition.
- `PushPolicy`: pure Java configuration, cookie fingerprint, ticket, binding and payload privacy checks.
- `BirdApplication` / `BirdMessagingService`: restore eligible native state and receive token/data-message callbacks.
- `MainActivity`: narrow trusted URL action, callback event, shared native-prompt guards and notification-inbox launch. No credential-bearing HTTP client is duplicated in Java.
- `lib/native-push.ts` / `lib/push.ts`: capability detection, request correlation/abort/timeout, project matching, acknowledged registration and cleanup. A failed native status does not hide in-app alerts.
- `alerts.mjs` / `push.mjs`: authenticated account/session guards and existing privacy/preference/session rechecks before outbox dispatch. Browser clients remain compatible.

Settings loads on demand like Journal/Quiz to keep the initial JavaScript bundle small. The existing error boundary supplies code-download recovery. Returning to a tab also detects a different signed-in account, preventing old account state from remaining on screen.

## Verification boundaries

At the implementation checkpoint: 132 web tests passed, TypeScript and production build passed; focused native/client/push tests passed. Latest nine Java origin/share/push policy tests, Android lint with0errors/2warnings (pinned Firebase BOM and required JavaScript), debug and unsigned-release builds pass. Initial web JavaScript is478.40kB after lazy Settings. Independent browser/emulator checks are pending and must be recorded in the Development Record. No actual Firebase project, SDK registration, permission-granted provider path, foreground/background receipt, token refresh or physical device is accepted from these source tests.

## Viva Notes

1. **Why does Android need its own Firebase SDK?** WebView does not provide the same Web Push capabilities as a normal browser. The native SDK handles Android registration and message callbacks while React keeps the existing screens.
2. **Why not put an admin key in the APK?** An APK can be inspected. Its public client configuration identifies the app; private sending credentials belong only on the server.
3. **Why confirm after the API succeeds?** Getting a token alone does not register it to the current authorized account. Local delivery starts only after the guarded server operation and matching native confirmation.
4. **How do you prevent stale account actions?** Requests carry expected user/session fingerprints, and native tickets/current cookie/origin/project are rechecked. Cleanup is scoped to the old ticket rather than blindly removing a new account's registration.
5. **Why are push previews generic?** Visibility can change after dispatch. Private content stays behind the API, which checks current access when the inbox opens.
6. **What happens on token refresh?** Delivery pauses, the old binding is removed on foreground reconciliation, and the user re-enables it. This keeps the lifecycle understandable and explicit.
7. **Is real push complete?** No. Source/build tests are separate from creating/configuring the project and observing actual device receipt and latency.

Implementation references: [Firebase Android setup](https://firebase.google.com/docs/android/setup), [Android messaging client](https://firebase.google.com/docs/cloud-messaging/android/get-started), [programmatic initialization](https://firebase.google.com/support/guides/init-options).
