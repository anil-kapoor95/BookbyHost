# StayOwned — property rental frontend (static phase)

Next.js frontend built from the Figma file **"Property REntal PHP Jabber"**. The Figma file contains six
desktop frames (1440 px) for a host onboarding flow; this project implements them and adds guest-facing
pages derived from the "live preview" card and theme designs shown in those frames.

Everything runs on **local, typed mock data**. There is no backend, API, auth or payment integration yet.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Development server                                   |
| `npm run build`     | Production build                                     |
| `npm start`         | Serve the production build                           |
| `npm run lint`      | ESLint (Next.js core-web-vitals + TypeScript rules)  |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` (strict)  |
| `npm run check`     | lint + typecheck + build                             |
| `npm run images`    | Regenerates the placeholder property illustrations   |

Requires Node.js 20.9 or newer. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` once the
production domain is known — canonical URLs and absolute Open Graph URLs are only emitted when it is set.

## Stack

Next.js 16.4 (App Router, Cache Components / Partial Prerendering, Turbopack) · React 19.3 · TypeScript
(strict) · Tailwind CSS 4 (CSS-first `@theme`) · `next/font/local` · `next/image` · ESLint 9. No other
runtime dependencies.

## Pages

| Route | Source | Notes |
| --- | --- | --- |
| `/` | — | No home page designed yet: redirects to `/setup/account` |
| `/setup/account` | Figma "Account Info" | Step 1 — account (API). Live "Email already exists" and password-rule checks; "Continue where you left off" (email + password) |
| `/setup/company` | Not in Figma | Step 2 — company details + optional logo (API) |
| `/setup/property` | Figma "About PRoperty" | Step 3 — name, address, rooms, price per night (saved as the default price; a rate changed in the back office shows here), optional iCal import (API) |
| `/setup/photos` | Figma "UploadPhotos" | Step 4 — photo upload / delete (API) |
| `/setup/description` | Figma "Ai Description" | Step 5 — page headline, description, questions guests ask; AI writes them in English in the chosen tone (Warm by default) (API) |
| `/setup/theme` | Figma "Theme" | Step 6 — colour palettes from the back office; publishing completes the sign-up (API) |
| `/setup/live` | Figma "Payment" | Shown when the sign-up is completed (the host stays logged in); "Edit page" opens the back office |
| `/setup/preview` | Derived | The host's page from the API (texts, photos, price, chosen palette) in a desktop browser frame or a phone (`/setup/preview/frame` in an iframe) |
| `/login` | Derived | Host log-in (email + password): completed sign-up → `/setup/live`, unfinished → next step |
| `/properties` | Derived | Search, type/guest filters, sort, pagination via URL params |
| `/properties/[slug]` | Derived | Gallery + lightbox, amenities, FAQ, booking inquiry; themed per property |
| `/themes`, `/contact` | Derived | Theme gallery; contact form |
| `/how-it-works`, `/pricing`, `/faq`, `/about`, `/blog`, `/help`, `/terms`, `/privacy` | Placeholder | Linked from the Figma header/footer but not designed: consistent "coming soon" page, `noindex` |

Setup steps are `noindex` and disallowed in `robots.txt`.

## Design tokens — change the look in one place

**`src/styles/tokens.css`** is the single source of truth. Each token in `@theme` is both a CSS variable
on `:root` and a Tailwind utility (`--color-primary` → `bg-primary`, `--radius-card` → `rounded-card`,
`--text-display` → `text-display`, `--spacing-section` → `py-section`, `--container-page` → `max-w-page`).
Tailwind's default palette is removed, so components can only use the semantic tokens.

- Colours: brand, backgrounds, text, borders/focus, inputs, chips, states, header/footer
- Typography: heading/body families, a responsive type scale with line-heights, tracking and weights
- Layout: spacing (section, card, header height, control height), container widths, radii, shadows, motion
- Theme presets: `[data-theme="luxe|homestay|urban|coastal"]` remap the same tokens; guest pages apply
  the property's theme

Fonts (Plus Jakarta Sans for headings, DM Sans for body, identified in Figma) are self-hosted variable
WOFF2 files in `src/fonts/` (SIL OFL) loaded via `src/lib/fonts.ts`.

**Accessibility adjustments to Figma colours** (documented inline in `tokens.css`): the Figma orange
`#EE4D1B` with white button text is 3.67:1, below WCAG AA, so filled controls use `--color-primary: #CC3C0F`
while the logo and large display text keep `--color-brand: #EE4D1B`. The muted grey, success green and
WhatsApp green were darkened for the same reason. Set `--color-primary: var(--color-brand)` to match Figma
exactly.

## Data and future API

- Types: `src/types/property.ts`
- Mock data: `src/data/` (properties, amenities, themes); `phone-countries.ts` is every country with its calling code and number rules (generated from libphonenumber), used by `PhoneField`
- Data access: `src/lib/properties/repository.ts` defines a vendor-neutral async `PropertyRepository`
  (`list`, `getBySlug`, `listSlugs`, `listFeatured`). Pages only use this interface.
  `mock-repository.ts` implements it in memory; filtering/sorting/pagination live in `query.ts`.
  To integrate an API, write another implementation and export it from `repository.ts`.
- Wizard state: `src/features/onboarding/draft-store.ts` (client store via `useSyncExternalStore`,
  persisted to `sessionStorage`; passwords and local photo blobs are never stored). Replace its
  `persist/load` with API calls later.
- `src/proxy.ts` returns a real 404 for unknown property slugs; swap its slug set for a fast lookup
  when data comes from an API.

## Sign-up API (PHP back end)

The six `/setup/*` steps call the Rental Property Booking script through `api.php`
(`pjJabbApi` controller). Set `NEXT_PUBLIC_API_URL` to that file, e.g.
`http://localhost/RentalProperty/api.php`, and add this site's origin to `$allowed_origins` in `api.php`.

- Client: `src/lib/api/client.ts` (POST + form-data, `{status, code, message, errors, data}` responses) and
  typed endpoints in `src/lib/api/signup.ts`.
- Session: `src/features/onboarding/signup-session.ts` keeps the sign-up token in `localStorage`.
  On any visit, `SignupGate` asks the server for the saved state and sends the host to the next unfinished
  step (`/` → `/setup/account` → step 2 if step 1 is done, etc.); steps can't be skipped; `/setup/account/edit`
  (the Account link in the stepper, or Back on step 2) opens step 1 again. Outside the wizard a banner under the header
  ("Your registration isn't finished — Continue setup") and the header's Continue setup button resume the next step. On another device, "Continue where you left off" (or signing up again with the same
  email + password) resumes the sign-up. A completed sign-up always lands on `/setup/live`.
- Log in / log out: `/login` calls `pjActionSignupLogin` (new token, other devices are logged out). The header shows the
  host's name, "My page" / "Continue setup" and "Log out" (`pjActionSignupLogout`, then the token and the preview draft
  are removed from this browser so someone else can register or log in).
- Continue with Google (sign-up and log-in): Google Identity Services in the browser gets an access token for the
  site's OAuth client; the back end checks it with Google (`pjActionSignupGoogle`) and logs the host in, or starts step 1
  with the Google name and e-mail (no password needed, only the WhatsApp number). The client id is set once, in the back
  end's `app/config/google.php` (front end reads it from `pjActionGetAuthConfig`); while it is empty the Google button is hidden.
- Server messages are shown on the matching field (e.g. "Email already exists"); other errors appear above the form.
- Price: step 3 saves the price as the property's default price (Properties > Prices, every weekday). The form and
  preview always show the rate from the prices table, so a rate changed later in the back office is what the host sees.
- Step 5: choosing a tone (Warm, Premium, Simple) has the AI write the headline, description and questions again in
  that tone, always in English; "Rewrite" redoes one card. Each tone's version is kept while the host is on the page.
- Not stored by the API yet (kept in the browser for the preview only): property type, max guests, amenities and
  page link.

## Demo behaviour (no backend)

Google sign-in, Razorpay connect, calendar sync, inquiry and contact submissions all show
an explicit "demo mode — nothing was sent/connected" message. Ratings, bookings and the non-Green-Casa listings are fictional sample data and are not
exposed as structured data.

## Images

The photos in the Figma file could not be exported (view-only access), so `public/images/properties/`
contains generated flat illustrations (`scripts/generate-placeholder-images.mjs`). Replace any file with a
real photo of the same name (3:2 recommended) — no code changes needed. Alt texts live in
`src/data/properties.ts`.

## Project structure

```
src/
  app/                    routes, metadata, sitemap.ts, robots.ts, not-found.tsx
  components/
    layout/ ui/ property/ search/ info/ theme/ seo/
  features/onboarding/    wizard steps, preview components, store, copy templates
  config/site.ts          brand, navigation, placeholder pages
  data/                   typed mock data
  lib/                    repository, query helpers, SEO helpers, validation, utils, fonts
  styles/tokens.css       design tokens
  types/property.ts       domain types
  proxy.ts                404 for unknown property slugs
```
