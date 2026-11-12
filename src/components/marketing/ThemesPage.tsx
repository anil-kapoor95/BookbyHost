import Link from "next/link";
import type { CSSProperties } from "react";
import type { ApiTheme } from "@/lib/api/signup";
import { cn } from "@/lib/utils";
import { DisplaySectionHeader, FaqSection, LaunchCta } from "./display";
import { THEMES_FAQS } from "./faq-data";
import { ArrowIcon, PadlockIcon, SmallTickIcon } from "./figma-icons";
import { HeroAccent, PageHero } from "./PageHero";

/** "Themes" page from the Figma "Themes page" frame (131:2). The themes come from the back office (pjActionGetThemes). */
export function ThemesPage({ themes, planNames }: { themes: ApiTheme[]; planNames: string }) {
  const paid = themes.filter((theme) => theme.locked);
  const free = themes.filter((theme) => !theme.locked);
  // the "free vs premium" answer from the themes of the back office
  const faqs = THEMES_FAQS.map((faq) =>
    faq.id === "free-vs-premium" && free.length > 0
      ? {
          ...faq,
          answer:
            `${listNames(free.map((theme) => theme.name))} ${free.length === 1 ? "is" : "are"} free and works for any stay.` +
            (paid.length > 0
              ? ` ${planNames || "A paid plan"} unlocks ${paid.length} more: ${listNames(paid.map((theme) => theme.name))}.`
              : ""),
        }
      : faq,
  );
  return (
    <div className="bg-surface">
      <PageHero
        id="themes-title"
        eyebrow="Themes Built to book"
        title={
          <>
            Beautiful Themes, <HeroAccent>built for stays</HeroAccent>
          </>
        }
        intro={
          themes.length > 0
            ? `${themes.length} ${themes.length === 1 ? "theme" : "themes"} built to showcase your property and drive direct bookings.`
            : "Themes built to showcase your property and drive direct bookings."
        }
        introClassName="font-medium text-body"
      />
      <ThemeGallery themes={themes} planNames={planNames} />
      {paid.length > 0 ? <ProBanner paid={paid} planNames={planNames} /> : null}
      <EveryThemeIncludes />
      <FaqSection id="themes-faq-title" items={faqs} />
      <LaunchCta />
    </div>
  );
}

/* ------------------------------------------------------------ Theme gallery */

/** Colours of the small mock window, from the theme's own colours (the --color-mock-* tokens). */
function mockColors(theme: ApiTheme): CSSProperties {
  const c = theme.colors;
  return {
    "--color-mock-window": c.page_background,
    "--color-mock-window-border": `color-mix(in srgb, ${c.brand} 18%, transparent)`,
    "--color-mock-brand": c.brand,
    "--color-mock-pill": `color-mix(in srgb, ${c.accent} 18%, white)`,
    "--color-mock-pill-text": c.accent,
    "--color-mock-hero": c.brand,
    "--color-mock-title": "#ffffff",
    "--color-mock-sub": "rgb(255 255 255 / 0.8)",
    "--color-mock-thumb": `color-mix(in srgb, ${c.brand} 14%, white)`,
  } as CSSProperties;
}

function ThemeGallery({ themes, planNames }: { themes: ApiTheme[]; planNames: string }) {
  return (
    <section aria-labelledby="gallery-title" className="pb-6 pt-section sm:pt-[104px]">
      <div className="container-page">
        <div className="flex flex-col gap-4 lg:min-h-[229px] lg:flex-row lg:items-start lg:justify-between">
          <DisplaySectionHeader
            id="gallery-title"
            align="left"
            eyebrow="Look like you"
            title={<span className="block max-w-[440px]">Beautiful themes, built for stays</span>}
          />
          <p className="font-body text-[1.125rem] leading-[26.4px] text-gallery-intro lg:pt-[124px]">
            Start with a free theme. Switch any time.
          </p>
        </div>
        {themes.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <ThemeGalleryCard key={theme.id} theme={theme} planNames={planNames} />
            ))}
          </ul>
        ) : (
          <p role="status" className="mt-6 rounded-theme-card border border-border bg-surface p-6 text-center font-body text-body">
            The themes could not be loaded right now. Please try again in a moment.
          </p>
        )}
      </div>
    </section>
  );
}

/** One theme: its colours in a small mock page, Free / Pro and its button. Also used on the home page. */
export function ThemeGalleryCard({ theme, planNames }: { theme: ApiTheme; planNames: string }) {
  const pro = Boolean(theme.locked);
  const swatches = [theme.colors.brand, theme.colors.accent, theme.colors.text, theme.colors.page_background];
  return (
    <li
      className={cn(
        "relative flex flex-col rounded-theme-card border-2 bg-surface p-4 pb-5",
        theme.free ? "border-brand shadow-theme-card-active" : "border-theme-card-border shadow-theme-card",
      )}
    >
      {/* Mock preview window in the theme's colours */}
      <div
        aria-hidden="true"
        style={mockColors(theme)}
        className="relative h-[231px] overflow-hidden rounded-[12px] border border-mock-window-border bg-mock-window p-3"
      >
        <div className="flex items-start justify-between pb-3">
          <span className="pt-[1.5px] font-mock-sans text-[0.75rem] font-bold leading-4 text-mock-brand">Green Casa</span>
          <span className="rounded-pill bg-mock-pill px-2.5 py-0.5 font-mock-sans text-[0.625rem] font-bold leading-[15px] text-mock-pill-text">Book now</span>
        </div>
        <div className="relative flex h-[128px] flex-col justify-end overflow-hidden rounded-[8px] bg-mock-hero p-3.5 shadow-mock-hero">
          {pro ? (
            <span className="absolute right-2 top-2 inline-flex h-[17.5px] items-center gap-1 rounded-[4px] bg-pro-overlay px-2 font-mock-sans text-[0.5625rem] font-bold leading-[13.5px] text-white">
              <PadlockIcon size={10} /> PRO
            </span>
          ) : null}
          <span className="font-mock-sans text-[0.875rem] font-bold leading-[19.25px] tracking-[-0.025em] text-mock-title">
            Your villa, beautifully booked
          </span>
          <span className="font-mock-sans text-[0.625rem] leading-[15px] text-mock-sub">Assagao, North Goa</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => (
            <span key={index} className="h-9 rounded-[4px] bg-mock-thumb" />
          ))}
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center justify-between gap-2 pt-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="flex items-center gap-1.5 font-mock-sans text-[0.875rem] font-bold leading-5 text-gallery-ink">
            {theme.name}
            {pro ? (
              <span className="inline-flex h-[17.5px] items-center gap-0.5 rounded-[4px] bg-pro-ink px-1.5 text-[0.5625rem] leading-[13.5px] text-white">
                <PadlockIcon size={10} /> PRO
              </span>
            ) : (
              <span className="rounded-[4px] bg-free-badge-bg px-1.5 py-0.5 text-[0.625rem] leading-[15px] text-free-badge-text">FREE</span>
            )}
          </h3>
          <span className="flex gap-1" aria-label={`Colours of the ${theme.name} theme`}>
            {swatches.map((color, i) => (
              <span key={i} className="size-4 rounded-full border border-black/10" style={{ background: color }} title={color} />
            ))}
          </span>
        </div>
        {pro ? (
          <Link
            href="/pricing"
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] bg-pro-ink px-3 font-mock-sans text-[0.75rem] font-bold leading-4 text-white drop-shadow-hairline hover:bg-secondary-hover focus-visible:outline-none focus-visible:focus-ring"
            aria-label={`Upgrade${planNames ? ` to ${planNames}` : ""} to use the ${theme.name} theme`}
          >
            <PadlockIcon size={12} /> Upgrade
          </Link>
        ) : (
          <Link
            href="/setup/account"
            className="inline-flex h-8 shrink-0 items-center rounded-[8px] bg-primary px-3.5 font-mock-sans text-[0.75rem] font-bold leading-4 text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:focus-ring"
            aria-label={`Start free with the ${theme.name} theme`}
          >
            Start free
          </Link>
        )}
      </div>

      {theme.free ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[3px] -top-[3px] size-11 rounded-tr-[20px] border-r-3 border-t-3 border-brand"
        />
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------ Pro banner */

/** "A, B, C and D" (at most four names, then "and N more"). */
function listNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  const shown = names.slice(0, 4);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : `${shown.slice(0, -1).join(", ")} & ${shown[shown.length - 1]}`;
}

function ProBanner({ paid, planNames }: { paid: ApiTheme[]; planNames: string }) {
  const plan = planNames || "a paid plan";
  return (
    <section aria-labelledby="pro-banner-title" className="container-page pb-section pt-6 sm:pb-[104px]">
      <div className="mx-auto flex max-w-[1184px] flex-col gap-4 rounded-theme-card border border-banner-border bg-linear-to-r from-banner-from to-banner-to p-[21px] shadow-pro-banner md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4 md:items-center">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-banner-icon-border bg-banner-icon-bg"
          >
            <PadlockIcon size={20} />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2
              id="pro-banner-title"
              className="flex flex-wrap items-center gap-2 font-mock-sans text-base font-bold leading-6 tracking-[-0.025em] text-white"
            >
              Unlock all {paid.length} Pro {paid.length === 1 ? "theme" : "themes"} with {plan}
            </h2>
            <p className="font-mock-sans text-[0.875rem] leading-5 text-banner-text">
              Access {listNames(paid.map((theme) => theme.name))} and everything else in {plan}.
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-[12px] bg-primary px-4 py-2.5 font-mock-sans text-[0.875rem] font-bold leading-5 text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:focus-ring md:self-auto"
        >
          See plans <ArrowIcon size={16} />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Every theme includes */

const INCLUDES = [
  "Booking search with live availability",
  "Photo gallery and amenities",
  "Your description, highlights and FAQs",
  "Location and map",
  "WhatsApp button and contact details",
  "Works on phones, tablets and desktops",
];

function EveryThemeIncludes() {
  return (
    <section aria-labelledby="includes-title" className="px-4 sm:px-6 lg:px-0">
      {/* Edge to edge on desktop, as in Figma (131:399). */}
      <div className="rounded-feature-band border border-border bg-includes-bg px-6 py-10 sm:px-10 lg:pb-[41px] lg:pl-[121px] lg:pr-[41px] lg:pt-[70px]">
        <h2
          id="includes-title"
          className="font-display text-section-xl font-extrabold tracking-[-0.0224em] text-pro-ink opsz-14"
        >
          Every theme includes
        </h2>
        <p className="pt-2 font-body text-base leading-6 text-body">
          Whichever look you pick, your page has everything guests need to book.
        </p>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-3.5 pt-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDES.map((item) => (
            <li key={item} className="flex items-center gap-3 font-body text-base font-medium leading-6 text-pro-ink">
              <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-brand">
                <SmallTickIcon />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
