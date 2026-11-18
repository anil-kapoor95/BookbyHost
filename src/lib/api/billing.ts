import { apiRequest } from "./client";

/**
 * Buying a plan on the website (back office: pjJabbApi::pjActionPlanCheckout / PlanPurchase / PlanPaymentStatus).
 * The server works out the currency (billing country, fixed after the first payment), the amount (plan price,
 * agreed renewal price, discount, coupon) and which gateways may take it: INR through Razorpay only, USD through
 * Razorpay or Stripe. Nothing about the price is trusted from the browser.
 */

export type BillingCurrency = "USD" | "INR";

export interface CheckoutCurrency {
  code: BillingCurrency;
  price: number | null;
  price_text: string;
  available: boolean;
  /** false when the company's currency is fixed to another one (or the plan has no price in it). */
  selectable: boolean;
}

export interface CheckoutMethod {
  id: string;
  name: string;
  logo: string;
}

export interface PlanCheckout {
  plan: {
    id: number;
    code: string;
    name: string;
    interval_count: number;
    billing_interval: "month" | "year";
    trial_days: number;
  };
  kind: "new" | "upgrade" | "renewal";
  free: boolean;
  purchasable: boolean;
  current: {
    code: string;
    name: string;
    status: string;
    entitled: boolean;
  } | null;
  billing_country: string;
  /** A cheaper plan than the paid plan the company has: switches at the end of the period (nothing charged now). */
  downgrade: boolean;
  current_ends_at: string | null;
  /** This plan is already scheduled for the end of the period. */
  scheduled: boolean;
  /** Not set for free / not purchasable plans. */
  currency?: BillingCurrency;
  locked?: boolean;
  price_locked?: boolean;
  currencies?: CheckoutCurrency[];
  list?: number;
  discount?: number;
  amount?: number;
  list_text?: string;
  discount_text?: string;
  amount_text?: string;
  usd_text?: string;
  rate_text?: string;
  coupon?: { code: string; valid: boolean | null; message: string };
  methods?: CheckoutMethod[];
}

export type PurchaseResult = "checkout" | "applied" | "requested" | "free_switched" | "free_scheduled" | "scheduled";

export interface PlanPurchase {
  result: PurchaseResult;
  kind: string;
  txn: string | null;
  /** Gateway payment page (result "checkout"). */
  pay_url: string | null;
  amount_text: string;
  currency: string;
  method: string | null;
}

export interface PlanPaymentStatus {
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  plan: { code: string; name: string } | null;
  kind: string;
  amount_text: string;
  currency: string;
  method: string;
  online: boolean;
  failure_reason: string;
  period_end: string | null;
  subscription: { plan: string; status: string; ends_at: string | null } | null;
}

export const billingApi = {
  /** country: billing country (ISO alpha-2); sets the currency while the account's currency isn't fixed yet. */
  checkout: (token: string, plan: string, options: { country?: string; currency?: string; coupon?: string } = {}) =>
    apiRequest<PlanCheckout>(
      "pjActionPlanCheckout",
      { plan, country: options.country, currency: options.currency, coupon_code: options.coupon },
      { token },
    ),

  purchase: (
    token: string,
    input: {
      plan: string;
      country?: string;
      currency?: string;
      method?: string;
      coupon?: string;
      returnPath?: string;
    },
  ) =>
    apiRequest<PlanPurchase>(
      "pjActionPlanPurchase",
      {
        plan: input.plan,
        country: input.country,
        currency: input.currency,
        method: input.method,
        coupon_code: input.coupon,
        return_path: input.returnPath,
      },
      { token },
    ),

  status: (token: string, txn: string) =>
    apiRequest<PlanPaymentStatus>("pjActionPlanPaymentStatus", { txn }, { token }),

  /** Start a plan's free trial (no payment; once per company, before a first payment). */
  startTrial: (token: string, plan: string) =>
    apiRequest<PlanTrialStarted>("pjActionPlanStartTrial", { plan }, { token }),
};

export interface PlanTrialStarted {
  plan: { code: string; name: string };
  status: "trial";
  trial_ends_at: string | null;
}

/** Website path to come back to after paying (only a plain path of this site). */
export function safeReturnPath(path: string | null | undefined): string {
  return path && /^\/[A-Za-z0-9/_-]{0,120}$/.test(path) && !path.includes("//") ? path : "/";
}
