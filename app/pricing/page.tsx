import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Crown } from "lucide-react";
import { BrandLockup } from "@/components/AppLogo";
import { StripePricing } from "@/components/StripePricing";

export default async function PricingPage() {
  const { isAuthenticated } = await auth();

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12"
      style={{ background: "linear-gradient(145deg, #0F3D38 0%, #172554 55%, #312E81 100%)" }}
    >
      <Link href="/" className="absolute left-5 top-5 outline-none">
        <BrandLockup theme="dark" size="sm" />
      </Link>

      <div className="absolute right-5 top-5 flex items-center gap-2 opacity-80">
        <Crown size={18} strokeWidth={3} color="#FFC800" />
        <span className="text-sm font-black uppercase tracking-wide text-white/70">Pro</span>
      </div>

      <StripePricing isAuthenticated={isAuthenticated} />
    </main>
  );
}
