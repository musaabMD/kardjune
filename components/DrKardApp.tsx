"use client";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react/no-unescaped-entities, @next/next/no-img-element */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Search, Crown, GraduationCap, LayoutGrid, UploadCloud, FileText, Trash2,
  Sparkles, Link as LinkIcon, Type, Check, ArrowLeft, ChevronRight, ChevronLeft,
  Plus, Star, X, BookOpen, RefreshCw, BarChart3, Flag, RotateCcw, Send, Loader2,
  Zap, TrendingUp, Target, Clock, SlidersHorizontal, StickyNote, Layers,
  Trophy, Play, Bookmark, MessageCircle, RotateCw, Eye, ExternalLink,
  Image as ImageIcon, Flame, Stethoscope, Scale, Cpu, Briefcase, Languages,
  FlaskConical, Landmark, Calculator, PenTool, Globe, Copy, Share2,
} from "lucide-react";
import { SignInButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { PricingModal } from "@/components/PricingModal";
import {
  apiReply,
  chatFailureMessage,
  kindLabel,
  parseAiThreadId,
  postChat,
  type AIThreadItem,
  type Msg,
} from "@/lib/ai-threads";
import {
  DEFAULT_EXAM_TAB,
  findExamBySlug,
  pathFromState,
  stateFromPath,
} from "@/lib/app-routes";
import { trackGoal } from "@/lib/track";

type Id<T extends string> = string;
type CloudQuestion = {
  _id: string;
  examId: string;
  subject: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  tags: string[];
};
type Entitlements = {
  isPro?: boolean;
  aiAllowed?: boolean;
  questionsRemaining?: number | null;
  aiUsedUsd?: number | null;
  aiBudgetUsd?: number | null;
  aiRemainingUsd?: number | null;
};
type ExamState = {
  sessions: Array<{ id: string; _creationTime: number; title: string; total: number; correct: number; durationSec: number }>;
  progress: Array<{ questionId: string; status: string; flagged: boolean; lastSelected: number; attempts: number }>;
  threads: Array<{ _id: string; kind: string; title: string; messageCount?: number; lastMessageAt?: number }>;
  messages: Array<{ threadId: string; role: string; content: string }>;
};
const EMPTY_EXAM_STATE: ExamState = { sessions: [], progress: [], threads: [], messages: [] };

/** DrKard — full app (Duolingo-shape, ink/black accent, mobile-first). */

const C = {
  ink: "#1F2A37", inkDark: "#111827", inkWash: "#E7EAEE",
  teal: "#247C74", tealDark: "#165C55", tealWash: "#E3F3F1",
  blue: "#3B6B88", blueDark: "#284C63", blueWash: "#E6F0F5",
  green: "#2E9E5B", greenWash: "#E3F5EA",
  red: "#E5484D", redWash: "#FCE9EA", redDark: "#C23A3E",
  amber: "#E8A33D", amberWash: "#FBF0DD",
  gold: "#FFC800", goldDark: "#E0AC00",
  purple: "#7C3AED", purpleWash: "#EADCFB", purpleBtn: "#D8B4FE", purpleBtnDark: "#B68AE8",
  eel: "#1C1C1E", wolf: "#6B6B6B", hare: "#A0A0A0",
  swan: "#E3E3E3", polar: "#F6F6F6", white: "#FFFFFF",
  cream: "#F6F6F6", creamLine: "#E6E6E6",
};
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function displayFirstName(user: { firstName?: string | null; fullName?: string | null; username?: string | null; primaryEmailAddress?: { emailAddress: string } | null } | null | undefined) {
  if (!user) return "there";
  const first = user.firstName?.trim();
  if (first) return first;
  const full = user.fullName?.trim();
  if (full) return full.split(/\s+/)[0] ?? "there";
  const username = user.username?.trim();
  if (username) return username;
  const email = user.primaryEmailAddress?.emailAddress;
  if (email) return email.split("@")[0] ?? "there";
  return "there";
}
function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", emoji: "🌅" };
  if (hour < 17) return { text: "Good afternoon", emoji: "👋" };
  if (hour < 21) return { text: "Good evening", emoji: "🌙" };
  return { text: "Good night", emoji: "✨" };
}

function examColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360; return { color: `hsl(${h} 45% 38%)`, wash: `hsl(${h} 45% 95%)` }; }
/* Curated accent palette — one consistent set of solid icon colors (no gradients), reused across all list tabs. */
const ACCENTS = ["#247C74", "#3B6B88", "#E5484D", "#2E9E5B", "#E8A33D", "#7C3AED", "#1F2A37"];
const TILE_COLORS = ["#5F6F52", "#8A6F56", "#2D8C80", "#586A8C", "#8A5F76", "#6F6A55", "#3F7F5F", "#7A5F8A", "#4F7D8F", "#8A6A3F", "#5C728A", "#80635E"];
const tileColor = (index: number) => TILE_COLORS[index % TILE_COLORS.length];
const SPOTIFY_COLORS = ["#e8115b", "#006450", "#0d72ea", "#1e3264", "#8400e7", "#148a08", "#e91429", "#608108", "#d84000", "#27856a", "#503750", "#477d95", "#a56752", "#ba5d07", "#509bf5", "#7358ff"];
const examCardIcon = (exam: ExamItem, index: number) => {
  const hay = `${exam.title} ${exam.role}`.toLowerCase();
  if (hay.includes("dent")) return Stethoscope;
  if (hay.includes("lab") || hay.includes("path") || hay.includes("pharm")) return FlaskConical;
  if (hay.includes("physician") || hay.includes("medicine") || hay.includes("medical")) return Stethoscope;
  if (hay.includes("nurs")) return BookOpen;
  if (hay.includes("law") || hay.includes("bar")) return Scale;
  if (hay.includes("business") || hay.includes("management")) return Briefcase;
  if (hay.includes("english") || hay.includes("language")) return Languages;
  if (hay.includes("engineer")) return Cpu;
  if (hay.includes("math")) return Calculator;
  if (hay.includes("government")) return Landmark;
  return [GraduationCap, BookOpen, PenTool, Globe][index % 4];
};
const initials = (value: string) => {
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
};

const MODES = [
  { t: "Question of the Day", d: "The quickest way to do a little studying every day.", icon: Sparkles, dur: 0, n: 1 },
  { t: "Quick 10 Quiz", d: "10 questions randomly selected from the question bank.", icon: Zap, dur: 0, n: 10 },
  { t: "Missed Questions Quiz", d: "Retake questions you've missed and improve your score.", icon: RotateCcw, dur: 0, n: 10 },
  { t: "Level Up Quiz", d: "Gamify your learning with progressively harder quizzes.", icon: TrendingUp, dur: 0, n: 10 },
  { t: "Weakest Subject Quiz", d: "Focus on questions from your lowest subject score.", icon: Target, dur: 0, n: 10 },
  { t: "Timed Quiz", d: "Have 5 or 10 minutes to invest in some study time?", icon: Clock, dur: 600, n: 10 },
  { t: "Build Your Own", d: "Select how many questions and what subjects to focus on.", icon: SlidersHorizontal, dur: 0, n: 10 },
];
const FLASHSETS = [
  { t: "Cranial nerves deck", cards: [{ f: "CN I", b: "Olfactory — smell" }, { f: "CN II", b: "Optic — vision" }, { f: "CN VII", b: "Facial — expression, taste" }, { f: "CN X", b: "Vagus — parasympathetic" }] },
  { t: "Antibiotics deck", cards: [{ f: "Penicillin", b: "Beta-lactam — cell wall synthesis" }, { f: "Gentamicin", b: "Aminoglycoside — 30S ribosome" }, { f: "Ciprofloxacin", b: "Fluoroquinolone — DNA gyrase" }] },
  { t: "ECG patterns deck", cards: [{ f: "STEMI", b: "ST-segment elevation" }, { f: "Atrial fibrillation", b: "Irregularly irregular, no P waves" }] },
];
type NoteItem = { s: string; t: string; lines: string[]; table?: { headers: string[]; rows: string[][] } };
const NOTES: NoteItem[] = [
  { s: "Cardiology", t: "Cardiac cycle", lines: ["Systole = contraction phase", "Diastole = filling phase", "S1 = mitral & tricuspid close", "S2 = aortic & pulmonary close"] },
  { s: "Anatomy", t: "Cranial nerves", lines: ["12 paired nerves", "CN X = vagus (parasympathetic)", "Mixed: V, VII, IX, X", "Test with targeted reflexes"] },
  { s: "Physiology", t: "Acid-base balance", lines: ["Normal pH 7.35-7.45", "Respiratory vs metabolic", "Check the anion gap", "Expect compensation"],
    table: { headers: ["Disorder", "pH", "Primary", "Compensation"], rows: [
      ["Metabolic acidosis", "↓", "↓ HCO₃⁻", "↓ CO₂ (hyperventilation)"],
      ["Metabolic alkalosis", "↑", "↑ HCO₃⁻", "↑ CO₂ (hypoventilation)"],
      ["Respiratory acidosis", "↓", "↑ CO₂", "↑ HCO₃⁻ (renal)"],
      ["Respiratory alkalosis", "↑", "↓ CO₂", "↓ HCO₃⁻ (renal)"],
    ] } },
];
const IMG_COLORS = ["#1C1C1E", "#2E9E5B", "#E5484D", "#7C3AED", "#E8A33D", "#2F7A87", "#B0324C", "#2B57D6", "#0E7490"];
const IMAGE_ITEMS = IMG_COLORS.map((color, index) => ({
  color,
  title: ["Chest X-ray", "Blood film", "ECG strip", "Histology slide", "Urine microscopy", "Abdominal CT", "Peripheral smear", "Skin lesion", "Ultrasound"][index] ?? `Image ${index + 1}`,
  prompt: ["Identify the most likely finding.", "Name the hallmark cell.", "Spot the rhythm abnormality.", "Describe the diagnostic feature.", "Choose the expected crystal.", "Localize the abnormality.", "Recognize the morphology.", "Select the diagnosis.", "Interpret the key structure."][index] ?? "Review the key finding.",
  note: ["Use the image pattern before reading the options.", "Compare size, nuclei, and staining pattern.", "Start with rate, rhythm, and axis.", "Look for architecture first, then cells.", "Match shape and birefringence.", "Check organ, plane, and contrast phase.", "Scan edge and center of the smear.", "Assess border, color, and symmetry.", "Confirm orientation before answering."][index] ?? "Use a systematic visual checklist.",
}));
const QUESTION_REFS = [
  { n: 1, title: "MSD Manual", url: "https://www.msdmanuals.com/professional" },
  { n: 2, title: "NCI PDQ", url: "https://www.cancer.gov/publications/pdq" },
  { n: 3, title: "NCBI Bookshelf", url: "https://www.ncbi.nlm.nih.gov/books/" },
];
const ST: Record<string, { c: string; wash: string; I: any; label: string }> = {
  correct: { c: C.green, wash: C.greenWash, I: Check, label: "Correct" },
  incorrect: { c: C.red, wash: C.redWash, I: X, label: "Incorrect" },
  flagged: { c: C.amber, wash: C.amberWash, I: Flag, label: "Flagged" },
  used: { c: C.wolf, wash: C.polar, I: Check, label: "Used" },
  unused: { c: C.hare, wash: C.polar, I: BookOpen, label: "Unused" },
};
const FEATURES = [["Unlimited exam access", "Every available qbank in one plan"], ["AI assistant 24/7", "Expert-level answers, instantly"], ["Review & exam mode", "Study or simulate real conditions"], ["Unlimited questions", "Go beyond 20 free per 24 hours"], ["Quizzes & mock exams", "Timed sets, flashcards, analytics"]];

/* small reusable bits */
type FlashCard = {
  f?: string;
  b?: string;
  question?: string;
  answer?: string;
  frontImage?: string;
  backImage?: string;
  questionImage?: string;
  answerImage?: string;
  fImg?: string;
  bImg?: string;
  image?: string;
  imageOn?: "front" | "back";
};
type FlashSet = { t: string; cards: FlashCard[] };

const flashFrontText = (card: FlashCard) => card.f ?? card.question ?? "";
const flashBackText = (card: FlashCard) => card.b ?? card.answer ?? "";
function flashImage(card: FlashCard, side: "front" | "back") {
  if (side === "front") return card.frontImage ?? card.questionImage ?? card.fImg ?? (card.imageOn !== "back" ? card.image : undefined);
  return card.backImage ?? card.answerImage ?? card.bImg ?? (card.imageOn === "back" ? card.image : undefined);
}
function FlashSideContent({ card, side, compact = false }: { card: FlashCard; side: "front" | "back"; compact?: boolean }) {
  const text = side === "front" ? flashFrontText(card) : flashBackText(card);
  const img = flashImage(card, side);
  return (
    <div className="min-w-0">
      {img && <img src={img} alt={text || (side === "front" ? "Question image" : "Answer image")} className={`${compact ? "max-h-40" : "max-h-56"} mb-3 w-full rounded-2xl object-contain`} style={{ background: C.polar, border: `2px solid ${C.swan}` }} />}
      {text && <p className={`${compact ? "text-3xl md:text-5xl" : "text-base md:text-lg"} font-black leading-snug`} style={{ color: side === "back" && compact ? C.white : C.eel }}>{text}</p>}
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
      <Search size={18} strokeWidth={3} color={C.hare} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm font-bold outline-none placeholder:font-bold" style={{ color: C.eel }} />
    </div>
  );
}
const Primary = ({ children, onClick, full, type = "button" }: any) => (
  <button type={type} onClick={onClick} className={`flex ${full ? "w-full" : ""} items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-black uppercase tracking-wide text-white outline-none transition-all duration-75 active:translate-y-0.5`} style={{ background: C.ink, boxShadow: `0 4px 0 ${C.inkDark}` }}>{children}</button>
);
function AppLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14 rounded-3xl text-xl" : size === "sm" ? "h-9 w-9 rounded-xl text-sm" : "h-11 w-11 rounded-2xl text-base";
  return <span className={`grid ${dim} flex-none place-items-center font-black text-white`} style={{ background: `linear-gradient(145deg, ${C.teal}, ${C.ink})`, boxShadow: `0 3px 0 ${C.tealDark}` }}>D</span>;
}
function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AppLogo />
      <div className="min-w-0">
        <p className="truncate text-lg font-black leading-tight md:text-xl" style={{ color: C.eel }}>DrKard</p>
        {subtitle && <p className="truncate text-xs font-extrabold uppercase tracking-wide" style={{ color: C.wolf }}>{subtitle}</p>}
      </div>
    </div>
  );
}
function AppHeader({ children, subtitle }: { children?: React.ReactNode; subtitle?: string }) {
  return (
    <header className="flex flex-none items-center justify-between gap-3 px-5 py-3 md:px-10 md:py-4" style={{ background: C.cream }}>
      <BrandLockup subtitle={subtitle} />
      {children && <div className="flex flex-none items-center gap-2">{children}</div>}
    </header>
  );
}
function HeaderActions({
  isSignedIn,
  onUpgrade,
  onManageBilling,
  isPro,
  questionsRemaining,
  aiRemainingUsd,
  aiBudgetUsd,
}: {
  isSignedIn: boolean;
  onUpgrade: () => void;
  onManageBilling?: () => void;
  isPro?: boolean;
  questionsRemaining?: number | null;
  aiRemainingUsd?: number | null;
  aiBudgetUsd?: number | null;
}) {
  type StatKey = "streak" | "xp" | "energy";
  const [openStat, setOpenStat] = useState<StatKey | null>(null);
  const toggleStat = (key: StatKey) => setOpenStat((s) => (s === key ? null : key));
  const energyLabel = isPro
    ? aiRemainingUsd != null
      ? `$${aiRemainingUsd.toFixed(2)}`
      : "Pro"
    : String(questionsRemaining ?? 20);
  const panels: Record<StatKey, { Icon: typeof Flame; color: string; title: string; value: string; body: string; tip: string; showUpgrade?: boolean }> = {
    streak: {
      Icon: Flame,
      color: "#FF6B00",
      title: "Daily streak",
      value: "0 days",
      body: "Answer at least one question today to start building your streak.",
      tip: "Study daily to keep the chain alive and earn bonus XP.",
    },
    xp: {
      Icon: Star,
      color: C.purple,
      title: "Experience",
      value: "7 XP",
      body: "XP rewards correct answers and consistent study sessions.",
      tip: "Quizzes, reviews, and streaks all add to your total.",
    },
    energy: {
      Icon: Zap,
      color: "#C026D3",
      title: isPro ? "AI budget" : "Daily energy",
      value: isPro
        ? aiRemainingUsd != null && aiBudgetUsd != null
          ? `$${aiRemainingUsd.toFixed(2)} left`
          : "Pro"
        : `${energyLabel} left`,
      body: isPro
        ? `Pro includes $${aiBudgetUsd ?? 2}/month for AI assistant usage (resets on the 1st). Practice questions stay unlimited.`
        : "Free accounts get 20 questions per rolling 24 hours across all exams.",
      tip: isPro ? "Manage billing anytime from your account." : "Energy resets on a rolling 24-hour window.",
      showUpgrade: !isPro,
    },
  };
  const cls = "flex h-11 items-center overflow-hidden rounded-full bg-white text-sm font-black";
  const style = { color: C.eel, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` };
  const press = "active:translate-y-0.5";
  const segment = `flex items-center gap-1.5 px-3 py-2 outline-none ${press}`;
  const panel = openStat ? panels[openStat] : null;
  return (
    <div className="relative">
      <div className={cls} style={style}>
        <button type="button" onClick={() => toggleStat("streak")} className={segment} aria-label="Daily streak" aria-expanded={openStat === "streak"}>
          <Flame size={19} strokeWidth={3} color="#FF6B00" fill="#FF6B00" /><span>0</span>
        </button>
        <button type="button" onClick={() => toggleStat("xp")} className={`${segment} hidden border-x sm:flex`} style={{ borderColor: C.swan }} aria-label="Experience points" aria-expanded={openStat === "xp"}>
          <Star size={18} strokeWidth={3} color={C.purple} fill={C.purpleWash} /><span>7 XP</span>
        </button>
        <button type="button" onClick={() => toggleStat("energy")} className={segment} aria-label="Daily energy" aria-expanded={openStat === "energy"}>
          <Zap size={18} strokeWidth={3} color="#C026D3" fill="#E879F9" /><span>{energyLabel}</span>
        </button>
        {isPro ? (
          <button type="button" onClick={onManageBilling ?? onUpgrade} className={`outline-none ${press}`} aria-label="Manage Pro subscription">
            <span className="flex items-center gap-1.5 border-l px-3 py-2" style={{ borderColor: C.swan, color: C.teal }}>
              <Crown size={18} strokeWidth={3} color={C.goldDark} fill={C.gold} />
              <span>Pro</span>
            </span>
          </button>
        ) : (
          <button type="button" onClick={onUpgrade} className={`outline-none ${press}`} aria-label="Upgrade to Pro">
            <span className="flex items-center gap-1.5 border-l px-3 py-2" style={{ borderColor: C.swan, color: C.teal }}>
              <Crown size={18} strokeWidth={3} color={C.goldDark} fill={C.gold} />
              <span>Pro</span>
            </span>
          </button>
        )}
      </div>
      {panel && (
        <>
          <div className="fixed inset-0 z-[58]" onClick={() => setOpenStat(null)} aria-hidden />
          <div className="absolute right-0 top-[calc(100%+10px)] z-[59] w-[min(20rem,calc(100vw-32px))] rounded-3xl p-4 text-left" style={{ background: C.white, border: `2px solid ${C.swan}`, boxShadow: "0 18px 44px rgba(17,24,39,.18)" }}>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.polar, color: panel.color }}><panel.Icon size={20} strokeWidth={3} /></span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide" style={{ color: C.hare }}>{panel.title}</p>
                <p className="text-2xl font-black leading-tight" style={{ color: C.eel }}>{panel.value}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-snug" style={{ color: C.eel }}>{panel.body}</p>
            <p className="mt-2 text-sm font-bold leading-snug" style={{ color: C.wolf }}>{panel.tip}</p>
            {!isSignedIn && (
              <SignInButton mode="modal">
                <button type="button" onClick={() => setOpenStat(null)} className="mt-4 w-full rounded-2xl py-2.5 text-sm font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>Sign in to track progress</button>
              </SignInButton>
            )}
            {isSignedIn && isPro && onManageBilling && (
              <button type="button" onClick={() => { setOpenStat(null); onManageBilling(); }} className="mt-4 w-full rounded-2xl py-2.5 text-sm font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>Manage billing</button>
            )}
            {isSignedIn && panel.showUpgrade && (
              <button type="button" onClick={() => { setOpenStat(null); onUpgrade(); }} className="mt-4 w-full rounded-2xl py-2.5 text-sm font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.teal, boxShadow: `0 3px 0 ${C.tealDark}` }}>Get unlimited with Pro</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
function EmptyState({ icon: Icon = Sparkles, title, body, action }: { icon?: any; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl p-6 text-center" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl" style={{ background: C.tealWash, color: C.teal }}><Icon size={24} strokeWidth={2.75} /></span>
      <p className="mt-3 text-lg font-black" style={{ color: C.eel }}>{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm font-bold" style={{ color: C.wolf }}>{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
function formatQuestionShareText(q: { q: string; s?: string; o: string[]; a: number }) {
  const options = q.o.map((o, k) => `${String.fromCharCode(65 + k)}. ${o}`).join("\n");
  const answer = `${String.fromCharCode(65 + q.a)}. ${q.o[q.a] ?? ""}`;
  const subject = q.s ? `Subject: ${q.s}\n\n` : "";
  return `${subject}${q.q}\n\n${options}\n\nAnswer: ${answer}`;
}
/* Copy / Share / Report — consistent icon row for any content card (note, flashcard, question). */
function CardActions({ text, shareText, title, onReport, className = "" }: { text: string; shareText?: string; title?: string; onReport?: () => void; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ }
  };
  const share = async () => {
    const payload = shareText ?? text;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: title ?? "DrKard", text: payload }); return; } catch { /* user cancelled or share failed */ }
    }
    try { await navigator.clipboard.writeText(payload); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ }
  };
  const report = () => { if (onReport) { onReport(); return; } setReported(true); setTimeout(() => setReported(false), 1600); };
  const btn = "grid h-9 w-9 flex-none place-items-center rounded-xl transition-colors active:translate-y-0.5";
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button type="button" aria-label="Copy" title={copied ? "Copied" : "Copy"} onClick={copy} className={btn} style={{ background: C.polar, color: copied ? C.green : C.hare }}>{copied ? <Check size={17} strokeWidth={3.5} /> : <Copy size={17} strokeWidth={2.75} />}</button>
      <button type="button" aria-label="Share" title="Share" onClick={share} className={btn} style={{ background: C.polar, color: C.hare }}><Share2 size={17} strokeWidth={2.75} /></button>
      <button type="button" aria-label="Report" title={reported ? "Reported — thanks" : "Report"} onClick={report} className={btn} style={{ background: reported ? C.redWash : C.polar, color: reported ? C.red : C.hare }}><Flag size={17} strokeWidth={2.75} fill={reported ? C.red : "none"} /></button>
    </div>
  );
}
/* Simple table renderer for note content that is tabular. */
function NoteTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl" style={{ border: `2px solid ${C.swan}` }}>
      <table className="w-full border-collapse text-left text-sm font-bold md:text-base">
        <thead><tr style={{ background: C.polar }}>{headers.map((h, i) => <th key={i} className="px-3 py-2.5 text-xs font-black uppercase tracking-wide" style={{ color: C.wolf, borderBottom: `2px solid ${C.swan}` }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, ri) => <tr key={ri} style={{ background: ri % 2 ? C.polar : C.white }}>{r.map((cell, ci) => <td key={ci} className="px-3 py-2.5 align-top" style={{ color: ci === 0 ? C.eel : C.wolf, borderTop: ri ? `1px solid ${C.swan}` : "none" }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
function RotatingHero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setI((x) => x + 1), 2000);
    return () => clearInterval(timer);
  }, []);
  const lines = [
    "Study fast",
    "Pass exams",
    "Start now",
    "Practice daily",
    "Get exam ready",
  ];
  const active = i % lines.length;
  return (
    <div className="relative w-full">
      <h1>
        <span
          key={i}
          aria-live="polite"
          className="hero-line-animate block min-h-[1.1em] bg-clip-text text-4xl font-black leading-[1.05] tracking-[-0.03em] text-transparent md:text-[2.75rem] md:tracking-[-0.035em]"
          style={{ backgroundImage: `linear-gradient(118deg, ${C.ink} 8%, ${C.teal} 92%)` }}
        >
          {lines[active]}
        </span>
      </h1>
      <div className="relative mt-4 flex items-center justify-center gap-1.5 md:mt-5" aria-hidden>
        {lines.map((_, idx) => (
          <span
            key={idx}
            className="h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{
              width: idx === active ? 20 : 6,
              background: idx === active ? C.teal : C.swan,
              opacity: idx === active ? 1 : 0.55,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Question runner (explanation + per-question Explain chat) ---------------- */
function questionChatIntro(q: any, selected: number | undefined) {
  const selectedText = selected == null || selected < 0 ? "Not answered yet" : `${String.fromCharCode(65 + selected)}. ${q.o[selected]}`;
  const correctText = `${String.fromCharCode(65 + q.a)}. ${q.o[q.a]}`;
  return `Question: ${q.q}\n\nYour answer: ${selectedText}\nCorrect answer: ${correctText}\n\nExplanation: ${q.e}`;
}
function reviewChatIntro(q: { q: string; s?: string; o: string[]; a: number; e: string }, examTitle: string) {
  const options = q.o.map((opt, k) => `${String.fromCharCode(65 + k)}. ${opt}`).join("\n");
  const correctText = `${String.fromCharCode(65 + q.a)}. ${q.o[q.a]}`;
  return `${examTitle} · ${q.s ?? "Review"}\n\nQuestion: ${q.q}\n\n${options}\n\nCorrect answer: ${correctText}\n\nExplanation: ${q.e}\n\nWhat would you like to clarify about this question?`;
}
function questionChatSystemPrompt(q: { q: string; o: string[]; a: number; e: string; s?: string }, scope?: string) {
  const options = q.o.map((opt, k) => `${String.fromCharCode(65 + k)}. ${opt}`).join("\n");
  const correctLetter = String.fromCharCode(65 + q.a);
  const lead = scope
    ? `You are DrKard's study assistant explaining a reviewed ${scope} exam question.`
    : "You are DrKard's study assistant explaining a practice exam question.";
  return `${lead}

Question: ${q.q}
${q.s ? `Subject: ${q.s}\n` : ""}Options:
${options}

Correct answer: ${correctLetter}. ${q.o[q.a]}
Explanation: ${q.e}

Students may refer to options by letter (A, B, C, D). Always interpret letters using the option list above. Be concise and clinically accurate.`;
}
function expandedExplanationParagraphs(q: { q?: string; e: string; s?: string; o: string[]; a: number }) {
  const correct = q.o?.[q.a] ?? "the correct answer";
  const letter = String.fromCharCode(65 + q.a);
  const paragraphs = [q.e];
  paragraphs.push(
    `Correct answer: ${letter}. ${correct}. The stem is testing ${q.s ? `core ${q.s.toLowerCase()}` : "this concept"} — this option matches the key finding most directly.`,
  );
  const wrong = q.o.map((opt, idx) => ({ opt, idx })).filter(({ idx }) => idx !== q.a);
  if (wrong.length) {
    paragraphs.push(
      `Why the other options fall short:\n${wrong.map(({ opt, idx }) => `• ${String.fromCharCode(65 + idx)}. ${opt} — plausible at first glance, but does not satisfy the specific clue in the question stem.`).join("\n")}`,
    );
  }
  return paragraphs;
}
function explanationParts(q: any) {
  const correct = q.o?.[q.a] ?? "the correct answer";
  return [
    { title: "Explanation", paragraphs: expandedExplanationParagraphs(q) },
    { title: "Key takeaway", body: `Remember: ${correct} is the answer pattern to recognize here.` },
  ];
}
function ExplanationSection({ title, paragraphs, body }: { title: string; paragraphs?: string[]; body?: string }) {
  const isMain = title === "Explanation";
  return (
    <div className={`rounded-2xl ${isMain ? "p-5 md:p-6" : "p-4 md:p-5"}`} style={{ background: C.polar }}>
      <p className="text-xs font-black uppercase tracking-wide" style={{ color: C.hare }}>{title}</p>
      {paragraphs ? (
        <div className="mt-3 space-y-4">
          {paragraphs.map((para, pi) => (
            <p key={pi} className="whitespace-pre-line text-base font-bold leading-relaxed md:text-lg" style={{ color: C.eel }}>{para}</p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-base font-extrabold leading-relaxed md:text-lg" style={{ color: C.eel }}>{body}</p>
      )}
    </div>
  );
}
function QuestionExplanationBox({ q, className = "mt-6", header, footer }: { q: { q?: string; e: string; s?: string; o: string[]; a: number }; className?: string; header?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className={`rounded-3xl p-5 md:p-6 ${className}`} style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
      {header}
      <div className="space-y-3">
        {explanationParts(q).map((part) => (
          <ExplanationSection key={part.title} title={part.title} paragraphs={"paragraphs" in part ? part.paragraphs : undefined} body={"body" in part ? part.body : undefined} />
        ))}
      </div>
      {footer}
    </div>
  );
}
function Runner({ title, questions, durationSec, onClose, onDashboard, onComplete, onDone, onExplain, onReport, examId, getExplainThreadId, onUpgrade }: { title: string; questions: any[]; durationSec: number; onClose: () => void; onDashboard?: () => void; onComplete?: (payload: { answers: { questionId?: Id<"questions">; selected: number; correct: boolean }[]; elapsedSec: number }) => void; onDone?: () => void; onExplain?: (args: { questionIndex: number; questionId?: Id<"questions">; userMessage: string; assistantMessage: string }) => void; onReport?: (args: { questionId?: Id<"questions">; issueType: string; note: string; selectedAnswer?: number }) => Promise<boolean | void> | boolean | void; examId?: Id<"exams">; getExplainThreadId?: (questionIndex: number) => Id<"aiThreads"> | undefined; onUpgrade?: () => void }) {
  const [i, setI] = useState(0); const [ans, setAns] = useState<Record<number, number>>({});
  const [confirm, setConfirm] = useState(false); const [done, setDone] = useState(false);
  const [left, setLeft] = useState(durationSec); const [elapsed, setElapsed] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chats, setChats] = useState<Record<number, Msg[]>>({});
  const [cin, setCin] = useState(""); const [csending, setCsending] = useState(false);
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState("question");
  const [reportNote, setReportNote] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const csc = useRef<HTMLDivElement>(null);
  const saved = useRef(false);

  useEffect(() => { if (done) return; const t = setInterval(() => { setElapsed((e) => e + 1); if (durationSec) setLeft((l) => (l <= 1 ? (setDone(true), 0) : l - 1)); }, 1000); return () => clearInterval(t); }, [done, durationSec]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (done || chatOpen) return; if (e.key === "ArrowRight") setI((x) => Math.min(questions.length - 1, x + 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1)); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [done, chatOpen, questions.length]);
  useEffect(() => { csc.current?.scrollTo({ top: csc.current.scrollHeight, behavior: "smooth" }); }, [chats, i, csending]);
  useEffect(() => {
    if (!done || saved.current) return;
    saved.current = true;
    onComplete?.({
      elapsedSec: elapsed,
      answers: questions.map((qq, idx) => ({
        questionId: qq._id,
        selected: ans[idx] ?? -1,
        correct: ans[idx] === qq.a,
      })),
    });
    onDone?.();
  }, [ans, done, elapsed, onComplete, onDone, questions]);

  const q = questions[i]; const a = ans[i];
  const answered = Object.keys(ans).length; const remaining = questions.length - answered;
  const correct = questions.reduce((n, qq, idx) => n + (ans[idx] === qq.a ? 1 : 0), 0);

  useEffect(() => {
    if (!chatOpen) return;
    setChats((c) => c[i] ? c : { ...c, [i]: [{ role: "assistant", content: questionChatIntro(q, ans[i]) }] });
  }, [ans, chatOpen, i, q]);
  const openExplain = () => { setChatOpen(true); setChats((c) => c[i] ? c : { ...c, [i]: [{ role: "assistant", content: questionChatIntro(q, ans[i]) }] }); };
  async function submitReport() {
    const note = reportNote.trim();
    if (!note && reportType === "other") return;
    await onReport?.({ questionId: q._id, issueType: reportType, note: note || reportType, selectedAnswer: ans[i] });
    setReportSent(true);
    setTimeout(() => { setReportOpen(false); setReportSent(false); setReportNote(""); setReportType("question"); }, 700);
  }
  async function csend() {
    const text = cin.trim(); if (!text || csending) return;
    const thread = [...(chats[i] || []), { role: "user" as const, content: text }];
    setChats((c) => ({ ...c, [i]: thread })); setCin(""); setCsending(true);
    try {
      let api = thread.slice(); while (api.length && api[0].role !== "user") api = api.slice(1);
      const result = await postChat({
        system: questionChatSystemPrompt(q),
        messages: api,
        examId,
        threadId: getExplainThreadId?.(i),
        kind: "explain",
      });
      if (!result.ok) {
        if (result.code === "pro_required") onUpgrade?.();
        setChats((c) => ({ ...c, [i]: [...thread, { role: "assistant", content: chatFailureMessage(result) }] }));
        return;
      }
      const reply = result.reply;
      setChats((c) => ({ ...c, [i]: [...thread, { role: "assistant", content: reply || "Try rephrasing?" }] }));
      if (reply) onExplain?.({ questionIndex: i, questionId: q._id, userMessage: text, assistantMessage: reply });
    } catch { setChats((c) => ({ ...c, [i]: [...thread, { role: "assistant", content: "Couldn't reach the AI right now." }] })); }
    finally { setCsending(false); }
  }

  if (done) {
    const pct = Math.round((correct / questions.length) * 100);
    const bySub: Record<string, { c: number; t: number }> = {};
    questions.forEach((qq, idx) => { const k = qq.s; bySub[k] = bySub[k] || { c: 0, t: 0 }; bySub[k].t++; if (ans[idx] === qq.a) bySub[k].c++; });
    const byTag: Record<string, { c: number; t: number }> = {};
    questions.forEach((qq, idx) => (qq.tags ?? []).forEach((tag: string) => { byTag[tag] = byTag[tag] || { c: 0, t: 0 }; byTag[tag].t++; if (ans[idx] === qq.a) byTag[tag].c++; }));
    const answeredCount = Object.values(ans).filter((v) => v >= 0).length;
    const avgTime = Math.round(elapsed / Math.max(1, answeredCount || questions.length));
    const tier = pct >= 70
      ? { label: "Strong finish", hint: "You're exam-ready on this set.", accent: C.green }
      : pct >= 40
        ? { label: "Keep building", hint: "Review weak spots, then run it again.", accent: C.amber }
        : { label: "Good start", hint: "Every session strengthens recall.", accent: C.teal };
    const ring = 2 * Math.PI * 46;
    const scoreBarColor = (p: number) => (p >= 70 ? C.green : p >= 40 ? C.amber : C.red);
    const breakdownRow = (name: string, v: { c: number; t: number }, bar: string) => {
      const p = Math.round((v.c / v.t) * 100);
      return (
        <div key={name} className="rounded-2xl p-4" style={{ background: C.polar }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-black" style={{ color: C.eel }}>{name}</p>
            <span className="rounded-full px-2.5 py-1 text-xs font-black" style={{ background: C.white, color: scoreBarColor(p) }}>{v.c}/{v.t} · {p}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: C.swan }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(p, p > 0 ? 8 : 0)}%`, background: bar }} />
          </div>
        </div>
      );
    };
    return (
      <div className="absolute inset-0 z-[55] flex flex-col" style={{ background: C.cream }}>
        <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10" style={{ background: C.cream }}>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><X size={22} strokeWidth={3} color={C.wolf} /></button>
          <div className="min-w-0 flex-1"><BrandLockup subtitle="Results" /></div>
        </header>
        <main className="no-bar flex-1 overflow-y-auto px-5 py-6 md:px-10">
          <div className="mx-auto max-w-2xl space-y-5 pb-8">
            <div className="relative overflow-hidden rounded-[1.75rem] p-6 md:p-8" style={{ background: `linear-gradient(145deg, ${C.ink} 0%, ${C.teal} 100%)`, boxShadow: `0 8px 0 ${C.inkDark}` }}>
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20" style={{ background: C.white }} />
              <div aria-hidden className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full opacity-10" style={{ background: C.white }} />
              <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <div className="relative grid h-[7.5rem] w-[7.5rem] flex-none place-items-center">
                  <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                    <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
                    <circle cx="60" cy="60" r="46" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - pct / 100)} />
                  </svg>
                  <div className="text-center">
                    <p className="text-4xl font-black leading-none text-white">{pct}%</p>
                    <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-white/60">Score</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white" style={{ background: "rgba(255,255,255,0.16)" }}>
                    <Trophy size={14} strokeWidth={3} color={tier.accent} /> {tier.label}
                  </span>
                  <h2 className="mt-3 text-2xl font-black leading-tight text-white md:text-[1.75rem]">{correct} of {questions.length} correct</h2>
                  <p className="mt-1.5 text-sm font-bold leading-snug text-white/75">{tier.hint}</p>
                  <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-white/50">{mmss(elapsed)} session time</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                ["Answered", `${answeredCount}/${questions.length}`, Check, C.green, C.greenWash],
                ["Avg time", mmss(avgTime), Clock, C.blue, C.blueWash],
                ["Missed", String(questions.length - correct), Target, C.red, C.redWash],
              ].map(([label, value, Icon, fg, bg]: any) => (
                <div key={label} className="rounded-[1.35rem] p-3 md:p-4" style={{ background: C.white, border: `2px solid ${C.swan}`, boxShadow: `0 4px 0 ${C.swan}` }}>
                  <span className="grid h-9 w-9 place-items-center rounded-xl md:h-10 md:w-10 md:rounded-2xl" style={{ background: bg, color: fg }}><Icon size={18} strokeWidth={3} /></span>
                  <p className="mt-2.5 text-[10px] font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>{label}</p>
                  <p className="mt-0.5 text-lg font-black leading-none md:text-xl" style={{ color: C.eel }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.75rem] p-5 md:p-6" style={{ background: C.white, border: `2px solid ${C.swan}`, boxShadow: `0 5px 0 ${C.swan}` }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xs font-black uppercase tracking-wide" style={{ color: C.hare }}>Performance breakdown</h3>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide" style={{ background: C.polar, color: C.wolf }}>{Object.keys(bySub).length} subjects</span>
              </div>
              <div className="space-y-2.5">{Object.entries(bySub).map(([s, v]) => breakdownRow(s, v, C.ink))}</div>
              {Object.keys(byTag).length > 0 && (
                <>
                  <div className="my-5 h-px" style={{ background: C.swan }} />
                  <h3 className="mb-4 text-xs font-black uppercase tracking-wide" style={{ color: C.hare }}>By tag</h3>
                  <div className="space-y-2.5">{Object.entries(byTag).map(([s, v]) => breakdownRow(s, v, C.teal))}</div>
                </>
              )}
            </div>

            <Primary onClick={() => (onDashboard ?? onClose)()} full><LayoutGrid size={18} strokeWidth={3} /> Dashboard</Primary>
          </div>
        </main>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="absolute inset-0 z-[55] flex flex-col" style={{ background: C.cream }}>
        <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10" style={{ background: C.cream }}>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><X size={22} strokeWidth={3} color={C.wolf} /></button>
          <BrandLockup subtitle={title} />
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <EmptyState icon={BookOpen} title="No questions yet" body="This set has no questions available right now. Add or seed questions for this exam to start practising." action={<Primary onClick={onClose}>Go back</Primary>} />
        </main>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[55] flex flex-col" style={{ background: C.cream }}>
      <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10" style={{ background: C.cream }}>
        <button type="button" aria-label="End" onClick={() => setConfirm(true)} className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><X size={22} strokeWidth={3} color={C.wolf} /></button>
        <BrandLockup subtitle={title} />
        <div className="min-w-0 flex-1"><div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: C.swan }}><div className="h-full rounded-full" style={{ width: `${((i + 1) / questions.length) * 100}%`, background: C.teal }} /></div></div>
        {durationSec > 0 && <span className="flex-none rounded-2xl px-3 py-1.5 text-sm font-black" style={{ background: left < 60 ? C.redWash : C.polar, color: left < 60 ? C.red : C.eel }}>{mmss(left)}</span>}
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-6 md:px-10"><div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-2"><BookOpen size={18} strokeWidth={3} color={C.hare} /><p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>{q.s}</p></div>
        <h2 className="mt-2 text-2xl font-black leading-tight md:text-4xl" style={{ color: C.eel }}>{q.q}</h2>
        <div className="mt-6 space-y-3">{q.o.map((opt: string, idx: number) => {
          const sel = a != null; const isA = idx === q.a; const isSel = idx === a;
          const bd = sel && isA ? C.green : sel && isSel ? C.red : C.swan;
          const sty = sel && isA ? { background: C.greenWash, color: C.green } : sel && isSel ? { background: C.redWash, color: C.red } : { background: C.white, color: C.eel };
          return <button key={idx} type="button" disabled={sel} onClick={() => setAns((p) => ({ ...p, [i]: idx }))} className="flex w-full items-center gap-4 rounded-3xl p-5 text-left text-lg font-extrabold leading-snug outline-none transition-all duration-75 active:translate-y-0.5 md:text-xl" style={{ ...sty, border: `2px solid ${bd}`, boxShadow: `0 4px 0 ${bd}` }}>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl text-base" style={{ background: "rgba(0,0,0,0.05)" }}>{String.fromCharCode(65 + idx)}</span><span className="min-w-0 flex-1">{opt}</span>{sel && isA && <Check size={22} strokeWidth={4} className="ml-auto flex-none" />}</button>;
        })}</div>
        {a != null && (
          <QuestionExplanationBox
            q={q}
            header={(
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.tealWash, color: C.teal }}><BookOpen size={22} strokeWidth={3} /></span>
                <CardActions
                  title={q.q}
                  text={formatQuestionShareText(q)}
                  shareText={formatQuestionShareText(q)}
                  onReport={() => setReportOpen(true)}
                />
              </div>
            )}
            footer={(
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {QUESTION_REFS.map((ref) => (
                    <a key={ref.n} href={ref.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black active:translate-y-0.5" style={{ background: C.inkWash, color: C.ink }}>
                      <span>{ref.n}</span><ExternalLink size={13} strokeWidth={3} />
                    </a>
                  ))}
                </div>
                <button type="button" onClick={openExplain} className="mt-4 flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><MessageCircle size={18} strokeWidth={3} /> Explain</button>
              </>
            )}
          />
        )}
      </div></main>
      <footer className="flex flex-none items-center justify-between gap-2 px-5 py-3 md:gap-3 md:px-10" style={{ background: C.cream, borderTop: `2px solid ${C.creamLine}` }}>
        <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="flex items-center gap-1.5 rounded-2xl px-4 py-3 font-black uppercase tracking-wide active:translate-y-0.5 disabled:opacity-40" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}><ChevronLeft size={18} strokeWidth={3.5} /> Prev</button>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={bookmarks[i] ? "Remove bookmark" : "Bookmark question"} onClick={() => setBookmarks((m) => ({ ...m, [i]: !m[i] }))} className="grid h-12 w-12 place-items-center rounded-2xl active:translate-y-0.5" style={{ background: bookmarks[i] ? C.amberWash : C.polar, color: bookmarks[i] ? C.amber : C.wolf }}><Bookmark size={21} strokeWidth={3} fill={bookmarks[i] ? C.amber : "none"} /></button>
          <button type="button" onClick={() => setReportOpen(true)} className="flex h-12 items-center gap-2 rounded-2xl px-4 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.polar, color: C.eel }}><Flag size={18} strokeWidth={3} /> Report</button>
          <span className="hidden rounded-2xl px-4 py-2 text-lg font-black md:block" style={{ background: C.inkWash, color: C.ink }}>{i + 1} / {questions.length}</span>
        </div>
        <div className="flex flex-none items-center gap-2">
          <button type="button" onClick={() => setDone(true)} className="flex items-center gap-1.5 rounded-2xl px-3 py-3 font-black uppercase tracking-wide active:translate-y-0.5 sm:px-4" style={{ background: C.tealWash, color: C.teal, border: `2px solid ${C.teal}`, boxShadow: `0 3px 0 ${C.tealDark}` }} aria-label="End exam"><X size={18} strokeWidth={3} /> End</button>
          {i === questions.length - 1
            ? <button type="button" onClick={() => setDone(true)} className="flex items-center gap-1.5 rounded-2xl px-5 py-3 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>Finish <Check size={18} strokeWidth={3.5} /></button>
            : <button type="button" onClick={() => setI((x) => Math.min(questions.length - 1, x + 1))} className="flex items-center gap-1.5 rounded-2xl px-5 py-3 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>Next <ChevronRight size={18} strokeWidth={3.5} /></button>}
        </div>
      </footer>
      <div className="pointer-events-none absolute inset-x-0 bottom-[76px] flex justify-center md:hidden"><span className="pointer-events-auto rounded-2xl px-4 py-2 text-lg font-black" style={{ background: C.inkWash, color: C.ink }}>{i + 1} / {questions.length}</span></div>

      {/* per-question explain chat */}
      {chatOpen && (
        <div className="absolute bottom-5 right-5 z-[56] flex h-[640px] max-h-[82vh] w-[min(560px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl" style={{ background: C.white, boxShadow: "0 22px 60px rgba(17,24,39,.22)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: C.ink }}>
            <span className="flex min-w-0 items-center gap-3 font-black text-white"><AppLogo size="sm" /><span className="min-w-0"><span className="block leading-tight">DrKard</span><span className="block truncate text-xs uppercase tracking-wide text-white/70">Explain question {i + 1}</span></span></span>
            <button type="button" aria-label="Close" onClick={() => setChatOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,.2)" }}><X size={21} strokeWidth={3} color={C.white} /></button>
          </div>
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1" style={{ background: C.polar } as any}>
              <MessageScrollerViewport className="p-4">
                <MessageScrollerContent className="space-y-2.5">
                  {(chats[i] || []).map((m, k) => <MessageScrollerItem key={k} messageId={`q-${i}-chat-${k}`} scrollAnchor={m.role === "user"}><div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className="max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-base font-bold leading-relaxed" style={m.role === "user" ? { background: C.ink, color: C.white } : { background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}>{m.content}</div></div></MessageScrollerItem>)}
                  {csending && <MessageScrollerItem messageId={`q-${i}-thinking`}><div className="flex"><div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><Loader2 size={16} className="animate-spin" color={C.ink} /><span className="text-sm font-bold" style={{ color: C.hare }}>Thinking…</span></div></div></MessageScrollerItem>}
                </MessageScrollerContent>
              </MessageScrollerViewport>
            </MessageScroller>
          </MessageScrollerProvider>
          <div className="flex items-center gap-2 p-3" style={{ borderTop: `2px solid ${C.swan}` }}>
            <input value={cin} onChange={(e) => setCin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && csend()} placeholder="Ask about this question..." className="flex-1 rounded-2xl px-4 py-3 text-base font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            <button type="button" onClick={csend} disabled={csending} className="grid h-12 w-12 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-50" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><Send size={21} strokeWidth={3} color={C.white} /></button>
          </div>
        </div>
      )}

      {reportOpen && (
        <div onClick={() => setReportOpen(false)} className="absolute inset-0 z-[57] flex items-center justify-center bg-black/45 p-5">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl p-5" style={{ background: C.white }}>
            <div className="flex items-center justify-between gap-3"><div><p className="text-xl font-black" style={{ color: C.eel }}>Report issue</p><p className="text-sm font-bold" style={{ color: C.wolf }}>Tell us what needs review.</p></div><button type="button" aria-label="Close report" onClick={() => setReportOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: C.polar }}><X size={20} strokeWidth={3} color={C.wolf} /></button></div>
            <div className="mt-4 flex flex-wrap gap-2">{[["question", "Question"], ["choices", "Choices"], ["explanation", "Explanation"], ["missing", "Missing info"], ["other", "Other"]].map(([id, label]) => <button key={id} type="button" onClick={() => setReportType(id)} className="rounded-2xl px-3 py-2 text-sm font-black active:translate-y-0.5" style={reportType === id ? { background: C.ink, color: C.white } : { background: C.polar, color: C.eel }}>{label}</button>)}</div>
            <textarea value={reportNote} onChange={(e) => setReportNote(e.target.value)} rows={4} placeholder="What is wrong?" className="mt-4 w-full resize-none rounded-2xl p-3 font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            <button type="button" onClick={submitReport} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: reportSent ? C.green : C.ink, boxShadow: `0 3px 0 ${reportSent ? C.tealDark : C.inkDark}` }}>{reportSent ? <Check size={18} strokeWidth={4} /> : <Flag size={18} strokeWidth={3} />} {reportSent ? "Sent" : "Submit report"}</button>
          </div>
        </div>
      )}

      {confirm && (
        <div onClick={() => setConfirm(false)} className="absolute inset-0 z-[57] flex items-center justify-center bg-black/45 p-5">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: C.white }}>
            <p className="text-xl font-black" style={{ color: C.eel }}>End session?</p>
            <p className="mt-1 font-bold" style={{ color: C.wolf }}>{remaining} question{remaining === 1 ? "" : "s"} still remaining.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setConfirm(false)} className="flex-1 rounded-2xl py-3 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>Keep going</button>
              <button type="button" onClick={() => { setConfirm(false); setDone(true); }} className="flex-1 rounded-2xl py-3 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.red, boxShadow: `0 3px 0 ${C.redDark}` }}>End</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Review viewer (status + flag) ---------------- */
function ReviewViewer({ list, start, meta, setMeta, examTitle, filterLabel, onClose, onAskHistory, examId }: { list: { q: any; idx: number }[]; start: number; meta: Record<number, { status: string; flagged: boolean }>; setMeta: (idx: number, patch: any) => void; examTitle: string; filterLabel: string; onClose: () => void; onAskHistory?: (title: string, userMessage: string, assistantMessage: string, threadId?: Id<"aiThreads">) => Promise<Id<"aiThreads"> | void>; examId?: Id<"exams"> }) {
  const [p, setP] = useState(start);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const threadIds = useRef<Record<number, Id<"aiThreads">>>({});
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "ArrowRight") setP((x) => Math.min(list.length - 1, x + 1)); if (e.key === "ArrowLeft") setP((x) => Math.max(0, x - 1)); if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [list.length, onClose]);
  useEffect(() => { setChatOpen(false); setMessages([]); setInput(""); }, [p]);
  const { q, idx } = list[p];
  const currentMeta = meta[idx] ?? { status: q.st, flagged: false };
  const toggleBookmark = () => setMeta(idx, { ...currentMeta, flagged: !currentMeta.flagged });
  const openAsk = () => {
    setChatOpen(true);
    setMessages((m) => m.length ? m : [{ role: "assistant", content: reviewChatIntro(q, examTitle) }]);
  };
  async function sendReviewQuestion() {
    const text = input.trim(); if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setSending(true);
    try {
      let api = next.slice(); while (api.length && api[0].role !== "user") api = api.slice(1);
      const result = await postChat({
        system: questionChatSystemPrompt(q, examTitle),
        messages: api,
        examId,
        threadId: threadIds.current[p],
        kind: "review",
      });
      if (!result.ok) {
        setMessages((m) => [...m, { role: "assistant", content: chatFailureMessage(result) }]);
        return;
      }
      const reply = result.reply;
      setMessages((m) => [...m, { role: "assistant", content: reply || "Try rephrasing?" }]);
      if (reply) {
        const id = await onAskHistory?.(`Review: ${q.q}`, text, reply, threadIds.current[p]);
        if (id) threadIds.current[p] = id;
      }
    } catch { setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the AI right now." }]); }
    finally { setSending(false); }
  }
  return (
    <div className="absolute inset-0 z-[55] flex flex-col" style={{ background: C.cream }}>
      <header className="flex flex-none items-center gap-2.5 px-4 py-2.5 md:px-10" style={{ background: C.cream }}>
        <button type="button" aria-label="Close review" onClick={onClose} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><X size={22} strokeWidth={3} color={C.wolf} /></button>
        <span className="grid h-8 w-8 flex-none place-items-center rounded-xl text-sm font-black text-white" style={{ background: C.ink }}>D</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-black leading-tight" style={{ color: C.eel }}>DrKard</p>
          <p className="truncate text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Review · {filterLabel}</p>
        </div>
        <span className="text-sm font-black" style={{ color: C.hare }}>{p + 1}/{list.length}</span>
      </header>
      <main className="flex-1 overflow-y-auto px-5 py-6"><div className="mx-auto max-w-2xl">
        <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>{examTitle} · {q.s}</p>
        <h2 className="mt-1 text-xl font-black" style={{ color: C.eel }}>{q.q}</h2>
        <div className="mt-5 space-y-2.5">{q.o.map((opt: string, k: number) => { const isA = k === q.a; return (
          <div key={k} className="flex items-center gap-3 rounded-2xl p-4 font-extrabold" style={isA ? { background: C.greenWash, border: `2px solid ${C.green}`, color: C.green } : { background: C.white, border: `2px solid ${C.swan}`, color: C.eel }}>
            <span className="grid h-7 w-7 flex-none place-items-center rounded-lg text-sm" style={{ background: "rgba(0,0,0,0.05)" }}>{String.fromCharCode(65 + k)}</span>{opt}{isA && <Check size={18} strokeWidth={4} className="ml-auto" />}</div>); })}</div>
        <QuestionExplanationBox q={q} />
      </div></main>
      <footer className="flex flex-none items-center justify-between gap-2 px-5 py-3" style={{ background: C.cream, borderTop: `2px solid ${C.creamLine}` }}>
        <button type="button" aria-label="Previous question" onClick={() => setP((x) => Math.max(0, x - 1))} disabled={p === 0} className="grid h-12 w-12 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-40" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}><ChevronLeft size={22} strokeWidth={3.5} /></button>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={currentMeta.flagged ? "Remove bookmark" : "Bookmark question"} onClick={toggleBookmark} className="grid h-12 w-12 place-items-center rounded-2xl active:translate-y-0.5" style={{ background: currentMeta.flagged ? C.amberWash : C.polar, color: currentMeta.flagged ? C.amber : C.wolf }}><Bookmark size={21} strokeWidth={3} fill={currentMeta.flagged ? C.amber : "none"} /></button>
          <button type="button" onClick={openAsk} className="flex h-12 items-center gap-2 rounded-2xl px-4 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><MessageCircle size={18} strokeWidth={3} /> Ask</button>
        </div>
        <button type="button" aria-label="Next question" onClick={() => setP((x) => Math.min(list.length - 1, x + 1))} disabled={p === list.length - 1} className="grid h-12 w-12 flex-none place-items-center rounded-2xl text-white active:translate-y-0.5 disabled:opacity-40" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={22} strokeWidth={3.5} /></button>
      </footer>
      {chatOpen && (
        <div className="absolute bottom-5 right-5 z-[56] flex h-[640px] max-h-[82vh] w-[min(560px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl" style={{ background: C.white, boxShadow: "0 22px 60px rgba(17,24,39,.22)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: C.ink }}>
            <span className="flex min-w-0 items-center gap-3 font-black text-white"><AppLogo size="sm" /><span className="min-w-0"><span className="block leading-tight">DrKard</span><span className="block truncate text-xs uppercase tracking-wide text-white/70">Ask · Review {p + 1}</span></span></span>
            <button type="button" aria-label="Close ask" onClick={() => setChatOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,.2)" }}><X size={21} strokeWidth={3} color={C.white} /></button>
          </div>
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1" style={{ background: C.polar } as any}>
              <MessageScrollerViewport className="p-4">
                <MessageScrollerContent className="space-y-2.5">
                  {messages.map((m, k) => <MessageScrollerItem key={k} messageId={`review-${p}-ask-${k}`} scrollAnchor={m.role === "user"}><div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className="max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm font-bold" style={m.role === "user" ? { background: C.ink, color: C.white } : { background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}>{m.content}</div></div></MessageScrollerItem>)}
                  {sending && <MessageScrollerItem messageId={`review-${p}-thinking`}><div className="flex"><div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><Loader2 size={16} className="animate-spin" color={C.ink} /><span className="text-sm font-bold" style={{ color: C.hare }}>Thinking…</span></div></div></MessageScrollerItem>}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          <div className="flex items-center gap-2 p-3" style={{ borderTop: `2px solid ${C.swan}` }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReviewQuestion()} placeholder="Ask about this review…" className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            <button type="button" onClick={sendReviewQuestion} disabled={sending} className="grid h-11 w-11 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-50" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><Send size={20} strokeWidth={3} color={C.white} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function AIThreadViewer({ threads, start, onClose, onThreadChange, aiAllowed, onUpgrade, onSendFollowUp, sending }: { threads: AIThreadItem[]; start: number; onClose: () => void; onThreadChange?: (id: string) => void; aiAllowed?: boolean; onUpgrade?: () => void; onSendFollowUp?: (text: string, threadId: Id<"aiThreads">) => Promise<void>; sending?: boolean }) {
  const [p, setP] = useState(start);
  const [input, setInput] = useState("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setP((x) => Math.min(threads.length - 1, x + 1));
      if (e.key === "ArrowLeft") setP((x) => Math.max(0, x - 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, threads.length]);
  const thread = threads[p];
  useEffect(() => { if (thread) onThreadChange?.(thread.id); }, [onThreadChange, thread]);
  useEffect(() => { setInput(""); }, [p, thread?.id]);
  async function sendFollowUp() {
    const text = input.trim();
    if (!text || sending || !thread) return;
    if (!aiAllowed) {
      onUpgrade?.();
      return;
    }
    setInput("");
    await onSendFollowUp?.(text, thread.id);
  }
  return (
    <div className="absolute inset-0 z-[55] flex flex-col" style={{ background: C.cream }}>
      <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10 md:py-4" style={{ background: C.cream }}>
        <button type="button" aria-label="Close AI thread" onClick={onClose} className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.polar }}><X size={23} strokeWidth={3} color={C.wolf} /></button>
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-sm font-black text-white" style={{ background: C.teal }}>D</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black md:text-xl" style={{ color: C.eel }}>{thread.title}</p>
          <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>{thread.type} · {p + 1}/{threads.length}</p>
        </div>
      </header>
      <main className="min-h-0 flex-1 px-5 py-5 md:px-10">
        <div className="mx-auto flex h-full max-w-4xl flex-col rounded-3xl p-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1">
              <MessageScrollerViewport className="p-3">
                <MessageScrollerContent className="space-y-2.5">
                  {thread.messages.map((m, k) => (
                    <MessageScrollerItem key={k} messageId={`${thread.id}-${k}`} scrollAnchor={m.role === "user"}><div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className="max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm font-bold" style={m.role === "user" ? { background: C.ink, color: C.white } : { background: C.polar, color: C.eel }}>{m.content}</div></div></MessageScrollerItem>
                  ))}
                  {sending && <MessageScrollerItem messageId={`${thread.id}-thinking`}><div className="flex"><div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: C.polar }}><Loader2 size={16} className="animate-spin" color={C.ink} /><span className="text-sm font-bold" style={{ color: C.hare }}>Thinking…</span></div></div></MessageScrollerItem>}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: C.swan }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void sendFollowUp()} disabled={!aiAllowed || sending} placeholder={aiAllowed ? "Follow up in this thread…" : "Pro AI budget required…"} className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold outline-none disabled:opacity-60" style={{ background: C.polar, color: C.eel }} />
            <button type="button" onClick={() => void sendFollowUp()} disabled={sending || !input.trim() || !aiAllowed} className="grid h-11 w-11 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-50" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>{sending ? <Loader2 size={20} className="animate-spin" color={C.white} /> : <Send size={20} strokeWidth={3} color={C.white} />}</button>
          </div>
        </div>
      </main>
      <footer className="flex flex-none items-center justify-between px-5 py-3" style={{ background: C.cream, borderTop: `2px solid ${C.creamLine}` }}>
        <button type="button" aria-label="Previous AI thread" onClick={() => setP((x) => Math.max(0, x - 1))} disabled={p === 0} className="grid h-12 w-12 place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-40" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}><ChevronLeft size={22} strokeWidth={3.5} /></button>
        <button type="button" aria-label="Next AI thread" onClick={() => setP((x) => Math.min(threads.length - 1, x + 1))} disabled={p === threads.length - 1} className="grid h-12 w-12 place-items-center rounded-2xl text-white active:translate-y-0.5 disabled:opacity-40" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={22} strokeWidth={3.5} /></button>
      </footer>
    </div>
  );
}

/* ---------------- Flashcard detail + tester ---------------- */
function FlashDetail({ set, onClose, onTest, onAskHistory, examId }: { set: FlashSet; onClose: () => void; onTest: (cards: FlashCard[]) => void; onAskHistory?: (title: string, userMessage: string, assistantMessage: string, threadId?: Id<"aiThreads">) => Promise<Id<"aiThreads"> | void>; examId?: Id<"exams"> }) {
  const [search, setSearch] = useState("");
  const [count, setCount] = useState(set.cards.length);
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [askCard, setAskCard] = useState<{ card: FlashCard; index: number } | null>(null);
  const [askMessages, setAskMessages] = useState<Msg[]>([]);
  const [askInput, setAskInput] = useState("");
  const [askSending, setAskSending] = useState(false);
  const cardThreadIds = useRef<Record<number, Id<"aiThreads">>>({});
  const rows = useMemo(() => set.cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => `${flashFrontText(card)} ${flashBackText(card)}`.toLowerCase().includes(search.toLowerCase())), [search, set.cards]);
  const maxCount = Math.max(1, rows.length);
  const startCards = rows.slice(0, Math.min(count, rows.length)).map(({ card }) => card);
  const mins = Math.max(1, Math.ceil(Math.min(count, rows.length) / 2));

  useEffect(() => {
    setSearch("");
    setCount(set.cards.length);
    setMarks({});
  }, [set.cards.length, set.t]);
  useEffect(() => {
    setCount((current) => Math.min(Math.max(1, current), maxCount));
  }, [maxCount]);
  const openCardAsk = (card: FlashCard, index: number) => {
    setAskCard({ card, index });
    setAskMessages([{ role: "assistant", content: `Ask me anything about card ${index + 1}: ${flashFrontText(card)}` }]);
    setAskInput("");
  };
  async function sendCardAsk() {
    const text = askInput.trim(); if (!text || !askCard || askSending) return;
    const next = [...askMessages, { role: "user" as const, content: text }];
    setAskMessages(next); setAskInput(""); setAskSending(true);
    try {
      let api = next.slice(); while (api.length && api[0].role !== "user") api = api.slice(1);
      const result = await postChat({
        system: `Explain this flashcard. Front: "${flashFrontText(askCard.card)}". Back: "${flashBackText(askCard.card)}". Be concise.`,
        messages: api,
        examId,
        threadId: cardThreadIds.current[askCard.index],
        kind: "card",
      });
      if (!result.ok) {
        setAskMessages((m) => [...m, { role: "assistant", content: chatFailureMessage(result) }]);
        return;
      }
      const reply = result.reply;
      setAskMessages((m) => [...m, { role: "assistant", content: reply || "Try rephrasing?" }]);
      if (reply) {
        const id = await onAskHistory?.(`Card ${askCard.index + 1}: ${flashFrontText(askCard.card)}`, text, reply, cardThreadIds.current[askCard.index]);
        if (id) cardThreadIds.current[askCard.index] = id;
      }
    } catch { setAskMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the AI right now." }]); }
    finally { setAskSending(false); }
  }

  return (
    <div className="absolute inset-0 z-[55] flex flex-col" style={{ background: C.cream }}>
      <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10 md:py-4" style={{ background: C.cream }}>
        <button type="button" aria-label="Back" onClick={onClose} className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.polar }}><ArrowLeft size={23} strokeWidth={3} color={C.wolf} /></button>
        <div className="min-w-0 flex-1"><BrandLockup subtitle="Flashcards" /></div>
        <span className="flex flex-none items-center gap-1.5 rounded-2xl px-3 py-2" style={{ background: C.polar }}><Layers size={17} strokeWidth={3} color={C.wolf} /><span className="text-xs font-black" style={{ color: C.eel }}>Cards</span></span>
      </header>
      <main className="no-bar flex-1 overflow-y-auto px-5 py-5 md:px-10"><div className="mx-auto max-w-5xl">
        <div className="mb-4 rounded-3xl p-5 text-left md:p-6" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
          <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>{set.cards.length} cards · {mins} min</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl" style={{ color: C.eel }}>{set.t}</h1>
        </div>
        <div className="mb-4 flex flex-col gap-3 rounded-3xl p-4 md:flex-row md:items-center md:justify-between" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
          <div className="flex items-center justify-between gap-3 md:flex-1">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Cards to test</p>
              <p className="font-black" style={{ color: C.eel }}>{Math.min(count, rows.length)} / {rows.length || set.cards.length}</p>
            </div>
            <div className="flex flex-none items-center gap-2">
              <button type="button" aria-label="Decrease card count" onClick={() => setCount((c) => Math.max(1, c - 1))} className="grid h-9 w-9 place-items-center rounded-2xl text-xl font-black" style={{ background: C.polar, color: C.eel }}>-</button>
              <button type="button" aria-label="Increase card count" onClick={() => setCount((c) => Math.min(maxCount, c + 1))} className="grid h-9 w-9 place-items-center rounded-2xl text-xl font-black" style={{ background: C.polar, color: C.eel }}>+</button>
            </div>
          </div>
          <button type="button" onClick={() => startCards.length && onTest(startCards)} disabled={!startCards.length} className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-wide text-white outline-none transition-all duration-75 active:translate-y-0.5 disabled:opacity-40" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><Play size={17} strokeWidth={3} fill={C.white} /> Start testing</button>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search cards" />
        <div className="space-y-3">
          {rows.map(({ card, index }) => {
            const bookmarked = !!marks[index];
            return (
              <div key={index} className="rounded-3xl p-5 md:p-6" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase" style={{ background: C.inkWash, color: C.ink }}>Card {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <CardActions title={flashFrontText(card)} text={`${flashFrontText(card)}\n${flashBackText(card)}`} />
                    <button type="button" aria-label="Ask AI about card" onClick={() => openCardAsk(card, index)} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: C.tealWash, color: C.teal }}><Sparkles size={19} strokeWidth={3} /></button>
                    <button type="button" aria-label={bookmarked ? "Remove bookmark" : "Bookmark card"} onClick={() => setMarks((m) => ({ ...m, [index]: !bookmarked }))} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: bookmarked ? C.inkWash : C.polar }}><Bookmark size={19} strokeWidth={3} color={bookmarked ? C.ink : C.hare} fill={bookmarked ? C.ink : "none"} /></button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid gap-2 rounded-2xl p-4 md:grid-cols-[140px_1fr] md:items-start" style={{ background: C.polar }}>
                    <p className="text-xs font-black uppercase tracking-wide" style={{ color: C.hare }}>Question</p>
                    <FlashSideContent card={card} side="front" />
                  </div>
                  <div className="grid gap-2 rounded-2xl p-4 md:grid-cols-[140px_1fr] md:items-start" style={{ background: C.polar }}>
                    <p className="text-xs font-black uppercase tracking-wide" style={{ color: C.hare }}>Answer</p>
                    <FlashSideContent card={card} side="back" />
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-8 text-center font-bold" style={{ color: C.hare }}>No cards match your search.</p>}
        </div>
      </div></main>
      {askCard && (
        <div className="absolute bottom-5 right-5 z-[57] flex h-[560px] max-h-[75vh] w-[min(460px,calc(100vw-40px))] flex-col rounded-3xl" style={{ background: C.white, boxShadow: "0 18px 50px rgba(0,0,0,.18)" }}>
          <div className="flex items-center justify-between gap-3 rounded-t-3xl px-4 py-3" style={{ background: C.ink }}>
            <p className="min-w-0 truncate font-black text-white">AI · Card {askCard.index + 1}</p>
            <button type="button" aria-label="Close AI chat" onClick={() => setAskCard(null)} className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: "rgba(255,255,255,.18)" }}><X size={18} strokeWidth={3} color={C.white} /></button>
          </div>
          <MessageScrollerProvider autoScroll>
            <MessageScroller className="flex-1" style={{ background: C.polar } as any}>
              <MessageScrollerViewport className="p-4">
                <MessageScrollerContent className="space-y-2.5">
                  {askMessages.map((m, k) => <MessageScrollerItem key={k} messageId={`card-ask-${askCard.index}-${k}`} scrollAnchor={m.role === "user"}><div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className="max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm font-bold" style={m.role === "user" ? { background: C.ink, color: C.white } : { background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}>{m.content}</div></div></MessageScrollerItem>)}
                  {askSending && <MessageScrollerItem messageId={`card-ask-thinking-${askCard.index}`}><div className="flex"><div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><Loader2 size={16} className="animate-spin" color={C.ink} /><span className="text-sm font-bold" style={{ color: C.hare }}>Thinking...</span></div></div></MessageScrollerItem>}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>
          <div className="flex items-center gap-2 p-3" style={{ borderTop: `2px solid ${C.swan}` }}>
            <input value={askInput} onChange={(e) => setAskInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendCardAsk()} placeholder="Ask about this card..." className="flex-1 rounded-2xl px-4 py-2.5 text-sm font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
            <button type="button" onClick={sendCardAsk} disabled={askSending} className="grid h-11 w-11 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-50" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><Send size={20} strokeWidth={3} color={C.white} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
function FlashTester({ set, onClose }: { set: FlashSet; onClose: () => void }) {
  const [i, setI] = useState(0); const [flip, setFlip] = useState(false);
  const c = set.cards[i];
  return (
    <div className="absolute inset-0 z-[56] flex flex-col" style={{ background: C.cream }}>
      <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10 md:py-4" style={{ background: C.cream }}>
        <button type="button" aria-label="Close" onClick={onClose} className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.polar }}><X size={23} strokeWidth={3} color={C.wolf} /></button>
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-sm font-black text-white" style={{ background: C.teal }}>D</span>
        <p className="flex-1 truncate text-lg font-black md:text-xl" style={{ color: C.eel }}>{set.t}</p>
        <span className="text-sm font-black" style={{ color: C.hare }}>{i + 1}/{set.cards.length}</span>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-6 md:px-10">
        <button type="button" onClick={() => setFlip((f) => !f)} className="grid min-h-[420px] w-full max-w-4xl place-items-center rounded-3xl p-8 text-center active:translate-y-0.5 md:min-h-[560px]" style={{ background: flip ? C.ink : C.white, boxShadow: `0 5px 0 ${flip ? C.inkDark : C.swan}` }}>
          <div className="w-full"><p className="mb-4 text-sm font-extrabold uppercase tracking-wide md:text-base" style={{ color: flip ? "rgba(255,255,255,.6)" : C.hare }}>{flip ? "Back" : "Front · tap to flip"}</p>
            <FlashSideContent card={c} side={flip ? "back" : "front"} compact /></div>
        </button>
      </main>
      <footer className="flex flex-none items-center justify-between gap-3 px-5 py-4" style={{ background: C.cream, borderTop: `2px solid ${C.creamLine}` }}>
        <button type="button" aria-label="Previous card" onClick={() => { setFlip(false); setI((x) => Math.max(0, x - 1)); }} disabled={i === 0} className="grid h-12 w-12 place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-40" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}><ChevronLeft size={22} strokeWidth={3.5} /></button>
        <button type="button" aria-label="Flip card" onClick={() => setFlip((f) => !f)} className="grid h-12 w-12 place-items-center rounded-2xl active:translate-y-0.5" style={{ background: C.polar, color: C.eel }}><RotateCw size={20} strokeWidth={3} /></button>
        {i === set.cards.length - 1 ? <button type="button" onClick={onClose} className="rounded-2xl px-5 py-3 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>Done</button>
          : <button type="button" aria-label="Next card" onClick={() => { setFlip(false); setI((x) => Math.min(set.cards.length - 1, x + 1)); }} className="grid h-12 w-12 place-items-center rounded-2xl text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={22} strokeWidth={3.5} /></button>}
      </footer>
    </div>
  );
}

/* ---------------- Practice config ---------------- */
function PracticeConfig({ target, onStart, onClose }: { target: any; onStart: (o: { time: number; count: number }) => void; onClose: () => void }) {
  const [time, setTime] = useState(0); const [pool, setPool] = useState("Unused"); const [count, setCount] = useState(10);
  const Chip = ({ on, children, onClick }: any) => <button type="button" onClick={onClick} className="rounded-2xl px-4 py-2 text-sm font-black active:translate-y-0.5" style={on ? { background: C.ink, color: C.white, boxShadow: `0 3px 0 ${C.inkDark}` } : { background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>{children}</button>;
  return (
    <div onClick={onClose} className="absolute inset-0 z-[55] flex items-end justify-center bg-black/45 p-4 md:items-center">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl p-6 md:p-7" style={{ background: C.white, boxShadow: "0 22px 60px rgba(0,0,0,.2)" }}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl" style={{ background: C.tealWash, color: C.teal }}><BookOpen size={24} strokeWidth={3} /></span>
            <div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Practice setup</p><h3 className="truncate text-3xl font-black" style={{ color: C.eel }}>{target.n}</h3></div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: C.polar }}><X size={21} strokeWidth={3} color={C.wolf} /></button>
        </div>
        <p className="mb-2 text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Time limit</p>
        <div className="mb-4 flex flex-wrap gap-2">{[0, 5, 10, 20].map((m) => <Chip key={m} on={time === m} onClick={() => setTime(m)}>{m === 0 ? "Untimed" : `${m} min`}</Chip>)}</div>
        <p className="mb-2 text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Questions from</p>
        <div className="mb-4 flex flex-wrap gap-2">{["Unused", "Used", "Incorrect", "Bookmarked"].map((p) => <Chip key={p} on={pool === p} onClick={() => setPool(p)}>{p === "Bookmarked" ? <span className="inline-flex items-center gap-1"><Bookmark size={14} strokeWidth={3} /> Bookmark</span> : p}</Chip>)}</div>
        <p className="mb-2 text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Number of questions</p>
        <div className="mb-5 flex items-center gap-3">
          <button type="button" onClick={() => setCount((c) => Math.max(5, c - 5))} className="grid h-10 w-10 place-items-center rounded-2xl text-xl font-black" style={{ background: C.polar, color: C.eel }}>–</button>
          <span className="w-12 text-center text-2xl font-black" style={{ color: C.eel }}>{count}</span>
          <button type="button" onClick={() => setCount((c) => Math.min(40, c + 5))} className="grid h-10 w-10 place-items-center rounded-2xl text-xl font-black" style={{ background: C.polar, color: C.eel }}>+</button>
        </div>
        <Primary onClick={() => onStart({ time, count })} full><Play size={20} strokeWidth={3} fill={C.white} /> Start practice</Primary>
      </div>
    </div>
  );
}

/* ---------------- Exam intro (with count selector) ---------------- */
function ExamIntro({ mode, onStart, onClose }: { mode: any; onStart: (count: number) => void; onClose: () => void }) {
  const [count, setCount] = useState(mode.n);
  return (
    <div onClick={onClose} className="absolute inset-0 z-[55] flex items-center justify-center bg-black/45 p-5">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl p-6 text-center" style={{ background: C.white }}>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl" style={{ background: C.inkWash, color: C.ink }}><mode.icon size={30} strokeWidth={2.5} /></span>
        <h3 className="mt-4 text-2xl font-black" style={{ color: C.eel }}>{mode.t}</h3>
        <p className="mt-1 font-bold" style={{ color: C.wolf }}>{mode.d}</p>
        <p className="mb-2 mt-5 text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Number of questions</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setCount((c: number) => Math.max(1, c - 5))} className="grid h-10 w-10 place-items-center rounded-2xl text-xl font-black" style={{ background: C.polar, color: C.eel }}>–</button>
          <span className="w-12 text-center text-2xl font-black" style={{ color: C.eel }}>{count}</span>
          <button type="button" onClick={() => setCount((c: number) => Math.min(50, c + 5))} className="grid h-10 w-10 place-items-center rounded-2xl text-xl font-black" style={{ background: C.polar, color: C.eel }}>+</button>
        </div>
        <p className="mt-3 text-sm font-bold" style={{ color: C.hare }}>{mode.dur ? `${mode.dur / 60} minute limit` : "Untimed"}</p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl py-3.5 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>Cancel</button>
          <button type="button" onClick={() => onStart(count)} className="flex-[2] rounded-2xl py-3.5 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 4px 0 ${C.inkDark}` }}>Start</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Session popup ---------------- */
function SessionPopup({ s, onResume, onRestart, onClose }: { s: any; onResume: () => void; onRestart: () => void; onClose: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-[55] flex items-center justify-center bg-black/45 p-5">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: C.white }}>
        <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>{s.date}</p>
        <h3 className="text-2xl font-black" style={{ color: C.eel }}>{s.title}</h3>
        <p className="mt-1 font-bold" style={{ color: C.wolf }}>Score <span style={{ color: C.green }}>{s.score}%</span> · {s.total} questions</p>
        <div className="mt-5 space-y-2.5">
          <button type="button" onClick={onResume} className="w-full rounded-2xl py-3.5 font-black uppercase tracking-wide text-white active:translate-y-0.5" style={{ background: C.ink, boxShadow: `0 4px 0 ${C.inkDark}` }}>Resume</button>
          <button type="button" onClick={onRestart} className="w-full rounded-2xl py-3.5 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.white, color: C.eel, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>Restart</button>
          <button type="button" onClick={onClose} className="w-full rounded-2xl py-3.5 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>Report</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Exam detail ---------------- */
const E_TABS = [
  { id: "learn", label: "Learn", icon: Layers, color: "#7C3AED" },
  { id: "practice", label: "Practice", icon: BookOpen, color: "#2E9E5B" },
  { id: "exam", label: "Exam", icon: GraduationCap, color: "#2B57D6" },
  { id: "analysis", label: "Analysis", icon: BarChart3, color: "#E8A33D" },
  { id: "review", label: "Review", icon: RefreshCw, color: "#E5484D" },
  { id: "ask", label: "Ask", icon: Sparkles, color: "#0E7490" },
] as const;

type ExamItem = { _id?: Id<"exams">; slug?: string; title: string; role: string };
function ExamDetail({
  exam,
  onBack,
  onUpgrade,
  onDashboard,
  initialTab,
  initialFlashSlug,
  initialQuizSlug,
  initialQuizResult,
  initialAiThreadId,
  initialPracticeSlug,
  initialFlashTest,
  initialNoteSlug,
  aiAllowed,
  isPro,
  questionsRemaining,
  aiUsedUsd,
  aiBudgetUsd,
  aiRemainingUsd,
  onManageBilling,
  onTabChange,
  onFlashSlugChange,
  onQuizRouteChange,
  onAiThreadChange,
  onPracticeSlugChange,
  onFlashTestChange,
  onNoteSlugChange,
}: {
  exam: ExamItem;
  onBack: () => void;
  onUpgrade: () => void;
  onDashboard?: () => void;
  initialTab?: string;
  initialFlashSlug?: string | null;
  initialQuizSlug?: string | null;
  initialQuizResult?: boolean;
  initialAiThreadId?: string | null;
  initialPracticeSlug?: string | null;
  initialFlashTest?: boolean;
  initialNoteSlug?: string | null;
  aiAllowed?: boolean;
  isPro?: boolean;
  questionsRemaining?: number | null;
  aiUsedUsd?: number | null;
  aiBudgetUsd?: number | null;
  aiRemainingUsd?: number | null;
  onManageBilling?: () => void;
  onTabChange?: (tab: string) => void;
  onFlashSlugChange?: (slug: string | null) => void;
  onQuizRouteChange?: (slug: string | null, result?: boolean) => void;
  onAiThreadChange?: (id: string | null) => void;
  onPracticeSlugChange?: (slug: string | null) => void;
  onFlashTestChange?: (active: boolean) => void;
  onNoteSlugChange?: (slug: string | null) => void;
}) {
  const { isSignedIn } = useAuth();
  const [cloudQuestions, setCloudQuestions] = useState<CloudQuestion[]>([]);
  const [examState, setExamState] = useState<ExamState>(EMPTY_EXAM_STATE);
  const cloudThreads = examState.threads;
  const cloudSessions = examState.sessions;
  const cloudProgress = examState.progress;
  const [viewThreadId, setViewThreadId] = useState<string | null>(() => parseAiThreadId(initialAiThreadId));
  const viewMessages = useMemo(() => examState.messages.filter((message) => message.threadId === viewThreadId), [examState.messages, viewThreadId]);
  const explainThreads = useRef<Record<number, Id<"aiThreads">>>({});
  const noteThreads = useRef<Record<string, Id<"aiThreads">>>({});
  const examId = exam._id ?? exam.slug ?? slugify(exam.title);
  const examSlug = exam.slug ?? slugify(exam.title);
  const refreshExamState = React.useCallback(async () => {
    if (!isSignedIn || !examId) {
      setExamState(EMPTY_EXAM_STATE);
      return;
    }
    const res = await fetch(`/api/exam-state?examId=${encodeURIComponent(examId)}`);
    const data = (await res.json().catch(() => EMPTY_EXAM_STATE)) as ExamState;
    if (res.ok) setExamState({ ...EMPTY_EXAM_STATE, ...data });
  }, [examId, isSignedIn]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/banks/${encodeURIComponent(examSlug)}`)
      .then(async (res) => (await res.json()) as { questions?: CloudQuestion[] })
      .then((data) => {
        if (alive) setCloudQuestions(data.questions ?? []);
      })
      .catch(() => {
        if (alive) setCloudQuestions([]);
      });
    return () => { alive = false; };
  }, [examSlug]);
  useEffect(() => {
    void refreshExamState();
  }, [refreshExamState]);
  const [t, setT] = useState(initialTab && E_TABS.some((x) => x.id === initialTab) ? initialTab : DEFAULT_EXAM_TAB);
  useEffect(() => {
    if (initialTab && E_TABS.some((x) => x.id === initialTab) && initialTab !== t) setT(initialTab);
  }, [initialTab, t]);
  const selectTab = (next: string) => {
    setT(next);
    onTabChange?.(next);
  };
  const [pSub, setPSub] = useState("Subjects"); const [aSub, setASub] = useState("Subjects"); const [cSub, setCSub] = useState("Notes"); const [nSub, setNSub] = useState("Subjects");
  const [rev, setRev] = useState("All"); const [search, setSearch] = useState(""); const [askFilter, setAskFilter] = useState("All");
  const [reviewPage, setReviewPage] = useState(0);
  const [cfg, setCfg] = useState<any>(null); const [intro, setIntro] = useState<any>(null);
  const [runner, setRunner] = useState<any>(null); const [viewer, setViewer] = useState<number | null>(null);
  const [aiViewer, setAiViewer] = useState<number | null>(null);
  const [askInput, setAskInput] = useState("");
  const [askSending, setAskSending] = useState(false);
  const [threadFollowUpSending, setThreadFollowUpSending] = useState(false);
  const [noteChat, setNoteChat] = useState<{ key: string; note: (typeof NOTES)[number] } | null>(null);
  const [noteChats, setNoteChats] = useState<Record<string, Msg[]>>({});
  const [noteInput, setNoteInput] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [imageViewer, setImageViewer] = useState<number | null>(null);
  const [sess, setSess] = useState<any>(null); const [flash, setFlash] = useState<any>(null); const [flashTest, setFlashTest] = useState<any>(null);
  const [secs, setSecs] = useState(1200); const [marks, setMarks] = useState<Record<string, boolean>>({});
  // Per-question status/flag, keyed by Cloudflare question id.
  const progressByQuestion = useMemo(() => {
    const m = new Map<string, { status: string; flagged: boolean }>();
    for (const p of cloudProgress ?? []) m.set(p.questionId, { status: p.status, flagged: p.flagged });
    return m;
  }, [cloudProgress]);
  const qbank = useMemo(() => {
    return (cloudQuestions ?? []).map((q: CloudQuestion) => {
      const pr = progressByQuestion.get(q._id);
      return {
        _id: q._id,
        q: q.prompt,
        o: q.options,
        a: q.answerIndex,
        s: q.subject,
        st: pr?.status ?? "unused",
        flagged: pr?.flagged ?? false,
        e: q.explanation,
        tags: q.tags ?? [],
      };
    });
  }, [cloudQuestions, progressByQuestion]);
  // Subject rows with real used/unused/incorrect counts derived from progress.
  const subjectRows = useMemo(() => {
    const by = new Map<string, { total: number; used: number; inc: number; correct: number }>();
    for (const q of qbank) {
      const row = by.get(q.s) ?? { total: 0, used: 0, inc: 0, correct: 0 };
      row.total += 1;
      if (q.st !== "unused") row.used += 1;
      if (q.st === "incorrect") row.inc += 1;
      if (q.st === "correct") row.correct += 1;
      by.set(q.s, row);
    }
    return [...by.entries()].map(([n, v]) => ({ n, used: v.used, unused: v.total - v.used, inc: v.inc, correct: v.correct, total: v.total }));
  }, [qbank]);
  // Tag rows, also derived from real question tags + progress.
  const tagRows = useMemo(() => {
    const by = new Map<string, { total: number; used: number; inc: number; correct: number }>();
    for (const q of qbank) {
      for (const tag of q.tags) {
        const row = by.get(tag) ?? { total: 0, used: 0, inc: 0, correct: 0 };
        row.total += 1;
        if (q.st !== "unused") row.used += 1;
        if (q.st === "incorrect") row.inc += 1;
        if (q.st === "correct") row.correct += 1;
        by.set(tag, row);
      }
    }
    return [...by.entries()].map(([n, v]) => ({ n, used: v.used, unused: v.total - v.used, inc: v.inc, correct: v.correct, total: v.total }));
  }, [qbank]);
  const analysisRows = useMemo(() => {
    const bySubject = new Map<string, { c: number; i: number }>();
    for (const q of qbank) {
      const row = bySubject.get(q.s) ?? { c: 0, i: 0 };
      if (q.st === "correct") row.c += 1;
      else if (q.st === "incorrect") row.i += 1;
      bySubject.set(q.s, row);
    }
    return [...bySubject.entries()].map(([n, v]) => ({ n, c: v.c, i: v.i }));
  }, [qbank]);
  const sessionRows = useMemo(() => {
    return (cloudSessions ?? []).map((s) => ({
      date: new Date(s._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      title: s.title,
      score: s.total ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
    }));
  }, [cloudSessions]);
  const pickLocal = (n: number, subject?: string) => {
    const pool = subject ? qbank.filter((q) => q.s === subject) : qbank;
    return Array.from({ length: Math.max(1, n) }, (_, k) => pool[k % Math.max(1, pool.length)]).filter(Boolean);
  };
  const [meta, setMetaState] = useState<Record<number, { status: string; flagged: boolean }>>({});
  const setMeta = (idx: number, patch: any) => {
    const prev = meta[idx] ?? { status: qbank[idx]?.st ?? "unused", flagged: qbank[idx]?.flagged ?? false };
    const next = { ...prev, ...patch };
    setMetaState((m) => ({ ...m, [idx]: next }));
    // Persist the Review status/flag change for the signed-in user.
    const target = qbank[idx];
    if (isSignedIn && examId && target?._id) {
      fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, questionId: target._id, status: next.status, flagged: next.flagged }),
      }).then(() => refreshExamState()).catch(() => {});
    }
  };
  const threadItems: AIThreadItem[] = useMemo(() => {
    return (cloudThreads ?? []).map((thread) => ({
      id: thread._id,
      type: kindLabel(thread.kind),
      title: thread.title,
      messages:
        viewThreadId === thread._id
          ? (viewMessages ?? []).map((message) => ({
              role: message.role as "user" | "assistant",
              content: message.content,
            }))
          : [],
    }));
  }, [cloudThreads, viewMessages, viewThreadId]);

  async function persistAiExchange(
    kind: string,
    title: string,
    userMessage: string,
    assistantMessage: string,
    questionId?: Id<"questions">,
    threadId?: Id<"aiThreads">,
  ): Promise<Id<"aiThreads"> | void> {
    if (!isSignedIn || !examId || !assistantMessage) return;
    try {
      const res = await fetch("/api/ai/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        threadId,
        kind,
        examId,
        questionId,
        title,
        userMessage,
        assistantMessage,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { threadId?: string };
      const nextThreadId = data.threadId;
      if (!nextThreadId) return;
      if (!threadId) {
        setViewThreadId(nextThreadId);
        onAiThreadChange?.(nextThreadId);
      }
      await refreshExamState();
      return nextThreadId;
    } catch {
      /* ignore persistence errors in UI */
    }
  }

  async function sendThreadFollowUp(text: string, threadId: Id<"aiThreads">) {
    if (!text.trim() || threadFollowUpSending || !examId) return;
    if (!aiAllowed) {
      onUpgrade();
      return;
    }
    setThreadFollowUpSending(true);
    try {
      const history = (viewMessages ?? []).map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));
      const kind = cloudThreads?.find((row) => row._id === threadId)?.kind ?? "ask";
      const result = await postChat({
        system: `You are DrKard's study assistant for ${exam.title}. Be concise.`,
        messages: [...history, { role: "user", content: text.trim() }],
        examId,
        threadId,
        kind,
      });
      if (!result.ok) {
        if (result.code === "pro_required") onUpgrade();
        return;
      }
      await persistAiExchange(kind, text.trim().slice(0, 80), text.trim(), result.reply, undefined, threadId);
    } finally {
      setThreadFollowUpSending(false);
    }
  }

  async function sendAskThread() {
    const text = askInput.trim();
    if (!text || askSending || !examId) return;
    if (!aiAllowed) {
      onUpgrade();
      return;
    }
    setAskSending(true);
    setAskInput("");
    try {
      const result = await postChat({
        system: `You are DrKard's study assistant for ${exam.title}. Be concise.`,
        messages: [{ role: "user", content: text }],
        examId,
        kind: "ask",
      });
      if (!result.ok) {
        if (result.code === "pro_required") onUpgrade();
        return;
      }
      if (result.reply) await persistAiExchange("ask", text, text, result.reply);
    } catch {
      /* network error */
    } finally {
      setAskSending(false);
    }
  }

  useEffect(() => { const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { setSearch(""); }, [t]);
  useEffect(() => { setReviewPage(0); setViewer(null); }, [rev, search]);
  useEffect(() => {
    if (!initialFlashSlug) {
      setFlash(null);
      onFlashTestChange?.(false);
      return;
    }
    const found = FLASHSETS.find((s) => slugify(s.t) === initialFlashSlug);
    if (found) {
      setCSub("Flashcards");
      setFlash(found);
      if (initialFlashTest) setFlashTest(found);
    }
  }, [initialFlashSlug, initialFlashTest, onFlashTestChange]);
  useEffect(() => {
    if (!initialPracticeSlug) return;
    const subject = decodeURIComponent(initialPracticeSlug);
    setCfg({ n: subject });
  }, [initialPracticeSlug]);
  useEffect(() => {
    if (!initialNoteSlug) return;
    const note = NOTES.find((n) => slugify(n.t) === decodeURIComponent(initialNoteSlug));
    if (!note) return;
    const key = slugify(note.t);
    setNoteChat({ key, note });
    setNoteInput("");
    setNoteChats((c) => c[key] ? c : { ...c, [key]: [{ role: "assistant", content: `Note: ${note.t}\n\n${note.lines.join("\n")}\n\nAsk me anything about this note.` }] });
  }, [initialNoteSlug]);
  useEffect(() => {
    if (!initialQuizSlug) return;
    const found = MODES.find((m) => slugify(m.t) === initialQuizSlug);
    if (!found) return;
    setT("exam");
    if (!initialQuizResult && !runner) setIntro(found);
  }, [initialQuizResult, initialQuizSlug, runner]);
  useEffect(() => {
    setMetaState(Object.fromEntries(qbank.map((q, i) => [i, { status: q.st, flagged: q.flagged }])));
  }, [qbank]);
  useEffect(() => {
    const parsed = parseAiThreadId(initialAiThreadId);
    if (!parsed) return;
    setViewThreadId(parsed);
    setT("ask");
    const index = (cloudThreads ?? []).findIndex((thread) => thread._id === parsed);
    if (index >= 0) setAiViewer(index);
  }, [cloudThreads, initialAiThreadId]);
  useEffect(() => {
    if (imageViewer === null) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImageViewer(null);
      if (e.key === "ArrowRight") setImageViewer((x) => x === null ? x : Math.min(IMAGE_ITEMS.length - 1, x + 1));
      if (e.key === "ArrowLeft") setImageViewer((x) => x === null ? x : Math.max(0, x - 1));
      if (e.key.toLowerCase() === "f") setMarks((m) => ({ ...m, [`image-${imageViewer}`]: !m[`image-${imageViewer}`] }));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [imageViewer]);

  async function saveFinishedSession(payload: { answers: { questionId?: Id<"questions">; selected: number; correct: boolean }[]; elapsedSec: number }) {
    if (!examId || !isSignedIn) return;
    const answers = payload.answers.filter((a): a is { questionId: Id<"questions">; selected: number; correct: boolean } => Boolean(a.questionId));
    if (!answers.length) return;
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
      examId,
      title: runner?.title ?? "Practice session",
      durationSec: payload.elapsedSec,
      answers,
      }),
    });
    await refreshExamState();
  }

  const openNoteChat = (note: (typeof NOTES)[number]) => {
    const key = slugify(note.t);
    setNoteChat({ key, note });
    setNoteInput("");
    onNoteSlugChange?.(key);
    setNoteChats((c) => c[key] ? c : { ...c, [key]: [{ role: "assistant", content: `Note: ${note.t}\n\n${note.lines.join("\n")}\n\nAsk me anything about this note.` }] });
  };
  async function sendNoteChat() {
    const text = noteInput.trim();
    if (!text || !noteChat || noteSending) return;
    const key = noteChat.key;
    const current = noteChats[key] ?? [];
    const next = [...current, { role: "user" as const, content: text }];
    setNoteChats((c) => ({ ...c, [key]: next }));
    setNoteInput("");
    setNoteSending(true);
    try {
      let api = next.slice(); while (api.length && api[0].role !== "user") api = api.slice(1);
      const result = await postChat({
        system: `Explain this medical study note. Title: "${noteChat.note.t}". Note:\n${noteChat.note.lines.join("\n")}\nBe concise and useful.`,
        messages: api,
        examId,
        threadId: noteThreads.current[key],
        kind: "note",
      });
      if (!result.ok) {
        setNoteChats((c) => ({ ...c, [key]: [...next, { role: "assistant", content: chatFailureMessage(result) }] }));
        return;
      }
      const reply = result.reply;
      setNoteChats((c) => ({ ...c, [key]: [...next, { role: "assistant", content: reply || "Try rephrasing?" }] }));
      if (reply) {
        const id = await persistAiExchange("note", `Note: ${noteChat.note.t}`, text, reply, undefined, noteThreads.current[key]);
        if (id) noteThreads.current[key] = id;
      }
    } catch { setNoteChats((c) => ({ ...c, [key]: [...next, { role: "assistant", content: "Couldn't reach the AI right now." }] })); }
    finally { setNoteSending(false); }
  }

  const tabLabel = E_TABS.find((x) => x.id === t)!.label;
  const { color, wash } = examColor(exam.title);
  const has = (s: string) => s.toLowerCase().includes(search.toLowerCase());
  const Chips = ({ items, val, set }: any) => (
    <div className="mb-4 flex justify-center gap-2 overflow-x-auto pb-1">{items.map((s: string) => { const on = val === s; return (
      <button key={s} type="button" onClick={() => set(s)} className="flex-none rounded-2xl px-4 py-2 text-sm font-extrabold uppercase outline-none active:translate-y-0.5" style={on ? { background: C.ink, color: C.white, boxShadow: `0 3px 0 ${C.inkDark}` } : { background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>{s}</button>); })}</div>
  );

  const body = () => {
    if (t === "practice") { const rows = (pSub === "Subjects" ? subjectRows : tagRows).filter((r) => has(r.n));
      return <><Chips items={["Subjects", "Tags"]} val={pSub} set={setPSub} />
        {rows.length === 0 ? <EmptyState icon={BookOpen} title="No practice sets yet" body="Answer questions or add content so practice subjects and tags can appear here." /> : <div className="flex flex-col gap-3">{rows.map((r, i) => { const accent = ACCENTS[i % ACCENTS.length]; const pct = r.used ? Math.round((r.correct / r.used) * 100) : 0; return (
          <button key={i} type="button" onClick={() => { setCfg(r); onPracticeSlugChange?.(slugify(r.n)); }} className="flex items-center gap-4 rounded-[1.7rem] p-4 text-left active:translate-y-0.5 md:p-5" style={{ background: C.white, border: `2px solid ${C.inkWash}`, boxShadow: `0 5px 0 ${C.swan}` }}>
            <span className="grid h-14 w-14 flex-none place-items-center rounded-3xl text-white" style={{ background: accent, boxShadow: `0 4px 0 ${C.inkDark}` }}><BookOpen size={27} strokeWidth={2.75} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3"><p className="truncate text-lg font-black" style={{ color: C.eel }}>{r.n}</p><p className="text-base font-black" style={{ color: C.eel }}>{pct}%</p></div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full" style={{ background: C.swan }}><div className="h-full rounded-full" style={{ width: `${Math.round((r.used / Math.max(1, r.total)) * 100)}%`, background: accent }} /></div>
              <p className="mt-2 text-sm font-extrabold" style={{ color: C.wolf }}>{r.used}/{r.total} done · {r.correct} correct · {r.inc} incorrect</p>
            </div>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={20} strokeWidth={3.5} color={C.white} /></span></button>); })}</div>}</>; }

    if (t === "learn") {
      if (cSub === "Images") return <><Chips items={["Notes", "Flashcards", "Images"]} val={cSub} set={setCSub} />
        <div className="grid grid-cols-2 gap-3">{IMAGE_ITEMS.filter((img, i) => has(`${img.title} image ${i + 1}`)).map((img, i) => (
          <button key={img.title} type="button" onClick={() => setImageViewer(i)} className="group overflow-hidden rounded-3xl text-left active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
            <div className="aspect-[4/3] w-full" style={{ background: img.color }} />
            <div className="p-4">
              <p className="font-black" style={{ color: C.eel }}>{img.title}</p>
              <p className="mt-1 text-sm font-bold" style={{ color: C.wolf }}>{img.prompt}</p>
            </div>
          </button>))}</div></>;
      if (cSub === "Flashcards") return <><Chips items={["Notes", "Flashcards", "Images"]} val={cSub} set={setCSub} />
        <div className="flex flex-col gap-3">{FLASHSETS.filter((s) => has(s.t)).map((s, i) => (
          <button key={i} type="button" onClick={() => { setFlash(s); onFlashSlugChange?.(slugify(s.t)); }} className="flex items-center gap-3 rounded-2xl p-3 text-left active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: wash, color }}><Layers size={20} strokeWidth={2.75} /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-extrabold" style={{ color: C.eel }}>{s.t}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{s.cards.length} cards</p></div>
            <ChevronRight size={20} strokeWidth={3} color={C.hare} /></button>))}</div></>;
      // notes — grouped by subject, high-yield, max 5 lines, bookmark
      return <><Chips items={["Notes", "Flashcards", "Images"]} val={cSub} set={setCSub} />
        {nSub === "Subjects" ? <div className="flex flex-col gap-3">{Array.from(new Set(NOTES.map((n) => n.s))).filter((subject) => has(subject)).map((subject) => {
          const count = NOTES.filter((n) => n.s === subject).length;
          const cc = examColor(subject);
          return <button key={subject} type="button" onClick={() => setNSub(subject)} className="flex items-center gap-3 rounded-2xl p-4 text-left active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: cc.wash, color: cc.color }}><StickyNote size={20} strokeWidth={2.75} /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-extrabold" style={{ color: C.eel }}>{subject}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{count} note{count === 1 ? "" : "s"}</p></div>
            <ChevronRight size={20} strokeWidth={3} color={C.hare} />
          </button>;
        })}</div> : <>
        <button type="button" onClick={() => setNSub("Subjects")} className="mb-4 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black active:translate-y-0.5" style={{ background: C.white, color: C.eel, boxShadow: `0 3px 0 ${C.swan}` }}><ChevronLeft size={17} strokeWidth={3.5} /> Subjects</button>
        <div className="flex flex-col gap-3">{NOTES.filter((n) => n.s === nSub && has(`${n.s} ${n.t}`)).map((n) => { const bk = !!marks["note" + n.t]; return (
          <div key={n.t} className="rounded-3xl p-5 md:p-6" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: C.inkWash, color: C.ink }}>High-yield</span><span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: C.tealWash, color: C.teal }}>{n.s}</span></div>
                <p className="truncate text-xl font-black md:text-2xl" style={{ color: C.eel }}>{n.t}</p>
              </div>
              <div className="flex items-center gap-2">
                <CardActions title={n.t} text={`${n.t}\n${n.lines.join("\n")}`} />
                <button type="button" aria-label="Ask AI about note" onClick={() => openNoteChat(n)} className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: C.tealWash, color: C.teal }}><Sparkles size={20} strokeWidth={3} /></button>
                <button type="button" aria-label="Bookmark" onClick={() => setMarks((m) => ({ ...m, ["note" + n.t]: !bk }))} className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: bk ? C.inkWash : C.polar }}><Bookmark size={20} strokeWidth={3} color={bk ? C.ink : C.hare} fill={bk ? C.ink : "none"} /></button>
              </div>
            </div>
            <ul className="mt-4 space-y-2">{n.lines.slice(0, 5).map((l, k) => <li key={k} className="flex gap-3 text-base font-bold leading-relaxed md:text-lg" style={{ color: C.wolf }}><span style={{ color: C.ink }}>•</span><span>{l}</span></li>)}</ul>
            {n.table && <NoteTable headers={n.table.headers} rows={n.table.rows} />}
          </div>); })}</div></>}</>; }

    if (t === "exam") return <div className="flex flex-col gap-3">{MODES.filter((m) => has(m.t)).map((m, idx) => {
      const accent = [C.teal, C.blue, C.red, C.green, C.amber, C.purple, C.ink][idx % 7];
      return (
        <button key={m.t} type="button" onClick={() => { setIntro(m); onQuizRouteChange?.(slugify(m.t), false); }} className="flex items-center gap-4 rounded-[1.7rem] p-4 text-left active:translate-y-0.5 md:p-5" style={{ background: C.white, border: `2px solid ${C.inkWash}`, boxShadow: `0 5px 0 ${C.swan}` }}>
          <span className="grid h-14 w-14 flex-none place-items-center rounded-3xl text-white" style={{ background: accent, boxShadow: `0 4px 0 ${C.inkDark}` }}><m.icon size={27} strokeWidth={2.75} /></span>
          <div className="min-w-0 flex-1"><p className="mb-1 font-black" style={{ color: C.eel }}>{m.t}</p><p className="text-sm font-bold" style={{ color: C.wolf }}>{m.d}</p></div>
          <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={20} strokeWidth={3.5} color={C.white} /></span>
        </button>
      );
    })}</div>;

    if (t === "analysis") {
      if (aSub === "Sessions") return <><Chips items={["Subjects", "Tags", "Sessions"]} val={aSub} set={setASub} />
        {sessionRows.filter((s) => has(s.title)).length === 0 ? <EmptyState icon={Clock} title="No sessions yet" body="Finish a quiz or practice set to see your session history and scores here." /> : <div className="flex flex-col gap-3">{sessionRows.filter((s) => has(s.title)).map((s, i) => (
          <button key={i} type="button" onClick={() => setSess(s)} className="flex items-center gap-3 rounded-2xl p-3 text-left active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl text-sm font-black text-white" style={{ background: C.ink }}>{s.score}%</span>
            <div className="min-w-0 flex-1"><p className="truncate font-extrabold" style={{ color: C.eel }}>{s.title}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{s.date} · {s.total} questions</p></div>
            <ChevronRight size={20} strokeWidth={3} color={C.hare} /></button>))}</div>}</>;
      const data = analysisRows.filter((b) => has(b.n)); const tc = analysisRows.reduce((a, b) => a + b.c, 0), ti = analysisRows.reduce((a, b) => a + b.i, 0), ov = Math.round(tc / Math.max(1, tc + ti) * 100);
      return <><Chips items={["Subjects", "Tags", "Sessions"]} val={aSub} set={setASub} />
        {data.length === 0 ? <EmptyState icon={BarChart3} title="No analysis yet" body="Complete questions to build subject performance, mistakes, and score trends." /> : <>
        <div className="mb-4 rounded-2xl p-5" style={{ background: C.white, boxShadow: `0 4px 0 ${C.swan}` }}>
          <p className="text-sm font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Overall score</p><p className="text-5xl font-black" style={{ color: C.eel }}>{ov}%</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full" style={{ background: C.swan }}><div className="h-full rounded-full" style={{ width: `${ov}%`, background: C.ink }} /></div></div>
        <div className="flex flex-col gap-3">{data.map((b) => { const p = Math.round(b.c / (b.c + b.i) * 100); return (
          <div key={b.n} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <p className="min-w-0 flex-1 truncate font-extrabold" style={{ color: C.eel }}>{b.n}</p>
            <span className="flex items-center gap-1 font-extrabold" style={{ color: C.green }}><Check size={16} strokeWidth={4} />{b.c}</span>
            <span className="flex items-center gap-1 font-extrabold" style={{ color: C.red }}><X size={16} strokeWidth={4} />{b.i}</span>
            <span className="w-12 text-right font-black" style={{ color: C.eel }}>{p}%</span></div>); })}</div></>}</>; }

    if (t === "review") { const all = qbank.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => { const m = meta[idx] ?? { status: q.st, flagged: false }; const okF = rev === "All" || (rev === "Flagged" ? m.flagged : m.status === rev.toLowerCase()); return okF && has(q.q); });
      const pageSize = 6;
      const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
      const page = Math.min(reviewPage, pageCount - 1);
      const start = page * pageSize;
      const visible = all.slice(start, start + pageSize);
      return <><Chips items={["All", "Incorrect", "Flagged", "Correct"]} val={rev} set={setRev} />
        <div className="flex flex-col gap-3">{visible.map(({ q, idx }, p) => { const m = meta[idx] ?? { status: q.st, flagged: false }; const s = ST[m.flagged ? "flagged" : m.status] || ST.used; return (
          <button key={idx} type="button" onClick={() => setViewer(start + p)} className="flex items-center gap-3 rounded-2xl p-3 text-left active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: C.inkWash, color: C.ink }}><BookOpen size={20} strokeWidth={2.75} /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-extrabold" style={{ color: C.eel }}>{q.q}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{q.s}</p></div>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: s.wash, color: s.c }}><s.I size={12} strokeWidth={3.5} />{s.label}</span>
            <Eye size={18} strokeWidth={3} color={C.hare} /></button>); })}</div>
        {all.length > pageSize && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-3xl p-2" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <button type="button" aria-label="Previous page" onClick={() => setReviewPage((x) => Math.max(0, x - 1))} disabled={page === 0} className="grid h-11 w-11 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-35" style={{ background: C.polar, color: C.eel }}><ChevronLeft size={21} strokeWidth={3.5} /></button>
            <div className="min-w-0 text-center">
              <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Page {page + 1} of {pageCount}</p>
              <p className="text-sm font-black" style={{ color: C.eel }}>{start + 1}-{Math.min(start + pageSize, all.length)} of {all.length}</p>
            </div>
            <button type="button" aria-label="Next page" onClick={() => setReviewPage((x) => Math.min(pageCount - 1, x + 1))} disabled={page >= pageCount - 1} className="grid h-11 w-11 flex-none place-items-center rounded-2xl text-white active:translate-y-0.5 disabled:opacity-35" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={21} strokeWidth={3.5} /></button>
          </div>
        )}
        {all.length === 0 && <p className="py-10 text-center font-bold" style={{ color: C.hare }}>No review questions match your search.</p>}
        {/* viewer */}
        {viewer !== null && <ReviewViewer list={all} start={viewer} meta={meta} setMeta={setMeta} examTitle={exam.title} filterLabel={rev} examId={examId} onClose={() => setViewer(null)} onAskHistory={(title, userMessage, assistantMessage, threadId) => persistAiExchange("review", title, userMessage, assistantMessage, undefined, threadId)} />}</>; }

    // ask
    const filteredThreads = threadItems.filter((thread) => {
      const okType = askFilter === "All" || thread.type === askFilter.slice(0, -1) || thread.type === askFilter;
      return okType && has(thread.title);
    });
    return <><Chips items={["All", "Questions", "Cards", "Notes", "Reviews"]} val={askFilter} set={setAskFilter} />
      {!aiAllowed && (
        <div className="mb-4 rounded-2xl p-4 text-sm font-bold" style={{ background: C.amberWash, color: C.eel }}>
          {isPro
            ? `Monthly AI budget reached ($${aiBudgetUsd?.toFixed(2) ?? "2.00"}). Resets on the 1st of next month.`
            : "AI assistant is included with Pro. Upgrade to ask questions and save chat history."}
        </div>
      )}
      {filteredThreads.length === 0 ? <EmptyState icon={Sparkles} title="No AI questions yet" body="Ask a question below or use AI on a question, review, note, or flashcard." action={aiAllowed ? null : <button type="button" onClick={onUpgrade} className="rounded-2xl px-4 py-2 text-sm font-black uppercase text-white" style={{ background: C.teal }}>Upgrade to Pro</button>} /> : (
        <div className="flex flex-col gap-3">{filteredThreads.map((thread, p) => (
          <button key={thread.id} type="button" onClick={() => { setViewThreadId(thread.id); setAiViewer(p); onAiThreadChange?.(thread.id); }} className="flex items-center gap-3 rounded-2xl p-3 text-left active:translate-y-0.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl" style={{ background: C.tealWash, color: C.teal }}><Sparkles size={20} strokeWidth={2.75} /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-extrabold" style={{ color: C.eel }}>{thread.title}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{thread.type} · {cloudThreads?.find((row) => row._id === thread.id)?.messageCount ?? thread.messages.length} messages</p></div>
            <ChevronRight size={20} strokeWidth={3} color={C.hare} />
          </button>
        ))}</div>
      )}
      {aiViewer !== null && <AIThreadViewer threads={filteredThreads} start={aiViewer} aiAllowed={aiAllowed} onUpgrade={onUpgrade} sending={threadFollowUpSending} onSendFollowUp={sendThreadFollowUp} onThreadChange={(id) => { setViewThreadId(parseAiThreadId(id)); onAiThreadChange?.(id); }} onClose={() => { setAiViewer(null); setViewThreadId(null); onAiThreadChange?.(null); }} />}
      {!aiViewer && (
        <div className="mt-4 flex items-center gap-2 rounded-3xl p-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
          <input value={askInput} onChange={(e) => setAskInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void sendAskThread()} placeholder={aiAllowed ? "Ask anything about this exam…" : "Pro required for AI…"} className="flex-1 rounded-2xl px-4 py-3 text-base font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
          <button type="button" onClick={() => void sendAskThread()} disabled={askSending || !askInput.trim()} className="grid h-11 w-11 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-50" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}>{askSending ? <Loader2 size={20} className="animate-spin" color={C.white} /> : <Send size={20} strokeWidth={3} color={C.white} />}</button>
        </div>
      )}
    </>;
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex flex-none items-center gap-3 px-5 py-3 md:px-10 md:py-4" style={{ background: C.cream }}>
        <button type="button" aria-label="Back" onClick={onBack} className="grid h-11 w-11 flex-none place-items-center rounded-2xl" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><ArrowLeft size={23} strokeWidth={3} color={C.wolf} /></button>
        <div className="min-w-0 flex-1"><BrandLockup subtitle={exam.title} /></div>
        <HeaderActions isSignedIn={!!isSignedIn} onUpgrade={onUpgrade} onManageBilling={onManageBilling} isPro={isPro} questionsRemaining={questionsRemaining} aiRemainingUsd={aiRemainingUsd} aiBudgetUsd={aiBudgetUsd} />
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-5 pt-4 md:px-8">
          <div className="mb-4 text-center">
            <h1 className="text-3xl font-black leading-tight md:text-4xl" style={{ color: C.eel }}>{tabLabel}</h1>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder={`Search ${tabLabel.toLowerCase()}`} />
          <div className="no-bar flex-1 overflow-y-auto pb-28">{body()}</div>
        </div>
      </main>

      <nav className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3">
        <div className="no-bar pointer-events-auto mx-auto flex w-full max-w-2xl gap-1 overflow-x-auto rounded-2xl p-1.5" style={{ background: C.white, border: `2px solid ${C.inkWash}`, boxShadow: `0 4px 0 ${C.swan}, 0 12px 26px rgba(17,24,39,.13)` }}>
          {E_TABS.map((x) => { const on = t === x.id; const Icon = x.icon; return (
            <button key={x.id} type="button" onClick={() => selectTab(x.id)} className="flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 outline-none transition-colors" style={{ background: on ? `${x.color}22` : "transparent", color: on ? x.color : C.wolf }}><Icon size={20} strokeWidth={on ? 3.3 : 2.8} /><span className="text-[10px] font-black uppercase">{x.label}</span></button>); })}
        </div>
      </nav>

      {noteChat && (
        <div onClick={() => { setNoteChat(null); onNoteSlugChange?.(null); }} className="absolute inset-0 z-[56] bg-black/15 p-4 md:p-5">
          <div onClick={(e) => e.stopPropagation()} className="ml-auto flex h-[620px] max-h-[82vh] w-[min(620px,calc(100vw-32px))] flex-col rounded-3xl" style={{ background: C.white, boxShadow: "0 22px 60px rgba(0,0,0,.22)" }}>
            <div className="flex items-center justify-between rounded-t-3xl px-4 py-3" style={{ background: C.ink }}>
              <span className="flex min-w-0 items-center gap-3 font-black text-white"><AppLogo size="sm" /><span className="min-w-0"><span className="block leading-tight">DrKard</span><span className="block truncate text-xs uppercase tracking-wide text-white/70">Note: {noteChat.note.t}</span></span></span>
              <button type="button" aria-label="Close note chat" onClick={() => { setNoteChat(null); onNoteSlugChange?.(null); }} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,.2)" }}><X size={21} strokeWidth={3} color={C.white} /></button>
            </div>
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="flex-1" style={{ background: C.polar } as any}>
                <MessageScrollerViewport className="p-4">
                  <MessageScrollerContent className="space-y-2.5">
                    {(noteChats[noteChat.key] || []).map((m, k) => <MessageScrollerItem key={k} messageId={`note-${noteChat.key}-${k}`} scrollAnchor={m.role === "user"}><div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className="max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-base font-bold leading-relaxed" style={m.role === "user" ? { background: C.ink, color: C.white } : { background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}>{m.content}</div></div></MessageScrollerItem>)}
                    {noteSending && <MessageScrollerItem messageId={`note-${noteChat.key}-thinking`}><div className="flex"><div className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5" style={{ background: C.white, boxShadow: `0 2px 0 ${C.swan}` }}><Loader2 size={16} className="animate-spin" color={C.ink} /><span className="text-sm font-bold" style={{ color: C.hare }}>Thinking...</span></div></div></MessageScrollerItem>}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
              </MessageScroller>
            </MessageScrollerProvider>
            <div className="flex items-center gap-2 p-3" style={{ borderTop: `2px solid ${C.swan}` }}>
              <input value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendNoteChat()} placeholder="Ask about this note..." className="flex-1 rounded-2xl px-4 py-3 text-base font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
              <button type="button" onClick={sendNoteChat} disabled={noteSending} className="grid h-12 w-12 flex-none place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-50" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><Send size={21} strokeWidth={3} color={C.white} /></button>
            </div>
          </div>
        </div>
      )}

      {imageViewer !== null && (() => {
        const img = IMAGE_ITEMS[imageViewer];
        const flagged = !!marks[`image-${imageViewer}`];
        return (
          <div className="absolute inset-0 z-[56] flex flex-col" style={{ background: C.white }}>
            <div className="flex flex-none items-center justify-between gap-3 px-4 py-3 md:px-8" style={{ background: C.ink }}>
                <div className="flex min-w-0 items-center gap-3 text-white"><ImageIcon size={22} strokeWidth={3} /><div className="min-w-0"><p className="truncate font-black">{img.title}</p><p className="text-xs font-extrabold uppercase tracking-wide text-white/65">Image {imageViewer + 1} of {IMAGE_ITEMS.length}</p></div></div>
                <button type="button" aria-label="Close image" onClick={() => setImageViewer(null)} className="grid h-10 w-10 flex-none place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,.18)" }}><X size={20} strokeWidth={3} color={C.white} /></button>
              </div>
              <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.45fr_.65fr]">
                <div className="min-h-[52vh] md:min-h-0" style={{ background: `radial-gradient(circle at 38% 32%, rgba(255,255,255,.24), transparent 28%), linear-gradient(145deg, ${img.color}, ${C.ink})` }} />
                <div className="flex min-h-0 flex-col overflow-y-auto p-5 md:p-8">
                  <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Question</p>
                  <h2 className="mt-1 text-2xl font-black leading-tight" style={{ color: C.eel }}>{img.prompt}</h2>
                  <p className="mt-4 text-base font-bold leading-relaxed" style={{ color: C.wolf }}>{img.note}</p>
                  <div className="mt-5 rounded-2xl p-4" style={{ background: C.polar }}>
                    <p className="text-sm font-black" style={{ color: C.eel }}>Use keyboard arrows to move between images. Press F to flag this image.</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <button type="button" aria-label="Previous image" onClick={() => setImageViewer((x) => x === null ? x : Math.max(0, x - 1))} disabled={imageViewer === 0} className="grid h-12 w-12 place-items-center rounded-2xl active:translate-y-0.5 disabled:opacity-40" style={{ background: C.white, color: C.wolf, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}><ChevronLeft size={22} strokeWidth={3.5} /></button>
                    <button type="button" aria-label={flagged ? "Remove flag" : "Flag image"} onClick={() => setMarks((m) => ({ ...m, [`image-${imageViewer}`]: !flagged }))} className="flex h-12 items-center gap-2 rounded-2xl px-4 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: flagged ? C.amberWash : C.polar, color: flagged ? C.amber : C.eel }}><Flag size={18} strokeWidth={3} fill={flagged ? C.amber : "none"} /> Flag</button>
                    <button type="button" aria-label="Next image" onClick={() => setImageViewer((x) => x === null ? x : Math.min(IMAGE_ITEMS.length - 1, x + 1))} disabled={imageViewer === IMAGE_ITEMS.length - 1} className="grid h-12 w-12 place-items-center rounded-2xl text-white active:translate-y-0.5 disabled:opacity-40" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><ChevronRight size={22} strokeWidth={3.5} /></button>
                  </div>
                </div>
              </div>
          </div>
        );
      })()}

      {cfg && <PracticeConfig target={cfg} onClose={() => { setCfg(null); onPracticeSlugChange?.(null); }} onStart={({ time, count }) => { trackGoal("practice_started", { examId, subject: cfg.n, count, time }); setCfg(null); onPracticeSlugChange?.(null); setRunner({ title: `${cfg.n} practice`, questions: pickLocal(count, cfg.n), dur: time * 60 }); }} />}
      {intro && <ExamIntro mode={intro} onClose={() => { setIntro(null); onQuizRouteChange?.(null, false); }} onStart={(count) => { const m = intro; trackGoal("practice_started", { examId, mode: m.t, count }); setIntro(null); setRunner({ title: m.t, questions: pickLocal(count), dur: m.dur, quizSlug: slugify(m.t) }); }} />}
      {runner && <Runner title={runner.title} questions={runner.questions} durationSec={runner.dur} onClose={() => { setRunner(null); onQuizRouteChange?.(null, false); }} onDashboard={() => { setRunner(null); onQuizRouteChange?.(null, false); onDashboard?.(); }} onComplete={saveFinishedSession}
        onDone={() => { if (runner.quizSlug) onQuizRouteChange?.(runner.quizSlug, true); }}
        onReport={async ({ questionId, issueType, note, selectedAnswer }) => {
          if (!examId || !questionId) return;
          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examId, questionId, issueType, note, selectedAnswer }),
          });
          return true;
        }}
        onExplain={({ questionIndex, questionId, userMessage, assistantMessage }) => {
          if (!isSignedIn || !examId) return;
          persistAiExchange("explain", userMessage, userMessage, assistantMessage, questionId, explainThreads.current[questionIndex])
            .then((id) => { if (id) explainThreads.current[questionIndex] = id; })
            .catch(() => {});
        }}
        examId={examId}
        getExplainThreadId={(questionIndex) => explainThreads.current[questionIndex]}
        onUpgrade={onUpgrade} />}
      {sess && <SessionPopup s={sess} onClose={() => setSess(null)} onResume={() => { const s = sess; setSess(null); setRunner({ title: s.title, questions: pickLocal(Math.min(10, s.total)), dur: 0 }); }} onRestart={() => { const s = sess; setSess(null); setRunner({ title: s.title, questions: pickLocal(Math.min(10, s.total)), dur: 0 }); }} />}
      {flash && <FlashDetail set={flash} examId={examId} onClose={() => { setFlash(null); onFlashSlugChange?.(null); onFlashTestChange?.(false); }} onTest={(cards) => { setFlashTest({ ...flash, cards }); onFlashTestChange?.(true); }} onAskHistory={(title, userMessage, assistantMessage, threadId) => persistAiExchange("card", title, userMessage, assistantMessage, undefined, threadId)} />}
      {flashTest && <FlashTester set={flashTest} onClose={() => { setFlashTest(null); onFlashTestChange?.(false); }} />}
    </div>
  );
}

/* ---------------- Upload row + App ---------------- */
type Item = { id: number; kind: "file" | "text" | "link"; name: string; meta: string; progress: number };
const KIND_ICON = { file: FileText, text: Type, link: LinkIcon } as const;
function ItemRow({ it, onRemove }: { it: Item; onRemove: () => void }) {
  const Icon = KIND_ICON[it.kind]; const done = it.progress >= 100;
  return (
    <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
      <span className="grid h-10 w-10 flex-none place-items-center rounded-xl" style={{ background: C.inkWash, color: C.ink }}><Icon size={20} strokeWidth={2.75} /></span>
      <div className="min-w-0 flex-1"><p className="truncate font-extrabold" style={{ color: C.eel }}>{it.name}</p>
        {done ? <p className="text-sm font-bold" style={{ color: C.hare }}>{it.meta}</p> : <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: C.swan }}><div className="h-full rounded-full transition-all duration-200" style={{ width: `${it.progress}%`, background: C.ink }} /></div>}</div>
      {done ? <span className="grid h-7 w-7 flex-none place-items-center rounded-full text-white" style={{ background: C.ink }}><Check size={16} strokeWidth={4} /></span> : <span className="text-xs font-black" style={{ color: C.ink }}>{it.progress}%</span>}
      <button type="button" aria-label="Remove" onClick={onRemove} className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: C.polar }}><Trash2 size={18} strokeWidth={3} color={C.wolf} /></button>
    </div>
  );
}

/* ---------------- URL <-> state sync helpers ---------------- */
// Route helpers live in lib/app-routes.ts

export function DrKardApp({ initialPath = "/" }: { initialPath?: string }) {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const greeting = timeGreeting();
  const firstName = displayFirstName(user);
  const [cloudExams, setCloudExams] = useState<ExamItem[] | undefined>(undefined);
  const [entitlements, setEntitlements] = useState<Entitlements | undefined>(undefined);
  const initialRoute = stateFromPath(initialPath);
  const [page, setPage] = useState<"home" | "exam" | "dashboard">(initialRoute.page);
  const [exam, setExam] = useState<ExamItem | null>(
    initialRoute.page === "exam" && initialRoute.examSlug
      ? { title: initialRoute.examSlug.replace(/-/g, " "), role: "" }
      : null,
  );
  const [examTab, setExamTab] = useState<string>(initialRoute.examTab);
  const [flashSlug, setFlashSlug] = useState<string | null>(initialRoute.flashSlug);
  const [quizSlug, setQuizSlug] = useState<string | null>(initialRoute.quizSlug);
  const [quizResult, setQuizResult] = useState<boolean>(initialRoute.quizResult);
  const [aiThreadId, setAiThreadId] = useState<string | null>(initialRoute.aiThreadId);
  const [practiceSlug, setPracticeSlug] = useState<string | null>(initialRoute.practiceSlug);
  const [flashTest, setFlashTest] = useState<boolean>(initialRoute.flashTest);
  const [noteSlug, setNoteSlug] = useState<string | null>(initialRoute.noteSlug);
  const [pricing, setPricing] = useState(false);
  const [tab, setTab] = useState<"browse" | "upload">(initialRoute.tab);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]); const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(""); const [allOpen, setAllOpen] = useState(false); const idRef = useRef(1);
  const [librarySlugs, setLibrarySlugs] = useState<string[]>([]);
  useEffect(() => {
    trackGoal("app_opened");
  }, []);
  useEffect(() => {
    if (pricing) trackGoal("pricing_opened");
  }, [pricing]);
  const refreshBootstrap = React.useCallback(async () => {
    const res = await fetch("/api/bootstrap");
    const data = (await res.json().catch(() => ({}))) as { exams?: ExamItem[]; entitlements?: Entitlements };
    if (res.ok) {
      setCloudExams(data.exams ?? []);
      setEntitlements(data.entitlements);
    }
  }, []);
  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap, isSignedIn]);

  async function openBillingPortal() {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && data.url) window.location.assign(data.url);
    else alert(data.error ?? "Billing portal is not available yet.");
  }

  const examsLoading = cloudExams === undefined;
  const exams: ExamItem[] = useMemo(() => cloudExams ?? [], [cloudExams]);
  useEffect(() => {
    if (!exams.length) return;
    setLibrarySlugs((current) => current.length ? current : exams.map((e) => slugify(e.title)));
  }, [exams]);

  const onExamTabChange = React.useCallback((next: string) => {
    setExamTab((current) => (current === next ? current : next));
    setFlashSlug(null);
    setQuizSlug(null);
    setQuizResult(false);
    setAiThreadId(null);
    setPracticeSlug(null);
    setFlashTest(false);
    setNoteSlug(null);
  }, []);
  const onQuizRouteChange = React.useCallback((slug: string | null, result = false) => {
    setExamTab("exam");
    setFlashSlug(null);
    setQuizSlug(slug);
    setQuizResult(Boolean(slug && result));
    setAiThreadId(null);
    setPracticeSlug(null);
    setFlashTest(false);
    setNoteSlug(null);
  }, []);
  const onAiThreadChange = React.useCallback((id: string | null) => {
    setExamTab("ask");
    setFlashSlug(null);
    setQuizSlug(null);
    setQuizResult(false);
    setPracticeSlug(null);
    setFlashTest(false);
    setNoteSlug(null);
    setAiThreadId(id);
  }, []);

  // Reflect the current screen in the address bar (and support browser back/forward
  // + direct loads of /upload and /exam/<slug>). Uses the History API directly so
  // it never triggers a Next navigation that the static SPA route can't satisfy.
  useEffect(() => {
    const apply = () => {
      const s = stateFromPath(window.location.pathname);
      setPage(s.page);
      setTab(s.tab);
      setExamTab(s.examTab);
      setFlashSlug(s.flashSlug);
      setQuizSlug(s.quizSlug);
      setQuizResult(s.quizResult);
      setAiThreadId(s.aiThreadId);
      setPracticeSlug(s.practiceSlug);
      setFlashTest(s.flashTest);
      setNoteSlug(s.noteSlug);
      if (s.page === "exam" && s.examSlug) {
        const pool = (cloudExams ?? []) as ExamItem[];
        const found = findExamBySlug(pool, s.examSlug);
        setExam(found ?? { title: s.examSlug.replace(/-/g, " "), role: "" });
      } else {
        setExam(null);
      }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [cloudExams]);

  useEffect(() => {
    const slug = exam ? (exam.slug ?? slugify(exam.title)) : null;
    const path = pathFromState(page, tab, slug, examTab, flashSlug, quizSlug, quizResult, aiThreadId, practiceSlug, flashTest, noteSlug);
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  }, [page, tab, exam, examTab, flashSlug, quizSlug, quizResult, aiThreadId, practiceSlug, flashTest, noteSlug]);
  const libraryExams = exams.filter((e) => librarySlugs.includes(slugify(e.title)));
  const addableExams = exams.filter((e) => !librarySlugs.includes(slugify(e.title)));
  const list = libraryExams.filter((e) => (e.title + " " + e.role).toLowerCase().includes(q.toLowerCase()));
  const uploadFile = async (id: number, file: File) => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/files", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setItems((p) => p.map((it) => it.id === id ? { ...it, meta: res.ok ? "Stored in DrKard library" : data.error || "Upload failed", progress: 100 } : it));
    if (res.ok && isSignedIn) void refreshBootstrap();
  };
  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const next = [...fl].map((f) => ({ id: idRef.current++, kind: "file" as const, name: f.name, meta: `${Math.max(1, Math.round(f.size / 1024))} KB`, progress: 0, file: f }));
    setItems((p) => [...next.map(({ file, ...it }) => it), ...p]);
    next.forEach(({ id, file }) => void uploadFile(id, file));
  };
  const uploadTextOrLink = async (id: number, kind: "text" | "link", content: string, name: string) => {
    setItems((p) => p.map((it) => it.id === id ? { ...it, progress: 40 } : it));
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, content, name }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setItems((p) => p.map((it) => it.id === id ? { ...it, meta: res.ok ? "Stored in DrKard library" : data.error || "Upload failed", progress: 100 } : it));
    if (res.ok && isSignedIn) void refreshBootstrap();
  };
  const addPaste = () => {
    const x = paste.trim();
    if (!x) return;
    const isLink = /^(https?:\/\/|www\.)/i.test(x);
    const kind = isLink ? "link" as const : "text" as const;
    const name = isLink ? x : x.slice(0, 48) + (x.length > 48 ? "…" : "");
    const id = idRef.current++;
    setItems((p) => [{ id, kind, name, meta: isLink ? "Link" : `${x.length} characters`, progress: 0 }, ...p]);
    setPaste("");
    void uploadTextOrLink(id, kind, x, name);
  };
  const remove = (id: number) => setItems((p) => p.filter((i) => i.id !== id));
  const done = items.filter((i) => i.progress >= 100).length;
  const TAB_META = { browse: { label: "Library", icon: LayoutGrid, color: C.teal, wash: C.tealWash, shadow: C.tealDark }, upload: { label: "Upload", icon: UploadCloud, color: C.ink, wash: C.inkWash, shadow: C.inkDark } } as const;
  const goHome = () => { setPage("home"); setTab("browse"); setExam(null); setExamTab(DEFAULT_EXAM_TAB); setFlashSlug(null); setQuizSlug(null); setQuizResult(false); setAiThreadId(null); setPracticeSlug(null); setFlashTest(false); setNoteSlug(null); };
  const openExam = (e: ExamItem) => { trackGoal("exam_opened", { examId: e._id ?? e.slug ?? slugify(e.title), title: e.title }); setExam(e); setPage("exam"); setFlashSlug(null); setQuizSlug(null); setQuizResult(false); setAiThreadId(null); setPracticeSlug(null); setFlashTest(false); setNoteSlug(null); };
  const startSignup = () => {
    trackGoal("signup_started");
    window.location.assign("/sign-up");
  };
  const billingProps = {
    isPro: entitlements?.isPro,
    questionsRemaining: entitlements?.questionsRemaining ?? null,
    aiUsedUsd: entitlements?.aiUsedUsd ?? null,
    aiBudgetUsd: entitlements?.aiBudgetUsd ?? null,
    aiRemainingUsd: entitlements?.aiRemainingUsd ?? null,
    onManageBilling: () => void openBillingPortal(),
  };

  return (
    <div style={{ fontFamily: "Nunito, system-ui, sans-serif", background: C.cream }} className="relative flex h-screen w-full flex-col overflow-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');.no-bar::-webkit-scrollbar{display:none}.no-bar{scrollbar-width:none}`}</style>

      {page === "exam" && exam ? <ExamDetail exam={exam} initialTab={examTab} initialFlashSlug={flashSlug} initialQuizSlug={quizSlug} initialQuizResult={quizResult} initialAiThreadId={aiThreadId} initialPracticeSlug={practiceSlug} initialFlashTest={flashTest} initialNoteSlug={noteSlug} aiAllowed={entitlements?.aiAllowed} {...billingProps} onTabChange={onExamTabChange} onFlashSlugChange={setFlashSlug} onQuizRouteChange={onQuizRouteChange} onAiThreadChange={onAiThreadChange} onPracticeSlugChange={setPracticeSlug} onFlashTestChange={setFlashTest} onNoteSlugChange={setNoteSlug} onBack={goHome} onDashboard={() => setPage("dashboard")} onUpgrade={() => setPricing(true)} /> : page === "dashboard" ? (
        <>
          <header className="flex-none px-5 py-3 md:px-10" style={{ background: C.cream }}>
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
              <button type="button" onClick={goHome} className="flex items-center gap-2 outline-none"><AppLogo size="sm" /><span className="text-xl font-black" style={{ color: C.eel }}>DrKard</span></button>
              <div className="flex items-center gap-2">
                <HeaderActions isSignedIn={!!isSignedIn} onUpgrade={() => setPricing(true)} {...billingProps} />
                {isSignedIn ? <UserButton /> : (
                  <button type="button" onClick={startSignup} className="rounded-2xl bg-white px-4 py-2.5 text-sm font-black uppercase tracking-wide active:translate-y-0.5" style={{ color: C.eel, boxShadow: "0 3px 0 rgba(0,0,0,.18)" }}>Get started</button>
                )}
              </div>
            </div>
          </header>
          <main className="no-bar flex-1 overflow-y-auto px-5 py-5 md:px-10" style={{ background: C.cream }}>
            <div className="mx-auto w-full max-w-3xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: C.hare }}>Dashboard</p>
                  <h1 className="mt-1.5 text-2xl font-black leading-snug md:text-[1.75rem]" style={{ color: C.eel }}>
                    <span aria-hidden className="mr-1.5">{greeting.emoji}</span>
                    {greeting.text},{" "}
                    <span style={{ color: C.teal }}>{firstName}</span>
                    <span aria-hidden className="ml-1.5">☕</span>
                  </h1>
                  <p className="mt-1 text-sm font-bold" style={{ color: C.wolf }}>Pick up where you left off.</p>
                </div>
                <button type="button" onClick={goHome} className="mt-0.5 flex-none rounded-2xl px-4 py-2.5 text-sm font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.white, color: C.eel, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>Library</button>
              </div>
              <button type="button" onClick={() => setPricing(true)} className="mb-4 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-white active:translate-y-0.5" style={{ background: `linear-gradient(100deg, ${C.teal}, ${C.ink})`, boxShadow: `0 3px 0 ${C.tealDark}` }}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl" style={{ background: "rgba(255,255,255,0.16)" }}><Crown size={18} strokeWidth={3} color={C.gold} fill={C.gold} /></span>
                  <span className="min-w-0 truncate text-sm font-black leading-tight md:text-base">Upgrade to Pro · all exams included</span>
                </span>
                <span className="flex flex-none items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black md:text-sm" style={{ background: C.white, color: C.ink }}>Upgrade <ChevronRight size={16} strokeWidth={4} /></span>
              </button>
              <div className="mb-5 flex w-full max-w-md gap-2 rounded-3xl p-1.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                {(["browse", "upload"] as const).map((tt) => { const on = tab === tt; const Icon = TAB_META[tt].icon; return (
                  <button key={tt} type="button" onClick={() => setTab(tt)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black uppercase tracking-wide active:translate-y-0.5" style={on ? { background: TAB_META[tt].color, color: C.white, boxShadow: `0 3px 0 ${TAB_META[tt].shadow}` } : { background: C.polar, color: C.wolf }}><Icon size={18} strokeWidth={3} /> {tt === "browse" ? "Library" : "Uploaded"}</button>); })}
              </div>
              {tab === "browse" ? (
                <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {list.map((e, i) => { const tc = tileColor(i); return (
                    <div key={e.title} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                      <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl text-sm font-black text-white" style={{ background: tc }}>{initials(e.title)}</span>
                      <button type="button" onClick={() => openExam(e)} className="min-w-0 flex-1 text-left"><p className="font-black leading-tight" style={{ color: C.eel }}>{e.title}</p><p className="text-sm font-bold" style={{ color: C.hare }}>{e.role}</p></button>
                      <button type="button" aria-label={`Remove ${e.title}`} onClick={() => setLibrarySlugs((s) => s.filter((x) => x !== slugify(e.title)))} className="grid h-10 w-10 flex-none place-items-center rounded-2xl active:translate-y-0.5" style={{ background: C.polar, color: C.wolf }}><Trash2 size={18} strokeWidth={3} /></button>
                    </div>); })}
                  {list.length === 0 && <div className="col-span-full"><EmptyState icon={LayoutGrid} title={examsLoading ? "Loading library" : "Your library is empty"} body="Add exams below to keep them in your dashboard library." /></div>}
                </div>
                {addableExams.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-3 text-sm font-black uppercase tracking-wide" style={{ color: C.hare }}>Add to library</p>
                    <div className="flex flex-wrap gap-2">
                      {addableExams.map((e) => <button key={e.title} type="button" onClick={() => setLibrarySlugs((s) => [...s, slugify(e.title)])} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black active:translate-y-0.5" style={{ background: C.white, color: C.eel, boxShadow: `0 2px 0 ${C.swan}` }}><Plus size={16} strokeWidth={3} /> {e.title}</button>)}
                    </div>
                  </div>
                )}
                </>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between"><p className="font-black" style={{ color: C.eel }}>Uploaded</p><span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: C.inkWash, color: C.ink }}>{done}/{items.length} ready</span></div>
                  {items.length > 0 ? <div className="space-y-2.5">{items.map((it) => <ItemRow key={it.id} it={it} onRemove={() => remove(it.id)} />)}</div> : <div className="rounded-3xl p-6 text-center" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}><UploadCloud className="mx-auto" size={34} strokeWidth={2.5} color={C.hare} /><p className="mt-2 font-black" style={{ color: C.eel }}>No uploads yet</p><p className="mt-1 text-sm font-bold" style={{ color: C.hare }}>Upload files from the home upload tab.</p></div>}
                </div>
              )}
            </div>
          </main>
        </>
      ) : (
        <>
          <header className="flex-none px-5 py-3 md:px-10" style={{ background: C.cream }}>
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
              <button type="button" onClick={goHome} className="flex items-center gap-2 outline-none"><AppLogo size="sm" /><span className="text-xl font-black" style={{ color: C.eel }}>DrKard</span></button>
              <div className="flex items-center gap-2">
                <HeaderActions isSignedIn={!!isSignedIn} onUpgrade={() => setPricing(true)} {...billingProps} />
                {isSignedIn ? <><button type="button" onClick={() => setPage("dashboard")} aria-label="Dashboard" title="Dashboard" className="grid h-10 w-10 place-items-center rounded-2xl bg-white active:translate-y-0.5" style={{ color: C.eel, boxShadow: "0 3px 0 rgba(0,0,0,.18)" }}><LayoutGrid size={18} strokeWidth={3} /></button><UserButton /></> : (
                  <button type="button" onClick={startSignup} className="rounded-2xl px-4 py-2.5 text-sm font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.teal, color: C.white, boxShadow: `0 3px 0 ${C.tealDark}` }}>Get started</button>
                )}
              </div>
            </div>
          </header>

          <main className="no-bar flex-1 overflow-y-auto px-5 py-3 md:px-10 md:py-4" style={{ background: C.cream }}>
            <section className="relative mx-auto flex min-h-[92px] max-w-2xl flex-col items-center justify-center overflow-hidden px-2 text-center md:min-h-[128px]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-1/2 h-28 -translate-y-1/2 rounded-full opacity-70 blur-3xl md:inset-x-10 md:h-32"
                style={{ background: `radial-gradient(ellipse at center, ${C.tealWash} 0%, transparent 72%)` }}
              />
              <RotatingHero />
            </section>

            <div className="mx-auto mb-4 mt-2 flex w-full max-w-md gap-2 rounded-[2rem] p-1.5" style={{ background: C.white, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>
              {(["browse", "upload"] as const).map((tt) => { const on = tab === tt; const Icon = TAB_META[tt].icon; return (
                <button key={tt} type="button" onClick={() => setTab(tt)} className="flex flex-1 items-center justify-center gap-2 rounded-[1.55rem] py-3 text-sm font-black uppercase tracking-wide active:translate-y-0.5" style={on ? { background: C.teal, color: C.white, boxShadow: `0 3px 0 ${C.tealDark}` } : { background: C.polar, color: C.wolf }}><Icon size={18} strokeWidth={3} /> {TAB_META[tt].label}</button>); })}
            </div>

            {tab === "browse" ? (
              <>
                <div className="mx-auto flex w-full max-w-5xl items-center gap-2 rounded-2xl px-4 py-3.5" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}><Search size={20} strokeWidth={3} color={C.hare} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search library" className="w-full bg-transparent font-bold outline-none placeholder:font-bold" style={{ color: C.eel }} /></div>
                <div className="mt-6 grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {list.map((e, i) => {
                    const Icon = examCardIcon(e, i);
                    const tc = SPOTIFY_COLORS[i % SPOTIFY_COLORS.length];
                    return (
                    <button key={e.title} type="button" onClick={() => openExam(e)} aria-label={e.title} className="group relative h-40 w-full overflow-hidden rounded-xl text-left shadow-sm transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 hover:scale-[1.02] active:scale-[.99]" style={{ backgroundColor: tc }}>
                      <span className="absolute left-5 top-5 flex w-[68%] flex-col gap-3">
                        <span className="text-xl font-extrabold leading-tight text-white md:text-2xl">{e.title}</span>
                        <span className="text-sm font-bold leading-tight text-white/78">{e.role}</span>
                      </span>
                      <span className="absolute flex h-24 w-24 items-center justify-center rounded-lg bg-white/20 shadow-lg transition-transform duration-200 -bottom-4 -right-4 rotate-[25deg] group-hover:rotate-[18deg]">
                        <Icon className="h-10 w-10 text-white" strokeWidth={1.75} />
                      </span>
                    </button>); })}
                  {list.length === 0 && <p className="col-span-full py-10 text-center font-bold" style={{ color: C.hare }}>{examsLoading ? "Loading exams…" : "No exams match your search."}</p>}
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-xl">
                <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                <button type="button" onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }} className="flex w-full flex-col items-center gap-2 rounded-3xl px-6 py-8 active:translate-y-0.5" style={{ background: drag ? C.inkWash : C.white, border: `3px dashed ${drag ? C.ink : C.swan}` }}>
                  <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: C.inkWash, color: C.ink }}><UploadCloud size={30} strokeWidth={2.5} /></span>
                  <span className="text-lg font-black" style={{ color: C.eel }}>Drag &amp; drop or tap to upload</span><span className="text-sm font-bold" style={{ color: C.hare }}>PDF, images, or notes · up to 25 MB each</span>
                </button>
                <div className="mt-4 rounded-3xl p-4" style={{ background: C.white, boxShadow: `0 3px 0 ${C.swan}` }}>
                  <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3} placeholder="Paste text, a link, or notes…" className="w-full resize-none rounded-2xl p-3 font-bold outline-none" style={{ background: C.polar, color: C.eel }} />
                  <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs font-bold" style={{ color: C.hare }}>Paste anything — we'll sort it for you.</span>
                    <button type="button" onClick={addPaste} disabled={!paste.trim()} className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-black uppercase text-white active:translate-y-0.5 disabled:opacity-40" style={{ background: C.ink, boxShadow: `0 3px 0 ${C.inkDark}` }}><Plus size={16} strokeWidth={3.5} /> Add</button></div>
                </div>
                {items.length > 0 && (<div className="mt-6">
                  <div className="mb-3 flex items-center justify-between"><p className="font-black" style={{ color: C.eel }}>Your library</p><span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: C.inkWash, color: C.ink }}>{done}/{items.length} ready</span></div>
                  <div className="space-y-2.5">{items.slice(0, 3).map((it) => <ItemRow key={it.id} it={it} onRemove={() => remove(it.id)} />)}</div>
                  {items.length > 3 && <button type="button" onClick={() => setAllOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-black uppercase tracking-wide active:translate-y-0.5" style={{ background: C.white, color: C.eel, border: `2px solid ${C.swan}`, boxShadow: `0 3px 0 ${C.swan}` }}>View all {items.length} items <ChevronRight size={18} strokeWidth={3.5} /></button>}
                </div>)}
              </div>
            )}
          </main>
        </>
      )}

      {allOpen && (
        <div className="no-bar absolute inset-0 z-40 overflow-y-auto" style={{ background: C.cream }}>
          <header className="sticky top-0 flex items-center gap-3 px-5 py-3 md:px-10" style={{ background: C.cream }}>
            <button type="button" aria-label="Back" onClick={() => setAllOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: C.polar }}><ArrowLeft size={22} strokeWidth={3} color={C.wolf} /></button>
            <h2 className="text-xl font-black" style={{ color: C.eel }}>All items</h2>
          </header>
          <div className="mx-auto w-full max-w-xl space-y-2.5 px-5 py-5 md:px-10">{items.map((it) => <ItemRow key={it.id} it={it} onRemove={() => remove(it.id)} />)}</div>
        </div>
      )}

      {pricing && <PricingModal onClose={() => setPricing(false)} isAuthenticated={!!isSignedIn} isPro={entitlements?.isPro} />}
    </div>
  );
}
