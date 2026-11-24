import type { ApiTheme } from "@/lib/api/signup";
import { FaqSection, LaunchCta } from "./display";
import { THEMES_FAQS } from "./faq-data";
import { SmallTickIcon } from "./figma-icons";
import { HeroAccent, PageHero } from "./PageHero";
import { listNames } from "./list-names";
import { ThemesGallerySection } from "./ThemeGallery";

export { ThemeGalleryCard } from "./ThemeGallery";

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
      <ThemesGallerySection themes={themes} planNames={planNames} />
      <EveryThemeIncludes />
      <FaqSection id="themes-faq-title" items={faqs} />
      <LaunchCta />
    </div>
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
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-brand"
              >
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
