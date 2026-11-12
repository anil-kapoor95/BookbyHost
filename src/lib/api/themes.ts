import { API_URL } from "./client";
import type { ApiTheme } from "./signup";

export type PublicThemes = {
  themes: ApiTheme[];
  /** Plans that unlock the paid themes ("Pro or Business · AI"), "" when none. */
  planNames: string;
};

/**
 * Themes for the Themes page: every colour theme of the back office (pjActionGetThemes), loaded on the
 * server on each request. No themes when the API can't be reached.
 */
export async function getPublicThemes(): Promise<PublicThemes> {
  const empty: PublicThemes = { themes: [], planNames: "" };
  if (!API_URL) return empty;
  try {
    const response = await fetch(`${API_URL}?action=pjActionGetThemes`, { method: "POST", body: new FormData(), cache: "no-store" });
    if (!response.ok) return empty;
    const json = (await response.json()) as { status?: string; data?: { themes?: ApiTheme[]; plan_names?: string } };
    if (json.status !== "OK" || !Array.isArray(json.data?.themes)) return empty;
    return { themes: json.data.themes, planNames: json.data.plan_names ?? "" };
  } catch {
    return empty;
  }
}
