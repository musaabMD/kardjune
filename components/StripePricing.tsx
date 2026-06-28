"use client";

import { useState } from "react";
import { Check, Crown, Loader2, Minus } from "lucide-react";
import { BrandLockup } from "@/components/AppLogo";

const FEATURES = [
  { label: "Qbank access", free: true, pro: true },
  { label: "Daily practice", free: true, pro: true },
  { label: "Unlimited questions", free: false, pro: true },
  { label: "AI assistant", free: false, pro: true },
  { label: "Review & mock exams", free: false, pro: true },
  { label: "Unlimited uploads", free: false, pro: true },
] as const;

export function StripePricing({
  isAuthenticated,
  isPro,
  onManageBilling,
  onDismiss,
}: {
  isAuthenticated: boolean;
  isPro?: boolean;
  onManageBilling?: () => void;
  onDismiss?: () => void;
}) {
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupKey = billing === "annual" ? "annual" : "monthly";
  const price = billing === "annual" ? "$120/yr" : "$25/mo";

  async function startCheckout() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lookupKey }),
    });
    const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setLoading(false);
    if (!res.ok || !payload.url) {
      setError(payload.error ?? "Checkout unavailable.");
      return;
    }
    window.location.assign(payload.url);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center">
      <BrandLockup theme="dark" size="lg" />
      <h1 className="mt-6 text-center text-2xl font-black leading-tight text-white md:text-[1.75rem]">
        Progress faster in your exam prep with Pro
      </h1>

      <div
        className="mt-8 w-full overflow-hidden rounded-3xl"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <div className="grid grid-cols-[1fr_72px_72px] items-end gap-x-2 px-4 pb-3 pt-5 md:grid-cols-[1fr_88px_88px] md:gap-x-3 md:px-6">
          <span />
          <span className="text-center text-xs font-black uppercase tracking-wide text-white/50">Free</span>
          <span className="flex flex-col items-center gap-1">
            <span
              className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black uppercase tracking-wide"
              style={{ background: "linear-gradient(135deg, #247C74, #165C55)", color: "#fff" }}
            >
              <Crown size={12} strokeWidth={3} />
              Pro
            </span>
          </span>
        </div>

        <div className="divide-y divide-white/10">
          {FEATURES.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[1fr_72px_72px] items-center gap-x-2 px-4 py-3.5 md:grid-cols-[1fr_88px_88px] md:gap-x-3 md:px-6"
            >
              <span className="text-sm font-bold text-white/90 md:text-base">{row.label}</span>
              <Cell included={row.free} />
              <Cell included={row.pro} highlight />
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-[1fr_72px_72px] items-center gap-x-2 border-t border-white/10 px-4 py-3 md:grid-cols-[1fr_88px_88px] md:gap-x-3 md:px-6"
        >
          <span className="text-xs font-bold text-white/40">Free plan: 20 questions / 24 h</span>
          <span />
          <span className="text-center text-[10px] font-bold leading-tight text-teal-300/80">
            Unlimited
          </span>
        </div>
      </div>

      {!isPro && (
        <div className="mt-6 flex rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.1)" }}>
          {(["annual", "monthly"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBilling(id)}
              className="rounded-xl px-4 py-2 text-sm font-black transition-colors"
              style={
                billing === id
                  ? { background: "#fff", color: "#1C1C1E" }
                  : { color: "rgba(255,255,255,0.6)" }
              }
            >
              {id === "annual" ? "Annual · $120" : "Monthly · $25"}
            </button>
          ))}
        </div>
      )}

      {isPro ? (
        <button
          type="button"
          onClick={onManageBilling}
          className="mt-8 w-full rounded-2xl py-4 text-base font-black uppercase tracking-wide active:translate-y-0.5"
          style={{ background: "#fff", color: "#1C1C1E" }}
        >
          Manage subscription
        </button>
      ) : (
        <button
          type="button"
          disabled={!isAuthenticated || loading}
          onClick={() => void startCheckout()}
          className="mt-8 w-full rounded-2xl py-4 text-base font-black uppercase tracking-wide active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "#fff", color: "#1C1C1E" }}
        >
          {loading ? (
            <Loader2 size={22} className="mx-auto animate-spin" />
          ) : isAuthenticated ? (
            `Get Pro · ${price}`
          ) : (
            "Sign in to upgrade"
          )}
        </button>
      )}

      {error && <p className="mt-3 text-center text-sm font-bold text-red-300">{error}</p>}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 text-sm font-black uppercase tracking-wide text-white/45 transition-colors hover:text-white/70"
        >
          No thanks
        </button>
      )}
    </div>
  );
}

function Cell({ included, highlight }: { included: boolean; highlight?: boolean }) {
  return (
    <span
      className="flex justify-center"
      style={highlight ? { background: "rgba(36,124,116,0.15)", borderRadius: 8, padding: "4px 0" } : undefined}
    >
      {included ? (
        <Check size={22} strokeWidth={3} color="#2E9E5B" />
      ) : (
        <Minus size={22} strokeWidth={3} color="rgba(255,255,255,0.25)" />
      )}
    </span>
  );
}
