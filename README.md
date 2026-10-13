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
| Lab entries | `lib/lab.ts` |

## Swapping placeholder images for real ones

Placeholders are rendered by `components/Placeholder.tsx` (gray/dark
panels with a dashed label chip). To use a real image:

1. Drop files into `public/` (e.g. `public/cases/case-01-hero.jpg`).
2. At the usage site, replace `<Placeholder …/>` with
   `<Image src="/cases/case-01-hero.jpg" alt="…" fill className="object-cover" />`
   inside a `div` with the same `aspectRatio` style — or just keep the
   `Placeholder` wrapper and add an `<img>` inside it.

The home hero headline is either a WebGL glitch (`components/HeroGlitch.tsx`,
which loads three.js lazily) or a cycling statement, picked by
`HOME.heroMode` in `lib/content.ts`. The reel under it is
`components/HeroReel.tsx`.

## Design tokens

`app/globals.css` — colors (`--color-paper/ink/…`), type scale
(`--fs-*`), rhythm (`--gutter`, `--pad-section`). Fonts are set in
`app/(site)/layout.tsx` (Newsreader serif + Instrument Sans).
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

## Workspace — work.kavasconsultancy.com

An internal tool served by this same app on the `work.` subdomain:

- **Tasks**: boards with Board, List, Timeline (Gantt) and People views, plus
  subtasks, comments, files, "waits on" dependencies, an activity trail,
  board-owner sign-off and live updates between people.
- **Documents**: a nested folder cabinet.
- **Accounts**: Kavas Consultancy's ledger of salaries, purchases and
  running costs, with GST, receipts and CSV export.
- **Team**: partners add people, set roles and passwords, and deactivate
  people.
- **My account**: everyone can rename themselves and change their password.

Tasks and Documents follow the Conscious Cafe manager; Accounts follows
Nightingale's Account Management.

How it's wired:

- `proxy.ts` rewrites any `work.*` host to `app/(workspace)/workspace/*`, so
  `work.kavasconsultancy.com/tasks` renders `/workspace/tasks`. Hitting
  `/workspace/*` on the main domain redirects to the subdomain. Workspace links
  are subdomain-relative (`/tasks`). The marketing `/work` case studies are
  unrelated.
- The marketing site lives in the `app/(site)` route group, and the workspace
  has its own root layout (no Lenis, header or page transitions).
- Data, auth, files and live updates are on Supabase. Schema, RLS, triggers,
  storage buckets and the realtime publication are in `supabase/migrations/`.
  RLS is the security boundary. The UI hiding a page is only a convenience.
- The Team page's server actions use `SUPABASE_SECRET_KEY`, which bypasses
  RLS. Each action checks that the caller is an active partner first. Never
  give that key a `NEXT_PUBLIC_` prefix.

Setup:

1. Link the CLI and apply the migrations:
   `supabase link --project-ref <ref>` then `supabase db push`.
2. Set these in `.env.local` and in Vercel (see `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the publishable key)
   - `SUPABASE_SECRET_KEY` (server only; Team page and digest)
   - `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `WORKSPACE_URL` (email)
3. In Vercel, add the domain `work.kavasconsultancy.com` to this project.
4. In Supabase → Authentication:
   - turn off public sign-ups
   - set the Site URL to `https://work.kavasconsultancy.com`
   - add `https://work.kavasconsultancy.com/**` and
     `http://work.localhost:3340/**` to the redirect URLs, for reset links
5. Create the first partner by hand: Users → Add user → Create new user, then
   `UPDATE profiles SET role = 'partner' WHERE email = '…';`.
   Add everyone else from the workspace's Team page.
6. Locally, open `http://work.localhost:3340` (Chrome resolves `*.localhost`).

People:

- Members get Tasks. Partners also get Documents, Accounts and Team.
- To remove someone, deactivate them on the Team page rather than deleting
  them. Their history stays, and their login is banned. The database won't
  let the last active partner be demoted or deactivated.
- People are added by email invite (the default): they choose their own
  password from the link. "Set a password now" is still there for when email
  isn't an option.

Email (Resend):

- **Sign-in emails** (invites, password resets, sign-in links) are sent by
  Supabase Auth through Resend's SMTP, using the branded templates in
  `supabase/templates/`. Their links carry a `token_hash` to `/auth/confirm`,
  so they work on any device.
- **Work emails** are sent by the app through Resend's API
  (`lib/workspace/mailer.ts`):
  - a task is assigned to you
  - a new comment on your task
  - a task on your board is ready for sign-off
  - the morning digest, sent by Vercel Cron to `/api/cron/digest` at 02:30 UTC
    (about 08:00 IST)

  Each person can switch both off under My account.
- The sender is `no-reply@kavasconsultancy.com`, so the domain must stay
  verified in Resend (DKIM and SPF records on Hostinger).
- Server env vars: `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` and
  `WORKSPACE_URL`. Without `RESEND_API_KEY`, each email is noted in one console
  line instead of sent, which is what local dev wants.
- Supabase only accepts custom templates on the free plan once custom SMTP is
  set: Authentication → Emails → SMTP, host `smtp.resend.com`, port 465, user
  `resend`, password = the Resend key.

Changing the schema: add a new file with `supabase migration new <name>`,
then `supabase db push`. Never edit a migration that has already been
applied, and don't change the schema from the dashboard. The files are the
record of what's in the database.
