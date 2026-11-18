"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Notice } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PlanCheckoutDialog } from "@/features/billing/PlanCheckoutDialog";
import {
  ensureSignupLoaded,
  logoutSignup,
  updateSignupState,
  useSignupSession,
} from "@/features/onboarding/signup-session";
import { hrefForNextStep, LIVE_HREF } from "@/features/onboarding/steps";
import { accountApi, daysUntil, formatAccountDate, type AccountProfile } from "@/lib/api/account";
import type { FieldErrors } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Saved = (profile: AccountProfile, message: string) => void;

/** /account: the logged-in host's details, company, password and plan. */
export function AccountPage() {
  const router = useRouter();
  const { token, phase } = useSignupSession();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [flash, setFlash] = useState<string>();
  const [buying, setBuying] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    void ensureSignupLoaded();
  }, []);

  // not logged in on this browser: log in first
  useEffect(() => {
    if (phase === "ready" && !token) router.replace("/login");
  }, [phase, token, router]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    void accountApi.profile(token).then((result) => {
      if (!live) return;
      if (result.ok) setProfile(result.data);
      else if (result.code === 401) router.replace("/login");
      else setLoadError(result.message);
    });
    return () => {
      live = false;
    };
  }, [token, router]);

  const saved: Saved = (next, message) => {
    setProfile(next);
    updateSignupState(next.state);
    setFlash(message);
  };

  async function logout() {
    setLeaving(true);
    await logoutSignup();
    router.push("/login");
  }

  if (loadError) {
    return (
      <div className="container-page py-10">
        <Notice tone="error" title="Your profile could not be loaded" role="alert">
          {loadError}
        </Notice>
      </div>
    );
  }
  if (!profile || !token) {
    return (
      <div className="container-page py-16 text-center text-body" role="status" aria-live="polite">
        Loading your profile…
      </div>
    );
  }

  const account = profile.state.account;
  const company = profile.state.company;
  const completed = profile.state.status === "completed";
  const pageHref = profile.state.property?.slug ? `/${profile.state.property.slug}` : null;
  const initial = (account.name || account.email).charAt(0).toUpperCase();

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-pill bg-primary-soft font-heading text-title text-primary-strong"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="text-display">{account.name || "My profile"}</h1>
          <p className="mt-1 text-small text-body">
            Host since {formatAccountDate(profile.member_since)}
            {company?.name ? ` · ${company.name}` : ""}
          </p>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {flash ?? ""}
      </p>
      {flash ? (
        <Notice tone="success" className="mt-6">
          {flash}
        </Notice>
      ) : null}

      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-6">
          <PersonalCard profile={profile} />
          {company ? (
            <CompanyCard profile={profile} />
          ) : (
            <Card as="section" aria-labelledby="company-title">
              <h2 id="company-title" className="text-title">
                Company
              </h2>
              <p className="mt-2 text-small text-body">Your company is added in the next steps of the setup.</p>
              <Button href={hrefForNextStep(profile.state.next_step)} size="md" className="mt-4">
                Continue setup
              </Button>
            </Card>
          )}
          <PasswordCard token={token} onSaved={saved} />
        </div>

        <div className="grid gap-6">
          <PlanCard profile={profile} onBuy={setBuying} />
          <Card as="section" aria-labelledby="links-title">
            <h2 id="links-title" className="text-title">
              Quick links
            </h2>
            <ul className="mt-3 divide-y divide-divider">
              {completed ? (
                <QuickLink href={LIVE_HREF} icon="home" label="My page and payments" />
              ) : (
                <QuickLink href={hrefForNextStep(profile.state.next_step)} icon="arrowRight" label="Continue setup" />
              )}
              {pageHref ? <QuickLink href={pageHref} icon="eye" label="View my booking page" /> : null}
              {company?.slug ? (
                <QuickLink href={`/stays/${company.slug}`} icon="users" label="My company page" />
              ) : null}
              <QuickLink
                href={profile.dashboard_url}
                icon="calendar"
                label="Bookings and calendar (dashboard)"
                external
              />
              <li>
                <button
                  type="button"
                  onClick={logout}
                  disabled={leaving}
                  className="flex w-full items-center gap-3 py-3 text-left text-small font-semibold text-error hover:underline focus-visible:outline-none focus-visible:focus-ring"
                >
                  <Icon name="logout" size={18} /> {leaving ? "Logging out…" : "Log out"}
                </button>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <PlanCheckoutDialog
        open={buying !== null}
        token={token}
        planCode={buying}
        returnPath="/account"
        onClose={() => setBuying(null)}
      />
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  external,
}: {
  href: string;
  icon: IconName;
  label: string;
  external?: boolean;
}) {
  const className =
    "flex items-center gap-3 py-3 text-small font-semibold text-heading hover:text-link-hover focus-visible:outline-none focus-visible:focus-ring";
  const inner = (
    <>
      <Icon name={icon} size={18} className="text-muted" />
      <span className="flex-1">{label}</span>
      <Icon name={external ? "externalLink" : "chevronRight"} size={16} className="text-muted" />
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  );
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={className}>
          {inner}
        </Link>
      )}
    </li>
  );
}

/** Card with a title, an Edit button and either the details (rows) or the edit form. */
function SectionCard({
  id,
  title,
  editing,
  onEdit,
  children,
}: {
  id: string;
  title: string;
  editing: boolean;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <Card as="section" aria-labelledby={`${id}-title`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-title">
          {title}
        </h2>
        {!editing && onEdit ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon name="pencil" size={15} /> Edit
          </Button>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="divide-y divide-divider">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3 text-small">
          <dt className="text-body">{label}</dt>
          <dd className="min-w-0 break-words font-semibold text-heading">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function FormActions({
  busy,
  onCancel,
  label = "Save changes",
}: {
  busy: boolean;
  onCancel?: () => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <Button type="submit" size="md" disabled={busy} aria-busy={busy}>
        {busy ? "Saving…" : label}
      </Button>
      {onCancel ? (
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-small font-semibold text-error">
      {message}
    </p>
  ) : null;
}

/** First error of a failed save: field errors under the fields, anything else above the buttons. */
function splitErrors(message: string, errors: FieldErrors, known: string[]): { fields: FieldErrors; general?: string } {
  const fields: FieldErrors = {};
  let general: string | undefined;
  for (const [key, value] of Object.entries(errors ?? {})) {
    if (known.includes(key)) fields[key] = value;
    else general = general ?? value;
  }
  if (!Object.keys(fields).length && !general) general = message;
  return { fields, general };
}

function PersonalCard({ profile }: { profile: AccountProfile }) {
  const account = profile.state.account;
  return (
    <SectionCard id="personal" title="Personal details" editing={false}>
      <Rows
        rows={[
          ["Name", account.name],
          ["Email", account.email],
          ["WhatsApp", account.phone],
        ]}
      />
    </SectionCard>
  );
}

function CompanyCard({ profile }: { profile: AccountProfile }) {
  const company = profile.state.company!;
  return (
    <SectionCard id="company" title="Company" editing={false}>
      <Rows
        rows={[
          ["Company name", company.name],
          ["Business email", company.email],
          ["Phone", company.phone],
          [
            "Company page",
            company.slug ? (
              <Link href={`/stays/${company.slug}`} className="text-link underline-offset-2 hover:underline">
                /stays/{company.slug}
              </Link>
            ) : null,
          ],
        ]}
      />
    </SectionCard>
  );
}

function PasswordCard({ token, onSaved }: { token: string; onSaved: Saved }) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string>();
  const [busy, setBusy] = useState(false);

  function close() {
    setEditing(false);
    setCurrent("");
    setPassword("");
    setConfirm("");
    setErrors({});
    setGeneral(undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!current) next.current_password = "Enter your current password.";
    if (!password) next.password = "Enter a new password.";
    if (password && confirm !== password) next.confirm_password = "The passwords don't match.";
    setErrors(next);
    setGeneral(undefined);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await accountApi.password(token, { current, password, confirm });
    setBusy(false);
    if (!result.ok) {
      const split = splitErrors(result.message, result.errors, ["current_password", "password", "confirm_password"]);
      setErrors(split.fields);
      setGeneral(split.general);
      return;
    }
    close();
    onSaved(result.data, result.message);
  }

  const type = show ? "text" : "password";
  return (
    <SectionCard id="password" title="Password" editing={editing}>
      {editing ? (
        <form className="grid gap-5" onSubmit={submit} noValidate>
          <TextField
            id="pw-current"
            label="Current password"
            type={type}
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={errors.current_password}
          />
          <TextField
            id="pw-new"
            label="New password"
            type={type}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          <TextField
            id="pw-confirm"
            label="Confirm new password"
            type={type}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm_password}
          />
          <label className="flex items-center gap-2 text-small text-body">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="size-4 accent-primary"
            />
            Show passwords
          </label>
          <FormError message={general} />
          <FormActions busy={busy} onCancel={close} label="Change password" />
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-small text-body">Use a strong password you don&apos;t use anywhere else.</p>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Icon name="lock" size={15} /> Change password
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

function PlanCard({ profile, onBuy }: { profile: AccountProfile; onBuy: (code: string) => void }) {
  const plan = profile.plan;
  const trial = plan?.status === "trial";
  const expired = plan ? ["expired", "suspended", "cancelled"].includes(plan.status) : false;
  return (
    <Card as="section" aria-labelledby="plan-title">
      <h2 id="plan-title" className="text-title">
        Your plan
      </h2>
      {plan ? (
        <>
          <p className="mt-3 flex flex-wrap items-center gap-2 font-heading text-section text-heading">
            {plan.name}
            {trial ? <StatusPill tone="success">Free trial</StatusPill> : null}
            {plan.is_free && !trial ? <StatusPill tone="muted">Free</StatusPill> : null}
            {expired ? <StatusPill tone="error">Expired</StatusPill> : null}
          </p>
          <p className="mt-2 text-small text-body">
            {trial
              ? `Trial ends ${formatAccountDate(plan.trial_ends_at)} (${daysUntil(plan.trial_ends_at)} days left). After that you're back on free Starter unless you buy ${plan.name}. Buying now keeps the trial days.`
              : plan.is_free
                ? "Upgrade for your own domain, more themes, more payment gateways and Airbnb sync."
                : plan.period_end
                  ? `${plan.cancel_at_period_end ? "Ends" : "Renews"} on ${formatAccountDate(plan.period_end)}.`
                  : "Active."}
          </p>
          <div className="mt-5 grid gap-3">
            {trial ? (
              <Button size="md" fullWidth onClick={() => onBuy(plan.code)}>
                Buy {plan.name}
              </Button>
            ) : null}
            {!trial && !plan.is_free ? (
              <Button href={profile.my_plan_url} size="md" fullWidth external>
                Manage plan and invoices <Icon name="externalLink" size={15} />
              </Button>
            ) : null}
            <Button href="/pricing" variant={trial || !plan.is_free ? "outline" : "primary"} size="md" fullWidth>
              {plan.is_free && !trial ? "See plans and free trial" : "Compare plans"}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-small text-body">Your plan starts when your company is added in the setup.</p>
      )}
    </Card>
  );
}

function StatusPill({ tone, children }: { tone: "success" | "muted" | "error"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-pill px-2.5 py-0.5 font-body text-caption font-semibold",
        tone === "success" && "bg-success-soft text-success-strong",
        tone === "muted" && "bg-surface-sunken text-body",
        tone === "error" && "bg-error-soft text-error",
      )}
    >
      {children}
    </span>
  );
}
