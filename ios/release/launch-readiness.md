# Release readiness — 27 September 2026

Status: implemented and tested, **not yet App Store launch-ready**. Distribution signing and Apple submission are outstanding. An unsigned archive does not satisfy distribution requirements.

## Delivered

Native iPhone/iPad SwiftUI app, iOS 17+, same user-owned RiteStack backend. Email OTP, Keychain sessions, Decide/Inventory/Cuts, full per-tool CRUD, provider billing catalog, 14-day window, keep/cut/pause/unpause, entitlement display, opt-in local reminders, sample preview, self-service deletion, app icon and privacy manifest. App Store description/review notes/privacy draft live beside this file.

Web endpoint merged in PR #33 and deployed to Worker `ritestack`, version `8c9550c2-4987-4303-9ac2-9656e87803b8`. No billing secrets changed; GitHub auto-deploy remains disabled. Public support and native privacy disclosures accompany the native source PR.

## Verified

- 110 web tests, TypeScript and changed-file ESLint pass.
- iPhone 17 Pro / iOS 26.5: nine business-rule tests and two native UI journeys pass, including failed-input validation and sample add/Cuts/sign-out.
- iPhone 15 Pro / iOS 17: all nine business-rule tests plus a live integration lifecycle pass. OTP verification, profile/trial retrieval, insert/update, pause-field clearing, cross-account read/write isolation and account deletion verified against production using only disposable QA identities.
- After deletion, old auth access is rejected and both profiles and inventory have zero remaining rows. All QA identities from this run were removed. Codes/fixtures are excluded from source and the release app.
- Unsigned arm64 Release archive builds. Icon 1024×1024 without alpha. No third-party iOS SDKs.

## External launch blockers

1. App Store Connect is at sign-in; no authenticated Apple session is available.
2. Xcode archive with the local development certificate's team and automatic provisioning reports “No Accounts” and no profile for `app.ritestack.ios`. No distribution identity/profile is available. Apple Developer membership and legal agreements cannot be verified without account access.
3. A signed archive must be validated, uploaded, processed in TestFlight, and tested on a physical device. None of these is claimed complete.
4. Create/verify the App Store app record, enter the prepared metadata/privacy/age-rating answers and screenshots, supply review access if requested, and submit for Apple review. Apple's acceptance of the free companion model has not been granted.

No Apple credentials, agreements, payment information or review approvals have been invented. The existing web checkout remains on its prior configuration.

## Packaging commands after Apple access is configured

Open `ios/RiteStack.xcodeproj`, select the enrolled team, then Product → Archive → Distribute App → App Store Connect. Use the proper team rather than assuming the existing local development certificate's team is enrolled. The unsigned local archive under `ios/build/` is for engineering verification only; regenerate a signed archive before upload.

Review references: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (3.1.3(f)), [account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/), [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
