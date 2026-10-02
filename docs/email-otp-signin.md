# Email-code sign-in — 2 October 2026

Web sign-in now requests an email code and verifies it on the same page using Supabase `verifyOtp` with type `email`. The shared form supports paste/autofill, resend after 60 seconds, changing the email, and recoverable validation, expired/used-code, rate-limit and network errors. Production currently sends eight digits; the form accepts Supabase's configurable six-to-ten-digit codes without stripping leading zeroes.

Both new-account and returning-user email templates contain the code only. Deploy the web Worker first, then `workers/auth-mail`, so users have a code-entry screen before receiving code-only emails. Existing callback routes remain compatible with previously sent links, and their error screens direct users to request a code.

Validation before deployment:

- 119 unit tests pass, including request/verification contracts, code validation, expired-code and rate-limit responses, transport failures, and code-only email templates.
- TypeScript and OpenNext production build pass.
- Targeted ESLint passes for the new form/helper and other changed files. AuthProvider retains its pre-existing `set-state-in-effect` diagnostic, and the mail Worker retains its existing anonymous-default-export warning.
- Browser test with the existing QA account: email delivery, resend cooldown, incorrect-code rejection, successful code verification and preservation of `/unlock` all verified. No account data or billing settings changed.

The production email hook uses the auth-mail Worker. Remote Supabase fallback templates were not updated because the saved management token has expired; the checked-in templates and deployed hook are the intended delivery path.
