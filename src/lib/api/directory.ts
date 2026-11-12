import type { PriceFormat } from "@/lib/price-format";
import type { PropertyQuery } from "@/types/property";
import { API_URL } from "./client";

/** A published property of a host (pjActionGetDirectory). */
export interface DirectoryStay {
  slug: string;
  name: string;
  property_type: string | null;
  headline: string | null;
  location: { city: string; state: string; country: string };
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  price: number | null;
  price_varies: boolean;
  price_based_on: "nights" | "days";
  currency: string;
  currency_sign: string;
  price_format: PriceFormat;
  photo: string | null;
  host: { name: string; slug: string };
}

export interface DirectoryPage {
  items: DirectoryStay[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export const DIRECTORY_PAGE_SIZE = 9;

/**
 * Real properties of the hosts for /properties, filtered, sorted and paged by the back office (fresh on each
 * request). null when the API can't be reached.
 */
export async function getDirectory(query: PropertyQuery): Promise<DirectoryPage | null> {
  if (!API_URL) return null;
  const body = new FormData();
  if (query.search) body.append("q", query.search);
  if (query.type) body.append("type", query.type);
  if (query.guests) body.append("guests", String(query.guests));
  if (query.sort) body.append("sort", query.sort);
  body.append("page", String(query.page ?? 1));
  body.append("per_page", String(DIRECTORY_PAGE_SIZE));
  try {
    const response = await fetch(`${API_URL}?action=pjActionGetDirectory`, { method: "POST", body, cache: "no-store" });
    if (!response.ok) return null;
    const json = (await response.json()) as { status?: string; data?: DirectoryPage };
    return json.status === "OK" && json.data ? json.data : null;
  } catch {
    return null;
  }
}
