"use client";

export function trackGoal(name: string, metadata?: Record<string, unknown>) {
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
