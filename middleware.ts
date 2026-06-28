import { clerkMiddleware } from "@clerk/nextjs/server";

// Keep this as middleware.ts for Cloudflare/OpenNext: Next 16 proxy.ts runs on
// Node.js, while Cloudflare Workers only supports Edge middleware today.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes.
    "/__clerk/(.*)",
  ],
};
