"use client";

import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { StripePricing } from "@/components/StripePricing";

export function PricingModal({
  onClose,
  isAuthenticated,
  isPro,
}: {
  onClose: () => void;
  isAuthenticated: boolean;
  isPro?: boolean;
}) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  async function openPortal() {
    setPortalError("");
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPortalError(data.error ?? "Could not open billing portal.");
        return;
      }
      window.location.assign(data.url);
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto px-5 py-10"
      style={{ background: "linear-gradient(145deg, #0F3D38 0%, #172554 55%, #312E81 100%)" }}
    >
      <div className="absolute right-5 top-5 flex items-center gap-2 opacity-80">
        <Crown size={18} strokeWidth={3} color="#FFC800" />
        <span className="text-sm font-black uppercase tracking-wide text-white/70">Pro</span>
      </div>

      <StripePricing
        isAuthenticated={isAuthenticated}
        isPro={isPro}
        onManageBilling={() => void openPortal()}
        onDismiss={onClose}
      />

      {portalLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm font-bold text-white/50">
          <Loader2 size={16} className="animate-spin" />
          Opening billing…
        </div>
      )}
      {portalError && <p className="mt-3 text-center text-sm font-bold text-red-300">{portalError}</p>}
    </div>
  );
}
