# Publish RiteStack on Google Play

Requirements checked against official Google documentation on 28 September 2026. This guide prepares submission; it does not mean Google has approved the app or developer account.

## 1. Register the developer account

Open [Google Play Console](https://play.google.com/console/signup). Use the Google account intended to own RiteStack long term. Choose Personal for an individual, or Organization only when you actually represent a qualifying organization. Enter real legal and contact details, complete identity verification, review the distribution agreement, and pay the **US$25 one-time registration fee**. The account owner handles payment and legal declarations. [Google registration instructions](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).

For a new personal account, complete the Console's device-verification task using the Play Console mobile app on a non-rooted physical Android device running Android 10 or newer. An emulator or iPhone cannot complete this step. [Device verification](https://support.google.com/googleplay/android-developer/answer/14316361?hl=en).

## 2. Create the app record

Choose Create app, name **RiteStack**, default language English, type App, and Free. Use Productivity as the proposed store category. Confirm the production application ID from the release build before first upload; package identity cannot simply be renamed later. Complete declarations truthfully using the final build and the draft metadata beside this guide.

## 3. Prepare the release bundle

Use Android Studio to open `android/`, sync Gradle, and run the app on a real Android phone. Test email sign-in, session restoration, create/edit/delete, Keep/Cut/Pause, expired entitlement, poor connectivity, reminders, and account deletion with a disposable identity. Never test deletion on a customer's account.

New phone apps currently must target **Android 16 / API 36 or higher**, effective 31 August 2026. [Target API requirement](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-gb).

Choose Build → Generate Signed App Bundle / APK → Android App Bundle. Create or select the intended upload keystore, keep it outside the repository, and back up its alias/password securely. Choose release. Enroll in Play App Signing when creating the first release; Google protects the distribution signing key while the developer uses the upload key for bundles. Upload the signed `.aab`, not the debug APK. A debug build or an unsigned bundle is not a Play release. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756?hl=en).

## 4. Complete the listing and App content

Use `play-store-metadata.md` for copy and `data-safety-draft.md` for the privacy audit. Add real Android screenshots, a 512×512 store icon, and a 1024×500 feature graphic. At least two screenshots are required; use four clear phone screenshots when available. Do not upload the iOS screenshots as Android screenshots. [Asset specifications](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

Set the support email, privacy URL and account-deletion URL only after those HTTPS pages are deployed and checked. Complete Ads, App access, Content rating, Target audience, Data safety, and any other declarations requested by Console. Intended audience is adults managing paid developer tools; select only age groups actually targeted. RiteStack does not generate AI content, provide loans, or connect bank accounts; do not infer a financial-services answer merely from its expense display—review the actual questionnaire.

Review access must work repeatedly without waiting for the developer to forward an OTP. Provide a dedicated preconfigured review identity and supported reusable sign-in route through Console's private App access fields. The sample stack helps reviewers inspect UI, but is not proof they can inspect all authenticated features. Do not publish secrets in this repo. [Review access requirements](https://support.google.com/googleplay/android-developer/answer/15748846?hl=en).

## 5. Internal test, then the required closed test

First upload to Internal testing and verify installation from Google Play, updates, release signing, and the pre-launch report. Record defects and fixes.

For personal developer accounts created after 13 November 2023, run a **closed test with at least 12 testers continuously opted in for at least 14 days**. Recruit real testers, share the opt-in link, ask them to use the core flows, and keep their feedback. Internal testing does not substitute for this closed test. After the threshold is met, apply for production access and answer Google's questions about testing, feedback and readiness. Access is reviewed, not automatic. [Personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB).

## 6. Submit to production

After production access is granted, resolve all Console errors, verify the final signed bundle/version, countries, listing and declarations, then submit the production release for review. Google decides approval and timing. Use managed publishing if launch timing needs control. Monitor Android vitals, user reports and support after release.

## Monetization boundary

This release is a free companion that uses the account's existing entitlement and offers no purchase flow. Google's policy permits consumption-only apps, including paid services accessed after sign-in. Avoid purchase links or upgrade checkout flows in the app; inspect linked help/legal pages for onward payment navigation before submission. If adding in-app sales later, review Play Billing and applicable regional programs first. This is an implementation approach, not advance approval from Google. [Payments policy guidance](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en-AU).
