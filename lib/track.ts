"use client";

import { ACTIVE_GOAL_NAMES } from "@/lib/hq-goals";

export function trackGoal(name: string, metadata?: Record<string, unknown>) {
  if (!ACTIVE_GOAL_NAMES.has(name)) return;
  const payload = JSON.stringify({
    name,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    metadata,
  });

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
    return;
  }

  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
