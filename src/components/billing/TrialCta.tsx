"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { billingApi } from "@/lib/api/billing";
import type { ApiPlan } from "@/lib/api/signup";
import { cn } from "@/lib/utils";
import type { PlanCardStyle } from "@/components/marketing/PricingPlanCard";

/** "Buy" next to the trial button: a quieter outline button that suits the card style. */
export function trialBuyClass(base: string, style: PlanCardStyle): string {
  return cn(
    base,
    "w-auto px-4",
    style === "dark"
      ? "border border-white/40 bg-transparent text-white hover:bg-white/10"
      : "border border-border bg-surface text-heading hover:border-border-strong",
  );
}

/**
 * "Start 14-day free trial" (no payment) with a smaller "Buy" next to it, for a logged-in host who may still try the
 * plan (plan.trial_available: once per company, before a first payment). Same height as one plan button, so the
 * plan cards keep their size.
 */
export function TrialCta({
  token,
  plan,
  ctaClass,
  buyClass,
  onBuy,
  onStarted,
}: {
  token: string;
  plan: ApiPlan;
  /** Classes of the main button (planCtaBase / planCtaBaseCompact + planCtaClass[style]). */
  ctaClass: string;
  /** Classes of the "Buy" button (trialBuyClass). */
  buyClass: string;
  /** Pay for the plan straight away instead (checkout window). */
  onBuy?: () => void;
  /** The trial has started (reload the page / the plan state). */
  onStarted: (endsAt: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [started, setStarted] = useState(false);

  async function start() {
    if (busy || started) return;
    setBusy(true);
    setError(undefined);
    const result = await billingApi.startTrial(token, plan.code);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStarted(true);
    onStarted(result.data.trial_ends_at);
  }

  return (
    <div>
      <div className={cn("grid gap-2", onBuy ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-1")}>
        <button type="button" className={ctaClass} onClick={start} disabled={busy || started} aria-busy={busy}>
          {started ? (
            <>
              <Icon name="check" size={15} /> Trial started
            </>
          ) : busy ? (
            "Starting…"
          ) : (
            <>Start {plan.trial_days}-day free trial</>
          )}
        </button>
        {onBuy ? (
          <button type="button" className={buyClass} onClick={onBuy} disabled={busy || started}>
            Buy
          </button>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {started ? `Your ${plan.trial_days}-day ${plan.name} trial has started.` : ""}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-caption font-semibold text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
