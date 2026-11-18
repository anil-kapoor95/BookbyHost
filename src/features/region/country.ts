"use client";

import { useSyncExternalStore } from "react";
import { PHONE_COUNTRIES } from "@/data/phone-countries";
import { flagEmoji } from "@/lib/phone";
import type { PlanCurrency } from "@/lib/plan-display";

/**
 * The visitor's country, used across the website for plan prices, checkout and billing:
 * India pays in Indian rupees (INR ₹), every other country in US dollars (USD $) — the same rule as the back office
 * (Subscriptions > Settings > country currencies).
 *
 * First visit: detected (country of the visitor's connection when the hosting gives it — Vercel / Cloudflare /
 * CloudFront, see proxy.ts — else the browser's time zone, else its language). The visitor can change it at any
 * time (country selector in the header, on the plans and in the checkout); the choice is saved in this browser
 * (localStorage + a cookie) and used everywhere, in every tab.
 */

export interface Country {
  /** ISO 3166-1 alpha-2, e.g. "IN" */
  code: string;
  name: string;
  flag: string;
}

export interface CountryState {
  country: Country;
  currency: PlanCurrency;
  /** detected: guessed on this visit · manual: chosen by the visitor */
  source: "detected" | "manual";
}

const STORAGE_KEY = "stayowned.country";
const COOKIE = "so_country";
/** Set by proxy.ts from the hosting's geo headers. */
const GEO_COOKIE = "so_geo";
/** Old India / International toggle (replaced by the country). */
const LEGACY_KEY = "stayowned.planCurrency";

/** Every country, by name (from the phone country list: same names and flags as the phone fields). */
export const COUNTRIES: Country[] = PHONE_COUNTRIES.map((c) => ({
  code: c.code,
  name: c.name,
  flag: flagEmoji(c.code),
})).sort((a, b) => a.name.localeCompare(b.name));
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string | null | undefined): Country | null {
  return code ? (BY_CODE.get(code.toUpperCase()) ?? null) : null;
}

/** India = INR, every other country = USD. */
export function currencyForCountry(code: string | null | undefined): PlanCurrency {
  return (code ?? "").toUpperCase() === "IN" ? "INR" : "USD";
}

export function currencyLabel(currency: PlanCurrency): string {
  return currency === "INR" ? "₹ INR" : "$ USD";
}

/** Time zones of countries people often reach the site from (the rest falls back to the browser language). */
const TIME_ZONES: Record<string, string> = {
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Singapore": "SG",
  "Asia/Kathmandu": "NP",
  "Asia/Katmandu": "NP",
  "Asia/Colombo": "LK",
  "Asia/Dhaka": "BD",
  "Asia/Karachi": "PK",
  "Asia/Bangkok": "TH",
  "Asia/Tokyo": "JP",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Jakarta": "ID",
  "Asia/Manila": "PH",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Seoul": "KR",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Lisbon": "PT",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Athens": "GR",
  "Europe/Istanbul": "TR",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Australia/Brisbane": "AU",
  "Pacific/Auckland": "NZ",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
  "Africa/Johannesburg": "ZA",
  "Africa/Nairobi": "KE",
  "Africa/Lagos": "NG",
};

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/** Best guess of the visitor's country (never asks the visitor or a third party). */
export function detectCountry(): string {
  const geo = findCountry(readCookie(GEO_COOKIE));
  if (geo) return geo.code;
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && TIME_ZONES[zone]) return TIME_ZONES[zone];
    if (zone?.startsWith("America/")) return "US";
  } catch {
    // no Intl: use the language
  }
  for (const language of typeof navigator !== "undefined" ? (navigator.languages ?? [navigator.language]) : []) {
    const region = /^[a-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(language ?? "")?.[1];
    if (region && findCountry(region)) return region.toUpperCase();
  }
  return "US";
}

type Saved = { code: string; source: "detected" | "manual" };

function readSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      if (findCountry(parsed.code))
        return { code: parsed.code!.toUpperCase(), source: parsed.source === "manual" ? "manual" : "detected" };
    }
  } catch {
    // storage blocked or broken value: detect again
  }
  const cookie = findCountry(readCookie(COOKIE));
  return cookie ? { code: cookie.code, source: "manual" } : null;
}

function write(saved: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // private mode: kept for this page only
  }
  try {
    document.cookie = `${COOKIE}=${saved.code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    // cookies blocked
  }
}

const listeners = new Set<() => void>();
let current: CountryState | null = null;

function toState(saved: Saved): CountryState {
  const country = findCountry(saved.code) ?? findCountry("US")!;
  return { country, currency: currencyForCountry(country.code), source: saved.source };
}

function load(): CountryState {
  if (current) return current;
  let saved = readSaved();
  if (!saved) {
    saved = { code: detectCountry(), source: "detected" };
    write(saved);
  }
  current = toState(saved);
  return current;
}

/** Server render / first paint before the browser is known: USD, like most visitors. */
const SERVER_STATE: CountryState = {
  country: { code: "US", name: "United States", flag: flagEmoji("US") },
  currency: "USD",
  source: "detected",
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      current = null;
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The visitor's country and currency (same everywhere on the site, updates live). */
export function useCountry(): CountryState {
  return useSyncExternalStore(subscribe, load, () => SERVER_STATE);
}

/** Changes the country (and so the currency) on every page and tab. */
export function setCountry(code: string) {
  const country = findCountry(code);
  if (!country) return;
  const saved: Saved = { code: country.code, source: "manual" };
  write(saved);
  current = toState(saved);
  listeners.forEach((l) => l());
}

/** Plan currency of the visitor's country (INR for India, else USD). */
export function usePlanCurrency(): PlanCurrency {
  return useCountry().currency;
}
