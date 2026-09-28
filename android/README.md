# RiteStack Android

Native Kotlin / Jetpack Compose companion for the live RiteStack service. Android 8.0+ (API 26), target Android 16 (API 36), application ID `app.ritestack.android`, version 1.0.0 (1).

## Build and run

Open `android/` in an Android Studio version supporting AGP 8.13.2 (Otter or newer), or use the committed Gradle 8.13 wrapper. Install Android SDK platform 36 and use an up-to-date JDK 17. The old bundled JBR 17.0.6 on the development laptop crashed during lint; Temurin 17.0.20.1 completed validation. Local SDK paths belong in ignored `local.properties`.

```sh
./gradlew testDebugUnitTest lintDebug assembleDebug bundleRelease
./gradlew connectedDebugAndroidTest
```

Run from this directory with `JAVA_HOME` pointing at JDK 17 and `ANDROID_HOME` at your SDK. Debug APK: `app/build/outputs/apk/debug/app-debug.apk`. Release bundle: `app/build/outputs/bundle/release/app-release.aab`. Without signing credentials, the bundle is **unsigned and not uploadable**.

For command-line release signing, provide `RITESTACK_KEYSTORE_PATH`, `RITESTACK_KEYSTORE_PASSWORD`, `RITESTACK_KEY_ALIAS` and `RITESTACK_KEY_PASSWORD` through your private local environment. Alternatively use Android Studio's Generate Signed App Bundle wizard. Never commit a keystore, signing password, service-role key or review credentials.

## Product and security

- Email OTP sign-in/signup, plus ordinary password sign-in for accounts that have a password (including a privately provisioned review identity).
- Same RiteStack account/profile/inventory as the web and iOS apps; per-row writes and ownership filters protected by Supabase RLS.
- Android Keystore AES-GCM session storage in no-backup files; tokens are never logged. Backup/device-transfer exclusions cover local settings and work queues.
- Decide next 14 days or all pending decisions; Keep/Cut/Pause/Unpause. Inventory search/add/edit/remove; USD amounts; unknown last-used dates stay unknown. Cuts are recorded decisions, not verified cancellations or savings.
- Optional local WorkManager reminders around 9 AM, subject to Android scheduling delays. The nearest 60 distinct date/type events are scheduled; notification text omits tool names and amounts. Foreground/sync refreshes schedules; sign-out clears them. No exact-alarm permission, push service, tracking or advertising SDK.
- Free inventory and Cuts; profile trial/paid status gates ritual actions. No purchase screen or external checkout CTA.
- In-app account deletion uses the deployed authenticated endpoint. Public deletion requests: `https://ritestack.app/delete-account`.
- Sample mode is clearly labeled, remains local, and resets on exit.

## Tests

16 JVM tests cover dates, amount/URL validation, entitlement, failed writes, ownership guards, sign-out, sample reset and reminder scheduling. Compose tests cover invalid amounts, add/exit/reset, Pause/Unpause/Cut, and screenshots.

The optional `LiveAccountTest` uses two disposable accounts and deletes both. It skips by default. An ignored test-only fixture at `app/src/androidTest/assets/integration.json` has shape `{ "accounts": [{"email":"...","password":"...","id":"..."}, {"email":"...","password":"...","id":"..."}] }`. Never use customer accounts. Provisioning/cleanup must be managed outside the app; verify both users and cascaded rows are removed even after test failures. Remove the fixture and rebuild/uninstall the test APK afterward.

Screenshots from `captureStoreScreenshots` are saved in the app's external files `screenshots/` directory. Direct `adb shell am instrument` keeps the app installed for `adb pull`; Gradle may uninstall it after testing.

See [Play Console guide](release/play-console-guide.md), [listing copy](release/play-store-metadata.md), [Data safety draft](release/data-safety-draft.md), and [launch readiness](release/launch-readiness.md). Google Play approval, account verification and the required closed test are separate from code completion.
