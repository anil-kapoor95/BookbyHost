"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PlanCheckoutDialog } from "@/features/billing/PlanCheckoutDialog";
import { ensureSignupLoaded, useSignupSession } from "@/features/onboarding/signup-session";
import { signupApi, type ApiPlan } from "@/lib/api/signup";
import {
  formatPlanPrice,
  planCardLines,
  planCardStyle,
  planPeriodLabel,
  planPriceIn,
  type PlanCurrency,
} from "@/lib/plan-display";
import { cn } from "@/lib/utils";
import { usePlanCurrency } from "@/features/region/country";
import { PricingPlanCard, planCtaBase, planCtaClass } from "./PricingPlanCard";
import { TrialCta, trialBuyClass } from "@/components/billing/TrialCta";

/**
 * The plan cards of the back office (Subscriptions > Plans), with a USD (international) / INR (India) switch.
 * Used on the Pricing page and the home page.
 */
export function PlanGrid({ plans }: { plans: ApiPlan[] }) {
  // currency of the visitor's country (detected; changed with the country selector in the header): India INR, else USD
  const currency = usePlanCurrency();
  // A logged-in host (with its company) pays for a plan right here; visitors sign up first (plan kept with the sign-up).
  const { token, state } = useSignupSession();
  const canBuy = Boolean(token && state?.company);
  const [buying, setBuying] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // /pricing?buy=<plan code> opens the checkout of that plan once the host is known to be logged in
  const autoBuy = useSyncExternalStore(subscribeUrl, readBuyParam, () => null);
  const openPlan =
    buying ??
    (canBuy && !dismissed && autoBuy && plans.some((p) => p.code === autoBuy && p.purchasable) ? autoBuy : null);
  useEffect(() => {
    void ensureSignupLoaded();
  }, []);
  // logged-in host: which plans may it still try for free (once, before a first payment)?
  const [trialCodes, setTrialCodes] = useState<string[]>([]);
  useEffect(() => {
    if (!canBuy || !token) return;
    let live = true;
    void signupApi.plans(token).then((result) => {
      if (live && result.ok) setTrialCodes(result.data.plans.filter((p) => p.trial_available).map((p) => p.code));
    });
    return () => {
      live = false;
    };
  }, [canBuy, token]);
  const dual = plans.some((plan) => plan.prices && plan.prices.INR !== null && (plan.price ?? 0) > 0);
  if (plans.length === 0) {
    return (
      <p className="mx-auto mt-[67px] max-w-[560px] text-center text-body">
        Plans are being updated.{" "}
        <Link href="/contact" className="font-semibold text-heading underline underline-offset-2">
          Contact us
        </Link>{" "}
        for prices.
      </p>
    );
  }
  return (
    <>
      <ul
        className={cn(
          "mx-auto grid max-w-[1112px] grid-cols-1 items-stretch gap-6",
          "mt-[67px]",
          plans.length === 2 && "md:grid-cols-2 md:max-w-[760px]",
          plans.length >= 3 && "md:grid-cols-3",
          plans.length === 1 && "max-w-[400px]",
        )}
      >
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            plans={plans}
            index={index}
            currency={dual ? currency : "USD"}
            onBuy={canBuy && plan.purchasable ? () => setBuying(plan.code) : undefined}
            trialToken={canBuy && token && trialCodes.includes(plan.code) ? token : undefined}
          />
        ))}
      </ul>
      {dual ? (
        <p className="mt-6 text-center text-caption text-muted">
          {currency === "INR"
            ? "Prices in Indian rupees for India, paid securely through Razorpay."
            : "Prices in US dollars, paid securely through Stripe or Razorpay."}
        </p>
      ) : null}
      <PlanCheckoutDialog
        open={openPlan !== null}
        token={token}
        planCode={openPlan}
        returnPath="/pricing"
        onClose={() => {
          setBuying(null);
          setDismissed(true);
        }}
      />
    </>
  );
}

/** Call to action of a plan: free / trial / on request / paid. */
function planCta(plan: ApiPlan, currency: PlanCurrency): { label: string; href: string } {
  if (plan.price === null || planPriceIn(plan, currency) === null) return { label: "Contact us", href: "/contact" };
  // the plan travels with the sign-up: a trial starts with the company, otherwise the free plan and an upgrade later
  const href = `/setup/account?plan=${encodeURIComponent(plan.code)}`;
  if (plan.price === 0) return { label: "Start free", href };
  if (plan.trial_days > 0) return { label: `Start ${plan.trial_days}-day free trial`, href };
  return { label: `Get ${plan.name}`, href };
}

function PlanCard({
  plan,
  plans,
  index,
  currency,
  onBuy,
  trialToken,
}: {
  plan: ApiPlan;
  plans: ApiPlan[];
  index: number;
  currency: PlanCurrency;
  /** Logged-in host: pay for the plan here (checkout window). */
  onBuy?: () => void;
  /** Logged-in host that may still try this plan: start the free trial here. */
  trialToken?: string;
}) {
  const style = planCardStyle(plan, plans);
  const cta = planCta(plan, currency);
  return (
    <PricingPlanCard
      name={plan.name}
      price={formatPlanPrice(plan, currency)}
      period={planPriceIn(plan, currency) ? planPeriodLabel(plan) : undefined}
      note={plan.trial_days > 0 && plan.price ? `${plan.trial_days}-day free trial` : undefined}
      features={planCardLines(plan, plans.slice(0, index))}
      style={style}
      badge={style === "popular" ? "Most popular" : undefined}
      cta={
        trialToken ? (
          <TrialCta
            token={trialToken}
            plan={plan}
            ctaClass={cn(planCtaBase.replace("px-[29px]", "px-4"), "whitespace-nowrap", planCtaClass[style])}
            buyClass={trialBuyClass(planCtaBase, style)}
            onBuy={onBuy}
            onStarted={() => window.setTimeout(() => window.location.reload(), 900)}
          />
        ) : onBuy ? (
          <button type="button" onClick={onBuy} className={cn(planCtaBase, planCtaClass[style])}>
            Buy {plan.name}
          </button>
        ) : (
          <Link href={cta.href} className={cn(planCtaBase, planCtaClass[style])}>
            {cta.label}
          </Link>
        )
      }
    />
  );
}

function readBuyParam(): string | null {
  const value = new URLSearchParams(window.location.search).get("buy");
  return value && /^[a-z0-9_-]{1,40}$/.test(value) ? value : null;
}

function subscribeUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
