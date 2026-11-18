import { Suspense } from "react";
import { PaymentReturn } from "@/features/billing/PaymentReturn";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Payment",
  description: "Result of your plan payment.",
  path: "/billing/return",
  noindex: true,
});

/** Back from Razorpay / Stripe after paying for a plan (pjSubscriptionBilling::returnUrl). */
export default function Page() {
  return (
    <Suspense>
      <PaymentReturn />
    </Suspense>
  );
}
