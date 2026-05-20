# Garden of Us — tasks

Living list. Pair with [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the why behind each item.

---

## Completed

- [x] Vite + React 19 + Tailwind v3 scaffold around the single-file `garden-of-us.jsx`
- [x] Mobile-first 9:16 layout with pixel-art assets, ambient music, full animation set
- [x] 7-screen state machine: loading -> form -> preview -> success -> intro -> garden -> reveal
- [x] Hash routing `#/v/{id}` for shareable links
- [x] Supabase persistence (`stories` table) — links work cross-device
- [x] Form fields: sender, partner, nickname, note (400-char cap), email, phone (10-digit Indian mobile)
- [x] Razorpay Checkout integration (test mode, ₹199 INR, themed, prefilled, +91 phone)
- [x] Payment flow: insert pending -> open Razorpay -> mark paid -> success screen
- [x] Cancel path: silent return, PAY button re-enables, no link generated
- [x] Defense in depth: `fetchStory()` rejects non-paid IDs (pending links can't open)
- [x] RLS policies: anon INSERT, permissive SELECT, UPDATE only pending -> paid|failed
- [x] Production `npm run build` works
- [x] Repo on GitHub with `.gitignore`, initial commit, PR open

---

## Pending — must-do before going live

- [ ] **Server-side Razorpay verification.** Move order creation + `razorpay_signature` check into a Supabase Edge Function (or Vercel serverless endpoint). Without this, anyone can mark stories paid without paying.
- [ ] **Deploy.** No live URL yet. Recommend Vercel + GitHub auto-deploys.
- [ ] **Rotate Razorpay to live mode.** Requires KYC (PAN, bank details) in the Razorpay dashboard. Update `RAZORPAY_KEY_ID` to `rzp_live_*` after.
- [ ] **Move secrets to env vars.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `VITE_RAZORPAY_KEY_ID`. Add to Vercel project settings. Keep a fallback in code so a fresh clone still runs.
- [ ] **Domain.** Buy a domain (e.g. `gardenof.us`, `gardenofus.in`) and point at the deployment.

## Pending — high impact, soon

- [ ] **Razorpay receipt / confirmation email.** Today the user fills `email` but never receives anything. Hook up Razorpay's "send receipt to email" or send our own via Resend/SES from an Edge Function on the `markStoryPaid` event.
- [ ] **Asset swap (base64 -> file paths).** Drop bundle from ~951 KB to ~10 KB JS + cached image requests. The README documents exactly how to do it: replace each `ASSETS.foo` data URI in `garden-of-us.jsx` with `/assets/foo.png`. The `assets/` folder is already in the repo and built into the Vite output via `public/`-style serving (will need to move the folder).
- [ ] **OG / share preview.** Today `<title>` is "Garden of Us" with no `<meta>` tags. WhatsApp/Twitter shares look bad. Add a permanent OG image (one nice pixel-art screenshot), description, and a per-link dynamic OG that says `"a flower garden for {nickname}"`. Per-link OG needs server-side rendering for the share crawler — minimum a serverless function that returns HTML for `?og=1` requests.
- [ ] **Analytics.** Currently zero observability. Recommend Plausible or Umami (privacy-friendly, simple). Track funnel: form view, form submit, PAY click, payment success/failed, link opens, picks completed, letter opened.
- [ ] **Error tracking.** Wire Sentry (or open-source alternative) so payment failures and runtime errors don't disappear into `console.error`.

## Pending — nice to have

- [ ] **Pricing toggle / coupon codes.** Single hardcoded ₹199. A coupon table + Razorpay coupon support would unlock launch discounts.
- [ ] **Multiple price tiers.** Free vs paid version, or a "premium" tier with extra flowers / music / animations.
- [ ] **Path routing `/v/:id`** instead of `#/v/:id`. Needs a Vercel `rewrites: [{ source: "/v/(.*)", destination: "/" }]` and small change to the routing logic in `App`.
- [ ] **PWA / Add to home screen.** Mobile-first app, would feel native.
- [ ] **More animations / Easter eggs.** Bouquet tap counter (`bouquetTaps`) is already wired but plateaus at "tapped N times" — could trigger a special effect at e.g. 10 taps.
- [ ] **More flower types / pick more than 3.** Code already supports it (`FLOWERS` array + `picked.length >= 3` gate).
- [ ] **Music selection / per-experience song.** Tone.js setup is one fixed ambient pad; could let the sender pick a vibe.
- [ ] **Reveal screen sharing.** SHARE THIS MOMENT button already exists in `RevealScreen`; wire to native `navigator.share` with a screenshot or short description.
- [ ] **Mobile keyboard polish.** Inputs already use `inputMode` / `autoComplete`; revisit on a real iOS Safari test once deployed.

---

## Roadmap (suggested order)

**Sprint 1 — make it shippable** (a few days of focused work)
1. Stand up an Edge Function for Razorpay (create order + verify signature). Switch `markStoryPaid` to call it.
2. Move secrets into env vars + add a `.env.example`.
3. Deploy to Vercel. Smoke-test the full paid flow in production with test keys.
4. Asset swap (base64 -> file paths). Re-test, ship.

**Sprint 2 — go live**
1. Razorpay KYC in dashboard, switch to live key.
2. Buy domain, point at Vercel.
3. Send receipt email on payment success.
4. Add OG meta + a default share image.
5. Manual end-to-end with a real ₹199 charge (refund after).

**Sprint 3 — measure, polish**
1. Analytics (Plausible) + Sentry.
2. Per-link dynamic OG (`"a flower garden for {nickname}"`).
3. Mobile QA on real iOS + Android.
4. Pending-row cleanup job (cron + Edge Function: delete `pending` rows older than 24h).

**Sprint 4 — growth experiments**
- Coupon codes, multi-tier pricing, referral discounts, occasion-specific themes (Valentine's, anniversaries).

---

## Known bugs

- **Picked flowers don't visually fade.** The button gets `opacity-15 scale-50` when picked but the inline `animation: pop-in ... forwards` keeps it at the animation's final keyframe (opacity 1, scale 1) — animations beat property declarations in the cascade. Either drop `forwards`, or replace the picked styling with `!important`, or use a CSS variable swap instead. Cosmetic; counter and DONE button still work.
- **`generateId` collision is unhandled.** A duplicate id would throw a Postgres unique-violation, bubble out as `[purchase] flow failed`, and the user sees the generic "payment didn't go through" alert. Probability is tiny but the failure mode is wrong (they might have actually paid). Fix: catch the conflict and regenerate, or use `gen_random_uuid()` server-side.
- **`openEnvelope` blocks on audio.** `await toggleMusic()` is the first awaited call. If `Tone.start()` rejects (untrusted gesture, blocked context), `setStage(2)` never runs and the envelope appears frozen. Wrap audio in try/catch.
- **Tight visual spacing in intro reveal.** `"<sender> is taking you on"` and `"build a garden" / "for someone you love"` look cramped on small screens. The DOM spacing is correct; it's the Caveat script font + `leading-none` + `-rotate-*` interaction. Intentional design, but worth revisiting if it confuses users.
- **Phone prefill in Razorpay does not pre-populate the input** until +91 is sent as part of `contact` (now fixed in `src/razorpay.js` — keeping here as a regression risk if anyone touches that line).
- **Music auto-starts on envelope tap on the partner side.** First tap arms audio (good UX in browsers that need a gesture) but combines with the envelope-open animation. Two side effects from one action — fine, just noted.

---

## Scalability improvements

These are worth doing roughly in this order if/when traffic justifies it.

1. **Asset swap (see Pending).** Single biggest win — 80%+ bundle reduction.
2. **CDN cache for `/v/:id` page shell.** The shell HTML is identical for every link; only the JSON payload differs. Vercel's default edge cache is enough.
3. **Edge Function for Razorpay + Supabase writes.** Server holds the secret keys, does signature verification, can rate-limit by IP, and lets us tighten Supabase RLS (no more permissive client UPDATE).
4. **Index on `payment_status`.** Trivial; payoff small until row counts are in the tens of thousands.
5. **Background cleanup of stale pending rows.** Scheduled Edge Function: `delete from stories where payment_status='pending' and created_at < now() - interval '24 hours'`. (Requires a DELETE policy or service-role key.)
6. **Code split per screen.** Dynamic `import()` for `GardenScreen` / `RevealScreen` etc. Recipient-side screens don't need to ship to the sender. Only worth doing after the base64 swap; until then code is a rounding error next to assets.
7. **Pre-load checkout.js earlier.** Today it loads on PAY click. Pre-warm it on the Preview screen so the modal opens instantly.
8. **Tests.** Zero today. A handful of Playwright tests against the real flow (with `window.Razorpay` mocked) would catch most regressions cheaply. Worth doing once the codebase has more than one developer.
9. **Linting / formatting.** No ESLint, no Prettier config. Add both with sane defaults (`eslint-config-react`, Prettier default). Optional pre-commit hook.

---

## Active tech debt to clean up

- Two original docs (`LAUNCH-PLAYBOOK.md`, `README.md`) describe the pre-Vite, pre-Supabase bundle. Mostly stale. Either update or move to an `archive/` folder.
- 5 leftover test rows in `stories`: `ddrg77fwww`, `a3tf9g94t7`, `xt08m9zo6j`, `test_pending_row`, `6hn2rvu4p1`. Safe to delete from the Supabase Table Editor.
