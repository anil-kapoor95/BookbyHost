"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { hrefForNextStep, LIVE_HREF } from "@/features/onboarding/steps";
import { ensureSignupLoaded, updateSignupState, useSignupSession } from "@/features/onboarding/signup-session";
import { signupApi, type ApiTheme } from "@/lib/api/signup";
import { cn } from "@/lib/utils";
import { DisplaySectionHeader } from "./display";
import { ArrowIcon, PadlockIcon } from "./figma-icons";
import { listNames } from "./list-names";

/**
 * Theme gallery and Pro banner of the Themes page. Visitors see the public list (paid themes locked). A logged-in
 * host sees the themes of their own plan: a trial or a bought plan with themes unlocks them, and the host can switch
 * the theme of their page right here (pjActionSignupTheme; the server checks the plan again).
 */
export function ThemesGallerySection({ themes: publicThemes, planNames }: { themes: ApiTheme[]; planNames: string }) {
  const { token, state, phase } = useSignupSession();
  const [own, setOwn] = useState<{ themes: ApiTheme[]; allowed: boolean } | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    void ensureSignupLoaded();
  }, []);

  // The host's own view of the themes (unlocked by their plan, trial included)
  useEffect(() => {
    if (!token) return;
    let live = true;
    void signupApi.themes(token).then((result) => {
      if (live && result.ok) setOwn({ themes: result.data.themes, allowed: Boolean(result.data.allowed) });
    });
    return () => {
      live = false;
    };
  }, [token]);

  const loggedIn = Boolean(token && state);
  const completed = state?.status === "completed";
  const themes = loggedIn && own ? own.themes : publicThemes;
  const paid = themes.filter((theme) => theme.locked);
  const savedId = current ?? state?.theme?.palette_id ?? null;
  // a paid theme saved before a downgrade / an ended trial: the page uses the free theme (the server does the same)
  const currentId = themes.find((theme) => theme.id === savedId)?.locked
    ? (themes.find((theme) => theme.free)?.id ?? null)
    : savedId;

  async function applyTheme(theme: ApiTheme) {
    if (!token) return;
    setBusy(theme.id);
    setMessage(null);
    const result = await signupApi.theme(theme.id, token);
    setBusy(null);
    if (result.ok) {
      updateSignupState(result.data);
      setCurrent(theme.id);
      setMessage({ tone: "ok", text: `${theme.name} is now the theme of your page.` });
      return;
    }
    if (result.code === 402) {
      // the plan changed since the list was loaded: show the locks again
      const fresh = await signupApi.themes(token);
      if (fresh.ok) setOwn({ themes: fresh.data.themes, allowed: Boolean(fresh.data.allowed) });
    }
    setMessage({ tone: "error", text: result.errors.palette_id ?? result.message });
  }

  /** Button of a theme: Upgrade (locked), Use this theme / Current theme (logged-in host), else Start free. */
  function actionFor(theme: ApiTheme): ReactNode {
    if (!loggedIn || phase !== "ready") return undefined;
    if (theme.locked) return undefined; // Upgrade
    if (!completed) {
      return (
        <Link href={state ? hrefForNextStep(state.next_step) : "/setup/account"} className={ACTION_PRIMARY}>
          Continue setup
        </Link>
      );
    }
    if (currentId === theme.id) {
      return (
        <span
          className={cn(ACTION_BASE, "border border-brand text-brand")}
          aria-label={`${theme.name} is your current theme`}
        >
          <SmallCheck /> Current
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => void applyTheme(theme)}
        disabled={busy !== null}
        aria-busy={busy === theme.id}
        className={cn(ACTION_PRIMARY, "disabled:cursor-not-allowed disabled:opacity-60")}
      >
        {busy === theme.id ? "Saving…" : "Use this theme"}
      </button>
    );
  }

  return (
    <>
      <ThemeGallery
        themes={themes}
        planNames={planNames}
        actionFor={actionFor}
        loggedIn={loggedIn && completed}
        message={message}
      />
      {paid.length > 0 ? <ProBanner paid={paid} planNames={planNames} /> : null}
    </>
  );
}

const ACTION_BASE =
  "inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] px-3.5 font-mock-sans text-[0.75rem] font-bold leading-4";
const ACTION_PRIMARY = cn(
  ACTION_BASE,
  "bg-primary text-on-primary hover:bg-primary-hover focus-visible:outline-none focus-visible:focus-ring",
);

function SmallCheck() {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.5 6.5 5 9l4.5-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function ThemeGallery({
  themes,
  planNames,
  actionFor,
  loggedIn,
  message,
}: {
  themes: ApiTheme[];
  planNames: string;
  actionFor: (theme: ApiTheme) => ReactNode;
  /** A host with a finished sign-up: the intro says the theme can be changed here. */
  loggedIn: boolean;
  message: { tone: "ok" | "error"; text: string } | null;
}) {
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
            {loggedIn
              ? "Pick a theme for your page. Your plan decides which ones you can use."
              : "Start with a free theme. Switch any time."}
          </p>
        </div>
        {message ? (
          <p
            role="status"
            className={cn(
              "mt-4 rounded-[12px] border px-4 py-3 font-body text-[0.9375rem]",
              message.tone === "ok"
                ? "border-brand/40 bg-brand/5 text-pro-ink"
                : "border-[#c2410c]/40 bg-[#c2410c]/5 text-[#9a3412]",
            )}
          >
            {message.text}{" "}
            {message.tone === "ok" ? (
              <Link href={LIVE_HREF} className="font-semibold underline underline-offset-2">
                View my page
              </Link>
            ) : null}
          </p>
        ) : null}
        {themes.length > 0 ? (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <ThemeGalleryCard key={theme.id} theme={theme} planNames={planNames} action={actionFor(theme)} />
            ))}
          </ul>
        ) : (
          <p
            role="status"
            className="mt-6 rounded-theme-card border border-border bg-surface p-6 text-center font-body text-body"
          >
            The themes could not be loaded right now. Please try again in a moment.
          </p>
        )}
      </div>
    </section>
  );
}

/** One theme: its colours in a small mock page, Free / Pro and its button. Also used on the home page. */
export function ThemeGalleryCard({
  theme,
  planNames,
  action,
}: {
  theme: ApiTheme;
  planNames: string;
  /** Replaces the Start free button (a logged-in host: Use this theme / Current). */
  action?: ReactNode;
}) {
  // PRO = a paid theme; the padlock and Upgrade only while the visitor's plan doesn't include it
  const pro = !theme.free;
  const locked = Boolean(theme.locked);
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
          <span className="pt-[1.5px] font-mock-sans text-[0.75rem] font-bold leading-4 text-mock-brand">
            Green Casa
          </span>
          <span className="rounded-pill bg-mock-pill px-2.5 py-0.5 font-mock-sans text-[0.625rem] font-bold leading-[15px] text-mock-pill-text">
            Book now
          </span>
        </div>
        <div className="relative flex h-[128px] flex-col justify-end overflow-hidden rounded-[8px] bg-mock-hero p-3.5 shadow-mock-hero">
          {pro ? (
            <span className="absolute right-2 top-2 inline-flex h-[17.5px] items-center gap-1 rounded-[4px] bg-pro-overlay px-2 font-mock-sans text-[0.5625rem] font-bold leading-[13.5px] text-white">
              {locked ? <PadlockIcon size={10} /> : null} PRO
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
                {locked ? <PadlockIcon size={10} /> : null} PRO
              </span>
            ) : (
              <span className="rounded-[4px] bg-free-badge-bg px-1.5 py-0.5 text-[0.625rem] leading-[15px] text-free-badge-text">
                FREE
              </span>
            )}
          </h3>
          <span className="flex gap-1" aria-label={`Colours of the ${theme.name} theme`}>
            {swatches.map((color, i) => (
              <span
                key={i}
                className="size-4 rounded-full border border-black/10"
                style={{ background: color }}
                title={color}
              />
            ))}
          </span>
        </div>
        {action ? (
          action
        ) : locked ? (
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
