import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return NextResponse.json({ error: "Sign in before opening billing." }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "No primary email found for this user." }, { status: 400 });
  }

  const stripe = getStripe();
  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer =
    existing.data[0] ??
    (await stripe.customers.create({
      email,
      metadata: { clerkUserId: userId },
    }));

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${origin}/pricing`,
  });

  return NextResponse.json({ url: portal.url });
}
