# Android app — build, connection and Viva Notes

Updated 24 October 2026. The Android project packages the existing React interface in a small native Java WebView host. Express, SQLite, private photographs and external-provider requests remain on the server. Installing the APK does not install a server on the phone or make the app work offline.

## Build and install

Requirements: JDK17, Android SDK platform36/build-tools35, and an SDK path supplied through `ANDROID_HOME` or an ignored `android/local.properties`. The Gradle8.13 wrapper and its distribution checksum are committed; Android Gradle Plugin8.13.2 is pinned. No Android Studio, React rewrite, Capacitor or additional app framework is required to compile it.

From `android`:

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug assembleRelease
```

On Windows use `gradlew.bat`. Outputs are ignored build artifacts:

- `app/build/outputs/apk/debug/app-debug.apk`: signed debug preview, application ID `org.birdwanderer.app.debug`.
- `app/build/outputs/apk/release/app-release-unsigned.apk`: unsigned release output; it needs your own private signing key before installation/distribution. Never commit that key.

Android8/API26 or newer is required. Debug/production signing keys and databases/media are not part of source control. CI builds both variants, runs unit/lint checks and makes preview artifacts available for14 days; an ephemeral CI debug key may differ from a locally built debug key. Do not uninstall an existing real installation merely to bypass a signature mismatch without preserving anything you need.

## Connect the app

The first screen asks for the trusted server origin, such as `https://your-server.example`. Use the address serving both the frontend and `/api`; a standalone API port is not enough. Production uses the existing `pnpm build` and Express production static-file serving. Set the server's exact allowed origin and secure cookies as described in the frontend deployment guide. The release app accepts HTTPS only. Certificates must validate normally.

For a local debug demo, start the existing development server, allow its exact phone-facing origin, and connect over the same network. Debug accepts localhost or private IPv4 HTTP addresses as well as HTTPS. Public cleartext HTTP, credentials in addresses, paths, query strings, fragments and confusing host-prefix matches are rejected. HTTP LAN cannot provide all browser secure-context features; use the manual-location option or trusted HTTPS where required. A stale Wi-Fi address/tunnel is not a permanent setup value.

For an owned Android emulator only, `adb -s YOUR_EMULATOR reverse tcp:3000 tcp:3000` lets the app use `http://localhost:3000` without changing the shared server origin. This is a development connection, not physical-phone or public-tunnel evidence.

Login or Settings → Android server connection reopens native setup, so choosing a reachable server that rejects login cannot trap users behind authentication. Changing origins clears this app's cookies/web storage; records remain on the original server. The app never bypasses login, API origin checks, certificate validation or photo privacy.

## Native behavior and safeguards

The existing interface, account/session logic and provider integrations are reused. First-party cookies persist in Android WebView; third-party cookies are disabled. JavaScript is required for React, but no JavaScript-to-Java object bridge is exposed. Only the configured origin navigates inside the app. Explicit external HTTP/HTTPS links open a browser/maps app; file/content/intent navigation is not admitted. Debug WebView inspection is enabled only in debug builds.

A native document picker selects one JPEG/PNG up to10MiB and grants access to that selected content URI only. No broad storage or camera permission is requested. The existing server independently decodes/validates/strips metadata and enforces ownership/privacy, even if the provider's filename/MIME/size is misleading. Picker cancellation completes without manufacturing a photo.

Location permission is requested only when the visible trusted web app requests device location. Native guards keep one picker/permission request in progress instead of queuing duplicate dialogs behind it. Coarse permission is accepted for approximate nearby discovery. The frontend now has an independent12-second deadline because a WebView can fail to return its permission callback; late callbacks are ignored and manual-entry/retry recover. No background location is requested. Android back closes a web dialog first, then uses the existing app Back button where present; platform callbacks cover modern Android gestures and older supported versions. System-bar/keyboard insets keep the web viewport usable. Main-frame connection/certificate errors provide a retryable native connection screen; third-party image failure does not silently authorize another server.

Backups/device-transfer rules exclude this app's web/session/setup data. Server database/media backups remain a separate responsibility. A WebView frontend and a debug APK are not proof of production uptime or release readiness.

## Current verification

Latest local Gradle verification passes:9 origin/share/push-policy unit tests, Android lint with0 errors/2 warnings, debug assembly and unsigned release assembly. The warnings identify the pinned Firebase BOM and JavaScript needed by React; the trusted-origin/no-local-file/no-native-bridge controls are documented. Modern back handling is implemented directly with Android's platform dispatcher; the older fallback has a narrowly explained lint suppression.

The debug APK installed and launched in an owned Android15/API35 Google APIs emulator using hardware acceleration. Native connection setup rejected public HTTP and opened the live app atlocalhost through the explicit reverse connection. Scoped native QA passed real disposable login; JPEG private and PNG public selection/publication through Android’s document picker with independent-reader404/200; picker cancellation/reopen; keyboard note entry; session after force-stop/relaunch; rotated journal with no horizontal overflow; Android Back for profile sheet/Settings; native setup and invalid/unreachable-origin recovery; logout and pre-login connection recovery. These used synthetic images and a debug WebView harness for ordinary form events; the native date/time widget was not accepted. A transient registration502 recovered without server intervention; its cause was not established. The12-second missing-location-callback recovery and manual point worked, but granted permission produced a timeout rather than a GPS position. A possibly queued permission prompt was observed after prior retries; it was not a clean endless-loop reproduction. A small native no-overlap/focus guard was then added, rebuilt/reinstalled and passed a targeted single-denial recheck: one prompt, no repeat prompt during the recorded14-second observation, deadline/manual recovery and normal picker-open/cancel. Earlier complete JPEG/PNG flows were on the preceding APK. PR #31/47cbef4 is merged with passing exact-head and merged-main web/Android CI. Physical Oppo, HTTPS release installation, actual provider outage/public tunnel and Firebase receipt remain unverified. No Firebase project exists. Native SDK adapter source is now implemented with opt-in/session/project guards and targeted unconfigured-APK checks; actual Firebase registration, receipt, refresh and physical/release acceptance remain unverified. See the native push walkthrough.

## Viva Notes

1. **Is this an Android app or just a website link?** It is an installable Android APK with a native Activity, WebView, document picker, permission handling and connection policy. Its interface is the existing React web application and its backend remains remote.
2. **Why reuse WebView?** It preserves the final mobile designs and working React/Express architecture without rewriting the frontend or adding a second app framework. The tradeoff is network/server dependence and separate native push work.
3. **What differs between debug and release?** Debug permits explicitly bounded local HTTP and developer inspection. Release requires HTTPS and disables WebView debugging. A release APK also needs a private signing key.
4. **How do photos reach the backend?** Android grants the selected URI to the WebView file input; the existing upload API validates/sanitizes it and records EXIF/privacy under the signed-in account.
5. **How do you stop arbitrary websites using native permissions?** The host checks exact scheme/host/port and current page origin; file access/third-party cookies are disabled, external navigation leaves the app, and no native JavaScript bridge is provided.
6. **Does the APK prove the whole project is complete?** No. It proves packaging/build/install only within the stated tests. Physical-device flows, production server access, source-data limitations and real push need their own evidence.

Implementation references: [Android WebView guide](https://developer.android.com/develop/ui/views/layout/webapps/webview), [file chooser validation](https://developer.android.com/reference/android/webkit/WebChromeClient#onShowFileChooser(android.webkit.WebView,%20android.webkit.ValueCallback%3Candroid.net.Uri[]%3E,%20android.webkit.WebChromeClient.FileChooserParams)), [WebView file access risks](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion).

Destination-sharing source now supports a trusted user-gesture native text chooser. The host validates a bounded root-app screen/ID URL on its configured origin, rejects extra private parameters/foreign URLs/fragments/API paths and shares only that URL. Source tests/builds pass. Fresh API35 emulator debug APK tests opened species/post choosers by native UI tap, displaying canonical ID links without captions/notes/GPS/media URLs. Back canceled and returned to the same page/connection; nothing was sent externally. Physical/release/external-OS-app-link/recipient delivery acceptance remains unverified. See [Navigation flow and Viva Notes](../docs/NAVIGATION_SHARING_WALKTHROUGH.md).

Optional Android Firebase configuration: copy [firebase.properties.example](firebase.properties.example) to ignored firebase.properties using public client values for the correct debug/release package. Never include a service-account key in an APK. [Native push setup, evidence and Viva Notes](../docs/NATIVE_PUSH_WALKTHROUGH.md).

## Verified CI preview artifact —26 October2026

[Android run40280140795](https://github.com/JinxedAsh/bird-wanderer/actions/runs/40280140795) built source4cc3507. Download the bird-wanderer-android-preview artifact (14-day retention). Debug package org.birdwanderer.app.debug/version0.1.0-debug/min API26/target API36 has a verified v2 signature; SHA-256 E7EBE3C74D38E02560BB390586D01A27B3E14D3E4998BE6CF4A8184FE5E25015. The release APK remains unsigned. Later acceptance-documentation changes leave runtime/build inputs identical.

Downloaded reports show9/9 native tests, zero failures and lint0errors/4warnings: OldTargetApi, AndroidGradlePluginVersion, GradleDependency, SetJavaScriptEnabled. Earlier local checks recorded two warnings; CI additionally detects newer target/tool versions. The tested SDK/Gradle/Firebase pins remain unchanged and required JavaScript remains restricted to trusted origins. This is not a Maven vulnerability scan or proof of physical-device/provider acceptance.
