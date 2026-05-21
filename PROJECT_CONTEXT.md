# Garden of Us — project context

A single-page pixel-art web app where someone pays ₹199 to send a partner a personalized "flower garden + love letter" experience accessible via a unique link.

This document is the working reference for the codebase as of branch [feat/supabase-integration](https://github.com/karanpawar3131/garden-of-us/tree/feat/supabase-integration) (PR [#1](https://github.com/karanpawar3131/garden-of-us/pull/1)).

---

## Architecture overview

```
+-------------------+
|   Vite + React 19 |  <-- Single-page app, mobile-first 9:16 layout
|  Tailwind v3 JIT  |
|     Tone.js       |
+---------+---------+
          |
          | publishable key, anon role
          v
+-------------------+        +----------------------+
|  Supabase REST    |        |  Razorpay Checkout   |
|  (stories table)  |        |  (test mode, ₹199)   |
+-------------------+        +----------------------+
```

- **Framework:** Vite 8 + React 19 (no SSR, no router library — manual hash routing).
- **Styling:** Tailwind CSS v3 (JIT scans `index.html`, `garden-of-us.jsx`, `src/**`) plus a single in-component `<style>` block (`GlobalStyles`) for fonts, keyframes, and custom classes (`.pixel-card`, `.pixel-input`, `.font-pixel`, `.bg-dream`, etc.).
- **Audio:** Tone.js ambient pad and pluck sounds. Requires a real user gesture to start (`AudioContext.resume`).
- **Icons:** `lucide-react`.
- **Data layer:** Supabase (`@supabase/supabase-js`) using the publishable (`sb_publishable_*`) key — safe in the client because all access is governed by RLS.
- **Payments:** Razorpay Checkout, dynamically loaded from `https://checkout.razorpay.com/v1/checkout.js`. Currently in test mode.

### Repository layout

```
.
+-- garden-of-us.jsx           Mega-component (~1700 LOC): all screens + state machine
+-- index.html                 Vite entry (mounts /src/main.jsx)
+-- src/
|   +-- main.jsx               ReactDOM render of App
|   +-- index.css              `@tailwind` directives only
|   +-- supabase.js            Supabase client + saveStory / markStoryPaid / fetchStory
|   +-- razorpay.js            Razorpay SDK loader + openRazorpayCheckout
+-- assets/                    15 pixel-art PNGs (also base64-embedded in the JSX)
+-- vite.config.js             @vitejs/plugin-react only
+-- tailwind.config.js         Default v3, content paths include the root JSX
+-- postcss.config.js          tailwindcss + autoprefixer
+-- .claude/launch.json        Preview-panel dev-server config (port 5173)
+-- LAUNCH-PLAYBOOK.md         Original product/launch doc (predates this branch)
+-- README.md                  Original bundle README (predates Vite migration)
```

> The 15 PNG sprites in `assets/` are also embedded as base64 data URIs inside `garden-of-us.jsx`'s `ASSETS = { ... }` block (lines 9-25). That is the active asset path today; the `assets/` folder is the source for the eventual swap-out described in `README.md`.

---

## Supabase schema

Project: `vlezhnszokouizauemej` ([dashboard](https://supabase.com/dashboard/project/vlezhnszokouizauemej)).

```sql
create table public.stories (
  id                   text  primary key,         -- client-generated, ~10-char alphanumeric
  sender               text  not null,
  partner              text  not null,
  nickname             text  not null,
  note                 text  not null,            -- max 400 chars enforced at app layer
  email                text,                      -- nullable (legacy rows pre-payments)
  phone                text,                      -- nullable; 10-digit Indian mobile when set
  payment_status       text  not null default 'pending',  -- 'pending' | 'paid' | 'failed'
  amount_paid          integer,                   -- paise; null until paid
  razorpay_payment_id  text,                      -- null until paid
  created_at           timestamptz not null default now()
);
```

### Row-Level Security

RLS is **enabled**. Three policies, all bound to `anon, authenticated`:

| Policy | Scope | Predicate |
|---|---|---|
| `anon can insert stories` | `INSERT` | `with check (true)` |
| `anon can read stories` | `SELECT` | `using (true)` (paid filter is applied client-side in `fetchStory`) |
| `anon can mark stories paid` | `UPDATE` | `using (payment_status = 'pending') with check (payment_status in ('paid','failed'))` |

There is **no** `DELETE` policy — rows cannot be removed via the publishable key.

### Why SELECT is permissive

An earlier iteration restricted `SELECT` to `payment_status='paid'`. That made `UPDATE` impossible: PostgreSQL applies SELECT visibility during UPDATE (the UPDATE reads the row first), so the mark-paid call never matched any row. Solution was to broaden SELECT to `using (true)` and move the paid-filter into `fetchStory()`. This is documented because anyone re-tightening the policy will break payments.

---

## Payment flow

```
[FormScreen] -> submit ----------> [PreviewScreen]
                                         |
                                         | click PAY & GENERATE LINK
                                         v
                                handlePurchase(id = generateId())
                                         |
                  +----------------------+----------------------+
                  |                                             |
                  v                                             v
   1. saveStory(id, {... + email/phone})            (any failure -> alert + stay)
        -> INSERT row, payment_status='pending'
                  |
                  v
   2. openRazorpayCheckout({...})
        -> dynamically loads checkout.js
        -> opens Razorpay modal, prefilled
                  |
        +---------+--------+
        |                  |
   handler fires       ondismiss / 'payment.failed'
        |                  |
        v                  v
   3a. markStoryPaid(   3b. throw PaymentCancelled or Error
       id,                  |
       {payment_id,         v
        amount: 19900})     handlePurchase catch:
        -> UPDATE row       - PaymentCancelled -> silent return
        |                   - other Error -> alert
        v
   4. setScreen('success')
      + history.replaceState(... '#/v/' + id)
```

Key invariants:
- The row exists in `pending` state before Razorpay opens; the link is **only** generated post-success.
- Cancelling leaves the pending row in the DB (no DELETE policy). They accumulate; cleanup is a future concern.
- `fetchStory()` filters `payment_status='paid'`, so a guessed/leaked pending ID cannot open the experience.

---

## Important components

All UI lives in `garden-of-us.jsx`. The state machine is `screen` in the top-level `App`:

| `screen` | Component | Purpose |
|---|---|---|
| `loading` | inline JSX | initial state while `useEffect` checks the URL hash |
| `form` | `FormScreen` | collects sender/partner/nickname/note/email/phone |
| `preview` | `PreviewScreen` | shows preview + PAY button (entry point for `handlePurchase`) |
| `success` | `SuccessScreen` | shareable link, copy/WhatsApp/share + "preview as them" |
| `intro` | `IntroScreen` | partner-side entry; "YOU'VE GOT MAIL" envelope + reveal cascade |
| `garden` | `GardenScreen` | flower-picking; 5 flowers, 3 required to advance |
| `reveal` | `RevealScreen` | bouquet + nickname + envelope -> letter card + meanings |

Reusable building blocks at the top of the file:
- `GlobalStyles` — the giant `<style>` block (fonts, keyframes, `.pixel-*` classes, color tokens).
- `FallingPetals`, `FloatingHearts`, `BurstEffect`, `ConfettiBurst` — animated particle layers.
- `MusicButton` — fixed top-right toggle, calls `useAmbientMusic` hook.
- `useAmbientMusic` — Tone.js ambient loop + pluck sound. Needs trusted gesture to start.
- `generateId` (inside `App`) — `Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4)`.

---

## Routing / link flow

Routing is **hash-based** (`#/v/{id}`), implemented manually inside `App`:

1. On mount, a `useEffect` reads `window.location.hash`. If it matches `^#/v/(.+)$`, the captured id is passed to `fetchStory(id)`.
2. If the row exists **and** is paid, `setData(...)` + `setScreen('intro')`.
3. Otherwise, fall through to `setScreen('form')` (sender flow).
4. After a successful purchase, `history.replaceState(null, '', pathname + '#/v/' + id)` puts the link in the address bar so copy/share grabs it.

Hash routing was chosen over path routing (`/v/:id`) because the app is currently a static SPA — no rewrite/proxy needed. Switching to path routing requires a host-level rewrite rule (e.g. Vercel `rewrites` to `/index.html`).

---

## Deployment setup

**There is no live deployment yet.** The code lives only on GitHub at [karanpawar3131/garden-of-us](https://github.com/karanpawar3131/garden-of-us) (branch `feat/supabase-integration`).

What exists:
- `package.json` scripts: `dev`, `build`, `preview`.
- A clean `npm run build` succeeds in ~1s and produces `dist/` with `index.html` + a single `index-*.js` (~951 KB before gzip, ~474 KB gzipped — base64 assets dominate) + `index-*.css` (~17 KB, ~4 KB gzipped).
- No `vercel.json`, `netlify.toml`, or `.github/workflows/` — no platform config and no CI.

Recommended path (not done yet): Vercel "Import Project" from the GitHub repo. Vercel auto-detects Vite. No env vars currently need to be set (keys are hardcoded — see below).

---

## Environment variables

**None used.** Both the Supabase URL/key and the Razorpay key are hardcoded in source:

- `src/supabase.js`: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` constants.
- `src/razorpay.js`: `RAZORPAY_KEY_ID` constant.

This is intentional for now — both are designed to be safe in the client (Supabase publishable key is RLS-gated; Razorpay test key is non-sensitive). It does mean **rotating keys requires a code change and a redeploy**. Moving them behind `import.meta.env.VITE_*` is a small, mechanical follow-up.

---

## Technical risks

Ordered by severity.

1. **No server-side Razorpay verification.** The "mark paid" call is a client-side `UPDATE` with the publishable key. Anyone reading the source can write a script that inserts a pending row and immediately marks it paid — getting a free, valid link without paying. Acceptable for test mode and small soft launches; **must be moved server-side before real revenue**. Path: Supabase Edge Function that creates Razorpay Orders and verifies `razorpay_signature`.

2. **No server-side rate limiting or abuse protection.** Anon can insert unlimited rows. A simple script could flood the `stories` table. No CAPTCHA, no per-IP throttle. Risk: cost (storage), nuisance, and reputational ("the link generator is broken because the table is full of junk").

3. **Hardcoded keys in source.** Rotating any key needs a code edit + redeploy. Mitigated by `VITE_*` env vars + Vercel project settings.

4. **PII exposure surface.** With permissive SELECT, anyone who guesses (or scrapes from logs/referers) a 10-char ID can read all columns including `email` and `phone`. ID entropy (~50 bits if alphanumeric) makes guessing impractical, but it's a real privacy surface. Mitigation options: column-level RLS, or move reads through an Edge Function that returns only display fields.

5. **Pending rows pile up forever.** No DELETE policy and no cleanup job. Over time this is just clutter, but it also means the test-data leftovers (`ddrg77fwww`, `a3tf9g94t7`, `xt08m9zo6j`, `test_pending_row`, `6hn2rvu4p1`) stay until manually removed.

6. **Cross-origin Razorpay iframe can't be auto-tested.** Razorpay Checkout is a cross-origin iframe (`api.razorpay.com`). Automated UI tests against the success path require either (a) mocking `window.Razorpay`, or (b) a backend that exposes a dry-run hook. There is no integration test today.

7. **Bundle weight.** `index-*.js` ~951 KB before gzip. The base64-embedded assets are the cause. README documents the intended swap to file paths (`/assets/...`); doing this drops the bundle by ~80% and enables browser caching per-asset.

8. **`generateId` collision risk is tiny but non-zero.** ~50 bits of entropy + no `INSERT ... ON CONFLICT` handling. A collision today would throw a Postgres unique-violation error and the user would see the generic "payment didn't go through" alert. Defensive fix: catch the collision and regenerate.

9. **Audio start coupled to envelope open.** `IntroScreen.openEnvelope` does `await toggleMusic()` first. If `Tone.start()` ever rejects (no trusted gesture, blocked AudioContext), the envelope appears to do nothing because `setStage(2)` is unreachable. Should wrap in try/catch or move the audio toggle off the critical path.

10. **React 19 + StrictMode-double-effects.** `src/main.jsx` doesn't use `StrictMode` (intentional — Tone.js + lots of refs/timeouts don't tolerate double-mount well). Onboarding teammates should know not to "fix" this.
