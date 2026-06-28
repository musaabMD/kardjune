import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
  });
  return stripeClient;
}

export function getStripePriceId(lookupKey: string) {
  if (lookupKey === "monthly") return process.env.STRIPE_PRICE_MONTHLY_ID;
  if (lookupKey === "annual") return process.env.STRIPE_PRICE_ANNUAL_ID;
  return null;
}
