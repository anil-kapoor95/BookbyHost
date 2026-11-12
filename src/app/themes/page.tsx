import { ThemesPage } from "@/components/marketing/ThemesPage";
import { getPublicThemes } from "@/lib/api/themes";
import { pageMetadata } from "@/lib/seo";

const description = "Colour themes for your booking page. Start with a free theme and switch any time.";

export const metadata = pageMetadata({ title: "Themes", description, path: "/themes" });

// The themes (and which plan unlocks them) come from the back office on each request.
export const instant = false;

export default async function Page() {
  const { themes, planNames } = await getPublicThemes();
  return <ThemesPage themes={themes} planNames={planNames} />;
}
