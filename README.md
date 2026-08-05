# Kavas — kavas-v2

Collins-literal template for kavasconsultancy.com, rebuilt against
full-page captures of wearecollins.com (structure, layout, and card
language mirrored page-for-page).
Next.js 16 · Tailwind v4 · GSAP + ScrollTrigger · Lenis · Framer Motion · Three.js (hero only).

Page map (Collins → Kavas): home (hero → laurels → media deck →
Programs → Case Studies filmstrip → dark Notes band → dark footer),
/case-studies → /work (dark poster-wall collage), case page → /work/[slug]
(filmstrip, meta + ink-reveal lede + story overlay, white system panel,
impact cards, next-case teaser), /programs (scatter hero, impact list,
white rows band, dark capabilities band), /team → /studio (dark, 3-up
portrait cards).

```bash
npm run dev   # http://localhost:3340
```

## Where to edit content (everything is a template slot)

Anything in `[square brackets]` anywhere on the site is a placeholder.

| What | File |
| --- | --- |
| Site name, email, nav, socials, footer | `lib/content.ts` |
| Home copy (hero, thesis, programs, impact lines) | `lib/content.ts` |
| Studio page (values, team, process) | `lib/content.ts` |
| Contact page | `lib/content.ts` |
| The 5 case studies (client, meta, lede, story, metrics, quote) | `lib/cases.ts` |
| Notes/essays | `lib/notes.ts` |

## Swapping placeholder images for real ones

Placeholders are rendered by `components/Placeholder.tsx` (gray/dark
panels with a dashed label chip). To use a real image:

1. Drop files into `public/` (e.g. `public/cases/case-01-hero.jpg`).
2. At the usage site, replace `<Placeholder …/>` with
   `<Image src="/cases/case-01-hero.jpg" alt="…" fill className="object-cover" />`
   inside a `div` with the same `aspectRatio` style — or just keep the
   `Placeholder` wrapper and add an `<img>` inside it.

The home hero panel is a live WebGL ink-wash (`components/HeroShader.tsx`).
Keep it, or replace that block in `app/page.tsx` with a real reel/photo.

## Design tokens

`app/globals.css` — colors (`--color-paper/ink/…`), type scale
(`--fs-*`), rhythm (`--gutter`, `--pad-section`). Fonts are set in
`app/layout.tsx` (Newsreader serif + Instrument Sans).
Measurements mirror wearecollins.com (type sizes, gutters, section pads).

## Known template stubs (wire up before launch)

- Contact form opens a `mailto:` — swap for an API route (the live repo
  uses Resend; see `components/ContactForm.tsx`).
- Social links in `lib/content.ts` are `#` — add real URLs.
- All case metrics/quotes are placeholders — replace before publishing.

## Gotchas

- Don't run `next build` while `next dev` is running (corrupts `.next`).
- Don't set `--font-serif`/`--font-sans` fallbacks in `:root` — they
  override the `next/font` variables.
