"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ensureSignupLoaded, useSignupSession } from "@/features/onboarding/signup-session";
import { billingApi, safeReturnPath, type PlanPaymentStatus } from "@/lib/api/billing";
import { PlanCheckoutDialog } from "./PlanCheckoutDialog";

/**
 * Back from the payment provider: shows the result of the plan payment as the server knows it. The gateway confirms
 * the payment server to server, which can take a few seconds, so a pending payment is checked again for a while.
 * The browser redirect itself never switches a plan on.
 */
export function PaymentReturn() {
  const params = useSearchParams();
  const txn = params.get("txn") ?? "";
  const next = safeReturnPath(params.get("next"));
  const { token, phase } = useSignupSession();
  const [status, setStatus] = useState<PlanPaymentStatus | null>(null);
  const [error, setError] = useState<string>();
  const [checks, setChecks] = useState(0);
  const [retryOpen, setRetryOpen] = useState(false);

  useEffect(() => {
    void ensureSignupLoaded();
  }, []);

  // problems known without asking the server
  const validTxn = /^[a-f0-9]{32}$/.test(txn);
  const localError =
    phase === "ready" && !token
      ? "Please log in to see your payment."
      : !validTxn
        ? "This payment link is not valid."
        : undefined;

  useEffect(() => {
    if (phase !== "ready" || !token || !validTxn) return;
    let active = true;
    void billingApi.status(token, txn).then((result) => {
      if (!active) return;
      if (result.ok) {
        setStatus(result.data);
        setError(undefined);
      } else {
        setError(result.message);
      }
    });
    return () => {
      active = false;
    };
  }, [phase, token, txn, validTxn, checks]);

  // a payment the gateway has not confirmed yet: check again (every 3 s, for about 20 seconds)
  useEffect(() => {
    if (!status || status.status !== "pending" || !status.online || checks >= 6) return;
    const timer = window.setTimeout(() => setChecks((n) => n + 1), 3000);
    return () => window.clearTimeout(timer);
  }, [status, checks]);

  const waiting = status?.status === "pending" && status.online && checks < 6;

  return (
    <section className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8 text-center shadow-popover">
        {localError || error ? (
          <>
            <Notice tone="error" role="alert" title="We couldn't load your payment">
              <p>{localError ?? error}</p>
            </Notice>
            <div className="mt-6 flex justify-center gap-3">
              <Button href="/login" variant="outline">
                Log in
              </Button>
              <Button href={next}>Continue</Button>
            </div>
          </>
        ) : !status || waiting ? (
          <div role="status" aria-live="polite">
            <span
              className="mx-auto mb-4 block size-10 animate-spin rounded-pill border-4 border-divider border-t-primary"
              aria-hidden="true"
            />
            <h1 className="font-heading text-title text-heading">Confirming your payment…</h1>
            <p className="mt-2 text-body">This only takes a few seconds. Please don&apos;t close this page.</p>
          </div>
        ) : status.status === "paid" ? (
          <div role="status">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-success-soft text-success">
              <Icon name="check" size={28} />
            </span>
            <h1 className="font-heading text-title text-heading">Payment successful</h1>
            <p className="mt-2 text-body">
              {status.plan?.name} is active
              {status.period_end ? ` until ${formatDate(status.period_end)}` : ""}. You paid {status.amount_text}
              {status.method ? ` with ${status.method}` : ""}.
            </p>
            <div className="mt-6 flex justify-center">
              <Button href={next}>
                Continue <Icon name="arrowRight" size={16} />
              </Button>
            </div>
          </div>
        ) : status.status === "pending" ? (
          <div role="status">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-primary-soft text-primary">
              <Icon name="clock" size={26} />
            </span>
            <h1 className="font-heading text-title text-heading">Payment not completed yet</h1>
            <p className="mt-2 text-body">
              {status.online
                ? "We haven't received a confirmation from the payment provider. If you finished the payment, check again in a moment; otherwise you can pay now."
                : "Your payment request has been sent. We will contact you to complete it."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {status.online ? (
                <>
                  <Button variant="outline" onClick={() => setChecks(0)}>
                    <Icon name="refresh" size={15} /> Check again
                  </Button>
                  <Button onClick={() => setRetryOpen(true)}>Pay now</Button>
                </>
              ) : (
                <Button href={next}>Continue</Button>
              )}
            </div>
          </div>
        ) : (
          <div role="alert">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-pill bg-error-soft text-error">
              <Icon name="x" size={26} />
            </span>
            <h1 className="font-heading text-title text-heading">
              {status.status === "cancelled" ? "Payment cancelled" : "Payment failed"}
            </h1>
            <p className="mt-2 text-body">
              Nothing was charged and your plan has not changed.
              {status.failure_reason ? ` (${status.failure_reason})` : ""}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" href={next}>
                Not now
              </Button>
              <Button onClick={() => setRetryOpen(true)}>Try again</Button>
            </div>
          </div>
        )}
        <p className="mt-6 text-caption text-muted">
          Questions about a payment?{" "}
          <Link href="/contact" className="underline">
            Contact us
          </Link>
        </p>
      </div>
      <PlanCheckoutDialog
        open={retryOpen}
        token={token}
        planCode={status?.plan?.code ?? null}
        returnPath={next}
        onClose={() => setRetryOpen(false)}
      />
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
