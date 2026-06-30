import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const HQ_HOST = "hq.drkard.com";
const HQ_PASSTHROUGH_PREFIXES = ["/hq", "/api", "/sign-in", "/sign-up", "/__clerk", "/_next"];
const HQ_ROBOTS = "noindex, nofollow, noarchive";

// Keep this as middleware.ts for Cloudflare/OpenNext: Next 16 proxy.ts runs on
// Node.js, while Cloudflare Workers only supports Edge middleware today.
export default clerkMiddleware((_auth, req) => {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase();
  const pathname = req.nextUrl.pathname;

  if (host === HQ_HOST && !HQ_PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/hq" : `/hq${pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("X-Robots-Tag", HQ_ROBOTS);
    return response;
  }

  if (host === HQ_HOST || pathname.startsWith("/hq")) {
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
