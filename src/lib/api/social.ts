import { cacheLife } from "next/cache";
import { API_URL } from "./client";

export type SocialNetwork = "instagram" | "facebook" | "linkedin" | "x" | "youtube";
export type SocialLink = { network: SocialNetwork; url: string };

/**
 * Social links of the website (back office: System Options > Visual & Branding, administrators only).
 * Cached for a few minutes, so pages using them (the footer is on every page) stay fast. [] when none / unreachable.
 */
export async function getSocialLinks(): Promise<SocialLink[]> {
  "use cache";
  cacheLife("minutes");
  if (!API_URL) return [];
  try {
    const response = await fetch(`${API_URL}?action=pjActionGetSocialLinks`, { method: "POST", body: new FormData() });
    if (!response.ok) return [];
    const json = (await response.json()) as { status?: string; data?: { links?: SocialLink[] } };
    return json.status === "OK" && Array.isArray(json.data?.links) ? json.data.links : [];
  } catch {
    return [];
  }
}
