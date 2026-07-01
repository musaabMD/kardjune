import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const HQ_HOST = "hq.drkard.com";
const LST_HOST = "lst.drkard.com";
const HOST_PASSTHROUGH_PREFIXES = ["/api", "/sign-in", "/sign-up", "/__clerk", "/_next"];
const HQ_ROBOTS = "noindex, nofollow, noarchive";
const HOST_ROUTES: Record<string, string> = {
  [HQ_HOST]: "/hq",
  [LST_HOST]: "/lst",
};

// Keep this as middleware.ts for Cloudflare/OpenNext: Next 16 proxy.ts runs on
// Node.js, while Cloudflare Workers only supports Edge middleware today.
export default clerkMiddleware((_auth, req) => {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();
  const pathname = req.nextUrl.pathname;
  const hostRoute = host ? HOST_ROUTES[host] : undefined;

  if (
    hostRoute &&
    pathname !== hostRoute &&
    !pathname.startsWith(`${hostRoute}/`) &&
    !HOST_PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? hostRoute : `${hostRoute}${pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("X-Robots-Tag", HQ_ROBOTS);
    return response;
  }

  if (hostRoute || pathname.startsWith("/hq") || pathname.startsWith("/lst")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", HQ_ROBOTS);
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes.
    "/__clerk/(.*)",
  ],
};
