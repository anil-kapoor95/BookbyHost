"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authNav } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ensureSignupLoaded, logoutSignup, useSignupSession } from "@/features/onboarding/signup-session";
import { hrefForNextStep, LIVE_HREF } from "@/features/onboarding/steps";
import { accountApi, planBadge, type AccountProfile } from "@/lib/api/account";
import { cn } from "@/lib/utils";

/**
 * "Log in / Create free page", or — when a host is logged in on this browser (sign-up token) —
 * "My page / Continue setup" and "Log out", so someone else can register or log in afterwards.
 */
export function AuthNav({ variant }: { variant: "desktop" | "mobile" }) {
  const router = useRouter();
  const { token, state, phase } = useSignupSession();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    void ensureSignupLoaded();
  }, []);

  const loggedIn = Boolean(token && state);
  // Until the saved sign-up is known, keep the space without flashing the wrong links.
  const pending = phase !== "ready" && !loggedIn;
  const mobile = variant === "mobile";

  async function logout() {
    setLeaving(true);
    await logoutSignup();
    setLeaving(false);
    router.push(authNav.login.href);
  }

  if (loggedIn && state) {
    const completed = state.status === "completed";
    const name = state.account.first_name || state.account.name;
    return (
      <div className={cn(mobile ? "grid gap-3" : "flex items-center gap-4")}>
        {!mobile && name ? (
          <AccountMenu
            token={token as string}
            name={name}
            fullName={state.account.name || name}
            email={state.account.email}
            pageHref={completed ? LIVE_HREF : hrefForNextStep(state.next_step)}
            pageLabel={completed ? "My page" : "Continue setup"}
            onLogout={logout}
            leaving={leaving}
          />
        ) : null}
        {mobile && name ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-small text-body">Logged in as {name}</p>
            <Link href="/account" className="text-small font-semibold text-link underline-offset-2 hover:underline">
              My profile
            </Link>
          </div>
        ) : null}
        <Button
          href={completed ? LIVE_HREF : hrefForNextStep(state.next_step)}
          size={mobile ? "lg" : "md"}
          fullWidth={mobile}
        >
          {completed ? "My page" : "Continue setup"}
        </Button>
        {/* desktop: Log out is in the avatar menu */}
        {mobile || !name ? (
          <Button
            variant="outline"
            size={mobile ? "lg" : "md"}
            fullWidth={mobile}
            onClick={logout}
            disabled={leaving}
            aria-busy={leaving}
          >
            <Icon name="logout" size={16} /> {leaving ? "Logging out…" : "Log out"}
          </Button>
        ) : null}
      </div>
    );
  }

  if (mobile) {
    return (
      <div className={cn("grid gap-3", pending && "invisible")}>
        <Button href={authNav.cta.href} size="lg" fullWidth>
          {authNav.cta.label}
        </Button>
        <Button href={authNav.login.href} variant="outline" size="lg" fullWidth>
          {authNav.login.label}
        </Button>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-5", pending && "invisible")} aria-hidden={pending || undefined}>
      <Link
        href={authNav.login.href}
        className="rounded-sm text-menu font-semibold text-nav transition-colors hover:text-link-hover focus-visible:outline-none focus-visible:focus-ring"
      >
        {authNav.login.label}
      </Link>
      <Button href={authNav.cta.href} size="md">
        {authNav.cta.label}
      </Button>
    </div>
  );
}

/**
 * Avatar button of a logged-in host: opens a small menu with the name, email, plan and the account links
 * (My profile, page, plan, dashboard, log out). Plan and dashboard link are loaded when the menu first opens.
 */
function AccountMenu({
  token,
  name,
  fullName,
  email,
  pageHref,
  pageLabel,
  onLogout,
  leaving,
}: {
  token: string;
  name: string;
  fullName: string;
  email: string;
  pageHref: string;
  pageLabel: string;
  onLogout: () => void;
  leaving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = "account-menu";

  useEffect(() => {
    if (!open || profile) return;
    let live = true;
    void accountApi.profile(token).then((result) => {
      if (live && result.ok) setProfile(result.data);
    });
    return () => {
      live = false;
    };
  }, [open, profile, token]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badge = planBadge(profile?.plan ?? null);
  const trial = profile?.plan?.status === "trial";
  const item =
    "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-small font-semibold text-heading hover:bg-surface-sunken focus-visible:outline-none focus-visible:focus-ring";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-44 items-center gap-2 rounded-pill border border-transparent py-1 pr-2 pl-1 text-small text-body transition-colors hover:border-border hover:bg-surface focus-visible:outline-none focus-visible:focus-ring aria-expanded:border-border aria-expanded:bg-surface"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-pill bg-primary-soft font-bold text-primary-strong"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">
          <span className="sr-only">Account menu for </span>
          {name}
        </span>
        <Icon name="chevronDown" size={14} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-card border border-border bg-card p-2 shadow-popover"
        >
          <div className="border-b border-divider px-3 pt-2 pb-3">
            <p className="truncate text-small font-semibold text-heading">{fullName}</p>
            <p className="truncate text-caption text-body">{email}</p>
            {badge ? (
              <span
                className={cn(
                  "mt-2 inline-block rounded-pill px-2.5 py-0.5 text-caption font-semibold",
                  trial ? "bg-success-soft text-success-strong" : "bg-surface-sunken text-body",
                )}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <div className="grid gap-0.5 pt-1.5">
            <Link role="menuitem" href="/account" className={item} onClick={() => setOpen(false)}>
              <Icon name="users" size={17} className="text-muted" /> My profile
            </Link>
            <Link role="menuitem" href={pageHref} className={item} onClick={() => setOpen(false)}>
              <Icon name="home" size={17} className="text-muted" /> {pageLabel}
            </Link>
            <Link role="menuitem" href="/account#plan-title" className={item} onClick={() => setOpen(false)}>
              <Icon name="star" size={17} className="text-muted" /> Plan and billing
            </Link>
            {profile ? (
              <a
                role="menuitem"
                href={profile.dashboard_url}
                target="_blank"
                rel="noopener noreferrer"
                className={item}
                onClick={() => setOpen(false)}
              >
                <Icon name="calendar" size={17} className="text-muted" /> Dashboard
                <Icon name="externalLink" size={14} className="ml-auto text-muted" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
            <button
              role="menuitem"
              type="button"
              onClick={onLogout}
              disabled={leaving}
              className={cn(item, "mt-1 border-t border-divider text-error")}
            >
              <Icon name="logout" size={17} /> {leaving ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
