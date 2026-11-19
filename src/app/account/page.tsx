import type { Metadata } from "next";
import { AccountPage } from "@/features/account/AccountPage";

export const metadata: Metadata = {
  title: "My profile",
  description: "Your BookbyHost account, company and plan.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AccountPage />;
}
