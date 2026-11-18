"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useCountry } from "@/features/region/country";
import { billingApi, safeReturnPath, type PlanCheckout } from "@/lib/api/billing";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<PlanCheckout["kind"], string> = {
  new: "New plan",
  upgrade: "Upgrade",
  renewal: "Renewal",
};

/**
 * Pay for a plan straight from the website, in the currency of the visitor's country (header country selector;
 * India pays in INR, every other country in USD — fixed after the first payment): payment method (only the gateways
 * of that currency), optional
 * coupon and a summary. "Pay" sends the browser to the gateway; afterwards it comes back to /billing/return.
 * Every price shown comes from the server (pjActionPlanCheckout), which also decides what is charged.
 */
type CheckoutProps = {
  open: boolean;
  /** Sign-up token of the logged-in host. */
  token: string | null;
  planCode: string | null;
  /** Page to open after the payment (default: the current page). */
  returnPath?: string;
  onClose: () => void;
};

export function PlanCheckoutDialog({ open, token, planCode, returnPath, onClose }: CheckoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<PlanCheckout | null>(null);
  const [loadError, setLoadError] = useState<string>();
  // billing country = the visitor's country (header country selector): India pays in INR, elsewhere USD
  const country = useCountry().country.code;
  const [method, setMethod] = useState<string>("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string>();
  const [done, setDone] = useState<string>();
  const seq = useRef(0);

  // a fresh checkout each time the window opens for a plan (state reset while rendering, not in an effect; the
  // dialog itself stays mounted so opening it is a plain open / close)
  const session = open ? planCode : null;
  const [lastSession, setLastSession] = useState<string | null>(session);
  if (session !== lastSession) {
    setLastSession(session);
    setData(null);
    setLoadError(undefined);
    setPayError(undefined);
    setDone(undefined);
    setCoupon("");
    setAppliedCoupon("");
    setCouponOpen(false);
    setPaying(false);
    setMethod("");
    setLoading(true);
  }

  // the server's answer: checkout data, or why the plan can't be bought
  function apply(result: Awaited<ReturnType<typeof billingApi.checkout>>) {
    setLoading(false);
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    setLoadError(undefined);
    setData(result.data);
    const ids = (result.data.methods ?? []).map((m) => m.id);
    setMethod((current) => (ids.includes(current) ? current : (ids[0] ?? "")));
  }

  // asks the server again (other currency, coupon, retry); only the latest answer counts
  function load(opts: { country?: string; coupon?: string }) {
    if (!token || !planCode) return;
    const my = ++seq.current;
    setLoading(true);
    void billingApi.checkout(token, planCode, opts).then((result) => {
      if (my === seq.current) apply(result);
    });
  }

  useEffect(() => {
    if (!open || !token || !planCode) return;
    const my = ++seq.current;
    void billingApi.checkout(token, planCode, { country }).then((result) => {
      if (my === seq.current) apply(result);
    });
  }, [open, token, planCode, country]);

  function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    setAppliedCoupon(code);
    load({ country, coupon: code });
  }

  async function pay() {
    if (!token || !planCode || !data) return;
    setPaying(true);
    setPayError(undefined);
    const validCoupon = data.coupon?.valid ? appliedCoupon : "";
    const result = await billingApi.purchase(token, {
      plan: planCode,
      country,
      currency: data.currency,
      method,
      coupon: validCoupon,
      returnPath: safeReturnPath(returnPath ?? pathname),
    });
    if (!result.ok) {
      setPaying(false);
      setPayError(result.message);
      return;
    }
    const r = result.data;
    if (r.result === "checkout" && r.pay_url) {
      // the gateway page (Razorpay / Stripe); the plan is switched on when the gateway confirms the payment
      window.location.assign(r.pay_url);
      return;
    }
    setPaying(false);
    if (r.result === "applied" && r.txn) {
      router.push(`/billing/return?txn=${r.txn}&next=${encodeURIComponent(safeReturnPath(returnPath ?? pathname))}`);
      return;
    }
    setDone(
      r.result === "requested"
        ? "We have received your request. No online payment method is set up for this currency yet — we will contact you to complete the payment."
        : r.result === "free_scheduled" || r.result === "scheduled"
          ? `Your plan changes to ${data.plan.name} at the end of the period you have paid for. Nothing is charged now.`
          : "You are now on the free plan.",
    );
  }

  const methods = data?.methods ?? [];
  const canPay = Boolean(
    data &&
    data.purchasable &&
    !data.free &&
    !data.downgrade &&
    !loading &&
    !paying &&
    (methods.length === 0 || method),
  );
  const canSchedule = Boolean(data?.downgrade && !data.scheduled && !paying);
  const title = data ? `${data.plan.name}` : "Choose how to pay";
  const interval = data
    ? data.plan.interval_count > 1
      ? `every ${data.plan.interval_count} ${data.plan.billing_interval}s`
      : `per ${data.plan.billing_interval}`
    : "";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="form"
      title={title}
      description={
        data ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-caption font-bold uppercase tracking-wide text-primary-strong">
              {data.downgrade ? "Plan change" : KIND_LABEL[data.kind]}
            </span>
            <span>Billed {interval}</span>
          </span>
        ) : undefined
      }
      icon={
        <span className="grid size-12 shrink-0 place-items-center rounded-input bg-primary-soft text-primary">
          <Icon name="shield" size={22} />
        </span>
      }
      footer={
        done ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <p className="mr-auto flex max-w-sm items-center gap-1.5 text-caption text-muted">
              <Icon name="lock" size={14} /> Secure payment on the provider&apos;s page. Card details never reach us.
            </p>
            <Button variant="outline" onClick={onClose} disabled={paying}>
              Cancel
            </Button>
            {data?.downgrade ? (
              <Button onClick={pay} disabled={!canSchedule} aria-busy={paying}>
                {data.scheduled ? "Change already scheduled" : `Switch to ${data.plan.name} at period end`}
              </Button>
            ) : (
              <Button onClick={pay} disabled={!canPay} aria-busy={paying}>
                {paying
                  ? "Opening payment…"
                  : methods.length === 0 && data?.purchasable
                    ? "Send payment request"
                    : `Pay ${data?.amount_text ?? ""}`}
              </Button>
            )}
          </>
        )
      }
    >
      {loadError ? (
        <Notice tone="error" role="alert" title="This plan can't be bought right now">
          <p>{loadError}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              load({ country, coupon: appliedCoupon });
            }}
          >
            <Icon name="refresh" size={14} /> Try again
          </Button>
        </Notice>
      ) : !data ? (
        <div className="grid gap-3" aria-hidden="true">
          <div className="h-20 animate-pulse rounded-input bg-surface-muted" />
          <div className="h-24 animate-pulse rounded-input bg-surface-muted" />
          <div className="h-28 animate-pulse rounded-input bg-surface-muted" />
        </div>
      ) : done ? (
        <Notice tone="success" role="status" title="Done">
          <p>{done}</p>
        </Notice>
      ) : data.downgrade ? (
        <Notice tone="info" title={`${data.plan.name} is a smaller plan than ${data.current?.name ?? "your plan"}`}>
          <p>
            You keep {data.current?.name ?? "your plan"} until the end of the period you have paid for
            {data.current_ends_at ? ` (${formatDate(data.current_ends_at)})` : ""}; then your account switches to{" "}
            {data.plan.name}. Nothing is charged now.
          </p>
        </Notice>
      ) : data.free || !data.purchasable ? (
        <Notice tone="info" title={data.free ? "This plan is free" : "This plan isn't sold online"}>
          <p>{data.free ? "No payment is needed for this plan." : "Please contact us for this plan."}</p>
        </Notice>
      ) : (
        <div className={cn("grid gap-6", loading && "opacity-70 transition-opacity")} aria-busy={loading}>
          {/* Payment method (gateways of the currency of the visitor's country) */}
          <fieldset>
            <legend className="mb-2.5 flex items-center gap-2 font-heading text-[0.9375rem] font-bold text-heading">
              Payment method
            </legend>
            {methods.length === 0 ? (
              <Notice tone="warning">
                <p>
                  No online payment method takes {data.currency} yet. You can send a payment request and we&apos;ll get
                  in touch.
                </p>
              </Notice>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
                {methods.map((m) => {
                  const active = m.id === method;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "relative flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-input border-[1.5px] p-3 transition focus-visible:outline-none focus-visible:focus-ring",
                        active
                          ? "border-primary bg-primary-tint shadow-sm"
                          : "border-border hover:border-border-strong",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute right-2 top-2 grid size-4.5 place-items-center rounded-pill border-[1.5px]",
                          active ? "border-primary bg-primary text-white" : "border-border-strong text-transparent",
                        )}
                      >
                        <Icon name="check" size={10} />
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element -- gateway logo served by the back office */}
                      <img src={m.logo} alt="" className="max-h-8 max-w-[110px] object-contain" />
                      <span className="text-caption font-semibold text-body-strong">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          {/* Coupon */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1.5 text-small font-semibold text-primary-strong hover:underline"
              aria-expanded={couponOpen}
              aria-controls="plan-coupon"
              onClick={() => setCouponOpen((v) => !v)}
            >
              <Icon name="sparkles" size={15} /> Have a coupon code?
            </button>
            {couponOpen ? (
              <div id="plan-coupon" className="mt-2">
                <div className="flex gap-2">
                  <label htmlFor="plan-coupon-input" className="sr-only">
                    Coupon code
                  </label>
                  <input
                    id="plan-coupon-input"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyCoupon();
                      }
                    }}
                    maxLength={30}
                    autoComplete="off"
                    placeholder="Enter your code"
                    className="h-11 min-w-0 flex-1 rounded-input border border-border bg-surface px-3 uppercase text-heading focus-visible:outline-none focus-visible:focus-ring"
                  />
                  <Button variant="outline" onClick={applyCoupon} disabled={loading || coupon.trim() === ""}>
                    Apply
                  </Button>
                </div>
                {data.coupon?.message ? (
                  <p
                    role="status"
                    className={cn("mt-1.5 text-caption", data.coupon.valid ? "text-success" : "text-error")}
                  >
                    {data.coupon.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Summary */}
          <div className="rounded-input bg-surface-muted px-4 py-3" aria-live="polite">
            <div className="flex justify-between py-0.5 text-small text-muted">
              <span>Plan price</span>
              <span>{data.list_text}</span>
            </div>
            {data.discount_text ? (
              <div className="flex justify-between py-0.5 text-small text-muted">
                <span>Discount</span>
                <span className="font-semibold text-success">{data.discount_text}</span>
              </div>
            ) : null}
            <div className="mt-1.5 flex items-baseline justify-between border-t border-dashed border-divider pt-2 font-bold text-heading">
              <span>Total to pay</span>
              <span className="text-[1.5rem]">{data.amount_text}</span>
            </div>
            {data.usd_text ? (
              <p className="mt-0.5 text-right text-caption text-muted">
                ≈ {data.usd_text} · {data.rate_text}
              </p>
            ) : null}
            {data.price_locked ? (
              <p className="mt-0.5 flex items-center justify-end gap-1 text-caption text-success">
                <Icon name="lock" size={12} /> Renewal at the price you agreed when you subscribed.
              </p>
            ) : null}
          </div>

          {payError ? (
            <Notice tone="error" role="alert" title="The payment couldn't be started">
              <p>{payError}</p>
            </Notice>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}

function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
