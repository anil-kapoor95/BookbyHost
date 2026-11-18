import { apiRequest } from "./client";
import type { SignupState } from "./signup";

/** Plan of the host's company on the profile page. */
export interface AccountPlan {
  code: string;
  name: string;
  /** active · trial · past_due · grace · expired · cancelled … */
  status: string;
  is_free: boolean;
  trial_ends_at: string | null;
  period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface AccountProfile {
  state: SignupState;
  member_since: string;
  plan: AccountPlan | null;
  /** Back-office log-in (bookings, calendars, settings). */
  dashboard_url: string;
  /** Back-office My plan page (payments, invoices). */
  my_plan_url: string;
}

/** Profile page of a logged-in host (/account): read-only details, and the password change. */
export const accountApi = {
  profile: (token: string) => apiRequest<AccountProfile>("pjActionAccountProfile", {}, { token }),

  password: (token: string, input: { current: string; password: string; confirm: string }) =>
    apiRequest<AccountProfile>(
      "pjActionAccountPassword",
      { current_password: input.current, password: input.password, confirm_password: input.confirm },
      { token },
    ),
};

/** "2 Dec 2026" from "2026-12-02 11:05:47" (server date, shown as written). */
export function formatAccountDate(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
}

/** Whole days left until a server date (0 when past). */
export function daysUntil(value: string | null | undefined): number {
  if (!value) return 0;
  const end = new Date(value.replace(" ", "T")).getTime();
  return Number.isNaN(end) ? 0 : Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

/** Short plan label for the avatar menu: "Pro trial · 14 days left", "Starter (free)", "Pro". */
export function planBadge(plan: AccountPlan | null): string {
  if (!plan) return "";
  if (plan.status === "trial") {
    const days = daysUntil(plan.trial_ends_at);
    return `${plan.name} trial · ${days === 1 ? "1 day" : `${days} days`} left`;
  }
  if (plan.is_free) return `${plan.name} (free)`;
  if (plan.status === "expired" || plan.status === "suspended") return `${plan.name} · expired`;
  return plan.name;
}
