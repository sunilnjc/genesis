# Two-user isolation — RiteStack

Integrity is **identity (`auth.uid()`) + RLS**, not SSO.

## What must hold

User A writes OpenAI Pro+ $200. User B, with a different JWT, must read **zero** rows — including when they filter `user_id = A`. User B must not insert a row with A’s `user_id`.

The founder seed ($445) is **not** in this database. New accounts start empty.

On **ritestack.app** (and any build with Supabase configured), unsigned visitors see **no rows** — not the founder notebook, not another user’s list. Sign-in is required to see or add tools. Localhost without Supabase may keep on-device localStorage for the founder only.


Job Pursuit (`vhjwzxcgkmxvrmfstzpy`) is forbidden.

## Automated proof

From the genesis checkout, with `.env.local` containing the **ritestack** URL, anon key, and service role (service role stays off the client):

```bash
npm run isolation
npm run e2e:isolation
```

`npm run isolation` is `node scripts/isolation-test.mjs`. Expected stdout includes `PASS: two-user isolation` and the RiteStack project ref.

`npm run e2e:isolation` runs Playwright against **https://ritestack.app** (`e2e/isolation/playwright.config.ts` + `e2e/isolation/isolation.spec.ts`). It reuses `ritestack-iso-a@example.invalid` / `ritestack-iso-b@example.invalid` via the Admin API (password session, no magic-link mail, never the founder inbox). First time: `npx playwright install chromium`.

Unsigned HTML and the login wall must not show founder rows or User A’s IsoProbe. User B’s inventory stays empty even if `subscription-graveyard.v1` is poisoned with the founder seed.

## Manual proof (two browsers)

1. Open `https://ritestack.app` (or `http://127.0.0.1:4317` after signing in).
2. Browser A: magic-link as address 1. Inventory is empty. Add OpenAI Pro+ $200.
3. Browser B (private window): magic-link as a different address. Inventory stays empty. A’s $200 must not appear.
4. Sign out A — hosted URL must return to the login screen, not localStorage.
5. Do not send extra magic links to the founder inbox; the automated pair above is enough.

## SQL check (optional)

As A, `select count(*) from subscriptions` is 1. As B, it is 0. `anon` has no table grant.
