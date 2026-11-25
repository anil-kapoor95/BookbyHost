import { NextResponse } from "next/server";

/**
 * "Is this the BookbyHost website?" The back office asks this on a host's own domain (My company > Your own domain >
 * Check) to see whether the domain reaches this website, also when a proxy / CDN (Cloudflare …) hides the server's
 * address. Works on any hosting; it returns nothing private.
 */
export function GET(request: Request) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .toLowerCase()
    .replace(/:\d+$/, "");
  return NextResponse.json(
    { app: "bookbyhost", host },
    { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  );
}
