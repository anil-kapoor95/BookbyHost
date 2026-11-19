import { HomePage } from "@/components/marketing/HomePage";
import { getPublicPlans } from "@/lib/api/plans";
import { getPublicThemes } from "@/lib/api/themes";
import { pageMetadata } from "@/lib/seo";

const title = "BookbyHost — your own direct booking website";
const description =
  "Get your own booking page in 5 minutes. Add your property, AI writes the rest, and guests book and pay you directly with 0% commission.";

export const metadata = { ...pageMetadata({ title, description, path: "/" }), title: { absolute: title } };

// The themes and pricing sections show the back office's themes and plans (fresh on each request).
export const instant = false;

export default async function Page() {
  const [plans, { themes, planNames }] = await Promise.all([getPublicPlans(), getPublicThemes()]);
  return <HomePage plans={plans} themes={themes} themePlans={planNames} />;
}
