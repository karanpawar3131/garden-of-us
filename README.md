# 🌸 Garden of Us — Output Files

## What you've got

```
outputs/
├── garden-of-us.jsx           ← THE APP. Single-file React component, fully working.
├── assets/                    ← All 15 pixel art assets, processed & optimized
│   ├── couple.png             ← chibi couple sprite (transparent)
│   ├── garden_bg.png          ← cherry blossom garden scene
│   ├── bedroom_bg.png         ← cozy form-page bedroom
│   ├── bouquet.png            ← reveal bouquet (transparent)
│   ├── envelope.png           ← kawaii love letter (transparent)
│   ├── night_bg.png           ← reveal screen night sky
│   ├── heart.png              ← UI heart icon
│   ├── sparkles.png           ← sparkle sprite sheet (4 frames)
│   ├── logo.png               ← app brand mark
│   ├── petals.png             ← petal particles sprite sheet (6 colors)
│   ├── rose.png               ← flower
│   ├── peony.png              ← flower
│   ├── tulip.png              ← flower
│   ├── daisy.png              ← flower
│   └── sunflower.png          ← flower
└── assets-manifest.json       ← Path map (for production swap-out)
```

## What I did to your uploads

- **Removed black backgrounds** → transparent PNG for all sprites (couple, flowers, bouquet, envelope, hearts, sparkles, logo, petals)
- **Kept full bg** for the 3 scene images (garden, bedroom, night sky)
- **Cropped tight** to content + 4px padding
- **Resized** to web-appropriate dimensions (max 900px for backgrounds, ~110-320px for sprites)
- **Palette-mode PNG** with 16-64 colors each — perfect for pixel art with limited palettes
- **Total weight: 1.2 MB → 332 KB** (72% reduction)

## How the JSX file works

The `garden-of-us.jsx` is **self-contained** — all 15 assets are embedded as base64 data URIs inside the file. You can drop it into any React project (Vite, Next.js, Create React App) and it'll work with zero asset setup.

**Drop-in install:**
```bash
npm install lucide-react tone
```

Then import the component:
```jsx
import App from './garden-of-us.jsx';
```

That's it. No image imports, no public folder, nothing.

## For production (when you're ready to ship)

The base64 embedding is great for prototyping but not optimal for production (slower initial parse, no browser caching of images). When you're ready:

1. **Drop the `assets/` folder** into `public/assets/` or `src/assets/`
2. **Find the `const ASSETS = { ... }` block** at the top of the JSX
3. **Replace each base64 entry** with file paths from `assets-manifest.json`:

```jsx
// Before (base64 embedded):
const ASSETS = {
  couple: "data:image/png;base64,iVBORw0KGgo...",
  rose: "data:image/png;base64,iVBORw0KGgo...",
  // ...
};

// After (file paths):
const ASSETS = {
  couple: "/assets/couple.png",
  rose: "/assets/rose.png",
  // ...
};
```

Your bundle drops from ~480 KB JSX to ~10 KB JSX + cached image requests.

## What's in the app

### Flow:
1. **Form** — sender fills name, partner name, nickname, love note
2. **Success** — unique link generated, copy/share/preview options
3. **Intro** — partner taps envelope, sees nickname reveal
4. **Garden** — couple walks across cherry blossom scene, partner picks 3-5 flowers
5. **Reveal** — bouquet glows, envelope opens to handwritten letter, flower meanings shown

### Tech:
- **Storage**: `window.storage` (shared) — works across devices via unique link `#/v/{id}`
- **Music**: Tone.js ambient pad + pluck sounds on flower pick
- **Animations**: Pure CSS keyframes (walk cycle, float-bob, drift-up, petal-fall, confetti, pop-in)
- **Fonts**: Press Start 2P (headers), Pixelify Sans (UI body), Caveat (handwritten accents)
- **Mobile-first**: 9:16 layouts, touch-friendly hit targets
- **Pixel-perfect rendering**: `image-rendering: pixelated` on all sprites

## Where to add payment gateway later

The single gate is `handleSubmit` in the main `App` component:

```jsx
const handleSubmit = async (formData) => {
  const id = generateId();
  // ⬇ ADD RAZORPAY/STRIPE CHECKOUT HERE
  // const paymentResult = await openCheckout({ amount: 49 });
  // if (!paymentResult.success) return;
  
  await window.storage.set(`exp:${id}`, JSON.stringify(formData), true);
  // ... rest unchanged
};
```

Drop in your payment SDK call before the storage write. The link generation already happens after, so payment gates link creation cleanly.

---

*15 assets · pixel-perfect · self-contained · ready to test*
