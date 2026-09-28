# Android Data safety working draft

This is an audit worksheet, not a completed legal declaration. Reconcile it with the release manifest, dependency list, backend logs and deployed privacy policy before submitting. Source: [Google Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

## Product-specific data map

| Data | Candidate Console category | Purpose / behavior |
| --- | --- | --- |
| Email and Supabase account UUID | Personal info → Email address, User IDs | Account management and app functionality; needed for the real synced account |
| Entered subscriptions, USD amounts, renewals and account entitlement | Financial info → Purchase history; assess Other financial info for entered recurring costs | App functionality; inventory is entered by the user |
| Tool names, billing URLs, last-used dates and decisions | App activity → Other user-generated content; assess Other actions for decision events | App functionality; synced through Supabase |
| Server request metadata (IP, user agent, time) | Determine from actual retained logs and their use | Hosting/auth security and operations; do not claim no collection solely because there is no analytics SDK |
| Sample rows and local reminder schedule | On-device only, if implementation remains local | Do not report as uploaded data when never transmitted |

The companion does not collect bank/card credentials, contacts, photos, calendar content or inbox messages. OTP email delivery is not inbox access. Local notifications do not imply remote push tokens. The app has no advertising SDK or third-party behavioral analytics integration in the planned release; confirm dependencies before asserting this in Console.

## Answers requiring final audit

- Data collected: **Yes** for authenticated account functionality.
- Encryption in transit: **Yes** only after confirming all first-party account/data endpoints use HTTPS. This is not end-to-end encryption.
- Account creation: email-based authentication; identify the available methods accurately in Console.
- Deletion: in-app account deletion plus public `https://ritestack.app/delete-account`; deploy and test both before claiming availability.
- Optional versus required: classify per data type and actual usable unsigned experience; do not assume a read-only sample makes all account data optional for core synced use.
- Sharing: Supabase/Cloudflare processing solely on RiteStack's behalf may fit the service-provider exception. Verify actual contracts and logging uses before selecting No sharing. No selling data is a different claim from No sharing.
- Independent security review: **No** unless a qualifying external review has actually been completed.
- Data retention: account/profile/inventory removed by deletion; backups expire later, and payment processors may retain legally required records. Do not invent fixed purge deadlines.

Google requires a usable public deletion pathway even when in-app deletion exists. An email request is permitted when prominent and clearly scoped to the app; users must not have to reinstall. [Deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).

Keep secrets, reviewer credentials, customer data and signing keys out of this document.
