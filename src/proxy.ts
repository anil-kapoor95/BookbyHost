import { NextResponse, type NextRequest } from "next/server";
import { properties } from "@/data/properties";
import { SITE_HEADERS } from "@/lib/site-headers";

/**
 * 1. StayOwned website: a real 404 status for unknown example listings (/properties/<slug>), and the old
 *    property links /property/<slug>... redirected to the short link /<slug>...
 * 2. A host's own domain (www.myvilla.com, added in the back office: My company > Website address, and pointed to
 *    wherever this website is hosted): the domain shows only that host's pages.
 *      one property:  /  -> /<property>,  /book -> /<property>/book,  /book/confirmed -> /<property>/book/confirmed
 *      several:       /  -> /stays/<company>,  /<property>[/book[/confirmed]] as on the StayOwned website
 *    Local test: http://www.myvilla.com.localhost:3000 (*.localhost always opens this computer).
 */
const knownSlugs = new Set(properties.map((property) => property.slug));

const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
/** Extra request header with the visitor's country code (ISO alpha-2), set by your own proxy / CDN. */
const GEO_HEADER = (process.env.GEO_COUNTRY_HEADER ?? "").trim().toLowerCase();

/** First parts of the StayOwned website's own pages: never shown on a host's domain. */
const MARKETING = new Set([
  "about",
  "blog",
  "contact",
  "faq",
  "help",
  "how-it-works",
  "login",
  "pricing",
  "privacy",
  "properties",
  "property",
  "setup",
  "stays",
  "terms",
  "themes",
]);

/**
 * Hosts of the website itself: NEXT_PUBLIC_SITE_URL, SITE_HOSTS (comma separated, e.g. a staging host or the
 * hosting's own preview address) and localhost. "*.example.app" in SITE_HOSTS matches every subdomain of
 * example.app (preview deployments of any hosting: *.vercel.app, *.netlify.app, *.onrender.com …).
 */
const siteHostList = [process.env.NEXT_PUBLIC_SITE_URL, ...(process.env.SITE_HOSTS ?? "").split(",")];
const hostSuffixes = siteHostList
  .map((value) => (value ?? "").trim().toLowerCase())
  .filter((value) => value.startsWith("*."))
  .map((value) => value.slice(1)); // ".example.app"
const mainHosts = new Set(
  siteHostList
    .filter((value) => !(value ?? "").trim().startsWith("*."))
    .map((value) =>
      (value ?? "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/[/:].*$/, ""),
    )
    .filter(Boolean)
    .flatMap((h) => [h, h.startsWith("www.") ? h.slice(4) : `www.${h}`]),
);

function isMainHost(host: string) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    mainHosts.has(host) ||
    hostSuffixes.some((suffix) => host.endsWith(suffix))
  );
}

type Site = { company_slug: string; property_slug: string | null; domain: string };
const cache = new Map<string, { site: Site | null; until: number }>();

/** Company of a host's domain (cached: 60 s, unknown domains 30 s). */
async function resolveDomain(host: string): Promise<Site | null> {
  const hit = cache.get(host);
  if (hit && hit.until > Date.now()) return hit.site;
  let site: Site | null = null;
  if (API_URL) {
    try {
      const body = new FormData();
      body.append("host", host);
      const response = await fetch(`${API_URL}?action=pjActionResolveDomain`, {
        method: "POST",
        body,
        cache: "no-store",
      });
      const json = (await response.json()) as { status?: string; data?: Site };
      site = json.status === "OK" && json.data ? json.data : null;
    } catch {
      // back end not reachable: not cached, the next request asks again
      return null;
    }
  }
  if (cache.size > 500) cache.clear();
  cache.set(host, { site, until: Date.now() + (site ? 60_000 : 30_000) });
  return site;
}

/**
 * Country of the visitor's connection, when the hosting tells it (Cloudflare, CloudFront, Vercel, Netlify, a proxy
 * that sets x-country-code, or the header named in GEO_COUNTRY_HEADER): passed to the browser as the "so_geo"
 * cookie, the first guess of the country selector
 * (features/region/country.ts). Nothing is set when no header is there (local development: time zone is used).
 */
function withGeo(request: NextRequest, response: NextResponse) {
  const geo = [
    GEO_HEADER,
    "cf-ipcountry",
    "cloudfront-viewer-country",
    "x-vercel-ip-country",
    "x-nf-geo-country",
    "x-country-code",
  ]
    .filter(Boolean)
    .map((name) => (request.headers.get(name) ?? "").trim().toUpperCase())
    .find((value) => /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1");
  if (geo && request.cookies.get("so_geo")?.value !== geo) {
    response.cookies.set("so_geo", geo, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  }
  return response;
}

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/__not-found/site", request.url), { status: 404 });
}

export async function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase().replace(/:\d+$/, "");
  const path = request.nextUrl.pathname;

  if (isMainHost(host)) {
    // old links /property/<slug>[/book[/confirmed]]: the property is now at /<slug> (308 keeps shared links working)
    if (path.startsWith("/property/")) {
      const url = request.nextUrl.clone();
      url.pathname = path.slice("/property".length);
      return NextResponse.redirect(url, 308);
    }
    if (path.startsWith("/properties/")) {
      const slug = path.split("/")[2];
      if (slug && !knownSlugs.has(decodeURIComponent(slug))) return notFound(request);
    }
    // the domain headers come only from this proxy
    if (Object.values(SITE_HEADERS).some((name) => request.headers.has(name))) {
      const headers = new Headers(request.headers);
      for (const name of Object.values(SITE_HEADERS)) headers.delete(name);
      return withGeo(request, NextResponse.next({ request: { headers } }));
    }
    return withGeo(request, NextResponse.next());
  }

  // A host's own domain
  const site = await resolveDomain(host.endsWith(".localhost") ? host.slice(0, -".localhost".length) : host);
  if (!site) return notFound(request);

  const parts = path.split("/").filter(Boolean);
  const single = site.property_slug;
  let target: string | null = null;

  if (single) {
    // the property is the home page; its own link redirects there
    if (parts[0] === single) {
      const url = request.nextUrl.clone();
      url.pathname = `/${parts.slice(1).join("/")}`;
      return NextResponse.redirect(url, 308);
    }
    const rest = parts.join("/");
    if (rest === "" || rest === "book" || rest === "book/confirmed") target = `/${single}${rest ? `/${rest}` : ""}`;
  } else if (parts.length === 0) {
    target = `/stays/${site.company_slug}`;
  } else if (!MARKETING.has(parts[0]) && /^[a-z0-9-]{1,60}$/.test(parts[0])) {
    const rest = parts.slice(1).join("/");
    if (rest === "" || rest === "book" || rest === "book/confirmed") target = `/${parts.join("/")}`;
  }
  if (!target) return notFound(request);

  const headers = new Headers(request.headers);
  headers.set(SITE_HEADERS.domain, site.domain);
  headers.set(SITE_HEADERS.company, site.company_slug);
  headers.set(SITE_HEADERS.single, single ?? "");
  const url = request.nextUrl.clone();
  url.pathname = target;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // pages only (no Next.js files, API routes or files with an extension)
  matcher: ["/((?!_next/|api/|.*\\.[a-z0-9]+$).*)"],
};
