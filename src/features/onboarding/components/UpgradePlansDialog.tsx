"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { usePlanCurrency } from "@/features/region/country";
import { PlanCheckoutDialog } from "@/features/billing/PlanCheckoutDialog";
import { PricingPlanCard, planCtaBaseCompact, planCtaClass } from "@/components/marketing/PricingPlanCard";
import { TrialCta, trialBuyClass } from "@/components/billing/TrialCta";
import {
  formatPlanPrice,
  planCardStyle,
  planFeatureLines,
  planIncludes,
  planPeriodLabel,
  planPriceIn,
} from "@/lib/plan-display";
import { signupApi, type ApiPlan } from "@/lib/api/signup";
import { cn } from "@/lib/utils";

type PlansData = {
  plans: ApiPlan[];
  current: { code: string; name: string; status: string } | null;
  myPlanUrl: string;
  /** The account's billing currency (USD / INR), when it is known. */
  billingCurrency: string | null;
};

/**
 * "Unlock premium themes": every plan from the back office (Subscriptions > Plans, active and public),
 * shown like the Pricing page. Plans are bought in the dashboard (Subscriptions > My plan), which
 * takes the payment; plans without a price lead to the contact page.
 */
export function UpgradePlansDialog({
  open,
  token,
  themeName,
  title = "Unlock premium themes",
  intro = "The first theme is free on every plan; choose a plan with themes to use the others.",
  keepFreeLabel = "Keep the free theme",
  currentLabel = "Check my themes again",
  featureKey,
  onClose,
  onKeepFree,
  onRefresh,
}: {
  open: boolean;
  token: string | null;
  /** The paid theme the host chose. */
  themeName: string | null;
  /** Window title and text (default: premium themes). */
  title?: string;
  intro?: string;
  /** Button of the plans without the feature (default "Keep the free theme"). */
  keepFreeLabel?: string;
  /** Button of the plan the host is on (default "Check my themes again"). */
  currentLabel?: string;
  /** Plan feature that unlocks it (plan.features[].key), e.g. payment_gateway_choice. Default: themes. */
  featureKey?: string;
  onClose: () => void;
  /** Close and use the free theme. */
  onKeepFree: () => void;
  /** The host says they upgraded: load the themes again. */
  onRefresh: () => void;
}) {
  const [data, setData] = useState<PlansData | null>(null);
  const [error, setError] = useState<string>();
  const [reload, setReload] = useState(0);
  // plan being paid for (checkout window over the plans)
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void signupApi.plans(token).then((result) => {
      if (!active) return;
      if (result.ok) {
        setData({
          plans: result.data.plans,
          current: result.data.current,
          myPlanUrl: result.data.my_plan_url,
          billingCurrency: result.data.billing_currency ?? null,
        });
        setError(undefined);
      } else {
        setError(result.message);
      }
    });
    return () => {
      active = false;
    };
  }, [open, token, reload]);

  const plans = data?.plans ?? [];
  // prices in the currency of the visitor's country (India: INR, elsewhere USD); changed in the header
  const currency = usePlanCurrency();
  const dual = plans.some((plan) => plan.prices && plan.prices.INR !== null && (plan.price ?? 0) > 0);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        size="2xl"
        title={title}
        description={
          <>
            {themeName ? (
              <>
                <strong className="text-heading">{themeName}</strong> is a premium theme.{" "}
              </>
            ) : null}
            {intro}
          </>
        }
        icon={
          <span className="grid size-12 shrink-0 place-items-center rounded-input bg-primary-soft text-primary">
            <Icon name="lock" size={22} />
          </span>
        }
        footer={
          <>
            <p className="mr-auto max-w-2xl text-caption text-muted">
              Secure payment; you come back to this page afterwards. Paid in the dashboard instead? Check again.
            </p>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <Icon name="refresh" size={15} /> I&apos;ve upgraded — check again
            </Button>
          </>
        }
      >
        {error ? (
          <Notice tone="error" role="alert" title="Plans could not be loaded">
            <p>{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setReload((n) => n + 1)}>
              <Icon name="refresh" size={14} /> Try again
            </Button>
          </Notice>
        ) : !data ? (
          <div className="grid grid-flow-col auto-cols-[minmax(15.5rem,1fr)] gap-5 overflow-hidden" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-plan bg-surface-muted" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Notice tone="info" title="No plans to show yet">
            Plans haven&apos;t been set up yet.{" "}
            <Link className="font-semibold underline" href="/contact">
              Contact us
            </Link>{" "}
            to unlock premium themes.
          </Notice>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
            {/* All plans side by side in one row (scrolls sideways when the window is narrow). */}
            <ul
              className={cn("grid snap-x auto-cols-[minmax(15.5rem,1fr)] grid-flow-col items-stretch gap-4", "pt-4")}
              aria-label="Plans"
            >
              {plans.map((plan, index) => {
                const style = planCardStyle(plan, plans, featureKey);
                const current = data.current?.code === plan.code;
                const cta = cn(planCtaBaseCompact, planCtaClass[style]);
                return (
                  <PricingPlanCard
                    key={plan.id}
                    compact
                    name={plan.name}
                    price={formatPlanPrice(plan, dual ? currency : "USD")}
                    period={planPriceIn(plan, dual ? currency : "USD") ? planPeriodLabel(plan) : undefined}
                    note={plan.trial_days > 0 && plan.price !== 0 ? `${plan.trial_days}-day free trial` : undefined}
                    features={planFeatureLines(plan, plans.slice(0, index))}
                    style={style}
                    badge={current ? "Current plan" : style === "popular" ? "Most popular" : undefined}
                    cta={
                      current ? (
                        <button type="button" className={cta} onClick={onRefresh}>
                          {currentLabel}
                        </button>
                      ) : !planIncludes(plan, featureKey) ? (
                        <button type="button" className={cta} onClick={onKeepFree}>
                          {keepFreeLabel}
                        </button>
                      ) : plan.trial_available && token ? (
                        // never paid and trial not used yet: try it free, or pay straight away
                        <TrialCta
                          token={token}
                          plan={plan}
                          ctaClass={cta}
                          buyClass={trialBuyClass(planCtaBaseCompact, style)}
                          onBuy={plan.purchasable ? () => setBuying(plan.code) : undefined}
                          onStarted={() => window.setTimeout(onRefresh, 900)}
                        />
                      ) : plan.purchasable && token ? (
                        // pay straight away (same purchase process as My plan in the dashboard)
                        <button type="button" className={cta} onClick={() => setBuying(plan.code)}>
                          Buy {plan.name} <Icon name="arrowRight" size={15} />
                        </button>
                      ) : plan.purchasable ? (
                        <a href={data.myPlanUrl} target="_blank" rel="noopener noreferrer" className={cta}>
                          Buy {plan.name} <Icon name="externalLink" size={15} />
                          <span className="sr-only"> (opens your dashboard in a new tab)</span>
                        </a>
                      ) : (
                        <Link href="/contact" className={cta}>
                          Contact us
                        </Link>
                      )
                    }
                  />
                );
              })}
            </ul>
          </div>
        )}
      </Dialog>
      <PlanCheckoutDialog open={buying !== null} token={token} planCode={buying} onClose={() => setBuying(null)} />
    </>
  );
}
