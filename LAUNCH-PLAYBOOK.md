# 🌸 Garden of Us — Launch & Monetization Playbook
### Built for the Indian market · Tactical, no-BS

---

## TL;DR — Fastest path to first ₹

1. **Today** — Deploy free on Vercel, no payment yet. Test with 10 friends.
2. **This week** — Swap localStorage → Supabase. Add Razorpay. Pricing: **₹99 flat**.
3. **Week 2** — Buy domain (`gardenofus.in` or similar). Launch on Reels.
4. **Month 1 target** — 100 paid gardens = ₹9,500 revenue, ~₹9,100 profit.
5. **Month 3 target** — 1,000 gardens/month with a Valentine's push = ₹95K/month.

Realistic Year 1 ceiling if Reels hit right: **₹8–15 lakh revenue**, ~95% margin.

---

## PART 1 — Deployment (1–2 hours)

### Step 1: Convert to a proper Vite project

The current `garden-of-us.jsx` is a single-file artifact. To deploy, you need a real project structure.

```bash
npm create vite@latest garden-of-us -- --template react
cd garden-of-us
npm install lucide-react tone
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Then:
1. Copy `garden-of-us.jsx` into `src/App.jsx`
2. Copy the `assets/` folder into `public/assets/`
3. Replace the giant `const ASSETS = { couple: "data:image/png;base64,..." }` block with:

```js
const ASSETS = {
  couple: "/assets/couple.png",
  garden_bg: "/assets/garden_bg.png",
  bedroom_bg: "/assets/bedroom_bg.png",
  bouquet: "/assets/bouquet.png",
  envelope: "/assets/envelope.png",
  night_bg: "/assets/night_bg.png",
  heart: "/assets/heart.png",
  sparkles: "/assets/sparkles.png",
  logo: "/assets/logo.png",
  petals: "/assets/petals.png",
  rose: "/assets/rose.png",
  peony: "/assets/peony.png",
  tulip: "/assets/tulip.png",
  daisy: "/assets/daisy.png",
  sunflower: "/assets/sunflower.png",
};
```

This drops your JS bundle from ~500 KB to ~15 KB. Images get cached by the browser separately.

Configure Tailwind (`tailwind.config.js`):
```js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 2: Push to GitHub, deploy to Vercel

```bash
git init && git add . && git commit -m "init"
gh repo create garden-of-us --public --source=. --push
```

Then go to [vercel.com](https://vercel.com), "Import Git Repository", select `garden-of-us`. Vercel auto-detects Vite. Click deploy. Done in ~60 seconds.

**Free tier limits** (more than enough to start): 100GB bandwidth/month, unlimited deployments.

### Step 3: Buy a domain

Recommended: GoDaddy or Namecheap. ~₹700–1,000/year. Search for something memorable:

- `gardenofus.in` — clean
- `ourgarden.in` — short
- `bloomfor.me` — kawaii
- `gardentheirs.in` — works as a phrase
- `pluckforher.in` — playful
- `tinygarden.in` — soft

Connect to Vercel: domain settings → add custom domain → Vercel gives you DNS records → add them to your registrar → wait 10 min → done. Automatic HTTPS.

---

## PART 2 — Real Backend (Supabase, 2 hours)

You already know Supabase from REPKIT, so this is fast.

### Step 1: Create a project at [supabase.com](https://supabase.com)

Free tier: 500 MB DB, 50K monthly active users. Won't be a bottleneck for months.

### Step 2: Schema

In Supabase SQL editor:

```sql
create table gardens (
  id text primary key,
  sender text not null,
  partner text not null,
  nickname text not null,
  note text not null,
  picked_flowers jsonb,
  paid boolean default false,
  amount integer,
  payment_id text,
  created_at timestamptz default now(),
  viewed_count int default 0
);

-- Index for fast lookups
create index idx_gardens_id on gardens(id);

-- Enable Row Level Security
alter table gardens enable row level security;

-- Public can read any garden (so partners can view via link)
create policy "anyone can read" on gardens
  for select using (true);

-- Inserts only happen via the server (Vercel function with service_role key)
-- so no client-side insert policy needed

-- Allow increment of viewed_count from client
create policy "increment views" on gardens
  for update using (true) with check (true);
```

### Step 3: Swap storage functions in your app

Replace `safeStorageSet` and `safeStorageGet` in `App.jsx`:

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const safeStorageSet = async (key, value) => {
  // Called AFTER payment verification (see Part 3)
  const id = key.replace('exp:', '');
  const data = JSON.parse(value);
  const { error } = await supabase.from('gardens').insert({
    id,
    sender: data.sender,
    partner: data.partner,
    nickname: data.nickname,
    note: data.note,
    paid: true,
  });
  if (error) throw error;
  return true;
};

const safeStorageGet = async (key) => {
  const id = key.replace('exp:', '');
  const { data, error } = await supabase
    .from('gardens')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return JSON.stringify({
    sender: data.sender,
    partner: data.partner,
    nickname: data.nickname,
    note: data.note,
  });
};
```

Install: `npm install @supabase/supabase-js`

Add to `.env.local`:
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Add these env vars in Vercel dashboard too.

---

## PART 3 — Razorpay Integration (3–4 hours)

You've done this for REPKIT. Same flow.

### Step 1: Razorpay account

[razorpay.com](https://razorpay.com) → sign up → complete KYC (PAN, GST optional, bank account). Takes 1–2 business days for approval. Use **Test Mode** keys immediately to build.

**Fees** (verify current rates): 2% + GST = ~2.36% on each transaction. On a ₹99 order, that's ₹2.34. Net: ₹96.66.

### Step 2: Backend endpoints (Vercel Functions)

Create `api/create-order.js`:

```js
import Razorpay from 'razorpay';

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const order = await rzp.orders.create({
      amount: 9900, // ₹99 in paise
      currency: 'INR',
      receipt: `gou_${Date.now()}`,
      notes: { source: 'garden-of-us' },
    });
    res.json({ orderId: order.id, amount: order.amount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

Create `api/verify-and-save.js`:

```js
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role, NOT anon
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    garden 
  } = req.body;

  // Verify signature
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Save garden with paid=true
  const id = Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4);
  const { error } = await supabase.from('gardens').insert({
    id,
    sender: garden.sender,
    partner: garden.partner,
    nickname: garden.nickname,
    note: garden.note,
    paid: true,
    amount: 99,
    payment_id: razorpay_payment_id,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id, link: `${process.env.SITE_URL}#/v/${id}` });
}
```

### Step 3: Frontend payment flow

Update `handleSubmit` in `App.jsx`:

```js
const handleSubmit = async (formData) => {
  try {
    // 1. Create order
    const orderRes = await fetch('/api/create-order', { method: 'POST' });
    const { orderId, amount } = await orderRes.json();

    // 2. Open Razorpay checkout
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      name: 'Garden of Us',
      description: `A garden for ${formData.partner}`,
      order_id: orderId,
      handler: async (response) => {
        // 3. Verify + save
        const verifyRes = await fetch('/api/verify-and-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...response,
            garden: formData,
          }),
        });
        const { id, link } = await verifyRes.json();
        setData(formData);
        setExperienceId(id);
        window.history.replaceState(null, '', `#/v/${id}`);
        setScreen('success');
      },
      prefill: { name: formData.sender },
      theme: { color: '#FF6BB5' },
      modal: {
        ondismiss: () => console.log('Payment cancelled'),
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (e) {
    console.error('Payment failed:', e);
    alert('Payment failed. Try again?');
    throw e;
  }
};
```

Add Razorpay script to `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 4: Test in Razorpay test mode

Use test card: `4111 1111 1111 1111`, any future expiry, any CVV. Test UPI: `success@razorpay`. Switch to live mode keys when ready.

---

## PART 4 — Pricing Strategy

### Why ₹99 (not ₹49, not ₹149)

| Price | Problem |
|-------|---------|
| ₹49 | Feels disposable. People assume bad quality. Margin too thin. |
| **₹99** | **Impulse-buy threshold. "Cheaper than a coffee." High perceived value.** |
| ₹149 | Decision fatigue kicks in. Conversion drops. |
| ₹299+ | Now it's a "gift purchase" — compared to FNP flowers. Different category. |

₹99 lives in the **"why not"** zone. Especially for an under-25 audience who tap-buy on Instagram.

### Free tier strategy (after V1)

Give first garden free → user gets emotional → 60–70% pay to send a real one. The viral mechanism is everything: every recipient is a potential sender.

### Future pricing experiments

- **₹249 bundle**: 3 gardens (anniversary + birthday + valentine = whole year)
- **₹999 unlimited annual**: for serial gifters / creators
- **₹49 add-ons**: extra premium bouquet styles, voice note attachment, animated GIF version
- **B2B**: sell branded versions to D2C brands. "Send a garden from Mamaearth" for ₹50K/campaign.

---

## PART 5 — Marketing Playbook

You already have the cheat code: **4M+ Reels impressions and UGC experience.** This is built for your skillset.

### The viral mechanic

Every garden you sell has a built-in viral loop:
1. Sender pays ₹99
2. Receiver opens the link, has an emotional moment
3. Receiver shares the screenshot/screen recording to their story
4. 500–5000 of their friends see it
5. Some convert into senders themselves

**The reveal moment IS the marketing.** That's why the tappable bouquet, the heart bursts, and the nickname reveal matter — those are the screenshot moments.

### Content angles that will work

**Reaction reels:**
- "POV: he made you an entire app instead of buying flowers 🌹"
- Film someone receiving the link, opening it, reacting. Authentic > polished.

**Compare reels:**
- "₹500 bouquet that dies in 3 days vs ₹99 digital garden that lasts forever"
- "Roses ₹699 · Cake ₹1,200 · This ₹99 ✿ — guess which one she remembered?"

**Behind-the-scenes:**
- "I built an app for my girlfriend for our anniversary — here's how she reacted"
- Karan-as-builder content. Plays into your existing positioning.

**Trend hijacks:**
- Whatever audio is trending + the bouquet reveal on screen
- Lyric sync trends with the letter opening

**Long-distance niche:**
- "Long-distance relationship gift ideas under ₹100"
- This is a HUGE market with high purchase intent and few good products

### The festival calendar (where Indian buyers actually spend)

| Date | Volume opportunity | Lead time |
|------|-------------------|-----------|
| **Feb 14 — Valentine's** | 🔥🔥🔥 The big one. 3–5x normal volume. | Start content Jan 15 |
| Feb 7–13 — Valentine's Week | 🔥🔥 Rose Day, Propose Day, Hug Day each drive sales | Content live Feb 1 |
| Karwa Chauth (Oct/Nov) | 🔥 Married couples gifting | 3 weeks ahead |
| Aug — Raksha Bandhan | 🟡 Less fit but possible (sibling angle if you adapt) | 2 weeks ahead |
| Anniversaries | 🔥🔥 Year-round constant drip | Always-on content |
| Birthdays | 🔥 Year-round | Always-on |
| Long-distance "missing you" | 🔥 Year-round, no occasion needed | Always-on |

### Distribution channels (ranked by ROI)

1. **Instagram Reels** (your strongest) — your portfolio's already there. Use `@karanpawhat` to seed, then create a `@gardenofusapp` brand handle.
2. **YouTube Shorts** — same content, second distribution
3. **Pinterest** — pixel art aesthetic + "anniversary gift ideas" boards do very well
4. **WhatsApp organic** — people share the gift link directly. Make sure the OG image preview looks irresistible.
5. **Reddit** — `r/india`, `r/IndianTeenagers`, `r/RelationshipAdviceIndia`. Don't spam — share as a maker, not a marketer.
6. **Twitter/X India build-in-public** — tech community will signal-boost. Helps with B2B leads later.

### Influencer angle

The economics work because your CAC can be very low if even one mid-tier creator (50K–500K followers) posts your link:

- One Reel from a 100K-follower creator: ~10K–50K views, ~2–5% click-through, ~5% conversion = 10–125 sales = ₹990–12,375 revenue
- Cost: ₹2,000–10,000 paid, or free in exchange for "made specifically for them" version
- ROI: usually break-even to 3x on a single post; long tail in remaining months can 5–10x it

Target: south Indian creators (high engagement, less saturated), long-distance couples content niche, "soft girl" aesthetic accounts.

### The OG meta tag that makes WhatsApp shares convert

Add to `index.html`:

```html
<meta property="og:title" content="🌷 You got a garden">
<meta property="og:description" content="Someone made you a little garden full of flowers, letters and love. Tap to open ♡">
<meta property="og:image" content="https://yourdomain.in/og-preview.png">
<meta property="og:url" content="https://yourdomain.in">
```

Make a juicy `og-preview.png` (1200x630) with your bouquet asset and "You've got a garden 🌷" text. This is the difference between people tapping the WhatsApp link or not.

---

## PART 6 — Unit Economics (real numbers)

### Per garden (₹99 sale)

| Item | Amount |
|------|--------|
| Sale price | ₹99.00 |
| Razorpay fee (~2.36%) | -₹2.34 |
| Supabase/Vercel infra (per garden) | ~₹0.05 |
| **Net per garden** | **~₹96.61** |

### Fixed costs (monthly)

| Item | Monthly | Annual |
|------|---------|--------|
| Domain | ₹50 | ₹600 |
| Vercel Pro (only if you exceed free tier) | ₹1,650 | ₹19,800 |
| Supabase Pro (when needed) | ₹2,070 | ₹24,840 |
| **Year 1 total infra** | | ~₹1,500–25,000 depending on scale |

You can run on free tiers entirely until ~5,000 gardens/month.

### Revenue scenarios

| Gardens/month | Monthly net | Annual net |
|---------------|-------------|------------|
| 50 (friends + early Reels) | ~₹4,800 | ₹57,600 |
| 200 (one Reel hits 100K views) | ~₹19,300 | ~₹2.3 L |
| 1,000 (Valentine's month with content) | ~₹96,600 | — |
| 5,000 (proper viral month) | ~₹4.83 L | — |
| 500/month sustained Year 1 average | ~₹48,000 | ~₹5.8 L |

**Realistic Year 1 target: ₹6–12 lakh** with steady monthly content. **Stretch: ₹15–25 lakh** if 2–3 Reels go properly viral.

---

## PART 7 — Operations & Legal

### GST registration

Required if revenue crosses **₹20 lakh/year** (most states). Below that — not mandatory. You can voluntarily register earlier if needed for invoicing.

When you cross the threshold:
- Register on [gst.gov.in](https://gst.gov.in)
- Charge 18% GST on services
- File quarterly returns
- Add a CA — ~₹1,000–2,000/month for compliance

### Razorpay handles invoicing

For each transaction, Razorpay auto-generates a receipt with your business name. You can customize the brand name in dashboard settings.

### Required pages on your site

- **Terms of Service** — generate at [termly.io](https://termly.io) or [getterms.io](https://getterms.io)
- **Privacy Policy** — same generators
- **Refund Policy** — keep simple: "Refunds within 24 hours if garden hasn't been viewed by recipient"
- **Contact** — email is enough: `support@gardenofus.in`

These are required by Razorpay before going live.

### Customer support

- Set up a `support@` email forwarding to your inbox
- Add a WhatsApp Business number to the site footer
- Most "issues" are: "I want a refund" / "link not working" → handle in 5 minutes/day

---

## PART 8 — V2 Roadmap (after first 100 sales)

Things that grow LTV (lifetime value per customer):

1. **More themes** — Beach, Mountains, Space, Vintage Polaroid. ₹49 each as add-ons. Same engine, different assets.
2. **Voice note attachment** — record a 10-second message that plays during the reveal. ₹49 add-on.
3. **Anniversary reminders** — opt-in email/WhatsApp: "It's your anniversary tomorrow — send another garden?" Massive repeat-purchase driver.
4. **Premium flowers** — unlockable roses (₹49), exotic flowers (₹99). Tiered bouquets.
5. **Custom couple sprite** — upload a selfie → AI generates a pixel-art version → embed in the garden. ₹99 premium.
6. **B2B white-label** — D2C brands send to customers. "A garden from Mamaearth for your purchase milestone." ₹50K–2L/campaign.

V2 should ship around month 3–4, once you have product-market fit data from V1.

---

## PART 9 — First 30 Days Checklist

### Week 1: Get to live
- [ ] Convert artifact to Vite project
- [ ] Set up GitHub + Vercel
- [ ] Buy domain + connect
- [ ] Set up Supabase + schema
- [ ] Razorpay account (start KYC immediately, takes days)
- [ ] Build payment flow in test mode
- [ ] Make ToS / Privacy / Refund pages
- [ ] Test the flow end-to-end with 3 friends

### Week 2: First sales
- [ ] Razorpay goes live
- [ ] Post the first Reel — "I built an app for my [pretend gf] for ₹99 — here's what it does"
- [ ] DM 20 mid-tier creators (50K–500K) offering free-to-test
- [ ] Get first 10 paid customers from your network (sell at ₹99 from day 1)

### Week 3–4: Content rhythm
- [ ] 4 Reels per week minimum (Karan, this is your bread and butter)
- [ ] One "story" Reel (someone receiving it)
- [ ] One "compare" Reel (₹X gift vs this)
- [ ] One "make" Reel (behind-the-scenes)
- [ ] One trend hijack
- [ ] Set up Pinterest with 5–10 boards
- [ ] Track conversions per channel in a Google Sheet

### Month 2 onwards
- [ ] Iterate based on what content converted best
- [ ] Start collecting screenshots of real reactions for social proof
- [ ] Plan Valentine's content stack (if Feb 14 is approaching)
- [ ] Test V2 features with active users

---

## The honest answer

You'll know in **30 days** whether this becomes a real business or a portfolio piece.

**Signal it's working**: cold traffic (not friends) converts at 1–3% on the form. Reels organically pull in DM inquiries.

**Signal it's not**: people open the site, scroll the form, bounce. Means the funnel needs work OR the offer isn't compelling enough.

If signal is good → push harder, V2 features, build the moat. If not → kill it fast and recycle the engine for a different angle (corporate gifting? festival cards?). Don't sunk-cost it.

You're better positioned to make this work than 99% of people who'd try — you have the audience, the building skill, the marketing skill, and the cultural taste. The only thing left is shipping it and putting reps in on the content.

🌷 Go.
