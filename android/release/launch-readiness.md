# Android launch readiness — 28 September 2026

The native Android app is implemented and has passed local build, domain and emulator validation. It is **not yet signed for Play distribution or approved by Google**.

## Engineering evidence

- Application ID `app.ritestack.android`, Android 8.0+ / minSdk 26, target/compile SDK 36, version 1.0.0 (1).
- Gradle 8.13 / AGP 8.13.2 / Kotlin 2.2.21; Temurin JDK 17.0.20.1 on Apple Silicon.
- Debug APK builds. R8-optimized release AAB builds. Android lint passes with no errors; remaining warnings are dependency updates/style suggestions.
- 16 JVM tests pass: date windows, amount/URL rules, entitlement failure, ownership, failed writes, sign-out, sample reset and reminder scheduling.
- Android 14 (API 34) Pixel 7 emulator: four Compose journeys pass (invalid input; add/exit/reset; pause/unpause/cut; screenshot capture).
- Live Android 14 integration passes: password sign-in, CRUD, Keep/Cut/Pause/Unpause, Keystore session restoration, cross-account isolation, account deletion and rejected authentication after deletion. Two disposable QA accounts were deleted; zero associated profiles/inventory remain. No customer data was used. The private fixture was removed and the test APK rebuilt without it.
- Android 16 (API 36) Pixel 7 emulator: all four Compose journeys pass. Four real Android screenshots captured at 1080×2400 and visually reviewed.
- Reminder device test: final result recorded below after execution.
- Web support changes: 113 tests, TypeScript, changed-file ESLint and OpenNext production build pass.
- Store assets: real Android screenshots, existing 512×512 logo, and rendered 1024×500 feature graphic in `release/`.

## Local artifacts

- Installable development APK: `app/build/outputs/apk/debug/app-debug.apk` (debug-signed; not the Play release).
- Unsigned release bundle: `app/build/outputs/bundle/release/app-release.aab` (requires upload signing).
- Unit report: `app/build/reports/tests/testDebugUnitTest/index.html`.
- Lint report: `app/build/reports/lint-results-debug.html`.
- Screenshots: `release/screenshots/01-Decide.png` through `04-Account.png`.
- Store assets: `release/assets/`.

## Remaining launch work

- [ ] Deploy and verify public deletion and mobile policy routes (deployment evidence to follow).
- [ ] Provision a reusable private review identity with active access. Ordinary password authentication is supported; no credentials are hardcoded and no authentication bypass exists. Sample mode alone does not cover authenticated review.
- [ ] Verify Play Console owner/account, identity and physical-device requirements.
- [ ] Create/back up the upload key, sign the release AAB, enroll in Play App Signing and install through internal testing.
- [ ] Complete listing, Data safety, content rating, audience and Console declarations against the actual service.
- [ ] Test on a physical Android phone, including notification timing, offline/recovery and installation/update from Play. Emulator results do not substitute for this.
- [ ] Complete the required closed test and apply for production access if applicable: at least 12 continuously opted-in testers for 14 days for new personal accounts.
- [ ] Resolve Play pre-launch report findings, submit production release and receive Google approval.

No enrollment, payment, legal acceptance, tester recruitment, 14-day completion or Google approval is claimed. OTP delivery was already validated for the shared service during iOS work; this Android live run exercised password authentication rather than sending test email. Scheduled local reminders can be delayed by Android power management.
