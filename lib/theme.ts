import {
  Sparkles, Zap, RotateCcw, TrendingUp, Target, Clock, SlidersHorizontal,
  Check, X, Flag, BookOpen,
} from "lucide-react";

/** Duolingo-shape, ink/black accent palette. */
export const C = {
  ink: "#1C1C1E", inkDark: "#000000", inkWash: "#EDEDED",
  green: "#2E9E5B", greenWash: "#E3F5EA",
  red: "#E5484D", redWash: "#FCE9EA", redDark: "#C23A3E",
  amber: "#E8A33D", amberWash: "#FBF0DD",
  gold: "#FFC800", goldDark: "#E0AC00",
  purple: "#7C3AED", purpleWash: "#EADCFB", purpleBtn: "#D8B4FE", purpleBtnDark: "#B68AE8",
  eel: "#1C1C1E", wolf: "#6B6B6B", hare: "#A0A0A0",
  swan: "#E3E3E3", polar: "#F6F6F6", white: "#FFFFFF",
  cream: "#F6F6F6", creamLine: "#E6E6E6",
};

export const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function examColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { color: `hsl(${h} 45% 38%)`, wash: `hsl(${h} 45% 95%)` };
}

/** Normalized question shape used across the app. */
export type Question = {
  _id: string;
  subject: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  tags: string[];
};

/** One recorded answer, sent to `/api/sessions`. */
export type AnswerRecord = {
  questionId: string;
  selected: number; // -1 = unanswered
  correct: boolean;
};

export type Msg = { role: "user" | "assistant"; content: string };

export const MODES = [
  { t: "Question of the Day", d: "The quickest way to do a little studying every day.", icon: Sparkles, dur: 0, n: 1 },
  { t: "Quick 10 Quiz", d: "10 questions randomly selected from the question bank.", icon: Zap, dur: 0, n: 10 },
  { t: "Missed Questions Quiz", d: "Retake questions you've missed and improve your score.", icon: RotateCcw, dur: 0, n: 10 },
  { t: "Level Up Quiz", d: "Gamify your learning with progressively harder quizzes.", icon: TrendingUp, dur: 0, n: 10 },
  { t: "Weakest Subject Quiz", d: "Focus on questions from your lowest subject score.", icon: Target, dur: 0, n: 10 },
  { t: "Timed Quiz", d: "Have 5 or 10 minutes to invest in some study time?", icon: Clock, dur: 600, n: 10 },
  { t: "Build Your Own", d: "Select how many questions and what subjects to focus on.", icon: SlidersHorizontal, dur: 0, n: 10 },
];

// Static sample content for the secondary tabs (cards/tags).
export const STAGS = [
  { n: "High-yield", used: 110, unused: 28, inc: 18 },
  { n: "Weak spots", used: 40, unused: 60, inc: 56 },
  { n: "Exam favourites", used: 77, unused: 22, inc: 22 },
];
export const FLASHSETS = [
  { t: "Cranial nerves deck", cards: [{ f: "CN I", b: "Olfactory — smell" }, { f: "CN II", b: "Optic — vision" }, { f: "CN VII", b: "Facial — expression, taste" }, { f: "CN X", b: "Vagus — parasympathetic" }] },
  { t: "Antibiotics deck", cards: [{ f: "Penicillin", b: "Beta-lactam — cell wall synthesis" }, { f: "Gentamicin", b: "Aminoglycoside — 30S ribosome" }, { f: "Ciprofloxacin", b: "Fluoroquinolone — DNA gyrase" }] },
  { t: "ECG patterns deck", cards: [{ f: "STEMI", b: "ST-segment elevation" }, { f: "Atrial fibrillation", b: "Irregularly irregular, no P waves" }] },
];
export const NOTES = [
  { t: "Cardiac cycle", lines: ["Systole = contraction phase", "Diastole = filling phase", "S1 = mitral & tricuspid close", "S2 = aortic & pulmonary close"] },
  { t: "Cranial nerves", lines: ["12 paired nerves", "CN X = vagus (parasympathetic)", "Mixed: V, VII, IX, X", "Test with targeted reflexes"] },
  { t: "Acid–base balance", lines: ["Normal pH 7.35–7.45", "Respiratory vs metabolic", "Check the anion gap", "Expect compensation"] },
];
export const IMG_COLORS = ["#1C1C1E", "#2E9E5B", "#E5484D", "#7C3AED", "#E8A33D", "#2F7A87", "#B0324C", "#2B57D6", "#0E7490"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ST: Record<string, { c: string; wash: string; I: any; label: string }> = {
  correct: { c: C.green, wash: C.greenWash, I: Check, label: "Correct" },
  incorrect: { c: C.red, wash: C.redWash, I: X, label: "Incorrect" },
  flagged: { c: C.amber, wash: C.amberWash, I: Flag, label: "Flagged" },
  used: { c: C.wolf, wash: C.polar, I: Check, label: "Used" },
  unused: { c: C.hare, wash: C.polar, I: BookOpen, label: "Unused" },
};
