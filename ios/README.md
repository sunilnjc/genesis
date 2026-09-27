# RiteStack for iOS

Native SwiftUI companion for the live RiteStack service. Supports iPhone and iPad on iOS 17 or later. Bundle ID `app.ritestack.ios`; version 1.0.0 (1).

## Build and run

Open `RiteStack.xcodeproj`, choose the RiteStack scheme, and run on a simulator. Xcode 26.6 was used for validation. The checked-in project can be regenerated with `xcodegen generate --spec ios/project.yml` from the repository root (XcodeGen is only a development dependency). There are no external iOS libraries.

For a device, choose the enrolled Apple Developer team in Signing & Capabilities. Distribution requires App Store Connect access, an appropriate certificate and provisioning profile. An unsigned archive is not uploadable.

```sh
xcodebuild -project ios/RiteStack.xcodeproj -scheme RiteStack \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
```

## Product behavior

- Email one-time-code sign-in and account creation through the existing Supabase Auth project. Tokens remain in device-only Keychain storage; no token or customer data is logged.
- Decide: next 14 days (inclusive), or all tools needing a decision; Keep, Cut, Pause and Unpause.
- Inventory: search, add, edit and remove individual tools; monthly USD total includes paused tools and excludes cuts. Optional provider billing links use the web catalog and can be edited.
- Cuts: recorded cut date and monthly value, with provider billing links retained. Recorded cuts are not verified cancellations or savings.
- Last-used dates are entered by the user or remain unknown. No inbox/bank scanning and no automated cancellations.
- Optional local reminders at 9 AM for renewals and pause reviews. Up to 60 nearest events; refreshed on foreground/sync. Device-only opt-in persists until sign-out. Notifications omit tool names and amounts.
- Free inventory and Cuts; existing trial/paid profile controls ritual actions. No purchase screen, web checkout or external purchase call to action in the iOS app.
- Account deletion in Account requires typing DELETE, then calls the deployed bearer-authenticated `/api/account` endpoint. Server derives the target from verified identity and deletes the auth user plus cascaded inventory/profile data.
- Sample preview works without an account and stores nothing remotely. All sample rows are labeled; sample changes reset when exiting.

## Architecture and boundaries

`Models/Tool.swift` implements schema and date-only business rules. `Services/API.swift` handles Supabase REST/Auth, per-row writes, refresh coalescing, and ownership filters. Server RLS is the authority; UI checks do not replace it. `AppStore` owns screen state and retains current in-memory rows after failed syncs. A failed save never presents a successful local write. No offline write queue is offered.

`AppConfig.swift` contains only the public Supabase URL and anon key, which are public client identifiers protected by RLS. Never add a service-role key, Paddle key or Apple credentials. RiteStack project: `gmbretmepjxrsmuxvpbn`; no other project is used.

`Resources/Providers.json` is an offline snapshot of `src/lib/brand-catalog.ts`, not a live URL-lookup service. Unknown providers require a manual URL. `Resources/PrivacyInfo.xcprivacy` describes linked account/inventory data used for app functionality, with no tracking or advertising SDKs.

## Testing

`RitualTests` covers window boundaries, pause rules, leap/DST arithmetic, entitlement, safe URLs, amount validation, Codable compatibility, and demo sign-out. `RiteStackUITests` exercises the sample journey, invalid input and screenshots. `LiveAccountTests` optionally exercises real OTP verification, CRUD, isolation and deletion with two disposable accounts.

The optional live fixture is `RiteStackTests/IntegrationFixture.json` (ignored). It must contain only freshly created QA identities and must never be committed. It is a test-target resource only. Remove after the test and regenerate the project. Run normal tests without it to skip the destructive live check.

Release metadata, evidence and remaining distribution requirements are in `release/`.
