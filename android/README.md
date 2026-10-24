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

Settings → Android server connection reopens native setup. Changing origins clears this app's cookies/web storage; records remain on the original server. The app never bypasses login, API origin checks, certificate validation or photo privacy.

## Native behavior and safeguards

The existing interface, account/session logic and provider integrations are reused. First-party cookies persist in Android WebView; third-party cookies are disabled. JavaScript is required for React, but no JavaScript-to-Java object bridge is exposed. Only the configured origin navigates inside the app. Explicit external HTTP/HTTPS links open a browser/maps app; file/content/intent navigation is not admitted. Debug WebView inspection is enabled only in debug builds.

A native document picker selects one JPEG/PNG up to10MiB and grants access to that selected content URI only. No broad storage or camera permission is requested. The existing server independently decodes/validates/strips metadata and enforces ownership/privacy, even if the provider's filename/MIME/size is misleading. Picker cancellation completes without manufacturing a photo.

Location permission is requested only when the trusted web app requests device location. Coarse permission is sufficient for approximate nearby discovery; denial returns through the existing error/manual-location path. No background location is requested. Android back closes a web dialog first, then uses the existing app Back button where present; platform callbacks cover modern Android gestures and older supported versions. System-bar/keyboard insets keep the web viewport usable. Main-frame connection/certificate errors provide a retryable native connection screen; third-party image failure does not silently authorize another server.

Backups/device-transfer rules exclude this app's web/session/setup data. Server database/media backups remain a separate responsibility. A WebView frontend and a debug APK are not proof of production uptime or release readiness.

## Current verification

Local Gradle verification passes:4 origin-policy unit tests, Android lint with0 errors/2 warnings, debug assembly and unsigned release assembly. Warnings identify the intentionally pinned toolchain and JavaScript needed by React; the trusted-origin/no-local-file/no-native-bridge controls are documented. Modern back handling is implemented directly with Android's platform dispatcher; the older fallback has a narrowly explained lint suppression.

The debug APK installed and launched in an owned Android15/API35 Google APIs emulator using hardware acceleration. Native connection setup rejected public HTTP and opened the live app atlocalhost through the explicit reverse connection. Further account/upload/permissions/back/keyboard/device checks are in progress in Test chat. Physical Oppo, HTTPS release installation, actual provider outage/public tunnel and Firebase receipt remain unverified. No Firebase project exists; native push adaptation remains a separate incomplete item, and the connection/settings text says push is unconfigured.

## Viva Notes

1. **Is this an Android app or just a website link?** It is an installable Android APK with a native Activity, WebView, document picker, permission handling and connection policy. Its interface is the existing React web application and its backend remains remote.
2. **Why reuse WebView?** It preserves the final mobile designs and working React/Express architecture without rewriting the frontend or adding a second app framework. The tradeoff is network/server dependence and separate native push work.
3. **What differs between debug and release?** Debug permits explicitly bounded local HTTP and developer inspection. Release requires HTTPS and disables WebView debugging. A release APK also needs a private signing key.
4. **How do photos reach the backend?** Android grants the selected URI to the WebView file input; the existing upload API validates/sanitizes it and records EXIF/privacy under the signed-in account.
5. **How do you stop arbitrary websites using native permissions?** The host checks exact scheme/host/port and current page origin; file access/third-party cookies are disabled, external navigation leaves the app, and no native JavaScript bridge is provided.
6. **Does the APK prove the whole project is complete?** No. It proves packaging/build/install only within the stated tests. Physical-device flows, production server access, source-data limitations and real push need their own evidence.

Implementation references: [Android WebView guide](https://developer.android.com/develop/ui/views/layout/webapps/webview), [file chooser validation](https://developer.android.com/reference/android/webkit/WebChromeClient#onShowFileChooser(android.webkit.WebView,%20android.webkit.ValueCallback%3Candroid.net.Uri[]%3E,%20android.webkit.WebChromeClient.FileChooserParams)), [WebView file access risks](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion).
