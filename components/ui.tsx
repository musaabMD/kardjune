"use client";

import { Search } from "lucide-react";
import { C } from "@/lib/theme";

export function SearchBar({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
      <Search size={18} strokeWidth={3} color={C.hare} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm font-bold outline-none placeholder:font-bold" style={{ color: C.eel }} />
    </div>
  );
}

export function Primary({
  children, onClick, full, type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  full?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} className={`flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-black uppercase tracking-wide text-white outline-none transition-all duration-75 active:translate-y-0.5`} style={{ background: C.ink, boxShadow: `0 4px 0 ${C.inkDark}` }}>{children}</button>
  );
}
